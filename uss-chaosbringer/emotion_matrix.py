#!/usr/bin/env python3
"""
PHASE XX - EMOTION MATRIX
Federation-level emotional states driving readiness and decisions.
Morale, confidence, anxiety, excitement dynamics across the fleet.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional
from datetime import datetime
from enum import Enum


class EmotionalState(Enum):
    """Federation emotional dimensions"""
    MORALE = "morale"  # Overall confidence and spirit
    CONFIDENCE = "confidence"  # Certainty in decisions
    ANXIETY = "anxiety"  # Worry about outcomes
    EXCITEMENT = "excitement"  # Enthusiasm and hope
    STABILITY = "stability"  # Emotional equilibrium


@dataclass
class EmotionalVector:
    """Emotional state at a point in time"""
    timestamp: float
    morale: float  # -1.0 to 1.0
    confidence: float  # -1.0 to 1.0
    anxiety: float  # -1.0 to 1.0
    excitement: float  # -1.0 to 1.0
    stability: float  # -1.0 to 1.0 (variance)
    source_event: str = ""


@dataclass
class EmotionalImpact:
    """How an event affects fleet emotions"""
    event_id: str
    event_type: str
    morale_delta: float
    confidence_delta: float
    anxiety_delta: float
    excitement_delta: float
    affected_ships: List[str] = field(default_factory=list)
    propagation_factor: float = 0.8


class EmotionMatrix:
    """Manages federation-level emotional states"""

    def __init__(self):
        self.emotional_history: List[EmotionalVector] = []
        self.current_state: EmotionalVector = self._initialize_emotions()
        self.impacts: Dict[str, EmotionalImpact] = {}
        self.impact_counter = 0
        self.emotional_cascade_events: List[str] = []

    def _initialize_emotions(self) -> EmotionalVector:
        """Initialize federation emotions at neutral baseline"""
        return EmotionalVector(
            timestamp=datetime.now().timestamp(),
            morale=0.5,
            confidence=0.6,
            anxiety=0.3,
            excitement=0.5,
            stability=0.7,
        )

    def apply_emotional_impact(
        self,
        event_id: str,
        event_type: str,
        morale_delta: float,
        confidence_delta: float,
        anxiety_delta: float,
        excitement_delta: float,
        affected_ships: List[str] = None,
    ) -> str:
        """Apply emotional impact from an event"""
        if affected_ships is None:
            affected_ships = []

        self.impact_counter += 1
        impact_id = f"impact_{self.impact_counter:04d}"

        impact = EmotionalImpact(
            event_id=event_id,
            event_type=event_type,
            morale_delta=morale_delta,
            confidence_delta=confidence_delta,
            anxiety_delta=anxiety_delta,
            excitement_delta=excitement_delta,
            affected_ships=affected_ships,
        )

        self.impacts[impact_id] = impact

        # Apply immediate impact
        self._update_emotions(impact)

        # Check for emotional cascades
        if self._should_cascade(impact):
            self._trigger_cascade(impact_id)

        return impact_id

    def _update_emotions(self, impact: EmotionalImpact):
        """Update current emotional state from impact"""
        current = self.current_state

        # Apply deltas with damping (prevents extreme swings)
        current.morale = self._clamp(current.morale + impact.morale_delta * 0.7, -1.0, 1.0)
        current.confidence = self._clamp(current.confidence + impact.confidence_delta * 0.7, -1.0, 1.0)
        current.anxiety = self._clamp(current.anxiety + impact.anxiety_delta * 0.7, -1.0, 1.0)
        current.excitement = self._clamp(current.excitement + impact.excitement_delta * 0.7, -1.0, 1.0)

        # Stability decreases with anxiety increase
        stability_adjust = -abs(impact.anxiety_delta) * 0.3
        current.stability = self._clamp(current.stability + stability_adjust, -1.0, 1.0)

        # Recalculate timestamp
        current.timestamp = datetime.now().timestamp()
        current.source_event = impact.event_id

        # Record in history
        self.emotional_history.append(self._copy_vector(current))

    def _should_cascade(self, impact: EmotionalImpact) -> bool:
        """Check if impact should trigger emotional cascade"""
        # Cascade if anxiety spikes or morale drops sharply
        if impact.anxiety_delta > 0.3:
            return True
        if impact.morale_delta < -0.3:
            return True
        if len(impact.affected_ships) > 1:
            return True
        return False

    def _trigger_cascade(self, impact_id: str):
        """Trigger emotional cascade through fleet"""
        impact = self.impacts[impact_id]
        cascade_id = f"cascade_{impact_id}"
        self.emotional_cascade_events.append(cascade_id)

        # Cascades propagate with decreasing strength
        secondary_impact = EmotionalImpact(
            event_id=cascade_id,
            event_type="emotional_cascade",
            morale_delta=impact.morale_delta * impact.propagation_factor,
            confidence_delta=impact.confidence_delta * 0.5,
            anxiety_delta=impact.anxiety_delta * impact.propagation_factor,
            excitement_delta=impact.excitement_delta * 0.6,
            affected_ships=impact.affected_ships,
            propagation_factor=impact.propagation_factor * 0.6,
        )

        # Apply cascade
        if secondary_impact.morale_delta != 0 or secondary_impact.anxiety_delta != 0:
            self._update_emotions(secondary_impact)

    def _clamp(self, value: float, minimum: float, maximum: float) -> float:
        """Clamp value between min and max"""
        return max(minimum, min(maximum, value))

    def _copy_vector(self, vector: EmotionalVector) -> EmotionalVector:
        """Create a copy of emotional vector"""
        return EmotionalVector(
            timestamp=vector.timestamp,
            morale=vector.morale,
            confidence=vector.confidence,
            anxiety=vector.anxiety,
            excitement=vector.excitement,
            stability=vector.stability,
            source_event=vector.source_event,
        )

    def get_federation_readiness(self) -> float:
        """Calculate overall federation readiness from emotions"""
        current = self.current_state
        # Readiness = positive emotions - negative emotions
        positive = (current.morale + current.confidence + current.excitement) / 3
        negative = current.anxiety
        readiness = (positive * 0.7 - negative * 0.3) + 0.5
        return self._clamp(readiness, 0.0, 1.0)

    def get_decision_quality(self) -> float:
        """How good are decisions likely to be based on emotions"""
        current = self.current_state
        # High confidence + low anxiety = better decisions
        quality = (current.confidence * 0.6 - current.anxiety * 0.2 + current.stability * 0.2) / 2
        return self._clamp(quality + 0.5, 0.0, 1.0)

    def get_flag_ship_morale(self) -> str:
        """Get human-readable morale status"""
        current = self.current_state
        if current.morale > 0.7:
            return "EXCELLENT"
        elif current.morale > 0.4:
            return "GOOD"
        elif current.morale > 0.1:
            return "NEUTRAL"
        elif current.morale > -0.4:
            return "TROUBLED"
        else:
            return "CRITICAL"

    def response_to_crisis(self, crisis_type: str) -> Dict[str, Any]:
        """Simulate fleet response to crisis based on emotional state"""
        current = self.current_state

        # Calculate response
        if current.morale < 0.0 and current.confidence < 0.3:
            response = "PANIC"
            action = "Fleet becomes disorganized, decisions suffer"
        elif current.anxiety > 0.7:
            response = "DEFENSIVE"
            action = "Fleet prioritizes safety, risky moves delayed"
        elif current.confidence > 0.7:
            response = "BOLD"
            action = "Fleet willing to take calculated risks"
        else:
            response = "MEASURED"
            action = "Fleet takes cautious, strategic approach"

        return {
            "crisis_type": crisis_type,
            "response_mode": response,
            "action_taken": action,
            "morale_impact": -current.anxiety * 0.5 if current.anxiety > 0.5 else 0.1,
            "readiness": self.get_federation_readiness(),
        }

    def get_emotional_status(self) -> Dict[str, Any]:
        """Get comprehensive emotional status"""
        current = self.current_state
        avg_morale = sum(v.morale for v in self.emotional_history) / len(self.emotional_history) if self.emotional_history else current.morale

        return {
            "timestamp": current.timestamp,
            "morale": current.morale,
            "confidence": current.confidence,
            "anxiety": current.anxiety,
            "excitement": current.excitement,
            "stability": current.stability,
            "readiness": self.get_federation_readiness(),
            "decision_quality": self.get_decision_quality(),
            "morale_status": self.get_flag_ship_morale(),
            "average_morale": avg_morale,
            "cascades_triggered": len(self.emotional_cascade_events),
            "total_impacts": len(self.impacts),
        }

    def emotional_healing(self, healing_factor: float = 0.1) -> Dict[str, Any]:
        """Apply emotional healing to return toward baseline"""
        current = self.current_state

        # Move toward neutral
        current.morale = current.morale + (0.5 - current.morale) * healing_factor
        current.anxiety = current.anxiety - current.anxiety * healing_factor
        current.confidence = current.confidence + (0.6 - current.confidence) * healing_factor

        # Stability improves with healing
        current.stability = self._clamp(current.stability + healing_factor * 0.2, -1.0, 1.0)

        return {
            "healing_applied": healing_factor,
            "new_morale": current.morale,
            "new_anxiety": current.anxiety,
            "new_stability": current.stability,
            "time_to_full_recovery": max(1, int((1.0 - current.stability) / healing_factor / 10)),
        }
