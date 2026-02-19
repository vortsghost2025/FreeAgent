#!/usr/bin/env python3
"""
PHASE VIII INTEGRATION: Mesh Federation Network ↔ Federation Game Console
===========================================================================

Integration layer connecting the mesh federation network with the main
federation game console, enabling multiplayer federation gameplay through
peer-to-peer offline mesh networking.

Bridges:
  • Mesh network ↔ Game console events
  • Player synchronization ↔ Game state
  • Health resources ↔ Consciousness system
  • Federation data ↔ Game consciousness
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from mesh_federation_network import (
    MeshNetworkFederation, MeshFederationGameProtocol,
    initialize_mesh_federation
)

from federation_game_console import (
    GameConsole, ConsciousnessSheet
)


class MeshFederationGameIntegration:
    """Integration layer between mesh federation and federation game console"""

    def __init__(self, game_console: GameConsole = None, node_count: int = 3):
        self.console = game_console or GameConsole()
        self.mesh: MeshNetworkFederation = None
        self.protocol: MeshFederationGameProtocol = None
        self.node_count = node_count
        self.is_integrated = False

    async def initialize(self):
        """Initialize mesh federation and integrate with game console"""
        print("[INIT] Initializing Mesh Federation Integration...")

        # Initialize mesh federation network
        self.mesh, self.protocol = await initialize_mesh_federation(self.node_count)
        self.is_integrated = True

        print(f"[OK] Mesh network initialized with {self.node_count} nodes")
        print(f"[OK] Federation console initialized")
        print(f"[OK] Game protocol ID: {self.protocol.game_id}")

    async def sync_console_to_mesh(self):
        """Sync federation game console state to mesh network"""
        if not self.is_integrated:
            return

        # Get current consciousness state
        cons = self.console.consciousness

        # Create game state from console
        game_state = {
            'game_id': self.protocol.game_id,
            'turn_number': self.console.turn_number,
            'phase': str(self.console.game_phase),
            'federation_name': 'USS Chaosbringer',
            'consciousness': {
                'morale': cons.morale,
                'identity': cons.identity,
                'anxiety': cons.anxiety,
                'confidence': cons.confidence,
                'expansion_hunger': cons.expansion_hunger,
                'diplomacy_tendency': cons.diplomacy_tendency
            },
            'version': 1
        }

        # Sync to mesh
        await self.mesh.sync_game_state(game_state)

    async def sync_mesh_to_console(self):
        """Sync mesh network state back to game console"""
        if not self.is_integrated:
            return

        # Get mesh game states
        if self.protocol.game_id in self.mesh.game_states:
            mesh_state = self.mesh.game_states[self.protocol.game_id]

            # Update console consciousness based on mesh data
            if 'consciousness' in mesh_state.consciousness_data:
                cons_data = mesh_state.consciousness_data['consciousness']
                # Could update console consciousness here

    async def broadcast_federation_action(self, action_type: str, action_data: dict):
        """Broadcast a federation action through the mesh"""
        if not self.is_integrated:
            return

        await self.protocol.broadcast_federation_event(action_type, action_data)

    async def share_consciousness_health_resource(self, resource_type: str, difficulty: int = 3):
        """Share consciousness-supporting health resources through the mesh"""
        if not self.is_integrated:
            return

        resource_descriptions = {
            'meditation': {
                'content': 'Guided meditation for consciousness expansion and morale boost',
                'type': 'meditation'
            },
            'dream_exploration': {
                'content': 'Journey through collective dreams to expand identity and insight',
                'type': 'meditation'
            },
            'prophecy_study': {
                'content': 'Study prophecies to prepare for possible futures and reduce anxiety',
                'type': 'support'
            },
            'identity_reflection': {
                'content': 'Deep reflection on federation identity and purpose',
                'type': 'support'
            },
            'diplomatic_practice': {
                'content': 'Communication exercises to strengthen diplomacy_tendency',
                'type': 'community'
            },
            'expansion_exercise': {
                'content': 'Strategic exercises for expansion planning and confidence building',
                'type': 'exercise'
            }
        }

        resource_def = resource_descriptions.get(resource_type, resource_descriptions['meditation'])

        resource = {
            'resource_id': f'{resource_type}_{self.console.turn_number}',
            'resource_type': resource_def['type'],
            'content': resource_def['content'],
            'difficulty_level': difficulty,
            'federation': 'USS Chaosbringer',
            'turn': self.console.turn_number
        }

        await self.mesh.sync_health_resource(resource)

    def get_mesh_statistics(self):
        """Get statistics from the mesh network"""
        if not self.is_integrated:
            return {}
        return self.mesh.get_statistics()

    async def run_turn_with_mesh_sync(self):
        """Execute a complete turn with mesh network synchronization"""
        if not self.is_integrated:
            return

        print(f"\n[TURN {self.console.turn_number}] Federation + Mesh Synchronized")

        # Sync console state to mesh
        await self.sync_console_to_mesh()

        # Share health resources
        await self.share_consciousness_health_resource('meditation')
        await self.share_consciousness_health_resource('prophecy_study')

        # Broadcast federation events
        if self.console.turn_number % 2 == 0:
            await self.broadcast_federation_action(
                'turn_update',
                {
                    'turn': self.console.turn_number,
                    'federation': 'USS Chaosbringer',
                    'message': f'Turn {self.console.turn_number} - Federation advancing'
                }
            )

        # Run mesh network processing
        await self.mesh.run_network_loop(1)

        # Sync mesh state back to console (if needed)
        await self.sync_mesh_to_console()

        print("[OK] Turn synchronized with mesh network")


async def demo_integration():
    """Demonstrate Phase VIII integration with federation game console"""
    print("="*80)
    print("PHASE VIII INTEGRATION DEMO: Mesh Federation Network ↔ Game Console")
    print("="*80)
    print()

    # Initialize integration
    integration = MeshFederationGameIntegration(node_count=4)
    await integration.initialize()

    print("\n" + "="*80)
    print("FEDERATION GAME + MESH NETWORK GAMEPLAY")
    print("="*80)

    # Simulate 3 turns of gameplay with mesh synchronization
    for turn in range(1, 4):
        print(f"\n[TURN {turn}]")
        print("-" * 80)

        # Simulate turn progression
        integration.console.turn_number = turn

        # Run turn with mesh sync
        await integration.run_turn_with_mesh_sync()

        # Show network status
        stats = integration.get_mesh_statistics()
        print(f"\nMesh Network Status:")
        print(f"  Total Nodes: {stats.get('total_nodes', 0)}")
        print(f"  Packets Sent: {stats.get('statistics', {}).get('packets_sent', 0)}")
        print(f"  Health Resources: {stats.get('health_resources_shared', 0)}")

    print("\n" + "="*80)
    print("[OK] PHASE VIII INTEGRATION COMPLETE")
    print("="*80)
    print()
    print("Federation Game Console is now networked through mesh federation!")
    print("Multiple players can join the same federation through peer-to-peer sync.")
    print()


if __name__ == "__main__":
    asyncio.run(demo_integration())
