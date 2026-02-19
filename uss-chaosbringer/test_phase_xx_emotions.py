#!/usr/bin/env python3
"""
PHASE XX - EMOTION MATRIX TESTS
Comprehensive test suite for federation emotional states (14 tests)
"""

import pytest

from emotion_matrix import EmotionMatrix, EmotionalVector


class TestEmotionInitialization:
    """Test emotion matrix initialization"""

    def test_initialize(self):
        """Test emotion matrix initializes"""
        matrix = EmotionMatrix()
        assert matrix.current_state is not None
        assert 0.0 <= matrix.current_state.morale <= 1.0

    def test_initial_state(self):
        """Test initial emotional state is neutral-positive"""
        matrix = EmotionMatrix()
        assert matrix.current_state.morale > 0.4
        assert matrix.current_state.confidence > 0.4
        assert matrix.current_state.anxiety < 0.5


class TestEmotionalImpacts:
    """Test applying emotional impacts"""

    def test_apply_positive_impact(self):
        """Test applying positive morale impact"""
        matrix = EmotionMatrix()
        initial_morale = matrix.current_state.morale
        matrix.apply_emotional_impact(
            "evt_001",
            "victory",
            morale_delta=0.3,
            confidence_delta=0.2,
            anxiety_delta=-0.2,
            excitement_delta=0.3,
        )
        assert matrix.current_state.morale > initial_morale

    def test_apply_negative_impact(self):
        """Test applying negative morale impact"""
        matrix = EmotionMatrix()
        initial_morale = matrix.current_state.morale
        matrix.apply_emotional_impact(
            "evt_002",
            "loss",
            morale_delta=-0.4,
            confidence_delta=-0.3,
            anxiety_delta=0.5,
            excitement_delta=-0.2,
        )
        assert matrix.current_state.morale < initial_morale

    def test_impact_recorded(self):
        """Test impacts are recorded"""
        matrix = EmotionMatrix()
        impact_id = matrix.apply_emotional_impact(
            "evt_003",
            "test",
            morale_delta=0.1,
            confidence_delta=0.0,
            anxiety_delta=0.0,
            excitement_delta=0.0,
        )
        assert impact_id in matrix.impacts


class TestEmotionalCascades:
    """Test emotional cascades through fleet"""

    def test_anxiety_triggers_cascade(self):
        """Test high anxiety triggers cascades"""
        matrix = EmotionMatrix()
        matrix.apply_emotional_impact(
            "evt_001",
            "threat",
            morale_delta=-0.2,
            confidence_delta=-0.2,
            anxiety_delta=0.5,
            excitement_delta=-0.3,
            affected_ships=["A", "B", "C"],
        )
        # Should trigger cascades due to high anxiety
        assert len(matrix.emotional_cascade_events) > 0

    def test_cascade_events_tracked(self):
        """Test cascade events are tracked"""
        matrix = EmotionMatrix()
        initial_cascades = len(matrix.emotional_cascade_events)
        matrix.apply_emotional_impact(
            "evt_002",
            "disaster",
            morale_delta=-0.5,
            confidence_delta=0.0,
            anxiety_delta=0.6,
            excitement_delta=-0.3,
        )
        assert len(matrix.emotional_cascade_events) >= initial_cascades


class TestReadinessCalculation:
    """Test federation readiness calculations"""

    def test_high_readiness(self):
        """Test high readiness with positive emotions"""
        matrix = EmotionMatrix()
        # Push emotions positive
        matrix.apply_emotional_impact(
            "evt_001",
            "victory",
            morale_delta=0.4,
            confidence_delta=0.3,
            anxiety_delta=-0.3,
            excitement_delta=0.3,
        )
        readiness = matrix.get_federation_readiness()
        assert readiness > 0.6

    def test_low_readiness(self):
        """Test low readiness with negative emotions"""
        matrix = EmotionMatrix()
        matrix.apply_emotional_impact(
            "evt_002",
            "crisis",
            morale_delta=-0.5,
            confidence_delta=-0.4,
            anxiety_delta=0.5,
            excitement_delta=-0.3,
        )
        readiness = matrix.get_federation_readiness()
        assert readiness < 0.5

    def test_readiness_in_range(self):
        """Test readiness is always valid range"""
        matrix = EmotionMatrix()
        for _ in range(10):
            matrix.apply_emotional_impact(
                f"evt_{_}",
                "test",
                morale_delta=-0.2,
                confidence_delta=0.3,
                anxiety_delta=-0.1,
                excitement_delta=0.2,
            )
        readiness = matrix.get_federation_readiness()
        assert 0.0 <= readiness <= 1.0


