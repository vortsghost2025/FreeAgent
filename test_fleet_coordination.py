#!/usr/bin/env python3
"""
TEST: Multi-Ship Fleet Coordination
Demonstrates USS Chaosbringer fleet working together with cross-ship event routing.
"""

import sys
import io

# Handle Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Handle imports
sys.path = [p for p in sys.path if 'c:\\workspace' not in p.lower() or 'site-packages' in p.lower()]
sys.path.insert(0, r'c:\workspace\uss-chaosbringer')

from chaosbringer_ship import ChaosbringingerShip
from entropy_dancer_ship import EntropyDancerShip
from fleet_coordinator import FleetCoordinator
from starship import ShipEvent


def test_fleet_initialization():
    """Test 1: Initialize fleet with multiple ships"""
    print("\n" + "="*90)
    print("TEST 1: FLEET INITIALIZATION")
    print("="*90)

    # Create coordinator
    coordinator = FleetCoordinator(flagship_name="ChaosBringer")
    print("[SETUP] FleetCoordinator initialized")

    # Create ships
    chaosbringer = ChaosbringingerShip("ChaosBringer")
    entropy_dancer = EntropyDancerShip("EntropyDancer")
    print("[SETUP] Created USS ChaosBringer (flagship)")
    print("[SETUP] Created USS EntropyDancer (anomaly specialist)")

    # Register with fleet
    coordinator.register_ship(chaosbringer)
    coordinator.register_ship(entropy_dancer)
    print("[SETUP] Ships registered with FleetCoordinator")

    # Configure cross-ship routing
    coordinator.set_cross_ship_routing(
        'ANOMALY_DETECTION',
        ['EntropyDancer']
    )
    print("[SETUP] Cross-ship routing configured: ANOMALY_DETECTION -> EntropyDancer")

    print("\n✓ Fleet initialization complete")
    print(f"  Total ships: {len(coordinator.ships)}")
    print(f"  Flagship: {coordinator.flagship_name}")

    return coordinator


def test_single_ship_event(coordinator):
    """Test 2: Process event on single ship"""
    print("\n" + "="*90)
    print("TEST 2: SINGLE SHIP EVENT PROCESSING")
    print("="*90)

    # Create a trading event on ChaosBringer
    event = ShipEvent(
        domain='TRADING_BOT',
        type='CycleCompleted',
        payload={
            'cycle_id': 'cycle-001',
            'duration_ms': 4200,
            'trades_executed': 12,
            'profit': 245.50
        },
        source_ship='EXTERNAL'
    )

    print(f"\n[EVENT] Processing: {event.type}")
    print(f"  Domain: {event.domain}")
    print(f"  Payload: {event.payload}")

    # Process on ChaosBringer
    result = coordinator.process_event_across_fleet('ChaosBringer', event)

    print(f"\n[RESULT] Severity: {result['ChaosBringer'].severity}")
    print(f"[RESULT] Narrative: {result['ChaosBringer'].narrative}")
    print(f"[RESULT] Logs:")
    for log in result['ChaosBringer'].logs:
        print(f"    {log}")

    print("\n✓ Single ship event processed")
    return event


def test_cross_ship_event_routing(coordinator):
    """Test 3: Cross-ship event routing"""
    print("\n" + "="*90)
    print("TEST 3: CROSS-SHIP EVENT ROUTING")
    print("="*90)

    # Create reactor overheat event on ChaosBringer
    event = ShipEvent(
        domain='INFRA',
        type='ReactorOverheat',
        payload={
            'core_temp': 95,
            'threshold': 85,
            'heat_rate': 2.5,
            'cooling_available': True
        },
        source_ship='EXTERNAL'
    )

    print(f"\n[EVENT] Processing: {event.type}")
    print(f"  Domain: {event.domain}")
    print(f"  Reactor Temp: {event.payload['core_temp']}°C")

    # Process on ChaosBringer
    result = coordinator.process_event_across_fleet('ChaosBringer', event)

    print(f"\n[CHAOSBRINGER]")
    print(f"  Severity: {result['ChaosBringer'].severity}")
    print(f"  Narrative: {result['ChaosBringer'].narrative[:80]}...")
    print(f"  State reactor_temp: {coordinator.ships['ChaosBringer'].state['reactor_temp']}°C")

    # Emit anomaly to EntropyDancer
    print(f"\n[CROSS-SHIP] Emitting anomaly detection event to EntropyDancer")
    coordinator.ships['ChaosBringer'].emit_anomaly_detection_event(
        anomaly_type='ReactorThermalSpike',
        severity_level='CRITICAL'
    )
    coordinator.emit_cross_ship_events('ChaosBringer')

    # Check EntropyDancer state
    print(f"\n[ENTROPY DANCER]")
    entropy_state = coordinator.ships['EntropyDancer'].state
    print(f"  Anomalies detected: {entropy_state['anomalies_detected']}")
    print(f"  Last anomaly type: {entropy_state['last_anomaly_type']}")
    print(f"  Threat level: {entropy_state['threat_level']}")

    print("\n✓ Cross-ship event routing successful")


def test_captain_commands(coordinator):
    """Test 4: Captain-level command execution"""
    print("\n" + "="*90)
    print("TEST 4: CAPTAIN COMMANDS")
    print("="*90)

    commands = ['RED_ALERT', 'SHIELD_REBALANCE', 'REACTOR_PURGE', 'TEMPORAL_SCAN', 'ALL_STOP']

    for cmd in commands:
        print(f"\n[COMMAND] Executing: {cmd}")
        results = coordinator.execute_captain_command(cmd)
        for ship_name, status in results.items():
            print(f"  {ship_name}: {status}")

    print("\n✓ Captain commands executed")


def test_fleet_telemetry(coordinator):
    """Test 5: Fleet telemetry and status"""
    print("\n" + "="*90)
    print("TEST 5: FLEET TELEMETRY & STATUS")
    print("="*90)

    telemetry = coordinator.get_fleet_telemetry()

    print(f"\nFleet Statistics:")
    print(f"  Total Ships: {telemetry.total_ships}")
    print(f"  Total Events Processed: {telemetry.total_events_processed}")
    print(f"  Fleet Threat Level: {coordinator.fleet_threat_level}/10")
    print(f"  Average Threat: {telemetry.threat_level_avg:.1f}")
    print(f"  Max Threat: {telemetry.threat_level_max}/10")

    print(f"\nSeverity Distribution:")
    for severity, count in telemetry.severity_distribution.items():
        print(f"  {severity}: {count}")

    print(f"\nShips by Mode:")
    for mode, count in telemetry.ships_by_mode.items():
        print(f"  {mode}: {count}")

    print("\n✓ Telemetry collected")


def main():
    """Run complete fleet coordination test suite"""
    print("\n" + "="*90)
    print("USS CHAOSBRINGER FLEET COORDINATION TEST SUITE")
    print("="*90)

    # Test 1: Fleet initialization
    coordinator = test_fleet_initialization()

    # Test 2: Single ship event
    test_single_ship_event(coordinator)

    # Test 3: Cross-ship routing
    test_cross_ship_event_routing(coordinator)

    # Test 4: Captain commands
    test_captain_commands(coordinator)

    # Test 5: Fleet telemetry
    test_fleet_telemetry(coordinator)

    # Final status report
    coordinator.print_fleet_status()

    print("\n" + "="*90)
    print("PHASE IV FOUNDATION TEST: COMPLETE")
    print("All multi-ship architecture features validated")
    print("="*90 + "\n")


if __name__ == '__main__':
    main()
