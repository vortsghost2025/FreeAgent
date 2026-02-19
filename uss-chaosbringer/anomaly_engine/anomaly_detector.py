#!/usr/bin/env python3
"""
ANOMALY DETECTOR — Pattern recognition and universe anomaly identification

Detects:
- Contradictions between states
- Outliers in metrics
- Unexpected state deltas
- Metaphysical mismatches
- Recurring motifs
- Behavioral drift
- Ontological inconsistencies
"""

from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import uuid


class AnomalyType(Enum):
    """Types of anomalies that can be detected"""
    CONTRADICTION = "contradiction"
    OUTLIER = "outlier"
    STATE_DELTA = "state_delta"
    METAPHYSICAL_MISMATCH = "metaphysical_mismatch"
    RECURRING_MOTIF = "recurring_motif"
    BEHAVIORAL_DRIFT = "behavioral_drift"
    ONTOLOGICAL_INCONSISTENCY = "ontological_inconsistency"


@dataclass
class AnomalyReport:
    """Report of a detected anomaly"""
    id: str
    timestamp: float
    anomaly_type: AnomalyType
    severity: float  # 0.0-1.0
    confidence: float  # 0.0-1.0
    description: str
    context: Dict[str, Any]
    ship_name: str
    related_events: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "id": self.id,
            "timestamp": self.timestamp,
            "anomaly_type": self.anomaly_type.value,
            "severity": self.severity,
            "confidence": self.confidence,
            "description": self.description,
            "context": self.context,
            "ship_name": self.ship_name,
            "related_events": self.related_events,
        }


