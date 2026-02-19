#!/usr/bin/env python3
"""
PHASE XXI - CAPTAIN'S CHAIR AI TESTS
Comprehensive test suite for meta-layer AI synthesis (12 tests)
"""

import pytest

from captain_chair_ai import CaptainChairAI, ConfidenceLevel


class TestAIInitialization:
    """Test Captain's Chair AI initialization"""

    def test_initialize(self):
        """Test AI initializes correctly"""
        ai = CaptainChairAI()
        assert len(ai.system_inputs) == 0
        assert len(ai.recommendations) == 0
        assert len(ai.decision_history) == 0

    def test_system_weights_defined(self):
        """Test all system weights are configured"""
        ai = CaptainChairAI()
        assert len(ai.system_weights) >= 5
        assert "orchestration_brain" in ai.system_weights
        assert "constitution_engine" in ai.system_weights


class TestSignalIngestion:
    """Test ingesting signals from federation systems"""

    def test_ingest_signal(self):
        """Test ingesting a signal from a system"""
        ai = CaptainChairAI()
        signal_id = ai.ingest_system_signal(
            "orchestration_brain",
            "strategic_assessment",
            {"confidence": 0.8, "vector": "diplomatic"},
            confidence=0.8,
            priority=8,
        )
        assert signal_id is not None
        assert len(ai.system_inputs) == 1

    def test_multiple_signals(self):
        """Test ingesting multiple signals"""
        ai = CaptainChairAI()
        ai.ingest_system_signal("system1", "type1", {}, 0.8)
        ai.ingest_system_signal("system2", "type2", {}, 0.7)
        ai.ingest_system_signal("system3", "type3", {}, 0.9)
        assert len(ai.system_inputs) == 3

    def test_signal_has_metadata(self):
        """Test signals retain all metadata"""
        ai = CaptainChairAI()
        ai.ingest_system_signal(
            "test_system",
            "test_type",
            {"test_data": "value"},
            confidence=0.75,
            priority=6,
        )
        signal = ai.system_inputs[0]
        assert signal.system_name == "test_system"
        assert signal.confidence == 0.75


class TestRecommendationSynthesis:
    """Test synthesizing recommendations from signals"""

    def test_synthesize_recommendation(self):
        """Test synthesizing recommendation from signals"""
        ai = CaptainChairAI()
        ai.ingest_system_signal(
            "orchestration_brain",
            "decision",
            {"confidence": 0.8, "vector": "diplomatic"},
            0.8,
            priority=8,
        )
        rec_id = ai.synthesize_recommendation()
        assert rec_id is not None
        assert rec_id in ai.recommendations

    def test_recommendation_structure(self):
        """Test recommendation has all required fields"""
        ai = CaptainChairAI()
        ai.ingest_system_signal(
            "dream_engine",
            "prophecy",
            {"predicted_outcome": "Unity will be achieved"},
            0.7,
            priority=7,
        )
        rec_id = ai.synthesize_recommendation()
        rec = ai.recommendations[rec_id]
        assert rec.title
        assert rec.description
        assert rec.recommended_action
        assert len(rec.reasoning) > 0

    def test_confidence_calculation(self):
        """Test weighted confidence is calculated"""
        ai = CaptainChairAI()
        ai.ingest_system_signal(
            "constitution_engine",
            "legal_review",
            {"valid": True},
            confidence=0.9,
            priority=9,
        )
        rec_id = ai.synthesize_recommendation()
        rec = ai.recommendations[rec_id]
        assert isinstance(rec.confidence_level, ConfidenceLevel)

    def test_systems_consulted_recorded(self):
        """Test which systems were consulted is recorded"""
        ai = CaptainChairAI()
        ai.ingest_system_signal("system1", "type1", {}, 0.8)
        ai.ingest_system_signal("system2", "type2", {}, 0.7)
        rec_id = ai.synthesize_recommendation()
        rec = ai.recommendations[rec_id]
        assert len(rec.systems_consulted) > 0


class TestConfidenceClassification:
    """Test confidence level classification"""

    def test_critical_confidence(self):
        """Test low confidence marked as critical"""
        ai = CaptainChairAI()
        ai.ingest_system_signal("sys", "type", {}, confidence=0.35)
        rec_id = ai.synthesize_recommendation()
        rec = ai.recommendations[rec_id]
        assert rec.confidence_level == ConfidenceLevel.CRITICAL

    def test_very_high_confidence(self):
        """Test high confidence marked correctly"""
        ai = CaptainChairAI()
        ai.ingest_system_signal("sys", "type", {}, confidence=0.95)
        rec_id = ai.synthesize_recommendation()
        rec = ai.recommendations[rec_id]
        assert rec.confidence_level == ConfidenceLevel.VERY_HIGH

    def test_moderate_confidence(self):
        """Test moderate confidence classification"""
        ai = CaptainChairAI()
        ai.ingest_system_signal("sys", "type", {}, confidence=0.7)
        rec_id = ai.synthesize_recommendation()
        rec = ai.recommendations[rec_id]
        assert rec.confidence_level in [ConfidenceLevel.MODERATE, ConfidenceLevel.HIGH]


class TestRecommendationQuality:
    """Test quality of generated recommendations"""

    def test_recommendation_has_alternatives(self):
        """Test recommendation suggests alternatives"""
        ai = CaptainChairAI()
        ai.ingest_system_signal(
            "orchestration_brain",
            "expansion_opportunity",
            {"vector": "expansion"},
            0.8,
            priority=7,
        )
        rec_id = ai.synthesize_recommendation()
        rec = ai.recommendations[rec_id]
        assert len(rec.alternatives) > 0

    def test_recommendation_has_risks(self):
        """Test recommendation identifies risks"""
        ai = CaptainChairAI()
        ai.ingest_system_signal(
            "first_contact_engine",
            "threat_detected",
            {"threat_level": 0.8},
            0.8,
            priority=9,
        )
        rec_id = ai.synthesize_recommendation()
        rec = ai.recommendations[rec_id]
        assert len(rec.potential_risks) > 0

    def test_recommendation_has_benefits(self):
        """Test recommendation identifies benefits"""
        ai = CaptainChairAI()
        ai.ingest_system_signal(
            "orchestration_brain",
            "growth_opportunity",
            {"vector": "expansion"},
            0.75,
            priority=6,
        )
        rec_id = ai.synthesize_recommendation()
        rec = ai.recommendations[rec_id]
        assert len(rec.potential_benefits) > 0


class TestCaptainBriefing:
    """Test captain briefing generation"""

    def test_get_briefing(self):
        """Test getting captain briefing"""
        ai = CaptainChairAI()
        ai.ingest_system_signal("sys1", "type1", {}, 0.8)
        ai.synthesize_recommendation()
        briefing = ai.get_captain_briefing()
        assert "latest_recommendation" in briefing
        assert "active_recommendations" in briefing

    def test_briefing_has_recommendations(self):
        """Test briefing includes recommendations"""
        ai = CaptainChairAI()
        ai.ingest_system_signal("sys1", "type1", {}, 0.8)
        rec_id = ai.synthesize_recommendation()
        briefing = ai.get_captain_briefing()
        assert briefing["latest_recommendation"]["id"] == rec_id

    def test_briefing_summary_stats(self):
        """Test briefing includes summary stats"""
        ai = CaptainChairAI()
        ai.ingest_system_signal("sys1", "type1", {}, 0.8)
        ai.ingest_system_signal("sys2", "type2", {}, 0.7)
        briefing = ai.get_captain_briefing()
        assert briefing["total_signals_ingested"] == 2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
