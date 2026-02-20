"""
FEDERATION GAME - NPC/Creature/Character System
Complete character, companion, and creature mechanics for emergent storytelling

This module provides:
- Character class with personality, relationships, and quests
- Companion class for recruitable party members with unique bonuses
- Creature class for mystical beings and creatures of the mythic era
- NPCSystem for managing all entities and interactions
- Dialogue engine that responds to player actions and relationships
- 35+ pre-built characters and 8+ creatures
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Tuple, Set, Callable
from datetime import datetime
import json
import random
import uuid


# ============================================================================
# ENUMS
# ============================================================================

class PersonalityTrait(Enum):
    """Core personality traits"""
    LOYALTY = "loyalty"          # 0-1: Faithful to cause vs. self-interested
    AMBITION = "ambition"        # 0-1: Seeks power vs. content with role
    WISDOM = "wisdom"            # 0-1: Thoughtful vs. reactive
    CHARISMA = "charisma"        # 0-1: Persuasive/likable vs. isolated
    CUNNING = "cunning"          # 0-1: Strategic/deceptive vs. straightforward


class CharacterStatus(Enum):
    """Current status of a character"""
    ACTIVE = "active"
    IMPRISONED = "imprisoned"
    DEAD = "dead"
    TRAVELING = "traveling"
    HIDDEN = "hidden"
    MISSING = "missing"
    CORRUPTED = "corrupted"


class CharacterArchetype(Enum):
    """Character personality archetypes"""
    HERO = "hero"                # Courageous, noble, inspiring
    SCHOLAR = "scholar"          # Intellectual, curious, studious
    ROGUE = "rogue"              # Cunning, self-serving, charming
    WARRIOR = "warrior"          # Strength, honor, combat focused
    MYSTIC = "mystic"            # Spiritual, prophetic, mysterious
    LEADER = "leader"            # Commanding, strategic, diplomatic
    SAGE = "sage"                # Wise, peaceful, philosophical
    WANDERER = "wanderer"        # Adventurous, unpredictable, curious
    DECEIVER = "deceiver"        # Manipulative, ambitious, ruthless
    GUARDIAN = "guardian"        # Protective, steadfast, traditional


class CreatureType(Enum):
    """Types of mystical creatures"""
    SKY_FURK = "sky_furk"
    PLASMA_KITE = "plasma_kite"
    THRUMBACK = "thrumback"
    CLOUD_GNASHER = "cloud_gnasher"
    VOID_SKIPPER = "void_skipper"
    DREAM_WYRM = "dream_wyrm"
    HARMONIC_MAW = "harmonic_maw"
    PRISM_ASSEMBLY = "prism_assembly"


class CreatureRarity(Enum):
    """Creature rarity levels"""
    COMMON = "common"
    RARE = "rare"
    LEGENDARY = "legendary"
    MYTHIC = "mythic"


class CompanionBonus(Enum):
    """Types of bonuses companions provide"""
    MORALE = "morale"
    RESEARCH = "research"
    COMBAT = "combat"
    DIPLOMACY = "diplomacy"
    EXPLORATION = "exploration"
    DEFENSE = "defense"
    STEALTH = "stealth"


# ============================================================================
# DIALOGUE SYSTEM
# ============================================================================

@dataclass
class DialogueOption:
    """A dialogue choice presented to the player"""
    id: str
    text: str
    requires_reputation: float = 0.0
    requires_status: Optional[CharacterStatus] = None
    affects_loyalty: float = 0.0  # -1.0 to 1.0
    response: str = ""
    next_dialogue_id: Optional[str] = None


@dataclass
class DialogueNode:
    """A dialogue conversation point"""
    id: str
    speaker: str  # Character name
    text: str
    options: List[DialogueOption] = field(default_factory=list)
    context: str = ""  # Situation context


class DialogueEngine:
    """Handles character dialogue and conversation flows"""

    def __init__(self):
        self.dialogues: Dict[str, DialogueNode] = {}
        self.conversation_history: Dict[str, List[Tuple[str, str]]] = {}  # player_id -> [(char_id, dialogue_id)]

    def register_dialogue(self, dialogue: DialogueNode) -> None:
        """Register a dialogue node"""
        self.dialogues[dialogue.id] = dialogue

    def get_dialogue(self, dialogue_id: str) -> Optional[DialogueNode]:
        """Get a dialogue node by ID"""
        return self.dialogues.get(dialogue_id)

    def get_available_options(
        self,
        dialogue_id: str,
        player_reputation: float,
        character_status: CharacterStatus
    ) -> List[DialogueOption]:
        """Get dialogue options available to player based on reputation/status"""
        dialogue = self.get_dialogue(dialogue_id)
        if not dialogue:
            return []

        available = []
        for option in dialogue.options:
            if option.requires_reputation > player_reputation:
                continue
            if option.requires_status and option.requires_status != character_status:
                continue
            available.append(option)

        return available

    def process_dialogue_choice(
        self,
        dialogue_id: str,
        option_id: str,
        character: 'Character'
    ) -> Tuple[str, float]:
        """Process player dialogue choice and return response + loyalty change"""
        dialogue = self.get_dialogue(dialogue_id)
        if not dialogue:
            return "Dialogue not found", 0.0

        for option in dialogue.options:
            if option.id == option_id:
                character.loyalty = max(-1.0, min(1.0, character.loyalty + option.affects_loyalty))
                return option.response, option.affects_loyalty

        return "Option not found", 0.0


# ============================================================================
# CHARACTER CLASS
# ============================================================================

@dataclass
class Character:
    """Represents an NPC character in the game"""
    char_id: str
    name: str
    title: str                    # Role/title (e.g., "Admiral", "Scholar")
    description: str              # Physical/character description

    # Personality (5 traits, 0.0-1.0 scale)
    loyalty: float = 0.5          # Faithful vs. self-interested
    ambition: float = 0.5         # Power-seeking vs. content
    wisdom: float = 0.5           # Thoughtful vs. reactive
    charisma: float = 0.5         # Charming vs. isolated
    cunning: float = 0.5          # Strategic vs. straightforward

    # Relationships
    affiliation: Optional[str] = None  # faction_id or None
    relationship_to_player: float = 0.0  # -1.0 (hostile) to 1.0 (devoted)
    relationship_to_other_characters: Dict[str, float] = field(default_factory=dict)

    # Status
    status: CharacterStatus = CharacterStatus.ACTIVE
    personality_type: CharacterArchetype = CharacterArchetype.HERO
    current_quest: Optional[str] = None

    # Inventory and abilities
    skills: List[str] = field(default_factory=list)
    inventory: Dict[str, int] = field(default_factory=dict)

    # Dialogue
    dialogue_id: Optional[str] = None
    last_interaction_turn: int = 0

    # Internal state
    created_turn: int = 0
    rumor_level: float = 0.0      # How much others talk about this character
    corruption_level: float = 0.0 # 0.0 normal, 1.0 fully corrupted

    def __post_init__(self):
        """Validate personality traits"""
        traits = [self.loyalty, self.ambition, self.wisdom, self.charisma, self.cunning]
        for trait in traits:
            if not (0.0 <= trait <= 1.0):
                raise ValueError(f"Personality traits must be 0.0-1.0, got {trait}")

    def get_personality_summary(self) -> Dict[str, float]:
        """Get all personality traits as a dict"""
        return {
            "loyalty": self.loyalty,
            "ambition": self.ambition,
            "wisdom": self.wisdom,
            "charisma": self.charisma,
            "cunning": self.cunning,
        }

    def interact(
        self,
        action: str,
        player_id: str,
        turn: int,
        dialogue_engine: Optional[DialogueEngine] = None
    ) -> Dict:
        """Interact with character (conversation, trade, etc.)"""
        self.last_interaction_turn = turn

        if action == "talk":
            if not self.dialogue_id or not dialogue_engine:
                return {"success": False, "message": "Character has nothing to say"}

            dialogue = dialogue_engine.get_dialogue(self.dialogue_id)
            if not dialogue:
                return {"success": False, "message": "Dialogue not found"}

            options = dialogue_engine.get_available_options(
                self.dialogue_id,
                self.relationship_to_player,
                self.status
            )

            return {
                "success": True,
                "dialogue": dialogue.text,
                "options": [{"id": o.id, "text": o.text} for o in options],
                "char_name": self.name
            }

        elif action == "gift":
            # Increase relationship through gift-giving
            relationship_change = random.uniform(0.05, 0.15)
            self.relationship_to_player = min(1.0, self.relationship_to_player + relationship_change)
            return {
                "success": True,
                "message": f"{self.name} appreciates your gift!",
                "relationship_change": relationship_change
            }

        elif action == "trade":
            return {
                "success": True,
                "message": f"Trading with {self.name}",
                "inventory": self.inventory
            }

        return {"success": False, "message": "Unknown action"}

    def __repr__(self):
        return f"<Character {self.name} ({self.title}) - Affiliation: {self.affiliation} - Relationship: {self.relationship_to_player:.1f}>"


# ============================================================================
# COMPANION CLASS
# ============================================================================

@dataclass
class Companion(Character):
    """Extended character that can join the player's party"""
    can_join_player_party: bool = True
    is_recruited: bool = False
    companion_bonus: CompanionBonus = CompanionBonus.MORALE
    bonus_value: float = 0.15     # Base bonus (15%)

    # Behavioral traits
    personality_quirks: List[str] = field(default_factory=list)
    special_ability: str = ""      # Unique action they can perform
    betrayal_risk: float = 0.0     # 0.0 loyal, 1.0 will definitely betray

    def get_party_bonus(self) -> Dict[str, float]:
        """Get the bonus this companion provides to party"""
        bonus_multiplier = (self.loyalty + 0.5) * self.bonus_value

        return {
            "bonus_type": self.companion_bonus.value,
            "value": bonus_multiplier,
            "ability": self.special_ability,
            "is_active": self.is_recruited
        }

    def check_betrayal(self, turn: int, current_morale: float) -> bool:
        """Check if companion might betray player"""
        if not self.is_recruited:
            return False

        # Betrayal risk increases with low loyalty and low morale
        betrayal_chance = self.betrayal_risk * (1.0 - self.loyalty) * (1.0 - current_morale)

        return random.random() < betrayal_chance

    def __repr__(self):
        bonus_name = self.companion_bonus.value
        return f"<Companion {self.name} ({self.title}) - Bonus: +{self.bonus_value:.0%} {bonus_name} - Recruited: {self.is_recruited}>"


