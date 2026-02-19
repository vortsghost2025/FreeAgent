#!/usr/bin/env python3
"""
PHASE XVII - MULTIVERSE RECONCILIATION TESTS
Comprehensive test suite for timeline merging and conflict resolution (15 tests)
"""

import pytest
from datetime import datetime

from multiverse_reconciliation import (
    MultiverseReconciliationEngine,
    Timeline,
    TimelineStatus,
    ConflictType,
    MergeConflict,
)


class TestTimelineCreation:
    """Test timeline detection and creation"""

    @pytest.fixture
    def engine(self):
        return MultiverseReconciliationEngine()

    def test_detect_timeline(self, engine):
        """Test detecting and registering a new timeline"""
        timeline = engine.detect_timeline("primary", divergence_point=0)
        assert timeline.timeline_id == "primary"
        assert timeline.status == TimelineStatus.ACTIVE
        assert timeline.divergence_point == 0
        assert len(engine.timelines) == 1

    def test_create_timeline_branch(self, engine):
        """Test creating a child timeline branch"""
        engine.detect_timeline("primary", 0)
        branch = engine.create_timeline_branch("primary", divergence_point=5)
        assert branch.parent_timeline == "primary"
        assert branch.divergence_point == 5
        assert branch.status == TimelineStatus.BRANCH_PENDING
        assert len(engine.timelines) == 2

    def test_multiple_timelines(self, engine):
        """Test detecting multiple independent timelines"""
        timeline1 = engine.detect_timeline("timeline_A", 0)
        timeline2 = engine.detect_timeline("timeline_B", 3)
        timeline3 = engine.detect_timeline("timeline_C", 7)

        assert len(engine.timelines) == 3
        assert engine.timelines["timeline_A"].divergence_point == 0
        assert engine.timelines["timeline_B"].divergence_point == 3
        assert engine.timelines["timeline_C"].divergence_point == 7

    def test_timeline_duplicate_detection(self, engine):
        """Test that detecting same timeline returns existing one"""
        timeline1 = engine.detect_timeline("primary", 0)
        timeline2 = engine.detect_timeline("primary", 0)
        assert timeline1 is timeline2
        assert len(engine.timelines) == 1


class TestTimelineState:
    """Test recording and managing timeline state"""

    @pytest.fixture
    def engine(self):
        return MultiverseReconciliationEngine()

    def test_record_timeline_state(self, engine):
        """Test recording timeline state and causal events"""
        engine.detect_timeline("primary", 0)
        federation_state = {"ships": 5, "stability": 0.8}
        events = ["evt_001", "evt_002", "evt_003"]

        success = engine.record_timeline_state("primary", federation_state, events)
        assert success
        assert engine.timelines["primary"].federation_state == federation_state
        assert engine.timelines["primary"].causal_events == events
        assert engine.timelines["primary"].events_count == 3

    def test_record_invalid_timeline(self, engine):
        """Test recording state for non-existent timeline fails"""
        federation_state = {"ships": 5}
        success = engine.record_timeline_state("nonexistent", federation_state, [])
        assert not success


class TestConflictDetection:
    """Test conflict detection between timelines"""

    @pytest.fixture
    def engine(self):
        eng = MultiverseReconciliationEngine()
        eng.detect_timeline("timeline_A", 0)
        eng.detect_timeline("timeline_B", 3)
        return eng

    def test_detect_conflict_basic(self, engine):
        """Test basic conflict detection"""
        conflict_id = engine.detect_conflict(
            "timeline_A",
            "timeline_B",
            ConflictType.STATE_CONTRADICTION,
            "Test conflict",
        )
        assert conflict_id in engine.conflicts
        assert engine.conflicts[conflict_id].timeline_a == "timeline_A"
        assert engine.conflicts[conflict_id].resolved == False

    def test_conflict_severity_causality(self, engine):
        """Test causality violations are marked CRITICAL"""
        conflict_id = engine.detect_conflict(
            "timeline_A",
            "timeline_B",
            ConflictType.CAUSALITY_VIOLATION,
            "Causality broken",
        )
        assert engine.conflicts[conflict_id].severity == "CRITICAL"

    def test_conflict_severity_state_large(self, engine):
        """Test large state contradictions are CRITICAL"""
        conflict_id = engine.detect_conflict(
            "timeline_A",
            "timeline_B",
            ConflictType.STATE_CONTRADICTION,
            "Many state conflicts",
            affected_events=["e1", "e2", "e3", "e4", "e5", "e6"],
        )
        assert engine.conflicts[conflict_id].severity == "CRITICAL"

    def test_conflict_severity_state_small(self, engine):
        """Test small state contradictions are ALERT"""
        conflict_id = engine.detect_conflict(
            "timeline_A",
            "timeline_B",
            ConflictType.STATE_CONTRADICTION,
            "Single state conflict",
            affected_events=["e1"],
        )
        assert engine.conflicts[conflict_id].severity == "ALERT"

    def test_detect_causality_conflict(self, engine):
        """Test detecting causality violations in chains"""
        engine.record_timeline_state(
            "timeline_A",
            {"fleet_size": 10},
            ["A1", "A2", "A3"],
        )
        engine.record_timeline_state(
            "timeline_B",
            {"fleet_size": 5},
            ["B1", "B2", "B3"],
        )
        conflict_id = engine.detect_causality_conflict("timeline_A", "timeline_B")
        assert conflict_id is not None
        assert engine.conflicts[conflict_id].conflict_type == ConflictType.CAUSALITY_VIOLATION

    def test_detect_state_conflict(self, engine):
        """Test detecting state contradictions"""
        engine.record_timeline_state(
            "timeline_A",
            {"ships": 10, "stability": 0.8},
            ["evt_1"],
        )
        engine.record_timeline_state(
            "timeline_B",
            {"ships": 5, "stability": 0.6},
            ["evt_2"],
        )
        conflict_id = engine.detect_state_conflict("timeline_A", "timeline_B")
        assert conflict_id is not None
        assert engine.conflicts[conflict_id].conflict_type == ConflictType.STATE_CONTRADICTION


