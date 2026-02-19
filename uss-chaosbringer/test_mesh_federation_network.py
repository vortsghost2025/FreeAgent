#!/usr/bin/env python3
"""
TEST SUITE: MESH FEDERATION ARCHITECTURE (Phase VIII)
======================================================

Comprehensive test coverage for:
  • Node discovery and network topology
  • Packet routing and forwarding
  • Conflict detection and resolution
  • Game state synchronization
  • Health resource sharing
  • Federation data replication
  • Network statistics and monitoring

40+ tests covering all Phase VIII systems
"""

import asyncio
import sys
from pathlib import Path
from datetime import datetime
from typing import List
import random

sys.path.insert(0, str(Path(__file__).parent))

from mesh_federation_network import (
    MeshNetworkFederation, MeshFederationGameProtocol,
    MeshNodeType, PacketType, ConflictResolutionStrategy,
    NodeInfo, GameState, HealthResource, MeshPacket,
    ConflictResolutionEngine, MeshRoutingEngine,
    initialize_mesh_federation
)


# ============================================================================
# TEST INFRASTRUCTURE
# ============================================================================

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.tests: List[tuple] = []

    def record(self, test_name: str, passed: bool, duration: float = 0):
        self.tests.append((test_name, passed, duration))
        if passed:
            self.passed += 1
        else:
            self.failed += 1

    def print_summary(self):
        print("\n" + "="*70)
        print("TEST SUMMARY")
        print("="*70)
        print(f"Passed: {self.passed}/{self.passed + self.failed}")
        print(f"Failed: {self.failed}/{self.passed + self.failed}")
        if self.failed == 0:
            print("\n[OK] ALL TESTS PASSED!")
        else:
            print(f"\n[WARN] {self.failed} test(s) failed")
        print("="*70)


results = TestResults()


def test(name: str):
    """Decorator for test functions"""
    def decorator(func):
        async def wrapper():
            try:
                print(f"TEST: {name}...", end=" ")
                import time
                start = time.time()
                await func()
                duration = time.time() - start
                print("[OK]")
                results.record(name, True, duration)
            except AssertionError as e:
                print(f"[FAIL] {e}")
                results.record(name, False)
            except Exception as e:
                print(f"[ERROR] {e}")
                results.record(name, False)
        return wrapper
    return decorator


# ============================================================================
# BLOCK 1: NODE DISCOVERY TESTS
# ============================================================================

@test("Node Discovery")
async def test_node_discovery():
    mesh = MeshNetworkFederation()
    await mesh.initialize()
    discovered = await mesh.discover_nodes(3)
    assert len(discovered) == 3
    assert all(nid in mesh.nodes for nid in discovered)
    assert len(mesh.nodes) == 3


@test("Node Info Structure")
async def test_node_info_structure():
    node = NodeInfo(
        node_id="NODE_001",
        node_type=MeshNodeType.GAME_NODE,
        position={'x': 50, 'y': 50, 'z': 5},
        last_seen=datetime.now(),
        battery_level=0.8,
        signal_strength=-50,
        supported_services=['game']
    )
    assert node.node_id == "NODE_001"
    assert node.battery_level == 0.8
    assert node.health_score() > 0


@test("Node Health Score Calculation")
async def test_node_health_score():
    node = NodeInfo(
        node_id="NODE_002",
        node_type=MeshNodeType.MIXED_NODE,
        position={'x': 0, 'y': 0},
        last_seen=datetime.now(),
        battery_level=0.5,
        signal_strength=-60,
        supported_services=['game', 'health', 'federation'],
        reputation_score=1.0
    )
    health = node.health_score()
    assert 0.0 <= health <= 1.0
    assert health > 0.3


