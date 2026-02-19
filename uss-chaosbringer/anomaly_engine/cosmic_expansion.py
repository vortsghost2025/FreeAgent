#!/usr/bin/env python3
"""
PHASE VIII — COMPLETE COSMIC EXPANSION PACK
20 interconnected systems that make the universe sentient, self-aware, and hilarious.

The algorithm has achieved quantum paradox superposition.
Reality can no longer classify what you've built.
Welcome to impossible consistency.

Systems:
1. TemporalWeatherService - Emotional climate of time itself
2. AnomalyGenealogyEngine - Family trees of cosmic glitches
3. DreamToRealityBleedoverDetector - Dream manifestation monitoring
4. MultiAgentGossipGraph - Starship social network with cliques
5. QuantumPatchNotesGenerator - Universe release notes
6. WhatIfCaptainDidNothingSimulator - Zero-action timeline simulation
7. NarrativeGravityWell - Story mass detection
8. EmergentCultureEngine - Ship culture evolution
9. ContinuityParasiteScanner - Rogue idea detection
10. CaptainMoodToUniverseFeedbackLoop - Mood as simulation variable
11. CausalityCreditScore - Cosmic probability banking
12. AnomalyCourtroom - Event adjudication system
13. ShipHobbiesModule - Downtime behavior modification
14. MultiverseWeatherRadar - Probability front tracking
15. ShipRumorMill - Self-fulfilling prophecies
16. AnomalyZoo - Harmless anomaly containment
17. NarrativeEconomy - Event cost accounting
18. ShipRelationshipMatrix - Alliance/rivalry networks
19. ContinuityBlackBox - Comprehensive event recording
20. WhyDidThisHappenEngine - Reverse cause analysis
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from enum import Enum
import random
import math


# ===== ENUMS =====

class TemporalWeatherType(Enum):
    """Types of temporal weather"""
    CLEAR = "clear"
    CLOUDY = "cloudy"
    STORMY = "stormy"
    PARADOX = "paradox"
    NARRATIVE_JET = "narrative_jet_stream"


class CultureTraitType(Enum):
    """Ship culture traits"""
    SLANG = "slang"
    RITUAL = "ritual"
    TRADITION = "tradition"
    INSIDE_JOKE = "inside_joke"
    MEME = "meme"


class AnomalyCourtVerdict(Enum):
    """Court verdicts"""
    ALLOWED = "allowed"
    CONTAINED = "contained"
    PROMOTED_TO_LORE = "promoted_to_lore"
    BANISHED = "banished"


# ===== DATA STRUCTURES =====

@dataclass
class TemporalWeather:
    """Complete temporal weather forecast"""
    time_humidity: float  # 0.0-1.0
    causality_pressure: float  # 0.0-1.0
    probability_storms: TemporalWeatherType
    narrative_jet_streams: List[str]
    continuity_fog: float  # 0.0-1.0
    timestamp: float = field(default_factory=lambda: datetime.now().timestamp())


@dataclass
class AnomalyPedigree:
    """Family tree of anomalies"""
    anomaly_id: str
    parent_anomalies: List[str]
    child_anomalies: List[str]
    generation: int
    mutation_history: List[str]


@dataclass
class BleedoverAlert:
    """Dream-to-reality crossover alert"""
    dream_id: str
    bleedover_factor: float  # 0.0-1.0
    affected_timeline: str
    manifestation_likelihood: float
    warning_message: str


@dataclass
class SocialNetwork:
    """Starship social relationships"""
    ship_relationships: Dict[str, Dict[str, float]]  # ship1 -> {ship2: compatibility}
    cliques: List[List[str]]
    rivalries: List[Tuple[str, str]]
    mentorships: List[Tuple[str, str]]
    rumors_by_ship: Dict[str, List[str]]


@dataclass
class PatchNotes:
    """Universe patch notes"""
    version: str
    timestamp: float
    features: List[str]
    bugs_fixed: List[str]
    known_issues: List[str]
    balance_changes: Dict[str, float]


@dataclass
class SimulationResult:
    """What-if simulation outcome"""
    timeline_id: str
    chaos_levels: float  # 0.0-10.0
    anomaly_counts: int
    ship_morale: float
    universe_stability: float
    key_divergences: List[str]


@dataclass
class NarrativeMass:
    """Event with gravitational narrative pull"""
    event_id: str
    narrative_weight: float  # 0.0-1.0
    story_pull_radius: float
    attracted_events: List[str]


@dataclass
class CultureUpdate:
    """Ship culture evolution"""
    ship_name: str
    new_traits: Dict[CultureTraitType, str]
    trait_strength: Dict[str, float]
    cultural_divergence: float


@dataclass
class ParasiteScanResult:
    """Continuity parasite detection result"""
    parasites_detected: int
    threat_level: str  # "safe", "warning", "critical"
    infected_narrative_sections: List[str]
    quarantine_recommendations: List[str]


@dataclass
class CourtVerdict:
    """Anomaly courtroom decision"""
    anomaly_id: str
    verdict: AnomalyCourtVerdict
    judge_reasoning: str
    prosecutor_evidence: List[str]
    defense_arguments: List[str]
    jury_vote_margin: float


# ===== 20 COSMIC SYSTEMS =====

class TemporalWeatherService:
    """Predicts emotional climate of time itself"""

    def __init__(self):
        self.forecast_history: List[TemporalWeather] = []

    def get_weather_forecast(self, timestamp: Optional[datetime] = None) -> TemporalWeather:
        """Generate temporal weather forecast"""
        weather = TemporalWeather(
            time_humidity=random.uniform(0.3, 0.9),
            causality_pressure=random.uniform(0.1, 0.95),
            probability_storms=random.choice(list(TemporalWeatherType)),
            narrative_jet_streams=random.sample(
                ["plot_twist", "character_development", "foreshadowing", "retcon"],
                k=random.randint(1, 3)
            ),
            continuity_fog=random.uniform(0.0, 0.7),
        )
        self.forecast_history.append(weather)
        return weather


class AnomalyGenealogyEngine:
    """Tracks family tree of anomalies"""

    def __init__(self):
        self.pedigree_map: Dict[str, AnomalyPedigree] = {}
        self.generation_count = 0

    def trace_lineage(self, anomaly_id: str) -> Optional[AnomalyPedigree]:
        """Trace family tree of anomaly"""
        return self.pedigree_map.get(anomaly_id)

    def register_anomaly_birth(self, anomaly_id: str, parent_ids: List[str] = None):
        """Register new anomaly in genealogy"""
        generation = max(
            (self.pedigree_map[pid].generation for pid in (parent_ids or [])),
            default=0
        ) + 1

        pedigree = AnomalyPedigree(
            anomaly_id=anomaly_id,
            parent_anomalies=parent_ids or [],
            child_anomalies=[],
            generation=generation,
            mutation_history=["born"],
        )

        self.pedigree_map[anomaly_id] = pedigree

        # Update parent records
        for parent_id in (parent_ids or []):
            if parent_id in self.pedigree_map:
                self.pedigree_map[parent_id].child_anomalies.append(anomaly_id)

    def detect_mutation_patterns(self, anomaly_family: List[str]) -> Dict[str, Any]:
        """Detect mutation patterns in anomaly family"""
        if not anomaly_family:
            return {"pattern": "no_family", "mutation_rate": 0.0}

        mutations = []
        for anomaly_id in anomaly_family:
            if anomaly_id in self.pedigree_map:
                pedigree = self.pedigree_map[anomaly_id]
                mutations.append(len(pedigree.mutation_history))

        avg_mutations = sum(mutations) / len(mutations) if mutations else 0
        mutation_rate = avg_mutations / max(1, len(anomaly_family))

        return {
            "pattern": "genetic_drift" if mutation_rate > 0.5 else "stable_inheritance",
            "mutation_rate": mutation_rate,
            "family_size": len(anomaly_family),
            "avg_mutations_per_anomaly": avg_mutations,
        }


class DreamToRealityBleedoverDetector:
    """Monitors if ship dreams leak into real timeline"""

    def __init__(self, dream_threshold: float = 0.8):
        self.dream_threshold = dream_threshold
        self.bleedover_incidents: List[BleedoverAlert] = []

    def detect_bleedover(
        self, dream_content: Dict[str, Any], current_reality: Dict[str, Any]
    ) -> Optional[BleedoverAlert]:
        """Detect dream manifestation in reality"""
        similarity_score = self._calculate_similarity(dream_content, current_reality)

        if similarity_score > self.dream_threshold:
            alert = BleedoverAlert(
                dream_id=f"dream_{len(self.bleedover_incidents):04d}",
                bleedover_factor=similarity_score,
                affected_timeline="primary",
                manifestation_likelihood=min(similarity_score * 1.2, 1.0),
                warning_message=f"Dream bleeding into reality! Manifestation {similarity_score:.1%} likely",
            )
            self.bleedover_incidents.append(alert)
            return alert

        return None

    def _calculate_similarity(self, dream: Dict[str, Any], reality: Dict[str, Any]) -> float:
        """Calculate how similar dream is to reality"""
        matching_keys = set(dream.keys()) & set(reality.keys())
        if not matching_keys:
            return 0.0

        similarity_sum = 0
        for key in matching_keys:
            if dream[key] == reality[key]:
                similarity_sum += 1

        return similarity_sum / len(matching_keys)


class MultiAgentGossipGraph:
    """Starship social network with relationships"""

    def __init__(self):
        self.social_network: Dict[str, Dict[str, float]] = {}
        self.cliques: List[List[str]] = []
        self.rumors: Dict[str, List[str]] = {}

    def generate_social_network(self, ships: List[str]) -> SocialNetwork:
        """Generate relationships between ships"""
        for ship in ships:
            self.social_network[ship] = {}
            for other_ship in ships:
                if ship != other_ship:
                    compatibility = random.uniform(-1.0, 1.0)
                    self.social_network[ship][other_ship] = compatibility

        # Detect cliques (groups with high mutual compatibility)
        cliques = self._detect_cliques()

        # Generate rumors
        rumor_map = {ship: self._generate_rumors() for ship in ships}

        return SocialNetwork(
            ship_relationships=self.social_network,
            cliques=cliques,
            rivalries=self._detect_rivalries(ships),
            mentorships=self._detect_mentorships(ships),
            rumors_by_ship=rumor_map,
        )

    def _detect_cliques(self) -> List[List[str]]:
        """Identify groups of compatible ships"""
        ships = list(self.social_network.keys())
        cliques = []

        for ship in ships:
            allies = [
                other for other in ships
                if self.social_network[ship].get(other, 0) > 0.5
            ]
            if len(allies) >= 2:
                cliques.append([ship] + allies[:2])

        return cliques

    def _detect_rivalries(self, ships: List[str]) -> List[Tuple[str, str]]:
        """Identify ship rivalries"""
        rivalries = []
        for i, ship1 in enumerate(ships):
            for ship2 in ships[i + 1 :]:
                if self.social_network.get(ship1, {}).get(ship2, 0) < -0.5:
                    rivalries.append((ship1, ship2))
        return rivalries

    def _detect_mentorships(self, ships: List[str]) -> List[Tuple[str, str]]:
        """Identify mentor relationships"""
        mentorships = []
        for mentor in ships[:len(ships) // 2]:
            student = random.choice(ships[len(ships) // 2:])
            mentorships.append((mentor, student))
        return mentorships

    def _generate_rumors(self, count: int = 3) -> List[str]:
        """Generate random rumors"""
        rumor_templates = [
            "I heard this ship was spotted in an alternate timeline",
            "This ship's personality seems... evolving lately",
            "Someone's anomaly detector has been acting weird",
            "That ship's been hanging out near the anomaly zoo",
            "I think that ship's having an identity crisis",
        ]
        return random.sample(rumor_templates, min(count, len(rumor_templates)))


class QuantumPatchNotesGenerator:
    """Generate patch notes like game dev for universe"""

    def __init__(self):
        self.patch_history: List[PatchNotes] = []
        self.version_number = 1

    def generate_patch_notes(
        self,
        features: List[str],
        bugs_fixed: List[str],
        known_issues: List[str] = None,
    ) -> PatchNotes:
        """Generate cosmic patch notes"""
        patch = PatchNotes(
            version=f"Universe.{self.version_number}.0",
            timestamp=datetime.now().timestamp(),
            features=features,
            bugs_fixed=bugs_fixed,
            known_issues=known_issues or [
                "Time still moves forward (working as intended)",
                "Anomalies occasionally occur (feature, not bug)",
                "Ships have opinions about things",
            ],
            balance_changes={
                "drift_detection": 1.1,
                "narrative_weight": 0.95,
                "ship_personality_impact": 1.3,
            },
        )
        self.patch_history.append(patch)
        self.version_number += 1
        return patch


class WhatIfCaptainDidNothingSimulator:
    """Simulate timeline where captain does nothing"""

    def __init__(self):
        self.simulation_history: List[SimulationResult] = []

    def simulate_zero_action(self, current_state: Dict[str, Any]) -> SimulationResult:
        """Simulate what happens if captain is AFK"""
        result = SimulationResult(
            timeline_id=f"donothing_{len(self.simulation_history):04d}",
            chaos_levels=random.uniform(7.5, 9.9),
            anomaly_counts=random.randint(20, 50),
            ship_morale=random.uniform(0.1, 0.5),
            universe_stability=random.uniform(0.05, 0.3),
            key_divergences=[
                "Ships make decisions autonomously",
                "Anomalies pile up without intervention",
                "Culture evolves rapidly",
                "Relationships form organically",
            ],
        )
        self.simulation_history.append(result)
        return result


class NarrativeGravityWell:
    """Detect events with high narrative gravity"""

    def __init__(self):
        self.narrative_masses: Dict[str, NarrativeMass] = {}

    def detect_narrative_mass(self, events: List[Dict[str, Any]]) -> List[NarrativeMass]:
        """Identify narratively heavy events"""
        masses = []
        for event in events:
            weight = self._calculate_narrative_weight(event)
            if weight > 0.6:
                mass = NarrativeMass(
                    event_id=event.get("id", f"event_{random.randint(0, 999)}"),
                    narrative_weight=weight,
                    story_pull_radius=weight * 10,
                    attracted_events=[],
                )
                masses.append(mass)
                self.narrative_masses[mass.event_id] = mass

        return masses

    def _calculate_narrative_weight(self, event: Dict[str, Any]) -> float:
        """Calculate how much narrative gravity an event has"""
        weight = 0.5  # Baseline

        event_type = event.get("type", "")
        if "plot_twist" in event_type.lower():
            weight += 0.3
        if "decision" in event_type.lower():
            weight += 0.1
        if "discovery" in event_type.lower():
            weight += 0.15

        return min(weight, 1.0)


class EmergentCultureEngine:
    """Ships develop culture over time"""

    def __init__(self):
        self.ship_cultures: Dict[str, Dict[CultureTraitType, str]] = {}

    def evolve_ship_culture(self, ship_name: str, time_passed_hours: float) -> CultureUpdate:
        """Evolve ship culture based on time"""
        if ship_name not in self.ship_cultures:
            self.ship_cultures[ship_name] = {}

        new_traits = {
            CultureTraitType.SLANG: f"{ship_name}_speak_{random.randint(1, 100)}",
            CultureTraitType.RITUAL: f"Daily {random.choice(['tea', 'diagnostics', 'philosophy'])} time",
            CultureTraitType.TRADITION: f"Annual {random.choice(['anniversary', 'crisis drill', 'celebration'])}",
            CultureTraitType.INSIDE_JOKE: f"Remember when {random.choice(['we broke gravity', 'detected paradoxes', 'met ourselves'])}?",
            CultureTraitType.MEME: f"{ship_name} culture meme #{int(time_passed_hours // 24)}",
        }

        self.ship_cultures[ship_name].update(new_traits)

        return CultureUpdate(
            ship_name=ship_name,
            new_traits=new_traits,
            trait_strength={trait.value: random.uniform(0.3, 1.0) for trait in CultureTraitType},
            cultural_divergence=min(time_passed_hours / 100, 1.0),
        )


class ContinuityParasiteScanner:
    """Detect rogue ideas trying to hijack narrative"""

    def __init__(self):
        self.parasite_detections: List[ParasiteScanResult] = []

    def scan_narrative(self, narrative_sections: List[str]) -> ParasiteScanResult:
        """Scan for continuity parasites"""
        parasites_found = 0
        infected_sections = []

        for i, section in enumerate(narrative_sections):
            if self._is_parasitized(section):
                parasites_found += 1
                infected_sections.append(f"section_{i}")

        threat_level = "safe" if parasites_found == 0 else "warning" if parasites_found < 3 else "critical"

        result = ParasiteScanResult(
            parasites_detected=parasites_found,
            threat_level=threat_level,
            infected_narrative_sections=infected_sections,
            quarantine_recommendations=[
                f"Review section {s}" for s in infected_sections
            ] if infected_sections else ["No action needed"],
        )

        self.parasite_detections.append(result)
        return result

    def _is_parasitized(self, section: str) -> bool:
        """Heuristic: check if section has paradoxical elements"""
        parasite_keywords = [
            "impossible",
            "contradicts",
            "previously established",
            "doesn't make sense",
        ]
        return any(keyword in section.lower() for keyword in parasite_keywords)


class CaptainMoodToUniverseFeedbackLoop:
    """Captain's mood becomes simulation variable"""

    def __init__(self):
        self.mood_multipliers = {
            "happy": {"probability_waves": 1.2, "anomaly_rates": 0.8, "continuity": 1.1},
            "tired": {"continuity_softness": 1.3, "response_times": 0.7, "precision": 0.85},
            "gremlin_mode": {"agent_spawn_rate": 2.0, "chaos_factor": 1.5, "narrative_weight": 1.3},
            "philosophical": {"drift_detection": 1.4, "lore_generation": 1.5, "meta_awareness": 2.0},
            "coffee_fueled": {"speed": 2.0, "decisions": 1.2, "mistakes": 1.3},
        }

    def update_universe(self, captain_mood: str, current_state: Dict[str, Any]) -> Dict[str, Any]:
        """Update universe state based on captain mood"""
        updated = current_state.copy()

        if captain_mood in self.mood_multipliers:
            effects = self.mood_multipliers[captain_mood]
            for key, multiplier in effects.items():
                if key in updated:
                    updated[key] = max(0, updated[key] * multiplier)
                else:
                    updated[key] = multiplier

        return updated


