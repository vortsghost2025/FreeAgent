/**
 * Phase 9 Precursor: Predictive Stability Modeling
 * MTTR forecasting, risk-weighted proposal scoring, complexity growth prediction
 */

export class PredictiveStabilityModeler {
  constructor(options = {}) {
    this.mttrHistory = [];
    this.riskHistory = [];
    this.complexityHistory = [];
    this.maxHistorySize = options.maxHistorySize || 100;
  }

  /**
   * Predict MTTR for a proposal based on historical patterns
   * Returns { predictedMTTR, confidence, reasoning }
   */
  predictMTTR(proposal = {}) {
    if (this.mttrHistory.length === 0) {
      return {
        predictedMTTR: 30,  // Conservative default
        confidence: 0,
        reasoning: 'insufficient_history'
      };
    }

    // Factors:
    // - Similar risk score proposals in history
    // - Complexity delta correlation
    // - Component count impact
    const riskScore = proposal.riskScore || 0.5;
    const complexityDelta = proposal.complexityDeltaPct || 0;
    const componentCount = proposal.affectedComponentCount || 1;

    // Find similar historical MTTRs
    const similarMTTRs = this.mttrHistory
      .filter(h => Math.abs(h.riskScore - riskScore) < 0.2)
      .map(h => h.mttrSeconds);

    let predictedMTTR = 30;  // Default
    let confidence = 0;

    if (similarMTTRs.length > 0) {
      const avgSimilar = similarMTTRs.reduce((a, b) => a + b, 0) / similarMTTRs.length;
      predictedMTTR = avgSimilar;
      confidence = Math.min(1, similarMTTRs.length / 10);  // Max 1.0 at 10+ samples
    }

    // Adjust for complexity impact
    const complexityAdjustment = (complexityDelta / 100) * 5;  // +5s per 100% complexity
    predictedMTTR += complexityAdjustment;

    // Adjust for component count (more components = longer rollback)
    predictedMTTR += (componentCount - 1) * 2;

    return {
      predictedMTTR: Number(Math.max(5, Math.min(300, predictedMTTR)).toFixed(1)),
      confidence: Number(confidence.toFixed(2)),
      factors: {
        baselineFromHistory: similarMTTRs.length > 0 ? Number((similarMTTRs.reduce((a, b) => a + b, 0) / similarMTTRs.length).toFixed(1)) : null,
        complexityAdjustment: Number(complexityAdjustment.toFixed(1)),
        componentAdjustment: (componentCount - 1) * 2,
        historicalSamples: similarMTTRs.length
      },
      reasoning: similarMTTRs.length === 0 ? 'using_default' : 'inferred_from_history'
    };
  }

  /**
   * Forecast risk for a proposal: will it cause failures?
   * Returns { riskScore, forecastedFailureRate, reasoning }
   */
  forecastRisk(proposal = {}) {
    if (this.riskHistory.length === 0) {
      return {
        riskScore: proposal.riskScore || 0.5,
        forecastedFailureRate: 0.1,
        reasoning: 'insufficient_history'
      };
    }

    const baseRisk = proposal.riskScore || 0.5;
    const recentFailures = this.riskHistory.filter(r => r.failed).length;
    const recentTotal = Math.min(10, this.riskHistory.length);
    const failureRate = recentFailures / recentTotal;

    // Weighted forecast: base risk * recent failure rate
    const forecastedFailureRate = baseRisk * failureRate;

    return {
      riskScore: Number(baseRisk.toFixed(3)),
      forecastedFailureRate: Number(Math.min(1, forecastedFailureRate).toFixed(3)),
      recentFailureRate: Number(failureRate.toFixed(3)),
      reasoning: forecastedFailureRate > 0.3 ? 'high_risk_forecast' : 'acceptable_risk'
    };
  }

