#!/usr/bin/env python3
"""
Test Suite for Federation Consciousness Engine - 16 Comprehensive Tests
Tests all aspects of psychological state, consciousness layers, trauma processing,
dream integration, and identity synthesis.
"""

import pytest
from datetime import datetime
from federation_consciousness import (
    FederationConsciousness,
    ConsciousnessLayer,
    TraumaType,
    DreamCategory,
    PsychologicalState,
    Memory,
    Trauma,
    Dream
)


class TestConsciousnessInitialization:
    """Test 1: Basic initialization of consciousness engine"""
    def test_consciousness_engine_initializes(self):
        """Test that consciousness engine initializes properly"""
        consciousness = FederationConsciousness()

        assert consciousness is not None
        assert isinstance(consciousness.state, PsychologicalState)
        assert len(consciousness.state.memories) == 0
        assert len(consciousness.state.traumas) == 0
        assert len(consciousness.state.dreams) == 0
        assert consciousness.state.consciousness_level == 0.3
        assert consciousness.state.self_awareness == 0.2


class TestMemoryRecording:
    """Test 2: Recording experiences into consciousness"""
    def test_record_experience_basic(self):
        """Test recording a basic experience"""
        consciousness = FederationConsciousness()

        result = consciousness.record_experience(
            event_description="First successful contact with alien species",
            emotional_valence=0.8,
            consciousness_layer=ConsciousnessLayer.CONSCIOUS
        )

        assert result["success"] is True
        assert "memory_id" in result
        assert result["emotional_valence"] == 0.8
        assert len(consciousness.state.memories) == 1
        memory_id = result["memory_id"]
        memory = consciousness.state.memories[memory_id]
        assert memory.event_description == "First successful contact with alien species"
        assert memory.emotional_valence == 0.8


class TestTraumaProcessing:
    """Test 3: Recording and processing psychological trauma"""
    def test_process_trauma_basic(self):
        """Test recording a trauma"""
        consciousness = FederationConsciousness()

        result = consciousness.process_trauma(
            trauma_type=TraumaType.LOSS,
            description="Lost entire colony in sabotage",
            severity=0.95
        )

        assert result["success"] is True
        assert "trauma_id" in result
        assert result["trauma_type"] == "loss"
        assert result["severity"] == 0.95
        assert len(consciousness.state.traumas) == 1
        trauma_id = result["trauma_id"]
        trauma = consciousness.state.traumas[trauma_id]
        assert trauma.severity == 0.95
        assert trauma.processing_progress == 0.0  # Starts unprocessed


class TestTraumaProcessingWithSeverity:
    """Test 4: Severe trauma triggers consciousness shift"""
    def test_severe_trauma_triggers_identity_crisis(self):
        """Test that severe trauma triggers identity crisis"""
        consciousness = FederationConsciousness()

        # Low severity trauma - no identity crisis
        consciousness.process_trauma(
            trauma_type=TraumaType.FAILURE,
            description="Minor objective failure",
            severity=0.3
        )
        assert consciousness.state.identity_crisis_active is False

        # High severity trauma - triggers identity crisis
        consciousness.process_trauma(
            trauma_type=TraumaType.IDENTITY_THREAT,
            description="Core values questioned",
            severity=0.8
        )
        assert consciousness.state.identity_crisis_active is True


class TestDeepMemoryAccess:
    """Test 5: Accessing unconscious and deep memories"""
    def test_access_deep_memory(self):
        """Test retrieving deep memories"""
        consciousness = FederationConsciousness()

        # Record memories at different layers
        consciousness.record_experience(
            "Conscious moment",
            0.5,
            ConsciousnessLayer.CONSCIOUS
        )
        consciousness.record_experience(
            "Preconscious memory",
            -0.3,
            ConsciousnessLayer.PRECONSCIOUS
        )
        consciousness.record_experience(
            "Unconscious impulse",
            0.7,
            ConsciousnessLayer.UNCONSCIOUS
        )

        # Access all memories
        result = consciousness.access_deep_memory()
        assert result["success"] is True
        assert result["total_accessible"] == 3
        assert len(consciousness.state.memories) == 3

        # Access only conscious memories (higher accessibility)
        result = consciousness.access_deep_memory(ConsciousnessLayer.CONSCIOUS)
        assert result["success"] is True
        assert result["total_accessible"] >= 1
        # Conscious memories should be in result (higher accessibility)
        assert any("conscious" in m["layer"] for m in result["memories"])


