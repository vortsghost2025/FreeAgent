"""
NarratorEngine for USS Chaosbringer
Transforms event logs and state transitions into narrative, character-driven output.
"""

from typing import Any, Dict

class NarratorEngine:
    def __init__(self, persona: str = "Chaosbringer"):
        self.persona = persona

    def narrate(self, event: Dict[str, Any], state: Dict[str, Any], result: Dict[str, Any]) -> str:
        """
        Generate a narrative string for a given event, state, and result.
        """
        event_type = event.get("type", "UnknownEvent")
        details = event.get("details", {})
        state_summary = state.get("summary", "state unknown")
        result_summary = result.get("summary", "no result")
        log = result.get("log", "")

        # Expanded personality matrix
        if self.persona == "Chaosbringer":
            intro = f"[Chaosbringer] "
            if event_type == "ENGINE_START":
                line = "Engines roar to life. The void trembles."
            elif event_type == "SHIELDS_UP":
                line = "Shields shimmer, defiant against the cosmic dark."
            elif event_type == "FIRE_WEAPONS":
                line = "Weapons systems primed. The hunt begins."
            elif event_type == "TRADING":
                line = "Markets stir. The crew eyes the horizon for opportunity."
            elif event_type == "OBSERVER":
                line = "Sensors sweep the void. Every anomaly is a story waiting to unfold."
            elif event_type == "INFRA":
                line = "Engineering hums. The backbone of the Chaosbringer flexes its might."
            elif event_type == "CAPTAIN":
                line = "The captain's will shapes the course. Orders ripple through the decks."
            elif event_type == "INTERNAL":
                line = "Internal systems recalibrate. The ship dreams in circuits and code."
            elif event_type == "EMERGENCY_STOP":
                line = "Red lights flash. The ship halts, breath held in the cosmic dark."
            elif event_type == "CLOAK":
                line = "Cloaking field shimmers. The Chaosbringer vanishes from prying eyes."
            else:
                line = f"Event '{event_type}' processed. {details}"
            # Add log flavor if present
            if log:
                line += f" | {log}"
            outro = f" | State: {state_summary} | Outcome: {result_summary}"
            return intro + line + outro
        else:
            # Default fallback
            return f"[{self.persona}] Event: {event_type} | State: {state_summary} | Result: {result_summary} | {log}"
