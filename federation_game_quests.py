#!/usr/bin/env python3
"""
THE FEDERATION GAME - QUEST/CAMPAIGN SYSTEM
~700 LOC

Complete quest and campaign system for THE FEDERATION GAME. Provides quest mechanics,
objective tracking, reward distribution, and interconnected quest chains that unlock
as players progress through the game.

Key Features:
- Quest registration and dynamic quest discovery
- Multi-objective quest tracking with progress reporting
- Reward system (resources, reputation, unlocks)
- Quest chains with dependencies
- Difficulty scaling
- Faction-specific optional quests
- Completion achievements and statistics

Integrates directly with FederationGameState and FederationConsole.
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set, Tuple
from enum import Enum
import json
import uuid
from abc import ABC, abstractmethod


class QuestDifficulty(Enum):
    """Quest difficulty levels"""
    TUTORIAL = 1
    EASY = 2
    NORMAL = 3
    HARD = 4
    LEGENDARY = 5


class ObjectiveType(Enum):
    """Types of quest objectives"""
    DIPLOMATIC = "diplomatic"          # Diplomatic actions (treaties, agreements)
    MILITARY = "military"              # Military actions (battles, defense)
    RESEARCH = "research"              # Research milestones
    CULTURAL = "cultural"              # Cultural projects and influence
    ECONOMIC = "economic"              # Resource gathering and trading
    CONSCIOUSNESS = "consciousness"    # Consciousness expansion
    PROPHECY = "prophecy"              # Prophecy triggers
    EXPLORATION = "exploration"        # Discovery and first contact
    ALLIANCE = "alliance"              # Alliance formation
    SURVIVAL = "survival"              # Survival conditions
    TECHNOLOGICAL = "technological"    # Tech advancement


class QuestStatus(Enum):
    """Quest lifecycle states"""
    AVAILABLE = "available"            # Can be accepted
    ACCEPTED = "accepted"              # In progress
    IN_PROGRESS = "in_progress"        # Actively being worked on
    COMPLETED = "completed"            # Successfully completed
    FAILED = "failed"                  # Quest failed (timeout or abandoned)
    ABANDONED = "abandoned"            # Player abandoned quest
    LOCKED = "locked"                  # Prerequisites not met


class FactionAffiliation(Enum):
    """Optional faction connections for quests"""
    NONE = "none"
    DIPLOMATIC_CORPS = "diplomatic_corps"
    MILITARY_COMMAND = "military_command"
    RESEARCH_DIVISION = "research_division"
    CULTURAL_MINISTRY = "cultural_ministry"
    CONSCIOUSNESS_COLLECTIVE = "consciousness_collective"
    PROPHECY_KEEPERS = "prophecy_keepers"


@dataclass
class QuestReward:
    """Reward structure for quest completion"""
    resources: int = 0                 # Treasury resources
    reputation: float = 0.0            # Reputation modifier (-1.0 to 1.0)
    morale_boost: float = 0.0          # Morale change (-1.0 to 1.0)
    stability_boost: float = 0.0       # Stability change (-1.0 to 1.0)
    tech_points: int = 0               # Technology research points
    unlocked_quests: List[str] = field(default_factory=list)  # Quest IDs unlocked
    unlocked_features: List[str] = field(default_factory=list)  # New game features
    special_rewards: Dict[str, Any] = field(default_factory=dict)  # Custom rewards

    def to_dict(self) -> Dict[str, Any]:
        """Convert reward to dictionary"""
        return asdict(self)


@dataclass
class QuestObjective:
    """Individual objective within a quest"""
    objective_id: str
    description: str
    objective_type: ObjectiveType
    target: int                        # Goal number (e.g., 3 for "meet 3 civilizations")
    current_progress: int = 0
    completed: bool = False
    optional: bool = False             # Optional objectives (bonus rewards)

    def get_progress_percentage(self) -> float:
        """Calculate progress percentage"""
        if self.target <= 0:
            return 0.0
        return min(100.0, (self.current_progress / self.target) * 100)

    def is_complete(self) -> bool:
        """Check if objective is complete"""
        return self.current_progress >= self.target

    def advance_progress(self, amount: int = 1) -> bool:
        """Advance objective progress. Returns True if newly completed"""
        was_complete = self.is_complete()
        self.current_progress = min(self.current_progress + amount, self.target)
        if not was_complete and self.is_complete():
            self.completed = True
            return True
        return False

    def to_dict(self) -> Dict[str, Any]:
        """Convert objective to dictionary"""
        data = asdict(self)
        data['objective_type'] = self.objective_type.value
        return data


@dataclass
class Quest:
    """Complete quest definition"""
    quest_id: str
    title: str
    description: str
    objectives: List[QuestObjective] = field(default_factory=list)
    rewards: QuestReward = field(default_factory=QuestReward)
    difficulty: QuestDifficulty = QuestDifficulty.NORMAL
    faction_affiliation: FactionAffiliation = FactionAffiliation.NONE
    status: QuestStatus = QuestStatus.AVAILABLE

    # Quest properties
    prerequisites: List[str] = field(default_factory=list)  # Quest IDs that must be completed first
    time_limit: Optional[int] = None   # Turns remaining (None = unlimited)
    repeatable: bool = False           # Can this quest be done multiple times?
    turns_accepted: Optional[int] = None  # Turn when quest was accepted
    turns_completed: Optional[int] = None  # Turn when quest was completed

    # Tracking
    acceptance_count: int = 0          # How many times accepted
    completion_count: int = 0          # How many times completed
    failure_count: int = 0             # How many times failed

    # Metadata
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

    def get_progress_percentage(self) -> float:
        """Calculate overall quest progress"""
        if not self.objectives:
            return 0.0
        total_progress = sum(obj.get_progress_percentage() for obj in self.objectives)
        return total_progress / len(self.objectives)

    def get_completed_objectives(self) -> List[QuestObjective]:
        """Get all completed objectives"""
        return [obj for obj in self.objectives if obj.is_complete()]

    def are_all_objectives_complete(self) -> bool:
        """Check if all mandatory objectives are complete"""
        mandatory_objectives = [obj for obj in self.objectives if not obj.optional]
        return all(obj.is_complete() for obj in mandatory_objectives)

    def get_optional_bonus_multiplier(self) -> float:
        """Get reward multiplier for optional objectives completed"""
        if not self.objectives:
            return 1.0
        optional_objectives = [obj for obj in self.objectives if obj.optional]
        if not optional_objectives:
            return 1.0
        completed_optional = sum(1 for obj in optional_objectives if obj.is_complete())
        return 1.0 + (completed_optional * 0.25)

    def to_dict(self) -> Dict[str, Any]:
        """Convert quest to dictionary"""
        data = {
            'quest_id': self.quest_id,
            'title': self.title,
            'description': self.description,
            'objectives': [obj.to_dict() for obj in self.objectives],
            'rewards': self.rewards.to_dict(),
            'difficulty': self.difficulty.name,
            'faction_affiliation': self.faction_affiliation.value,
            'status': self.status.value,
            'prerequisites': self.prerequisites,
            'time_limit': self.time_limit,
            'repeatable': self.repeatable,
            'turns_accepted': self.turns_accepted,
            'turns_completed': self.turns_completed,
            'acceptance_count': self.acceptance_count,
            'completion_count': self.completion_count,
            'failure_count': self.failure_count,
            'progress_percentage': self.get_progress_percentage(),
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
        return data


class QuestSystem:
    """
    Central quest management system. Handles all quest lifecycle operations,
    objective tracking, reward distribution, and quest chain unlocking.
    """

    def __init__(self):
        """Initialize quest system"""
        self.quests: Dict[str, Quest] = {}          # All registered quests
        self.active_quests: Dict[str, Quest] = {}   # Currently accepted quests by player_id
        self.completed_quests: Dict[str, Quest] = {}  # Completed quests by player_id
        self.failed_quests: List[Quest] = []        # Failed quests
        self.quest_history: List[Dict[str, Any]] = []  # Complete quest history
        self.player_stats: Dict[str, Dict[str, int]] = {}  # Per-player statistics

    def register_quest(self, quest: Quest) -> None:
        """
        Register a new quest in the system

        Args:
            quest: Quest object to register

        Raises:
            ValueError: If quest with same ID already exists
        """
        if quest.quest_id in self.quests:
            raise ValueError(f"Quest '{quest.quest_id}' already registered")

        self.quests[quest.quest_id] = quest
        quest.status = QuestStatus.AVAILABLE

    def get_available_quests(self, player_id: str = "default",
                           faction_filter: Optional[FactionAffiliation] = None) -> List[Quest]:
        """
        Get list of available quests that player can accept

        Args:
            player_id: Player identifier
            faction_filter: Optional filter by faction affiliation

        Returns:
            List of available quests with prerequisites met
        """
        available = []
        completed_ids = set(self._get_completed_quest_ids(player_id))

        for quest in self.quests.values():
            # Check status
            if quest.status not in [QuestStatus.AVAILABLE, QuestStatus.LOCKED]:
                continue

            # Check if already active
            if quest.quest_id in self.active_quests:
                continue

            # Check prerequisites
            if not all(prereq in completed_ids for prereq in quest.prerequisites):
                quest.status = QuestStatus.LOCKED
                continue

            # Check faction filter
            if faction_filter and quest.faction_affiliation != faction_filter:
                continue

            quest.status = QuestStatus.AVAILABLE
            available.append(quest)

        return sorted(available, key=lambda q: q.difficulty.value)

    def accept_quest(self, player_id: str, quest_id: str, current_turn: int = 0) -> Tuple[bool, str]:
        """
        Accept a quest for a player

        Args:
            player_id: Player identifier
            quest_id: Quest to accept
            current_turn: Current game turn

        Returns:
            Tuple of (success, message)
        """
        if quest_id not in self.quests:
            return False, f"Quest '{quest_id}' not found"

        quest = self.quests[quest_id]

        # Check if available
        if quest.status not in [QuestStatus.AVAILABLE, QuestStatus.LOCKED]:
            return False, f"Quest '{quest.title}' is not available"

        # Check if already active
        if quest_id in self.active_quests:
            return False, f"Quest '{quest.title}' is already active"

        # Update quest state
        quest.status = QuestStatus.ACCEPTED
        quest.turns_accepted = current_turn
        quest.acceptance_count += 1
        quest.updated_at = datetime.now()

        # Add to active quests
        self.active_quests[quest_id] = quest

        # Initialize player stats if needed
        if player_id not in self.player_stats:
            self.player_stats[player_id] = {
                'quests_accepted': 0,
                'quests_completed': 0,
                'quests_failed': 0,
                'total_resources_earned': 0,
                'total_tech_points_earned': 0
            }

        self.player_stats[player_id]['quests_accepted'] += 1

        return True, f"Accepted quest: {quest.title}"

    def progress_objective(self, player_id: str, quest_id: str, objective_id: str,
                          amount: int = 1) -> Tuple[bool, str]:
        """
        Advance progress on a specific quest objective

        Args:
            player_id: Player identifier
            quest_id: Quest containing objective
            objective_id: Objective to progress
            amount: Amount to advance (default 1)

        Returns:
            Tuple of (success, message)
        """
        if quest_id not in self.quests:
            return False, f"Quest '{quest_id}' not found"

        quest = self.quests[quest_id]

        if quest.status != QuestStatus.ACCEPTED:
            return False, f"Quest '{quest.title}' is not in progress"

        # Find objective
        objective = next((obj for obj in quest.objectives if obj.objective_id == objective_id), None)
        if not objective:
            return False, f"Objective '{objective_id}' not found in quest"

        # Record if newly completing
        was_newly_completed = objective.advance_progress(amount)

        message = f"Advanced '{objective.description}': {objective.current_progress}/{objective.target}"

        if was_newly_completed:
            message += f" - OBJECTIVE COMPLETED!"

        # Check if quest is now complete
        if quest.are_all_objectives_complete():
            message += " - ALL OBJECTIVES COMPLETE! Quest can be turned in."

        quest.updated_at = datetime.now()
        return True, message

    def complete_quest(self, player_id: str, quest_id: str, current_turn: int = 0) -> Tuple[bool, str, Optional[QuestReward]]:
        """
        Complete a quest and distribute rewards

        Args:
            player_id: Player identifier
            quest_id: Quest to complete
            current_turn: Current game turn

        Returns:
            Tuple of (success, message, rewards or None)
        """
        if quest_id not in self.quests:
            return False, f"Quest '{quest_id}' not found", None

        quest = self.quests[quest_id]

        if quest.status != QuestStatus.ACCEPTED:
            return False, f"Quest '{quest.title}' is not in progress", None

        # Check if all objectives complete
        if not quest.are_all_objectives_complete():
            incomplete = [obj.description for obj in quest.objectives
                         if not obj.optional and not obj.is_complete()]
            return False, f"Cannot complete quest. Incomplete objectives: {', '.join(incomplete)}", None

        # Mark as complete
        quest.status = QuestStatus.COMPLETED
        quest.turns_completed = current_turn
        quest.completion_count += 1
        quest.updated_at = datetime.now()

        # Remove from active and add to completed
        if quest_id in self.active_quests:
            del self.active_quests[quest_id]

        if player_id not in self.completed_quests:
            self.completed_quests[player_id] = []
        self.completed_quests[player_id].append(quest)

        # Calculate final rewards with optional objective bonus
        final_rewards = self._calculate_final_rewards(quest)

        # Update player stats
        self.player_stats[player_id]['quests_completed'] += 1
        self.player_stats[player_id]['total_resources_earned'] += final_rewards.resources
        self.player_stats[player_id]['total_tech_points_earned'] += final_rewards.tech_points

        # Log to history
        self.quest_history.append({
            'player_id': player_id,
            'quest_id': quest_id,
            'quest_title': quest.title,
            'status': 'completed',
            'completed_at': datetime.now().isoformat(),
            'turns_taken': current_turn - quest.turns_accepted if quest.turns_accepted else 0,
            'rewards': final_rewards.to_dict()
        })

        return True, f"Quest completed: {quest.title}!", final_rewards

    def abandon_quest(self, player_id: str, quest_id: str, current_turn: int = 0) -> Tuple[bool, str]:
        """
        Abandon an active quest

        Args:
            player_id: Player identifier
            quest_id: Quest to abandon
            current_turn: Current game turn

        Returns:
            Tuple of (success, message)
        """
        if quest_id not in self.quests:
            return False, f"Quest '{quest_id}' not found"

        quest = self.quests[quest_id]

        if quest.status != QuestStatus.ACCEPTED:
            return False, f"Quest '{quest.title}' is not in progress"

        # Mark as abandoned
        quest.status = QuestStatus.ABANDONED
        quest.failure_count += 1
        quest.updated_at = datetime.now()

        # Remove from active quests
        if quest_id in self.active_quests:
            del self.active_quests[quest_id]

        # Update stats
        if player_id in self.player_stats:
            self.player_stats[player_id]['quests_failed'] += 1

        # Log to history
        self.quest_history.append({
            'player_id': player_id,
            'quest_id': quest_id,
            'quest_title': quest.title,
            'status': 'abandoned',
            'abandoned_at': datetime.now().isoformat(),
            'turns_active': current_turn - quest.turns_accepted if quest.turns_accepted else 0
        })

        return True, f"Abandoned quest: {quest.title}"

    def get_active_quests(self, player_id: str = "default") -> List[Quest]:
        """
        Get all active quests for a player

        Args:
            player_id: Player identifier

        Returns:
            List of active quests
        """
        return list(self.active_quests.values())

    def get_completed_quests(self, player_id: str = "default") -> List[Quest]:
        """
        Get all completed quests for a player

        Args:
            player_id: Player identifier

        Returns:
            List of completed quests
        """
        return self.completed_quests.get(player_id, [])

    def progress_objective_by_type(self, player_id: str, objective_type: ObjectiveType,
                                   amount: int = 1) -> List[str]:
        """
        Progress all objectives of a given type in active quests

        Args:
            player_id: Player identifier
            objective_type: Type of objectives to advance
            amount: Amount to advance

        Returns:
            List of progress messages
        """
        messages = []
        for quest in self.active_quests.values():
            for objective in quest.objectives:
                if objective.objective_type == objective_type:
                    success, msg = self.progress_objective(player_id, quest.quest_id,
                                                          objective.objective_id, amount)
                    if success:
                        messages.append(msg)
        return messages

    def get_quest_sync_report(self, player_id: str = "default") -> Dict[str, Any]:
        """
        Generate comprehensive quest status report

        Args:
            player_id: Player identifier

        Returns:
            Complete quest system state
        """
        active_quests = self.get_active_quests(player_id)
        completed_quests = self.get_completed_quests(player_id)
        available_quests = self.get_available_quests(player_id)

        return {
            'active_quests': {
                'count': len(active_quests),
                'quests': [q.to_dict() for q in active_quests]
            },
            'available_quests': {
                'count': len(available_quests),
                'quests': [q.to_dict() for q in available_quests]
            },
            'completed_quests': {
                'count': len(completed_quests),
                'quests': [q.to_dict() for q in completed_quests]
            },
            'player_statistics': self.player_stats.get(player_id, {}),
            'recent_history': self.quest_history[-10:]  # Last 10 quest events
        }

    def _get_completed_quest_ids(self, player_id: str) -> List[str]:
        """Get set of completed quest IDs for a player"""
        return [q.quest_id for q in self.completed_quests.get(player_id, [])]

    def _calculate_final_rewards(self, quest: Quest) -> QuestReward:
        """Calculate final rewards with optional objective bonuses"""
        multiplier = quest.get_optional_bonus_multiplier()

        final_reward = QuestReward(
            resources=int(quest.rewards.resources * multiplier),
            reputation=quest.rewards.reputation,
            morale_boost=quest.rewards.morale_boost,
            stability_boost=quest.rewards.stability_boost,
            tech_points=int(quest.rewards.tech_points * multiplier),
            unlocked_quests=quest.rewards.unlocked_quests.copy(),
            unlocked_features=quest.rewards.unlocked_features.copy(),
            special_rewards=quest.rewards.special_rewards.copy()
        )

        return final_reward


# ============================================================================
# PRE-BUILT QUEST LIBRARY (20+ Quests)
# ============================================================================

def create_quest_library() -> QuestSystem:
    """
    Create and populate quest system with 20+ pre-built quests

    Returns:
        Initialized QuestSystem with all quests registered
    """
    system = QuestSystem()

    # TIER 1: TUTORIAL/EARLY GAME QUESTS

    # Quest 1: First Contact Protocol
    q1 = Quest(
        quest_id="first_contact_protocol",
        title="First Contact Protocol",
        description="Establish diplomatic relations with 3 new civilizations. Learn the basics of federation diplomacy.",
        difficulty=QuestDifficulty.TUTORIAL,
        faction_affiliation=FactionAffiliation.DIPLOMATIC_CORPS,
        objectives=[
            QuestObjective("contact_1", "Initiate contact with first civilization", ObjectiveType.EXPLORATION, 1),
            QuestObjective("contact_2", "Initiate contact with second civilization", ObjectiveType.EXPLORATION, 1),
            QuestObjective("contact_3", "Initiate contact with third civilization", ObjectiveType.EXPLORATION, 1),
        ],
        rewards=QuestReward(
            resources=100,
            reputation=0.1,
            morale_boost=0.05,
            unlocked_quests=["treaty_negotiation"]
        )
    )
    system.register_quest(q1)

    # Quest 2: Treaty Negotiation
    q2 = Quest(
        quest_id="treaty_negotiation",
        title="Treaty Negotiation",
        description="Complete diplomatic agreements with 5 factions. Master the art of peaceful coexistence.",
        difficulty=QuestDifficulty.EASY,
        prerequisites=["first_contact_protocol"],
        faction_affiliation=FactionAffiliation.DIPLOMATIC_CORPS,
        objectives=[
            QuestObjective("treaty_1", "Sign first diplomatic treaty", ObjectiveType.DIPLOMATIC, 5),
        ],
        rewards=QuestReward(
            resources=200,
            reputation=0.3,
            morale_boost=0.1,
            unlocked_quests=["alliance_of_equals"]
        )
    )
    system.register_quest(q2)

    # Quest 3: Defense Stronghold
    q3 = Quest(
        quest_id="defense_stronghold",
        title="Defense Stronghold",
        description="Maintain morale above 60% for 10 consecutive turns while under pressure.",
        difficulty=QuestDifficulty.NORMAL,
        faction_affiliation=FactionAffiliation.MILITARY_COMMAND,
        objectives=[
            QuestObjective("hold_morale", "Maintain morale >60% for consecutive turns", ObjectiveType.SURVIVAL, 10),
        ],
        rewards=QuestReward(
            resources=150,
            morale_boost=0.15,
            stability_boost=0.1,
            unlocked_quests=["fortress_unbreakable"]
        )
    )
    system.register_quest(q3)

    # Quest 4: Cultural Renaissance
    q4 = Quest(
        quest_id="cultural_renaissance",
        title="Cultural Renaissance",
        description="Fund and complete 3 cultural projects. Elevate federation identity.",
        difficulty=QuestDifficulty.EASY,
        faction_affiliation=FactionAffiliation.CULTURAL_MINISTRY,
        objectives=[
            QuestObjective("culture_1", "Complete first cultural project", ObjectiveType.CULTURAL, 1),
            QuestObjective("culture_2", "Complete second cultural project", ObjectiveType.CULTURAL, 1),
            QuestObjective("culture_3", "Complete third cultural project", ObjectiveType.CULTURAL, 1),
        ],
        rewards=QuestReward(
            resources=250,
            reputation=0.2,
            morale_boost=0.2,
            unlocked_quests=["artistic_enlightenment"]
        )
    )
    system.register_quest(q4)

    # Quest 5: Prophecy Fulfillment
    q5 = Quest(
        quest_id="prophecy_fulfillment",
        title="Prophecy Fulfillment",
        description="Trigger and resolve 5 prophecies. Unlock hidden potentials.",
        difficulty=QuestDifficulty.NORMAL,
        faction_affiliation=FactionAffiliation.PROPHECY_KEEPERS,
        objectives=[
            QuestObjective("prophecy_trigger", "Trigger prophecies", ObjectiveType.PROPHECY, 5),
        ],
        rewards=QuestReward(
            resources=300,
            reputation=0.25,
            unlocked_quests=["fate_weavers"]
        )
    )
    system.register_quest(q5)

    # TIER 2: MID-GAME QUESTS

    # Quest 6: Rival Elimination
    q6 = Quest(
        quest_id="rival_elimination",
        title="Rival Elimination",
        description="Reduce rival threat level below 20%. Secure federation survival.",
        difficulty=QuestDifficulty.HARD,
        faction_affiliation=FactionAffiliation.MILITARY_COMMAND,
        objectives=[
            QuestObjective("threat_reduction", "Reduce rival threat level", ObjectiveType.MILITARY, 75),
        ],
        rewards=QuestReward(
            resources=500,
            morale_boost=0.2,
            stability_boost=0.15,
            unlocked_quests=["dominion_assured", "fortress_unbreakable"]
        )
    )
    system.register_quest(q6)

    # Quest 7: Resource Abundance
    q7 = Quest(
        quest_id="resource_abundance",
        title="Resource Abundance",
        description="Accumulate 1000 resource units. Build economic strength.",
        difficulty=QuestDifficulty.NORMAL,
        faction_affiliation=FactionAffiliation.NONE,
        objectives=[
            QuestObjective("resource_gathering", "Accumulate resources", ObjectiveType.ECONOMIC, 1000),
        ],
        rewards=QuestReward(
            resources=200,
            tech_points=50,
            unlocked_quests=["infinite_wealth"]
        )
    )
    system.register_quest(q7)

    # Quest 8: Consciousness Evolution
    q8 = Quest(
        quest_id="consciousness_evolution",
        title="Consciousness Evolution",
        description="Raise all consciousness traits above 0.8. Achieve enlightenment.",
        difficulty=QuestDifficulty.HARD,
        faction_affiliation=FactionAffiliation.CONSCIOUSNESS_COLLECTIVE,
        objectives=[
            QuestObjective("consciousness_1", "Raise morale consciousness", ObjectiveType.CONSCIOUSNESS, 80),
            QuestObjective("consciousness_2", "Raise identity consciousness", ObjectiveType.CONSCIOUSNESS, 80),
            QuestObjective("consciousness_3", "Raise stability consciousness", ObjectiveType.CONSCIOUSNESS, 80),
        ],
        rewards=QuestReward(
            resources=400,
            morale_boost=0.25,
            stability_boost=0.25,
            unlocked_quests=["transcendence"]
        )
    )
    system.register_quest(q8)

    # Quest 9: Technological Ascendancy
    q9 = Quest(
        quest_id="technological_ascendancy",
        title="Technological Ascendancy",
        description="Advance technology level to 0.75. Master the cosmos.",
        difficulty=QuestDifficulty.HARD,
        faction_affiliation=FactionAffiliation.RESEARCH_DIVISION,
        objectives=[
            QuestObjective("tech_research", "Conduct advanced research", ObjectiveType.TECHNOLOGICAL, 75),
            QuestObjective("tech_integration", "Integrate breakthrough technologies", ObjectiveType.TECHNOLOGICAL, 25),
        ],
        rewards=QuestReward(
            resources=350,
            tech_points=100,
            unlocked_quests=["god_mode"]
        )
    )
    system.register_quest(q9)

    # Quest 10: Alliance of Equals
    q10 = Quest(
        quest_id="alliance_of_equals",
        title="Alliance of Equals",
        description="Form alliances with 4 major factions. Build a coalition.",
        difficulty=QuestDifficulty.NORMAL,
        prerequisites=["treaty_negotiation"],
        faction_affiliation=FactionAffiliation.DIPLOMATIC_CORPS,
        objectives=[
            QuestObjective("alliance_forms", "Form strategic alliances", ObjectiveType.ALLIANCE, 4),
        ],
        rewards=QuestReward(
            resources=300,
            reputation=0.4,
            morale_boost=0.15,
            unlocked_quests=["united_federation"]
        )
    )
    system.register_quest(q10)

    # TIER 3: LATE-GAME QUESTS

    # Quest 11: Diplomatic Mastery
    q11 = Quest(
        quest_id="diplomatic_mastery",
        title="Diplomatic Mastery",
        description="Achieve +0.7 reputation with 3 major factions. Become a diplomatic legend.",
        difficulty=QuestDifficulty.HARD,
        prerequisites=["alliance_of_equals"],
        faction_affiliation=FactionAffiliation.DIPLOMATIC_CORPS,
        objectives=[
            QuestObjective("rep_1", "Build reputation with faction 1", ObjectiveType.DIPLOMATIC, 7),
            QuestObjective("rep_2", "Build reputation with faction 2", ObjectiveType.DIPLOMATIC, 7),
            QuestObjective("rep_3", "Build reputation with faction 3", ObjectiveType.DIPLOMATIC, 7),
        ],
        rewards=QuestReward(
            resources=600,
            reputation=0.5,
            unlocked_quests=["grand_coalition"]
        )
    )
    system.register_quest(q11)

    # Quest 12: Fortress Unbreakable
    q12 = Quest(
        quest_id="fortress_unbreakable",
        title="Fortress Unbreakable",
        description="Defend the federation through 20 turns of attacks without defeat.",
        difficulty=QuestDifficulty.LEGENDARY,
        prerequisites=["defense_stronghold"],
        faction_affiliation=FactionAffiliation.MILITARY_COMMAND,
        objectives=[
            QuestObjective("defend", "Survive 20 turns of conflict", ObjectiveType.SURVIVAL, 20),
            QuestObjective("zero_losses", "Achieve zero military defeats", ObjectiveType.MILITARY, 20),
        ],
        rewards=QuestReward(
            resources=800,
            stability_boost=0.3,
            morale_boost=0.2,
            unlocked_quests=["invincible_armada"]
        )
    )
    system.register_quest(q12)

    # Quest 13: Artistic Enlightenment
    q13 = Quest(
        quest_id="artistic_enlightenment",
        title="Artistic Enlightenment",
        description="Complete 8 cultural projects and achieve maximum cultural influence.",
        difficulty=QuestDifficulty.HARD,
        prerequisites=["cultural_renaissance"],
        faction_affiliation=FactionAffiliation.CULTURAL_MINISTRY,
        objectives=[
            QuestObjective("art_projects", "Complete cultural projects", ObjectiveType.CULTURAL, 8),
            QuestObjective("cultural_influence", "Maximize cultural reach", ObjectiveType.CULTURAL, 100),
        ],
        rewards=QuestReward(
            resources=550,
            morale_boost=0.25,
            unlocked_quests=["universal_culture"]
        )
    )
    system.register_quest(q13)

    # Quest 14: Fate Weavers
    q14 = Quest(
        quest_id="fate_weavers",
        title="Fate Weavers",
        description="Trigger and master 15 prophecies. Control destiny itself.",
        difficulty=QuestDifficulty.HARD,
        prerequisites=["prophecy_fulfillment"],
        faction_affiliation=FactionAffiliation.PROPHECY_KEEPERS,
        objectives=[
            QuestObjective("prophecy_master", "Master prophecy system", ObjectiveType.PROPHECY, 15),
            QuestObjective("prophecy_prediction", "Predict future prophecies", ObjectiveType.PROPHECY, 5),
        ],
        rewards=QuestReward(
            resources=500,
            reputation=0.35,
            unlocked_quests=["oracle_supreme"]
        )
    )
    system.register_quest(q14)

    # Quest 15: Dominion Assured
    q15 = Quest(
        quest_id="dominion_assured",
        title="Dominion Assured",
        description="Achieve military supremacy - defeat all rivals permanently.",
        difficulty=QuestDifficulty.LEGENDARY,
        prerequisites=["rival_elimination"],
        faction_affiliation=FactionAffiliation.MILITARY_COMMAND,
        objectives=[
            QuestObjective("supremacy", "Achieve military supremacy", ObjectiveType.MILITARY, 100),
            QuestObjective("rivals_defeated", "Defeat all rival threats", ObjectiveType.MILITARY, 10),
        ],
        rewards=QuestReward(
            resources=1000,
            morale_boost=0.3,
            stability_boost=0.3,
            unlocked_quests=["eternal_conquest"]
        )
    )
    system.register_quest(q15)

    # Quest 16: Infinite Wealth
    q16 = Quest(
        quest_id="infinite_wealth",
        title="Infinite Wealth",
        description="Achieve 5000 total resource accumulation and economic dominance.",
        difficulty=QuestDifficulty.HARD,
        prerequisites=["resource_abundance"],
        objectives=[
            QuestObjective("wealth_accumulation", "Accumulate vast wealth", ObjectiveType.ECONOMIC, 5000),
            QuestObjective("trade_routes", "Establish 10 trade partnerships", ObjectiveType.ECONOMIC, 10),
        ],
        rewards=QuestReward(
            resources=300,
            tech_points=75,
            unlocked_quests=["platinum_reserves"]
        )
    )
    system.register_quest(q16)

    # Quest 17: Transcendence
    q17 = Quest(
        quest_id="transcendence",
        title="Transcendence",
        description="Achieve enlightenment with all consciousness metrics at maximum.",
        difficulty=QuestDifficulty.LEGENDARY,
        prerequisites=["consciousness_evolution"],
        faction_affiliation=FactionAffiliation.CONSCIOUSNESS_COLLECTIVE,
        objectives=[
            QuestObjective("transcend_morale", "Transcend morale consciousness", ObjectiveType.CONSCIOUSNESS, 100),
            QuestObjective("transcend_identity", "Transcend identity consciousness", ObjectiveType.CONSCIOUSNESS, 100),
            QuestObjective("transcend_stability", "Transcend stability consciousness", ObjectiveType.CONSCIOUSNESS, 100),
            QuestObjective("transcend_tech", "Transcend technological consciousness", ObjectiveType.CONSCIOUSNESS, 100),
        ],
        rewards=QuestReward(
            resources=1200,
            morale_boost=0.4,
            stability_boost=0.4,
            unlocked_quests=["godhood"]
        )
    )
    system.register_quest(q17)

    # TIER 4: END-GAME QUESTS

    # Quest 18: United Federation
    q18 = Quest(
        quest_id="united_federation",
        title="United Federation",
        description="Form a unity government - bring all factions under one banner.",
        difficulty=QuestDifficulty.LEGENDARY,
        prerequisites=["alliance_of_equals"],
        faction_affiliation=FactionAffiliation.DIPLOMATIC_CORPS,
        objectives=[
            QuestObjective("unity_diplomacy", "Negotiate federation union", ObjectiveType.DIPLOMATIC, 100),
            QuestObjective("unity_factions", "Unite all major factions", ObjectiveType.ALLIANCE, 7),
        ],
        rewards=QuestReward(
            resources=1500,
            reputation=1.0,
            morale_boost=0.4,
            stability_boost=0.35,
            unlocked_quests=["the_eternal_federation"]
        )
    )
    system.register_quest(q18)

    # Quest 19: Grand Coalition
    q19 = Quest(
        quest_id="grand_coalition",
        title="Grand Coalition",
        description="Lead the grand coalition toward federation victory.",
        difficulty=QuestDifficulty.LEGENDARY,
        prerequisites=["diplomatic_mastery"],
        objectives=[
            QuestObjective("coalition_diplomacy", "Build grand coalition", ObjectiveType.DIPLOMATIC, 100),
            QuestObjective("coalition_unity", "Maintain coalition stability", ObjectiveType.DIPLOMATIC, 50),
        ],
        rewards=QuestReward(
            resources=1000,
            reputation=0.8,
            morale_boost=0.35,
            unlocked_quests=["victory_eternal"]
        )
    )
    system.register_quest(q19)

    # Quest 20: The Eternal Federation
    q20 = Quest(
        quest_id="the_eternal_federation",
        title="The Eternal Federation",
        description="Achieve the ultimate victory - the federation transcends mortal realms.",
        difficulty=QuestDifficulty.LEGENDARY,
        prerequisites=["united_federation", "invincible_armada", "universal_culture"],
        faction_affiliation=FactionAffiliation.NONE,
        objectives=[
            QuestObjective("eternal_morale", "Achieve perfect morale (100%)", ObjectiveType.CONSCIOUSNESS, 100),
            QuestObjective("eternal_identity", "Achieve perfect identity (100%)", ObjectiveType.CONSCIOUSNESS, 100),
            QuestObjective("eternal_stability", "Achieve perfect stability (100%)", ObjectiveType.CONSCIOUSNESS, 100),
            QuestObjective("eternal_tech", "Achieve transcendent technology (100%)", ObjectiveType.TECHNOLOGICAL, 100),
            QuestObjective("eternal_alliances", "Unite all civilizations", ObjectiveType.ALLIANCE, 20),
        ],
        rewards=QuestReward(
            resources=2000,
            reputation=1.0,
            morale_boost=0.5,
            stability_boost=0.5,
            tech_points=500,
            unlocked_features=["victory_achieved", "new_game_plus"],
            special_rewards={
                'victory_type': 'federation_unity',
                'achievement': 'eternal_federation',
                'post_game_scenario': True
            }
        )
    )
    system.register_quest(q20)

    # BONUS QUESTS

    # Quest 21: Invincible Armada
    q21 = Quest(
        quest_id="invincible_armada",
        title="Invincible Armada",
        description="Build and maintain a military force of legendary proportions.",
        difficulty=QuestDifficulty.HARD,
        prerequisites=["fortress_unbreakable"],
        faction_affiliation=FactionAffiliation.MILITARY_COMMAND,
        objectives=[
            QuestObjective("armada_size", "Build massive military", ObjectiveType.MILITARY, 100),
            QuestObjective("armada_victories", "Achieve 15 consecutive military victories", ObjectiveType.MILITARY, 15),
        ],
        rewards=QuestReward(
            resources=700,
            morale_boost=0.25,
            unlocked_quests=["eternal_conquest"]
        )
    )
    system.register_quest(q21)

    # Quest 22: Universal Culture
    q22 = Quest(
        quest_id="universal_culture",
        title="Universal Culture",
        description="Spread federation culture across all known civilizations.",
        difficulty=QuestDifficulty.HARD,
        prerequisites=["artistic_enlightenment"],
        faction_affiliation=FactionAffiliation.CULTURAL_MINISTRY,
        objectives=[
            QuestObjective("cultural_spread", "Spread culture universally", ObjectiveType.CULTURAL, 100),
            QuestObjective("cultural_adoption", "Have 10 factions adopt culture", ObjectiveType.CULTURAL, 10),
        ],
        rewards=QuestReward(
            resources=550,
            reputation=0.4,
            morale_boost=0.2,
            unlocked_quests=["the_eternal_federation"]
        )
    )
    system.register_quest(q22)

    return system


if __name__ == "__main__":
    # Example usage
    system = create_quest_library()
    print(f"Quest System initialized with {len(system.quests)} quests")
    print("\nAvailable quests on startup:")
    for quest in system.get_available_quests():
        print(f"  - {quest.title} ({quest.difficulty.name})")
