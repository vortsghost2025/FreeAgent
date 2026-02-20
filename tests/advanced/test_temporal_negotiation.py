import unittest
from src.advanced.temporal_negotiation import TemporalNegotiationEngine

class FakeLogger:
    def log(self, *args, **kwargs): pass

class TestTemporalNegotiationEngine(unittest.TestCase):
    def test_policy_replay(self):
        engine = TemporalNegotiationEngine([], {}, FakeLogger())
        result = engine.replay_negotiation_context("fed1", "2026-02-19")
        self.assertIn("context", result)
