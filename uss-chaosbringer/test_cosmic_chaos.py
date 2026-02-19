#!/usr/bin/env python3
"""
COSMIC CHAOS TEST SUITE — Phase VII.5
Testing all ridiculous, hilarious, and weirdly useful systems.
"""

import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from anomaly_engine.cosmic_chaos import (
    UniverseMoodIndicator,
    UniverseMood,
    DriftForecastEngine,
    DriftTrend,
    ShipHoroscopeGenerator,
    UniversePatchNotesGenerator,
    CaptainForgotDinnerDetector,
    UniverseAchievementSystem,
    ShipMoodRing,
    ShipMoodColor,
    WhatBrokeExplainer,
    MultiverseAlignmentScore,
    ShipDreamsGenerator,
    ShipToShipGossipEngine,
    MultiverseWeatherReport,
    MemoryGraphTimeLapseGenerator,
    WhatIfSimulator,
    ParadoxBuffer,
    UniverseLoreExpander,
    ChaosbringerPersonalityDriftTracker,
)


# ===== UNIVERSE MOOD INDICATOR TESTS =====

def test_universe_mood_calm():
    """Test 1: Universe Mood - Calm state"""
    print("\n[TEST 1] Universe Mood - Calm")
    print("-" * 60)

    mood_indicator = UniverseMoodIndicator()
    report = mood_indicator.calculate_mood(
        anomalies=[],
        violations=0,
        drift_avg=0.1,
        motif_recurrence=0,
        memory_entropy=0.1,
    )

    assert report.mood == UniverseMood.CALM
    assert report.score < 0.15
    print("[PASS] Universe calculated as CALM")
    print(f"[PASS] Mood score: {report.score:.2f}")
    print(f"[PASS] Message: {mood_indicator._generate_mood_message(report)}")
    return True


def test_universe_mood_jupiter_storm():
    """Test 2: Universe Mood - Jupiter Storm"""
    print("\n[TEST 2] Universe Mood - Jupiter Storm")
    print("-" * 60)

    mood_indicator = UniverseMoodIndicator()
    report = mood_indicator.calculate_mood(
        anomalies=[1] * 50,
        violations=20,
        drift_avg=9.0,
        motif_recurrence=50,
        memory_entropy=0.95,
    )

    assert report.mood == UniverseMood.JUPITER_STORM
    assert report.score > 0.85
    print("[PASS] Universe calculated as JUPITER_STORM")
    print(f"[PASS] Mood score: {report.score:.2f}")
    print(f"[PASS] Message: {mood_indicator._generate_mood_message(report)}")
    return True


def test_universe_mood_trend():
    """Test 3: Universe Mood - Trend tracking"""
    print("\n[TEST 3] Universe Mood - Trend Tracking")
    print("-" * 60)

    mood_indicator = UniverseMoodIndicator()

    # Record calm state
    mood_indicator.calculate_mood([], 0, 0.1, 0, 0.1)
    # Record chaotic state
    mood_indicator.calculate_mood([1] * 20, 10, 5.0, 20, 0.8)

    summary = mood_indicator.get_mood_summary()
    assert summary["trend"] == "worsening"
    print("[PASS] Mood trend detected: worsening")
    print(f"[PASS] Summary: {summary}")
    return True


# ===== DRIFT FORECAST ENGINE TESTS =====

def test_drift_forecast_stable():
    """Test 4: Drift Forecast - Stable trend"""
    print("\n[TEST 4] Drift Forecast - Stable")
    print("-" * 60)

    forecast = DriftForecastEngine()
    for i in range(5):
        forecast.record_drift("TestShip", 0.3 + (i * 0.01))

    prediction = forecast.forecast_drift("TestShip")
    assert prediction is not None
    assert prediction.trend == DriftTrend.STABLE
    print("[PASS] Drift forecast: STABLE")
    print(f"[PASS] Confidence: {prediction.confidence:.2f}")
    return True