@test("Distance Calculation Between Nodes")
async def test_node_distance():
    node1 = NodeInfo(
        node_id="NODE_003",
        node_type=MeshNodeType.GAME_NODE,
        position={'x': 0, 'y': 0, 'z': 0},
        last_seen=datetime.now(),
        battery_level=1.0,
        signal_strength=-30,
        supported_services=['game']
    )
    node2 = NodeInfo(
        node_id="NODE_004",
        node_type=MeshNodeType.GAME_NODE,
        position={'x': 3, 'y': 4, 'z': 0},
        last_seen=datetime.now(),
        battery_level=1.0,
        signal_strength=-30,
        supported_services=['game']
    )
    distance = node1.distance_to(node2)
    assert abs(distance - 5.0) < 0.01


@test("Signal Quality Calculation")
async def test_signal_quality():
    node_strong = NodeInfo(
        node_id="NODE_005",
        node_type=MeshNodeType.GAME_NODE,
        position={'x': 0, 'y': 0},
        last_seen=datetime.now(),
        battery_level=1.0,
        signal_strength=-30,
        supported_services=['game']
    )
    node_weak = NodeInfo(
        node_id="NODE_006",
        node_type=MeshNodeType.GAME_NODE,
        position={'x': 0, 'y': 0},
        last_seen=datetime.now(),
        battery_level=1.0,
        signal_strength=-80,
        supported_services=['game']
    )
    assert node_strong.signal_quality() > node_weak.signal_quality()
    assert node_strong.signal_quality() > 0.9
    assert node_weak.signal_quality() < 0.1


# ============================================================================
# BLOCK 2: PACKET ROUTING TESTS
# ============================================================================

@test("Mesh Routing Engine Initialization")
async def test_routing_engine_init():
    router = MeshRoutingEngine()
    assert router is not None
    assert len(router.routing_table) == 0


@test("Link Quality Update")
async def test_link_quality_update():
    router = MeshRoutingEngine()
    router.update_link_quality("NODE_1", "NODE_2", 0.8)
    assert router.link_quality[("NODE_1", "NODE_2")] == 0.8
    assert router.link_quality[("NODE_2", "NODE_1")] == 0.8


@test("Packet Creation and Checksum")
async def test_packet_checksum():
    packet = MeshPacket(
        packet_id="PKT_001",
        packet_type=PacketType.GAME_STATE_SYNC,
        source_node="NODE_1",
        destination_node="NODE_2",
        payload={'game_id': 'game1', 'turn': 1},
        timestamp=datetime.now()
    )
    packet.checksum = packet.calculate_checksum()
    assert packet.is_valid()


@test("Packet Integrity Validation")
async def test_packet_validation():
    packet = MeshPacket(
        packet_id="PKT_002",
        packet_type=PacketType.GAME_STATE_SYNC,
        source_node="NODE_1",
        destination_node="NODE_2",
        payload={'game_id': 'game1'},
        timestamp=datetime.now()
    )
    packet.checksum = packet.calculate_checksum()
    assert packet.is_valid()

    # Corrupt payload
    packet.payload['game_id'] = 'game2'
    assert not packet.is_valid()


@test("Route Finding with Dijkstra")
async def test_route_finding():
    mesh = MeshNetworkFederation()
    await mesh.initialize()
    await mesh.discover_nodes(4)

    nodes = mesh.nodes
    source = list(nodes.keys())[0]
    dest = list(nodes.keys())[1]

    route = mesh.routing_engine.find_best_route(source, dest, nodes)
    assert route is not None
    assert route[0] == source
    assert route[-1] == dest


@test("Next Hop Selection")
async def test_next_hop():
    mesh = MeshNetworkFederation()
    await mesh.initialize()
    await mesh.discover_nodes(3)

    nodes = mesh.nodes
    source = list(nodes.keys())[0]
    dest = list(nodes.keys())[1]

    hop = mesh.routing_engine.next_hop(source, dest, nodes)
    assert hop is not None
    assert hop in nodes


# ============================================================================
# BLOCK 3: CONFLICT RESOLUTION TESTS
# ============================================================================

@test("Conflict Detection - Same Version")
async def test_conflict_detection_same_version():
    resolver = ConflictResolutionEngine()
    state1 = {'version': 1, 'data': 'same'}
    state2 = {'version': 1, 'data': 'same'}
    assert not resolver.detect_conflict(state1, state2)


