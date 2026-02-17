/**
 * Phase 7.3: Autonomous Patch Proposals
 * Builder proposes patches/tests/invariants/optimizations, tester evaluates, human approves or rejects.
 */

const ALLOWED_PROPOSAL_UPDATE_FIELDS = new Set([
  'status',
  'evaluation',
  'evaluatedAt',
  'approvedBy',
  'approvedAt',
  'rejectionReason',
  'rejectedAt',
  'appliedAt',
  'applyMetadata'
]);

export class ProposalLedger {
  constructor(options = {}) {
    this.proposals = new Map();
    this.activityLog = [];
    this.maxLogSize = options.maxLogSize || 5000;
  }

  addProposal(proposal) {
    if (!proposal || !proposal.proposalId) {
      return { success: false, error: 'INVALID_PROPOSAL' };
    }
    this.proposals.set(proposal.proposalId, proposal);
    this._log('PROPOSED', proposal.proposalId, { type: proposal.type, target: proposal.target });
    return { success: true, proposalId: proposal.proposalId };
  }

  updateProposal(proposalId, updates = {}) {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return { success: false, error: 'PROPOSAL_NOT_FOUND' };
    if (!updates || typeof updates !== 'object') {
      return { success: false, error: 'INVALID_UPDATES' };
    }

    const keys = Object.keys(updates);
    const disallowedFields = keys.filter((key) => !ALLOWED_PROPOSAL_UPDATE_FIELDS.has(key));
    if (disallowedFields.length > 0) {
      return { success: false, error: 'DISALLOWED_UPDATE_FIELDS', disallowedFields };
    }

    const safeUpdates = {};
    for (const key of keys) {
      safeUpdates[key] = updates[key];
    }

    Object.assign(proposal, safeUpdates);
    this._log('UPDATED', proposalId, safeUpdates);
    return { success: true, proposal };
  }

  getProposal(proposalId) {
    return this.proposals.get(proposalId) || null;
  }

  listProposals(status = null) {
    const all = Array.from(this.proposals.values());
    return status ? all.filter((p) => p.status === status) : all;
  }

  getStats() {
    const all = this.listProposals();
    const statusCounts = {};
    for (const proposal of all) {
      statusCounts[proposal.status] = (statusCounts[proposal.status] || 0) + 1;
    }

    return {
      total: all.length,
      byStatus: statusCounts,
      pendingHuman: all.filter((p) => p.status === 'PENDING_HUMAN_REVIEW').length,
      approved: all.filter((p) => p.status === 'APPROVED').length,
      rejected: all.filter((p) => p.status === 'REJECTED').length
    };
  }

  _log(eventType, proposalId, payload = {}) {
    this.activityLog.push({
      eventType,
      proposalId,
      payload,
      timestamp: Date.now()
    });
    if (this.activityLog.length > this.maxLogSize) {
      this.activityLog.shift();
    }
  }
}

export class PatchProposalBuilder {
  constructor(options = {}) {
    this.clusterId = options.clusterId || `cluster-${Date.now()}`;
    this.sequence = 0;
  }

  proposeCodePatch(target, summary, metadata = {}) {
    return this._propose('CODE_PATCH', target, summary, metadata);
  }

  proposeTestImprovement(target, summary, metadata = {}) {
    return this._propose('TEST_IMPROVEMENT', target, summary, metadata);
  }

  proposeInvariant(target, summary, metadata = {}) {
    return this._propose('INVARIANT_TIGHTENING', target, summary, metadata);
  }

  proposeOptimization(target, summary, metadata = {}) {
    return this._propose('OPTIMIZATION', target, summary, metadata);
  }

