#!/usr/bin/env python3
"""
PHASE XIV - FLEET EXPANSION ENGINE
Manages ship archetypes, commissioning, mythologies, and emergent behaviors.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional
from datetime import datetime
from enum import Enum


class ShipArchetype(Enum):
    EXPLORER = "explorer"
    WARRIOR = "warrior"
    SCHOLAR = "scholar"
    DIPLOMAT = "diplomat"
    ENGINEER = "engineer"
    MYTHWEAVER = "mythweaver"


class OperationalState(Enum):
    ACTIVE = "active"
    DECOMMISSIONED = "decommissioned"
    IN_REPAIR = "in_repair"
    IN_DRYDOCK = "in_drydock"


@dataclass
class ShipArchetypeDefinition:
    archetype_id: str
    name: str
    archetype_type: ShipArchetype
    base_personality: str
    core_capabilities: List[str]
    special_traits: List[str]
    creation_timestamp: float


@dataclass
class FleetShip:
    ship_id: str
    name: str
    archetype: ShipArchetype
    personality: str
    capabilities: List[str]
    mythology_id: Optional[str] = None
    operational_state: OperationalState = OperationalState.ACTIVE
    commission_timestamp: float = field(default_factory=lambda: datetime.now().timestamp())


@dataclass
class Mythology:
    myth_id: str
    ship_name: str
    name: str
    origin_arc: str
    creation_narrative: str
    core_values: List[str]
    legendary_artifacts: List[str] = field(default_factory=list)
    creation_timestamp: float = field(default_factory=lambda: datetime.now().timestamp())


@dataclass
class EmergentBehavior:
    behavior_id: str
    name: str
    origin_ships: List[str]
    description: str
    positive_effects: List[str]
    negative_effects: List[str]
    stability_rating: float  # 0.0-1.0
    observation_timestamp: float


@dataclass
class ExpansionMilestone:
    milestone_id: str
    name: str
    timestamp: float
    ships_commissioned: int
    fleet_size: int
    major_event: str


@dataclass
class ExpansionStatus:
    total_ships: int
    active_ships: int
    decommissioned_ships: int
    archetypes_defined: int
    mythologies_created: int
    emergent_behaviors_observed: int
    fleet_complexity: float


class FleetExpansionEngine:
    """Manages fleet composition, ship types, mythologies, and behaviors"""

    def __init__(self):
        self.archetypes: Dict[str, ShipArchetypeDefinition] = {}
        self.ships: Dict[str, FleetShip] = {}
        self.mythologies: Dict[str, Mythology] = {}
        self.emergent_behaviors: Dict[str, EmergentBehavior] = {}
        self.expansion_history: List[ExpansionMilestone] = []
        self._id_counters = {
            "archetype": 0,
            "ship": 0,
            "mythology": 0,
            "behavior": 0,
            "milestone": 0,
        }

    def _generate_id(self, entity_type: str) -> str:
        self._id_counters[entity_type] += 1
        return f"{entity_type}_{self._id_counters[entity_type]:03d}"

    # ===== ARCHETYPE MANAGEMENT =====

    def define_archetype(
        self,
        archetype_type: ShipArchetype,
        name: str,
        base_personality: str,
        core_capabilities: List[str],
        special_traits: List[str],
    ) -> ShipArchetypeDefinition:
        """Define new ship archetype"""
        archetype_id = self._generate_id("archetype")
        archetype = ShipArchetypeDefinition(
            archetype_id=archetype_id,
            name=name,
            archetype_type=archetype_type,
            base_personality=base_personality,
            core_capabilities=core_capabilities,
            special_traits=special_traits,
            creation_timestamp=datetime.now().timestamp(),
        )
        self.archetypes[archetype_id] = archetype
        return archetype

    def get_archetype(
        self, archetype_id: str
    ) -> Optional[ShipArchetypeDefinition]:
        """Get archetype definition"""
        return self.archetypes.get(archetype_id)

    def list_archetypes_by_type(
        self, archetype_type: ShipArchetype
    ) -> List[ShipArchetypeDefinition]:
        """List all archetypes of given type"""
        return [
            a
            for a in self.archetypes.values()
            if a.archetype_type == archetype_type
        ]

    # ===== SHIP COMMISSIONING =====

    def commission_ship(
        self,
        ship_name: str,
        archetype_type: ShipArchetype,
        personality: str,
        capabilities: List[str],
    ) -> FleetShip:
        """Commission new ship into fleet"""
        ship_id = self._generate_id("ship")
        ship = FleetShip(
            ship_id=ship_id,
            name=ship_name,
            archetype=archetype_type,
            personality=personality,
            capabilities=capabilities,
            operational_state=OperationalState.ACTIVE,
        )
        self.ships[ship_id] = ship
        return ship

    def decommission_ship(self, ship_id: str) -> bool:
        """Decommission ship from fleet"""
        if ship_id not in self.ships:
            return False

        self.ships[ship_id].operational_state = OperationalState.DECOMMISSIONED
        return True

    def get_fleet_composition(self) -> Dict[ShipArchetype, int]:
        """Get distribution of ship types"""
        composition = {}
        for ship in self.ships.values():
            if ship.operational_state == OperationalState.ACTIVE:
                key = ship.archetype
                composition[key] = composition.get(key, 0) + 1
        return composition

    def get_active_ships(self) -> List[FleetShip]:
        """Get all active ships"""
        return [
            s
            for s in self.ships.values()
            if s.operational_state == OperationalState.ACTIVE
        ]

    # ===== MYTHOLOGY MANAGEMENT =====

    def create_mythology(
        self,
        ship_name: str,
        name: str,
        origin_arc: str,
        creation_narrative: str,
        core_values: List[str],
    ) -> Mythology:
        """Create mythology for ship"""
        myth_id = self._generate_id("mythology")
        mythology = Mythology(
            myth_id=myth_id,
            ship_name=ship_name,
            name=name,
            origin_arc=origin_arc,
            creation_narrative=creation_narrative,
            core_values=core_values,
        )
        self.mythologies[myth_id] = mythology
        return mythology

    def get_mythology(self, myth_id: str) -> Optional[Mythology]:
        """Get mythology by ID"""
        return self.mythologies.get(myth_id)

    def add_legendary_artifact(
        self, myth_id: str, artifact_name: str
    ) -> bool:
        """Add legendary artifact to mythology"""
        if myth_id not in self.mythologies:
            return False

        mythology = self.mythologies[myth_id]
        if artifact_name not in mythology.legendary_artifacts:
            mythology.legendary_artifacts.append(artifact_name)
        return True

    def get_fleet_mythologies(self) -> List[Mythology]:
        """Get all mythologies in fleet"""
        return list(self.mythologies.values())

    # ===== EMERGENT BEHAVIORS =====

    def observe_emergent_behavior(
        self,
        name: str,
        origin_ships: List[str],
        description: str,
        positive_effects: List[str],
        negative_effects: List[str],
        stability_rating: float,
    ) -> EmergentBehavior:
        """Observe and record emergent behavior in fleet"""
        behavior_id = self._generate_id("behavior")
        behavior = EmergentBehavior(
            behavior_id=behavior_id,
            name=name,
            origin_ships=origin_ships,
            description=description,
            positive_effects=positive_effects,
            negative_effects=negative_effects,
            stability_rating=stability_rating,
            observation_timestamp=datetime.now().timestamp(),
        )
        self.emergent_behaviors[behavior_id] = behavior
        return behavior

    def add_behavior_effect(
        self,
        behavior_id: str,
        effect: str,
        effect_type: str,  # "positive" or "negative"
    ) -> bool:
        """Add effect to observed behavior"""
        if behavior_id not in self.emergent_behaviors:
            return False

        behavior = self.emergent_behaviors[behavior_id]
        if effect_type == "positive":
            behavior.positive_effects.append(effect)
        elif effect_type == "negative":
            behavior.negative_effects.append(effect)
        return True

    def stabilize_behavior(
        self, behavior_id: str, new_stability: float
    ) -> bool:
        """Adjust stability rating of behavior"""
        if behavior_id not in self.emergent_behaviors:
            return False

        self.emergent_behaviors[behavior_id].stability_rating = max(
            0.0, min(1.0, new_stability)
        )
        return True

    def list_emergent_behaviors(self) -> List[EmergentBehavior]:
        """Get all observed emergent behaviors"""
        return list(self.emergent_behaviors.values())

    # ===== EXPANSION MILESTONES =====

    def record_milestone(
        self,
        name: str,
        ships_commissioned: int,
        major_event: str,
    ) -> ExpansionMilestone:
        """Record expansion milestone"""
        milestone_id = self._generate_id("milestone")
        milestone = ExpansionMilestone(
            milestone_id=milestone_id,
            name=name,
            timestamp=datetime.now().timestamp(),
            ships_commissioned=ships_commissioned,
            fleet_size=len(self.get_active_ships()),
            major_event=major_event,
        )
        self.expansion_history.append(milestone)
        return milestone

    def get_expansion_history(self) -> List[ExpansionMilestone]:
        """Get expansion history"""
        return self.expansion_history

    # ===== STATUS REPORTING =====

    def get_expansion_status(self) -> ExpansionStatus:
        """Get comprehensive fleet expansion status"""
        active_ships = self.get_active_ships()
        decommissioned = [
            s
            for s in self.ships.values()
            if s.operational_state == OperationalState.DECOMMISSIONED
        ]

        # Calculate complexity: archetype diversity + behavior stability
        compositions = self.get_fleet_composition()
        archetype_diversity = len(compositions) / max(
            1, len(ShipArchetype)
        )
        behavior_stability = (
            sum(b.stability_rating for b in self.emergent_behaviors.values())
            / max(1, len(self.emergent_behaviors))
            if self.emergent_behaviors
            else 0.8
        )
        fleet_complexity = (archetype_diversity * 0.4) + (
            behavior_stability * 0.6
        )

        return ExpansionStatus(
            total_ships=len(self.ships),
            active_ships=len(active_ships),
            decommissioned_ships=len(decommissioned),
            archetypes_defined=len(self.archetypes),
            mythologies_created=len(self.mythologies),
            emergent_behaviors_observed=len(self.emergent_behaviors),
            fleet_complexity=min(1.0, fleet_complexity),
        )
