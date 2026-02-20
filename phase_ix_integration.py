#!/usr/bin/env python3
"""
PHASE IX INTEGRATION - NARRATIVE EVENTS LAYER
~450 LOC - Production-Ready Event Integration

Bridges narrative events with the game console by:
- Integrating character dialogue into gameplay
- Binding event consequences to consciousness state
- Creating dynamic branching narratives
- Managing character life cycles and relationships
- Tracking event outcomes for historical records

Phase IX focuses on how events shape the federation's psychological state
and how that feeds back into future decisions.
"""

import asyncio
import json
import logging
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any, Callable, Tuple, Set
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("PhaseIX")


class DialogueType(Enum):
    """Types of character dialogue"""
    GREETING = "greeting"
    ADVICE = "advice"
    WARNING = "warning"
    CELEBRATION = "celebration"
    CONSOLATION = "consolation"
    PROPHECY = "prophecy"
    CHALLENGE = "challenge"
    ALLIANCE_OFFER = "alliance_offer"
    THREAT = "threat"
    RECONCILIATION = "reconciliation"


class CharacterRole(Enum):
    """Character types in narrative"""
    ALLY = "ally"
    RIVAL = "rival"
    NEUTRAL = "neutral"
    SPIRITUAL_GUIDE = "spiritual_guide"
    ELDER = "elder"
    VISIONARY = "visionary"
    TRICKSTER = "trickster"
    HARBINGER = "harbinger"


@dataclass
class Character:
    """Dynamic game character with personality and relationships"""
    character_id: str
    name: str
    role: CharacterRole
    alignment: float = 0.0  # -1.0 (hostile) to 1.0 (ally)
    influence: float = 0.5  # 0.0 (powerless) to 1.0 (extremely influential)
    knowledge_level: float = 0.5  # 0.0 (ignorant) to 1.0 (omniscient)

    personality_traits: List[str] = field(default_factory=list)
    dialogue_history: List[str] = field(default_factory=list)
    last_encounter: Optional[datetime] = None
    encounter_count: int = 0

    def __hash__(self):
        return hash(self.character_id)


@dataclass
class Dialogue:
    """Single dialogue exchange"""
    dialogue_id: str
    character: Character
    dialogue_type: DialogueType
    text: str
    timestamp: datetime = field(default_factory=datetime.now)
    emotional_weight: float = 0.0  # -1.0 (devastating) to 1.0 (uplifting)
    consciousness_impact: Dict[str, float] = field(default_factory=dict)
    dialogue_options: Dict[str, str] = field(default_factory=dict)  # choice_id -> response text

    def to_dict(self):
        """Convert to serializable format"""
        data = asdict(self)
        data['dialogue_type'] = self.dialogue_type.value
        data['timestamp'] = self.timestamp.isoformat()
        data['character'] = {
            'character_id': self.character.character_id,
            'name': self.character.name,
            'role': self.character.role.value,
            'alignment': self.character.alignment
        }
        return data


@dataclass
class NarrativeEvent:
    """Game event with narrative and dialogue components"""
    event_id: str
    title: str
    description: str
    trigger_condition: Callable[[Any], bool]  # Function to determine if event triggers
    primary_character: Optional[Character] = None
    supporting_characters: List[Character] = field(default_factory=list)
    dialogues: List[Dialogue] = field(default_factory=list)
    consequences: Dict[str, Dict[str, float]] = field(default_factory=dict)  # choice -> impact
    narrative_branches: Dict[str, str] = field(default_factory=dict)  # choice -> narrative text
    is_triggered: bool = False
    is_resolved: bool = False
    chosen_path: Optional[str] = None


