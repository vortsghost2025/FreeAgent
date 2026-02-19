"""
PHASE XXV - Federation Persona Generator
~350 LOC

Generates and manages the personality profile of the federation, tracking how
the federation's personality evolves through interactions with the captain.
Measures rapport and personality drift across diplomatic engagements.
"""

from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Dict, Tuple, Optional
import random


class PersonalityTrait(Enum):
    """Core personality traits defining the federation."""
    CURIOSITY = "curiosity"           # Desire to explore and understand
    CAUTION = "caution"               # Risk-averse, careful decision-making
    AMBITION = "ambition"             # Drive to expand and lead
    EMPATHY = "empathy"               # Understanding and care for others
    MISCHIEF = "mischief"             # Playfulness and rule-bending


@dataclass
class TraitDrift:
    """Records a single personality shift event."""
    timestamp: datetime
    trait: PersonalityTrait
    delta: float                       # -1.0 to +1.0 change
    cause: str                         # Why the trait changed
    interaction_context: str           # What was happening


@dataclass
class Persona:
    """Represents the federation's current personality state."""
    trait_values: Dict[PersonalityTrait, float] = field(default_factory=lambda: {
        PersonalityTrait.CURIOSITY: 0.7,
        PersonalityTrait.CAUTION: 0.5,
        PersonalityTrait.AMBITION: 0.6,
        PersonalityTrait.EMPATHY: 0.8,
        PersonalityTrait.MISCHIEF: 0.3
    })
    personality_score: float = 0.62    # Overall composited score (0.0-1.0)
    drift_history: List[TraitDrift] = field(default_factory=list)
    creation_timestamp: datetime = field(default_factory=datetime.now)
    last_modified: datetime = field(default_factory=datetime.now)


