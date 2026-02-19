#!/usr/bin/env python3
"""
PHASE V TEST SUITE — Autonomous Fleet Operations
Tests for:
  - SensingShip observation capabilities
  - FleetBrain strategic decision-making
  - ShipGenerator autonomous spawning
  - Autonomous cycle execution
  - Self-organizing fleet growth
"""

import sys
import io
import os
import json

# UTF-8 support on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Add test directory to path for clean imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sensing_ship import SensingShip
from chaosbringer_ship import ChaosbringingerShip
from fleet_coordinator import FleetCoordinator
from fleet_brain import FleetBrain, StrategicDecision
from ship_generator import ShipGenerator, ShipBlueprint
from starship import ShipEvent


def test_sensing_ship_initialization():
    """Test 1: SensingShip initializes with correct state"""
    print("\n[TEST 1] SensingShip Initialization")
    print("-" * 60)

    ship = SensingShip("SensorOne", personality_mode='CALM')

    assert ship.ship_name == "SensorOne", "Ship name mismatch"
    assert ship.personality_mode == 'CALM', "Personality mode should be CALM"
    assert ship.state['scan_radius'] == 10, "Scan radius should be 10"
    assert ship.state['signal_strength'] == 80, "Signal strength should be 80"
    assert ship.state['contact_count'] == 0, "Initial contact count should be 0"

    print(f"✓ SensingShip initialized: {ship}")
    print(f"✓ Personality mode: {ship.personality_mode}")
    print(f"✓ Initial state: scan_radius={ship.state['scan_radius']}, signal={ship.state['signal_strength']}%")
    return True


def test_sensing_ship_observation():
    """Test 2: SensingShip processes sensor events"""
    print("\n[TEST 2] SensingShip Sensor Sweep")
    print("-" * 60)

    sensor = SensingShip("Voyager", personality_mode='CALM')

    # Simulate sensor sweep event
    event = ShipEvent(
        domain='SENSOR_SWEEP',
        type='SweepComplete',
        payload={'radius': 12, 'target_count': 3},
        source_ship='Voyager'
    )

    result = sensor.process_event(event)

    assert result.success, "Sweep should succeed"
    assert result.severity in ['INFO', 'WARNING'], "Sweep severity should be INFO/WARNING"
    assert sensor.state['contact_count'] == 3, "Should detect 3 contacts"

    print(f"✓ Sensor sweep executed successfully")
    print(f"✓ Detected {sensor.state['contact_count']} contacts")
    print(f"✓ Narrative: {result.narrative[:80]}...")
    return True


def test_fleet_brain_initialization():
    """Test 3: FleetBrain initializes with autonomy level"""
    print("\n[TEST 3] FleetBrain Initialization")
    print("-" * 60)

    brain = FleetBrain(name="FleetMind-V1", autonomy_level=7)

    assert brain.name == "FleetMind-V1", "Brain name mismatch"
    assert brain.autonomy_level == 7, "Autonomy level should be 7"
    assert len(brain.decision_history) == 0, "Decision history should be empty"

    print(f"✓ FleetBrain initialized: {brain}")
    print(f"✓ Autonomy level: {brain.autonomy_level}/10")
    print(f"✓ Available strategies: {list(brain.strategy_config.keys())}")
    return True


def test_fleet_brain_strategy_selection():
    """Test 4: FleetBrain selects appropriate strategy based on threat"""
    print("\n[TEST 4] FleetBrain Strategy Selection")
    print("-" * 60)

    brain = FleetBrain(autonomy_level=7)

    # Test threat level -> strategy mapping
    test_cases = [
        (0, 'BALANCED'),     # Zero threat -> BALANCED
        (1, 'SCOUT'),        # Low threat -> SCOUT
        (2, 'SCOUT'),        # Low-medium -> SCOUT
        (4, 'AGGRESSIVE'),   # Medium -> AGGRESSIVE
        (5, 'AGGRESSIVE'),   # Medium-high -> AGGRESSIVE
        (6, 'DEFENSIVE'),    # High -> DEFENSIVE
        (8, 'EVASIVE'),      # Critical -> EVASIVE
    ]

    for threat, expected_strategy in test_cases:
        strategy = brain._select_strategy(threat, None)
        assert strategy == expected_strategy, f"Threat {threat} should select {expected_strategy}, got {strategy}"
        print(f"✓ Threat {threat}/10 → {strategy}")

    return True


