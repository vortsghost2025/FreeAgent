"""
game_api.py - Federation Game REST API
FastAPI backend wrapping the FederationConsole game engine.
Supports multiple concurrent game sessions.
"""

import sys
import os
import uuid
import logging
from typing import Dict, Any, Optional
from datetime import datetime

# Add game engine to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "uss-chaosbringer"))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from federation_game_console import FederationConsole, EventType

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("GameAPI")

app = FastAPI(title="Federation Game API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session store: session_id -> FederationConsole instance
sessions: Dict[str, FederationConsole] = {}
session_created: Dict[str, str] = {}


# \u2500\u2500 Pydantic models \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

class NewGameRequest(BaseModel):
    federation_name: Optional[str] = "USS Chaosbringer"
    commander_name: Optional[str] = "Commander"

class ResolveEventRequest(BaseModel):
    session_id: str
    choice: str

class CommandRequest(BaseModel):
    session_id: str
    command: str


# \u2500\u2500 Helpers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

def get_session(session_id: str) -> FederationConsole:
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
    return sessions[session_id]


def console_to_dict(console: FederationConsole) -> Dict[str, Any]:
    """Serialize FederationConsole state to JSON-safe dict."""
    c = console.consciousness
    return {
        "turn_number": console.turn_number,
        "game_phase": console.game_phase.value if hasattr(console.game_phase, "value") else str(console.game_phase),
        "game_state": console.game_state.value if hasattr(console.game_state, "value") else str(console.game_state),
        "consciousness": {
            "morale": round(c.morale, 3),
            "identity": round(c.identity, 3),
            "anxiety": round(c.anxiety, 3),
            "confidence": round(c.confidence, 3),
            "expansion_hunger": round(c.expansion_hunger, 3),
            "diplomacy_tendency": round(c.diplomacy_tendency, 3),
            "dreams": c.dreams[-5:] if c.dreams else [],
            "prophecies": c.prophecies[-3:] if c.prophecies else [],
            "archetypes": c.archetypes if c.archetypes else [],
            "traumas": c.traumas if c.traumas else [],
        },
        "rivals": [
            {
                "name": r.name,
                "philosophy": r.philosophy.value if hasattr(r.philosophy, "value") else str(r.philosophy),
                "threat_level": round(r.threat_level, 3),
                "diplomatic_mood": r.diplomatic_style.value if hasattr(r.diplomatic_style, "value") else str(r.diplomatic_style),
            }
            for r in (console.rivals or [])
        ],
        "events_log": (console.events_log or [])[-10:],
        "pending_event": None,  # Will be set separately when event is active
    }


# \u2500\u2500 Endpoints \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

@app.get("/health")
def health():
    return {"status": "alive", "sessions": len(sessions), "timestamp": datetime.utcnow().isoformat()}


@app.post("/game/new")
def new_game(req: NewGameRequest):
    """Start a new game session. Returns session_id and initial state."""
    session_id = str(uuid.uuid4())
    console = FederationConsole(save_dir=f"/tmp/saves_{session_id}")
    console.initialize_game()
    sessions[session_id] = console
    session_created[session_id] = datetime.utcnow().isoformat()
    logger.info(f"New session: {session_id}")
    return {
        "session_id": session_id,
        "created_at": session_created[session_id],
        "state": console_to_dict(console),
    }


@app.get("/game/{session_id}/state")
def get_state(session_id: str):
    """Get current game state."""
    console = get_session(session_id)
    return {"session_id": session_id, "state": console_to_dict(console)}


@app.post("/game/{session_id}/turn")
def advance_turn(session_id: str):
    """Execute one complete turn. Returns what happened."""
    console = get_session(session_id)
    result = console.execute_turn()
    state = console_to_dict(console)
    return {
        "session_id": session_id,
        "turn_result": result,
        "state": state,
    }


@app.post("/game/{session_id}/event/trigger")
def trigger_event(session_id: str, event_type: Optional[str] = None):
    """Trigger a random event card."""
    console = get_session(session_id)
    et = None
    if event_type:
        try:
            et = EventType[event_type.upper()]
        except KeyError:
            pass
    event = console.trigger_event(et)
    return {
        "session_id": session_id,
        "event": {
            "event_id": event.event_id,
            "title": event.title,
            "description": event.description,
            "event_type": event.event_type.value if hasattr(event.event_type, "value") else str(event.event_type),
            "options": event.options if isinstance(event.options, dict) else {},
        }
    }


@app.post("/game/{session_id}/event/resolve")
def resolve_event(session_id: str, req: ResolveEventRequest):
    """Resolve a pending event with player choice."""
    console = get_session(session_id)
    narrative, impacts = console.resolve_event(req.choice)
    return {
        "session_id": session_id,
        "narrative": narrative,
        "impacts": impacts,
        "state": console_to_dict(console),
    }


@app.post("/game/{session_id}/chaos")
def trigger_chaos(session_id: str):
    """Trigger chaos mode - the SURPRISE ME button."""
    console = get_session(session_id)
    subsystem, scenario, narrative = console.trigger_chaos()
    return {
        "session_id": session_id,
        "subsystem": subsystem,
        "scenario": scenario,
        "narrative": narrative,
        "state": console_to_dict(console),
    }


@app.post("/game/{session_id}/strategy")
def set_strategy(session_id: str, strategy: str):
    """Set federation strategy."""
    console = get_session(session_id)
    valid = ["expand", "defend", "diplomacy", "research", "culture", "hybrid"]
    if strategy not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid strategy. Choose from: {valid}")
    # Apply strategy to consciousness
    strategy_impacts = {
        "expand": {"expansion_hunger": 0.1, "anxiety": 0.05},
        "defend": {"anxiety": -0.05, "morale": 0.05},
        "diplomacy": {"diplomacy_tendency": 0.1, "identity": 0.05},
        "research": {"confidence": 0.05, "identity": 0.05},
        "culture": {"morale": 0.1, "identity": 0.1},
        "hybrid": {"morale": 0.05, "confidence": 0.05},
    }
    console._update_consciousness(strategy_impacts.get(strategy, {}))
    return {
        "session_id": session_id,
        "strategy": strategy,
        "state": console_to_dict(console),
    }


@app.delete("/game/{session_id}")
def end_session(session_id: str):
    """End and clean up a game session."""
    if session_id in sessions:
        del sessions[session_id]
        session_created.pop(session_id, None)
    return {"session_id": session_id, "status": "ended"}


@app.get("/sessions")
def list_sessions():
    return {
        "count": len(sessions),
        "sessions": [
            {"session_id": sid, "created_at": session_created.get(sid), "turn": sessions[sid].turn_number}
            for sid in sessions
        ]
    }


# Serve frontend static files if present
# StaticFiles with html=True automatically serves index.html for directories:
#   /              → frontend/index.html      (the game)
#   /mission-control/ → frontend/mission-control/index.html
frontend_path = os.path.join(os.path.dirname(__file__), "frontend")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
