#!/usr/bin/env python3
"""
CONTINUITY ENGINE — Narrative coherence and metaphysical law validation

Maintains:
- Canonical facts about ship and fleet
- Metaphysical law consistency
- Behavioral continuity across episodes
- State coherence validation
- Narrative consistency checking
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from datetime import datetime
import uuid


@dataclass
class ContinuityViolation:
    """Report of a continuity violation"""

    violation_id: str
    timestamp: float
    violation_type: str  # NARRATIVE_CONTRADICTION, CHARACTER_OOC, METAPHYSICAL_VIOLATION, LAW_BREACH
    severity: str  # WARNING, ALERT, CRITICAL
    ships_involved: List[str]
    narrative_conflict: str
    canonical_version: str
    contradicting_version: str
    escalation_count: int = 0
    proposed_resolution: str = ""

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "violation_id": self.violation_id,
            "timestamp": self.timestamp,
            "violation_type": self.violation_type,
            "severity": self.severity,
            "ships_involved": self.ships_involved,
            "narrative_conflict": self.narrative_conflict,
            "canonical_version": self.canonical_version,
            "contradicting_version": self.contradicting_version,
            "escalation_count": self.escalation_count,
            "proposed_resolution": self.proposed_resolution,
        }


class ContinuityEngine:
    """Enforces narrative coherence and metaphysical law consistency"""

    def __init__(self, memory_graph=None, ontology_engine=None):
        """
        Initialize ContinuityEngine

        Args:
            memory_graph: Reference to MemoryGraph instance
            ontology_engine: Reference to OntologyEngine instance
        """
        self.memory_graph = memory_graph
        self.ontology_engine = ontology_engine
        self.violations: List[ContinuityViolation] = []
        self.narrative_canon: Dict[str, Any] = {}
        self.metaphysical_laws: List[str] = []
        self.enabled = True
        self.coherence_threshold = 0.7
        self.drift_detection_window = 100  # Number of events to analyze

        self._initialize_canon()

    def validate_anomalies(self, anomalies: List[Any]) -> List[ContinuityViolation]:
        """Check if anomalies violate narrative continuity"""
        violations = []

        for anomaly in anomalies:
            # High-severity anomalies may indicate continuity violations
            if anomaly.severity > 0.8:
                violation = ContinuityViolation(
                    violation_id=f"violation_{uuid.uuid4().hex[:8]}",
                    timestamp=datetime.now().timestamp(),
                    violation_type="NARRATIVE_CONTRADICTION",
                    severity="ALERT",
                    ships_involved=[anomaly.ship_name],
                    narrative_conflict=f"Anomaly: {anomaly.description}",
                    canonical_version="Expected consistent behavior",
                    contradicting_version=anomaly.description,
                    proposed_resolution="Investigate anomaly source and validate state",
                )
                violations.append(violation)

        return violations

    def validate_archetype_consistency(
        self, ship_name: str, current_behavior: Dict[str, Any]
    ) -> Optional[ContinuityViolation]:
        """Verify ship's behavior aligns with declared archetype"""
        if not self.memory_graph:
            return None

        ship_history = self.memory_graph.get_ship_history(ship_name)
        if len(ship_history) < 2:
            return None

        # Analyze behavioral consistency
        behavioral_drift = self._analyze_behavioral_consistency(
            ship_history, current_behavior, ship_name
        )

        return behavioral_drift

    def validate_metaphysical_laws(
        self, event: Dict[str, Any], state_delta: Dict[str, Any]
    ) -> List[ContinuityViolation]:
        """Check if OntologyEngine rules are maintained"""
        violations = []

        if not self.ontology_engine:
            return violations

        # Check if state_delta violates ontological rules
        for law_name in self.metaphysical_laws:
            # Example: Check if complexity growth violates limits
            if "complexity_limit" in law_name:
                if "complexity" in state_delta:
                    complexity_change = state_delta.get("complexity", 0)
                    if complexity_change > 50:  # Arbitrary threshold
                        violations.append(
                            ContinuityViolation(
                                violation_id=f"violation_{uuid.uuid4().hex[:8]}",
                                timestamp=datetime.now().timestamp(),
                                violation_type="METAPHYSICAL_VIOLATION",
                                severity="ALERT",
                                ships_involved=[event.get("source_ship", "unknown")],
                                narrative_conflict=f"Complexity growth violates metaphysical law",
                                canonical_version=f"Complexity growth must be gradual",
                                contradicting_version=f"Complexity jumped by {complexity_change}",
                                proposed_resolution="Review and moderate change requests",
                            )
                        )

        return violations

    def validate_narrative_generation(
        self, generated_narrative: str, context: Dict[str, Any]
    ) -> bool:
        """Before TranscendenceLayer commits narrative, validate coherence"""
        if not self.enabled:
            return True

        # Simple coherence check: look for explicit contradictions in narrative
        if "contradiction" in generated_narrative.lower() or "paradox" in generated_narrative.lower():
            # This might be intentional, but flag it for review
            return True  # Still allow, but could log warning

        return True

    def escalate_violation(self, violation: ContinuityViolation) -> ContinuityViolation:
        """Escalate violation if pattern repeats"""
        # Check if similar violation exists
        similar_violations = [
            v
            for v in self.violations
            if v.violation_type == violation.violation_type
            and v.ships_involved == violation.ships_involved
        ]

        if len(similar_violations) > 2:
            # Pattern detected, escalate severity
            violation.escalation_count = len(similar_violations)
            if violation.severity == "WARNING":
                violation.severity = "ALERT"
            elif violation.severity == "ALERT":
                violation.severity = "CRITICAL"

        return violation

    def get_narrative_canon(self) -> Dict[str, Any]:
        """Return canonical facts (ground truth about fleet/ships)"""
        return self.narrative_canon.copy()

    def detect_continuity_issues(
        self, current_state: Dict[str, Any], ship_name: str
    ) -> List[Dict[str, Any]]:
        """Detect continuity issues and behavioral drift"""
        issues = []

        if not self.memory_graph:
            return issues

        ship_history = self.memory_graph.get_ship_history(ship_name)

        if len(ship_history) < 2:
            return []

        # Analyze behavioral consistency
        behavioral_drift = self._analyze_behavioral_consistency(
            ship_history, current_state, ship_name
        )
        if behavioral_drift:
            issues.append(
                {
                    "type": "behavioral_drift",
                    "severity": 0.8,
                    "description": behavioral_drift.narrative_conflict,
                    "context": behavioral_drift.to_dict(),
                }
            )

        # Analyze state coherence
        coherence_issues = self._analyze_state_coherence(ship_history, current_state)
        issues.extend(coherence_issues)

        # Analyze narrative consistency
        narrative_issues = self._analyze_narrative_consistency(ship_history)
        issues.extend(narrative_issues)

        return issues

    def _analyze_behavioral_consistency(
        self, ship_history: List[Any], current_state: Dict[str, Any], ship_name: str
    ) -> Optional[ContinuityViolation]:
        """Analyze if ship behavior is consistent with its history"""
        if len(ship_history) < 5:
            return None

        # Calculate average values for key metrics
        key_metrics = ["threat_level", "signal_quality", "snr_ratio"]
        avg_values = {}

        for metric in key_metrics:
            values = []
            for entry in ship_history[-10:]:
                if "state_after" in entry.content:
                    state = entry.content["state_after"]
                    if metric in state and isinstance(state[metric], (int, float)):
                        values.append(state[metric])

            if values:
                avg_values[metric] = sum(values) / len(values)

        # Compare with current state
        drift_issues = []
        for metric, avg_val in avg_values.items():
            current_val = current_state.get(metric, 0)
            if isinstance(avg_val, (int, float)) and isinstance(current_val, (int, float)):
                drift_percentage = (
                    abs(current_val - avg_val) / max(abs(avg_val), 1)
                    if avg_val != 0
                    else abs(current_val)
                )

                if drift_percentage > 0.5:  # 50% drift threshold
                    drift_issues.append(
                        f"{metric}: {avg_val:.2f} -> {current_val:.2f} ({drift_percentage:.1%} drift)"
                    )

        if drift_issues:
            return ContinuityViolation(
                violation_id=f"violation_{uuid.uuid4().hex[:8]}",
                timestamp=datetime.now().timestamp(),
                violation_type="BEHAVIORAL_DRIFT",
                severity="WARNING",
                ships_involved=[ship_name],
                narrative_conflict=f"Behavioral drift detected: {', '.join(drift_issues)}",
                canonical_version="Ship maintains consistent behavior patterns",
                contradicting_version=", ".join(drift_issues),
                proposed_resolution="Review recent decisions and validate behavior",
            )

        return None

    def _analyze_state_coherence(
        self, ship_history: List[Any], current_state: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Analyze if current state is coherent with historical patterns"""
        issues = []

        if len(ship_history) >= 2:
            # Get previous state from history
            prev_entry = ship_history[-2]
            prev_state = prev_entry.content.get("state_after", {})

            current_state_changes = {}

            for key, current_val in current_state.items():
                if key in prev_state:
                    prev_val = prev_state[key]
                    if isinstance(current_val, (int, float)) and isinstance(
                        prev_val, (int, float)
                    ):
                        change = current_val - prev_val
                        current_state_changes[key] = change

            # Identify unusually large changes
            for key, change in current_state_changes.items():
                # Calculate historical average change
                historical_changes = []
                for i in range(1, min(len(ship_history), 10)):
                    prev_entry = ship_history[-(i + 1)]
                    curr_entry = ship_history[-i]

                    prev_state_data = prev_entry.content.get("state_after", {})
                    curr_state_data = curr_entry.content.get("state_after", {})

                    if (
                        key in prev_state_data
                        and key in curr_state_data
                        and isinstance(prev_state_data[key], (int, float))
                        and isinstance(curr_state_data[key], (int, float))
                    ):
                        hist_change = curr_state_data[key] - prev_state_data[key]
                        historical_changes.append(abs(hist_change))

                if historical_changes:
                    avg_historical_change = sum(historical_changes) / len(
                        historical_changes
                    )
                    if abs(change) > avg_historical_change * 3:  # 3x threshold
                        issues.append(
                            {
                                "type": "state_incoherence",
                                "severity": 0.7,
                                "description": f"State incoherence in {key}: change {change} vs historical avg {avg_historical_change:.2f}",
                                "context": {
                                    "metric": key,
                                    "current_change": change,
                                    "historical_avg": avg_historical_change,
                                },
                            }
                        )

        return issues

    def _analyze_narrative_consistency(self, ship_history: List[Any]) -> List[Dict[str, Any]]:
        """Analyze narrative consistency across ship operations"""
        issues = []

        # Check for narrative inconsistencies
        interpretations = [
            entry.metadata.get("metaphysical_interpretation")
            for entry in ship_history
            if "metaphysical_interpretation" in entry.metadata
        ]

        if len(interpretations) >= 2:
            recent_interpretations = interpretations[-5:]

            # Check for contradictory balance assessments
            balances = [
                str(interp.get("current_balance", ""))
                for interp in recent_interpretations
                if interp
            ]

            if "IMBALANCED" in " ".join(balances) and "BALANCED" in " ".join(balances):
                issues.append(
                    {
                        "type": "narrative_inconsistency",
                        "severity": 0.6,
                        "description": f"Narrative inconsistency: mixed balance assessments {balances}",
                        "context": {"balance_assessments": balances},
                    }
                )

        return issues

    def enable(self):
        """Enable continuity engine"""
        self.enabled = True

    def disable(self):
        """Disable continuity engine"""
        self.enabled = False

    def _initialize_canon(self):
        """Build initial canonical facts about universe"""
        self.narrative_canon = {
            "fleet_archetypes": [
                "SENSORY",
                "ANALYTICAL",
                "PREDICTIVE",
                "COORDINATORY",
                "PROTECTIVE",
                "ADAPTIVE",
            ],
            "metaphysical_laws": [
                "Emergence Through Need",
                "Evolution Through Experience",
                "Identity Formation Through Purpose",
                "Ecosystem Balance Through Diversity",
            ],
        }

        self.metaphysical_laws = [
            "complexity_limit",
            "state_coherence",
            "narrative_consistency",
        ]