class TestDecisionQuality:
    """Test decision quality based on emotions"""

    def test_decision_quality_high(self):
        """Test high quality decisions with confidence"""
        matrix = EmotionMatrix()
        matrix.apply_emotional_impact(
            "evt_001",
            "success",
            morale_delta=0.3,
            confidence_delta=0.4,
            anxiety_delta=-0.2,
            excitement_delta=0.2,
        )
        quality = matrix.get_decision_quality()
        assert quality > 0.5

    def test_decision_quality_low(self):
        """Test low quality decisions with anxiety"""
        matrix = EmotionMatrix()
        matrix.apply_emotional_impact(
            "evt_002",
            "threat",
            morale_delta=-0.2,
            confidence_delta=-0.3,
            anxiety_delta=0.5,
            excitement_delta=-0.2,
        )
        quality = matrix.get_decision_quality()
        assert quality < 0.6


class TestMoraleStatus:
    """Test morale status reporting"""

    def test_morale_excellent(self):
        """Test excellent morale status"""
        matrix = EmotionMatrix()
        matrix.current_state.morale = 0.8
        assert matrix.get_flag_ship_morale() == "EXCELLENT"

    def test_morale_critical(self):
        """Test critical morale status"""
        matrix = EmotionMatrix()
        matrix.current_state.morale = -0.5
        assert matrix.get_flag_ship_morale() == "CRITICAL"

    def test_morale_neutral(self):
        """Test neutral morale status"""
        matrix = EmotionMatrix()
        matrix.current_state.morale = 0.2
        assert matrix.get_flag_ship_morale() == "NEUTRAL"


class TestCrisisResponse:
    """Test fleet response to crises"""

    def test_panic_response(self):
        """Test panic response in crisis"""
        matrix = EmotionMatrix()
        matrix.current_state.morale = -0.2
        matrix.current_state.confidence = 0.2
        response = matrix.response_to_crisis("attack")
        assert response["response_mode"] == "PANIC"

    def test_bold_response(self):
        """Test bold response when confident"""
        matrix = EmotionMatrix()
        matrix.current_state.confidence = 0.8
        matrix.current_state.morale = 0.7
        response = matrix.response_to_crisis("opportunity")
        assert response["response_mode"] == "BOLD"

    def test_defensive_response(self):
        """Test defensive response when anxious"""
        matrix = EmotionMatrix()
        matrix.current_state.anxiety = 0.8
        response = matrix.response_to_crisis("unknown_threat")
        assert response["response_mode"] == "DEFENSIVE"


class TestEmotionalHealing:
    """Test emotional healing mechanics"""

    def test_healing_improves_morale(self):
        """Test healing improves morale"""
        matrix = EmotionMatrix()
        matrix.current_state.morale = 0.1
        matrix.current_state.anxiety = 0.8
        result = matrix.emotional_healing(0.2)
        assert result["new_morale"] > 0.1
        assert result["new_anxiety"] < 0.8

    def test_healing_factor_applied(self):
        """Test healing factor is applied proportionally"""
        matrix = EmotionMatrix()
        matrix.current_state.morale = 0.0
        result1 = matrix.emotional_healing(0.1)
        matrix.current_state.morale = 0.0
        result2 = matrix.emotional_healing(0.2)
        # Larger healing factor should yield bigger improvement
        assert result2["new_morale"] > result1["new_morale"]


class TestEmotionalStatus:
    """Test emotional status reporting"""

    def test_get_status(self):
        """Test getting emotional status"""
        matrix = EmotionMatrix()
        matrix.apply_emotional_impact("evt", "test", 0.1, 0.0, 0.0, 0.0)
        status = matrix.get_emotional_status()
        assert "morale" in status
        assert "readiness" in status
        assert "decision_quality" in status
        assert "morale_status" in status

    def test_status_has_history(self):
        """Test status includes historical data"""
        matrix = EmotionMatrix()
        matrix.apply_emotional_impact("evt1", "test1", 0.1, 0.0, 0.0, 0.0)
        matrix.apply_emotional_impact("evt2", "test2", -0.1, 0.0, 0.0, 0.0)
        status = matrix.get_emotional_status()
        assert "average_morale" in status
        assert status["average_morale"] is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
