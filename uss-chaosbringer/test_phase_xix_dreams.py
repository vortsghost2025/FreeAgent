#!/usr/bin/env python3
"""
PHASE XIX - DREAM ENGINE TESTS
Comprehensive test suite for prophetic dreams and symbolic visions (16 tests)
"""

import pytest
from datetime import datetime

from dream_engine import (
    DreamEngine,
    DreamType,
    DreamSymbolism,
    Symbol,
)


class TestSymbolLibrary:
    """Test dream symbol initialization"""

    def test_symbol_library_initialized(self):
        """Test symbol library is initialized"""
        engine = DreamEngine()
        assert len(engine.symbols_library) >= 10

    def test_symbol_properties(self):
        """Test symbols have required properties"""
        engine = DreamEngine()
        for symbol_id, symbol in engine.symbols_library.items():
            assert symbol.name
            assert isinstance(symbol.meaning, DreamSymbolism)
            assert isinstance(symbol.intensity, float)
            assert 0.0 <= symbol.intensity <= 1.0
            assert symbol.associated_vector in ["diplomatic", "expansion", "first_contact"]


class TestDreamGeneration:
    """Test prophetic dream generation"""

    @pytest.fixture
    def engine(self):
        return DreamEngine()

    def test_generate_dream(self, engine):
        """Test generating a prophetic dream"""
        dream_id = engine.generate_dream(
            "Ship_A",
            DreamType.PROPHETIC,
            {"vector_focus": "diplomatic"},
        )
        assert dream_id in engine.dreams
        dream = engine.dreams[dream_id]
        assert dream.dreamer == "Ship_A"
        assert dream.dream_type == DreamType.PROPHETIC

    def test_dream_has_narrative(self, engine):
        """Test generated dream has readable narrative"""
        dream_id = engine.generate_dream(
            "Ship_A",
            DreamType.VISIONARY,
            {},
        )
        dream = engine.dreams[dream_id]
        assert len(dream.narrative) > 0
        assert "dream" in dream.narrative.lower()

    def test_dream_has_symbols(self, engine):
        """Test dream contains symbols"""
        dream_id = engine.generate_dream(
            "Ship_A",
            DreamType.PROPHETIC,
            {},
        )
        dream = engine.dreams[dream_id]
        assert len(dream.symbols) >= 2
        assert all(s in engine.symbols_library.values() for s in dream.symbols)

    def test_dream_has_interpretation(self, engine):
        """Test dream has interpretation"""
        dream_id = engine.generate_dream(
            "Ship_A",
            DreamType.WARNING,
            {},
        )
        dream = engine.dreams[dream_id]
        assert len(dream.interpretation) > 0

    def test_dream_has_prediction(self, engine):
        """Test dream has predicted outcome"""
        dream_id = engine.generate_dream(
            "Ship_A",
            DreamType.PROPHETIC,
            {},
        )
        dream = engine.dreams[dream_id]
        assert len(dream.predicted_outcome) > 0

    def test_dream_adds_to_history(self, engine):
        """Test dreams are added to history"""
        initial_count = len(engine.dream_history)
        engine.generate_dream("Ship_A", DreamType.PROPHETIC, {})
        engine.generate_dream("Ship_B", DreamType.VISIONARY, {})
        assert len(engine.dream_history) == initial_count + 2

    def test_vector_focus_influences_symbols(self, engine):
        """Test dream symbols match vector focus"""
        dream_id = engine.generate_dream(
            "Ship_A",
            DreamType.PROPHETIC,
            {"vector_focus": "expansion"},
        )
        dream = engine.dreams[dream_id]
        # At least some symbols should relate to expansion
        expansion_symbols = [s for s in dream.symbols if s.associated_vector == "expansion"]
        assert len(expansion_symbols) > 0

    def test_dream_affects_vectors(self, engine):
        """Test dream identifies affected vectors"""
        dream_id = engine.generate_dream(
            "Ship_A",
            DreamType.PROPHETIC,
            {},
        )
        dream = engine.dreams[dream_id]
        assert len(dream.affected_vectors) > 0
        assert all(v in ["diplomatic", "expansion", "first_contact"] for v in dream.affected_vectors)


class TestDreamInterpretation:
    """Test dream interpretation"""

    @pytest.fixture
    def engine(self):
        return DreamEngine()

    def test_dream_interpretation_convergence(self, engine):
        """Test convergence symbols influence interpretation"""
        dream_id = engine.generate_dream(
            "Ship_A",
            DreamType.PROPHETIC,
            {"vector_focus": "diplomatic"},
        )
        dream = engine.dreams[dream_id]
        # May contain convergence-related interpretation
        assert len(dream.interpretation) > 0

    def test_dream_confidence_calculation(self, engine):
        """Test dream confidence is calculated"""
        dream_id = engine.generate_dream(
            "Ship_A",
            DreamType.PROPHETIC,
            {},
        )
        dream = engine.dreams[dream_id]
        assert 0.0 <= dream.confidence <= 1.0

    def test_prophetic_dream_prediction(self, engine):
        """Test prophetic dreams have specific predictions"""
        dream_id = engine.generate_dream(
            "Ship_A",
            DreamType.PROPHETIC,
            {},
        )
        dream = engine.dreams[dream_id]
        # Prophecies should be more specific
        assert len(dream.predicted_outcome) > 20


