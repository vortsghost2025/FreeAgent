"""
FEDERATION GAME - Phase X: Political System
Core political mechanics for multi-faction diplomacy, trade, and conflict
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Tuple, Set
from datetime import datetime, timedelta
import json
import random
import asyncio


# ============================================================================
# ENUMS
# ============================================================================

class FactionAlignment(Enum):
    """Primary alignment axis"""
    AUTHORITARIAN = "authoritarian"
    LIBERTARIAN = "libertarian"
    NEUTRAL = "neutral"


class IdeologyAxis(Enum):
    """Secondary ideology axis"""
    MILITARISTIC = "militaristic"
    PACIFIST = "pacifist"
    BALANCED = "balanced"


class TraitType(Enum):
    """Faction traits affecting gameplay"""
    AGGRESSIVE = "aggressive"
    DIPLOMATIC = "diplomatic"
    TOLERANT = "tolerant"
    STUBBORN = "stubborn"
    INNOVATIVE = "innovative"
    TRADITIONAL = "traditional"
    WEALTHY = "wealthy"
    POOR = "poor"
    MILITARISTIC = "militaristic"
    PEACEFUL = "peaceful"


class DiplomaticEventType(Enum):
    """Types of diplomatic events"""
    TRADE_REQUEST = "trade_request"
    ALLIANCE_PROPOSAL = "alliance_proposal"
    PEACE_TREATY = "peace_treaty"
    DECLARATION_OF_WAR = "declaration_of_war"
    INSULT = "insult"
    COMPLIMENT = "compliment"
    ESPIONAGE_DISCOVERED = "espionage_discovered"
    DEBT_SETTLEMENT = "debt_settlement"
    TERRITORY_DISPUTE = "territory_dispute"
    CULTURAL_EXCHANGE = "cultural_exchange"
    ECONOMIC_SANCTIONS = "economic_sanctions"
    SUMMIT_INVITATION = "summit_invitation"


class RelationshipStatus(Enum):
    """Status of relationship between factions"""
    ALLIED = "allied"
    PEACEFUL = "peaceful"
    NEUTRAL = "neutral"
    TENSE = "tense"
    HOSTILE = "hostile"
    WARRING = "warring"
    BETRAYED = "betrayed"


class TradeGood(Enum):
    """Types of goods that can be traded"""
    CREDITS = "credits"
    RESOURCES = "resources"
    TECHNOLOGY = "technology"
    CULTURE = "culture"
    MILITARY_SUPPLIES = "military_supplies"
    EXOTIC_RESOURCES = "exotic_resources"
    KNOWLEDGE = "knowledge"
    DIPLOMATIC_FAVOR = "diplomatic_favor"


class EspionageType(Enum):
    """Types of espionage operations"""
    SABOTAGE = "sabotage"
    INTELLIGENCE_GATHERING = "intelligence_gathering"
    BLACKMAIL = "blackmail"
    TECHNOLOGY_THEFT = "technology_theft"
    ASSASSINATION = "assassination"
    PROPAGANDA = "propaganda"


class WarDeclarationType(Enum):
    """Types of war declarations"""
    IMMEDIATE = "immediate"
    ULTIMATUM = "ultimatum"
    COLD_WAR = "cold_war"
    PROXY_WAR = "proxy_war"


class TreatyType(Enum):
    """Types of treaties"""
    PEACE = "peace"
    ALLIANCE = "alliance"
    ECONOMIC = "economic"
    MUTUAL_DEFENSE = "mutual_defense"
    NON_AGGRESSION = "non_aggression"
    TRADE = "trade"
    CULTURAL = "cultural"


# ============================================================================
# DATACLASSES
# ============================================================================

@dataclass
class FactionTrait:
    """A characteristic that defines faction behavior"""
    trait_id: str
    trait_type: TraitType
    description: str
    effect_on_diplomacy: float = 0.0  # -1.0 to 1.0
    effect_on_military: float = 0.0
    effect_on_trade: float = 0.0
    effect_on_reputation: float = 0.0

    def __hash__(self):
        return hash(self.trait_id)

    def __eq__(self, other):
        return isinstance(other, FactionTrait) and self.trait_id == other.trait_id


@dataclass
class Ideology:
    """Faction's core ideology"""
    alignment: FactionAlignment
    ideology_axis: IdeologyAxis
    conservatism_level: float  # 0.0-1.0, how resistant to change
    expansionism_level: float  # 0.0-1.0, desire for territory/influence
    justice_preference: str  # "authoritarian", "democratic", "anarchist"

    def compatibility(self, other: "Ideology") -> float:
        """Calculate compatibility with another ideology (0.0-1.0)"""
        alignment_match = 1.0 if self.alignment == other.alignment else 0.5
        axis_match = 1.0 if self.ideology_axis == other.ideology_axis else 0.5
        conservatism_diff = abs(self.conservatism_level - other.conservatism_level)
        expansion_diff = abs(self.expansionism_level - other.expansionism_level)

        return (alignment_match + axis_match) / 2.0 - (conservatism_diff + expansion_diff) / 4.0


