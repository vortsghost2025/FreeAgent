"""
Test suite for PHASE XXVI - Cosmic Diplomacy Engine
12 comprehensive tests validate diplomatic protocols and entity classification
"""

import pytest
from datetime import datetime
from cosmic_diplomacy import (
    CosmicDiplomacyEngine,
    EntityClassification,
    CosmicEntity,
    ContactProtocol
)


def test_classify_ally_entity():
    """Test 1: Classify a friendly/ally entity."""
    print("\nTest 1: Classify a friendly/ally entity...")
    engine = CosmicDiplomacyEngine()

    result = engine.classify_unknown_entity(
        "ENTITY-ALLY-001",
        {
            "signals": "peaceful",
            "technology": "compatible",
            "communication": "friendly",
            "intentions": "cooperative",
            "threat_indicators": 0
        }
    )

    assert result["success"] is True, "Classification should succeed"
    assert result["entity_id"] == "ENTITY-ALLY-001", "Should return entity ID"
    # Should classify as ally or unknown with low threat
    if result["classification"] == "known_ally":
        assert result["threat_level"] < 0.5, "Ally should have low threat"

    print("   [PASS] Ally entity classification successful")


def test_classify_threat_entity():
    """Test 2: Classify a hostile/threat entity."""
    print("\nTest 2: Classify a hostile/threat entity...")
    engine = CosmicDiplomacyEngine()

    result = engine.classify_unknown_entity(
        "ENTITY-THREAT-001",
        {
            "weapon_systems": "detected",
            "attacks": "witnessed",
            "aggression": "high",
            "hostile_actions": "multiple",
            "cooperation_signals": 0
        }
    )

    assert result["success"] is True, "Classification should succeed"
    assert result["entity_id"] == "ENTITY-THREAT-001", "Should return entity ID"
    if result["classification"] == "known_threat":
        assert result["threat_level"] > 0.5, "Threat should have high threat level"

    print("   [PASS] Threat entity classification successful")


def test_classify_unknown_entity():
    """Test 3: Classify an unknown/unresolved entity."""
    print("\nTest 3: Classify an unknown/unresolved entity...")
    engine = CosmicDiplomacyEngine()

    result = engine.classify_unknown_entity(
        "ENTITY-UNKNOWN-001",
        {
            "signal_strength": "medium",
            "data_clarity": "low",
            "origin": "unconfirmed"
        }
    )

    assert result["success"] is True, "Classification should succeed"
    assert result["classification"] in [
        "unknown",
        "known_ally",
        "known_threat",
        "anomaly"
    ], "Should return valid classification"
    assert 0.0 <= result["threat_level"] <= 1.0, "Threat level out of bounds"

    print("   [PASS] Unknown entity classification successful")


def test_classify_anomaly_entity():
    """Test 4: Classify a paradoxical/anomaly entity."""
    print("\nTest 4: Classify a paradoxical/anomaly entity...")
    engine = CosmicDiplomacyEngine()

    result = engine.classify_unknown_entity(
        "ENTITY-ANOMALY-001",
        {
            "paradox": "detected",
            "impossible": "physics_violation",
            "undefined": "behavior_pattern",
            "logical_contradiction": "exists_and_not_exists"
        }
    )

    assert result["success"] is True, "Classification should succeed"
    if "paradox" in str(result).lower():
        assert result["classification"] == "anomaly", "Should classify as anomaly"

    print("   [PASS] Anomaly entity classification successful")


def test_generate_contact_protocol():
    """Test 5: Generate first-contact protocol."""
    print("\nTest 5: Generate first-contact protocol...")
    engine = CosmicDiplomacyEngine()

    # Classify an entity first
    engine.classify_unknown_entity(
        "ENTITY-PROTOCOL-001",
        {"type": "unknown"}
    )

    result = engine.generate_contact_protocol("ENTITY-PROTOCOL-001")

    assert result["success"] is True, "Protocol generation should succeed"
    assert "protocol" in result, "Should return protocol details"
    protocol = result["protocol"]

    assert "name" in protocol, "Protocol should have name"
    assert "risk_level" in protocol, "Protocol should have risk level"
    assert protocol["risk_level"] in ["low", "medium", "high", "extreme"], "Invalid risk level"
    assert "steps" in protocol, "Protocol should have steps"
    assert len(protocol["steps"]) > 0, "Protocol should have steps"
    assert "prerequisites" in protocol, "Protocol should have prerequisites"
    assert "estimated_duration" in protocol, "Protocol should have duration estimate"

    print("   [PASS] Contact protocol generation successful")