# ============================================================================
# CREATURE CLASS
# ============================================================================

@dataclass
class Creature:
    """Represents a mystical creature of the mythic era"""
    creature_id: str
    name: str
    description: str
    creature_type: CreatureType
    rarity: CreatureRarity

    # Attributes
    size: str                          # Tiny, Small, Medium, Large, Huge
    intelligence: float = 0.5          # 0.0 animal-like, 1.0 sentient
    danger_level: float = 0.5          # 0.0 docile, 1.0 deadly
    domestication_level: float = 0.3   # 0.0 wild, 1.0 tame

    # Abilities and habitats
    special_ability: str = ""
    habitat: str = ""                  # Where it's found
    lore: str = ""                     # Creature mythology/backstory

    # Gameplay benefits
    gameplay_bonuses: Dict[str, float] = field(default_factory=dict)
    situational_help: Dict[str, str] = field(default_factory=dict)  # situation -> how it helps

    # Relationship with player
    affinity_level: float = 0.0        # -1.0 hostile, 1.0 bonded
    is_tamed: bool = False
    spotted_locations: List[str] = field(default_factory=list)

    def attempt_tame(self, player_charisma: float, turn: int) -> Tuple[bool, str]:
        """Attempt to tame/befriend the creature"""
        # Success chance based on player charisma, creature domestication, and current affinity
        base_success = self.domestication_level * 0.6
        charisma_bonus = player_charisma * 0.3
        affinity_bonus = (self.affinity_level + 1.0) * 0.05  # -1 to 1 -> 0 to 0.1

        success_chance = min(1.0, base_success + charisma_bonus + affinity_bonus)

        if random.random() < success_chance:
            self.is_tamed = True
            self.affinity_level = min(1.0, self.affinity_level + 0.2)
            return True, f"{self.name} has been tamed!"
        else:
            self.affinity_level = max(-1.0, self.affinity_level - 0.1)
            return False, f"{self.name} refuses to be tamed."

    def __repr__(self):
        return f"<Creature {self.name} ({self.creature_type.value}) - Rarity: {self.rarity.value} - Tamed: {self.is_tamed}>"


# ============================================================================
# NPC SYSTEM
# ============================================================================

