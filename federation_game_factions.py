"""
FEDERATION GAME - Faction/Alignment System
Complete faction mechanics for THE FEDERATION GAME
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Tuple, Set
from datetime import datetime
import json


# ============================================================================
# ENUMS
# ============================================================================

class IdeologyType(Enum):
    """Faction philosophy and approach"""
    DIPLOMATIC = "diplomatic"      # Treaties, alliances, negotiation
    MILITARY = "military"          # Defense, combat, strength
    CULTURAL = "cultural"          # Art, morale, unity
    SCIENTIFIC = "scientific"      # Tech, research, innovation
    SPIRITUAL = "spiritual"        # Prophecy, harmony, consciousness
    ECONOMIC = "economic"          # Trade, resources, efficiency
    DISCOVERY = "discovery"        # Exploration, territory, expansion
    STABILITY = "stability"        # Preservation, tradition, order


class BonusType(Enum):
    """Types of gameplay bonuses perks can provide"""
    MORALE = "morale"
    RESEARCH_SPEED = "research_speed"
    RESOURCE_PRODUCTION = "resource_production"
    DEFENSE = "defense"
    TREATY_SPEED = "treaty_speed"
    EXPLORATION_RANGE = "exploration_range"
    PROPHECY_ACCURACY = "prophecy_accuracy"
    STABILITY = "stability"
    DIPLOMACY = "diplomacy"
    MILITARY_STRENGTH = "military_strength"
    TRADE_PROFIT = "trade_profit"
    CULTURAL_INFLUENCE = "cultural_influence"
    TECH_BREAKTHROUGH = "tech_breakthrough"
    UNITY = "unity"
    REPUTATION_GAIN = "reputation_gain"
    ALL_RESOURCES = "all_resources"


class QuestType(Enum):
    """Types of faction quests"""
    DIPLOMACY = "diplomacy"
    WARFARE = "warfare"
    RESEARCH = "research"
    CULTURAL = "cultural"
    ESPIONAGE = "espionage"
    EXPLORATION = "exploration"
    ECONOMIC = "economic"
    SPIRITUAL = "spiritual"


# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class FactionPerk:
    """A perk available to faction members"""
    perk_id: str
    perk_name: str
    description: str
    bonus_type: BonusType
    bonus_value: float                    # Percentage or fixed amount
    bonus_duration: int                   # In game turns, 0 = permanent
    unlocked_at_reputation: float         # 0.0-1.0, required to unlock
    icon: str = "default"                 # UI icon identifier
    category: str = "general"             # For UI grouping

    def __hash__(self):
        return hash(self.perk_id)

    def __eq__(self, other):
        return isinstance(other, FactionPerk) and self.perk_id == other.perk_id


@dataclass
class FactionQuest:
    """A quest specific to a faction"""
    quest_id: str
    quest_name: str
    description: str
    quest_type: QuestType
    difficulty: str                       # easy, medium, hard, legendary
    reputation_reward: float              # 0.0-1.0 reputation gain
    resource_reward: Dict[str, int]       # {resource: amount}
    objective: str                        # Player-facing objective
    turns_available: int                  # How many turns to complete
    unlocked_at_reputation: float = 0.2   # Minimum reputation to unlock quest
    prerequisites: List[str] = field(default_factory=list)  # Other quest IDs
    conflicting_factions: List[str] = field(default_factory=list)  # Factions that oppose this
    hidden: bool = False                  # Requires discovery


@dataclass
class FactionAchievement:
    """Faction milestones and lore events"""
    achievement_id: str
    achievement_name: str
    description: str
    threshold_reputation: float           # Required faction reputation
    unlocked_at_turn: Optional[int] = None
    is_permanent: bool = True


# ============================================================================
# FACTION CLASS
# ============================================================================

class Faction:
    """Represents a faction in THE FEDERATION GAME"""

    def __init__(
        self,
        faction_id: str,
        name: str,
        description: str,
        ideology: IdeologyType,
        headquarters_location: str,
        founding_year: int = 2200
    ):
        self.faction_id = faction_id
        self.name = name
        self.description = description
        self.ideology = ideology
        self.headquarters_location = headquarters_location
        self.founding_year = founding_year

        # Core data structures
        self.player_reputation: Dict[str, float] = {}  # player_id -> reputation (0.0-1.0)
        self.faction_members: Set[str] = set()          # player_ids
        self.member_count: int = 0

        # Content libraries
        self.available_perks: List[FactionPerk] = []
        self.available_quests: List[FactionQuest] = []
        self.faction_achievements: List[FactionAchievement] = []

        # Player-specific progression
        self.unlocked_quests: Dict[str, Set[str]] = {}  # player_id -> quest_ids
        self.unlocked_perks: Dict[str, Set[str]] = {}   # player_id -> perk_ids
        self.completed_quests: Dict[str, Set[str]] = {} # player_id -> quest_ids

        # Faction lore and goals
        self.faction_goals: List[str] = []
        self.faction_history: List[Tuple[int, str]] = []  # (turn, event)
        self.faction_philosophy: str = ""
        self.core_values: List[str] = []

        # Faction relationships
        self.ally_factions: List[str] = []              # faction_ids
        self.enemy_factions: List[str] = []             # faction_ids
        self.neutral_factions: List[str] = []           # faction_ids

        # Gameplay attributes
        self.faction_level: int = 1
        self.accumulated_power: float = 0.0
        self.influence_map: Dict[str, float] = {}       # territory -> influence (0-1)

    def add_perk(self, perk: FactionPerk) -> None:
        """Register a perk for this faction"""
        if perk not in self.available_perks:
            self.available_perks.append(perk)

    def add_quest(self, quest: FactionQuest) -> None:
        """Register a quest for this faction"""
        if quest not in self.available_quests:
            self.available_quests.append(quest)

    def add_achievement(self, achievement: FactionAchievement) -> None:
        """Register an achievement"""
        self.faction_achievements.append(achievement)

    def get_active_perks(self, player_id: str) -> List[FactionPerk]:
        """Get all perks a player has unlocked"""
        if player_id not in self.unlocked_perks:
            return []

        perk_ids = self.unlocked_perks[player_id]
        return [p for p in self.available_perks if p.perk_id in perk_ids]

    def get_available_quests(self, player_id: str) -> List[FactionQuest]:
        """Get all quests player can currently undertake"""
        if player_id not in self.unlocked_quests:
            return []

        quest_ids = self.unlocked_quests[player_id]
        completed_ids = self.completed_quests.get(player_id, set())

        return [
            q for q in self.available_quests
            if q.quest_id in quest_ids and q.quest_id not in completed_ids
        ]

    def get_faction_bonuses(self, player_id: str) -> Dict[BonusType, float]:
        """Calculate total bonuses from all active perks"""
        bonuses: Dict[BonusType, float] = {}

        for perk in self.get_active_perks(player_id):
            if perk.bonus_type not in bonuses:
                bonuses[perk.bonus_type] = 0.0
            bonuses[perk.bonus_type] += perk.bonus_value

        return bonuses

    def record_history(self, turn: int, event: str) -> None:
        """Record a faction history event"""
        self.faction_history.append((turn, event))

    def __repr__(self):
        return f"<Faction {self.name} (ID: {self.faction_id}) - Ideology: {self.ideology.value}>"


# ============================================================================
# FACTION SYSTEM CLASS
# ============================================================================

class FactionSystem:
    """Manages all faction mechanics and player relationships"""

    def __init__(self):
        self.factions: Dict[str, Faction] = {}
        self.player_factions: Dict[str, str] = {}        # player_id -> faction_id
        self.player_history: Dict[str, List[Tuple[int, str, float]]] = {}  # player_id -> [(turn, faction_id, rep_change)]
        self.current_turn: int = 1

    def register_faction(self, faction: Faction) -> bool:
        """Register a new faction"""
        if faction.faction_id in self.factions:
            return False

        self.factions[faction.faction_id] = faction
        return True

    def join_faction(self, player_id: str, faction_id: str) -> bool:
        """Player joins a faction (leaves current faction if any)"""
        if faction_id not in self.factions:
            return False

        # Leave current faction
        if player_id in self.player_factions:
            old_faction_id = self.player_factions[player_id]
            old_faction = self.factions[old_faction_id]
            if player_id in old_faction.faction_members:
                old_faction.faction_members.remove(player_id)
                old_faction.member_count = len(old_faction.faction_members)
            # Reset reputation tracking for old faction
            if player_id in old_faction.player_reputation:
                del old_faction.player_reputation[player_id]

        # Join new faction
        faction = self.factions[faction_id]
        faction.faction_members.add(player_id)
        faction.member_count = len(faction.faction_members)

        # Initialize reputation at 0.2 (new member standing)
        faction.player_reputation[player_id] = 0.2
        faction.unlocked_quests[player_id] = set()
        faction.unlocked_perks[player_id] = set()
        faction.completed_quests[player_id] = set()

        # Track faction change
        if player_id not in self.player_history:
            self.player_history[player_id] = []
        self.player_history[player_id].append((self.current_turn, faction_id, 0.2))

        # Ensure basic quest is unlocked
        self._unlock_basic_quests(faction_id, player_id)

        # Update player faction
        self.player_factions[player_id] = faction_id
        return True

    def change_reputation(self, player_id: str, faction_id: str, delta: float) -> float:
        """Change player's reputation with a faction"""
        if faction_id not in self.factions:
            return 0.0

        faction = self.factions[faction_id]

        if player_id not in faction.player_reputation:
            faction.player_reputation[player_id] = 0.5

        old_rep = faction.player_reputation[player_id]
        new_rep = max(0.0, min(1.0, old_rep + delta))  # Clamp 0-1
        faction.player_reputation[player_id] = new_rep

        # Track change
        if player_id not in self.player_history:
            self.player_history[player_id] = []
        self.player_history[player_id].append((self.current_turn, faction_id, delta))

        # Unlock perks/quests if reputation thresholds crossed
        self._check_reputation_unlocks(faction_id, player_id, new_rep)

        return new_rep

    def get_player_faction(self, player_id: str) -> Optional[Faction]:
        """Get player's current faction"""
        if player_id not in self.player_factions:
            return None

        faction_id = self.player_factions[player_id]
        return self.factions.get(faction_id)

    def get_player_reputation(self, player_id: str, faction_id: str) -> float:
        """Get player's reputation with a faction"""
        if faction_id not in self.factions:
            return 0.0

        faction = self.factions[faction_id]
        return faction.player_reputation.get(player_id, 0.0)

    def get_faction_perks(
        self,
        faction_id: str,
        player_id: str
    ) -> List[FactionPerk]:
        """Get all unlocked perks for a player in a faction"""
        if faction_id not in self.factions:
            return []

        faction = self.factions[faction_id]
        return faction.get_active_perks(player_id)

    def get_faction_missions(self, faction_id: str, player_id: str) -> List[FactionQuest]:
        """Get all available quests for player in faction"""
        if faction_id not in self.factions:
            return []

        faction = self.factions[faction_id]
        return faction.get_available_quests(player_id)

    def check_faction_unlock(self, faction_id: str, player_id: str) -> bool:
        """Check if a perk/quest should be unlocked at current reputation"""
        if faction_id not in self.factions:
            return False

        faction = self.factions[faction_id]
        reputation = faction.player_reputation.get(player_id, 0.0)

        return reputation >= 0.2  # Minimum to have any interactions

    def complete_quest(
        self,
        player_id: str,
        faction_id: str,
        quest_id: str
    ) -> Tuple[bool, Dict]:
        """Mark a quest as completed and process rewards"""
        if faction_id not in self.factions:
            return False, {}

        faction = self.factions[faction_id]

        # Find quest
        quest = None
        for q in faction.available_quests:
            if q.quest_id == quest_id:
                quest = q
                break

        if not quest:
            return False, {}

        # Mark complete
        if player_id not in faction.completed_quests:
            faction.completed_quests[player_id] = set()

        faction.completed_quests[player_id].add(quest_id)

        # Apply rewards
        reputation_gained = quest.reputation_reward
        resources_gained = quest.resource_reward.copy()

        self.change_reputation(player_id, faction_id, reputation_gained)

        return True, {
            "reputation_gained": reputation_gained,
            "resources_gained": resources_gained,
            "quest_name": quest.quest_name
        }

    def get_faction_status(self, faction_id: str) -> Dict:
        """Get overall status of a faction"""
        if faction_id not in self.factions:
            return {}

        faction = self.factions[faction_id]

        return {
            "faction_id": faction.faction_id,
            "name": faction.name,
            "ideology": faction.ideology.value,
            "members": faction.member_count,
            "level": faction.faction_level,
            "power": faction.accumulated_power,
            "headquarters": faction.headquarters_location,
            "allies": faction.ally_factions,
            "enemies": faction.enemy_factions,
        }

    def advance_turn(self):
        """Advance game turn"""
        self.current_turn += 1

    # ========================================================================
    # Private Helper Methods
    # ========================================================================

    def _check_reputation_unlocks(self, faction_id: str, player_id: str, reputation: float) -> None:
        """Check and unlock perks/quests based on reputation threshold"""
        faction = self.factions[faction_id]

        # Unlock perks
        for perk in faction.available_perks:
            if reputation >= perk.unlocked_at_reputation:
                if player_id not in faction.unlocked_perks:
                    faction.unlocked_perks[player_id] = set()
                faction.unlocked_perks[player_id].add(perk.perk_id)

        # Unlock quests
        for quest in faction.available_quests:
            if reputation >= quest.unlocked_at_reputation:
                if player_id not in faction.unlocked_quests:
                    faction.unlocked_quests[player_id] = set()
                faction.unlocked_quests[player_id].add(quest.quest_id)

    def _unlock_basic_quests(self, faction_id: str, player_id: str) -> None:
        """Unlock starting quests when player joins"""
        faction = self.factions[faction_id]

        if player_id not in faction.unlocked_quests:
            faction.unlocked_quests[player_id] = set()

        # Unlock easy quests
        for quest in faction.available_quests:
            if quest.difficulty == "easy":
                faction.unlocked_quests[player_id].add(quest.quest_id)


