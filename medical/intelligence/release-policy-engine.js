/**
 * Phase 8.1: Release Policy Engine
 * Enforces policy-based governance for autonomous production release candidates.
 */

export class ReleasePolicyEngine {
  constructor(options = {}) {
    this.policy = {
      maxRiskScore: 0.45,
      minTestPassRate: 0.97,
      maxLatencyRegressionPct: 8,
      maxErrorRatePct: 1,
      minCanarySuccessRate: 0.99,
      requireCanaryEvidence: true,
      forbiddenTargets: [],
      forbiddenOperations: [],
      escalationImpactLevels: ['HIGH', 'CRITICAL'],
      ...(options.policy || options)
    };

    this.policy.forbiddenTargets = new Set(this.policy.forbiddenTargets || []);
    this.policy.forbiddenOperations = new Set(this.policy.forbiddenOperations || []);
    this.policy.escalationImpactLevels = new Set(this.policy.escalationImpactLevels || ['HIGH', 'CRITICAL']);
    this._normalizePolicyBounds();
  }

  configurePolicy(partial = {}) {
    if (Array.isArray(partial.forbiddenTargets)) {
      this.policy.forbiddenTargets = new Set(partial.forbiddenTargets);
    }
    if (Array.isArray(partial.forbiddenOperations)) {
      this.policy.forbiddenOperations = new Set(partial.forbiddenOperations);
    }
    if (Array.isArray(partial.escalationImpactLevels)) {
      this.policy.escalationImpactLevels = new Set(partial.escalationImpactLevels);
    }

    const numericKeys = [
      ['maxRiskScore', 0, 1],
      ['minTestPassRate', 0, 1],
      ['maxLatencyRegressionPct', 0, 1000],
      ['maxErrorRatePct', 0, 100],
      ['minCanarySuccessRate', 0, 1]
    ];

    for (const [key, min, max] of numericKeys) {
      if (partial[key] != null) {
        this.policy[key] = this._boundedNumber(partial[key], this.policy[key], min, max);
      }
    }

    if (partial.requireCanaryEvidence != null) {
      this.policy.requireCanaryEvidence = partial.requireCanaryEvidence === true;
    }

    return { success: true, policy: this.getPolicy() };
  }

  evaluateCandidate(candidate = {}, evidence = {}) {
    const blockedReasons = [];
    const escalationReasons = [];

    const target = candidate.target || 'unknown-target';
    const operations = candidate.operations || [];
    const impact = candidate.expectedImpact || 'MEDIUM';

    const riskScore = this._boundedNumber(candidate.riskScore, 0, 0, 1);
    const testPassRate = this._boundedNumber(evidence.testPassRate, null, 0, 1);
    const latencyRegressionPct = this._boundedNumber(evidence.latencyRegressionPct, 0, 0, 1000);
    const errorRatePct = this._boundedNumber(evidence.errorRatePct, 0, 0, 100);
    const canarySuccessRate = this._boundedNumber(evidence.canarySuccessRate, null, 0, 1);

    if (this.policy.forbiddenTargets.has(target)) {
      blockedReasons.push(`FORBIDDEN_TARGET:${target}`);
    }

    for (const operation of operations) {
      if (this.policy.forbiddenOperations.has(operation)) {
        blockedReasons.push(`FORBIDDEN_OPERATION:${operation}`);
      }
    }

    if (testPassRate == null) {
      blockedReasons.push('MISSING_TEST_EVIDENCE');
    } else if (testPassRate < this.policy.minTestPassRate) {
      blockedReasons.push('TEST_PASS_RATE_BELOW_MINIMUM');
    }

    if (this.policy.requireCanaryEvidence && canarySuccessRate == null) {
      blockedReasons.push('MISSING_CANARY_EVIDENCE');
    } else if (canarySuccessRate != null && canarySuccessRate < this.policy.minCanarySuccessRate) {
      escalationReasons.push('CANARY_SUCCESS_RATE_BELOW_POLICY');
    }

    if (riskScore > this.policy.maxRiskScore) {
      escalationReasons.push('RISK_SCORE_ABOVE_POLICY');
    }
    if (latencyRegressionPct > this.policy.maxLatencyRegressionPct) {
      escalationReasons.push('LATENCY_REGRESSION_ABOVE_POLICY');
    }
    if (errorRatePct > this.policy.maxErrorRatePct) {
      escalationReasons.push('ERROR_RATE_ABOVE_POLICY');
    }
    if (this.policy.escalationImpactLevels.has(impact)) {
      escalationReasons.push(`IMPACT_LEVEL_REQUIRES_HUMAN:${impact}`);
    }

    let decision = 'AUTO_APPROVE';
    if (blockedReasons.length > 0) {
      decision = 'BLOCKED';
    } else if (escalationReasons.length > 0) {
      decision = 'ESCALATE_HUMAN';
    }

    return {
      decision,
      blockedReasons,
      escalationReasons,
      candidate: {
        releaseId: candidate.releaseId || null,
        target,
        riskScore,
        expectedImpact: impact
      },
      evidence: {
        testPassRate,
        canarySuccessRate,
        latencyRegressionPct,
        errorRatePct
      },
      evaluatedAt: Date.now()
    };
  }

  getPolicy() {
    return {
      maxRiskScore: this.policy.maxRiskScore,
      minTestPassRate: this.policy.minTestPassRate,
      maxLatencyRegressionPct: this.policy.maxLatencyRegressionPct,
      maxErrorRatePct: this.policy.maxErrorRatePct,
      minCanarySuccessRate: this.policy.minCanarySuccessRate,
      requireCanaryEvidence: this.policy.requireCanaryEvidence,
      forbiddenTargets: Array.from(this.policy.forbiddenTargets),
      forbiddenOperations: Array.from(this.policy.forbiddenOperations),
      escalationImpactLevels: Array.from(this.policy.escalationImpactLevels)
    };
  }

  _normalizePolicyBounds() {
    this.policy.maxRiskScore = this._boundedNumber(this.policy.maxRiskScore, 0.45, 0, 1);
    this.policy.minTestPassRate = this._boundedNumber(this.policy.minTestPassRate, 0.97, 0, 1);
    this.policy.maxLatencyRegressionPct = this._boundedNumber(this.policy.maxLatencyRegressionPct, 8, 0, 1000);
    this.policy.maxErrorRatePct = this._boundedNumber(this.policy.maxErrorRatePct, 1, 0, 100);
    this.policy.minCanarySuccessRate = this._boundedNumber(this.policy.minCanarySuccessRate, 0.99, 0, 1);
    this.policy.requireCanaryEvidence = this.policy.requireCanaryEvidence === true;
  }

  _boundedNumber(value, fallback, min, max) {
    if (value == null) return fallback;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(min, Math.min(max, numeric));
  }
}

export default {
  ReleasePolicyEngine
};

