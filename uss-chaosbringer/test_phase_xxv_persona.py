"""
Test suite for PHASE XXV - Federation Persona Generator
12 comprehensive tests validate personality management and rapport tracking
"""

import pytest
from datetime import datetime, timedelta
from federation_persona import (
    FederationPersonaGenerator,
    PersonalityTrait,
    TraitDrift,
    Persona
)


def test_initialize_persona():
    """Test 1: Initialize persona with default traits."""
    print("\nTest 1: Initialize persona with default traits...")
    gen = FederationPersonaGenerator()
    result = gen.initialize_persona()

    assert result["success"] is True, "Initialization should succeed"
    assert result["persona_initialized"] is True, "Persona should be initialized"
    assert "initial_traits" in result, "Should return initial traits"
    assert len(result["initial_traits"]) == 5, "Should have 5 traits"
    assert result["personality_score"] > 0.5, "Initial score should be positive"

    # Verify trait values are in valid range
    for trait_val in result["initial_traits"].values():
        assert 0.0 <= trait_val <= 1.0, f"Trait value out of range: {trait_val}"

    print("   [PASS] Persona initialization successful")


def test_adjust_single_trait():
    """Test 2: Adjust a single trait by delta."""
    print("\nTest 2: Adjust a single trait by delta...")
    gen = FederationPersonaGenerator()
    gen.initialize_persona()

    old_curiosity = gen.persona.trait_values[PersonalityTrait.CURIOSITY]

    result = gen.adjust_trait(
        PersonalityTrait.CURIOSITY,
        0.2,
        "Captain encourages exploration"
    )

    assert result["success"] is True, "Adjustment should succeed"
    assert abs(result["actual_delta"] - 0.2) < 0.001, "Delta should be applied"
    assert result["old_value"] == old_curiosity, "Should track old value"
    assert result["trait"] == "curiosity", "Should identify correct trait"
    assert abs(gen.persona.trait_values[PersonalityTrait.CURIOSITY] - (old_curiosity + 0.2)) < 0.001

    print("   [PASS] Trait adjustment successful")


def test_trait_bounds_enforcement():
    """Test 3: Trait values stay within 0.0-1.0 bounds."""
    print("\nTest 3: Trait values stay within 0.0-1.0 bounds...")
    gen = FederationPersonaGenerator()
    gen.initialize_persona()

    # Try to increase beyond 1.0
    result = gen.adjust_trait(PersonalityTrait.EMPATHY, 2.0, "Over-adjustment")
    assert result["actual_delta"] <= (1.0 - result["old_value"]), "Should cap at 1.0"
    assert gen.persona.trait_values[PersonalityTrait.EMPATHY] <= 1.0, "Empathy should not exceed 1.0"

    # Try to decrease below 0.0
    result = gen.adjust_trait(PersonalityTrait.CAUTION, -5.0, "Negative over-adjustment")
    assert gen.persona.trait_values[PersonalityTrait.CAUTION] >= 0.0, "Caution should not go below 0.0"

    print("   [PASS] Trait bounds enforced correctly")


def test_record_trait_drift():
    """Test 4: Record personality drift events."""
    print("\nTest 4: Record personality drift events...")
    gen = FederationPersonaGenerator()
    gen.initialize_persona()

    initial_drifts = len(gen.persona.drift_history)

    result = gen.record_trait_drift(
        PersonalityTrait.CAUTION,
        0.15,
        "Risky first contact successful",
        "Alien species encounter"
    )

    assert result["success"] is True, "Drift recording should succeed"
    assert result["drift_recorded"] is True, "Should confirm drift recorded"
    assert len(gen.persona.drift_history) == initial_drifts + 1, "Should add drift to history"
    assert result["total_drifts"] == initial_drifts + 1, "Should return updated count"

    # Verify drift event details
    last_drift = gen.persona.drift_history[-1]
    assert last_drift.trait == PersonalityTrait.CAUTION, "Should record correct trait"
    assert last_drift.delta == 0.15, "Should record correct delta"
    assert "Risky first contact" in last_drift.cause, "Should record cause"
    assert "Alien species" in last_drift.interaction_context, "Should record context"

    print("   [PASS] Trait drift recording successful")


