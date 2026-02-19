#!/usr/bin/env python3
"""
MEMORY GRAPH — Persistent causal history and event indexing

Stores and queries:
- Events from ship event logs
- Decisions from fleet brain
- Lore entries from narrative generation
- Causal relationships between events
- Tagged events for efficient lookup
"""

from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import uuid
import json


@dataclass
class MemoryEdge:
    """Edge in the causal memory graph"""

    edge_id: str
    source_id: str
    target_id: str
    edge_type: str  # CAUSED, CONTRIBUTED_TO, CONTRADICTS, VALIDATES, EVOLVES_TOWARD
    strength: float  # 0.0-1.0 confidence
    temporal_offset_ms: float
    reasoning: str

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "edge_id": self.edge_id,
            "source_id": self.source_id,
            "target_id": self.target_id,
            "edge_type": self.edge_type,
            "strength": self.strength,
            "temporal_offset_ms": self.temporal_offset_ms,
            "reasoning": self.reasoning,
        }


@dataclass
class MemoryNode:
    """Node in the causal memory graph"""

    node_id: str
    node_type: str  # EVENT, DECISION, OUTCOME, NARRATIVE, METAPHYSICAL_FACT
    timestamp: float
    ship_name: Optional[str]
    source: str  # "event_log", "decision_history", "lore_engine", etc.
    content: Dict[str, Any]
    summary: str
    tags: List[str] = field(default_factory=list)
    relationships: Dict[str, List[str]] = field(
        default_factory=dict
    )  # edge_type → node_ids
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "node_id": self.node_id,
            "node_type": self.node_type,
            "timestamp": self.timestamp,
            "ship_name": self.ship_name,
            "source": self.source,
            "content": self.content,
            "summary": self.summary,
            "tags": self.tags,
            "relationships": self.relationships,
            "metadata": self.metadata,
        }


