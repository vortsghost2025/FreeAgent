"""
EmergentMythCompiler: Turns events/anomalies/federation actions into mythic lore.
"""

from typing import Any, Dict, List

class Myth:
    def __init__(self, id, title, epoch, involved_federations, core_conflict, resolution, symbolic_themes, canonical_text):
        self.id = id
        self.title = title
        self.epoch = epoch
        self.involved_federations = involved_federations
        self.core_conflict = core_conflict
        self.resolution = resolution
        self.symbolic_themes = symbolic_themes
        self.canonical_text = canonical_text

class EmergentMythCompiler:
    """
    Compiles system events, anomalies, and federation actions into mythic lore.
    Integrates: narrative engine, anomaly engine, codex, templates.
    """

    def __init__(self, narrative_engine, logger):
        self.narrative_engine = narrative_engine
        self.myths = []
        self.logger = logger

    def compile_from_events(self, events: List[Any]) -> List[Myth]:
        """
        Compile myths from events.
        """
        myths = []
        for idx, event in enumerate(events):
            myth = Myth(
                id=f"myth_{idx}",
                title=f"Myth of {event.get('event_type', 'Unknown')}",
                epoch=event.get("epoch", "Unknown"),
                involved_federations=[event.get("federation_id")],
                core_conflict=event.get("core_conflict", "Unknown"),
                resolution=event.get("resolution", "Unknown"),
                symbolic_themes=event.get("themes", []),
                canonical_text=self.narrative_engine.compile(event)
            )
            myths.append(myth)
            self.logger.log("myth_compiled", myth.__dict__)
        self.myths.extend(myths)
        return myths

    def compile_epoch_myths(self, universe_states, codex_entries) -> List[Myth]:
        """
        Compile epoch myths from universe states and codex entries.
        """
        myths = []
        for idx, entry in enumerate(codex_entries):
            myth = Myth(
                id=f"epoch_myth_{idx}",
                title=f"Epoch Myth {entry.event_type}",
                epoch=entry.timestamp,
                involved_federations=[entry.federation_id],
                core_conflict=entry.narrative_summary,
                resolution="Unknown",
                symbolic_themes=[],
                canonical_text=self.narrative_engine.compile(entry.raw_metadata)
            )
            myths.append(myth)
            self.logger.log("epoch_myth_compiled", myth.__dict__)
        self.myths.extend(myths)
        return myths

    def export_myth_codex(self, format="markdown"):
        """
        Export myth codex in specified format.
        """
        if format == "markdown":
            return "\n".join([f"# {m.title}\n{m.canonical_text}" for m in self.myths])
        elif format == "json":
            import json
            return json.dumps([m.__dict__ for m in self.myths], indent=2)
        else:
            return ""