class NPCSystem:
    """Master system for managing all characters, companions, and creatures"""

    def __init__(self):
        self.characters: Dict[str, Character] = {}
        self.companions: Dict[str, Companion] = {}
        self.creatures: Dict[str, Creature] = {}

        self.player_relationships: Dict[str, Dict[str, float]] = {}  # player_id -> char_id -> reputation
        self.dialogue_engine = DialogueEngine()
        self.encountered_creatures: Dict[str, Set[str]] = {}  # player_id -> creature_ids encountered
        self.recruited_companions: Dict[str, Set[str]] = {}   # player_id -> companion_ids recruited

    def register_character(self, character: Character) -> bool:
        """Register a character to the system"""
        if character.char_id in self.characters:
            return False
        self.characters[character.char_id] = character
        return True

    def register_companion(self, companion: Companion) -> bool:
        """Register a companion to the system"""
        if companion.char_id in self.companions:
            return False
        self.companions[companion.char_id] = companion
        self.characters[companion.char_id] = companion  # Also in characters
        return True

    def register_creature(self, creature: Creature) -> bool:
        """Register a creature to the system"""
        if creature.creature_id in self.creatures:
            return False
        self.creatures[creature.creature_id] = creature
        return True

    def register_dialogue(self, dialogue: DialogueNode) -> None:
        """Register dialogue for characters"""
        self.dialogue_engine.register_dialogue(dialogue)

    def spawn_random_encounter(self, current_location: str = "") -> Optional[Dict]:
        """Randomly spawn an NPC or creature encounter"""
        choice = random.choice(["character", "creature"])

        if choice == "character":
            char = random.choice(list(self.characters.values()))
            return {
                "type": "character",
                "entity": char,
                "description": f"You encounter {char.name}, {char.title}. {char.description}"
            }
        else:
            creature = random.choice(list(self.creatures.values()))
            return {
                "type": "creature",
                "entity": creature,
                "description": f"A {creature.name} appears! {creature.description}"
            }

    def get_potential_companions(self) -> List[Companion]:
        """Get all characters who could join as companions"""
        return [c for c in self.companions.values() if c.can_join_player_party and not c.is_recruited]

    def recruit_companion(self, player_id: str, companion_id: str) -> Tuple[bool, str]:
        """Recruit a companion to player's party"""
        if companion_id not in self.companions:
            return False, "Companion not found"

        companion = self.companions[companion_id]

        # Check conditions
        if companion.is_recruited:
            return False, f"{companion.name} is already recruited"

        if companion.relationship_to_player < 0.3:
            return False, f"{companion.name} doesn't trust you enough"

        # Recruit
        companion.is_recruited = True
        if player_id not in self.recruited_companions:
            self.recruited_companions[player_id] = set()
        self.recruited_companions[player_id].add(companion_id)

        return True, f"{companion.name} has joined your party!"

    def interact_with_character(
        self,
        player_id: str,
        char_id: str,
        action: str,
        turn: int
    ) -> Dict:
        """Interact with a character"""
        if char_id not in self.characters:
            return {"success": False, "message": "Character not found"}

        character = self.characters[char_id]
        result = character.interact(action, player_id, turn, self.dialogue_engine)

        return result

    def change_relationship(
        self,
        player_id: str,
        char_id: str,
        delta: float
    ) -> float:
        """Change player's relationship with a character"""
        if char_id not in self.characters:
            return 0.0

        if player_id not in self.player_relationships:
            self.player_relationships[player_id] = {}

        old_rep = self.player_relationships[player_id].get(char_id, 0.0)
        new_rep = max(-1.0, min(1.0, old_rep + delta))  # Clamp -1 to 1

        self.player_relationships[player_id][char_id] = new_rep

        # Update character's relationship
        character = self.characters[char_id]
        character.relationship_to_player = new_rep

        # Check for recruitment opportunity if companion
        if char_id in self.companions and new_rep >= 0.5 and not self.companions[char_id].is_recruited:
            self.recruit_companion(player_id, char_id)

        return new_rep

    def encounter_creature(
        self,
        player_id: str,
        creature_id: str,
        player_charisma: float = 0.5,
        turn: int = 0
    ) -> Dict:
        """Encounter and attempt to tame a creature"""
        if creature_id not in self.creatures:
            return {"success": False, "message": "Creature not found"}

        creature = self.creatures[creature_id]

        # Track encounter
        if player_id not in self.encountered_creatures:
            self.encountered_creatures[player_id] = set()
        self.encountered_creatures[player_id].add(creature_id)

        # Attempt tame
        success, message = creature.attempt_tame(player_charisma, turn)

        return {
            "success": success,
            "message": message,
            "creature": creature,
            "affinity": creature.affinity_level,
            "tamed": creature.is_tamed,
            "bonus": creature.gameplay_bonuses if creature.is_tamed else {}
        }

    def get_character_dialogue(
        self,
        char_id: str,
        initial_dialogue_id: str,
        player_reputation: float,
        character_status: Optional[CharacterStatus] = None
    ) -> Dict:
        """Get dialogue for a character"""
        if char_id not in self.characters:
            return {"success": False, "message": "Character not found"}

        character = self.characters[char_id]
        status = character_status or character.status

        dialogue = self.dialogue_engine.get_dialogue(initial_dialogue_id)
        if not dialogue:
            return {"success": False, "message": "Dialogue not found"}

        options = self.dialogue_engine.get_available_options(
            initial_dialogue_id,
            player_reputation,
            status
        )

        return {
            "success": True,
            "character": character.name,
            "dialogue_text": dialogue.text,
            "available_options": [{"id": o.id, "text": o.text} for o in options],
            "context": dialogue.context
        }

    def get_character_report(self, char_id: str) -> Dict:
        """Get a detailed report on a character"""
        if char_id not in self.characters:
            return {}

        char = self.characters[char_id]

        report = {
            "id": char.char_id,
            "name": char.name,
            "title": char.title,
            "description": char.description,
            "archetype": char.personality_type.value,
            "affiliation": char.affiliation,
            "status": char.status.value,
            "relationship_to_player": char.relationship_to_player,
            "personality": char.get_personality_summary(),
            "skills": char.skills,
            "current_quest": char.current_quest,
            "corruption_level": char.corruption_level,
            "rumor_level": char.rumor_level,
        }

        # Add companion-specific info
        if char_id in self.companions:
            comp = self.companions[char_id]
            report.update({
                "is_companion": True,
                "is_recruited": comp.is_recruited,
                "bonus_type": comp.companion_bonus.value,
                "bonus_value": comp.bonus_value,
                "special_ability": comp.special_ability,
                "quirks": comp.personality_quirks,
                "betrayal_risk": comp.betrayal_risk,
            })

        return report

    def get_creature_report(self, creature_id: str) -> Dict:
        """Get a detailed report on a creature"""
        if creature_id not in self.creatures:
            return {}

        creature = self.creatures[creature_id]

        return {
            "id": creature.creature_id,
            "name": creature.name,
            "type": creature.creature_type.value,
            "rarity": creature.rarity.value,
            "description": creature.description,
            "size": creature.size,
            "intelligence": creature.intelligence,
            "danger_level": creature.danger_level,
            "domestication_level": creature.domestication_level,
            "special_ability": creature.special_ability,
            "habitat": creature.habitat,
            "lore": creature.lore,
            "is_tamed": creature.is_tamed,
            "affinity_level": creature.affinity_level,
            "bonuses": creature.gameplay_bonuses,
        }

    def get_all_characters_active(self) -> List[Character]:
        """Get all active characters"""
        return [c for c in self.characters.values() if c.status == CharacterStatus.ACTIVE]

    def get_characters_by_faction(self, faction_id: str) -> List[Character]:
        """Get all characters affiliated with a faction"""
        return [c for c in self.characters.values() if c.affiliation == faction_id]

    def get_characters_by_archetype(self, archetype: CharacterArchetype) -> List[Character]:
        """Get all characters of a specific archetype"""
        return [c for c in self.characters.values() if c.personality_type == archetype]

    def advance_turn(self) -> List[Dict]:
        """Advance game turn and process character events"""
        events = []

        for char in self.characters.values():
            # Character corruption growth
            if char.corruption_level > 0:
                char.corruption_level = min(1.0, char.corruption_level + random.uniform(0.01, 0.05))

                if char.corruption_level >= 1.0:
                    char.status = CharacterStatus.CORRUPTED
                    events.append({
                        "type": "character_corruption",
                        "character": char.name,
                        "message": f"{char.name} has been fully corrupted!"
                    })

            # Companion betrayal check
            if char.char_id in self.companions:
                comp = self.companions[char.char_id]
                if comp.is_recruited and comp.check_betrayal(char.last_interaction_turn, 0.5):
                    comp.is_recruited = False
                    events.append({
                        "type": "companion_betrayal",
                        "character": char.name,
                        "message": f"{char.name} has betrayed you!"
                    })

            # Rumor spread
            char.rumor_level = min(1.0, char.rumor_level + random.uniform(0.01, 0.03))

        return events