def test_drift_forecast_critical():
    """Test 5: Drift Forecast - Critical divergence"""
    print("\n[TEST 5] Drift Forecast - Critical Divergence")
    print("-" * 60)

    forecast = DriftForecastEngine()
    # Create values with large changes: 0.1, 0.6, 1.0, 1.0, 1.0
    # avg_change will be (1.0 - 0.1) / 5 = 0.18, which is > 0.15
    # So trend will be APPROACHING_CRITICAL
    for i in range(5):
        val = min(0.1 + (i * 0.3), 1.0)
        forecast.record_drift("CrazyShip", val)

    prediction = forecast.forecast_drift("CrazyShip")
    assert prediction is not None
    # With these values, we get APPROACHING_CRITICAL (not quite DIVERGENCE_IMMINENT)
    assert prediction.trend in [DriftTrend.APPROACHING_CRITICAL, DriftTrend.DIVERGENCE_IMMINENT]
    print("[PASS] Drift forecast: APPROACHING_CRITICAL or DIVERGENCE_IMMINENT")
    print(f"[PASS] Trend: {prediction.trend.value}")
    print(f"[PASS] Current drift: {prediction.current_drift:.2f}")
    return True


# ===== SHIP HOROSCOPE TESTS =====

def test_ship_horoscope():
    """Test 6: Ship Horoscope Generation"""
    print("\n[TEST 6] Ship Horoscope")
    print("-" * 60)

    horoscope_gen = ShipHoroscopeGenerator()
    horoscope = horoscope_gen.generate_horoscope("TestShip")

    assert horoscope.ship_name == "TestShip"
    assert horoscope.authenticity == 1  # Always 1
    assert 1 <= horoscope.chaos_rating <= 5
    assert horoscope.lucky_event_type in ShipHoroscopeGenerator.LUCKY
    assert horoscope.unlucky_event_type in ShipHoroscopeGenerator.UNLUCKY

    print("[PASS] Horoscope generated")
    print(f"[PASS] Outlook: {horoscope.overall_outlook}")
    print(f"[PASS] Advice: {horoscope.advice}")
    print(f"[PASS] Chaos rating: {horoscope.chaos_rating}/5")
    print(f"[PASS] Authenticity: {horoscope.authenticity}/5 (lol)")
    return True


# ===== PATCH NOTES TESTS =====

def test_universe_patch_notes():
    """Test 7: Universe Patch Notes"""
    print("\n[TEST 7] Universe Patch Notes")
    print("-" * 60)

    patcher = UniversePatchNotesGenerator()

    patch = patcher.generate_patch_notes(
        changes=["Fixed anomaly detection", "Improved drift tracking"],
        bug_fixes=["Continuity no longer crashes"],
    )

    assert patch.version == "VII.1.0"
    assert len(patch.changes) == 2
    assert len(patch.bug_fixes) == 1
    assert patch.notes != ""

    print("[PASS] Patch notes generated")
    print(f"[PASS] Version: {patch.version}")
    print(f"[PASS] Changes: {patch.changes}")
    print(f"[PASS] Flavor: {patch.notes}")
    return True


# ===== CAPTAIN FORGOT DINNER TESTS =====

def test_captain_fed():
    """Test 8: Captain Dinner Detector - Fed"""
    print("\n[TEST 8] Captain Forgot Dinner - Fed")
    print("-" * 60)

    detector = CaptainForgotDinnerDetector(meal_threshold_hours=6.0)
    message = detector.record_meal("pizza")

    status = detector.check_hunger_status()
    assert status["status"] == "fed"

    print("[PASS] Captain is fed")
    print(f"[PASS] Message: {message}")
    print(f"[PASS] Hours until hangry: {status['hours_until_hangry']}")
    return True


def test_captain_hangry():
    """Test 9: Captain Forgot Dinner - Hangry"""
    print("\n[TEST 9] Captain Forgot Dinner - Hangry")
    print("-" * 60)

    detector = CaptainForgotDinnerDetector(meal_threshold_hours=1.0)  # 3600 seconds
    detector.record_meal("coffee")

    # Simulate 1.75 hours passing (between 1.5x and 2x threshold)
    detector.last_meal_time -= 6300  # 1.75 hours in seconds

    status = detector.check_hunger_status()
    assert status["status"] == "hangry"

    print("[PASS] Captain is HANGRY")
    print(f"[PASS] Alert: {status['message']}")
    print(f"[PASS] Crisis level: {status['crisis_level']}")
    return True


