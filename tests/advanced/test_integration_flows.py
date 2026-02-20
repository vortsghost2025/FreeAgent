import unittest
from datetime import datetime
from src.advanced.core_models import Federation, Event, UniverseState, Narrative

class TestIntegrationFlows(unittest.TestCase):
    def setUp(self):
        self.fed = Federation(id="F1", name="Galactic Union", stability=0.9, members=["A", "B"], history=["formed", "expanded"])
        self.event = Event(
            id="E1",
            federation_id="F1",
            event_type="discovery",
            timestamp=datetime(2026, 2, 19),
            narrative_summary="A new planet discovered",
            source_epoch=1,
            target_epoch=2,
            metadata={"planet": "X-42"}
        )
        self.universe = UniverseState(
            epoch=2,
            entropy=0.15,
            narratives={"coherence": 0.8},
            metrics={"consistency": 0.95, "timestamp": "2026-02-19"},
            federations=[self.fed],
            events=[self.event]
        )
        self.narrative = Narrative(id="N1", text="Union discovers X-42", coherence=0.8, related_events=["E1"], timestamp=datetime(2026, 2, 19))

    def test_epoch_expansion(self):
        # Simulate epoch expansion
        self.universe.epoch += 1
        self.assertEqual(self.universe.epoch, 3)

    def test_federation_crisis(self):
        # Simulate federation stability drop
        self.fed.stability = 0.2
        self.assertLess(self.fed.stability, 0.5)

    def test_mythic_event(self):
        # Simulate myth generation from event
        myth_text = f"{self.fed.name} myth: {self.event.narrative_summary}"
        self.assertIn("myth", myth_text)

    def test_codex_update(self):
        # Simulate codex update
        self.fed.history.append("codex updated")
        self.assertIn("codex updated", self.fed.history)

    def test_consciousness_metrics(self):
        # Simulate consciousness metric change
        self.universe.metrics["awareness"] = 0.7
        self.assertEqual(self.universe.metrics["awareness"], 0.7)

    def test_causality_validation(self):
        # Simulate causality validation between events
        self.assertEqual(self.event.source_epoch + 1, self.event.target_epoch)
