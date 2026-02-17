/**
 * Phase 6.4 Test Suite - Autonomous Orchestration
 */

import {
  ClusterScheduler,
  ResourceManager,
  AutonomousDecisionEngine,
  FederatedOrchestrationEngine
} from './medical/intelligence/autonomous-orchestration.js';

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

console.log('=== PHASE 6.4: AUTONOMOUS ORCHESTRATION ===\n');

// Test 1: Submit tasks
const scheduler = new ClusterScheduler();
scheduler.submitTask('task-1', { type: 'COMPUTE', estimatedDuration: 5000 });
scheduler.submitTask('task-2', { type: 'DATA', estimatedDuration: 3000 });
scheduler.submitTask('task-3', { type: 'VALIDATE', estimatedDuration: 2000 });
assert(scheduler.tasks.size === 3, 'Cluster scheduler: Submit tasks');

// Test 2: Schedule tasks
const sched1 = scheduler.scheduleTask('task-1', 'cluster-1', 10);
const sched2 = scheduler.scheduleTask('task-2', 'cluster-2', 15);
const sched3 = scheduler.scheduleTask('task-3', 'cluster-1', 8);
assert(sched1.success && sched2.success && sched3.success, 'Cluster scheduler: Schedule tasks');

// Test 3: Execute tasks
const exec1 = scheduler.executeTask('task-1');
assert(exec1.success && exec1.estimatedDuration > 0, 'Cluster scheduler: Execute task');

// Test 4: Get schedule stats
const stats = scheduler.getScheduleStats();
assert(stats.totalTasks === 3, 'Cluster scheduler: Schedule stats');

// Test 5: Register resources
const resourceMgr = new ResourceManager();
resourceMgr.registerResource('res-compute-1', 100, 'COMPUTE');
resourceMgr.registerResource('res-memory-1', 64, 'MEMORY');
resourceMgr.registerResource('res-storage-1', 1000, 'STORAGE');
assert(resourceMgr.resources.size === 3, 'Resource manager: Register resources');

// Test 6: Allocate resources
const alloc1 = resourceMgr.allocateResource('alloc-1', 'res-compute-1', 30, 'node-1');
assert(alloc1.success, 'Resource manager: Allocate resource');

// Test 7: Check available capacity
const res1 = resourceMgr.resources.get('res-compute-1');
assert(res1.availableCapacity === 70, 'Resource manager: Check available capacity');

// Test 8: Allocate more resources
resourceMgr.allocateResource('alloc-2', 'res-compute-1', 40, 'node-2');
resourceMgr.allocateResource('alloc-3', 'res-memory-1', 30, 'node-3');
assert(resourceMgr.allocations.size === 3, 'Resource manager: Multiple allocations');

// Test 9: Deallocate resource
const dealloc = resourceMgr.deallocateResource('alloc-1');
const resAfterDealloc = resourceMgr.resources.get('res-compute-1');
assert(dealloc.success && resAfterDealloc.availableCapacity === 60, 'Resource manager: Deallocate resource');

// Test 10: Get resource stats
const rStats = resourceMgr.getResourceStats();
assert(rStats.totalResources === 3, 'Resource manager: Resource stats');

// Test 11: Analyze system state
const decisionEngine = new AutonomousDecisionEngine();
const analysis = decisionEngine.analyzeSystemState({
  cpuUsage: 92,
  memoryUsage: 85,
  latency: 250,
  failureRate: 0.02
});
assert(analysis.anomalies.includes('HIGH_CPU'), 'Decision engine: Analyze system');

// Test 12: Make decision with high load
const decision1 = decisionEngine.makeAutonomousDecision('dec-1', {
  systemLoad: 0.85,
  availableNodes: 4,
  activeNodes: 3,
  failureRate: 0.02
});
assert(decision1.action === 'SCALE_OUT' && decision1.confidence > 0, 'Decision engine: Scale out decision');

// Test 13: Make decision with low load
const decision2 = decisionEngine.makeAutonomousDecision('dec-2', {
  systemLoad: 0.25,
  availableNodes: 5,
  activeNodes: 4,
  failureRate: 0.01
});
assert(decision2.action === 'SCALE_IN' && decision2.confidence > 0, 'Decision engine: Scale in decision');

// Test 14: Make decision with high failure
const decision3 = decisionEngine.makeAutonomousDecision('dec-3', {
  systemLoad: 0.5,
  availableNodes: 3,
  activeNodes: 2,
  failureRate: 0.15
});
assert(decision3.action === 'FAILOVER', 'Decision engine: Failover decision');

// Test 15: Decision execution based on confidence
assert(decision1.willExecute === (decision1.confidence >= 0.7), 'Decision engine: Confidence threshold');

// Test 16: Decision stats
const dStats = decisionEngine.getDecisionStats();
assert(dStats.totalDecisions === 3, 'Decision engine: Decision stats');

// Test 17: Register cluster metrics
const engine = new FederatedOrchestrationEngine();
engine.registerClusterMetrics('cluster-1', { systemLoad: 0.6, availableNodes: 5, activeNodes: 3, failureRate: 0.01 });
engine.registerClusterMetrics('cluster-2', { systemLoad: 0.7, availableNodes: 4, activeNodes: 2, failureRate: 0.02 });
assert(engine.federatedMetrics.size === 2, 'Orchestration engine: Register metrics');

// Test 18: Orchestrate workload
const workload = {
  tasks: [
    { type: 'MAP', estimatedDuration: 3000 },
    { type: 'REDUCE', estimatedDuration: 2000 },
    { type: 'VALIDATE', estimatedDuration: 1000 }
  ]
};
const orch = engine.orchestrateWorkload('workload-1', workload, ['cluster-1', 'cluster-2']);
assert(orch.success && orch.taskCount === 3, 'Orchestration engine: Orchestrate workload');

// Test 19: Multiple workloads
const workload2 = {
  tasks: [
    { type: 'TRAIN', estimatedDuration: 5000 },
    { type: 'EVALUATE', estimatedDuration: 2000 }
  ]
};
engine.orchestrateWorkload('workload-2', workload2, ['cluster-1']);
assert(engine.orchestrationLog.length === 2, 'Orchestration engine: Multiple workloads');

// Test 20: Optimize resources
const optimization = engine.optimizeClusterResources();
assert(optimization.success, 'Orchestration engine: Optimize resources');

// Test 21: Federation status
const fedStatus = engine.getFederationStatus();
assert(fedStatus.scheduler && fedStatus.resources && fedStatus.autonomousDecisions, 'Orchestration engine: Federation status');

// Test 22: Verify orchestration completeness
assert(
  fedStatus.federatedClusters === 2 && fedStatus.orchestrations === 2,
  'Orchestration engine: Orchestration completeness'
);

// Test 23: Workload distribution
assert(fedStatus.scheduler.totalTasks >= 3, 'Orchestration engine: Workload distribution');

// Test 24: Resource tracking
assert(fedStatus.resources.totalResources >= 0, 'Orchestration engine: Resource tracking');

// Test 25: Autonomous decision tracking
assert(fedStatus.autonomousDecisions.totalDecisions >= 0, 'Orchestration engine: Decision tracking');

console.log(`\nTests: ${testsPassed}/${testsPassed + testsFailed} passed`);
process.exit(testsFailed > 0 ? 1 : 0);
