"""
USS CHAOSBRINGER - STARSHIP INTEGRATION
Bridges the fictional narrative with real operational systems
Connects to:
- Trading bot (warp core decisions)
- Hybrid observer (sensor data)
- Meta-analysis (threat detection)
"""

import logging
import json
from datetime import datetime
from typing import Dict, Any, Optional
from hull.bridge_control import get_bridge, ShipState
from institutional_alert_system import get_alert_system
from meta_analysis_engine import get_analysis_engine

logger = logging.getLogger("StarshipIntegration")


class StarshipIntegration:
    """
    Connects USS Chaosbringer narrative to real operations
    Reads from actual systems and translates to ship status
    """

    def __init__(self):
        self.bridge = get_bridge()
        self.alert_system = get_alert_system()
        self.analysis_engine = get_analysis_engine()
        self.last_status_update = None

    def sync_from_trading_bot(self) -> Dict[str, Any]:
        """Read trading bot status and update ship systems"""
        try:
            # Check if trading bot is running and read recent logs
            import os
            # Use absolute path from workspace root
            log_file = r"c:\workspace\logs\trading_run_24h.log"

            if os.path.exists(log_file):
                # Read with error handling for encoding issues
                try:
                    with open(log_file, 'r', encoding='utf-8', errors='replace') as f:
                        lines = f.readlines()
                except:
                    with open(log_file, 'r', encoding='latin-1') as f:
                        lines = f.readlines()

                # Check last 5 lines for status
                recent_logs = lines[-5:] if lines else []
                status_info = {
                    'bot_active': any('Cycle' in line for line in recent_logs),
                    'timestamp': datetime.utcnow().isoformat(),
                    'recent_events': []
                }

                for line in recent_logs:
                    if 'BEARISH' in line:
                        status_info['recent_events'].append('BEARISH_MARKET')
                        self.bridge.raise_shields("Market conditions deteriorated - bearish regime detected")
                    elif 'Trading paused' in line:
                        status_info['recent_events'].append('TRADING_PAUSED')
                    elif 'Cycle' in line:
                        status_info['recent_events'].append('CYCLE_ACTIVE')

                return status_info
            else:
                return {'bot_active': False, 'timestamp': datetime.utcnow().isoformat(), 'recent_events': []}

        except Exception as e:
            logger.error(f"Failed to sync trading bot: {e}")
            return {'error': str(e)}

    def sync_from_hybrid_observer(self) -> Dict[str, Any]:
        """Read hybrid observer status and alerts"""
        try:
            alert_summary = self.alert_system.get_alert_summary()

            # Translate alerts to ship status
            severity_status = {
                'alerts_1h': alert_summary.get('total_alerts_1h', 0),
                'high_severity': alert_summary.get('severity_distribution', {}).get('HIGH', 0),
                'medium_severity': alert_summary.get('severity_distribution', {}).get('MEDIUM', 0),
            }

            # If high severity alerts, raise shields
            if severity_status['high_severity'] > 0:
                self.bridge.raise_shields(f"High severity alert received ({severity_status['high_severity']})")

            return {
                'timestamp': datetime.utcnow().isoformat(),
                'alerts': severity_status
            }

        except Exception as e:
            logger.error(f"Failed to sync hybrid observer: {e}")
            return {'error': str(e)}

    def get_integrated_status(self) -> Dict[str, Any]:
        """Get complete integrated status report"""
        return {
            'timestamp': datetime.utcnow().isoformat(),
            'bridge_status': self.bridge.get_ship_status(),
            'trading_bot': self.sync_from_trading_bot(),
            'observer': self.sync_from_hybrid_observer(),
            'integrated_summary': self._create_summary()
        }

    def _create_summary(self) -> str:
        """Create human-readable summary of overall system state"""
        state = self.bridge.ship_state
        alert = self.bridge.alert_level

        if state == ShipState.EMERGENCY_STOP:
            return "🚨 EMERGENCY STOP - All systems halted for safety"
        elif state == ShipState.SHIELDS_RAISED:
            return "🛡️  Defensive posture - Monitoring situation"
        elif state == ShipState.WARP_DRIVE:
            return "🚀 Warp drive engaged - Full operational status"
        elif state == ShipState.CLOAKED:
            return "🫗 Running silent - Observation mode only"
        else:
            return "⚓ Docked or standby - Ready to engage"

    def print_integrated_report(self):
        """Print complete status report to console"""
        status = self.get_integrated_status()

        print("\n" + "="*70)
        print("USS CHAOSBRINGER - INTEGRATED STATUS REPORT")
        print("="*70)
        print(f"Timestamp: {status['timestamp']}")
        print(f"\nOverall Status: {status['integrated_summary']}")

        print(f"\nBridge Status:")
        bridge = status['bridge_status']
        print(f"  State: {bridge['state']}")
        print(f"  Alert Level: {bridge['alert_level']}")
        print(f"  Uptime: {bridge['uptime_seconds']:.0f}s")

        print(f"\nTrading Bot Sync:")
        if 'error' in status['trading_bot']:
            print(f"  Error: {status['trading_bot']['error']}")
        else:
            trading = status['trading_bot']
            print(f"  Active: {trading.get('bot_active', False)}")
            print(f"  Recent Events: {', '.join(trading.get('recent_events', ['NONE']))}")

        print(f"\nHybrid Observer Sync:")
        if 'error' in status['observer']:
            print(f"  Error: {status['observer']['error']}")
        else:
            observer = status['observer']['alerts']
            print(f"  Alerts (1h): {observer.get('alerts_1h', 0)}")
            print(f"  High Severity: {observer.get('high_severity', 0)}")
            print(f"  Medium Severity: {observer.get('medium_severity', 0)}")

        print("="*70 + "\n")


# Singleton instance
_integration = None


def get_integration() -> StarshipIntegration:
    """Get or create singleton integration"""
    global _integration
    if _integration is None:
        _integration = StarshipIntegration()
    return _integration