@dataclass
class Relationship:
    """Relationship between two factions"""
    faction_a_id: str
    faction_b_id: str
    reputation_score: float = 0.0  # -1.0 to 1.0
    alliance_level: int = 0  # 0-5: None, Allied, Strongly Allied, Vassalized, etc.
    hostility_level: int = 0  # 0-5: None, Tense, Hostile, At War, Genocidal
    trade_volume: float = 0.0  # Resources exchanged per turn
    shared_enemies: Set[str] = field(default_factory=set)
    treaties: List[str] = field(default_factory=list)  # Treaty IDs
    last_diplomatic_event: Optional[datetime] = None
    debt_owed: Dict[str, float] = field(default_factory=dict)  # faction_id -> amount
    incidents: List[Tuple[datetime, str]] = field(default_factory=list)

    def get_status(self) -> RelationshipStatus:
        """Determine current relationship status"""
        if self.hostility_level >= 4:
            return RelationshipStatus.WARRING
        elif self.hostility_level >= 3:
            return RelationshipStatus.HOSTILE
        elif self.hostility_level >= 2:
            return RelationshipStatus.TENSE
        elif self.alliance_level >= 2:
            return RelationshipStatus.ALLIED
        elif self.alliance_level >= 1:
            return RelationshipStatus.PEACEFUL
        else:
            return RelationshipStatus.NEUTRAL


@dataclass
class DiplomaticEvent:
    """A diplomatic event between factions"""
    event_id: str
    event_type: DiplomaticEventType
    initiator_faction_id: str
    target_faction_id: str
    timestamp: datetime
    magnitude: float  # Impact magnitude 0.0-1.0
    description: str
    reputation_impact: float = 0.0
    response: Optional[str] = None
    resolved: bool = False
    resolution_turn: Optional[int] = None


@dataclass
class TradeAgreement:
    """A trade agreement between two factions"""
    agreement_id: str
    faction_a_id: str
    faction_b_id_id: str
    goods_a: Dict[TradeGood, float]  # What faction A offers
    goods_b: Dict[TradeGood, float]  # What faction B offers
    profit_margin: float = 0.1  # 0.1 = 10% profit
    duration_turns: int = 10
    turns_remaining: int = 10
    active: bool = True
    created_turn: int = 1

    def complete_trade(self) -> Tuple[Dict, Dict]:
        """Execute one turn of the trade agreement"""
        goods_exchanged_a = {good.value: amount for good, amount in self.goods_a.items()}
        goods_exchanged_b = {good.value: amount for good, amount in self.goods_b.items()}
        return goods_exchanged_a, goods_exchanged_b


@dataclass
class Treaty:
    """A formal treaty between factions"""
    treaty_id: str
    treaty_type: TreatyType
    signatory_factions: List[str]
    start_turn: int
    duration_turns: int
    terms: Dict[str, any] = field(default_factory=dict)
    benefits: Dict[str, Dict] = field(default_factory=dict)
    penalties_for_violation: Dict[str, float] = field(default_factory=dict)
    active: bool = True
    violations: List[Tuple[int, str]] = field(default_factory=list)  # (turn, violator_id)


@dataclass
class EspionageOperation:
    """Covert espionage operation"""
    operation_id: str
    operation_type: EspionageType
    initiator_faction_id: str
    target_faction_id: str
    start_turn: int
    duration_turns: int
    success_probability: float  # 0.0-1.0
    discovered: bool = False
    success: bool = False
    result: Optional[str] = None
    cost: Dict[str, float] = field(default_factory=dict)


