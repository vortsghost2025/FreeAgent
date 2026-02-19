"""
MemoryGraph: Stores past events, ship outputs, merged DomainResults, and metaphysical interpretations.
"""
from typing import Any, Dict, List

import uuid
from collections import defaultdict

class MemoryGraph:
    def __init__(self):
        # universes: universe_id -> universe dict
        self.universes: Dict[str, Dict[str, Any]] = {}
        self.active_universe_id: str = self._create_root_universe()

    def _create_root_universe(self) -> str:
        universe_id = str(uuid.uuid4())
        self.universes[universe_id] = {
            'universe_id': universe_id,
            'parent_universe_id': None,
            'branch_event_id': None,
            'events': [],
        }
        return universe_id

    def record_event(self, event: Dict[str, Any], universe_id: str = None):
        """Record event in the specified universe (default: active)"""
        uid = universe_id or self.active_universe_id
        event = dict(event)  # shallow copy
        event['universe_id'] = uid
        self.universes[uid]['events'].append(event)

    def get_events_for_universe(self, universe_id: str = None) -> List[Dict[str, Any]]:
        uid = universe_id or self.active_universe_id
        return list(self.universes[uid]['events'])

    def fork_universe(self, from_universe_id: str = None, branch_event_id: str = None) -> str:
        """Create a new universe branch from a given universe and event."""
        parent_id = from_universe_id or self.active_universe_id
        new_id = str(uuid.uuid4())
        # Copy all events up to (and including) branch_event_id, or all if None
        parent_events = self.universes[parent_id]['events']
        if branch_event_id:
            idx = next((i for i, e in enumerate(parent_events) if e.get('event_id') == branch_event_id), len(parent_events))
            events_copy = [dict(e) for e in parent_events[:idx+1]]
        else:
            events_copy = [dict(e) for e in parent_events]
        self.universes[new_id] = {
            'universe_id': new_id,
            'parent_universe_id': parent_id,
            'branch_event_id': branch_event_id,
            'events': events_copy,
        }
        return new_id

    def get_universe_lineage(self, universe_id: str) -> List[str]:
        """Return the ancestry chain for a universe (oldest first)"""
        lineage = []
        uid = universe_id
        while uid:
            lineage.append(uid)
            uid = self.universes[uid]['parent_universe_id']
        return lineage[::-1]

    def list_universes(self) -> List[Dict[str, Any]]:
        return [
            {
                'universe_id': u['universe_id'],
                'parent_universe_id': u['parent_universe_id'],
                'branch_event_id': u['branch_event_id'],
                'num_events': len(u['events'])
            }
            for u in self.universes.values()
        ]

    def set_active_universe(self, universe_id: str):
        if universe_id in self.universes:
            self.active_universe_id = universe_id

    # Legacy API for compatibility
    def get_history(self, branch: str = None) -> Dict[str, List[Dict[str, Any]]]:
        uid = branch or self.active_universe_id
        return {
            'events': self.get_events_for_universe(uid)
        }
