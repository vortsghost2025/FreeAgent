#!/usr/bin/env python3
"""
PHASE XVI - TEMPORAL MEMORY ENGINE TESTS
Comprehensive test suite for persistent federation history (16+ tests)
"""

import pytest
from datetime import datetime

from temporal_memory_engine import (
    TemporalMemoryEngine,
    FederationEvent,
    EventType,
    CausalityLink,
)


class TestTemporalMemoryEngine:
    """Test temporal memory and history functionality"""

    @pytest.fixture
    def engine(self):
        return TemporalMemoryEngine()

    def test_event_recording(self, engine):
        """Test recording federation events"""
        event = engine.record_event(
            EventType.DIPLOMATIC,
            "treaty_negotiation",
            "initiate_treaty",
            {"parties": ["A", "B"], "treaty_type": "TRADE"},
        )

        assert event.event_id is not None
        assert event.event_type == EventType.DIPLOMATIC
        assert event.vector == "treaty_negotiation"
        assert len(engine.events) == 1

    def test_multiple_events_timeline(self, engine):
        """Test chronological ordering of events"""
        event1 = engine.record_event(
            EventType.DIPLOMATIC, "diplomacy", "form_alliance", {}
        )
        event2 = engine.record_event(
            EventType.EXPANSION, "expansion", "commission_ship", {}
        )
        event3 = engine.record_event(
            EventType.FIRST_CONTACT, "contact", "detect_fleet", {}
        )

        assert len(engine.event_timeline) == 3
        assert engine.event_timeline[0] == event1.event_id
        assert engine.event_timeline[1] == event2.event_id
        assert engine.event_timeline[2] == event3.event_id

    def test_causality_linking(self, engine):
        """Test linking cause and effect events"""
        cause = engine.record_event(
            EventType.DIPLOMATIC, "diplomacy", "form_alliance", {}
        )
        effect = engine.record_event(
            EventType.EXPANSION, "expansion", "commission_ship", {}
        )

        success = engine.link_causality(
            cause.event_id, effect.event_id, strength=0.9,
            description="Alliance enables expansion"
        )

        assert success
        assert len(engine.causal_links) == 1
        assert effect.event_id in cause.resulted_in
        assert cause.event_id in effect.caused_by

    def test_causality_chain_tracing(self, engine):
        """Test tracing complete causal chains"""
        # Create chain: A → B → C → D
        event_a = engine.record_event(
            EventType.DIPLOMATIC, "diplomacy", "action_a", {}
        )
        event_b = engine.record_event(
            EventType.EXPANSION, "expansion", "action_b", {}
        )
        event_c = engine.record_event(
            EventType.FIRST_CONTACT, "contact", "action_c", {}
        )
        event_d = engine.record_event(
            EventType.ORCHESTRATION, "orchestration", "action_d", {}
        )

        engine.link_causality(event_a.event_id, event_b.event_id)
        engine.link_causality(event_b.event_id, event_c.event_id)
        engine.link_causality(event_c.event_id, event_d.event_id)

        chain = engine.trace_causality_chain(event_a.event_id)
        assert chain is not None
        assert chain.root_cause == event_a.event_id
        assert len(chain.effect_chain) >= 3

    def test_timeline_snapshots(self, engine):
        """Test capturing federation state snapshots"""
        snapshot = engine.snapshot_state(
            orchestration_state={"decisions": 5},
            diplomatic_state={"treaties": 3},
            expansion_state={"ships": 10},
            first_contact_state={"fleets": 2},
            federation_readiness=0.85,
            vector_coherence=0.75,
        )

        assert snapshot.tick == 0
        assert snapshot.federation_readiness == 0.85
        assert snapshot.vector_coherence == 0.75
        assert len(engine.snapshots) == 1

    def test_query_by_tick_range(self, engine):
        """Test querying events within tick range"""
        # Create events at different ticks
        for i in range(5):
            engine.record_event(
                EventType.DIPLOMATIC, "diplomacy", f"action_{i}", {}
            )
            engine.snapshot_state({}, {}, {}, {}, 0.5, 0.5)

        events = engine.get_events_in_range(1, 3)
        assert len(events) > 0

    def test_query_by_vector(self, engine):
        """Test querying events by vector"""
        engine.record_event(
            EventType.DIPLOMATIC, "diplomacy_vector", "action", {}
        )
        engine.record_event(
            EventType.DIPLOMATIC, "diplomacy_vector", "action", {}
        )
        engine.record_event(
            EventType.EXPANSION, "expansion_vector", "action", {}
        )

        dip_events = engine.get_vector_history("diplomacy_vector")
        assert len(dip_events) == 2

    def test_query_by_action(self, engine):
        """Test querying events by action type"""
        engine.record_event(
            EventType.DIPLOMATIC, "diplomacy", "form_treaty", {}
        )
        engine.record_event(
            EventType.EXPANSION, "expansion", "form_treaty", {}
        )
        engine.record_event(
            EventType.FIRST_CONTACT, "contact", "initiate_contact", {}
        )

        treaty_events = engine.query_by_action("form_treaty")
        assert len(treaty_events) == 2

    def test_event_statistics(self, engine):
        """Test event statistics collection"""
        for i in range(3):
            engine.record_event(
                EventType.DIPLOMATIC, "diplomacy", "action", {}
            )
        for i in range(2):
            engine.record_event(
                EventType.EXPANSION, "expansion", "action", {}
            )

        stats = engine.get_event_statistics()
        assert stats["total_events"] == 5
        assert stats["events_by_type"]["diplomatic"] == 3
        assert stats["events_by_type"]["expansion"] == 2

    def test_history_export(self, engine):
        """Test exporting history for backup"""
        event1 = engine.record_event(
            EventType.DIPLOMATIC, "diplomacy", "action", {"key": "value"}
        )
        event2 = engine.record_event(
            EventType.EXPANSION, "expansion", "action", {}
        )
        engine.link_causality(event1.event_id, event2.event_id)

        export = engine.export_history()
        assert "events" in export
        assert "causal_links" in export
        assert "metadata" in export
        assert export["metadata"]["total_events"] == 2
        assert export["metadata"]["total_causal_links"] == 1

    def test_history_import(self, engine):
        """Test importing previously exported history"""
        # Export from one engine
        export_engine = TemporalMemoryEngine()
        event1 = export_engine.record_event(
            EventType.DIPLOMATIC, "diplomacy", "action", {}
        )
        event2 = export_engine.record_event(
            EventType.EXPANSION, "expansion", "action", {}
        )
        export_engine.link_causality(event1.event_id, event2.event_id)
        export_data = export_engine.export_history()

        # Import into another engine
        import_engine = TemporalMemoryEngine()
        success = import_engine.import_history(export_data)

        assert success
        assert len(import_engine.events) == 2
        assert len(import_engine.causal_links) == 1

    def test_snapshot_retrieval(self, engine):
        """Test retrieving snapshots by tick"""
        for i in range(5):
            engine.snapshot_state(
                {"iteration": i}, {}, {}, {},
                federation_readiness=0.5 + i * 0.1,
                vector_coherence=0.5,
            )

        snapshot = engine.get_snapshot(2)
        assert snapshot is not None
        assert snapshot.tick == 2
        assert snapshot.orchestration_state["iteration"] == 2

    def test_snapshot_range_query(self, engine):
        """Test querying snapshots within range"""
        for i in range(10):
            engine.snapshot_state(
                {}, {}, {}, {}, 0.5, 0.5
            )

        snapshots = engine.get_snapshot_range(2, 5)
        assert len(snapshots) == 4

    def test_complex_causality_network(self, engine):
        """Test complex cause-effect relationships"""
        # Create diamond causality: A → B,C → D
        event_a = engine.record_event(EventType.DIPLOMATIC, "diplomacy", "root", {})
        event_b = engine.record_event(EventType.EXPANSION, "expansion", "branch1", {})
        event_c = engine.record_event(EventType.FIRST_CONTACT, "contact", "branch2", {})
        event_d = engine.record_event(EventType.ORCHESTRATION, "orchestration", "convergence", {})

        engine.link_causality(event_a.event_id, event_b.event_id)
        engine.link_causality(event_a.event_id, event_c.event_id)
        engine.link_causality(event_b.event_id, event_d.event_id)
        engine.link_causality(event_c.event_id, event_d.event_id)

        chain = engine.trace_causality_chain(event_a.event_id)
        assert len(chain.affected_vectors) >= 3

    def test_event_impact_calculation(self, engine):
        """Test impact calculation for events"""
        # Event with many downstream effects should have higher impact
        root = engine.record_event(EventType.DIPLOMATIC, "diplomacy", "action", {})
        for i in range(5):
            effect = engine.record_event(
                EventType.EXPANSION, "expansion", f"action_{i}", {}
            )
            engine.link_causality(root.event_id, effect.event_id)

        impact = engine._calculate_event_impact(root.event_id)
        assert impact > 0.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