class TestConflictResolution:
    """Test conflict resolution"""

    @pytest.fixture
    def engine(self):
        eng = MultiverseReconciliationEngine()
        eng.detect_timeline("timeline_A", 0)
        eng.detect_timeline("timeline_B", 3)
        conflict_id = eng.detect_conflict(
            "timeline_A",
            "timeline_B",
            ConflictType.STATE_CONTRADICTION,
            "Test",
        )
        eng._test_conflict_id = conflict_id
        return eng

    def test_resolve_conflict_retained_a(self, engine):
        """Test resolving conflict by retaining timeline A"""
        success = engine.resolve_conflict(
            engine._test_conflict_id, "RETAINED_A"
        )
        assert success
        assert engine.conflicts[engine._test_conflict_id].resolved
        assert engine.conflicts[engine._test_conflict_id].resolution_method == "RETAINED_A"

    def test_resolve_conflict_retained_b(self, engine):
        """Test resolving conflict by retaining timeline B"""
        success = engine.resolve_conflict(
            engine._test_conflict_id, "RETAINED_B"
        )
        assert success
        assert engine.conflicts[engine._test_conflict_id].resolution_method == "RETAINED_B"

    def test_resolve_conflict_merged(self, engine):
        """Test resolving conflict by merging states"""
        success = engine.resolve_conflict(
            engine._test_conflict_id, "MERGED"
        )
        assert success
        assert engine.conflicts[engine._test_conflict_id].resolution_method == "MERGED"

    def test_resolve_conflict_branched(self, engine):
        """Test resolving conflict by keeping both branches"""
        success = engine.resolve_conflict(
            engine._test_conflict_id, "BRANCHED"
        )
        assert success
        assert engine.conflicts[engine._test_conflict_id].resolution_method == "BRANCHED"

    def test_resolve_invalid_conflict(self, engine):
        """Test resolving non-existent conflict fails"""
        success = engine.resolve_conflict("nonexistent", "RETAINED_A")
        assert not success


class TestTimelineMerge:
    """Test merging timelines"""

    @pytest.fixture
    def engine(self):
        eng = MultiverseReconciliationEngine()
        eng.detect_timeline("primary", 0)
        eng.record_timeline_state(
            "primary",
            {"ships": 10, "stability": 0.9},
            ["E1", "E2", "E3"],
        )
        eng.detect_timeline("secondary", 3)
        eng.record_timeline_state(
            "secondary",
            {"ships": 5, "stability": 0.7},
            ["E3", "E4", "E5"],
        )
        return eng

    def test_merge_timelines_basic(self, engine):
        """Test basic timeline merge"""
        result = engine.merge_timelines("primary", "secondary")
        assert result["success"]
        assert engine.timelines["secondary"].status == TimelineStatus.MERGED
        assert "primary←secondary" in engine.merge_history

    def test_merge_updates_primary_state(self, engine):
        """Test merge updates primary timeline state"""
        engine.merge_timelines("primary", "secondary")
        primary = engine.timelines["primary"]
        # Events should be merged
        assert len(primary.causal_events) >= 3
        # State should be merged (averages for numeric values)
        assert primary.federation_state["ships"] == 7.5
        assert primary.federation_state["stability"] == 0.8

    def test_merge_creates_snapshot(self, engine):
        """Test merge creates snapshot for rollback"""
        initial_snapshots = len(engine.snapshots)
        engine.merge_timelines("primary", "secondary")
        assert len(engine.snapshots) == initial_snapshots + 1

    def test_merge_invalid_timeline(self, engine):
        """Test merging with non-existent timeline fails"""
        result = engine.merge_timelines("primary", "nonexistent")
        assert not result["success"]

    def test_merge_resolves_conflicts(self, engine):
        """Test merge automatically resolves conflicts"""
        # Create a conflict
        conflict_id = engine.detect_conflict(
            "primary",
            "secondary",
            ConflictType.STATE_CONTRADICTION,
            "Test conflict",
        )
        # Merge should resolve it
        result = engine.merge_timelines("primary", "secondary")
        assert result["conflicts_resolved"] == 1
        assert engine.conflicts[conflict_id].resolved