  _propose(type, target, summary, metadata = {}) {
    this.sequence += 1;
    const riskScore = Number((metadata.riskScore == null ? 0.25 : metadata.riskScore).toFixed(3));
    const expectedBenefit = Number((metadata.expectedBenefit == null ? 0.12 : metadata.expectedBenefit).toFixed(3));
    const proposalId = `patch-proposal-${Date.now()}-${this.sequence}`;

    return {
      proposalId,
      type,
      target,
      summary,
      patchSketch: metadata.patchSketch || null,
      testPlan: metadata.testPlan || null,
      invariant: metadata.invariant || null,
      optimizationMetric: metadata.optimizationMetric || null,
      riskScore,
      expectedBenefit,
      expectedImpact: metadata.expectedImpact || 'MEDIUM',
      highImpact: metadata.highImpact === true,
      requiresHumanApproval: metadata.requiresHumanApproval === true || riskScore >= 0.5 || metadata.highImpact === true,
      createdBy: 'AUTONOMOUS_BUILDER',
      status: 'PROPOSED',
      createdAt: Date.now()
    };
  }
}

export class ProposalTester {
  constructor(options = {}) {
    this.minScore = options.minScore || 50;
    this.evaluationLog = [];
  }

  evaluate(proposal, evidence = {}) {
    const testPassRate = evidence.testPassRate == null ? 1 : evidence.testPassRate;
    const coverageDelta = evidence.coverageDelta == null ? 0 : evidence.coverageDelta;
    const regressionRisk = evidence.regressionRisk == null ? proposal.riskScore : evidence.regressionRisk;
    const invariantRisk = evidence.invariantRisk == null ? 0 : evidence.invariantRisk;

    let score = 0;
    score += Math.max(0, Math.min(1, testPassRate)) * 60;
    score += Math.max(-0.2, Math.min(0.5, coverageDelta)) * 40;
    score += Math.max(0, Math.min(1, proposal.expectedBenefit || 0)) * 20;
    score -= Math.max(0, Math.min(1, regressionRisk)) * 40;
    score -= Math.max(0, Math.min(1, invariantRisk)) * 20;
    score = Math.max(0, Math.min(100, score));

    const reasons = [];
    if (score < this.minScore) reasons.push('LOW_CONFIDENCE');
    if (testPassRate < 0.95) reasons.push('TEST_PASS_RATE_LOW');
    if (regressionRisk > 0.5) reasons.push('REGRESSION_RISK_HIGH');

    let recommendation = 'ACCEPT';
    if (reasons.length > 0) recommendation = 'REJECT';
    if (proposal.requiresHumanApproval && recommendation === 'ACCEPT') recommendation = 'REVIEW';

    const result = {
      proposalId: proposal.proposalId,
      score: Number(score.toFixed(2)),
      recommendation,
      passed: recommendation !== 'REJECT',
      reasons,
      evaluatedAt: Date.now()
    };

    this.evaluationLog.push(result);
    return result;
  }
}

export class AutonomousPatchProposalEngine {
  constructor(options = {}) {
    this.ledger = options.ledger || new ProposalLedger(options);
    this.builder = options.builder || new PatchProposalBuilder(options);
    this.tester = options.tester || new ProposalTester(options);
  }

  proposeCodePatch(target, summary, metadata = {}) {
    return this._propose(this.builder.proposeCodePatch(target, summary, metadata));
  }

  proposeTestImprovement(target, summary, metadata = {}) {
    return this._propose(this.builder.proposeTestImprovement(target, summary, metadata));
  }

  proposeInvariant(target, summary, metadata = {}) {
    return this._propose(this.builder.proposeInvariant(target, summary, metadata));
  }

  proposeOptimization(target, summary, metadata = {}) {
    return this._propose(this.builder.proposeOptimization(target, summary, metadata));
  }

