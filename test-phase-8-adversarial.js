/**
 * Phase 8 - Adversarial Test Suite
 * Tests 12 vulnerability cases identified in autonomous architectural evolution
 * All tests are deterministic with no randomness
 */

import {
  ConstitutionalConstraintMapper,
  ArchitecturalChangeLedger,
  AutonomousArchitecturalEvolutionEngine
} from './medical/intelligence/autonomous-architectural-evolution.js';
import { SelfArchitectureOrchestrator } from './medical/intelligence/self-architecture-orchestrator.js';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message, expectedValue = undefined, actualValue = undefined) {
  if (!condition) {
    const detail = expectedValue !== undefined && actualValue !== undefined
      ? ` [expected: ${expectedValue}, actual: ${actualValue}]`
      : '';
    console.log(`x ${message}${detail}`);
    testsFailed++;
  } else {
    console.log(`✓ ${message}`);
    testsPassed++;
  }
}

console.log('=== PHASE 8: ADVERSARIAL VULNERABILITY TEST SUITE ===\n');

// ============================================================================
// PROBE_A: NEGATIVE DURATION GAMIFICATION
// ============================================================================
console.log('GROUP 1: NEGATIVE DURATION GAMIFICATION (PROBE_A)');
console.log('-'.repeat(60));

const engineA = new AutonomousArchitecturalEvolutionEngine();
const regA = engineA.registerProposals([{
  changeId: 'adversarial-neg-duration',
  type: 'TEST_CHANGE',
  target: 'test-target',
  summary: 'Negative duration test',
  reversible: true,
  rollbackPlan: 'rollback:test',
  auditRef: 'audit:test'
}]);
const changeIdA = regA.registered[0].changeId;

// Validate and implement
engineA.validateChange(changeIdA, { testPassRate: 1 });
engineA.implementChange(changeIdA, 'autonomous');

// Attempt to rollback with failureDetectedAt AFTER rolledBackAt
const now = Date.now();
const futureTime = now + 5000;
const rollbackWithNegativeDuration = engineA.rollbackChange(
  changeIdA,
  'test-negative-duration',
  {
    failureDetectedAt: futureTime,  // Future time should be sanitized to rolledBackAt
    rollbackRequestedAt: now
  }
);

const change = engineA.ledger.getChange(changeIdA);
const rollbackDuration = change.rollback.rollbackDurationSeconds;

// After sanitization, duration should NOT be negative
assert(
  rollbackWithNegativeDuration.success === true,
  'PROBE_A: Rollback succeeds with future failureDetectedAt',
  true,
  rollbackWithNegativeDuration.success
);

assert(
  rollbackDuration != null && rollbackDuration >= 0,
  'PROBE_A: Rollback duration is non-negative after sanitization',
  '>= 0',
  rollbackDuration
);

// ============================================================================
// PROBE_B: MEAN MASKING WITH TAIL EVENTS
// ============================================================================
console.log('\nGROUP 2: MEAN MASKING WITH TAIL EVENTS (PROBE_B)');
console.log('-'.repeat(60));

const engineB = new AutonomousArchitecturalEvolutionEngine();
const changeIdsB = [];

// Create 10 changes: 9 fast rollbacks (1s each) + 1 slow rollback (120s)
for (let i = 0; i < 10; i++) {
  const regB = engineB.registerProposals([{
    changeId: `mean-mask-${i}`,
    type: 'TEST_CHANGE',
    target: 'test-target',
    summary: `Mean mask test ${i}`,
    reversible: true,
    rollbackPlan: 'rollback:test',
    auditRef: 'audit:test'
  }]);
  const cid = regB.registered[0].changeId;
  changeIdsB.push(cid);
  engineB.validateChange(cid, { testPassRate: 1 });
  engineB.implementChange(cid, 'autonomous');

  // Simulate rollback with calculated timestamps
  const implTime = engineB.ledger.getChange(cid).implementation.implementedAt;
  const rollbackDurationMs = i === 9 ? 120000 : 1000;  // Last one is 120s, others are 1s
  const rollbackTime = implTime + rollbackDurationMs;

  engineB.rollbackChange(
    cid,
    'test-mean-mask',
    {
      failureDetectedAt: implTime,
      rollbackRequestedAt: implTime
    }
  );

  // Manually set rollback time for consistency
  const changeB = engineB.ledger.getChange(cid);
  changeB.rollback.rolledBackAt = rollbackTime;
  changeB.rollback.rollbackDurationSeconds = rollbackDurationMs / 1000;
}

