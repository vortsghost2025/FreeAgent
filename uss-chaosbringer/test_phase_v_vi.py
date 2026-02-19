#!/usr/bin/env python3
"""
PHASE V+VI COMPREHENSIVE TEST SUITE
Tests for all Phase V ships and Phase VI metaphysical systems
"""

import sys
import io
import os

# UTF-8 support on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Add test directory to path for clean imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from signal_harvester_ship import SignalHarvesterShip
from probability_weaver_ship import ProbabilityWeaverShip
from paradox_runner_ship import ParadoxRunnerShip
from ontology_engine import OntologyEngine, ArchetypeCategory
from transcendence_layer import TranscendenceLayer
from chaosbringer_ship import ChaosbringingerShip
from sensing_ship import SensingShip
from fleet_coordinator import FleetCoordinator
from fleet_brain import FleetBrain
from ship_generator import ShipGenerator
from starship import ShipEvent


def test_signal_harvester_initialization():
    """Test 1: SignalHarvester initializes correctly"""
    print("\n[TEST 1] SignalHarvester Initialization")
    print("-" * 60)

    ship = SignalHarvesterShip("Signals-001", personality_mode='CALM')

    assert ship.ship_name == "Signals-001", "Ship name mismatch"
    assert ship.personality_mode == 'CALM', "Personality mode should be CALM"
    assert ship.state['signal_quality'] == 85, "Initial signal quality should be 85"
    assert ship.state['noise_floor'] == 10, "Initial noise floor should be 10"

    print(f"✓ SignalHarvester initialized: {ship}")
    print(f"✓ Signal quality: {ship.state['signal_quality']}%")
    print(f"✓ Noise floor: {ship.state['noise_floor']}")

    return True


def test_signal_harvester_operations():
    """Test 2: SignalHarvester processes signal events"""
    print("\n[TEST 2] SignalHarvester Signal Operations")
    print("-" * 60)

    ship = SignalHarvesterShip("Signals-002")

    # Test noise filtering
    event1 = ShipEvent(
        domain='NOISE_FILTER',
        type='FilterSignal',
        payload={'signal_quality': 50, 'noise_level': 30},
        source_ship='Signals-002'
    )

    result1 = ship.process_event(event1)
    assert result1.success, "Noise filter should succeed"
    print(f"✓ Noise filter: quality {50}% → {ship.state['signal_quality']}%")

    # Test signal lock
    event2 = ShipEvent(
        domain='SIGNAL_LOCK',
        type='LockSignal',
        payload={'frequency': 1000, 'lock_strength': 85},
        source_ship='Signals-002'
    )

    result2 = ship.process_event(event2)
    assert result2.success, "Signal lock should succeed"
    assert ship.state['locked_signals'] == 1, "Should have 1 locked signal"
    print(f"✓ Signal locked: frequency=1000Hz, locked_signals={ship.state['locked_signals']}")

    return True


def test_probability_weaver_initialization():
    """Test 3: ProbabilityWeaver initializes correctly"""
    print("\n[TEST 3] ProbabilityWeaver Initialization")
    print("-" * 60)

    ship = ProbabilityWeaverShip("Quantum-001")

    assert ship.ship_name == "Quantum-001", "Ship name mismatch"
    assert ship.state['quantum_coherence'] == 1.0, "Initial coherence should be 1.0"
    assert ship.state['superposition_count'] == 1, "Initial superposition state should be 1"

    print(f"✓ ProbabilityWeaver initialized: {ship}")
    print(f"✓ Quantum coherence: {ship.state['quantum_coherence']:.1%}")
    print(f"✓ Superposition states: {ship.state['superposition_count']}")

    return True


def test_probability_weaver_operations():
    """Test 4: ProbabilityWeaver quantum operations"""
    print("\n[TEST 4] ProbabilityWeaver Quantum Operations")
    print("-" * 60)

    ship = ProbabilityWeaverShip("Quantum-002")

    # Test superposition
    event1 = ShipEvent(
        domain='SUPERPOSITION',
        type='InitSuperposition',
        payload={'outcome_count': 4, 'coherence': 0.95},
        source_ship='Quantum-002'
    )

    result1 = ship.process_event(event1)
    assert result1.success, "Superposition creation should succeed"
    assert ship.state['superposition_active'], "Superposition should be active"
    assert ship.state['superposition_count'] == 4, "Should have 4 superposition states"
    print(f"✓ Superposition created: {ship.state['superposition_count']} states")

    # Test collapse
    event2 = ShipEvent(
        domain='COLLAPSE_MEASUREMENT',
        type='CollapseMeasure',
        payload={},
        source_ship='Quantum-002'
    )

    result2 = ship.process_event(event2)
    assert result2.success, "Wave collapse should succeed"
    assert not ship.state['superposition_active'], "Superposition should be collapsed"
    assert 0 <= ship.state['collapsed_probability'] <= 1, "Probability should be valid"
    print(f"✓ Wave function collapsed: outcome={ship.state['dominant_outcome']}")

    return True