@dataclass
class WarDeclaration:
    """Declaration of war"""
    war_id: str
    aggressor_faction_id: str
    defender_faction_id: str
    declaration_type: WarDeclarationType
    start_turn: int
    duration_turns: Optional[int] = None
    casus_belli: str = ""  # Reason for war
    war_objectives: List[str] = field(default_factory=list)
    casualties: Dict[str, int] = field(default_factory=dict)  # faction_id -> count
    territories_disputed: Set[str] = field(default_factory=set)
    active: bool = True
    ended_turn: Optional[int] = None


@dataclass
class TerritorialDispute:
    """Territorial dispute between factions"""
    dispute_id: str
    claimants: Set[str]  # Faction IDs claiming territory
    territory_name: str
    territory_coordinates: str
    value: float  # Economic/strategic value
    resolution_method: str  # "negotiation", "military", "arbitration"
    resolution_progress: float = 0.0  # 0.0-1.0
    active: bool = True


# ============================================================================
# POLITICAL ACTOR CLASS
# ============================================================================

class PoliticalActor:
    """Represents a faction as a political actor"""

    def __init__(
        self,
        faction_id: str,
        faction_name: str,
        ideology: Ideology,
        initial_power: float = 100.0
    ):
        self.faction_id = faction_id
        self.faction_name = faction_name
        self.ideology = ideology
        self.power = initial_power

        # Political relationships
        self.relationships: Dict[str, Relationship] = {}
        self.diplomatic_events: List[DiplomaticEvent] = []
        self.active_treaties: List[Treaty] = []
        self.trade_agreements: List[TradeAgreement] = []
        self.active_espionage: List[EspionageOperation] = []
        self.active_wars: List[WarDeclaration] = []
        self.territorial_disputes: List[TerritorialDispute] = []

        # Faction traits
        self.traits: List[FactionTrait] = []

        # Political capital
        self.political_capital: float = 100.0
        self.reputation: float = 0.0
        self.influence: float = 50.0
        self.prestige: float = 50.0

        # Resources
        self.treasury: float = 1000.0
        self.military_strength: float = 100.0
        self.technological_level: float = 1.0

        # Interests and goals
        self.short_term_goals: List[str] = []
        self.long_term_goals: List[str] = []
        self.rival_factions: Set[str] = set()
        self.aligned_factions: Set[str] = set()

        # History
        self.diplomatic_history: List[Tuple[int, str]] = []

    def add_trait(self, trait: FactionTrait) -> None:
        """Add a trait to this faction"""
        if trait not in self.traits:
            self.traits.append(trait)

    def calculate_diplomatic_weight(self) -> float:
        """Calculate faction's weight in diplomacy (0.0-1.0)"""
        base = (self.power / 200.0) + (self.influence / 100.0) + (self.prestige / 100.0)
        return min(1.0, base / 3.0)

    def calculate_military_weight(self) -> float:
        """Calculate faction's military threat level (0.0-1.0)"""
        return min(1.0, self.military_strength / 200.0)

    def calculate_economic_weight(self) -> float:
        """Calculate faction's economic power (0.0-1.0)"""
        return min(1.0, self.treasury / 2000.0)

    def get_relationship_with(self, other_faction_id: str) -> Optional[Relationship]:
        """Get relationship with another faction"""
        return self.relationships.get(other_faction_id)

    def get_war_status(self) -> Dict[str, any]:
        """Get current war status"""
        if not self.active_wars:
            return {"at_war": False, "wars": []}

        wars_info = []
        for war in self.active_wars:
            is_aggressor = war.aggressor_faction_id == self.faction_id
            wars_info.append({
                "war_id": war.war_id,
                "opponent": war.defender_faction_id if is_aggressor else war.aggressor_faction_id,
                "is_aggressor": is_aggressor,
                "casus_belli": war.casus_belli,
                "duration": war.duration_turns,
                "casualties": war.casualties.get(self.faction_id, 0)
            })

        return {"at_war": True, "wars": wars_info}

    def get_reputation_modifiers(self) -> Dict[str, float]:
        """Get reputation modifiers from traits"""
        modifiers = {}
        for trait in self.traits:
            if trait.effect_on_reputation != 0:
                modifiers[trait.trait_id] = trait.effect_on_reputation
        return modifiers

    def record_diplomatic_event(self, event: DiplomaticEvent) -> None:
        """Record a diplomatic event"""
        self.diplomatic_events.append(event)
        self.diplomatic_history.append((event.timestamp, event.description))


