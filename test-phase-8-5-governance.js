/**
 * Phase 8.5 Test Suite - Autonomous Production Governance
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

console.log('=== PHASE 8.5: AUTONOMOUS PRODUCTION GOVERNANCE ===\n');

const engine = new AutonomousProductionGovernanceEngine({
  rollout: { stages: [1, 100] }
});

// Test 1: Safe candidate starts active release
const safeSubmit = engine.submitReleaseCandidate(
  { releaseId: 'rel-safe', target: 'scheduler', riskScore: 0.2, expectedImpact: 'LOW', operations: ['deploy'] },
  { testPassRate: 0.99, canarySuccessRate: 1, latencyRegressionPct: 1, errorRatePct: 0.1 }
);
assert(safeSubmit.success && safeSubmit.status === 'ACTIVE', 'Governance: safe candidate starts release');

// Test 2: Passing canary advances rollout
const safeStep1 = engine.runCanaryStep('rel-safe', {
  latencyRegressionPct: 2,
  errorRatePct: 0.1,
  availabilityPct: 99.9
});
assert(safeStep1.success && safeStep1.status === 'ACTIVE' && safeStep1.currentStagePct === 100, 'Governance: canary step advances stage');

// Test 3: Final stage completes release
const safeStep2 = engine.runCanaryStep('rel-safe', {
  latencyRegressionPct: 2,
  errorRatePct: 0.1,
  availabilityPct: 99.9
});
assert(safeStep2.success && safeStep2.status === 'COMPLETED', 'Governance: final stage completes release');

// Test 4: High-risk candidate escalates
const escalatedCandidate = engine.submitReleaseCandidate(
  { releaseId: 'rel-escalate', target: 'scheduler', riskScore: 0.9, expectedImpact: 'LOW', operations: ['deploy'] },
  { testPassRate: 0.99, canarySuccessRate: 1, latencyRegressionPct: 1, errorRatePct: 0.1 }
);
assert(escalatedCandidate.status === 'ESCALATED' && escalatedCandidate.escalationId, 'Governance: high-risk candidate escalates');

// Test 5: Human approval starts escalated candidate
const approvedEscalation = engine.approveEscalation(escalatedCandidate.escalationId, 'human-auditor');
assert(approvedEscalation.success && approvedEscalation.release.status === 'ACTIVE', 'Governance: approve candidate escalation to start release');

// Test 6: Warning telemetry freezes and escalates operations
const warningStep = engine.runCanaryStep('rel-escalate', {
  latencyRegressionPct: 6.5,
  errorRatePct: 0.1,
  availabilityPct: 99.9
});
assert(warningStep.status === 'FROZEN' && warningStep.escalationId, 'Governance: warning telemetry freezes release');

// Test 7: Approving operations escalation resumes release
const resume = engine.approveEscalation(warningStep.escalationId, 'human-auditor');
assert(resume.success && resume.release.status === 'ACTIVE', 'Governance: approve operations escalation to resume');

// Test 8: Rejecting operations escalation rolls back release
const warningStep2 = engine.runCanaryStep('rel-escalate', {
  latencyRegressionPct: 6.5,
  errorRatePct: 0.1,
  availabilityPct: 99.9
});
const rejectOps = engine.rejectEscalation(warningStep2.escalationId, 'human-auditor', 'halt rollout');
assert(rejectOps.success && rejectOps.release.status === 'ROLLED_BACK', 'Governance: reject operations escalation to rollback');

// Test 9: Missing evidence blocks candidate
const blocked = engine.submitReleaseCandidate(
  { releaseId: 'rel-blocked', target: 'scheduler', riskScore: 0.2, expectedImpact: 'LOW', operations: ['deploy'] },
  {}
);
assert(!blocked.success && blocked.status === 'BLOCKED', 'Governance: block candidate missing required evidence');

// Test 10: Critical incident triggers immediate containment rollback
const criticalCandidate = engine.submitReleaseCandidate(
  { releaseId: 'rel-critical', target: 'scheduler', riskScore: 0.2, expectedImpact: 'LOW', operations: ['deploy'] },
  { testPassRate: 0.99, canarySuccessRate: 1, latencyRegressionPct: 1, errorRatePct: 0.1 }
);
const criticalStep = engine.runCanaryStep('rel-critical', {
  latencyRegressionPct: 3,
  errorRatePct: 3,
  availabilityPct: 99.9
});
assert(
  criticalCandidate.success &&
    criticalStep.status === 'ROLLED_BACK' &&
    criticalStep.incident.action === 'CONTAIN_AND_ROLLBACK',
  'Governance: critical incident triggers containment rollback'
);

// Test 11: Governance status summary is coherent
const status = engine.getGovernanceStatus();
assert(
  status.rollout.completed >= 1 &&
    status.rollout.rolledBack >= 1 &&
    status.escalations.total >= 2 &&
    status.evidence.integrity.valid,
  'Governance: status summary and evidence integrity'
);

console.log(`\nTests: ${testsPassed}/${testsPassed + testsFailed} passed`);
process.exit(testsFailed > 0 ? 1 : 0);