# ============================================================================
# FACTION FACTORY: BUILD THE 8 FACTIONS
# ============================================================================

def create_diplomatic_corps() -> Faction:
    """Diplomatic Corps - Masters of negotiation and treaties"""
    faction = Faction(
        faction_id="diplomatic_corps",
        name="Diplomatic Corps",
        description="Skilled negotiators dedicated to peaceful resolution and mutual understanding",
        ideology=IdeologyType.DIPLOMATIC,
        headquarters_location="Council Ring, Nova Prime",
        founding_year=2198
    )

    faction.faction_philosophy = "Through dialogue, we bridge worlds. Peace is not the absence of conflict, but the mastery of it."
    faction.core_values = ["Trust", "Negotiation", "Understanding", "Patience"]
    faction.faction_goals = [
        "Establish treaties with all factions",
        "Reduce conflict-related casualties by 50%",
        "Create a unified federation council"
    ]
    faction.ally_factions = ["cultural_ministry"]
    faction.enemy_factions = ["military_command"]
    faction.neutral_factions = ["economic_council", "research_division"]

    # Perks
    perks = [
        FactionPerk(
            perk_id="treaty_speed_1",
            perk_name="Swift Diplomacy",
            description="Treaty negotiations complete 25% faster",
            bonus_type=BonusType.TREATY_SPEED,
            bonus_value=0.25,
            bonus_duration=0,
            unlocked_at_reputation=0.2,
            category="negotiation"
        ),
        FactionPerk(
            perk_id="diplomacy_boost_1",
            perk_name="Silver Tongue",
            description="Diplomatic favor increases by 15%",
            bonus_type=BonusType.DIPLOMACY,
            bonus_value=0.15,
            bonus_duration=0,
            unlocked_at_reputation=0.4,
            category="negotiation"
        ),
        FactionPerk(
            perk_id="alliance_network",
            perk_name="Alliance Network",
            description="Gain +10% reputation gain with all factions",
            bonus_type=BonusType.REPUTATION_GAIN,
            bonus_value=0.10,
            bonus_duration=0,
            unlocked_at_reputation=0.6,
            category="relations"
        ),
        FactionPerk(
            perk_id="peace_dividend",
            perk_name="Peace Dividend",
            description="Each active treaty grants +5% resource production",
            bonus_type=BonusType.RESOURCE_PRODUCTION,
            bonus_value=0.05,
            bonus_duration=0,
            unlocked_at_reputation=0.8,
            category="economy"
        ),
        FactionPerk(
            perk_id="conflict_mitigation",
            perk_name="Conflict Mitigation",
            description="War losses reduced by 30%; treaties grant full amnesty",
            bonus_type=BonusType.DEFENSE,
            bonus_value=0.30,
            bonus_duration=0,
            unlocked_at_reputation=0.9,
            category="protection"
        ),
    ]
    for perk in perks:
        faction.add_perk(perk)

    # Quests
    quests = [
        FactionQuest(
            quest_id="first_treaty",
            quest_name="Establish First Treaty",
            description="Negotiate a peace treaty with any other faction",
            quest_type=QuestType.DIPLOMACY,
            difficulty="easy",
            reputation_reward=0.15,
            resource_reward={"credits": 1000, "diplomatic_favor": 50},
            objective="Complete a successful treaty negotiation",
            turns_available=20,
            hidden=False
        ),
        FactionQuest(
            quest_id="alliance_quartet",
            quest_name="Alliance Quartet",
            description="Establish treaties with 4 different factions simultaneously",
            quest_type=QuestType.DIPLOMACY,
            difficulty="hard",
            reputation_reward=0.25,
            resource_reward={"credits": 5000, "diplomatic_favor": 200},
            objective="Maintain 4 active treaties at once",
            turns_available=60,
            prerequisites=["first_treaty"],
            hidden=False
        ),
        FactionQuest(
            quest_id="peace_summit",
            quest_name="Federation Peace Summit",
            description="Host a summit where all major factions agree to peaceful coexistence",
            quest_type=QuestType.DIPLOMACY,
            difficulty="legendary",
            reputation_reward=0.30,
            resource_reward={"credits": 10000, "diplomatic_favor": 500, "unity": 100},
            objective="Host a peace summit with majority faction participation",
            turns_available=100,
            prerequisites=["alliance_quartet"],
            hidden=False
        ),
    ]
    for quest in quests:
        faction.add_quest(quest)

    return faction


