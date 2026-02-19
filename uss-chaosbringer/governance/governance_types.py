#!/usr/bin/env python3
"""
Governance types, enums, and shared dataclasses for Phase X governance system.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from enum import Enum


# ===== ENUMS =====

class ProposalType(Enum):
    """Types of proposals that can be voted on"""
    LAW = "law"                                # Propose new law
    TREATY = "treaty"                          # Propose treaty
    AMENDMENT = "amendment"                    # Constitutional amendment
    ALLIANCE = "alliance"                      # Propose alliance
    RIVALRY = "rivalry"                        # Declare rivalry
    CULTURAL_INITIATIVE = "cultural_initiative" # Cultural shift proposal


class VoteType(Enum):
    """Types of votes"""
    SIMPLE_MAJORITY = "simple_majority"         # Needs >50%
    QUALIFIED_MAJORITY = "qualified_majority"   # Needs >66%
    CONSENSUS = "consensus"                     # Needs >90%
    UNANIMOUS = "unanimous"                     # Needs 100%


class LawType(Enum):
    """Categories of laws"""
    CONDUCT = "conduct"                        # Ship behavior rules
    REPORTING = "reporting"                    # Reporting requirements
    TIMELINE = "timeline"                      # Timeline integrity
    ANOMALY = "anomaly"                        # Anomaly handling
    CONTINUITY = "continuity"                  # Canon protection
    EMERGENCY = "emergency"                    # Emergency protocols


class FactionIdeology(Enum):
    """Ideologies for ship factions"""
    CULTURE_FIRST = "culture_first"            # Cultural Bloc (MythosWeaver)
    SCIENCE_FIRST = "science_first"            # Science Faction (AnomalyHunter)
    LAW_ORDER = "law_order"                    # Law & Order (ContinuityGuardian)
    PRAGMATISM = "pragmatism"                  # Pragmatist Coalition (default)


class ViolationSeverity(Enum):
    """Severity levels for law violations"""
    WARNING = "warning"
    CITATION = "citation"
    FINE = "fine"
    HEARING = "hearing"
    TRIAL = "trial"
    SANCTION = "sanction"


# ===== CONSTITUTIONAL SYSTEM =====

@dataclass
class ConstitutionalPrinciple:
    """Core principle of fleet governance"""
    principle_id: str
    name: str
    description: str
    ratified_timestamp: float
    supported_by: List[str] = field(default_factory=list)  # Ship names


@dataclass
class ConstitutionalRight:
    """Right granted to ships"""
    right_id: str
    name: str
    description: str
    applies_to: List[str] = field(default_factory=list)  # Ship names or "ALL"
    ratified_timestamp: float = field(default_factory=lambda: datetime.now().timestamp())


@dataclass
class ConstitutionalConstraint:
    """Constraint on ship power"""
    constraint_id: str
    name: str
    description: str
    affected_ships: List[str] = field(default_factory=list)
    ratified_timestamp: float = field(default_factory=lambda: datetime.now().timestamp())


@dataclass
class Amendment:
    """Proposed amendment to constitution"""
    amendment_id: str
    description: str
    proposed_by: str
    proposed_timestamp: float
    amendment_type: str  # "principle", "right", "constraint"
    status: str = "pending"  # pending, ratified, rejected
    vote_count_yes: int = 0
    vote_count_no: int = 0
    ratified_timestamp: Optional[float] = None


# ===== FACTION SYSTEM =====

@dataclass
class Faction:
    """A faction of ships with shared ideology"""
    faction_id: str
    name: str
    ideology: FactionIdeology
    description: str
    members: List[str] = field(default_factory=list)  # Ship names
    influence_score: float = 0.5  # 0.0-1.0
    created_timestamp: float = field(default_factory=lambda: datetime.now().timestamp())


@dataclass
class FactionAllegiance:
    """A ship's allegiance to a faction"""
    ship_name: str
    faction_id: str
    strength: float = 0.5  # 0.0-1.0, how committed is ship
    joined_timestamp: float = field(default_factory=lambda: datetime.now().timestamp())