# ============================================================================
# POLITICAL SYSTEM CLASS
# ============================================================================

class PoliticalSystem:
    """Manages all political interactions between factions"""

    def __init__(self, current_turn: int = 1):
        self.current_turn = current_turn
        self.actors: Dict[str, PoliticalActor] = {}
        self.all_events: List[DiplomaticEvent] = []
        self.all_treaties: Dict[str, Treaty] = {}
        self.all_disputes: Dict[str, TerritorialDispute] = {}
        self.all_wars: Dict[str, WarDeclaration] = {}
        self.all_espionage: Dict[str, EspionageOperation] = {}
        self.political_log: List[Tuple[int, str]] = []

    def add_actor(self, actor: PoliticalActor) -> None:
        """Add a political actor to the system"""
        if actor.faction_id not in self.actors:
            self.actors[actor.faction_id] = actor

    def establish_relationship(
        self,
        faction_a_id: str,
        faction_b_id: str,
        initial_reputation: float = 0.0
    ) -> Relationship:
        """Establish a relationship between two factions"""
        if faction_a_id not in self.actors or faction_b_id not in self.actors:
            raise ValueError("One or both factions not found in system")

        relationship = Relationship(
            faction_a_id=faction_a_id,
            faction_b_id=faction_b_id,
            reputation_score=initial_reputation
        )

        self.actors[faction_a_id].relationships[faction_b_id] = relationship
        self.actors[faction_b_id].relationships[faction_a_id] = relationship

        return relationship

    def change_reputation(
        self,
        faction_a_id: str,
        faction_b_id: str,
        delta: float
    ) -> float:
        """Change reputation between two factions"""
        actor_a = self.actors.get(faction_a_id)
        actor_b = self.actors.get(faction_b_id)

        if not actor_a or not actor_b:
            return 0.0

        rel = actor_a.relationships.get(faction_b_id)
        if not rel:
            return 0.0

        old_rep = rel.reputation_score
        new_rep = max(-1.0, min(1.0, old_rep + delta))
        rel.reputation_score = new_rep

        # Also update the reverse relationship
        rel_reverse = actor_b.relationships.get(faction_a_id)
        if rel_reverse:
            rel_reverse.reputation_score = new_rep

        return new_rep

    def propose_alliance(
        self,
        initiator_faction_id: str,
        target_faction_id: str,
        terms: Optional[Dict] = None
    ) -> bool:
        """Propose an alliance between two factions"""
        event = DiplomaticEvent(
            event_id=f"alliance_{initiator_faction_id}_{target_faction_id}_{self.current_turn}",
            event_type=DiplomaticEventType.ALLIANCE_PROPOSAL,
            initiator_faction_id=initiator_faction_id,
            target_faction_id=target_faction_id,
            timestamp=datetime.now(),
            magnitude=0.5,
            description=f"{initiator_faction_id} proposes alliance with {target_faction_id}",
            reputation_impact=0.1
        )

        self.all_events.append(event)

        initiator = self.actors.get(initiator_faction_id)
        if initiator:
            initiator.record_diplomatic_event(event)
            self.political_log.append((self.current_turn, event.description))

        # Auto-accept if ideologically compatible
        initiator_actor = self.actors.get(initiator_faction_id)
        target_actor = self.actors.get(target_faction_id)

        if initiator_actor and target_actor:
            compatibility = initiator_actor.ideology.compatibility(target_actor.ideology)
            if compatibility > 0.6:
                return self.accept_alliance(initiator_faction_id, target_faction_id)

        return True

    def accept_alliance(
        self,
        faction_a_id: str,
        faction_b_id: str
    ) -> bool:
        """Accept an alliance proposal"""
        rel = self.actors[faction_a_id].relationships.get(faction_b_id)
        if not rel:
            return False

        rel.alliance_level = min(5, rel.alliance_level + 1)

        rel_reverse = self.actors[faction_b_id].relationships.get(faction_a_id)
        if rel_reverse:
            rel_reverse.alliance_level = rel.alliance_level

        self.political_log.append(
            (self.current_turn, f"Alliance formed between {faction_a_id} and {faction_b_id}")
        )

        return True

    def declare_war(
        self,
        aggressor_faction_id: str,
        defender_faction_id: str,
        casus_belli: str = "",
        declaration_type: WarDeclarationType = WarDeclarationType.IMMEDIATE,
        duration_turns: Optional[int] = None
    ) -> WarDeclaration:
        """Declare war between two factions"""
        war = WarDeclaration(
            war_id=f"war_{aggressor_faction_id}_{defender_faction_id}_{self.current_turn}",
            aggressor_faction_id=aggressor_faction_id,
            defender_faction_id=defender_faction_id,
            declaration_type=declaration_type,
            start_turn=self.current_turn,
            casus_belli=casus_belli,
            duration_turns=duration_turns or 20
        )

        self.all_wars[war.war_id] = war

        aggressor = self.actors.get(aggressor_faction_id)
        defender = self.actors.get(defender_faction_id)

        if aggressor:
            aggressor.active_wars.append(war)
        if defender:
            defender.active_wars.append(war)

        # Update relationship
        rel = aggressor.relationships.get(defender_faction_id) if aggressor else None
        if rel:
            rel.hostility_level = 5
            rel.reputation_score = -1.0

        self.political_log.append(
            (self.current_turn, f"War declared: {aggressor_faction_id} vs {defender_faction_id}")
        )

        return war

    def create_trade_agreement(
        self,
        faction_a_id: str,
        faction_b_id: str,
        goods_a: Dict[TradeGood, float],
        goods_b: Dict[TradeGood, float],
        duration_turns: int = 10,
        profit_margin: float = 0.1
    ) -> TradeAgreement:
        """Create a trade agreement between two factions"""
        agreement = TradeAgreement(
            agreement_id=f"trade_{faction_a_id}_{faction_b_id}_{self.current_turn}",
            faction_a_id=faction_a_id,
            faction_b_id_id=faction_b_id,
            goods_a=goods_a,
            goods_b=goods_b,
            duration_turns=duration_turns,
            turns_remaining=duration_turns,
            profit_margin=profit_margin,
            created_turn=self.current_turn
        )

        actor_a = self.actors.get(faction_a_id)
        actor_b = self.actors.get(faction_b_id)

        if actor_a:
            actor_a.trade_agreements.append(agreement)
        if actor_b:
            actor_b.trade_agreements.append(agreement)

        # Update relationship
        rel = actor_a.relationships.get(faction_b_id) if actor_a else None
        if rel:
            rel.trade_volume += sum(goods_a.values())

        return agreement

    def initiate_espionage(
        self,
        initiator_faction_id: str,
        target_faction_id: str,
        operation_type: EspionageType,
        duration_turns: int = 5,
        success_probability: float = 0.6
    ) -> EspionageOperation:
        """Initiate an espionage operation"""
        operation = EspionageOperation(
            operation_id=f"spies_{initiator_faction_id}_{target_faction_id}_{self.current_turn}",
            operation_type=operation_type,
            initiator_faction_id=initiator_faction_id,
            target_faction_id=target_faction_id,
            start_turn=self.current_turn,
            duration_turns=duration_turns,
            success_probability=success_probability
        )

        self.all_espionage[operation.operation_id] = operation

        initiator = self.actors.get(initiator_faction_id)
        if initiator:
            initiator.active_espionage.append(operation)

        return operation

    def discover_espionage(self, operation: EspionageOperation) -> bool:
        """Discover an espionage operation"""
        if random.random() < 0.3:  # 70% chance to remain undiscovered
            return False

        operation.discovered = True

        target = self.actors.get(operation.target_faction_id)
        initiator = self.actors.get(operation.initiator_faction_id)

        if target and initiator:
            rel = target.relationships.get(operation.initiator_faction_id)
            if rel:
                rel.reputation_score -= 0.3
                rel.hostility_level = min(5, rel.hostility_level + 2)
                rel.incidents.append((datetime.now(), f"Espionage discovered: {operation.operation_type.value}"))

        self.political_log.append(
            (self.current_turn, f"Espionage discovered: {operation.initiator_faction_id} spying on {operation.target_faction_id}")
        )

        return True

    def sign_treaty(
        self,
        treaty: Treaty
    ) -> bool:
        """Sign a formal treaty"""
        self.all_treaties[treaty.treaty_id] = treaty

        for faction_id in treaty.signatory_factions:
            actor = self.actors.get(faction_id)
            if actor:
                actor.active_treaties.append(treaty)

        self.political_log.append(
            (self.current_turn, f"Treaty signed: {treaty.treaty_type.value} between {', '.join(treaty.signatory_factions)}")
        )

        return True

    def create_territorial_dispute(
        self,
        claimants: Set[str],
        territory_name: str,
        territory_coordinates: str,
        value: float = 50.0,
        resolution_method: str = "negotiation"
    ) -> TerritorialDispute:
        """Create a territorial dispute"""
        dispute = TerritorialDispute(
            dispute_id=f"dispute_{territory_name}_{self.current_turn}",
            claimants=claimants,
            territory_name=territory_name,
            territory_coordinates=territory_coordinates,
            value=value,
            resolution_method=resolution_method
        )

        self.all_disputes[dispute.dispute_id] = dispute

        return dispute

    async def advance_turn(self) -> None:
        """Advance political system by one turn"""
        self.current_turn += 1

        # Process trade agreements
        for actor in self.actors.values():
            for agreement in actor.trade_agreements:
                if agreement.turns_remaining > 0:
                    agreement.turns_remaining -= 1
                    if agreement.turns_remaining == 0:
                        agreement.active = False

        # Process treaties
        for treaty in self.all_treaties.values():
            if treaty.active:
                treaty.duration_turns -= 1
                if treaty.duration_turns <= 0:
                    treaty.active = False

        # Process wars
        for war in self.all_wars.values():
            if war.active:
                if war.duration_turns:
                    war.duration_turns -= 1
                    if war.duration_turns <= 0:
                        war.active = False
                        war.ended_turn = self.current_turn

        # Process espionage
        for operation in self.all_espionage.values():
            if operation.duration_turns > 0:
                operation.duration_turns -= 1
                if operation.duration_turns <= 0:
                    operation.success = random.random() < operation.success_probability
                    if operation.success:
                        self.discover_espionage(operation)

    def get_global_stability(self) -> float:
        """Calculate global stability (0.0-1.0, 1.0 = perfect peace)"""
        if not self.actors:
            return 1.0

        instability = 0.0
        for actor in self.actors.values():
            for rel in actor.relationships.values():
                instability += rel.hostility_level / 5.0
                instability += max(0, -rel.reputation_score)

        return max(0.0, 1.0 - (instability / (len(self.actors) * 5)))

    def get_relations_summary(self) -> Dict:
        """Get summary of all relationships"""
        summary = {}
        for faction_id, actor in self.actors.items():
            summary[faction_id] = {
                "reputation": actor.reputation,
                "influence": actor.influence,
                "prestige": actor.prestige,
                "at_war": len(actor.active_wars) > 0,
                "alliances": len([r for r in actor.relationships.values() if r.alliance_level > 0]),
                "treaties": len(actor.active_treaties)
            }
        return summary

    def export_state(self) -> Dict:
        """Export political system state"""
        return {
            "current_turn": self.current_turn,
            "global_stability": self.get_global_stability(),
            "actors": len(self.actors),
            "active_wars": len([w for w in self.all_wars.values() if w.active]),
            "active_treaties": len([t for t in self.all_treaties.values() if t.active]),
            "active_disputes": len([d for d in self.all_disputes.values() if d.active]),
            "diplomatic_events": len(self.all_events),
            "relations_summary": self.get_relations_summary()
        }


if __name__ == "__main__":
    print("="*80)
    print("POLITICAL SYSTEM - Core Module Loaded")
    print("="*80)
    print("\nCore classes defined:")
    print("  - PoliticalActor: Individual faction political representation")
    print("  - PoliticalSystem: Manages all political interactions")
    print("  - Relationship, Treaty, WarDeclaration, etc.")
    print("\nReady for integration with Federation Game")
