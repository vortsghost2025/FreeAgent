import { FederatedRouter } from './medical/federation/cluster-federation.js';

// Test latency-aware
const router = new FederatedRouter({ strategy: 'latency-aware', debug: true });

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

console.log('\nCluster 1:', JSON.stringify(router.clusters[0], null, 2));
console.log('\nCluster 2:', JSON.stringify(router.clusters[1], null, 2));

console.log('\nFiltered healthy clusters:');
const healthy = router.clusters.filter(c => c.status === 'healthy');
console.log(healthy.map(c => ({ id: c.id, avgLatency: c.avgLatency })));

const result = router.routeTask({ id: 'task-1', type: 'test' });
console.log('\nResult:', result);