def create_military_command() -> Faction:
    """Military Command - Defenders and warriors of federation strength"""
    faction = Faction(
        faction_id="military_command",
        name="Military Command",
        description="Strategic warriors committed to federation security and strength",
        ideology=IdeologyType.MILITARY,
        headquarters_location="Fortress Station, Iron Peak",
        founding_year=2195
    )

    faction.faction_philosophy = "Strength ensures survival. Vigilance prevents catastrophe. We are the shield."
    faction.core_values = ["Strength", "Discipline", "Honor", "Strategy"]
    faction.faction_goals = [
        "Achieve military supremacy in key sectors",
        "Eliminate external threats to the federation",
        "Build an unbreakable defense network"
    ]
    faction.ally_factions = ["exploration_initiative"]
    faction.enemy_factions = ["diplomatic_corps"]
    faction.neutral_factions = ["research_division"]

    # Perks
    perks = [
        FactionPerk(
            perk_id="military_strength_1",
            perk_name="Battle Ready",
            description="Military unit strength increased by 20%",
            bonus_type=BonusType.MILITARY_STRENGTH,
            bonus_value=0.20,
            bonus_duration=0,
            unlocked_at_reputation=0.2,
            category="combat"
        ),
        FactionPerk(
            perk_id="fortified_defense",
            perk_name="Fortified Defense",
            description="All defensive structures gain 25% durability",
            bonus_type=BonusType.DEFENSE,
            bonus_value=0.25,
            bonus_duration=0,
            unlocked_at_reputation=0.4,
            category="defense"
        ),
        FactionPerk(
            perk_id="rapid_mobilization",
            perk_name="Rapid Mobilization",
            description="Military units deploy 30% faster",
            bonus_type=BonusType.RESEARCH_SPEED,
            bonus_value=0.30,
            bonus_duration=0,
            unlocked_at_reputation=0.6,
            category="logistics"
        ),
        FactionPerk(
            perk_id="tactical_advantage",
            perk_name="Tactical Advantage",
            description="Gain +15% combat effectiveness in strategy layer",
            bonus_type=BonusType.MILITARY_STRENGTH,
            bonus_value=0.15,
            bonus_duration=0,
            unlocked_at_reputation=0.8,
            category="combat"
        ),
        FactionPerk(
            perk_id="iron_will",
            perk_name="Iron Will",
            description="Units cannot be demoralized; suffer 20% less casualties",
            bonus_type=BonusType.MORALE,
            bonus_value=0.20,
            bonus_duration=0,
            unlocked_at_reputation=0.9,
            category="morale"
        ),
    ]
    for perk in perks:
        faction.add_perk(perk)

    # Quests
    quests = [
        FactionQuest(
            quest_id="first_defense",
            quest_name="Defend the Frontier",
            description="Repel an attack on federation territory",
            quest_type=QuestType.WARFARE,
            difficulty="easy",
            reputation_reward=0.15,
            resource_reward={"credits": 1500, "military_supplies": 100},
            objective="Successfully defend against military aggression",
            turns_available=25,
            hidden=False
        ),
        FactionQuest(
            quest_id="sector_control",
            quest_name="Sector Dominance",
            description="Achieve military superiority in 3 separate sectors",
            quest_type=QuestType.WARFARE,
            difficulty="hard",
            reputation_reward=0.25,
            resource_reward={"credits": 6000, "military_supplies": 300},
            objective="Control 3 sectors with overwhelming military presence",
            turns_available=50,
            prerequisites=["first_defense"],
            hidden=False
        ),
        FactionQuest(
            quest_id="impregnable_fortress",
            quest_name="Build the Impregnable Fortress",
            description="Create an unbreakable military stronghold",
            quest_type=QuestType.WARFARE,
            difficulty="legendary",
            reputation_reward=0.30,
            resource_reward={"credits": 10000, "military_supplies": 500},
            objective="Build and maintain the strongest defensive position",
            turns_available=80,
            prerequisites=["sector_control"],
            hidden=False
        ),
    ]
    for quest in quests:
        faction.add_quest(quest)

    return faction