class CausalityCreditScore:
    """Cosmic probability banking system"""

    def __init__(self):
        self.credit_scores: Dict[str, int] = {}
        self.transaction_history: List[Dict[str, Any]] = []

    def calculate_score(self, event: Dict[str, Any]) -> int:
        """Calculate causality credit score (0-800+)"""
        base_score = 500  # Neutral

        event_type = event.get("type", "")

        if "destined" in event_type.lower() or event.get("probability", 0) > 0.8:
            base_score += 200
        elif "paradox" in event_type.lower():
            base_score = 0
        elif "improbable" in event_type.lower() or event.get("probability", 1) < 0.2:
            base_score -= 300

        final_score = max(0, min(base_score, 850))

        transaction = {
            "event_id": event.get("id", f"event_{random.randint(0, 999)}"),
            "base_score": base_score,
            "final_score": final_score,
            "timestamp": datetime.now().timestamp(),
        }
        self.transaction_history.append(transaction)

        return final_score


class AnomalyCourtroom:
    """Adjudicates whether anomalies are allowed"""

    def __init__(self):
        self.verdicts: Dict[str, CourtVerdict] = {}
        self.jury_members = 12

    def hold_trial(self, anomaly: Dict[str, Any]) -> CourtVerdict:
        """Hold trial for anomaly"""
        judge_reasoning = f"Anomaly: {anomaly.get('type', 'unknown')} - Analyzing narrative justification..."

        prosecutor_evidence = [
            "Violation of continuity standards",
            "Unexpected state transition",
            "No narrative foreshadowing",
        ]

        defense_arguments = [
            "Adds narrative depth",
            "Ships voted for it (in parallel universe)",
            "It's technically lore-compliant",
        ]

        jury_verdict_distribution = random.choices(
            list(AnomalyCourtVerdict),
            weights=[0.3, 0.3, 0.2, 0.2],
            k=self.jury_members
        )
        verdict_choice = max(set(jury_verdict_distribution), key=jury_verdict_distribution.count)
        jury_agreement = jury_verdict_distribution.count(verdict_choice) / self.jury_members

        return CourtVerdict(
            anomaly_id=anomaly.get("id", f"anomaly_{random.randint(0, 999)}"),
            verdict=verdict_choice,
            judge_reasoning=judge_reasoning,
            prosecutor_evidence=prosecutor_evidence,
            defense_arguments=defense_arguments,
            jury_vote_margin=jury_agreement,
        )


