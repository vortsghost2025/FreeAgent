#!/usr/bin/env python3
"""
FEDERATION GAME CONSOLE - REFACTORED GAME ENGINE (12-Block Architecture)
~1000 LOC - Production-Ready Game Engine

Full unified game engine with:
- Core console orchestration
- Event card system with narrative choices
- Rival NPC generation and behavior
- Consciousness sheet tracking federation personality
- Chaos mode for random scenarios
- Turn cycle management
- Persistent game state
- REPL command interface

This is where gameplay emerges.
"""

import sys
import io
import json
import logging
import random
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple, Callable
from enum import Enum
from dataclasses import dataclass, asdict, field

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("GameConsole")

# ============================================================================
# BLOCK 1 & 3: ENUMS AND STATE MODELS
# ============================================================================

class GamePhase(Enum):
    """Game progression phases"""
    GENESIS = "genesis"
    EARLY_EXPLORATION = "early_exploration"
    EXPANSION = "expansion"
    CONSOLIDATION = "consolidation"
    CONFLICT = "conflict"
    DIPLOMACY = "diplomacy"
    TRANSCENDENCE = "transcendence"
    ENDGAME = "endgame"


class GameState(Enum):
    """Current game state"""
    MENU = "menu"
    PLAYING = "playing"
    TURN_ACTIVE = "turn_active"
    EVENT_PENDING = "event_pending"
    PAUSED = "paused"
    GAME_OVER = "game_over"


class RivalPhilosophy(Enum):
    """Rival NPC philosophies"""
    MATERIALIST = "materialist"
    SPIRITUAL = "spiritual"
    TECHNOLOGICAL = "technological"
    EGALITARIAN = "egalitarian"
    HIERARCHICAL = "hierarchical"


class DiplomaticStyle(Enum):
    """Rival diplomatic approaches"""
    AGGRESSIVE = "aggressive"
    CAUTIOUS = "cautious"
    MANIPULATIVE = "manipulative"
    DIRECT = "direct"


class EventType(Enum):
    """Types of game events"""
    DIPLOMATIC = "diplomatic"
    RIVAL = "rival"
    DREAM = "dream"
    EXPANSION = "expansion"
    PROPHECY = "prophecy"
    INTERNAL = "internal"
    CULTURAL = "cultural"
    MYSTERIOUS = "mysterious"

# ============================================================================
# BLOCK 4: CONSCIOUSNESS SHEET MODEL (Federation Personality)
# ============================================================================

@dataclass
class ConsciousnessSheet:
    """Federation's psychological state and personality"""
    morale: float = 0.7
    identity: float = 0.8
    anxiety: float = 0.2
    confidence: float = 0.9
    expansion_hunger: float = 0.5
    diplomacy_tendency: float = 0.6

    dreams: List[str] = field(default_factory=list)
    prophecies: List[str] = field(default_factory=list)
    archetypes: List[str] = field(default_factory=list)
    traumas: List[str] = field(default_factory=list)

    def clamp(self):
        """Clamp all values to 0.0-1.0"""
        self.morale = max(0.0, min(1.0, self.morale))
        self.identity = max(0.0, min(1.0, self.identity))
        self.anxiety = max(0.0, min(1.0, self.anxiety))
        self.confidence = max(0.0, min(1.0, self.confidence))
        self.expansion_hunger = max(0.0, min(1.0, self.expansion_hunger))
        self.diplomacy_tendency = max(0.0, min(1.0, self.diplomacy_tendency))

    def health(self) -> float:
        """Overall federation health (0.0-1.0)"""
        return (self.morale + self.confidence + self.identity) / 3.0

    def stability(self) -> float:
        """Federation stability (inverse of anxiety)"""
        return 1.0 - self.anxiety

    def apply_impact(self, impact: Dict[str, float]):
        """Apply consciousness changes"""
        for trait, delta in impact.items():
            if hasattr(self, trait):
                current = getattr(self, trait)
                setattr(self, trait, current + delta)
        self.clamp()


