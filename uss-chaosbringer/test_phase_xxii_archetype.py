#!/usr/bin/env python3
"""
PHASE XXII - ARCHETYPE ENGINE TESTS
Comprehensive test suite for mythic self-models (12 tests)
"""

import pytest
from datetime import datetime

from archetype_engine import (
    ArchetypeEngine,
    ArchetypeType,
    Archetype,
)


class TestArchetypeInitialization:
    """Test archetype engine initialization"""

    def test_initialize(self):
        """Test engine initializes with base archetypes"""
        engine = ArchetypeEngine()
        assert len(engine.archetypes) >= 4
        assert engine.narrative_coherence > 0.0

    def test_archetypes_created(self):
        """Test foundational archetypes are created"""
        engine = ArchetypeEngine()
        assert any(a.archetype_type == ArchetypeType.NAVIGATOR for a in engine.archetypes.values())
        assert any(a.archetype_type == ArchetypeType.SENTINEL for a in engine.archetypes.values())


class TestAlignmentMeasurement:
    """Test measuring system alignment with archetypes"""

    def test_measure_alignment(self):
        """Test measuring system alignment"""
        engine = ArchetypeEngine()
        alignment_id = engine.measure_system_alignment(
            "orchestration_brain",
            ArchetypeType.NAVIGATOR,
            0.8,
        )
        assert alignment_id is not None

    def test_alignment_strength_clamped(self):
        """Test alignment strength is clamped 0-1"""
        engine = ArchetypeEngine()
        engine.measure_system_alignment("test_system", ArchetypeType.NAVIGATOR, 1.5)
        alignment = engine.alignments["navigator"][0]
        assert alignment.alignment_strength <= 1.0


class TestImbalanceDetection:
    """Test detecting archetypal imbalance"""

    def test_detect_balance(self):
        """Test detecting balanced federation"""
        engine = ArchetypeEngine()
        result = engine.detect_archetypal_imbalance()
        assert "balanced" in result
        assert "imbalances" in result

    def test_detect_over_emphasis(self):
        """Test detecting over-emphasis on archetype"""
        engine = ArchetypeEngine()
        # Add strong alignment to one archetype
        engine.measure_system_alignment("sys1", ArchetypeType.NAVIGATOR, 0.9)
        engine.measure_system_alignment("sys2", ArchetypeType.NAVIGATOR, 0.95)
        result = engine.detect_archetypal_imbalance()
        assert result["mythic_balance_score"] <= 1.0


class TestNarrativeRewriting:
    """Test rewriting narrative to restore balance"""

    def test_rewrite_narrative(self):
        """Test narrative arc rewriting"""
        engine = ArchetypeEngine()
        result = engine.rewrite_narrative_arc("under-emphasis_trickster")
        assert "narrative_adjustments" in result
        assert len(result["narrative_adjustments"]) > 0

    def test_coherence_improves(self):
        """Test narrative coherence improves after rewrite"""
        engine = ArchetypeEngine()
        initial_coherence = engine.narrative_coherence
        engine.rewrite_narrative_arc("test_imbalance")
        assert engine.narrative_coherence >= initial_coherence


class TestReport:
    """Test report generation"""

    def test_get_archetype_report(self):
        """Test getting archetype report"""
        engine = ArchetypeEngine()
        report = engine.get_federation_archetype_report()
        assert "active_archetypes" in report
        assert "narrative_coherence" in report
        assert "archetype_details" in report

    def test_report_completeness(self):
        """Test report includes all archetype details"""
        engine = ArchetypeEngine()
        report = engine.get_federation_archetype_report()
        for name, details in report["archetype_details"].items():
            assert "type" in details
            assert "description" in details
            assert "qualities" in details


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
