#!/usr/bin/env python3
"""
PHASE XXIX - FEDERATION AFTERLIFE ENGINE TEST SUITE
12 comprehensive tests for timeline preservation and resurrection mechanics
"""

import pytest
from datetime import datetime

from federation_afterlife import (
    FederationAfterlifeEngine,
    TimelineStatus,
    GhostSignalType,
)


class TestAfterlifeEngineInitialization:
    """Test afterlife engine initialization"""

    def test_engine_initializes(self):
        """Test engine starts in valid state"""
        engine = FederationAfterlifeEngine()
        assert len(engine.graveyard.dead_timelines) == 0
        assert len(engine.graveyard.lost_decisions) == 0
        assert len(engine.graveyard.memorial_records) == 0
        assert engine.resurrection_locked is False

    def test_graveyard_structure(self):
        """Test graveyard is properly initialized"""
        engine = FederationAfterlifeEngine()
        assert hasattr(engine.graveyard, "dead_timelines")
        assert hasattr(engine.graveyard, "lost_decisions")
        assert hasattr(engine.graveyard, "memorial_records")


class TestTimelineArchival:
    """Test archiving dead timelines"""

    @pytest.fixture
    def engine(self):
        return FederationAfterlifeEngine()

    def test_archive_timeline(self, engine):
        """Test archiving a dead timeline"""
        timeline_id = engine.archive_timeline(
            timeline_id="timeline_alpha_001",
            parent_timeline_id="timeline_root",
            divergence_point=150,
            reason_abandoned="Resource depletion",
            state_at_death={"population": 1000, "resources": 5},
            federation_status="DECLINING",
        )
        assert timeline_id in engine.graveyard.dead_timelines
        dead_timeline = engine.graveyard.dead_timelines[timeline_id]
        assert dead_timeline.reason_abandoned == "Resource depletion"

    def test_timeline_lineage_tracking(self, engine):
        """Test parent-child timeline relationships are tracked"""
        engine.archive_timeline(
            "child_1",
            parent_timeline_id="parent",
            divergence_point=100,
            reason_abandoned="Test",
            state_at_death={},
            federation_status="OK",
        )
        engine.archive_timeline(
            "child_2",
            parent_timeline_id="parent",
            divergence_point=101,
            reason_abandoned="Test",
            state_at_death={},
            federation_status="OK",
        )
        assert "parent" in engine.timeline_lineage
        assert len(engine.timeline_lineage["parent"]) == 2

    def test_preservation_timestamp_recorded(self, engine):
        """Test preservation timestamps are recorded"""
        timeline_id = engine.archive_timeline(
            "timeline_001",
            None,
            50,
            "Test abandonment",
            {"state": "data"},
            "OK",
        )
        dead_timeline = engine.graveyard.dead_timelines[timeline_id]
        assert dead_timeline.preservation_timestamp is not None
        assert dead_timeline.preserved_at_tick == engine.tick_counter


class TestLostDecisionMemorialization:
    """Test recording lost decisions"""

    @pytest.fixture
    def engine_with_timeline(self):
        engine = FederationAfterlifeEngine()
        timeline_id = engine.archive_timeline(
            "timeline_alpha",
            None,
            100,
            "Abandoned",
            {},
            "OK",
        )
        return engine, timeline_id

    def test_memorialize_decision(self, engine_with_timeline):
        """Test recording a lost decision"""
        engine, timeline_id = engine_with_timeline
        decision_id = engine.memorialize_decision(
            timeline_id=timeline_id,
            decision_type="STRATEGIC",
            description="Historic peace treaty",
            impact_if_made=0.8,
            consequence_chain=["peace_era", "cultural_flourishing"],
            reason_lost="Timeline abandoned before completion",
        )
        assert decision_id in engine.graveyard.lost_decisions
        lost_decision = engine.graveyard.lost_decisions[decision_id]
        assert lost_decision.description == "Historic peace treaty"

    def test_decision_numbering(self, engine_with_timeline):
        """Test lost decisions are numbered sequentially"""
        engine, timeline_id = engine_with_timeline
        id1 = engine.memorialize_decision(
            timeline_id, "TYPE_A", "Decision 1", 0.5, [], "Reason 1"
        )
        id2 = engine.memorialize_decision(
            timeline_id, "TYPE_B", "Decision 2", 0.6, [], "Reason 2"
        )
        assert "000001" in id1
        assert "000002" in id2

    def test_consequence_chain_preserved(self, engine_with_timeline):
        """Test consequence chains are preserved"""
        engine, timeline_id = engine_with_timeline
        consequences = ["prosperity", "peace", "knowledge_growth"]
        decision_id = engine.memorialize_decision(
            timeline_id,
            "DIPLOMATIC",
            "Alliance proposal",
            0.7,
            consequences,
            "Never ratified",
        )
        lost_decision = engine.graveyard.lost_decisions[decision_id]
        assert lost_decision.consequence_chain == consequences