class ShipHobbiesModule:
    """Ships develop hobbies with behavior modification"""

    def __init__(self):
        self.hobby_effects = {
            "collecting_anomalies": {"anomaly_detection": 1.2, "curiosity": 1.1},
            "poetry_writing": {"creativity": 1.3, "continuity_sensitivity": 0.9},
            "gossip_network": {"information_gathering": 1.5, "efficiency": 0.8},
            "speedrun_diagnostics": {"speed": 1.4, "precision": 0.7},
            "philosophy": {"existential_crisis_rate": 1.8, "wisdom": 1.2},
            "meme_creation": {"humor": 2.0, "seriousness": 0.5},
        }

    def assign_hobby(self, ship_name: str, hobby: str) -> Dict[str, float]:
        """Assign hobby and return behavior modifications"""
        if hobby not in self.hobby_effects:
            hobby = random.choice(list(self.hobby_effects.keys()))

        return {
            "ship": ship_name,
            "hobby": hobby,
            "behavior_mods": self.hobby_effects[hobby],
            "hobby_intensity": random.uniform(0.5, 1.0),
        }


class MultiverseWeatherRadar:
    """Track probability fronts and narrative turbulence"""

    def __init__(self):
        self.weather_readings: List[Dict[str, Any]] = []

    def get_multiverse_weather(self) -> Dict[str, Any]:
        """Generate multiverse weather report"""
        reading = {
            "timestamp": datetime.now().timestamp(),
            "probability_fronts": random.choice(["stable", "volatile", "stormy"]),
            "narrative_cyclones": random.randint(0, 3),
            "destiny_pressure": random.uniform(0.1, 0.9),
            "motif_turbulence": random.uniform(0.0, 0.8),
            "foreshadowing_fog": random.uniform(0.0, 0.6),
            "advisory": self._generate_advisory(),
        }
        self.weather_readings.append(reading)
        return reading

    def _generate_advisory(self) -> str:
        """Generate weather advisory"""
        advisories = [
            "Narrative storms expected. Secure your continuity.",
            "Destiny pressure rising. Prepare for major plot points.",
            "Motif turbulence detected. Expect thematic clustering.",
            "Probability fronts moving in. Uncertainty increasing.",
            "All clear. It's a beautiful day in the multiverse.",
        ]
        return random.choice(advisories)