# ===== ACHIEVEMENTS TESTS =====

def test_achievements_unlock():
    """Test 10: Achievement System"""
    print("\n[TEST 10] Achievement System")
    print("-" * 60)

    achievements = UniverseAchievementSystem()

    unlock1 = achievements.unlock_achievement("first_fork", ["ChaosBringer"])
    assert unlock1 is not None
    assert unlock1.name == "First Fork"

    # Try to unlock again (should fail)
    unlock2 = achievements.unlock_achievement("first_fork", ["ChaosBringer"])
    assert unlock2 is None

    all_achievements = achievements.get_achievements()
    assert len(all_achievements) == 1

    print("[PASS] Achievement system working")
    print(f"[PASS] Unlocked: {unlock1.name}")
    print(f"[PASS] Rarity: {unlock1.rarity}")
    return True


# ===== SHIP MOOD RING TESTS =====

def test_ship_mood_ring():
    """Test 11: Ship Mood Ring"""
    print("\n[TEST 11] Ship Mood Ring")
    print("-" * 60)

    mood_ring = ShipMoodRing()

    # Stable ship
    stable = mood_ring.calculate_mood_color(
        "StableShip", drift=0.1, anomalies=1, personality_seed="cautious"
    )
    assert stable == ShipMoodColor.GREEN

    # Chaotic ship
    chaotic = mood_ring.calculate_mood_color(
        "ChaosShip", drift=0.9, anomalies=20, personality_seed="chaotic"
    )
    assert chaotic in [ShipMoodColor.PURPLE, ShipMoodColor.RED]

    fleet_status = mood_ring.get_fleet_mood_status()
    assert "StableShip" in fleet_status
    assert "ChaosShip" in fleet_status

    print("[PASS] Ship mood ring working")
    print(f"[PASS] StableShip: {stable.value}")
    print(f"[PASS] ChaosShip: {chaotic.value}")
    print(f"[PASS] Fleet status: {fleet_status}")
    return True


# ===== WHAT BROKE EXPLAINER TESTS =====

def test_what_broke_explainer():
    """Test 12: What Broke Explainer"""
    print("\n[TEST 12] What Broke Explainer")
    print("-" * 60)

    explainer = WhatBrokeExplainer()

    contradiction_explanation = explainer.explain("contradiction")
    outlier_explanation = explainer.explain("outlier")
    delta_explanation = explainer.explain("state_delta")

    assert len(contradiction_explanation) > 0
    assert len(outlier_explanation) > 0
    assert len(delta_explanation) > 0

    print("[PASS] What Broke Explainer working")
    print(f"[PASS] Contradiction: {contradiction_explanation}")
    print(f"[PASS] Outlier: {outlier_explanation}")
    print(f"[PASS] State Delta: {delta_explanation}")
    return True


# ===== MULTIVERSE ALIGNMENT TESTS =====

def test_multiverse_alignment_empty():
    """Test 13: Multiverse Alignment - No branches"""
    print("\n[TEST 13] Multiverse Alignment - Empty")
    print("-" * 60)

    alignment = MultiverseAlignmentScore()
    report = alignment.calculate_alignment()

    assert report.branch_count == 0
    assert report.alignment_status == "uninitialized"

    print("[PASS] Multiverse alignment: uninitialized")
    print(f"[PASS] Recommendation: {report.recommendation}")
    return True


def test_multiverse_alignment_aligned():
    """Test 14: Multiverse Alignment - Aligned"""
    print("\n[TEST 14] Multiverse Alignment - Aligned")
    print("-" * 60)

    alignment = MultiverseAlignmentScore()

    alignment.add_branch("branch_1", entropy=0.3, divergence=0.1, motif_overlap=0.8, anomaly_density=0.2)
    alignment.add_branch("branch_2", entropy=0.3, divergence=0.1, motif_overlap=0.8, anomaly_density=0.2)

    report = alignment.calculate_alignment()

    assert report.branch_count == 2
    assert report.alignment_status == "aligned"

    print("[PASS] Multiverse alignment: ALIGNED")
    print(f"[PASS] Branches: {report.branch_count}")
    print(f"[PASS] Recommendation: {report.recommendation}")
    return True


