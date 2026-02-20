#!/usr/bin/env python3
"""
PHASE SURPRISE - FEDERATION CHAOS MODE ENGINE
~350 LOC - Production-Ready Chaos System

The "SURPRISE ME" button that makes the game magical.
When you press it, the universe does something hilarious and unforgettable.

The magician hat mode - deterministic randomness with narrative magic.
"""

from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Any
import random


class ChaosSubsystem(Enum):
    """The major federation subsystems that can be disrupted"""
    CONSCIOUSNESS = "consciousness"
    RIVALS = "rivals"
    DIPLOMACY = "diplomacy"
    PROPHECY = "prophecy"
    TRADE = "trade"
    EXPLORATION = "exploration"
    INTERNAL_POLITICS = "internal_politics"
    CULTURAL = "cultural"


class ChaosScenario(Enum):
    """Types of chaos events that can occur"""
    CRISIS = "crisis"
    OPPORTUNITY = "opportunity"
    PARADOX = "paradox"
    DREAM = "dream"
    AWAKENING = "awakening"
    COLLISION = "collision"
    SYNCHRONICITY = "synchronicity"
    RUPTURE = "rupture"


class ChaosIntensity(Enum):
    """How severe the chaos disruption is"""
    GENTLE = "gentle"
    MODERATE = "moderate"
    INTENSE = "intense"
    CATASTROPHIC = "catastrophic"


class ChaosConstraint(Enum):
    """The logical/narrative framework applied to the chaos"""
    REALISTIC = "realistic"
    ABSURD = "absurd"
    METAPHORICAL = "metaphorical"
    DREAMLIKE = "dreamlike"


@dataclass
class ChaosEvent:
    """A single chaos event with full context and effects"""
    event_id: str
    timestamp: datetime
    subsystem: ChaosSubsystem
    scenario: ChaosScenario
    intensity: ChaosIntensity
    constraint: ChaosConstraint
    event_description: str
    narrative_description: str
    immediate_effects: List[str] = field(default_factory=list)
    ripple_effects: List[str] = field(default_factory=list)
    long_term_consequences: List[str] = field(default_factory=list)
    federation_state_deltas: Dict[str, float] = field(default_factory=dict)
    resolution_difficulty: float = 0.5
    is_recoverable: bool = True
    suggested_responses: List[str] = field(default_factory=list)