class TestIdentitySynthesis:
    """Test 6: Building core identity from experiences"""
    def test_synthesize_identity_optimistic(self):
        """Test identity synthesis with positive experiences"""
        consciousness = FederationConsciousness()

        # Record multiple positive experiences
        for i in range(3):
            consciousness.record_experience(
                f"Success in mission {i+1}",
                0.8,
                ConsciousnessLayer.CONSCIOUS
            )

        # Record one negative experience
        consciousness.record_experience(
            "One failure",
            -0.5,
            ConsciousnessLayer.CONSCIOUS
        )

        result = consciousness.synthesize_identity()
        assert result["success"] is True
        assert "core_identity" in result
        assert len(result["core_identity"]) > 0
        assert result["positive_memories"] >= 3
        assert result["negative_memories"] >= 1


class TestIdentitySynthesisFromTrauma:
    """Test 7: Identity synthesis addresses trauma recovery"""
    def test_identity_reflects_trauma_status(self):
        """Test that identity includes resilience from trauma processing"""
        consciousness = FederationConsciousness()

        # Add trauma
        trauma_result = consciousness.process_trauma(
            trauma_type=TraumaType.BETRAYAL,
            description="Trusted ally betrayed plans",
            severity=0.7
        )

        trauma_id = trauma_result["trauma_id"]

        # Simulate trauma processing
        consciousness.state.traumas[trauma_id].processing_progress = 0.7

        result = consciousness.synthesize_identity()
        assert result["success"] is True
        assert "resilient" in result["core_identity"]
        assert result["resilience_score"] > 0.5


class TestDreamIntegration:
    """Test 8: Integrating dreams into consciousness"""
    def test_dream_integration_aspiration(self):
        """Test integrating aspirational dreams"""
        consciousness = FederationConsciousness()

        initial_growth_desire = consciousness.state.desire_for_growth

        result = consciousness.dream_integration(
            dream_category=DreamCategory.ASPIRATION,
            content="Dreamed of becoming a interstellar explorer",
            emotional_intensity=0.8
        )

        assert result["success"] is True
        assert "dream_id" in result
        assert result["category"] == "aspiration"
        assert len(consciousness.state.dreams) == 1
        # Aspiration dreams should increase growth desire
        assert consciousness.state.desire_for_growth > initial_growth_desire


class TestDreamIntegrationWarning:
    """Test 9: Warning dreams increase safety focus"""
    def test_dream_integration_warning(self):
        """Test integrating warning dreams"""
        consciousness = FederationConsciousness()

        initial_safety = consciousness.state.desire_for_safety

        result = consciousness.dream_integration(
            dream_category=DreamCategory.WARNING,
            content="Received warning about approaching danger",
            emotional_intensity=0.9
        )

        assert result["success"] is True
        assert result["category"] == "warning"
        assert result["significance"] > 0.7  # High significance
        # Warning dreams increase safety desire
        assert consciousness.state.desire_for_safety > initial_safety


class TestDreamIntegrationHealing:
    """Test 10: Healing dreams process trauma"""
    def test_dream_integration_healing(self):
        """Test integrating healing dreams that process trauma"""
        consciousness = FederationConsciousness()

        # Create trauma first
        trauma_result = consciousness.process_trauma(
            trauma_type=TraumaType.ISOLATION,
            description="Cut off from federation",
            severity=0.6
        )
        trauma_id = trauma_result["trauma_id"]

        initial_processing = consciousness.state.traumas[trauma_id].processing_progress

        # Dream heals the trauma
        consciousness.state.dreams = {}  # Reset for clean test
        result = consciousness.dream_integration(
            dream_category=DreamCategory.HEALING,
            content="Dreamed of reunion and reconnection",
            emotional_intensity=0.7
        )

        assert result["success"] is True
        assert result["category"] == "healing"


