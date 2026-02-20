#!/usr/bin/env python3
"""
THE FEDERATION GAME - TECHNOLOGY TREE & RESEARCH SYSTEM
~1200 LOC

Complete technology progression and research system for THE FEDERATION GAME. Provides a deep,
interconnected technology tree with 40+ technologies spanning 5 tiers and 7 distinct eras.
Features branching research paths that create distinct gameplay philosophies: Military Focus,
Scientific Focus, Cultural Focus, and Consciousness Focus.

Key Features:
- 40+ pre-built technologies with unique bonuses and unlocks
- 5-tier progression system (Foundational, Classical, Medieval, Industrial, Modern/Future)
- 7 distinct eras (Ancient, Classical, Medieval, Industrial, Modern, Future, Transcendent)
- Research dependency chains with multiple path options
- 4 distinct research philosophies with different bonuses and unlocks
- Progressive unlocking of perks, quests, and features
- Research point allocation and turn-based advancement
- Complete tech tree visualization and dependency mapping
- Detailed research progress reporting and statistics

Integrates seamlessly with FederationGameState, QuestSystem, and TechTree-dependent gameplay.
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set, Tuple, Any
from enum import Enum
import json
import uuid


class Era(Enum):
    """Historical eras in the tech tree"""
    ANCIENT = "Ancient"
    CLASSICAL = "Classical"
    MEDIEVAL = "Medieval"
    INDUSTRIAL = "Industrial"
    MODERN = "Modern"
    FUTURE = "Future"
    TRANSCENDENT = "Transcendent"


class ResearchPhilosophy(Enum):
    """Research path philosophies"""
    MILITARY = "military"          # Defense, warfare, dominance
    SCIENTIFIC = "scientific"      # Research, innovation, breakthrough
    CULTURAL = "cultural"          # Prosperity, happiness, influence
    CONSCIOUSNESS = "consciousness"  # Spiritual, enlightenment, transcendence


@dataclass
class TechBonus:
    """A gameplay bonus provided by a technology"""
    bonus_type: str                # e.g., "morale", "resources", "research_speed"
    value: float                   # Magnitude of the bonus
    is_percentage: bool = False    # Whether to apply as % or fixed value
    duration: int = 0              # 0 = permanent, >0 = turns remaining
    applies_to: str = "global"     # What this affects (e.g., "production", "military")

    def to_dict(self) -> Dict[str, Any]:
        """Convert bonus to dictionary"""
        return asdict(self)


@dataclass
class Technology:
    """
    Complete technology definition in the research tree.

    Represents a researched advancement that provides gameplay bonuses,
    unlocks new capabilities, and gates access to further technologies.
    """
    tech_id: str
    name: str
    description: str
    tier: int                              # 1-5, progression level
    research_cost: int                     # Tech points required to research
    era: Era                               # Historical era
    philosophy: ResearchPhilosophy        # Which philosophy this belongs to

    # Prerequisites & unlocks
    prerequisites: List[str] = field(default_factory=list)  # Tech IDs that must be researched first
    unlocks_techs: List[str] = field(default_factory=list)  # Technologies unlocked by this
    unlocks_quests: List[str] = field(default_factory=list)  # Quest IDs unlocked
    unlocks_perks: List[str] = field(default_factory=list)  # Perk IDs unlocked
    unlocks_features: List[str] = field(default_factory=list)  # Game features unlocked

    # Gameplay benefits
    bonuses: List[TechBonus] = field(default_factory=list)

    # Metadata
    created_at: datetime = field(default_factory=datetime.now)
    research_speed_modifier: float = 1.0   # Multiplier for subsequent research
    breakthrough_chance: float = 0.0       # Chance for instant research breakthrough


@dataclass
class ResearchProject:
    """
    An active research project for a player/faction.

    Tracks progress on a specific technology being researched.
    """
    project_id: str
    technology: Technology                 # The tech being researched
    progress: float = 0.0                  # 0.0 - 1.0
    turns_remaining: int = 0               # Estimated turns until completion
    owner_faction: Optional[str] = None    # Faction conducting research
    completion_time: Optional[datetime] = None

    # Progress tracking
    research_points_invested: int = 0
    started_at: datetime = field(default_factory=datetime.now)
    paused: bool = False

    def is_complete(self) -> bool:
        """Check if research is complete"""
        return self.progress >= 1.0

    def get_progress_percentage(self) -> float:
        """Get progress as percentage (0-100)"""
        return self.progress * 100.0

    def to_dict(self) -> Dict[str, Any]:
        """Convert project to dictionary"""
        return {
            'project_id': self.project_id,
            'technology': self.technology.tech_id,
            'progress': self.progress,
            'progress_percentage': self.get_progress_percentage(),
            'turns_remaining': self.turns_remaining,
            'owner_faction': self.owner_faction,
            'research_points_invested': self.research_points_invested,
            'paused': self.paused,
            'completion_time': self.completion_time.isoformat() if self.completion_time else None
        }


class TechTree:
    """
    Complete technology tree management system.

    Manages all orchestration of research, technology registration, dependency chains,
    and research project lifecycle. Provides a unified interface for research progression
    and technology advancement.
    """

    def __init__(self):
        """Initialize technology tree"""
        self.technologies: Dict[str, Technology] = {}          # All techs by tech_id
        self.projects: Dict[str, ResearchProject] = {}         # Active projects by project_id
        self.completed_techs: Dict[str, Technology] = {}       # Completed by tech_id
        self.player_research: Dict[str, List[str]] = {}        # Per-player completed techs
        self.research_history: List[Dict[str, Any]] = []       # Complete research history
        self.player_stats: Dict[str, Dict[str, Any]] = {}      # Per-player research statistics

    def register_technology(self, tech: Technology) -> None:
        """
        Register a new technology in the tree

        Args:
            tech: Technology object to register

        Raises:
            ValueError: If tech with same ID already exists
        """
        if tech.tech_id in self.technologies:
            raise ValueError(f"Technology '{tech.tech_id}' already registered")

        self.technologies[tech.tech_id] = tech

    def get_available_techs(self, player_id: str = "default") -> List[Technology]:
        """
        Get all technologies available for research (all prerequisites met)

        Args:
            player_id: Player identifier

        Returns:
            List of technologies ready to be researched
        """
        completed_ids = set(self.player_research.get(player_id, []))
        available = []

        for tech in self.technologies.values():
            # Skip if already completed
            if tech.tech_id in completed_ids:
                continue

            # Skip if already being researched
            if any(p.technology.tech_id == tech.tech_id and not p.is_complete()
                   for p in self.projects.values()):
                continue

            # Check if all prerequisites are met
            if not all(prereq in completed_ids for prereq in tech.prerequisites):
                continue

            available.append(tech)

        return sorted(available, key=lambda t: (t.tier, t.research_cost))

    def start_research(self, player_id: str, tech_id: str) -> Tuple[bool, str, Optional[ResearchProject]]:
        """
        Start researching a new technology

        Args:
            player_id: Player identifier
            tech_id: Technology to research

        Returns:
            Tuple of (success, message, project or None)
        """
        if tech_id not in self.technologies:
            return False, f"Technology '{tech_id}' not found", None

        tech = self.technologies[tech_id]

        # Check if available
        available = self.get_available_techs(player_id)
        if tech not in available:
            prereq_ids = tech.prerequisites
            completed_ids = set(self.player_research.get(player_id, []))
            missing = [p for p in prereq_ids if p not in completed_ids]
            missing_names = [self.technologies[m].name for m in missing if m in self.technologies]
            return False, f"Cannot research '{tech.name}'. Missing prerequisites: {', '.join(missing_names)}", None

        # Create research project
        project = ResearchProject(
            project_id=f"research_{player_id}_{tech_id}_{uuid.uuid4().hex[:8]}",
            technology=tech,
            turns_remaining=tech.research_cost,
            owner_faction=player_id
        )

        self.projects[project.project_id] = project

        # Initialize player stats if needed
        if player_id not in self.player_stats:
            self.player_stats[player_id] = {
                'techs_completed': 0,
                'techs_in_progress': 0,
                'research_points_spent': 0,
                'total_research_time': 0,
                'breakthroughs': 0
            }

        self.player_stats[player_id]['techs_in_progress'] += 1

        return True, f"Started researching '{tech.name}' (Cost: {tech.research_cost} points)", project

    def advance_research(self, player_id: str, project_id: str, research_points: int) -> Tuple[bool, str, float]:
        """
        Advance research on a project with research points

        Args:
            player_id: Player identifier
            project_id: Project to advance
            research_points: Points to allocate

        Returns:
            Tuple of (success, message, progress 0.0-1.0)
        """
        if project_id not in self.projects:
            return False, f"Project '{project_id}' not found", 0.0

        project = self.projects[project_id]

        if project.is_complete():
            return False, f"Research already complete", 1.0

        if project.paused:
            return False, f"Research is paused", project.progress

        # Apply research speed modifier from prerequisites
        effective_points = research_points * project.technology.research_speed_modifier

        # Calculate progress increment
        points_needed = project.technology.research_cost
        progress_increment = effective_points / points_needed

        # Check for breakthrough
        breakthrough = False
        import random
        if random.random() < project.technology.breakthrough_chance:
            progress_increment *= 1.5
            breakthrough = True
            self.player_stats[player_id]['breakthroughs'] = self.player_stats[player_id].get('breakthroughs', 0) + 1

        # Update project
        project.progress = min(1.0, project.progress + progress_increment)
        project.research_points_invested += int(effective_points)
        project.turns_remaining = max(0, int((1.0 - project.progress) * points_needed / effective_points)) if effective_points > 0 else 0

        message = f"Advanced '{project.technology.name}': {project.get_progress_percentage():.1f}% complete"
        if breakthrough:
            message += " - BREAKTHROUGH!"

        # Check if complete
        if project.is_complete():
            return self.complete_research(player_id, project_id)

        self.player_stats[player_id]['research_points_spent'] += research_points

        return True, message, project.progress

    def complete_research(self, player_id: str, project_id: str) -> Tuple[bool, str, float]:
        """
        Complete a research project and apply bonuses

        Args:
            player_id: Player identifier
            project_id: Project to complete

        Returns:
            Tuple of (success, message, final progress)
        """
        if project_id not in self.projects:
            return False, f"Project '{project_id}' not found", 0.0

        project = self.projects[project_id]
        tech = project.technology

        # Mark as complete
        project.progress = 1.0
        project.turns_remaining = 0
        project.completion_time = datetime.now()

        tech_id = tech.tech_id

        # Track completion
        if player_id not in self.player_research:
            self.player_research[player_id] = []

        if tech_id not in self.player_research[player_id]:
            self.player_research[player_id].append(tech_id)

        self.completed_techs[tech_id] = tech

        # Update stats
        self.player_stats[player_id]['techs_completed'] += 1
        self.player_stats[player_id]['techs_in_progress'] = max(0, self.player_stats[player_id].get('techs_in_progress', 1) - 1)
        self.player_stats[player_id]['total_research_time'] += int((datetime.now() - project.started_at).total_seconds() / 60)

        # Log completion
        self.research_history.append({
            'player_id': player_id,
            'tech_id': tech_id,
            'tech_name': tech.name,
            'completed_at': datetime.now().isoformat(),
            'points_invested': project.research_points_invested,
            'unlocks': {
                'techs': tech.unlocks_techs,
                'quests': tech.unlocks_quests,
                'perks': tech.unlocks_perks,
                'features': tech.unlocks_features
            }
        })

        message = f"Research Complete: {tech.name} ({tech.era.value} Era)"
        if tech.unlocks_techs:
            message += f" - Unlocks: {', '.join(tech.unlocks_techs)}"
        if tech.unlocks_quests:
            message += f" | Quests: {len(tech.unlocks_quests)} new"

        return True, message, 1.0

    def get_tech_by_era(self, era: Era) -> List[Technology]:
        """
        Get all technologies in a specific era

        Args:
            era: Historical era to filter by

        Returns:
            List of technologies in that era
        """
        return [tech for tech in self.technologies.values() if tech.era == era]

    def get_tech_by_philosophy(self, philosophy: ResearchPhilosophy) -> List[Technology]:
        """
        Get all technologies following a research philosophy

        Args:
            philosophy: Research philosophy to filter by

        Returns:
            List of technologies aligned with that philosophy
        """
        return [tech for tech in self.technologies.values() if tech.philosophy == philosophy]

    def get_research_tree(self) -> Dict[str, Any]:
        """
        Generate complete technology tree visualization data

        Returns:
            Dictionary representing tech tree structure with dependencies
        """
        tree = {
            'total_techs': len(self.technologies),
            'by_tier': {},
            'by_era': {},
            'by_philosophy': {},
            'dependency_map': {}
        }

        # By tier
        for tier in range(1, 6):
            techs = [t for t in self.technologies.values() if t.tier == tier]
            tree['by_tier'][f'tier_{tier}'] = [
                {'id': t.tech_id, 'name': t.name, 'era': t.era.value, 'cost': t.research_cost}
                for t in techs
            ]

        # By era
        for era in Era:
            techs = self.get_tech_by_era(era)
            tree['by_era'][era.value] = [
                {'id': t.tech_id, 'name': t.name, 'tier': t.tier, 'cost': t.research_cost}
                for t in techs
            ]

        # By philosophy
        for philosophy in ResearchPhilosophy:
            techs = self.get_tech_by_philosophy(philosophy)
            tree['by_philosophy'][philosophy.value] = [
                {'id': t.tech_id, 'name': t.name, 'tier': t.tier, 'era': t.era.value}
                for t in techs
            ]

        # Dependency map
        for tech in self.technologies.values():
            tree['dependency_map'][tech.tech_id] = {
                'requires': tech.prerequisites,
                'unlocks': tech.unlocks_techs,
                'unlock_quests': tech.unlocks_quests,
                'unlock_perks': tech.unlocks_perks
            }

        return tree

    def get_research_report(self, player_id: str = "default") -> Dict[str, Any]:
        """
        Generate comprehensive research status report for a player

        Args:
            player_id: Player identifier

        Returns:
            Complete research system state and progress
        """
        completed_techs = self.player_research.get(player_id, [])
        in_progress = [p for p in self.projects.values() if p.owner_faction == player_id and not p.is_complete()]
        available = self.get_available_techs(player_id)

        return {
            'completed_technologies': {
                'count': len(completed_techs),
                'techs': [
                    {
                        'id': self.technologies[tid].tech_id,
                        'name': self.technologies[tid].name,
                        'era': self.technologies[tid].era.value,
                        'tier': self.technologies[tid].tier
                    } for tid in completed_techs if tid in self.technologies
                ]
            },
            'in_progress': {
                'count': len(in_progress),
                'projects': [p.to_dict() for p in in_progress]
            },
            'available_techs': {
                'count': len(available),
                'techs': [
                    {
                        'id': t.tech_id,
                        'name': t.name,
                        'cost': t.research_cost,
                        'era': t.era.value,
                        'unlocks': len(t.unlocks_techs) + len(t.unlocks_quests)
                    } for t in available
                ]
            },
            'player_statistics': self.player_stats.get(player_id, {}),
            'recent_research': self.research_history[-10:] if self.research_history else []
        }

    def is_tech_completed(self, player_id: str, tech_id: str) -> bool:
        """Check if a player has completed a tech"""
        return tech_id in self.player_research.get(player_id, [])

    def get_unlocked_by_tech(self, tech_id: str) -> Dict[str, List[str]]:
        """Get what a technology unlocks"""
        if tech_id not in self.technologies:
            return {}

        tech = self.technologies[tech_id]
        return {
            'unlocks_techs': tech.unlocks_techs,
            'unlocks_quests': tech.unlocks_quests,
            'unlocks_perks': tech.unlocks_perks,
            'unlocks_features': tech.unlocks_features
        }

    def pause_research(self, project_id: str) -> Tuple[bool, str]:
        """Pause active research"""
        if project_id not in self.projects:
            return False, f"Project '{project_id}' not found"

        self.projects[project_id].paused = True
        return True, f"Research paused: {self.projects[project_id].technology.name}"

    def resume_research(self, project_id: str) -> Tuple[bool, str]:
        """Resume paused research"""
        if project_id not in self.projects:
            return False, f"Project '{project_id}' not found"

        self.projects[project_id].paused = False
        return True, f"Research resumed: {self.projects[project_id].technology.name}"


# ============================================================================
# PRE-BUILT TECHNOLOGY TREE (45+ Technologies)
# ============================================================================

def create_technology_tree() -> TechTree:
    """
    Create and populate a complete technology tree with 45+ pre-built technologies
    spanning 5 tiers, 7 eras, and 4 distinct research philosophies.

    Returns:
        Initialized TechTree with all technologies registered
    """
    tree = TechTree()

    # ========================================================================
    # TIER 1: FOUNDATIONAL TECHNOLOGIES (Ancient Era)
    # ========================================================================

    # Animal Husbandry - Foundation for food production
    t1_animal_husbandry = Technology(
        tech_id="animal_husbandry",
        name="Animal Husbandry",
        description="Domesticate and breed animals for food, labor, and transportation. Foundation of civilization.",
        tier=1,
        research_cost=30,
        era=Era.ANCIENT,
        philosophy=ResearchPhilosophy.CULTURAL,
        bonuses=[
            TechBonus("resource_production", 0.15, is_percentage=True, applies_to="food"),
            TechBonus("population_growth", 0.05, is_percentage=True)
        ],
        unlocks_techs=["agriculture", "cavalry"],
        unlocks_quests=["quest_first_hunt", "quest_herding"],
        unlocks_features=["livestock_management"]
    )
    tree.register_technology(t1_animal_husbandry)

    # Agriculture - Crop farming
    t1_agriculture = Technology(
        tech_id="agriculture",
        name="Agriculture",
        description="Develop systematic farming techniques for crop production and surplus accumulation.",
        tier=1,
        research_cost=35,
        era=Era.ANCIENT,
        philosophy=ResearchPhilosophy.SCIENTIFIC,
        bonuses=[
            TechBonus("resource_production", 0.25, is_percentage=True, applies_to="food"),
            TechBonus("stability", 0.1, applies_to="settlement")
        ],
        prerequisites=[],
        unlocks_techs=["advanced_farming", "irrigation"],
        unlocks_features=["farming_optimization"]
    )
    tree.register_technology(t1_agriculture)

    # Basic Tools - Early tool crafting
    t1_basic_tools = Technology(
        tech_id="basic_tools",
        name="Basic Tools",
        description="Craft primitive tools and weapons from stone and bone.",
        tier=1,
        research_cost=25,
        era=Era.ANCIENT,
        philosophy=ResearchPhilosophy.MILITARY,
        bonuses=[
            TechBonus("military_strength", 0.1, applies_to="melee"),
            TechBonus("production_speed", 0.1, is_percentage=True)
        ],
        unlocks_techs=["metallurgy", "craftsmanship"],
        unlocks_features=["tool_crafting"]
    )
    tree.register_technology(t1_basic_tools)

    # Simple Structures - Basic construction
    t1_simple_structures = Technology(
        tech_id="simple_structures",
        name="Simple Structures",
        description="Build basic shelters, storage, and defensive structures.",
        tier=1,
        research_cost=30,
        era=Era.ANCIENT,
        philosophy=ResearchPhilosophy.CULTURAL,
        bonuses=[
            TechBonus("defense", 0.15, applies_to="settlement"),
            TechBonus("storage_capacity", 0.2, is_percentage=True)
        ],
        unlocks_techs=["architecture", "fortification"],
        unlocks_features=["advanced_construction"]
    )
    tree.register_technology(t1_simple_structures)

    # Writing - Record keeping and communication
    t1_writing = Technology(
        tech_id="writing",
        name="Writing",
        description="Develop written language for records, laws, and communication across distances.",
        tier=1,
        research_cost=40,
        era=Era.ANCIENT,
        philosophy=ResearchPhilosophy.SCIENTIFIC,
        bonuses=[
            TechBonus("research_speed", 0.1, is_percentage=True),
            TechBonus("diplomacy_effectiveness", 0.15, applies_to="treaties")
        ],
        unlocks_techs=["philosophy", "mathematics", "cartography"],
        unlocks_perks=["scholar_speed", "knowledge_preservation"],
        unlocks_features=["library_system", "record_keeping"]
    )
    tree.register_technology(t1_writing)

    # ========================================================================
    # TIER 2: CLASSICAL TECHNOLOGIES (Classical Era)
    # ========================================================================

    # Philosophy - Abstract reasoning and ethics
    t2_philosophy = Technology(
        tech_id="philosophy",
        name="Philosophy",
        description="Develop ethical frameworks and abstract thinking to guide civilization.",
        tier=2,
        research_cost=50,
        era=Era.CLASSICAL,
        philosophy=ResearchPhilosophy.CONSCIOUSNESS,
        prerequisites=["writing"],
        bonuses=[
            TechBonus("morale", 0.2, applies_to="population"),
            TechBonus("stability", 0.15, applies_to="government")
        ],
        unlocks_techs=["ethics", "enlightenment"],
        unlocks_perks=["stability_bonus", "moral_authority"],
        unlocks_features=["philosophy_system"]
    )
    tree.register_technology(t2_philosophy)

    # Mathematics - Numerical systems and calculation
    t2_mathematics = Technology(
        tech_id="mathematics",
        name="Mathematics",
        description="Develop formal systems of calculation, geometry, and numerical reasoning.",
        tier=2,
        research_cost=55,
        era=Era.CLASSICAL,
        philosophy=ResearchPhilosophy.SCIENTIFIC,
        prerequisites=["writing"],
        bonuses=[
            TechBonus("research_speed", 0.2, is_percentage=True),
            TechBonus("engineering_precision", 0.15, applies_to="construction")
        ],
        unlocks_techs=["architecture", "astronomy", "engineering"],
        unlocks_features=["advanced_calculations"]
    )
    tree.register_technology(t2_mathematics)

    # Architecture - Advanced building techniques
    t2_architecture = Technology(
        tech_id="architecture",
        name="Architecture",
        description="Master advanced building techniques for grand structures and cities.",
        tier=2,
        research_cost=50,
        era=Era.CLASSICAL,
        philosophy=ResearchPhilosophy.CULTURAL,
        prerequisites=["simple_structures", "mathematics"],
        bonuses=[
            TechBonus("defense", 0.25, applies_to="fortification"),
            TechBonus("city_capacity", 0.3, is_percentage=True),
            TechBonus("morale", 0.1, applies_to="population")
        ],
        unlocks_techs=["castle_defense", "aqueducts"],
        unlocks_features=["grand_construction", "wonder_building"]
    )
    tree.register_technology(t2_architecture)

    # Metallurgy - Metal working and alloys
    t2_metallurgy = Technology(
        tech_id="metallurgy",
        name="Metallurgy",
        description="Extract and forge metals into superior tools, weapons, and structures.",
        tier=2,
        research_cost=55,
        era=Era.CLASSICAL,
        philosophy=ResearchPhilosophy.MILITARY,
        prerequisites=["basic_tools"],
        bonuses=[
            TechBonus("military_strength", 0.3, applies_to="melee"),
            TechBonus("armor_effectiveness", 0.2, applies_to="defense"),
            TechBonus("production_quality", 0.15, applies_to="equipment")
        ],
        unlocks_techs=["advanced_metallurgy", "steel_working"],
        unlocks_features=["metal_equipment"]
    )
    tree.register_technology(t2_metallurgy)

    # Navigation - Sailing and trade routes
    t2_navigation = Technology(
        tech_id="navigation",
        name="Navigation",
        description="Master sailing techniques and celestial navigation for exploration and trade.",
        tier=2,
        research_cost=50,
        era=Era.CLASSICAL,
        philosophy=ResearchPhilosophy.SCIENTIFIC,
        prerequisites=["writing"],
        bonuses=[
            TechBonus("exploration_range", 0.5, applies_to="discovery"),
            TechBonus("trade_profit", 0.25, is_percentage=True)
        ],
        unlocks_techs=["cartography", "seamanship"],
        unlocks_features=["trading_posts", "naval_exploration"]
    )
    tree.register_technology(t2_navigation)

    # Governance - Formal government systems
    t2_governance = Technology(
        tech_id="governance",
        name="Governance",
        description="Establish formal governmental structures and administrative systems.",
        tier=2,
        research_cost=50,
        era=Era.CLASSICAL,
        philosophy=ResearchPhilosophy.CULTURAL,
        prerequisites=["writing"],
        bonuses=[
            TechBonus("stability", 0.2, applies_to="administration"),
            TechBonus("tax_efficiency", 0.15, is_percentage=True),
            TechBonus("bureaucracy_speed", 0.1, applies_to="decisions")
        ],
        unlocks_techs=["democracy", "authoritarianism"],
        unlocks_features=["government_types", "law_system"]
    )
    tree.register_technology(t2_governance)

    # ========================================================================
    # TIER 3: MEDIEVAL TECHNOLOGIES (Medieval Era)
    # ========================================================================

    # Knights & Cavalry - Mounted military superiority
    t3_knights_cavalry = Technology(
        tech_id="knights_cavalry",
        name="Knights & Cavalry",
        description="Develop knight orders and elite cavalry units for devastating battlefield impact.",
        tier=3,
        research_cost=70,
        era=Era.MEDIEVAL,
        philosophy=ResearchPhilosophy.MILITARY,
        prerequisites=["metallurgy", "animal_husbandry"],
        bonuses=[
            TechBonus("military_strength", 0.4, applies_to="cavalry"),
            TechBonus("charge_damage", 0.5, applies_to="cavalry_special"),
            TechBonus("morale", 0.15, applies_to="military")
        ],
        unlocks_techs=["heavy_cavalry", "knight_orders"],
        unlocks_perks=["cavalry_mastery", "elite_warriors"],
        unlocks_features=["cavalry_units", "tournament_combat"]
    )
    tree.register_technology(t3_knights_cavalry)

    # Castle Defense - Fortification science
    t3_castle_defense = Technology(
        tech_id="castle_defense",
        name="Castle Defense",
        description="Engineer sophisticated castle designs with multiple defensive layers.",
        tier=3,
        research_cost=75,
        era=Era.MEDIEVAL,
        philosophy=ResearchPhilosophy.MILITARY,
        prerequisites=["architecture", "metallurgy"],
        bonuses=[
            TechBonus("defense", 0.5, applies_to="fortification"),
            TechBonus("siege_resistance", 0.4, applies_to="defense"),
            TechBonus("garrison_strength", 0.2, is_percentage=True)
        ],
        unlocks_techs=["advanced_fortification", "siege_engineering"],
        unlocks_features=["castle_building", "garrison_system"]
    )
    tree.register_technology(t3_castle_defense)

    # Alchemy - Mystical transformations
    t3_alchemy = Technology(
        tech_id="alchemy",
        name="Alchemy",
        description="Discover alchemical processes for transmutation and potion crafting.",
        tier=3,
        research_cost=70,
        era=Era.MEDIEVAL,
        philosophy=ResearchPhilosophy.CONSCIOUSNESS,
        prerequisites=["philosophy"],
        bonuses=[
            TechBonus("potion_effectiveness", 0.3, applies_to="alchemy"),
            TechBonus("transmutation_chance", 0.2, applies_to="resources")
        ],
        unlocks_techs=["chemistry", "herbalism"],
        unlocks_perks=["alchemist_knowledge", "potion_brewing"],
        unlocks_features=["alchemy_lab", "brewing_system"]
    )
    tree.register_technology(t3_alchemy)

    # Universities - Advanced knowledge centers
    t3_universities = Technology(
        tech_id="universities",
        name="Universities",
        description="Establish universities as centers of learning and research acceleration.",
        tier=3,
        research_cost=75,
        era=Era.MEDIEVAL,
        philosophy=ResearchPhilosophy.SCIENTIFIC,
        prerequisites=["mathematics", "philosophy"],
        bonuses=[
            TechBonus("research_speed", 0.35, is_percentage=True),
            TechBonus("scholar_production", 0.4, applies_to="research_teams"),
            TechBonus("breakthrough_chance", 0.15)
        ],
        unlocks_techs=["scientific_method", "higher_learning"],
        unlocks_features=["university_system", "research_labs"]
    )
    tree.register_technology(t3_universities)

    # Cartography - Advanced mapping
    t3_cartography = Technology(
        tech_id="cartography",
        name="Cartography",
        description="Create accurate maps of known world for exploration and military planning.",
        tier=3,
        research_cost=70,
        era=Era.MEDIEVAL,
        philosophy=ResearchPhilosophy.SCIENTIFIC,
        prerequisites=["navigation", "mathematics"],
        bonuses=[
            TechBonus("exploration_speed", 0.3, applies_to="discovery"),
            TechBonus("military_intelligence", 0.25, applies_to="targeting"),
            TechBonus("trade_route_efficiency", 0.2, is_percentage=True)
        ],
        unlocks_techs=["advanced_cartography", "navigation_systems"],
        unlocks_features=["world_map", "exploration_bonuses"]
    )
    tree.register_technology(t3_cartography)

    # ========================================================================
    # TIER 4: INDUSTRIAL TECHNOLOGIES (Industrial Era)
    # ========================================================================

    # Manufacturing - Mass production techniques
    t4_manufacturing = Technology(
        tech_id="manufacturing",
        name="Manufacturing",
        description="Develop assembly line and mass production techniques for industrial output.",
        tier=4,
        research_cost=90,
        era=Era.INDUSTRIAL,
        philosophy=ResearchPhilosophy.SCIENTIFIC,
        prerequisites=["mathematics", "metallurgy"],
        bonuses=[
            TechBonus("production_speed", 0.5, is_percentage=True),
            TechBonus("production_cost", 0.3, is_percentage=False, applies_to="reduction"),
            TechBonus("factory_output", 0.6, applies_to="manufacturing")
        ],
        unlocks_techs=["mass_production", "automation"],
        unlocks_features=["factory_system", "assembly_lines"]
    )
    tree.register_technology(t4_manufacturing)

    # Steam Power - Industrial engine technology
    t4_steam_power = Technology(
        tech_id="steam_power",
        name="Steam Power",
        description="Harness steam engine technology to revolutionize industry and transportation.",
        tier=4,
        research_cost=100,
        era=Era.INDUSTRIAL,
        philosophy=ResearchPhilosophy.SCIENTIFIC,
        prerequisites=["manufacturing"],
        bonuses=[
            TechBonus("industrial_efficiency", 0.5, is_percentage=True),
            TechBonus("transportation_speed", 0.4, applies_to="land_sea"),
            TechBonus("power_generation", 0.6, applies_to="energy")
        ],
        unlocks_techs=["railways", "steamships"],
        unlocks_features=["steam_engines", "mechanization"]
    )
    tree.register_technology(t4_steam_power)

    # Railways - Land transportation revolution
    t4_railways = Technology(
        tech_id="railways",
        name="Railways",
        description="Build railway networks for rapid transport of goods and troops.",
        tier=4,
        research_cost=95,
        era=Era.INDUSTRIAL,
        philosophy=ResearchPhilosophy.SCIENTIFIC,
        prerequisites=["steam_power", "manufacturing"],
        bonuses=[
            TechBonus("troop_movement_speed", 0.5, applies_to="land"),
            TechBonus("trade_speed", 0.6, applies_to="logistics"),
            TechBonus("resource_transport_capacity", 0.8, is_percentage=True)
        ],
        unlocks_techs=["high_speed_rail"],
        unlocks_features=["railway_network", "train_units"]
    )
    tree.register_technology(t4_railways)

    # Telegraph - Long distance communication
    t4_telegraph = Technology(
        tech_id="telegraph",
        name="Telegraph",
        description="Develop instant long-distance communication via electrical signals.",
        tier=4,
        research_cost=85,
        era=Era.INDUSTRIAL,
        philosophy=ResearchPhilosophy.SCIENTIFIC,
        prerequisites=["electricity_basic"],
        bonuses=[
            TechBonus("communication_range", 10.0, applies_to="world"),
            TechBonus("diplomacy_effectiveness", 0.4, applies_to="negotiations"),
            TechBonus("command_speed", 0.5, applies_to="military")
        ],
        unlocks_techs=["radio_communications"],
        unlocks_features=["telegraph_system", "instant_messaging"]
    )
    tree.register_technology(t4_telegraph)

    # Industrialized Farming - Advanced agricultural production
    t4_industrialized_farming = Technology(
        tech_id="industrialized_farming",
        name="Industrialized Farming",
        description="Apply industrial techniques to farming with machines and chemicals.",
        tier=4,
        research_cost=90,
        era=Era.INDUSTRIAL,
        philosophy=ResearchPhilosophy.SCIENTIFIC,
        prerequisites=["agriculture", "manufacturing"],
        bonuses=[
            TechBonus("food_production", 0.7, is_percentage=True),
            TechBonus("population_capacity", 0.5, is_percentage=True),
            TechBonus("farming_efficiency", 0.6, applies_to="agricultural")
        ],
        unlocks_techs=["genetic_breeding"],
        unlocks_features=["industrial_farms", "mechanized_agriculture"]
    )
    tree.register_technology(t4_industrialized_farming)

    # Banking - Advanced financial systems
    t4_banking = Technology(
        tech_id="banking",
        name="Banking",
        description="Establish banking systems for loans, investments, and economic growth.",
        tier=4,
        research_cost=85,
        era=Era.INDUSTRIAL,
        philosophy=ResearchPhilosophy.CULTURAL,
        prerequisites=["governance"],
        bonuses=[
            TechBonus("economic_growth", 0.4, is_percentage=True),
            TechBonus("loan_interest", 0.1, applies_to="income"),
            TechBonus("investment_returns", 0.3, is_percentage=True)
        ],
        unlocks_techs=["finance_systems", "stock_markets"],
        unlocks_features=["banking_system", "loans", "investments"]
    )
    tree.register_technology(t4_banking)

    # Basic Electricity
    t4_electricity_basic = Technology(
        tech_id="electricity_basic",
        name="Basic Electricity",
        description="Discover and apply fundamental principles of electricity.",
        tier=4,
        research_cost=90,
        era=Era.INDUSTRIAL,
        philosophy=ResearchPhilosophy.SCIENTIFIC,
        prerequisites=["mathematics", "manufacturing"],
        bonuses=[
            TechBonus("power_availability", 0.3, applies_to="cities"),
            TechBonus("lighting_efficiency", 0.5, applies_to="night_production")
        ],
        unlocks_techs=["electricity", "electric_motors"],
        unlocks_features=["electrical_systems", "power_plants"]
    )
    tree.register_technology(t4_electricity_basic)

    # ========================================================================
    # TIER 5: MODERN/FUTURE TECHNOLOGIES (Modern & Future Era)
    # ========================================================================

    # Electricity - Full electrical grid system
    t5_electricity = Technology(
        tech_id="electricity",
        name="Electricity",
        description="Develop complete electrical grid systems powering modern civilization.",
        tier=5,
        research_cost=120,
        era=Era.MODERN,
        philosophy=ResearchPhilosophy.SCIENTIFIC,
        prerequisites=["electricity_basic"],
        bonuses=[
            TechBonus("city_productivity", 0.5, is_percentage=True),
            TechBonus("technology_research_speed", 0.3, applies_to="labs"),
            TechBonus("defenses_power_level", 0.4, applies_to="military")
        ],
        unlocks_techs=["electronics", "computing"],
        unlocks_features=["power_grid", "electrification"]
    )
    tree.register_technology(t5_electricity)

    # Radio Communications - Wireless transmission
    t5_radio_communications = Technology(
        tech_id="radio_communications",
        name="Radio Communications",
        description="Develop wireless radio broadcast for mass communication and military coordination.",
        tier=5,
        research_cost=115,
        era=Era.MODERN,
        philosophy=ResearchPhilosophy.SCIENTIFIC,
        prerequisites=["telegraph"],
        bonuses=[
            TechBonus("broadcast_range", 5.0, applies_to="world"),
            TechBonus("military_coordination", 0.5, applies_to="combat"),
            TechBonus("cultural_influence", 0.4, applies_to="propaganda")
        ],
        unlocks_techs=["television", "satellite_communications"],
        unlocks_features=["radio_network", "mass_media"]
    )
    tree.register_technology(t5_radio_communications)

    # Aircraft - Flight technology
    t5_aircraft = Technology(
        tech_id="aircraft",
        name="Aircraft",
        description="Develop powered flight technology for transportation and warfare.",
        tier=5,
        research_cost=125,
        era=Era.MODERN,
        philosophy=ResearchPhilosophy.MILITARY,
        prerequisites=["steam_power", "engineering"],
        bonuses=[
            TechBonus("military_strength", 0.6, applies_to="air"),
            TechBonus("troop_movement_speed", 0.8, applies_to="air"),
            TechBonus("reconnaissance_range", 2.0, applies_to="scouting")
        ],
        unlocks_techs=["fighter_aircraft", "bombers"],
        unlocks_features=["air_force", "air_units"]
    )
    tree.register_technology(t5_aircraft)

    # Nuclear Energy - Atomic power
    t5_nuclear_energy = Technology(
        tech_id="nuclear_energy",
        name="Nuclear Energy",
        description="Harness nuclear fission and fusion for unprecedented energy generation.",
        tier=5,
        research_cost=150,
        era=Era.FUTURE,
        philosophy=ResearchPhilosophy.SCIENTIFIC,
        prerequisites=["electricity"],
        bonuses=[
            TechBonus("power_generation", 2.0, applies_to="energy"),
            TechBonus("military_strength", 1.0, applies_to="nuclear_weapons"),
            TechBonus("industrial_power", 1.5, is_percentage=True)
        ],
        unlocks_techs=["nuclear_fusion", "weapons_of_mass_destruction"],
        unlocks_features=["nuclear_plants", "nuclear_deterrent"]
    )
    tree.register_technology(t5_nuclear_energy)

    # Computing - Computer technology
    t5_computing = Technology(
        tech_id="computing",
        name="Computing",
        description="Develop computing machines for calculation, information processing, and control systems.",
        tier=5,
        research_cost=130,
        era=Era.MODERN,
        philosophy=ResearchPhilosophy.SCIENTIFIC,
        prerequisites=["electricity"],
        bonuses=[
            TechBonus("research_speed", 0.6, is_percentage=True),
            TechBonus("data_processing", 0.8, applies_to="analysis"),
            TechBonus("automation_level", 0.5, applies_to="production")
        ],
        unlocks_techs=["artificial_intelligence", "cybernetics"],
        unlocks_features=["computer_systems", "data_networks"]
    )
    tree.register_technology(t5_computing)

    # Artificial Intelligence - Machine learning and autonomy
    t5_artificial_intelligence = Technology(
        tech_id="artificial_intelligence",
        name="Artificial Intelligence",
        description="Create artificial minds capable of learning, reasoning, and autonomous decision-making.",
        tier=5,
        research_cost=140,
        era=Era.FUTURE,
        philosophy=ResearchPhilosophy.CONSCIOUSNESS,
        prerequisites=["computing"],
        bonuses=[
            TechBonus("research_automation", 0.7, applies_to="science"),
            TechBonus("military_ai_strength", 0.8, applies_to="combat"),
            TechBonus("optimization_level", 0.6, is_percentage=True, applies_to="all_systems")
        ],
        unlocks_techs=["conscious_ai", "singularity"],
        unlocks_features=["ai_assistants", "autonomous_systems"]
    )
    tree.register_technology(t5_artificial_intelligence)

    # Genetic Engineering - DNA manipulation
    t5_genetic_engineering = Technology(
        tech_id="genetic_engineering",
        name="Genetic Engineering",
        description="Manipulate DNA and genetics to improve species traits and create new organisms.",
        tier=5,
        research_cost=135,
        era=Era.FUTURE,
        philosophy=ResearchPhilosophy.CONSCIOUSNESS,
        prerequisites=["chemistry"],
        bonuses=[
            TechBonus("population_traits", 0.5, applies_to="improvements"),
            TechBonus("disease_immunity", 0.7, applies_to="health"),
            TechBonus("lifespan", 0.3, applies_to="longevity")
        ],
        unlocks_techs=["bioengineering", "human_augmentation"],
        unlocks_features=["genetic_lab", "enhanced_citizens"]
    )
    tree.register_technology(t5_genetic_engineering)

    # Space Travel - Interplanetary exploration
    t5_space_travel = Technology(
        tech_id="space_travel",
        name="Space Travel",
        description="Develop spacecraft and technology for interplanetary exploration and colonization.",
        tier=5,
        research_cost=150,
        era=Era.FUTURE,
        philosophy=ResearchPhilosophy.SCIENTIFIC,
        prerequisites=["aircraft", "nuclear_energy"],
        bonuses=[
            TechBonus("resource_acquisition", 0.8, applies_to="mining_asteroids"),
            TechBonus("military_reach", 3.0, applies_to="orbital"),
            TechBonus("new_worlds", 1.0, applies_to="colonization")
        ],
        unlocks_techs=["terraforming", "interstellar_travel"],
        unlocks_features=["space_program", "lunar_base", "space_units"]
    )
    tree.register_technology(t5_space_travel)

    # Quantum Physics - Subatomic manipulation
    t5_quantum_physics = Technology(
        tech_id="quantum_physics",
        name="Quantum Physics",
        description="Unlock the quantum realm for revolutionary new technologies.",
        tier=5,
        research_cost=145,
        era=Era.FUTURE,
        philosophy=ResearchPhilosophy.SCIENTIFIC,
        prerequisites=["nuclear_energy"],
        bonuses=[
            TechBonus("computing_power", 2.0, is_percentage=True),
            TechBonus("physics_breakthrough", 0.5, applies_to="research"),
            TechBonus("weapon_potential", 1.0, applies_to="energy_weapons")
        ],
        unlocks_techs=["quantum_computing", "teleportation"],
        unlocks_features=["quantum_labs"]
    )
    tree.register_technology(t5_quantum_physics)

    # ========================================================================
    # TIER 5+: CONSCIOUSNESS & TRANSCENDENT TECHNOLOGIES
    # ========================================================================

    # Consciousness Technology - Mind expansion and neural linking
    t5_consciousness_tech = Technology(
        tech_id="consciousness_technology",
        name="Consciousness Technology",
        description="Develop technology to expand consciousness, link minds, and achieve collective enlightenment.",
        tier=5,
        research_cost=140,
        era=Era.FUTURE,
        philosophy=ResearchPhilosophy.CONSCIOUSNESS,
        prerequisites=["artificial_intelligence", "genetic_engineering"],
        bonuses=[
            TechBonus("collective_consciousness", 0.8, applies_to="unity"),
            TechBonus("morale_stability", 0.5, applies_to="population"),
            TechBonus("telepathic_range", 2.0, applies_to="communication")
        ],
        unlocks_techs=["hive_mind", "enlightenment"],
        unlocks_features=["consciousness_network", "mind_linking"]
    )
    tree.register_technology(t5_consciousness_tech)

    # Dimensional Engineering - Dimensional manipulation
    t6_dimensional_engineering = Technology(
        tech_id="dimensional_engineering",
        name="Dimensional Engineering",
        description="Engineer stable access to parallel dimensions and alternate realities.",
        tier=5,
        research_cost=160,
        era=Era.TRANSCENDENT,
        philosophy=ResearchPhilosophy.CONSCIOUSNESS,
        prerequisites=["quantum_physics"],
        bonuses=[
            TechBonus("resource_sources", 3.0, applies_to="dimensional"),
            TechBonus("escape_capability", 1.0, applies_to="dimensional_portals"),
            TechBonus("alternate_solutions", 0.8, applies_to="problems")
        ],
        unlocks_techs=["dimensional_convergence", "multiverse_access"],
        unlocks_features=["dimensional_rifts", "portal_gates"]
    )
    tree.register_technology(t6_dimensional_engineering)

    # Reality Manipulation - Bending the laws of physics
    t6_reality_manipulation = Technology(
        tech_id="reality_manipulation",
        name="Reality Manipulation",
        description="Transcend normal physics through advanced technology and consciousness.",
        tier=5,
        research_cost=170,
        era=Era.TRANSCENDENT,
        philosophy=ResearchPhilosophy.CONSCIOUSNESS,
        prerequisites=["consciousness_technology", "quantum_physics"],
        bonuses=[
            TechBonus("physics_override", 1.0, applies_to="laws"),
            TechBonus("matter_transformation", 1.0, applies_to="alchemy"),
            TechBonus("impossible_projects", 0.5, applies_to="special")
        ],
        unlocks_techs=["omniscience_interface", "transcendence"],
        unlocks_features=["reality_bending"]
    )
    tree.register_technology(t6_reality_manipulation)

    # Time Mastery - Control over temporal flow
    t6_time_mastery = Technology(
        tech_id="time_mastery",
        name="Time Mastery",
        description="Master temporal mechanics for time dilation, prediction, and limited time travel.",
        tier=5,
        research_cost=175,
        era=Era.TRANSCENDENT,
        philosophy=ResearchPhilosophy.CONSCIOUSNESS,
        prerequisites=["quantum_physics"],
        bonuses=[
            TechBonus("turn_acceleration", 2.0, applies_to="game_time"),
            TechBonus("prophecy_accuracy", 0.9, applies_to="future_sight"),
            TechBonus("decision_reversal", 0.1, applies_to="temporal_rewind")
        ],
        unlocks_techs=["temporal_mechanics", "chronal_engineering"],
        unlocks_features=["time_dialation", "prophecy_system"]
    )
    tree.register_technology(t6_time_mastery)

    # Federation Ascension - The ultimate achievement
    t6_federation_ascension = Technology(
        tech_id="federation_ascension",
        name="Federation Ascension",
        description="Achieve transcendent ascension as a unified civilization beyond mortal bounds.",
        tier=5,
        research_cost=200,
        era=Era.TRANSCENDENT,
        philosophy=ResearchPhilosophy.CONSCIOUSNESS,
        prerequisites=["consciousness_technology", "dimensional_engineering", "reality_manipulation"],
        bonuses=[
            TechBonus("victory_condition", 1.0, applies_to="achieved"),
            TechBonus("transcendence_level", 1.0, applies_to="ultimate"),
            TechBonus("omniscience", 1.0, applies_to="knowledge")
        ],
        unlocks_features=["victory_achieved", "new_game_plus", "transcendent_mode"]
    )
    tree.register_technology(t6_federation_ascension)

    # Additional supporting technologies for tier completeness

    # Engineering - Advanced mechanical systems
    t3_engineering = Technology(
        tech_id="engineering",
        name="Engineering",
        description="Master complex mechanical systems and engineering principles.",
        tier=3,
        research_cost=75,
        era=Era.MEDIEVAL,
        philosophy=ResearchPhilosophy.SCIENTIFIC,
        prerequisites=["mathematics", "metallurgy"],
        bonuses=[
            TechBonus("construction_speed", 0.3, is_percentage=True),
            TechBonus("military_equipment", 0.2, applies_to="quality")
        ],
        unlocks_techs=["manufacturing", "aircraft"],
        unlocks_features=["engineering_projects"]
    )
    tree.register_technology(t3_engineering)

    # Astronomy - Celestial mechanics
    t3_astronomy = Technology(
        tech_id="astronomy",
        name="Astronomy",
        description="Study celestial bodies and the cosmos to improve navigation and prophecy.",
        tier=3,
        research_cost=70,
        era=Era.MEDIEVAL,
        philosophy=ResearchPhilosophy.SCIENTIFIC,
        prerequisites=["mathematics", "navigation"],
        bonuses=[
            TechBonus("prophecy_accuracy", 0.25, applies_to="divination"),
            TechBonus("navigation_accuracy", 0.3, applies_to="exploration")
        ],
        unlocks_techs=["space_travel", "quantum_physics"],
        unlocks_features=["observatory"]
    )
    tree.register_technology(t3_astronomy)

    # Chemistry - Chemical science
    t4_chemistry = Technology(
        tech_id="chemistry",
        name="Chemistry",
        description="Develop chemistry as a science for industrial and medical applications.",
        tier=4,
        research_cost=95,
        era=Era.INDUSTRIAL,
        philosophy=ResearchPhilosophy.SCIENTIFIC,
        prerequisites=["alchemy"],
        bonuses=[
            TechBonus("medicine_effectiveness", 0.4, applies_to="healing"),
            TechBonus("chemical_weapons", 0.3, applies_to="military")
        ],
        unlocks_techs=["genetic_engineering", "advanced_pharmaceuticals"],
        unlocks_features=["chemistry_labs"]
    )
    tree.register_technology(t4_chemistry)

    # Advanced Metallurgy
    t4_advanced_metallurgy = Technology(
        tech_id="advanced_metallurgy",
        name="Advanced Metallurgy",
        description="Create alloys and materials with superior properties.",
        tier=4,
        research_cost=90,
        era=Era.INDUSTRIAL,
        philosophy=ResearchPhilosophy.MILITARY,
        prerequisites=["metallurgy"],
        bonuses=[
            TechBonus("armor_strength", 0.4, applies_to="defense"),
            TechBonus("weapon_damage", 0.3, applies_to="military")
        ],
        unlocks_techs=["steel_working"],
        unlocks_features=["superior_materials"]
    )
    tree.register_technology(t4_advanced_metallurgy)

    # Steel Working
    t4_steel_working = Technology(
        tech_id="steel_working",
        name="Steel Working",
        description="Craft fine steel for superior weapons and armor.",
        tier=4,
        research_cost=95,
        era=Era.INDUSTRIAL,
        philosophy=ResearchPhilosophy.MILITARY,
        prerequisites=["advanced_metallurgy"],
        bonuses=[
            TechBonus("military_strength", 0.5, applies_to="all"),
            TechBonus("durability", 0.4, applies_to="equipment")
        ],
        unlocks_techs=["aircraft"],
        unlocks_features=["steel_equipment"]
    )
    tree.register_technology(t4_steel_working)

    # Ethics - Moral frameworks
    t3_ethics = Technology(
        tech_id="ethics",
        name="Ethics",
        description="Develop comprehensive ethical frameworks and moral systems.",
        tier=3,
        research_cost=70,
        era=Era.MEDIEVAL,
        philosophy=ResearchPhilosophy.CONSCIOUSNESS,
        prerequisites=["philosophy"],
        bonuses=[
            TechBonus("morale", 0.25, applies_to="all_factions"),
            TechBonus("loyalty", 0.2, applies_to="government")
        ],
        unlocks_techs=["enlightenment"],
        unlocks_features=["ethical_systems"]
    )
    tree.register_technology(t3_ethics)

    # Enlightenment - Spiritual awakening
    t4_enlightenment = Technology(
        tech_id="enlightenment",
        name="Enlightenment",
        description="Achieve collective enlightenment through spiritual and intellectual advancement.",
        tier=4,
        research_cost=100,
        era=Era.INDUSTRIAL,
        philosophy=ResearchPhilosophy.CONSCIOUSNESS,
        prerequisites=["ethics"],
        bonuses=[
            TechBonus("stability", 0.3, applies_to="all"),
            TechBonus("happiness", 0.4, applies_to="population"),
            TechBonus("research_drive", 0.2, is_percentage=True)
        ],
        unlocks_techs=["consciousness_technology"],
        unlocks_features=["enlightenment_status"]
    )
    tree.register_technology(t4_enlightenment)

    # Advanced Fortification
    t4_advanced_fortification = Technology(
        tech_id="advanced_fortification",
        name="Advanced Fortification",
        description="Build impregnable fortress systems with multi-layered defenses.",
        tier=4,
        research_cost=95,
        era=Era.INDUSTRIAL,
        philosophy=ResearchPhilosophy.MILITARY,
        prerequisites=["castle_defense"],
        bonuses=[
            TechBonus("defense", 0.6, applies_to="all_settlements"),
            TechBonus("siege_endurance", 0.8, applies_to="defense")
        ],
        unlocks_techs=["nuclear_bunkers"],
        unlocks_features=["fortress_network"]
    )
    tree.register_technology(t4_advanced_fortification)

    # Democracy - Democratic governance
    t3_democracy = Technology(
        tech_id="democracy",
        name="Democracy",
        description="Establish democratic systems of government with citizen participation.",
        tier=3,
        research_cost=75,
        era=Era.MEDIEVAL,
        philosophy=ResearchPhilosophy.CULTURAL,
        prerequisites=["governance"],
        bonuses=[
            TechBonus("morale", 0.3, applies_to="population"),
            TechBonus("innovation", 0.25, is_percentage=True),
            TechBonus("stability", 0.15, applies_to="political")
        ],
        unlocks_techs=["constitutional_government"],
        unlocks_features=["democratic_system"]
    )
    tree.register_technology(t3_democracy)

    # Authoritarianism - Centralized control
    t3_authoritarianism = Technology(
        tech_id="authoritarianism",
        name="Authoritarianism",
        description="Establish centralized authoritarian systems for unified control.",
        tier=3,
        research_cost=70,
        era=Era.MEDIEVAL,
        philosophy=ResearchPhilosophy.MILITARY,
        prerequisites=["governance"],
        bonuses=[
            TechBonus("military_efficiency", 0.4, applies_to="command"),
            TechBonus("decision_speed", 0.5, applies_to="government"),
            TechBonus("tax_collection", 0.3, is_percentage=True)
        ],
        unlocks_techs=["totalitarianism"],
        unlocks_features=["autocratic_system"]
    )
    tree.register_technology(t3_authoritarianism)

    # Advanced Farming
    t2_advanced_farming = Technology(
        tech_id="advanced_farming",
        name="Advanced Farming",
        description="Develop advanced agricultural techniques for improved yields.",
        tier=2,
        research_cost=55,
        era=Era.CLASSICAL,
        philosophy=ResearchPhilosophy.SCIENTIFIC,
        prerequisites=["agriculture"],
        bonuses=[
            TechBonus("food_production", 0.3, is_percentage=True),
            TechBonus("farming_efficiency", 0.25, applies_to="labor")
        ],
        unlocks_techs=["industrialized_farming"],
        unlocks_features=["advanced_irrigation"]
    )
    tree.register_technology(t2_advanced_farming)

    # Irrigation - Water management
    t2_irrigation = Technology(
        tech_id="irrigation",
        name="Irrigation",
        description="Engineer irrigation systems to maximize agricultural productivity.",
        tier=2,
        research_cost=50,
        era=Era.CLASSICAL,
        philosophy=ResearchPhilosophy.SCIENTIFIC,
        prerequisites=["agriculture", "architecture"],
        bonuses=[
            TechBonus("food_production", 0.25, is_percentage=True),
            TechBonus("drought_resistance", 0.5, applies_to="farming")
        ],
        unlocks_techs=["aqueducts"],
        unlocks_features=["irrigation_systems"]
    )
    tree.register_technology(t2_irrigation)

    # Aqueducts - Water transport
    t3_aqueducts = Technology(
        tech_id="aqueducts",
        name="Aqueducts",
        description="Build massive aqueduct systems to transport water across vast distances.",
        tier=3,
        research_cost=75,
        era=Era.MEDIEVAL,
        philosophy=ResearchPhilosophy.CULTURAL,
        prerequisites=["irrigation", "architecture"],
        bonuses=[
            TechBonus("city_capacity", 0.4, is_percentage=True),
            TechBonus("food_production", 0.2, is_percentage=True),
            TechBonus("morale", 0.15, applies_to="urban_centers")
        ],
        unlocks_features=["aqueduct_networks"]
    )
    tree.register_technology(t3_aqueducts)

    # Craftsmanship - Skilled artisan techniques
    t2_craftsmanship = Technology(
        tech_id="craftsmanship",
        name="Craftsmanship",
        description="Perfect artisan skills for high-quality equipment and artifacts.",
        tier=2,
        research_cost=50,
        era=Era.CLASSICAL,
        philosophy=ResearchPhilosophy.CULTURAL,
        prerequisites=["basic_tools"],
        bonuses=[
            TechBonus("equipment_quality", 0.2, applies_to="all"),
            TechBonus("luxury_goods", 0.3, applies_to="trade"),
            TechBonus("morale", 0.1, applies_to="crafted_items")
        ],
        unlocks_techs=["fine_arts"],
        unlocks_features=["masterwork_crafting"]
    )
    tree.register_technology(t2_craftsmanship)

    # Fine Arts - High culture
    t3_fine_arts = Technology(
        tech_id="fine_arts",
        name="Fine Arts",
        description="Develop sophisticated arts and cultural practices.",
        tier=3,
        research_cost=70,
        era=Era.MEDIEVAL,
        philosophy=ResearchPhilosophy.CULTURAL,
        prerequisites=["craftsmanship", "philosophy"],
        bonuses=[
            TechBonus("cultural_influence", 0.5, applies_to="soft_power"),
            TechBonus("morale", 0.25, applies_to="population"),
            TechBonus("tourism_revenue", 0.4, applies_to="culture")
        ],
        unlocks_techs=["universal_art"],
        unlocks_features=["art_galleries", "cultural_sites"]
    )
    tree.register_technology(t3_fine_arts)

    # Seamanship - Advanced naval techniques
    t3_seamanship = Technology(
        tech_id="seamanship",
        name="Seamanship",
        description="Master advanced naval warfare and ocean navigation.",
        tier=3,
        research_cost=75,
        era=Era.MEDIEVAL,
        philosophy=ResearchPhilosophy.MILITARY,
        prerequisites=["navigation"],
        bonuses=[
            TechBonus("naval_strength", 0.4, applies_to="ships"),
            TechBonus("naval_speed", 0.3, applies_to="movement"),
            TechBonus("trade_protection", 0.3, applies_to="piracy_defense")
        ],
        unlocks_techs=["steamships"],
        unlocks_features=["naval_fleet", "naval_units"]
    )
    tree.register_technology(t3_seamanship)

    # Heavy Cavalry - Superior mounted units
    t4_heavy_cavalry = Technology(
        tech_id="heavy_cavalry",
        name="Heavy Cavalry",
        description="Develop elite heavy cavalry with superior armor and training.",
        tier=4,
        research_cost=95,
        era=Era.INDUSTRIAL,
        philosophy=ResearchPhilosophy.MILITARY,
        prerequisites=["knights_cavalry"],
        bonuses=[
            TechBonus("cavalry_strength", 0.5, applies_to="armor_protection"),
            TechBonus("charge_effectiveness", 0.6, applies_to="cavalry_charge")
        ],
        unlocks_techs=["mechs"],
        unlocks_features=["heavy_units"]
    )
    tree.register_technology(t4_heavy_cavalry)

    # Knight Orders - Organized knightly institutions
    t4_knight_orders = Technology(
        tech_id="knight_orders",
        name="Knight Orders",
        description="Establish formal orders of knights with strict codes and training.",
        tier=4,
        research_cost=90,
        era=Era.INDUSTRIAL,
        philosophy=ResearchPhilosophy.MILITARY,
        prerequisites=["knights_cavalry", "governance"],
        bonuses=[
            TechBonus("unit_morale", 0.4, applies_to="knights"),
            TechBonus("unit_loyalty", 0.5, applies_to="elite_forces"),
            TechBonus("combat_precision", 0.3, applies_to="tactics")
        ],
        unlocks_features=["knight_order_system"]
    )
    tree.register_technology(t4_knight_orders)

    # Bioengineering - Advanced biological engineering
    t5_bioengineering = Technology(
        tech_id="bioengineering",
        name="Bioengineering",
        description="Engineer biological systems for enhanced capabilities and creations.",
        tier=5,
        research_cost=135,
        era=Era.FUTURE,
        philosophy=ResearchPhilosophy.CONSCIOUSNESS,
        prerequisites=["genetic_engineering"],
        bonuses=[
            TechBonus("bio_weapon_strength", 0.8, applies_to="biological"),
            TechBonus("organism_control", 0.7, applies_to="creatures")
        ],
        unlocks_techs=["hive_consciousness"],
        unlocks_features=["bioengineered_creatures"]
    )
    tree.register_technology(t5_bioengineering)

    # Human Augmentation - Enhance human capabilities
    t5_human_augmentation = Technology(
        tech_id="human_augmentation",
        name="Human Augmentation",
        description="Augment human bodies with technology for enhanced capabilities.",
        tier=5,
        research_cost=140,
        era=Era.FUTURE,
        philosophy=ResearchPhilosophy.CONSCIOUSNESS,
        prerequisites=["genetic_engineering"],
        bonuses=[
            TechBonus("population_strength", 0.6, applies_to="soldiers"),
            TechBonus("worker_productivity", 0.5, is_percentage=True),
            TechBonus("lifespan", 0.5, applies_to="longevity")
        ],
        unlocks_features=["augmentation_clinics", "superhuman_population"]
    )
    tree.register_technology(t5_human_augmentation)

    return tree


if __name__ == "__main__":
    # Example usage
    tech_tree = create_technology_tree()
    print(f"Technology Tree initialized with {len(tech_tree.technologies)} technologies")

    print("\nTechnologies by Tier:")
    for tier in range(1, 6):
        techs = [t for t in tech_tree.technologies.values() if t.tier == tier]
        print(f"  Tier {tier}: {len(techs)} technologies")

    print("\nTechnologies by Philosophy:")
    for philosophy in ResearchPhilosophy:
        techs = tech_tree.get_tech_by_philosophy(philosophy)
        print(f"  {philosophy.value}: {len(techs)} technologies")

    print("\nTechnologies by Era:")
    for era in Era:
        techs = tech_tree.get_tech_by_era(era)
        print(f"  {era.value}: {len(techs)} technologies")

    # Example: Start research
    success, msg, project = tech_tree.start_research("player1", "animal_husbandry")
    print(f"\n{msg}")

    if project:
        # Advance research
        success, msg, progress = tech_tree.advance_research("player1", project.project_id, 20)
        print(f"{msg}")