class CharacterRegistry:
    """Manages all game characters and their states"""

    def __init__(self):
        self.characters: Dict[str, Character] = {}
        self.relationships: Dict[Tuple[str, str], float] = {}  # (char1_id, char2_id) -> relationship
        self.character_arcs: Dict[str, List[str]] = {}  # character_id -> [narrative_beats]
        self._init_base_characters()

    def _init_base_characters(self):
        """Initialize core characters for the federation"""
        characters = [
            Character(
                character_id="sage_meridian",
                name="Sage Meridian",
                role=CharacterRole.SPIRITUAL_GUIDE,
                alignment=0.8,
                influence=0.9,
                knowledge_level=0.95,
                personality_traits=["wise", "patient", "ancient", "cryptic"]
            ),
            Character(
                character_id="captain_void",
                name="Captain Void",
                role=CharacterRole.RIVAL,
                alignment=-0.7,
                influence=0.8,
                knowledge_level=0.7,
                personality_traits=["cunning", "ambitious", "dangerous", "visionary"]
            ),
            Character(
                character_id="elder_synthesis",
                name="Elder Synthesis",
                role=CharacterRole.ELDER,
                alignment=0.6,
                influence=0.7,
                knowledge_level=0.85,
                personality_traits=["measured", "experienced", "cautious"]
            ),
            Character(
                character_id="prophet_eclipse",
                name="Prophet Eclipse",
                role=CharacterRole.HARBINGER,
                alignment=0.0,
                influence=0.6,
                knowledge_level=0.9,
                personality_traits=["mysterious", "volatile", "profound"]
            ),
        ]

        for char in characters:
            self.register_character(char)

    def register_character(self, character: Character):
        """Register a character"""
        self.characters[character.character_id] = character
        self.character_arcs[character.character_id] = []
        logger.info(f"Character registered: {character.name}")

    def get_character(self, character_id: str) -> Optional[Character]:
        """Get character by ID"""
        return self.characters.get(character_id)

    def update_relationship(self, char1_id: str, char2_id: str, delta: float):
        """Update relationship between two characters"""
        key = tuple(sorted([char1_id, char2_id]))
        current = self.relationships.get(key, 0.0)
        self.relationships[key] = max(-1.0, min(1.0, current + delta))

    def get_relationship(self, char1_id: str, char2_id: str) -> float:
        """Get relationship between characters (-1.0 to 1.0)"""
        key = tuple(sorted([char1_id, char2_id]))
        return self.relationships.get(key, 0.0)

    def add_narrative_beat(self, character_id: str, beat: str):
        """Record narrative beat for character arc"""
        if character_id in self.character_arcs:
            self.character_arcs[character_id].append(beat)


class DialogueEngine:
    """Generates and manages dialogue exchanges"""

    DIALOGUE_TEMPLATES = {
        DialogueType.GREETING: [
            "Greetings, {character}. The cosmos bends toward convergence.",
            "Welcome, federation. I have been expecting your arrival.",
            "{character} nods solemnly as you approach.",
            "The wheel turns, and you arrive at precisely the right moment."
        ],
        DialogueType.ADVICE: [
            "Trust in the patterns, but verify with evidence.",
            "Your strength lies not in power, but in understanding.",
            "Listen to those who have walked this path before.",
            "The answer you seek is already within you."
        ],
        DialogueType.WARNING: [
            "Beware the shadows that gather at the edges.",
            "Time grows short. Act now or lose the moment forever.",
            "Dark forces move. Prepare yourself for what comes.",
            "The path you walk has others watching from the darkness."
        ],
        DialogueType.CELEBRATION: [
            "You have achieved what many thought impossible!",
            "The federation shines brighter than ever before.",
            "This victory echoes across the cosmos!",
            "You have proven your worth beyond doubt."
        ],
        DialogueType.PROPHECY: [
            "Three times the circle closes. Then comes the choosing.",
            "The future splits like lightning. Which branch will you follow?",
            "A convergence approaches. All threads lead to this moment.",
            "What was hidden shall be revealed. What was lost shall return."
        ]
    }

    @staticmethod
    def generate_dialogue(
        character: Character,
        dialogue_type: DialogueType,
        context: Dict[str, Any] = None
    ) -> Dialogue:
        """Generate dialogue for a character"""
        templates = DialogueEngine.DIALOGUE_TEMPLATES.get(dialogue_type, [])
        text = templates[0] if templates else f"{character.name} looks at you meaningfully."

        # Determine emotional weight based on character alignment and dialogue type
        emotional_weight = 0.0
        if dialogue_type in [DialogueType.WARNING, DialogueType.THREAT]:
            emotional_weight = -0.7 if character.alignment < 0 else -0.3
        elif dialogue_type in [DialogueType.CELEBRATION, DialogueType.ALLIANCE_OFFER]:
            emotional_weight = 0.7 if character.alignment > 0 else 0.3
        elif dialogue_type == DialogueType.PROPHECY:
            emotional_weight = 0.5 * character.influence

        dialogue = Dialogue(
            dialogue_id=f"dialogue_{datetime.now().timestamp()}",
            character=character,
            dialogue_type=dialogue_type,
            text=text,
            emotional_weight=emotional_weight,
            consciousness_impact={
                'morale': 0.1 * emotional_weight,
                'confidence': 0.05 if emotional_weight > 0 else -0.05,
                'anxiety': -0.1 * emotional_weight if emotional_weight > 0 else 0.1
            }
        )

        return dialogue


