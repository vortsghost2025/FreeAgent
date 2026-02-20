#!/usr/bin/env python3
"""
FEDERATION GAME PHASE IX - DIALOGUE ENGINE
~800 LOC - Production-Ready Dialogue System

Advanced dialogue system featuring:
- DialogueNode: Individual dialogue lines with emotion/personality
- DialogueTree: Tree structures for conversation branching
- CharacterDialogue: Character-specific dialogue personalities
- Multi-character conversations
- Emotion/personality system affecting dialogue
- Dynamic dialogue generation based on game state
- Async-ready architecture
- Windows console safe (no unicode/emoji)

The dialogue engine powers all character interactions in the federation game.
Characters speak with personality, emotion influences dialogue choices, and
conversations branch based on player decisions and game state.
"""

import sys
import io
import random
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Any, Tuple, Set, Callable
from enum import Enum
from datetime import datetime
from pathlib import Path
import json

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


# ============================================================================
# ENUMS: EMOTION, PERSONALITY, AND DIALOGUE TYPES
# ============================================================================

class EmotionalTone(Enum):
    """Emotional tone affecting dialogue delivery"""
    CONFIDENT = "confident"
    UNCERTAIN = "uncertain"
    ANGRY = "angry"
    AFRAID = "afraid"
    HOPEFUL = "hopeful"
    MELANCHOLIC = "melancholic"
    NEUTRAL = "neutral"
    PASSIONATE = "passionate"
    CAUTIOUS = "cautious"
    PLAYFUL = "playful"


class PersonalityArchetype(Enum):
    """Character personality archetypes"""
    THE_HERO = "the_hero"
    THE_MENTOR = "the_mentor"
    THE_SHADOW = "the_shadow"
    THE_TRICKSTER = "the_trickster"
    THE_SAGE = "the_sage"
    THE_LOVER = "the_lover"
    THE_INNOCENT = "the_innocent"
    THE_EXPLORER = "the_explorer"
    THE_CAREGIVER = "the_caregiver"
    THE_EVERYMAN = "the_everyman"


class DialogueType(Enum):
    """Types of dialogue interactions"""
    GREETING = "greeting"
    FAREWELL = "farewell"
    QUESTION = "question"
    STATEMENT = "statement"
    COMMAND = "command"
    CONFESSION = "confession"
    REVELATION = "revelation"
    THREAT = "threat"
    PLEA = "plea"
    MOCKERY = "mockery"
    PROPHECY = "prophecy"


class RelationshipStatus(Enum):
    """Relationship between characters"""
    STRANGER = "stranger"
    ACQUAINTANCE = "acquaintance"
    ALLY = "ally"
    FRIEND = "friend"
    LOVER = "lover"
    RIVAL = "rival"
    ENEMY = "enemy"
    MENTOR = "mentor"
    STUDENT = "student"


# ============================================================================
# DIALOGUE NODE: Individual Dialogue Lines
# ============================================================================

