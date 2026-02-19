import unittest
from probabilityweaver_ship import ProbabilityWeaver
from starship import ShipEvent

class TestProbabilityWeaver(unittest.TestCase):
    def setUp(self):
        self.ship = ProbabilityWeaver("USS ProbabilityWeaver", personality_mode="CALM")

    def test_initial_state(self):
        state = self.ship.get_initial_state()
        self.assertIn("probability_flux", state)
        self.assertIn("uncertainty_field", state)
        self.assertIn("prediction_accuracy", state)

    def test_flux_adjust_event(self):
        event = ShipEvent(domain="PROBABILITY_ENGINE", type="FLUX_ADJUST", payload={"delta": 0.2})
        result = self.ship.process_event(event)
        self.assertTrue(result.success)
        self.assertIn("FLUX_ADJUSTED", [a["type"] for a in result.domain_actions])

    def test_uncertainty_tune_event(self):
        event = ShipEvent(domain="PROBABILITY_ENGINE", type="UNCERTAINTY_TUNE", payload={"target": 0.7})
        result = self.ship.process_event(event)
        self.assertTrue(result.success)
        self.assertIn("UNCERTAINTY_TUNED", [a["type"] for a in result.domain_actions])

    def test_narrator_templates(self):
        event = ShipEvent(domain="PROBABILITY_ENGINE", type="FLUX_ADJUST", payload={"delta": 0.1})
        result = self.ship.process_event(event)
        self.assertIn("ProbabilityWeaver hums softly", result.narrative)

if __name__ == "__main__":
    unittest.main()