def test_multiple_drift_history():
    """Test 5: Maintain multiple drift events in history."""
    print("\nTest 5: Maintain multiple drift events in history...")
    gen = FederationPersonaGenerator()
    gen.initialize_persona()

    # Record multiple drifts
    drifts_to_record = [
        (PersonalityTrait.CURIOSITY, 0.1, "Exploration success"),
        (PersonalityTrait.EMPATHY, -0.05, "Betrayal detected"),
        (PersonalityTrait.AMBITION, 0.15, "New sector discovered"),
        (PersonalityTrait.MISCHIEF, 0.08, "Playful interaction"),
        (PersonalityTrait.CAUTION, 0.12, "Close call avoided")
    ]

    for trait, delta, cause in drifts_to_record:
        gen.record_trait_drift(trait, delta, cause, f"Context for {cause}")

    assert len(gen.persona.drift_history) == 5, "Should have 5 drift events"

    # Verify all drifts recorded
    for i, (trait, delta, _) in enumerate(drifts_to_record):
        recorded = gen.persona.drift_history[i]
        assert recorded.trait == trait, f"Drift {i}: Wrong trait"
        assert recorded.delta == delta, f"Drift {i}: Wrong delta"

    print("   [PASS] Multiple drift history maintained")


def test_measure_rapport_positive():
    """Test 6: Rapport increases with captain satisfaction."""
    print("\nTest 6: Rapport increases with captain satisfaction...")
    gen = FederationPersonaGenerator()
    gen.initialize_persona()

    initial_rapport = gen.rapport_score

    # Captain satisfied and goals aligned
    result = gen.measure_rapport(
        captain_satisfaction=0.85,
        alignment_score=0.80
    )

    assert result["success"] is True, "Rapport measurement should succeed"
    assert result["rapport_score"] > initial_rapport, "Rapport should increase"
    assert result["interaction_count"] == 1, "Should track interaction"
    assert 0.0 <= result["rapport_score"] <= 1.0, "Rapport should be in bounds"

    print("   [PASS] Positive rapport measurement successful")


def test_measure_rapport_negative():
    """Test 7: Rapport decreases with captain dissatisfaction."""
    print("\nTest 7: Rapport decreases with captain dissatisfaction...")
    gen = FederationPersonaGenerator()
    gen.initialize_persona()

    # Set initial high rapport
    gen.rapport_score = 0.8

    # Captain dissatisfied
    result = gen.measure_rapport(
        captain_satisfaction=0.15,
        alignment_score=0.20
    )

    assert result["success"] is True, "Rapport measurement should succeed"
    assert result["rapport_score"] < 0.8, "Rapport should decrease"
    assert "declining" in result["rapport_direction"], "Should indicate decline"

    print("   [PASS] Negative rapport measurement successful")


def test_rapport_influences_traits():
    """Test 8: Captain satisfaction influences federation traits."""
    print("\nTest 8: Captain satisfaction influences federation traits...")
    gen = FederationPersonaGenerator()
    gen.initialize_persona()

    old_empathy = gen.persona.trait_values[PersonalityTrait.EMPATHY]
    old_curiosity = gen.persona.trait_values[PersonalityTrait.CURIOSITY]

    # Very satisfied captain
    gen.measure_rapport(0.9, 0.85)

    new_empathy = gen.persona.trait_values[PersonalityTrait.EMPATHY]
    new_curiosity = gen.persona.trait_values[PersonalityTrait.CURIOSITY]

    # Empathy and curiosity should increase
    assert new_empathy >= old_empathy, "Empathy should increase or stay same"
    assert new_curiosity >= old_curiosity, "Curiosity should increase or stay same"

    print("   [PASS] Trait influence from rapport successful")


def test_get_persona_snapshot():
    """Test 9: Get current personality snapshot."""
    print("\nTest 9: Get current personality snapshot...")
    gen = FederationPersonaGenerator()
    gen.initialize_persona()

    # Make some changes
    gen.adjust_trait(PersonalityTrait.CURIOSITY, 0.15, "Test adjustment")
    gen.measure_rapport(0.75, 0.70)

    result = gen.get_persona_snapshot()

    assert result["success"] is True, "Snapshot should succeed"
    assert "persona_snapshot" in result, "Should contain snapshot"
    snapshot = result["persona_snapshot"]

    assert "traits" in snapshot, "Should include traits"
    assert len(snapshot["traits"]) == 5, "Should have 5 traits"
    assert "personality_score" in snapshot, "Should include personality score"
    assert "rapport_score" in snapshot, "Should include rapport score"
    assert "interaction_count" in snapshot, "Should include interaction count"
    assert "creation_timestamp" in snapshot, "Should include timestamp"

    # Verify values are sensible
    assert 0.0 <= snapshot["personality_score"] <= 1.0, "Score out of bounds"
    assert 0.0 <= snapshot["rapport_score"] <= 1.0, "Rapport out of bounds"

    print("   [PASS] Persona snapshot successful")


