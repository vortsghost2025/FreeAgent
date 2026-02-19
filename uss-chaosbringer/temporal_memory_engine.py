#!/usr/bin/env python3
"""
PHASE XVI - TEMPORAL MEMORY ENGINE
Persistent queryable history with causality tracking and time-indexed federation memory.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from enum import Enum
from collections import defaultdict
import json


class EventType(Enum):
    DIPLOMATIC = "diplomatic"
    EXPANSION = "expansion"
    FIRST_CONTACT = "first_contact"
    ORCHESTRATION = "orchestration"
    CONSTITUTIONAL = "constitutional"
    ANOMALY = "anomaly"


@dataclass
class CausalityLink:
    """Link between cause and effect events"""
    cause_event_id: str
    effect_event_id: str
    strength: float  # 0.0-1.0, how strong is the causal link
    lag_ticks: int  # how many ticks between cause and effect
    description: str


@dataclass
class FederationEvent:
    """Immutable federation event with metadata"""
    event_id: str
    event_type: EventType
    timestamp: float
    tick: int
    vector: str  # which vector (diplomatic, expansion, first_contact, etc)
    action: str
    details: Dict[str, Any]
    resulted_in: List[str] = field(default_factory=list)  # Event IDs of direct consequences
    caused_by: List[str] = field(default_factory=list)  # Event IDs that caused this


@dataclass
class TimelineSnapshot:
    """Complete federation state at a point in time"""
    tick: int
    timestamp: float
    orchestration_state: Dict[str, Any]
    diplomatic_state: Dict[str, Any]
    expansion_state: Dict[str, Any]
    first_contact_state: Dict[str, Any]
    federation_readiness: float
    vector_coherence: float


@dataclass
class CausalChain:
    """Causal relationship between events"""
    chain_id: str
    root_cause: str
    effect_chain: List[Tuple[str, int]]  # (event_id, lag_ticks)
    total_impact: float
    affected_vectors: List[str]


class TemporalMemoryEngine:
    """Persistent federation history with causality tracking"""

    def __init__(self):
        self.events: Dict[str, FederationEvent] = {}
        self.causal_links: List[CausalityLink] = []
        self.snapshots: Dict[int, TimelineSnapshot] = {}
        self.event_timeline: List[str] = []  # Chronological event IDs
        self.vector_history = defaultdict(list)  # Events per vector
        self.tick_counter = 0
        self._event_counter = 0

    def record_event(
        self,
        event_type: EventType,
        vector: str,
        action: str,
        details: Dict[str, Any],
    ) -> FederationEvent:
        """Record a federation event into persistent memory"""
        self._event_counter += 1
        event_id = f"event_{self._event_counter:06d}"

        event = FederationEvent(
            event_id=event_id,
            event_type=event_type,
            timestamp=datetime.now().timestamp(),
            tick=self.tick_counter,
            vector=vector,
            action=action,
            details=details,
        )

        self.events[event_id] = event
        self.event_timeline.append(event_id)
        self.vector_history[vector].append(event_id)

        return event

    def link_causality(
        self,
        cause_event_id: str,
        effect_event_id: str,
        strength: float = 0.8,
        description: str = "",
    ) -> bool:
        """Link cause and effect between two events"""
        if cause_event_id not in self.events or effect_event_id not in self.events:
            return False

        cause_event = self.events[cause_event_id]
        effect_event = self.events[effect_event_id]
        lag_ticks = effect_event.tick - cause_event.tick

        link = CausalityLink(
            cause_event_id=cause_event_id,
            effect_event_id=effect_event_id,
            strength=min(1.0, max(0.0, strength)),
            lag_ticks=lag_ticks,
            description=description,
        )

        self.causal_links.append(link)

        # Update event references
        cause_event.resulted_in.append(effect_event_id)
        effect_event.caused_by.append(cause_event_id)

        return True

    def snapshot_state(
        self,
        orchestration_state: Dict[str, Any],
        diplomatic_state: Dict[str, Any],
        expansion_state: Dict[str, Any],
        first_contact_state: Dict[str, Any],
        federation_readiness: float,
        vector_coherence: float,
    ) -> TimelineSnapshot:
        """Create immutable snapshot of federation state"""
        snapshot = TimelineSnapshot(
            tick=self.tick_counter,
            timestamp=datetime.now().timestamp(),
            orchestration_state=orchestration_state.copy(),
            diplomatic_state=diplomatic_state.copy(),
            expansion_state=expansion_state.copy(),
            first_contact_state=first_contact_state.copy(),
            federation_readiness=federation_readiness,
            vector_coherence=vector_coherence,
        )

        self.snapshots[self.tick_counter] = snapshot
        self.tick_counter += 1

        return snapshot

    def trace_causality_chain(
        self, root_event_id: str, max_depth: int = 10
    ) -> CausalChain:
        """Trace complete causal chain from root event"""
        if root_event_id not in self.events:
            return None

        chain_id = f"chain_{len(self.causal_links):06d}"
        visited = set()
        effect_chain = []

        def traverse(event_id: str, depth: int):
            if depth > max_depth or event_id in visited:
                return
            visited.add(event_id)

            event = self.events[event_id]
            for next_event_id in event.resulted_in:
                lag = (
                    self.events[next_event_id].tick - event.tick
                    if next_event_id in self.events
                    else 0
                )
                effect_chain.append((next_event_id, lag))
                traverse(next_event_id, depth + 1)

        traverse(root_event_id, 0)

        # Calculate total impact
        total_impact = sum(
            self._calculate_event_impact(eid)
            for eid, _ in effect_chain
        )

        # Get affected vectors
        affected_vectors = list(
            set(
                self.events[eid].vector
                for eid, _ in effect_chain
                if eid in self.events
            )
        )

        return CausalChain(
            chain_id=chain_id,
            root_cause=root_event_id,
            effect_chain=effect_chain,
            total_impact=total_impact,
            affected_vectors=affected_vectors,
        )

    def get_events_in_range(
        self, start_tick: int, end_tick: int
    ) -> List[FederationEvent]:
        """Query events within tick range"""
        return [
            self.events[eid]
            for eid in self.event_timeline
            if start_tick <= self.events[eid].tick <= end_tick
        ]

    def get_vector_history(self, vector: str) -> List[FederationEvent]:
        """Get all events for a specific vector"""
        return [self.events[eid] for eid in self.vector_history[vector]]

    def get_snapshot(self, tick: int) -> Optional[TimelineSnapshot]:
        """Retrieve federation state snapshot at tick"""
        return self.snapshots.get(tick)

    def get_snapshot_range(
        self, start_tick: int, end_tick: int
    ) -> List[TimelineSnapshot]:
        """Get snapshots in range"""
        return [
            self.snapshots[tick]
            for tick in sorted(self.snapshots.keys())
            if start_tick <= tick <= end_tick
        ]

    def query_by_action(self, action: str) -> List[FederationEvent]:
        """Query events by action type"""
        return [
            event for event in self.events.values()
            if event.action.lower() == action.lower()
        ]

    def query_by_vector(self, vector: str) -> List[FederationEvent]:
        """Query events by vector"""
        return [
            event for event in self.events.values()
            if event.vector.lower() == vector.lower()
        ]

    def get_event_statistics(self) -> Dict[str, Any]:
        """Get statistics about recorded events"""
        total_events = len(self.events)
        events_by_type = defaultdict(int)
        events_by_vector = defaultdict(int)

        for event in self.events.values():
            events_by_type[event.event_type.value] += 1
            events_by_vector[event.vector] += 1

        causal_links_count = len(self.causal_links)
        avg_causal_strength = (
            sum(link.strength for link in self.causal_links) /
            max(1, causal_links_count)
        )

        return {
            "total_events": total_events,
            "total_snapshots": len(self.snapshots),
            "total_causal_links": causal_links_count,
            "events_by_type": dict(events_by_type),
            "events_by_vector": dict(events_by_vector),
            "average_causal_strength": avg_causal_strength,
            "current_tick": self.tick_counter,
        }

    def _calculate_event_impact(self, event_id: str) -> float:
        """Calculate impact of an event (how many downstream effects)"""
        if event_id not in self.events:
            return 0.0

        event = self.events[event_id]
        direct_effects = len(event.resulted_in)
        # Impact scales with number of downstream effects
        return min(1.0, direct_effects * 0.1 + 0.1)

    def export_history(self) -> Dict[str, Any]:
        """Export complete history for analysis/backup"""
        return {
            "metadata": {
                "exported_at": datetime.now().timestamp(),
                "total_events": len(self.events),
                "total_snapshots": len(self.snapshots),
                "total_causal_links": len(self.causal_links),
                "current_tick": self.tick_counter,
            },
            "events": {
                eid: {
                    "event_type": event.event_type.value,
                    "timestamp": event.timestamp,
                    "tick": event.tick,
                    "vector": event.vector,
                    "action": event.action,
                    "details": event.details,
                    "resulted_in": event.resulted_in,
                    "caused_by": event.caused_by,
                }
                for eid, event in self.events.items()
            },
            "causal_links": [
                {
                    "cause": link.cause_event_id,
                    "effect": link.effect_event_id,
                    "strength": link.strength,
                    "lag_ticks": link.lag_ticks,
                    "description": link.description,
                }
                for link in self.causal_links
            ],
        }

    def import_history(self, export_data: Dict[str, Any]) -> bool:
        """Import previously exported history"""
        try:
            for eid, event_data in export_data.get("events", {}).items():
                event = FederationEvent(
                    event_id=eid,
                    event_type=EventType[event_data["event_type"].upper()],
                    timestamp=event_data["timestamp"],
                    tick=event_data["tick"],
                    vector=event_data["vector"],
                    action=event_data["action"],
                    details=event_data["details"],
                    resulted_in=event_data.get("resulted_in", []),
                    caused_by=event_data.get("caused_by", []),
                )
                self.events[eid] = event
                self.event_timeline.append(eid)
                self.vector_history[event.vector].append(eid)

            for link_data in export_data.get("causal_links", []):
                link = CausalityLink(
                    cause_event_id=link_data["cause"],
                    effect_event_id=link_data["effect"],
                    strength=link_data["strength"],
                    lag_ticks=link_data["lag_ticks"],
                    description=link_data["description"],
                )
                self.causal_links.append(link)

            self.tick_counter = export_data["metadata"]["current_tick"]
            return True
        except Exception as e:
            print(f"Import error: {e}")
            return False