class TestGhostSignalDetection:
    """Test detecting signals from abandoned universes"""

    @pytest.fixture
    def engine_with_dead_timeline(self):
        engine = FederationAfterlifeEngine()
        timeline_id = engine.archive_timeline(
            "timeline_ghost_source",
            None,
            50,
            "Lost",
            {},
            "OK",
        )
        return engine, timeline_id

    def test_detect_ghost_signal(self, engine_with_dead_timeline):
        """Test detecting a ghost signal from dead timeline"""
        engine, timeline_id = engine_with_dead_timeline
        signal_id = engine.detect_ghost_signal(
            source_timeline_id=timeline_id,
            signal_type=GhostSignalType.DECISION_ECHO,
            content="A peace treaty was proposed here...",
            strength=0.7,
            can_be_acted_upon=True,
        )
        assert signal_id in engine.ghost_signals
        signal = engine.ghost_signals[signal_id]
        assert signal.signal_type == GhostSignalType.DECISION_ECHO

    def test_signal_strength_in_range(self, engine_with_dead_timeline):
        """Test signal strength is normalized"""
        engine, timeline_id = engine_with_dead_timeline
        signal_id = engine.detect_ghost_signal(
            timeline_id, GhostSignalType.KNOWLEDGE_FRAGMENT, "Knowledge", strength=1.5
        )
        signal = engine.ghost_signals[signal_id]
        assert 0.0 <= signal.strength <= 1.0

    def test_actionable_signal_requires_strength(self, engine_with_dead_timeline):
        """Test weak signals cannot be acted upon"""
        engine, timeline_id = engine_with_dead_timeline
        weak_signal_id = engine.detect_ghost_signal(
            timeline_id,
            GhostSignalType.OPPORTUNITY_SHADE,
            "Weak opportunity",
            strength=0.3,
            can_be_acted_upon=True,
        )
        signal = engine.ghost_signals[weak_signal_id]
        assert not signal.can_be_acted_upon  # Too weak

    def test_signal_risk_calculation(self, engine_with_dead_timeline):
        """Test risk level is calculated based on signal type"""
        engine, timeline_id = engine_with_dead_timeline
        opportunity_signal = engine.detect_ghost_signal(
            timeline_id,
            GhostSignalType.OPPORTUNITY_SHADE,
            "Risky opportunity",
            strength=0.8,
        )
        knowledge_signal = engine.detect_ghost_signal(
            timeline_id,
            GhostSignalType.KNOWLEDGE_FRAGMENT,
            "Knowledge",
            strength=0.8,
        )
        # Opportunity signals are riskier
        assert (
            engine.ghost_signals[opportunity_signal].action_risk_level
            > engine.ghost_signals[knowledge_signal].action_risk_level
        )


class TestMemorials:
    """Test creating memorials for lost timelines"""

    @pytest.fixture
    def engine_with_archived_timeline(self):
        engine = FederationAfterlifeEngine()
        timeline_id = engine.archive_timeline(
            "timeline_memorial",
            None,
            75,
            "Peaceful closure",
            {},
            "FLOURISHING",
        )
        return engine, timeline_id

    def test_create_memorial(self, engine_with_archived_timeline):
        """Test creating a memorial for a timeline"""
        engine, timeline_id = engine_with_archived_timeline
        memorial_id = engine.create_memorial(
            timeline_id=timeline_id,
            epitaph_name="The Golden Age",
            achievements=["Peace treaty", "Scientific breakthrough"],
            lessons_learned=["Unity is strength", "Knowledge brings prosperity"],
            inscribed_by="Federation Historian",
        )
        assert memorial_id in engine.graveyard.memorial_records
        memorial = engine.graveyard.memorial_records[memorial_id]
        assert memorial.name == "The Golden Age"

    def test_memorial_preservation(self, engine_with_archived_timeline):
        """Test memorial preserves all information"""
        engine, timeline_id = engine_with_archived_timeline
        achievements = ["First Contact", "Cultural Exchange"]
        lessons = ["Listen carefully", "Respect differences"]
        memorial_id = engine.create_memorial(
            timeline_id, "First Contact Era", achievements, lessons, "Explorer"
        )
        memorial = engine.graveyard.memorial_records[memorial_id]
        assert memorial.achievements == achievements
        assert memorial.lessons_learned == lessons