# ===== DIPLOMACY SYSTEM =====

@dataclass
class Treaty:
    """A formal agreement between ships/factions"""
    treaty_id: str
    name: str
    description: str
    proposed_by: str
    proposed_timestamp: float
    signatories: List[str] = field(default_factory=list)  # Ship/faction names
    duration_days: int = 30
    expiration_timestamp: Optional[float] = None
    status: str = "proposed"  # proposed, ratified, active, expired, terminated
    terms: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Alliance:
    """Mutual defense and cooperation agreement"""
    alliance_id: str
    ship1: str
    ship2: str
    strength: float = 0.8  # 0.0-1.0
    formed_timestamp: float = field(default_factory=lambda: datetime.now().timestamp())
    mutual_defense: bool = True
    influence_pooling: bool = True


@dataclass
class Rivalry:
    """Explicit enmity between ships"""
    rivalry_id: str
    ship1: str
    ship2: str
    severity: float = 0.5  # 0.0-1.0
    reason: str = ""
    declared_timestamp: float = field(default_factory=lambda: datetime.now().timestamp())
    escalation_count: int = 0


@dataclass
class Proposal:
    """Formal proposal for governance vote"""
    proposal_id: str
    proposal_type: ProposalType
    description: str
    proposed_by: str
    proposed_timestamp: float
    content: Dict[str, Any]  # Actual proposal details
    vote_type: VoteType = VoteType.SIMPLE_MAJORITY
    status: str = "pending"  # pending, voting, ratified, rejected
    votes_yes: int = 0
    votes_no: int = 0
    votes_abstain: int = 0
    voting_ends_timestamp: Optional[float] = None
    executed_timestamp: Optional[float] = None


# ===== LAW ENGINE =====

@dataclass
class Law:
    """A law governing fleet behavior"""
    law_id: str
    name: str
    law_type: LawType
    rule_description: str
    enforcement_action: str  # What happens if violated
    penalty_description: str
    proposed_by: str
    proposed_timestamp: float
    ratified_timestamp: Optional[float] = None
    status: str = "proposed"  # proposed, ratified, active, repealed
    violation_count: int = 0


@dataclass
class LawViolation:
    """A recorded violation of a law"""
    violation_id: str
    law_id: str
    law_name: str
    violator: str  # Ship name
    violation_timestamp: float
    evidence: List[str] = field(default_factory=list)
    severity: ViolationSeverity = ViolationSeverity.WARNING
    description: str = ""
    status: str = "recorded"  # recorded, acknowledged, disputed, adjudicated


@dataclass
class LawEnforcement:
    """Action taken in response to law violation"""
    enforcement_id: str
    violation_id: str
    enforcer: str  # Ship that enforces
    action_timestamp: float
    action_type: str  # "warning", "citation", "hearing", "trial", "sanction"
    details: Dict[str, Any] = field(default_factory=dict)


# ===== GOVERNANCE VOTING =====

@dataclass
class GovernanceVote:
    """A single vote from a ship on a proposal"""
    vote_id: str
    proposal_id: str
    ship_name: str
    vote: str  # "yes", "no", "abstain"
    timestamp: float = field(default_factory=lambda: datetime.now().timestamp())
    reasoning: str = ""
    faction_alignment: float = 0.5  # How much faction influenced this vote


@dataclass
class GovernanceCycle:
    """A governance cycle execution result"""
    cycle_id: str
    cycle_number: int
    start_timestamp: float
    end_timestamp: Optional[float] = None
    proposals_submitted: int = 0
    proposals_ratified: int = 0
    proposals_rejected: int = 0
    violations_processed: int = 0
    violations_escalated: int = 0
    notes: List[str] = field(default_factory=list)
