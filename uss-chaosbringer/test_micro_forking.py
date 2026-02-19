#!/usr/bin/env python3
"""
MICRO-FORKING EVOLUTION TEST SUITE — Phase VII.6
Testing all 7 expansion systems and integration
"""

import sys
import os
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from anomaly_engine.micro_forking import (
    MicroForkingEngine,
    DashboardMockDataGenerator,
    PersonalitySeeds,
    CaptainsLogGenerator,
    CrossForkAnalytics,
    PersonalityDrivenAnomalyResponse,
    NarrativeContinuityAcrossForks,
    PersonalityType,
    PerturbationStrategy,
)


# ===== MICRO-FORKING ENGINE TESTS =====

def test_micro_fork_creation():
    """Test 1: Create a micro-fork"""
    print("\n[TEST 1] Micro-Fork Creation")
    print("-" * 60)

    engine = MicroForkingEngine()
    base_state = {"drift": 0.2, "anomalies": 5, "health": 0.85}

    result = engine.create_micro_fork(
        base_state=base_state,
        strategy=PerturbationStrategy.RANDOM_WALK,
        magnitude=0.1,
        duration_steps=10,
    )

    assert result.fork_id is not None
    assert result.duration_steps == 10
    assert len(result.drift_trajectory) == 10

    print("[PASS] Micro-fork created successfully")
    print(f"[PASS] Fork ID: {result.fork_id}")
    print(f"[PASS] Terminal drift: {result.drift_trajectory[-1]:.3f}")
    print(f"[PASS] Anomalies encountered: {result.anomaly_count}")
    return True


def test_fork_perturbation_strategies():
    """Test 2: All perturbation strategies"""
    print("\n[TEST 2] Perturbation Strategies")
    print("-" * 60)

    engine = MicroForkingEngine()
    base_state = {"drift": 0.5, "threat": 3, "energy": 100}
    strategies = [
        PerturbationStrategy.RANDOM_WALK,
        PerturbationStrategy.GAUSSIAN_NOISE,
        PerturbationStrategy.THRESHOLD_SHIFT,
        PerturbationStrategy.BEHAVIORAL_DRIFT,
        PerturbationStrategy.ANOMALY_AMPLIFICATION,
    ]

    for strategy in strategies:
        result = engine.create_micro_fork(
            base_state=base_state,
            strategy=strategy,
            magnitude=0.15,
            duration_steps=5,
        )
        assert result is not None
        print(f"[PASS] Strategy {strategy.value}: Fork created")

    assert len(engine.forks) == 5
    print(f"[PASS] All 5 perturbation strategies working")
    return True


def test_divergence_analysis():
    """Test 3: Divergence analysis"""
    print("\n[TEST 3] Divergence Analysis")
    print("-" * 60)

    engine = MicroForkingEngine()
    base_state = {"drift": 0.3, "anomalies": 2}

    # Create multiple forks
    fork_ids = []
    for i in range(3):
        result = engine.create_micro_fork(base_state, magnitude=0.1 + (i * 0.05))
        fork_ids.append(result.fork_id)

    analysis = engine.analyze_divergence(fork_ids)

    assert analysis.branch_count == 3
    assert len(analysis.fork_pairs) > 0
    assert analysis.most_stable_fork is not None

    print("[PASS] Divergence analysis completed")
    print(f"[PASS] Most stable fork: {analysis.most_stable_fork}")
    print(f"[PASS] Fork pairs analyzed: {len(analysis.fork_pairs)}")
    return True


# ===== DASHBOARD MOCK DATA GENERATOR TESTS =====

def test_dashboard_normal_pattern():
    """Test 4: Dashboard normal operation pattern"""
    print("\n[TEST 4] Dashboard Mock Data - Normal Pattern")
    print("-" * 60)

    generator = DashboardMockDataGenerator()
    snapshots = generator.generate_realistic_data(time_range_hours=6, pattern="normal_operation")

    assert len(snapshots) > 0
    assert all(0 <= s.anomaly_density <= 1.0 for s in snapshots)
    assert all(s.universe_mood == "CALM" for s in snapshots)

    print("[PASS] Normal operation pattern generated")
    print(f"[PASS] Snapshots: {len(snapshots)}")
    print(f"[PASS] Avg anomaly density: {sum(s.anomaly_density for s in snapshots) / len(snapshots):.3f}")
    return True