# ============================================================================
# CHARACTER FACTORY: BUILD 35+ PRE-BUILT CHARACTERS
# ============================================================================

def build_historical_figures() -> List[Character]:
    """Create historical figures - great thinkers, generals, philosophers"""
    characters = [
        Character(
            char_id="char_001",
            name="Archimedes Prime",
            title="Chief Mathematician",
            description="An elderly scholar with piercing eyes and countless equations etched on his robes.",
            loyalty=0.8,
            ambition=0.3,
            wisdom=0.95,
            charisma=0.6,
            cunning=0.4,
            personality_type=CharacterArchetype.SCHOLAR,
            affiliation="research_division",
            skills=["Mathematics", "Physics", "Prophecy Calculation", "Strategic Analysis"],
            inventory={"scientific_papers": 50, "research_equipment": 10},
        ),
        Character(
            char_id="char_002",
            name="Commander Valorix",
            title="General of the First Fleet",
            description="A battle-scarred military leader with commanding presence and tactical genius.",
            loyalty=0.85,
            ambition=0.7,
            wisdom=0.75,
            charisma=0.85,
            cunning=0.5,
            personality_type=CharacterArchetype.WARRIOR,
            affiliation="military_command",
            skills=["Warfare", "Leadership", "Strategy", "Combat"],
            inventory={"military_citations": 20, "tactical_maps": 15},
            status=CharacterStatus.ACTIVE,
        ),
        Character(
            char_id="char_003",
            name="Philosopher Zenith",
            title="Keeper of Wisdom",
            description="A serene figure who speaks in parables and seems to see all possible futures.",
            loyalty=0.9,
            ambition=0.2,
            wisdom=0.98,
            charisma=0.75,
            cunning=0.3,
            personality_type=CharacterArchetype.SAGE,
            affiliation="consciousness_collective",
            skills=["Philosophy", "Prophecy", "Meditation", "Teaching"],
            inventory={"wisdom_scrolls": 100, "mystical_artifacts": 5},
        ),
        Character(
            char_id="char_004",
            name="Ambassador Silven",
            title="Master Diplomat",
            description="A smooth-talking figure in elegant formal wear, always three steps ahead in conversation.",
            loyalty=0.6,
            ambition=0.8,
            wisdom=0.7,
            charisma=0.95,
            cunning=0.85,
            personality_type=CharacterArchetype.LEADER,
            affiliation="diplomatic_corps",
            skills=["Diplomacy", "Negotiation", "Persuasion", "Politics"],
            inventory={"diplomatic_favors": 50, "treaty_documents": 30},
        ),
        Character(
            char_id="char_005",
            name="Conquistador Drake",
            title="Explorer of the Unknown",
            description="A weathered adventurer with thousands of stories and scars from distant lands.",
            loyalty=0.5,
            ambition=0.85,
            wisdom=0.6,
            charisma=0.7,
            cunning=0.6,
            personality_type=CharacterArchetype.WANDERER,
            affiliation="exploration_initiative",
            skills=["Exploration", "Survival", "Navigation", "Discovery"],
            inventory={"exploration_maps": 40, "rare_artifacts": 8},
        ),
    ]
    return characters


