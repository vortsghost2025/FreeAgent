/**
 * Phase 7.1: Self-Directed Improvement Cycles
 * Builder proposes improvements, tester validates, governor escalates only on threshold violations.
 */

/**
 * Improvement Builder
 * Generates deterministic proposal sets from diagnostic signals.
 */
export class ImprovementBuilder {
  constructor(options = {}) {
    this.clusterId = options.clusterId || `cluster-${Date.now()}`;
    this.maxProposalsPerCycle = options.maxProposalsPerCycle || 5;
    this.minExpectedBenefit = options.minExpectedBenefit || 0.03;
    this.proposalHistory = [];
    this.sequence = 0;
  }

  proposeImprovements(cycleId, signals = {}) {
    const diagnostics = signals.diagnostics || {};
    const latencyBudgetMs = signals.latencyBudgetMs || 250;
    const proposals = [];

    if ((diagnostics.driftScore || 0) > 0.2) {
      proposals.push(this._buildProposal(cycleId, 'DRIFT_CALIBRATION', 'metrics-pipeline',
        'Calibrate baselines against latest drift profile', 0.18, 0.22, diagnostics));
    }

    if ((diagnostics.nondeterminismScore || 0) > 0) {
      proposals.push(this._buildProposal(cycleId, 'DETERMINISM_HARDENING', 'test-harness',
        'Replace nondeterministic branches with deterministic hooks', 0.24, 0.27, diagnostics));
    }

    if ((diagnostics.privacyComplianceRate ?? 100) < 100) {
      proposals.push(this._buildProposal(cycleId, 'PRIVACY_GUARDRAIL', 'privacy-aggregator',
        'Harden privacy checks and add stricter compliance assertions', 0.16, 0.18, diagnostics));
    }

    if (signals.convergenceTrend === 'DEGRADING' || (diagnostics.convergenceStability || 1) < 0.7) {
      proposals.push(this._buildProposal(cycleId, 'CONVERGENCE_TUNING', 'federated-learning',
        'Tighten convergence thresholds and stabilize model update cadence', 0.21, 0.31, diagnostics));
    }

    if ((diagnostics.orchestrationLatencyP95 || 0) > latencyBudgetMs) {
      proposals.push(this._buildProposal(cycleId, 'ORCHESTRATION_OPTIMIZATION', 'scheduler',
        'Reduce orchestration latency through queue and dispatch tuning', 0.14, 0.24, diagnostics));
    }

    if (proposals.length === 0) {
      proposals.push(this._buildProposal(cycleId, 'MAINTENANCE_OPTIMIZATION', 'observability',
        'No critical issues detected; perform low-risk optimization sweep', 0.08, 0.12, diagnostics));
    }

    const selected = proposals.slice(0, this.maxProposalsPerCycle);
    this.proposalHistory.push(...selected);
    return selected;
  }

  _buildProposal(cycleId, type, target, summary, expectedBenefit, riskScore, diagnostics) {
    const boundedBenefit = Math.max(this.minExpectedBenefit, Math.min(1, expectedBenefit));
    const boundedRisk = Math.max(0, Math.min(1, riskScore));
    this.sequence += 1;

    return {
      proposalId: `proposal-${cycleId}-${this.sequence}`,
      cycleId,
      type,
      target,
      summary,
      expectedBenefit: Number(boundedBenefit.toFixed(3)),
      riskScore: Number(boundedRisk.toFixed(3)),
      source: 'AUTONOMOUS_BUILDER',
      diagnosticsSnapshot: {
        driftScore: diagnostics.driftScore || 0,
        nondeterminismScore: diagnostics.nondeterminismScore || 0,
        privacyComplianceRate: diagnostics.privacyComplianceRate ?? 100,
        convergenceStability: diagnostics.convergenceStability ?? 1,
        orchestrationLatencyP95: diagnostics.orchestrationLatencyP95 || 0
      },
      createdAt: Date.now()
    };
  }
}

/**
 * Improvement Tester
 * Scores proposal safety and expected correctness before autonomous execution.
 */
export class ImprovementTester {
  constructor(options = {}) {
    this.minScore = options.minScore || 40;
    this.validationLog = [];
  }

