/**
 * Phase 7.1 Test Suite - Self-Directed Improvement Cycles
 */

import {
  ImprovementBuilder,
  ImprovementTester,
  GovernanceGate,
  SelfDirectedImprovementCycleEngine
} from './medical/intelligence/autonomous-evolution-cycles.js';

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

console.log('=== PHASE 7.1: SELF-DIRECTED IMPROVEMENT CYCLES ===\n');

// Test 1: Builder proposes multiple improvements from degraded signals
const builder = new ImprovementBuilder();
const proposals = builder.proposeImprovements('cycle-a', {
  diagnostics: {
    driftScore: 0.4,
    nondeterminismScore: 0.2,
    privacyComplianceRate: 95,
    convergenceStability: 0.6,
    orchestrationLatencyP95: 320
  },
  convergenceTrend: 'DEGRADING',
  latencyBudgetMs: 250
});
assert(proposals.length >= 4, 'Builder: propose improvements from diagnostics');

// Test 2: Builder fallback proposal when healthy
const healthyProposals = builder.proposeImprovements('cycle-b', {
  diagnostics: {
    driftScore: 0.01,
    nondeterminismScore: 0,
    privacyComplianceRate: 100,
    convergenceStability: 0.95,
    orchestrationLatencyP95: 120
  },
  convergenceTrend: 'STABLE',
  latencyBudgetMs: 250
});
assert(healthyProposals.length === 1, 'Builder: fallback proposal on healthy system');

// Test 3: Tester accepts high-confidence proposal
const tester = new ImprovementTester();
const testAccepted = tester.validateProposal(proposals[0], { testPassRate: 1, regressionRisk: 0.1 });
assert(testAccepted.passed, 'Tester: accept low-risk proposal');

// Test 4: Tester rejects forbidden target
const testRejected = tester.validateProposal(proposals[0], {
  testPassRate: 1,
  regressionRisk: 0.1,
  forbiddenTargets: [proposals[0].target]
});
assert(!testRejected.passed, 'Tester: reject forbidden target');

// Test 5: Governance continues with healthy cycle
const gate = new GovernanceGate();
const goodGovernance = gate.assessCycle({
  proposals,
  validation: { passRate: 0.9, failed: 0 },
  diagnosticsSummary: { criticalFindings: 0 }
});
assert(!goodGovernance.requiresIntervention, 'Governance: continue autonomously when thresholds pass');

// Test 6: Governance escalates on low pass rate
const badGovernance = gate.assessCycle({
  proposals,
  validation: { passRate: 0.4, failed: 3 },
  diagnosticsSummary: { criticalFindings: 1 }
});
assert(badGovernance.requiresIntervention, 'Governance: escalate on threshold violations');

// Test 7: Engine runs full cycle
const engine = new SelfDirectedImprovementCycleEngine();
const cycleResult = engine.runCycle('cycle-c', {
  diagnostics: {
    driftScore: 0.35,
    nondeterminismScore: 0.1,
    privacyComplianceRate: 98,
    convergenceStability: 0.75,
    orchestrationLatencyP95: 290
  },
  convergenceTrend: 'DEGRADING',
  baselineMetrics: { latency: 200, failureRate: 0.02 },
  observedMetrics: { latency: 180, failureRate: 0.015 },
  testPassRate: 1
}, {
  maxAutoRisk: 0.5
});
assert(cycleResult.proposalsGenerated > 0, 'Engine: generate proposals');

// Test 8: Engine computes metric deltas
assert(cycleResult.metricsDelta.latency != null, 'Engine: metric deltas captured');

// Test 9: Engine accepted proposals
assert(cycleResult.accepted.length > 0, 'Engine: accepts safe proposals');

// Test 10: Engine cycle report
const report = engine.getCycleReport();
assert(report.totalCycles === 1, 'Engine: cycle report totals');

// Test 11: Engine threshold configuration
const configured = engine.configureThresholds({ minPassRate: 0.95 });
assert(configured.success, 'Engine: configure governance thresholds');

// Test 12: Engine escalates with strict thresholds
const strictCycle = engine.runCycle('cycle-d', {
  diagnostics: {
    driftScore: 0.1,
    nondeterminismScore: 0,
    privacyComplianceRate: 100,
    convergenceStability: 0.9,
    orchestrationLatencyP95: 100
  },
  convergenceTrend: 'STABLE',
  testPassRate: 0.9
}, {
  maxAutoRisk: 0.3
});
assert(strictCycle.requiresAuditorIntervention, 'Engine: escalates under strict threshold policy');

console.log(`\nTests: ${testsPassed}/${testsPassed + testsFailed} passed`);
process.exit(testsFailed > 0 ? 1 : 0);

