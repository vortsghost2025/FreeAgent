#!/usr/bin/env python3
"""
PHASE XXXII - INTERSTELLAR DIPLOMACY FRAMEWORK
~380 LOC

Implements diplomatic negotiations with external civilizations.
Creates treaties, manages channels, negotiates terms, handles incidents.
PATH I: Outward Expansion - Federation engages in formal diplomacy.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Set
from datetime import datetime, timedelta
from enum import Enum


class DiplomaticStatus(Enum):
    """Status of diplomatic relations"""
    HOSTILE = "hostile"                    # Active conflict
    COLD_WAR = "cold_war"                  # Tense standoff
    NEUTRAL = "neutral"                    # No formal relations
    INFORMAL = "informal"                  # Unofficial contact
    NEGOTIATING = "negotiating"            # Active talks in progress
    ALLIED = "allied"                      # Formal alliance
    UNIFIED = "unified"                    # Deep integration


class IncidentSeverity(Enum):
    """Severity classification of diplomatic incidents"""
    MINOR = "minor"                        # Low-impact disagreement
    MODERATE = "moderate"                  # Significant but manageable
    SEVERE = "severe"                      # Major incident, risk of conflict
    CRITICAL = "critical"                  # Potential war-causing


class TreatyType(Enum):
    """Classification of treaty agreements"""
    NON_AGGRESSION = "non_aggression"       # Mutual peace pact
    TRADE = "trade"                         # Economic cooperation
    SCIENTIFIC = "scientific"               # Research collaboration
    MILITARY_ALLIANCE = "military_alliance" # Defense agreement
    TECHNOLOGY_TRANSFER = "tech_transfer"   # Knowledge sharing
    CULTURAL = "cultural"                   # Cultural exchange
    HYBRID = "hybrid"                       # Multi-faceted agreement


class DiplomaticChannelType(Enum):
    """Types of communication channels"""
    RADIO = "radio"                        # Electromagnetic broadcast
    QUANTUM = "quantum"                    # Quantum-entangled comm
    ENVOY = "envoy"                        # Direct representative
    FORMAL_EMBASSY = "formal_embassy"      # Permanent presence
    VIRTUAL = "virtual"                    # AI-mediated negotiation


@dataclass
class DiplomaticParty:
    """Represents a party to diplomatic engagement"""
    party_id: str
    civilization_name: str
    representative: str                     # Lead negotiator
    tech_level: str                         # Technology classification
    military_strength: float                # 0-1 relative capability
    cultural_alignment: float               # 0-1 shared values (0=opposite)
    historical_relations: List[str] = field(default_factory=list)


@dataclass
class TreatyTerm:
    """Individual term or condition within treaty"""
    term_id: str
    description: str
    type: str                               # e.g., "peace", "trade", "sharing"
    priority: int                           # 1-10, where 1 is critical
    duration_years: Optional[int] = None    # None = perpetual
    enforcement_mechanism: str = "mutual"   # How violations are handled
    verification_method: str = "inspection" # How compliance verified
    benefit_to_party_a: float = 0.5         # 0-1 (0 = all benefit B)
    status: str = "proposed"                # proposed, accepted, rejected


@dataclass
class InterstellarTreaty:
    """Formalized agreement between civilizations"""
    treaty_id: str
    treaty_type: TreatyType
    party_a: DiplomaticParty
    party_b: DiplomaticParty
    terms: List[TreatyTerm]                 # List of agreed terms

    # Status and lifecycle
    status: str                             # proposed, negotiating, ratified, active, suspended, dissolved
    created_timestamp: float = field(default_factory=lambda: datetime.now().timestamp())
    ratified_timestamp: Optional[float] = None
    effective_date: Optional[datetime] = None
    expiration_date: Optional[datetime] = None
    duration_years: Optional[int] = None

    # Metrics
    completion_percentage: float = 0.0      # % of negotiations complete
    party_a_satisfaction: float = 0.5       # 0-1 approval rating
    party_b_satisfaction: float = 0.5
    violation_count: int = 0                # Tracked breaches
    amendment_history: List[str] = field(default_factory=list)


@dataclass
class DiplomaticIncident:
    """Record of diplomatic disagreement or violation"""
    incident_id: str
    treaty_id: Optional[str]                # Parent treaty if applicable
    severity: IncidentSeverity
    initiating_party: str                   # Who caused incident
    timestamp: float
    description: str
    impact_level: float                     # 0-1 impact on relations
    resolved: bool = False
    resolution_details: Optional[str] = None
    resolution_timestamp: Optional[float] = None


@dataclass
class DiplomaticChannel:
    """Communication pathway between civilizations"""
    channel_id: str
    channel_type: DiplomaticChannelType
    party_a: str                            # Civilization ID
    party_b: str                            # Civilization ID

    # Operational status
    is_active: bool = True
    bandwidth: float = 1.0                  # 0-1 communication capacity
    latency_minutes: float = 0.0            # Delay in communication
    reliability: float = 0.95               # 0-1 signal reliability
    encryption_level: str = "standard"      # security classification

    # Traffic and metrics
    messages_sent: int = 0
    messages_received: int = 0
    connection_uptime_percentage: float = 100.0
    established_timestamp: float = field(default_factory=lambda: datetime.now().timestamp())
    last_activity: Optional[float] = None

    # Channel features
    supports_encryption: bool = True
    supports_streaming: bool = False
    emergency_protocol: bool = True

    metadata: Dict[str, any] = field(default_factory=dict)


@dataclass
class DiplomacyStatus:
    """Comprehensive report of diplomatic state"""
    total_civilizations: int
    total_treaties: int
    active_treaties: int
    active_negotiations: int
    active_channels: int
    hostile_relations: int
    neutral_relations: int
    allied_relations: int
    total_incidents: int
    unresolved_incidents: int
    critical_incidents: int
    channel_uptime_average: float
    framework_status: str                   # operational, stressed, critical


class InterstellarDiplomacyFramework:
    """
    Manages diplomatic relations between civilizations.
    Handles treaty negotiation, incident management, and channel operations.
    """

    def __init__(self):
        """Initialize diplomacy framework"""
        self.treaties: Dict[str, InterstellarTreaty] = {}
        self.channels: Dict[str, DiplomaticChannel] = {}
        self.incidents: Dict[str, DiplomaticIncident] = {}
        self.relations: Dict[Tuple[str, str], DiplomaticStatus] = {}

        self._id_counters = {
            "treaty": 0,
            "channel": 0,
            "incident": 0,
            "term": 0,
        }

        self.framework_active = True
        self.diplomatic_protocols_enabled = True
        self.framework_initialized = datetime.now()

    def _generate_id(self, entity_type: str) -> str:
        """Generate unique identifier"""
        self._id_counters[entity_type] += 1
        return f"{entity_type}_{self._id_counters[entity_type]:04d}"

    # ===== CHANNEL MANAGEMENT =====

    def initiate_diplomatic_channel(
        self,
        party_a: str,
        party_b: str,
        channel_type: DiplomaticChannelType = DiplomaticChannelType.RADIO,
        bandwidth: float = 1.0,
        emergency_protocol: bool = True,
    ) -> Dict[str, object]:
        """
        Open diplomatic communication channel between civilizations.

        Args:
            party_a: Initiating civilization
            party_b: Receiving civilization
            channel_type: Type of communication channel
            bandwidth: Communication capacity (0-1)
            emergency_protocol: Enable emergency contact capability

        Returns:
            Dict with channel creation details
        """
        if not party_a or not party_b:
            return {"success": False, "error": "Invalid parties"}

        if party_a == party_b:
            return {"success": False, "error": "Cannot establish channel with self"}

        if not (0 < bandwidth <= 1.0):
            bandwidth = 1.0

        channel_id = self._generate_id("channel")
        channel = DiplomaticChannel(
            channel_id=channel_id,
            channel_type=channel_type,
            party_a=party_a,
            party_b=party_b,
            bandwidth=bandwidth,
            emergency_protocol=emergency_protocol,
            is_active=True,
        )

        self.channels[channel_id] = channel

        return {
            "success": True,
            "channel_id": channel_id,
            "party_a": party_a,
            "party_b": party_b,
            "channel_type": channel_type.value,
            "bandwidth": bandwidth,
            "established_timestamp": channel.established_timestamp,
        }

    # ===== TREATY NEGOTIATION =====

    def propose_treaty(
        self,
        party_a: DiplomaticParty,
        party_b: DiplomaticParty,
        treaty_type: TreatyType,
        initial_terms: Optional[List[TreatyTerm]] = None,
    ) -> Dict[str, object]:
        """
        Initiate treaty negotiations between civilizations.

        Args:
            party_a: First party to treaty
            party_b: Second party to treaty
            treaty_type: Type of treaty being proposed
            initial_terms: Starting list of treaty terms

        Returns:
            Dict with treaty proposal details
        """
        if not party_a or not party_b:
            return {"success": False, "error": "Invalid parties"}

        if not isinstance(treaty_type, TreatyType):
            return {"success": False, "error": "Invalid treaty type"}

        treaty_id = self._generate_id("treaty")
        terms = initial_terms or []

        treaty = InterstellarTreaty(
            treaty_id=treaty_id,
            treaty_type=treaty_type,
            party_a=party_a,
            party_b=party_b,
            terms=terms,
            status="proposed",
            completion_percentage=0.0,
        )

        self.treaties[treaty_id] = treaty

        return {
            "success": True,
            "treaty_id": treaty_id,
            "treaty_type": treaty_type.value,
            "party_a": party_a.civilization_name,
            "party_b": party_b.civilization_name,
            "initial_terms": len(terms),
            "status": "proposed",
        }

    def negotiate_terms(
        self,
        treaty_id: str,
        new_terms: List[TreatyTerm],
        party_position: str,
    ) -> Dict[str, object]:
        """
        Add or modify treaty terms during negotiation.

        Args:
            treaty_id: Treaty under negotiation
            new_terms: Terms to propose
            party_position: "party_a" or "party_b" making proposal

        Returns:
            Dict with negotiation results
        """
        if treaty_id not in self.treaties:
            return {"success": False, "error": "Treaty not found"}

        treaty = self.treaties[treaty_id]

        if treaty.status not in ["proposed", "negotiating"]:
            return {"success": False, "error": f"Cannot negotiate {treaty.status} treaty"}

        # Add new terms
        for term in new_terms:
            if not term.term_id:
                term.term_id = self._generate_id("term")
            treaty.terms.append(term)

        # Update treaty status
        treaty.status = "negotiating"
        treaty.completion_percentage = min(100.0, len(treaty.terms) * 15.0)

        # Simulate negotiation impact on satisfaction
        if party_position == "party_a":
            treaty.party_a_satisfaction = min(1.0, treaty.party_a_satisfaction + 0.1)
            treaty.party_b_satisfaction = max(0.0, treaty.party_b_satisfaction - 0.05)
        else:
            treaty.party_b_satisfaction = min(1.0, treaty.party_b_satisfaction + 0.1)
            treaty.party_a_satisfaction = max(0.0, treaty.party_a_satisfaction - 0.05)

        return {
            "success": True,
            "treaty_id": treaty_id,
            "total_terms": len(treaty.terms),
            "completion_percentage": treaty.completion_percentage,
            "party_a_satisfaction": round(treaty.party_a_satisfaction, 2),
            "party_b_satisfaction": round(treaty.party_b_satisfaction, 2),
        }

    def ratify_treaty(self, treaty_id: str) -> Dict[str, object]:
        """
        Finalize and activate treaty agreement.

        Args:
            treaty_id: Treaty to ratify

        Returns:
            Dict with ratification details
        """
        if treaty_id not in self.treaties:
            return {"success": False, "error": "Treaty not found"}

        treaty = self.treaties[treaty_id]

        if len(treaty.terms) == 0:
            return {"success": False, "error": "Cannot ratify treaty with no terms"}

        # Both parties must have acceptable satisfaction levels
        if treaty.party_a_satisfaction < 0.4 or treaty.party_b_satisfaction < 0.4:
            return {
                "success": False,
                "error": "Party satisfaction too low for ratification",
            }

        treaty.status = "ratified"
        treaty.ratified_timestamp = datetime.now().timestamp()
        treaty.effective_date = datetime.now()

        if treaty.duration_years:
            treaty.expiration_date = datetime.now() + timedelta(days=365 * treaty.duration_years)

        treaty.completion_percentage = 100.0

        return {
            "success": True,
            "treaty_id": treaty_id,
            "status": "ratified",
            "ratified_timestamp": treaty.ratified_timestamp,
            "effective_date": treaty.effective_date.isoformat(),
            "terms_finalized": len(treaty.terms),
        }

    # ===== INCIDENT MANAGEMENT =====

    def handle_diplomatic_incident(
        self,
        treaty_id: Optional[str],
        severity: IncidentSeverity,
        initiating_party: str,
        description: str,
    ) -> Dict[str, object]:
        """
        Record and manage diplomatic incident.

        Args:
            treaty_id: Associated treaty (if any)
            severity: Severity classification
            initiating_party: Civilization causing incident
            description: Incident details

        Returns:
            Dict with incident management results
        """
        if not isinstance(severity, IncidentSeverity):
            return {"success": False, "error": "Invalid severity"}

        if not description:
            return {"success": False, "error": "Description required"}

        incident_id = self._generate_id("incident")

        impact_map = {
            IncidentSeverity.MINOR: 0.1,
            IncidentSeverity.MODERATE: 0.3,
            IncidentSeverity.SEVERE: 0.6,
            IncidentSeverity.CRITICAL: 0.9,
        }

        incident = DiplomaticIncident(
            incident_id=incident_id,
            treaty_id=treaty_id,
            severity=severity,
            initiating_party=initiating_party,
            timestamp=datetime.now().timestamp(),
            description=description,
            impact_level=impact_map[severity],
        )

        self.incidents[incident_id] = incident

        # Update associated treaty if needed
        if treaty_id and treaty_id in self.treaties:
            treaty = self.treaties[treaty_id]
            treaty.violation_count += 1

            # Reduce satisfaction based on severity
            satisfaction_impact = impact_map[severity] * 0.5
            if initiating_party == treaty.party_a.party_id:
                treaty.party_b_satisfaction = max(0.0, treaty.party_b_satisfaction - satisfaction_impact)
            else:
                treaty.party_a_satisfaction = max(0.0, treaty.party_a_satisfaction - satisfaction_impact)

        return {
            "success": True,
            "incident_id": incident_id,
            "severity": severity.value,
            "timestamp": incident.timestamp,
            "treaty_affected": treaty_id or "none",
        }

    def resolve_incident(
        self,
        incident_id: str,
        resolution: str,
    ) -> Dict[str, object]:
        """
        Mark incident as resolved.

        Args:
            incident_id: Incident to resolve
            resolution: Resolution details

        Returns:
            Dict with resolution details
        """
        if incident_id not in self.incidents:
            return {"success": False, "error": "Incident not found"}

        incident = self.incidents[incident_id]

        if incident.resolved:
            return {"success": False, "error": "Incident already resolved"}

        incident.resolved = True
        incident.resolution_details = resolution
        incident.resolution_timestamp = datetime.now().timestamp()

        return {
            "success": True,
            "incident_id": incident_id,
            "resolved": True,
            "resolution_timestamp": incident.resolution_timestamp,
        }

    # ===== STATUS REPORTING =====

    def get_diplomacy_status(self) -> DiplomacyStatus:
        """
        Generate comprehensive diplomatic status report.

        Returns:
            DiplomacyStatus object with current state
        """
        active_treaties = sum(1 for t in self.treaties.values() if t.status == "ratified")
        negotiating_treaties = sum(1 for t in self.treaties.values() if t.status == "negotiating")

        hostile_count = sum(1 for t in self.treaties.values() if t.status == "suspended")
        allied_count = sum(1 for t in self.treaties.values() if t.status == "active")

        unresolved_incidents = sum(1 for i in self.incidents.values() if not i.resolved)
        critical_incidents = sum(1 for i in self.incidents.values() if i.severity == IncidentSeverity.CRITICAL)

        channel_uptimes = [c.connection_uptime_percentage for c in self.channels.values()]
        avg_uptime = sum(channel_uptimes) / len(channel_uptimes) if channel_uptimes else 100.0

        # Determine framework status
        if critical_incidents > 0 or allied_count == 0:
            framework_status = "stressed"
        elif unresolved_incidents > 2:
            framework_status = "stressed"
        else:
            framework_status = "operational"

        return DiplomacyStatus(
            total_civilizations=len(set(
                t.party_a.civilization_name for t in self.treaties.values()
            ) | set(
                t.party_b.civilization_name for t in self.treaties.values()
            )),
            total_treaties=len(self.treaties),
            active_treaties=active_treaties,
            active_negotiations=negotiating_treaties,
            active_channels=sum(1 for c in self.channels.values() if c.is_active),
            hostile_relations=hostile_count,
            neutral_relations=len(self.treaties) - hostile_count - allied_count,
            allied_relations=allied_count,
            total_incidents=len(self.incidents),
            unresolved_incidents=unresolved_incidents,
            critical_incidents=critical_incidents,
            channel_uptime_average=avg_uptime,
            framework_status=framework_status,
        )
