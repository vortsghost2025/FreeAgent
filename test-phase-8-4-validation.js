/**
 * Phase 8.4 Test Suite - Introspective Validation
 */

import {
  SelfVerificationProtocol,
  MetaGovernanceEngine,
  IntrospectiveValidationEngine
} from './medical/intelligence/introspective-validation.js';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (!condition) {
    console.log(`x ${message}`);
    testsFailed++;
  } else {
    console.log(`✓ ${message}`);
    testsPassed++;
  }
}

console.log('=== PHASE 8.4: INTROSPECTIVE VALIDATION ===\n');

// Test 1: Verification protocol passes healthy inputs
const verifier = new SelfVerificationProtocol();
const goodVerification = verifier.runAll({
  selfModelConsistency: 0.995,
  validationResults: [{ compliant: true }, { compliant: true }],
  changes: [
    { reversible: true, rollbackPlan: 'rollback:a', auditRef: 'audit:a' },
    { reversible: true, rollbackPlan: 'rollback:b', auditRef: 'audit:b' }
  ],
  auditEntries: [{ auditRef: 'audit:a' }, { auditRef: 'audit:b' }],
  performanceRegressionPct: 2
});
assert(goodVerification.passed, 'Verification protocol: pass healthy introspection inputs');

// Test 2: Verification protocol detects failures
const badVerification = verifier.runAll({
  selfModelConsistency: 0.8,
  validationResults: [{ compliant: false }],
  changes: [{ reversible: false, rollbackPlan: '', auditRef: '' }],
  auditEntries: [],
  performanceRegressionPct: 20
});
assert(!badVerification.passed, 'Verification protocol: detect introspection violations');

// Test 3: Meta-governance approves healthy verification
const governance = new MetaGovernanceEngine();
const governanceOk = governance.assess(goodVerification, { highImpact: false });
assert(governanceOk.decision === 'APPROVE', 'Meta-governance: approve healthy verification');

// Test 4: Meta-governance escalates failed verification
const governanceBad = governance.assess(badVerification, { highImpact: false });
assert(governanceBad.decision === 'REJECT_AND_ESCALATE', 'Meta-governance: reject and escalate failed verification');

// Test 5: Introspective validation end-to-end
const engine = new IntrospectiveValidationEngine();
const result = engine.runIntrospectiveValidation({
  selfModelConsistency: 0.999,
  validationResults: [{ compliant: true }],
  changes: [{ reversible: true, rollbackPlan: 'rollback:c', auditRef: 'audit-entry-0' }],
  performanceRegressionPct: 1
});
assert(result.success && result.verification.passed, 'Introspective engine: run end-to-end validation');

// Test 6: Audit chain integrity verification
engine.appendAuditEntry('MANUAL_AUDIT_EVENT', { note: 'follow-up audit' });
const integrity = engine.verifyAuditIntegrity();
assert(integrity.valid, 'Introspective engine: verify audit hash-chain integrity');

// Test 7: Status summary
const status = engine.getValidationStatus();
assert(status.auditEntries >= 2 && status.auditIntegrity, 'Introspective engine: expose validation status');

console.log(`\nTests: ${testsPassed}/${testsPassed + testsFailed} passed`);
process.exit(testsFailed > 0 ? 1 : 0);