@dataclass
class DialogueNode:
    """
    A single node in the dialogue tree.
    Represents one character's line, emotion, personality, and choices.
    """
    node_id: str
    speaker: str                           # Character name/id
    dialogue_text: str                     # What they say
    dialogue_type: DialogueType
    emotional_tone: EmotionalTone
    personality: PersonalityArchetype

    children: Dict[str, str] = field(default_factory=dict)  # choice_id -> next_node_id
    requirements: Dict[str, Any] = field(default_factory=dict)  # Conditions to reach this node
    consequences: Dict[str, float] = field(default_factory=dict)  # State changes (morale, etc.)

    # Dialogue metadata
    duration_seconds: float = 5.0           # How long this dialogue takes
    can_interrupt: bool = True
    triggers_event: Optional[str] = None
    emotional_impact: float = 0.0           # Impact on listener emotion (-1.0 to 1.0)
    personality_appeal: Dict[PersonalityArchetype, float] = field(default_factory=dict)

    # Creation metadata
    created_at: datetime = field(default_factory=datetime.now)
    priority: int = 0                       # Higher priority = more likely to be chosen

    def get_choice_text(self, choice_id: str) -> Optional[str]:
        """Get the display text for a choice"""
        if choice_id in self.children:
            return choice_id
        return None

    def has_valid_children(self) -> bool:
        """Check if this node has any child nodes"""
        return len(self.children) > 0

    def matches_requirements(self, game_state: Dict[str, Any]) -> bool:
        """Check if requirements are met to reach this node"""
        for req_key, req_value in self.requirements.items():
            state_value = game_state.get(req_key)
            if isinstance(req_value, dict):
                # Range requirement: {min: 0.0, max: 1.0}
                if 'min' in req_value and state_value < req_value['min']:
                    return False
                if 'max' in req_value and state_value > req_value['max']:
                    return False
            else:
                # Exact value requirement
                if state_value != req_value:
                    return False
        return True

    def apply_consequences(self, game_state: Dict[str, Any]) -> Dict[str, Any]:
        """Apply this node's consequences to game state"""
        for key, value in self.consequences.items():
            if isinstance(value, (int, float)):
                current = game_state.get(key, 0)
                if isinstance(current, (int, float)):
                    game_state[key] = current + value
            else:
                game_state[key] = value
        return game_state

    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dict"""
        return {
            'node_id': self.node_id,
            'speaker': self.speaker,
            'dialogue_text': self.dialogue_text,
            'dialogue_type': self.dialogue_type.value,
            'emotional_tone': self.emotional_tone.value,
            'personality': self.personality.value,
            'children': self.children,
            'requirements': self.requirements,
            'consequences': self.consequences,
            'duration_seconds': self.duration_seconds,
            'can_interrupt': self.can_interrupt,
            'triggers_event': self.triggers_event,
            'emotional_impact': self.emotional_impact,
            'priority': self.priority
        }


# ============================================================================
# DIALOGUE TREE: Branching Conversation Structure
# ============================================================================

@dataclass
class DialogueTree:
    """
    A complete conversation tree with multiple branches and paths.
    Handles conversation flow, state management, and branching logic.
    """
    tree_id: str
    title: str
    root_node_id: str
    participants: List[str]                 # Characters in this conversation

    nodes: Dict[str, DialogueNode] = field(default_factory=dict)
    branches: Dict[str, List[str]] = field(default_factory=dict)  # branch_id -> [node_ids]
    metadata: Dict[str, Any] = field(default_factory=dict)

    # Tree state tracking
    current_node_id: Optional[str] = None
    visited_nodes: Set[str] = field(default_factory=set)
    conversation_state: Dict[str, Any] = field(default_factory=dict)
    is_complete: bool = False
    start_time: Optional[datetime] = None

    def add_node(self, node: DialogueNode) -> None:
        """Add a dialogue node to the tree"""
        self.nodes[node.node_id] = node

    def add_branch(self, branch_id: str, node_ids: List[str]) -> None:
        """Add a named conversation branch"""
        self.branches[branch_id] = node_ids

    def initialize(self, game_state: Dict[str, Any]) -> DialogueNode:
        """Start the conversation at root"""
        self.current_node_id = self.root_node_id
        self.visited_nodes.clear()
        self.conversation_state = game_state.copy()
        self.start_time = datetime.now()
        return self.nodes[self.root_node_id]

    def get_current_node(self) -> Optional[DialogueNode]:
        """Get the current dialogue node"""
        if self.current_node_id:
            return self.nodes.get(self.current_node_id)
        return None

    def get_valid_choices(self) -> Dict[str, str]:
        """Get valid dialogue choices from current node"""
        current = self.get_current_node()
        if not current:
            return {}

        choices = {}
        for choice_id, next_node_id in current.children.items():
            next_node = self.nodes.get(next_node_id)
            if next_node and next_node.matches_requirements(self.conversation_state):
                choices[choice_id] = choice_id

        return choices

    def advance(self, choice_id: str) -> Tuple[bool, DialogueNode, Dict[str, Any]]:
        """
        Advance to next node based on choice.
        Returns: (success, next_node, consequences)
        """
        current = self.get_current_node()
        if not current or choice_id not in current.children:
            return False, None, {}

        # Apply consequences
        consequences = current.apply_consequences(self.conversation_state)

        # Move to next node
        next_node_id = current.children[choice_id]
        next_node = self.nodes.get(next_node_id)

        if not next_node:
            return False, None, consequences

        self.visited_nodes.add(self.current_node_id)
        self.current_node_id = next_node_id

        # Check if tree is complete
        if not next_node.has_valid_children():
            self.is_complete = True

        return True, next_node, consequences

    def get_conversation_path(self) -> List[str]:
        """Get the path taken through the tree"""
        return list(self.visited_nodes) + ([self.current_node_id] if self.current_node_id else [])

    def get_duration(self) -> float:
        """Get total duration of conversation so far"""
        duration = 0.0
        for node_id in self.get_conversation_path():
            node = self.nodes.get(node_id)
            if node:
                duration += node.duration_seconds
        return duration

    def reset(self) -> None:
        """Reset tree to initial state"""
        self.current_node_id = self.root_node_id
        self.visited_nodes.clear()
        self.conversation_state.clear()
        self.is_complete = False
        self.start_time = None

    def to_dict(self) -> Dict[str, Any]:
        """Serialize tree to dict"""
        return {
            'tree_id': self.tree_id,
            'title': self.title,
            'root_node_id': self.root_node_id,
            'participants': self.participants,
            'nodes': {k: v.to_dict() for k, v in self.nodes.items()},
            'branches': self.branches,
            'current_node_id': self.current_node_id,
            'is_complete': self.is_complete,
            'conversation_path': self.get_conversation_path()
        }


# ============================================================================
# CHARACTER DIALOGUE: Character-Specific Personalities
# ============================================================================

@dataclass
class CharacterDialogue:
    """
    Character-specific dialogue personality and preferences.
    Defines how a character speaks, responds, and connects emotionally.
    """
    character_id: str
    character_name: str
    personality_archetype: PersonalityArchetype

    # Speech patterns
    dialogue_templates: Dict[DialogueType, List[str]] = field(default_factory=dict)
    preferred_emotional_tones: List[EmotionalTone] = field(default_factory=list)
    speech_patterns: Dict[str, float] = field(default_factory=dict)  # pattern -> frequency

    # Emotional state
    base_mood: EmotionalTone = EmotionalTone.NEUTRAL
    current_mood: EmotionalTone = field(default=EmotionalTone.NEUTRAL)
    emotional_variance: float = 0.3

    # Relationship and memory
    relationships: Dict[str, RelationshipStatus] = field(default_factory=dict)
    conversation_history: List[str] = field(default_factory=list)
    memory_topics: Set[str] = field(default_factory=set)

    # Character metrics
    charisma: float = 0.5                   # 0.0-1.0, persuasion ability
    honesty: float = 0.5                    # 0.0-1.0, tendency to tell truth
    aggressiveness: float = 0.5             # 0.0-1.0, confrontation tendency
    humor: float = 0.5                      # 0.0-1.0, joke frequency
    intelligence: float = 0.5               # 0.0-1.0, dialogue complexity

    def generate_greeting(self, other_character: 'CharacterDialogue') -> str:
        """Generate greeting based on relationship and personality"""
        relationship = self.relationships.get(other_character.character_id, RelationshipStatus.STRANGER)

        templates = {
            RelationshipStatus.STRANGER: f"Greetings. I am {self.character_name}.",
            RelationshipStatus.ACQUAINTANCE: f"Hello again, {other_character.character_name}.",
            RelationshipStatus.ALLY: f"{other_character.character_name}! Good to see you.",
            RelationshipStatus.FRIEND: f"{other_character.character_name}! Great to see you, friend.",
            RelationshipStatus.ENEMY: f"You. I didn't expect to see you here.",
            RelationshipStatus.LOVER: f"My darling {other_character.character_name}...",
        }

        return templates.get(relationship, f"Hello, {other_character.character_name}.")

    def generate_dialogue(self, dialogue_type: DialogueType,
                         topic: str = "", context: Dict[str, Any] = None) -> str:
        """Generate dialogue for a given type and topic"""
        if context is None:
            context = {}

        # Get template for this dialogue type
        templates = self.dialogue_templates.get(dialogue_type, [])
        if not templates:
            return f"{self.character_name}: [speaks about {topic}]"

        # Select template with some variation
        template = random.choice(templates)

        # Inject topic if placeholder exists
        if "[topic]" in template:
            template = template.replace("[topic]", topic)

        return template

    def respond_to_emotion(self, other_emotion: EmotionalTone) -> EmotionalTone:
        """Generate emotional response to other character's emotion"""
        # Empathy-based response
        if other_emotion in [EmotionalTone.AFRAID, EmotionalTone.MELANCHOLIC]:
            if random.random() < self.charisma:
                return EmotionalTone.HOPEFUL

        # Mirror effect (tend to match mood)
        if random.random() < 0.6:
            return other_emotion

        # Default to character's base mood
        return self.base_mood

    def update_relationship(self, other_character_id: str,
                          status: RelationshipStatus) -> None:
        """Update relationship status with another character"""
        self.relationships[other_character_id] = status

    def remember_topic(self, topic: str) -> None:
        """Remember a topic for future conversations"""
        self.memory_topics.add(topic)

    def set_mood(self, mood: EmotionalTone) -> None:
        """Change character's mood"""
        self.current_mood = mood

    def get_dialogue_complexity(self) -> int:
        """Get expected dialogue sentence complexity (1-5)"""
        return int(1 + (self.intelligence * 4))

    def to_dict(self) -> Dict[str, Any]:
        """Serialize character to dict"""
        return {
            'character_id': self.character_id,
            'character_name': self.character_name,
            'personality_archetype': self.personality_archetype.value,
            'base_mood': self.base_mood.value,
            'current_mood': self.current_mood.value,
            'relationships': {k: v.value for k, v in self.relationships.items()},
            'conversation_history': self.conversation_history,
            'memory_topics': list(self.memory_topics),
            'charisma': self.charisma,
            'honesty': self.honesty,
            'aggressiveness': self.aggressiveness,
            'humor': self.humor,
            'intelligence': self.intelligence
        }


