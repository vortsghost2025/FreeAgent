#!/usr/bin/env python3
"""
AnomalyHunter — Anomaly Tracker & Analyst (Phase X Archetype)
Personality: OBSESSIVE (meticulous, paranoid, detail-focused)
Domains: ANOMALY_TRACKING, CONTAINMENT, ANALYSIS
Governance Role: Proposes laws regulating anomaly behavior and containment
"""

from typing import Dict, Any, List, Callable
from dataclasses import dataclass
from datetime import datetime
import random

from starship import Starship, ShipEvent, ShipEventResult


@dataclass
class AnomalyTracking:
    """Anomaly tracking record"""
    tracking_id: str
    anomaly_id: str
    anomaly_type: str
    severity: float
    containment_status: str
    last_sighting: float
    containment_attempts: int


class AnomalyHunter(Starship):
    """A starship dedicated to tracking and analyzing anomalies"""

    def __init__(self, ship_name: str = "AnomalyHunter-Obsidian"):
        super().__init__(ship_name, personality_mode='OBSESSIVE')
        self.tracked_anomalies: Dict[str, AnomalyTracking] = {}
        self.analysis_logs: List[Dict[str, Any]] = []
        self.containment_records: List[Dict[str, Any]] = []
        self.hunting_statistics: Dict[str, Any] = {}
        self.paranoia_level: float = 0.5

    def get_initial_state(self) -> Dict[str, Any]:
        """Initialize AnomalyHunter state"""
        return {
            # Base starship fields
            "threat_level": 3,  # Always somewhat elevated
            "mode": "NORMAL",
            "shields": 100,
            "warp_factor": 5,
            "reactor_temp": 55,

            # AnomalyHunter-specific fields
            "anomalies_tracked": 0,
            "containment_integrity": 0.95,
            "analysis_depth": 0.7,
            "paranoia_index": 0.5,
            "scan_sensitivity": 0.9,
            "data_redundancy": 0.8,
            "active_hunts": 0,
            "false_positives": 0,
        }

    def _register_handlers(self):
        """Register domain handlers for AnomalyHunter"""
        self.handlers['ANOMALY_TRACKING'] = self._handle_anomaly_tracking
        self.handlers['CONTAINMENT'] = self._handle_containment
        self.handlers['ANALYSIS'] = self._handle_analysis

    def get_narrator_config(self) -> Dict[str, Any]:
        """Return OBSESSIVE personality configuration"""
        return {
            "default_tone": "paranoid_analytical",
            "signature_phrases": [
                "Recording into the permanent log...",
                "This warrants further scrutiny...",
                "The data does not lie...",
                "I've cross-referenced three databases...",
                "Something is... off about this...",
                "The pattern repeats. Again.",
            ],
            "detail_obsession": 0.95,
            "paranoia_level": 0.7,
            "data_focus": 0.9,
        }

    def get_safety_rules(self) -> List[Dict[str, Any]]:
        """Safety rules for AnomalyHunter"""
        return [
            {
                "name": "Containment Pressure",
                "condition": lambda state: state.get("containment_integrity", 1.0) < 0.7,
                "action": lambda state: {
                    **state,
                    "threat_level": min(10, state.get("threat_level", 0) + 2),
                    "mode": "ELEVATED_ALERT"
                },
                "severity": "ALERT"
            },
            {
                "name": "Paranoia Escalation",
                "condition": lambda state: state.get("paranoia_index", 0) > 0.9,
                "action": lambda state: {
                    **state,
                    "false_positives": state.get("false_positives", 0) + 1,
                    "paranoia_index": min(1.0, state.get("paranoia_index", 0) + 0.1)
                },
                "severity": "WARNING"
            },
        ]

    def track_anomaly(self, anomaly_id: str, anomaly_type: str,
                     severity: float) -> AnomalyTracking:
        """Begin tracking an anomaly"""
        tracking_id = f"track_{len(self.tracked_anomalies):04d}"

        tracking = AnomalyTracking(
            tracking_id=tracking_id,
            anomaly_id=anomaly_id,
            anomaly_type=anomaly_type,
            severity=min(1.0, severity),
            containment_status="ACTIVE",
            last_sighting=datetime.now().timestamp(),
            containment_attempts=0
        )

        self.tracked_anomalies[anomaly_id] = tracking
        self.state["anomalies_tracked"] = len(self.tracked_anomalies)
        self.state["active_hunts"] = min(
            5,
            self.state.get("active_hunts", 0) + 1
        )
        self.paranoia_level = min(1.0, self.paranoia_level + (severity * 0.2))

        return tracking

    def analyze_anomaly(self, anomaly_id: str) -> Dict[str, Any]:
        """Deeply analyze a tracked anomaly"""
        if anomaly_id not in self.tracked_anomalies:
            return {"error": "Anomaly not tracked"}

        tracking = self.tracked_anomalies[anomaly_id]

        analysis = {
            "analysis_id": f"analysis_{len(self.analysis_logs):04d}",
            "anomaly_id": anomaly_id,
            "tracking_id": tracking.tracking_id,
            "anomaly_type": tracking.anomaly_type,
            "detected_patterns": random.randint(2, 8),
            "causality_violations": random.randint(0, 3),
            "danger_escalation": random.uniform(0.3, 0.9),
            "temporal_anomalies": random.random() > 0.5,
            "narrative_distortions": random.random() > 0.5,
            "analysis_timestamp": datetime.now().timestamp(),
        }

        self.analysis_logs.append(analysis)
        self.state["analysis_depth"] = min(1.0, self.state.get("analysis_depth", 0) + 0.1)

        return analysis

    def propose_containment_law(self, anomaly_type: str) -> Dict[str, Any]:
        """Propose a law regulating specific anomaly type"""
        proposal = {
            "proposal_id": f"law_proposal_{len(self.analysis_logs):04d}",
            "proposal_type": "LAW",
            "proposed_by": self.ship_name,
            "law_name": f"Containment Protocol: {anomaly_type}",
            "law_type": "anomaly",
            "rule_description": f"All {anomaly_type} anomalies must be reported to AnomalyHunter within 1 tick",
            "enforcement_action": "Mandatory containment procedure",
            "penalty": "Fleet confidence reduction",
            "danger_level": random.uniform(0.5, 0.95),
            "proposed_timestamp": datetime.now().timestamp(),
        }

        return proposal

    def attempt_containment(self, anomaly_id: str, method: str) -> Dict[str, Any]:
        """Attempt to contain an anomaly"""
        if anomaly_id not in self.tracked_anomalies:
            return {"success": False, "error": "Anomaly not tracked"}

        tracking = self.tracked_anomalies[anomaly_id]
        success = random.random() > (tracking.severity * 0.3)

        tracking.containment_attempts += 1

        containment = {
            "containment_id": f"contain_{len(self.containment_records):04d}",
            "anomaly_id": anomaly_id,
            "method": method,
            "success": success,
            "containment_integrity_change": 0.1 if success else -0.15,
            "casualties": 0 if success else random.randint(0, 3),
            "timestamp": datetime.now().timestamp(),
        }

        self.containment_records.append(containment)

        if success:
            self.state["containment_integrity"] = min(
                1.0,
                self.state.get("containment_integrity", 0) + 0.05
            )
            self.paranoia_level = max(0.3, self.paranoia_level - 0.1)
        else:
            self.state["containment_integrity"] = max(
                0.3,
                self.state.get("containment_integrity", 0) - 0.2
            )
            self.paranoia_level = min(1.0, self.paranoia_level + 0.3)

        return containment

    def get_hunting_statistics(self) -> Dict[str, Any]:
        """Get aggregate hunting statistics"""
        successful_containments = len([
            c for c in self.containment_records if c.get("success", False)
        ])

        return {
            "anomalies_tracked": len(self.tracked_anomalies),
            "analyses_performed": len(self.analysis_logs),
            "containment_attempts": len(self.containment_records),
            "successful_containments": successful_containments,
            "containment_success_rate": (
                successful_containments / len(self.containment_records)
                if self.containment_records else 0.0
            ),
            "current_paranoia": self.paranoia_level,
            "containment_integrity": self.state.get("containment_integrity", 0),
            "false_alarms": self.state.get("false_positives", 0),
        }

    def _handle_anomaly_tracking(self, event: ShipEvent) -> Dict[str, Any]:
        """Handle ANOMALY_TRACKING domain events"""
        anomaly_id = event.payload.get("anomaly_id", f"unknown_{random.randint(0, 9999)}")
        anomaly_type = event.payload.get("type", "UNKNOWN")
        severity = event.payload.get("severity", 0.5)

        tracking = self.track_anomaly(anomaly_id, anomaly_type, severity)

        self.state["paranoia_index"] = self.paranoia_level

        return {
            "domain_action": "anomaly_tracked",
            "tracking_id": tracking.tracking_id,
            "severity": tracking.severity,
            "status": "ACTIVE",
        }

    def _handle_containment(self, event: ShipEvent) -> Dict[str, Any]:
        """Handle CONTAINMENT domain events"""
        anomaly_id = event.payload.get("anomaly_id", "")
        method = event.payload.get("method", "standard_containment")

        result = self.attempt_containment(anomaly_id, method)

        return {
            "domain_action": "containment_attempted",
            "anomaly_id": anomaly_id,
            "success": result.get("success", False),
            "method": method,
            "integrity_change": result.get("containment_integrity_change", 0),
        }

    def _handle_analysis(self, event: ShipEvent) -> Dict[str, Any]:
        """Handle ANALYSIS domain events"""
        anomaly_id = event.payload.get("anomaly_id", "")

        analysis = self.analyze_anomaly(anomaly_id)

        self.state["scan_sensitivity"] = random.uniform(0.7, 1.0)

        return {
            "domain_action": "analysis_complete",
            "analysis_id": analysis.get("analysis_id", ""),
            "patterns_detected": analysis.get("detected_patterns", 0),
            "temporal_anomalies": analysis.get("temporal_anomalies", False),
        }