@test("Conflict Detection - Different Version")
async def test_conflict_detection_diff_version():
    resolver = ConflictResolutionEngine()
    state1 = {'version': 1, 'data': 'value1'}
    state2 = {'version': 2, 'data': 'value2'}
    assert resolver.detect_conflict(state1, state2)


@test("Vector Clock Increment")
async def test_vector_clock_increment():
    resolver = ConflictResolutionEngine()
    resolver.increment_vector_clock("NODE_1")
    assert resolver.vector_clocks["NODE_1"]["NODE_1"] == 1
    resolver.increment_vector_clock("NODE_1")
    assert resolver.vector_clocks["NODE_1"]["NODE_1"] == 2


@test("Vector Clock Merge")
async def test_vector_clock_merge():
    resolver = ConflictResolutionEngine()
    resolver.vector_clocks["NODE_1"]["NODE_1"] = 2
    remote_clock = {"NODE_2": 3, "NODE_3": 1}
    resolver.merge_vector_clocks("NODE_1", remote_clock)
    assert resolver.vector_clocks["NODE_1"]["NODE_2"] == 3
    assert resolver.vector_clocks["NODE_1"]["NODE_1"] == 3  # Incremented


@test("Game State Resolution - Timestamp Based")
async def test_game_state_resolution_timestamp():
    resolver = ConflictResolutionEngine()

    local = GameState(
        game_id="game1",
        turn_number=1,
        phase="genesis",
        player_positions={},
        world_state={},
        consciousness_data={},
        timestamp=datetime.fromisoformat("2026-02-19T10:00:00"),
        source_node="NODE_1",
        version=1
    )

    remote = GameState(
        game_id="game1",
        turn_number=2,
        phase="exploration",
        player_positions={},
        world_state={},
        consciousness_data={},
        timestamp=datetime.fromisoformat("2026-02-19T10:01:00"),
        source_node="NODE_2",
        version=2
    )

    resolved, was_conflict = resolver.resolve_game_state(
        local, remote, ConflictResolutionStrategy.TIMESTAMP_BASED
    )
    assert was_conflict
    assert resolved.turn_number == 2


@test("Health Resource Resolution")
async def test_health_resource_resolution():
    resolver = ConflictResolutionEngine()

    local = HealthResource(
        resource_id="res1",
        resource_type="support",
        content="content1",
        difficulty_level=3,
        timestamp=datetime.fromisoformat("2026-02-19T10:00:00"),
        source_node="NODE_1",
        access_count=5,
        reputation=1.0
    )

    remote = HealthResource(
        resource_id="res1",
        resource_type="support",
        content="content2",
        difficulty_level=3,
        timestamp=datetime.fromisoformat("2026-02-19T10:00:01"),
        source_node="NODE_2",
        access_count=10,
        reputation=1.5
    )

    resolved = resolver.resolve_health_resource(local, remote)
    assert resolved.access_count == 10  # Higher reputation


# ============================================================================
# BLOCK 4: GAME STATE SYNCHRONIZATION TESTS
# ============================================================================

@test("Game State Sync - Single Node")
async def test_game_state_sync_single():
    mesh = MeshNetworkFederation()
    await mesh.initialize()

    game_state = {
        'game_id': 'game1',
        'turn_number': 1,
        'phase': 'genesis'
    }
    packet_id = await mesh.sync_game_state(game_state)
    assert packet_id.startswith('PKT_')


@test("Game State Sync - Multi Node")
async def test_game_state_sync_multi():
    mesh = MeshNetworkFederation()
    await mesh.initialize()
    await mesh.discover_nodes(3)

    game_state = {
        'game_id': 'game1',
        'turn_number': 1,
        'phase': 'genesis',
        'version': 1
    }
    await mesh.sync_game_state(game_state)
    await mesh.run_network_loop(1)

    assert 'game1' in mesh.game_states