def test_dashboard_anomaly_pattern():
    """Test 5: Dashboard anomaly spike pattern"""
    print("\n[TEST 5] Dashboard Mock Data - Anomaly Spikes")
    print("-" * 60)

    generator = DashboardMockDataGenerator()
    snapshots = generator.generate_realistic_data(time_range_hours=4, pattern="anomaly_spikes")

    assert len(snapshots) > 0
    max_anomaly = max(s.anomaly_density for s in snapshots)
    assert max_anomaly > 0.3  # Should have spike

    print("[PASS] Anomaly spike pattern generated")
    print(f"[PASS] Max anomaly density: {max_anomaly:.3f}")
    print(f"[PASS] Different mood states observed: {set(s.universe_mood for s in snapshots)}")
    return True


def test_dashboard_degradation_pattern():
    """Test 6: Dashboard degradation pattern"""
    print("\n[TEST 6] Dashboard Mock Data - Degradation")
    print("-" * 60)

    generator = DashboardMockDataGenerator()
    snapshots = generator.generate_realistic_data(time_range_hours=8, pattern="gradual_degradation")

    assert len(snapshots) > 0
    # Health should generally decrease over time
    health_trend = [s.ship_health for s in snapshots]

    print("[PASS] Degradation pattern generated")
    print(f"[PASS] Health at start: {health_trend[0]:.3f}")
    print(f"[PASS] Health at end: {health_trend[-1]:.3f}")
    print(f"[PASS] Total snapshots: {len(snapshots)}")
    return True


# ===== PERSONALITY SEEDS TESTS =====

def test_personality_analytical():
    """Test 7: Analytical personality seed"""
    print("\n[TEST 7] Personality Seeds - Analytical")
    print("-" * 60)

    seeds = PersonalitySeeds()
    personality = seeds.generate_personality(
        "BrainShip",
        PersonalityType.ANALYTICAL
    )

    assert personality.ship_name == "BrainShip"
    assert personality.base_type == PersonalityType.ANALYTICAL
    assert personality.traits["logic"] == 0.95
    assert personality.risk_tolerance < 0.5

    print("[PASS] Analytical personality created")
    print(f"[PASS] Traits: {list(personality.traits.keys())}")
    print(f"[PASS] Risk tolerance: {personality.risk_tolerance:.2f}")
    return True


def test_personality_adaptation():
    """Test 8: Personality adaptation"""
    print("\n[TEST 8] Personality Adaptation")
    print("-" * 60)

    seeds = PersonalitySeeds()
    # Use ANALYTICAL which has lower initial risk (0.4)
    personality = seeds.generate_personality(
        "AdaptiveShip",
        PersonalityType.ANALYTICAL
    )

    original_risk = personality.risk_tolerance
    original_contradiction_weight = personality.anomaly_weights["contradiction"]

    # Simulate repeated encounters with contradiction anomalies
    experience = {"success_rate": 0.9, "anomalies_by_type": {"contradiction": 5}}
    adapted = seeds.adapt_personality("AdaptiveShip", experience)

    # Risk tolerance increases with success
    assert adapted.risk_tolerance > original_risk
    # But anomaly weight reduces due to repeated exposure
    assert adapted.anomaly_weights["contradiction"] < original_contradiction_weight

    print("[PASS] Personality adapted successfully")
    print(f"[PASS] Risk tolerance: {original_risk:.2f} -> {adapted.risk_tolerance:.2f}")
    print(f"[PASS] Contradiction weight: {original_contradiction_weight:.2f} -> {adapted.anomaly_weights['contradiction']:.2f}")
    return True


def test_all_personality_types():
    """Test 9: All personality types"""
    print("\n[TEST 9] All Personality Types")
    print("-" * 60)

    seeds = PersonalitySeeds()
    types = list(PersonalityType)

    personalities = {}
    for ptype in types:
        personality = seeds.generate_personality(f"Ship_{ptype.value}", ptype)
        personalities[ptype.value] = personality

    assert len(personalities) == 5
    print(f"[PASS] All {len(personalities)} personality types created")
    for ptype, personality in personalities.items():
        print(f"[PASS]  - {ptype}: {personality.traits}")
    return True


# ===== CAPTAIN'S LOG GENERATOR TESTS =====

def test_captain_log_routine():
    """Test 10: Captain's log - routine day"""
    print("\n[TEST 10] Captain's Log - Routine Day")
    print("-" * 60)

    log_gen = CaptainsLogGenerator()
    today = datetime.now()

    entry = log_gen.generate_daily_log(
        date=today,
        mood="CALM",
        events_summary=["System nominal", "No incidents"],
        anomaly_count=1,
        continuity_violations=0,
    )

    assert entry.date_str is not None
    assert entry.anomalies_encountered == 1
    assert entry.narrative_style == "routine_day"

    print("[PASS] Routine log entry created")
    print(f"[PASS] Date: {entry.date_str}")
    print(f"[PASS] Notes: {entry.personal_notes[:50]}...")
    return True