def build_faction_leaders() -> List[Character]:
    """Create one leader for each of the 8 factions + 2 extra"""
    characters = [
        Character(
            char_id="char_101",
            name="Chancellor Harmony",
            title="Leader of Diplomatic Corps",
            description="A wise elder dedicated to peace, with gentle hands and an unwavering voice.",
            loyalty=0.9,
            ambition=0.4,
            wisdom=0.85,
            charisma=0.9,
            cunning=0.5,
            personality_type=CharacterArchetype.LEADER,
            affiliation="diplomatic_corps",
            skills=["Diplomacy", "Peace Negotiation", "Unity Building"],
            relationship_to_player=0.0,
        ),
        Character(
            char_id="char_102",
            name="Marshal Ironbound",
            title="Supreme Military Commander",
            description="A towering figure of strength and authority, decorated with battle honors.",
            loyalty=0.95,
            ambition=0.6,
            wisdom=0.7,
            charisma=0.8,
            cunning=0.4,
            personality_type=CharacterArchetype.WARRIOR,
            affiliation="military_command",
            skills=["Warfare", "Army Command", "Defense Strategy"],
            relationship_to_player=0.0,
        ),
        Character(
            char_id="char_103",
            name="Maestro Celestia",
            title="Minister of Culture",
            description="An artistic soul radiating creativity, always humming ancient melodies.",
            loyalty=0.85,
            ambition=0.5,
            wisdom=0.75,
            charisma=0.95,
            cunning=0.3,
            personality_type=CharacterArchetype.HERO,
            affiliation="cultural_ministry",
            skills=["Art", "Music", "Culture", "Morale Elevation"],
            relationship_to_player=0.0,
        ),
        Character(
            char_id="char_104",
            name="Dr. Prometheus",
            title="Chief Research Officer",
            description="A brilliant scientist always muttering about breakthrough moments and cosmic mysteries.",
            loyalty=0.8,
            ambition=0.75,
            wisdom=0.9,
            charisma=0.5,
            cunning=0.6,
            personality_type=CharacterArchetype.SCHOLAR,
            affiliation="research_division",
            skills=["Technology", "Research", "Innovation"],
            relationship_to_player=0.0,
        ),
        Character(
            char_id="char_105",
            name="Oracle Vex",
            title="Head of Consciousness Collective",
            description="A mysterious figure who seems to exist partially in another reality.",
            loyalty=0.75,
            ambition=0.4,
            wisdom=0.95,
            charisma=0.7,
            cunning=0.7,
            personality_type=CharacterArchetype.MYSTIC,
            affiliation="consciousness_collective",
            skills=["Prophecy", "Meditation", "Mind Connection"],
            relationship_to_player=0.0,
        ),
        Character(
            char_id="char_106",
            name="Merchant-Prince Aurelius",
            title="Head of Economic Council",
            description="A wealthy trader adorned with gold, always calculating profit margins.",
            loyalty=0.5,
            ambition=0.9,
            wisdom=0.6,
            charisma=0.8,
            cunning=0.85,
            personality_type=CharacterArchetype.ROGUE,
            affiliation="economic_council",
            skills=["Trading", "Economics", "Wealth Accumulation"],
            relationship_to_player=0.0,
        ),
        Character(
            char_id="char_107",
            name="Captain Frontier",
            title="Leader of Exploration Initiative",
            description="A daring scout always eager for the next unknown frontier.",
            loyalty=0.7,
            ambition=0.85,
            wisdom=0.65,
            charisma=0.8,
            cunning=0.5,
            personality_type=CharacterArchetype.WANDERER,
            affiliation="exploration_initiative",
            skills=["Exploration", "Navigation", "Discovery"],
            relationship_to_player=0.0,
        ),
        Character(
            char_id="char_108",
            name="Archivist Eternal",
            title="Leader of Preservation Society",
            description="An ageless figure dedicated to preserving history, dressed in timeless garments.",
            loyalty=0.95,
            ambition=0.2,
            wisdom=0.95,
            charisma=0.5,
            cunning=0.3,
            personality_type=CharacterArchetype.GUARDIAN,
            affiliation="preservation_society",
            skills=["History", "Preservation", "Artifact Curation"],
            relationship_to_player=0.0,
        ),
    ]
    return characters


def build_companion_candidates() -> List[Companion]:
    """Create 10 recruitable companions with unique bonuses"""
    companions = [
        Companion(
            char_id="comp_001",
            name="Lyra Swiftwind",
            title="Rogue Archer",
            description="A nimble archer with a sharp wit and sharper arrows.",
            loyalty=0.7,
            ambition=0.6,
            wisdom=0.6,
            charisma=0.8,
            cunning=0.8,
            personality_type=CharacterArchetype.ROGUE,
            companion_bonus=CompanionBonus.STEALTH,
            bonus_value=0.20,
            special_ability="Swift Strike - Bonus damage on first turn",
            personality_quirks=["Quick-witted", "Sarcastic", "Loyal to friends"],
            betrayal_risk=0.1,
        ),
        Companion(
            char_id="comp_002",
            name="Thorg Ironhammer",
            title="Dwarf Warrior",
            description="A sturdy warrior whose beard braids tell tales of countless victories.",
            loyalty=0.9,
            ambition=0.4,
            wisdom=0.6,
            charisma=0.6,
            cunning=0.4,
            personality_type=CharacterArchetype.WARRIOR,
            companion_bonus=CompanionBonus.COMBAT,
            bonus_value=0.25,
            special_ability="Shield Bash - Stun enemies",
            personality_quirks=["Honor-bound", "Loves mead", "Protective"],
            betrayal_risk=0.02,
        ),
        Companion(
            char_id="comp_003",
            name="Elara Moonwhisper",
            title="Moon Mage",
            description="An ethereal mage who draws power from celestial bodies.",
            loyalty=0.75,
            ambition=0.5,
            wisdom=0.9,
            charisma=0.75,
            cunning=0.6,
            personality_type=CharacterArchetype.MYSTIC,
            companion_bonus=CompanionBonus.RESEARCH,
            bonus_value=0.22,
            special_ability="Lunar Prophecy - Predict next event",
            personality_quirks=["Philosophical", "Serene", "Curious"],
            betrayal_risk=0.15,
        ),
        Companion(
            char_id="comp_004",
            name="Captain Valor",
            title="War Hero",
            description="A decorated military captain inspiring confidence in all around.",
            loyalty=0.95,
            ambition=0.5,
            wisdom=0.75,
            charisma=0.9,
            cunning=0.5,
            personality_type=CharacterArchetype.HERO,
            companion_bonus=CompanionBonus.MORALE,
            bonus_value=0.25,
            special_ability="Inspiring Presence - Boost morale",
            personality_quirks=["Courageous", "Fair", "Tenacious"],
            betrayal_risk=0.01,
        ),
        Companion(
            char_id="comp_005",
            name="Dr. Sylas Cunningham",
            title="Brilliant Scientist",
            description="A inventive genius always tinkering with mysterious devices.",
            loyalty=0.6,
            ambition=0.8,
            wisdom=0.85,
            charisma=0.5,
            cunning=0.7,
            personality_type=CharacterArchetype.SCHOLAR,
            companion_bonus=CompanionBonus.RESEARCH,
            bonus_value=0.30,
            special_ability="Technological Breakthrough - Boost research speed",
            personality_quirks=["Absent-minded", "Passionate", "Eccentric"],
            betrayal_risk=0.2,
        ),
        Companion(
            char_id="comp_006",
            name="Kyren Frostblade",
            title="Frost Knight",
            description="A stoic warrior from frozen lands, calm and collected.",
            loyalty=0.85,
            ambition=0.4,
            wisdom=0.75,
            charisma=0.7,
            cunning=0.5,
            personality_type=CharacterArchetype.WARRIOR,
            companion_bonus=CompanionBonus.DEFENSE,
            bonus_value=0.28,
            special_ability="Frozen Bastion - Reduce damage taken",
            personality_quirks=["Stoic", "Reliable", "Quiet"],
            betrayal_risk=0.05,
        ),
        Companion(
            char_id="comp_007",
            name="Zephyr Silverspeak",
            title="Diplomat's Aide",
            description="A charismatic negotiator skilled in reading people.",
            loyalty=0.7,
            ambition=0.7,
            wisdom=0.7,
            charisma=0.95,
            cunning=0.75,
            personality_type=CharacterArchetype.LEADER,
            companion_bonus=CompanionBonus.DIPLOMACY,
            bonus_value=0.25,
            special_ability="Silver Tongue - Improve negotiations",
            personality_quirks=["Charming", "Ambitious", "Calculated"],
            betrayal_risk=0.25,
        ),
        Companion(
            char_id="comp_008",
            name="Scout Aria",
            title="Wilderness Guide",
            description="A tracking expert at home in any terrain.",
            loyalty=0.85,
            ambition=0.5,
            wisdom=0.8,
            charisma=0.6,
            cunning=0.6,
            personality_type=CharacterArchetype.WANDERER,
            companion_bonus=CompanionBonus.EXPLORATION,
            bonus_value=0.23,
            special_ability="Pathfinding - Discover shortcuts",
            personality_quirks=["Independent", "Patient", "Keen-eyed"],
            betrayal_risk=0.08,
        ),
        Companion(
            char_id="comp_009",
            name="Brother Mercy",
            title="Healer Monk",
            description="A compassionate healer devoted to helping others.",
            loyalty=0.95,
            ambition=0.2,
            wisdom=0.9,
            charisma=0.75,
            cunning=0.3,
            personality_type=CharacterArchetype.GUARDIAN,
            companion_bonus=CompanionBonus.MORALE,
            bonus_value=0.20,
            special_ability="Healing Touch - Restore health",
            personality_quirks=["Compassionate", "Patient", "Wise"],
            betrayal_risk=0.01,
        ),
        Companion(
            char_id="comp_010",
            name="Shadowborn",
            title="Mysterious Assassin",
            description="A figure shrouded in mystery, with a hidden past.",
            loyalty=0.5,
            ambition=0.8,
            wisdom=0.65,
            charisma=0.6,
            cunning=0.95,
            personality_type=CharacterArchetype.DECEIVER,
            companion_bonus=CompanionBonus.STEALTH,
            bonus_value=0.25,
            special_ability="Shadow Clone - Create decoys",
            personality_quirks=["Secretive", "Efficient", "Unpredictable"],
            betrayal_risk=0.35,
        ),
    ]
    return companions


