"""
test_phase_x_politics.py
Unit tests for Phase X Political System - aligned with actual module interfaces.
"""

import unittest
from political_system import (
    PoliticalSystem, PoliticalActor, Ideology, FactionAlignment,
    IdeologyAxis, RelationshipStatus, TreatyType, TradeGood,
    TraitType, DiplomaticEventType
)


def make_ideology(align=FactionAlignment.NEUTRAL, axis=IdeologyAxis.BALANCED,
                  cons=50.0, exp=50.0, justice="balanced"):
    return Ideology(
        alignment=align,
        ideology_axis=axis,
        conservatism_level=cons,
        expansionism_level=exp,
        justice_preference=justice
    )


def make_actor(faction_id, name, power=100.0):
    return PoliticalActor(
        faction_id=faction_id,
        faction_name=name,
        ideology=make_ideology(),
        initial_power=power
    )


class TestPoliticalActor(unittest.TestCase):
    def setUp(self):
        self.actor = make_actor("alpha", "Alpha Federation", 100.0)

    def test_actor_creation(self):
        self.assertEqual(self.actor.faction_id, "alpha")
        self.assertEqual(self.actor.faction_name, "Alpha Federation")
        # power stored as 'power' field
        self.assertIsNotNone(self.actor.power)

    def test_actor_has_relationships(self):
        self.assertIsInstance(self.actor.relationships, dict)

    def test_actor_has_traits(self):
        self.assertIsInstance(self.actor.traits, list)

    def test_actor_ideology(self):
        self.assertEqual(self.actor.ideology.alignment, FactionAlignment.NEUTRAL)

    def test_actor_has_influence(self):
        self.assertIsNotNone(self.actor.influence)


class TestPoliticalSystem(unittest.TestCase):
    def setUp(self):
        self.system = PoliticalSystem(current_turn=1)
        self.actor_a = make_actor("alpha", "Alpha Fed", 100.0)
        self.actor_b = make_actor("beta", "Beta Fed", 80.0)
        self.system.add_actor(self.actor_a)
        self.system.add_actor(self.actor_b)

    def test_system_creation(self):
        self.assertIsInstance(self.system.actors, dict)
        self.assertEqual(len(self.system.actors), 2)

    def test_factions_registered(self):
        self.assertIn("alpha", self.system.actors)
        self.assertIn("beta", self.system.actors)
        self.assertEqual(self.system.actors["alpha"].faction_name, "Alpha Fed")

    def test_ideology_alignment_values(self):
        alignments = [a for a in FactionAlignment]
        self.assertIn(FactionAlignment.NEUTRAL, alignments)
        self.assertIn(FactionAlignment.AUTHORITARIAN, alignments)
        self.assertIn(FactionAlignment.LIBERTARIAN, alignments)

    def test_relationship_status_values(self):
        statuses = [s for s in RelationshipStatus]
        self.assertIn(RelationshipStatus.ALLIED, statuses)
        self.assertIn(RelationshipStatus.WARRING, statuses)
        self.assertIn(RelationshipStatus.NEUTRAL, statuses)

    def test_ideology_creation(self):
        ideology = make_ideology(
            align=FactionAlignment.AUTHORITARIAN,
            axis=IdeologyAxis.MILITARISTIC,
            cons=70.0, exp=80.0, justice="strict"
        )
        self.assertEqual(ideology.alignment, FactionAlignment.AUTHORITARIAN)
        self.assertEqual(ideology.conservatism_level, 70.0)

    def test_global_stability(self):
        stability = self.system.get_global_stability()
        self.assertIsInstance(stability, (int, float))
        self.assertGreaterEqual(stability, 0.0)

    def test_establish_relationship(self):
        self.system.establish_relationship("alpha", "beta", RelationshipStatus.NEUTRAL)
        summary = self.system.get_relations_summary()
        self.assertIsInstance(summary, (dict, list, str))


class TestDiplomacy(unittest.TestCase):
    def test_treaty_types_exist(self):
        types = [t for t in TreatyType]
        self.assertTrue(len(types) > 0)

    def test_trade_goods_exist(self):
        goods = [g for g in TradeGood]
        self.assertTrue(len(goods) > 0)

    def test_diplomatic_events_exist(self):
        events = [e for e in DiplomaticEventType]
        self.assertTrue(len(events) > 0)

    def test_trait_types_exist(self):
        traits = [t for t in TraitType]
        self.assertTrue(len(traits) > 0)


if __name__ == "__main__":
    unittest.main()