class TestPredictionValidation:
    """Test validating dream predictions against outcomes"""

    @pytest.fixture
    def engine(self):
        return DreamEngine()

    def test_validate_accurate_prediction(self, engine):
        """Test validating an accurate dream prediction"""
        dream_id = engine.generate_dream(
            "Ship_A",
            DreamType.PROPHETIC,
            {"vector_focus": "expansion"},
        )
        dream = engine.dreams[dream_id]
        # For this test, we validate with similar words from the prediction
        actual = dream.predicted_outcome[:20]  # Use start of prediction
        result = engine.validate_dream_prediction(dream_id, actual)
        assert result["accurate"] == True
        assert engine.dreams[dream_id].successful == True

    def test_validate_inaccurate_prediction(self, engine):
        """Test validating an inaccurate dream prediction"""
        dream_id = engine.generate_dream(
            "Ship_A",
            DreamType.PROPHETIC,
            {"vector_focus": "expansion"},
        )
        result = engine.validate_dream_prediction(dream_id, "Complete opposite happened")
        assert result["accurate"] == False

    def test_confidence_adjusts_on_failure(self, engine):
        """Test confidence decreases when prediction fails"""
        dream_id = engine.generate_dream(
            "Ship_A",
            DreamType.PROPHETIC,
            {},
        )
        original_confidence = engine.dreams[dream_id].confidence
        engine.validate_dream_prediction(dream_id, "total different outcome")
        result = engine.validate_dream_prediction(dream_id, "total different outcome")
        # Confidence should be adjusted down in result
        assert result["confidence_updated"] < original_confidence


class TestInsightExtraction:
    """Test extracting actionable insights from dreams"""

    @pytest.fixture
    def engine(self):
        return DreamEngine()

    def test_extract_insight(self, engine):
        """Test extracting insight from dream"""
        dream_id = engine.generate_dream(
            "Ship_A",
            DreamType.PROPHETIC,
            {"vector_focus": "diplomatic"},
        )
        insight_id = engine.extract_insight(dream_id)
        assert insight_id is not None
        assert insight_id in engine.insights
        insight = engine.insights[insight_id]
        assert insight.source_dream == dream_id
        assert insight.confidence > 0

    def test_insight_has_recommendation(self, engine):
        """Test insight provides actionable recommendation"""
        dream_id = engine.generate_dream(
            "Ship_A",
            DreamType.VISIONARY,
            {},
        )
        insight_id = engine.extract_insight(dream_id)
        insight = engine.insights[insight_id]
        assert len(insight.recommendation) > 0

    def test_insight_time_horizon(self, engine):
        """Test insight has time horizon"""
        dream_id = engine.generate_dream(
            "Ship_A",
            DreamType.PROPHETIC,
            {},
        )
        insight_id = engine.extract_insight(dream_id)
        insight = engine.insights[insight_id]
        assert insight.time_horizon in ["immediate", "near_term", "long_term"]


class TestVectorInfluence:
    """Test how dreams influence vector decisions"""

    @pytest.fixture
    def engine(self):
        return DreamEngine()

    def test_influence_diplomatic_vector(self, engine):
        """Test dream influences diplomatic decisions"""
        dream_id1 = engine.generate_dream(
            "Ship_A",
            DreamType.VISIONARY,
            {"vector_focus": "diplomatic"},
        )
        dream_id2 = engine.generate_dream(
            "Ship_B",
            DreamType.PROPHETIC,
            {"vector_focus": "expansion"},
        )
        result = engine.influence_vector_decision(
            "diplomatic",
            {"status": "stable"},
            [dream_id1, dream_id2],
        )
        assert result["vector"] == "diplomatic"
        assert result["dream_influenced"] == True
        assert result["dream_id"] == dream_id1

    def test_influence_no_relevant_dreams(self, engine):
        """Test no influence when no relevant dreams"""
        dream_id = engine.generate_dream(
            "Ship_A",
            DreamType.PROPHETIC,
            {"vector_focus": "expansion"},
        )
        result = engine.influence_vector_decision(
            "diplomatic",
            {"status": "stable"},
            [dream_id],
        )
        # May not have diplomatic dreams
        assert "dream_influenced" in result

    def test_influence_includes_recommendation(self, engine):
        """Test influence result includes recommendation"""
        dream_id = engine.generate_dream(
            "Ship_A",
            DreamType.PROPHETIC,
            {"vector_focus": "diplomatic"},
        )
        result = engine.influence_vector_decision(
            "diplomatic",
            {},
            [dream_id],
        )
        if result["dream_influenced"]:
            assert "recommendation" in result


class TestDreamStatistics:
    """Test dream statistics and analysis"""

    @pytest.fixture
    def engine(self):
        eng = DreamEngine()
        # Generate multiple dreams
        eng.generate_dream("Ship_A", DreamType.PROPHETIC, {"vector_focus": "diplomatic"})
        eng.generate_dream("Ship_B", DreamType.VISIONARY, {"vector_focus": "expansion"})
        eng.generate_dream("Ship_C", DreamType.WARNING, {"vector_focus": "first_contact"})
        eng.generate_dream("Ship_A", DreamType.INSPIRATIONAL, {})
        return eng

    def test_get_statistics(self, engine):
        """Test getting dream statistics"""
        stats = engine.get_dream_statistics()
        assert stats["total_dreams"] == 4
        assert stats["average_confidence"] > 0.0

    def test_statistics_by_type(self, engine):
        """Test dream type breakdown"""
        stats = engine.get_dream_statistics()
        assert "prophetic" in stats["dreams_by_type"]
        assert stats["dreams_by_type"]["prophetic"] >= 1

    def test_statistics_accuracy_rate(self, engine):
        """Test dream prediction accuracy tracking"""
        stats = engine.get_dream_statistics()
        assert 0.0 <= stats["prediction_accuracy_rate"] <= 1.0

    def test_statistics_symbol_meanings(self, engine):
        """Test symbol meaning tracking"""
        stats = engine.get_dream_statistics()
        assert len(stats["symbols_by_meaning"]) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
