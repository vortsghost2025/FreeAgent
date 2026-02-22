"""
QUANTUM_AHEAD_GAME_API.PY
API endpoints connecting the game engine to the UI
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Any
import asyncio
from datetime import datetime

# Import the game engine
import os
import sys

# Ensure workspace directory is on sys.path so local modules import reliably
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# Load the engine module directly by path to avoid import resolution issues
import importlib.util
engine_path = os.path.join(os.path.abspath(os.path.dirname(__file__)), "QUANTUM_AHEAD_GAME_ENGINE.py")
spec = importlib.util.spec_from_file_location("quantum_ahead_game_engine", engine_path)
engine_mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(engine_mod)

QuantumAheadGameEngine = engine_mod.QuantumAheadGameEngine
GameMode = engine_mod.GameMode
Player = engine_mod.Player

app = FastAPI(
    title="Quantum-Ahead Universe Game API",
    description="API for the quantum-ahead universe game",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global game instance
game_engine = QuantumAheadGameEngine()

# Request models
class ActionRequest(BaseModel):
    action_type: str
    parameters: Dict[str, Any] = {}
    player_id: str = "player_1"
    agent_id: str = "free_agent_1"

class GameInitializationRequest(BaseModel):
    mode: str = "single_player"
    player_name: str = "Quantum Ahead Player"

# API endpoints
@app.post("/api/game/init")
async def initialize_game(request: GameInitializationRequest):
    """Initialize a new game session"""
    mode_enum = GameMode(request.mode) if request.mode in [m.value for m in GameMode] else GameMode.SINGLE_PLAYER
    
    player = Player(
        player_id="player_1",
        name=request.player_name,
        role="Universe Architect",
        resources={"consciousness": 100.0, "time": 100.0, "reality": 100.0},
        agents=["free_agent_1", "free_agent_2", "free_agent_3"]
    )
    
    game_engine.initialize_game(mode_enum, [player])
    
    return {
        "success": True,
        "message": f"Game initialized in {request.mode} mode",
        "game_state": game_engine.get_game_state()
    }

@app.post("/api/game/action")
async def execute_action(request: ActionRequest):
    """Execute an action in the game"""
    try:
        result = await game_engine.execute_player_action(
            player_id=request.player_id,
            agent_id=request.agent_id,
            action_type=request.action_type,
            parameters=request.parameters
        )
        
        return {
            "success": True,
            "result": result,
            "game_state": game_engine.get_game_state()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Action execution failed: {str(e)}")

@app.get("/api/game/state")
async def get_game_state():
    """Get current game state"""
    return game_engine.get_game_state()

@app.post("/api/game/start")
async def start_game():
    """Start the game loop"""
    # Run game loop in background
    asyncio.create_task(game_engine.start_game_loop(ticks=100))
    
    return {
        "success": True,
        "message": "Game loop started",
        "game_state": game_engine.get_game_state()
    }

@app.post("/api/game/pause")
async def pause_game():
    """Pause the game"""
    game_engine.game_loop_active = False
    return {"success": True, "message": "Game paused"}

@app.post("/api/game/reset")
async def reset_game():
    """Reset the game"""
    game_engine.__init__()  # Reset to initial state
    return {"success": True, "message": "Game reset"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "quantum-ahead-game-api",
        "quantum_coherence": "stable",
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