  /**
   * Predict complexity growth: will system become too complex?
   * Returns { projectedComplexity, growthRate, trend }
   */
  predictComplexityGrowth(currentComplexity = 0, proposals = []) {
    if (this.complexityHistory.length < 2) {
      const projectedDelta = proposals.reduce((sum, p) => sum + (p.complexityDeltaPct || 0), 0);
      return {
        currentComplexity: Number(currentComplexity),
        projectedComplexity: Number((currentComplexity + (projectedDelta / 100) * currentComplexity).toFixed(1)),
        projectedDelta: Number(projectedDelta.toFixed(1)),
        growthRate: 0,
        trend: 'unknown',
        reasoning: 'insufficient_history'
      };
    }

    // Calculate historical growth rate
    const recent = this.complexityHistory.slice(-5);
    const complexity = recent.map(h => h.complexity);
    let growthRate = 0;
    for (let i = 1; i < complexity.length; i++) {
      growthRate += (complexity[i] - complexity[i - 1]) / complexity[i - 1];
    }
    growthRate = growthRate / (complexity.length - 1);

    // Project forward with new proposals
    let projectedComplexity = currentComplexity;
    const proposalDelta = proposals.reduce((sum, p) => sum + (p.complexityDeltaPct || 0), 0);
    projectedComplexity += (proposalDelta / 100) * currentComplexity;
    projectedComplexity *= (1 + growthRate);  // Apply historical growth trend

    const trend = growthRate > 0.1
      ? 'accelerating'
      : growthRate > 0
      ? 'growing'
      : 'stable';

    return {
      currentComplexity: Number(currentComplexity),
      projectedComplexity: Number(projectedComplexity.toFixed(1)),
      projectedDelta: Number((projectedComplexity - currentComplexity).toFixed(1)),
      growthRate: Number(growthRate.toFixed(4)),
      trend,
      reasoning: trend === 'accelerating' ? 'complexity_growth_warning' : `complexity_${trend}`
    };
  }

  /**
   * Pre-implementation rollback simulation: estimate success odds
   */
  simulateRollbackSuccess(proposal = {}) {
    const mttrPrediction = this.predictMTTR(proposal);
    const riskForecast = this.forecastRisk(proposal);

    // Success odds: higher MTTR = lower rollback success (takes longer to fix)
    // lower risk = higher success
    const mttrSuccess = Math.max(0, 1 - (mttrPrediction.predictedMTTR / 300));  // 0-1
    const riskSuccess = 1 - riskForecast.forecastedFailureRate;  // 0-1
    const overallSuccess = (mttrSuccess * 0.5) + (riskSuccess * 0.5);

    return {
      estimatedRollbackSuccessRate: Number(overallSuccess.toFixed(3)),
      mttrImpact: Number(mttrSuccess.toFixed(3)),
      riskImpact: Number(riskSuccess.toFixed(3)),
      recommendation: overallSuccess > 0.7 ? 'proceed' : overallSuccess > 0.5 ? 'caution' : 'block'
    };
  }

  /**
   * Record actual outcomes for model training
   */
  recordMTTROutcome(riskScore = 0, mttrSeconds = 30) {
    this.mttrHistory.push({
      timestamp: Date.now(),
      riskScore: Number(riskScore),
      mttrSeconds: Number(mttrSeconds)
    });
    if (this.mttrHistory.length > this.maxHistorySize) {
      this.mttrHistory.shift();
    }
  }

  recordRiskOutcome(riskScore = 0, failed = false) {
    this.riskHistory.push({
      timestamp: Date.now(),
      riskScore: Number(riskScore),
      failed: Boolean(failed)
    });
    if (this.riskHistory.length > this.maxHistorySize) {
      this.riskHistory.shift();
    }
  }

  recordComplexityOutcome(complexity = 0) {
    this.complexityHistory.push({
      timestamp: Date.now(),
      complexity: Number(complexity)
    });
    if (this.complexityHistory.length > this.maxHistorySize) {
      this.complexityHistory.shift();
    }
  }

  /**
   * Get prediction accuracy metrics
   */
  getModelAccuracy() {
    return {
      mttrSamples: this.mttrHistory.length,
      riskSamples: this.riskHistory.length,
      complexitySamples: this.complexityHistory.length,
      ready: this.mttrHistory.length >= 5
    };
  }

  reset() {
    this.mttrHistory = [];
    this.riskHistory = [];
    this.complexityHistory = [];
  }
}

export default {
  PredictiveStabilityModeler
};