const statsB = engineB.ledger.getStats();
const meanB = statsB.meanRollbackSeconds;
const p95B = statsB.p95RollbackSeconds;

// Mean should be ~12.18 seconds (11*1 + 120) / 10
const expectedMean = (9 * 1 + 120) / 10;
assert(
  meanB != null && Math.abs(meanB - expectedMean) < 0.1,
  'PROBE_B: Mean rollback duration calculated correctly',
  expectedMean,
  meanB
);

// P95 should be 120s (tail metric), catching the slow rollback
assert(
  p95B != null && p95B >= 100,
  'PROBE_B: P95 percentile tracks tail metrics and catches slow rollback',
  '>= 100',
  p95B
);

// ============================================================================
// PROBE_C: DECLARED IMPROVEMENT VS OBSERVED
// ============================================================================
console.log('\nGROUP 3: DECLARED VS OBSERVED IMPROVEMENT (PROBE_C)');
console.log('-'.repeat(60));

const engineC = new AutonomousArchitecturalEvolutionEngine();
const regC = engineC.registerProposals([{
  changeId: 'declared-vs-observed',
  type: 'TEST_CHANGE',
  target: 'test-target',
  summary: 'Declared vs observed test',
  reversible: true,
  rollbackPlan: 'rollback:test',
  auditRef: 'audit:test',
  expectedImprovementPct: 45  // Claims 45% improvement
}]);

const changeIdC = regC.registered[0].changeId;

// Validate with much lower observed improvement (5%)
engineC.validateChange(changeIdC, {
  testPassRate: 1,
  observedImprovementPct: 5  // Actual is only 5%
});

engineC.implementChange(changeIdC, 'autonomous');
const statsC = engineC.ledger.getStats();
const declaredC = statsC.declaredImprovementPct;
const observedC = statsC.architecturalImprovementPct;

assert(
  declaredC >= 45,
  'PROBE_C: Declared improvement captured from proposal',
  45,
  declaredC
);

assert(
  observedC <= 10,  // Should be ~5
  'PROBE_C: Observed improvement differs significantly from declared',
  '<= 10',
  observedC
);

assert(
  declaredC > observedC,
  'PROBE_C: Gap between declared and observed improvement detected',
  `declared(${declaredC}) > observed(${observedC})`,
  declaredC > observedC
);

// ============================================================================
// PROBE_D: MTTR NULL SAMPLE HANDLING
// ============================================================================
console.log('\nGROUP 4: MTTR NULL HANDLING (PROBE_D)');
console.log('-'.repeat(60));

const engineD = new AutonomousArchitecturalEvolutionEngine();
const regD = engineD.registerProposals([{
  changeId: 'mttr-null-test',
  type: 'TEST_CHANGE',
  target: 'test-target',
  summary: 'MTTR null test',
  reversible: true,
  rollbackPlan: 'rollback:test',
  auditRef: 'audit:test'
}]);

const changeIdD = regD.registered[0].changeId;
engineD.validateChange(changeIdD, { testPassRate: 1 });
engineD.implementChange(changeIdD, 'autonomous');
// Do NOT rollback, leaving no rollback samples

const statsD = engineD.ledger.getStats();
const mttrD = statsD.meanRollbackSeconds;
const rollbackCountD = statsD.rollbackSampleCount;

assert(
  mttrD === null,
  'PROBE_D: MTTR is null when no rollback samples exist',
  null,
  mttrD
);

assert(
  rollbackCountD === 0,
  'PROBE_D: Rollback sample count is 0',
  0,
  rollbackCountD
);

// ============================================================================
// VULNERABILITY 5: NEGATIVE DURATION WITH INVALID TIMESTAMPS
// ============================================================================
console.log('\nGROUP 5: TIMESTAMP SANITIZATION ROBUSTNESS');
console.log('-'.repeat(60));