def create_cultural_ministry() -> Faction:
    """Cultural Ministry - Artists and custodians of civilization"""
    faction = Faction(
        faction_id="cultural_ministry",
        name="Cultural Ministry",
        description="Guardians of art, heritage, and the bonds that unite us",
        ideology=IdeologyType.CULTURAL,
        headquarters_location="Grand Amphitheater, Harmony Central",
        founding_year=2200
    )

    faction.faction_philosophy = "Culture is the soul of civilization. Through art, music, and story, we transcend our differences."
    faction.core_values = ["Creativity", "Unity", "Heritage", "Expression"]
    faction.faction_goals = [
        "Establish cultural centers in every major world",
        "Achieve 90% population morale federation-wide",
        "Preserve and celebrate all federation cultures"
    ]
    faction.ally_factions = ["diplomatic_corps", "consciousness_collective"]
    faction.enemy_factions = []
    faction.neutral_factions = ["research_division", "economic_council"]

    # Perks
    perks = [
        FactionPerk(
            perk_id="morale_boost_1",
            perk_name="Cultural Celebration",
            description="Population morale increased by 15%",
            bonus_type=BonusType.MORALE,
            bonus_value=0.15,
            bonus_duration=0,
            unlocked_at_reputation=0.2,
            category="culture"
        ),
        FactionPerk(
            perk_id="cultural_influence_1",
            perk_name="Cultural Magnetism",
            description="Cultural influence spreads 20% faster to new worlds",
            bonus_type=BonusType.CULTURAL_INFLUENCE,
            bonus_value=0.20,
            bonus_duration=0,
            unlocked_at_reputation=0.4,
            category="influence"
        ),
        FactionPerk(
            perk_id="unity_growth",
            perk_name="Unity Through Culture",
            description="All faction relationships improve 10% faster",
            bonus_type=BonusType.UNITY,
            bonus_value=0.10,
            bonus_duration=0,
            unlocked_at_reputation=0.6,
            category="relations"
        ),
        FactionPerk(
            perk_id="morale_multiplier",
            perk_name="Inspirational Leadership",
            description="Morale bonuses have +25% multiplier effect",
            bonus_type=BonusType.MORALE,
            bonus_value=0.25,
            bonus_duration=0,
            unlocked_at_reputation=0.8,
            category="morale"
        ),
        FactionPerk(
            perk_id="transcendence",
            perk_name="Cultural Transcendence",
            description="Gain +30% resource production during cultural events; all populations at max happiness",
            bonus_type=BonusType.ALL_RESOURCES,
            bonus_value=0.30,
            bonus_duration=0,
            unlocked_at_reputation=0.95,
            category="mastery"
        ),
    ]
    for perk in perks:
        faction.add_perk(perk)

    # Quests
    quests = [
        FactionQuest(
            quest_id="first_festival",
            quest_name="Organize a Festival",
            description="Hold a major cultural festival that increases morale",
            quest_type=QuestType.CULTURAL,
            difficulty="easy",
            reputation_reward=0.15,
            resource_reward={"credits": 1200, "cultural_artifacts": 50},
            objective="Successfully organize and celebrate a cultural festival",
            turns_available=20,
            hidden=False
        ),
        FactionQuest(
            quest_id="art_renaissance",
            quest_name="Cultural Renaissance",
            description="Build cultural centers on 5 different worlds and achieve 80% happiness on each",
            quest_type=QuestType.CULTURAL,
            difficulty="hard",
            reputation_reward=0.25,
            resource_reward={"credits": 6000, "cultural_artifacts": 250},
            objective="Spread culture across 5 worlds to critical mass",
            turns_available=60,
            prerequisites=["first_festival"],
            hidden=False
        ),
        FactionQuest(
            quest_id="universal_harmony",
            quest_name="Universal Harmony",
            description="Achieve 95% morale across the entire federation",
            quest_type=QuestType.CULTURAL,
            difficulty="legendary",
            reputation_reward=0.35,
            resource_reward={"credits": 12000, "cultural_artifacts": 500, "unity": 150},
            objective="Inspire all worlds to achieve near-perfect happiness",
            turns_available=100,
            prerequisites=["art_renaissance"],
            hidden=False
        ),
    ]
    for quest in quests:
        faction.add_quest(quest)

    return faction


