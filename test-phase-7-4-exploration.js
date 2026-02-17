/**
 * Phase 7.4 Test Suite - Safety-Bounded Exploration
 */

import {
  SafetyConstraintEngine,
  RollbackManager,
  ExplorationSandbox,
  SafetyBoundedExplorationEngine
} from './medical/intelligence/safety-bounded-exploration.js';

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

console.log('=== PHASE 7.4: SAFETY-BOUNDED EXPLORATION ===\n');

// Test 1: Constraint engine allows valid strategy
const constraints = new SafetyConstraintEngine();
const allowed = constraints.evaluateExperiment({ type: 'ALT_AGGREGATION', riskScore: 0.2, operations: [] });
assert(allowed.allowed, 'Constraint engine: allow valid strategy');

// Test 2: Constraint engine blocks unknown strategy
const blockedStrategy = constraints.evaluateExperiment({ type: 'UNKNOWN_STRATEGY', riskScore: 0.2, operations: [] });
assert(!blockedStrategy.allowed, 'Constraint engine: block unknown strategy');

// Test 3: Constraint bounds are enforced
constraints.updateConstraints({
  maxRiskScore: 5,
  maxLatencyRegressionPct: -10,
  maxFailureRateIncreasePct: 500
});
const bounded = constraints.getConstraints();
assert(
  bounded.maxRiskScore === 1 &&
    bounded.maxLatencyRegressionPct === 0 &&
    bounded.maxFailureRateIncreasePct === 100,
  'Constraint engine: bound threshold updates'
);

// Test 3: Rollback manager checkpoint/rollback
const rollbackMgr = new RollbackManager();
rollbackMgr.createCheckpoint('exp-1', { latency: 200 });
const rollback = rollbackMgr.rollback('exp-1', 'TEST');
assert(rollback.success && rollback.restoredState.latency === 200, 'Rollback manager: restore checkpoint');

// Test 4: Sandbox simulation
const sandbox = new ExplorationSandbox();
const sim = sandbox.simulate({ type: 'ALT_AGGREGATION' }, {
  convergenceScore: 0.8,
  orchestrationLatencyP95: 200,
  failureRate: 0.02,
  mergeConflictRate: 0.05
});
assert(sim.simulatedMetrics.orchestrationLatencyP95 < 200, 'Sandbox: simulate strategy effects');

// Test 5: Exploration engine accepts safe experiment
const engine = new SafetyBoundedExplorationEngine();
const accepted = engine.explore('exp-2', {
  type: 'ALT_AGGREGATION',
  riskScore: 0.2,
  operations: ['optimize']
}, {
  convergenceScore: 0.8,
  orchestrationLatencyP95: 200,
  failureRate: 0.02,
  mergeConflictRate: 0.05
});
assert(accepted.status === 'ACCEPTED_IN_SANDBOX', 'Exploration engine: accept safe experiment');

// Test 6: Exploration engine blocks forbidden operation
engine.configureConstraints({ forbiddenOperations: ['dangerous-op'] });
const blocked = engine.explore('exp-3', {
  type: 'ALT_AGGREGATION',
  riskScore: 0.2,
  operations: ['dangerous-op']
}, {
  convergenceScore: 0.8,
  orchestrationLatencyP95: 200,
  failureRate: 0.02,
  mergeConflictRate: 0.05
});
assert(blocked.status === 'BLOCKED', 'Exploration engine: block forbidden operation');

// Test 7: Exploration engine rolls back on latency regression
engine.configureConstraints({
  forbiddenOperations: [],
  maxLatencyRegressionPct: 3
});
const rolledBack = engine.explore('exp-4', {
  type: 'STRICT_CONVERGENCE',
  riskScore: 0.2,
  operations: []
}, {
  convergenceScore: 0.8,
  orchestrationLatencyP95: 200,
  failureRate: 0.02,
  mergeConflictRate: 0.05
});
assert(rolledBack.status === 'ROLLED_BACK', 'Exploration engine: rollback on safety violation');

// Test 8: Exploration status summary
const status = engine.getExplorationStatus();
assert(status.totalExperiments === 3, 'Exploration engine: status tracking');

// Test 9: Rollback stats exposed
assert(status.rollbackStats.rollbacks >= 1, 'Exploration engine: rollback metrics');

// Test 10: Accepted + blocked + rollback counts
assert(status.accepted >= 1 && status.blocked >= 1 && status.rolledBack >= 1, 'Exploration engine: outcome distribution');

console.log(`\nTests: ${testsPassed}/${testsPassed + testsFailed} passed`);
process.exit(testsFailed > 0 ? 1 : 0);