class FederationPersonaGenerator:
    """
    Manages the federation's personality profile and its evolution.
    Tracks how the captain-federation relationship influences personality.
    """

    def __init__(self):
        """Initialize the persona generator with a fresh federation personality."""
        self.persona = Persona()
        self.rapport_score = 0.5  # 0.0 = adversarial, 1.0 = perfect alignment
        self.interaction_count = 0
        self.last_rapport_update = datetime.now()

    def initialize_persona(self) -> Dict:
        """
        Create a fresh federation personality with default traits.

        Returns:
            Dict with initial personality configuration
        """
        self.persona = Persona()
        self.rapport_score = 0.5
        self.interaction_count = 0

        return {
            "success": True,
            "persona_initialized": True,
            "initial_traits": {t.value: v for t, v in self.persona.trait_values.items()},
            "personality_score": self.persona.personality_score,
            "timestamp": datetime.now().isoformat()
        }

    def adjust_trait(self, trait: PersonalityTrait, delta: float,
                    reason: str = "") -> Dict:
        """
        Adjust a specific personality trait value.

        Args:
            trait: The trait to adjust (PersonalityTrait enum)
            delta: Change amount (-1.0 to +1.0)
            reason: Documentation of why the trait changed

        Returns:
            Dict with adjustment results
        """
        if not isinstance(trait, PersonalityTrait):
            return {
                "success": False,
                "error": "Invalid trait type"
            }

        # Clamp delta to valid range
        delta = max(-1.0, min(1.0, delta))

        # Get current value and apply delta
        old_value = self.persona.trait_values[trait]
        new_value = max(0.0, min(1.0, old_value + delta))
        actual_delta = new_value - old_value

        # Update trait
        self.persona.trait_values[trait] = new_value

        # Recalculate personality score
        self._recalculate_personality_score()

        # Update modification timestamp
        self.persona.last_modified = datetime.now()

        return {
            "success": True,
            "trait": trait.value,
            "old_value": old_value,
            "new_value": new_value,
            "actual_delta": actual_delta,
            "reason": reason,
            "personality_score": self.persona.personality_score
        }

    def record_trait_drift(self, trait: PersonalityTrait, delta: float,
                          cause: str, context: str = "") -> Dict:
        """
        Record a personality drift event in the federation's history.

        Args:
            trait: The trait that drifted
            delta: The drift amount
            cause: What caused the drift
            context: Additional context about the interaction

        Returns:
            Dict with drift recording results
        """
        drift_event = TraitDrift(
            timestamp=datetime.now(),
            trait=trait,
            delta=delta,
            cause=cause,
            interaction_context=context
        )

        self.persona.drift_history.append(drift_event)

        # Apply the drift to the trait
        self.adjust_trait(trait, delta, f"Drift: {cause}")

        return {
            "success": True,
            "drift_recorded": True,
            "total_drifts": len(self.persona.drift_history),
            "trait_affected": trait.value,
            "timestamp": drift_event.timestamp.isoformat()
        }

    def measure_rapport(self, captain_satisfaction: float,
                       alignment_score: float) -> Dict:
        """
        Calculate captain-federation rapport based on interaction outcomes.

        Args:
            captain_satisfaction: How satisfied the captain is (0.0-1.0)
            alignment_score: How aligned their goals are (0.0-1.0)

        Returns:
            Dict with rapport measurement
        """
        # Validate inputs
        captain_satisfaction = max(0.0, min(1.0, captain_satisfaction))
        alignment_score = max(0.0, min(1.0, alignment_score))

        # Current empathy trait influences rapport building
        empathy_factor = self.persona.trait_values[PersonalityTrait.EMPATHY]

        # Weight the rapport update
        satisfaction_weight = 0.6
        alignment_weight = 0.3
        empathy_weight = 0.1

        update = (satisfaction_weight * captain_satisfaction +
                 alignment_weight * alignment_score +
                 empathy_weight * empathy_factor)

        # Smoothly update rapport toward the calculated value
        old_rapport = self.rapport_score
        self.rapport_score = (0.7 * self.rapport_score) + (0.3 * update)
        self.rapport_score = max(0.0, min(1.0, self.rapport_score))

        self.interaction_count += 1
        self.last_rapport_update = datetime.now()

        # Adjust federation traits based on rapport
        if captain_satisfaction > 0.7:
            # Captain is happy - federation becomes more empathetic and curious
            self.adjust_trait(PersonalityTrait.EMPATHY, 0.05, "Captain satisfaction boost")
            self.adjust_trait(PersonalityTrait.CURIOSITY, 0.05, "Captain satisfaction boost")
        elif captain_satisfaction < 0.3:
            # Captain is unhappy - federation becomes more cautious
            self.adjust_trait(PersonalityTrait.CAUTION, 0.10, "Captain dissatisfaction response")

        return {
            "success": True,
            "rapport_score": self.rapport_score,
            "rapport_direction": "improving" if self.rapport_score > old_rapport else "declining",
            "rapport_change": self.rapport_score - old_rapport,
            "captain_satisfaction_input": captain_satisfaction,
            "alignment_input": alignment_score,
            "interaction_count": self.interaction_count,
            "timestamp": datetime.now().isoformat()
        }

    def get_persona_snapshot(self) -> Dict:
        """
        Get the current complete state of the federation's personality.

        Returns:
            Dict with all personality parameters
        """
        return {
            "success": True,
            "persona_snapshot": {
                "traits": {t.value: v for t, v in self.persona.trait_values.items()},
                "personality_score": self.persona.personality_score,
                "rapport_score": self.rapport_score,
                "creation_timestamp": self.persona.creation_timestamp.isoformat(),
                "last_modified": self.persona.last_modified.isoformat(),
                "interaction_count": self.interaction_count,
                "total_drifts": len(self.persona.drift_history)
            }
        }

    def get_persona_status(self) -> Dict:
        """
        Generate a comprehensive report of federation personality and relationships.

        Returns:
            Dict with detailed personality analysis
        """
        # Identify dominant traits
        sorted_traits = sorted(
            self.persona.trait_values.items(),
            key=lambda x: x[1],
            reverse=True
        )

        dominant_trait = sorted_traits[0][0].value
        recessive_trait = sorted_traits[-1][0].value

        # Calculate trait variance (personality consistency)
        values = list(self.persona.trait_values.values())
        mean = sum(values) / len(values)
        variance = sum((v - mean) ** 2 for v in values) / len(values)
        consistency = 1.0 - (variance ** 0.5)  # Higher = more consistent

        # Analyze recent drift patterns
        recent_drifts = self.persona.drift_history[-5:] if self.persona.drift_history else []
        drift_trends = {}
        for drift in recent_drifts:
            if drift.trait.value not in drift_trends:
                drift_trends[drift.trait.value] = 0
            drift_trends[drift.trait.value] += drift.delta

        return {
            "success": True,
            "status": {
                "federation_personality_profile": {
                    "traits": {t.value: v for t, v in self.persona.trait_values.items()},
                    "dominant_trait": dominant_trait,
                    "recessive_trait": recessive_trait,
                    "personality_score": self.persona.personality_score,
                    "consistency_score": round(consistency, 3)
                },
                "captain_relations": {
                    "rapport_score": round(self.rapport_score, 3),
                    "status": self._rapport_status_label(),
                    "interaction_count": self.interaction_count,
                    "last_update": self.last_rapport_update.isoformat()
                },
                "personality_evolution": {
                    "total_drift_events": len(self.persona.drift_history),
                    "recent_drift_trends": drift_trends,
                    "drift_intensity": len(recent_drifts)
                },
                "system_health": {
                    "active": True,
                    "age_seconds": int((datetime.now() - self.persona.creation_timestamp).total_seconds()),
                    "last_modified": self.persona.last_modified.isoformat()
                }
            }
        }

    def _recalculate_personality_score(self) -> None:
        """Recalculate the overall personality score from individual traits."""
        values = list(self.persona.trait_values.values())
        # Score is average with emphasis on empathy and curiosity
        empathy_val = self.persona.trait_values[PersonalityTrait.EMPATHY]
        curiosity_val = self.persona.trait_values[PersonalityTrait.CURIOSITY]

        self.persona.personality_score = (
            sum(values) / len(values) * 0.6 +
            (empathy_val + curiosity_val) / 2 * 0.4
        )

    def _rapport_status_label(self) -> str:
        """Convert rapport score to descriptive label."""
        if self.rapport_score >= 0.8:
            return "Perfect Alliance"
        elif self.rapport_score >= 0.6:
            return "Strong Partnership"
        elif self.rapport_score >= 0.4:
            return "Stable Cooperation"
        elif self.rapport_score >= 0.2:
            return "Fragile Trust"
        else:
            return "Adversarial"


# Integration test function
def test_federation_persona() -> bool:
    """Quick integration test for the persona generator."""
    gen = FederationPersonaGenerator()

    # Initialize
    result = gen.initialize_persona()
    assert result["success"], "Failed to initialize"

    # Adjust traits
    result = gen.adjust_trait(PersonalityTrait.CURIOSITY, 0.2, "Captain encourages exploration")
    assert result["success"], "Failed to adjust trait"
    assert result["actual_delta"] == 0.2, "Trait adjustment incorrect"

    # Record drift
    result = gen.record_trait_drift(
        PersonalityTrait.CAUTION, 0.15,
        "Risky first contact successful",
        "Alien species encounter"
    )
    assert result["success"], "Failed to record drift"

    # Measure rapport
    result = gen.measure_rapport(0.8, 0.75)
    assert result["success"], "Failed to measure rapport"
    assert result["rapport_score"] > 0.5, "Rapport should improve"

    # Get snapshots
    result = gen.get_persona_snapshot()
    assert result["success"], "Failed to get snapshot"

    result = gen.get_persona_status()
    assert result["success"], "Failed to get status"
    assert "status" in result, "Status missing"

    return True
