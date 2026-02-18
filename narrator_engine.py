
"""
NarratorEngine V2 — Modular, Personality-Driven, Template-Based
Maps events/state/telemetry to narrative output with runtime personality switching.
Integrates with TelemetryEngine and LoreEngine.
"""

from typing import Any, Dict, Optional
from enum import Enum, auto

class NarratorPersonality(Enum):
    BASELINE = auto()  # Neutral, default
    CHAOS = auto()     # Dry, amused, slightly chaotic
    NOIR = auto()      # Moody, metaphor-heavy
    DOCUMENTARY = auto()  # Calm, explanatory
    TIRED_ENGINEER = auto()  # 3am, deadpan
    CAPTAINS_LOG = auto()   # Formal, log-style
    TRYING_AI = auto()      # Earnest, apologetic

PERSONALITY_NAMES = {
    NarratorPersonality.BASELINE: "Baseline",
    NarratorPersonality.CHAOS: "Chaos",
    NarratorPersonality.NOIR: "Noir",
    NarratorPersonality.DOCUMENTARY: "Documentary",
    NarratorPersonality.TIRED_ENGINEER: "TiredEngineer",
    NarratorPersonality.CAPTAINS_LOG: "CaptainsLog",
    NarratorPersonality.TRYING_AI: "TryingAI",
}

class TemplateRegistry:
    """Registry of templates per personality and event type."""
    def __init__(self):
        self.templates = {}
        self._init_default_templates()

    def _init_default_templates(self):
        # Each personality gets a dict of event_type: template
        self.templates = {
            NarratorPersonality.BASELINE: {
                "ENGINE_START": "Engines online. Ready for orders.",
                "SHIELDS_UP": "Shields up. All systems nominal.",
                "FIRE_WEAPONS": "Weapons fired. Awaiting results.",
                "TRADING": "Trading cycle initiated.",
                "OBSERVER": "Sensors active. Monitoring environment.",
                "EMERGENCY_STOP": "Emergency stop engaged!",
                "CLOAK": "Cloaking engaged.",
                "DEFAULT": "Event '{event_type}' occurred."
            },
            NarratorPersonality.CHAOS: {
                "ENGINE_START": "Engines roar to life. The void trembles.",
                "SHIELDS_UP": "Shields shimmer, defiant against the cosmic dark.",
                "FIRE_WEAPONS": "Weapons primed. The hunt begins.",
                "TRADING": "Markets stir. The crew eyes the horizon for opportunity.",
                "OBSERVER": "Sensors sweep the void. Every anomaly is a story.",
                "EMERGENCY_STOP": "Red lights flash. The ship halts, breath held.",
                "CLOAK": "Cloaking field shimmers. We vanish from prying eyes.",
                "DEFAULT": "{event_type}: The universe blinks."
            },
            NarratorPersonality.NOIR: {
                "ENGINE_START": "In the shadows, the engines whisper secrets.",
                "SHIELDS_UP": "A faint blue glow shields us from fate.",
                "FIRE_WEAPONS": "Trigger pulled. Destiny waits in the dark.",
                "TRADING": "Markets are a smoky room. Everyone's bluffing.",
                "OBSERVER": "The void stares back. Sensors catch its gaze.",
                "EMERGENCY_STOP": "Everything stops. Even the ghosts hold their breath.",
                "CLOAK": "We fade into myth, unseen.",
                "DEFAULT": "{event_type}: Another night, another story."
            },
            NarratorPersonality.DOCUMENTARY: {
                "ENGINE_START": "As we can see, the engines are now operational.",
                "SHIELDS_UP": "Shields are raised, providing protection.",
                "FIRE_WEAPONS": "Weapons have been fired. Awaiting outcome.",
                "TRADING": "Trading operations are underway.",
                "OBSERVER": "Sensors are actively scanning the environment.",
                "EMERGENCY_STOP": "Emergency stop has been executed.",
                "CLOAK": "Cloaking device is now active.",
                "DEFAULT": "Event '{event_type}' processed."
            },
            NarratorPersonality.TIRED_ENGINEER: {
                "ENGINE_START": "Engines again? It's 3am somewhere.",
                "SHIELDS_UP": "Shields up. Not my problem if they fail.",
                "FIRE_WEAPONS": "Weapons fired. Hope you know what you're doing.",
                "TRADING": "Trading. Try not to break anything.",
                "OBSERVER": "Sensors online. Yawn.",
                "EMERGENCY_STOP": "Emergency stop. This again?",
                "CLOAK": "Cloak engaged. Maybe I can nap now.",
                "DEFAULT": "{event_type}: Just another shift."
            },
            NarratorPersonality.CAPTAINS_LOG: {
                "ENGINE_START": "Captain's log, stardate unknown: Engines engaged.",
                "SHIELDS_UP": "Captain's log: Shields raised.",
                "FIRE_WEAPONS": "Captain's log: Weapons fired at target.",
                "TRADING": "Captain's log: Trading operations commenced.",
                "OBSERVER": "Captain's log: Sensors report all clear.",
                "EMERGENCY_STOP": "Captain's log: Emergency stop executed.",
                "CLOAK": "Captain's log: Cloaking device activated.",
                "DEFAULT": "Captain's log: {event_type} recorded."
            },
            NarratorPersonality.TRYING_AI: {
                "ENGINE_START": "I'm trying, Captain. Engines are on!",
                "SHIELDS_UP": "Shields up. I hope that's right.",
                "FIRE_WEAPONS": "Weapons fired. Fingers crossed.",
                "TRADING": "Trading started. I'll do my best!",
                "OBSERVER": "Sensors online. Let me know if I missed anything.",
                "EMERGENCY_STOP": "Emergency stop. Did I do that right?",
                "CLOAK": "Cloak engaged. I hope we're hidden.",
                "DEFAULT": "{event_type}: I'm doing my best!"
            },
        }

    def get_template(self, personality: NarratorPersonality, event_type: str) -> str:
        # Fallback: event_type → DEFAULT → Baseline DEFAULT
        p_templates = self.templates.get(personality, {})
        if event_type in p_templates:
            return p_templates[event_type]
        if "DEFAULT" in p_templates:
            return p_templates["DEFAULT"]
        # Fallback to baseline
        return self.templates[NarratorPersonality.BASELINE]["DEFAULT"]

