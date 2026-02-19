#!/usr/bin/env python3
"""
PERSISTENT NARRATIVE ORGANISM — Integration layer

The unified system that ties together:
- AnomalyDetector: Universe pattern recognition
- MemoryGraph: Persistent causal history
- ContinuityEngine: Narrative coherence enforcement

This is the singular interface that ships interact with.
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from datetime import datetime

from .anomaly_detector import AnomalyDetector, AnomalyReport
from .memory_graph import MemoryGraph
from .continuity_engine import ContinuityEngine, ContinuityViolation


@dataclass
class AnomalyEngineResponse:
    """Response from anomaly engine processing"""

    anomalies_detected: int
    continuity_issues: int
    memory_stored: Optional[str]
    recommendations: List[str]
    anomaly_severity: float
    continuity_score: float
    violations: List[ContinuityViolation]


class PersistentNarrativeOrganism:
    """
    The integrated anomaly engine that makes the universe self-aware.

    Coordinates:
    - Real-time anomaly detection
    - Persistent memory and learning
    - Narrative coherence validation
    """

    def __init__(self):
        """Initialize all three engines"""
        self.anomaly_detector = AnomalyDetector()
        self.memory_graph = MemoryGraph()
        self.continuity_engine = ContinuityEngine(
            memory_graph=self.memory_graph
        )
        self.enabled = True

    def process_with_memory(
        self,
        ship_name: str,
        event_type: str,
        current_state: Dict[str, Any],
        previous_state: Optional[Dict[str, Any]] = None,
        domain_result: Optional[Dict[str, Any]] = None,
        metaphysical_interpretation: Optional[Dict[str, Any]] = None,
    ) -> AnomalyEngineResponse:
        """
        Process event with full anomaly detection, memory storage, and continuity validation.

        This is the main entry point for the fleet coordinator to integrate the anomaly engine.

        Args:
            ship_name: Name of the ship
            event_type: Type of event
            current_state: Current ship state
            previous_state: Previous ship state (optional)
            domain_result: Domain handler result (optional)
            metaphysical_interpretation: Metaphysical interpretation (optional)

        Returns:
            AnomalyEngineResponse with full analysis
        """
        if not self.enabled:
            return AnomalyEngineResponse(
                anomalies_detected=0,
                continuity_issues=0,
                memory_stored=None,
                recommendations=[],
                anomaly_severity=0.0,
                continuity_score=1.0,
                violations=[],
            )

        # 1. Detect anomalies
        anomalies = self.anomaly_detector.detect_anomalies_for_ship(
            ship_name,
            current_state,
            previous_state=previous_state,
            domain_result=domain_result,
            metaphysical_interpretation=metaphysical_interpretation,
        )

        # 2. Ingest current state into memory
        memory_id = self._store_in_memory(
            ship_name,
            event_type,
            current_state,
            previous_state,
            domain_result,
            metaphysical_interpretation,
            anomalies,
        )

        # 3. Validate anomalies for continuity issues
        violations = self.continuity_engine.validate_anomalies(anomalies)

        # 4. Check for other continuity issues
        continuity_issues = self.continuity_engine.detect_continuity_issues(
            current_state, ship_name
        )
        violations.extend(
            [
                ContinuityViolation(
                    violation_id=f"v_{issue.get('type', 'unknown')}_{id(issue)}",
                    timestamp=datetime.now().timestamp(),
                    violation_type=issue.get("type", "UNKNOWN").upper(),
                    severity="WARNING",
                    ships_involved=[ship_name],
                    narrative_conflict=issue.get("description", ""),
                    canonical_version="",
                    contradicting_version="",
                )
                for issue in continuity_issues
            ]
        )

        # 5. Generate recommendations
        recommendations = self._generate_recommendations(anomalies, continuity_issues)

        # 6. Calculate scores
        anomaly_severity = (
            max([a.severity for a in anomalies], default=0.0) if anomalies else 0.0
        )
        continuity_score = 1.0 - (len(violations) * 0.1)
        continuity_score = max(0.0, min(continuity_score, 1.0))  # Clamp to [0, 1]

        return AnomalyEngineResponse(
            anomalies_detected=len(anomalies),
            continuity_issues=len(continuity_issues),
            memory_stored=memory_id,
            recommendations=recommendations,
            anomaly_severity=anomaly_severity,
            continuity_score=continuity_score,
            violations=violations,
        )

    def get_anomaly_summary(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent anomaly reports"""
        return [a.to_dict() for a in self.anomaly_detector.get_anomaly_report_summary(limit)]

    def get_ship_memory(self, ship_name: str) -> List[Dict[str, Any]]:
        """Get all memories for a ship"""
        memories = self.memory_graph.get_ship_history(ship_name)
        return [m.to_dict() for m in memories]

    def get_graph_statistics(self) -> Dict[str, Any]:
        """Get memory graph statistics"""
        return self.memory_graph.get_graph_statistics()

    def get_continuity_violations(self) -> List[Dict[str, Any]]:
        """Get all continuity violations"""
        return [v.to_dict() for v in self.continuity_engine.violations]

    def get_threat_escalation_path(self) -> List[Dict[str, Any]]:
        """Get causal chain leading to current threat level"""
        chain = self.memory_graph.query_threat_escalation_path()
        return [n.to_dict() for n in chain]

    def enable(self):
        """Enable anomaly engine"""
        self.enabled = True
        self.anomaly_detector.enable()
        self.memory_graph.enable()
        self.continuity_engine.enable()

    def disable(self):
        """Disable anomaly engine"""
        self.enabled = False
        self.anomaly_detector.disable()
        self.memory_graph.disable()
        self.continuity_engine.disable()

    def _store_in_memory(
        self,
        ship_name: str,
        event_type: str,
        current_state: Dict[str, Any],
        previous_state: Optional[Dict[str, Any]],
        domain_result: Optional[Dict[str, Any]],
        metaphysical_interpretation: Optional[Dict[str, Any]],
        anomalies: List[AnomalyReport],
    ) -> Optional[str]:
        """Store the event in memory graph"""
        try:
            event_log = [
                {
                    "event": event_type,
                    "timestamp": datetime.now().timestamp(),
                    "state": current_state,
                }
            ]
            self.memory_graph.ingest_event_log(ship_name, event_log)

            # Store additional metadata
            if anomalies:
                return f"memory_{id(anomalies[0])}"
            return None
        except Exception as e:
            print(f"[anomaly_engine] Error storing memory: {e}")
            return None

    def _generate_recommendations(
        self, anomalies: List[AnomalyReport], continuity_issues: List[Dict[str, Any]]
    ) -> List[str]:
        """Generate recommendations based on detected issues"""
        recommendations = []

        # Anomaly-based recommendations
        high_severity_anomalies = [a for a in anomalies if a.severity > 0.8]
        if high_severity_anomalies:
            recommendations.append(
                f"High-severity anomalies detected ({len(high_severity_anomalies)}) - consider behavioral adjustment"
            )

        contradiction_anomalies = [
            a for a in anomalies if "contradiction" in a.anomaly_type.value.lower()
        ]
        if contradiction_anomalies:
            recommendations.append("Logical contradictions detected - review state transitions")

        # Continuity-based recommendations
        drift_issues = [i for i in continuity_issues if i.get("type") == "behavioral_drift"]
        if drift_issues:
            recommendations.append("Behavioral drift detected - consider returning to baseline")

        coherence_issues = [
            i for i in continuity_issues if i.get("type") == "state_incoherence"
        ]
        if coherence_issues:
            recommendations.append("State incoherence detected - validate state transitions")

        narrative_issues = [
            i for i in continuity_issues if i.get("type") == "narrative_inconsistency"
        ]
        if narrative_issues:
            recommendations.append("Narrative inconsistency detected - review metaphysical interpretation")

        return recommendations


# Global singleton instance
persistent_organism = PersistentNarrativeOrganism()