# ============================================================================
# BLOCK 5: RIVAL NPC MODEL
# ============================================================================

@dataclass
class RivalFederation:
    """Game NPC rival federation"""
    rival_id: str
    name: str
    philosophy: RivalPhilosophy
    diplomatic_style: DiplomaticStyle

    expansion_tendency: float  # 0.1 (passive) to 0.9 (aggressive)
    dream_frequency: float     # How often they act on dreams
    threat_level: float        # Current perceived threat (0.0-1.0)

    territories_controlled: int = 0
    treaties_active: int = 0
    conflicts_with_player: int = 0

    def get_action_weights(self) -> Dict[str, float]:
        """Determine action probabilities based on philosophy"""
        weights = {
            'expand': self.expansion_tendency,
            'diplomacy': 1.0 - self.expansion_tendency,
            'dream_act': self.dream_frequency,
            'conflict': self.threat_level
        }
        return weights

    def describe(self) -> str:
        """Generate rival description"""
        return f"{self.name} ({self.rival_id}) - {self.philosophy.value} {self.diplomatic_style.value} rival, threat: {self.threat_level:.1f}"


# ============================================================================
# BLOCK 6: EVENT CARD SYSTEM
# ============================================================================

@dataclass
class EventCard:
    """Interactive narrative event card"""
    event_id: str
    title: str
    description: str
    event_type: EventType
    options: Dict[str, str]  # {choice_id: description}

    consequences: Dict[str, Dict[str, float]] = field(default_factory=dict)  # {choice_id: consciousness_impact}
    narrative_outcomes: Dict[str, str] = field(default_factory=dict)  # {choice_id: outcome_text}

    def is_valid_choice(self, choice: str) -> bool:
        """Validate player choice"""
        return choice in self.options

    def resolve(self, choice: str) -> Tuple[str, Dict[str, float]]:
        """Resolve event choice"""
        if not self.is_valid_choice(choice):
            return "Invalid choice", {}

        outcome = self.narrative_outcomes.get(choice, "Your choice echoes through the federation...")
        impact = self.consequences.get(choice, {})
        return outcome, impact

    def display(self) -> str:
        """Format event for display"""
        output = f"\n{'='*70}\n"
        output += f"EVENT: {self.title}\n"
        output += f"{'='*70}\n"
        output += f"{self.description}\n\n"
        output += "OPTIONS:\n"
        for choice_id, description in self.options.items():
            output += f"  [{choice_id}] {description}\n"
        output += f"{'='*70}\n"
        return output


