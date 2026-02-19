#!/usr/bin/env python3
"""
PARADOX RUNNER — Temporal Logic and Causality Enforcement Specialist
Concrete implementation of Starship for timeline maintenance and paradox resolution.
Domains: TEMPORAL_LOOP, CAUSAL_BREAK, ANOMALY_STABILIZE
"""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from starship import Starship, ShipEvent, ShipEventResult
from typing import Dict, Any, List


class ParadoxRunnerShip(Starship):
    """
    Paradox Runner — Timeline Maintenance Specialist

    Specialized in:
    - Temporal loop detection and management
    - Causality violation detection and enforcement
    - Paradox identification and resolution
    - Timeline integrity monitoring
    - Temporal anomaly stabilization
    - Personality: TIRED_ENGINEER (weary, pragmatic, coffee-fueled)
    """

    def __init__(self, ship_name: str, personality_mode: str = 'CALM'):
        """Initialize ParadoxRunner with pragmatic personality"""
        super().__init__(ship_name, personality_mode=personality_mode)

    def get_initial_state(self) -> Dict[str, Any]:
        """Define ParadoxRunner-specific state"""
        return {
            # === Base fields (all ships have these) ===
            'threat_level': 0,  # 0-10, temporal threat level
            'mode': 'NORMAL',  # NORMAL, ELEVATED_ALERT, CRITICAL
            'shields': 100,  # 0-100, timeline protection
            'warp_factor': 0,  # 0-10, temporal jump velocity
            'reactor_temp': 45,  # 0-100, temporal energy consumption

            # === Timeline state ===
            'active_timelines': 1,  # Number of active timelines
            'timeline_divergence_index': 0.0,  # 0.0-1.0, how divergent timelines are
            'timeline_health': 1.0,  # 0.0-1.0, overall timeline coherence
            'timeline_conflicts': 0,  # Number of timeline conflicts detected

            # === Temporal loop detection ===
            'loop_detected': False,  # Is a temporal loop active?
            'loop_iterations': 0,  # Current loop iteration count
            'loop_length_seconds': 0,  # Duration of detected loop
            'loop_severity': 0,  # 0-10, severity of loop threat
            'loops_detected_total': 0,  # Total loops ever detected

            # === Causality enforcement ===
            'causality_violations': 0,  # Number of causality violations detected
            'cause_effect_chains': 0,  # Number of valid cause-effect chains
            'causal_ordering_index': 1.0,  # 0.0-1.0, how well causality is maintained
            'enforcement_active': True,  # Is causality enforcement enabled?

            # === Paradox management ===
            'paradoxes_active': 0,  # Number of active paradoxes
            'paradoxes_resolved': 0,  # Total paradoxes resolved
            'grandfather_paradox_risk': 0.0,  # 0.0-1.0, risk of grandfather paradox
            'bootstrap_paradox_count': 0,  # Bootstrap paradoxes detected

            # === Temporal anomalies ===
            'anomalies_detected': 0,  # Total temporal anomalies detected
            'anomaly_stabilization_active': False,  # Is stabilization running?
            'anomaly_stability_index': 1.0,  # 0.0-1.0, anomaly stability

            # === Performance metrics ===
            'timeline_scans': 0,  # Total timeline scans performed
            'paradox_resolution_time_ms': 0,  # Time to resolve paradoxes
            'last_scan_timestamp': None,
            'temporal_resources_consumed': 0.0,  # Energy used for temporal operations
            'fatigue_level': 0.0,  # 0.0-1.0, engineer fatigue (lore flavor)
        }

    def _register_handlers(self):
        """Register all 3 temporal domain handlers"""
        self.handlers = {
            'TEMPORAL_LOOP': self._handle_temporal_loop,
            'CAUSAL_BREAK': self._handle_causal_break,
            'ANOMALY_STABILIZE': self._handle_anomaly_stabilize,
        }

    def _handle_temporal_loop(self, event: Dict[str, Any], state: Dict[str, Any]) -> Any:
        """Detect and manage temporal loops"""
        from event_router import DomainResult

        loop_length = event.get('payload', {}).get('loop_length_seconds', 60)
        iteration_count = event.get('payload', {}).get('iterations', 1)

        state_delta = {
            'loop_detected': True,
            'loop_iterations': iteration_count,
            'loop_length_seconds': loop_length,
            'loop_severity': min(10, iteration_count // 2),  # Severity increases with iterations
            'loops_detected_total': state.get('loops_detected_total', 0) + 1,
            'threat_level': min(8, state.get('threat_level', 0) + (iteration_count - 1)),
        }

        if iteration_count > 5:
            state_delta['mode'] = 'ELEVATED_ALERT'

        domain_actions = [
            {'type': 'LOOP_DETECTED', 'length': loop_length, 'iterations': iteration_count}
        ]

        logs = [f"Temporal loop detected: {loop_length}s × {iteration_count} iterations (severity={state_delta['loop_severity']}/10)"]

        return DomainResult(
            state_delta=state_delta,
            domain_actions=domain_actions,
            logs=logs
        )

    def _handle_causal_break(self, event: Dict[str, Any], state: Dict[str, Any]) -> Any:
        """Detect and enforce causality maintenance"""
        from event_router import DomainResult

        violation_type = event.get('payload', {}).get('type', 'UNKNOWN')
        severity_level = event.get('payload', {}).get('severity', 5)

        state_delta = {
            'causality_violations': state.get('causality_violations', 0) + 1,
            'threat_level': min(10, state.get('threat_level', 0) + severity_level),
        }

        # If violation is severe, escalate
        if severity_level >= 7:
            state_delta['mode'] = 'CRITICAL'
        elif severity_level >= 5:
            state_delta['mode'] = 'ELEVATED_ALERT'

        domain_actions = [
            {'type': 'CAUSALITY_ENFORCED', 'violation_type': violation_type, 'severity': severity_level}
        ]

        logs = [f"Causality enforcement: {violation_type} violation severity={severity_level}/10"]

        return DomainResult(
            state_delta=state_delta,
            domain_actions=domain_actions,
            logs=logs
        )

    def _handle_anomaly_stabilize(self, event: Dict[str, Any], state: Dict[str, Any]) -> Any:
        """Stabilize temporal anomalies"""
        from event_router import DomainResult

        anomaly_type = event.get('payload', {}).get('anomaly_type', 'UNKNOWN')
        stability_index = event.get('payload', {}).get('stability', 0.5)

        state_delta = {
            'anomalies_detected': state.get('anomalies_detected', 0) + 1,
            'anomaly_stabilization_active': True,
            'anomaly_stability_index': stability_index,
        }

        domain_actions = []
        logs = []

        if stability_index < 0.3:
            # Critical instability
            state_delta['mode'] = 'CRITICAL'
            state_delta['threat_level'] = 9
            domain_actions.append({'type': 'CRITICAL_INSTABILITY', 'anomaly': anomaly_type})
            logs.append(f"CRITICAL: {anomaly_type} anomaly critically unstable (stability={stability_index:.2%})")
        elif stability_index < 0.6:
            # Elevated instability
            state_delta['mode'] = 'ELEVATED_ALERT'
            state_delta['threat_level'] = min(8, state.get('threat_level', 0) + 2)
            domain_actions.append({'type': 'STABILIZATION_IN_PROGRESS', 'anomaly': anomaly_type})
            logs.append(f"Stabilizing: {anomaly_type} anomaly (stability={stability_index:.2%})")
        else:
            # Stable
            domain_actions.append({'type': 'ANOMALY_STABILIZED', 'anomaly': anomaly_type})
            logs.append(f"Anomaly stabilized: {anomaly_type} (stability={stability_index:.2%})")
            state_delta['anomaly_stabilization_active'] = False

        return DomainResult(
            state_delta=state_delta,
            domain_actions=domain_actions,
            logs=logs
        )

    def _initialize_narrator(self):
        """Initialize ParadoxRunner narrator with pragmatic personality"""
        from narrator_engine import NarratorEngine
        self.narrator = NarratorEngine()
        if hasattr(self.narrator, 'set_personality_mode'):
            self.narrator.set_personality_mode(self.personality_mode)

    def get_narrator_config(self) -> Dict[str, Any]:
        """Return narrator configuration"""
        return {}

    def get_safety_rules(self) -> List[Dict[str, Any]]:
        """Define ParadoxRunner safety rules"""
        return [
            {
                'name': 'Grandfather Paradox Risk',
                'condition': lambda state: state.get('grandfather_paradox_risk', 0.0) > 0.7,
                'action': lambda state: {'mode': 'CRITICAL', 'threat_level': 10},
                'severity': 'CRITICAL'
            },
            {
                'name': 'Timeline Cascade Failure',
                'condition': lambda state: state.get('causality_violations', 0) > 20,
                'action': lambda state: {'mode': 'CRITICAL', 'threat_level': 9},
                'severity': 'CRITICAL'
            },
            {
                'name': 'Multiple Active Loops',
                'condition': lambda state: state.get('loops_detected_total', 0) > 10,
                'action': lambda state: {'threat_level': min(10, state.get('threat_level', 0) + 3)},
                'severity': 'ALERT'
            },
            {
                'name': 'Anomaly Instability',
                'condition': lambda state: state.get('anomaly_stability_index', 1.0) < 0.2,
                'action': lambda state: {'mode': 'ELEVATED_ALERT', 'threat_level': 8},
                'severity': 'ALERT'
            },
        ]

    def get_temporal_integrity_report(self) -> Dict[str, Any]:
        """Return temporal integrity analysis report"""
        return {
            'timestamp': self.state.get('last_scan_timestamp'),
            'active_timelines': self.state.get('active_timelines', 1),
            'timeline_divergence': self.state.get('timeline_divergence_index', 0.0),
            'timeline_health': self.state.get('timeline_health', 1.0),
            'timeline_conflicts': self.state.get('timeline_conflicts', 0),
            'loop_detected': self.state.get('loop_detected', False),
            'loop_severity': self.state.get('loop_severity', 0),
            'total_loops_detected': self.state.get('loops_detected_total', 0),
            'causality_violations': self.state.get('causality_violations', 0),
            'causal_ordering_index': self.state.get('causal_ordering_index', 1.0),
            'paradoxes_active': self.state.get('paradoxes_active', 0),
            'paradoxes_resolved': self.state.get('paradoxes_resolved', 0),
            'grandfather_paradox_risk': self.state.get('grandfather_paradox_risk', 0.0),
            'anomalies_detected': self.state.get('anomalies_detected', 0),
            'anomaly_stability': self.state.get('anomaly_stability_index', 1.0),
            'timeline_scans': self.state.get('timeline_scans', 0),
            'fatigue_level': self.state.get('fatigue_level', 0.0),
        }

    def __repr__(self):
        loops = self.state.get('loops_detected_total', 0)
        violations = self.state.get('causality_violations', 0)
        paradoxes = self.state.get('paradoxes_resolved', 0)
        fatigue = self.state.get('fatigue_level', 0.0)
        return f"<ParadoxRunner loops={loops} violations={violations} paradoxes_resolved={paradoxes} fatigue={fatigue:.1%} personality={self.personality_mode}>"