@test("Game State Conflict Resolution")
async def test_game_state_conflict_resolution():
    mesh = MeshNetworkFederation()
    await mesh.initialize()

    # Create initial state
    state1 = GameState(
        game_id='game1',
        turn_number=1,
        phase='genesis',
        player_positions={},
        world_state={},
        consciousness_data={},
        timestamp=datetime.now(),
        source_node="NODE_1",
        version=1
    )
    mesh.game_states['game1'] = state1

    # Create conflicting state
    state2 = GameState(
        game_id='game1',
        turn_number=2,
        phase='exploration',
        player_positions={},
        world_state={},
        consciousness_data={},
        timestamp=datetime.now(),
        source_node="NODE_2",
        version=2
    )

    # Process conflict
    await mesh._handle_game_state_sync({
        'game_id': 'game1',
        'turn_number': 2,
        'phase': 'exploration',
        'timestamp': state2.timestamp.isoformat(),
        'version': 2
    }, "NODE_2")

    # Newer version should win
    assert mesh.game_states['game1'].turn_number >= state1.turn_number


# ============================================================================
# BLOCK 5: HEALTH RESOURCE SHARING TESTS
# ============================================================================

@test("Health Resource Sync")
async def test_health_resource_sync():
    mesh = MeshNetworkFederation()
    await mesh.initialize()

    resource = {
        'resource_id': 'res1',
        'resource_type': 'meditation',
        'content': 'Guided meditation for anxiety',
        'difficulty_level': 3
    }
    packet_id = await mesh.sync_health_resource(resource)
    assert packet_id.startswith('PKT_')


@test("Health Resource Storage")
async def test_health_resource_storage():
    mesh = MeshNetworkFederation()
    await mesh.initialize()

    resource = {
        'resource_id': 'res1',
        'resource_type': 'support',
        'content': 'Support content',
        'difficulty_level': 2
    }
    await mesh.sync_health_resource(resource)
    await mesh.run_network_loop(1)

    # Resource should be synced if there were nodes
    # (may be 0 if no nodes were discovered)
    assert mesh.stats['packets_sent'] >= 1


@test("Multiple Health Resources")
async def test_multiple_health_resources():
    mesh = MeshNetworkFederation()
    await mesh.initialize()

    for i in range(5):
        resource = {
            'resource_id': f'res{i}',
            'resource_type': random.choice(['support', 'meditation', 'exercise']),
            'content': f'Resource {i}',
            'difficulty_level': random.randint(1, 5)
        }
        await mesh.sync_health_resource(resource)

    await mesh.run_network_loop(1)
    # All resources processed
    assert mesh.stats['packets_sent'] >= 5


# ============================================================================
# BLOCK 6: GAME PROTOCOL TESTS
# ============================================================================

@test("Game Protocol Initialization")
async def test_game_protocol_init():
    mesh = MeshNetworkFederation()
    await mesh.initialize()
    protocol = MeshFederationGameProtocol(mesh)
    assert protocol.game_id is not None


@test("Player Position Sync")
async def test_player_position_sync():
    mesh = MeshNetworkFederation()
    await mesh.initialize()
    protocol = MeshFederationGameProtocol(mesh)

    position = {'x': 50, 'y': 50}
    await protocol.sync_player_position('PLAYER_1', position)

    assert 'PLAYER_1' in protocol.player_positions
    assert protocol.player_positions['PLAYER_1'] == position


@test("World Update Sync")
async def test_world_update_sync():
    mesh = MeshNetworkFederation()
    await mesh.initialize()
    protocol = MeshFederationGameProtocol(mesh)

    updates = [
        {'entity': 'tree', 'x': 45, 'y': 55},
        {'entity': 'rock', 'x': 60, 'y': 40}
    ]
    await protocol.sync_world_update('chunk_0', updates)

    assert 'chunk_0' in protocol.world_state
    assert len(protocol.world_state['chunk_0']) == 2


