/**
 * Human-in-the-Loop Review System
 *
 * Provides a mechanism for flagging cases that require human review
 * and managing the review workflow. Critical for high-stakes medical
 * decisions where human oversight is essential.
 *
 * Features:
 * - Automatic flagging based on confidence, risk, and complexity
 * - Review queue management
 * - Review status tracking
 * - Integration hooks for external review systems
 * - Escalation paths for urgent cases
 */

export class HumanReviewQueue {
  constructor(options = {}) {
    this.queue = [];
    this.reviewHistory = [];
    this.criteria = {
      lowConfidenceThreshold: options.lowConfidenceThreshold || 0.7,
      highRiskThreshold: options.highRiskThreshold || 0.5,
      lowCompletenessThreshold: options.lowCompletenessThreshold || 0.6,
      requireReviewForTypes: options.requireReviewForTypes || [],
      alwaysReviewHighRisk: options.alwaysReviewHighRisk !== false
    };

    this.onReviewRequired = options.onReviewRequired || null; // Callback hook
    this.verbose = options.verbose || false;
  }

  /**
   * Evaluate if result requires human review
   * Returns review recommendation with reasoning
   */
  evaluateForReview(result) {
    const { classification, riskScore, summary } = result.output;
    const reasons = [];
    let severity = 'low';

    // Check confidence level
    if (classification.confidence < this.criteria.lowConfidenceThreshold) {
      reasons.push({
        type: 'low-confidence',
        severity: 'medium',
        message: `Classification confidence below threshold (${(classification.confidence * 100).toFixed(0)}% < ${(this.criteria.lowConfidenceThreshold * 100).toFixed(0)}%)`,
        value: classification.confidence
      });
      severity = 'medium';
    }

    // Check risk score
    if (riskScore.severity === 'high') {
      reasons.push({
        type: 'high-risk',
        severity: 'high',
        message: `High risk severity detected (score: ${(riskScore.score * 100).toFixed(0)}%)`,
        value: riskScore.score,
        factors: riskScore.factors
      });
      severity = 'high';
    } else if (riskScore.score >= this.criteria.highRiskThreshold) {
      reasons.push({
        type: 'elevated-risk',
        severity: 'medium',
        message: `Risk score above threshold (${(riskScore.score * 100).toFixed(0)}% >= ${(this.criteria.highRiskThreshold * 100).toFixed(0)}%)`,
        value: riskScore.score
      });
      if (severity === 'low') severity = 'medium';
    }

    // Check completeness
    if (summary.completeness < this.criteria.lowCompletenessThreshold) {
      reasons.push({
        type: 'incomplete-data',
        severity: 'low',
        message: `Data completeness below threshold (${(summary.completeness * 100).toFixed(0)}% < ${(this.criteria.lowCompletenessThreshold * 100).toFixed(0)}%)`,
        value: summary.completeness
      });
    }

    // Check classification flags
    if (classification.flags && classification.flags.length > 0) {
      const criticalFlags = classification.flags.filter(f =>
        f.includes('fallback') || f.includes('unknown') || f.includes('error')
      );

      if (criticalFlags.length > 0) {
        reasons.push({
          type: 'classification-flags',
          severity: 'medium',
          message: `Classification has ${criticalFlags.length} warning flag(s)`,
          flags: criticalFlags
        });
        if (severity === 'low') severity = 'medium';
      }
    }

    // Check type-specific requirements
    if (this.criteria.requireReviewForTypes.includes(classification.type)) {
      reasons.push({
        type: 'required-for-type',
        severity: 'medium',
        message: `Classification type "${classification.type}" requires review`,
        value: classification.type
      });
      if (severity === 'low') severity = 'medium';
    }

    const requiresReview = reasons.length > 0;

    return {
      requiresReview,
      severity,
      reasons,
      recommendedAction: this._getRecommendedAction(severity, reasons)
    };
  }

