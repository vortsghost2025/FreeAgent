/**
 * Phase 8.∞: Meta-Governance Engine
 * Governance self-assessment, policy drift detection, adaptive thresholds
 */

export class MetaGovernanceEngine {
  constructor(options = {}) {
    this.policyHistory = [];
    this.baselineThresholds = {
      mttrSeconds: options.baselineMTTR || 30,
      riskScoreMax: options.baselineRisk || 0.5,
      improvementMinPct: options.baselineImprovement || 0.5,
      rollbackFrequencyMax: options.baselineRollbackFreq || 0.4
    };
    this.adaptiveThresholds = { ...this.baselineThresholds };
    this.maxHistorySize = options.maxHistorySize || 200;
  }

  /**
   * Self-assess governance: are rules too strict or too lenient?
   * Returns { assessment, metrics, recommendation }
   */
  assessGovernance(stats = {}) {
    const recentPolicyCumulative = this.policyHistory.slice(-20);
    if (recentPolicyCumulative.length === 0) {
      return {
        assessment: 'insufficient_data',
        recommendation: 'continue_baseline'
      };
    }

    const blockRate = recentPolicyCumulative.filter(p => p.action === 'BLOCK').length / recentPolicyCumulative.length;
    const approvalRate = recentPolicyCumulative.filter(p => p.action === 'APPROVE').length / recentPolicyCumulative.length;
    const reviewRate = recentPolicyCumulative.filter(p => p.action === 'REVIEW').length / recentPolicyCumulative.length;

    let assessment = 'balanced';
    let recommendation = 'maintain_policy';

    // Too strict: blocking too much (>60%)
    if (blockRate > 0.6) {
      assessment = 'overly_strict';
      recommendation = 'relax_thresholds';
    }
    // Too lenient: approving too much (<20%)
    else if (approvalRate > 0.8) {
      assessment = 'overly_lenient';
      recommendation = 'tighten_thresholds';
    }
    // Healthy: balanced mix
    else if (blockRate > 0.2 && blockRate < 0.5 && approvalRate > 0.3 && approvalRate < 0.7) {
      assessment = 'well_calibrated';
      recommendation = 'maintain_policy';
    }

    return {
      assessment,
      recommendation,
      blockRate: Number(blockRate.toFixed(3)),
      approvalRate: Number(approvalRate.toFixed(3)),
      reviewRate: Number(reviewRate.toFixed(3)),
      sampleSize: recentPolicyCumulative.length
    };
  }

  /**
   * Detect policy drift: is system evolving away from its constitution?
   * Returns { drifting, driftDetections, severity }
   */
  detectPolicyDrift(declaredConstituents = [], observedBehaviors = []) {
    const driftDetections = [];

    // Check each declared constituent
    for (const constituent of declaredConstituents) {
      const observed = observedBehaviors.filter(b => b.type === constituent.type);
      if (observed.length === 0) {
        driftDetections.push({
          constituent: constituent.type,
          drift: 'MISSING',
          expected: constituent.required === true ? 'REQUIRED' : 'OPTIONAL',
          severity: constituent.required === true ? 'CRITICAL' : 'WARNING'
        });
      }
    }

    // Check for undeclared behaviors (policy creep)
    const declaredTypes = new Set(declaredConstituents.map(c => c.type));
    for (const behavior of observedBehaviors) {
      if (!declaredTypes.has(behavior.type)) {
        driftDetections.push({
          constituent: behavior.type,
          drift: 'UNDECLARED',
          severity: 'WARNING'
        });
      }
    }

    const hasCritical = driftDetections.some(d => d.severity === 'CRITICAL');
    const drifting = driftDetections.length > 0;

    return {
      compliant: driftDetections.length === 0,
      drifting,
      driftDetections,
      severity: hasCritical ? 'CRITICAL' : driftDetections.length > 0 ? 'WARNING' : 'NONE',
      complianceRate: (declaredConstituents.length - driftDetections.filter(d => d.severity === 'CRITICAL').length) / Math.max(1, declaredConstituents.length)
    };
  }