class NarratorEngineV2:
    """
    Modular, personality-driven narrator engine.
    Core: map (template), render (final string), switch (mode), integrate (telemetry/lore).
    """
    def __init__(self, personality: NarratorPersonality = NarratorPersonality.BASELINE):
        self.personality = personality
        self.registry = TemplateRegistry()

    def switch_personality(self, new_personality: NarratorPersonality):
        self.personality = new_personality

    def map_template(self, event_type: str, personality: Optional[NarratorPersonality] = None) -> str:
        """Resolve template for event_type and personality (with fallback)."""
        p = personality or self.personality
        return self.registry.get_template(p, event_type)

    def render(self, event: Dict[str, Any], state: Dict[str, Any], telemetry: Optional[Dict[str, Any]] = None, result: Optional[Dict[str, Any]] = None, personality: Optional[NarratorPersonality] = None) -> str:
        """
        Render a narrative string for the given event, state, telemetry, and result.
        """
        p = personality or self.personality
        event_type = event.get("type", "UnknownEvent")
        template = self.map_template(event_type, p)
        # Compose context for formatting
        context = dict(event)
        context.update(state or {})
        if telemetry:
            context.update(telemetry)
        if result:
            context.update(result)
        context.setdefault("event_type", event_type)
        # Format template
        try:
            narrative = template.format(**context)
        except Exception:
            narrative = template  # fallback: raw template
        # Optionally append state/result summaries
        state_summary = state.get("summary") if state else None
        result_summary = result.get("summary") if result else None
        if state_summary:
            narrative += f" | State: {state_summary}"
        if result_summary:
            narrative += f" | Outcome: {result_summary}"
        return f"[{PERSONALITY_NAMES[p]}] {narrative}"

    def integrate_telemetry(self, telemetry: Dict[str, Any]):
        """(Optional) Accept telemetry for context-aware narrative hooks."""
        # Could be used to adjust mode or inject special templates
        pass

    def integrate_lore_entry(self, lore_entry: Dict[str, Any]):
        """(Optional) Accept lore entry for flavored summaries or tone-shift arcs."""
        pass

    def get_mode(self) -> NarratorPersonality:
        return self.personality

    def set_mode(self, mode: NarratorPersonality):
        self.switch_personality(mode)

# Integration points (example usage):
# Per ship: each FleetShip has a NarratorEngineV2 instance
# FleetCoordinator can switch fleet-wide mode
# TelemetryEngine passes telemetry as context
# LoreEngine can call render() for flavored summaries and store mode in each entry