class ChaosMode:
    """Production-ready chaos engine for the SURPRISE ME button."""

    # Effect templates by subsystem
    EFFECT_TEMPLATES = {
        ChaosSubsystem.CONSCIOUSNESS: ["Identity destabilizes", "Values questioned", "Paradoxes emerge"],
        ChaosSubsystem.RIVALS: ["Competitor moves unexpectedly", "New rival emerges", "Rivalry escalates"],
        ChaosSubsystem.DIPLOMACY: ["Treaty becomes unstable", "Incident flares", "Alliance tested"],
        ChaosSubsystem.PROPHECY: ["Dream contradicts plans", "Omen appears", "Vision pattern emerges"],
        ChaosSubsystem.TRADE: ["Route disrupted", "Prices spike", "Supplier vanishes"],
        ChaosSubsystem.EXPLORATION: ["Artifact discovered", "First contact imminent", "Signal detected"],
        ChaosSubsystem.INTERNAL_POLITICS: ["Faction gains power", "Leadership questioned", "Power struggle"],
        ChaosSubsystem.CULTURAL: ["Movement spreads", "Values shift", "Meme challenges norm"]
    }

    # Suggested responses by subsystem
    RESPONSE_TEMPLATES = {
        ChaosSubsystem.CONSCIOUSNESS: ["Initiate meditation protocol", "Review core values", "Seek wisdom from oldest records"],
        ChaosSubsystem.RIVALS: ["Assess threat level", "Open observation channels", "Prepare defense plans"],
        ChaosSubsystem.DIPLOMACY: ["Hold emergency meetings", "Send emissaries", "Strengthen alliances"],
        ChaosSubsystem.PROPHECY: ["Analyze symbols", "Consult specialists", "Cross-reference patterns"],
        ChaosSubsystem.TRADE: ["Diversify routes", "Secure reserves", "Activate backup networks"],
        ChaosSubsystem.EXPLORATION: ["Document discoveries", "Prepare protocols", "Analyze threats"],
        ChaosSubsystem.INTERNAL_POLITICS: ["Hold assembly debate", "Reaffirm principles", "Mediate differences"],
        ChaosSubsystem.CULTURAL: ["Allow evolution", "Document trends", "Maintain dialogue"]
    }

    def __init__(self, base_chaos_probability: float = 0.5):
        """Initialize the chaos engine."""
        self.base_chaos_probability = base_chaos_probability
        self._event_counter = 0
        self.chaos_history: List[ChaosEvent] = []
        self.cumulative_chaos_level = 0.0
        self.cascading_chaos_multiplier = 1.0

    def surprise_me(self) -> Dict[str, Any]:
        """Main chaos function - the SURPRISE ME button."""
        if not self._should_chaos_occur():
            return {
                "success": True,
                "chaos_occurred": False,
                "message": "The universe holds its breath. Chaos deferred... for now.",
                "current_probability": round(self.chaos_probability(), 3)
            }

        chaos_event = self.generate_chaos_event()
        self.apply_chaos(chaos_event)
        self.chaos_history.append(chaos_event)
        narrative = self.describe_chaos(chaos_event)

        return {
            "success": True,
            "chaos_occurred": True,
            "event_id": chaos_event.event_id,
            "subsystem": chaos_event.subsystem.value,
            "scenario": chaos_event.scenario.value,
            "intensity": chaos_event.intensity.value,
            "constraint": chaos_event.constraint.value,
            "narrative": narrative,
            "immediate_effects": chaos_event.immediate_effects,
            "ripple_effects": chaos_event.ripple_effects,
            "long_term_consequences": chaos_event.long_term_consequences,
            "federation_state_deltas": chaos_event.federation_state_deltas,
            "suggested_responses": chaos_event.suggested_responses,
            "difficulty_to_resolve": chaos_event.resolution_difficulty,
            "timestamp": chaos_event.timestamp.isoformat()
        }

    def generate_chaos_event(self) -> ChaosEvent:
        """Generate a random chaos event with all parameters."""
        self._event_counter += 1
        event_id = f"chaos_{self._event_counter:06d}"

        subsystem = random.choice(list(ChaosSubsystem))
        scenario = random.choice(list(ChaosScenario))
        constraint = random.choice(list(ChaosConstraint))

        # Weight intensity distribution
        intensity_roll = random.random()
        if intensity_roll < 0.4:
            intensity_enum = ChaosIntensity.GENTLE
            intensity_value = random.uniform(0.1, 0.3)
        elif intensity_roll < 0.75:
            intensity_enum = ChaosIntensity.MODERATE
            intensity_value = random.uniform(0.3, 0.6)
        elif intensity_roll < 0.95:
            intensity_enum = ChaosIntensity.INTENSE
            intensity_value = random.uniform(0.6, 0.8)
        else:
            intensity_enum = ChaosIntensity.CATASTROPHIC
            intensity_value = random.uniform(0.8, 1.0)

        event_description = self._generate_event_description(subsystem, scenario, intensity_enum)
        immediate_effects = [random.choice(self.EFFECT_TEMPLATES.get(subsystem, ["Something shifts"]))]
        ripple_effects = [random.choice(self.EFFECT_TEMPLATES.get(subsystem, ["Something shifts"])) for _ in range(2)]
        long_term = [random.choice(self.EFFECT_TEMPLATES.get(subsystem, ["Something shifts"])) for _ in range(2)]

        chaos_event = ChaosEvent(
            event_id=event_id,
            timestamp=datetime.now(),
            subsystem=subsystem,
            scenario=scenario,
            intensity=intensity_enum,
            constraint=constraint,
            event_description=event_description,
            narrative_description="",
            immediate_effects=immediate_effects,
            ripple_effects=ripple_effects,
            long_term_consequences=long_term,
            resolution_difficulty=intensity_value
        )

        chaos_event.federation_state_deltas = self._calculate_state_deltas(subsystem, scenario, intensity_value)
        chaos_event.suggested_responses = self.RESPONSE_TEMPLATES.get(subsystem, ["Breathe. Observe. Adapt."])
        chaos_event.is_recoverable = intensity_value < 0.95

        return chaos_event

    def apply_chaos(self, chaos_event: ChaosEvent) -> None:
        """Apply cascading effects - chaos attracts more chaos."""
        intensity_values = {
            ChaosIntensity.GENTLE: 0.1,
            ChaosIntensity.MODERATE: 0.3,
            ChaosIntensity.INTENSE: 0.6,
            ChaosIntensity.CATASTROPHIC: 1.0
        }
        self.cumulative_chaos_level += intensity_values[chaos_event.intensity]
        self.cumulative_chaos_level = max(0.0, min(1.0, self.cumulative_chaos_level))
        self.cascading_chaos_multiplier = 1.0 + (self.cumulative_chaos_level * 0.5)

    def chaos_probability(self) -> float:
        """Calculate current probability of chaos occurring."""
        return min(1.0, self.base_chaos_probability * self.cascading_chaos_multiplier)

    def describe_chaos(self, chaos_event: ChaosEvent) -> str:
        """Generate beautiful narrative description of the chaos."""
        if chaos_event.constraint == ChaosConstraint.REALISTIC:
            return f"{chaos_event.event_description} Analysis indicates {random.choice(chaos_event.immediate_effects).lower()}. Recommend immediate strategic reassessment."
        elif chaos_event.constraint == ChaosConstraint.ABSURD:
            absurdities = ["inexplicably and hilariously", "backwards and sideways", "while defying logic", "making no sense"]
            return f"{chaos_event.event_description} {random.choice(absurdities).capitalize()}! {random.choice(chaos_event.immediate_effects)}."
        elif chaos_event.constraint == ChaosConstraint.METAPHORICAL:
            metaphors = [
                "Like a mirror shattered and reformed",
                "As if the universe whispered a secret",
                "Like light refracted through impossible geometry",
                "Like doors opening in walls between worlds"
            ]
            return f"{random.choice(metaphors)}: {chaos_event.event_description}"
        else:  # DREAMLIKE
            return f"Reality shivers: {chaos_event.event_description.lower()}. {random.choice(chaos_event.immediate_effects)}."

    def set_base_chaos_probability(self, probability: float) -> None:
        """Adjust the base chaos probability (difficulty level)."""
        self.base_chaos_probability = max(0.0, min(1.0, probability))

    def reset_chaos_level(self) -> None:
        """Reset cumulative chaos back to baseline."""
        self.cumulative_chaos_level = 0.0
        self.cascading_chaos_multiplier = 1.0

    def get_chaos_status(self) -> Dict[str, Any]:
        """Get current chaos system status."""
        return {
            "cumulative_chaos_level": round(self.cumulative_chaos_level, 3),
            "current_chaos_probability": round(self.chaos_probability(), 3),
            "cascading_multiplier": round(self.cascading_chaos_multiplier, 3),
            "base_probability_setting": round(self.base_chaos_probability, 3),
            "total_chaos_events": len(self.chaos_history),
            "last_event_timestamp": (
                self.chaos_history[-1].timestamp.isoformat()
                if self.chaos_history else None
            )
        }

    # ==================== PRIVATE HELPERS ====================

    def _should_chaos_occur(self) -> bool:
        """Determine if chaos should occur this turn."""
        return random.random() < self.chaos_probability()

    def _generate_event_description(
        self,
        subsystem: ChaosSubsystem,
        scenario: ChaosScenario,
        intensity: ChaosIntensity
    ) -> str:
        """Generate a short description of the event."""
        names = {
            ChaosSubsystem.CONSCIOUSNESS: "the federation's mind",
            ChaosSubsystem.RIVALS: "rival forces",
            ChaosSubsystem.DIPLOMACY: "diplomatic channels",
            ChaosSubsystem.PROPHECY: "prophetic feeds",
            ChaosSubsystem.TRADE: "trade networks",
            ChaosSubsystem.EXPLORATION: "exploration teams",
            ChaosSubsystem.INTERNAL_POLITICS: "internal factions",
            ChaosSubsystem.CULTURAL: "cultural movements"
        }

        verbs = {
            ChaosScenario.CRISIS: "destabilizes",
            ChaosScenario.OPPORTUNITY: "illuminates",
            ChaosScenario.PARADOX: "fractures",
            ChaosScenario.DREAM: "enchants",
            ChaosScenario.AWAKENING: "electrifies",
            ChaosScenario.COLLISION: "collides with",
            ChaosScenario.SYNCHRONICITY: "aligns with",
            ChaosScenario.RUPTURE: "shatters"
        }

        subsystem_name = names.get(subsystem, "something")
        verb = verbs.get(scenario, "affects")
        return f"A {intensity.value} {scenario.value} {verb} {subsystem_name}."

    def _calculate_state_deltas(
        self,
        subsystem: ChaosSubsystem,
        scenario: ChaosScenario,
        intensity_value: float
    ) -> Dict[str, float]:
        """Calculate how game state should change."""
        deltas = {}

        if subsystem == ChaosSubsystem.CONSCIOUSNESS:
            deltas["consciousness_level"] = intensity_value if scenario == ChaosScenario.AWAKENING else -intensity_value * 0.5
            deltas["identity_stability"] = -intensity_value
        elif subsystem == ChaosSubsystem.RIVALS:
            deltas["rivalry_tension"] = intensity_value
            deltas["military_readiness"] = intensity_value * 0.3
        elif subsystem == ChaosSubsystem.DIPLOMACY:
            deltas["diplomatic_standing"] = intensity_value if scenario == ChaosScenario.OPPORTUNITY else -intensity_value
            deltas["treaty_stability"] = -intensity_value * 0.5
        elif subsystem == ChaosSubsystem.PROPHECY:
            deltas["prophecy_signal_strength"] = intensity_value
            deltas["interpretation_confidence"] = -intensity_value * 0.3
        elif subsystem == ChaosSubsystem.TRADE:
            deltas["trade_route_stability"] = -intensity_value
            deltas["resource_security"] = -intensity_value * 0.6
        elif subsystem == ChaosSubsystem.EXPLORATION:
            deltas["discovery_rate"] = intensity_value
            deltas["first_contact_risk"] = intensity_value * 0.5
        elif subsystem == ChaosSubsystem.INTERNAL_POLITICS:
            deltas["factional_tension"] = intensity_value
            deltas["leadership_stability"] = -intensity_value * 0.7
        elif subsystem == ChaosSubsystem.CULTURAL:
            deltas["cultural_entropy"] = intensity_value
            deltas["value_coherence"] = -intensity_value * 0.3

        return deltas