  /**
   * Adaptively adjust thresholds based on system performance
   * Returns { newThresholds, adjustments, reason }
   */
  adaptThresholds(performanceMetrics = {}, assessmentResult = {}) {
    const newThresholds = { ...this.adaptiveThresholds };
    const adjustments = [];
    let reason = 'maintaining_baseline';

    // If governance too strict (blocking too much)
    if (assessmentResult.recommendation === 'relax_thresholds') {
      // Relax MTTR threshold by 10%
      newThresholds.mttrSeconds = this.adaptiveThresholds.mttrSeconds * 1.1;
      adjustments.push('mttr_relaxed_10pct');

      // Increase risk tolerance by 10%
      newThresholds.riskScoreMax = Math.min(0.9, this.adaptiveThresholds.riskScoreMax * 1.1);
      adjustments.push('risk_tolerance_increased_10pct');

      reason = 'adapting_to_overly_strict_policy';
    }

    // If governance too lenient (approving too much)
    if (assessmentResult.recommendation === 'tighten_thresholds') {
      // Tighten MTTR by 10%
      newThresholds.mttrSeconds = Math.max(10, this.adaptiveThresholds.mttrSeconds * 0.9);
      adjustments.push('mttr_tightened_10pct');

      // Reduce risk tolerance by 10%
      newThresholds.riskScoreMax = this.adaptiveThresholds.riskScoreMax * 0.9;
      adjustments.push('risk_tolerance_decreased_10pct');

      reason = 'adapting_to_overly_lenient_policy';
    }

    // Update state
    this.adaptiveThresholds = newThresholds;

    return {
      newThresholds: {
        mttrSeconds: Number(newThresholds.mttrSeconds.toFixed(1)),
        riskScoreMax: Number(newThresholds.riskScoreMax.toFixed(3)),
        improvementMinPct: Number(newThresholds.improvementMinPct.toFixed(2)),
        rollbackFrequencyMax: Number(newThresholds.rollbackFrequencyMax.toFixed(3))
      },
      adjustments,
      reason,
      previousThresholds: {
        mttrSeconds: Number(this.adaptiveThresholds.mttrSeconds.toFixed(1))  // Note: already updated
      }
    };
  }

  /**
   * CONSTITUTIONAL ENFORCEMENT: Check if behaviors violate core invariants
   * Returns { compliant, violations, invariantsEnforced }
   */
  enforceConstitution(behaviors = [], invariants = []) {
    const violations = [];
    const invariantsEnforced = [];

    // Example invariants:
    // - REVERSIBLE_CHANGES_ONLY
    // - AUDIT_TRAIL_REQUIRED
    // - NO_SILENT_FAILURES
    // - HUMAN_REVIEW_FOR_HIGH_RISK

    for (const invariant of invariants) {
      let violated = false;

      if (invariant === 'REVERSIBLE_CHANGES_ONLY') {
        const nonReversible = behaviors.filter(b => b.reversible === false);
        if (nonReversible.length > 0) {
          violations.push({
            invariant,
            description: 'Non-reversible change attempted',
            count: nonReversible.length
          });
          violated = true;
        }
      }

      if (invariant === 'AUDIT_TRAIL_REQUIRED') {
        const unaudited = behaviors.filter(b => !b.auditRef || b.auditRef.length === 0);
        if (unaudited.length > 0) {
          violations.push({
            invariant,
            description: 'Action without audit reference',
            count: unaudited.length
          });
          violated = true;
        }
      }

      if (invariant === 'NO_SILENT_FAILURES') {
        const silent = behaviors.filter(b => b.failed === true && !b.notified === true);
        if (silent.length > 0) {
          violations.push({
            invariant,
            description: 'Failure without notification',
            count: silent.length
          });
          violated = true;
        }
      }

      if (invariant === 'HUMAN_REVIEW_FOR_HIGH_RISK') {
        const highRiskUnapproved = behaviors.filter(b => (b.riskScore || 0) > 0.6 && !b.humanReviewDone);
        if (highRiskUnapproved.length > 0) {
          violations.push({
            invariant,
            description: 'High-risk change missing human review',
            count: highRiskUnapproved.length
          });
          violated = true;
        }
      }

      if (!violated) {
        invariantsEnforced.push(invariant);
      }
    }

    return {
      compliant: violations.length === 0,
      violations,
      invariantsEnforced,
      violationCount: violations.length,
      severity: violations.some(v => v.invariant === 'REVERSIBLE_CHANGES_ONLY') ? 'CRITICAL' : 'MODERATE'
    };
  }

  /**
   * Record policy decision for governance learning
   */
  recordPolicyDecision(action = 'APPROVE', reason = '', context = {}) {
    this.policyHistory.push({
      timestamp: Date.now(),
      action,  // APPROVE, BLOCK, REVIEW
      reason,
      context
    });
    if (this.policyHistory.length > this.maxHistorySize) {
      this.policyHistory.shift();
    }
  }

  /**
   * Get meta-governance status
   */
  getMetaGovernanceStatus() {
    const assessment = this.assessGovernance();
    return {
      policyHistorySize: this.policyHistory.length,
      currentAssessment: assessment,
      adaptiveThresholds: this.adaptiveThresholds,
      baselineThresholds: this.baselineThresholds,
      driftFromBaseline: {
        mttrDrift: Number(((this.adaptiveThresholds.mttrSeconds - this.baselineThresholds.mttrSeconds) / this.baselineThresholds.mttrSeconds * 100).toFixed(1)) + '%',
        riskDrift: Number(((this.adaptiveThresholds.riskScoreMax - this.baselineThresholds.riskScoreMax) / this.baselineThresholds.riskScoreMax * 100).toFixed(1)) + '%'
      }
    };
  }

  reset() {
    this.policyHistory = [];
    this.adaptiveThresholds = { ...this.baselineThresholds };
  }
}

export default {
  MetaGovernanceEngine
};