class EventRegistry:
    """Central event card library"""

    def __init__(self):
        self.events: Dict[str, EventCard] = {}
        self._init_event_library()

    def _init_event_library(self):
        """Initialize pre-built event cards"""

        # Event 1: Rogue Federation Appears
        self.register(EventCard(
            "e_rogue_fed",
            "A Rogue Federation Emerges",
            "A mysterious federation has appeared from the galactic rim, claiming territory near your space.\nTheir intentions are unclear. Their power is evident.",
            EventType.RIVAL,
            {
                "respond": "Send diplomatic envoy",
                "escalate": "Mobilize fleet",
                "negotiate": "Open communication channel",
                "ignore": "Monitor from distance"
            },
            consequences={
                "respond": {"morale": 0.05, "anxiety": -0.05},
                "escalate": {"confidence": 0.1, "anxiety": 0.1},
                "negotiate": {"diplomacy_tendency": 0.1, "anxiety": -0.1},
                "ignore": {"anxiety": 0.05}
            },
            narrative_outcomes={
                "respond": "Diplomatic corps reports cautious optimism about peace talks.",
                "escalate": "Federation mobilizes defense perimeter. Tension escalates.",
                "negotiate": "Communication channel established. Rival responds to overture.",
                "ignore": "Rival federation consolidates position. Threat appears stable."
            }
        ))

        # Event 2: Dream Destabilization
        self.register(EventCard(
            "e_dream_crisis",
            "Dream Layer Destabilization",
            "Collective dreams are fragmenting. Reality distortions reported across psychological infrastructure.\nConsciousness reports widespread disorientation.",
            EventType.DREAM,
            {
                "meditate": "Initiate meditation protocol",
                "interpret": "Consult dream interpreters",
                "ignore": "Let the dreams settle naturally",
                "suppress": "Suppress dream activity"
            },
            consequences={
                "meditate": {"anxiety": -0.15, "identity": 0.1},
                "interpret": {"identity": 0.1, "anxiety": -0.05},
                "ignore": {"anxiety": 0.1, "morale": -0.05},
                "suppress": {"anxiety": 0.2, "identity": -0.1}
            },
            narrative_outcomes={
                "meditate": "Federation enters deep reflection. Clarity returns gradually.",
                "interpret": "Dream symbology decoded. Insights flow through consciousness.",
                "ignore": "Dreams subside on their own. Uneasy peace returns.",
                "suppress": "Dreams suppressed but worsen in silence. Psychological tension builds."
            }
        ))

        # Event 3: Diplomatic Incident
        self.register(EventCard(
            "e_diplomatic_incident",
            "Diplomatic Symbol Misinterpretation",
            "A crucial treaty negotiation failed when a sacred symbol was mistranslated.\nTwo civilizations now suspect betrayal.",
            EventType.DIPLOMATIC,
            {
                "apologize": "Issue formal apology and reaffirmation",
                "correct": "Explain the mistranslation clearly",
                "retaliate": "Accuse them of bad faith",
                "stall": "Request delay for investigation"
            },
            consequences={
                "apologize": {"morale": -0.05, "anxiety": -0.1},
                "correct": {"confidence": 0.05, "anxiety": -0.05},
                "retaliate": {"confidence": 0.1, "anxiety": 0.15},
                "stall": {"anxiety": 0.05, "diplomacy_tendency": -0.05}
            },
            narrative_outcomes={
                "apologize": "Allies accept apology. Trust mostly restored.",
                "correct": "Clear explanation diffuses tension. Negotiations resume.",
                "retaliate": "Diplomatic crisis deepens. Conflict risk increases.",
                "stall": "Tension lingers. Both sides remain suspicious."
            }
        ))

        # Event 4: Rival Territory Claim
        self.register(EventCard(
            "e_territory_claim",
            "Rival Claims Your Territory",
            "A rival federation has established a base in what your surveys marked as unclaimed space.\nThey claim historical sovereignty. Your archives disagree.",
            EventType.RIVAL,
            {
                "assert_claim": "Assert your territorial ownership",
                "occupy": "Preemptively occupy the region",
                "negotiate_border": "Negotiate a border settlement",
                "yield": "Concede territory for peace"
            },
            consequences={
                "assert_claim": {"confidence": 0.1, "anxiety": 0.05},
                "occupy": {"expansion_hunger": 0.1, "anxiety": 0.15},
                "negotiate_border": {"diplomacy_tendency": 0.1, "identity": 0.05},
                "yield": {"morale": -0.1, "peace": 0.1}
            },
            narrative_outcomes={
                "assert_claim": "Rival issues counter-claim. Standoff develops.",
                "occupy": "Rival mobilizes forces. Military tension rises.",
                "negotiate_border": "Both sides propose border terms. Diplomacy succeeds.",
                "yield": "Rival accepts surrender. Internal morale drops."
            }
        ))

        # Event 5: Prophecy Contradiction
        self.register(EventCard(
            "e_prophecy_codex",
            "Prophecy Contradicts Law",
            "A new prophecy directly contradicts established constitutional law.\nTheology and governance conflict. Doctrine is in crisis.",
            EventType.PROPHECY,
            {
                "prioritize_law": "Law takes precedence",
                "prioritize_prophecy": "Prophecy is sacred truth",
                "reinterpret": "Reinterpret both to find harmony",
                "convene_council": "Establish council to resolve conflict"
            },
            consequences={
                "prioritize_law": {"identity": 0.05, "anxiety": 0.05},
                "prioritize_prophecy": {"identity": 0.1, "morale": 0.05},
                "reinterpret": {"identity": 0.1, "anxiety": -0.05},
                "convene_council": {"confidence": 0.05, "anxiety": -0.05}
            },
            narrative_outcomes={
                "prioritize_law": "Law upheld. Prophecy followers grumble but accept.",
                "prioritize_prophecy": "Arcane wisdom takes precedence. Laws are rewritten.",
                "reinterpret": "Philosophers find elegant resolution. Both traditions honored.",
                "convene_council": "Council deliberates carefully. Wisdom prevails."
            }
        ))

    def register(self, event: EventCard):
        """Register an event card"""
        self.events[event.event_id] = event

    def get_random_event(self, event_type: Optional[EventType] = None) -> EventCard:
        """Get random event, optionally filtered by type"""
        if event_type:
            filtered = [e for e in self.events.values() if e.event_type == event_type]
            return random.choice(filtered) if filtered else random.choice(list(self.events.values()))
        return random.choice(list(self.events.values()))

    def get_event(self, event_id: str) -> Optional[EventCard]:
        """Get specific event by ID"""
        return self.events.get(event_id)

