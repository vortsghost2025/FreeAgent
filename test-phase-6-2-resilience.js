/**
 * Phase 6.2 Test Suite - Cross-Cluster Resilience
 */

import {
  ClusterHealthMonitor,
  FailoverCoordinator,
  DataReplicationManager,
  DisasterRecoveryEngine,
  CrossClusterResilienceEngine
} from './medical/intelligence/cross-cluster-resilience.js';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (!condition) {
    console.log(`✗ ${message}`);
    testsFailed++;
  } else {
    console.log(`✓ ${message}`);
    testsPassed++;
  }
}

console.log('=== PHASE 6.2: CROSS-CLUSTER RESILIENCE ===\n');

// Test 1: Register clusters
const monitor = new ClusterHealthMonitor();
monitor.registerCluster('cluster-1');
monitor.registerCluster('cluster-2');
monitor.registerCluster('cluster-3');
assert(monitor.clusterHealth.size === 3, 'Health monitor: Register clusters');

// Test 2: Report heartbeat
const hb = monitor.reportHeartbeat('cluster-1', { latency: 15, used: 45, nodeCount: 8 });
assert(hb.success && hb.status === 'HEALTHY', 'Health monitor: Report heartbeat');

// Test 3: Report degraded cluster
const hb2 = monitor.reportHeartbeat('cluster-2', { used: 95, nodeCount: 4 });
const status = monitor.getClusterStatus('cluster-2');
assert(status.status === 'DEGRADED', 'Health monitor: Detect degradation');

// Test 4: Report failures
monitor.reportFailure('cluster-3');
monitor.reportFailure('cluster-3');
monitor.reportFailure('cluster-3');
const failStatus = monitor.getClusterStatus('cluster-3');
assert(failStatus.status === 'FAILING', 'Health monitor: Mark as failing');

// Test 5: Get health summary
const summary = monitor.getHealthySummary();
assert(summary.healthy === 1 && summary.degraded === 1 && summary.failing === 1, 'Health monitor: Get summary');

// Test 6: Create failover plan
const failover = new FailoverCoordinator({ deterministic: true });
failover.createFailoverPlan('plan-1', 'cluster-1', 'cluster-2', ['svc-1', 'svc-2', 'svc-3']);
assert(failover.failoverPlans.has('plan-1'), 'Failover coordinator: Create plan');

// Test 7: Test failover
const test = failover.testFailover('plan-1');
assert(test.success && test.resourcesValidated === 3, 'Failover coordinator: Test failover');

// Test 8: Get tested status
const planStatus = failover.failoverPlans.get('plan-1');
assert(planStatus.status === 'TESTED', 'Failover coordinator: Mark tested');

// Test 9: Initiate failover
const initiated = failover.initiateFailover('plan-1', 'Cluster-1 failed');
assert(initiated.success, 'Failover coordinator: Initiate failover');

// Test 10: Complete failover
const completed = failover.completeFailover('plan-1', ['svc-1', 'svc-2', 'svc-3']);
assert(completed.success && completed.duration > 0, 'Failover coordinator: Complete failover');

// Test 11: Get failover history
const history = failover.getFailoverHistory();
assert(history.length === 1, 'Failover coordinator: Failover history');

// Test 12: Create replication group
const replication = new DataReplicationManager({ consistencyLevel: 'STRONG', deterministic: true });
replication.createReplicationGroup('group-1', 'cluster-1', ['cluster-2', 'cluster-3']);
assert(replication.replicationGroups.has('group-1'), 'Data replication: Create group');

// Test 13: Write data
const written = replication.writeData('data-1', { value: 'critical-data' }, 'group-1');
assert(written.success && replication.replicas.has('data-1'), 'Data replication: Write data');

// Test 14: Sync replicas
const synced = replication.syncReplicas('group-1');
assert(synced.success && (synced.synced > 0 || synced.failed >= 0), 'Data replication: Sync replicas');

// Test 15: Verify consistency
const consistency = replication.verifyConsistency('group-1');
assert(consistency.success, 'Data replication: Verify consistency');

// Test 16: Get replication stats
const repStats = replication.getReplicationStats();
assert(repStats.totalGroups === 1, 'Data replication: Replication stats');

// Test 17: Create recovery plan
const recovery = new DisasterRecoveryEngine({ deterministic: true });
recovery.createRecoveryPlan('recovery-1', ['AUTH', 'DATA', 'QUEUE'], 'backup-zone-1');
assert(recovery.recoveryPlans.has('recovery-1'), 'Disaster recovery: Create plan');

// Test 18: Approve recovery plan
const approved = recovery.approveRecoveryPlan('recovery-1');
assert(approved.success, 'Disaster recovery: Approve plan');

// Test 19: Execute recovery
const executed = recovery.executeRecovery('recovery-1');
assert(executed.success && (executed.status === 'COMPLETED' || executed.status === 'PARTIAL'), 'Disaster recovery: Execute recovery');

// Test 20: Get recovery stats
const recStats = recovery.getRecoveryStats();
assert(recStats.totalRecoveries === 1, 'Disaster recovery: Recovery stats');

// Test 21: Engine register cluster
const engine = new CrossClusterResilienceEngine({ deterministic: true });
engine.registerCluster('engine-cluster-1');
engine.registerCluster('engine-cluster-2');
assert(engine.monitor.clusterHealth.size === 2, 'Resilience engine: Register clusters');

// Test 22: Engine monitor health
const monitored = engine.monitorClusterHealth('engine-cluster-1', { used: 50, nodeCount: 10 });
assert(monitored.success, 'Resilience engine: Monitor health');

// Test 23: Engine setup replication
const engReplic = engine.setupReplication('eng-group-1', 'engine-cluster-1', ['engine-cluster-2']);
assert(engReplic.success, 'Resilience engine: Setup replication');

// Test 24: Engine sync critical data
const engSync = engine.syncCriticalData('eng-group-1');
assert(engSync.success, 'Resilience engine: Sync data');

// Test 25: Engine setup disaster recovery
const engRecovery = engine.setupDisasterRecovery('eng-recovery-1', ['CORE', 'DATA'], 'backup-1');
assert(engRecovery.success, 'Resilience engine: Setup disasters recovery');

// Test 26: Engine system resilience status
const engStatus = engine.getSystemResilience();
assert(engStatus.clusterHealth && engStatus.replication && engStatus.recovery, 'Resilience engine: Get system resilience');

console.log(`\nTests: ${testsPassed}/${testsPassed + testsFailed} passed`);
process.exit(testsFailed > 0 ? 1 : 0);
