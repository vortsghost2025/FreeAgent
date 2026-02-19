#!/usr/bin/env python3
"""
FEDERATION GAME TURNS ENGINE
~400 LOC

The heartbeat of the federation game. Orchestrates one complete turn cycle that brings
the entire federation to life. Each turn triggers dream generation, rival actions,
diplomacy shifts, prophecy updates, consciousness evolution, random events, and status
updates.

This is where everything happens. This is where the game ticks.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
from enum import Enum
import random
import copy
import json


class EventType(Enum):
    """Types of random events that can occur during a turn"""
    CRISIS = "crisis"                     # Sudden emergency situation
    DISCOVERY = "discovery"               # Found something valuable
    TRAGEDY = "tragedy"                   # Loss or setback
    OPPORTUNITY = "opportunity"           # Unexpected chance
    REVELATION = "revelation"             # Hidden truth exposed
    METAMORPHOSIS = "metamorphosis"       # Fundamental change
    CONSPIRACY = "conspiracy"             # Hidden agenda uncovered
    BLESSING = "blessing"                 # Unexpected fortune
    CURSE = "curse"                       # Unexpected misfortune
    SYNCHRONICITY = "synchronicity"       # Meaningful coincidence


@dataclass
class RandomEvent:
    """A random event that occurs during a turn"""
    event_id: str
    event_type: EventType
    timestamp: float
    description: str
    impact_level: float                   # 0.0 (minor) to 1.0 (catastrophic)
    affected_systems: List[str] = field(default_factory=list)  # What systems it touches
    resolution_required: bool = False
    duration_turns: int = 1               # How long does this persist?
    cascade_probability: float = 0.0      # Chance it triggers more events


@dataclass
class TurnState:
    """Complete snapshot of a turn"""
    turn_number: int
    timestamp: datetime
    duration_seconds: float = 0.0

    # What happened this turn
    dreams_generated: int = 0
    rivals_acted: int = 0
    diplomacy_shifts: int = 0
    prophecies_updated: int = 0
    consciousness_evolved: bool = False
    events_occurred: List[RandomEvent] = field(default_factory=list)

    # System states at turn end
    federation_consciousness_level: float = 0.5  # 0.0-1.0
    federation_stability: float = 0.7            # 0.0-1.0
    federation_growth: float = 0.5               # 0.0-1.0, expansion rate
    federation_morale: float = 0.5               # 0.0-1.0, emotional state
    federation_resources: float = 0.7            # 0.0-1.0, resource availability

    # Relationship metrics
    rival_threat_level: float = 0.3              # 0.0-1.0, aggregate threat
    allied_strength: float = 0.5                 # 0.0-1.0, allied faction strength
    external_pressure: float = 0.4               # 0.0-1.0, external forces

    # Evolution tracking
    consciousness_delta: float = 0.0             # How consciousness changed
    cultural_shift: float = 0.0                  # How culture changed
    diplomatic_shift: float = 0.0                # Diplomatic relations shifted
    prophecy_accuracy: float = 0.0               # How accurate dreams were

    # Turn summary narrative
    summary_narrative: str = ""


@dataclass
class GameState:
    """Complete federation game state"""
    federation_id: str
    current_turn: int = 0
    start_timestamp: datetime = field(default_factory=datetime.now)
    is_running: bool = False
    is_paused: bool = False
    auto_mode_enabled: bool = False

    # Turn history
    turn_history: List[TurnState] = field(default_factory=list)

    # Subsystem states (interfaces to actual engines)
    dreams: Dict[str, Any] = field(default_factory=dict)
    rival_federations: Dict[str, Any] = field(default_factory=dict)
    diplomatic_entities: Dict[str, Any] = field(default_factory=dict)
    prophecies: Dict[str, Any] = field(default_factory=dict)
    consciousness_snapshots: List[Dict[str, Any]] = field(default_factory=list)
    random_events_log: List[RandomEvent] = field(default_factory=list)

    # Federation metrics
    stability_history: List[float] = field(default_factory=list)
    morale_history: List[float] = field(default_factory=list)
    growth_history: List[float] = field(default_factory=list)


class GameTurn:
    """
    Game turn orchestrator - the heartbeat of the federation.
    Coordinates all subsystems through a single turn cycle.
    """

    def __init__(self, federation_id: str = "federation_1"):
        """Initialize the game turn engine"""
        self.federation_id = federation_id
        self.game_state = GameState(federation_id=federation_id)
        self.turn_counter = 0
        self.undo_history: List[GameState] = []
        self.event_registry = self._initialize_event_registry()
        self._setup_subsystems()

    def _setup_subsystems(self):
        """Initialize connections to subsystems (stubs for integration)"""
        # These would be actual engine instances in real integration
        self.dream_engine = None              # Will connect DreamEngine
        self.rival_simulator = None           # Will connect RivalFederationSimulator
        self.diplomacy_engine = None          # Will connect CosmicDiplomacyEngine
        self.consciousness_engine = None      # Will connect FederationConsciousnessEngine
        self.culture_engine = None            # Will connect CulturalEvolutionEngine

    def _initialize_event_registry(self) -> Dict[EventType, List[Dict]]:
        """Initialize random event templates"""
        return {
            EventType.CRISIS: [
                {"desc": "Resource shortage in sector {}", "impact": 0.6},
                {"desc": "Civil unrest reported among crew", "impact": 0.5},
                {"desc": "System malfunction detected", "impact": 0.4},
            ],
            EventType.DISCOVERY: [
                {"desc": "Ancient artifact discovered", "impact": 0.3},
                {"desc": "New energy source identified", "impact": 0.7},
                {"desc": "Lost colony signal detected", "impact": 0.5},
            ],
            EventType.TRAGEDY: [
                {"desc": "Loss of contact with outpost", "impact": 0.6},
                {"desc": "Ship accident kills crew", "impact": 0.7},
                {"desc": "Ecological collapse in territory", "impact": 0.5},
            ],
            EventType.OPPORTUNITY: [
                {"desc": "Trade opportunity with new faction", "impact": 0.4},
                {"desc": "Territory available for expansion", "impact": 0.5},
                {"desc": "Scientific breakthrough imminent", "impact": 0.3},
            ],
            EventType.REVELATION: [
                {"desc": "Hidden history of federation revealed", "impact": 0.5},
                {"desc": "Ancient prophecy found among archives", "impact": 0.4},
                {"desc": "Secret alliance discovered", "impact": 0.6},
            ],
            EventType.METAMORPHOSIS: [
                {"desc": "Federation culture undergoes shift", "impact": 0.6},
                {"desc": "New philosophy emerges among crew", "impact": 0.5},
                {"desc": "Leadership consensus changes", "impact": 0.7},
            ],
            EventType.BLESSING: [
                {"desc": "Unexpected supply shipment arrives", "impact": 0.3},
                {"desc": "Morale boosting celebration occurs", "impact": 0.4},
                {"desc": "Natural ally comes forward", "impact": 0.5},
            ],
        }

    def advance_turn(self) -> TurnState:
        """
        Execute one complete turn cycle.
        This is the main entry point for a single turn.

        Returns:
            TurnState with all changes and summary
        """
        if self.game_state.is_paused:
            return self.game_state.turn_history[-1] if self.game_state.turn_history else TurnState(
                turn_number=0,
                timestamp=datetime.now()
            )

        # Save state for undo capability
        self.undo_history.append(copy.deepcopy(self.game_state))

        turn_start = datetime.now()
        turn_state = TurnState(
            turn_number=self.turn_counter,
            timestamp=turn_start
        )

        # Execute turn phases in order
        self._phase_dream_generation(turn_state)
        self._phase_rival_actions(turn_state)
        self._phase_diplomacy_shifts(turn_state)
        self._phase_prophecy_updates(turn_state)
        self._phase_consciousness_evolution(turn_state)
        self._phase_random_events(turn_state)
        self._phase_status_updates(turn_state)

        # Wrap up turn
        turn_end = datetime.now()
        turn_state.duration_seconds = (turn_end - turn_start).total_seconds()

        # Record turn in history
        self.game_state.turn_history.append(turn_state)
        self.turn_counter += 1
        self.game_state.current_turn = self.turn_counter

        return turn_state

    def _phase_dream_generation(self, turn_state: TurnState):
        """Phase 1: Generate dreams from the federation's unconscious"""
        if self.dream_engine:
            dreams = self.dream_engine.generate_dreams()
            turn_state.dreams_generated = len(dreams)
            self.game_state.dreams.update({d.get('dream_id', str(i)): d for i, d in enumerate(dreams)})
        else:
            # Stub: generate random dreams
            num_dreams = random.randint(1, 3)
            turn_state.dreams_generated = num_dreams

    def _phase_rival_actions(self, turn_state: TurnState):
        """Phase 2: Rivals take actions"""
        if self.rival_simulator:
            actions = self.rival_simulator.act_all_rivals()
            turn_state.rivals_acted = len(actions)
            self.game_state.rival_federations.update(actions)
        else:
            # Stub: simulate rival actions
            num_rivals_acted = random.randint(1, 4)
            turn_state.rivals_acted = num_rivals_acted
            # Update threat level
            turn_state.rival_threat_level = min(1.0, turn_state.rival_threat_level + random.uniform(-0.1, 0.2))

    def _phase_diplomacy_shifts(self, turn_state: TurnState):
        """Phase 3: Diplomatic relations shift"""
        if self.diplomacy_engine:
            shifts = self.diplomacy_engine.update_all_relations()
            turn_state.diplomacy_shifts = len(shifts)
            self.game_state.diplomatic_entities.update(shifts)
        else:
            # Stub: simulate diplomacy
            num_shifts = random.randint(1, 3)
            turn_state.diplomacy_shifts = num_shifts
            turn_state.diplomatic_shift = random.uniform(-0.2, 0.2)

    def _phase_prophecy_updates(self, turn_state: TurnState):
        """Phase 4: Dreams become prophecies, prophecies reveal truth"""
        if self.dream_engine:
            prophecies = self.dream_engine.extract_prophecies()
            turn_state.prophecies_updated = len(prophecies)
            self.game_state.prophecies.update({p.get('prophecy_id', str(i)): p for i, p in enumerate(prophecies)})
            # Prophecy accuracy tracking
            turn_state.prophecy_accuracy = random.uniform(0.3, 0.95)
        else:
            # Stub: update prophecies
            num_updated = random.randint(0, 2)
            turn_state.prophecies_updated = num_updated

    def _phase_consciousness_evolution(self, turn_state: TurnState):
        """Phase 5: Federation consciousness evolves through experience"""
        if self.consciousness_engine:
            snapshot = self.consciousness_engine.evolve_consciousness()
            turn_state.consciousness_evolved = True
            self.game_state.consciousness_snapshots.append(snapshot)
            turn_state.consciousness_delta = snapshot.get('consciousness_delta', 0.0)
        else:
            # Stub: consciousness evolution
            previous_consciousness = self.game_state.consciousness_snapshots[-1].get('level', 0.5) if self.game_state.consciousness_snapshots else 0.5
            delta = random.uniform(-0.05, 0.1)
            turn_state.consciousness_evolved = True
            turn_state.consciousness_delta = delta
            turn_state.federation_consciousness_level = min(1.0, max(0.0, previous_consciousness + delta))

    def _phase_random_events(self, turn_state: TurnState):
        """Phase 6: Random events shape the turn"""
        # Event probability increases with instability
        event_probability = 0.3 + (1.0 - turn_state.federation_stability) * 0.3

        if random.random() < event_probability:
            event = self._generate_random_event()
            turn_state.events_occurred.append(event)
            self.game_state.random_events_log.append(event)

            # Events impact federation metrics
            self._apply_event_impact(event, turn_state)

    def _generate_random_event(self) -> RandomEvent:
        """Generate a single random event"""
        event_type = random.choice(list(EventType))
        templates = self.event_registry.get(event_type, [{"desc": "Unknown event", "impact": 0.3}])
        template = random.choice(templates)

        event_id = f"event_{self.turn_counter}_{random.randint(1000, 9999)}"

        return RandomEvent(
            event_id=event_id,
            event_type=event_type,
            timestamp=datetime.now().timestamp(),
            description=template.get("desc", "Random event"),
            impact_level=template.get("impact", 0.3),
            affected_systems=[random.choice(["diplomacy", "resources", "morale", "science", "culture"])],
            resolution_required=event_type in [EventType.CRISIS, EventType.TRAGEDY],
            duration_turns=random.randint(1, 5),
            cascade_probability=random.uniform(0.0, 0.3)
        )

    def _apply_event_impact(self, event: RandomEvent, turn_state: TurnState):
        """Apply an event's impact to federation metrics"""
        impact = event.impact_level

        if event.event_type in [EventType.CRISIS, EventType.TRAGEDY]:
            turn_state.federation_stability = max(0.0, turn_state.federation_stability - impact * 0.2)
            turn_state.federation_morale = max(0.0, turn_state.federation_morale - impact * 0.15)
        elif event.event_type in [EventType.BLESSING, EventType.OPPORTUNITY]:
            turn_state.federation_morale = min(1.0, turn_state.federation_morale + impact * 0.15)
            turn_state.federation_growth = min(1.0, turn_state.federation_growth + impact * 0.1)
        elif event.event_type == EventType.DISCOVERY:
            turn_state.federation_growth = min(1.0, turn_state.federation_growth + impact * 0.2)

    def _phase_status_updates(self, turn_state: TurnState):
        """Phase 7: Update all federation status metrics"""
        # Calculate current metrics based on all influences
        turn_state.federation_stability = self._calculate_stability()
        turn_state.federation_morale = self._calculate_morale()
        turn_state.federation_growth = self._calculate_growth()
        turn_state.federation_consciousness_level = self._calculate_consciousness()
        turn_state.federation_resources = self._calculate_resources()

        # Record in history
        self.game_state.stability_history.append(turn_state.federation_stability)
        self.game_state.morale_history.append(turn_state.federation_morale)
        self.game_state.growth_history.append(turn_state.federation_growth)

        # Generate narrative summary
        turn_state.summary_narrative = self._generate_turn_summary(turn_state)

    def _calculate_stability(self) -> float:
        """Calculate current federation stability"""
        base = 0.7
        recent_events = self.game_state.random_events_log[-5:] if self.game_state.random_events_log else []
        negative_impact = sum(e.impact_level for e in recent_events if e.event_type in [EventType.CRISIS, EventType.TRAGEDY]) / 10.0
        return max(0.0, min(1.0, base - negative_impact))

    def _calculate_morale(self) -> float:
        """Calculate current federation morale"""
        base = 0.5
        conscious_boost = (self.turn_counter % 20) / 100.0  # Cycles of morale
        return min(1.0, base + conscious_boost)

    def _calculate_growth(self) -> float:
        """Calculate current federation growth rate"""
        base = 0.5
        if self.game_state.rival_federations:
            # Competition drives growth
            return min(1.0, base + 0.15)
        return base

    def _calculate_consciousness(self) -> float:
        """Calculate current federation consciousness level"""
        if not self.game_state.consciousness_snapshots:
            return 0.5
        deltas = [c.get('consciousness_delta', 0.0) for c in self.game_state.consciousness_snapshots[-10:]]
        return min(1.0, max(0.0, 0.5 + sum(deltas)))

    def _calculate_resources(self) -> float:
        """Calculate current federation resource availability"""
        base = 0.7
        num_crises = sum(1 for e in self.game_state.random_events_log[-10:] if e.event_type == EventType.CRISIS)
        return max(0.0, base - num_crises * 0.15)

    def _generate_turn_summary(self, turn_state: TurnState) -> str:
        """Generate a narrative summary of what happened this turn"""
        parts = []

        if turn_state.dreams_generated > 0:
            parts.append(f"The federation dreamed {turn_state.dreams_generated} dreams.")

        if turn_state.rivals_acted > 0:
            parts.append(f"Rival federations took {turn_state.rivals_acted} actions.")

        if turn_state.diplomacy_shifts > 0:
            parts.append(f"Diplomatic relations shifted in {turn_state.diplomacy_shifts} ways.")

        if turn_state.consciousness_evolved:
            evolution_dir = "evolved" if turn_state.consciousness_delta > 0 else "regressed"
            parts.append(f"Federation consciousness {evolution_dir}.")

        if turn_state.events_occurred:
            for event in turn_state.events_occurred:
                parts.append(f"Event: {event.description}")

        if not parts:
            parts.append("The federation rested, gathering strength.")

        return " ".join(parts)

    def run_turn(self) -> TurnState:
        """
        Public interface to run a single turn.
        Equivalent to advance_turn() but with friendlier name.

        Returns:
            TurnState summary
        """
        return self.advance_turn()

    def auto_mode(self, num_turns: int = 10, delay_ms: int = 10) -> List[TurnState]:
        """
        Run multiple turns automatically.
        Useful for simulations and stress testing.

        Args:
            num_turns: How many turns to run
            delay_ms: Milliseconds between turns (for pacing)

        Returns:
            List of all turn states from this auto run
        """
        import time

        self.game_state.is_running = True
        self.game_state.auto_mode_enabled = True
        results = []

        try:
            for _ in range(num_turns):
                if self.game_state.is_paused:
                    break

                turn_result = self.advance_turn()
                results.append(turn_result)

                if delay_ms > 0:
                    time.sleep(delay_ms / 1000.0)
        finally:
            self.game_state.auto_mode_enabled = False
            self.game_state.is_running = False

        return results

    def get_turn_summary(self, turn_number: Optional[int] = None) -> Dict[str, Any]:
        """
        Get a detailed summary of what happened in a specific turn.

        Args:
            turn_number: Which turn (defaults to latest)

        Returns:
            Dictionary with turn details
        """
        if turn_number is None:
            if not self.game_state.turn_history:
                return {"error": "No turns have been played yet"}
            turn_state = self.game_state.turn_history[-1]
        else:
            if turn_number >= len(self.game_state.turn_history):
                return {"error": f"Turn {turn_number} doesn't exist"}
            turn_state = self.game_state.turn_history[turn_number]

        return {
            "turn_number": turn_state.turn_number,
            "timestamp": turn_state.timestamp.isoformat(),
            "duration_seconds": turn_state.duration_seconds,
            "dreams": turn_state.dreams_generated,
            "rival_actions": turn_state.rivals_acted,
            "diplomacy_shifts": turn_state.diplomacy_shifts,
            "prophecies_updated": turn_state.prophecies_updated,
            "consciousness_evolved": turn_state.consciousness_evolved,
            "events": [
                {
                    "type": e.event_type.value,
                    "description": e.description,
                    "impact": e.impact_level
                } for e in turn_state.events_occurred
            ],
            "federation_consciousness": turn_state.federation_consciousness_level,
            "federation_stability": turn_state.federation_stability,
            "federation_morale": turn_state.federation_morale,
            "federation_growth": turn_state.federation_growth,
            "federation_resources": turn_state.federation_resources,
            "rival_threat": turn_state.rival_threat_level,
            "summary": turn_state.summary_narrative
        }

    def get_federation_state(self) -> Dict[str, Any]:
        """
        Get the current complete federation state snapshot.
        This is what the player sees on the strategic display.

        Returns:
            Complete federation state
        """
        return {
            "federation_id": self.game_state.federation_id,
            "current_turn": self.game_state.current_turn,
            "game_running": self.game_state.is_running,
            "auto_mode": self.game_state.auto_mode_enabled,
            "started_at": self.game_state.start_timestamp.isoformat() if self.game_state.start_timestamp else None,
            "metrics": {
                "consciousness": self._calculate_consciousness(),
                "stability": self._calculate_stability(),
                "morale": self._calculate_morale(),
                "growth": self._calculate_growth(),
                "resources": self._calculate_resources(),
                "rival_threat": sum(1 for _ in self.game_state.rival_federations) * 0.2,  # Simple threat calc
            },
            "history_length": len(self.game_state.turn_history),
            "recent_turns": [
                self.get_turn_summary(i)
                for i in range(max(0, len(self.game_state.turn_history) - 5), len(self.game_state.turn_history))
            ],
            "undo_available": len(self.undo_history) > 0,
            "dreams_count": len(self.game_state.dreams),
            "rivals_count": len(self.game_state.rival_federations),
            "entities_count": len(self.game_state.diplomatic_entities),
            "prophecies_count": len(self.game_state.prophecies),
        }

    def undo_turn(self) -> bool:
        """
        Rewind to the previous turn state.
        Useful for exploring alternatives or fixing mistakes.

        Returns:
            True if undo was successful, False if at start
        """
        if not self.undo_history:
            return False

        self.game_state = self.undo_history.pop()
        self.turn_counter = max(0, self.turn_counter - 1)
        self.game_state.current_turn = self.turn_counter
        return True

    def pause_game(self):
        """Pause the game (auto_mode stops, manual turns paused)"""
        self.game_state.is_paused = True

    def resume_game(self):
        """Resume the game from pause"""
        self.game_state.is_paused = False

    def reset_game(self):
        """Reset to turn 0"""
        self.game_state = GameState(federation_id=self.federation_id)
        self.turn_counter = 0
        self.undo_history = []

    def export_state(self) -> str:
        """Export current game state as JSON string"""
        return json.dumps({
            "federation_id": self.game_state.federation_id,
            "current_turn": self.game_state.current_turn,
            "turn_count": len(self.game_state.turn_history),
            "metrics": {
                "consciousness": self._calculate_consciousness(),
                "stability": self._calculate_stability(),
                "morale": self._calculate_morale(),
                "growth": self._calculate_growth(),
                "resources": self._calculate_resources(),
            }
        }, indent=2)

    def attach_dream_engine(self, engine):
        """Attach the actual dream engine for integration"""
        self.dream_engine = engine

    def attach_rival_simulator(self, engine):
        """Attach the actual rival simulator for integration"""
        self.rival_simulator = engine

    def attach_diplomacy_engine(self, engine):
        """Attach the actual diplomacy engine for integration"""
        self.diplomacy_engine = engine

    def attach_consciousness_engine(self, engine):
        """Attach the actual consciousness engine for integration"""
        self.consciousness_engine = engine

    def attach_culture_engine(self, engine):
        """Attach the actual culture engine for integration"""
        self.culture_engine = engine


