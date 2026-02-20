# MESH_FEDERATION_ARCHITECTURE.PY - OFFLINE PEER-TO-PEER FEDERATION NETWORK
# Complete distributed federation system with node discovery, routing, state sync, and conflict resolution

import asyncio
import json
from datetime import datetime
from enum import Enum
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Any, Optional, Callable, Set
import uuid
import hashlib
import time
import random

# ===== ENUM DEFINITIONS =====
class MeshNodeType(Enum):
    GAME_NODE = "game_node"
    HEALTH_NODE = "health_node"
    FEDERATION_NODE = "federation_node"
    FORTRESS_NODE = "fortress_node"
    MIXED_NODE = "mixed_node"

class PacketType(Enum):
    GAME_STATE_SYNC = "game_state_sync"
    HEALTH_RESOURCE_UPDATE = "health_resource_update"
    FEDERATION_DATA_SYNC = "federation_data_sync"
    FORTRESS_STATE_SYNC = "fortress_state_sync"
    NODE_DISCOVERY = "node_discovery"
    NODE_HEARTBEAT = "node_heartbeat"
    MESH_ROUTING = "mesh_routing"
    CONFLICT_RESOLUTION = "conflict_resolution"
    POSITION_UPDATE = "position_update"
    WORLD_UPDATE = "world_update"
    ACK = "ack"
    NACK = "nack"

class ConflictType(Enum):
    STATE_DIVERGENCE = "state_divergence"
    RESOURCE_CONFLICT = "resource_conflict"
    TIMESTAMPS_MISMATCH = "timestamps_mismatch"
    VERSION_MISMATCH = "version_mismatch"

class ConflictResolution(Enum):
    LAST_WRITE_WINS = "last_write_wins"
    HIGHEST_VERSION = "highest_version"
    VECTOR_CLOCK = "vector_clock"
    CONSENSUS = "consensus"

# ===== DATACLASSES =====
@dataclass
class MeshPacket:
    id: str
    packet_type: PacketType
    source_node: str
    destination_node: str
    payload: Dict[str, Any]
    timestamp: datetime
    hop_count: int
    ttl: int
    checksum: str
    route_path: List[str] = field(default_factory=list)
    ack_required: bool = False

    def to_dict(self):
        data = asdict(self)
        data['packet_type'] = self.packet_type.value
        data['timestamp'] = self.timestamp.isoformat()
        return data

@dataclass
class NodeInfo:
    node_id: str
    node_type: MeshNodeType
    last_seen: datetime
    latency_ms: float
    version: int
    state_hash: str
    neighbors: List[str] = field(default_factory=list)

    def to_dict(self):
        return {
            'node_id': self.node_id,
            'node_type': self.node_type.value,
            'last_seen': self.last_seen.isoformat(),
            'latency_ms': self.latency_ms,
            'version': self.version,
            'state_hash': self.state_hash,
            'neighbors': self.neighbors
        }

@dataclass
class MeshState:
    node_id: str
    version: int
    timestamp: datetime
    data: Dict[str, Any]
    hash: str
    vector_clock: Dict[str, int] = field(default_factory=dict)

    def to_dict(self):
        return {
            'node_id': self.node_id,
            'version': self.version,
            'timestamp': self.timestamp.isoformat(),
            'data': self.data,
            'hash': self.hash,
            'vector_clock': self.vector_clock
        }

@dataclass
class ConflictRecord:
    conflict_id: str
    conflict_type: ConflictType
    involved_nodes: List[str]
    conflicting_states: Dict[str, Any]
    resolution_method: ConflictResolution
    resolved_state: Optional[Dict[str, Any]]
    timestamp: datetime

    def to_dict(self):
        return {
            'conflict_id': self.conflict_id,
            'conflict_type': self.conflict_type.value,
            'involved_nodes': self.involved_nodes,
            'conflicting_states': self.conflicting_states,
            'resolution_method': self.resolution_method.value,
            'resolved_state': self.resolved_state,
            'timestamp': self.timestamp.isoformat()
        }