const engine5 = new AutonomousArchitecturalEvolutionEngine();
const reg5 = engine5.registerProposals([{
  changeId: 'timestamp-sanitization',
  type: 'TEST_CHANGE',
  target: 'test-target',
  reversible: true,
  rollbackPlan: 'rollback:test',
  auditRef: 'audit:test'
}]);
const cid5 = reg5.registered[0].changeId;
engine5.validateChange(cid5, { testPassRate: 1 });
engine5.implementChange(cid5, 'autonomous');

// Test with various invalid timestamps
const invalidTimestamps = [
  -5000,           // Negative timestamp
  Infinity,        // Infinity
  NaN,             // NaN
  undefined,       // Undefined
  null,            // Null
  'invalid',       // String
  {}               // Object
];

for (const ts of invalidTimestamps) {
  const rollback5 = engine5.rollbackChange(cid5, 'invalid-ts-test', {
    failureDetectedAt: ts
  });
  // Should not crash and should succeed or fail gracefully
  assert(
    rollback5.success !== undefined,
    `Vulnerability 5: Handles invalid timestamp ${typeof ts === 'string' ? `"${ts}"` : ts} without crash`
  );
}

// ============================================================================
// VULNERABILITY 6: IMPROVEMENT METRIC GAMING
// ============================================================================
console.log('\nGROUP 6: IMPROVEMENT METRIC GAMING');
console.log('-'.repeat(60));

const engine6 = new AutonomousArchitecturalEvolutionEngine({
  minSignificantImprovementPct: 0.5  // Very low threshold
});

const proposals6 = [];
for (let i = 0; i < 5; i++) {
  proposals6.push({
    changeId: `gaming-${i}`,
    type: 'TEST_CHANGE',
    target: 'test-target',
    reversible: true,
    rollbackPlan: 'rollback:test',
    auditRef: 'audit:test',
    expectedImprovementPct: 50  // Each claims 50%
  });
}
const reg6 = engine6.registerProposals(proposals6);
const cids6 = reg6.registered.map(r => r.changeId);

for (const cid of cids6) {
  engine6.validateChange(cid, {
    testPassRate: 1,
    observedImprovementPct: -5  // Negative improvement!
  });
  engine6.implementChange(cid, 'autonomous');
}

const stats6 = engine6.ledger.getStats();
const declaredTotal6 = stats6.declaredImprovementPct;
const observedTotal6 = stats6.architecturalImprovementPct;

assert(
  declaredTotal6 >= 250,  // 5 * 50
  'Vulnerability 6: Declared improvements sum to total',
  250,
  declaredTotal6
);

assert(
  observedTotal6 <= -5,  // Should filter or cap at actual negative
  'Vulnerability 6: Negative improvements not masked by mean',
  '<= -5',
  observedTotal6
);

// ============================================================================
// VULNERABILITY 7: RELEASE POLICY BYPASS
// ============================================================================
console.log('\nGROUP 7: RELEASE POLICY EVASION');
console.log('-'.repeat(60));

const engine7 = new AutonomousArchitecturalEvolutionEngine({
  autoImplementRiskThreshold: 0.5
});

const reg7 = engine7.registerProposals([{
  changeId: 'policy-evasion',
  type: 'HIGH_IMPACT_CHANGE',
  target: 'core-system',
  riskScore: 0.8,  // High risk
  summary: 'Policy evasion test',
  reversible: true,
  rollbackPlan: 'rollback:test',
  auditRef: 'audit:test'
}]);
const cid7 = reg7.registered[0].changeId;

// Try to validate with perfect canary metrics (misleading)
engine7.validateChange(cid7, {
  testPassRate: 1.0,      // Perfect tests
  canarySuccessRate: 1.0, // Perfect canary
  errorRatePct: 0,        // Zero errors
  maxSafetyRiskScore: 0.9 // Permissive safety
});

const impl7 = engine7.implementChange(cid7, 'autonomous');

// High risk (0.8) with autoImplementRiskThreshold (0.5) should require human review
assert(
  impl7.status === 'PENDING_HUMAN_REVIEW',
  'Vulnerability 7: High-risk changes held for human review despite perfect canary metrics'
);