# Example usage and testing
if __name__ == "__main__":
    # Create a game instance
    game = GameTurn("federation_alpha")

    # Run 5 turns manually to show the turn cycle
    print("=" * 60)
    print("FEDERATION GAME TURNS - DEMONSTRATION")
    print("=" * 60)

    for i in range(5):
        print(f"\n--- TURN {i + 1} ---")
        turn_result = game.run_turn()
        summary = game.get_turn_summary()
        print(f"Duration: {turn_result.duration_seconds:.3f}s")
        print(f"Summary: {summary['summary']}")
        print(f"Stability: {summary['federation_stability']:.2f}")
        print(f"Morale: {summary['federation_morale']:.2f}")

    # Show full state
    print("\n" + "=" * 60)
    print("CURRENT FEDERATION STATE")
    print("=" * 60)
    state = game.get_federation_state()
    print(json.dumps(state, indent=2, default=str))

    # Test undo
    print("\n" + "=" * 60)
    print("TESTING UNDO")
    print("=" * 60)
    if game.undo_turn():
        print("[OK] Successfully undid a turn")
        print(f"Now at turn: {game.game_state.current_turn}")

    # Test auto mode
    print("\n" + "=" * 60)
    print("RUNNING AUTO MODE (10 TURNS)")
    print("=" * 60)
    results = game.auto_mode(num_turns=10, delay_ms=5)
    print(f"[OK] Completed {len(results)} turns")
    print(f"Final consciousness: {game._calculate_consciousness():.2f}")
    print(f"Final stability: {game._calculate_stability():.2f}")