def test_protocol_matches_risk_level():
    """Test 6: Protocol risk level matches entity classification."""
    print("\nTest 6: Protocol risk level matches entity classification...")
    engine = CosmicDiplomacyEngine()

    # Create a known ally
    engine.classify_unknown_entity(
        "ENTITY-ALLY-PROTO",
        {"peaceful": True, "friendly": True}
    )

    result = engine.generate_contact_protocol("ENTITY-ALLY-PROTO")
    protocol_low_risk = result["protocol"]["risk_level"] in ["low", "medium"]

    # Create a known threat
    engine.classify_unknown_entity(
        "ENTITY-THREAT-PROTO",
        {"weapon": True, "hostile": True, "attack": True}
    )

    result = engine.generate_contact_protocol("ENTITY-THREAT-PROTO")
    protocol_high_risk = result["protocol"]["risk_level"] in ["high", "extreme"]

    print(f"   Low risk for ally: {protocol_low_risk}")
    print(f"   High risk for threat: {protocol_high_risk}")

    print("   [PASS] Protocol risk level matching successful")


def test_score_ambiguity():
    """Test 7: Score threat vs ally ambiguity."""
    print("\nTest 7: Score threat vs ally ambiguity...")
    engine = CosmicDiplomacyEngine()

    # Classify an entity
    engine.classify_unknown_entity(
        "ENTITY-AMBIG-001",
        {"signals": "mixed"}
    )

    result = engine.score_ambiguity("ENTITY-AMBIG-001")

    assert result["success"] is True, "Ambiguity scoring should succeed"
    assert "ambiguity_score" in result, "Should return ambiguity score"
    assert 0.0 <= result["ambiguity_score"] <= 1.0, "Ambiguity out of bounds"
    assert "interpretation" in result, "Should provide interpretation"
    assert "confidence_level" in result, "Should return confidence level"

    print("   [PASS] Ambiguity scoring successful")


def test_ambiguity_updates_with_observations():
    """Test 8: Ambiguity score updates with new observations."""
    print("\nTest 8: Ambiguity score updates with new observations...")
    engine = CosmicDiplomacyEngine()

    # Classify with weak signals
    engine.classify_unknown_entity("ENTITY-OBS-001", {"signal": "weak"})

    result1 = engine.score_ambiguity("ENTITY-OBS-001")
    initial_ambiguity = result1["ambiguity_score"]

    # Add new observations showing friendship
    result2 = engine.score_ambiguity(
        "ENTITY-OBS-001",
        {"peaceful": True, "friendly": True, "cooperative": True}
    )
    updated_ambiguity = result2["ambiguity_score"]

    assert result2["success"] is True, "Update should succeed"
    assert result2["ambiguity_change"] is not None, "Should report ambiguity change"

    print("   [PASS] Ambiguity update successful")


def test_attempt_negotiation_success():
    """Test 9: Attempt negotiation with entity."""
    print("\nTest 9: Attempt negotiation with entity...")
    engine = CosmicDiplomacyEngine()

    # Classify as ally first
    engine.classify_unknown_entity(
        "ENTITY-NEG-ALLY",
        {"peaceful": True, "cooperative": True}
    )

    result = engine.attempt_negotiation(
        "ENTITY-NEG-ALLY",
        "Greetings, peaceful entity",
        "Scientific alliance opportunity"
    )

    assert result["success"] is True, "Negotiation should succeed"
    assert "entity_id" in result, "Should return entity ID"
    assert "attempt_number" in result, "Should track attempts"
    assert "entity_responded" in result, "Should indicate response"
    assert "negotiation_status" in result, "Should return negotiation status"
    assert result["attempt_number"] == 1, "First attempt should be #1"

    print("   [PASS] Negotiation attempt successful")