def test_get_persona_status_comprehensive():
    """Test 10: Get comprehensive personality status report."""
    print("\nTest 10: Get comprehensive personality status report...")
    gen = FederationPersonaGenerator()
    gen.initialize_persona()

    # Simulate some interactions
    for i in range(3):
        gen.record_trait_drift(
            PersonalityTrait.CURIOSITY,
            0.05,
            f"Discovery {i+1}",
            f"Exploration context {i+1}"
        )
        gen.measure_rapport(0.5 + (i * 0.1), 0.5)

    result = gen.get_persona_status()

    assert result["success"] is True, "Status should succeed"
    assert "status" in result, "Should contain status"
    status = result["status"]

    # Verify structure
    assert "federation_personality_profile" in status, "Should include profile"
    assert "captain_relations" in status, "Should include relations"
    assert "personality_evolution" in status, "Should include evolution"
    assert "system_health" in status, "Should include health"

    # Verify profile details
    profile = status["federation_personality_profile"]
    assert "dominant_trait" in profile, "Should identify dominant trait"
    assert "recessive_trait" in profile, "Should identify recessive trait"
    assert "consistency_score" in profile, "Should include consistency"
    assert 0.0 <= profile["consistency_score"] <= 1.0, "Consistency in bounds"

    # Verify relations details
    relations = status["captain_relations"]
    assert "status" in relations, "Should include rapport status"
    assert relations["status"] in [
        "Perfect Alliance",
        "Strong Partnership",
        "Stable Cooperation",
        "Fragile Trust",
        "Adversarial"
    ], f"Invalid rapport status: {relations['status']}"

    print("   [PASS] Persona status report successful")


def test_invalid_trait_type():
    """Test 11: Reject invalid trait types."""
    print("\nTest 11: Reject invalid trait types...")
    gen = FederationPersonaGenerator()
    gen.initialize_persona()

    result = gen.adjust_trait("invalid_trait", 0.1, "Should fail")

    assert result["success"] is False, "Should reject invalid trait"
    assert "error" in result, "Should include error message"

    print("   [PASS] Invalid trait rejection successful")


def test_personality_score_recalculation():
    """Test 12: Personality score recalculates with trait changes."""
    print("\nTest 12: Personality score recalculates with trait changes...")
    gen = FederationPersonaGenerator()
    gen.initialize_persona()

    initial_score = gen.persona.personality_score

    # Significantly increase empathy and curiosity
    gen.adjust_trait(PersonalityTrait.EMPATHY, 0.3, "Boost empathy")
    gen.adjust_trait(PersonalityTrait.CURIOSITY, 0.3, "Boost curiosity")

    new_score = gen.persona.personality_score

    assert new_score > initial_score, "Score should increase with trait boosts"
    assert 0.0 <= new_score <= 1.0, "Score should remain in bounds"

    print("   [PASS] Personality score recalculation successful")


def run_all_tests():
    """Run all 12 tests for Phase XXV."""
    print("\n" + "=" * 70)
    print("PHASE XXV - FEDERATION PERSONA GENERATOR TEST SUITE")
    print("=" * 70)

    tests = [
        test_initialize_persona,
        test_adjust_single_trait,
        test_trait_bounds_enforcement,
        test_record_trait_drift,
        test_multiple_drift_history,
        test_measure_rapport_positive,
        test_measure_rapport_negative,
        test_rapport_influences_traits,
        test_get_persona_snapshot,
        test_get_persona_status_comprehensive,
        test_invalid_trait_type,
        test_personality_score_recalculation
    ]

    passed = 0
    failed = 0

    try:
        for test in tests:
            try:
                test()
                passed += 1
            except AssertionError as e:
                print(f"   [FAIL] {str(e)}")
                failed += 1
            except Exception as e:
                print(f"   [ERROR] {str(e)}")
                failed += 1

        print("\n" + "=" * 70)
        print(f"RESULTS: {passed} passed, {failed} failed out of {len(tests)} tests")
        print("=" * 70)

        if failed == 0:
            print("[SUCCESS] All 12 tests passing - Phase XXV complete!")
            return True
        else:
            print(f"[FAILURE] {failed} test(s) failed")
            return False

    except Exception as e:
        print(f"\n[FATAL ERROR] Test suite failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)