def create_research_division() -> Faction:
    """Research Division - Scientists unlocking the universe's secrets"""
    faction = Faction(
        faction_id="research_division",
        name="Research Division",
        description="Scientists and innovators discovering the secrets of the universe",
        ideology=IdeologyType.SCIENTIFIC,
        headquarters_location="Innovation Complex, Kepler Station",
        founding_year=2199
    )

    faction.faction_philosophy = "Knowledge is power. Through research, we unlock the next evolution of civilization."
    faction.core_values = ["Discovery", "Innovation", "Method", "Progress"]
    faction.faction_goals = [
        "Unlock all tier-5 technologies",
        "Establish research stations in deep space",
        "Achieve technological supremacy"
    ]
    faction.ally_factions = ["consciousness_collective"]
    faction.enemy_factions = []
    faction.neutral_factions = ["diplomatic_corps", "military_command", "economic_council"]

    # Perks
    perks = [
        FactionPerk(
            perk_id="research_speed_1",
            perk_name="Scientific Insight",
            description="Technology research completes 20% faster",
            bonus_type=BonusType.RESEARCH_SPEED,
            bonus_value=0.20,
            bonus_duration=0,
            unlocked_at_reputation=0.2,
            category="research"
        ),
        FactionPerk(
            perk_id="breakthrough_rate",
            perk_name="Breakthrough Acceleration",
            description="Chance of tech breakthrough increased by 15%",
            bonus_type=BonusType.TECH_BREAKTHROUGH,
            bonus_value=0.15,
            bonus_duration=0,
            unlocked_at_reputation=0.4,
            category="research"
        ),
        FactionPerk(
            perk_id="research_cost_reduction",
            perk_name="Efficient Research",
            description="Technology research costs 15% fewer resources",
            bonus_type=BonusType.RESOURCE_PRODUCTION,
            bonus_value=0.15,
            bonus_duration=0,
            unlocked_at_reputation=0.6,
            category="efficiency"
        ),
        FactionPerk(
            perk_id="dual_research",
            perk_name="Parallel Research",
            description="Research 2 technologies simultaneously",
            bonus_type=BonusType.RESEARCH_SPEED,
            bonus_value=0.50,
            bonus_duration=0,
            unlocked_at_reputation=0.8,
            category="research"
        ),
        FactionPerk(
            perk_id="singularity_approach",
            perk_name="Approach to Singularity",
            description="All research accelerates by 35%; unlock experimental technologies",
            bonus_type=BonusType.TECH_BREAKTHROUGH,
            bonus_value=0.35,
            bonus_duration=0,
            unlocked_at_reputation=0.95,
            category="mastery"
        ),
    ]
    for perk in perks:
        faction.add_perk(perk)

    # Quests
    quests = [
        FactionQuest(
            quest_id="first_breakthrough",
            quest_name="First Breakthrough",
            description="Complete your first advanced technology research",
            quest_type=QuestType.RESEARCH,
            difficulty="easy",
            reputation_reward=0.15,
            resource_reward={"credits": 1500, "research_points": 200},
            objective="Research an advanced technology",
            turns_available=25,
            hidden=False
        ),
        FactionQuest(
            quest_id="tech_trinity",
            quest_name="Technology Trinity",
            description="Master three key technologies from different domains",
            quest_type=QuestType.RESEARCH,
            difficulty="hard",
            reputation_reward=0.25,
            resource_reward={"credits": 6000, "research_points": 500},
            objective="Master 3 advanced technologies across different branches",
            turns_available=60,
            prerequisites=["first_breakthrough"],
            hidden=False
        ),
        FactionQuest(
            quest_id="technological_apocalypse",
            quest_name="Technological Singularity",
            description="Reach the highest tier of technological advancement",
            quest_type=QuestType.RESEARCH,
            difficulty="legendary",
            reputation_reward=0.35,
            resource_reward={"credits": 12000, "research_points": 1000, "credits": 500},
            objective="Unlock and master the most advanced technologies available",
            turns_available=100,
            prerequisites=["tech_trinity"],
            hidden=False
        ),
    ]
    for quest in quests:
        faction.add_quest(quest)

    return faction