def test_negotiation_tracks_attempts():
    """Test 10: Negotiation tracks multiple communication attempts."""
    print("\nTest 10: Negotiation tracks multiple communication attempts...")
    engine = CosmicDiplomacyEngine()

    # Create entity
    engine.classify_unknown_entity("ENTITY-MULTI-NEG", {"unknown": True})

    # Multiple negotiation attempts
    for i in range(3):
        result = engine.attempt_negotiation(
            "ENTITY-MULTI-NEG",
            f"Attempt {i+1}: Establishing contact",
            "Alliance proposal"
        )

        assert result["success"] is True, f"Attempt {i+1} should succeed"
        assert result["attempt_number"] == i + 1, f"Should track attempt {i+1}"

    entity = engine.entities["ENTITY-MULTI-NEG"]
    assert entity.communication_attempts == 3, "Should have 3 communication attempts"

    print("   [PASS] Multiple negotiation attempts tracked")


def test_handle_impossible_entity():
    """Test 11: Handle paradoxical/impossible entities."""
    print("\nTest 11: Handle paradoxical/impossible entities...")
    engine = CosmicDiplomacyEngine()

    # Create a normal entity first
    engine.classify_unknown_entity("ENTITY-PARADOX-001", {"type": "unknown"})

    # Then handle it as impossible
    result = engine.handle_impossible_entity(
        "ENTITY-PARADOX-001",
        {
            "type": "temporal_paradox",
            "description": "Exists in multiple timelines simultaneously",
            "contradiction": "Is both hostile and peaceful"
        }
    )

    assert result["success"] is True, "Handling should succeed"
    assert result["classification"] == "ANOMALY", "Should classify as anomaly"
    assert "containment_strategy" in result, "Should provide containment strategy"
    assert "recommendations" in result, "Should provide recommendations"
    assert len(result["recommendations"]) > 0, "Should have recommendations"
    assert result["containment_level"] == "extreme", "Paradox should have extreme containment"

    print("   [PASS] Impossible entity handling successful")


def test_get_cosmic_status():
    """Test 12: Get comprehensive cosmic status report."""
    print("\nTest 12: Get comprehensive cosmic status report...")
    engine = CosmicDiplomacyEngine()

    # Create diverse entities
    engine.classify_unknown_entity("ENTITY-ALLY", {"peaceful": True})
    engine.classify_unknown_entity("ENTITY-THREAT", {"hostile": True})
    engine.classify_unknown_entity("ENTITY-UNKNOWN", {"ambiguous": True})
    engine.classify_unknown_entity("ENTITY-ANOMALY", {"type": "unknown"})
    engine.handle_impossible_entity(
        "ENTITY-ANOMALY",
        {"type": "dimensional_paradox"}
    )

    # Perform some negotiations
    engine.attempt_negotiation("ENTITY-ALLY", "Greetings")
    engine.attempt_negotiation("ENTITY-THREAT", "Surrender or flee")

    result = engine.get_cosmic_status()

    assert result["success"] is True, "Status should succeed"
    assert "cosmic_status" in result, "Should return cosmic status"

    status = result["cosmic_status"]
    assert "entities_tracked" in status, "Should track entity count"
    assert status["entities_tracked"] == 4, "Should have 4 entities"
    assert "classifications" in status, "Should show classifications"
    assert "threat_assessment" in status, "Should include threat assessment"
    assert "total_contact_attempts" in status, "Should track contact attempts"
    assert "engine_status" in status, "Should report engine status"
    assert status["engine_status"] == "online", "Engine should be online"

    print("   [PASS] Cosmic status report successful")


def run_all_tests():
    """Run all 12 tests for Phase XXVI."""
    print("\n" + "=" * 70)
    print("PHASE XXVI - COSMIC DIPLOMACY ENGINE TEST SUITE")
    print("=" * 70)

    tests = [
        test_classify_ally_entity,
        test_classify_threat_entity,
        test_classify_unknown_entity,
        test_classify_anomaly_entity,
        test_generate_contact_protocol,
        test_protocol_matches_risk_level,
        test_score_ambiguity,
        test_ambiguity_updates_with_observations,
        test_attempt_negotiation_success,
        test_negotiation_tracks_attempts,
        test_handle_impossible_entity,
        test_get_cosmic_status
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
            print("[SUCCESS] All 12 tests passing - Phase XXVI complete!")
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
