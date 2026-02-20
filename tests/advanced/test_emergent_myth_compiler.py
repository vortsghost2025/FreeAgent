import unittest
from src.advanced.emergent_myth_compiler import EmergentMythCompiler

class FakeNarrativeEngine:
    def compile(self, event): return "Mythic text"
class FakeLogger:
    def log(self, *args, **kwargs): pass

class TestEmergentMythCompiler(unittest.TestCase):
    def test_myth_generation(self):
        compiler = EmergentMythCompiler(FakeNarrativeEngine(), FakeLogger())
        myths = compiler.compile_from_events([{"event_type": "crisis", "federation_id": "fed1"}])
        self.assertIsInstance(myths, list)
        self.assertTrue(len(myths) > 0)
