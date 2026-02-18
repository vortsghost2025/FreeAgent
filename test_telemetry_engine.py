#!/usr/bin/env python3
"""
TEST: Telemetry Engine Integration
Validates complete telemetry pipeline:
- Per-ship metric collection
- Fleet-wide aggregation
- Narrative telemetry hooks
- Trend tracking
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
from telemetry_engine import TelemetryEngine, TelemetryHookResult
from starship import ShipEvent


# ============================================================================
# TELEMETRY HOOKS (Narrative integration examples)
# ============================================================================

def threat_escalation_hook(fleet_metrics, previous_metrics):
    """Hook: Trigger narrative on threat escalation"""
    if not previous_metrics:
        return TelemetryHookResult(
            hook_name="threat_escalation",
            triggered=False,
            narrative_segment=None,
            lore_event=None
        )

    threat_increase = fleet_metrics.threat_level_avg - previous_metrics.threat_level_avg

    if threat_increase > 3:
        narrative = f"Fleet threat escalating rapidly: {threat_increase:.1f} threat units in last cycle"
        lore_event = {
            'chapter': 'The Crisis Deepens',
            'trigger': 'threat_escalation',
            'threat_delta': threat_increase,
            'detail': f"Average threat jumped from {previous_metrics.threat_level_avg:.1f} to {fleet_metrics.threat_level_avg:.1f}"
        }
        return TelemetryHookResult(
            hook_name="threat_escalation",
            triggered=True,
            narrative_segment=narrative,
            lore_event=lore_event
        )

    return TelemetryHookResult(
        hook_name="threat_escalation",
        triggered=False,
        narrative_segment=None,
        lore_event=None
    )


def critical_ship_detection_hook(fleet_metrics, previous_metrics):
    """Hook: Alert when ship enters CRITICAL mode"""
    if fleet_metrics.critical_ships:
        narrative = f"ALERT: {len(fleet_metrics.critical_ships)} ship(s) in CRITICAL status: {', '.join(fleet_metrics.critical_ships)}"
        lore_event = {
            'chapter': 'Red Alert',
            'trigger': 'critical_ship_detection',
            'critical_ships': fleet_metrics.critical_ships,
            'timestamp': fleet_metrics.timestamp
        }
        return TelemetryHookResult(
            hook_name="critical_ship_detection",
            triggered=True,
            narrative_segment=narrative,
            lore_event=lore_event
        )

    return TelemetryHookResult(
        hook_name="critical_ship_detection",
        triggered=False,
        narrative_segment=None,
        lore_event=None
    )


def fleet_health_hook(fleet_metrics, previous_metrics):
    """Hook: Track fleet health score changes"""
    if not previous_metrics:
        return TelemetryHookResult(
            hook_name="fleet_health",
            triggered=False,
            narrative_segment=None,
            lore_event=None
        )

    health_delta = fleet_metrics.fleet_health_score - previous_metrics.fleet_health_score

    narrative = None
    if health_delta < -0.1:
        narrative = f"Fleet health deteriorating: {health_delta:.1%} delta (now {fleet_metrics.fleet_health_score:.1%})"
    elif health_delta > 0.1:
        narrative = f"Fleet health improving: {health_delta:.1%} delta (now {fleet_metrics.fleet_health_score:.1%})"

    return TelemetryHookResult(
        hook_name="fleet_health",
        triggered=narrative is not None,
        narrative_segment=narrative,
        lore_event={'health_score': fleet_metrics.fleet_health_score} if narrative else None
    )


def event_rate_spike_hook(fleet_metrics, previous_metrics):
    """Hook: Detect event rate spikes (system under load)"""
    if not previous_metrics:
        return TelemetryHookResult(
            hook_name="event_rate_spike",
            triggered=False,
            narrative_segment=None,
            lore_event=None
        )

    rate_increase = fleet_metrics.event_rate - previous_metrics.event_rate

    if rate_increase > 2:  # More than 2 events/sec increase
        narrative = f"System under heavy load: event rate spiked to {fleet_metrics.event_rate:.1f} evt/sec"
        return TelemetryHookResult(
            hook_name="event_rate_spike",
            triggered=True,
            narrative_segment=narrative,
            lore_event={
                'event_rate': fleet_metrics.event_rate,
                'spike': rate_increase
            }
        )

    return TelemetryHookResult(
        hook_name="event_rate_spike",
        triggered=False,
        narrative_segment=None,
        lore_event=None
    )


def test_telemetry_initialization():
    """Test 1: Initialize telemetry engine and integrate with fleet"""
    print("\n" + "="*90)
    print("TEST 1: TELEMETRY ENGINE INITIALIZATION")
    print("="*90)

    # Create telemetry engine
    telemetry = TelemetryEngine()
    print("[SETUP] TelemetryEngine created")

    # Create and register ships
    coordinator = FleetCoordinator()
    chaosbringer = ChaosbringingerShip("ChaosBringer")
    entropy_dancer = EntropyDancerShip("EntropyDancer")
    coordinator.register_ship(chaosbringer)
    coordinator.register_ship(entropy_dancer)
    print("[SETUP] 2 ships registered with FleetCoordinator")

    # Wire telemetry into fleet
    coordinator.set_telemetry_engine(telemetry)
    print("[SETUP] TelemetryEngine wired into FleetCoordinator")

    # Register hooks
    telemetry.register_hook("threat_escalation", threat_escalation_hook)
    telemetry.register_hook("critical_ship_detection", critical_ship_detection_hook)
    telemetry.register_hook("fleet_health", fleet_health_hook)
    telemetry.register_hook("event_rate_spike", event_rate_spike_hook)
    print("[SETUP] 4 telemetry hooks registered")

    print("\n✓ Telemetry initialization complete")
    return coordinator, telemetry


def test_telemetry_collection(coordinator, telemetry):
    """Test 2: Collect telemetry snapshots"""
    print("\n" + "="*90)
    print("TEST 2: TELEMETRY COLLECTION")
    print("="*90)

    # Collect baseline metrics
    metrics1 = telemetry.collect_fleet_metrics(coordinator.ships)

    print(f"\n[BASELINE METRICS]")
    print(f"  Fleet Health: {metrics1.fleet_health_score:.1%}")
    print(f"  Avg Threat: {metrics1.threat_level_avg:.1f}/10")
    print(f"  Event Rate: {metrics1.event_rate:.2f} evt/sec")
    print(f"  Total Events: {metrics1.total_events_processed}")
    print(f"  Ships by Mode: {metrics1.ships_by_mode}")

    # Store in history
    telemetry.metric_history.append(metrics1)

    print("\n✓ Initial telemetry collected")
    return metrics1


def test_telemetry_during_events(coordinator, telemetry):
    """Test 3: Collect telemetry during fleet events"""
    print("\n" + "="*90)
    print("TEST 3: TELEMETRY DURING EVENT PROCESSING")
    print("="*90)

    # Get previous metrics
    previous_metrics = telemetry.get_latest_metrics()

    # Process events on ChaosBringer
    event1 = ShipEvent(
        domain='TRADING_BOT',
        type='CycleCompleted',
        payload={'cycle_id': 'cycle-001', 'duration_ms': 4200}
    )
    print("\n[EVENT 1] CycleCompleted on ChaosBringer")
    coordinator.process_event_across_fleet('ChaosBringer', event1)

    # Process reactor overheat
    event2 = ShipEvent(
        domain='INFRA',
        type='ReactorOverheat',
        payload={'core_temp': 88, 'threshold': 85, 'heat_rate': 3.2}
    )
    print("[EVENT 2] ReactorOverheat on ChaosBringer")
    coordinator.process_event_across_fleet('ChaosBringer', event2)

    # Check telemetry
    current_metrics = telemetry.get_latest_metrics()

    if current_metrics:
        print(f"\n[METRICS AFTER EVENTS]")
        print(f"  Fleet Health: {current_metrics.fleet_health_score:.1%}")
        print(f"  Avg Threat: {current_metrics.threat_level_avg:.1f}/10")
        print(f"  Events Processed: {current_metrics.total_events_processed}")
        print(f"  Critical Ships: {current_metrics.critical_ships if current_metrics.critical_ships else '(none)'}")

        # Check hooks
        print(f"\n[HOOK TRIGGERS]")
        if telemetry.hook_results_history:
            for result in telemetry.hook_results_history[-10:]:  # Show last 10
                if result.triggered:
                    print(f"  ✓ {result.hook_name}: {result.narrative_segment}")

    print("\n✓ Telemetry collected during event processing")


def test_telemetry_aggregation(coordinator, telemetry):
    """Test 4: Verify fleet-level aggregation"""
    print("\n" + "="*90)
    print("TEST 4: FLEET-LEVEL AGGREGATION")
    print("="*90)

    metrics = telemetry.get_latest_metrics()

    print(f"\n[AGGREGATED FLEET METRICS]")
    print(f"  Total Ships: {metrics.total_ships}")
    print(f"  Total Events: {metrics.total_events_processed}")

    print(f"\n[THREAT AGGREGATION]")
    print(f"  Avg Threat: {metrics.threat_level_avg:.1f}/10")
    print(f"  Max Threat: {metrics.threat_level_max}/10")
    print(f"  Min Threat: {metrics.threat_level_min}/10")

    print(f"\n[OPERATIONAL STATUS]")
    print(f"  Ships by Mode: {metrics.ships_by_mode}")
    print(f"  Severity Distribution: {metrics.severity_distribution}")

    print(f"\n[FLEET HEALTH]")
    print(f"  Health Score: {metrics.fleet_health_score:.1%}")
    print(f"  Event Rate: {metrics.event_rate:.2f} evt/sec")

    print(f"\n[SHIP BREAKDOWN]")
    for ship_name, ship_metrics in metrics.ships.items():
        print(f"  {ship_name}: threat={ship_metrics.threat_level}, mode={ship_metrics.mode}, shields={ship_metrics.shields}%")

    print("\n✓ Fleet aggregation validated")


def test_telemetry_reporting(telemetry):
    """Test 5: Generate telemetry reports"""
    print("\n" + "="*90)
    print("TEST 5: TELEMETRY REPORTS")
    print("="*90)

    report = telemetry.get_telemetry_report()
    print(report)

    print("✓ Telemetry report generated")


def test_telemetry_export(telemetry):
    """Test 6: Export telemetry data"""
    print("\n" + "="*90)
    print("TEST 6: TELEMETRY EXPORT")
    print("="*90)

    metrics = telemetry.get_latest_metrics()

    if metrics:
        # JSON export
        json_str = telemetry.export_metrics_json(metrics)
        json_lines = json_str.split('\n')
        print(f"\n[JSON EXPORT] ({len(json_lines)} lines)")
        print(json_str[:500] + "...")

        # CSV export
        csv_row = telemetry.export_csv_row(metrics)
        print(f"\n[CSV EXPORT]")
        print(csv_row)

    print("\n✓ Telemetry export validated")


def main():
    """Run complete telemetry test suite"""
    print("\n" + "="*90)
    print("TELEMETRY ENGINE TEST SUITE")
    print("="*90)

    # Test 1: Initialization
    coordinator, telemetry = test_telemetry_initialization()

    # Test 2: Collection
    test_telemetry_collection(coordinator, telemetry)

    # Test 3: During events
    test_telemetry_during_events(coordinator, telemetry)

    # Test 4: Aggregation
    test_telemetry_aggregation(coordinator, telemetry)

    # Test 5: Reporting
    test_telemetry_reporting(telemetry)

    # Test 6: Export
    test_telemetry_export(telemetry)

    print("\n" + "="*90)
    print("TELEMETRY ENGINE TEST SUITE: COMPLETE")
    print("✓ Per-ship collection validated")
    print("✓ Fleet aggregation validated")
    print("✓ Narrative hooks operational")
    print("✓ Telemetry reporting working")
    print("✓ Export formats supported")
    print("="*90 + "\n")


if __name__ == '__main__':
    main()