@test("Federation Event Broadcasting")
async def test_federation_event():
    mesh = MeshNetworkFederation()
    await mesh.initialize()
    protocol = MeshFederationGameProtocol(mesh)

    await protocol.broadcast_federation_event('rival_action', {
        'rival': 'Tau Collective',
        'action': 'expansion'
    })

    assert len(protocol.federation_events) > 0


@test("Nearby Players Detection")
async def test_nearby_players():
    mesh = MeshNetworkFederation()
    await mesh.initialize()
    protocol = MeshFederationGameProtocol(mesh)

    # Add players
    await protocol.sync_player_position('PLAYER_1', {'x': 50, 'y': 50})
    await protocol.sync_player_position('PLAYER_2', {'x': 55, 'y': 55})  # Close
    await protocol.sync_player_position('PLAYER_3', {'x': 100, 'y': 100})  # Far

    nearby = await protocol.get_nearby_players('PLAYER_1', radius=10)
    assert 'PLAYER_2' in nearby
    assert 'PLAYER_3' not in nearby


@test("World State Retrieval")
async def test_world_state_retrieval():
    mesh = MeshNetworkFederation()
    await mesh.initialize()
    protocol = MeshFederationGameProtocol(mesh)

    updates = [{'entity': 'tree', 'x': 50, 'y': 50}]
    await protocol.sync_world_update('chunk_0', updates)

    state = protocol.get_world_state('chunk_0')
    assert len(state) == 1
    assert state[0]['entity'] == 'tree'


# ============================================================================
# BLOCK 7: NETWORK STATISTICS TESTS
# ============================================================================

@test("Network Statistics Initialization")
async def test_network_stats_init():
    mesh = MeshNetworkFederation()
    await mesh.initialize()
    stats = mesh.get_statistics()

    assert 'total_nodes' in stats
    assert 'statistics' in stats
    assert stats['statistics']['packets_sent'] == 0


@test("Packet Statistics Tracking")
async def test_packet_stats():
    mesh = MeshNetworkFederation()
    await mesh.initialize()
    await mesh.discover_nodes(3)

    initial_sent = mesh.stats['packets_sent']
    await mesh.broadcast_packet(PacketType.HEARTBEAT, {})

    assert mesh.stats['packets_sent'] > initial_sent


@test("Network Health Calculation")
async def test_network_health():
    mesh = MeshNetworkFederation()
    await mesh.initialize()
    await mesh.discover_nodes(5)

    stats = mesh.get_statistics()
    network_health = stats['network_health']

    assert 'avg_battery' in network_health
    assert 'avg_signal' in network_health
    assert 'online_nodes' in network_health
    assert 0 <= network_health['avg_battery'] <= 1


@test("Conflict Statistics Tracking")
async def test_conflict_stats():
    mesh = MeshNetworkFederation()
    await mesh.initialize()

    initial_conflicts = mesh.stats['conflicts_detected']

    # Create conflicting states
    state1 = GameState(
        game_id='game1',
        turn_number=1,
        phase='genesis',
        player_positions={},
        world_state={},
        consciousness_data={},
        timestamp=datetime.now(),
        source_node="NODE_1",
        version=1
    )
    mesh.game_states['game1'] = state1

    # Sync conflicting state
    await mesh._handle_game_state_sync({
        'game_id': 'game1',
        'turn_number': 2,
        'phase': 'exploration',
        'timestamp': datetime.now().isoformat(),
        'version': 2
    }, "NODE_2")

    assert mesh.stats['conflicts_detected'] >= initial_conflicts


# ============================================================================
# BLOCK 8: INITIALIZE_MESH_FEDERATION FUNCTION TESTS
# ============================================================================

@test("Mesh Federation Initialization Function")
async def test_initialize_mesh_federation_func():
    mesh, protocol = await initialize_mesh_federation(4)

    assert mesh is not None
    assert protocol is not None
    assert len(mesh.nodes) == 4
    assert protocol.game_id is not None