class NarrativeEventSystem:
    """Core system for managing narrative events and their gameplay integration"""

    def __init__(self, character_registry: CharacterRegistry):
        self.character_registry = character_registry
        self.dialogue_engine = DialogueEngine()
        self.active_events: Dict[str, NarrativeEvent] = {}
        self.completed_events: List[NarrativeEvent] = []
        self.dialogue_queue: List[Dialogue] = []
        self.narrative_history: List[Dict[str, Any]] = []

    def create_event(
        self,
        event_id: str,
        title: str,
        description: str,
        primary_character: Character,
        trigger_condition: Callable[[Any], bool]
    ) -> NarrativeEvent:
        """Create a new narrative event"""
        event = NarrativeEvent(
            event_id=event_id,
            title=title,
            description=description,
            trigger_condition=trigger_condition,
            primary_character=primary_character
        )
        self.active_events[event_id] = event
        logger.info(f"Event created: {title}")
        return event

    def add_dialogue_to_event(
        self,
        event_id: str,
        dialogue_type: DialogueType,
        character: Optional[Character] = None,
        text: Optional[str] = None,
        emotional_weight: float = 0.0
    ) -> Dialogue:
        """Add dialogue to an event"""
        if event_id not in self.active_events:
            raise ValueError(f"Event {event_id} not found")

        event = self.active_events[event_id]
        char = character or event.primary_character

        if char is None:
            raise ValueError("No character specified for dialogue")

        # Generate or use provided dialogue
        if text:
            dialogue = Dialogue(
                dialogue_id=f"dialogue_{datetime.now().timestamp()}",
                character=char,
                dialogue_type=dialogue_type,
                text=text,
                emotional_weight=emotional_weight
            )
        else:
            dialogue = self.dialogue_engine.generate_dialogue(char, dialogue_type)

        event.dialogues.append(dialogue)
        self.dialogue_queue.append(dialogue)

        # Record narrative beat
        self.character_registry.add_narrative_beat(
            char.character_id,
            f"{dialogue_type.value}: {dialogue.text[:50]}..."
        )

        return dialogue

    async def trigger_event(
        self,
        event_id: str,
        game_state: Any
    ) -> Tuple[bool, Optional[NarrativeEvent]]:
        """Check and trigger an event if condition is met"""
        if event_id not in self.active_events:
            return False, None

        event = self.active_events[event_id]
        if event.is_triggered or event.is_resolved:
            return False, None

        # Check trigger condition
        if not event.trigger_condition(game_state):
            return False, None

        event.is_triggered = True
        logger.info(f"Event triggered: {event.title}")

        # Execute all dialogues
        for dialogue in event.dialogues:
            await self._execute_dialogue(dialogue, game_state)

        return True, event

    async def _execute_dialogue(self, dialogue: Dialogue, game_state: Any):
        """Execute dialogue and apply effects"""
        # Record dialogue
        dialogue.character.dialogue_history.append(dialogue.text)
        dialogue.character.last_encounter = datetime.now()
        dialogue.character.encounter_count += 1

        # Apply consciousness impact if available
        if hasattr(game_state, 'consciousness') and dialogue.consciousness_impact:
            game_state.consciousness.apply_impact(dialogue.consciousness_impact)

        # Record to narrative history
        self.narrative_history.append({
            'timestamp': datetime.now().isoformat(),
            'character': dialogue.character.name,
            'dialogue_type': dialogue.dialogue_type.value,
            'text': dialogue.text,
            'impact': dialogue.consciousness_impact
        })

        logger.info(f"Dialogue executed: {dialogue.character.name} - {dialogue.dialogue_type.value}")

    def resolve_event(
        self,
        event_id: str,
        choice: str,
        game_state: Any
    ) -> Tuple[bool, str, Dict[str, float]]:
        """Resolve an event with player choice"""
        if event_id not in self.active_events:
            return False, "Event not found", {}

        event = self.active_events[event_id]
        if not event.is_triggered or event.is_resolved:
            return False, "Event is not active", {}

        if choice not in event.consequences:
            return False, f"Invalid choice: {choice}", {}

        # Apply consequences
        impact = event.consequences[choice]
        if hasattr(game_state, 'consciousness'):
            game_state.consciousness.apply_impact(impact)

        # Record narrative outcome
        outcome_text = event.narrative_branches.get(choice, "Your choice shapes the future.")

        event.chosen_path = choice
        event.is_resolved = True
        self.completed_events.append(event)

        # Update character relationships based on choice
        if event.primary_character:
            relationship_delta = 0.1 if "cooperate" in choice or "agree" in choice else -0.1
            for char in [event.primary_character] + event.supporting_characters:
                char.alignment += relationship_delta * 0.1
                char.alignment = max(-1.0, min(1.0, char.alignment))

        logger.info(f"Event resolved: {event.title} - Choice: {choice}")

        return True, outcome_text, impact

    async def process_narrative_turn(self, game_state: Any) -> Dict[str, Any]:
        """Execute all narrative systems for a turn"""
        results = {
            'events_triggered': 0,
            'dialogues_processed': 0,
            'events_resolved': 0,
            'consciousness_changes': {}
        }

        # Check all events for triggering
        for event_id, event in list(self.active_events.items()):
            triggered, evt = await self.trigger_event(event_id, game_state)
            if triggered:
                results['events_triggered'] += 1

        # Clear dialogue queue
        results['dialogues_processed'] = len(self.dialogue_queue)
        self.dialogue_queue.clear()

        # Count resolved events this turn
        results['events_resolved'] = len([e for e in self.completed_events if not e.is_resolved])

        return results

    def get_narrative_summary(self) -> str:
        """Get summary of narrative state"""
        summary = f"Narrative Events: {len(self.active_events)} active, {len(self.completed_events)} completed\n"
        summary += f"Character Relationships:\n"

        for (char1_id, char2_id), relationship in self.character_registry.relationships.items():
            char1 = self.character_registry.get_character(char1_id)
            char2 = self.character_registry.get_character(char2_id)
            if char1 and char2:
                status = "ally" if relationship > 0.5 else "neutral" if relationship > -0.5 else "enemy"
                summary += f"  {char1.name} <-> {char2.name}: {relationship:.2f} ({status})\n"

        return summary

    def save_narrative_state(self, filepath: Path) -> bool:
        """Save narrative system state"""
        try:
            state = {
                'completed_events': [asdict(e) for e in self.completed_events],
                'narrative_history': self.narrative_history,
                'character_arcs': self.character_registry.character_arcs,
                'relationships': {
                    f"{k[0]}_{k[1]}": v for k, v in self.character_registry.relationships.items()
                }
            }

            # Make serializable
            state_serializable = self._make_serializable(state)

            with open(filepath, 'w') as f:
                json.dump(state_serializable, f, indent=2)

            logger.info(f"Narrative state saved to {filepath}")
            return True
        except Exception as e:
            logger.error(f"Failed to save narrative state: {e}")
            return False

    def load_narrative_state(self, filepath: Path) -> bool:
        """Load narrative system state"""
        try:
            with open(filepath, 'r') as f:
                state = json.load(f)

            self.narrative_history = state.get('narrative_history', [])
            self.character_registry.character_arcs = state.get('character_arcs', {})

            # Restore relationships
            for key, value in state.get('relationships', {}).items():
                parts = key.split('_')
                if len(parts) >= 2:
                    char1_id = parts[0]
                    char2_id = '_'.join(parts[1:])
                    self.character_registry.relationships[(char1_id, char2_id)] = value

            logger.info(f"Narrative state loaded from {filepath}")
            return True
        except Exception as e:
            logger.error(f"Failed to load narrative state: {e}")
            return False

    @staticmethod
    def _make_serializable(obj: Any) -> Any:
        """Convert objects to JSON-serializable format"""
        if isinstance(obj, dict):
            return {k: NarrativeEventSystem._make_serializable(v) for k, v in obj.items()}
        elif isinstance(obj, (list, tuple)):
            return [NarrativeEventSystem._make_serializable(item) for item in obj]
        elif isinstance(obj, Enum):
            return obj.value
        elif hasattr(obj, '__dict__'):
            return NarrativeEventSystem._make_serializable(obj.__dict__)
        return obj


# Example usage and integration
async def example_narrative_integration():
    """Example of how to integrate Phase IX into game"""
    registry = CharacterRegistry()
    narrative_system = NarrativeEventSystem(registry)

    # Create an event
    sage = registry.get_character("sage_meridian")
    event = narrative_system.create_event(
        event_id="e_sage_counsel",
        title="Sage Meridian's Council",
        description="The ancient sage offers wisdom on your federation's path.",
        primary_character=sage,
        trigger_condition=lambda state: True  # Always triggers in this example
    )

    # Add dialogue
    narrative_system.add_dialogue_to_event(
        "e_sage_counsel",
        DialogueType.ADVICE,
        text="The path ahead splits. One leads to power, one to wisdom. Which calls to you?"
    )

    # Set event options and consequences
    event.narrative_branches = {
        'power': "You choose dominion. The sage nods, unsurprised.",
        'wisdom': "You choose understanding. The sage smiles."
    }
    event.consequences = {
        'power': {'confidence': 0.2, 'morale': 0.1},
        'wisdom': {'identity': 0.2, 'anxiety': -0.1}
    }

    print("Phase IX Integration Example Loaded")
    print(narrative_system.get_narrative_summary())


if __name__ == "__main__":
    asyncio.run(example_narrative_integration())
