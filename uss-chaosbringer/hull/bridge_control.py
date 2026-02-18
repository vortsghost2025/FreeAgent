"""
USS CHAOSBRINGER - BRIDGE CONTROL SYSTEM
Captain's central command and state machine
Ensures all systems operate within acceptable parameters
"""

import logging
from datetime import datetime
from typing import Dict, Any, Optional, List
from enum import Enum

logger = logging.getLogger("BridgeControl")


class ShipState(Enum):
    """USS Chaosbringer operational states"""
    DOCKED = "docked"           # Systems initializing
    STANDBY = "standby"          # Ready to engage
    ACTIVE_ENGAGEMENT = "active" # Full operational
    SHIELDS_RAISED = "shields"   # Defensive posture
    WARP_DRIVE = "warp"          # Maximum processing
    EMERGENCY_STOP = "emergency" # NOPE BUTTON ACTIVATED
    CLOAKED = "cloaked"          # Passive monitoring only


class BridgeControl:
    """
    Central command for USS Chaosbringer
    Manages state transitions and narrates all system activity
    Think Captain Kirk meets institutional risk management
    """

    def __init__(self):
        self.ship_state = ShipState.DOCKED
        self.start_time = datetime.utcnow()
        self.systems_status = {
            'warp_core': 'COLD',
            'shields': 'OFFLINE',
            'sensors': 'OFFLINE',
            'weapons': 'LOCKED',
            'life_support': 'NOMINAL',
            'nav_computer': 'READY'
        }
        self.alert_level = "GREEN"
        self.crew_log = []
        self.state_history = []

        self._log_captain_entry(
            "🖖 Captain's Log, Stardate 2026.02.18",
            "USS Chaosbringer systems initialization complete. All hands stand by."
        )

    def engage_warp_drive(self, intensity: float = 1.0) -> bool:
        """Enter high-processing mode"""
        if self.ship_state == ShipState.SHIELDS_RAISED:
            self._narrate("⚠️  Captain, shields are still raised! Cannot engage warp drive yet.")
            return False

        self.ship_state = ShipState.WARP_DRIVE
        self.systems_status['warp_core'] = f'ONLINE ({intensity*100:.0f}%)'
        self._narrate(f"🚀 Warp core engaged at {intensity*100:.0f}% capacity. All systems go.")
        return True

    def raise_shields(self, reason: str = ""):
        """Emergency protective posture"""
        self.ship_state = ShipState.SHIELDS_RAISED
        self.alert_level = "RED"
        self.systems_status['shields'] = 'RAISED'
        self._narrate(f"🛡️  Defensive shields raised. {reason}")

    def lower_shields(self):
        """Return to normal operations"""
        self.ship_state = ShipState.ACTIVE_ENGAGEMENT
        self.alert_level = "YELLOW"
        self.systems_status['shields'] = 'ONLINE'
        self._narrate("✅ Shields lowered. Returning to normal operations.")

    def go_to_cloak(self):
        """Silent monitoring mode - no trades, just observation"""
        self.ship_state = ShipState.CLOAKED
        self.alert_level = "BLUE"
        self._narrate("🫗 Cloaking device engaged. Running silent analysis mode.")

    def activate_emergency_stop(self):
        """NOPE BUTTON - Full emergency halt"""
        self.ship_state = ShipState.EMERGENCY_STOP
        self.alert_level = "RED"
        self.systems_status['warp_core'] = 'OFFLINE'
        self.systems_status['shields'] = 'MAXIMUM'
        self._narrate("🚨 EMERGENCY STOP ACTIVATED. All systems halting immediately.")

    def get_ship_status(self) -> Dict[str, Any]:
        """Return full status report for captain"""
        uptime = datetime.utcnow() - self.start_time
        return {
            'state': self.ship_state.value,
            'alert_level': self.alert_level,
            'uptime_seconds': uptime.total_seconds(),
            'systems': self.systems_status,
            'last_log_entries': self.crew_log[-5:] if self.crew_log else []
        }

    def _narrate(self, message: str):
        """Narrate ship status to captain"""
        timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] {message}"
        self.crew_log.append(log_entry)
        logger.warning(f"[BRIDGE] {message}")

    def _log_captain_entry(self, header: str, entry: str):
        """Official captain's log entry"""
        self._narrate(f"\n{header}\n{entry}\n")
        self.state_history.append({
            'timestamp': datetime.utcnow().isoformat(),
            'entry': header,
            'details': entry
        })

    def print_status_report(self):
        """Display bridge status to console"""
        status = self.get_ship_status()
        print("\n" + "="*60)
        print(f"USS CHAOSBRINGER - BRIDGE STATUS")
        print("="*60)
        print(f"State: {status['state'].upper()}")
        print(f"Alert Level: {status['alert_level']}")
        print(f"Uptime: {status['uptime_seconds']:.0f}s")
        print(f"\nSystems Status:")
        for system, status_val in status['systems'].items():
            print(f"  {system}: {status_val}")
        print("="*60 + "\n")


# Singleton instance
_bridge = None


def get_bridge() -> BridgeControl:
    """Get or create singleton bridge control"""
    global _bridge
    if _bridge is None:
        _bridge = BridgeControl()
    return _bridge
