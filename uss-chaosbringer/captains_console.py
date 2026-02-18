#!/usr/bin/env python3
"""
USS CHAOSBRINGER - CAPTAIN'S CONSOLE
Main command interface for the starship
"Mr. Scott, I need more power to the shields!"
"""

import sys
import io
import logging
from datetime import datetime
from hull.bridge_control import get_bridge, ShipState
from hull.warp_core import get_warp_core, ProcessingMode

# Fix Windows console encoding to UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(name)s - %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

logger = logging.getLogger("CaptainsConsole")


class CaptainsConsole:
    """
    Interactive command center for USS Chaosbringer
    Captain can issue commands, monitor systems, and coordinate operations
    """

    def __init__(self):
        self.bridge = get_bridge()
        self.warp_core = get_warp_core()
        self.commands = {
            'status': self.cmd_status,
            'engage': self.cmd_engage,
            'shields': self.cmd_shields,
            'sensors': self.cmd_sensors,
            'log': self.cmd_log,
            'help': self.cmd_help,
            'emergency': self.cmd_emergency,
            'cloak': self.cmd_cloak,
            'exit': self.cmd_exit
        }

    def start(self):
        """Start the captain's console"""
        print("\n" + "="*70)
        print("🖖 WELCOME TO USS CHAOSBRINGER COMMAND CENTER")
        print("="*70)
        print("Captain's Console Online")
        print("Type 'help' for available commands")
        print("="*70 + "\n")

        self.bridge.print_status_report()

        # Interactive command loop
        while True:
            try:
                command = input("Captain> ").strip().lower()

                if not command:
                    continue

                if command in self.commands:
                    self.commands[command]()
                else:
                    print(f"Unknown command: {command}")
                    print("Type 'help' for available commands")

            except KeyboardInterrupt:
                print("\n\n[EMERGENCY] Captain has ordered all stop!")
                self.bridge.activate_emergency_stop()
                self.bridge.print_status_report()
                sys.exit(0)
            except Exception as e:
                logger.error(f"Command error: {e}")

    def cmd_status(self):
        """Display current ship status"""
        self.bridge.print_status_report()

    def cmd_engage(self):
        """Engage warp drive"""
        print("\n🚀 Engaging warp drive...")
        intensity = input("Warp intensity (0.0-1.0)? [default: 1.0]: ").strip()
        try:
            intensity = float(intensity) if intensity else 1.0
            intensity = max(0.0, min(1.0, intensity))
            self.bridge.engage_warp_drive(intensity)
            self.warp_core.set_processing_mode(ProcessingMode.WARP_DRIVE)
        except ValueError:
            print("Invalid intensity value")

    def cmd_shields(self):
        """Manage shield systems"""
        if self.bridge.ship_state == ShipState.SHIELDS_RAISED:
            print("\n🛡️  Lowering shields...")
            self.bridge.lower_shields()
        else:
            reason = input("Reason for raising shields: ").strip()
            print("\n🛡️  Raising shields...")
            self.bridge.raise_shields(reason)

    def cmd_sensors(self):
        """Check sensor systems"""
        print("\n📡 SENSOR STATUS REPORT")
        print("-" * 40)
        print("- Weather sensors: ONLINE")
        print("- Market sensors: ONLINE")
        print("- Anomaly detectors: ONLINE")
        print("- Pattern recognition: ONLINE")
        print("-" * 40 + "\n")

    def cmd_log(self):
        """Display captain's log"""
        print("\n📜 CAPTAIN'S LOG - Recent Entries")
        print("=" * 60)
        for entry in self.bridge.crew_log[-10:]:
            print(entry)
        print("=" * 60 + "\n")

    def cmd_help(self):
        """Display help"""
        print("\n" + "="*60)
        print("AVAILABLE COMMANDS")
        print("="*60)
        print("  status    - Display ship status")
        print("  engage    - Engage warp drive")
        print("  shields   - Toggle shield systems")
        print("  sensors   - Check sensor status")
        print("  log       - Display captain's log")
        print("  cloak     - Engage cloaking device (monitoring mode)")
        print("  emergency - ACTIVATE EMERGENCY STOP")
        print("  help      - Display this menu")
        print("  exit      - Shut down systems gracefully")
        print("="*60 + "\n")

    def cmd_cloak(self):
        """Engage cloak for silent monitoring"""
        print("\n🫗 Engaging cloaking device...")
        self.bridge.go_to_cloak()

    def cmd_emergency(self):
        """Activate emergency stop"""
        confirm = input("\n⚠️  EMERGENCY STOP CONFIRMATION - Type 'YES' to confirm: ")
        if confirm.upper() == 'YES':
            self.bridge.activate_emergency_stop()
            self.bridge.print_status_report()
        else:
            print("Emergency stop cancelled.")

    def cmd_exit(self):
        """Graceful shutdown"""
        print("\n\n🖖 Captain's final log entry:")
        print("Systems powering down. All hands, stand by.")
        self.bridge.print_status_report()
        print("\n✅ USS Chaosbringer systems offline. See you next voyage.\n")
        sys.exit(0)


def main():
    """Main entry point"""
    console = CaptainsConsole()
    console.start()


if __name__ == '__main__':
    main()
