"""
test_phase_ix_narrative.py
Unit tests for advanced narrative generation (Phase IX).
"""

import unittest
from dialogue_engine import DialogueEngine, NarratorPersonality

class TestDialogueEngine(unittest.TestCase):
    def setUp(self):
        self.engine = DialogueEngine()

    def test_baseline_greeting(self):
        result = self.engine.generate("greeting", {"name": "TestUser"})
        self.assertIn("TestUser", result)

    def test_personality_switch(self):
        self.engine.set_personality(NarratorPersonality.NOIR)
        result = self.engine.generate("greeting", {"name": "TestUser"})
        self.assertIn("shadows", result)

    def test_missing_template_fallback(self):
        result = self.engine.generate("unknown_event", {"name": "TestUser"})
        self.assertIn("No template", result)

if __name__ == "__main__":
    unittest.main()
