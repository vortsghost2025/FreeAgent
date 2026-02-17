/**
 * Phase 8.6 Completion Test Suite - Autonomous Production Governance Completion
 */

import { AutonomousProductionGovernanceEngine } from './medical/intelligence/autonomous-production-governance.js';

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

console.log('=== PHASE 8.6: AUTONOMOUS PRODUCTION GOVERNANCE COMPLETION ===\n');

const engine = new AutonomousProductionGovernanceEngine({
  rollout: { stages: [1, 100] }
});

// Flow A: autonomous success path
const auto = engine.submitReleaseCandidate(
  { releaseId: 'phase8-auto', target: 'scheduler', riskScore: 0.2, expectedImpact: 'LOW', operations: ['deploy'] },
  { testPassRate: 0.99, canarySuccessRate: 1, latencyRegressionPct: 1, errorRatePct: 0.1 }
);
const autoStep1 = engine.runCanaryStep('phase8-auto', { latencyRegressionPct: 2, errorRatePct: 0.1, availabilityPct: 99.9 });
const autoStep2 = engine.runCanaryStep('phase8-auto', { latencyRegressionPct: 2, errorRatePct: 0.1, availabilityPct: 99.9 });

assert(auto.success && auto.status === 'ACTIVE', 'Completion: autonomous candidate starts');
assert(autoStep1.status === 'ACTIVE' && autoStep1.currentStagePct === 100, 'Completion: autonomous candidate advances');
assert(autoStep2.status === 'COMPLETED', 'Completion: autonomous candidate completes');

// Flow B: high-impact path requires human governance
const highImpact = engine.submitReleaseCandidate(
  { releaseId: 'phase8-high-impact', target: 'core-auth', riskScore: 0.2, expectedImpact: 'HIGH', operations: ['deploy'] },
  { testPassRate: 0.99, canarySuccessRate: 1, latencyRegressionPct: 1, errorRatePct: 0.1 }
);
assert(highImpact.status === 'ESCALATED', 'Completion: high-impact candidate escalates');

const highImpactApproved = engine.approveEscalation(highImpact.escalationId, 'human-governor');
assert(highImpactApproved.success && highImpactApproved.release.status === 'ACTIVE', 'Completion: high-impact escalation can be approved');

// Flow C: warning + operational review
const warningStep = engine.runCanaryStep('phase8-high-impact', {
  latencyRegressionPct: 6.5,
  errorRatePct: 0.1,
  availabilityPct: 99.9
});
assert(warningStep.status === 'FROZEN' && warningStep.escalationId, 'Completion: warning freezes and escalates');

const warningApproved = engine.approveEscalation(warningStep.escalationId, 'human-governor');
assert(warningApproved.success && warningApproved.release.status === 'ACTIVE', 'Completion: warning escalation approval resumes release');

// Flow D: containment path
const criticalCandidate = engine.submitReleaseCandidate(
  { releaseId: 'phase8-critical', target: 'scheduler', riskScore: 0.2, expectedImpact: 'LOW', operations: ['deploy'] },
  { testPassRate: 0.99, canarySuccessRate: 1, latencyRegressionPct: 1, errorRatePct: 0.1 }
);
const contained = engine.runCanaryStep('phase8-critical', {
  latencyRegressionPct: 3,
  errorRatePct: 2.5,
  availabilityPct: 99.9
});
assert(criticalCandidate.success, 'Completion: critical candidate admitted before runtime incident');
assert(contained.status === 'ROLLED_BACK' && contained.incident.action === 'CONTAIN_AND_ROLLBACK', 'Completion: critical telemetry auto-contained');

// Flow E: policy block path
const blocked = engine.submitReleaseCandidate(
  { releaseId: 'phase8-blocked', target: 'scheduler', riskScore: 0.2, expectedImpact: 'LOW', operations: ['deploy'] },
  {}
);
assert(!blocked.success && blocked.status === 'BLOCKED', 'Completion: policy blocks missing evidence');

// Completion criteria checks
const status = engine.getGovernanceStatus();
const criteria = {
  autonomousReleasePathWorks: autoStep2.status === 'COMPLETED',
  humanGovernancePathWorks: highImpact.status === 'ESCALATED' && highImpactApproved.success,
  warningEscalationPathWorks: warningStep.status === 'FROZEN' && warningApproved.success,
  criticalContainmentWorks: contained.status === 'ROLLED_BACK',
  policyBlocksUnsafeCandidates: blocked.status === 'BLOCKED',
  evidenceLedgerIntegrity: status.evidence.integrity.valid,
  operationalStatsTracked: status.rollout.total >= 3 && status.escalations.total >= 2
};

for (const [name, value] of Object.entries(criteria)) {
  assert(value, `Completion criteria: ${name}`);
}

const complete = Object.values(criteria).every(Boolean);
assert(complete, 'Completion criteria: Phase 8 complete');

console.log(`\nTests: ${testsPassed}/${testsPassed + testsFailed} passed`);
process.exit(testsFailed > 0 ? 1 : 0);