def test_captain_log_incident():
    """Test 11: Captain's log - critical incident"""
    print("\n[TEST 11] Captain's Log - Critical Incident")
    print("-" * 60)

    log_gen = CaptainsLogGenerator()
    today = datetime.now()

    entry = log_gen.generate_daily_log(
        date=today,
        mood="CHAOTIC",
        events_summary=["Multiple anomalies", "System failures"],
        anomaly_count=10,
        continuity_violations=3,
    )

    assert entry.anomalies_encountered == 10
    assert entry.narrative_style == "critical_incident"

    print("[PASS] Critical incident log created")
    print(f"[PASS] Style: {entry.narrative_style}")
    print(f"[PASS] Crew status: {entry.crew_status}")
    return True


def test_incident_report():
    """Test 12: Incident report generation"""
    print("\n[TEST 12] Incident Report Generation")
    print("-" * 60)

    log_gen = CaptainsLogGenerator()

    report = log_gen.generate_incident_report(
        anomaly_type="state_delta",
        severity=0.8,
        affected_systems=["propulsion", "navigation"],
    )

    assert report.incident_id is not None
    assert report.anomaly_type == "state_delta"
    assert len(report.affected_systems) == 2
    assert report.impact_assessment["recovery_time_hours"] == 8

    print("[PASS] Incident report created")
    print(f"[PASS] Incident ID: {report.incident_id}")
    print(f"[PASS] Severity: {report.severity:.1f}")
    print(f"[PASS] Resolution: {report.resolution}")
    return True


# ===== CROSS-FORK ANALYTICS TESTS =====

def test_cross_fork_comparison():
    """Test 13: Cross-fork outcome comparison"""
    print("\n[TEST 13] Cross-Fork Analytics - Comparison")
    print("-" * 60)

    engine = MicroForkingEngine()
    base_state = {"drift": 0.3, "anomalies": 2}

    fork_ids = []
    for i in range(4):
        result = engine.create_micro_fork(base_state, magnitude=0.1)
        fork_ids.append(result.fork_id)

    analytics = CrossForkAnalytics(engine)
    comparison = analytics.compare_fork_outcomes(fork_ids)

    assert comparison["fork_count"] == 4
    assert "avg_anomalies" in comparison
    assert "most_stable" in comparison

    print("[PASS] Fork comparison completed")
    print(f"[PASS] Avg anomalies across forks: {comparison['avg_anomalies']:.1f}")
    print(f"[PASS] Most stable fork: {comparison['most_stable']}")
    return True


def test_optimal_paths():
    """Test 14: Identify optimal fork paths"""
    print("\n[TEST 14] Cross-Fork Analytics - Optimal Paths")
    print("-" * 60)

    engine = MicroForkingEngine()
    base_state = {"drift": 0.2}

    fork_ids = []
    for i in range(5):
        result = engine.create_micro_fork(base_state, magnitude=0.05 + (i * 0.02))
        fork_ids.append(result.fork_id)

    analytics = CrossForkAnalytics(engine)
    optimal = analytics.identify_optimal_paths(fork_ids)

    assert len(optimal) > 0
    assert optimal[0]["rank"] == 1

    print("[PASS] Optimal paths identified")
    for path in optimal[:3]:
        print(f"[PASS]  Rank {path['rank']}: {path['recommendation']} - Coherence: {path['coherence']:.1%}")
    return True


def test_convergence_mapping():
    """Test 15: Fork convergence mapping"""
    print("\n[TEST 15] Cross-Fork Analytics - Convergence Mapping")
    print("-" * 60)

    engine = MicroForkingEngine()
    base_state = {"drift": 0.25}

    fork_ids = []
    for i in range(4):
        result = engine.create_micro_fork(base_state)
        fork_ids.append(result.fork_id)

    analytics = CrossForkAnalytics(engine)
    convergence_map = analytics.fork_convergence_mapping(fork_ids)

    assert convergence_map["total_forks"] == 4
    assert convergence_map["converged"] + convergence_map["diverging"] + convergence_map["stable"] == 4

    print("[PASS] Convergence map created")
    print(f"[PASS] Total forks: {convergence_map['total_forks']}")
    print(f"[PASS] Converged: {convergence_map['converged']}, Diverging: {convergence_map['diverging']}, Stable: {convergence_map['stable']}")
    return True