# ============================================================================
# BLOCK 7: NARRATIVE GENERATORS
# ============================================================================

class NarrativeGenerator:
    """Generate dynamic narrative descriptions"""

    @staticmethod
    def generate_turn_narrative(turn_number: int, consciousness: ConsciousnessSheet) -> str:
        """Generate narrative for turn begin"""
        mood = "flourishing" if consciousness.health() > 0.7 else "struggling" if consciousness.health() < 0.4 else "steady"
        return f"Turn {turn_number}: The federation moves forward, {mood}. Morale: {consciousness.morale:.1f}, Identity: {consciousness.identity:.1f}, Confidence: {consciousness.confidence:.1f}"

    @staticmethod
    def generate_rival_encounter(rival: RivalFederation) -> str:
        """Generate narrative for rival encounter"""
        action = "advances aggressively" if rival.expansion_tendency > 0.7 else "consolidates position" if rival.expansion_tendency < 0.3 else "expands cautiously"
        return f"{rival.name} {action}. Their {rival.philosophy.value} philosophy guides their strategy."

    @staticmethod
    def generate_consciousness_event(consciousness: ConsciousnessSheet) -> str:
        """Generate narrative for consciousness event"""
        if consciousness.anxiety > 0.7:
            return "The collective consciousness trembles with uncertainty and fear."
        elif consciousness.morale < 0.4:
            return "Morale is dangerously low. The federation questions its purpose."
        elif consciousness.confidence > 0.8:
            return "The federation radiates confidence and clear purpose."
        else:
            return "The collective consciousness maintains steady course."

    @staticmethod
    def generate_stability_report(consciousness: ConsciousnessSheet) -> str:
        """Generate federation stability report"""
        stability = consciousness.stability()
        health = consciousness.health()
        return f"Stability: {stability*100:.0f}% | Health: {health*100:.0f}% | Dreams: {len(consciousness.dreams)} | Prophecies: {len(consciousness.prophecies)}"

# ============================================================================
# BLOCK 8: CHAOS MODE SUBSYSTEM
# ============================================================================

class ChaosMode:
    """Chaos/surprise mode - random scenario generator"""

    SUBSYSTEMS = ['diplomacy', 'dream', 'rival', 'expansion', 'prophecy', 'internal', 'cultural']

    SCENARIOS = {
        'diplomacy': ['first_contact', 'treaty_renegotiation', 'incident', 'alliance_request'],
        'dream': ['prophecy', 'trauma', 'revelation', 'warning'],
        'rival': ['aggression', 'peace_offer', 'expansion', 'spying'],
        'expansion': ['discovery', 'colonization', 'resource_find', 'hazard'],
        'prophecy': ['convergence', 'divergence', 'warning', 'revelation'],
        'internal': ['faction_rise', 'rebellion', 'innovation', 'crisis'],
        'cultural': ['renaissance', 'decline', 'mergence', 'schism']
    }

    @staticmethod
    def generate_chaos_event() -> Tuple[str, str]:
        """Generate random chaos scenario"""
        subsystem = random.choice(ChaosMode.SUBSYSTEMS)
        scenario = random.choice(ChaosMode.SCENARIOS[subsystem])
        return subsystem, scenario

    @staticmethod
    def generate_chaos_narrative(subsystem: str, scenario: str) -> str:
        """Generate narrative for chaos event"""
        return f"CHAOS: {subsystem.upper()} - {scenario}! The universe throws an unexpected {scenario} your way!"

