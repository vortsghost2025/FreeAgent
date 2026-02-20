"""
narrative_generator_advanced.py
Advanced narrative generator for Phase IX.
"""
from dialogue_engine import DialogueEngine, NarratorPersonality

class NarrativeGeneratorAdvanced:
    def __init__(self):
        self.engine = DialogueEngine()

    def generate_narrative(self, event_type: str, context):
        # Add advanced logic for multi-event, multi-personality narrative
        return self.engine.generate(event_type, context)

    def switch_personality(self, personality: NarratorPersonality):
        self.engine.set_personality(personality)

    def generate_multi_event_narrative(self, events, context):
        """Generate a narrative for a sequence of events."""
        return '\n'.join([self.engine.generate(e, context) for e in events])

    def available_templates(self):
        """Return available event templates for the current personality."""
        return list(self.engine.registry.templates.get(self.engine.personality, {}).keys())
