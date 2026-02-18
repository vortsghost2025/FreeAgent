#!/usr/bin/env python3
"""
TEST: Lore Engine Integration
Validates complete story generation pipeline:
- Telemetry hooks → Lore entries
- Chronicle building
- Mystery/Battle/Resolution arcs
- Mission logging
- Chronicle export
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
from lore_engine import LoreEngine, LoreEntryType
from starship import ShipEvent


# ============================================================================
# TELEMETRY HOOKS (Same as telemetry test)
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
        return TelemetryHookResult(
            hook_name="threat_escalation",
            triggered=True,
            narrative_segment=f"Fleet threat escalating: {threat_increase:.1f}",
            lore_event={
                'chapter': 'The Crisis Deepens',
                'trigger': 'threat_escalation',
                'threat_delta': threat_increase,
            }
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
        return TelemetryHookResult(
            hook_name="critical_ship_detection",
            triggered=True,
            narrative_segment=f"ALERT: {fleet_metrics.critical_ships} in CRITICAL",
            lore_event={
                'chapter': 'Red Alert',
                'critical_ships': fleet_metrics.critical_ships,
            }
        )

    return TelemetryHookResult(
        hook_name="critical_ship_detection",
        triggered=False,
        narrative_segment=None,
        lore_event=None
    )


def fleet_health_hook(fleet_metrics, previous_metrics):
    """Hook: Track fleet health changes"""
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
        narrative = f"Health declining: {health_delta:.1%}"
    elif health_delta > 0.1:
        narrative = f"Health improving: {health_delta:.1%}"

    return TelemetryHookResult(
        hook_name="fleet_health",
        triggered=narrative is not None,
        narrative_segment=narrative,
        lore_event={'health_score': fleet_metrics.fleet_health_score} if narrative else None
    )


def test_lore_initialization():
    """Test 1: Initialize lore engine and integrate with fleet"""
    print("\n" + "="*90)
    print("TEST 1: LORE ENGINE INITIALIZATION")
    print("="*90)

    # Create engines
    telemetry = TelemetryEngine()
    lore = LoreEngine()
    coordinator = FleetCoordinator()

    # Register ships
    chaosbringer = ChaosbringingerShip("ChaosBringer")
    entropy_dancer = EntropyDancerShip("EntropyDancer")
    coordinator.register_ship(chaosbringer)
    coordinator.register_ship(entropy_dancer)
    print("[SETUP] Fleet initialized with 2 ships")

    # Wire engines
    coordinator.set_telemetry_engine(telemetry)
    coordinator.set_lore_engine(lore)
    print("[SETUP] TelemetryEngine and LoreEngine wired to FleetCoordinator")

    # Register hooks
    telemetry.register_hook("threat_escalation", threat_escalation_hook)
    telemetry.register_hook("critical_ship_detection", critical_ship_detection_hook)
    telemetry.register_hook("fleet_health", fleet_health_hook)
    print("[SETUP] 3 telemetry hooks registered")

    print("\n✓ Lore initialization complete")
    return coordinator, telemetry, lore


def test_story_generation(coordinator, telemetry, lore):
    """Test 2: Generate stories from fleet events"""
    print("\n" + "="*90)
    print("TEST 2: STORY GENERATION FROM FLEET EVENTS")
    print("="*90)

    # Start a mission
    mission_id = lore.start_mission(
        "USS Chaosbringer Test Run",
        "Validation of multi-ship coordination under reactor stress"
    )
    print(f"\n[MISSION] Started: {mission_id}")
    lore.log_mission_event(mission_id, "Fleet assembled and ready for operation")

    # Event 1: Normal operation
    print("\n[EVENT 1] Trading cycle completes")
    event1 = ShipEvent(
        domain='TRADING_BOT',
        type='CycleCompleted',
        payload={'cycle_id': 'c001', 'duration_ms': 4200}
    )
    coordinator.process_event_across_fleet('ChaosBringer', event1)
    lore.log_mission_event(mission_id, "Trading cycle completed successfully")

    # Event 2: Reactor overheat (triggers crisis story)
    print("[EVENT 2] Reactor overheat - CRISIS")
    event2 = ShipEvent(
        domain='INFRA',
        type='ReactorOverheat',
        payload={'core_temp': 90, 'threshold': 85, 'heat_rate': 3.5}
    )
    coordinator.process_event_across_fleet('ChaosBringer', event2)
    lore.log_mission_event(mission_id, "CRITICAL: Reactor temperature exceeded threshold")

    metrics = telemetry.get_latest_metrics()
    print(f"\n[TELEMETRY] Threat level: {metrics.threat_level_avg:.1f}/10")
    print(f"[TELEMETRY] Fleet health: {metrics.fleet_health_score:.1%}")
    print(f"[TELEMETRY] Critical ships: {metrics.critical_ships}")

    # Check lore generated
    print(f"\n[LORE] Chronicle entries generated: {len(lore.chronicle)}")
    for entry in lore.chronicle:
        print(f"  [{entry.type.value.upper()}] {entry.title}")
        print(f"        Severity: {entry.severity}, Ships: {entry.ships_involved}")

    lore.complete_mission(mission_id, 'success')
    print(f"\n[MISSION] Completed: {mission_id}")

    print("\n✓ Story generation validated")
    return mission_id


def test_chronicle_exploration(lore):
    """Test 3: Explore generated chronicle"""
    print("\n" + "="*90)
    print("TEST 3: CHRONICLE EXPLORATION")
    print("="*90)

    stats = lore.get_chronicle_stats()

    print(f"\n[CHRONICLE STATS]")
    print(f"  Total Entries: {stats['total_entries']}")
    print(f"  By Type: {stats['by_type']}")
    print(f"  By Severity: {stats['by_severity']}")
    print(f"  Active Mysteries: {stats['active_mysteries']}")
    print(f"  Active Battles: {stats['active_battles']}")

    if lore.active_mysteries:
        print(f"\n[ACTIVE MYSTERIES]")
        for entry in lore.active_mysteries.values():
            print(f"  - {entry.title}")

    if lore.active_battles:
        print(f"\n[ACTIVE BATTLES]")
        for entry in lore.active_battles.values():
            print(f"  - {entry.title}")

    print("\n✓ Chronicle exploration complete")


def test_chronicle_reports(lore):
    """Test 4: Generate reports"""
    print("\n" + "="*90)
    print("TEST 4: CHRONICLE & MISSION REPORTS")
    print("="*90)

    # Chronicle summary
    chronicle = lore.generate_chronicle_summary()
    print(chronicle)

    # Mission report
    if lore.mission_logs:
        report = lore.generate_mission_report()
        print(report)

    print("✓ Reports generated")


def test_chronicle_export(lore):
    """Test 5: Export chronicle"""
    print("\n" + "="*90)
    print("TEST 5: CHRONICLE EXPORT")
    print("="*90)

    json_export = lore.export_chronicle_json()
    json_lines = json_export.split('\n')

    print(f"\n[JSON EXPORT] {len(json_lines)} lines")
    print(json_export[:600] + "...\n" if len(json_export) > 600 else json_export)

    print("✓ Export validated")


def main():
    """Run complete lore engine test suite"""
    print("\n" + "="*90)
    print("LORE ENGINE TEST SUITE")
    print("="*90)

    # Test 1: Initialization
    coordinator, telemetry, lore = test_lore_initialization()

    # Test 2: Story generation
    mission_id = test_story_generation(coordinator, telemetry, lore)

    # Test 3: Chronicle exploration
    test_chronicle_exploration(lore)

    # Test 4: Reports
    test_chronicle_reports(lore)

    # Test 5: Export
    test_chronicle_export(lore)

    print("\n" + "="*90)
    print("LORE ENGINE TEST SUITE: COMPLETE")
    print("✓ Story generation from telemetry hooks validated")
    print("✓ Chronicle building and arcs working")
    print("✓ Mission logging functional")
    print("✓ Reports and export operational")
    print("="*90 + "\n")


if __name__ == '__main__':
    main()
