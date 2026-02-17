/**
 * Phase 8.1 Test Suite - Release Policy Engine
 */

import { ReleasePolicyEngine } from './medical/intelligence/release-policy-engine.js';

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

console.log('=== PHASE 8.1: RELEASE POLICY ENGINE ===\n');

const policy = new ReleasePolicyEngine();

// Test 1: Safe candidate auto-approves
const safe = policy.evaluateCandidate(
  { releaseId: 'r-safe', target: 'scheduler', riskScore: 0.2, expectedImpact: 'LOW', operations: ['deploy'] },
  { testPassRate: 0.99, canarySuccessRate: 1, latencyRegressionPct: 2, errorRatePct: 0.2 }
);
assert(safe.decision === 'AUTO_APPROVE', 'Policy: auto-approve safe candidate');

// Test 2: Forbidden target blocks candidate
policy.configurePolicy({ forbiddenTargets: ['core-auth'] });
const blockedTarget = policy.evaluateCandidate(
  { releaseId: 'r-block-target', target: 'core-auth', riskScore: 0.1, expectedImpact: 'LOW', operations: ['deploy'] },
  { testPassRate: 0.99, canarySuccessRate: 1, latencyRegressionPct: 1, errorRatePct: 0.1 }
);
assert(blockedTarget.decision === 'BLOCKED', 'Policy: block forbidden target');

// Test 3: Missing evidence blocks candidate
const missingEvidence = policy.evaluateCandidate(
  { releaseId: 'r-missing-evidence', target: 'scheduler', riskScore: 0.1, expectedImpact: 'LOW', operations: ['deploy'] },
  {}
);
assert(missingEvidence.decision === 'BLOCKED', 'Policy: block missing test/canary evidence');

// Test 4: High risk escalates
const highRisk = policy.evaluateCandidate(
  { releaseId: 'r-high-risk', target: 'scheduler', riskScore: 0.9, expectedImpact: 'LOW', operations: ['deploy'] },
  { testPassRate: 0.99, canarySuccessRate: 1, latencyRegressionPct: 1, errorRatePct: 0.1 }
);
assert(highRisk.decision === 'ESCALATE_HUMAN', 'Policy: escalate high risk');

// Test 5: High impact escalates
const highImpact = policy.evaluateCandidate(
  { releaseId: 'r-high-impact', target: 'scheduler', riskScore: 0.1, expectedImpact: 'HIGH', operations: ['deploy'] },
  { testPassRate: 0.99, canarySuccessRate: 1, latencyRegressionPct: 1, errorRatePct: 0.1 }
);
assert(highImpact.decision === 'ESCALATE_HUMAN', 'Policy: escalate high impact');

// Test 6: Forbidden operation blocks candidate
policy.configurePolicy({ forbiddenOperations: ['destructive-op'] });
const blockedOp = policy.evaluateCandidate(
  { releaseId: 'r-block-op', target: 'scheduler', riskScore: 0.1, expectedImpact: 'LOW', operations: ['destructive-op'] },
  { testPassRate: 0.99, canarySuccessRate: 1, latencyRegressionPct: 1, errorRatePct: 0.1 }
);
assert(blockedOp.decision === 'BLOCKED', 'Policy: block forbidden operation');

// Test 7: Canary below threshold escalates (not blocks)
const weakCanary = policy.evaluateCandidate(
  { releaseId: 'r-weak-canary', target: 'scheduler', riskScore: 0.1, expectedImpact: 'LOW', operations: ['deploy'] },
  { testPassRate: 0.99, canarySuccessRate: 0.9, latencyRegressionPct: 1, errorRatePct: 0.1 }
);
assert(weakCanary.decision === 'ESCALATE_HUMAN', 'Policy: escalate weak canary evidence');

// Test 8: Configuration bounds clamp invalid values
policy.configurePolicy({
  maxRiskScore: 99,
  minTestPassRate: -1,
  maxLatencyRegressionPct: -40,
  maxErrorRatePct: 999,
  minCanarySuccessRate: 9
});
const bounded = policy.getPolicy();
assert(
  bounded.maxRiskScore === 1 &&
    bounded.minTestPassRate === 0 &&
    bounded.maxLatencyRegressionPct === 0 &&
    bounded.maxErrorRatePct === 100 &&
    bounded.minCanarySuccessRate === 1,
  'Policy: bound numeric policy values'
);

console.log(`\nTests: ${testsPassed}/${testsPassed + testsFailed} passed`);
process.exit(testsFailed > 0 ? 1 : 0);

