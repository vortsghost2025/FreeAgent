#!/usr/bin/env python3
"""
OBSERVER HANDLER
Handles hybrid observer events (alerts, anomalies, storms)
"""

from typing import Dict, Any
import sys
import os

# Handle imports
try:
    from event_router import DomainResult
except ImportError:
    sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
    from event_router import DomainResult


class ObserverHandler:
    """Pure handler for OBSERVER domain events"""

    @staticmethod
    def handle(event: Dict[str, Any], state: Dict[str, Any]) -> DomainResult:
        """
        Handle observer/alert system event and produce state delta.

        Event types:
        - HighSeverityAlertReceived
        - MediumSeverityAlertReceived
        - AlertCleared
        - AlertStormDetected
        - AnomalyDensityHigh
        """
        event_type = event.get('type', 'UNKNOWN')
        payload = event.get('payload', {})

        state_delta = {}
        domain_actions = []
        logs = []

        if event_type == 'HighSeverityAlertReceived':
            # High severity alert from observer
            state_delta['high_severity_alerts'] = state.get('high_severity_alerts', 0) + 1
            state_delta['last_alert_id'] = payload.get('alert_id')
            domain_actions.append({'type': 'ESCALATE_ALERT', 'severity': 'CRITICAL'})
            logs.append(f"[observer] High severity alert: {payload.get('type')} - {payload.get('reason')}")

        elif event_type == 'MediumSeverityAlertReceived':
            # Medium severity alert from observer
            state_delta['medium_severity_alerts'] = state.get('medium_severity_alerts', 0) + 1
            state_delta['last_alert_id'] = payload.get('alert_id')
            domain_actions.append({'type': 'MONITOR_ALERT', 'severity': 'ALERT'})
            logs.append(f"[observer] Medium severity alert: {payload.get('type')}")

        elif event_type == 'AlertCleared':
            # Alert cleared
            state_delta['alerts_cleared'] = state.get('alerts_cleared', 0) + 1
            logs.append(f"[observer] Alert cleared: {payload.get('alert_id')}")

        elif event_type == 'AlertStormDetected':
            # Too many alerts in short time
            state_delta['alert_storm_active'] = True
            state_delta['alert_storm_count'] = payload.get('alert_count', 0)
            domain_actions.append({'type': 'ENTER_SAFE_MODE', 'severity': 'CRITICAL'})
            logs.append(f"[observer] Alert storm detected: {payload.get('alert_count')} alerts in {payload.get('time_window_ms')}ms")

        elif event_type == 'AnomalyDensityHigh':
            # Abnormal pattern density
            state_delta['anomaly_density'] = payload.get('deviation', 0.0)
            domain_actions.append({'type': 'INCREASE_MONITORING', 'severity': 'WARNING'})
            logs.append(f"[observer] Anomaly density high: {payload.get('anomalies_last_minute')} anomalies (baseline: {payload.get('baseline')})")

        else:
            logs.append(f"[observer] Unknown event type: {event_type}")

        return DomainResult(
            state_delta=state_delta if state_delta else None,
            domain_actions=domain_actions,
            logs=logs
        )
