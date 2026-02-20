"""
demo_phase_ix_narrative.py
Demonstration script for advanced narrative generation (Phase IX).
"""
from dialogue_engine import DialogueEngine, NarratorPersonality
from narrative_generator_advanced import NarrativeGeneratorAdvanced

def run_demo():
    engine = DialogueEngine()
    names = ["Alex", "Morgan", "Sam"]
    for personality in NarratorPersonality:
        engine.set_personality(personality)
        for name in names:
            print(f"[{personality.name}]", engine.generate("greeting", {"name": name}))
    # Demonstrate multi-event narrative
    events = ["greeting", "greeting", "greeting"]
    adv = NarrativeGeneratorAdvanced()
    adv.switch_personality(NarratorPersonality.CAPTAINS_LOG)
    print("\nMulti-event narrative:")
    print(adv.generate_multi_event_narrative(events, {"name": "Morgan"}))

if __name__ == "__main__":
    run_demo()