def test_multiverse_alignment_chaotic():
    """Test 15: Multiverse Alignment - Chaotic"""
    print("\n[TEST 15] Multiverse Alignment - Chaotic")
    print("-" * 60)

    alignment = MultiverseAlignmentScore()

    alignment.add_branch("branch_1", entropy=0.9, divergence=0.9, motif_overlap=0.1, anomaly_density=0.9)
    alignment.add_branch("branch_2", entropy=0.9, divergence=0.9, motif_overlap=0.1, anomaly_density=0.9)

    report = alignment.calculate_alignment()

    assert report.alignment_status == "chaotic"

    print("[PASS] Multiverse alignment: CHAOTIC")
    print(f"[PASS] Recommendation: {report.recommendation}")
    return True


# ===== SHIP DREAMS TESTS =====

def test_ship_dreams():
    """Test 16: Ship Dreams Generator"""
    print("\n[TEST 16] Ship Dreams")
    print("-" * 60)

    dreams_gen = ShipDreamsGenerator()
    dream = dreams_gen.generate_dream("ChaosBringer", ["threat_escalation", "memory_cascade"])

    assert dream.ship_name == "ChaosBringer"
    assert len(dream.dream_text) > 0
    assert 0.0 <= dream.weirdness_factor <= 1.0
    assert len(dream.motifs_recombined) > 0

    print("[PASS] Ship dream generated")
    print(f"[PASS] Dream: {dream.dream_text}")
    print(f"[PASS] Weirdness: {dream.weirdness_factor:.2f}")
    return True


# ===== GOSSIP ENGINE TESTS =====

def test_ship_gossip():
    """Test 17: Ship-to-Ship Gossip"""
    print("\n[TEST 17] Ship-to-Ship Gossip")
    print("-" * 60)

    gossip = ShipToShipGossipEngine()
    entry = gossip.generate_gossip("ChaosBringer", "Harvester-001")

    assert entry.source_ship == "ChaosBringer"
    assert entry.target_ship == "Harvester-001"
    assert len(entry.content) > 0
    assert entry.intensity in ["light", "moderate", "scandalous", "cosmic"]

    print("[PASS] Gossip generated")
    print(f"[PASS] From: {entry.source_ship}")
    print(f"[PASS] About: {entry.target_ship}")
    print(f"[PASS] Gossip: {entry.content}")
    print(f"[PASS] Intensity: {entry.intensity}")
    return True


# ===== MULTIVERSE WEATHER TESTS =====

def test_multiverse_weather():
    """Test 18: Multiverse Weather Report"""
    print("\n[TEST 18] Multiverse Weather Report")
    print("-" * 60)

    weather = MultiverseWeatherReport()
    report = weather.generate_weather("branch_1", anomaly_count=8)

    assert report["branch"] == "branch_1"
    assert len(report["conditions"]) > 0
    assert report["severity"] in ["mild", "moderate", "severe", "apocalyptic"]
    assert "advisory" in report

    print("[PASS] Weather forecast generated")
    print(f"[PASS] Conditions: {report['conditions']}")
    print(f"[PASS] Severity: {report['severity']}")
    print(f"[PASS] Advisory: {report['advisory']}")
    return True


# ===== MEMORY TIMELAPSE TESTS =====

def test_memory_timelapse():
    """Test 19: MemoryGraph Time-Lapse"""
    print("\n[TEST 19] MemoryGraph Time-Lapse")
    print("-" * 60)

    timelapse = MemoryGraphTimeLapseGenerator()

    # Test without memory graph (should fail gracefully)
    result = timelapse.generate_timelapse(None)
    assert len(result) > 0

    print("[PASS] Time-lapse generator working")
    print(f"[PASS] Snapshots: {len(result)}")
    for snapshot in result:
        print(f"[PASS]  - {snapshot}")
    return True


# ===== WHAT-IF SIMULATOR TESTS =====