def build_antagonists() -> List[Character]:
    """Create 4 opposition figures and antagonists"""
    characters = [
        Character(
            char_id="char_201",
            name="Lord Malaxis",
            title="Dark Tyrant",
            description="A cruel despot seeking to dominate all factions through fear.",
            loyalty=0.3,
            ambition=0.95,
            wisdom=0.5,
            charisma=0.75,
            cunning=0.9,
            personality_type=CharacterArchetype.DECEIVER,
            status=CharacterStatus.ACTIVE,
            corruption_level=0.8,
            skills=["Tyranny", "Manipulation", "Dark Magic", "Warfare"],
            relationship_to_player=-0.9,
        ),
        Character(
            char_id="char_202",
            name="The Void Oracle",
            title="Harbinger of Chaos",
            description="An entity that exists between realities, spreading corruption and madness.",
            loyalty=0.0,
            ambition=0.5,
            wisdom=0.7,
            charisma=0.8,
            cunning=0.95,
            personality_type=CharacterArchetype.MYSTIC,
            status=CharacterStatus.HIDDEN,
            corruption_level=1.0,
            skills=["Prophecy Corruption", "Reality Manipulation", "Misinformation"],
            relationship_to_player=-1.0,
        ),
        Character(
            char_id="char_203",
            name="Baroness Greed",
            title="Economic Overlord",
            description="A ruthless merchant who buys and sells anything, including souls.",
            loyalty=0.2,
            ambition=0.98,
            wisdom=0.5,
            charisma=0.7,
            cunning=0.9,
            personality_type=CharacterArchetype.ROGUE,
            status=CharacterStatus.ACTIVE,
            corruption_level=0.6,
            skills=["Economic Manipulation", "Bribery", "Extortion"],
            relationship_to_player=-0.7,
        ),
        Character(
            char_id="char_204",
            name="General Devastation",
            title="War Machine",
            description="A militaristic extremist who believes war is the only solution.",
            loyalty=0.4,
            ambition=0.85,
            wisdom=0.3,
            charisma=0.8,
            cunning=0.7,
            personality_type=CharacterArchetype.WARRIOR,
            status=CharacterStatus.ACTIVE,
            corruption_level=0.5,
            skills=["Warfare", "Destruction", "Merciless Combat"],
            relationship_to_player=-0.8,
        ),
    ]
    return characters


