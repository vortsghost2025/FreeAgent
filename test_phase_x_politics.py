"""
test_phase_x_politics.py
Unit tests for multi-federation politics (Phase X).
"""

import unittest
from political_system import PoliticalSystem, Federation, PolicyType

class TestPoliticalSystem(unittest.TestCase):
    def setUp(self):
        self.system = PoliticalSystem([Federation.ALPHA, Federation.BETA])

    def test_negotiation(self):
        self.system.negotiate(Federation.ALPHA, Federation.BETA, PolicyType.TRADE, 5)
        rel = self.system.states[Federation.ALPHA].get_relation(Federation.BETA)
        self.assertEqual(rel, 5)

    def test_policy_assignment(self):
        self.system.negotiate(Federation.ALPHA, Federation.BETA, PolicyType.DEFENSE, 3)
        policy = self.system.states[Federation.ALPHA].policies[PolicyType.DEFENSE]
        self.assertEqual(policy.value, 3)

if __name__ == "__main__":
    unittest.main()