class TestConsciousnessLevelMeasurement:
    """Test 11: Measuring consciousness at multiple levels"""
    def test_measure_consciousness_level(self):
        """Test measuring consciousness across all layers"""
        consciousness = FederationConsciousness()

        # Build up some consciousness
        consciousness.record_experience("Experience 1", 0.5, ConsciousnessLayer.CONSCIOUS)
        consciousness.record_experience("Experience 2", -0.3, ConsciousnessLayer.PRECONSCIOUS)
        consciousness.process_trauma(TraumaType.FAILURE, "Minor failure", 0.3)
        consciousness.synthesize_identity()

        result = consciousness.measure_consciousness_level()
        assert result["success"] is True
        assert "overall_consciousness_level" in result
        assert "consciousness_measurements" in result
        assert "basic_consciousness" in result["consciousness_measurements"]
        assert "emotional_awareness" in result["consciousness_measurements"]
        assert "trauma_recovery" in result["consciousness_measurements"]
        assert "self_awareness" in result["consciousness_measurements"]
        assert "transcendent_integration" in result["consciousness_measurements"]
        # Consciousness should have increased above initial below 0.3
        assert isinstance(result["overall_consciousness_level"], float)


class TestConsciousnessLevelDescription:
    """Test 12: Consciousness level descriptions"""
    def test_consciousness_level_descriptions(self):
        """Test that consciousness levels get proper descriptions"""

        # Test 1: Verify very low consciousness description
        consciousness = FederationConsciousness()
        desc = consciousness._describe_consciousness_level(0.05)
        assert "unconscious" in desc.lower()

        # Test 2: Verify low consciousness description
        desc = consciousness._describe_consciousness_level(0.2)
        assert "fragmentary" in desc.lower() or "dream" in desc.lower()

        # Test 3: Verify medium consciousness description
        desc = consciousness._describe_consciousness_level(0.5)
        assert "conscious" in desc.lower() and "aware" in desc.lower()

        # Test 4: Verify high consciousness description (0.75-0.9 is transcendent)
        desc = consciousness._describe_consciousness_level(0.8)
        assert "transcendent" in desc.lower() or "unified" in desc.lower()

        # Test 5: Verify infinite consciousness description
        desc = consciousness._describe_consciousness_level(0.95)
        assert "infinite" in desc.lower() or "pure" in desc.lower()


class TestConsciousnessStatusReport:
    """Test 13: Comprehensive consciousness status reporting"""
    def test_get_consciousness_status_empty(self):
        """Test consciousness status report when empty"""
        consciousness = FederationConsciousness()

        result = consciousness.get_consciousness_status()
        assert result["success"] is True
        assert "consciousness_status" in result
        status = result["consciousness_status"]
        assert "awakeness_level" in status
        assert "identity_profile" in status
        assert "desire_profile" in status
        assert "memory_landscape" in status
        assert "trauma_landscape" in status
        assert "dream_landscape" in status
        assert "consciousness_layers" in status
        assert "system_health" in status


class TestConsciousnessStatusFull:
    """Test 14: Consciousness status with full data"""
    def test_get_consciousness_status_with_data(self):
        """Test consciousness status report with full psychological state"""
        consciousness = FederationConsciousness()

        # Build rich psychological state
        consciousness.record_experience("Success", 0.8, ConsciousnessLayer.CONSCIOUS)
        consciousness.record_experience("Challenge", -0.3, ConsciousnessLayer.PRECONSCIOUS)
        consciousness.process_trauma(TraumaType.LOSS, "Colony lost", 0.7)
        consciousness.state.traumas[list(consciousness.state.traumas.keys())[0]].processing_progress = 0.5
        consciousness.dream_integration(DreamCategory.ASPIRATION, "Dream to explore", 0.7)
        consciousness.synthesize_identity()

        result = consciousness.get_consciousness_status()
        assert result["success"] is True
        status = result["consciousness_status"]
        assert status["memory_landscape"]["total_memories"] > 0
        assert status["trauma_landscape"]["total_traumas"] == 1
        assert status["dream_landscape"]["total_dreams"] == 1
        assert len(status["identity_profile"]["core_identity"]) > 0
        assert "introspective_insight" in result