class AnomalyDetector:
    """Detects contradictions, outliers, and mismatches in universe state"""

    def __init__(self, window_size: int = 100):
        """
        Initialize AnomalyDetector

        Args:
            window_size: Number of historical states to track per ship
        """
        self.window_size = window_size
        self.anomaly_history: List[AnomalyReport] = []
        self.ship_baselines: Dict[str, Dict[str, Tuple[float, float]]] = {}
        self.ship_state_history: Dict[str, List[Dict[str, Any]]] = {}
        self.enabled = True

        # Thresholds for anomaly detection
        self.anomaly_thresholds = {
            "contradiction": 0.8,
            "outlier": 0.7,
            "state_delta": 0.6,
            "metaphysical_mismatch": 0.9,
        }

    def detect_anomalies_for_ship(
        self,
        ship_name: str,
        current_state: Dict[str, Any],
        previous_state: Optional[Dict[str, Any]] = None,
        domain_result: Optional[Dict[str, Any]] = None,
        metaphysical_interpretation: Optional[Dict[str, Any]] = None,
    ) -> List[AnomalyReport]:
        """
        Detect all types of anomalies for a specific ship

        Args:
            ship_name: Name of the ship
            current_state: Current state dict
            previous_state: Previous state dict (optional)
            domain_result: Domain handler result (optional)
            metaphysical_interpretation: Metaphysical interpretation (optional)

        Returns:
            List of AnomalyReport objects
        """
        if not self.enabled:
            return []

        anomalies = []

        # Initialize baseline if needed
        if ship_name not in self.ship_baselines:
            self.ship_baselines[ship_name] = self._compute_baseline(current_state)

        # Initialize history if needed
        if ship_name not in self.ship_state_history:
            self.ship_state_history[ship_name] = []

        # Add current state to history
        self.ship_state_history[ship_name].append(current_state)
        if len(self.ship_state_history[ship_name]) > self.window_size:
            self.ship_state_history[ship_name].pop(0)

        # Detect contradictions
        if previous_state:
            contradictions = self._detect_contradictions(current_state, previous_state)
            for contradiction in contradictions:
                anomalies.append(
                    AnomalyReport(
                        id=f"anomaly_{uuid.uuid4().hex[:8]}",
                        timestamp=datetime.now().timestamp(),
                        anomaly_type=AnomalyType.CONTRADICTION,
                        severity=contradiction["severity"],
                        confidence=contradiction["confidence"],
                        description=contradiction["description"],
                        context=contradiction["context"],
                        ship_name=ship_name,
                        related_events=contradiction.get("related_events", []),
                    )
                )

        # Detect outliers
        outliers = self._detect_outliers(current_state, ship_name)
        for outlier in outliers:
            anomalies.append(
                AnomalyReport(
                    id=f"anomaly_{uuid.uuid4().hex[:8]}",
                    timestamp=datetime.now().timestamp(),
                    anomaly_type=AnomalyType.OUTLIER,
                    severity=outlier["severity"],
                    confidence=outlier["confidence"],
                    description=outlier["description"],
                    context=outlier["context"],
                    ship_name=ship_name,
                    related_events=outlier.get("related_events", []),
                )
            )

        # Detect state deltas
        if previous_state:
            state_deltas = self._detect_state_deltas(current_state, previous_state)
            for delta in state_deltas:
                anomalies.append(
                    AnomalyReport(
                        id=f"anomaly_{uuid.uuid4().hex[:8]}",
                        timestamp=datetime.now().timestamp(),
                        anomaly_type=AnomalyType.STATE_DELTA,
                        severity=delta["severity"],
                        confidence=delta["confidence"],
                        description=delta["description"],
                        context=delta["context"],
                        ship_name=ship_name,
                        related_events=delta.get("related_events", []),
                    )
                )

        # Detect metaphysical mismatches
        if metaphysical_interpretation:
            mismatches = self._detect_metaphysical_mismatches(
                metaphysical_interpretation
            )
            for mismatch in mismatches:
                anomalies.append(
                    AnomalyReport(
                        id=f"anomaly_{uuid.uuid4().hex[:8]}",
                        timestamp=datetime.now().timestamp(),
                        anomaly_type=AnomalyType.METAPHYSICAL_MISMATCH,
                        severity=mismatch["severity"],
                        confidence=mismatch["confidence"],
                        description=mismatch["description"],
                        context=mismatch["context"],
                        ship_name=ship_name,
                        related_events=mismatch.get("related_events", []),
                    )
                )

        # Store anomalies in history
        self.anomaly_history.extend(anomalies)

        return anomalies

    def _compute_baseline(self, state: Dict[str, Any]) -> Dict[str, Tuple[float, float]]:
        """Compute baseline min/max ranges for metrics"""
        baseline = {}
        for key, value in state.items():
            if isinstance(value, (int, float)):
                # Initialize with current value ±10%
                tolerance = abs(value) * 0.1
                baseline[key] = (value - tolerance, value + tolerance)
        return baseline

    def _detect_contradictions(
        self, current_state: Dict[str, Any], previous_state: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Detect logical contradictions between states"""
        contradictions = []

        for key, current_val in current_state.items():
            prev_val = previous_state.get(key)
            if prev_val is not None and self._is_contradictory_transition(
                prev_val, current_val, key
            ):
                contradictions.append(
                    {
                        "severity": 0.9,
                        "confidence": 0.8,
                        "description": f"Contradictory state transition in {key}: {prev_val} -> {current_val}",
                        "context": {
                            "key": key,
                            "previous_value": prev_val,
                            "current_value": current_val,
                        },
                    }
                )

        return contradictions

    def _is_contradictory_transition(
        self, prev_val: Any, curr_val: Any, key: str
    ) -> bool:
        """Check if a state transition is contradictory"""
        if key in ["threat_level", "shields", "warp_factor", "reactor_temp"]:
            if isinstance(prev_val, (int, float)) and isinstance(curr_val, (int, float)):
                # Large jumps might be contradictory
                if abs(curr_val - prev_val) > 10:
                    return True
        return False

    def _detect_outliers(
        self, current_state: Dict[str, Any], ship_name: str
    ) -> List[Dict[str, Any]]:
        """Detect outlier values in current state"""
        outliers = []

        baseline = self.ship_baselines.get(ship_name, {})
        outlier_metrics = [
            "threat_level",
            "signal_quality",
            "snr_ratio",
            "intelligence_value",
            "contact_count",
            "anomaly_count",
        ]

        for metric in outlier_metrics:
            if metric in current_state and metric in baseline:
                val = current_state[metric]
                min_val, max_val = baseline[metric]

                if isinstance(val, (int, float)) and (val < min_val or val > max_val):
                    deviation = abs(val - (min_val + max_val) / 2)
                    outliers.append(
                        {
                            "severity": min(deviation / max_val, 1.0) if max_val > 0 else 0.5,
                            "confidence": 0.6,
                            "description": f"Outlier detected in {metric}: {val} (baseline: {min_val}-{max_val})",
                            "context": {
                                "metric": metric,
                                "value": val,
                                "baseline_min": min_val,
                                "baseline_max": max_val,
                            },
                        }
                    )

        return outliers

    def _detect_state_deltas(
        self, current_state: Dict[str, Any], previous_state: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Detect unexpected state changes"""
        deltas = []

        for key, curr_val in current_state.items():
            prev_val = previous_state.get(key)
            if (
                prev_val is not None
                and isinstance(curr_val, (int, float))
                and isinstance(prev_val, (int, float))
            ):
                change = abs(curr_val - prev_val)
                if change > 15:  # Significant change threshold
                    deltas.append(
                        {
                            "severity": 0.6,
                            "confidence": 0.7,
                            "description": f"Unexpected state delta in {key}: {prev_val} -> {curr_val} (change: {change})",
                            "context": {
                                "key": key,
                                "previous": prev_val,
                                "current": curr_val,
                                "delta": change,
                            },
                        }
                    )

        return deltas

    def _detect_metaphysical_mismatches(
        self, metaphysical_interpretation: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Detect mismatches in metaphysical interpretation"""
        mismatches = []

        if (
            "current_balance" in metaphysical_interpretation
            and "emergent_patterns" in metaphysical_interpretation
        ):
            balance = metaphysical_interpretation["current_balance"]
            patterns = metaphysical_interpretation.get("emergent_patterns", [])

            # Check for contradictory interpretations
            if "IMBALANCED" in str(balance) and len(patterns) > 3:
                mismatches.append(
                    {
                        "severity": 0.9,
                        "confidence": 0.85,
                        "description": f"Balance interpretation contradicts pattern evidence: {balance} vs {len(patterns)} patterns",
                        "context": {
                            "balance": balance,
                            "pattern_count": len(patterns),
                        },
                    }
                )

        return mismatches

    def compute_anomaly_score(self, ship_name: str) -> float:
        """Compute aggregate anomaly score for a ship (0.0-1.0)"""
        ship_anomalies = [a for a in self.anomaly_history if a.ship_name == ship_name]

        if not ship_anomalies:
            return 0.0

        # Average severity of recent anomalies
        recent_anomalies = ship_anomalies[-10:]  # Last 10 anomalies
        avg_severity = sum(a.severity for a in recent_anomalies) / len(recent_anomalies)

        return min(avg_severity, 1.0)

    def get_anomaly_report_summary(self, limit: int = 10) -> List[AnomalyReport]:
        """Return most recent anomalies"""
        return self.anomaly_history[-limit:]

    def enable(self):
        """Enable anomaly detection"""
        self.enabled = True

    def disable(self):
        """Disable anomaly detection"""
        self.enabled = False
