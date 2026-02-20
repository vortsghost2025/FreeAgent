"""
run_game.py
Entry point for launching the Deliberate AI Ensemble simulation.
"""
import os
import sys

def main():
    print("Launching Deliberate AI Ensemble simulation...")
    # Initialize and run all major subsystems
    from dialogue_engine import DialogueEngine
    from political_system import PoliticalSystem, Federation
    from persistent_universe import UniverseState
    from mobile_extension_stub import MobileExtension
    print("Initializing narrative engine...")
    dialogue = DialogueEngine()
    print("Initializing political system...")
    politics = PoliticalSystem([f for f in Federation])
    print("Initializing universe state...")
    universe = UniverseState()
    print("Initializing mobile extension...")
    mobile = MobileExtension()
    print("All subsystems initialized.")
    print("Simulation started. See dashboard for real-time updates.")

if __name__ == "__main__":
    main()
