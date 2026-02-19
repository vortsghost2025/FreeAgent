import unittest
from uss_chaosbringer.signalharvester_ship import SignalHarvester

class TestSignalHarvester(unittest.TestCase):
    def setUp(self):
        self.ship = SignalHarvester()
        self.state = self.ship.get_initial_state()

    def test_initial_state(self):
        self.assertEqual(self.state["mode"], "RECEPTIVE")
        self.assertEqual(self.state["signal_buffer"], [])
        self.assertEqual(self.state["amplification_level"], 1.0)

    def test_receive_signal(self):
        event = {"type": "RECEIVE_SIGNAL", "signal": {"type": "data", "content": "hello"}}
        result = self.ship.domain_handlers[self.ship.DOMAIN](self.state, event)
        self.assertIn({"action": "signal_received", "signal": {"type": "data", "content": "hello"}}, result["domain_actions"])
        self.assertEqual(result["new_state"]["signal_buffer"][0]["content"], "hello")

    def test_amplify_signal(self):
        event = {"type": "AMPLIFY_SIGNAL", "signal": {"type": "data", "content": "ping"}}
        result = self.ship.domain_handlers[self.ship.DOMAIN](self.state, event)
        self.assertIn("amplification_level", result["new_state"])
        self.assertGreater(result["new_state"]["amplification_level"], 1.0)
        self.assertIn({"action": "signal_amplified", "signal": {"type": "data", "content": "ping"}, "amplification_level": result["new_state"]["amplification_level"]}, result["domain_actions"])

    def test_filter_noise(self):
        noisy_state = self.state.copy()
        noisy_state["signal_buffer"] = [
            {"type": "noise", "content": "static"},
            {"type": "data", "content": "msg"}
        ]
        event = {"type": "FILTER_NOISE"}
        result = self.ship.domain_handlers[self.ship.DOMAIN](noisy_state, event)
        self.assertEqual(len(result["new_state"]["signal_buffer"]), 1)
        self.assertEqual(result["new_state"]["signal_buffer"][0]["type"], "data")
        self.assertIn({"action": "noise_filtered"}, result["domain_actions"])

    def test_narrator_templates(self):
        config = self.ship.get_narrator_config()
        self.assertIn("RECEPTIVE", config["template_matrix"])
        self.assertIn("ANALYTICAL", config["template_matrix"])
        self.assertIn("EXUBERANT", config["template_matrix"])

if __name__ == "__main__":
    unittest.main()