# ===== PERSONALITY-DRIVEN RESPONSE TESTS =====

def test_personality_response_analytical():
    """Test 16: Personality-driven anomaly response"""
    print("\n[TEST 16] Personality-Driven Response - Analytical")
    print("-" * 60)

    seeds = PersonalitySeeds()
    seeds.generate_personality("LogicShip", PersonalityType.ANALYTICAL)

    responses = PersonalityDrivenAnomalyResponse(seeds)
    response = responses.get_response(
        ship_name="LogicShip",
        anomaly_type="contradiction",
        severity=0.9,
    )

    assert response["ship_name"] == "LogicShip"
    assert response["personality_type"] == "analytical"
    assert response["recommended_action"] in ["analyze_first", "verify_twice", "act_deliberately", "document_all"]

    print("[PASS] PersonalityDriven response generated")
    print(f"[PASS] Personality: {response['personality_type']}")
    print(f"[PASS] Recommended action: {response['recommended_action']}")
    print(f"[PASS] Urgency: {response['urgency']}")
    return True


def test_personality_response_guardian():
    """Test 17: Guardian personality response"""
    print("\n[TEST 17] Personality-Driven Response - Guardian")
    print("-" * 60)

    seeds = PersonalitySeeds()
    seeds.generate_personality("GuardianShip", PersonalityType.GUARDIAN)

    responses = PersonalityDrivenAnomalyResponse(seeds)
    response = responses.get_response(
        ship_name="GuardianShip",
        anomaly_type="state_delta",
        severity=0.7,
    )

    assert response["personality_type"] == "guardian"
    # Guardian should have higher weighted severity for state_delta
    assert response["weighted_severity"] > 0.7

    print("[PASS] Guardian response generated")
    print(f"[PASS] Weighted severity: {response['weighted_severity']:.2f}")
    print(f"[PASS] Action: {response['recommended_action']}")
    return True


# ===== NARRATIVE CONTINUITY TESTS =====

def test_narrative_continuity():
    """Test 18: Narrative continuity across forks"""
    print("\n[TEST 18] Narrative Continuity Across Forks")
    print("-" * 60)

    engine = MicroForkingEngine()
    log_gen = CaptainsLogGenerator()

    base_state = {"drift": 0.2}
    fork_ids = []
    for i in range(3):
        result = engine.create_micro_fork(base_state, magnitude=0.08)
        fork_ids.append(result.fork_id)

    narrator = NarrativeContinuityAcrossForks(engine, log_gen)
    narrative = narrator.generate_consistent_narrative(fork_ids)

    assert "narrative" in narrative
    assert narrative["coherence"] > 0
    assert narrative["fork_count"] == 3

    print("[PASS] Narrative continuity generated")
    print(f"[PASS] Coherence: {narrative['coherence']:.1%}")
    print(f"[PASS] Common themes: {len(narrative['common_themes'])} identified")
    print(f"[PASS] Narrative preview: {narrative['narrative'][:100]}...")
    return True


# ===== TEST RUNNER =====

def run_all_tests():
    """Run all micro-forking expansion tests"""
    print("\n" + "=" * 80)
    print("MICRO-FORKING EVOLUTION TEST SUITE - Phase VII.6")
    print("Testing all 7 expansion systems")
    print("=" * 80)

    tests = [
        test_micro_fork_creation,
        test_fork_perturbation_strategies,
        test_divergence_analysis,
        test_dashboard_normal_pattern,
        test_dashboard_anomaly_pattern,
        test_dashboard_degradation_pattern,
        test_personality_analytical,
        test_personality_adaptation,
        test_all_personality_types,
        test_captain_log_routine,
        test_captain_log_incident,
        test_incident_report,
        test_cross_fork_comparison,
        test_optimal_paths,
        test_convergence_mapping,
        test_personality_response_analytical,
        test_personality_response_guardian,
        test_narrative_continuity,
    ]

    passed = 0
    failed = 0

    for test_func in tests:
        try:
            if test_func():
                passed += 1
            else:
                failed += 1
                print(f"[FAIL] Test returned False")
        except Exception as e:
            failed += 1
            print(f"[FAIL] ERROR: {str(e)}")

    print("\n" + "=" * 80)
    print(f"RESULTS: {passed} passed, {failed} failed out of {len(tests)} tests")
    print("=" * 80)

    return failed == 0


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