def test_paradox_runner_initialization():
    """Test 5: ParadoxRunner initializes correctly"""
    print("\n[TEST 5] ParadoxRunner Initialization")
    print("-" * 60)

    ship = ParadoxRunnerShip("Temporal-001")

    assert ship.ship_name == "Temporal-001", "Ship name mismatch"
    assert ship.state['active_timelines'] == 1, "Initial timeline should be 1"
    assert ship.state['timeline_health'] == 1.0, "Timeline health should be perfect"

    print(f"✓ ParadoxRunner initialized: {ship}")
    print(f"✓ Active timelines: {ship.state['active_timelines']}")
    print(f"✓ Timeline health: {ship.state['timeline_health']:.1%}")

    return True


def test_paradox_runner_operations():
    """Test 6: ParadoxRunner temporal operations"""
    print("\n[TEST 6] ParadoxRunner Temporal Operations")
    print("-" * 60)

    ship = ParadoxRunnerShip("Temporal-002")

    # Test temporal loop detection
    event1 = ShipEvent(
        domain='TEMPORAL_LOOP',
        type='LoopDetected',
        payload={'loop_length_seconds': 60, 'iterations': 3},
        source_ship='Temporal-002'
    )

    result1 = ship.process_event(event1)
    assert result1.success, "Loop detection should succeed"
    assert ship.state['loop_detected'], "Loop should be detected"
    assert ship.state['loops_detected_total'] == 1, "Should have detected 1 loop"
    print(f"✓ Temporal loop detected: {ship.state['loop_iterations']} iterations")

    # Test causality enforcement
    event2 = ShipEvent(
        domain='CAUSAL_BREAK',
        type='CausalityViolation',
        payload={'type': 'GRANDFATHER_PARADOX', 'severity': 7},
        source_ship='Temporal-002'
    )

    result2 = ship.process_event(event2)
    assert result2.success, "Causality enforcement should succeed"
    assert ship.state['causality_violations'] == 1, "Should have recorded violation"
    print(f"✓ Causality enforced: violations={ship.state['causality_violations']}")

    return True


def test_ontology_engine_initialization():
    """Test 7: OntologyEngine initializes with base archetypes"""
    print("\n[TEST 7] OntologyEngine Initialization")
    print("-" * 60)

    engine = OntologyEngine()

    assert len(engine.archetypes) > 0, "Should have base archetypes"
    assert 'SENSORY' in engine.archetypes, "Should have SENSORY archetype"
    assert 'ANALYTICAL' in engine.archetypes, "Should have ANALYTICAL archetype"
    assert len(engine.ontological_rules) > 0, "Should have ontological rules"

    report = engine.get_ontology_report()
    print(f"✓ OntologyEngine initialized")
    print(f"✓ Total archetypes: {report['total_archetypes']}")
    print(f"✓ Ontological rules: {report['ontological_rules']}")

    return True


def test_ontology_archetype_emergence():
    """Test 8: OntologyEngine generates new archetypes"""
    print("\n[TEST 8] OntologyEngine Archetype Emergence")
    print("-" * 60)

    engine = OntologyEngine()
    initial_count = len(engine.archetypes)

    # Generate new archetype from environmental pressure
    new_archetype = engine.generate_new_archetype('temporal_pressure')

    assert new_archetype is not None, "Should generate new archetype"
    assert new_archetype.id.startswith('EMERGENT_'), "Should have EMERGENT prefix"
    assert len(engine.archetypes) > initial_count, "Archetype count should increase"
    assert len(engine.emergence_events) == 1, "Should record emergence event"

    print(f"✓ New archetype emerged: {new_archetype.name}")
    print(f"✓ Archetype count: {initial_count} → {len(engine.archetypes)}")

    return True


def test_ontology_universe_interpretation():
    """Test 9: OntologyEngine interprets universe state"""
    print("\n[TEST 9] OntologyEngine Universe Interpretation")
    print("-" * 60)

    engine = OntologyEngine()

    # Create mock fleet state
    fleet_state = {
        'ships': [
            {'archetype': 'SENSORY', 'name': 'Sensor1'},
            {'archetype': 'ANALYTICAL', 'name': 'Analyst1'},
        ],
        'activities': [
            {'id': 'act1', 'type': 'coordination'},
            {'id': 'act2', 'type': 'problem_solving'},
        ],
        'events': [],
        'coordination_frequency': 0.8,
        'specialization_index': 0.7,
        'adaptation_rate': 0.6,
    }

    interpretation = engine.interpret_universe_state(fleet_state)

    assert 'current_balance' in interpretation, "Should have balance assessment"
    assert 'archetypal_diversity' in interpretation, "Should have diversity assessment"
    assert interpretation['archetypal_diversity'] > 0, "Diversity should be > 0"

    print(f"✓ Universe interpreted")
    print(f"✓ Balance: {interpretation['current_balance']}")
    print(f"✓ Diversity: {interpretation['archetypal_diversity']:.1%}")

    return True