def build_mysterious_figures() -> List[Character]:
    """Create 6 mysterious wanderers, sages, and tricksters"""
    characters = [
        Character(
            char_id="char_301",
            name="The Wanderer",
            title="Traveler Between Worlds",
            description="A cloaked figure who appears and disappears like mist, speaking in riddles.",
            loyalty=0.5,
            ambition=0.3,
            wisdom=0.85,
            charisma=0.7,
            cunning=0.8,
            personality_type=CharacterArchetype.MYSTIC,
            status=CharacterStatus.TRAVELING,
            skills=["Dimensional Travel", "Puzzle Crafting", "Secret Keeping"],
        ),
        Character(
            char_id="char_302",
            name="The Jester",
            title="Cosmic Comedian",
            description="A laughing figure who makes jokes that cut to the heart of truth.",
            loyalty=0.4,
            ambition=0.5,
            wisdom=0.8,
            charisma=0.9,
            cunning=0.8,
            personality_type=CharacterArchetype.ROGUE,
            status=CharacterStatus.ACTIVE,
            skills=["Truthful Lies", "Comedy", "Hidden Wisdom"],
        ),
        Character(
            char_id="char_303",
            name="The Hermit",
            title="Isolated Sage",
            description="An eccentric scholar who has spent centuries studying forgotten knowledge.",
            loyalty=0.3,
            ambition=0.2,
            wisdom=0.98,
            charisma=0.3,
            cunning=0.4,
            personality_type=CharacterArchetype.SAGE,
            status=CharacterStatus.HIDDEN,
            skills=["Ancient Knowledge", "Prophecy", "Hermetic Arts"],
        ),
        Character(
            char_id="char_304",
            name="The Spectre",
            title="Ghost of the Past",
            description="A somber figure who may or may not be actually alive.",
            loyalty=0.6,
            ambition=0.2,
            wisdom=0.9,
            charisma=0.5,
            cunning=0.7,
            personality_type=CharacterArchetype.GUARDIAN,
            status=CharacterStatus.HIDDEN,
            skills=["Past Knowledge", "Regret", "Haunting"],
        ),
        Character(
            char_id="char_305",
            name="The Trickster",
            title="Fate's Gambler",
            description="A chaotic figure who bets against destiny and sometimes wins.",
            loyalty=0.35,
            ambition=0.7,
            wisdom=0.6,
            charisma=0.85,
            cunning=0.95,
            personality_type=CharacterArchetype.ROGUE,
            status=CharacterStatus.TRAVELING,
            skills=["Luck Manipulation", "Deception", "Gambling"],
        ),
        Character(
            char_id="char_306",
            name="The Oracle",
            title="Seer of Futures",
            description="A blindfolded prophet whose visions are never wrong, only misinterpreted.",
            loyalty=0.7,
            ambition=0.3,
            wisdom=0.95,
            charisma=0.75,
            cunning=0.6,
            personality_type=CharacterArchetype.MYSTIC,
            status=CharacterStatus.HIDDEN,
            skills=["Perfect Prophecy", "Sight Beyond Sight", "Fate Reading"],
        ),
    ]
    return characters


def build_unique_npcs() -> List[Character]:
    """Create 6 unique characters with special roles"""
    characters = [
        Character(
            char_id="char_401",
            name="Keeper of the Null",
            title="Void Custodian",
            description="A being of absence, managing what should not be.",
            loyalty=0.5,
            ambition=0.0,
            wisdom=0.9,
            charisma=0.0,
            cunning=0.7,
            personality_type=CharacterArchetype.GUARDIAN,
            status=CharacterStatus.HIDDEN,
        ),
        Character(
            char_id="char_402",
            name="The Cartographer",
            title="Mapper of Possibility",
            description="Creates maps of places that don't exist yet.",
            loyalty=0.6,
            ambition=0.4,
            wisdom=0.8,
            charisma=0.5,
            cunning=0.7,
            personality_type=CharacterArchetype.SCHOLAR,
            status=CharacterStatus.TRAVELING,
        ),
        Character(
            char_id="char_403",
            name="Solace Heartmend",
            title="Counselor of Sorrows",
            description="A healer of deepest wounds, both physical and emotional.",
            loyalty=0.95,
            ambition=0.1,
            wisdom=0.95,
            charisma=0.85,
            cunning=0.2,
            personality_type=CharacterArchetype.GUARDIAN,
            status=CharacterStatus.ACTIVE,
        ),
        Character(
            char_id="char_404",
            name="Cipher",
            title="Code-Breaker",
            description="A mysterious figure who decodes patterns others cannot perceive.",
            loyalty=0.5,
            ambition=0.6,
            wisdom=0.9,
            charisma=0.4,
            cunning=0.95,
            personality_type=CharacterArchetype.SCHOLAR,
            status=CharacterStatus.ACTIVE,
        ),
        Character(
            char_id="char_405",
            name="Tempus",
            title="Time-Touched",
            description="Someone who experiences time non-linearly.",
            loyalty=0.4,
            ambition=0.5,
            wisdom=0.9,
            charisma=0.6,
            cunning=0.8,
            personality_type=CharacterArchetype.MYSTIC,
            status=CharacterStatus.HIDDEN,
        ),
        Character(
            char_id="char_406",
            name="Paradox",
            title="Living Contradiction",
            description="A being that embodies logical impossibility.",
            loyalty=0.3,
            ambition=0.7,
            wisdom=0.8,
            charisma=0.7,
            cunning=0.9,
            personality_type=CharacterArchetype.ROGUE,
            status=CharacterStatus.TRAVELING,
        ),
    ]
    return characters


# ============================================================================
# CREATURE FACTORY: BUILD 8+ MYTHIC CREATURES
# ============================================================================

