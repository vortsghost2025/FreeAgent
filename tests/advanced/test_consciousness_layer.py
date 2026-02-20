import unittest
from src.advanced.consciousness_layer import SystemConsciousnessLayer

class FakeLogger:
    def log(self, *args, **kwargs): pass

class TestConsciousnessLayer(unittest.TestCase):
    def test_awareness_update(self):
        layer = SystemConsciousnessLayer(FakeLogger())
        layer.update_from_signals(
            anomalies=[{"id": 1}],
            narratives={"coherence": 0.8},
            federation_state={"stability": 0.7},
            universe_metrics={"consistency": 0.9, "timestamp": "2026-02-19"}
        )
        snapshot = layer.get_awareness_snapshot()
        self.assertTrue(0 <= snapshot["awareness_level"] <= 1)
