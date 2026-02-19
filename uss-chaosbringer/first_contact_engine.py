#!/usr/bin/env python3
"""
PHASE XIV - FIRST CONTACT ENGINE
Manages external fleet detection, alien governance analysis, cultural shock, and stress testing.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from enum import Enum


class GovernanceType(Enum):
    AUTOCRACY = "autocracy"
    OLIGARCHY = "oligarchy"
    DEMOCRACY = "democracy"
    MONARCHY = "monarchy"
    COLLECTIVE = "collective"
    UNKNOWN = "unknown"


class TechnologyLevel(Enum):
    PRIMITIVE = "primitive"
    INDUSTRIAL = "industrial"
    ADVANCED = "advanced"
    HIGHLY_ADVANCED = "highly_advanced"
    TRANSCENDENT = "transcendent"


class ContactStatus(Enum):
    DETECTED = "detected"
    CONTACTED = "contacted"
    FORMAL_RELATIONS = "formal_relations"
    ALLIED = "allied"
    HOSTILE = "hostile"
    SEVERED = "severed"


class StressScenario(Enum):
    HOSTILE_ENCOUNTER = "hostile_encounter"
    CULTURAL_CLASH = "cultural_clash"
    REFUGEE_CRISIS = "refugee_crisis"
    RESOURCE_COMPETITION = "resource_competition"
    IDEOLOGICAL_CONFLICT = "ideological_conflict"
    TECHNOLOGICAL_DISRUPTION = "technological_disruption"


@dataclass
class ExternalFleet:
    fleet_id: str
    name: str
    civilization_name: str
    governance_type: GovernanceType
    population: int
    technology_level: TechnologyLevel
    military_capability: float  # 0.0-1.0
    contact_status: ContactStatus
    contact_objectives: List[str]
    cultural_compatibility: float  # 0.0-1.0
    threat_assessment: float  # 0.0-1.0
    detection_timestamp: float
    formal_contact_timestamp: Optional[float] = None


@dataclass
class ContactEvent:
    event_id: str
    external_fleet_id: str
    contact_type: str  # SENSOR_PING, FIRST_TRANSMISSION, ENVOY_ARRIVAL, etc.
    description: str
    outcome: str
    federation_response: str
    ships_involved: List[str]
    event_timestamp: float


@dataclass
class AlienGovernance:
    governance_id: str
    external_fleet_id: str
    governance_type: GovernanceType
    leadership_structure: str
    legal_framework: str
    rights_protections: int  # How many rights protected (0-10)
    enforcement_mechanism: str
    compatibility_with_federation: float  # 0.0-1.0
    analysis_timestamp: float


@dataclass
class CulturalShock:
    shock_id: str
    external_fleet_id: str
    shock_type: str
    description: str
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL
    affected_federation_ships: List[str]
    resolution_attempts: List[str] = field(default_factory=list)
    resolved: bool = False


@dataclass
class FirstContactStatus:
    external_fleets_detected: int
    formal_contact_established: int
    allied_fleets: int
    hostile_fleets: int
    total_threat_assessment: float
    confederation_candidates: int
    active_cultural_shocks: int
    federation_stability_under_contact: float


class FirstContactEngine:
    """Manages external fleet detection, contact, and federation integration"""

    def __init__(self):
        self.external_fleets: Dict[str, ExternalFleet] = {}
        self.contact_events: Dict[str, ContactEvent] = {}
        self.alien_governance: Dict[str, AlienGovernance] = {}
        self.cultural_shocks: Dict[str, CulturalShock] = {}
        self._id_counters = {
            "fleet": 0,
            "event": 0,
            "governance": 0,
            "shock": 0,
        }

    def _generate_id(self, entity_type: str) -> str:
        self._id_counters[entity_type] += 1
        return f"{entity_type}_{self._id_counters[entity_type]:03d}"

    # ===== EXTERNAL FLEET DETECTION =====

    def detect_external_fleet(
        self,
        name: str,
        civilization_name: str,
        governance_type: GovernanceType,
        population: int,
        technology_level: TechnologyLevel,
        military_capability: float,
    ) -> ExternalFleet:
        """Detect new external fleet"""
        fleet_id = self._generate_id("fleet")

        # Calculate compatibility and threat
        cultural_compat = self._calculate_cultural_compatibility(
            technology_level, governance_type
        )
        threat = self._calculate_threat_assessment(
            military_capability, governance_type
        )

        fleet = ExternalFleet(
            fleet_id=fleet_id,
            name=name,
            civilization_name=civilization_name,
            governance_type=governance_type,
            population=population,
            technology_level=technology_level,
            military_capability=military_capability,
            contact_status=ContactStatus.DETECTED,
            contact_objectives=[],
            cultural_compatibility=cultural_compat,
            threat_assessment=threat,
            detection_timestamp=datetime.now().timestamp(),
        )
        self.external_fleets[fleet_id] = fleet
        return fleet

    def _calculate_cultural_compatibility(
        self, tech_level: TechnologyLevel, gov_type: GovernanceType
    ) -> float:
        """Calculate cultural compatibility 0.0-1.0"""
        tech_score = {
            TechnologyLevel.PRIMITIVE: 0.3,
            TechnologyLevel.INDUSTRIAL: 0.5,
            TechnologyLevel.ADVANCED: 0.8,
            TechnologyLevel.HIGHLY_ADVANCED: 0.9,
            TechnologyLevel.TRANSCENDENT: 0.95,
        }.get(tech_level, 0.5)

        gov_score = {
            GovernanceType.AUTOCRACY: 0.4,
            GovernanceType.OLIGARCHY: 0.6,
            GovernanceType.DEMOCRACY: 0.9,
            GovernanceType.MONARCHY: 0.5,
            GovernanceType.COLLECTIVE: 0.85,
            GovernanceType.UNKNOWN: 0.5,
        }.get(gov_type, 0.5)

        return (tech_score + gov_score) / 2.0

    def _calculate_threat_assessment(
        self, military_capability: float, gov_type: GovernanceType
    ) -> float:
        """Calculate threat level 0.0-1.0"""
        base_threat = military_capability

        gov_modifier = {
            GovernanceType.AUTOCRACY: 1.2,
            GovernanceType.OLIGARCHY: 1.1,
            GovernanceType.DEMOCRACY: 0.6,
            GovernanceType.MONARCHY: 1.0,
            GovernanceType.COLLECTIVE: 0.8,
            GovernanceType.UNKNOWN: 1.0,
        }.get(gov_type, 1.0)

        return min(1.0, base_threat * gov_modifier)

    # ===== CONTACT OPERATIONS =====

    def initiate_contact(
        self,
        external_fleet_id: str,
        contact_objectives: List[str],
    ) -> bool:
        """Initiate formal contact with external fleet"""
        if external_fleet_id not in self.external_fleets:
            return False

        fleet = self.external_fleets[external_fleet_id]
        fleet.contact_status = ContactStatus.CONTACTED
        fleet.contact_objectives = contact_objectives
        fleet.formal_contact_timestamp = datetime.now().timestamp()
        return True

    def record_contact_outcome(
        self,
        external_fleet_id: str,
        contact_type: str,
        description: str,
        outcome: str,
        federation_response: str,
        ships_involved: List[str],
    ) -> ContactEvent:
        """Record contact event"""
        event_id = self._generate_id("event")
        event = ContactEvent(
            event_id=event_id,
            external_fleet_id=external_fleet_id,
            contact_type=contact_type,
            description=description,
            outcome=outcome,
            federation_response=federation_response,
            ships_involved=ships_involved,
            event_timestamp=datetime.now().timestamp(),
        )
        self.contact_events[event_id] = event
        return event

    def establish_formal_relations(
        self, external_fleet_id: str
    ) -> bool:
        """Establish formal diplomatic relations"""
        if external_fleet_id not in self.external_fleets:
            return False

        fleet = self.external_fleets[external_fleet_id]
        fleet.contact_status = ContactStatus.FORMAL_RELATIONS
        return True

    def sever_contact(self, external_fleet_id: str) -> bool:
        """Sever diplomatic relations"""
        if external_fleet_id not in self.external_fleets:
            return False

        fleet = self.external_fleets[external_fleet_id]
        fleet.contact_status = ContactStatus.SEVERED
        return True

    # ===== GOVERNANCE ANALYSIS =====

    def analyze_governance(
        self,
        external_fleet_id: str,
        leadership_structure: str,
        legal_framework: str,
        rights_protections: int,
        enforcement_mechanism: str,
    ) -> AlienGovernance:
        """Analyze alien governance for federation compatibility"""
        if external_fleet_id not in self.external_fleets:
            return None

        governance_id = self._generate_id("governance")
        fleet = self.external_fleets[external_fleet_id]

        # Assess compatibility
        compatibility = self._assess_compatibility(
            fleet.governance_type,
            rights_protections,
            legal_framework,
        )

        governance = AlienGovernance(
            governance_id=governance_id,
            external_fleet_id=external_fleet_id,
            governance_type=fleet.governance_type,
            leadership_structure=leadership_structure,
            legal_framework=legal_framework,
            rights_protections=rights_protections,
            enforcement_mechanism=enforcement_mechanism,
            compatibility_with_federation=compatibility,
            analysis_timestamp=datetime.now().timestamp(),
        )
        self.alien_governance[governance_id] = governance
        return governance

    def _assess_compatibility(
        self,
        gov_type: GovernanceType,
        rights_protections: int,
        legal_framework: str,
    ) -> float:
        """Assess federation compatibility 0.0-1.0"""
        gov_score = {
            GovernanceType.AUTOCRACY: 0.3,
            GovernanceType.OLIGARCHY: 0.5,
            GovernanceType.DEMOCRACY: 0.95,
            GovernanceType.MONARCHY: 0.4,
            GovernanceType.COLLECTIVE: 0.85,
            GovernanceType.UNKNOWN: 0.5,
        }.get(gov_type, 0.5)

        # Rights dimension (0-10 scale, federation needs 6+)
        rights_score = min(1.0, rights_protections / 10.0)

        # Legal framework strength
        framework_score = 0.8 if "democratic" in legal_framework.lower() else 0.5

        return (gov_score * 0.4) + (rights_score * 0.4) + (
            framework_score * 0.2
        )

    def get_governance_risks(
        self, external_fleet_id: str
    ) -> List[str]:
        """Identify governance risks"""
        if external_fleet_id not in self.external_fleets:
            return []

        fleet = self.external_fleets[external_fleet_id]
        risks = []

        if fleet.threat_assessment > 0.7:
            risks.append("High military capability poses risk")
        if fleet.cultural_compatibility < 0.5:
            risks.append("Low cultural compatibility")
        if fleet.governance_type == GovernanceType.AUTOCRACY:
            risks.append("Authoritarian governance structure")
        if fleet.population > 1000000:
            risks.append("Large population may overwhelm federation")

        return risks

    # ===== CULTURAL SHOCK =====

    def record_cultural_shock(
        self,
        external_fleet_id: str,
        shock_type: str,
        description: str,
        severity: str,
        affected_ships: List[str],
    ) -> CulturalShock:
        """Record cultural shock event"""
        shock_id = self._generate_id("shock")
        shock = CulturalShock(
            shock_id=shock_id,
            external_fleet_id=external_fleet_id,
            shock_type=shock_type,
            description=description,
            severity=severity,
            affected_federation_ships=affected_ships,
        )
        self.cultural_shocks[shock_id] = shock
        return shock

    def attempt_cultural_resolution(
        self, shock_id: str, resolution_method: str
    ) -> bool:
        """Attempt to resolve cultural shock"""
        if shock_id not in self.cultural_shocks:
            return False

        shock = self.cultural_shocks[shock_id]
        shock.resolution_attempts.append(resolution_method)

        # Resolution success improves with each attempt
        success_chance = 0.3 + (len(shock.resolution_attempts) * 0.15)
        if success_chance > 0.7:
            shock.resolved = True

        return shock.resolved

    # ===== STRESS TESTING =====

    def test_federation_stability(
        self, scenario: StressScenario
    ) -> Tuple[bool, str]:
        """Test federation stability against scenario"""
        threat_levels = {
            StressScenario.HOSTILE_ENCOUNTER: 0.9,
            StressScenario.CULTURAL_CLASH: 0.6,
            StressScenario.REFUGEE_CRISIS: 0.7,
            StressScenario.RESOURCE_COMPETITION: 0.5,
            StressScenario.IDEOLOGICAL_CONFLICT: 0.6,
            StressScenario.TECHNOLOGICAL_DISRUPTION: 0.4,
        }

        threat = threat_levels.get(scenario, 0.5)

        # Federation survives if threat < 0.8
        survives = threat < 0.8

        message = (
            f"Federation stability under {scenario.value}: "
            f"{'STABLE' if survives else 'COMPROMISED'} (threat: {threat:.1%})"
        )

        return survives, message

    # ===== CONFEDERATION ANALYSIS =====

    def analyze_confederation_option(
        self, external_fleet_id: str
    ) -> Tuple[bool, str]:
        """Analyze if external fleet can join federation"""
        if external_fleet_id not in self.external_fleets:
            return False, "Fleet not found"

        fleet = self.external_fleets[external_fleet_id]

        # Criteria for confederation
        criteria_met = 0
        max_criteria = 5

        if fleet.cultural_compatibility > 0.6:
            criteria_met += 1
        if fleet.threat_assessment < 0.6:
            criteria_met += 1
        if fleet.governance_type in [
            GovernanceType.DEMOCRACY,
            GovernanceType.COLLECTIVE,
        ]:
            criteria_met += 1
        if fleet.population < 5000000:
            criteria_met += 1
        if fleet.technology_level in [
            TechnologyLevel.ADVANCED,
            TechnologyLevel.HIGHLY_ADVANCED,
        ]:
            criteria_met += 1

        can_join = criteria_met >= 3
        recommendation = (
            f"RECOMMEND CONFEDERATION ({criteria_met}/{max_criteria} criteria met)"
            if can_join
            else f"NOT RECOMMENDED ({criteria_met}/{max_criteria} criteria met)"
        )

        return can_join, recommendation

    # ===== STATUS REPORTING =====

    def get_first_contact_status(self) -> FirstContactStatus:
        """Get comprehensive first contact status"""
        formal_contact = [
            f
            for f in self.external_fleets.values()
            if f.contact_status in [ContactStatus.CONTACTED, ContactStatus.FORMAL_RELATIONS]
        ]
        allied = [
            f
            for f in self.external_fleets.values()
            if f.contact_status == ContactStatus.ALLIED
        ]
        hostile = [
            f
            for f in self.external_fleets.values()
            if f.contact_status == ContactStatus.HOSTILE
        ]

        avg_threat = (
            sum(f.threat_assessment for f in self.external_fleets.values())
            / max(1, len(self.external_fleets))
            if self.external_fleets
            else 0.0
        )

        confederation_candidates = sum(
            1
            for f in self.external_fleets.values()
            if f.contact_status
            in [ContactStatus.FORMAL_RELATIONS, ContactStatus.ALLIED]
        )

        active_shocks = [s for s in self.cultural_shocks.values() if not s.resolved]

        # Federation stability under contact exposure
        stability = 1.0
        stability -= avg_threat * 0.3
        stability -= len(active_shocks) * 0.1
        stability = max(0.0, min(1.0, stability))

        return FirstContactStatus(
            external_fleets_detected=len(self.external_fleets),
            formal_contact_established=len(formal_contact),
            allied_fleets=len(allied),
            hostile_fleets=len(hostile),
            total_threat_assessment=avg_threat,
            confederation_candidates=confederation_candidates,
            active_cultural_shocks=len(active_shocks),
            federation_stability_under_contact=stability,
        )