# ============================================================================
# MULTI-CHARACTER CONVERSATION MANAGER
# ============================================================================

@dataclass
class ConversationManager:
    """
    Manages multi-character conversations and dialogue interactions.
    Orchestrates turns, emotional states, and relationship changes.
    """
    conversation_id: str
    participating_characters: Dict[str, CharacterDialogue] = field(default_factory=dict)
    dialogue_trees: Dict[str, DialogueTree] = field(default_factory=dict)

    current_speaker: Optional[str] = None
    conversation_turns: int = 0
    conversation_history: List[Dict[str, Any]] = field(default_factory=list)
    shared_context: Dict[str, Any] = field(default_factory=dict)

    start_time: Optional[datetime] = None
    is_active: bool = False

    def add_character(self, character: CharacterDialogue) -> None:
        """Add a character to the conversation"""
        self.participating_characters[character.character_id] = character

    def add_dialogue_tree(self, tree: DialogueTree) -> None:
        """Add a dialogue tree to track"""
        self.dialogue_trees[tree.tree_id] = tree

    def start_conversation(self, initial_speaker: str,
                          game_state: Dict[str, Any]) -> bool:
        """Start a new conversation"""
        if initial_speaker not in self.participating_characters:
            return False

        self.current_speaker = initial_speaker
        self.conversation_turns = 0
        self.conversation_history.clear()
        self.shared_context = game_state.copy()
        self.start_time = datetime.now()
        self.is_active = True

        return True

    def next_speaker(self) -> Optional[str]:
        """Determine next speaker in round-robin fashion"""
        if not self.participating_characters:
            return None

        speakers = list(self.participating_characters.keys())
        current_idx = speakers.index(self.current_speaker) if self.current_speaker in speakers else -1
        next_idx = (current_idx + 1) % len(speakers)

        self.current_speaker = speakers[next_idx]
        self.conversation_turns += 1

        return self.current_speaker

    def record_dialogue(self, speaker_id: str, text: str,
                       emotional_tone: EmotionalTone,
                       dialogue_type: DialogueType) -> None:
        """Record a dialogue line to conversation history"""
        record = {
            'turn': self.conversation_turns,
            'timestamp': datetime.now(),
            'speaker_id': speaker_id,
            'speaker_name': self.participating_characters[speaker_id].character_name if speaker_id in self.participating_characters else speaker_id,
            'text': text,
            'emotional_tone': emotional_tone.value,
            'dialogue_type': dialogue_type.value
        }
        self.conversation_history.append(record)

    def end_conversation(self) -> Dict[str, Any]:
        """End the conversation and return summary"""
        if not self.start_time:
            return {}

        duration = (datetime.now() - self.start_time).total_seconds()

        return {
            'conversation_id': self.conversation_id,
            'total_turns': self.conversation_turns,
            'total_participants': len(self.participating_characters),
            'duration_seconds': duration,
            'lines_spoken': len(self.conversation_history),
            'is_complete': True
        }

    def get_conversation_transcript(self) -> str:
        """Get human-readable conversation transcript"""
        lines = ["=== CONVERSATION TRANSCRIPT ===", ""]

        for record in self.conversation_history:
            speaker = record.get('speaker_name', 'Unknown')
            text = record.get('text', '')
            tone = record.get('emotional_tone', '')
            lines.append(f"{speaker} ({tone}): {text}")

        lines.append("")
        lines.append(f"Total turns: {self.conversation_turns}")
        return "\n".join(lines)

    def to_dict(self) -> Dict[str, Any]:
        """Serialize conversation to dict"""
        return {
            'conversation_id': self.conversation_id,
            'participants': list(self.participating_characters.keys()),
            'total_turns': self.conversation_turns,
            'conversation_history': self.conversation_history,
            'is_active': self.is_active
        }