def test_transcendence_layer_initialization():
    """Test 10: TranscendenceLayer initializes correctly"""
    print("\n[TEST 10] TranscendenceLayer Initialization")
    print("-" * 60)

    transcendence = TranscendenceLayer()

    assert transcendence.ontology_engine is not None, "Should have OntologyEngine"
    assert transcendence.universal_interpreter is not None, "Should have UniversalInterpreter"
    assert transcendence.mythos_generator is not None, "Should have MythosGenerator"

    print(f"✓ TranscendenceLayer initialized: {transcendence}")

    return True


def test_transcendence_governance():
    """Test 11: TranscendenceLayer applies governance"""
    print("\n[TEST 11] TranscendenceLayer Metaphysical Governance")
    print("-" * 60)

    transcendence = TranscendenceLayer()

    # Create mock universe state
    universe_state = {
        'ships': [{'archetype': 'SENSORY'}] * 3,
        'balance': 'NORMAL',
        'diversity': 0.3,
        'patterns': ['HIGH_COORDINATION'],
        'activities': [],
        'events': [],
        'environmental_pressures': [],
    }

    governance_result = transcendence.govern_ship_hood(universe_state)

    assert governance_result['status'] == 'governed', "Governance should succeed"
    assert 'generated_mythos' in governance_result, "Should generate mythos"
    assert 'universe_interpretation' in governance_result, "Should have interpretation"

    print(f"✓ Metaphysical governance applied")
    print(f"✓ Mythos generated: {len(governance_result.get('generated_mythos', ''))} characters")

    return True


def test_full_integration_phase_v_vi():
    """Test 12: Full Phase V + VI integration"""
    print("\n[TEST 12] Full Phase V+VI Integration")
    print("-" * 60)

    # Setup complete fleet
    coordinator = FleetCoordinator()

    # Add Phase V ships
    chaosbringer = ChaosbringingerShip("ChaosBringer")
    signal_harvester = SignalHarvesterShip("Harvester-001")
    probability_weaver = ProbabilityWeaverShip("Weaver-001")
    paradox_runner = ParadoxRunnerShip("Runner-001")

    coordinator.register_ship(chaosbringer)
    coordinator.register_ship(signal_harvester)
    coordinator.register_ship(probability_weaver)
    coordinator.register_ship(paradox_runner)

    # Enable autonomy (Phase V)
    brain = FleetBrain(autonomy_level=7)
    generator = ShipGenerator()
    coordinator.set_fleet_brain(brain)
    coordinator.set_ship_generator(generator)
    coordinator.enable_autonomy(autonomy_level=7)

    # Enable metaphysics (Phase VI)
    transcendence = TranscendenceLayer()
    coordinator.set_transcendence_layer(transcendence)

    # Execute autonomous cycle
    autonomous_result = coordinator.execute_autonomous_cycle()
    assert autonomous_result['status'] == 'executed', "Autonomous cycle should execute"

    # Apply metaphysical governance
    governance_result = coordinator.apply_metaphysical_governance()
    assert governance_result['status'] == 'governed', "Governance should apply"

    print(f"✓ Full integration successful")
    print(f"✓ Fleet size: {len(coordinator.ships)} ships")
    print(f"✓ Autonomy enabled: {coordinator.autonomy_enabled}")
    print(f"✓ Metaphysics enabled: {coordinator.transcendence_layer is not None}")
    print(f"✓ Autonomous decision: {autonomous_result['decision']}")

    return True


def run_all_tests():
    """Run complete Phase V+VI test suite"""
    print("\n" + "="*80)
    print("PHASE V+VI COMPREHENSIVE TEST SUITE")
    print("="*80)

    tests = [
        test_signal_harvester_initialization,
        test_signal_harvester_operations,
        test_probability_weaver_initialization,
        test_probability_weaver_operations,
        test_paradox_runner_initialization,
        test_paradox_runner_operations,
        test_ontology_engine_initialization,
        test_ontology_archetype_emergence,
        test_ontology_universe_interpretation,
        test_transcendence_layer_initialization,
        test_transcendence_governance,
        test_full_integration_phase_v_vi,
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
            import traceback
            traceback.print_exc()
            failed += 1

    print("\n" + "="*80)
    print(f"RESULTS: {passed} passed, {failed} failed out of {len(tests)} tests")
    print("="*80 + "\n")

    return failed == 0


if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)
