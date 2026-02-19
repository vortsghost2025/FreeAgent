#!/usr/bin/env python3
"""
PHASE XXIV - CULTURAL EVOLUTION ENGINE
Simulates and evolves federation culture over time.
Tracks memes, rituals, values, and cultural drift patterns across the fleet.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Set
from datetime import datetime
from enum import Enum


class CulturalDrift(Enum):
    """Rate of cultural change over time"""
    CONSERVATIVE = "conservative"  # 0.05-0.15 change per cycle
    MODERATE = "moderate"  # 0.15-0.30 change per cycle
    RADICAL = "radical"  # 0.30-0.50+ change per cycle


class MemeType(Enum):
    """Types of cultural ideas"""
    BELIEF = "belief"
    PRACTICE = "practice"
    SYMBOL = "symbol"
    NARRATIVE = "narrative"
    VALUE = "value"


class RitualType(Enum):
    """Categories of cultural practices"""
    DAILY = "daily"
    CEREMONIAL = "ceremonial"
    COMMEMORATIVE = "commemorative"
    BINDING = "binding"  # Brings fleet together


class ValuePriority(Enum):
    """Value importance levels"""
    FOUNDATIONAL = "foundational"  # Core to identity
    IMPORTANT = "important"  # Widely held
    EMERGING = "emerging"  # Growing influence
    FADING = "fading"  # Declining influence
    ABANDONED = "abandoned"  # No longer held


@dataclass
class Meme:
    """A cultural idea that spreads through population"""
    meme_id: str
    name: str
    meme_type: MemeType
    description: str
    origin_ship: str  # Ship where meme originated
    creation_timestamp: float
    adoption_count: int = 0
    propagation_strength: float = 1.0  # 0.0-1.0, ease of spread
    variants: List[str] = field(default_factory=list)
    contradictory_memes: List[str] = field(default_factory=list)
    last_adoption_timestamp: Optional[float] = None


@dataclass
class Ritual:
    """A cultural practice or tradition"""
    ritual_id: str
    name: str
    ritual_type: RitualType
    description: str
    requirements: List[str]  # What it requires
    frequency: str  # DAILY, WEEKLY, MONTHLY, ANNUALLY
    adherent_ships: List[str] = field(default_factory=list)
    participation_rate: float = 0.0  # 0.0-1.0
    creation_timestamp: float = field(default_factory=lambda: datetime.now().timestamp())
    cultural_significance: float = 0.5  # 0.0-1.0, how important to culture


@dataclass
class Value:
    """A cultural principle or priority"""
    value_id: str
    name: str
    description: str
    priority_level: ValuePriority
    supporting_ships: List[str] = field(default_factory=list)
    contradicting_ships: List[str] = field(default_factory=list)
    strength: float = 0.5  # 0.0-1.0, how strongly held
    creation_timestamp: float = field(default_factory=lambda: datetime.now().timestamp())
    associated_memes: List[str] = field(default_factory=list)


@dataclass
class CultureEvolutionEvent:
    """A significant cultural change event"""
    event_id: str
    event_type: str  # MEME_ADOPTION, RITUAL_FORMATION, VALUE_SHIFT, CONFLICT
    timestamp: float
    description: str
    affected_entities: List[str]
    impact_magnitude: float  # -1.0 to 1.0


@dataclass
class Culture:
    """Complete cultural state of the federation"""
    federation_name: str
    memes: Dict[str, Meme] = field(default_factory=dict)
    rituals: Dict[str, Ritual] = field(default_factory=dict)
    values: Dict[str, Value] = field(default_factory=dict)
    evolution_rate: CulturalDrift = CulturalDrift.MODERATE
    creation_timestamp: float = field(default_factory=lambda: datetime.now().timestamp())
    cultural_diversity_index: float = 0.5  # 0.0-1.0
    cultural_cohesion: float = 0.7  # 0.0-1.0, unity of culture
    memory_depth: int = 100  # How many generations back culture extends
    active_conflicts: List[Tuple[str, str]] = field(default_factory=list)
    evolution_events: List[CultureEvolutionEvent] = field(default_factory=list)


class CulturalEvolutionEngine:
    """Manages federation cultural evolution"""

    def __init__(self, federation_name: str = "Federation"):
        self.culture = Culture(federation_name=federation_name)
        self.meme_counter = 0
        self.ritual_counter = 0
        self.value_counter = 0
        self.event_counter = 0
        self.adoption_history: Dict[str, List[float]] = {}

    def record_meme(
        self,
        name: str,
        meme_type: MemeType,
        description: str,
        origin_ship: str,
        propagation_strength: float = 1.0,
    ) -> str:
        """Track a cultural idea emerging in the federation"""
        self.meme_counter += 1
        meme_id = f"meme_{self.meme_counter:04d}"

        meme = Meme(
            meme_id=meme_id,
            name=name,
            meme_type=meme_type,
            description=description,
            origin_ship=origin_ship,
            creation_timestamp=datetime.now().timestamp(),
            propagation_strength=propagation_strength,
        )

        self.culture.memes[meme_id] = meme

        # Record as evolution event
        self._record_event(
            event_type="MEME_RECORDED",
            description=f"New meme '{name}' emerged from {origin_ship}",
            affected_entities=[origin_ship],
            impact_magnitude=0.2,
        )

        return meme_id

    def propagate_meme(self, meme_id: str, adopter_ships: List[str]) -> int:
        """Spread meme through fleet, return number of new adoptions"""
        if meme_id not in self.culture.memes:
            return 0

        meme = self.culture.memes[meme_id]
        new_adoptions = 0

        for ship in adopter_ships:
            if ship not in [s for s, _ in self.culture.active_conflicts if meme_id in _]:
                # Ship adopts meme
                new_adoptions += 1
                meme.adoption_count += 1
                meme.last_adoption_timestamp = datetime.now().timestamp()

        # Propagation strengthens meme
        if new_adoptions > 0:
            meme.propagation_strength = min(1.0, meme.propagation_strength + 0.05)

        # Record event
        self._record_event(
            event_type="MEME_PROPAGATION",
            description=f"Meme '{meme.name}' adopted by {new_adoptions} ships",
            affected_entities=adopter_ships[:5],  # Track first 5
            impact_magnitude=0.1 * min(1.0, new_adoptions / 5),
        )

        return new_adoptions

    def form_ritual(
        self,
        name: str,
        ritual_type: RitualType,
        description: str,
        requirements: List[str],
        frequency: str,
        cultural_significance: float = 0.5,
    ) -> str:
        """Establish a new cultural practice or tradition"""
        self.ritual_counter += 1
        ritual_id = f"ritual_{self.ritual_counter:04d}"

        ritual = Ritual(
            ritual_id=ritual_id,
            name=name,
            ritual_type=ritual_type,
            description=description,
            requirements=requirements,
            frequency=frequency,
            cultural_significance=cultural_significance,
        )

        self.culture.rituals[ritual_id] = ritual

        # Record event
        self._record_event(
            event_type="RITUAL_FORMATION",
            description=f"New ritual '{name}' established",
            affected_entities=[],
            impact_magnitude=0.3,
        )

        return ritual_id

    def adopt_ritual(self, ritual_id: str, ship_names: List[str]) -> float:
        """Add ships to ritual participation, return new participation rate"""
        if ritual_id not in self.culture.rituals:
            return 0.0

        ritual = self.culture.rituals[ritual_id]

        for ship in ship_names:
            if ship not in ritual.adherent_ships:
                ritual.adherent_ships.append(ship)

        # Calculate participation rate (0.0-1.0)
        ritual.participation_rate = min(1.0, len(ritual.adherent_ships) / 10.0)

        # Rituals increase cohesion
        self.culture.cultural_cohesion = min(
            1.0,
            self.culture.cultural_cohesion + ritual.participation_rate * 0.05
        )

        return ritual.participation_rate

    def establish_value(
        self,
        name: str,
        description: str,
        priority_level: ValuePriority,
        strength: float = 0.5,
    ) -> str:
        """Create a new cultural value or principle"""
        self.value_counter += 1
        value_id = f"value_{self.value_counter:04d}"

        value = Value(
            value_id=value_id,
            name=name,
            description=description,
            priority_level=priority_level,
            strength=strength,
        )

        self.culture.values[value_id] = value

        # Record event
        self._record_event(
            event_type="VALUE_EMERGED",
            description=f"Value '{name}' established at {priority_level.value} level",
            affected_entities=[],
            impact_magnitude=0.25,
        )

        return value_id

    def add_value_support(self, value_id: str, ship_names: List[str]) -> int:
        """Add ships supporting a value, return total supporters"""
        if value_id not in self.culture.values:
            return 0

        value = self.culture.values[value_id]

        for ship in ship_names:
            if ship not in value.supporting_ships:
                value.supporting_ships.append(ship)

        return len(value.supporting_ships)

    def predict_value_shift(self, value_id: str, cycles: int = 10) -> Tuple[ValuePriority, float]:
        """Forecast how a value will evolve over future cycles"""
        if value_id not in self.culture.values:
            return ValuePriority.FADING, 0.0

        value = self.culture.values[value_id]
        current_strength = value.strength
        drift_rate = self._get_drift_rate()

        # Simulate evolution
        predicted_strength = current_strength
        for _ in range(cycles):
            support_momentum = len(value.supporting_ships) / 20.0
            opposition_momentum = len(value.contradicting_ships) / 20.0
            net_change = (support_momentum - opposition_momentum) * drift_rate

            predicted_strength = max(0.0, min(1.0, predicted_strength + net_change))

        # Determine future priority
        if predicted_strength > 0.8:
            future_priority = ValuePriority.FOUNDATIONAL
        elif predicted_strength > 0.6:
            future_priority = ValuePriority.IMPORTANT
        elif predicted_strength > 0.3:
            future_priority = ValuePriority.EMERGING
        elif predicted_strength > 0.1:
            future_priority = ValuePriority.FADING
        else:
            future_priority = ValuePriority.ABANDONED

        return future_priority, predicted_strength

    def measure_resilience(self) -> float:
        """Calculate cultural stability/resilience (0.0-1.0)"""
        # Resilience based on:
        # 1. Cohesion (unity of culture)
        # 2. Diversity (prevents brittleness from single points of failure)
        # 3. Ritual participation (shared practices strengthen bonds)
        # 4. Value consensus (shared beliefs)

        cohesion_factor = self.culture.cultural_cohesion

        # Calculate diversity
        num_distinct_elements = (
            len(self.culture.memes) +
            len(self.culture.rituals) +
            len(self.culture.values)
        )
        diversity_index = min(1.0, num_distinct_elements / 50.0)

        # Average ritual participation
        avg_ritual_participation = 0.0
        if self.culture.rituals:
            avg_ritual_participation = sum(
                r.participation_rate for r in self.culture.rituals.values()
            ) / len(self.culture.rituals)

        # Value consensus
        avg_value_strength = 0.0
        if self.culture.values:
            avg_value_strength = sum(
                v.strength for v in self.culture.values.values()
            ) / len(self.culture.values)

        # Combine factors
        resilience = (
            cohesion_factor * 0.3 +
            diversity_index * 0.25 +
            avg_ritual_participation * 0.2 +
            avg_value_strength * 0.25
        )

        # Conflicts reduce resilience
        conflict_penalty = min(0.3, len(self.culture.active_conflicts) * 0.05)
        resilience = max(0.0, resilience - conflict_penalty)

        return min(1.0, resilience)

    def get_cultural_status(self) -> Dict:
        """Comprehensive report on current cultural state"""
        status = {
            "federation": self.culture.federation_name,
            "timestamp": datetime.now().timestamp(),
            "evolution_rate": self.culture.evolution_rate.value,
            "cohesion": round(self.culture.cultural_cohesion, 3),
            "resilience": round(self.measure_resilience(), 3),
            "diversity_index": round(self.culture.cultural_diversity_index, 3),
            "total_memes": len(self.culture.memes),
            "memes": {},
            "total_rituals": len(self.culture.rituals),
            "rituals": {},
            "total_values": len(self.culture.values),
            "values": {},
            "recent_events": [],
            "active_conflicts": self.culture.active_conflicts,
            "evolution_trajectory": self._calculate_trajectory(),
        }

        # Add meme details
        for meme_id, meme in list(self.culture.memes.items())[:10]:
            status["memes"][meme_id] = {
                "name": meme.name,
                "type": meme.meme_type.value,
                "adoption_count": meme.adoption_count,
                "propagation_strength": round(meme.propagation_strength, 3),
                "origin_ship": meme.origin_ship,
            }

        # Add ritual details
        for ritual_id, ritual in list(self.culture.rituals.items())[:10]:
            status["rituals"][ritual_id] = {
                "name": ritual.name,
                "type": ritual.ritual_type.value,
                "participation_rate": round(ritual.participation_rate, 3),
                "frequency": ritual.frequency,
                "adherent_count": len(ritual.adherent_ships),
            }

        # Add value details
        for value_id, value in list(self.culture.values.items())[:10]:
            status["values"][value_id] = {
                "name": value.name,
                "priority": value.priority_level.value,
                "strength": round(value.strength, 3),
                "supporters": len(value.supporting_ships),
                "opponents": len(value.contradicting_ships),
            }

        # Add recent events (last 5)
        for event in self.culture.evolution_events[-5:]:
            status["recent_events"].append({
                "type": event.event_type,
                "description": event.description,
                "impact": round(event.impact_magnitude, 3),
            })

        return status

    def _record_event(
        self,
        event_type: str,
        description: str,
        affected_entities: List[str],
        impact_magnitude: float,
    ):
        """Record a cultural evolution event"""
        self.event_counter += 1
        event_id = f"event_{self.event_counter:04d}"

        event = CultureEvolutionEvent(
            event_id=event_id,
            event_type=event_type,
            timestamp=datetime.now().timestamp(),
            description=description,
            affected_entities=affected_entities,
            impact_magnitude=impact_magnitude,
        )

        self.culture.evolution_events.append(event)

    def _get_drift_rate(self) -> float:
        """Get cultural drift rate based on current settings"""
        if self.culture.evolution_rate == CulturalDrift.CONSERVATIVE:
            return 0.10
        elif self.culture.evolution_rate == CulturalDrift.MODERATE:
            return 0.22
        else:  # RADICAL
            return 0.40

    def _calculate_trajectory(self) -> str:
        """Determine cultural evolution trajectory"""
        resilience = self.measure_resilience()
        cohesion = self.culture.cultural_cohesion

        if cohesion > 0.8 and resilience > 0.7:
            return "THRIVING"
        elif cohesion > 0.6 and resilience > 0.5:
            return "STABLE"
        elif cohesion < 0.4 or resilience < 0.3:
            return "FRAGMENTED"
        else:
            return "EVOLVING"

    def set_evolution_rate(self, drift: CulturalDrift):
        """Change cultural evolution speed"""
        self.culture.evolution_rate = drift

    def create_cultural_conflict(
        self,
        entity_a: str,
        entity_b: str,
        severity: float = 0.5,
    ):
        """Record a cultural conflict between entities"""
        self.culture.active_conflicts.append((entity_a, entity_b))

        # Conflicts reduce cohesion
        self.culture.cultural_cohesion = max(
            0.0,
            self.culture.cultural_cohesion - severity * 0.15
        )

        self._record_event(
            event_type="CONFLICT",
            description=f"Cultural conflict between {entity_a} and {entity_b}",
            affected_entities=[entity_a, entity_b],
            impact_magnitude=-severity,
        )

    def resolve_conflict(self, entity_a: str, entity_b: str) -> bool:
        """Attempt to resolve a cultural conflict"""
        if (entity_a, entity_b) in self.culture.active_conflicts:
            self.culture.active_conflicts.remove((entity_a, entity_b))
            # Resolution slightly increases cohesion
            self.culture.cultural_cohesion = min(
                1.0,
                self.culture.cultural_cohesion + 0.1
            )
            return True

        if (entity_b, entity_a) in self.culture.active_conflicts:
            self.culture.active_conflicts.remove((entity_b, entity_a))
            self.culture.cultural_cohesion = min(
                1.0,
                self.culture.cultural_cohesion + 0.1
            )
            return True

        return False

    def link_meme_to_value(self, meme_id: str, value_id: str):
        """Associate a meme with a value"""
        if meme_id in self.culture.memes and value_id in self.culture.values:
            meme = self.culture.memes[meme_id]
            value = self.culture.values[value_id]

            if meme_id not in value.associated_memes:
                value.associated_memes.append(meme_id)

            # Linked memes strengthen values
            value.strength = min(1.0, value.strength + 0.1)

    def get_dominant_culture(self) -> Dict[str, any]:
        """Identify most prominent cultural elements"""
        dominant_meme = None
        max_adoptions = 0

        for meme in self.culture.memes.values():
            if meme.adoption_count > max_adoptions:
                max_adoptions = meme.adoption_count
                dominant_meme = meme

        dominant_ritual = None
        max_participation = 0

        for ritual in self.culture.rituals.values():
            if ritual.participation_rate > max_participation:
                max_participation = ritual.participation_rate
                dominant_ritual = ritual

        dominant_value = None
        max_strength = 0

        for value in self.culture.values.values():
            if value.strength > max_strength:
                max_strength = value.strength
                dominant_value = value

        return {
            "dominant_meme": dominant_meme.name if dominant_meme else None,
            "dominant_ritual": dominant_ritual.name if dominant_ritual else None,
            "dominant_value": dominant_value.name if dominant_value else None,
            "overall_cohesion": round(self.culture.cultural_cohesion, 3),
        }