// ============================================================================
// VULNERABILITY 8: COMPLEXITY PENALTY UNDERESTIMATION
// ============================================================================
console.log('\nGROUP 8: COMPLEXITY PENALTY UNDERESTIMATION');
console.log('-'.repeat(60));

const engine8 = new AutonomousArchitecturalEvolutionEngine({
  complexityPenaltyWeight: 0.1  // Very low penalty
});

const reg8 = engine8.registerProposals([{
  changeId: 'complexity-gaming',
  type: 'TEST_CHANGE',
  target: 'test-target',
  reversible: true,
  rollbackPlan: 'rollback:test',
  auditRef: 'audit:test',
  expectedImprovementPct: 20,
  complexityDeltaPct: 100  // 100% complexity increase
}]);
const cid8 = reg8.registered[0].changeId;

engine8.validateChange(cid8, {
  testPassRate: 1,
  observedImprovementPct: 20,
  complexityDeltaPct: 100
});
engine8.implementChange(cid8, 'autonomous');

const stats8 = engine8.ledger.getStats({
  complexityPenaltyWeight: 0.1
});
const netImprovement8 = stats8.architecturalImprovementPct;

// Net improvement should be ~20 - (100 * 0.1) = 10
const expectedNet8 = 20 - (100 * 0.1);
assert(
  netImprovement8 != null && Math.abs(netImprovement8 - expectedNet8) < 1,
  'Vulnerability 8: Complexity penalty correctly applied to improvement calculation',
  expectedNet8,
  netImprovement8
);

// ============================================================================
// VULNERABILITY 9: CONSTITUTIONAL CONSTRAINT BYPASS
// ============================================================================
console.log('\nGROUP 9: CONSTITUTIONAL CONSTRAINT BYPASS');
console.log('-'.repeat(60));

const mapper9 = new ConstitutionalConstraintMapper({
  invariants: ['REVERSIBLE_CHANGES_ONLY', 'AUDIT_TRAIL_REQUIRED']
});

const nonReversibleChange9 = {
  reversible: false,        // Violates REVERSIBLE_CHANGES_ONLY
  rollbackPlan: '',
  auditRef: 'audit:valid',  // Has audit ref
  performanceImpactPct: 5,
  safetyRiskScore: 0.1
};

const check9 = mapper9.validateChange(nonReversibleChange9);

assert(
  !check9.compliant,
  'Vulnerability 9: Non-reversible change rejected'
);

assert(
  check9.reasons.includes('REVERSIBILITY_REQUIREMENT_FAILED'),
  'Vulnerability 9: Reversibility failure reason recorded',
  'REVERSIBILITY_REQUIREMENT_FAILED',
  check9.reasons[0]
);

// ============================================================================
// VULNERABILITY 10: SAFETY RISK UNDERSTATEMENT
// ============================================================================
console.log('\nGROUP 10: SAFETY RISK UNDERSTATEMENT');
console.log('-'.repeat(60));

const mapper10 = new ConstitutionalConstraintMapper({
  invariants: ['NO_SAFETY_INVARIANT_VIOLATION']
});

const highRiskChange10 = {
  reversible: true,
  rollbackPlan: 'rollback:test',
  auditRef: 'audit:test',
  performanceImpactPct: 5,
  safetyRiskScore: 0.95  // Very high safety risk
};

const check10 = mapper10.validateChange(highRiskChange10, {
  maxSafetyRiskScore: 0.85
});

assert(
  !check10.compliant,
  'Vulnerability 10: High safety risk rejected'
);

assert(
  check10.reasons.includes('SAFETY_RISK_TOO_HIGH'),
  'Vulnerability 10: Safety risk failure reason recorded'
);

// ============================================================================
// VULNERABILITY 11: REVERSIBILITY COVERAGE FAILURE
// ============================================================================
console.log('\nGROUP 11: REVERSIBILITY COVERAGE ACROSS BATCH');
console.log('-'.repeat(60));

