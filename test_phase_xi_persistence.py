"""
test_phase_xi_persistence.py
Unit tests for Phase XI Persistent Universe - aligned with actual module interfaces.
"""

import unittest
from datetime import datetime
from persistent_universe import UniverseState, WorldSnapshot, TimelineEventType


def make_snapshot(universe, turn=1):
    return WorldSnapshot(
        snapshot_id=f"snap_{turn}",
        timestamp=datetime.now(),
        turn_number=turn,
        timeline_id=universe.active_timeline_id,
        federation_state={"turn": turn, "score": 42 * turn}
    )


class TestUniverseState(unittest.TestCase):
    def setUp(self):
        self.universe = UniverseState("test-universe-001")

    def test_universe_creation(self):
        self.assertEqual(self.universe.universe_id, "test-universe-001")

    def test_has_timelines(self):
        self.assertIsInstance(self.universe.timelines, dict)
        self.assertTrue(len(self.universe.timelines) > 0)

    def test_has_active_timeline(self):
        self.assertIsNotNone(self.universe.active_timeline_id)
        self.assertIn(self.universe.active_timeline_id, self.universe.timelines)

    def test_record_event(self):
        event_id = self.universe.record_event(
            event_type=TimelineEventType.STATE_CHANGE,
            turn=1,
            description="Alpha fleet engaged at sector 5",
            impact_level=0.7,
            affected_systems=["fleet", "combat"]
        )
        self.assertIsNotNone(event_id)
        self.assertIsInstance(event_id, str)

    def test_record_snapshot(self):
        snap = make_snapshot(self.universe, turn=1)
        snap_id = self.universe.record_snapshot(snap)
        self.assertIsNotNone(snap_id)
        result = self.universe.get_snapshot_at_turn(1)
        self.assertIsNotNone(result)

    def test_persistent_entity_registration(self):
        entity_data = {"name": "Commander Alpha", "power": 100}
        self.universe.register_persistent_entity(
            "leader_001", "leader", entity_data
        )
        retrieved = self.universe.get_persistent_entity("leader_001")
        self.assertIsNotNone(retrieved)

    def test_create_branch(self):
        branch_id = self.universe.create_branch(
            branch_reason="alternate_timeline",
            from_turn=1
        )
        self.assertIsNotNone(branch_id)
        self.assertIn(branch_id, self.universe.timelines)

    def test_universe_integrity(self):
        result = self.universe.validate_universe_integrity()
        self.assertIsInstance(result, dict)
        self.assertIn("is_valid", result)
        self.assertTrue(result["is_valid"])

    def test_export_summary(self):
        summary = self.universe.export_universe_summary()
        self.assertIsInstance(summary, dict)
        self.assertIn("universe_id", summary)


if __name__ == "__main__":
    unittest.main()