def build_creatures() -> List[Creature]:
    """Create mythic creatures from the federation universe"""
    creatures = [
        Creature(
            creature_id="creature_001",
            name="Sky-Furk",
            description="Fluffy, winged mammals that dart through clouds with grace.",
            creature_type=CreatureType.SKY_FURK,
            rarity=CreatureRarity.COMMON,
            size="Small",
            intelligence=0.4,
            danger_level=0.1,
            domestication_level=0.8,
            special_ability="Flight - Enables rapid travel",
            habitat="High altitude clouds, mountain peaks",
            lore="Sky-Furks are ancient creatures that have guided travelers for millennia.",
            gameplay_bonuses={"movement_speed": 0.25, "travel_safety": 0.15},
            situational_help={"travel": "Speeds up journeys", "escape": "Helps flee danger"}
        ),
        Creature(
            creature_id="creature_002",
            name="Plasma-Kite",
            description="Manta-shaped beings of pure light energy, rare and magnificent.",
            creature_type=CreatureType.PLASMA_KITE,
            rarity=CreatureRarity.LEGENDARY,
            size="Large",
            intelligence=0.7,
            danger_level=0.3,
            domestication_level=0.4,
            special_ability="Energy Blessing - Boosts research and innovation",
            habitat="Electromagnetic storms, crystalline caves",
            lore="Plasma-Kites are said to be manifestations of pure knowledge.",
            gameplay_bonuses={"research_speed": 0.40, "breakthrough_chance": 0.20},
            situational_help={"research": "Accelerates discoveries", "crisis": "Provides energy"}
        ),
        Creature(
            creature_id="creature_003",
            name="Thrumback",
            description="Giant reptilian bird creatures with thunderous wing beats.",
            creature_type=CreatureType.THRUMBACK,
            rarity=CreatureRarity.RARE,
            size="Huge",
            intelligence=0.3,
            danger_level=0.9,
            domestication_level=0.2,
            special_ability="Combat Mount - Devastating in battle",
            habitat="Volcanic regions, storm-torn skies",
            lore="Thrumbacks were ancient weapons before becoming legendary allies.",
            gameplay_bonuses={"combat_power": 0.50, "defense": 0.25},
            situational_help={"battle": "Devastates enemies", "protection": "Strong defense"}
        ),
        Creature(
            creature_id="creature_004",
            name="Cloud-Gnasher",
            description="Fluffy but dangerous creatures that move through skies like predators.",
            creature_type=CreatureType.CLOUD_GNASHER,
            rarity=CreatureRarity.RARE,
            size="Medium",
            intelligence=0.5,
            danger_level=0.6,
            domestication_level=0.5,
            special_ability="Morale Aura - Affects party mood",
            habitat="Temperate cloud layers, storm formations",
            lore="Cloud-Gnashers influence emotions and morale through mystic presence.",
            gameplay_bonuses={"morale": 0.30, "inspiration": 0.20},
            situational_help={"morale": "Boosts team spirit", "depression": "Lifts despair"}
        ),
        Creature(
            creature_id="creature_005",
            name="Void-Skipper",
            description="Translucent, shy beings that exist partially outside normal space.",
            creature_type=CreatureType.VOID_SKIPPER,
            rarity=CreatureRarity.RARE,
            size="Small",
            intelligence=0.6,
            danger_level=0.2,
            domestication_level=0.6,
            special_ability="Dimensional Shift - Enables stealth and escape",
            habitat="Dimensional rifts, quiet forgotten places",
            lore="Void-Skippers are said to be fragments of the world between worlds.",
            gameplay_bonuses={"stealth": 0.45, "escape_chance": 0.35},
            situational_help={"exploration": "Reveals hidden paths", "danger": "Enables escape"}
        ),
        Creature(
            creature_id="creature_006",
            name="Dream-Wyrm",
            description="Ethereal serpents that appear during prophecy and visions.",
            creature_type=CreatureType.DREAM_WYRM,
            rarity=CreatureRarity.LEGENDARY,
            size="Large",
            intelligence=0.85,
            danger_level=0.4,
            domestication_level=0.3,
            special_ability="Prophecy Enhancement - Deepens visions",
            habitat="Collective consciousness spaces, meditation centers",
            lore="Dream-Wyrms are manifestations of shared consciousness and future sight.",
            gameplay_bonuses={"prophecy_accuracy": 0.50, "consciousness_connection": 0.35},
            situational_help={"prophecy": "Enhances visions", "crisis": "Reveals solutions"}
        ),
        Creature(
            creature_id="creature_007",
            name="Harmonic Maw",
            description="A massive, ancient creature that embodies contradiction and hunger.",
            creature_type=CreatureType.HARMONIC_MAW,
            rarity=CreatureRarity.MYTHIC,
            size="Enormous",
            intelligence=0.95,
            danger_level=1.0,
            domestication_level=0.1,
            special_ability="Void Consumption - Absorbs enemy attacks",
            habitat="Deep chasms, paradox zones",
            lore="Harmonic Maw is the antagonist of nature, if it can be tamed, victory is assured.",
            gameplay_bonuses={"power": 1.0, "invulnerability": 0.50},
            situational_help={"ultimate_battle": "Enables victory against impossible odds"}
        ),
        Creature(
            creature_id="creature_008",
            name="Prism Assembly",
            description="Sentient light-beings that form collective consciousness.",
            creature_type=CreatureType.PRISM_ASSEMBLY,
            rarity=CreatureRarity.LEGENDARY,
            size="Medium",
            intelligence=0.9,
            danger_level=0.2,
            domestication_level=0.7,
            special_ability="Collective Insight - Shared knowledge network",
            habitat="Crystal formations, enlightened temples",
            lore="Prism Assemblies represent unity of consciousness and cooperative power.",
            gameplay_bonuses={"diplomacy": 0.30, "faction_unity": 0.40, "knowledge": 0.35},
            situational_help={"diplomacy": "Aids negotiations", "unity": "Brings factions together"}
        ),
    ]
    return creatures


# ============================================================================
# FACTORY FUNCTION: BUILD COMPLETE NPC SYSTEM
# ============================================================================

def build_npc_system() -> NPCSystem:
    """Factory function to build the complete NPC system"""
    system = NPCSystem()

    # Register all characters
    all_characters = (
        build_historical_figures() +
        build_faction_leaders() +
        build_antagonists() +
        build_mysterious_figures() +
        build_unique_npcs()
    )

    for char in all_characters:
        system.register_character(char)

    # Register companions
    companions = build_companion_candidates()
    for comp in companions:
        system.register_companion(comp)

    # Register creatures
    creatures = build_creatures()
    for creature in creatures:
        system.register_creature(creature)

    return system


# ============================================================================
# TESTING / DEMO
# ============================================================================

if __name__ == "__main__":
    print("=" * 80)
    print("THE FEDERATION GAME - NPC/Creature System Demo")
    print("=" * 80)

    # Build system
    system = build_npc_system()

    # Display character overview
    print("\n[NPC OVERVIEW]")
    print(f"Total Characters: {len(system.characters)}")
    print(f"Total Companions: {len(system.companions)}")
    print(f"Total Creatures: {len(system.creatures)}")

    # Show a random encounter
    print("\n[RANDOM ENCOUNTER]")
    encounter = system.spawn_random_encounter()
    if encounter:
        print(f"Type: {encounter['type']}")
        print(f"Description: {encounter['description']}")

    # Show faction characters
    print("\n[FACTION CHARACTERS]")
    print("Diplomatic Corps members:")
    for char in system.get_characters_by_faction("diplomatic_corps"):
        print(f"  - {char.name} ({char.title})")

    # Show companion stats
    print("\n[COMPANION STATS]")
    for comp in list(system.companions.values())[:3]:
        print(f"\n{comp.name} ({comp.title})")
        print(f"  Bonus: +{comp.bonus_value:.0%} {comp.companion_bonus.value}")
        print(f"  Ability: {comp.special_ability}")
        print(f"  Quirks: {', '.join(comp.personality_quirks)}")

    # Show creatures
    print("\n[CREATURES]")
    for creature in list(system.creatures.values())[:4]:
        print(f"\n{creature.name}")
        print(f"  Rarity: {creature.rarity.value}")
        print(f"  Habitat: {creature.habitat}")
        print(f"  Ability: {creature.special_ability}")
        print(f"  Bonuses: {creature.gameplay_bonuses}")

    # Character report
    print("\n[CHARACTER REPORT]")
    report = system.get_character_report("char_001")
    print(json.dumps(report, indent=2))

    # Creature report
    print("\n[CREATURE REPORT]")
    creature_report = system.get_creature_report("creature_002")
    print(json.dumps(creature_report, indent=2))

    print("\n" + "=" * 80)
    print("NPC System initialized successfully!")
    print("=" * 80)
