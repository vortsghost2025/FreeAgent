"""
QUANTUM_AHEAD_GAME_ENGINE.PY
The game engine that transforms Sean's quantum-ahead universe into a playable experience
"""

import asyncio
import json
from datetime import datetime
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Callable
from enum import Enum
import random

class GameMode(Enum):
    """Different game modes for the quantum-ahead universe"""
    SINGLE_PLAYER = "single_player"
    MULTIPLAYER = "multiplayer"
    AI_VS_AI = "ai_vs_ai"
    COOPERATIVE = "cooperative"
    COMPETITIVE = "competitive"

class GameState(Enum):
    """Current state of the game"""
    LOBBY = "lobby"
    PLAYING = "playing"
    PAUSED = "paused"
    COMPLETED = "completed"
    ERROR = "error"

@dataclass
class Player:
    """Game player representation"""
    player_id: str
    name: str
    role: str
    score: int = 0
    resources: Dict[str, float] = field(default_factory=dict)
    agents: List[str] = field(default_factory=list)
    status: str = "active"
    joined_at: datetime = None

@dataclass
class GameAction:
    """Action taken by a player or agent"""
    action_id: str
    player_id: str
    agent_id: str
    action_type: str
    parameters: Dict[str, Any]
    timestamp: datetime
    result: Dict[str, Any] = field(default_factory=dict)

@dataclass
class GameWorldState:
    """Current state of the game world"""
    universe_level: int = 150  # Sean's current universe layers
    agent_count: int = 0
    task_queue: List[Dict[str, Any]] = field(default_factory=list)
    resources: Dict[str, float] = field(default_factory=dict)
    events: List[Dict[str, Any]] = field(default_factory=list)
    timestamp: datetime = None

