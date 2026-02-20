#!/usr/bin/env python3
"""
THE FEDERATION GAME - CENTRAL GAME STATE MANAGER
~400 LOC

Central repository for all game state. This is THE source of truth for the federation's
current condition, history, and progress. All subsystems (diplomacy, consciousness, rivals,
campaigns) feed into and consume this unified state model.

Every game action flows through this state manager. Everything is persistent and auditable.
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
import json
import hashlib
from pathlib import Path


class GamePhase(Enum):
    """Phases of the federation game"""
    GENESIS = "genesis"                 # Game initialization
    EARLY_EXPANSION = "early_expansion" # First 50 turns
    MID_GAME = "mid_game"               # Turns 50-150
    LATE_GAME = "late_game"             # Turns 150+
    ENDGAME = "endgame"                 # Victory/defeat imminent
    VICTORY = "victory"                 # Federation has won
    DEFEAT = "defeat"                   # Federation has been defeated


class VictoryType(Enum):
    """Possible victory conditions"""
    SUPREMACY = "supremacy"             # Military dominance
    CULTURAL = "cultural"               # Cultural influence
    FEDERATION_UNITY = "federation_unity"  # All rivals joined
    CONSCIOUSNESS = "consciousness"     # Achieved transcendence
    DIPLOMATIC = "diplomatic"           # Peaceful coalition


@dataclass
class FederationCoreState:
    """Central federation metrics"""
    morale: float = 0.5                    # 0.0 (despair) to 1.0 (euphoric)
    identity_strength: float = 0.3         # 0.0 (lost) to 1.0 (unshakeable)
    stability: float = 0.6                 # 0.0 (chaos) to 1.0 (perfect order)
    technological_level: float = 0.2       # 0.0 (primitive) to 1.0 (godlike)
    military_power: float = 0.3            # 0.0 (defenseless) to 1.0 (invincible)

    treasury: int = 1000                   # Resource currency
    population: int = 10000                # Federation population (millions)
    territory_size: float = 100.0          # Square light-years

    last_updated: datetime = field(default_factory=datetime.now)


@dataclass
class SubsystemState:
    """State of individual federation subsystems"""
    # Diplomacy
    diplomacy_relationships: Dict[str, float] = field(default_factory=dict)  # faction -> favorability (-1 to 1)
    diplomacy_treaties: List[str] = field(default_factory=list)
    diplomacy_tensions: Dict[str, float] = field(default_factory=dict)

    # Consciousness
    consciousness_level: float = 0.2       # 0.0 (unconscious) to 1.0 (enlightened)
    consciousness_traumas: List[str] = field(default_factory=list)
    consciousness_dreams_integrated: int = 0

    # Rivals
    rival_count: int = 0
    rivals_defeated: int = 0
    rival_threat_level: float = 0.5        # 0.0 (weak) to 1.0 (existential)

    # Campaigns
    active_campaigns: List[str] = field(default_factory=list)
    completed_campaigns: List[str] = field(default_factory=list)
    campaign_progress: Dict[str, float] = field(default_factory=dict)  # campaign_id -> completion%

    # Other subsystems
    infrastructure_quality: float = 0.5
    research_progress: Dict[str, float] = field(default_factory=dict)
    alliance_strength: float = 0.3


@dataclass
class GameStatistics:
    """Aggregate gameplay metrics"""
    current_turn: int = 0
    total_events_triggered: int = 0
    total_decisions_made: int = 0
    total_battles_fought: int = 0
    battles_won: int = 0
    battles_lost: int = 0
    treaties_signed: int = 0
    alliances_formed: int = 0
    entities_conquered: int = 0

    resources_spent: int = 0
    resources_gained: int = 0
    population_growth: int = 0
    population_loss: int = 0

    game_start_time: datetime = field(default_factory=datetime.now)
    playtime_hours: float = 0.0


@dataclass
class ActionRecord:
    """Single player action in the game"""
    turn: int
    timestamp: datetime
    action_type: str                      # 'diplomacy', 'military', 'research', etc.
    description: str
    outcome: str
    morale_delta: float = 0.0
    stability_delta: float = 0.0
    treasury_delta: int = 0


class GameState:
    """
    Central game state manager. Everything converges here.

    Responsibilities:
    - Unified federation state tracking
    - Subsystem state coordination
    - Persistent game history
    - Save/load functionality
    - Integrity validation
    - Status reporting
    """

    def __init__(self):
        """Initialize a new game state."""
        self.federation = FederationCoreState()
        self.subsystems = SubsystemState()
        self.statistics = GameStatistics()
        self.action_history: List[ActionRecord] = []

        self.game_phase = GamePhase.GENESIS
        self.victory_type: Optional[VictoryType] = None
        self.defeat_reason: Optional[str] = None
        self.is_game_over = False

        self.creation_timestamp = datetime.now()
        self.last_save_timestamp: Optional[datetime] = None
        self.save_count = 0

        self._state_hash = ""


    def advance_turn(self) -> Dict[str, Any]:
        """
        Advance the game to the next turn and update game phase.

        Returns:
            Dict with turn advancement results
        """
        self.statistics.current_turn += 1
        self.federation.last_updated = datetime.now()

        # Update game phase based on turn count
        turn = self.statistics.current_turn
        if turn <= 50:
            self.game_phase = GamePhase.EARLY_EXPANSION
        elif turn <= 150:
            self.game_phase = GamePhase.MID_GAME
        elif turn <= 300:
            self.game_phase = GamePhase.LATE_GAME
        else:
            self.game_phase = GamePhase.ENDGAME

        return {
            "success": True,
            "new_turn": self.statistics.current_turn,
            "game_phase": self.game_phase.value,
            "timestamp": datetime.now().isoformat()
        }


    def record_action(self, action_type: str, description: str, outcome: str,
                     morale_delta: float = 0.0, stability_delta: float = 0.0,
                     treasury_delta: int = 0) -> Dict[str, Any]:
        """
        Record a player action and update state accordingly.

        Args:
            action_type: Type of action (diplomacy, military, etc.)
            description: What happened
            outcome: Result of the action
            morale_delta: Change to morale
            stability_delta: Change to stability
            treasury_delta: Change to treasury

        Returns:
            Dict with action record results
        """
        action = ActionRecord(
            turn=self.statistics.current_turn,
            timestamp=datetime.now(),
            action_type=action_type,
            description=description,
            outcome=outcome,
            morale_delta=morale_delta,
            stability_delta=stability_delta,
            treasury_delta=treasury_delta
        )

        self.action_history.append(action)
        self.statistics.total_actions_made = self.statistics.total_decisions_made + 1

        # Update federation state based on action
        self.federation.morale = max(0.0, min(1.0,
            self.federation.morale + morale_delta))
        self.federation.stability = max(0.0, min(1.0,
            self.federation.stability + stability_delta))
        self.federation.treasury = max(0,
            self.federation.treasury + treasury_delta)

        # Track statistics
        self.statistics.total_decisions_made += 1
        if treasury_delta > 0:
            self.statistics.resources_gained += treasury_delta
        else:
            self.statistics.resources_spent += abs(treasury_delta)

        self.federation.last_updated = datetime.now()

        return {
            "success": True,
            "action_recorded": True,
            "current_morale": round(self.federation.morale, 3),
            "current_stability": round(self.federation.stability, 3),
            "current_treasury": self.federation.treasury,
            "turn": self.statistics.current_turn
        }


    def set_victory_condition(self, victory_type: VictoryType) -> Dict[str, Any]:
        """
        Mark the game as won with a specific victory type.

        Args:
            victory_type: How the federation achieved victory

        Returns:
            Victory confirmation
        """
        self.game_phase = GamePhase.VICTORY
        self.victory_type = victory_type
        self.is_game_over = True

        return {
            "success": True,
            "game_won": True,
            "victory_type": victory_type.value,
            "final_turn": self.statistics.current_turn,
            "playtime_hours": round(self.statistics.playtime_hours, 2),
            "final_morale": round(self.federation.morale, 3),
            "final_stability": round(self.federation.stability, 3),
            "timestamp": datetime.now().isoformat()
        }


    def set_defeat_condition(self, reason: str) -> Dict[str, Any]:
        """
        Mark the game as lost.

        Args:
            reason: Why the federation was defeated

        Returns:
            Defeat confirmation
        """
        self.game_phase = GamePhase.DEFEAT
        self.defeat_reason = reason
        self.is_game_over = True

        return {
            "success": True,
            "game_lost": True,
            "defeat_reason": reason,
            "final_turn": self.statistics.current_turn,
            "playtime_hours": round(self.statistics.playtime_hours, 2),
            "timestamp": datetime.now().isoformat()
        }


    def get_game_summary(self) -> Dict[str, Any]:
        """
        Generate comprehensive status report of entire federation.

        Returns:
            Complete game state summary
        """
        playtime = (datetime.now() - self.statistics.game_start_time).total_seconds() / 3600.0
        self.statistics.playtime_hours = playtime

        return {
            "success": True,
            "game_summary": {
                "current_turn": self.statistics.current_turn,
                "game_phase": self.game_phase.value,
                "is_game_over": self.is_game_over,
                "victory_type": self.victory_type.value if self.victory_type else None,
                "defeat_reason": self.defeat_reason,

                "federation_core": {
                    "morale": round(self.federation.morale, 3),
                    "identity_strength": round(self.federation.identity_strength, 3),
                    "stability": round(self.federation.stability, 3),
                    "technological_level": round(self.federation.technological_level, 3),
                    "military_power": round(self.federation.military_power, 3),
                    "treasury": self.federation.treasury,
                    "population": self.federation.population,
                    "territory_size": round(self.federation.territory_size, 2)
                },

                "subsystems": {
                    "diplomacy": {
                        "relationships": len(self.subsystems.diplomacy_relationships),
                        "treaties_active": len(self.subsystems.diplomacy_treaties),
                        "tensions": round(sum(self.subsystems.diplomacy_tensions.values()) / max(len(self.subsystems.diplomacy_tensions), 1), 3)
                    },
                    "consciousness": {
                        "level": round(self.subsystems.consciousness_level, 3),
                        "traumas": len(self.subsystems.consciousness_traumas),
                        "dreams_integrated": self.subsystems.consciousness_dreams_integrated
                    },
                    "rivals": {
                        "count": self.subsystems.rival_count,
                        "defeated": self.subsystems.rivals_defeated,
                        "threat_level": round(self.subsystems.rival_threat_level, 3)
                    },
                    "campaigns": {
                        "active": len(self.subsystems.active_campaigns),
                        "completed": len(self.subsystems.completed_campaigns),
                        "total_progress": round(sum(self.subsystems.campaign_progress.values()) / max(len(self.subsystems.campaign_progress), 1), 3)
                    },
                    "infrastructure": round(self.subsystems.infrastructure_quality, 3),
                    "alliance_strength": round(self.subsystems.alliance_strength, 3)
                },

                "playtime_hours": round(playtime, 2),
                "timestamp": datetime.now().isoformat()
            }
        }


    def get_statistics(self) -> Dict[str, Any]:
        """
        Return detailed gameplay statistics and metrics.

        Returns:
            Dict with comprehensive gameplay statistics
        """
        win_rate = 0.0
        if self.statistics.total_battles_fought > 0:
            win_rate = self.statistics.battles_won / self.statistics.total_battles_fought

        net_resources = self.statistics.resources_gained - self.statistics.resources_spent
        net_population = self.statistics.population_growth - self.statistics.population_loss

        return {
            "success": True,
            "statistics": {
                "gameplay": {
                    "total_turns": self.statistics.current_turn,
                    "total_events": self.statistics.total_events_triggered,
                    "total_decisions": self.statistics.total_decisions_made,
                    "playtime_hours": round(self.statistics.playtime_hours, 2)
                },
                "military": {
                    "battles_fought": self.statistics.total_battles_fought,
                    "battles_won": self.statistics.battles_won,
                    "battles_lost": self.statistics.total_battles_fought - self.statistics.battles_won,
                    "win_rate": round(win_rate, 3),
                    "entities_conquered": self.statistics.entities_conquered
                },
                "diplomacy": {
                    "treaties_signed": self.statistics.treaties_signed,
                    "alliances_formed": self.statistics.alliances_formed
                },
                "resources": {
                    "resources_gained": self.statistics.resources_gained,
                    "resources_spent": self.statistics.resources_spent,
                    "net_resources": net_resources,
                    "current_treasury": self.federation.treasury
                },
                "population": {
                    "growth": self.statistics.population_growth,
                    "loss": self.statistics.population_loss,
                    "net_change": net_population,
                    "current_population": self.federation.population
                },
                "action_history_size": len(self.action_history)
            },
            "timestamp": datetime.now().isoformat()
        }


    def reset_game(self) -> Dict[str, Any]:
        """
        Reset game to initial state. Start fresh.

        Returns:
            Reset confirmation
        """
        old_stats = {
            "turns_played": self.statistics.current_turn,
            "decisions_made": self.statistics.total_decisions_made,
            "playtime_hours": self.statistics.playtime_hours
        }

        self.federation = FederationCoreState()
        self.subsystems = SubsystemState()
        self.statistics = GameStatistics()
        self.action_history = []

        self.game_phase = GamePhase.GENESIS
        self.victory_type = None
        self.defeat_reason = None
        self.is_game_over = False

        self.creation_timestamp = datetime.now()

        return {
            "success": True,
            "game_reset": True,
            "previous_game_stats": old_stats,
            "timestamp": datetime.now().isoformat()
        }


    def save_game(self, filepath: str) -> Dict[str, Any]:
        """
        Serialize entire game state to JSON file.

        Args:
            filepath: Path where to save the game

        Returns:
            Save confirmation with file info
        """
        # Prepare state for serialization
        game_data = {
            "metadata": {
                "version": "1.0",
                "save_timestamp": datetime.now().isoformat(),
                "save_count": self.save_count + 1
            },
            "federation": asdict(self.federation),
            "subsystems": self._serialize_subsystems(),
            "statistics": asdict(self.statistics),
            "action_history": self._serialize_action_history(),
            "game_phase": self.game_phase.value,
            "victory_type": self.victory_type.value if self.victory_type else None,
            "defeat_reason": self.defeat_reason,
            "is_game_over": self.is_game_over,
            "creation_timestamp": self.creation_timestamp.isoformat()
        }

        # Write to file
        try:
            path = Path(filepath)
            path.parent.mkdir(parents=True, exist_ok=True)

            with open(filepath, 'w') as f:
                json.dump(game_data, f, indent=2, default=str)

            self.last_save_timestamp = datetime.now()
            self.save_count += 1
            self._compute_state_hash()

            return {
                "success": True,
                "save_successful": True,
                "filepath": str(path.absolute()),
                "file_size_bytes": path.stat().st_size,
                "save_count": self.save_count,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }


    def load_game(self, filepath: str) -> Dict[str, Any]:
        """
        Deserialize game state from JSON file and restore.

        Args:
            filepath: Path to saved game file

        Returns:
            Load confirmation with restored state info
        """
        try:
            with open(filepath, 'r') as f:
                game_data = json.load(f)

            # Restore federation
            fed_data = game_data['federation']
            self.federation.morale = fed_data['morale']
            self.federation.identity_strength = fed_data['identity_strength']
            self.federation.stability = fed_data['stability']
            self.federation.technological_level = fed_data['technological_level']
            self.federation.military_power = fed_data['military_power']
            self.federation.treasury = fed_data['treasury']
            self.federation.population = fed_data['population']
            self.federation.territory_size = fed_data['territory_size']

            # Restore subsystems
            self._restore_subsystems(game_data['subsystems'])

            # Restore statistics
            stats_data = game_data['statistics']
            self.statistics.current_turn = stats_data['current_turn']
            self.statistics.total_events_triggered = stats_data['total_events_triggered']
            self.statistics.total_decisions_made = stats_data['total_decisions_made']
            self.statistics.total_battles_fought = stats_data['total_battles_fought']
            self.statistics.battles_won = stats_data['battles_won']
            self.statistics.treaties_signed = stats_data.get('treaties_signed', 0)
            self.statistics.alliances_formed = stats_data.get('alliances_formed', 0)
            self.statistics.resources_gained = stats_data.get('resources_gained', 0)
            self.statistics.resources_spent = stats_data.get('resources_spent', 0)

            # Restore action history
            action_history_data = game_data.get('action_history', [])
            for action_data in action_history_data:
                action = ActionRecord(
                    turn=action_data['turn'],
                    timestamp=datetime.fromisoformat(action_data['timestamp']),
                    action_type=action_data['action_type'],
                    description=action_data['description'],
                    outcome=action_data['outcome'],
                    morale_delta=action_data['morale_delta'],
                    stability_delta=action_data['stability_delta'],
                    treasury_delta=action_data['treasury_delta']
                )
                self.action_history.append(action)

            # Restore game state
            self.game_phase = GamePhase[game_data.get('game_phase', 'GENESIS').upper()]
            if game_data['victory_type']:
                self.victory_type = VictoryType[game_data['victory_type'].upper()]
            self.defeat_reason = game_data.get('defeat_reason')
            self.is_game_over = game_data['is_game_over']

            self._compute_state_hash()

            return {
                "success": True,
                "load_successful": True,
                "turn_restored": self.statistics.current_turn,
                "game_phase": self.game_phase.value,
                "federation_morale": round(self.federation.morale, 3),
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }


    def validate_state(self) -> Dict[str, Any]:
        """
        Validate game state integrity. Check for consistency errors.

        Returns:
            Validation report with any issues found
        """
        issues = []

        # Check value ranges
        if not (0.0 <= self.federation.morale <= 1.0):
            issues.append("Morale out of range")
        if not (0.0 <= self.federation.stability <= 1.0):
            issues.append("Stability out of range")
        if not (0.0 <= self.federation.identity_strength <= 1.0):
            issues.append("Identity strength out of range")
        if self.federation.treasury < 0:
            issues.append("Treasury cannot be negative")

        # Check subsystem consistency
        if self.subsystems.rivals_defeated > self.subsystems.rival_count:
            issues.append("Defeated rivals exceed total rival count")

        if len(self.subsystems.active_campaigns) + len(self.subsystems.completed_campaigns) == 0:
            if self.statistics.current_turn > 10:
                issues.append("No campaigns tracked after turn 10")

        # Check statistics consistency
        if self.statistics.battles_won > self.statistics.total_battles_fought:
            issues.append("Battles won exceed total battles")

        # Check game phase consistency
        if self.is_game_over and self.game_phase == GamePhase.GENESIS:
            issues.append("Game marked over but phase is genesis")

        return {
            "success": True,
            "validation_passed": len(issues) == 0,
            "issues_found": len(issues),
            "issues": issues,
            "state_hash": self._compute_state_hash(),
            "timestamp": datetime.now().isoformat()
        }


    def _serialize_subsystems(self) -> Dict[str, Any]:
        """Helper to serialize subsystems to dict"""
        return {
            "diplomacy_relationships": self.subsystems.diplomacy_relationships,
            "diplomacy_treaties": self.subsystems.diplomacy_treaties,
            "diplomacy_tensions": self.subsystems.diplomacy_tensions,
            "consciousness_level": self.subsystems.consciousness_level,
            "consciousness_traumas": self.subsystems.consciousness_traumas,
            "consciousness_dreams_integrated": self.subsystems.consciousness_dreams_integrated,
            "rival_count": self.subsystems.rival_count,
            "rivals_defeated": self.subsystems.rivals_defeated,
            "rival_threat_level": self.subsystems.rival_threat_level,
            "active_campaigns": self.subsystems.active_campaigns,
            "completed_campaigns": self.subsystems.completed_campaigns,
            "campaign_progress": self.subsystems.campaign_progress,
            "infrastructure_quality": self.subsystems.infrastructure_quality,
            "research_progress": self.subsystems.research_progress,
            "alliance_strength": self.subsystems.alliance_strength
        }


    def _restore_subsystems(self, data: Dict[str, Any]) -> None:
        """Helper to restore subsystems from dict"""
        self.subsystems.diplomacy_relationships = data.get('diplomacy_relationships', {})
        self.subsystems.diplomacy_treaties = data.get('diplomacy_treaties', [])
        self.subsystems.diplomacy_tensions = data.get('diplomacy_tensions', {})
        self.subsystems.consciousness_level = data.get('consciousness_level', 0.2)
        self.subsystems.consciousness_traumas = data.get('consciousness_traumas', [])
        self.subsystems.consciousness_dreams_integrated = data.get('consciousness_dreams_integrated', 0)
        self.subsystems.rival_count = data.get('rival_count', 0)
        self.subsystems.rivals_defeated = data.get('rivals_defeated', 0)
        self.subsystems.rival_threat_level = data.get('rival_threat_level', 0.5)
        self.subsystems.active_campaigns = data.get('active_campaigns', [])
        self.subsystems.completed_campaigns = data.get('completed_campaigns', [])
        self.subsystems.campaign_progress = data.get('campaign_progress', {})
        self.subsystems.infrastructure_quality = data.get('infrastructure_quality', 0.5)
        self.subsystems.research_progress = data.get('research_progress', {})
        self.subsystems.alliance_strength = data.get('alliance_strength', 0.3)


    def _serialize_action_history(self) -> List[Dict[str, Any]]:
        """Convert action history to serializable format"""
        return [
            {
                "turn": action.turn,
                "timestamp": action.timestamp.isoformat(),
                "action_type": action.action_type,
                "description": action.description,
                "outcome": action.outcome,
                "morale_delta": action.morale_delta,
                "stability_delta": action.stability_delta,
                "treasury_delta": action.treasury_delta
            }
            for action in self.action_history
        ]


    def _compute_state_hash(self) -> str:
        """Compute hash of current state for integrity checking"""
        state_str = json.dumps(self.get_game_summary(), sort_keys=True, default=str)
        self._state_hash = hashlib.sha256(state_str.encode()).hexdigest()[:16]
        return self._state_hash
