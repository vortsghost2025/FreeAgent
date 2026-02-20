"""
demo_phase_xi_persistence.py
Demonstration script for persistent universe (Phase XI).
"""
from persistent_universe import UniverseState
from progression_tracker import ProgressionTracker

def run_demo():
    universe = UniverseState()
    universe.update("population", 1234)
    universe.track_progression("epoch1", {"events": 7})
    universe.save("demo_universe_save.json")
    universe.state = {}
    universe.load("demo_universe_save.json")
    print("Loaded state:", universe.state)
    print("Progression:", universe.progression)

    # Demonstrate milestone summary
    tracker = ProgressionTracker()
    tracker.add_milestone("epoch1-complete")
    print(tracker.milestone_summary())

if __name__ == "__main__":
    run_demo()
