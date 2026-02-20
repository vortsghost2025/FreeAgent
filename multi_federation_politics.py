"""
FEDERATION GAME - Phase X: Multi-Federation Politics
Federation-level diplomacy, summits, and cross-confederation politics
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Set, Tuple
from datetime import datetime, timedelta
import json
import asyncio
import random
import uuid

from political_system import (
    PoliticalSystem, PoliticalActor, Relationship, DiplomaticEvent,
    Treaty, WarDeclaration, TradeMood, EspionageOperation,
    FactionTrait, Ideology, TraitType, TreatyType, FactionAlignment,
    IdeologyAxis, DiplomaticEventType, RelationshipStatus
)


# ============================================================================
# ENUMS
# ============================================================================

class SummitType(Enum):
    """Types of political summits"""
    PEACE_SUMMIT = "peace_summit"
    TRADE_SUMMIT = "trade_summit"
    MILITARY_ALLIANCE = "military_alliance"
    FEDERATION_COUNCIL = "federation_council"
    ECONOMIC_FORUM = "economic_forum"
    CULTURAL_EXCHANGE = "cultural_exchange"


class VotingSystem(Enum):
    """Federation voting systems"""
    UNANIMOUS = "unanimous"
    SUPERMAJORITY = "supermajority"
    SIMPLE_MAJORITY = "simple_majority"
    WEIGHTED = "weighted"
    CONSENSUS = "consensus"


class ResolutionType(Enum):
    """Types of federation resolutions"""
    TRADE_REGULATION = "trade_regulation"
    MILITARY_INTERVENTION = "military_intervention"
    DISPUTE_SETTLEMENT = "dispute_settlement"
    SANCTIONS = "sanctions"
    RESOURCE_ALLOCATION = "resource_allocation"
    EXPANSION_APPROVAL = "expansion_approval"


class ConflictEscalation(Enum):
    """Levels of conflict escalation"""
    DIPLOMATIC_INCIDENT = 1
    FORMAL_PROTEST = 2
    SANCTIONS = 3
    MILITARY_POSTURING = 4
    LIMITED_WARFARE = 5
    FULL_WAR = 6


# ============================================================================
# DATACLASSES
# ============================================================================

@dataclass
class FederationMember:
    """A confederation as a member of a larger federation"""
    confederation_id: str
    confederation_name: str
    political_system: PoliticalSystem
    member_since_turn: int
    voting_power: float = 1.0  # Weight in voting (1.0 = standard)
    contribution_level: float = 0.5  # 0.0-1.0, resources invested
    alignment_score: float = 0.0  # -1.0 to 1.0, alignment with federation ideology


@dataclass
class PoliticalSummit:
    """A summit meeting of multiple factions/confederations"""
    summit_id: str
    summit_type: SummitType
    host_confederation_id: str
    participants: Set[str]  # Faction/confederation IDs
    start_turn: int
    duration_turns: int
    objectives: List[str]
    proposed_resolutions: List['FederalResolution'] = field(default_factory=list)
    agreements_reached: List[Dict] = field(default_factory=list)
    failed_negotiations: List[str] = field(default_factory=list)
    summit_status: str = "planning"  # planning, ongoing, concluded
    joint_declaration: Optional[str] = None

    def get_approval_status(self) -> Dict:
        """Get approval status of resolutions"""
        return {
            "total_resolutions": len(self.proposed_resolutions),
            "passed": len(self.agreements_reached),
            "failed": len(self.failed_negotiations)
        }


@dataclass
class FederalResolution:
    """A resolution proposed in federation"""
    resolution_id: str
    resolution_type: ResolutionType
    proposing_faction_id: str
    target_faction_id: Optional[str]
    content: str
    voting_system: VotingSystem
    support_votes: Dict[str, bool] = field(default_factory=dict)  # faction_id -> bool
    required_threshold: float = 0.6
    status: str = "proposed"  # proposed, voting, passed, failed, vetoed
    proposed_turn: int = 0
    passed_turn: Optional[int] = None


@dataclass
class FederationPolicy:
    """A federation-wide policy"""
    policy_id: str
    policy_name: str
    description: str
    policy_type: str
    enforcement_level: float = 0.5  # How strictly enforced (0.0-1.0)
    affected_factions: Set[str] = field(default_factory=set)
    benefits: Dict[str, float] = field(default_factory=dict)
    penalties: Dict[str, float] = field(default_factory=dict)
    active: bool = True
    created_turn: int = 1


@dataclass
class EconomicIntegration:
    """Economic integration between confederations"""
    integration_id: str
    confederations: List[str]
    joint_projects: Dict[str, Dict] = field(default_factory=dict)
    shared_resources: Dict[str, float] = field(default_factory=dict)
    trade_efficiency: float = 1.0
    gdp_contribution: Dict[str, float] = field(default_factory=dict)
    level: int = 0  # 0-5: minimal to total integration


@dataclass
class InfluenceNetwork:
    """Network of political influence"""
    network_id: str
    primary_faction_id: str
    influenced_factions: Dict[str, float] = field(default_factory=dict)  # faction_id -> influence (0.0-1.0)
    leverage_points: List[str] = field(default_factory=list)
    propaganda_effectiveness: float = 0.5
    information_control: float = 0.3


# ============================================================================
# FEDERATION DIPLOMACY CLASS
# ============================================================================

class FederationDiplomacy:
    """Manages federation-wide diplomatic events and multi-faction politics"""

    def __init__(self, federation_name: str = "The Federation", current_turn: int = 1):
        self.federation_name = federation_name
        self.current_turn = current_turn

        # Confederation management
        self.confederations: Dict[str, FederationMember] = {}
        self.federation_charter: Dict[str, any] = {}

        # Political structures
        self.active_summits: Dict[str, PoliticalSummit] = {}
        self.all_resolutions: Dict[str, FederalResolution] = {}
        self.federation_policies: Dict[str, FederationPolicy] = {}
        self.conflicts: List[Tuple[str, str, str]] = []  # (turn, flavor, details)

        # Economic
        self.economic_integrations: Dict[str, EconomicIntegration] = {}
        self.trade_pacts: List[Dict] = []

        # Influence and control
        self.influence_networks: Dict[str, InfluenceNetwork] = {}
        self.propaganda_campaigns: List[Dict] = []

        # Democracy and voting
        self.voting_records: List[Dict] = []
        self.parliamentary_sessions: List[Dict] = []

        # Federation-wide state
        self.federation_ideology: Optional[Ideology] = None
        self.stability_rating: float = 0.7
        self.legitimacy: float = 0.6
        self.federation_cohesion: float = 0.5

    def add_confederation(self, member: FederationMember) -> bool:
        """Add a confederation as a federation member"""
        if member.confederation_id in self.confederations:
            return False

        self.confederations[member.confederation_id] = member
        return True

    def call_summit(
        self,
        summit_type: SummitType,
        host_confederation_id: str,
        participants: Set[str],
        objectives: List[str],
        duration_turns: int = 3
    ) -> PoliticalSummit:
        """Call a political summit"""
        summit = PoliticalSummit(
            summit_id=f"summit_{host_confederation_id}_{self.current_turn}",
            summit_type=summit_type,
            host_confederation_id=host_confederation_id,
            participants=participants,
            start_turn=self.current_turn,
            duration_turns=duration_turns,
            objectives=objectives
        )

        self.active_summits[summit.summit_id] = summit
        return summit

    def propose_resolution(
        self,
        resolution_type: ResolutionType,
        proposing_faction_id: str,
        content: str,
        voting_system: VotingSystem,
        target_faction_id: Optional[str] = None,
        required_threshold: float = 0.6
    ) -> FederalResolution:
        """Propose a federation resolution"""
        resolution = FederalResolution(
            resolution_id=f"res_{proposing_faction_id}_{self.current_turn}",
            resolution_type=resolution_type,
            proposing_faction_id=proposing_faction_id,
            target_faction_id=target_faction_id,
            content=content,
            voting_system=voting_system,
            required_threshold=required_threshold,
            proposed_turn=self.current_turn
        )

        self.all_resolutions[resolution.resolution_id] = resolution
        return resolution

    def vote_on_resolution(
        self,
        resolution_id: str,
        voter_confederation_id: str,
        support: bool
    ) -> bool:
        """Vote on a resolution"""
        resolution = self.all_resolutions.get(resolution_id)
        if not resolution:
            return False

        resolution.support_votes[voter_confederation_id] = support
        return True

    def tally_resolution_votes(self, resolution_id: str) -> Tuple[bool, Dict]:
        """Tally votes and determine resolution outcome"""
        resolution = self.all_resolutions.get(resolution_id)
        if not resolution:
            return False, {}

        votes_for = sum(1 for v in resolution.support_votes.values() if v)
        total_votes = len(resolution.support_votes)

        if total_votes == 0:
            return False, {"votes_for": 0, "total": 0, "percentage": 0.0}

        percentage = votes_for / total_votes

        if resolution.voting_system == VotingSystem.UNANIMOUS:
            passed = percentage == 1.0
        elif resolution.voting_system == VotingSystem.SUPERMAJORITY:
            passed = percentage >= 0.667
        elif resolution.voting_system == VotingSystem.SIMPLE_MAJORITY:
            passed = percentage >= 0.5
        else:
            passed = percentage >= resolution.required_threshold

        resolution.status = "passed" if passed else "failed"
        if passed:
            resolution.passed_turn = self.current_turn

        return passed, {
            "votes_for": votes_for,
            "total": total_votes,
            "percentage": percentage,
            "passed": passed
        }

    def negotiate_peace(
        self,
        faction_a_id: str,
        faction_b_id: str,
        mediator_faction_id: Optional[str] = None
    ) -> Tuple[bool, Dict]:
        """Attempt to negotiate peace between warring factions"""
        confederation_a = self.confederations.get(faction_a_id)
        confederation_b = self.confederations.get(faction_b_id)

        if not confederation_a or not confederation_b:
            return False, {"error": "Confederations not found"}

        political_system_a = confederation_a.political_system
        political_system_b = confederation_b.political_system

        actor_a = political_system_a.actors.get(faction_a_id)
        actor_b = political_system_b.actors.get(faction_b_id)

        if not actor_a or not actor_b:
            return False, {"error": "Political actors not found"}

        # Calculate peace likelihood
        ideology_compat = actor_a.ideology.compatibility(actor_b.ideology)
        military_balance = abs(actor_a.military_strength - actor_b.military_strength) / max(1, actor_a.military_strength)
        economic_incentive = (actor_a.calculate_economic_weight() + actor_b.calculate_economic_weight()) / 2.0

        mediator_bonus = 0.0
        if mediator_faction_id:
            mediator = political_system_a.actors.get(mediator_faction_id)
            if mediator:
                mediator_bonus = mediator.calculate_diplomatic_weight() * 0.3

        peace_chance = (ideology_compat * 0.3 + (1.0 - military_balance) * 0.2 + economic_incentive * 0.3 + mediator_bonus)

        success = random.random() < peace_chance

        result = {
            "success": success,
            "ideology_compatibility": ideology_compat,
            "military_balance_diff": military_balance,
            "economic_incentive": economic_incentive,
            "mediator_bonus": mediator_bonus,
            "peace_chance": peace_chance
        }

        if success:
            # Create peace treaty
            treaty = Treaty(
                treaty_id=f"peace_{faction_a_id}_{faction_b_id}_{self.current_turn}",
                treaty_type=TreatyType.PEACE,
                signatory_factions=[faction_a_id, faction_b_id],
                start_turn=self.current_turn,
                duration_turns=50
            )

            political_system_a.sign_treaty(treaty)

            # Update relationship
            rel = actor_a.relationships.get(faction_b_id)
            if rel:
                rel.hostility_level = 0
                rel.reputation_score += 0.2

        return success, result

    def create_trade_bloc(
        self,
        confederations: Set[str],
        bloc_name: str,
        efficiency_bonus: float = 0.15
    ) -> EconomicIntegration:
        """Create an economic trade bloc"""
        integration = EconomicIntegration(
            integration_id=f"bloc_{bloc_name}_{self.current_turn}",
            confederations=list(confederations),
            trade_efficiency=1.0 + efficiency_bonus,
            level=2
        )

        self.economic_integrations[integration.integration_id] = integration

        for conf_id in confederations:
            conf = self.confederations.get(conf_id)
            if conf:
                conf.contribution_level += 0.1

        return integration

    def apply_sanctions(
        self,
        target_faction_id: str,
        sanctioning_factions: Set[str],
        severity: float = 0.5,
        duration_turns: int = 20
    ) -> Dict:
        """Apply economic or military sanctions"""
        sanctions = {
            "target_faction": target_faction_id,
            "sanctioning_factions": sanctioning_factions,
            "severity": severity,
            "start_turn": self.current_turn,
            "duration_turns": duration_turns,
            "economic_impact": severity * 0.3,
            "military_impact": severity * 0.2,
            "diplomatic_impact": severity * 0.5
        }

        target_conf = self.confederations.get(target_faction_id)
        if target_conf:
            for actor in target_conf.political_system.actors.values():
                actor.treasury *= (1.0 - sanctions["economic_impact"])
                actor.military_strength *= (1.0 - sanctions["military_impact"])

        return sanctions

    def establish_influence_network(
        self,
        primary_faction_id: str,
        targets: Dict[str, float],  # faction_id -> target_influence
        leverage_points: Optional[List[str]] = None
    ) -> InfluenceNetwork:
        """Establish influence network for faction"""
        network = InfluenceNetwork(
            network_id=f"influence_{primary_faction_id}_{self.current_turn}",
            primary_faction_id=primary_faction_id,
            influenced_factions=targets,
            leverage_points=leverage_points or []
        )

        self.influence_networks[network.network_id] = network
        return network

    def resolve_territorial_dispute(
        self,
        dispute_id: str,
        resolution_method: str,
        awarded_to_faction: Optional[str] = None
    ) -> Dict:
        """Resolve a territorial dispute"""
        resolution = {
            "dispute_id": dispute_id,
            "resolution_method": resolution_method,
            "awarded_to": awarded_to_faction,
            "resolved_turn": self.current_turn,
            "status": "resolved"
        }

        return resolution

    def calculate_federation_alignment(self) -> float:
        """Calculate federation's overall alignment axis"""
        if not self.confederations:
            return 0.0

        total_alignment = 0.0
        for conf in self.confederations.values():
            for actor in conf.political_system.actors.values():
                if actor.ideology.alignment == FactionAlignment.AUTHORITARIAN:
                    total_alignment += 1.0
                elif actor.ideology.alignment == FactionAlignment.LIBERTARIAN:
                    total_alignment -= 1.0

        return total_alignment / len(self.confederations)

    def update_federation_stability(self) -> float:
        """Update and return federation stability"""
        if not self.confederations:
            self.stability_rating = 0.7
            return 0.7

        # Calculate based on internal confederations
        avg_internal_stability = 0.0
        for conf in self.confederations.values():
            avg_internal_stability += conf.political_system.get_global_stability()

        avg_internal_stability /= len(self.confederations)

        # Calculate inter-confederation tensions
        inter_conf_tension = 0.0
        for conf_a in self.confederations.values():
            for actor_a in conf_a.political_system.actors.values():
                for other_conf_id, other_conf in self.confederations.items():
                    if conf_a.confederation_id != other_conf_id:
                        for actor_b in other_conf.political_system.actors.values():
                            rel = actor_a.relationships.get(actor_b.faction_id)
                            if rel:
                                inter_conf_tension += rel.hostility_level / 5.0

        inter_conf_tension = inter_conf_tension / max(1, len(self.confederations) * 2)

        # Final stability
        self.stability_rating = (avg_internal_stability * 0.6 + (1.0 - inter_conf_tension) * 0.4)
        self.stability_rating = max(0.0, min(1.0, self.stability_rating))

        return self.stability_rating

    async def advance_turn(self) -> None:
        """Advance federation diplomacy by one turn"""
        self.current_turn += 1

        # Process all confederations
        for conf in self.confederations.values():
            await conf.political_system.advance_turn()

        # Update summit statuses
        for summit in list(self.active_summits.values()):
            summit.duration_turns -= 1
            if summit.duration_turns <= 0:
                summit.summit_status = "concluded"

        # Update federation stability
        self.update_federation_stability()

        # Process policies
        for policy in self.federation_policies.values():
            if policy.active:
                for faction_id in policy.affected_factions:
                    for conf in self.confederations.values():
                        actor = conf.political_system.actors.get(faction_id)
                        if actor and policy.penalties:
                            actor.treasury *= (1.0 - list(policy.penalties.values())[0])

    def get_federation_report(self) -> Dict:
        """Generate comprehensive federation report"""
        return {
            "federation_name": self.federation_name,
            "current_turn": self.current_turn,
            "member_confederations": len(self.confederations),
            "stability_rating": self.stability_rating,
            "legitimacy": self.legitimacy,
            "cohesion": self.federation_cohesion,
            "alignment": "authoritarian" if self.calculate_federation_alignment() > 0 else "libertarian",
            "active_summits": len(self.active_summits),
            "pending_resolutions": len([r for r in self.all_resolutions.values() if r.status == "proposed"]),
            "active_policies": len([p for p in self.federation_policies.values() if p.active]),
            "economic_integrations": len(self.economic_integrations),
            "average_member_alignment": sum(c.alignment_score for c in self.confederations.values()) / max(1, len(self.confederations))
        }

    def export_state(self) -> str:
        """Export federation state as JSON"""
        state = {
            "federation_name": self.federation_name,
            "current_turn": self.current_turn,
            "confederations": len(self.confederations),
            "stability": self.stability_rating,
            "legitimacy": self.legitimacy,
            "cohesion": self.federation_cohesion,
            "summits": len(self.active_summits),
            "resolutions": len(self.all_resolutions),
            "policies": len(self.federation_policies),
            "integrations": len(self.economic_integrations)
        }
        return json.dumps(state, indent=2)

    def get_federation_relations(self):
        """Return a summary of all federation relations."""
        return {f.name: {other.name: self.system.states[f].get_relation(other) for other in Federation if other != f} for f in Federation}