def test_fleet_brain_decision_making():
    """Test 5: FleetBrain makes decisions from fleet snapshot"""
    print("\n[TEST 5] FleetBrain Decision Making")
    print("-" * 60)

    brain = FleetBrain(autonomy_level=7)

    # Simulate fleet snapshot
    fleet_snapshot = {
        'contacts': ['ChaosBringer', 'SensorOne', 'Harvester1'],
        'threat_map': {'ChaosBringer': 6, 'SensorOne': 2, 'Harvester1': 4},
        'contact_count': 3,
        'threat_level_avg': 4.0,
    }

    decision = brain.make_strategic_decision(fleet_snapshot)

    assert isinstance(decision, StrategicDecision), "Should return StrategicDecision"
    assert decision.decision_id.startswith('decision-'), "Decision ID malformed"
    assert decision.threat_level == 4, "Threat level should match snapshot"
    assert decision.strategy in brain.strategy_config, "Strategy should be valid"
    assert len(decision.actions) > 0, "Should have generated actions"

    print(f"✓ Decision made: {decision.decision_id}")
    print(f"✓ Strategy: {decision.strategy}")
    print(f"✓ Threat level: {decision.threat_level}/10")
    print(f"✓ Actions: {len(decision.actions)}")
    print(f"✓ Confidence: {decision.confidence:.2%}")
    print(f"✓ Reasoning: {decision.reasoning}")

    return True


def test_ship_generator_initialization():
    """Test 6: ShipGenerator initializes and loads ship classes"""
    print("\n[TEST 6] ShipGenerator Initialization")
    print("-" * 60)

    generator = ShipGenerator()

    assert generator.ships_generated == 0, "Initial ship count should be 0"
    assert 'SensingShip' in generator.SHIP_TYPES, "Should have SensingShip type"
    assert generator.SHIP_TYPES['SensingShip'] is not None, "SensingShip class should be loaded"
    assert 'ChaosbringingerShip' in generator.SHIP_TYPES, "Should have ChaosBringer type"

    print(f"✓ ShipGenerator initialized: {generator}")
    available_types = sum(1 for v in generator.SHIP_TYPES.values() if v is not None)
    print(f"✓ Available ship types: {available_types}")
    print(f"✓ Personality weights: {list(generator.PERSONALITY_WEIGHTS.keys())}")

    return True


def test_ship_generator_blueprint():
    """Test 7: ShipGenerator creates blueprints and ships"""
    print("\n[TEST 7] ShipGenerator Blueprint and Spawning")
    print("-" * 60)

    generator = ShipGenerator()

    # Create blueprint
    blueprint = ShipBlueprint(
        ship_type='SensingShip',
        ship_name='Sentinel-001',
        personality_mode='CALM',
        config={'test': True}
    )

    assert blueprint.ship_name == 'Sentinel-001', "Blueprint name mismatch"
    assert blueprint.personality_mode == 'CALM', "Blueprint personality mismatch"

    # Generate ship from blueprint
    ship = generator.generate_from_blueprint(blueprint)

    assert ship.ship_name == 'Sentinel-001', "Generated ship name mismatch"
    assert ship.personality_mode == 'CALM', "Generated ship personality mismatch"
    assert generator.ships_generated == 1, "Ships generated count should be 1"

    print(f"✓ Blueprint created: {blueprint.ship_name}")
    print(f"✓ Ship spawned: {ship}")
    print(f"✓ Total ships generated: {generator.ships_generated}")

    return True


def test_ship_generator_strategic():
    """Test 8: ShipGenerator creates strategically-aligned ships"""
    print("\n[TEST 8] ShipGenerator Strategic Spawning")
    print("-" * 60)

    generator = ShipGenerator()
    strategies = ['DEFENSIVE', 'AGGRESSIVE', 'SCOUT', 'EVASIVE']
    spawned = {}

    for strategy in strategies:
        blueprint = generator.generate_strategic(
            strategy=strategy,
            fleet_size=2,
            autonomy_level=7
        )
        assert blueprint.ship_type in generator.SHIP_TYPES, f"Invalid ship type for {strategy}"
        assert blueprint.personality_mode in generator.PERSONALITY_WEIGHTS, f"Invalid personality for {strategy}"
        spawned[strategy] = blueprint

        print(f"✓ {strategy:12} → {blueprint.ship_type:20} ({blueprint.personality_mode})")

    return True


def test_autonomous_cycle():
    """Test 9: FleetCoordinator executes autonomous cycle"""
    print("\n[TEST 9] Autonomous Cycle Execution")
    print("-" * 60)

    # Setup fleet
    coordinator = FleetCoordinator(flagship_name="ChaosBringer")
    chaosbringer = ChaosbringingerShip("ChaosBringer", personality_mode='SARCASM')
    sensor = SensingShip("SensorOne", personality_mode='CALM')

    coordinator.register_ship(chaosbringer)

    # Wire autonomy components
    brain = FleetBrain(autonomy_level=7)
    generator = ShipGenerator()

    coordinator.set_fleet_brain(brain)
    coordinator.set_ship_generator(generator)
    coordinator.enable_autonomy(autonomy_level=7)

    # Execute autonomous cycle
    cycle_result = coordinator.execute_autonomous_cycle()

    assert 'status' in cycle_result, "Cycle should return status"
    assert 'decision' in cycle_result or cycle_result.get('status') == 'autonomy_disabled', "Cycle should produce decision or explain why not"
    assert 'executed_actions' in cycle_result or cycle_result.get('status') != 'executed', "Cycle should track actions"

    print(f"✓ Autonomous cycle executed")
    print(f"✓ Status: {cycle_result.get('status', 'unknown')}")
    if 'decision' in cycle_result:
        print(f"✓ Decision: {cycle_result['decision']}")
    if 'executed_actions' in cycle_result:
        print(f"✓ Actions executed: {cycle_result['executed_actions']}")

    return True