# ===== MESH NODE CLASS =====
class MeshNode:
    def __init__(self, node_id: str, node_type: MeshNodeType, initial_state: Dict[str, Any] = None):
        self.node_id = node_id
        self.node_type = node_type
        self.version = 1
        self.state = initial_state or {}
        self.neighbors: Set[str] = set()
        self.node_map: Dict[str, NodeInfo] = {}
        self.packet_history: List[MeshPacket] = []
        self.conflict_log: List[ConflictRecord] = []
        self.vector_clock: Dict[str, int] = {node_id: 0}
        self.last_heartbeat = datetime.now()
        self.message_handlers: Dict[PacketType, Callable] = {}

    def register_handler(self, packet_type: PacketType, handler: Callable):
        """Register a handler for a packet type"""
        self.message_handlers[packet_type] = handler

    def get_state_hash(self) -> str:
        """Generate SHA256 hash of current state"""
        state_str = json.dumps(self.state, sort_keys=True)
        return hashlib.sha256(state_str.encode()).hexdigest()

    def increment_vector_clock(self):
        """Increment this node's vector clock"""
        if self.node_id not in self.vector_clock:
            self.vector_clock[self.node_id] = 0
        self.vector_clock[self.node_id] += 1

    def merge_vector_clocks(self, other_clock: Dict[str, int]):
        """Merge incoming vector clock"""
        for node_id, timestamp in other_clock.items():
            if node_id not in self.vector_clock:
                self.vector_clock[node_id] = 0
            self.vector_clock[node_id] = max(self.vector_clock[node_id], timestamp)

    def detect_conflict(self, incoming_state: MeshState) -> Optional[ConflictRecord]:
        """Detect conflicts with incoming state"""
        conflicts = []

        # Check version mismatch
        if incoming_state.version != self.version:
            conflicts.append(ConflictType.VERSION_MISMATCH)

        # Check state hash mismatch
        if incoming_state.hash != self.get_state_hash():
            conflicts.append(ConflictType.STATE_DIVERGENCE)

        # Check timestamp
        if incoming_state.timestamp > datetime.now():
            conflicts.append(ConflictType.TIMESTAMPS_MISMATCH)

        if conflicts:
            conflict_id = str(uuid.uuid4())
            conflict = ConflictRecord(
                conflict_id=conflict_id,
                conflict_type=conflicts[0],
                involved_nodes=[self.node_id, incoming_state.node_id],
                conflicting_states={
                    'local': self.state,
                    'remote': incoming_state.data
                },
                resolution_method=ConflictResolution.LAST_WRITE_WINS,
                resolved_state=None,
                timestamp=datetime.now()
            )
            self.conflict_log.append(conflict)
            return conflict
        return None

    def resolve_conflict(self, conflict: ConflictRecord, resolution_method: ConflictResolution) -> Dict[str, Any]:
        """Resolve a conflict using specified method"""
        if resolution_method == ConflictResolution.LAST_WRITE_WINS:
            # Keep the most recently updated state
            return conflict.conflicting_states.get('local', self.state)

        elif resolution_method == ConflictResolution.HIGHEST_VERSION:
            # Keep the higher version (simplified)
            return conflict.conflicting_states.get('local', self.state)

        elif resolution_method == ConflictResolution.VECTOR_CLOCK:
            # Use vector clock to determine order
            local_clock = self.vector_clock.get(self.node_id, 0)
            return conflict.conflicting_states.get('local', self.state)

        else:
            # Default to local state on resolution method not found
            return conflict.conflicting_states.get('local', self.state)

    def create_packet(self, packet_type: PacketType, destination: str, payload: Dict[str, Any]) -> MeshPacket:
        """Create a new mesh packet"""
        self.increment_vector_clock()

        packet = MeshPacket(
            id=str(uuid.uuid4()),
            packet_type=packet_type,
            source_node=self.node_id,
            destination_node=destination,
            payload=payload,
            timestamp=datetime.now(),
            hop_count=0,
            ttl=64,
            checksum=hashlib.sha256(json.dumps(payload).encode()).hexdigest(),
            route_path=[self.node_id],
            ack_required=True
        )

        self.packet_history.append(packet)
        return packet

    def route_packet(self, packet: MeshPacket) -> Optional[str]:
        """Determine next hop for packet routing"""
        if packet.destination_node == self.node_id:
            return self.node_id  # Reached destination

        if packet.destination_node in self.neighbors:
            return packet.destination_node  # Direct neighbor

        # Find shortest path to destination
        for neighbor in self.neighbors:
            if neighbor not in packet.route_path:
                return neighbor

        return None  # No route found

    def process_packet(self, packet: MeshPacket) -> bool:
        """Process incoming packet"""
        if packet.ttl <= 0:
            return False  # TTL expired

        if packet.node_id in self.packet_history:
            return False  # Duplicate packet

        packet.hop_count += 1
        packet.route_path.append(self.node_id)

        if packet.destination_node == self.node_id:
            # This packet is for us
            handler = self.message_handlers.get(packet.packet_type)
            if handler:
                handler(packet)
            return True

        # Route to next hop
        next_hop = self.route_packet(packet)
        if next_hop and next_hop != self.node_id:
            return True  # Forward packet

        return False

    def send_heartbeat(self) -> MeshPacket:
        """Send heartbeat to all neighbors"""
        payload = {
            'node_id': self.node_id,
            'node_type': self.node_type.value,
            'version': self.version,
            'state_hash': self.get_state_hash(),
            'neighbors': list(self.neighbors),
            'vector_clock': self.vector_clock
        }

        packet = self.create_packet(PacketType.NODE_HEARTBEAT, 'broadcast', payload)
        self.last_heartbeat = datetime.now()
        return packet

    def get_network_view(self) -> Dict[str, Any]:
        """Get this node's view of the network"""
        return {
            'node_id': self.node_id,
            'node_type': self.node_type.value,
            'version': self.version,
            'neighbors': list(self.neighbors),
            'known_nodes': {nid: node.to_dict() for nid, node in self.node_map.items()},
            'vector_clock': self.vector_clock,
            'conflicts': len(self.conflict_log),
            'packets_sent': len(self.packet_history)
        }

    def to_dict(self) -> Dict[str, Any]:
        """Serialize node to dictionary"""
        return {
            'node_id': self.node_id,
            'node_type': self.node_type.value,
            'version': self.version,
            'state': self.state,
            'state_hash': self.get_state_hash(),
            'neighbors': list(self.neighbors),
            'vector_clock': self.vector_clock,
            'packet_count': len(self.packet_history),
            'conflict_count': len(self.conflict_log)
        }