  validateProposal(proposal, context = {}) {
    const testPassRate = context.testPassRate == null ? 1 : context.testPassRate;
    const regressionRisk = context.regressionRisk == null ? proposal.riskScore : context.regressionRisk;
    const forbiddenTargets = context.forbiddenTargets || [];

    let score = 0;
    score += (proposal.expectedBenefit || 0) * 60;
    score += Math.max(0, Math.min(1, testPassRate)) * 40;
    score -= Math.max(0, Math.min(1, regressionRisk)) * 40;
    score = Math.max(0, Math.min(100, score));

    const reasons = [];
    if (forbiddenTargets.includes(proposal.target)) {
      reasons.push('TARGET_FORBIDDEN');
    }
    if (score < this.minScore) {
      reasons.push('SCORE_BELOW_THRESHOLD');
    }

    const passed = reasons.length === 0;
    const result = {
      proposalId: proposal.proposalId,
      passed,
      score: Number(score.toFixed(2)),
      regressionRisk: Number(regressionRisk.toFixed(3)),
      recommendation: passed ? 'ACCEPT' : 'REJECT',
      reasons,
      validatedAt: Date.now()
    };

    this.validationLog.push(result);
    return result;
  }

  validateBatch(proposals = [], context = {}) {
    const results = proposals.map((proposal) => this.validateProposal(proposal, context));
    const passed = results.filter((r) => r.passed).length;
    const failed = results.length - passed;
    const avgScore = results.length > 0
      ? results.reduce((sum, r) => sum + r.score, 0) / results.length
      : 0;

    return {
      total: results.length,
      passed,
      failed,
      passRate: Number((results.length > 0 ? passed / results.length : 1).toFixed(3)),
      avgScore: Number(avgScore.toFixed(2)),
      results
    };
  }
}

/**
 * Governance Gate
 * Escalates to human auditor only when configured thresholds are violated.
 */
export class GovernanceGate {
  constructor(options = {}) {
    this.thresholds = {
      minPassRate: 0.7,
      maxAverageRisk: 0.55,
      maxFailedValidations: 2,
      maxCriticalFindings: 0,
      ...(options.thresholds || {})
    };
    this.governanceLog = [];
  }

  setThresholds(thresholds = {}) {
    this.thresholds = { ...this.thresholds, ...thresholds };
    return { success: true, thresholds: this.thresholds };
  }

  assessCycle(cycleResult = {}) {
    const validation = cycleResult.validation || { passRate: 1, failed: 0 };
    const proposals = cycleResult.proposals || [];
    const diagnostics = cycleResult.diagnosticsSummary || {};
    const averageRisk = proposals.length > 0
      ? proposals.reduce((sum, p) => sum + (p.riskScore || 0), 0) / proposals.length
      : 0;

    const reasons = [];
    if (validation.passRate < this.thresholds.minPassRate) {
      reasons.push('PASS_RATE_BELOW_THRESHOLD');
    }
    if (averageRisk > this.thresholds.maxAverageRisk) {
      reasons.push('AVERAGE_RISK_ABOVE_THRESHOLD');
    }
    if (validation.failed > this.thresholds.maxFailedValidations) {
      reasons.push('TOO_MANY_FAILED_VALIDATIONS');
    }
    if ((diagnostics.criticalFindings || 0) > this.thresholds.maxCriticalFindings) {
      reasons.push('CRITICAL_FINDINGS_PRESENT');
    }

    const requiresIntervention = reasons.length > 0;
    const decision = {
      requiresIntervention,
      decision: requiresIntervention ? 'ESCALATE_HUMAN' : 'AUTONOMOUS_CONTINUE',
      reasons,
      passRate: validation.passRate,
      averageRisk: Number(averageRisk.toFixed(3)),
      assessedAt: Date.now()
    };

    this.governanceLog.push(decision);
    return decision;
  }
}

/**
 * Self-Directed Improvement Cycle Engine
 * End-to-end cycle orchestration with proposal/testing/governance and outcome deltas.
 */
export class SelfDirectedImprovementCycleEngine {
  constructor(options = {}) {
    this.builder = options.builder || new ImprovementBuilder(options);
    this.tester = options.tester || new ImprovementTester(options);
    this.governance = options.governance || new GovernanceGate(options);
    this.cycleLog = [];
    this.maxLogSize = options.maxLogSize || 5000;
  }

  configureThresholds(thresholds = {}) {
    return this.governance.setThresholds(thresholds);
  }