def create_consciousness_collective() -> Faction:
    """Consciousness Collective - Mystics seeking unity of mind"""
    faction = Faction(
        faction_id="consciousness_collective",
        name="Consciousness Collective",
        description="Seekers of spiritual harmony and collective consciousness awakening",
        ideology=IdeologyType.SPIRITUAL,
        headquarters_location="Temple of Awakening, Crystal Realm",
        founding_year=2196
    )

    faction.faction_philosophy = "All minds are one. Through collective consciousness, we transcend limitation and achieve enlightenment."
    faction.core_values = ["Enlightenment", "Connection", "Harmony", "Transcendence"]
    faction.faction_goals = [
        "Achieve telepathic communication network across federation",
        "Unlock prophecy accuracy to 90%",
        "Create a unified consciousness node"
    ]
    faction.ally_factions = ["cultural_ministry", "research_division"]
    faction.enemy_factions = []
    faction.neutral_factions = []

    # Perks
    perks = [
        FactionPerk(
            perk_id="prophecy_boost_1",
            perk_name="Precognition",
            description="Prophecy accuracy increased by 15%",
            bonus_type=BonusType.PROPHECY_ACCURACY,
            bonus_value=0.15,
            bonus_duration=0,
            unlocked_at_reputation=0.2,
            category="mysticism"
        ),
        FactionPerk(
            perk_id="telepathy_network",
            perk_name="Telepathic Network",
            description="Gain insight into faction activities; morale +10% federation-wide",
            bonus_type=BonusType.MORALE,
            bonus_value=0.10,
            bonus_duration=0,
            unlocked_at_reputation=0.4,
            category="communication"
        ),
        FactionPerk(
            perk_id="unified_consciousness",
            perk_name="Unified Consciousness",
            description="Player gains +20% to all reputation gains from all factions",
            bonus_type=BonusType.REPUTATION_GAIN,
            bonus_value=0.20,
            bonus_duration=0,
            unlocked_at_reputation=0.6,
            category="mysticism"
        ),
        FactionPerk(
            perk_id="prophetic_vision",
            perk_name="Prophetic Vision",
            description="View future events with 30% accuracy; avoid catastrophes",
            bonus_type=BonusType.PROPHECY_ACCURACY,
            bonus_value=0.30,
            bonus_duration=0,
            unlocked_at_reputation=0.8,
            category="mysticism"
        ),
        FactionPerk(
            perk_id="transcendent_mind",
            perk_name="Transcendent Mind",
            description="Achieve 95% prophecy accuracy; unlock hidden paths and fates",
            bonus_type=BonusType.PROPHECY_ACCURACY,
            bonus_value=0.95,
            bonus_duration=0,
            unlocked_at_reputation=0.95,
            category="mastery"
        ),
    ]
    for perk in perks:
        faction.add_perk(perk)

    # Quests
    quests = [
        FactionQuest(
            quest_id="first_prophecy",
            quest_name="Read the First Prophecy",
            description="Successfully predict a major event",
            quest_type=QuestType.SPIRITUAL,
            difficulty="easy",
            reputation_reward=0.15,
            resource_reward={"credits": 1200, "mystical_energy": 100},
            objective="Make a successful prophecy prediction",
            turns_available=20,
            hidden=False
        ),
        FactionQuest(
            quest_id="meditation_circles",
            quest_name="Establish Meditation Circles",
            description="Create meditation centers that connect minds across worlds",
            quest_type=QuestType.SPIRITUAL,
            difficulty="hard",
            reputation_reward=0.25,
            resource_reward={"credits": 6000, "mystical_energy": 400},
            objective="Build 5 meditation centers across different worlds",
            turns_available=50,
            prerequisites=["first_prophecy"],
            hidden=False
        ),
        FactionQuest(
            quest_id="awakening",
            quest_name="The Great Awakening",
            description="Achieve collective consciousness with all federation members",
            quest_type=QuestType.SPIRITUAL,
            difficulty="legendary",
            reputation_reward=0.35,
            resource_reward={"credits": 10000, "mystical_energy": 1000, "unity": 200},
            objective="Create a unified consciousness network",
            turns_available=100,
            prerequisites=["meditation_circles"],
            hidden=False
        ),
    ]
    for quest in quests:
        faction.add_quest(quest)

    return faction


def create_economic_council() -> Faction:
    """Economic Council - Merchants and traders of the federation"""
    faction = Faction(
        faction_id="economic_council",
        name="Economic Council",
        description="Merchants and economic strategists maximizing federation prosperity",
        ideology=IdeologyType.ECONOMIC,
        headquarters_location="Trade Hub Nexus, Prosperity Station",
        founding_year=2197
    )

    faction.faction_philosophy = "Trade is the lifeblood of civilization. Through commerce, we prosper and thrive together."
    faction.core_values = ["Prosperity", "Efficiency", "Trade", "Growth"]
    faction.faction_goals = [
        "Achieve 50% profit margin on all trade routes",
        "Establish trading posts on 20 worlds",
        "Make the federation the wealthiest power in the galaxy"
    ]
    faction.ally_factions = ["exploration_initiative"]
    faction.enemy_factions = []
    faction.neutral_factions = ["military_command", "research_division"]

    # Perks
    perks = [
        FactionPerk(
            perk_id="trade_profit_1",
            perk_name="Sharp Negotiator",
            description="Trade profits increased by 20%",
            bonus_type=BonusType.TRADE_PROFIT,
            bonus_value=0.20,
            bonus_duration=0,
            unlocked_at_reputation=0.2,
            category="trade"
        ),
        FactionPerk(
            perk_id="resource_production_1",
            perk_name="Economic Growth",
            description="All resource production increased by 15%",
            bonus_type=BonusType.RESOURCE_PRODUCTION,
            bonus_value=0.15,
            bonus_duration=0,
            unlocked_at_reputation=0.4,
            category="production"
        ),
        FactionPerk(
            perk_id="trade_network_expansion",
            perk_name="Trade Network Expansion",
            description="New trade routes established 25% faster",
            bonus_type=BonusType.TRADE_PROFIT,
            bonus_value=0.25,
            bonus_duration=0,
            unlocked_at_reputation=0.6,
            category="trade"
        ),
        FactionPerk(
            perk_id="economic_dominance",
            perk_name="Economic Dominance",
            description="Trade profit multiplier +35%; buy rare goods at 20% discount",
            bonus_type=BonusType.TRADE_PROFIT,
            bonus_value=0.35,
            bonus_duration=0,
            unlocked_at_reputation=0.8,
            category="trade"
        ),
        FactionPerk(
            perk_id="infinite_wealth",
            perk_name="Infinite Wealth Cascade",
            description="Resource production +40%; all costs reduced 20%; unlimited trading power",
            bonus_type=BonusType.ALL_RESOURCES,
            bonus_value=0.40,
            bonus_duration=0,
            unlocked_at_reputation=0.95,
            category="mastery"
        ),
    ]
    for perk in perks:
        faction.add_perk(perk)

    # Quests
    quests = [
        FactionQuest(
            quest_id="first_trade_route",
            quest_name="Establish First Trade Route",
            description="Create a profitable trade route between two worlds",
            quest_type=QuestType.ECONOMIC,
            difficulty="easy",
            reputation_reward=0.15,
            resource_reward={"credits": 2000},
            objective="Establish and profit from a trade route",
            turns_available=20,
            hidden=False
        ),
        FactionQuest(
            quest_id="trade_empire",
            quest_name="Trade Empire",
            description="Establish 8 trade routes connecting major economic hubs",
            quest_type=QuestType.ECONOMIC,
            difficulty="hard",
            reputation_reward=0.25,
            resource_reward={"credits": 8000},
            objective="Build a network of 8 profitable trade routes",
            turns_available=60,
            prerequisites=["first_trade_route"],
            hidden=False
        ),
        FactionQuest(
            quest_id="economic_singularity",
            quest_name="Economic Singularity",
            description="Accumulate incredible wealth and control the federation's economy",
            quest_type=QuestType.ECONOMIC,
            difficulty="legendary",
            reputation_reward=0.35,
            resource_reward={"credits": 20000},
            objective="Achieve absolute economic dominance",
            turns_available=100,
            prerequisites=["trade_empire"],
            hidden=False
        ),
    ]
    for quest in quests:
        faction.add_quest(quest)

    return faction