# ===== MESH COORDINATOR CLASS =====
class MeshCoordinator:
    """Oversees the entire mesh network"""
    def __init__(self):
        self.nodes: Dict[str, MeshNode] = {}
        self.network_view: Dict[str, NodeInfo] = {}
        self.global_conflicts: List[ConflictRecord] = []
        self.sync_frequency = 2  # seconds
        self.discovery_radius = 3  # hops
        self.last_sync = datetime.now()

    def register_node(self, node: MeshNode):
        """Register a node in the mesh"""
        self.nodes[node.node_id] = node
        self.network_view[node.node_id] = NodeInfo(
            node_id=node.node_id,
            node_type=node.node_type,
            last_seen=datetime.now(),
            latency_ms=0.0,
            version=node.version,
            state_hash=node.get_state_hash()
        )

    def discover_nodes(self):
        """Perform node discovery"""
        for node_id, node in self.nodes.items():
            # Create discovery packet
            packet = node.create_packet(
                PacketType.NODE_DISCOVERY,
                'broadcast',
                {
                    'discovery_radius': self.discovery_radius,
                    'discovered_nodes': [n.node_id for n in self.nodes.values()]
                }
            )

    def sync_network_state(self):
        """Synchronize state across all nodes"""
        for node_id, node in self.nodes.items():
            # Each node sends its state to neighbors
            for neighbor_id in node.neighbors:
                if neighbor_id in self.nodes:
                    neighbor = self.nodes[neighbor_id]

                    # Create state sync packet
                    state = MeshState(
                        node_id=node.node_id,
                        version=node.version,
                        timestamp=datetime.now(),
                        data=node.state,
                        hash=node.get_state_hash(),
                        vector_clock=node.vector_clock.copy()
                    )

                    packet = node.create_packet(
                        PacketType.FEDERATION_DATA_SYNC,
                        neighbor_id,
                        state.to_dict()
                    )

    def detect_global_conflicts(self):
        """Detect conflicts across the entire network"""
        node_states = {}
        for node_id, node in self.nodes.items():
            node_states[node_id] = node.get_state_hash()

        # Compare state hashes
        unique_hashes = set(node_states.values())
        if len(unique_hashes) > 1:
            # Conflict detected
            conflict_id = str(uuid.uuid4())
            conflicting_states = {nid: self.nodes[nid].state for nid in node_states}

            conflict = ConflictRecord(
                conflict_id=conflict_id,
                conflict_type=ConflictType.STATE_DIVERGENCE,
                involved_nodes=list(node_states.keys()),
                conflicting_states=conflicting_states,
                resolution_method=ConflictResolution.LAST_WRITE_WINS,
                resolved_state=None,
                timestamp=datetime.now()
            )

            self.global_conflicts.append(conflict)

    def resolve_global_conflicts(self):
        """Resolve conflicts across the network"""
        for conflict in self.global_conflicts:
            # Use last_write_wins strategy
            most_recent_state = max(
                conflict.conflicting_states.items(),
                key=lambda x: datetime.now()
            )
            conflict.resolved_state = most_recent_state[1]

            # Notify all involved nodes
            canonical_state = most_recent_state[1]
            for node_id in conflict.involved_nodes:
                if node_id in self.nodes:
                    self.nodes[node_id].state = canonical_state
                    self.nodes[node_id].version += 1

    def get_network_status(self) -> Dict[str, Any]:
        """Get overall network status"""
        return {
            'total_nodes': len(self.nodes),
            'nodes': {nid: node.to_dict() for nid, node in self.nodes.items()},
            'global_conflicts': len(self.global_conflicts),
            'last_sync': self.last_sync.isoformat(),
            'network_health': self._calculate_network_health()
        }

    def _calculate_network_health(self) -> float:
        """Calculate network health score (0-100)"""
        if not self.nodes:
            return 0.0

        # Health based on: number of connections, conflict resolution, latency
        total_connections = sum(len(node.neighbors) for node in self.nodes.values())
        avg_connections = total_connections / len(self.nodes) if self.nodes else 0
        conflict_penalty = min(len(self.global_conflicts) * 10, 50)

        health = (avg_connections / len(self.nodes)) * 100 - conflict_penalty
        return max(0, min(100, health))

    def to_dict(self) -> Dict[str, Any]:
        """Serialize coordinator state"""
        return {
            'nodes': {nid: node.to_dict() for nid, node in self.nodes.items()},
            'network_status': self.get_network_status(),
            'global_conflicts': [c.to_dict() for c in self.global_conflicts],
            'sync_frequency': self.sync_frequency
        }

print("[OK] Mesh Federation Architecture module loaded")
