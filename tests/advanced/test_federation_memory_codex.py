import unittest
from src.advanced.federation_memory_codex import FederationMemoryCodex

class FakeLogger:
    def log(self, *args, **kwargs): pass

class TestFederationMemoryCodex(unittest.TestCase):
    def test_event_recording(self):
        codex = FederationMemoryCodex(FakeLogger())
        codex.record_event("fed1", "alliance_change", "summary", {"timestamp": "2026-02-19"})
        timeline = codex.get_timeline("fed1")
        self.assertEqual(len(timeline), 1)