  runCycle(cycleId, signals = {}, options = {}) {
    const proposals = this.builder.proposeImprovements(cycleId, signals);
    const validation = this.tester.validateBatch(proposals, {
      testPassRate: options.testPassRate == null ? (signals.testPassRate == null ? 1 : signals.testPassRate) : options.testPassRate,
      regressionRisk: options.regressionRisk,
      forbiddenTargets: options.forbiddenTargets || []
    });

    const validationByProposal = new Map(validation.results.map((r) => [r.proposalId, r]));
    const maxAutoRisk = this._boundedRisk(options.maxAutoRisk, 0.45);

    const accepted = [];
    const rejected = [];

    for (const proposal of proposals) {
      const result = validationByProposal.get(proposal.proposalId);
      const proposalRiskScore = this._normalizeRisk(proposal.riskScore);
      const hasValidRiskScore = proposalRiskScore != null;
      const isWithinAutoRisk = hasValidRiskScore && proposalRiskScore <= maxAutoRisk;

      if (result && result.passed && isWithinAutoRisk) {
        accepted.push(proposal);
      } else {
        const rejectionReasons = [];
        if (!result) {
          rejectionReasons.push('NO_VALIDATION_RESULT');
        } else {
          if (!result.passed) {
            rejectionReasons.push(...(Array.isArray(result.reasons) && result.reasons.length > 0
              ? result.reasons
              : ['VALIDATION_FAILED']));
          }
          if (!hasValidRiskScore) {
            rejectionReasons.push('INVALID_RISK_SCORE');
          } else if (!isWithinAutoRisk) {
            rejectionReasons.push('RISK_LIMIT');
          }
        }
        if (rejectionReasons.length === 0) {
          rejectionReasons.push('UNSPECIFIED_REJECTION');
        }

        rejected.push({
          proposalId: proposal.proposalId,
          reason: rejectionReasons.join(',')
        });
      }
    }

    const diagnostics = signals.diagnostics || {};
    const cycleResult = {
      cycleId,
      timestamp: Date.now(),
      proposals,
      proposalsGenerated: proposals.length,
      accepted,
      rejected,
      validation,
      metricsDelta: this._calculateMetricDeltas(
        options.baselineMetrics || signals.baselineMetrics || {},
        options.observedMetrics || signals.observedMetrics || {}
      ),
      diagnosticsSummary: {
        driftScore: diagnostics.driftScore || 0,
        nondeterminismScore: diagnostics.nondeterminismScore || 0,
        criticalFindings: diagnostics.criticalFindings || 0
      }
    };

    const governance = this.governance.assessCycle(cycleResult);
    cycleResult.governance = governance;
    cycleResult.requiresAuditorIntervention = governance.requiresIntervention;

    this.cycleLog.push(cycleResult);
    if (this.cycleLog.length > this.maxLogSize) {
      this.cycleLog.shift();
    }

    return cycleResult;
  }

  _normalizeRisk(value) {
    return this._boundedRisk(value, null);
  }

  _boundedRisk(value, fallback) {
    if (value == null) return fallback;
    const risk = Number(value);
    if (!Number.isFinite(risk)) return fallback;
    return Math.max(0, Math.min(1, risk));
  }

  _calculateMetricDeltas(baselineMetrics = {}, observedMetrics = {}) {
    const keys = new Set([...Object.keys(baselineMetrics), ...Object.keys(observedMetrics)]);
    const deltas = {};

    for (const key of keys) {
      const before = baselineMetrics[key];
      const after = observedMetrics[key];
      if (typeof before === 'number' && typeof after === 'number') {
        const absoluteDelta = after - before;
        const relativeDelta = before !== 0 ? (absoluteDelta / before) : (after === 0 ? 0 : 1);
        deltas[key] = {
          before,
          after,
          absoluteDelta: Number(absoluteDelta.toFixed(4)),
          relativeDelta: Number(relativeDelta.toFixed(4))
        };
      }
    }

    return deltas;
  }

  getCycleReport() {
    const totalCycles = this.cycleLog.length;
    const interventions = this.cycleLog.filter((c) => c.requiresAuditorIntervention).length;
    const totalProposals = this.cycleLog.reduce((sum, c) => sum + c.proposalsGenerated, 0);
    const totalAccepted = this.cycleLog.reduce((sum, c) => sum + c.accepted.length, 0);

    return {
      totalCycles,
      interventions,
      interventionRate: Number((totalCycles > 0 ? interventions / totalCycles : 0).toFixed(3)),
      totalProposals,
      totalAccepted,
      acceptanceRate: Number((totalProposals > 0 ? totalAccepted / totalProposals : 0).toFixed(3)),
      recentCycles: this.cycleLog.slice(-5)
    };
  }
}

export default {
  ImprovementBuilder,
  ImprovementTester,
  GovernanceGate,
  SelfDirectedImprovementCycleEngine
};