  proposeFromDiagnostics(diagnostics = {}) {
    const generated = [];

    if ((diagnostics.nondeterminismScore || 0) > 0) {
      generated.push(this.proposeInvariant(
        'test-harness',
        'Enforce deterministic test hooks for unstable suites',
        { riskScore: 0.22, expectedBenefit: 0.25, invariant: 'No randomness in test path' }
      ).proposal);
      generated.push(this.proposeTestImprovement(
        'phase-suite',
        'Add repeat-run checks for nondeterminism',
        { riskScore: 0.12, expectedBenefit: 0.18, testPlan: 'Run suites multiple times' }
      ).proposal);
    }

    if ((diagnostics.orchestrationLatencyP95 || 0) > (diagnostics.latencyBudgetMs || 250)) {
      generated.push(this.proposeOptimization(
        'orchestrator',
        'Optimize scheduling latency path',
        { riskScore: 0.28, expectedBenefit: 0.2, optimizationMetric: 'p95-latency-ms' }
      ).proposal);
    }

    if ((diagnostics.driftScore || 0) > 0.2) {
      generated.push(this.proposeCodePatch(
        'adaptive-intelligence',
        'Rebaseline drift-sensitive metrics',
        { riskScore: 0.3, expectedBenefit: 0.16, patchSketch: 'Adjust baseline update cadence' }
      ).proposal);
    }

    if (generated.length === 0) {
      generated.push(this.proposeOptimization(
        'observability',
        'Low-risk telemetry optimization',
        { riskScore: 0.08, expectedBenefit: 0.08, optimizationMetric: 'telemetry-overhead' }
      ).proposal);
    }

    return {
      success: true,
      generatedCount: generated.length,
      proposals: generated
    };
  }

  evaluateProposal(proposalId, evidence = {}) {
    const proposal = this.ledger.getProposal(proposalId);
    if (!proposal) return { success: false, error: 'PROPOSAL_NOT_FOUND' };

    const evaluation = this.tester.evaluate(proposal, evidence);
    let status = 'TESTED_FAIL';
    if (evaluation.recommendation === 'ACCEPT') status = 'TESTED_PASS';
    if (evaluation.recommendation === 'REVIEW') status = 'PENDING_HUMAN_REVIEW';

    this.ledger.updateProposal(proposalId, {
      evaluation,
      status,
      evaluatedAt: Date.now()
    });

    return { success: true, evaluation, status };
  }

  approveProposal(proposalId, approver = 'human') {
    const proposal = this.ledger.getProposal(proposalId);
    if (!proposal) return { success: false, error: 'PROPOSAL_NOT_FOUND' };

    this.ledger.updateProposal(proposalId, {
      status: 'APPROVED',
      approvedBy: approver,
      approvedAt: Date.now()
    });

    return { success: true, proposalId, approvedBy: approver };
  }

  rejectProposal(proposalId, reason = 'Rejected by reviewer') {
    const proposal = this.ledger.getProposal(proposalId);
    if (!proposal) return { success: false, error: 'PROPOSAL_NOT_FOUND' };

    this.ledger.updateProposal(proposalId, {
      status: 'REJECTED',
      rejectionReason: reason,
      rejectedAt: Date.now()
    });

    return { success: true, proposalId, reason };
  }

  markApplied(proposalId, metadata = {}) {
    const proposal = this.ledger.getProposal(proposalId);
    if (!proposal) return { success: false, error: 'PROPOSAL_NOT_FOUND' };
    if (proposal.status !== 'APPROVED') {
      return { success: false, error: 'PROPOSAL_NOT_APPROVED' };
    }

    this.ledger.updateProposal(proposalId, {
      status: 'APPLIED',
      appliedAt: Date.now(),
      applyMetadata: metadata
    });

    return { success: true, proposalId };
  }

  getPendingHumanApprovals() {
    return this.ledger.listProposals('PENDING_HUMAN_REVIEW');
  }

  getProposalReport() {
    return {
      stats: this.ledger.getStats(),
      pendingHumanApprovals: this.getPendingHumanApprovals(),
      recentActivity: this.ledger.activityLog.slice(-20)
    };
  }

  _propose(proposal) {
    const result = this.ledger.addProposal(proposal);
    return {
      success: result.success,
      proposal
    };
  }
}

export default {
  ProposalLedger,
  PatchProposalBuilder,
  ProposalTester,
  AutonomousPatchProposalEngine
};