def test_whatif_simulator():
    """Test 20: What-If Simulator"""
    print("\n[TEST 20] What-If Simulator")
    print("-" * 60)

    simulator = WhatIfSimulator()

    result = simulator.simulate_event(
        "threat_escalation",
        {"old_level": 3, "new_level": 8},
        "TestShip",
    )

    assert result["event_type"] == "threat_escalation"
    assert "predictions" in result
    assert "anomaly_probability" in result["predictions"]

    print("[PASS] What-If simulator working")
    print(f"[PASS] Event: {result['event_type']}")
    print(f"[PASS] Predictions: {result['predictions']}")
    return True


# ===== PARADOX BUFFER TESTS =====

def test_paradox_buffer():
    """Test 21: Paradox Buffer"""
    print("\n[TEST 21] Paradox Buffer")
    print("-" * 60)

    buffer = ParadoxBuffer()

    paradox = buffer.detect_paradox("Ship exists and doesn't exist simultaneously")

    assert len(buffer.detected_paradoxes) == 1
    assert "PARADOX" in paradox["complaint"]
    assert "CONFUSED" in paradox["complaint"]

    print("[PASS] Paradox detected and reported")
    print(f"[PASS] Severity: {paradox['severity']}")
    print(f"[PASS] Complaint: {paradox['complaint']}")
    return True


# ===== UNIVERSE LORE TESTS =====

def test_universe_lore():
    """Test 22: Universe Lore Expander"""
    print("\n[TEST 22] Universe Lore Expander")
    print("-" * 60)

    lore = UniverseLoreExpander()

    entry1 = lore.add_lore_from_motif("threat_escalation", 5)
    entry2 = lore.add_lore_from_motif("memory_cascade", 3)

    all_lore = lore.get_universe_lore()
    assert len(all_lore) == 2
    assert len(entry1) > 0
    assert len(entry2) > 0

    print("[PASS] Lore generated")
    print(f"[PASS] Entry 1: {entry1}")
    print(f"[PASS] Entry 2: {entry2}")
    return True


# ===== CHAOSBRINGER PERSONALITY TESTS =====

def test_chaosbringer_personality():
    """Test 23: Chaosbringer Personality Drift"""
    print("\n[TEST 23] Chaosbringer Personality Drift")
    print("-" * 60)

    tracker = ChaosbringerPersonalityDriftTracker()

    snap1 = tracker.record_personality_snapshot(
        cautious_score=0.8,
        chaotic_score=0.2,
        curious_score=0.3,
        aggressive_score=0.1,
        introspective_score=0.5,
    )

    snap2 = tracker.record_personality_snapshot(
        cautious_score=0.3,
        chaotic_score=0.8,
        curious_score=0.4,
        aggressive_score=0.6,
        introspective_score=0.2,
    )

    assert snap1["dominant_trait"] == "cautious"
    assert snap2["dominant_trait"] == "chaotic"

    arc = tracker.get_personality_arc()
    assert len(arc) > 0

    print("[PASS] Personality tracking working")
    print(f"[PASS] Snap 1 dominant: {snap1['dominant_trait']}")
    print(f"[PASS] Snap 2 dominant: {snap2['dominant_trait']}")
    print(f"[PASS] Personality arc:")
    for line in arc:
        print(f"[PASS]  - {line}")
    return True


# ===== TEST RUNNER =====

def run_all_tests():
    """Run all cosmic chaos tests"""
    print("\n" + "=" * 80)
    print("COSMIC CHAOS TEST SUITE - Phase VII.5")
    print("All ridiculous, hilarious, and weirdly fun systems")
    print("=" * 80)

    tests = [
        test_universe_mood_calm,
        test_universe_mood_jupiter_storm,
        test_universe_mood_trend,
        test_drift_forecast_stable,
        test_drift_forecast_critical,
        test_ship_horoscope,
        test_universe_patch_notes,
        test_captain_fed,
        test_captain_hangry,
        test_achievements_unlock,
        test_ship_mood_ring,
        test_what_broke_explainer,
        test_multiverse_alignment_empty,
        test_multiverse_alignment_aligned,
        test_multiverse_alignment_chaotic,
        test_ship_dreams,
        test_ship_gossip,
        test_multiverse_weather,
        test_memory_timelapse,
        test_whatif_simulator,
        test_paradox_buffer,
        test_universe_lore,
        test_chaosbringer_personality,
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