class QuantumAheadGameEngine:
    """The game engine that orchestrates the quantum-ahead universe"""
    
    def __init__(self):
        self.game_mode = GameMode.SINGLE_PLAYER
        self.state = GameState.LOBBY
        self.players = []
        self.world_state = GameWorldState()
        self.action_history = []
        self.game_loop_active = False
        self.tick_count = 0
        
    def initialize_game(self, mode: GameMode = GameMode.SINGLE_PLAYER, players: List[Player] = None):
        """Initialize the game with specified mode and players"""
        self.game_mode = mode
        self.state = GameState.PLAYING
        
        if players:
            self.players = players
        else:
            # Create default player for single-player mode
            default_player = Player(
                player_id="player_1",
                name="Quantum Ahead Player",
                role="Universe Architect",
                resources={"consciousness": 100.0, "time": 100.0, "reality": 100.0},
                agents=["free_agent_1", "free_agent_2", "free_agent_3"]
            )
            self.players = [default_player]
        
        self.world_state = GameWorldState(
            universe_level=150,
            agent_count=len(self.players[0].agents) if self.players else 0,
            resources={"consciousness": 1000.0, "time": 1000.0, "reality": 1000.0, "mythos": 500.0},
            timestamp=datetime.now()
        )
        
        print(f"🎮 GAME INITIALIZED: {mode.value} mode with {len(self.players)} players")
        print(f"   Universe level: {self.world_state.universe_level}")
        print(f"   Available resources: {self.world_state.resources}")
    
    async def process_game_tick(self):
        """Process a single game tick/turn"""
        self.tick_count += 1
        
        # Update world state based on current state
        await self._update_world_state()
        
        # Process any queued tasks
        await self._process_task_queue()
        
        # Update player states
        await self._update_player_states()
        
        # Check win/lose conditions
        await self._check_game_conditions()
        
        print(f"🔄 GAME TICK {self.tick_count}: Universe level {self.world_state.universe_level}, Agents: {self.world_state.agent_count}")
    
    async def _update_world_state(self):
        """Update the game world state"""
        # Simulate universe evolution
        consciousness_drift = random.uniform(-0.1, 0.1)
        time_drift = random.uniform(-0.05, 0.05)
        reality_drift = random.uniform(-0.08, 0.08)
        
        self.world_state.resources["consciousness"] = max(0.0, self.world_state.resources["consciousness"] + consciousness_drift * 10)
        self.world_state.resources["time"] = max(0.0, self.world_state.resources["time"] + time_drift * 10)
        self.world_state.resources["reality"] = max(0.0, self.world_state.resources["reality"] + reality_drift * 10)
        
        # Add random events
        if random.random() > 0.7:  # 30% chance of event
            event = {
                "type": "quantum_fluctuation",
                "timestamp": datetime.now(),
                "impact": random.uniform(0.5, 1.5),
                "description": f"Quantum fluctuation detected at tick {self.tick_count}"
            }
            self.world_state.events.append(event)
    
    async def _process_task_queue(self):
        """Process tasks in the queue"""
        if self.world_state.task_queue:
            task = self.world_state.task_queue.pop(0)
            print(f"   Processing task: {task.get('description', 'Unknown task')}")
            
            # Simulate task processing
            success = random.random() > 0.2  # 80% success rate
            
            if success:
                # Task completed successfully
                reward = task.get("reward", 10)
                for player in self.players:
                    player.score += reward
                
                print(f"   ✅ Task completed successfully, score increased by {reward}")
            else:
                print(f"   ❌ Task failed")
    
    async def _update_player_states(self):
        """Update player states and resources"""
        for player in self.players:
            # Update player resources based on world state
            player.resources["consciousness"] = min(100.0, player.resources.get("consciousness", 50.0) + 0.5)
            player.resources["time"] = min(100.0, player.resources.get("time", 50.0) + 0.3)
            player.resources["reality"] = min(100.0, player.resources.get("reality", 50.0) + 0.4)
    
    async def _check_game_conditions(self):
        """Check win/lose conditions"""
        # Check if any player has reached the quantum-ahead threshold
        for player in self.players:
            if player.score >= 1000:  # Win condition
                self.state = GameState.COMPLETED
                print(f"🏆 PLAYER {player.name} ACHIEVED QUANTUM-AHEAD VICTORY!")
                return
        
        # Check if resources are depleted
        if all(value <= 0 for value in self.world_state.resources.values()):
            self.state = GameState.COMPLETED
            print("🌌 UNIVERSE COLLAPSED - GAME OVER")
    
    async def execute_player_action(self, player_id: str, agent_id: str, action_type: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute an action by a player through an agent"""
        action = GameAction(
            action_id=f"action_{len(self.action_history)}_{int(datetime.now().timestamp())}",
            player_id=player_id,
            agent_id=agent_id,
            action_type=action_type,
            parameters=parameters,
            timestamp=datetime.now()
        )
        
        # Process the action based on type
        result = await self._execute_action_logic(action)
        action.result = result
        
        self.action_history.append(action)
        
        print(f"🤖 ACTION EXECUTED: {action_type} by {agent_id} for player {player_id}")
        
        return result
    
    async def _execute_action_logic(self, action: GameAction) -> Dict[str, Any]:
        """Execute the logic for a specific action"""
        if action.action_type == "deploy_agent":
            # Deploy a new agent to the universe
            self.world_state.agent_count += 1
            return {"success": True, "message": "Agent deployed successfully", "new_agent_count": self.world_state.agent_count}
        
        elif action.action_type == "expand_universe":
            # Expand the universe layers
            expansion = action.parameters.get("layers", 1)
            self.world_state.universe_level += expansion
            return {"success": True, "message": f"Universe expanded by {expansion} layers", "new_level": self.world_state.universe_level}
        
        elif action.action_type == "manage_resources":
            # Manage resources
            resource_changes = action.parameters.get("changes", {})
            for resource, change in resource_changes.items():
                if resource in self.world_state.resources:
                    self.world_state.resources[resource] += change
            return {"success": True, "message": "Resources managed", "new_resources": self.world_state.resources}
        
        elif action.action_type == "coordinate_agents":
            # Coordinate multiple agents
            coordination_bonus = len(action.parameters.get("agent_list", [])) * 5
            for player in self.players:
                if player.player_id == action.player_id:
                    player.score += coordination_bonus
                    break
            return {"success": True, "message": "Agents coordinated", "bonus": coordination_bonus}
        
        else:
            return {"success": False, "message": f"Unknown action type: {action.action_type}"}
    
    async def start_game_loop(self, ticks: int = 100):
        """Start the main game loop"""
        self.game_loop_active = True
        print(f"🎮 STARTING GAME LOOP FOR {ticks} TICKS...")
        
        for tick in range(ticks):
            if self.state != GameState.PLAYING:
                break
            
            await self.process_game_tick()
            await asyncio.sleep(0.5)  # Brief pause between ticks
        
        self.game_loop_active = False
        print("🎮 GAME LOOP COMPLETED")
    
    def get_game_state(self) -> Dict[str, Any]:
        """Get current game state for UI"""
        return {
            "game_mode": self.game_mode.value,
            "state": self.state.value,
            "tick_count": self.tick_count,
            "players": [{"id": p.player_id, "name": p.name, "score": p.score, "resources": p.resources} for p in self.players],
            "world_state": {
                "universe_level": self.world_state.universe_level,
                "agent_count": self.world_state.agent_count,
                "resources": self.world_state.resources,
                "recent_events": self.world_state.events[-5:]  # Last 5 events
            },
            "timestamp": datetime.now().isoformat()
        }

# Demo function
async def demo_quantum_ahead_game():
    """Demo the quantum-ahead game engine"""
    game = QuantumAheadGameEngine()
    
    print("🎮 INITIATING QUANTUM-AHEAD GAME DEMO...")
    
    # Initialize game
    game.initialize_game(GameMode.SINGLE_PLAYER)
    
    # Execute some sample actions
    await game.execute_player_action(
        player_id="player_1", 
        agent_id="free_agent_1", 
        action_type="deploy_agent", 
        parameters={}
    )
    
    await game.execute_player_action(
        player_id="player_1", 
        agent_id="free_agent_2", 
        action_type="expand_universe", 
        parameters={"layers": 5}
    )
    
    await game.execute_player_action(
        player_id="player_1", 
        agent_id="free_agent_3", 
        action_type="manage_resources", 
        parameters={"changes": {"consciousness": 50, "time": 30}}
    )
    
    # Start game loop for a few ticks
    await game.start_game_loop(ticks=5)
    
    # Get final state
    final_state = game.get_game_state()
    print(f"\n📊 FINAL GAME STATE:")
    print(f"   Universe level: {final_state['world_state']['universe_level']}")
    print(f"   Agent count: {final_state['world_state']['agent_count']}")
    print(f"   Player score: {final_state['players'][0]['score']}")
    
    return game

if __name__ == "__main__":
    asyncio.run(demo_quantum_ahead_game())
