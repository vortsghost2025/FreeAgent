/**
 * Phase 4.3: Dynamic Capability Discovery Tests
 * Comprehensive test suite for heartbeat, capability registry, broadcasting, and discovery engine
 */

import {
  HeartbeatManager,
  CapabilityRegistry,
  CapabilityBroadcaster,
  CapabilityDiscoveryEngine
} from './medical/federation/capability-discovery.js';

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`✗ ${name}: ${error.message}`);
    testsFailed++;
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message} (expected ${expected}, got ${actual})`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// ============================================================================
// TEST SUITE 1: HeartbeatManager
// ============================================================================

console.log('\n=== PHASE 4.3.1: HEARTBEAT MANAGER TESTS ===\n');

test('HeartbeatManager: Register node', () => {
  const manager = new HeartbeatManager({ debug: false });

  manager.registerNode('node-1', {
    capabilities: ['diagnosis', 'imaging'],
    region: 'us-east-1',
    cluster: 'cluster-1'
  });

  const status = manager.getNodeStatus('node-1');
  assert(status !== null, 'Node registered');
  assertEqual(status.nodeId, 'node-1', 'Node ID matches');
  assertEqual(status.status, 'online', 'Default status is online');
  assertEqual(status.capabilities.length, 2, 'Capabilities registered');
});

test('HeartbeatManager: Record heartbeat', () => {
  const manager = new HeartbeatManager();

  manager.registerNode('node-1', { capabilities: ['test'] });
  const before = manager.getNodeStatus('node-1');
  const initialBeatCount = before.beatCount;

  manager.recordBeat('node-1', { load: 45 });

  const after = manager.getNodeStatus('node-1');
  assertEqual(after.beatCount, initialBeatCount + 1, 'Beat count incremented');
  assertEqual(after.load, 45, 'Load updated');
});

test('HeartbeatManager: Update capabilities on heartbeat', () => {
  const manager = new HeartbeatManager();

  manager.registerNode('node-1', { capabilities: ['old-cap'] });
  manager.recordBeat('node-1', { capabilities: ['new-cap', 'another-cap'] });

  const status = manager.getNodeStatus('node-1');
  assertEqual(status.capabilities.length, 2, 'Capabilities updated');
  assert(status.capabilities.includes('new-cap'), 'New capability present');
});

test('HeartbeatManager: Get online nodes', () => {
  const manager = new HeartbeatManager();

  manager.registerNode('node-1', { capabilities: [] });
  manager.registerNode('node-2', { capabilities: [] });

  const online = manager.getOnlineNodes();
  assertEqual(online.length, 2, 'Both nodes online');
});

test('HeartbeatManager: Get nodes with capability', () => {
  const manager = new HeartbeatManager();

  manager.registerNode('node-1', { capabilities: ['diagnosis', 'imaging'] });
  manager.registerNode('node-2', { capabilities: ['nlp'] });
  manager.registerNode('node-3', { capabilities: ['diagnosis', 'genetics'] });

  const withDiagnosis = manager.getNodesWithCapability('diagnosis');
  assertEqual(withDiagnosis.length, 2, 'Two nodes with diagnosis capability');
});

test('HeartbeatManager: Get nodes by region', () => {
  const manager = new HeartbeatManager();

  manager.registerNode('node-1', { region: 'us-east-1' });
  manager.registerNode('node-2', { region: 'eu-west-1' });
  manager.registerNode('node-3', { region: 'us-east-1' });

  const eastNodes = manager.getNodesByRegion('us-east-1');
  assertEqual(eastNodes.length, 2, 'Two nodes in us-east-1');
});

test('HeartbeatManager: Check stale nodes', (done) => {
  const manager = new HeartbeatManager({ timeout: 100, interval: 50, debug: false });

  manager.registerNode('node-1', { capabilities: [] });

  // Manually set last beat to past
  const node = manager.getNodeStatus('node-1');
  node.lastBeat = Date.now() - 200; // 200ms ago, exceeds 100ms timeout

  const stale = manager.checkStaleNodes();
  assertEqual(stale.length, 1, 'One stale node detected');
  assertEqual(stale[0].nodeId, 'node-1', 'Correct node marked stale');
});

test('HeartbeatManager: Node handler callback', () => {
  const manager = new HeartbeatManager();
  let updateCalled = false;

  manager.onNodeUpdate(({ nodeId, nodeInfo }) => {
    updateCalled = true;
  });

  manager.registerNode('node-1', { capabilities: [] });
  manager.recordBeat('node-1', { load: 50 });

  assert(updateCalled, 'Handler was called on heartbeat');
});

test('HeartbeatManager: Statistics', () => {
  const manager = new HeartbeatManager();

  manager.registerNode('node-1', { capabilities: ['cap1', 'cap2'] });
  manager.registerNode('node-2', { capabilities: ['cap2', 'cap3'] });

  const stats = manager.getStats();
  assertEqual(stats.totalNodes, 2, 'Total nodes');
  assertEqual(stats.onlineNodes, 2, 'Online nodes');
  assert(stats.capabilities.includes('cap1'), 'Capabilities tracked');
  assert(stats.regions.length >= 1, 'Regions tracked');
});

// ============================================================================
// TEST SUITE 2: CapabilityRegistry
// ============================================================================

console.log('\n=== PHASE 4.3.2: CAPABILITY REGISTRY TESTS ===\n');

test('CapabilityRegistry: Register capability', () => {
  const registry = new CapabilityRegistry();

  registry.registerCapability('node-1', 'diagnosis');
  registry.registerCapability('node-2', 'diagnosis');

  const providers = registry.getProviders('diagnosis');
  assertEqual(providers.length, 2, 'Two providers for diagnosis');
});

test('CapabilityRegistry: Get node capabilities', () => {
  const registry = new CapabilityRegistry();

  registry.registerCapability('node-1', 'diagnosis');
  registry.registerCapability('node-1', 'imaging');

  const caps = registry.getCapabilities('node-1');
  assertEqual(caps.length, 2, 'Node has two capabilities');
  assert(caps.includes('diagnosis'), 'Diagnosis capability present');
});

test('CapabilityRegistry: Sync capabilities', () => {
  const registry = new CapabilityRegistry();

  registry.registerCapability('node-1', 'old-cap');

  const result = registry.syncCapabilities('node-1', ['new-cap1', 'new-cap2']);

  assertEqual(result.added.length, 2, 'Two capabilities added');
  assertEqual(result.removed.length, 1, 'One capability removed');

  const caps = registry.getCapabilities('node-1');
  assertEqual(caps.length, 2, 'Node has correct capability count');
});

test('CapabilityRegistry: Unregister capability', () => {
  const registry = new CapabilityRegistry();

  registry.registerCapability('node-1', 'diagnosis');
  registry.registerCapability('node-2', 'diagnosis');

  registry.unregisterCapability('node-1', 'diagnosis');

  const providers = registry.getProviders('diagnosis');
  assertEqual(providers.length, 1, 'One provider remaining');
});

test('CapabilityRegistry: Has capability', () => {
  const registry = new CapabilityRegistry();

  registry.registerCapability('node-1', 'rare-capability');

  assert(registry.hasCapability('rare-capability'), 'Capability exists');
  assert(!registry.hasCapability('non-existent'), 'Non-existent capability not present');
});

test('CapabilityRegistry: Get capability distribution', () => {
  const registry = new CapabilityRegistry();

  registry.registerCapability('node-1', 'diagnosis');
  registry.registerCapability('node-2', 'diagnosis');
  registry.registerCapability('node-3', 'imaging');

  const dist = registry.getDistribution();
  assertEqual(dist.diagnosis, 2, 'Diagnosis has 2 providers');
  assertEqual(dist.imaging, 1, 'Imaging has 1 provider');
});

test('CapabilityRegistry: Update handler callback', () => {
  const registry = new CapabilityRegistry();
  let updateCalled = false;

  registry.onCapabilityUpdate(({ action, nodeId, capability }) => {
    updateCalled = true;
  });

  registry.registerCapability('node-1', 'test-cap');

  assert(updateCalled, 'Update handler was called');
});

test('CapabilityRegistry: Statistics', () => {
  const registry = new CapabilityRegistry();

  registry.registerCapability('node-1', 'cap1');
  registry.registerCapability('node-1', 'cap2');
  registry.registerCapability('node-2', 'cap2');

  const stats = registry.getStats();
  assertEqual(stats.totalCapabilities, 2, 'Total capabilities');
  assertEqual(stats.totalNodes, 2, 'Total nodes');
  assert(stats.avgProvidersPerCapability > 0, 'Average providers calculated');
});

// ============================================================================
// TEST SUITE 3: CapabilityBroadcaster
// ============================================================================

console.log('\n=== PHASE 4.3.3: CAPABILITY BROADCASTER TESTS ===\n');

test('CapabilityBroadcaster: Announce capabilities', () => {
  const broadcaster = new CapabilityBroadcaster();

  const announcement = broadcaster.announce('node-1', ['diagnosis', 'imaging'], {
    region: 'us-east-1',
    cluster: 'cluster-1'
  });

  assert(announcement.id, 'Announcement has ID');
  assertEqual(announcement.nodeId, 'node-1', 'Node ID in announcement');
  assertEqual(announcement.capabilities.length, 2, 'Capabilities in announcement');
});

test('CapabilityBroadcaster: Get node capabilities', () => {
  const broadcaster = new CapabilityBroadcaster();

  broadcaster.announce('node-1', ['cap1', 'cap2']);

  const caps = broadcaster.getCapabilities('node-1');
  assertEqual(caps.length, 2, 'Capabilities retrieved');
});

test('CapabilityBroadcaster: Replicate announcement', () => {
  const broadcaster = new CapabilityBroadcaster();

  const announcement = broadcaster.announce('node-1', ['diagnosis']);
  const replicateResult = broadcaster.replicate(announcement.id, 'cluster-2');

  assertEqual(replicateResult.success, true, 'Replication successful');
  assertEqual(replicateResult.replicationCount, 1, 'One replica recorded');
});

test('CapabilityBroadcaster: Get recent announcements', () => {
  const broadcaster = new CapabilityBroadcaster();

  broadcaster.announce('node-1', ['cap1']);
  broadcaster.announce('node-2', ['cap2']);
  broadcaster.announce('node-3', ['cap3']);

  const recent = broadcaster.getRecentAnnouncements(2);
  assertEqual(recent.length, 2, 'Two recent announcements');
});

test('CapabilityBroadcaster: Get announcements by node', () => {
  const broadcaster = new CapabilityBroadcaster();

  broadcaster.announce('node-1', ['cap1']);
  broadcaster.announce('node-1', ['cap2']);
  broadcaster.announce('node-2', ['cap3']);

  const node1Announcements = broadcaster.getAnnouncementsByNode('node-1');
  assertEqual(node1Announcements.length, 2, 'Two announcements from node-1');
});

test('CapabilityBroadcaster: Get announcements by capability', () => {
  const broadcaster = new CapabilityBroadcaster();

  broadcaster.announce('node-1', ['diagnosis', 'imaging']);
  broadcaster.announce('node-2', ['diagnosis', 'nlp']);
  broadcaster.announce('node-3', ['genetics']);

  const diagnosisAnnouncements = broadcaster.getAnnouncementsByCapability('diagnosis');
  assertEqual(diagnosisAnnouncements.length, 2, 'Two announcements with diagnosis');
});

test('CapabilityBroadcaster: Statistics', () => {
  const broadcaster = new CapabilityBroadcaster();

  broadcaster.announce('node-1', ['cap1', 'cap2']);
  broadcaster.announce('node-2', ['cap2', 'cap3']);

  const stats = broadcaster.getStats();
  assertEqual(stats.nodesWithAnnouncements, 2, 'Nodes with announcements');
  assertEqual(stats.totalAnnouncements, 2, 'Total announcements');
  assert(stats.totalCapabilities >= 2, 'Total capabilities');
});

// ============================================================================
// TEST SUITE 4: CapabilityDiscoveryEngine
// ============================================================================

console.log('\n=== PHASE 4.3.4: CAPABILITY DISCOVERY ENGINE TESTS ===\n');

test('CapabilityDiscoveryEngine: Discover node', () => {
  const engine = new CapabilityDiscoveryEngine();

  const node = engine.discoverNode('node-1', {
    capabilities: ['diagnosis', 'imaging'],
    region: 'us-east-1',
    cluster: 'cluster-1'
  });

  assert(node !== null, 'Node discovered');
  assertEqual(node.nodeId, 'node-1', 'Node ID correct');
  assertEqual(node.capabilities.length, 2, 'Capabilities discovered');
});

test('CapabilityDiscoveryEngine: Update node with heartbeat', () => {
  const engine = new CapabilityDiscoveryEngine();

  engine.discoverNode('node-1', { capabilities: ['old-cap'] });
  engine.updateNode('node-1', { capabilities: ['new-cap', 'another-cap'], load: 50 });

  const node = engine.heartbeat.getNodeStatus('node-1');
  assertEqual(node.load, 50, 'Metrics updated');
  assertEqual(node.capabilities.length, 2, 'Capabilities synced');
});

test('CapabilityDiscoveryEngine: Find providers by capability', () => {
  const engine = new CapabilityDiscoveryEngine();

  engine.discoverNode('node-1', { capabilities: ['diagnosis'], region: 'us-east-1' });
  engine.discoverNode('node-2', { capabilities: ['diagnosis'], region: 'eu-west-1' });
  engine.discoverNode('node-3', { capabilities: ['imaging'], region: 'us-east-1' });

  const providers = engine.findProviders('diagnosis');
  assertEqual(providers.length, 2, 'Two diagnosis providers found');
});

test('CapabilityDiscoveryEngine: Find providers with region preference', () => {
  const engine = new CapabilityDiscoveryEngine();

  engine.discoverNode('node-1', { capabilities: ['diagnosis'], region: 'us-east-1' });
  engine.discoverNode('node-2', { capabilities: ['diagnosis'], region: 'eu-west-1' });

  const providers = engine.findProviders('diagnosis', 'us-east-1');
  assertEqual(providers.length, 2, 'Providers found');
  assertEqual(providers[0].region, 'us-east-1', 'Preferred region first');
});

test('CapabilityDiscoveryEngine: Check health', () => {
  const engine = new CapabilityDiscoveryEngine();

  engine.discoverNode('node-1', { capabilities: ['diagnosis'] });
  engine.discoverNode('node-2', { capabilities: ['imaging'] });

  const health = engine.checkHealth();
  assert(health.heartbeat.onlineNodes >= 2, 'Nodes reported online');
  assert(health.capabilities.totalCapabilities >= 2, 'Capabilities discovered');
  assert(health.discoveryHealth.discoveryRate > 0, 'Discovery rate calculated');
});

test('CapabilityDiscoveryEngine: Get topology', () => {
  const engine = new CapabilityDiscoveryEngine();

  engine.discoverNode('node-1', { capabilities: ['diagnosis'], region: 'us-east-1', cluster: 'c1' });
  engine.discoverNode('node-2', { capabilities: ['imaging'], region: 'us-east-1', cluster: 'c1' });
  engine.discoverNode('node-3', { capabilities: ['nlp'], region: 'eu-west-1', cluster: 'c2' });

  const topology = engine.getTopology();
  assertEqual(topology.totalNodes, 3, 'Total nodes in topology');
  assert(Object.keys(topology.byRegion).length >= 2, 'Multiple regions');
  assert(Object.keys(topology.byCluster).length >= 2, 'Multiple clusters');
  assert(Object.keys(topology.capabilities).length >= 3, 'Multiple capabilities');
});

test('CapabilityDiscoveryEngine: Federation statistics', () => {
  const engine = new CapabilityDiscoveryEngine();

  engine.discoverNode('node-1', { capabilities: ['diagnosis', 'imaging'] });
  engine.discoverNode('node-2', { capabilities: ['nlp'] });
  engine.updateNode('node-1', { load: 45 });

  const stats = engine.getStats();
  assertEqual(stats.heartbeat.totalNodes, 2, 'Heartbeat stats correct');
  assertEqual(stats.capabilities.totalCapabilities, 3, 'Capability stats correct');
  assert(stats.broadcasting.totalAnnouncements >= 2, 'Broadcasting stats correct');
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

console.log('\n=== PHASE 4.3.5: DYNAMIC DISCOVERY INTEGRATION TESTS ===\n');

test('Integration: Multi-cluster federation discovery', () => {
  const engine = new CapabilityDiscoveryEngine();

  // Cluster 1 nodes
  engine.discoverNode('c1-node1', {
    capabilities: ['diagnosis'],
    region: 'us-east-1',
    cluster: 'cluster-1'
  });

  engine.discoverNode('c1-node2', {
    capabilities: ['diagnosis', 'imaging'],
    region: 'us-east-1',
    cluster: 'cluster-1'
  });

  // Cluster 2 nodes
  engine.discoverNode('c2-node1', {
    capabilities: ['nlp', 'entity-extraction'],
    region: 'eu-west-1',
    cluster: 'cluster-2'
  });

  // Cluster 3 nodes
  engine.discoverNode('c3-node1', {
    capabilities: ['genetics', 'variant-calling'],
    region: 'ap-south-1',
    cluster: 'cluster-3'
  });

  const topology = engine.getTopology();
  assertEqual(topology.totalNodes, 4, 'All nodes discovered');
  assert(Object.keys(topology.capabilities).length >= 6, 'All capabilities indexed');
  assertEqual(Object.keys(topology.byCluster).length, 3, 'Three clusters in topology');
});

test('Integration: Capability updates across federation', () => {
  const engine = new CapabilityDiscoveryEngine();

  // Initial discovery
  engine.discoverNode('node-1', { capabilities: ['basic'] });

  // Heartbeat with capability upgrade
  engine.updateNode('node-1', { capabilities: ['basic', 'advanced', 'experimental'] });

  // Verify update propagated
  const providers = engine.findProviders('advanced');
  assertEqual(providers.length, 1, 'Updated capability available');
  assertEqual(providers[0].nodeId, 'node-1', 'Correct provider');
});

test('Integration: Healthcare scenario - Rare disease diagnosis federation', () => {
  const engine = new CapabilityDiscoveryEngine();

  // Diagnostic nodes
  engine.discoverNode('diag-us-1', {
    capabilities: ['phenotype-analysis', 'genotype-analysis'],
    region: 'us-east-1',
    cluster: 'us-cluster'
  });

  engine.discoverNode('diag-eu-1', {
    capabilities: ['phenotype-analysis'],
    region: 'eu-west-1',
    cluster: 'eu-cluster'
  });

  // Inference nodes
  engine.discoverNode('ml-asia-1', {
    capabilities: ['rare-disease-inference', 'phenotype-analysis'],
    region: 'ap-south-1',
    cluster: 'asia-cluster'
  });

  // Find genotype providers
  const genotypeProviders = engine.findProviders('genotype-analysis');
  assertEqual(genotypeProviders.length, 1, 'Genotype analysis available');

  // Find inference providers
  const inferenceProviders = engine.findProviders('rare-disease-inference');
  assertEqual(inferenceProviders.length, 1, 'Rare disease inference available');

  // Get full topology
  const topology = engine.getTopology();
  assert(topology.capabilities['phenotype-analysis'] >= 2, 'Multiple phenotype providers');
});

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n=== PHASE 4.3 TEST SUMMARY ===\n');
console.log(`Tests Passed: ${testsPassed}`);
console.log(`Tests Failed: ${testsFailed}`);
console.log(`Total Tests:  ${testsPassed + testsFailed}`);
console.log(`Pass Rate:    ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%\n`);

if (testsFailed === 0) {
  console.log('✓ Phase 4.3 Dynamic Capability Discovery: PRODUCTION READY');
  console.log('✓ Heartbeat management validated');
  console.log('✓ Capability registry functionality verified');
  console.log('✓ Broadcasting and replication working');
  console.log('✓ Discovery engine orchestration complete');
  console.log('✓ Ready for Phase 4.4: Plugin Marketplace\n');
} else {
  console.log(`✗ ${testsFailed} test(s) failed - review implementation\n`);
}

export { testsPassed, testsFailed };