class TestTimelineIntegrity:
    """Test timeline validation and integrity checks"""

    @pytest.fixture
    def engine(self):
        return MultiverseReconciliationEngine()

    def test_validate_timeline_valid(self, engine):
        """Test validating a healthy timeline"""
        engine.detect_timeline("timeline_A", 0)
        engine.record_timeline_state("timeline_A", {}, ["E1", "E2", "E3"])
        result = engine.validate_timeline_integrity("timeline_A")
        assert result["valid"]
        assert len(result["issues"]) == 0

    def test_validate_timeline_duplicate_events(self, engine):
        """Test detecting duplicate events in causal chain"""
        engine.detect_timeline("timeline_A", 0)
        engine.record_timeline_state("timeline_A", {}, ["E1", "E2", "E1"])
        result = engine.validate_timeline_integrity("timeline_A")
        assert not result["valid"]
        assert "Duplicate events" in result["issues"][0]

    def test_validate_timeline_low_stability(self, engine):
        """Test detecting low stability"""
        engine.detect_timeline("timeline_A", 0)
        timeline = engine.timelines["timeline_A"]
        timeline.stability_score = 0.5
        result = engine.validate_timeline_integrity("timeline_A")
        assert not result["valid"]
        assert any("stability" in issue.lower() for issue in result["issues"])


class TestRollback:
    """Test rollback functionality"""

    @pytest.fixture
    def engine(self):
        eng = MultiverseReconciliationEngine()
        eng.detect_timeline("primary", 0)
        eng.record_timeline_state("primary", {"ships": 10}, ["E1", "E2"])
        eng.detect_timeline("secondary", 3)
        eng.record_timeline_state("secondary", {"ships": 5}, ["E3"])
        eng.merge_timelines("primary", "secondary")
        return eng

    def test_rollback_restores_state(self, engine):
        """Test rollback restores timeline state from snapshot"""
        timeline = engine.timelines["secondary"]
        pre_rollback_status = timeline.status
        success = engine.rollback_merge("secondary")
        assert success
        assert timeline.status == TimelineStatus.ACTIVE

    def test_rollback_nonexistent_timeline(self, engine):
        """Test rollback non-existent timeline fails"""
        success = engine.rollback_merge("nonexistent")
        assert not success


class TestMultiverseStatus:
    """Test multiverse status reporting"""

    @pytest.fixture
    def engine(self):
        eng = MultiverseReconciliationEngine()
        eng.detect_timeline("timeline_1", 0)
        eng.detect_timeline("timeline_2", 5)
        eng.detect_timeline("timeline_3", 10)
        eng.record_timeline_state("timeline_1", {}, ["E1"])
        eng.record_timeline_state("timeline_2", {}, ["E2"])
        eng.record_timeline_state("timeline_3", {}, ["E3"])
        return eng

    def test_multiverse_status_initial(self, engine):
        """Test initial multiverse status"""
        status = engine.get_multiverse_status()
        assert status["total_timelines"] == 3
        assert status["active_timelines"] == 3
        assert status["merged_timelines"] == 0
        assert status["total_conflicts"] == 0

    def test_multiverse_status_after_merge(self, engine):
        """Test multiverse status after merge"""
        engine.merge_timelines("timeline_1", "timeline_2")
        status = engine.get_multiverse_status()
        assert status["active_timelines"] == 2
        assert status["merged_timelines"] == 1
        assert status["merge_operations"] == 1

    def test_multiverse_timeline_tree(self, engine):
        """Test timeline branching tree"""
        status = engine.get_multiverse_status()
        tree = status["timeline_tree"]
        assert len(tree) > 0

    def test_average_stability_calculation(self, engine):
        """Test average stability calculation"""
        status = engine.get_multiverse_status()
        assert 0.0 <= status["average_stability"] <= 1.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
