# MESH FEDERATION DEMO - Multi-node network simulation
# Demonstrates the complete P2P federation network with persistence

from mesh_federation_architecture import (
    MeshNode, MeshCoordinator, MeshNodeType, PacketType,
    MeshState, ConflictRecord
)
import json
from datetime import datetime

def create_demo_network():
    """Create a demo mesh network with multiple node types"""

    # Create coordinator
    coordinator = MeshCoordinator()

    # Create federation nodes
    fed_node_1 = MeshNode(
        "federation_alpha",
        MeshNodeType.FEDERATION_NODE,
        {
            "federation_name": "Alpha Federation",
            "member_count": 5,
            "era": "Evolution",
            "resources": {
                "essence": 500,
                "data": 250,
                "crystals": 100,
                "void_dust": 50
            }
        }
    )

    fed_node_2 = MeshNode(
        "federation_beta",
        MeshNodeType.FEDERATION_NODE,
        {
            "federation_name": "Beta Federation",
            "member_count": 3,
            "era": "Expansion",
            "resources": {
                "essence": 300,
                "data": 150,
                "crystals": 80,
                "void_dust": 30
            }
        }
    )

    # Create fortress nodes
    fortress_node_1 = MeshNode(
        "fortress_luminous",
        MeshNodeType.FORTRESS_NODE,
        {
            "fortress_name": "The First Luminous Node",
            "level": 1,
            "health": 100,
            "modules_online": 1,
            "active_threats": 0
        }
    )

    fortress_node_2 = MeshNode(
        "fortress_void",
        MeshNodeType.FORTRESS_NODE,
        {
            "fortress_name": "Void Anchor Station",
            "level": 2,
            "health": 95,
            "modules_online": 4,
            "active_threats": 1
        }
    )

    # Create game nodes
    game_node_1 = MeshNode(
        "game_instance_01",
        MeshNodeType.GAME_NODE,
        {
            "game_name": "Federation Campaign",
            "active_players": 2,
            "turn_count": 42,
            "current_state": "active"
        }
    )

    game_node_2 = MeshNode(
        "game_instance_02",
        MeshNodeType.GAME_NODE,
        {
            "game_name": "Exploration Mode",
            "active_players": 1,
            "turn_count": 18,
            "current_state": "paused"
        }
    )

    # Register all nodes
    nodes = [fed_node_1, fed_node_2, fortress_node_1, fortress_node_2, game_node_1, game_node_2]
    for node in nodes:
        coordinator.register_node(node)

    # Create network topology (mesh connections)
    # Federation nodes connect to fortress nodes
    fed_node_1.neighbors.add("fortress_luminous")
    fed_node_1.neighbors.add("fortress_void")
    fed_node_1.neighbors.add("game_instance_01")

    fed_node_2.neighbors.add("fortress_void")
    fed_node_2.neighbors.add("game_instance_01")
    fed_node_2.neighbors.add("game_instance_02")

    # Fortress nodes connect to each other and game nodes
    fortress_node_1.neighbors.add("federation_alpha")
    fortress_node_1.neighbors.add("game_instance_01")
    fortress_node_1.neighbors.add("fortress_void")

    fortress_node_2.neighbors.add("federation_alpha")
    fortress_node_2.neighbors.add("federation_beta")
    fortress_node_2.neighbors.add("fortress_luminous")
    fortress_node_2.neighbors.add("game_instance_02")

    # Game nodes connect to what they can see
    game_node_1.neighbors.add("federation_alpha")
    game_node_1.neighbors.add("federation_beta")
    game_node_1.neighbors.add("fortress_luminous")

    game_node_2.neighbors.add("federation_beta")
    game_node_2.neighbors.add("fortress_void")

    print("[OK] Demo mesh network created:")
    print(f"    [OK] Federation Nodes: 2")
    print(f"    [OK] Fortress Nodes: 2")
    print(f"    [OK] Game Nodes: 2")
    print(f"    [OK] Total Nodes: {len(nodes)}")

    return coordinator

def simulate_network_sync(coordinator: MeshCoordinator):
    """Simulate a network synchronization cycle"""
    print("\n[OK] === NETWORK SYNCHRONIZATION CYCLE ===")

    # Perform node discovery
    coordinator.discover_nodes()
    print("[OK] Node discovery completed")

    # Sync network state
    coordinator.sync_network_state()
    print("[OK] State synchronization completed")

    # Detect conflicts
    coordinator.detect_global_conflicts()
    print(f"[OK] Conflict detection: {len(coordinator.global_conflicts)} conflicts found")

    # Resolve conflicts
    if coordinator.global_conflicts:
        coordinator.resolve_global_conflicts()
        print("[OK] Conflicts resolved (using last_write_wins)")

    coordinator.last_sync = datetime.now()

def serialize_network_to_json(coordinator: MeshCoordinator, filepath: str):
    """Serialize complete network state to JSON"""
    network_data = coordinator.to_dict()

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(network_data, f, indent=2, default=str)

    print(f"\n[OK] Network state saved to {filepath}")
    print(f"[OK] File size: {json.dumps(network_data).__sizeof__()} bytes")

def generate_network_report(coordinator: MeshCoordinator) -> str:
    """Generate a text report of network status"""
    report = "\n=== MESH FEDERATION NETWORK REPORT ===\n"

    status = coordinator.get_network_status()

    report += f"Total Nodes: {status['total_nodes']}\n"
    report += f"Network Health: {coordinator._calculate_network_health():.1f}%\n"
    report += f"Global Conflicts: {status['global_conflicts']}\n"
    report += f"Last Sync: {status['last_sync']}\n\n"

    report += "=== NODE STATUS ===\n"
    for node_id, node_data in status['nodes'].items():
        report += f"\n{node_id}:\n"
        report += f"  Type: {node_data['node_type']}\n"
        report += f"  Version: {node_data['version']}\n"
        report += f"  Neighbors: {len(node_data['neighbors'])}\n"
        report += f"  Packets Sent: {node_data['packet_count']}\n"

    if coordinator.global_conflicts:
        report += "\n=== CONFLICTS ===\n"
        for conflict in coordinator.global_conflicts:
            report += f"\nConflict {conflict.conflict_id}:\n"
            report += f"  Type: {conflict.conflict_type.value}\n"
            report += f"  Involved Nodes: {', '.join(conflict.involved_nodes)}\n"
            report += f"  Resolution: {conflict.resolution_method.value}\n"

    report += "\n=== VECTOR CLOCKS ===\n"
    for node_id, node in coordinator.nodes.items():
        report += f"{node_id}: {node.vector_clock}\n"

    return report

if __name__ == "__main__":
    # Create demo network
    coordinator = create_demo_network()

    # Simulate network activity
    print("\n[OK] Simulating network activity...")
    for i in range(1, 4):
        print(f"\n[OK] Synchronization cycle {i}:")
        simulate_network_sync(coordinator)
        import time
        time.sleep(0.5)

    # Generate and print report
    report = generate_network_report(coordinator)
    print(report)

    # Save to JSON
    serialize_network_to_json(coordinator, "c:/workspace/mesh_network_state.json")

    print("\n[OK] === MESH FEDERATION DEMO COMPLETE ===")