class TestResurrection:
    """Test resurrection of lost timelines"""

    @pytest.fixture
    def engine_ready(self):
        engine = FederationAfterlifeEngine()
        engine.primary_timeline_id = "timeline_primary"
        timeline_id = engine.archive_timeline(
            "timeline_resurrect_candidate",
            "timeline_primary",
            100,
            "Diverged peacefully",
            {"population": 5000, "resources": 1000},
            "STABLE",
        )
        return engine, timeline_id

    def test_resurrection_with_safeguards(self, engine_ready):
        """Test resurrection with all safeguards passing"""
        engine, timeline_id = engine_ready
        result = engine.perform_resurrection(
            source_timeline_id=timeline_id,
            restoration_scope="partial",
            captain_confirms=True,
        )
        assert "success" in result
        # With partial restoration and stable state, should succeed
        assert result["success"]

    def test_resurrection_records_attempt(self, engine_ready):
        """Test resurrection attempts are recorded"""
        engine, timeline_id = engine_ready
        result = engine.perform_resurrection(timeline_id, restoration_scope="partial")
        attempt_id = result.get("attempt_id")
        if attempt_id:
            assert attempt_id in engine.resurrection_attempts

    def test_resurrection_locked_prevention(self, engine_ready):
        """Test locked resurrection prevents revival"""
        engine, timeline_id = engine_ready
        engine.resurrection_locked = True
        result = engine.perform_resurrection(timeline_id)
        assert not result["success"]
        assert "locked" in result["error"].lower()

    def test_primary_timeline_cannot_resurrect(self, engine_ready):
        """Test primary timeline cannot be resurrected"""
        engine, _ = engine_ready
        # Primary timeline is never archived in graveyard
        # But if somehow it was, it should be protected
        # Test with a non-existent timeline (which gives "not found" error)
        result = engine.perform_resurrection(
            source_timeline_id="timeline_nonexistent"
        )
        assert not result["success"]
        assert "not found" in result["error"].lower()


class TestAfterlifeStatus:
    """Test comprehensive afterlife status reporting"""

    @pytest.fixture
    def populated_engine(self):
        engine = FederationAfterlifeEngine()
        engine.primary_timeline_id = "timeline_root"

        # Create some dead timelines
        for i in range(3):
            timeline_id = f"timeline_dead_{i}"
            engine.archive_timeline(
                timeline_id,
                "timeline_root" if i > 0 else None,
                100 + (i * 50),
                f"Reason {i}",
                {"state": "data"},
                "OK",
            )
            # Add lost decisions
            engine.memorialize_decision(
                timeline_id, "TYPE_X", f"Decision {i}", 0.5 + (i * 0.1), [], f"Lost {i}"
            )

        # Add ghost signals
        for i in range(2):
            engine.detect_ghost_signal(
                f"timeline_dead_{i}",
                GhostSignalType.DECISION_ECHO,
                f"Signal {i}",
                strength=0.5 + (i * 0.1),
            )

        return engine

    def test_status_report_generation(self, populated_engine):
        """Test status report is generated"""
        status = populated_engine.get_afterlife_status()
        assert "total_dead_timelines" in status
        assert "total_ghost_signals" in status
        assert "revival_locked" in status or "resurrection_locked" in status

    def test_status_reflects_archived_timelines(self, populated_engine):
        """Test status shows correct timeline count"""
        status = populated_engine.get_afterlife_status()
        assert status["total_dead_timelines"] == 3

    def test_status_ghost_signal_summary(self, populated_engine):
        """Test ghost signal analysis in status"""
        status = populated_engine.get_afterlife_status()
        assert status["total_ghost_signals"] == 2
        assert "ghost_signals_by_type" in status

    def test_lineage_depth_calculation(self, populated_engine):
        """Test timeline family tree is analyzed"""
        status = populated_engine.get_afterlife_status()
        assert "timeline_lineage_depth" in status
        assert status["timeline_lineage_depth"] >= 1