def create_exploration_initiative() -> Faction:
    """Exploration Initiative - Pioneers mapping the unknown"""
    faction = Faction(
        faction_id="exploration_initiative",
        name="Exploration Initiative",
        description="Bold explorers charting unknown territories and discovering new worlds",
        ideology=IdeologyType.DISCOVERY,
        headquarters_location="Frontier Base Alpha, Edge of Known Space",
        founding_year=2194
    )

    faction.faction_philosophy = "The unknown calls to us. Through exploration, we expand the frontier and discover our destiny."
    faction.core_values = ["Adventure", "Discovery", "Courage", "Expansion"]
    faction.faction_goals = [
        "Map 50 unexplored systems",
        "Unlock all hidden territories",
        "Establish outposts at the edge of known space"
    ]
    faction.ally_factions = ["military_command", "economic_council"]
    faction.enemy_factions = ["preservation_society"]
    faction.neutral_factions = ["research_division"]

    # Perks
    perks = [
        FactionPerk(
            perk_id="exploration_range_1",
            perk_name="Far Horizon",
            description="Exploration range increased by 20%",
            bonus_type=BonusType.EXPLORATION_RANGE,
            bonus_value=0.20,
            bonus_duration=0,
            unlocked_at_reputation=0.2,
            category="exploration"
        ),
        FactionPerk(
            perk_id="discovery_speed",
            perk_name="Swift Discovery",
            description="New world discovery completes 25% faster",
            bonus_type=BonusType.RESEARCH_SPEED,
            bonus_value=0.25,
            bonus_duration=0,
            unlocked_at_reputation=0.4,
            category="discovery"
        ),
        FactionPerk(
            perk_id="territory_expansion",
            perk_name="Territory Expansion",
            description="Claim territory 30% faster; +15% additional territory capacity",
            bonus_type=BonusType.EXPLORATION_RANGE,
            bonus_value=0.30,
            bonus_duration=0,
            unlocked_at_reputation=0.6,
            category="territory"
        ),
        FactionPerk(
            perk_id="frontier_mastery",
            perk_name="Frontier Mastery",
            description="Scout units 40% faster; discover rare resources 20% more frequently",
            bonus_type=BonusType.EXPLORATION_RANGE,
            bonus_value=0.40,
            bonus_duration=0,
            unlocked_at_reputation=0.8,
            category="discovery"
        ),
        FactionPerk(
            perk_id="infinite_frontier",
            perk_name="Infinite Frontier",
            description="Unlimited exploration range; always discover hidden worlds and secrets",
            bonus_type=BonusType.EXPLORATION_RANGE,
            bonus_value=1.0,
            bonus_duration=0,
            unlocked_at_reputation=0.95,
            category="mastery"
        ),
    ]
    for perk in perks:
        faction.add_perk(perk)

    # Quests
    quests = [
        FactionQuest(
            quest_id="first_discovery",
            quest_name="First Frontier Discovery",
            description="Discover a new, unexplored world",
            quest_type=QuestType.EXPLORATION,
            difficulty="easy",
            reputation_reward=0.15,
            resource_reward={"credits": 1500, "exploration_data": 100},
            objective="Discover and map a new world",
            turns_available=20,
            hidden=False
        ),
        FactionQuest(
            quest_id="mapper_of_worlds",
            quest_name="Mapper of Worlds",
            description="Discover and map 10 unique worlds",
            quest_type=QuestType.EXPLORATION,
            difficulty="hard",
            reputation_reward=0.25,
            resource_reward={"credits": 6000, "exploration_data": 500},
            objective="Successfully map 10 different worlds",
            turns_available=80,
            prerequisites=["first_discovery"],
            hidden=False
        ),
        FactionQuest(
            quest_id="infinite_frontier_quest",
            quest_name="Reach the Edge of Forever",
            description="Explore to the absolute edge of the known universe",
            quest_type=QuestType.EXPLORATION,
            difficulty="legendary",
            reputation_reward=0.35,
            resource_reward={"credits": 10000, "exploration_data": 1000, "universal_knowledge": 100},
            objective="Reach the absolute boundary of explorable space",
            turns_available=120,
            prerequisites=["mapper_of_worlds"],
            hidden=False
        ),
    ]
    for quest in quests:
        faction.add_quest(quest)

    return faction


def create_preservation_society() -> Faction:
    """Preservation Society - Guardians of stability and tradition"""
    faction = Faction(
        faction_id="preservation_society",
        name="Preservation Society",
        description="Guardians of stability, tradition, and the natural order of civilization",
        ideology=IdeologyType.STABILITY,
        headquarters_location="Archives of Legacy, Eternal Station",
        founding_year=2192
    )

    faction.faction_philosophy = "Change must be measured. Progress without stability is chaos. We preserve what matters."
    faction.core_values = ["Stability", "Tradition", "Order", "Preservation"]
    faction.faction_goals = [
        "Achieve absolute federation stability (no conflicts)",
        "Preserve all historical knowledge and artifacts",
        "Create an unchanging, eternal civilization"
    ]
    faction.ally_factions = []
    faction.enemy_factions = ["exploration_initiative"]
    faction.neutral_factions = ["cultural_ministry", "diplomatic_corps"]

    # Perks
    perks = [
        FactionPerk(
            perk_id="stability_boost_1",
            perk_name="Stable Foundation",
            description="Federation stability increased by 20%",
            bonus_type=BonusType.STABILITY,
            bonus_value=0.20,
            bonus_duration=0,
            unlocked_at_reputation=0.2,
            category="stability"
        ),
        FactionPerk(
            perk_id="tradition_blessing",
            perk_name="Tradition's Blessing",
            description="Resource production stable and reliable; -10% resource variance",
            bonus_type=BonusType.RESOURCE_PRODUCTION,
            bonus_value=0.10,
            bonus_duration=0,
            unlocked_at_reputation=0.4,
            category="production"
        ),
        FactionPerk(
            perk_id="order_enforcement",
            perk_name="Order Enforcement",
            description="Prevent negative events; reduce disaster chance by 25%",
            bonus_type=BonusType.STABILITY,
            bonus_value=0.25,
            bonus_duration=0,
            unlocked_at_reputation=0.6,
            category="stability"
        ),
        FactionPerk(
            perk_id="eternal_cycle",
            perk_name="Eternal Cycle",
            description="All systems operate in perfect harmony; +30% stability, no chaos events",
            bonus_type=BonusType.STABILITY,
            bonus_value=0.30,
            bonus_duration=0,
            unlocked_at_reputation=0.8,
            category="stability"
        ),
        FactionPerk(
            perk_id="immutable_order",
            perk_name="Immutable Order",
            description="Perfect stability achieved; complete immunity to disruption; eternal prosperity",
            bonus_type=BonusType.STABILITY,
            bonus_value=1.0,
            bonus_duration=0,
            unlocked_at_reputation=0.95,
            category="mastery"
        ),
    ]
    for perk in perks:
        faction.add_perk(perk)

    # Quests
    quests = [
        FactionQuest(
            quest_id="first_preservation",
            quest_name="Preserve Ancient Artifacts",
            description="Recover and preserve artifacts from at least 3 worlds",
            quest_type=QuestType.CULTURAL,
            difficulty="easy",
            reputation_reward=0.15,
            resource_reward={"credits": 1200, "historical_artifacts": 100},
            objective="Gather and preserve ancient artifacts",
            turns_available=25,
            hidden=False
        ),
        FactionQuest(
            quest_id="achieve_perfect_stability",
            quest_name="Perfect Stability",
            description="Maintain zero conflicts and perfect order for 30 consecutive turns",
            quest_type=QuestType.CULTURAL,
            difficulty="hard",
            reputation_reward=0.25,
            resource_reward={"credits": 5000, "historical_artifacts": 300},
            objective="Maintain perfect peace and stability for a full month",
            turns_available=40,
            prerequisites=["first_preservation"],
            hidden=False
        ),
        FactionQuest(
            quest_id="eternal_preservation",
            quest_name="Eternal Preservation",
            description="Create an immortal civilization where nothing changes and all is preserved",
            quest_type=QuestType.CULTURAL,
            difficulty="legendary",
            reputation_reward=0.35,
            resource_reward={"credits": 10000, "historical_artifacts": 700, "unity": 100},
            objective="Achieve complete and eternal civilization preservation",
            turns_available=120,
            prerequisites=["achieve_perfect_stability"],
            hidden=False
        ),
    ]
    for quest in quests:
        faction.add_quest(quest)

    return faction


