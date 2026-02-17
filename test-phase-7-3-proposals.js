/**
 * Phase 7.3 Test Suite - Autonomous Patch Proposals
 */

import {
  ProposalLedger,
  PatchProposalBuilder,
  ProposalTester,
  AutonomousPatchProposalEngine
} from './medical/intelligence/autonomous-patch-proposals.js';

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

console.log('=== PHASE 7.3: AUTONOMOUS PATCH PROPOSALS ===\n');

// Test 1: Proposal ledger add proposal
const ledger = new ProposalLedger();
const builder = new PatchProposalBuilder();
const seedProposal = builder.proposeCodePatch('scheduler', 'Reduce queue overhead');
const added = ledger.addProposal(seedProposal);
assert(added.success, 'Proposal ledger: add proposal');

// Test 2: Ledger update
const updated = ledger.updateProposal(seedProposal.proposalId, { status: 'TESTED_PASS' });
assert(updated.success && updated.proposal.status === 'TESTED_PASS', 'Proposal ledger: update proposal');

// Test 3: Ledger rejects disallowed field mutation
const blockedMutation = ledger.updateProposal(seedProposal.proposalId, {
  proposalId: 'tampered-id',
  requiresHumanApproval: false
});
assert(!blockedMutation.success && blockedMutation.error === 'DISALLOWED_UPDATE_FIELDS', 'Proposal ledger: reject unsafe field mutation');

// Test 3: Tester accept
const tester = new ProposalTester();
const evalAccept = tester.evaluate(seedProposal, { testPassRate: 1, coverageDelta: 0.05, regressionRisk: 0.1 });
assert(evalAccept.recommendation === 'ACCEPT' || evalAccept.recommendation === 'REVIEW', 'Proposal tester: evaluate proposal');

// Test 4: Tester reject
const evalReject = tester.evaluate(seedProposal, { testPassRate: 0.7, coverageDelta: -0.1, regressionRisk: 0.9 });
assert(evalReject.recommendation === 'REJECT', 'Proposal tester: reject unsafe proposal');

// Test 5: Engine propose code patch
const engine = new AutonomousPatchProposalEngine();
const codeProp = engine.proposeCodePatch('adaptive-intelligence', 'Rebaseline drift metrics');
assert(codeProp.success, 'Patch engine: propose code patch');

// Test 6: Engine propose test improvement
const testProp = engine.proposeTestImprovement('phase-suite', 'Add repeated-run tests');
assert(testProp.success, 'Patch engine: propose test improvement');

// Test 7: Engine propose invariant
const invProp = engine.proposeInvariant('test-harness', 'No randomness in deterministic mode');
assert(invProp.success, 'Patch engine: propose invariant');

// Test 8: Engine propose optimization
const optProp = engine.proposeOptimization('orchestrator', 'Optimize dispatch latency');
assert(optProp.success, 'Patch engine: propose optimization');

// Test 9: Engine evaluate proposal
const evaluation = engine.evaluateProposal(codeProp.proposal.proposalId, {
  testPassRate: 1,
  coverageDelta: 0.02,
  regressionRisk: 0.2
});
assert(evaluation.success, 'Patch engine: evaluate proposal');

// Test 10: Engine escalate review proposal
const highRisk = engine.proposeCodePatch('critical-core', 'High impact rewrite', {
  riskScore: 0.8,
  highImpact: true
});
const highRiskEval = engine.evaluateProposal(highRisk.proposal.proposalId, {
  testPassRate: 1,
  coverageDelta: 0.01,
  regressionRisk: 0.3
});
assert(highRiskEval.status === 'PENDING_HUMAN_REVIEW', 'Patch engine: pending human review');

// Test 11: Approve and apply
const approved = engine.approveProposal(codeProp.proposal.proposalId, 'human-auditor');
const applied = engine.markApplied(codeProp.proposal.proposalId, { mode: 'MANUAL_APPROVAL' });
assert(approved.success && applied.success, 'Patch engine: approve and apply');

// Test 12: Reject proposal
const rejected = engine.rejectProposal(testProp.proposal.proposalId, 'Out of scope');
assert(rejected.success, 'Patch engine: reject proposal');

// Test 13: Diagnostics-driven proposal generation
const generated = engine.proposeFromDiagnostics({
  nondeterminismScore: 0.3,
  orchestrationLatencyP95: 300,
  latencyBudgetMs: 250
});
assert(generated.generatedCount >= 2, 'Patch engine: auto-generate proposals from diagnostics');

// Test 14: Proposal report
const report = engine.getProposalReport();
assert(report.stats.total >= 5, 'Patch engine: proposal report');

console.log(`\nTests: ${testsPassed}/${testsPassed + testsFailed} passed`);
process.exit(testsFailed > 0 ? 1 : 0);
