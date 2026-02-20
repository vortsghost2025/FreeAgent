"""
demo_phase_x_politics.py
Demonstration script for multi-federation politics (Phase X).
"""
from political_system import PoliticalSystem, Federation, PolicyType
from multi_federation_politics import MultiFederationPolitics

def run_demo():
    system = PoliticalSystem([Federation.ALPHA, Federation.BETA, Federation.GAMMA])
    system.negotiate(Federation.ALPHA, Federation.BETA, PolicyType.TRADE, 10)
    system.negotiate(Federation.BETA, Federation.GAMMA, PolicyType.DEFENSE, 5)
    for f1 in Federation:
        for f2 in Federation:
            if f1 != f2:
                rel = system.states[f1].get_relation(f2)
                print(f"Relation {f1.name} -> {f2.name}: {rel}")

    # Demonstrate policy shift simulation
    mfp = MultiFederationPolitics()
    mfp.simulate_policy_shift(PolicyType.RESEARCH, 3)
    print("Policy shift simulation complete.")

if __name__ == "__main__":
    run_demo()