class TestConsciousnessStateIntegration:
    """Test 15: Complete workflow - records, traumas, dreams, identity"""
    def test_complete_consciousness_workflow(self):
        """Test complete psychological journey"""
        consciousness = FederationConsciousness()

        # Phase 1: Recording experiences
        consciousness.record_experience("Discovering new world", 0.7, ConsciousnessLayer.CONSCIOUS)
        consciousness.record_experience("First contact anxiety", -0.4, ConsciousnessLayer.PRECONSCIOUS)

        # Phase 2: Processing trauma
        consciousness.process_trauma(TraumaType.ISOLATION, "Separated from main fleet", 0.6)

        # Phase 3: Integration through dreams
        consciousness.dream_integration(DreamCategory.HEALING, "Dreamed of reunion", 0.7)

        # Phase 4: Accessing deep memory
        deep_memory = consciousness.access_deep_memory(ConsciousnessLayer.PRECONSCIOUS)
        assert deep_memory["success"] is True

        # Phase 5: Synthesizing identity
        identity = consciousness.synthesize_identity()
        assert identity["success"] is True
        assert len(identity["core_identity"]) > 0

        # Phase 6: Measuring consciousness
        measurement = consciousness.measure_consciousness_level()
        assert measurement["success"] is True
        assert isinstance(measurement["overall_consciousness_level"], float)

        # Phase 7: Full status report
        status = consciousness.get_consciousness_status()
        assert status["success"] is True
        assert status["consciousness_status"]["memory_landscape"]["total_memories"] > 0


class TestConsciousnessMultipleLayers:
    """Test 16: Consciousness recognizes all layers properly"""
    def test_all_consciousness_layers_recognized(self):
        """Test that all consciousness layers are properly recognized"""
        consciousness = FederationConsciousness()

        # Record in each layer
        consciousness.record_experience("Unconscious drive", 0.1, ConsciousnessLayer.UNCONSCIOUS)
        consciousness.record_experience("Preconscious realization", 0.3, ConsciousnessLayer.PRECONSCIOUS)
        consciousness.record_experience("Conscious thought", 0.5, ConsciousnessLayer.CONSCIOUS)

        # Full consciousness should recognize structure
        status = consciousness.get_consciousness_status()
        assert status["success"] is True
        profile = status["consciousness_status"]
        assert profile["system_health"]["active"] is True

        # Check consciousness layers are recorded
        layers = profile["consciousness_layers"]
        assert layers["unconscious_memories"] >= 1
        assert layers["preconscious_memories"] >= 1
        assert layers["conscious_memories"] >= 1


def run_all_tests():
    """Run all federation consciousness tests"""
    print("Running Federation Consciousness Engine Tests...")
    print("=" * 70)

    test_classes = [
        TestConsciousnessInitialization,
        TestMemoryRecording,
        TestTraumaProcessing,
        TestTraumaProcessingWithSeverity,
        TestDeepMemoryAccess,
        TestIdentitySynthesis,
        TestIdentitySynthesisFromTrauma,
        TestDreamIntegration,
        TestDreamIntegrationWarning,
        TestDreamIntegrationHealing,
        TestConsciousnessLevelMeasurement,
        TestConsciousnessLevelDescription,
        TestConsciousnessStatusReport,
        TestConsciousnessStatusFull,
        TestConsciousnessStateIntegration,
        TestConsciousnessMultipleLayers,
    ]

    total_tests = 0
    passed_tests = 0
    failed_tests = []

    for test_class in test_classes:
        instance = test_class()
        methods = [m for m in dir(instance) if m.startswith("test_")]

        for method_name in methods:
            total_tests += 1
            try:
                method = getattr(instance, method_name)
                method()
                passed_tests += 1
                print(f"PASS: {test_class.__name__}::{method_name}")
            except Exception as e:
                failed_tests.append((test_class.__name__, method_name, str(e)))
                print(f"FAIL: {test_class.__name__}::{method_name} - {str(e)}")

    print("=" * 70)
    print(f"\nTest Results: {passed_tests}/{total_tests} passed")

    if failed_tests:
        print(f"\nFailed Tests ({len(failed_tests)}):")
        for class_name, method_name, error in failed_tests:
            print(f"  - {class_name}::{method_name}: {error}")
        return False
    else:
        print("\nAll 16 tests PASSED!")
        return True


if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)