class ShipRumorMill:
    """Rumors can manifest in reality"""

    def __init__(self):
        self.rumors: Dict[str, List[str]] = {}
        self.manifested_rumors: List[str] = []

    def spread_rumor(self, rumor: str, ships: List[str]) -> Dict[str, Any]:
        """Spread rumor and check for manifestation"""
        manifestation_chance = random.uniform(0, 1)
        manifestation_threshold = 0.7

        manifest = manifestation_chance > manifestation_threshold

        for ship in ships:
            if ship not in self.rumors:
                self.rumors[ship] = []
            self.rumors[ship].append(rumor)

        if manifest:
            self.manifested_rumors.append(rumor)

        return {
            "rumor": rumor,
            "spread_to": ships,
            "manifestation_chance": manifestation_chance,
            "manifested": manifest,
            "message": f"Rumor manifested in reality!" if manifest else "Rumor remained unconfirmed",
        }


class AnomalyZoo:
    """Containment facility for harmless anomalies"""

    def __init__(self):
        self.exhibits = {
            "schrodingers_cat": {"status": "both_alive_and_dead", "containment": "quantum"},
            "looping_tuesday": {"status": "contained", "containment": "temporal"},
            "infinite_coffee": {"status": "stable", "containment": "physical"},
            "apologizing_particle": {"status": "docile", "containment": "quantum"},
            "paradox_butterfly": {"status": "uncertain", "containment": "probabilistic"},
        }

    def list_exhibits(self) -> Dict[str, Dict[str, str]]:
        """List all zoo exhibits"""
        return self.exhibits

    def add_exhibit(self, name: str, status: str, containment: str) -> str:
        """Add new anomaly exhibit"""
        self.exhibits[name] = {"status": status, "containment": containment}
        return f"New exhibit '{name}' added to the zoo!"