# ============================================================================
# DIALOGUE GENERATOR: Dynamic Dialogue Creation
# ============================================================================

class DialogueGenerator:
    """
    Generates dialogue dynamically based on character personality,
    emotional state, game state, and conversation context.
    """

    @staticmethod
    def generate_emotional_dialogue(character: CharacterDialogue,
                                    emotion: EmotionalTone,
                                    base_text: str) -> str:
        """Modify dialogue based on emotional tone"""
        modifiers = {
            EmotionalTone.CONFIDENT: "I'm certain that " + base_text.lower(),
            EmotionalTone.UNCERTAIN: "Perhaps... " + base_text.lower() + "?",
            EmotionalTone.ANGRY: "How dare you! " + base_text.upper() + "!",
            EmotionalTone.AFRAID: "I fear that " + base_text.lower() + "...",
            EmotionalTone.HOPEFUL: "Perhaps we can... " + base_text.lower() + ".",
            EmotionalTone.MELANCHOLIC: "I suppose... " + base_text.lower() + "...",
            EmotionalTone.PASSIONATE: "YES! " + base_text.upper() + "!",
            EmotionalTone.CAUTIOUS: "We must be careful. " + base_text.lower() + ".",
            EmotionalTone.PLAYFUL: "Hah! " + base_text + " - wouldn't that be something?",
        }

        return modifiers.get(emotion, base_text)

    @staticmethod
    def generate_personality_dialogue(character: CharacterDialogue,
                                      base_text: str) -> str:
        """Modify dialogue based on personality archetype"""
        modifiers = {
            PersonalityArchetype.THE_HERO: "We must be brave. " + base_text,
            PersonalityArchetype.THE_MENTOR: "Let me share wisdom: " + base_text,
            PersonalityArchetype.THE_SHADOW: "The darkness reveals... " + base_text,
            PersonalityArchetype.THE_TRICKSTER: "Here's a puzzle: " + base_text,
            PersonalityArchetype.THE_SAGE: "My analysis suggests: " + base_text,
            PersonalityArchetype.THE_LOVER: "With all my heart, " + base_text.lower(),
            PersonalityArchetype.THE_INNOCENT: "I believe that " + base_text.lower(),
            PersonalityArchetype.THE_EXPLORER: "Let's discover: " + base_text,
            PersonalityArchetype.THE_CAREGIVER: "For your sake, " + base_text.lower(),
            PersonalityArchetype.THE_EVERYMAN: "Most would say " + base_text.lower(),
        }

        return modifiers.get(character.personality_archetype, base_text)

    @staticmethod
    def generate_contextual_dialogue(character: CharacterDialogue,
                                     other_character: CharacterDialogue,
                                     context: Dict[str, Any]) -> str:
        """Generate dialogue considering relationship and context"""
        relationship = character.relationships.get(other_character.character_id, RelationshipStatus.STRANGER)

        relationship_greetings = {
            RelationshipStatus.FRIEND: f"My friend {other_character.character_name}, ",
            RelationshipStatus.RIVAL: f"{other_character.character_name}, ",
            RelationshipStatus.ALLY: f"Together, {other_character.character_name}, ",
            RelationshipStatus.ENEMY: f"You again, {other_character.character_name}. ",
            RelationshipStatus.LOVER: f"My love, {other_character.character_name}, ",
        }

        prefix = relationship_greetings.get(relationship, f"Well, {other_character.character_name}, ")

        # Add context-based suffix
        if 'action' in context:
            return prefix + f"we should {context['action'].lower()}."
        if 'topic' in context:
            return prefix + f"about {context['topic'].lower()}..."

        return prefix + "what brings you here?"


# ============================================================================
# END OF DIALOGUE ENGINE
# ============================================================================

if __name__ == "__main__":
    print("Dialogue Engine loaded. Use in federation_game_console.py")