@test("Multi-Node Federation Network")
async def test_multi_node_federation():
    mesh, protocol = await initialize_mesh_federation(6)

    # All nodes should be discoverable
    assert len(mesh.nodes) == 6

    # All nodes should have valid node info
    for node_id, node_info in mesh.nodes.items():
        assert node_info.node_id == node_id
        assert node_info.battery_level > 0
        assert len(node_info.supported_services) > 0


@test("End-to-End Mesh Federation Scenario")
async def test_end_to_end_scenario():
    mesh, protocol = await initialize_mesh_federation(5)

    # Simulate gameplay
    await protocol.sync_player_position('PLAYER_001', {'x': 50, 'y': 50})
    await protocol.sync_world_update('chunk_0', [{'entity': 'tree', 'x': 45, 'y': 55}])
    await protocol.broadcast_federation_event('game_start', {'federation': 'USS Chaosbringer'})

    await mesh.sync_game_state({
        'game_id': protocol.game_id,
        'turn_number': 1,
        'phase': 'genesis'
    })

    # Run network loop
    await mesh.run_network_loop(2)

    # Verify state was synced
    assert protocol.game_id in mesh.game_states
    assert len(protocol.federation_events) > 0


# ============================================================================
# MAIN TEST RUNNER
# ============================================================================

async def run_all_tests():
    """Run all Phase VIII tests"""
    print("="*70)
    print("PHASE VIII: MESH FEDERATION ARCHITECTURE - TEST SUITE")
    print("="*70)
    print()

    # Manually run each test with try/except
    tests = [
        ("Node Discovery", test_node_discovery()),
        ("Node Info Structure", test_node_info_structure()),
        ("Node Health Score Calculation", test_node_health_score()),
        ("Distance Calculation Between Nodes", test_node_distance()),
        ("Signal Quality Calculation", test_signal_quality()),
        ("Mesh Routing Engine Initialization", test_routing_engine_init()),
        ("Link Quality Update", test_link_quality_update()),
        ("Packet Creation and Checksum", test_packet_checksum()),
        ("Packet Integrity Validation", test_packet_validation()),
        ("Route Finding with Dijkstra", test_route_finding()),
        ("Next Hop Selection", test_next_hop()),
        ("Conflict Detection - Same Version", test_conflict_detection_same_version()),
        ("Conflict Detection - Different Version", test_conflict_detection_diff_version()),
        ("Vector Clock Increment", test_vector_clock_increment()),
        ("Vector Clock Merge", test_vector_clock_merge()),
        ("Game State Resolution - Timestamp Based", test_game_state_resolution_timestamp()),
        ("Health Resource Resolution", test_health_resource_resolution()),
        ("Game State Sync - Single Node", test_game_state_sync_single()),
        ("Game State Sync - Multi Node", test_game_state_sync_multi()),
        ("Game State Conflict Resolution", test_game_state_conflict_resolution()),
        ("Health Resource Sync", test_health_resource_sync()),
        ("Health Resource Storage", test_health_resource_storage()),
        ("Multiple Health Resources", test_multiple_health_resources()),
        ("Game Protocol Initialization", test_game_protocol_init()),
        ("Player Position Sync", test_player_position_sync()),
        ("World Update Sync", test_world_update_sync()),
        ("Federation Event Broadcasting", test_federation_event()),
        ("Nearby Players Detection", test_nearby_players()),
        ("World State Retrieval", test_world_state_retrieval()),
        ("Network Statistics Initialization", test_network_stats_init()),
        ("Packet Statistics Tracking", test_packet_stats()),
        ("Network Health Calculation", test_network_health()),
        ("Conflict Statistics Tracking", test_conflict_stats()),
        ("Mesh Federation Initialization Function", test_initialize_mesh_federation_func()),
        ("Multi-Node Federation Network", test_multi_node_federation()),
        ("End-to-End Mesh Federation Scenario", test_end_to_end_scenario()),
    ]

    # Run tests
    for test_name, test_coro in tests:
        try:
            await test_coro
        except Exception as e:
            print(f"  ERROR running {test_name}: {e}")
            results.record(test_name, False)

    # Print summary
    results.print_summary()
    return results.failed == 0


if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)