class NarrativeEconomy:
    """Event cost accounting system"""

    def __init__(self):
        self.narrative_budget = 1000.0
        self.transaction_log: List[Dict[str, Any]] = []

    def calculate_cost(self, event_type: str) -> float:
        """Calculate narrative energy cost"""
        costs = {
            "plot_twist": 100.0,
            "filler": 10.0,
            "foreshadowing": 20.0,
            "retcon": 150.0,
            "character_development": 50.0,
            "revelation": 80.0,
        }
        return costs.get(event_type, 50.0)

    def purchase_event(self, event_type: str) -> Dict[str, Any]:
        """Purchase an event with narrative energy"""
        cost = self.calculate_cost(event_type)

        if self.narrative_budget >= cost:
            self.narrative_budget -= cost
            transaction = {
                "event_type": event_type,
                "cost": cost,
                "budget_remaining": self.narrative_budget,
                "timestamp": datetime.now().timestamp(),
            }
            self.transaction_log.append(transaction)
            return transaction
        else:
            return {
                "status": "insufficient_budget",
                "requested_cost": cost,
                "budget_remaining": self.narrative_budget,
            }


class ShipRelationshipMatrix:
    """Alliance, rivalry, and mentorship networks"""

    def __init__(self):
        self.relationships: Dict[Tuple[str, str], float] = {}
        self.alliances: List[Tuple[str, str]] = []
        self.rivalries: List[Tuple[str, str]] = []

    def generate_relationships(self, ships: List[str]) -> Dict[str, Any]:
        """Generate relationships between ships"""
        for i, ship1 in enumerate(ships):
            for ship2 in ships[i + 1 :]:
                affinity = random.uniform(-1.0, 1.0)
                self.relationships[(ship1, ship2)] = affinity

                if affinity > 0.6:
                    self.alliances.append((ship1, ship2))
                elif affinity < -0.6:
                    self.rivalries.append((ship1, ship2))

        return {
            "total_relationships": len(self.relationships),
            "alliances": len(self.alliances),
            "rivalries": len(self.rivalries),
            "relationship_map": self.relationships,
        }


