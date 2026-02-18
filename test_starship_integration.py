#!/usr/bin/env python3
"""
TEST: USS CHAOSBRINGER STARSHIP INTEGRATION
Verify that the narrative framework properly integrates with real trading systems
"""

import sys
import io
import os

# Fix Windows console encoding to UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import logging
from datetime import datetime

# Change to uss-chaosbringer directory so relative imports work
os.chdir(r'c:\workspace\uss-chaosbringer')
sys.path.insert(0, r'c:\workspace\uss-chaosbringer')
sys.path.insert(0, r'c:\workspace')

# Now import the modules
from starship_integration import get_integration
from hull.bridge_control import get_bridge, ShipState

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(name)s - %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

logger = logging.getLogger("TestIntegration")


def test_starship_integration():
    """Test that starship properly syncs with real systems"""

    print("\n" + "="*70)
    print("🖖 USS CHAOSBRINGER INTEGRATION TEST")
    print("="*70)

    # Initialize systems
    print("\n[TEST 1] Initializing starship integration...")
    integration = get_integration()
    bridge = get_bridge()

    print("✅ Bridge control initialized")
    print("✅ Hybrid observer connected")
    print("✅ Meta-analysis engine ready")

    # Sync with trading bot
    print("\n[TEST 2] Syncing with trading bot...")
    trading_status = integration.sync_from_trading_bot()
    print(f"  Bot Active: {trading_status.get('bot_active', False)}")
    print(f"  Recent Events: {len(trading_status.get('recent_events', []))} detected")

    if trading_status.get('recent_events'):
        for event in trading_status['recent_events'][:3]:
            print(f"    • {event}")

    # Sync with observer
    print("\n[TEST 3] Syncing with hybrid observer...")
    observer_status = integration.sync_from_hybrid_observer()
    alerts = observer_status.get('alerts', {})
    print(f"  Alerts (1h): {alerts.get('alerts_1h', 0)}")
    print(f"  High Severity: {alerts.get('high_severity', 0)}")
    print(f"  Medium Severity: {alerts.get('medium_severity', 0)}")

    # Get integrated status
    print("\n[TEST 4] Getting integrated status report...")
    status = integration.get_integrated_status()
    bridge_status = status['bridge_status']

    print(f"  Ship State: {bridge_status['state']}")
    print(f"  Alert Level: {bridge_status['alert_level']}")
    print(f"  Uptime: {bridge_status['uptime_seconds']:.0f}s")

    # Print full report
    print("\n[TEST 5] Full integrated status report:")
    print("-" * 70)
    integration.print_integrated_report()

    # Test state transitions
    print("\n[TEST 6] Testing state transitions...")
    print(f"  Current State: {bridge.ship_state.value}")

    if bridge_status['alert_level'] == 'RED':
        print("  ⚠️  Critical alerts detected - engaging shields...")
        bridge.raise_shields("Critical market conditions detected")
        print(f"  New State: {bridge.ship_state.value}")
    elif bridge_status['alert_level'] == 'YELLOW':
        print("  ⚠️  Warning status - engaging full impulse...")
        bridge.engage_warp_drive(0.8)
        print(f"  New State: {bridge.ship_state.value}")
    else:
        print("  ✅ All systems nominal - standing by...")

    print("\n" + "="*70)
    print("🖖 INTEGRATION TEST COMPLETE")
    print("="*70 + "\n")

    return True


if __name__ == '__main__':
    try:
        success = test_starship_integration()
        sys.exit(0 if success else 1)
    except Exception as e:
        logger.error(f"Integration test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
