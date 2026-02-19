#!/usr/bin/env python3
"""
SENSING SHIP — Fleet-Wide Observation and Intelligence
Concrete implementation of Starship for autonomous fleet sensing.
Provides:
  - Real-time sensor sweeps across the entire fleet
  - Signal detection and pattern analysis
  - Threat assessment and spatial mapping
  - Feeds data to FleetBrain for autonomous decision-making
"""

from typing import Dict, Any, List
from starship import Starship, ShipEvent, ShipEventResult


class SensingShip(Starship):
    """
    Sensing Ship — Fleet Eyes and Ears

    Specialized ship for autonomous observation:
    - 3 domain handlers (SENSOR_SWEEP, SIGNAL_ANALYSIS, THREAT_ASSESSMENT)
    - Maintains real-time contact list and threat map
    - Feeds fleet state data to FleetBrain
    - Personality: CALM (analytical, precise)
    """

    def __init__(self, ship_name: str, personality_mode: str = 'CALM'):
        """Initialize SensingShip with CALM personality (analytical)"""
        super().__init__(ship_name, personality_mode=personality_mode)

    def get_initial_state(self) -> Dict[str, Any]:
        """Define SensingShip-specific state"""
        return {
            # === Base fields (all ships have these) ===
            'threat_level': 0,  # 0-10, aggregate fleet threat
            'mode': 'NORMAL',  # NORMAL, ELEVATED_ALERT, CRITICAL
            'shields': 100,  # 0-100, passive protection
            'warp_factor': 0,  # 0-10, station-keeping (typically 0)
            'reactor_temp': 25,  # 0-100, minimal power usage

            # === Sensing system state ===
            'scan_radius': 10,  # Light-years (configurable range)
            'signal_strength': 80,  # 0-100, sensor signal quality
            'sensor_accuracy': 92,  # 0-100, detection accuracy
            'scan_active': True,  # Is active scanning enabled?
            'scan_frequency': 1.0,  # Scans per second

            # === Fleet contacts and contacts ===
            'known_contacts': [],  # List of detected ships
            'contact_count': 0,  # Number of known ships
            'last_contact_count': 0,  # Previous scan count

            # === Threat mapping ===
            'threat_map': {},  # {ship_name: threat_level}
            'threat_vector': 0,  # Average direction of threats (0-360)
            'threat_severity_high': 0,  # Count of critical threats
            'threat_severity_medium': 0,  # Count of alert threats
            'threat_severity_low': 0,  # Count of warning threats

            # === Signal analysis ===
            'anomaly_count': 0,  # Detected anomalies in current scan
            'pattern_matches': 0,  # Patterns matching known signatures
            'noise_floor': 5,  # Baseline signal noise (0-100)
            'signal_anomalies': [],  # List of detected anomalies

            # === Performance metrics ===
            'scan_lag_ms': 0,  # Latency of sensor readings
            'analysis_time_ms': 0,  # Time to analyze scan
            'last_scan_timestamp': None,  # When was last scan?
            'scans_completed': 0,  # Total scans performed
            'analysis_errors': 0,  # Analysis failures
        }

    def _register_handlers(self):
        """Register all 3 sensing domain handlers"""
        try:
            from handlers.sensing_handler import SensingHandler
        except ImportError:
            # Create inline handlers if not found
            self.handlers = {
                'SENSOR_SWEEP': self._handle_sensor_sweep,
                'SIGNAL_ANALYSIS': self._handle_signal_analysis,
                'THREAT_ASSESSMENT': self._handle_threat_assessment,
            }
        else:
            self.handlers = {
                'SENSOR_SWEEP': SensingHandler.handle_sensor_sweep,
                'SIGNAL_ANALYSIS': SensingHandler.handle_signal_analysis,
                'THREAT_ASSESSMENT': SensingHandler.handle_threat_assessment,
            }

    def _handle_sensor_sweep(self, event: Dict[str, Any], state: Dict[str, Any]) -> Any:
        """Default handler for SENSOR_SWEEP events"""
        from event_router import DomainResult

        scan_radius = event.get('payload', {}).get('radius', state.get('scan_radius', 10))
        target_count = event.get('payload', {}).get('target_count', 3)  # Scan detected N ships

        state_delta = {
            'scan_radius': scan_radius,
            'contact_count': target_count,
            'last_scan_timestamp': event.get('timestamp'),
            'scans_completed': state.get('scans_completed', 0) + 1,
        }

        domain_actions = [
            {'type': 'SWEEP_COMPLETE', 'targets_found': target_count}
        ]

        logs = [f"Sensor sweep complete: {target_count} contacts detected at {scan_radius} LY radius"]

        return DomainResult(
            state_delta=state_delta,
            domain_actions=domain_actions,
            logs=logs
        )

    def _handle_signal_analysis(self, event: Dict[str, Any], state: Dict[str, Any]) -> Any:
        """Default handler for SIGNAL_ANALYSIS events"""
        from event_router import DomainResult

        signal_strength = event.get('payload', {}).get('signal_strength', 75)
        anomaly_detected = event.get('payload', {}).get('anomaly', False)

        state_delta = {
            'signal_strength': min(100, max(0, signal_strength)),
            'anomaly_count': state.get('anomaly_count', 0) + (1 if anomaly_detected else 0),
        }

        domain_actions = []
        if anomaly_detected:
            domain_actions.append({'type': 'ANOMALY_DETECTED', 'severity': 'ALERT'})

        logs = [f"Signal analysis: strength={signal_strength}%, anomalies={state_delta['anomaly_count']}"]

        return DomainResult(
            state_delta=state_delta,
            domain_actions=domain_actions,
            logs=logs
        )

    def _handle_threat_assessment(self, event: Dict[str, Any], state: Dict[str, Any]) -> Any:
        """Default handler for THREAT_ASSESSMENT events"""
        from event_router import DomainResult

        assessed_threat = event.get('payload', {}).get('threat_level', 0)
        threat_ship = event.get('payload', {}).get('ship_name', 'UNKNOWN')

        # Update threat map
        threat_map = state.get('threat_map', {})
        threat_map[threat_ship] = assessed_threat

        # Count threat levels
        critical_count = sum(1 for t in threat_map.values() if t >= 8)
        alert_count = sum(1 for t in threat_map.values() if 5 <= t < 8)
        warning_count = sum(1 for t in threat_map.values() if 1 <= t < 5)

        # Calculate average threat
        avg_threat = sum(threat_map.values()) / len(threat_map) if threat_map else 0

        state_delta = {
            'threat_map': threat_map,
            'threat_level': min(10, int(avg_threat)),
            'threat_severity_high': critical_count,
            'threat_severity_medium': alert_count,
            'threat_severity_low': warning_count,
        }

        domain_actions = [
            {'type': 'THREAT_UPDATED', 'avg_threat': avg_threat, 'critical_count': critical_count}
        ]

        logs = [f"Threat assessment: {threat_ship}={assessed_threat}, fleet avg={avg_threat:.1f}"]

        return DomainResult(
            state_delta=state_delta,
            domain_actions=domain_actions,
            logs=logs
        )

    def _initialize_narrator(self):
        """Initialize SensingShip narrator with analytical personality"""
        from narrator_engine import NarratorEngine
        self.narrator = NarratorEngine()
        # SensingShip uses CALM personality (analytical, precise)
        if hasattr(self.narrator, 'set_personality_mode'):
            self.narrator.set_personality_mode(self.personality_mode)

    def get_narrator_config(self) -> Dict[str, Any]:
        """Return the narrator configuration (uses NarratorEngine defaults)"""
        return {}

    def get_safety_rules(self) -> List[Dict[str, Any]]:
        """Define SensingShip safety rules"""
        return [
            {
                'name': 'High Threat Detection',
                'condition': lambda state: state.get('threat_severity_high', 0) >= 2,
                'action': lambda state: {'mode': 'ELEVATED_ALERT', 'threat_level': 8},
                'severity': 'ALERT'
            },
            {
                'name': 'Signal Degradation',
                'condition': lambda state: state.get('signal_strength', 100) < 30,
                'action': lambda state: {'threat_level': min(6, state.get('threat_level', 0) + 2)},
                'severity': 'WARNING'
            },
            {
                'name': 'Analysis Overload',
                'condition': lambda state: state.get('analysis_errors', 0) > 5,
                'action': lambda state: {'mode': 'CRITICAL', 'threat_level': 9},
                'severity': 'CRITICAL'
            },
        ]

    def get_fleet_snapshot(self) -> Dict[str, Any]:
        """
        Return a snapshot of the entire fleet as perceived by SensingShip.
        This is fed to FleetBrain for decision-making.
        """
        return {
            'timestamp': self.state.get('last_scan_timestamp'),
            'contacts': self.state.get('known_contacts', []),
            'contact_count': self.state.get('contact_count', 0),
            'threat_map': self.state.get('threat_map', {}),
            'threat_level_avg': self.state.get('threat_level', 0),
            'threat_critical_count': self.state.get('threat_severity_high', 0),
            'sensor_accuracy': self.state.get('sensor_accuracy', 0),
            'signal_strength': self.state.get('signal_strength', 0),
            'anomalies_detected': self.state.get('anomaly_count', 0),
            'scans_completed': self.state.get('scans_completed', 0),
        }

    def __repr__(self):
        contacts = self.state.get('contact_count', 0)
        threat = self.state.get('threat_level', 0)
        signal = self.state.get('signal_strength', 0)
        return f"<SensingShip contacts={contacts} threat={threat} signal={signal}% personality={self.personality_mode}>"