def build_faction_system() -> FactionSystem:
    """Factory function to build the complete faction system"""
    system = FactionSystem()

    # Create and register all 8 factions
    factions = [
        create_diplomatic_corps(),
        create_military_command(),
        create_cultural_ministry(),
        create_research_division(),
        create_consciousness_collective(),
        create_economic_council(),
        create_exploration_initiative(),
        create_preservation_society(),
    ]

    for faction in factions:
        system.register_faction(faction)

    return system


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def get_faction_report(system: FactionSystem, faction_id: str) -> str:
    """Generate a detailed report of faction status"""
    if faction_id not in system.factions:
        return "Faction not found"

    faction = system.factions[faction_id]

    report = f"""
    ============================================================
    FACTION REPORT: {faction.name.upper()}
    ============================================================

    Faction ID:         {faction.faction_id}
    Ideology:           {faction.ideology.value.upper()}
    Headquarters:       {faction.headquarters_location}
    Founded:            {faction.founding_year}

    Philosophy:
    {faction.faction_philosophy}

    Core Values:        {', '.join(faction.core_values)}

    Members:            {faction.member_count}
    Faction Level:      {faction.faction_level}
    Accumulated Power:  {faction.accumulated_power:.2f}

    Affiliations:
    - Allies:           {', '.join(faction.ally_factions) if faction.ally_factions else 'None'}
    - Enemies:          {', '.join(faction.enemy_factions) if faction.enemy_factions else 'None'}
    - Neutral:          {', '.join(faction.neutral_factions) if faction.neutral_factions else 'None'}

    Faction Goals:
    {chr(10).join(f"  - {goal}" for goal in faction.faction_goals)}

    Available Perks:    {len(faction.available_perks)}
    Available Quests:   {len(faction.available_quests)}

    Reputation Thresholds:
    {chr(10).join(f"    {perk.unlocked_at_reputation:.1%} -> {perk.perk_name}" for perk in sorted(faction.available_perks, key=lambda p: p.unlocked_at_reputation))}
    """

    return report


def export_faction_data(system: FactionSystem) -> Dict:
    """Export all faction data as JSON-serializable dict"""
    data = {
        "current_turn": system.current_turn,
        "factions": {},
        "player_factions": system.player_factions,
    }

    for faction_id, faction in system.factions.items():
        data["factions"][faction_id] = {
            "name": faction.name,
            "ideology": faction.ideology.value,
            "members": faction.member_count,
            "level": faction.faction_level,
            "power": faction.accumulated_power,
            "perks": len(faction.available_perks),
            "quests": len(faction.available_quests),
        }

    return data


# ============================================================================
# TESTING / DEMO
# ============================================================================

if __name__ == "__main__":
    print("="*80)
    print("THE FEDERATION GAME - Faction System Demo")
    print("="*80)

    # Build system
    system = build_faction_system()

    # Display all factions
    print("\n[FACTION OVERVIEW]")
    for faction_id, faction in system.factions.items():
        print(f"{faction.name:30} | Ideology: {faction.ideology.value:12} | Level: {faction.faction_level}")

    # Simulate player joining faction
    print("\n[PLAYER JOINS FACTION]")
    system.join_faction("player_001", "diplomatic_corps")
    print("Player joined Diplomatic Corps at 0.2 reputation")

    # Check initial perks
    diplomatic_corps = system.factions["diplomatic_corps"]
    print(f"Available perks at join: {[p.perk_name for p in diplomatic_corps.get_active_perks('player_001')]}")

    # Reputation gain
    print("\n[REPUTATION GAIN]")
    new_rep = system.change_reputation("player_001", "diplomatic_corps", 0.15)
    print(f"After +0.15 rep: {new_rep:.2%}")

    # Check unlocked perks
    unlocked_perks = diplomatic_corps.get_active_perks("player_001")
    print(f"Unlocked perks: {[p.perk_name for p in unlocked_perks]}")

    # Show reputation-based unlocks
    print("\n[PERKS AT EACH REPUTATION THRESHOLD]")
    for perk in sorted(diplomatic_corps.available_perks, key=lambda p: p.unlocked_at_reputation):
        print(f"  {perk.unlocked_at_reputation:.0%} - {perk.perk_name}: {perk.description}")

    # Complete a quest
    print("\n[QUEST COMPLETION]")
    available_quests = diplomatic_corps.get_available_quests("player_001")
    if available_quests:
        quest = available_quests[0]
        success, rewards = system.complete_quest("player_001", "diplomatic_corps", quest.quest_id)
        if success:
            print(f"Completed: {rewards['quest_name']}")
            print(f"Rewards: +{rewards['reputation_gained']:.0%} reputation, {rewards['resources_gained']}")

    # Display faction report
    print(get_faction_report(system, "diplomatic_corps"))

    # Export data
    print("\n[FACTION DATA EXPORT]")
    exported = export_faction_data(system)
    print(json.dumps(exported, indent=2))
