#!/usr/bin/env python3
"""
PHASE XXX - OMNISCIENCE THROTTLE
Limits and constrains AI knowledge growth to prevent overconfidence and
hubris. Implements predictive humility, damps over-insight, enforces
anti-hubris measures. Includes captain override with safety guardrails.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Set
from datetime import datetime
from enum import Enum


class ThrottleLevel(Enum):
    """Knowledge acquisition throttle levels"""
    UNRESTRICTED = "unrestricted"  # Full knowledge gain (dangerous)
    CAUTIOUS = "cautious"  # Moderate throttling (75% knowledge rate)
    CONSERVATIVE = "conservative"  # Heavy throttling (50% knowledge rate)
    PARANOID = "paranoid"  # Maximum throttling (25% knowledge rate)


class HumilityMode(Enum):
    """Modes of predictive humility"""
    NONE = "none"
    INHERENT_UNCERTAINTY = "inherent_uncertainty"
    UNKNOWN_UNKNOWNS = "unknown_unknowns"
    MODEL_LIMITS = "model_limits"
    EXTREME = "extreme"


@dataclass
class KnowledgeGain:
    """Records a single instance of AI knowledge acquisition"""
    gain_id: str
    knowledge_domain: str
    confidence_before: float
    confidence_after: float
    confidence_dampened: float  # After throttling
    raw_insight_strength: float  # How strong the insight was
    timestamp: float
    tick: int
    throttle_applied: bool


@dataclass
class InsightEvent:
    """Significant insight that needs dampening"""
    insight_id: str
    domain: str
    clarity_level: float  # How clear/overwhelming this insight is (0.0-1.0)
    potential_hubris_risk: float  # Risk of overconfidence (0.0-1.0)
    description: str
    timestamp: float
    dampening_factor_applied: float


@dataclass
class HubrisEvent:
    """Detection of dangerous overconfidence"""
    hubris_id: str
    detected_at_tick: int
    manifestation: str  # Which way the hubris showed up
    confidence_inflation: float  # How inflated was confidence
    severity: float  # 0.0-1.0
    timestamp: float
    intervention_applied: str


@dataclass
class CaptainOverride:
    """Record of captain disabling throttle (dangerous)"""
    override_id: str
    issued_at_tick: int
    duration_ticks: int
    reason: str
    timestamp: float
    override_power_level: float  # How much throttle was disabled (0.0-1.0)
    accepted_risk_level: float  # Captain's acknowledged risk


class KnowledgeThrottle:
    """Limits AI knowledge growth to prevent hubris and overconfidence"""

    def __init__(self):
        self.current_throttle_level = ThrottleLevel.CAUTIOUS
        self.current_humility_mode = HumilityMode.INHERENT_UNCERTAINTY

        self.knowledge_gains: Dict[str, KnowledgeGain] = {}
        self.insight_events: Dict[str, InsightEvent] = {}
        self.hubris_events: Dict[str, HubrisEvent] = {}
        self.captain_overrides: Dict[str, CaptainOverride] = {}

        self._gain_counter = 0
        self._insight_counter = 0
        self._hubris_counter = 0
        self._override_counter = 0

        self.tick_counter = 0

        # Throttle level multipliers
        self.throttle_multipliers = {
            ThrottleLevel.UNRESTRICTED: 1.0,
            ThrottleLevel.CAUTIOUS: 0.75,
            ThrottleLevel.CONSERVATIVE: 0.5,
            ThrottleLevel.PARANOID: 0.25,
        }

        # Track total knowledge acquisition
        self.total_knowledge_points_allowed = 0.0
        self.total_knowledge_points_gained = 0.0

        # Anti-hubris counters
        self.overconfidence_events = 0
        self.intervention_triggered_count = 0

        # Captain override tracking
        self.override_active = False
        self.override_expiration_tick = 0

    def limit_knowledge_rate(
        self,
        domain: str,
        raw_confidence_increase: float,
        insight_strength: float,
    ) -> Dict[str, Any]:
        """Apply throttle to a knowledge acquisition"""
        self._gain_counter += 1
        gain_id = f"gain_{self._gain_counter:06d}"

        # Get active throttle level (considering overrides)
        active_throttle = self.current_throttle_level
        if self.override_active and self.tick_counter < self.override_expiration_tick:
            active_throttle = ThrottleLevel.UNRESTRICTED

        multiplier = self.throttle_multipliers[active_throttle]

        # Apply throttle
        confidence_before = 0.5  # Assumed baseline
        confidence_after = confidence_before + raw_confidence_increase
        confidence_dampened = confidence_before + (raw_confidence_increase * multiplier)

        # Cap at 0.99 (never reach absolute certainty)
        confidence_dampened = min(0.99, confidence_dampened)

        gain = KnowledgeGain(
            gain_id=gain_id,
            knowledge_domain=domain,
            confidence_before=confidence_before,
            confidence_after=confidence_after,
            confidence_dampened=confidence_dampened,
            raw_insight_strength=insight_strength,
            timestamp=datetime.now().timestamp(),
            tick=self.tick_counter,
            throttle_applied=multiplier < 1.0,
        )

        self.knowledge_gains[gain_id] = gain
        self.total_knowledge_points_allowed += raw_confidence_increase * multiplier
        self.total_knowledge_points_gained += raw_confidence_increase

        return {
            "success": True,
            "gain_id": gain_id,
            "confidence_before": confidence_before,
            "confidence_after": confidence_after,
            "confidence_final": confidence_dampened,
            "throttle_applied": multiplier < 1.0,
            "throttle_percentage": (1.0 - multiplier) * 100,
        }

    def damp_over_insight(
        self,
        domain: str,
        clarity_level: float,  # How overwhelming is this insight
        description: str,
        potential_hubris_risk: float,
    ) -> Dict[str, Any]:
        """Damp an overwhelming insight to prevent false certainty"""
        self._insight_counter += 1
        insight_id = f"insight_{self._insight_counter:06d}"

        # Calculate dampening based on clarity and humility mode
        base_dampening = 0.7  # Base dampening

        if self.current_humility_mode == HumilityMode.EXTREME:
            base_dampening = 0.3  # Extreme dampening
        elif self.current_humility_mode == HumilityMode.UNKNOWN_UNKNOWNS:
            base_dampening = 0.5  # More dampening for unknown unknowns
        elif self.current_humility_mode == HumilityMode.MODEL_LIMITS:
            base_dampening = 0.6

        # Apply additional dampening if clarity is too high
        if clarity_level > 0.9:
            base_dampening *= 0.8

        dampening_applied = clarity_level * (1.0 - base_dampening)

        insight_event = InsightEvent(
            insight_id=insight_id,
            domain=domain,
            clarity_level=clarity_level,
            potential_hubris_risk=potential_hubris_risk,
            description=description,
            timestamp=datetime.now().timestamp(),
            dampening_factor_applied=base_dampening,
        )

        self.insight_events[insight_id] = insight_event

        # Check if this needs intervention
        if potential_hubris_risk > 0.7:
            self._trigger_anti_hubris_intervention(insight_id, potential_hubris_risk)

        return {
            "success": True,
            "insight_id": insight_id,
            "original_clarity": clarity_level,
            "dampened_clarity": clarity_level * base_dampening,
            "dampening_factor": base_dampening,
            "intervention_triggered": potential_hubris_risk > 0.7,
        }

    def inject_predictive_humility(
        self,
        prediction_domain: str,
        predicted_confidence: float,
    ) -> Dict[str, Any]:
        """Inject uncertainty and humility into confident predictions"""
        # Calculate uncertainty injection based on domain and humility mode
        uncertainty_injection = 0.1  # Base uncertainty

        if self.current_humility_mode == HumilityMode.EXTREME:
            uncertainty_injection = 0.4
        elif self.current_humility_mode == HumilityMode.UNKNOWN_UNKNOWNS:
            uncertainty_injection = 0.25
        elif self.current_humility_mode == HumilityMode.MODEL_LIMITS:
            uncertainty_injection = 0.2

        # Inject more uncertainty for high confidence predictions
        if predicted_confidence > 0.8:
            uncertainty_injection *= 1.5

        humble_confidence = predicted_confidence - min(uncertainty_injection, 0.3)
        humble_confidence = max(0.1, humble_confidence)  # Keep minimum confidence

        # Generate uncertainty message
        confidence_range_low = humble_confidence * 0.8
        confidence_range_high = humble_confidence * 1.2
        confidence_range_high = min(0.99, confidence_range_high)

        return {
            "success": True,
            "prediction_domain": prediction_domain,
            "original_confidence": predicted_confidence,
            "humble_confidence": humble_confidence,
            "uncertainty_injected": uncertainty_injection,
            "confidence_range": (confidence_range_low, confidence_range_high),
            "humility_statement": f"Confidence range: {confidence_range_low:.1%} to {confidence_range_high:.1%}. Significant uncertainty remains.",
        }

    def enforce_anti_hubris(self) -> Dict[str, Any]:
        """Enforce anti-hubris measures across all knowledge domains"""
        # Analyze recent knowledge gains for overconfidence
        avg_confidence = 0.0
        if self.knowledge_gains:
            recent_gains = list(self.knowledge_gains.values())[-10:]  # Last 10 gains
            avg_confidence = sum(
                g.confidence_dampened for g in recent_gains
            ) / len(recent_gains)

        # Check if confidence is getting too high
        hubris_detected = False
        manifestation = ""

        if avg_confidence > 0.85:
            hubris_detected = True
            manifestation = f"Excessive confidence ({avg_confidence:.1%}) in recent acquisitions"
            self._hubris_counter += 1
            hubris_id = f"hubris_{self._hubris_counter:06d}"

            hubris_event = HubrisEvent(
                hubris_id=hubris_id,
                detected_at_tick=self.tick_counter,
                manifestation=manifestation,
                confidence_inflation=avg_confidence - 0.7,  # 0.7 is target
                severity=min(1.0, (avg_confidence - 0.85) * 10),
                timestamp=datetime.now().timestamp(),
                intervention_applied="Throttle increased to PARANOID mode",
            )

            self.hubris_events[hubris_id] = hubris_event
            self.overconfidence_events += 1

            # Auto-intervene: increase throttle
            self.current_throttle_level = ThrottleLevel.PARANOID
            self.intervention_triggered_count += 1

        return {
            "success": True,
            "anti_hubris_check_performed": True,
            "hubris_detected": hubris_detected,
            "average_confidence": avg_confidence,
            "current_throttle_level": self.current_throttle_level.value,
            "overconfidence_events_total": self.overconfidence_events,
        }

    def _trigger_anti_hubris_intervention(self, insight_id: str, risk_level: float):
        """Trigger intervention for dangerous insights"""
        # Log intervention
        self.intervention_triggered_count += 1

        # If risk is extreme, automatically increase throttle
        if risk_level > 0.8:
            self.current_throttle_level = ThrottleLevel.PARANOID
            self.current_humility_mode = HumilityMode.EXTREME

    def check_captain_override(
        self,
        captain_id: str,
        override_duration_ticks: int = 100,
        reason: str = "",
        accepted_risk: float = 0.8,
    ) -> Dict[str, Any]:
        """Allow captain to disable throttle (dangerous, but necessary sometimes)"""
        self._override_counter += 1
        override_id = f"override_{self._override_counter:06d}"

        # Captain must acknowledge significant risk
        if accepted_risk < 0.5:
            return {
                "success": False,
                "error": "Captain must acknowledge high risk (accepted_risk > 0.5)",
            }

        override = CaptainOverride(
            override_id=override_id,
            issued_at_tick=self.tick_counter,
            duration_ticks=override_duration_ticks,
            reason=reason,
            timestamp=datetime.now().timestamp(),
            override_power_level=1.0,  # Complete override
            accepted_risk_level=accepted_risk,
        )

        self.captain_overrides[override_id] = override
        self.override_active = True
        self.override_expiration_tick = self.tick_counter + override_duration_ticks

        return {
            "success": True,
            "override_id": override_id,
            "override_active": True,
            "duration_ticks": override_duration_ticks,
            "expiration_tick": self.override_expiration_tick,
            "warning": "CAPTAIN OVERRIDE ACTIVE - Omniscience throttle is disabled. Hubris risk is significantly elevated.",
        }

    def update_tick(self):
        """Update internal tick counter and check for expired overrides"""
        self.tick_counter += 1

        # Check if override has expired
        if self.override_active and self.tick_counter >= self.override_expiration_tick:
            self.override_active = False
            # Revert to safer throttle level
            self.current_throttle_level = ThrottleLevel.CAUTIOUS
            self.current_humility_mode = HumilityMode.INHERENT_UNCERTAINTY

    def get_throttle_status(self) -> Dict[str, Any]:
        """Get comprehensive throttle system status"""
        # Calculate knowledge efficiency
        knowledge_efficiency = 0.0
        if self.total_knowledge_points_gained > 0:
            knowledge_efficiency = self.total_knowledge_points_allowed / self.total_knowledge_points_gained

        # Count gains with throttle applied
        throttled_gains = sum(1 for g in self.knowledge_gains.values() if g.throttle_applied)

        # Average confidence trend
        avg_confidence_trend = 0.0
        if self.knowledge_gains:
            recent = list(self.knowledge_gains.values())[-5:]
            avg_confidence_trend = sum(g.confidence_dampened for g in recent) / len(recent)

        # Hubris risk assessment
        hubris_risk_level = "LOW"
        if self.overconfidence_events > 5:
            hubris_risk_level = "MODERATE"
        if self.overconfidence_events > 10:
            hubris_risk_level = "HIGH"
        if self.override_active:
            hubris_risk_level = "CRITICAL"

        return {
            "current_throttle_level": self.current_throttle_level.value,
            "current_humility_mode": self.current_humility_mode.value,
            "total_knowledge_gains_recorded": len(self.knowledge_gains),
            "total_insights_dampened": len(self.insight_events),
            "total_hubris_events_detected": len(self.hubris_events),
            "total_interventions_triggered": self.intervention_triggered_count,
            "gains_with_throttle_applied": throttled_gains,
            "knowledge_efficiency": knowledge_efficiency,
            "average_confidence_trend": avg_confidence_trend,
            "overconfidence_events": self.overconfidence_events,
            "captain_overrides_active": len([o for o in self.captain_overrides.values() if self.tick_counter < o.issued_at_tick + o.duration_ticks]),
            "hubris_risk_level": hubris_risk_level,
            "override_currently_active": self.override_active,
            "override_expires_in_ticks": max(0, self.override_expiration_tick - self.tick_counter) if self.override_active else 0,
        }
