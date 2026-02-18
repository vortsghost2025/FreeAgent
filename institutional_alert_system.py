"""
Institutional Alerting System
Real-time notifications for critical state transitions
Monitors trading bot and sends alerts on state changes
"""

import logging
from datetime import datetime
from typing import Dict, Any, Optional
import json

logger = logging.getLogger("InstitutionalAlertSystem")


class StateTransitionAlert:
    """Immutable alert record for state transitions"""

    def __init__(self, state: str, reason: str, severity: str, metadata: Dict[str, Any]):
        self.timestamp = datetime.utcnow().isoformat()
        self.state = state
        self.reason = reason
        self.severity = severity  # HIGH, MEDIUM, LOW
        self.metadata = metadata
        self.event_id = f"ALERT_{self.timestamp.replace(':', '').replace('.', '')}"

    def to_dict(self) -> Dict[str, Any]:
        return {
            'event_id': self.event_id,
            'timestamp': self.timestamp,
            'state': self.state,
            'reason': self.reason,
            'severity': self.severity,
            'metadata': self.metadata
        }

    def to_log_entry(self) -> str:
        color = {
            'HIGH': '\033[91m',     # Red
            'MEDIUM': '\033[93m',   # Yellow
            'LOW': '\033[94m'       # Blue
        }.get(self.severity, '\033[0m')
        reset = '\033[0m'

        return (f"{color}[ALERT-{self.severity}] {self.state}: {self.reason} "
                f"(ID: {self.event_id[:16]}...){reset}")


class InstitutionalAlertSystem:
    """
    Monitors system state and generates alerts for key events
    Designed to run independently of trading bot
    """

    def __init__(self, log_file: str = "logs/alerts.jsonl"):
        self.log_file = log_file
        self.alerts = []
        self.alert_history = {}  # Prevent duplicate alerts

        # Severity thresholds
        self.high_severity_states = [
            'CIRCUIT_BREAKER_ACTIVE',
            'SYSTEM_HALTED',
            'EMERGENCY_STOP'
        ]
        self.medium_severity_states = [
            'BEARISH_LOCKOUT',
            'VOLATILITY_SPIKE_PAUSE',
            'CORRELATION_THROTTLED'
        ]

        logger.info("[ALERT SYSTEM] Initialized")

    def generate_alert(self, state: str, reason: str, metadata: Dict[str, Any] = None) -> StateTransitionAlert:
        """Generate an alert for a state transition"""

        if metadata is None:
            metadata = {}

        # Determine severity
        if state in self.high_severity_states:
            severity = 'HIGH'
        elif state in self.medium_severity_states:
            severity = 'MEDIUM'
        else:
            severity = 'LOW'

        # Create alert
        alert = StateTransitionAlert(state, reason, severity, metadata)

        # Check for duplicate (same state + reason within 5 minutes)
        alert_key = f"{state}_{reason}"
        if alert_key in self.alert_history:
            last_alert_time = self.alert_history[alert_key]
            time_since_last = datetime.utcnow().timestamp() - last_alert_time
            if time_since_last < 300:  # 5 minutes
                logger.debug(f"[ALERT] Suppressing duplicate alert: {alert_key}")
                return None

        # Record this alert
        self.alert_history[alert_key] = datetime.utcnow().timestamp()
        self.alerts.append(alert)

        # Log to console
        logger.warning(alert.to_log_entry())

        # Append to alert log file
        self._log_alert_to_file(alert)

        return alert

    def _log_alert_to_file(self, alert: StateTransitionAlert):
        """Append alert to JSONL file"""
        try:
            with open(self.log_file, 'a') as f:
                f.write(json.dumps(alert.to_dict()) + '\n')
        except Exception as e:
            logger.error(f"[ALERT] Failed to log alert to file: {e}")

    def get_recent_alerts(self, minutes: int = 60) -> list:
        """Get alerts from last N minutes"""
        cutoff_time = datetime.utcnow().timestamp() - (minutes * 60)
        recent = []

        try:
            with open(self.log_file, 'r') as f:
                for line in f:
                    try:
                        alert_data = json.loads(line)
                        alert_time = datetime.fromisoformat(alert_data['timestamp']).timestamp()
                        if alert_time >= cutoff_time:
                            recent.append(alert_data)
                    except json.JSONDecodeError:
                        continue
        except FileNotFoundError:
            pass

        return recent

    def get_alert_summary(self) -> Dict[str, Any]:
        """Get summary of recent alerts"""
        recent_alerts = self.get_recent_alerts(60)  # Last hour

        severity_counts = {'HIGH': 0, 'MEDIUM': 0, 'LOW': 0}
        state_counts = {}

        for alert in recent_alerts:
            severity = alert.get('severity', 'LOW')
            state = alert.get('state', 'UNKNOWN')

            severity_counts[severity] = severity_counts.get(severity, 0) + 1
            state_counts[state] = state_counts.get(state, 0) + 1

        return {
            'total_alerts_1h': len(recent_alerts),
            'severity_distribution': severity_counts,
            'top_states': sorted(state_counts.items(), key=lambda x: x[1], reverse=True)[:5],
            'last_update': datetime.utcnow().isoformat()
        }


# Singleton instance
_alert_system = None


def get_alert_system() -> InstitutionalAlertSystem:
    """Get or create singleton alert system"""
    global _alert_system
    if _alert_system is None:
        _alert_system = InstitutionalAlertSystem()
    return _alert_system