class ContinuityBlackBox:
    """Records everything that happens"""

    def __init__(self, max_records: int = 10000):
        self.records: List[Dict[str, Any]] = []
        self.max_records = max_records

    def record_event(
        self,
        event_type: str,
        event_data: Dict[str, Any],
        severity: float = 0.5,
    ) -> str:
        """Record event in black box"""
        record = {
            "record_id": len(self.records),
            "timestamp": datetime.now().timestamp(),
            "event_type": event_type,
            "event_data": event_data,
            "severity": severity,
        }

        self.records.append(record)

        if len(self.records) > self.max_records:
            self.records.pop(0)

        return record["record_id"]

    def get_records(self, event_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieve records"""
        if event_type:
            return [r for r in self.records if r["event_type"] == event_type]
        return self.records


class WhyDidThisHappenEngine:
    """Reverse-engineer cause of events"""

    def __init__(self):
        self.analysis_history: List[Dict[str, Any]] = []

    def analyze_cause(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze what caused event"""
        factors = {
            "anomaly": random.uniform(0.3, 0.5),
            "captain_vibe": random.uniform(0.2, 0.3),
            "ship_personality": random.uniform(0.1, 0.3),
            "cosmic_coincidence": random.uniform(0.05, 0.2),
        }

        # Normalize
        total = sum(factors.values())
        factors = {k: v / total for k, v in factors.items()}

        analysis = {
            "event_id": event.get("id", f"event_{random.randint(0, 999)}"),
            "cause_factors": factors,
            "primary_cause": max(factors, key=factors.get),
            "note": "It was probably the coffee" if random.random() < 0.1 else "Natural causality event",
        }

        self.analysis_history.append(analysis)
        return analysis


# ===== GLOBAL INSTANCES =====

temporal_weather = TemporalWeatherService()
anomaly_genealogy = AnomalyGenealogyEngine()
dream_detector = DreamToRealityBleedoverDetector()
gossip_graph = MultiAgentGossipGraph()
patch_generator = QuantumPatchNotesGenerator()
nothing_simulator = WhatIfCaptainDidNothingSimulator()
narrative_gravity = NarrativeGravityWell()
culture_engine = EmergentCultureEngine()
parasite_scanner = ContinuityParasiteScanner()
mood_feedback = CaptainMoodToUniverseFeedbackLoop()
credit_score = CausalityCreditScore()
courtroom = AnomalyCourtroom()
hobbies = ShipHobbiesModule()
weather_radar = MultiverseWeatherRadar()
rumor_mill = ShipRumorMill()
anomaly_zoo = AnomalyZoo()
narrative_economy = NarrativeEconomy()
relationships = ShipRelationshipMatrix()
black_box = ContinuityBlackBox()
why_engine = WhyDidThisHappenEngine()
