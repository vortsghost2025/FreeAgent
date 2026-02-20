"""
Refactored Myth Compiler: Accepts Event, Anomaly, CodexEntry; emits Myth objects.
"""
from typing import List, Any
from src.advanced.core_models import Event
from datetime import datetime

class Myth:
    def __init__(self, id: str, title: str, events: List[Event], codex_refs: List[Any], anomalies: List[Any], canonical_text: str):
        self.id = id
        self.title = title
        self.events = events
        self.codex_refs = codex_refs
        self.anomalies = anomalies
        self.canonical_text = canonical_text
        self.timestamp = datetime.now()

class RefactoredMythCompiler:
    """
    Compiles myths from events, anomalies, and codex entries.
    """
    def __init__(self, narrative_engine):
        self.narrative_engine = narrative_engine
        self.myths = []

    def compile_from_events(self, events: List[Event], anomalies: List[Any], codex_entries: List[Any]) -> List[Myth]:
        myths = []
        for idx, event in enumerate(events):
            title = f"Myth of {event.event_type} ({event.federation_id})"
            canonical_text = self.narrative_engine.compile(event)
            myth = Myth(
                id=f"myth_{idx}_{event.id}",
                title=title,
                events=[event],
                codex_refs=codex_entries,
                anomalies=anomalies,
                canonical_text=canonical_text
            )
            myths.append(myth)
        self.myths.extend(myths)
        return myths
