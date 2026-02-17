/**
 * Phase 8.2 Test Suite - Progressive Rollout Manager
 */

import {
  RolloutGate,
  ProgressiveRolloutManager
} from './medical/intelligence/progressive-rollout-manager.js';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (!condition) {
    console.log(`x ${message}`);
    testsFailed++;
  } else {
    console.log(`ok ${message}`);
    testsPassed++;
  }
}

console.log('=== PHASE 8.2: PROGRESSIVE ROLLOUT MANAGER ===\n');

// Test 1: Gate passes healthy metrics
const gate = new RolloutGate();
const gatePass = gate.evaluateMetrics({ latencyRegressionPct: 2, errorRatePct: 0.1, availabilityPct: 99.9 });
assert(gatePass.pass, 'Rollout gate: pass healthy metrics');

// Test 2: Gate fails degraded metrics
const gateFail = gate.evaluateMetrics({ latencyRegressionPct: 15, errorRatePct: 2, availabilityPct: 98 });
assert(!gateFail.pass && gateFail.reasons.length >= 2, 'Rollout gate: fail degraded metrics');

// Test 3: Start release
const manager = new ProgressiveRolloutManager();
const started = manager.startRelease('rel-a', { target: 'scheduler' });
assert(started.success && started.release.currentStagePct === 1, 'Rollout manager: start release');

// Test 4: Reject duplicate release
const duplicate = manager.startRelease('rel-a', {});
assert(!duplicate.success, 'Rollout manager: reject duplicate release id');

// Test 5: Cannot advance stage before verification
const prematureAdvance = manager.advanceStage('rel-a');
assert(!prematureAdvance.success && prematureAdvance.error === 'STAGE_NOT_VERIFIED', 'Rollout manager: block unverified stage advance');

// Test 6: Record passing stage and advance
const stage1 = manager.recordStageResult('rel-a', {
  latencyRegressionPct: 2,
  errorRatePct: 0.1,
  availabilityPct: 99.9
});
const advance1 = manager.advanceStage('rel-a');
assert(stage1.success && advance1.success && advance1.currentStagePct === 5, 'Rollout manager: record pass and advance stage');

// Test 7: Freeze and resume active release
const frozen = manager.freezeRelease('rel-a', 'WARNING_LATENCY_REGRESSION');
const resumed = manager.resumeRelease('rel-a');
assert(frozen.success && resumed.success && resumed.release.status === 'ACTIVE', 'Rollout manager: freeze and resume release');

// Test 8: Failed stage triggers rollback
const failedStage = manager.recordStageResult('rel-a', {
  latencyRegressionPct: 30,
  errorRatePct: 5,
  availabilityPct: 95
});
assert(failedStage.success && failedStage.status === 'ROLLED_BACK', 'Rollout manager: rollback on failed stage');

// Test 9: Force rollback for manual intervention
const manual = new ProgressiveRolloutManager({ stages: [10, 100] });
manual.startRelease('rel-b', {});
const manualRollback = manual.forceRollback('rel-b', 'MANUAL_INTERVENTION');
assert(manualRollback.success && manualRollback.release.status === 'ROLLED_BACK', 'Rollout manager: force rollback');

// Test 10: Completion path reaches 100%
const complete = new ProgressiveRolloutManager({ stages: [50, 100] });
complete.startRelease('rel-c', {});
complete.recordStageResult('rel-c', { latencyRegressionPct: 1, errorRatePct: 0.1, availabilityPct: 99.9 });
complete.advanceStage('rel-c');
const finalStage = complete.recordStageResult('rel-c', { latencyRegressionPct: 1, errorRatePct: 0.1, availabilityPct: 99.9 });
assert(finalStage.status === 'COMPLETED', 'Rollout manager: complete final stage');

// Test 11: Stats reflect rollout states
const stats = manager.getRolloutStats();
assert(stats.total >= 1 && stats.rolledBack >= 1, 'Rollout manager: stats reflect release states');

console.log(`\nTests: ${testsPassed}/${testsPassed + testsFailed} passed`);
process.exit(testsFailed > 0 ? 1 : 0);