class MemoryGraph:
    """Persistent graph of causally-linked events and decisions"""

    def __init__(self):
        """Initialize MemoryGraph"""
        self.nodes: Dict[str, MemoryNode] = {}
        self.edges: List[MemoryEdge] = []
        self.node_counter = 0
        self.tag_index: Dict[str, List[str]] = {}  # tag → [node_ids]
        self.ship_timeline: Dict[str, List[Tuple[float, str]]] = {}  # ship → [(timestamp, node_id)]
        self.enabled = True

    def ingest_event_log(self, ship_name: str, event_log: List[Dict[str, Any]]):
        """Ingest events from a ship's event_log into memory nodes"""
        if not self.enabled or not event_log:
            return

        for event in event_log:
            node_id = f"event_{uuid.uuid4().hex[:8]}"
            timestamp = event.get("timestamp", datetime.now().timestamp())

            node = MemoryNode(
                node_id=node_id,
                node_type="EVENT",
                timestamp=timestamp,
                ship_name=ship_name,
                source="event_log",
                content=event,
                summary=f"{event.get('event', 'unknown')} on {ship_name}",
                tags=self._extract_tags_from_event(event),
            )

            self._add_node(node)

            # Update timeline
            if ship_name not in self.ship_timeline:
                self.ship_timeline[ship_name] = []
            self.ship_timeline[ship_name].append((timestamp, node_id))

    def ingest_decision_history(
        self, ship_name: str, decision_history: List[Dict[str, Any]]
    ):
        """Ingest decisions from FleetBrain.decision_history into memory nodes"""
        if not self.enabled or not decision_history:
            return

        for decision in decision_history:
            node_id = f"decision_{uuid.uuid4().hex[:8]}"
            timestamp = decision.get("timestamp", datetime.now().timestamp())

            node = MemoryNode(
                node_id=node_id,
                node_type="DECISION",
                timestamp=timestamp,
                ship_name=ship_name or "Fleet",
                source="decision_history",
                content=decision,
                summary=f"Decision: {decision.get('strategy', 'unknown')} (confidence: {decision.get('confidence', 0):.1%})",
                tags=self._extract_tags_from_decision(decision),
            )

            self._add_node(node)

            # Update timeline
            if ship_name not in self.ship_timeline:
                self.ship_timeline[ship_name] = []
            self.ship_timeline[ship_name].append((timestamp, node_id))

    def ingest_lore_entry(self, lore_entry: Dict[str, Any]):
        """Ingest lore entries as NARRATIVE nodes"""
        if not self.enabled or not lore_entry:
            return

        node_id = f"narrative_{uuid.uuid4().hex[:8]}"
        timestamp = lore_entry.get("timestamp", datetime.now().timestamp())

        node = MemoryNode(
            node_id=node_id,
            node_type="NARRATIVE",
            timestamp=timestamp,
            ship_name=lore_entry.get("ship_name"),
            source="lore_engine",
            content=lore_entry,
            summary=f"Narrative: {lore_entry.get('entry_type', 'unknown')}",
            tags=self._extract_tags_from_lore(lore_entry),
        )

        self._add_node(node)

    def establish_causal_chain(
        self, event_sequence: List[str], edge_type: str = "CAUSED"
    ) -> List[str]:
        """Create edges linking sequential events in a causal chain"""
        edge_ids = []

        for i in range(len(event_sequence) - 1):
            source_id = event_sequence[i]
            target_id = event_sequence[i + 1]

            if source_id in self.nodes and target_id in self.nodes:
                source_node = self.nodes[source_id]
                target_node = self.nodes[target_id]
                temporal_offset = target_node.timestamp - source_node.timestamp

                edge = MemoryEdge(
                    edge_id=f"edge_{uuid.uuid4().hex[:8]}",
                    source_id=source_id,
                    target_id=target_id,
                    edge_type=edge_type,
                    strength=0.8,  # Default strength, can be adjusted
                    temporal_offset_ms=temporal_offset * 1000,
                    reasoning=f"Sequential causal link in event sequence",
                )

                self.edges.append(edge)
                edge_ids.append(edge.edge_id)

                # Update node relationships
                if edge_type not in source_node.relationships:
                    source_node.relationships[edge_type] = []
                source_node.relationships[edge_type].append(target_id)

        return edge_ids

    def query_by_tag(self, tag: str) -> List[MemoryNode]:
        """Find all nodes with a specific tag"""
        if tag not in self.tag_index:
            return []

        node_ids = self.tag_index[tag]
        return [self.nodes[nid] for nid in node_ids if nid in self.nodes]

    def query_causally_related(
        self, node_id: str
    ) -> List[Tuple[MemoryNode, str, float]]:
        """Return (node, edge_type, strength) for all causally related nodes"""
        if node_id not in self.nodes:
            return []

        node = self.nodes[node_id]
        related = []

        # Find edges where this node is source or target
        for edge in self.edges:
            if edge.source_id == node_id:
                if edge.target_id in self.nodes:
                    related.append(
                        (self.nodes[edge.target_id], edge.edge_type, edge.strength)
                    )
            elif edge.target_id == node_id:
                if edge.source_id in self.nodes:
                    related.append(
                        (self.nodes[edge.source_id], edge.edge_type, edge.strength)
                    )

        return related

    def query_temporal_range(
        self, start_ts: float, end_ts: float
    ) -> List[MemoryNode]:
        """Get all events in a time window"""
        results = []
        for node in self.nodes.values():
            if start_ts <= node.timestamp <= end_ts:
                results.append(node)

        results.sort(key=lambda n: n.timestamp)
        return results

    def query_threat_escalation_path(self) -> List[MemoryNode]:
        """Find causal chain leading to high threat: event → outcome → decision → outcome"""
        threat_nodes = []

        for node in self.nodes.values():
            if "threat" in " ".join(node.tags).lower():
                threat_nodes.append(node)

        threat_nodes.sort(key=lambda n: n.timestamp, reverse=True)

        # Build causal chain from most recent threat
        if threat_nodes:
            chain = [threat_nodes[0]]
            current = threat_nodes[0]

            # Follow causal relationships backward
            for _ in range(5):  # Limit chain length
                related = self.query_causally_related(current.node_id)
                if not related:
                    break
                # Follow first reverse cause
                for node, edge_type, strength in related:
                    if edge_type in ["CAUSED", "CONTRIBUTED_TO"]:
                        chain.append(node)
                        current = node
                        break

            return chain

        return []

    def get_ship_history(self, ship_name: str) -> List[MemoryNode]:
        """Get all memories for a specific ship"""
        if ship_name not in self.ship_timeline:
            return []

        node_ids = [nid for _, nid in self.ship_timeline[ship_name]]
        return [self.nodes[nid] for nid in node_ids if nid in self.nodes]

    def get_recent_memories(self, hours: int = 24) -> List[MemoryNode]:
        """Get memories from the last N hours"""
        cutoff_time = datetime.now().timestamp() - (hours * 3600)
        recent = [n for n in self.nodes.values() if n.timestamp >= cutoff_time]
        recent.sort(key=lambda n: n.timestamp, reverse=True)
        return recent

    def get_graph_statistics(self) -> Dict[str, Any]:
        """Return graph statistics"""
        return {
            "node_count": len(self.nodes),
            "edge_count": len(self.edges),
            "tag_count": len(self.tag_index),
            "ship_count": len(self.ship_timeline),
            "average_edges_per_node": len(self.edges) / max(len(self.nodes), 1),
        }

    def persist_to_file(self, filepath: str):
        """Save graph as JSON"""
        data = {
            "nodes": [n.to_dict() for n in self.nodes.values()],
            "edges": [e.to_dict() for e in self.edges],
            "tag_index": self.tag_index,
            "timestamp": datetime.now().timestamp(),
        }
        with open(filepath, "w") as f:
            json.dump(data, f, indent=2)

    def load_from_file(self, filepath: str):
        """Restore graph from JSON file"""
        with open(filepath, "r") as f:
            data = json.load(f)

        # Restore nodes
        for node_data in data.get("nodes", []):
            node = MemoryNode(**node_data)
            self.nodes[node.node_id] = node

        # Restore edges
        for edge_data in data.get("edges", []):
            edge = MemoryEdge(**edge_data)
            self.edges.append(edge)

        # Restore tag index
        self.tag_index = data.get("tag_index", {})

    def enable(self):
        """Enable memory graph"""
        self.enabled = True

    def disable(self):
        """Disable memory graph"""
        self.enabled = False

    def _add_node(self, node: MemoryNode):
        """Internal: Add node and update indices"""
        self.nodes[node.node_id] = node
        self.node_counter += 1

        # Update tag index
        for tag in node.tags:
            if tag not in self.tag_index:
                self.tag_index[tag] = []
            self.tag_index[tag].append(node.node_id)

    def _extract_tags_from_event(self, event: Dict[str, Any]) -> List[str]:
        """Extract tags from event"""
        tags = []

        # Add domain as tag
        if "event" in event:
            tags.append(event["event"].lower())

        # Add severity-based tags
        if "severity" in event:
            severity = event["severity"]
            if severity in ["ALERT", "CRITICAL"]:
                tags.append("high_severity")
            elif severity == "WARNING":
                tags.append("warning")

        return tags

    def _extract_tags_from_decision(self, decision: Dict[str, Any]) -> List[str]:
        """Extract tags from decision"""
        tags = ["decision"]

        if "strategy" in decision:
            tags.append(decision["strategy"].lower())

        if "confidence" in decision and decision["confidence"] > 0.8:
            tags.append("high_confidence")

        return tags

    def _extract_tags_from_lore(self, lore: Dict[str, Any]) -> List[str]:
        """Extract tags from lore entry"""
        tags = ["lore"]

        if "entry_type" in lore:
            tags.append(lore["entry_type"].lower())

        return tags