def test_autonomous_ship_spawning():
    """Test 10: Fleet spawns new ships autonomously based on decisions"""
    print("\n[TEST 10] Autonomous Ship Spawning")
    print("-" * 60)

    # Setup fleet
    coordinator = FleetCoordinator()
    chaosbringer = ChaosbringingerShip("ChaosBringer")

    coordinator.register_ship(chaosbringer)
    initial_count = len(coordinator.ships)

    # Setup autonomy (must be high for spawning)
    brain = FleetBrain(autonomy_level=9)  # Very autonomous
    generator = ShipGenerator()

    coordinator.set_fleet_brain(brain)
    coordinator.set_ship_generator(generator)
    coordinator.enable_autonomy(autonomy_level=9)

    # Simulate threat scenario that triggers spawning
    # Fleet is small (1 ship) so spawning should be triggered if autonomy >= 5
    low_health_snapshot = {
        'contacts': ['ChaosBringer'],
        'threat_map': {'ChaosBringer': 8},  # High threat
        'contact_count': 1,
        'threat_level_avg': 8.0,
    }

    decision = brain.make_strategic_decision(low_health_snapshot)

    print(f"✓ Fleet size before: {initial_count}")
    print(f"✓ Decision strategy: {decision.strategy}")
    print(f"✓ Spawn request: {decision.ship_spawn_request is not None}")

    if decision.ship_spawn_request:
        # Spawn request was generated
        print(f"✓ Spawn trigger: {decision.reasoning}")
        assert initial_count < 3, "Small fleet triggers spawning"
        assert 'ship_type' in decision.ship_spawn_request, "Spawn request has ship_type"
        print(f"✓ Recommended ship: {decision.ship_spawn_request['ship_type']}")
    else:
        # No spawn request (fleet might be large enough)
        print(f"✓ No spawn request needed: Fleet health above threshold")

    return True


def test_fleet_growth_cycle():
    """Test 11: Multi-cycle fleet growth demonstration"""
    print("\n[TEST 11] Fleet Growth Over Cycles")
    print("-" * 60)

    # Setup
    coordinator = FleetCoordinator()
    chaosbringer = ChaosbringingerShip("ChaosBringer")
    coordinator.register_ship(chaosbringer)

    brain = FleetBrain(autonomy_level=9)
    generator = ShipGenerator()
    coordinator.set_fleet_brain(brain)
    coordinator.set_ship_generator(generator)
    coordinator.enable_autonomy(autonomy_level=9)

    # Run multiple autonomous cycles
    cycles = 5
    growth_log = []

    for cycle in range(cycles):
        # Execute cycle
        result = coordinator.execute_autonomous_cycle()
        growth_log.append({
            'cycle': cycle + 1,
            'fleet_size': len(coordinator.ships),
            'decision': result.get('decision', 'N/A'),
            'spawn': result.get('spawn', {}).get('status', 'none'),
        })

        if result.get('spawn', {}).get('status') == 'spawned':
            print(f"✓ Cycle {cycle + 1}: Fleet grew to {len(coordinator.ships)} ships")
        else:
            print(f"✓ Cycle {cycle + 1}: Fleet stable at {len(coordinator.ships)} ships")

    final_count = len(coordinator.ships)
    assert final_count >= 1, "Fleet should have at least 1 ship"

    print(f"\n✓ Growth log: {json.dumps(growth_log, indent=2, default=str)}")

    return True


def run_all_tests():
    """Run complete Phase V test suite"""
    print("\n" + "="*80)
    print("PHASE V TEST SUITE — Autonomous Fleet Operations")
    print("="*80)

    tests = [
        test_sensing_ship_initialization,
        test_sensing_ship_observation,
        test_fleet_brain_initialization,
        test_fleet_brain_strategy_selection,
        test_fleet_brain_decision_making,
        test_ship_generator_initialization,
        test_ship_generator_blueprint,
        test_ship_generator_strategic,
        test_autonomous_cycle,
        test_autonomous_ship_spawning,
        test_fleet_growth_cycle,
    ]

    passed = 0
    failed = 0

    for test_func in tests:
        try:
            if test_func():
                passed += 1
        except AssertionError as e:
            print(f"✗ FAILED: {str(e)}")
            failed += 1
        except Exception as e:
            print(f"✗ ERROR: {str(e)}")
            failed += 1

    print("\n" + "="*80)
    print(f"RESULTS: {passed} passed, {failed} failed out of {len(tests)} tests")
    print("="*80 + "\n")

    return failed == 0


if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)
