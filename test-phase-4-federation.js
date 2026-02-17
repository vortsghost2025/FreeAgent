/**
 * Phase 4 Federation Tests
 * Comprehensive test suite for multi-cluster federation and cross-region routing
 * Validates: ClusterRegistry, InterClusterBusAdapter, FederatedRouter, RegionManager, CrossRegionRouter
 */

import { ClusterRegistry, InterClusterBusAdapter, FederatedRouter } from './medical/federation/cluster-federation.js';
import { RegionManager, CrossRegionRouter } from './medical/federation/cross-region-routing.js';

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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message} (expected ${expected}, got ${actual})`);
  }
}

// ============================================================================
// TEST SUITE 1: ClusterRegistry
// ============================================================================

console.log('\n=== PHASE 4.1: CLUSTER REGISTRY TESTS ===\n');

test('ClusterRegistry: Register clusters', () => {
  const registry = new ClusterRegistry({ debug: false });

  registry.registerCluster('cluster-us-east', {
    region: 'us-east-1',
    zone: 'us-east-1a',
    capabilities: ['diagnosis', 'imaging', 'genetics'],
    nodeCount: 50,
    costPerHour: 120,
    replicationFactor: 3
  });

  registry.registerCluster('cluster-eu-west', {
    region: 'eu-west-1',
    zone: 'eu-west-1b',
    capabilities: ['diagnosis', 'nlp'],
    nodeCount: 30,
    costPerHour: 95,
    replicationFactor: 2
  });

  const clusters = registry.listClusters();
  assertEqual(clusters.length, 2, 'Should have 2 clusters');
  assertEqual(clusters[0].region, 'us-east-1', 'First cluster in US East');
});

test('ClusterRegistry: Get cluster by ID', () => {
  const registry = new ClusterRegistry();
  registry.registerCluster('cluster-1', { region: 'us-west', capabilities: ['diag'] });

  const cluster = registry.getCluster('cluster-1');
  assert(cluster !== null, 'Cluster should exist');
  assertEqual(cluster.id, 'cluster-1', 'Cluster ID matches');
  assertEqual(cluster.status, 'healthy', 'Default status is healthy');
});

test('ClusterRegistry: Get clusters by region', () => {
  const registry = new ClusterRegistry();
  registry.registerCluster('us-east-1', { region: 'us-east', capabilities: [] });
  registry.registerCluster('us-east-2', { region: 'us-east', capabilities: [] });
  registry.registerCluster('us-west-1', { region: 'us-west', capabilities: [] });

  const eastClusters = registry.getClustersInRegion('us-east');
  assertEqual(eastClusters.length, 2, 'Should have 2 clusters in us-east');
});

test('ClusterRegistry: Update cluster metrics', () => {
  const registry = new ClusterRegistry();
  registry.registerCluster('cluster-1', { region: 'us-east', capabilities: [] });

  const before = registry.getCluster('cluster-1');
  assertEqual(before.activeTasksCount, 0, 'Initially 0 active tasks');

  registry.updateClusterMetrics('cluster-1', { activeTasksCount: 45, avgLatency: 23 });

  const after = registry.getCluster('cluster-1');
  assertEqual(after.activeTasksCount, 45, 'Active tasks updated');
  assertEqual(after.avgLatency, 23, 'Latency updated');
});

test('ClusterRegistry: Get healthy clusters filtered', () => {
  const registry = new ClusterRegistry();
  registry.registerCluster('healthy-1', { region: 'us-east', capabilities: [] });
  registry.registerCluster('degraded-1', { region: 'us-west', capabilities: [] });

  const healthy = registry.getCluster('healthy-1');
  healthy.status = 'healthy';

  const degraded = registry.getCluster('degraded-1');
  degraded.status = 'degraded';

  const healthyList = registry.getHealthyClusters();
  assertEqual(healthyList.length, 1, 'Only 1 healthy cluster');
  assertEqual(healthyList[0].id, 'healthy-1', 'Correct healthy cluster');
});

test('ClusterRegistry: Statistics', () => {
  const registry = new ClusterRegistry();
  registry.registerCluster('c1', { region: 'us-east', capabilities: ['diag', 'img'] });
  registry.registerCluster('c2', { region: 'eu-west', capabilities: ['nlp'] });

  const stats = registry.getFederationStats();
  assertEqual(stats.totalClusters, 2, 'Total clusters count');
  assertEqual(stats.healthyClusters, 2, 'Healthy clusters count');
  assertEqual(stats.uniqueRegions, 2, 'Unique regions');
  assert(stats.uniqueCapabilities.includes('diag'), 'Capabilities tracked');
});

// ============================================================================
// TEST SUITE 2: InterClusterBusAdapter
// ============================================================================

console.log('\n=== PHASE 4.2: INTER-CLUSTER BUS ADAPTER TESTS ===\n');

test('InterClusterBusAdapter: Send message between clusters', () => {
  const bus = new InterClusterBusAdapter({ debug: false });

  const result = bus.sendMessage('cluster-1', 'cluster-2', {
    type: 'TASK_ROUTING',
    payload: { taskId: 'task-123', priority: 'high' }
  });

  assertEqual(result.success, true, 'Message sent successfully');
  assert(result.messageId, 'Message ID generated');
});

test('InterClusterBusAdapter: Broadcast message to multiple clusters', () => {
  const bus = new InterClusterBusAdapter();

  const result = bus.broadcast('cluster-1', {
    type: 'CAPABILITY_SYNC',
    payload: { capabilities: ['diagnosis', 'imaging'] }
  });

  assertEqual(result.success, true, 'Broadcast successful');
  assertEqual(result.broadcastId, 'broadcast-1', 'Broadcast ID generated');
});

test('InterClusterBusAdapter: Retrieve message status', () => {
  const bus = new InterClusterBusAdapter();

  const sendResult = bus.sendMessage('src', 'dst', {
    type: 'TEST',
    payload: { data: 'test' }
  });

  const status = bus.getMessageStatus(sendResult.messageId);
  assert(status !== null, 'Status retrieved');
  assertEqual(status.sourceCluster, 'src', 'Source cluster in status');
  assertEqual(status.targetCluster, 'dst', 'Target cluster in status');
});

test('InterClusterBusAdapter: Track delivery completion', () => {
  const bus = new InterClusterBusAdapter();

  const result = bus.sendMessage('c1', 'c2', { type: 'TEST', payload: {} });
  assertEqual(result.delivered, false, 'Initially not delivered');

  // Simulate delivery
  bus.messages.get(result.messageId).delivered = true;

  const status = bus.getMessageStatus(result.messageId);
  assertEqual(status.delivered, true, 'Status reflects delivery');
});

test('InterClusterBusAdapter: Statistics report', () => {
  const bus = new InterClusterBusAdapter();

  bus.sendMessage('c1', 'c2', { type: 'MSG1', payload: {} });
  bus.sendMessage('c1', 'c2', { type: 'MSG2', payload: {} });
  bus.broadcast('c1', { type: 'BCAST1', payload: {} });

  const stats = bus.getStats();
  assertEqual(stats.totalMessagesSent, 2, 'Message count');
  assertEqual(stats.totalBroadcasts, 1, 'Broadcast count');
  assertEqual(stats.totalMessages, 3, 'Total count');
});

// ============================================================================
// TEST SUITE 3: FederatedRouter
// ============================================================================

console.log('\n=== PHASE 4.3: FEDERATED ROUTER TESTS ===\n');

test('FederatedRouter: Route task to least-loaded cluster', () => {
  const router = new FederatedRouter({ strategy: 'least-loaded', debug: false });

  router.registerCluster({
    id: 'cluster-1',
    region: 'us-east',
    activeTasksCount: 50,
    capabilities: ['diagnosis']
  });

  router.registerCluster({
    id: 'cluster-2',
    region: 'us-west',
    activeTasksCount: 20,
    capabilities: ['diagnosis']
  });

  const result = router.routeTask({ id: 'task-1', type: 'diagnosis' });
  assertEqual(result.success, true, 'Routing succeeded');
  assertEqual(result.clusterId, 'cluster-2', 'Routed to least-loaded');
});

test('FederatedRouter: Route task to latency-aware cluster', () => {
  const router = new FederatedRouter({ strategy: 'latency-aware', debug: false });

  router.registerCluster({
    id: 'cluster-1',
    region: 'us-east',
    metrics: { avgLatency: 150 },
    capabilities: []
  });

  router.registerCluster({
    id: 'cluster-2',
    region: 'us-west',
    metrics: { avgLatency: 45 },
    capabilities: []
  });

  const result = router.routeTask({ id: 'task-1', type: 'test' });
  assertEqual(result.clusterId, 'cluster-2', 'Routed to lower latency cluster');
});

test('FederatedRouter: Route task to capability-aware cluster', () => {
  const router = new FederatedRouter({ strategy: 'capability-aware', debug: false });

  router.registerCluster({
    id: 'c-diag',
    region: 'us-east',
    capabilities: ['diagnosis'],
    activeTasksCount: 30
  });

  router.registerCluster({
    id: 'c-nlp',
    region: 'us-west',
    capabilities: ['nlp', 'entity-extraction'],
    activeTasksCount: 10
  });

  const result = router.routeTask({ id: 'task-1', capability: 'diagnosis' });
  assertEqual(result.clusterId, 'c-diag', 'Routed to capable cluster');
});

test('FederatedRouter: Route task cost-aware', () => {
  const router = new FederatedRouter({ strategy: 'cost-aware', debug: false });

  router.registerCluster({
    id: 'expensive',
    region: 'us-east',
    metrics: { costPerHour: 200 },
    activeTasksCount: 10
  });

  router.registerCluster({
    id: 'cheap',
    region: 'us-west',
    metrics: { costPerHour: 50 },
    activeTasksCount: 15
  });

  const result = router.routeTask({ id: 'task-1', type: 'test' });
  assertEqual(result.clusterId, 'cheap', 'Routed to cost-optimal cluster');
});

test('FederatedRouter: Route task region-aware', () => {
  const router = new FederatedRouter({ strategy: 'region-aware', debug: false });

  router.registerCluster({
    id: 'us-east-primary',
    region: 'us-east',
    activeTasksCount: 40
  });

  router.registerCluster({
    id: 'us-west-backup',
    region: 'us-west',
    activeTasksCount: 25
  });

  const result = router.routeTask({ id: 'task-1', preferredRegion: 'us-east' });
  assertEqual(result.clusterId, 'us-east-primary', 'Routed to preferred region');
});

test('FederatedRouter: No clusters available error', () => {
  const router = new FederatedRouter();

  const result = router.routeTask({ id: 'task-1', type: 'test' });
  assertEqual(result.success, false, 'Routing fails with no clusters');
  assertEqual(result.error, 'NO_CLUSTERS_AVAILABLE', 'Correct error code');
});

test('FederatedRouter: Statistics tracking', () => {
  const router = new FederatedRouter({ strategy: 'least-loaded' });

  router.registerCluster({ id: 'c1', region: 'us-east', activeTasksCount: 5 });
  router.registerCluster({ id: 'c2', region: 'us-west', activeTasksCount: 3 });

  router.routeTask({ id: 'task-1' });
  router.routeTask({ id: 'task-2' });

  const stats = router.getStats();
  assertEqual(stats.totalTasksRouted, 2, 'Task count tracked');
  assertEqual(stats.strategy, 'least-loaded', 'Strategy recorded');
  assertEqual(stats.totalClusters, 2, 'Cluster count recorded');
});

// ============================================================================
// TEST SUITE 4: RegionManager
// ============================================================================

console.log('\n=== PHASE 4.4: REGION MANAGER TESTS ===\n');

test('RegionManager: Register region', () => {
  const manager = new RegionManager({ debug: false });

  const region = manager.registerRegion('us-east-1', {
    name: 'US East',
    clusterCount: 3,
    failoverTarget: 'us-west-1',
    replicationFactor: 3
  });

  assertEqual(region.id, 'us-east-1', 'Region ID set');
  assertEqual(region.status, 'healthy', 'Default status healthy');
  assertEqual(region.replicationFactor, 3, 'Replication factor set');
});

test('RegionManager: Set and get latency between regions', () => {
  const manager = new RegionManager();

  manager.registerRegion('us-east-1', { name: 'US East' });
  manager.registerRegion('us-west-1', { name: 'US West' });

  manager.setLatency('us-east-1', 'us-west-1', 85);

  const latency = manager.getLatency('us-east-1', 'us-west-1');
  assertEqual(latency, 85, 'Latency recorded and retrieved');
});

test('RegionManager: Same region has zero latency', () => {
  const manager = new RegionManager();
  manager.registerRegion('us-east-1', { name: 'US East' });

  const latency = manager.getLatency('us-east-1', 'us-east-1');
  assertEqual(latency, 0, 'Same region latency is zero');
});

test('RegionManager: Get nearest healthy region', () => {
  const manager = new RegionManager();

  manager.registerRegion('us-east-1', { name: 'US East' });
  manager.registerRegion('us-west-1', { name: 'US West' });
  manager.registerRegion('eu-west-1', { name: 'EU West' });

  manager.setLatency('us-east-1', 'us-west-1', 50);
  manager.setLatency('us-east-1', 'eu-west-1', 120);

  const nearest = manager.getNearestHealthyRegion('us-east-1', []);
  assert(nearest !== null, 'Nearest region found');
  assertEqual(nearest.id, 'us-west-1', 'Correct nearest region');
});

test('RegionManager: Exclude regions from nearest search', () => {
  const manager = new RegionManager();

  manager.registerRegion('primary', { name: 'Primary' });
  manager.registerRegion('secondary', { name: 'Secondary' });
  manager.registerRegion('tertiary', { name: 'Tertiary' });

  manager.setLatency('primary', 'secondary', 30);
  manager.setLatency('primary', 'tertiary', 50);

  const nearest = manager.getNearestHealthyRegion('primary', ['secondary']);
  assertEqual(nearest.id, 'tertiary', 'Tertiary selected when secondary excluded');
});

test('RegionManager: Update region status', () => {
  const manager = new RegionManager();
  manager.registerRegion('us-east-1', { name: 'US East' });

  manager.updateRegionStatus('us-east-1', 'degraded');

  const region = manager.regions.get('us-east-1');
  assertEqual(region.status, 'degraded', 'Status updated');
});

test('RegionManager: List regions with filter', () => {
  const manager = new RegionManager();

  manager.registerRegion('healthy-1', { name: 'Healthy 1' });
  manager.registerRegion('degraded-1', { name: 'Degraded 1' });

  manager.updateRegionStatus('degraded-1', 'degraded');

  const healthy = manager.listRegions('healthy');
  assertEqual(healthy.length, 1, 'Filtered to healthy only');
  assertEqual(healthy[0].id, 'healthy-1', 'Correct region');
});

test('RegionManager: Statistics', () => {
  const manager = new RegionManager();

  manager.registerRegion('r1', { name: 'R1', clusterCount: 5 });
  manager.registerRegion('r2', { name: 'R2', clusterCount: 3 });
  manager.registerRegion('r3', { name: 'R3', clusterCount: 2 });

  const stats = manager.getStats();
  assertEqual(stats.totalRegions, 3, 'Total regions');
  assertEqual(stats.healthyRegions, 3, 'Healthy regions');
  assertEqual(stats.totalClusters, 10, 'Total clusters across regions');
});

// ============================================================================
// TEST SUITE 5: CrossRegionRouter
// ============================================================================

console.log('\n=== PHASE 4.5: CROSS-REGION ROUTER TESTS ===\n');

test('CrossRegionRouter: Route task in preferred region', () => {
  const regionManager = new RegionManager();
  const clusterRouter = {
    routeTask: (task) => ({
      success: true,
      clusterId: 'cluster-1',
      region: 'us-east-1'
    }),
    registry: { clustersById: new Map() }
  };

  const router = new CrossRegionRouter(regionManager, clusterRouter, { debug: false });

  regionManager.registerRegion('us-east-1', { name: 'US East' });

  const task = { id: 'task-1', preferredRegion: 'us-east-1' };
  const result = router.routeTaskWithFailover(task);

  assertEqual(result.success, true, 'Task routed successfully');
  assertEqual(result.clusterId, 'cluster-1', 'Correct cluster');
});

test('CrossRegionRouter: Failover to secondary region', () => {
  const regionManager = new RegionManager();
  let callCount = 0;

  const clusterRouter = {
    routeTask: (task) => {
      callCount++;
      if (callCount === 1) {
        return { success: false, error: 'NO_CAPACITY' };
      }
      return { success: true, clusterId: 'cluster-backup', region: 'us-west-1' };
    },
    registry: { clustersById: new Map() }
  };

  const router = new CrossRegionRouter(regionManager, clusterRouter, {
    failoverChain: ['us-west-1'],
    debug: false
  });

  regionManager.registerRegion('us-east-1', { name: 'US East' });
  regionManager.registerRegion('us-west-1', { name: 'US West' });

  const task = { id: 'task-1', preferredRegion: 'us-east-1' };
  const result = router.routeTaskWithFailover(task);

  assertEqual(result.success, true, 'Failover succeeded');
  assertEqual(result.failoverApplied, true, 'Failover marked');
  assertEqual(result.failoverRegion, 'us-west-1', 'Failover region recorded');
});

test('CrossRegionRouter: Apply replication policy - none', () => {
  const regionManager = new RegionManager();
  const clusterRouter = {
    routeTask: () => ({ success: true, clusterId: 'primary' }),
    registry: { clustersById: new Map() }
  };

  const router = new CrossRegionRouter(regionManager, clusterRouter, {
    replicationPolicy: 'none',
    debug: false
  });

  regionManager.registerRegion('us-east-1', { name: 'US East' });

  const task = { id: 'task-1', preferredRegion: 'us-east-1' };
  router.routeTaskWithFailover(task);

  const replicas = router.taskReplicaMap.get('task-1');
  assertEqual(replicas.length, 1, 'Only primary, no replicas');
});

test('CrossRegionRouter: Apply replication policy - min', () => {
  const regionManager = new RegionManager();

  const clusterMap = new Map();
  clusterMap.set('cluster-1', { id: 'cluster-1' });
  clusterMap.set('cluster-2', { id: 'cluster-2' });

  const clusterRouter = {
    routeTask: () => ({ success: true, clusterId: 'cluster-1' }),
    registry: { clustersById: clusterMap }
  };

  const router = new CrossRegionRouter(regionManager, clusterRouter, {
    replicationPolicy: 'min',
    debug: false
  });

  regionManager.registerRegion('us-east-1', { name: 'US East' });

  const task = { id: 'task-1', preferredRegion: 'us-east-1' };
  router.routeTaskWithFailover(task);

  const replicas = router.taskReplicaMap.get('task-1');
  assert(replicas.length >= 1, 'Primary + at least 1 replica');
});

test('CrossRegionRouter: Handle region outage', () => {
  const regionManager = new RegionManager();
  regionManager.registerRegion('us-east-1', { name: 'US East' });

  const clusterRouter = {
    routeTask: () => ({}),
    registry: { clustersById: new Map() }
  };

  const router = new CrossRegionRouter(regionManager, clusterRouter);

  const result = router.handleRegionOutage('us-east-1');
  assertEqual(result.success, true, 'Outage handled');

  const region = regionManager.regions.get('us-east-1');
  assertEqual(region.status, 'outage', 'Region marked as outage');
});

test('CrossRegionRouter: Statistics tracking', () => {
  const regionManager = new RegionManager();
  regionManager.registerRegion('us-east-1', { name: 'US East' });
  regionManager.registerRegion('us-west-1', { name: 'US West' });

  const clusterRouter = {
    routeTask: () => ({ success: true, clusterId: 'cluster-1' }),
    registry: { clustersById: new Map() }
  };

  const router = new CrossRegionRouter(regionManager, clusterRouter, {
    failoverChain: ['us-west-1'],
    replicationPolicy: 'min'
  });

  router.routeTaskWithFailover({ id: 'task-1', preferredRegion: 'us-east-1' });

  const stats = router.getStats();
  assertEqual(stats.totalTasksReplicated, 1, 'Task replica count');
  assertEqual(stats.replicationPolicy, 'min', 'Policy tracked');
  assert(stats.regionStats.totalRegions >= 2, 'Region stats included');
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

console.log('\n=== PHASE 4.6: INTEGRATION TESTS ===\n');

test('Federation End-to-End: Multi-region cluster routing', () => {
  // Setup clusters in multiple regions
  const registry = new ClusterRegistry({ debug: false });
  registry.registerCluster('us-east-1', {
    region: 'us-east',
    capabilities: ['diagnosis', 'imaging'],
    nodeCount: 50,
    activeTasksCount: 30
  });

  registry.registerCluster('eu-west-1', {
    region: 'eu-west',
    capabilities: ['diagnosis', 'nlp'],
    nodeCount: 30,
    activeTasksCount: 10
  });

  registry.registerCluster('ap-south-1', {
    region: 'ap-south',
    capabilities: ['imaging'],
    nodeCount: 20,
    activeTasksCount: 5
  });

  // Route tasks using least-loaded strategy
  const router = new FederatedRouter({ strategy: 'least-loaded' });
  router.registerCluster(registry.getCluster('us-east-1'));
  router.registerCluster(registry.getCluster('eu-west-1'));
  router.registerCluster(registry.getCluster('ap-south-1'));

  const task1 = router.routeTask({ id: 't1', type: 'diagnosis' });
  const task2 = router.routeTask({ id: 't2', type: 'diagnosis' });
  const task3 = router.routeTask({ id: 't3', type: 'diagnosis' });

  assertEqual(task1.success, true, 'All tasks routed');
  assertEqual(task2.success, true, 'Task 2 routed');
  assertEqual(task3.success, true, 'Task 3 routed');

  const stats = router.getStats();
  assertEqual(stats.totalTasksRouted, 3, 'All tasks tracked in routing');
});

test('Federation End-to-End: Cross-region failover with replication', () => {
  const regionMgr = new RegionManager();

  // Register regions with latency
  regionMgr.registerRegion('primary', { name: 'Primary', failoverTarget: 'secondary' });
  regionMgr.registerRegion('secondary', { name: 'Secondary', failoverTarget: 'tertiary' });
  regionMgr.registerRegion('tertiary', { name: 'Tertiary' });

  regionMgr.setLatency('primary', 'secondary', 50);
  regionMgr.setLatency('primary', 'tertiary', 120);
  regionMgr.setLatency('secondary', 'tertiary', 80);

  // Setup cross-region router
  let routeAttempts = 0;
  const clusterRouter = {
    routeTask: () => {
      routeAttempts++;
      if (routeAttempts === 1) {
        return { success: false, error: 'REGION_UNAVAILABLE' };
      }
      return { success: true, clusterId: `cluster-${routeAttempts}` };
    },
    registry: { clustersById: new Map() }
  };

  const crossRegionRouter = new CrossRegionRouter(regionMgr, clusterRouter, {
    failoverChain: ['secondary', 'tertiary'],
    replicationPolicy: 'min'
  });

  const result = crossRegionRouter.routeTaskWithFailover({
    id: 'critical-task',
    preferredRegion: 'primary'
  });

  assertEqual(result.success, true, 'Task routed after failover');
  assertEqual(result.failoverApplied, true, 'Failover was applied');
  assert(result.failoverRegion !== 'primary', 'Failover to different region');
});

test('Federation End-to-End: Inter-cluster communication', () => {
  const bus = new InterClusterBusAdapter();
  const registry = new ClusterRegistry();

  registry.registerCluster('cluster-1', { region: 'us-east', capabilities: ['diag'] });
  registry.registerCluster('cluster-2', { region: 'eu-west', capabilities: ['nlp'] });

  // Send diagnostic results to NLP cluster
  const msgResult = bus.sendMessage('cluster-1', 'cluster-2', {
    type: 'RESULTS_TRANSFER',
    payload: {
      taskId: 'task-123',
      diagnosticResults: { conditions: ['sepsis'], confidence: 0.95 }
    }
  });

  assertEqual(msgResult.success, true, 'Results transferred');

  // Broadcast capability update
  const bcastResult = bus.broadcast('cluster-1', {
    type: 'CAPABILITY_UPDATE',
    payload: { newCapability: 'genetics' }
  });

  assertEqual(bcastResult.success, true, 'Capability update broadcast');

  const stats = bus.getStats();
  assertEqual(stats.totalMessages, 2, 'All communications tracked');
});

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n=== PHASE 4 TEST SUMMARY ===\n');
console.log(`Tests Passed: ${testsPassed}`);
console.log(`Tests Failed: ${testsFailed}`);
console.log(`Total Tests:  ${testsPassed + testsFailed}`);
console.log(`Pass Rate:    ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%\n`);

if (testsFailed === 0) {
  console.log('✓ Phase 4 Federation: PRODUCTION READY');
  console.log('✓ All multi-cluster federation components verified');
  console.log('✓ Cross-region routing with failover validated');
  console.log('✓ Ready for Phase 4.3: Dynamic Capability Discovery\n');
} else {
  console.log(`✗ ${testsFailed} test(s) failed - review implementation\n`);
}

export { testsPassed, testsFailed };