  /**
   * Add case to review queue
   */
  async addToQueue(result, evaluation) {
    const reviewCase = {
      id: `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      addedAt: new Date().toISOString(),
      status: 'pending',
      priority: evaluation.severity,
      result,
      evaluation,
      reviewedAt: null,
      reviewedBy: null,
      reviewDecision: null,
      reviewNotes: null
    };

    this.queue.push(reviewCase);

    if (this.verbose) {
      console.log(`[Human Review] Case added to queue: ${reviewCase.id}`);
      console.log(`  Priority: ${evaluation.severity}`);
      console.log(`  Reasons: ${evaluation.reasons.length}`);
    }

    // Trigger callback if configured
    if (typeof this.onReviewRequired === 'function') {
      try {
        await this.onReviewRequired(reviewCase);
      } catch (error) {
        console.error('[Human Review] Callback error:', error.message);
      }
    }

    return reviewCase;
  }

  /**
   * Process result and add to queue if review required
   */
  async processResult(result) {
    const evaluation = this.evaluateForReview(result);

    if (evaluation.requiresReview) {
      const reviewCase = await this.addToQueue(result, evaluation);

      // Add review metadata to result
      result.output.humanReview = {
        required: true,
        reviewId: reviewCase.id,
        priority: evaluation.severity,
        reasons: evaluation.reasons.map(r => r.message),
        recommendedAction: evaluation.recommendedAction
      };

      return { ...result, reviewCase };
    }

    // No review required
    result.output.humanReview = {
      required: false,
      evaluation: 'passed-automated-review'
    };

    return result;
  }

  /**
   * Get pending review cases
   */
  getPendingReviews(options = {}) {
    let pending = this.queue.filter(c => c.status === 'pending');

    // Filter by priority if specified
    if (options.priority) {
      pending = pending.filter(c => c.priority === options.priority);
    }

    // Sort by priority and date
    pending.sort((a, b) => {
      const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];

      if (priorityDiff !== 0) return priorityDiff;

      return new Date(a.addedAt) - new Date(b.addedAt);
    });

    return pending;
  }

  /**
   * Submit review decision
   */
  async submitReview(reviewId, decision, reviewer, notes = '') {
    const reviewCase = this.queue.find(c => c.id === reviewId);

    if (!reviewCase) {
      throw new Error(`Review case not found: ${reviewId}`);
    }

    if (reviewCase.status !== 'pending') {
      throw new Error(`Review case ${reviewId} already ${reviewCase.status}`);
    }

    // Valid decisions: approved, rejected, escalated, uncertain
    const validDecisions = ['approved', 'rejected', 'escalated', 'uncertain'];
    if (!validDecisions.includes(decision)) {
      throw new Error(`Invalid decision: ${decision}. Must be one of: ${validDecisions.join(', ')}`);
    }

    reviewCase.status = decision;
    reviewCase.reviewedAt = new Date().toISOString();
    reviewCase.reviewedBy = reviewer;
    reviewCase.reviewDecision = decision;
    reviewCase.reviewNotes = notes;

    // Add to history
    this.reviewHistory.push({
      ...reviewCase,
      historicalRecord: true
    });

    if (this.verbose) {
      console.log(`[Human Review] Case reviewed: ${reviewId}`);
      console.log(`  Decision: ${decision}`);
      console.log(`  Reviewer: ${reviewer}`);
    }

    return reviewCase;
  }

  /**
   * Get review statistics
   */
  getStatistics() {
    const total = this.queue.length;
    const pending = this.queue.filter(c => c.status === 'pending').length;
    const reviewed = this.queue.filter(c => c.status !== 'pending').length;

    const byPriority = {
      high: this.queue.filter(c => c.priority === 'high').length,
      medium: this.queue.filter(c => c.priority === 'medium').length,
      low: this.queue.filter(c => c.priority === 'low').length
    };

    const byDecision = {
      approved: this.queue.filter(c => c.reviewDecision === 'approved').length,
      rejected: this.queue.filter(c => c.reviewDecision === 'rejected').length,
      escalated: this.queue.filter(c => c.reviewDecision === 'escalated').length,
      uncertain: this.queue.filter(c => c.reviewDecision === 'uncertain').length
    };

    // Calculate average review time
    const reviewedCases = this.queue.filter(c => c.reviewedAt);
    let avgReviewTime = 0;
    if (reviewedCases.length > 0) {
      const totalTime = reviewedCases.reduce((sum, c) => {
        return sum + (new Date(c.reviewedAt) - new Date(c.addedAt));
      }, 0);
      avgReviewTime = totalTime / reviewedCases.length;
    }

    return {
      total,
      pending,
      reviewed,
      byPriority,
      byDecision,
      avgReviewTimeMs: Math.round(avgReviewTime),
      historyLength: this.reviewHistory.length
    };
  }

  /**
   * Get recommended action based on evaluation
   */
  _getRecommendedAction(severity, reasons) {
    if (severity === 'high') {
      return 'URGENT REVIEW REQUIRED - Escalate to senior reviewer';
    }

    const lowConfidence = reasons.some(r => r.type === 'low-confidence');
    const highRisk = reasons.some(r => r.type === 'high-risk' || r.type === 'elevated-risk');

    if (lowConfidence && highRisk) {
      return 'Review required - Low confidence AND elevated risk';
    }

    if (lowConfidence) {
      return 'Review required - Verify classification accuracy';
    }

    if (highRisk) {
      return 'Review required - Confirm risk assessment';
    }

    return 'Review recommended - Check for data quality issues';
  }

  /**
   * Clear completed reviews (older than specified days)
   */
  clearOldReviews(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const before = this.queue.length;

    this.queue = this.queue.filter(c => {
      if (c.status === 'pending') return true; // Keep pending
      return new Date(c.reviewedAt) > cutoffDate; // Keep recent
    });

    const removed = before - this.queue.length;

    if (this.verbose && removed > 0) {
      console.log(`[Human Review] Cleared ${removed} old review(s)`);
    }

    return removed;
  }
}

/**
 * Factory function
 */
export function createHumanReviewQueue(options) {
  return new HumanReviewQueue(options);
}

/**
 * Integration hook example:
 *
 * const reviewQueue = createHumanReviewQueue({
 *   onReviewRequired: async (reviewCase) => {
 *     // Send to external review system
 *     await sendToReviewSystem(reviewCase);
 *
 *     // Send alert
 *     if (reviewCase.priority === 'high') {
 *       await sendUrgentAlert(reviewCase);
 *     }
 *   }
 * });
 */