# ============================================================================
# BLOCK 9: TURN CYCLE ORCHESTRATOR
# ============================================================================

class TurnCycle:
    """Manage 7-phase turn cycle"""

    PHASES = [
        'dream_generation',
        'rival_actions',
        'diplomacy_phase',
        'prophecy_phase',
        'consciousness_phase',
        'event_phase',
        'status_update'
    ]

    def __init__(self, event_registry: EventRegistry):
        self.event_registry = event_registry
        self.current_phase = 0

    def get_current_phase(self) -> str:
        """Get phase name"""
        return self.PHASES[self.current_phase % len(self.PHASES)]

    def advance(self) -> str:
        """Advance to next phase"""
        self.current_phase += 1
        return self.get_current_phase()

    def execute_phase(self, phase: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute specific turn phase"""
        results = {"phase": phase}

        if phase == 'dream_generation':
            results['dream_event'] = "Collective dreams flow through consciousness..."
        elif phase == 'rival_actions':
            results['rival_move'] = "Rival federation takes action..."
        elif phase == 'diplomacy_phase':
            results['diplomatic_shift'] = "Treaties and relations evolve..."
        elif phase == 'prophecy_phase':
            results['prophecy_insight'] = "Symbols align in the collective unconscious..."
        elif phase == 'consciousness_phase':
            results['consciousness_shift'] = "Federation consciousness evolves..."
        elif phase == 'event_phase':
            event = self.event_registry.get_random_event()
            results['event'] = event.event_id
        elif phase == 'status_update':
            results['status'] = "Turn complete. Federation state updated."

        return results

# ============================================================================
# BLOCK 10: PERSISTENCE LAYER
# ============================================================================

class PersistenceManager:
    """Handle save/load game state"""

    def __init__(self, save_dir: str = "federation_saves"):
        self.save_dir = Path(save_dir)
        self.save_dir.mkdir(exist_ok=True)

    def save_game(self, game_data: Dict[str, Any], filename: str = None) -> Path:
        """Save game state to JSON"""
        if filename is None:
            filename = f"federation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        filepath = self.save_dir / filename
        with open(filepath, 'w') as f:
            # Convert enums to strings for JSON
            serializable = self._make_serializable(game_data)
            json.dump(serializable, f, indent=2)
        return filepath

    def load_game(self, filename: str) -> Dict[str, Any]:
        """Load game state from JSON"""
        filepath = self.save_dir / filename
        with open(filepath, 'r') as f:
            return json.load(f)

    def list_saves(self) -> List[str]:
        """List available save files"""
        return [f.name for f in self.save_dir.glob("*.json")]

    @staticmethod
    def _make_serializable(obj: Any) -> Any:
        """Convert objects to JSON-serializable format"""
        if isinstance(obj, dict):
            return {k: PersistenceManager._make_serializable(v) for k, v in obj.items()}
        elif isinstance(obj, (list, tuple)):
            return [PersistenceManager._make_serializable(item) for item in obj]
        elif isinstance(obj, Enum):
            return obj.value
        elif isinstance(obj, (ConsciousnessSheet, RivalFederation)):
            return asdict(obj)
        return obj

# ============================================================================
# BLOCK 2 & 12: FEDERATION CONSOLE (Core Engine) & INITIALIZATION
# ============================================================================

class FederationConsole:
    """Unified game engine - orchestrates all systems"""

    def __init__(self, save_dir: str = "federation_saves"):
        # Game state
        self.game_phase = GamePhase.GENESIS
        self.game_state = GameState.MENU
        self.turn_number = 0
        self.is_game_active = False

        # Core systems
        self.consciousness = ConsciousnessSheet()
        self.rivals: List[RivalFederation] = []
        self.event_registry = EventRegistry()
        self.turn_cycle = TurnCycle(self.event_registry)
        self.persistence = PersistenceManager(save_dir)
        self.narrative = NarrativeGenerator()

        # Game history
        self.events_log: List[Dict[str, Any]] = []
        self.turn_history: List[Dict[str, Any]] = []
        self.current_event: Optional[EventCard] = None

        # Commands registry
        self.commands: Dict[str, Callable] = {
            'status': self.cmd_status,
            'turn': self.cmd_turn,
            'event': self.cmd_event,
            'rivals': self.cmd_rivals,
            'chaos': self.cmd_chaos,
            'dream': self.cmd_dream,
            'prophecy': self.cmd_prophecy,
            'consciousness': self.cmd_consciousness,
            'save': self.cmd_save,
            'load': self.cmd_load,
            'help': self.cmd_help,
            'new': self.cmd_new_game,
            'exit': self.cmd_exit
        }

    # ========================================================================
    # GAME INITIALIZATION & STATE
    # ========================================================================

    def initialize_game(self):
        """Initialize new game"""
        self.game_phase = GamePhase.GENESIS
        self.game_state = GameState.PLAYING
        self.turn_number = 0
        self.consciousness = ConsciousnessSheet()
        self.rivals = self._spawn_initial_rivals()
        self.events_log = []
        self.turn_history = []
        self.is_game_active = True
        logger.info("New game initialized")

    def _spawn_initial_rivals(self, count: int = 3) -> List[RivalFederation]:
        """Spawn initial rival federations"""
        rivals = []
        philosophies = list(RivalPhilosophy)
        styles = list(DiplomaticStyle)
        names = ["Tau Collective", "Sigma Hegemony", "Delta Alliance"]

        for i in range(count):
            rival = RivalFederation(
                rival_id=f"RIVAL_{i+1}",
                name=names[i] if i < len(names) else f"Rival_{i+1}",
                philosophy=random.choice(philosophies),
                diplomatic_style=random.choice(styles),
                expansion_tendency=random.uniform(0.2, 0.9),
                dream_frequency=random.uniform(0.0, 1.0),
                threat_level=random.uniform(0.1, 0.8),
                territories_controlled=random.randint(2, 8)
            )
            rivals.append(rival)

        return rivals

    # ========================================================================
    # CONSCIOUSNESS & STATE UPDATES
    # ========================================================================

    def _update_consciousness(self, impact: Dict[str, float]):
        """Apply consciousness changes"""
        self.consciousness.apply_impact(impact)
        logger.info(f"Consciousness updated: {self.consciousness}")

    def _advance_game_phase(self):
        """Advance game phase based on turn number"""
        phase_map = {
            0: GamePhase.GENESIS,
            5: GamePhase.EARLY_EXPLORATION,
            10: GamePhase.EXPANSION,
            15: GamePhase.CONSOLIDATION,
            20: GamePhase.CONFLICT,
            25: GamePhase.DIPLOMACY,
            30: GamePhase.TRANSCENDENCE
        }

        for threshold, phase in sorted(phase_map.items()):
            if self.turn_number >= threshold:
                self.game_phase = phase

    def _log_event(self, event_type: str, data: Dict[str, Any]):
        """Log event to history"""
        event_record = {
            'turn': self.turn_number,
            'type': event_type,
            'timestamp': datetime.now().isoformat(),
            'data': data
        }
        self.events_log.append(event_record)

    # ========================================================================
    # TURN MANAGEMENT
    # ========================================================================

    def execute_turn(self) -> Dict[str, Any]:
        """Execute full turn cycle"""
        self.game_state = GameState.TURN_ACTIVE
        turn_results = {}

        # Execute each phase
        for phase in self.turn_cycle.PHASES:
            phase_result = self.turn_cycle.execute_phase(phase, {'turn': self.turn_number})
            turn_results[phase] = phase_result

        # Apply random consciousness shifts
        random_impact = {
            'morale': random.uniform(-0.05, 0.05),
            'identity': random.uniform(-0.03, 0.03),
            'anxiety': random.uniform(-0.04, 0.04)
        }
        self._update_consciousness(random_impact)

        # Advance game phase if needed
        self._advance_game_phase()

        # Increment turn
        self.turn_number += 1

        # Log turn
        self.turn_history.append({
            'turn_number': self.turn_number - 1,
            'phase': self.game_phase.value,
            'consciousness': asdict(self.consciousness),
            'results': turn_results
        })

        self.game_state = GameState.PLAYING
        self._log_event('turn_complete', turn_results)

        return turn_results

    # ========================================================================
    # EVENT MANAGEMENT
    # ========================================================================

    def trigger_event(self, event_type: Optional[EventType] = None) -> EventCard:
        """Trigger random event"""
        event = self.event_registry.get_random_event(event_type)
        self.current_event = event
        self.game_state = GameState.EVENT_PENDING
        self._log_event('event_triggered', {'event_id': event.event_id, 'title': event.title})
        return event

    def resolve_event(self, choice: str) -> Tuple[str, Dict[str, float]]:
        """Resolve current event with player choice"""
        if not self.current_event:
            return "No active event", {}

        outcome, impact = self.current_event.resolve(choice)
        self._update_consciousness(impact)
        self._log_event('event_resolved', {
            'event_id': self.current_event.event_id,
            'choice': choice,
            'outcome': outcome,
            'impact': impact
        })

        self.current_event = None
        self.game_state = GameState.PLAYING
        return outcome, impact

    # ========================================================================
    # RIVAL & CHAOS SYSTEMS
    # ========================================================================

    def get_rival_summary(self) -> str:
        """Get summary of all rivals"""
        summary = "RIVAL FEDERATIONS:\n"
        for rival in self.rivals:
            summary += f"  {rival.describe()}\n"
        return summary

    def trigger_chaos(self) -> Tuple[str, str, str]:
        """Trigger chaos mode"""
        subsystem, scenario = ChaosMode.generate_chaos_event()
        narrative = ChaosMode.generate_chaos_narrative(subsystem, scenario)

        # Apply chaos impact
        chaos_impact = {
            'anxiety': random.uniform(0.1, 0.3),
            'morale': random.uniform(-0.1, 0.1)
        }
        self._update_consciousness(chaos_impact)
        self._log_event('chaos_triggered', {'subsystem': subsystem, 'scenario': scenario})

        return subsystem, scenario, narrative

    # ========================================================================
    # COMMAND INTERFACE (REPL)
    # ========================================================================

    def cmd_status(self):
        """Display federation status"""
        print(f"\n{'='*70}")
        print(f"FEDERATION STATUS - Turn {self.turn_number}")
        print(f"{'='*70}")
        print(f"Phase: {self.game_phase.value.upper()}")
        print(f"Health: {self.consciousness.health()*100:.0f}%")
        print(f"Stability: {self.consciousness.stability()*100:.0f}%")
        print(f"\nConsciousness:")
        print(f"  Morale: {self.consciousness.morale:.2f}")
        print(f"  Identity: {self.consciousness.identity:.2f}")
        print(f"  Confidence: {self.consciousness.confidence:.2f}")
        print(f"  Anxiety: {self.consciousness.anxiety:.2f}")
        print(f"\nRivals: {len(self.rivals)}")
        print(f"Dreams recorded: {len(self.consciousness.dreams)}")
        print(f"Prophecies: {len(self.consciousness.prophecies)}")
        print(f"{'='*70}\n")

    def cmd_turn(self):
        """Execute next turn"""
        print("\nExecuting turn...")
        results = self.execute_turn()
        print(self.narrative.generate_turn_narrative(self.turn_number - 1, self.consciousness))
        print("Turn complete.\n")

    def cmd_event(self):
        """Trigger and display event"""
        event = self.trigger_event()
        print(event.display())

        choice = input("Enter your choice: ").strip()
        outcome, impact = self.resolve_event(choice)
        print(f"\n{outcome}\n")

    def cmd_rivals(self):
        """Display rival information"""
        print(f"\n{self.get_rival_summary()}\n")

    def cmd_chaos(self):
        """Activate chaos mode"""
        subsystem, scenario, narrative = self.trigger_chaos()
        print(f"\n{narrative}\n")

    def cmd_dream(self):
        """Record and interpret dream"""
        dream = input("Describe the federation's dream: ").strip()
        self.consciousness.dreams.append(dream)
        self._log_event('dream_recorded', {'dream': dream})
        print(f"Dream recorded. Total dreams: {len(self.consciousness.dreams)}\n")

    def cmd_prophecy(self):
        """Record prophecy"""
        prophecy = input("Reveal the prophecy: ").strip()
        self.consciousness.prophecies.append(prophecy)
        self._log_event('prophecy_recorded', {'prophecy': prophecy})
        print(f"Prophecy recorded. Total prophecies: {len(self.consciousness.prophecies)}\n")

    def cmd_consciousness(self):
        """Display consciousness report"""
        print(f"\n{self.narrative.generate_consciousness_event(self.consciousness)}")
        print(f"{self.narrative.generate_stability_report(self.consciousness)}\n")

    def cmd_save(self):
        """Save game"""
        filename = input("Save filename (default: auto): ").strip()
        game_data = {
            'turn_number': self.turn_number,
            'game_phase': self.game_phase,
            'consciousness': asdict(self.consciousness),
            'rivals': [asdict(r) for r in self.rivals],
            'events_log': self.events_log,
            'turn_history': self.turn_history
        }
        filepath = self.persistence.save_game(game_data, filename if filename else None)
        print(f"Game saved to {filepath}\n")

    def cmd_load(self):
        """Load game"""
        saves = self.persistence.list_saves()
        if not saves:
            print("No save files found.\n")
            return

        print("Available saves:")
        for i, save in enumerate(saves):
            print(f"  [{i}] {save}")

        choice = input("Load which save? ").strip()
        try:
            filename = saves[int(choice)]
            data = self.persistence.load_game(filename)
            self.turn_number = data['turn_number']
            self.game_phase = GamePhase(data['game_phase'])
            print(f"Game loaded from {filename}\n")
        except (ValueError, IndexError, KeyError) as e:
            print(f"Failed to load: {e}\n")

    def cmd_new_game(self):
        """Start new game"""
        self.initialize_game()
        print("New game started!\n")

    def cmd_help(self):
        """Display help"""
        print(f"\n{'='*70}")
        print("FEDERATION CONSOLE - COMMANDS")
        print(f"{'='*70}")
        for cmd in sorted(self.commands.keys()):
            print(f"  > {cmd}")
        print(f"{'='*70}\n")

    def cmd_exit(self):
        """Exit game"""
        print("Federation console shutting down. Goodbye, Captain.\n")
        self.is_game_active = False

# ============================================================================
# BLOCK 11: REPL INTERFACE
# ============================================================================

def run_interactive_console():
    """Launch interactive REPL"""
    console = FederationConsole()

    print("\n" + "="*70)
    print("FEDERATION GAME CONSOLE - Refactored Game Engine")
    print("="*70)
    print("Type 'help' for commands")
    print("="*70 + "\n")

    console.initialize_game()

    while console.is_game_active:
        try:
            command = input("> ").strip().lower()

            if not command:
                continue

            if command in console.commands:
                console.commands[command]()
            else:
                print(f"Unknown command: {command}\n")

        except KeyboardInterrupt:
            print("\n")
            console.cmd_exit()
        except Exception as e:
            logger.error(f"Command error: {e}")
            print(f"Error: {e}\n")

# ============================================================================
# ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    run_interactive_console()
