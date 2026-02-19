#!/usr/bin/env python3
"""
PHASE XIV - DIPLOMATIC ENGINE
Manages treaties, alliances, negotiations, ideological blocs, and bilateral relations.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from enum import Enum


class TreatyStatus(Enum):
    PROPOSED = "proposed"
    NEGOTIATING = "negotiating"
    RATIFIED = "ratified"
    SUSPENDED = "suspended"
    EXPIRED = "expired"
    TERMINATED = "terminated"


class TreatyType(Enum):
    MUTUAL_DEFENSE = "mutual_defense"
    TRADE = "trade"
    KNOWLEDGE_SHARING = "knowledge_sharing"
    NON_AGGRESSION = "non_aggression"
    ALLIANCE = "alliance"


class IdeologyType(Enum):
    ULTRA_CONSERVATIVE = "ultra_conservative"
    CONSERVATIVE = "conservative"
    MODERATE = "moderate"
    PROGRESSIVE = "progressive"
    EXPANSIONIST = "expansionist"


class DiplomaticStance(Enum):
    ALLIED = "allied"
    FRIENDLY = "friendly"
    NEUTRAL = "neutral"
    WARY = "wary"
    HOSTILE = "hostile"


@dataclass
class Treaty:
    treaty_id: str
    name: str
    treaty_type: TreatyType
    parties: List[str]  # Fleet/ship names
    status: TreatyStatus
    clauses: List[str]
    enforcement_mechanism: str
    creation_timestamp: float
    expiration_timestamp: Optional[float] = None
    ratification_date: Optional[float] = None


@dataclass
class Alliance:
    alliance_id: str
    name: str
    members: List[str]  # Ship/fleet names
    ideology: IdeologyType
    purpose: str
    strength: float  # 0.0-1.0
    stability: float  # 0.0-1.0
    creation_timestamp: float


@dataclass
class IdeologicalBloc:
    bloc_id: str
    name: str
    ideology: IdeologyType
    members: List[str]
    core_beliefs: List[str]
    recruitment_stance: str  # ACTIVE, SELECTIVE, CLOSED
    creation_timestamp: float


@dataclass
class DiplomaticRelation:
    relation_id: str
    fleet_a: str
    fleet_b: str
    stance: DiplomaticStance
    trust_level: float  # 0.0-1.0
    shared_treaties: List[str]
    incidents: List[str] = field(default_factory=list)
    last_interaction: Optional[float] = None


@dataclass
class Negotiation:
    negotiation_id: str
    initiator: str
    target: str
    proposal_type: str  # TREATY, ALLIANCE, TRADE, etc.
    offers: List[Dict] = field(default_factory=list)
    status: str = "INITIATED"  # INITIATED, COUNTERED, ACCEPTED, DECLINED
    creation_timestamp: float = field(default_factory=lambda: datetime.now().timestamp())


@dataclass
class DiplomaticCrisis:
    crisis_id: str
    name: str
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL
    involved_fleets: List[str]
    trigger_event: str
    escalation_level: int
    protocols_invoked: List[str] = field(default_factory=list)


@dataclass
class Sovereignty:
    sovereignty_id: str
    fleet_name: str
    governance_type: str
    territory_control: List[str]
    recognized_by: List[str] = field(default_factory=list)
    registration_timestamp: float = field(default_factory=lambda: datetime.now().timestamp())


@dataclass
class DiplomaticStatus:
    active_treaties: int
    treaty_types: Dict[str, int]
    active_alliances: int
    ideological_blocs: int
    bilateral_relations: int
    active_negotiations: int
    active_crises: int
    registered_sovereignties: int
    overall_stability: float


class DiplomaticEngine:
    """Central coordinator for all diplomatic operations"""

    def __init__(self):
        self.treaties: Dict[str, Treaty] = {}
        self.alliances: Dict[str, Alliance] = {}
        self.ideological_blocs: Dict[str, IdeologicalBloc] = {}
        self.relations: Dict[str, DiplomaticRelation] = {}
        self.negotiations: Dict[str, Negotiation] = {}
        self.crises: Dict[str, DiplomaticCrisis] = {}
        self.sovereignties: Dict[str, Sovereignty] = {}
        self._id_counters = {
            "treaty": 0,
            "alliance": 0,
            "bloc": 0,
            "relation": 0,
            "negotiation": 0,
            "crisis": 0,
            "sovereignty": 0,
        }

    def _generate_id(self, entity_type: str) -> str:
        self._id_counters[entity_type] += 1
        return f"{entity_type}_{self._id_counters[entity_type]:03d}"

    # ===== TREATY OPERATIONS =====

    def propose_treaty(
        self,
        name: str,
        treaty_type: TreatyType,
        parties: List[str],
        clauses: List[str],
        enforcement: str,
        expiration_ticks: Optional[int] = None,
    ) -> Treaty:
        """Propose a new treaty"""
        treaty_id = self._generate_id("treaty")
        creation_ts = datetime.now().timestamp()
        expiration_ts = creation_ts + (expiration_ticks or 0) if expiration_ticks else None

        treaty = Treaty(
            treaty_id=treaty_id,
            name=name,
            treaty_type=treaty_type,
            parties=parties,
            status=TreatyStatus.PROPOSED,
            clauses=clauses,
            enforcement_mechanism=enforcement,
            creation_timestamp=creation_ts,
            expiration_timestamp=expiration_ts,
        )
        self.treaties[treaty_id] = treaty
        return treaty

    def ratify_treaty(self, treaty_id: str) -> Tuple[bool, Treaty]:
        """Ratify a proposed treaty"""
        if treaty_id not in self.treaties:
            return False, None

        treaty = self.treaties[treaty_id]
        treaty.status = TreatyStatus.RATIFIED
        treaty.ratification_date = datetime.now().timestamp()
        return True, treaty

    def terminate_treaty(self, treaty_id: str) -> Tuple[bool, Treaty]:
        """Terminate an active treaty"""
        if treaty_id not in self.treaties:
            return False, None

        treaty = self.treaties[treaty_id]
        treaty.status = TreatyStatus.TERMINATED
        return True, treaty

    def get_active_treaties(self) -> List[Treaty]:
        """Get all ratified treaties"""
        return [
            t
            for t in self.treaties.values()
            if t.status == TreatyStatus.RATIFIED
        ]

    # ===== ALLIANCE OPERATIONS =====

    def form_alliance(
        self,
        name: str,
        members: List[str],
        ideology: IdeologyType,
        purpose: str,
    ) -> Alliance:
        """Form a new alliance"""
        alliance_id = self._generate_id("alliance")
        alliance = Alliance(
            alliance_id=alliance_id,
            name=name,
            members=members,
            ideology=ideology,
            purpose=purpose,
            strength=0.8,
            stability=0.7,
            creation_timestamp=datetime.now().timestamp(),
        )
        self.alliances[alliance_id] = alliance
        return alliance

    def dissolve_alliance(self, alliance_id: str) -> bool:
        """Dissolve an alliance"""
        if alliance_id in self.alliances:
            del self.alliances[alliance_id]
            return True
        return False

    def add_to_alliance(self, alliance_id: str, ship_name: str) -> bool:
        """Add ship to alliance"""
        if alliance_id not in self.alliances:
            return False

        alliance = self.alliances[alliance_id]
        if ship_name not in alliance.members:
            alliance.members.append(ship_name)
        return True

    def get_ship_alliances(self, ship_name: str) -> List[Alliance]:
        """Get all alliances a ship is part of"""
        return [
            a for a in self.alliances.values() if ship_name in a.members
        ]

    # ===== IDEOLOGICAL BLOC OPERATIONS =====

    def create_ideological_bloc(
        self,
        name: str,
        ideology: IdeologyType,
        core_beliefs: List[str],
        recruitment_stance: str = "SELECTIVE",
    ) -> IdeologicalBloc:
        """Create ideological bloc"""
        bloc_id = self._generate_id("bloc")
        bloc = IdeologicalBloc(
            bloc_id=bloc_id,
            name=name,
            ideology=ideology,
            members=[],
            core_beliefs=core_beliefs,
            recruitment_stance=recruitment_stance,
            creation_timestamp=datetime.now().timestamp(),
        )
        self.ideological_blocs[bloc_id] = bloc
        return bloc

    def recruit_to_bloc(self, bloc_id: str, ship_name: str) -> bool:
        """Recruit ship to ideological bloc"""
        if bloc_id not in self.ideological_blocs:
            return False

        bloc = self.ideological_blocs[bloc_id]
        if ship_name not in bloc.members:
            bloc.members.append(ship_name)
        return True

    def get_ship_ideology(self, ship_name: str) -> Optional[IdeologyType]:
        """Get ideology of ship if in bloc"""
        for bloc in self.ideological_blocs.values():
            if ship_name in bloc.members:
                return bloc.ideology
        return None

    # ===== BILATERAL RELATIONS =====

    def establish_relation(
        self,
        fleet_a: str,
        fleet_b: str,
        stance: DiplomaticStance = DiplomaticStance.NEUTRAL,
    ) -> DiplomaticRelation:
        """Establish bilateral diplomatic relation"""
        relation_id = self._generate_id("relation")
        relation = DiplomaticRelation(
            relation_id=relation_id,
            fleet_a=fleet_a,
            fleet_b=fleet_b,
            stance=stance,
            trust_level=0.5,
            shared_treaties=[],
            last_interaction=datetime.now().timestamp(),
        )
        self.relations[relation_id] = relation
        return relation

    def record_incident(
        self, relation_id: str, incident_description: str
    ) -> bool:
        """Record incident in bilateral relation"""
        if relation_id not in self.relations:
            return False

        self.relations[relation_id].incidents.append(incident_description)
        return True

    # ===== NEGOTIATIONS =====

    def initiate_negotiation(
        self,
        initiator: str,
        target: str,
        proposal_type: str,
    ) -> Negotiation:
        """Initiate negotiation between two fleets"""
        negotiation_id = self._generate_id("negotiation")
        negotiation = Negotiation(
            negotiation_id=negotiation_id,
            initiator=initiator,
            target=target,
            proposal_type=proposal_type,
            creation_timestamp=datetime.now().timestamp(),
        )
        self.negotiations[negotiation_id] = negotiation
        return negotiation

    def submit_offer(
        self, negotiation_id: str, offer: Dict
    ) -> bool:
        """Submit offer in negotiation"""
        if negotiation_id not in self.negotiations:
            return False

        self.negotiations[negotiation_id].offers.append(offer)
        self.negotiations[negotiation_id].status = "COUNTERED"
        return True

    def conclude_negotiation(
        self, negotiation_id: str, accepted: bool
    ) -> bool:
        """Conclude negotiation with acceptance or rejection"""
        if negotiation_id not in self.negotiations:
            return False

        negotiation = self.negotiations[negotiation_id]
        negotiation.status = "ACCEPTED" if accepted else "DECLINED"
        return True

    # ===== CRISIS MANAGEMENT =====

    def declare_crisis(
        self,
        name: str,
        severity: str,
        involved_fleets: List[str],
        trigger_event: str,
    ) -> DiplomaticCrisis:
        """Declare diplomatic crisis"""
        crisis_id = self._generate_id("crisis")
        crisis = DiplomaticCrisis(
            crisis_id=crisis_id,
            name=name,
            severity=severity,
            involved_fleets=involved_fleets,
            trigger_event=trigger_event,
            escalation_level=1,
        )
        self.crises[crisis_id] = crisis
        return crisis

    def get_crisis_protocol(self, severity: str) -> str:
        """Get crisis response protocol by severity"""
        protocols = {
            "LOW": "Diplomatic channels opened",
            "MEDIUM": "Emergency summit convened",
            "HIGH": "Military alert raised",
            "CRITICAL": "All systems mobilized",
        }
        return protocols.get(severity, "Unknown protocol")

    # ===== SOVEREIGNTY =====

    def register_sovereignty(
        self,
        fleet_name: str,
        governance_type: str,
        territory_control: List[str],
    ) -> Sovereignty:
        """Register sovereignty for fleet"""
        sovereignty_id = self._generate_id("sovereignty")
        sovereignty = Sovereignty(
            sovereignty_id=sovereignty_id,
            fleet_name=fleet_name,
            governance_type=governance_type,
            territory_control=territory_control,
        )
        self.sovereignties[sovereignty_id] = sovereignty
        return sovereignty

    def recognize_sovereignty(
        self, sovereignty_id: str, recognizing_fleet: str
    ) -> bool:
        """Record recognition of sovereignty by another fleet"""
        if sovereignty_id not in self.sovereignties:
            return False

        sovereignty = self.sovereignties[sovereignty_id]
        if recognizing_fleet not in sovereignty.recognized_by:
            sovereignty.recognized_by.append(recognizing_fleet)
        return True

    # ===== STATUS REPORTING =====

    def get_diplomatic_status(self) -> DiplomaticStatus:
        """Get comprehensive diplomatic status"""
        treaty_types_count = {}
        for treaty in self.treaties.values():
            if treaty.status == TreatyStatus.RATIFIED:
                key = treaty.treaty_type.value
                treaty_types_count[key] = treaty_types_count.get(key, 0) + 1

        active_crises = [
            c for c in self.crises.values() if c.severity in ["HIGH", "CRITICAL"]
        ]

        # Calculate overall stability (0.0-1.0)
        stability = 1.0
        stability -= len(active_crises) * 0.2
        stability -= len(self.crises) * 0.05
        stability = max(0.0, min(1.0, stability))

        return DiplomaticStatus(
            active_treaties=len(self.get_active_treaties()),
            treaty_types=treaty_types_count,
            active_alliances=len(self.alliances),
            ideological_blocs=len(self.ideological_blocs),
            bilateral_relations=len(self.relations),
            active_negotiations=len(
                [
                    n
                    for n in self.negotiations.values()
                    if n.status != "DECLINED"
                ]
            ),
            active_crises=len(active_crises),
            registered_sovereignties=len(self.sovereignties),
            overall_stability=stability,
        )
