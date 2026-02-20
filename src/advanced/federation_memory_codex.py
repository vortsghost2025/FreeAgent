"""
FederationMemoryCodex: Versioned, queryable federation history.
"""

from typing import Any, Dict, List

class CodexEntry:
    def __init__(self, federation_id, timestamp, event_type, narrative_summary, raw_metadata):
        self.federation_id = federation_id
        self.timestamp = timestamp
        self.event_type = event_type
        self.narrative_summary = narrative_summary
        self.raw_metadata = raw_metadata

class FederationMemoryCodex:
    """
    Queryable memory layer for federations: histories, alliances, policy shifts, major events.
    Integrates: persistent logs, documentation layer, narrative templates.
    """

    def __init__(self, logger):
        self.entries = []
        self.logger = logger

    def record_event(self, federation_id, event_type, narrative_summary, metadata):
        """
        Record a federation event.
        """
        entry = CodexEntry(federation_id, metadata.get("timestamp"), event_type, narrative_summary, metadata)
        self.entries.append(entry)
        self.logger.log("codex_event_recorded", {
            "federation_id": federation_id,
            "event_type": event_type,
            "narrative_summary": narrative_summary,
            "metadata": metadata
        })

    def get_timeline(self, federation_id) -> List[CodexEntry]:
        """
        Return timeline for a federation.
        """
        return [e for e in self.entries if e.federation_id == federation_id]

    def query_history(self, federation_id, filters: Dict) -> List[CodexEntry]:
        """
        Query federation history with filters.
        """
        results = self.get_timeline(federation_id)
        for k, v in filters.items():
            results = [e for e in results if getattr(e, k, None) == v]
        return results

    def summarize_era(self, federation_id, start, end, narrative_engine) -> str:
        """
        Summarize an era using narrative engine.
        """
        era_entries = [e for e in self.entries if e.federation_id == federation_id and start <= e.timestamp <= end]
        summary = narrative_engine.summarize([e.narrative_summary for e in era_entries])
        self.logger.log("codex_era_summarized", {
            "federation_id": federation_id,
            "start": start,
            "end": end,
            "summary": summary
        })
        return summary
