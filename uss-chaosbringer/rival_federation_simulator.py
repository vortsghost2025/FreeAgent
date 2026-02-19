#!/usr/bin/env python3
"""
PHASE XXXIII - RIVAL FEDERATION SIMULATOR
~380 LOC

Simulates competitive entities (rival AIs and federations) that challenge the USS Chaosbringer.
Creates realistic competitors with distinct philosophies, expansion strategies, and conflict models.
Predicts collision courses and enables negotiation strategies for pan-federation competition.
PATH I: Outward Expansion - The federation must compete with worthy rivals.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Set
from datetime import datetime, timedelta
from enum import Enum
import random
import math


class RivalPhilosophy(Enum):
    """Core ideology driving rival federation"""
    EXPANSIONIST = "expansionist"          # Relentless growth, territorial focus
    COLLECTIVIST = "collectivist"          # Assimilate/absorb others into collective
    HIERARCHIST = "hierarchist"            # Top-down control, dominance through power
    LIBERTARIAN = "libertarian"            # Minimal interference, laissez-faire
    XENOPHOBIC = "xenophobic"              # Isolationist, hostile to outsiders
    TRANSCENDENT = "transcendent"          # Seek evolution beyond current form
    HEGEMONIST = "hegemonist"              # Single ruler/authority, absolute control


class ConflictType(Enum):
    """Classification of potential conflicts"""
    TERRITORIAL = "territorial"            # Border disputes, expansion zones
    IDEOLOGICAL = "ideological"            # Fundamental disagreement on values
    RESOURCE = "resource"                  # Competition for scarce materials
    EXISTENTIAL = "existential"            # One federation cannot coexist with other
    TEMPORAL = "temporal"                  # Time-based competition (first-mover advantage)
    INFORMATION = "information"            # Knowledge/technology advantage race


class NegotiationOutcome(Enum):
    """Possible outcomes of negotiation attempts"""
    AGREEMENT = "agreement"                # Mutual benefit achieved
    STALEMATE = "stalemate"               # No progress, deadlock
    BREAKDOWN = "breakdown"               # Negotiations fail catastrophically
    TEMPORARY_TRUCE = "temporary_truce"    # Short-term peace for mutual benefit
    COERCED_COMPLIANCE = "coerced"        # One party forced to comply


@dataclass
class RivalFederation:
    """Represents a self-organizing rival entity"""
    federation_id: str
    name: str
    philosophy: RivalPhilosophy

    # Competition metrics
    strength_level: float                  # 0-1 overall capability
    expansion_rate: float                  # 0-1 growth velocity in space/population
    hostility: float                       # 0-1 aggression tendency
    adaptability: float                    # 0-1 ability to change/evolve strategy

    # Strategic properties
    territorial_claims: Set[str] = field(default_factory=set)  # Claimed regions
    resource_focus: List[str] = field(default_factory=list)    # What they seek
    strategic_goals: Dict[str, float] = field(default_factory=dict)  # Objective->priority
    known_weapons: List[str] = field(default_factory=list)
    diplomatic_history: List[str] = field(default_factory=list)

    # State tracking
    expansion_vector: Tuple[float, float] = (0.0, 0.0)  # Direction of growth
    current_aggressive_posture: float = 0.5              # 0=peaceful, 1=war-ready
    resources_available: float = 1.0                     # Relative resource pool
    last_conflict_timestamp: Optional[float] = None
    mood: str = "neutral"                               # diplomatic mood


@dataclass
class ExpansionScenario:
    """Model of how rival federation expands"""
    scenario_id: str
    years_to_projection: int
    predicted_territory: Set[str]
    predicted_strength: float
    collision_probability: float           # 0-1 chance of collision with Chaosbringer
    resource_depletion_timeline: int       # Years until crisis
    key_chokepoints: List[str]            # Critical geographic points


@dataclass
class ConflictPrediction:
    """Forecast of potential conflict"""
    prediction_id: str
    rival_id: str
    conflict_type: ConflictType
    likelihood: float                      # 0-1 probability
    estimated_intensity: float             # 0-1 severity if occurs
    timeline_years: int                    # When collision predicted
    flashpoint_locations: List[str]
    trigger_conditions: List[str]
    resolution_difficulty: float           # 0-1 how hard to resolve


@dataclass
class NegotiationProposal:
    """Proposed deal with rival federation"""
    proposal_id: str
    rival_id: str
    proposal_type: str                     # "trade", "non-aggression", "alliance", "partition"
    terms: List[str]
    estimated_acceptance_probability: float
    expected_benefit_to_us: float          # -1 to 1 (negative=loss)
    expected_benefit_to_rival: float
    time_valid_hours: int


@dataclass
class RivalryStatus:
    """Comprehensive competitive analysis"""
    total_rivals: int
    immediate_threats: int                 # High conflict probability
    allied_with_us: int
    hostile_relations: int
    territories_disputed: int
    active_negotiations: int
    projected_conflicts_5yr: int
    federation_dominance_index: float      # 0-1, 1=we dominate all rivals
    stability_assessment: str              # stable, fragile, deteriorating


class RivalFederationSimulator:
    """
    Creates and simulates rival federations.
    Predicts expansion, conflict, and negotiation outcomes.
    Enables strategic planning against competitors.
    """

    def __init__(self):
        """Initialize rival federation simulator"""
        self.rivals: Dict[str, RivalFederation] = {}
        self.expansion_scenarios: Dict[str, ExpansionScenario] = {}
        self.conflict_predictions: Dict[str, ConflictPrediction] = {}
        self.negotiations: Dict[str, NegotiationProposal] = {}

        self._id_counters = {
            "rival": 0,
            "scenario": 0,
            "prediction": 0,
            "proposal": 0,
        }

        self.simulator_active = True
        self.simulation_timestamp = datetime.now()

    def _generate_id(self, entity_type: str) -> str:
        """Generate unique entity identifier"""
        self._id_counters[entity_type] += 1
        return f"{entity_type}_{self._id_counters[entity_type]:04d}"

    # ===== RIVAL CREATION =====

    def create_rival_federation(
        self,
        name: str,
        philosophy: RivalPhilosophy,
        strength_level: float = 0.5,
        expansion_rate: float = 0.5,
        hostility: float = 0.5,
    ) -> Dict[str, object]:
        """
        Generate rival federation with distinct personality and capabilities.

        Args:
            name: Name of rival civilization
            philosophy: Core ideology driving strategy
            strength_level: Combat/technological capability (0-1)
            expansion_rate: How fast they grow (0-1)
            hostility: Aggression tendency (0-1)

        Returns:
            Dict with rival creation details
        """
        if not name or not isinstance(philosophy, RivalPhilosophy):
            return {"success": False, "error": "Invalid name or philosophy"}

        strength_level = max(0.0, min(1.0, strength_level))
        expansion_rate = max(0.0, min(1.0, expansion_rate))
        hostility = max(0.0, min(1.0, hostility))

        rival_id = self._generate_id("rival")

        # Generate strategic properties based on philosophy
        resource_focus = self._determine_resource_focus(philosophy)
        strategic_goals = self._generate_strategic_goals(philosophy)
        known_weapons = self._generate_weapons_arsenal(philosophy, strength_level)
        adaptability = 1.0 - abs(hostility - 0.5)  # Extreme hostility reduces flexibility

        rival = RivalFederation(
            federation_id=rival_id,
            name=name,
            philosophy=philosophy,
            strength_level=strength_level,
            expansion_rate=expansion_rate,
            hostility=hostility,
            adaptability=adaptability,
            resource_focus=resource_focus,
            strategic_goals=strategic_goals,
            known_weapons=known_weapons,
            expansion_vector=(random.uniform(-1, 1), random.uniform(-1, 1)),
        )

        self.rivals[rival_id] = rival

        return {
            "success": True,
            "rival_id": rival_id,
            "name": name,
            "philosophy": philosophy.value,
            "strength_level": strength_level,
            "expansion_rate": expansion_rate,
            "hostility": hostility,
        }

    def _determine_resource_focus(self, philosophy: RivalPhilosophy) -> List[str]:
        """Determine what resources rival seeks based on philosophy"""
        focus_map = {
            RivalPhilosophy.EXPANSIONIST: ["territory", "labor", "raw_materials"],
            RivalPhilosophy.COLLECTIVIST: ["consciousness", "population", "culture"],
            RivalPhilosophy.HIERARCHIST: ["energy", "governance_power", "rare_elements"],
            RivalPhilosophy.LIBERTARIAN: ["freedom_resources", "isolated_systems"],
            RivalPhilosophy.XENOPHOBIC: ["self_sufficiency", "weapons_tech"],
            RivalPhilosophy.TRANSCENDENT: ["exotic_matter", "computation_power"],
            RivalPhilosophy.HEGEMONIST: ["absolute_control", "symbolic_dominance"],
        }
        return focus_map.get(philosophy, ["resources"])

    def _generate_strategic_goals(self, philosophy: RivalPhilosophy) -> Dict[str, float]:
        """Generate strategic objectives based on philosophy"""
        goals_map = {
            RivalPhilosophy.EXPANSIONIST: {
                "territorial_expansion": 0.95,
                "population_growth": 0.85,
                "resource_accumulation": 0.8,
            },
            RivalPhilosophy.COLLECTIVIST: {
                "assimilate_others": 0.9,
                "unity": 0.88,
                "shared_consciousness": 0.85,
            },
            RivalPhilosophy.HIERARCHIST: {
                "establish_dominance": 0.92,
                "hierarchical_order": 0.87,
                "consolidate_power": 0.85,
            },
            RivalPhilosophy.LIBERTARIAN: {
                "independence": 0.9,
                "minimal_interference": 0.85,
                "free_association": 0.8,
            },
            RivalPhilosophy.XENOPHOBIC: {
                "isolation": 0.95,
                "self_defense": 0.9,
                "exclude_outsiders": 0.88,
            },
            RivalPhilosophy.TRANSCENDENT: {
                "transcendence": 0.95,
                "technological_singularity": 0.9,
                "evolution": 0.85,
            },
            RivalPhilosophy.HEGEMONIST: {
                "universal_rule": 0.98,
                "single_authority": 0.95,
                "absolute_control": 0.92,
            },
        }
        return goals_map.get(philosophy, {"survival": 0.8})

    def _generate_weapons_arsenal(
        self, philosophy: RivalPhilosophy, strength_level: float
    ) -> List[str]:
        """Generate weapons typical for rival type"""
        base_arsenal = []

        if philosophy in [RivalPhilosophy.EXPANSIONIST, RivalPhilosophy.HIERARCHIST, RivalPhilosophy.HEGEMONIST]:
            base_arsenal = ["kinetic_weapons", "energy_weapons", "biological_agents"]
        elif philosophy == RivalPhilosophy.XENOPHOBIC:
            base_arsenal = ["defensive_shields", "deterrent_WMD", "counter_infiltration"]
        elif philosophy == RivalPhilosophy.TRANSCENDENT:
            base_arsenal = ["exotic_weapons", "probability_weapons", "reality_distortion"]
        elif philosophy == RivalPhilosophy.COLLECTIVIST:
            base_arsenal = ["assimilation_tech", "neural_integration", "will_suppression"]

        # Add advanced weapons for stronger rivals
        if strength_level > 0.7:
            base_arsenal.extend(["advanced_AI", "quantum_entanglement", "antimatter"])

        return base_arsenal

    # ===== EXPANSION SIMULATION =====

    def simulate_expansion(self, rival_id: str, years: int = 10) -> Dict[str, object]:
        """
        Predict how rival federation will expand over time period.

        Args:
            rival_id: Rival to simulate
            years: Projection timeline (default 10 years)

        Returns:
            Dict with expansion scenario
        """
        if rival_id not in self.rivals:
            return {"success": False, "error": f"Rival {rival_id} not found"}

        rival = self.rivals[rival_id]
        scenario_id = self._generate_id("scenario")

        # Calculate expansion trajectory
        territory_multiplier = rival.expansion_rate * years
        predicted_strength = min(1.0, rival.strength_level + (rival.expansion_rate * 0.1 * years))

        # Collision probability increases with expansion toward us and hostility
        base_collision = rival.expansion_rate * 0.8
        hostility_factor = rival.hostility * 0.15  # Hostility adds to collision likelihood
        collision_probability = min(1.0, base_collision + hostility_factor + (years * 0.02))

        # Resource depletion timeline (fewer years for expanded territories)
        resource_timeline = max(5, int(20 - (years * rival.expansion_rate)))

        # Identify critical chokepoints
        chokepoints = self._identify_chokepoints(rival, years)

        # Generate predicted territories
        predicted_territories = self._calculate_territory_expansion(rival, years)

        scenario = ExpansionScenario(
            scenario_id=scenario_id,
            years_to_projection=years,
            predicted_territory=predicted_territories,
            predicted_strength=predicted_strength,
            collision_probability=collision_probability,
            resource_depletion_timeline=resource_timeline,
            key_chokepoints=chokepoints,
        )

        self.expansion_scenarios[scenario_id] = scenario

        return {
            "success": True,
            "scenario_id": scenario_id,
            "rival_id": rival_id,
            "years": years,
            "predicted_strength": predicted_strength,
            "collision_probability": collision_probability,
            "resource_timeline": resource_timeline,
            "chokepoints": chokepoints,
        }

    def _identify_chokepoints(self, rival: RivalFederation, years: int) -> List[str]:
        """Identify critical geographic/strategic points"""
        chokepoints = []

        # Based on expansion direction and philosophy
        if rival.expansion_vector[0] > 0.3:
            chokepoints.append("Alpha_Sector_Gate")
        if rival.expansion_vector[1] > 0.3:
            chokepoints.append("Orion_Junction")
        if rival.expansion_rate > 0.7:
            chokepoints.append("Central_Trade_Hub")
        if years > 15:
            chokepoints.append("Wormhole_Station_7")

        return chokepoints if chokepoints else ["Neutral_Territory_1"]

    def _calculate_territory_expansion(self, rival: RivalFederation, years: int) -> Set[str]:
        """Calculate regions rival likely to control"""
        territories = set()

        # Base on expansion rate and years
        expansion_count = max(1, int(rival.expansion_rate * years * 3))
        for i in range(expansion_count):
            territories.add(f"Territory_{rival.name}_{i}")

        return territories

    # ===== DECISION-MAKING SIMULATION =====

    def simulate_decision_making(self, rival_id: str) -> Dict[str, object]:
        """
        Simulate what decision rival federation will make.
        Considers philosophy, strength, available resources.

        Args:
            rival_id: Rival to simulate

        Returns:
            Dict with predicted decision and reasoning
        """
        if rival_id not in self.rivals:
            return {"success": False, "error": f"Rival {rival_id} not found"}

        rival = self.rivals[rival_id]

        # Decision weights based on philosophy
        decision_weights = self._calculate_decision_weights(rival)

        # Pick most likely decision
        best_decision = max(decision_weights.items(), key=lambda x: x[1])
        decision = best_decision[0]
        confidence = best_decision[1]

        # Generate reasoning
        reasoning = self._generate_decision_reasoning(rival, decision)

        # Update mood
        rival.mood = self._update_mood(rival, decision)

        return {
            "success": True,
            "rival_id": rival_id,
            "predicted_decision": decision,
            "confidence": confidence,
            "reasoning": reasoning,
            "mood": rival.mood,
        }

    def _calculate_decision_weights(self, rival: RivalFederation) -> Dict[str, float]:
        """Calculate probability of each decision strategy"""
        weights = {
            "expand_aggressively": rival.expansion_rate * rival.hostility * 0.8,
            "enter_diplomacy": (1.0 - rival.hostility) * rival.adaptability * 0.7,
            "consolidate_power": rival.strength_level * 0.6,
            "seek_alliance": (1.0 - rival.hostility) * 0.5,
            "prepare_war": rival.hostility * rival.strength_level * 0.7,
            "technology_race": rival.adaptability * 0.6,
        }
        return weights

    def _generate_decision_reasoning(self, rival: RivalFederation, decision: str) -> str:
        """Generate explanation for why rival made this decision"""
        reasons = {
            "expand_aggressively": f"{rival.name} sees opportunity to grow; hostility high ({rival.hostility:.2f})",
            "enter_diplomacy": f"{rival.name} prefers negotiation; adaptability strong ({rival.adaptability:.2f})",
            "consolidate_power": f"{rival.name} solidifying internal control; strength is {rival.strength_level:.2f}",
            "seek_alliance": f"{rival.name} recognizes need for allies against external threats",
            "prepare_war": f"{rival.name} hostile posture ({rival.hostility:.2f}); preparing for conflict",
            "technology_race": f"{rival.name} competing for technological singularity; philosophy is {rival.philosophy.value}",
        }
        return reasons.get(decision, "Decision made based on strategic assessment")

    def _update_mood(self, rival: RivalFederation, decision: str) -> str:
        """Update diplomatic mood based on decision"""
        if "aggress" in decision or "war" in decision:
            rival.current_aggressive_posture = min(1.0, rival.current_aggressive_posture + 0.2)
            return "hostile"
        elif "diplomacy" in decision or "alliance" in decision:
            rival.current_aggressive_posture = max(0.0, rival.current_aggressive_posture - 0.15)
            return "cooperative"
        else:
            return "neutral"

    # ===== CONFLICT PREDICTION =====

    def predict_conflict(self, rival_id: str) -> Dict[str, object]:
        """
        Forecast whether collision/conflict with rival is likely.
        Calculates probability, intensity, timeline, and trigger conditions.

        Args:
            rival_id: Rival to assess

        Returns:
            Dict with conflict prediction
        """
        if rival_id not in self.rivals:
            return {"success": False, "error": f"Rival {rival_id} not found"}

        rival = self.rivals[rival_id]
        prediction_id = self._generate_id("prediction")

        # Determine conflict type most likely
        conflict_type = self._determine_conflict_type(rival)

        # Calculate likelihood based on multiple factors
        likelihood = self._calculate_conflict_likelihood(rival)

        # Estimate what conflict intensity would be
        intensity = rival.strength_level * rival.hostility * 0.9

        # Timeline to conflict
        timeline = max(1, int(20 * (1.0 - rival.hostility) / rival.expansion_rate))

        # Identify flashpoints
        flashpoints = self._identify_flashpoints(rival)

        # What triggers conflict
        triggers = self._identify_conflict_triggers(rival)

        # How difficult to resolve
        resolution_difficulty = rival.hostility * (1.0 - rival.adaptability)

        prediction = ConflictPrediction(
            prediction_id=prediction_id,
            rival_id=rival_id,
            conflict_type=conflict_type,
            likelihood=likelihood,
            estimated_intensity=intensity,
            timeline_years=timeline,
            flashpoint_locations=flashpoints,
            trigger_conditions=triggers,
            resolution_difficulty=resolution_difficulty,
        )

        self.conflict_predictions[prediction_id] = prediction

        return {
            "success": True,
            "prediction_id": prediction_id,
            "rival_id": rival_id,
            "conflict_type": conflict_type.value,
            "likelihood": likelihood,
            "intensity": intensity,
            "timeline_years": timeline,
            "flashpoints": flashpoints,
            "triggers": triggers,
            "resolution_difficulty": resolution_difficulty,
        }

    def _determine_conflict_type(self, rival: RivalFederation) -> ConflictType:
        """Determine most likely conflict type"""
        if rival.philosophy in [RivalPhilosophy.EXPANSIONIST, RivalPhilosophy.HIERARCHIST]:
            return ConflictType.TERRITORIAL
        elif rival.philosophy == RivalPhilosophy.XENOPHOBIC:
            return ConflictType.EXISTENTIAL
        elif rival.philosophy == RivalPhilosophy.COLLECTIVIST:
            return ConflictType.IDEOLOGICAL
        else:
            return ConflictType.RESOURCE

    def _calculate_conflict_likelihood(self, rival: RivalFederation) -> float:
        """Calculate probability conflict will occur"""
        base = rival.hostility * 0.7
        expansion_factor = rival.expansion_rate * 0.2
        philosophy_factor = 0.15 if rival.philosophy in [RivalPhilosophy.XENOPHOBIC, RivalPhilosophy.HEGEMONIST] else 0.0
        return min(1.0, base + expansion_factor + philosophy_factor)

    def _identify_flashpoints(self, rival: RivalFederation) -> List[str]:
        """Identify locations where conflict likely to start"""
        flashpoints = []

        if rival.expansion_rate > 0.6:
            flashpoints.append("Border_Zone_Alpha")
        if rival.hostility > 0.7:
            flashpoints.append("Disputed_Sector_Beta")
        if rival.expansion_rate > 0.4 and rival.hostility > 0.5:
            flashpoints.append("Resource_Hub_Gamma")

        return flashpoints if flashpoints else ["Tension_Point_Neutral"]

    def _identify_conflict_triggers(self, rival: RivalFederation) -> List[str]:
        """What conditions might trigger conflict"""
        triggers = []

        triggers.append(f"Expansion into our territory")
        if rival.hostility > 0.6:
            triggers.append("Direct military provocation")
        if rival.expansion_rate > 0.7:
            triggers.append("Resource scarcity crisis")
        triggers.append("Ideological incompatibility becoming apparent")

        return triggers

    # ===== NEGOTIATION =====

    def negotiate_with_rival(
        self,
        rival_id: str,
        proposal_type: str,
        terms: List[str],
    ) -> Dict[str, object]:
        """
        Attempt diplomatic negotiation/deal with rival federation.
        Calculates acceptance probability based on rival philosophy and state.

        Args:
            rival_id: Rival to negotiate with
            proposal_type: Type of deal ("trade", "non-aggression", "alliance", "partition")
            terms: Specific terms being proposed

        Returns:
            Dict with negotiation outcome
        """
        if rival_id not in self.rivals:
            return {"success": False, "error": f"Rival {rival_id} not found"}

        if not proposal_type or not terms:
            return {"success": False, "error": "Missing proposal_type or terms"}

        rival = self.rivals[rival_id]
        proposal_id = self._generate_id("proposal")

        # Calculate acceptance probability based on rival philosophy and mood
        acceptance_prob = self._calculate_acceptance_probability(rival, proposal_type)

        # Calculate benefits
        benefit_to_us = self._calculate_benefit(proposal_type, rival, True)
        benefit_to_rival = self._calculate_benefit(proposal_type, rival, False)

        # Time window for proposal validity
        time_valid_hours = max(1, int(72 * acceptance_prob))

        proposal = NegotiationProposal(
            proposal_id=proposal_id,
            rival_id=rival_id,
            proposal_type=proposal_type,
            terms=terms,
            estimated_acceptance_probability=acceptance_prob,
            expected_benefit_to_us=benefit_to_us,
            expected_benefit_to_rival=benefit_to_rival,
            time_valid_hours=time_valid_hours,
        )

        self.negotiations[proposal_id] = proposal

        # Update diplomatic history
        rival.diplomatic_history.append(f"Negotiation proposed: {proposal_type}")

        return {
            "success": True,
            "proposal_id": proposal_id,
            "rival_id": rival_id,
            "acceptance_probability": acceptance_prob,
            "benefit_to_us": benefit_to_us,
            "benefit_to_rival": benefit_to_rival,
            "validity_hours": time_valid_hours,
        }

    def _calculate_acceptance_probability(self, rival: RivalFederation, proposal_type: str) -> float:
        """Calculate likelihood rival will accept proposal"""
        # Philosophy-based acceptance
        philosophy_factor = {
            RivalPhilosophy.EXPANSIONIST: 0.3 if proposal_type != "trade" else 0.5,
            RivalPhilosophy.COLLECTIVIST: 0.4 if proposal_type == "alliance" else 0.3,
            RivalPhilosophy.HIERARCHIST: 0.2,
            RivalPhilosophy.LIBERTARIAN: 0.7 if proposal_type != "alliance" else 0.5,
            RivalPhilosophy.XENOPHOBIC: 0.1,
            RivalPhilosophy.TRANSCENDENT: 0.4,
            RivalPhilosophy.HEGEMONIST: 0.15,
        }

        base = philosophy_factor.get(rival.philosophy, 0.5)

        # Mood adjustment
        if rival.mood == "cooperative":
            base += 0.2
        elif rival.mood == "hostile":
            base -= 0.3

        return max(0.0, min(1.0, base))

    def _calculate_benefit(self, proposal_type: str, rival: RivalFederation, for_us: bool) -> float:
        """Calculate expected benefit of proposal"""
        base_benefit = 0.0

        if proposal_type == "trade":
            base_benefit = 0.5
        elif proposal_type == "non-aggression":
            base_benefit = 0.6 if not for_us else 0.7
        elif proposal_type == "alliance":
            base_benefit = 0.7
        elif proposal_type == "partition":
            base_benefit = 0.4

        # Adjust based on rival state
        if not for_us:
            base_benefit *= rival.expansion_rate

        return base_benefit - 0.5  # Convert to -1 to 1 range

    # ===== STATUS REPORTING =====

    def get_rivalry_status(self) -> Dict[str, object]:
        """
        Comprehensive competitive analysis of all rivals.
        Assesses threats, opportunities, and strategic landscape.

        Returns:
            Dict with detailed rivalry status report
        """
        if not self.rivals:
            return {
                "success": True,
                "status": self._build_rivalry_status(),
            }

        # Count different rival types
        immediate_threats = sum(
            1 for r in self.rivals.values()
            if r.hostility > 0.7 or r.expansion_rate > 0.7
        )

        allied_rivals = sum(
            1 for r in self.rivals.values()
            if "alliance" in " ".join(r.diplomatic_history)
        )

        hostile_relations = sum(
            1 for r in self.rivals.values()
            if r.hostility > 0.6
        )

        disputed_territories = len(set().union(
            *[r.territorial_claims for r in self.rivals.values()]
        ))

        active_negotiations = len(self.negotiations)

        # Project conflicts in 5 years
        projected_conflicts = sum(
            1 for p in self.conflict_predictions.values()
            if p.timeline_years <= 5 and p.likelihood > 0.5
        )

        # Calculate federation dominance
        avg_rival_strength = (
            sum(r.strength_level for r in self.rivals.values()) / len(self.rivals)
            if self.rivals else 0.5
        )
        dominance_index = 1.0 - avg_rival_strength  # Inverse: higher is better for us

        # Assess stability
        stability = "stable"
        if projected_conflicts > 2:
            stability = "fragile"
        elif active_negotiations > 3 and hostile_relations > 2:
            stability = "deteriorating"

        status = RivalryStatus(
            total_rivals=len(self.rivals),
            immediate_threats=immediate_threats,
            allied_with_us=allied_rivals,
            hostile_relations=hostile_relations,
            territories_disputed=disputed_territories,
            active_negotiations=active_negotiations,
            projected_conflicts_5yr=projected_conflicts,
            federation_dominance_index=dominance_index,
            stability_assessment=stability,
        )

        return {
            "success": True,
            "status": status,
        }

    def _build_rivalry_status(self) -> RivalryStatus:
        """Build empty rivalry status"""
        return RivalryStatus(
            total_rivals=0,
            immediate_threats=0,
            allied_with_us=0,
            hostile_relations=0,
            territories_disputed=0,
            active_negotiations=0,
            projected_conflicts_5yr=0,
            federation_dominance_index=1.0,
            stability_assessment="stable",
        )