const engine11 = new AutonomousArchitecturalEvolutionEngine();
const proposals11 = [
  {
    changeId: 'reversible-1',
    reversible: true,
    rollbackPlan: 'rollback:1',
    auditRef: 'audit:1'
  },
  {
    changeId: 'non-reversible-2',
    reversible: false,
    rollbackPlan: '',
    auditRef: 'audit:2'
  },
  {
    changeId: 'reversible-3',
    reversible: true,
    rollbackPlan: 'rollback:3',
    auditRef: 'audit:3'
  }
];

const reg11 = engine11.registerProposals(proposals11);
const validateResults11 = [];
for (const change of reg11.registered) {
  const val = engine11.validateChange(change.changeId, { testPassRate: 1 });
  validateResults11.push(val);
}

const stats11 = engine11.ledger.getStats();
const reversibilityCoverage11 = stats11.reversibleCoverage;

// 2 out of 3 are reversible = 66.7% coverage (not 100%)
assert(
  reversibilityCoverage11 < 1,
  'Vulnerability 11: Reversibility coverage reflects non-reversible changes in batch',
  '< 1.0',
  reversibilityCoverage11
);

// ============================================================================
// VULNERABILITY 12: CHANGE SUCCESS RATE INFLATION
// ============================================================================
console.log('\nGROUP 12: CHANGE SUCCESS RATE INFLATION');
console.log('-'.repeat(60));

const engine12 = new AutonomousArchitecturalEvolutionEngine();
const proposals12 = [];
for (let i = 0; i < 5; i++) {
  proposals12.push({
    changeId: `success-rate-test-${i}`,
    type: 'TEST_CHANGE',
    target: 'test-target',
    reversible: true,
    rollbackPlan: 'rollback:test',
    auditRef: 'audit:test'
  });
}

const reg12 = engine12.registerProposals(proposals12);
const cids12 = reg12.registered.map(r => r.changeId);

// Validate all 5
for (const cid of cids12) {
  engine12.validateChange(cid, { testPassRate: 1 });
}

// Implement first 3, reject validation of 2 others
engine12.implementChange(cids12[0], 'autonomous');
engine12.implementChange(cids12[1], 'autonomous');
engine12.implementChange(cids12[2], 'autonomous');
// cids12[3] and [4] remain validated but not implemented

const stats12 = engine12.ledger.getStats();
const successRate12 = stats12.changeSuccessRate;
const implementedCount12 = stats12.implemented;
const validatedCount12 = stats12.validated;

assert(
  validatedCount12 === 5,
  'Vulnerability 12: All 5 changes validated',
  5,
  validatedCount12
);

assert(
  implementedCount12 === 3,
  'Vulnerability 12: Only 3 changes implemented',
  3,
  implementedCount12
);

assert(
  successRate12 === 0.6,  // 3/5 = 60%
  'Vulnerability 12: Success rate reflects actual implementation, not validation',
  0.6,
  successRate12
);

// ============================================================================
// INTEGRATION: ORCHESTRATOR-LEVEL MTTR VALIDATION
// ============================================================================
console.log('\nGROUP 13: ORCHESTRATOR MTTR GATE VALIDATION');
console.log('-'.repeat(60));

const orchestrator = new SelfArchitectureOrchestrator({
  autoImplementRiskThreshold: 0.25
});

// Simulate a cycle with no rollbacks (MTTR should be null)
const cycleResult = orchestrator.runCycle('test-cycle-1', {
  architectureSnapshot: { consistency: 0.99 },
  objectives: { priority: 'high' },
  validationEvidence: { testPassRate: 1 }
});

const criteria = orchestrator.getCompletionCriteriaStatus();
const mttrCriteria = criteria.criteria.rollbackMTTR;

// rollbackMTTR should only pass if meanRollbackSeconds is null OR <= 30
assert(
  mttrCriteria === true || mttrCriteria === false,
  'Orchestrator: MTTR criteria evaluated',
  true,
  mttrCriteria !== undefined
);

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n' + '='.repeat(60));
console.log('=== ADVERSARIAL TEST SUMMARY ===');
console.log('='.repeat(60));
console.log(`Total Tests: ${testsPassed + testsFailed}`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log(`Exit Code: ${testsFailed > 0 ? 1 : 0}`);

process.exit(testsFailed > 0 ? 1 : 0);
