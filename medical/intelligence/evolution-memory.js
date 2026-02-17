/**
 * Phase 7.6: Long-Horizon Learning Memory (Evolution Memory)
 * Tracks what worked, failed, destabilized the system, and improved determinism/convergence.
 */

export class OutcomeMemoryStore {
  constructor(options = {}) {
    this.maxEntries = options.maxEntries || 10000;
    this.outcomes = [];
    this.failures = [];
    this.instabilities = [];
    this.convergenceImprovements = [];
    this.nondeterminismCorrections = [];
  }

  recordOutcome(entry) {
    this.outcomes.push(entry);
    this._trim(this.outcomes);
    return { success: true };
  }

  recordFailure(entry) {
    this.failures.push(entry);
    this._trim(this.failures);
    return { success: true };
  }

  recordInstability(entry) {
    this.instabilities.push(entry);
    this._trim(this.instabilities);
    return { success: true };
  }

  recordConvergenceImprovement(entry) {
    this.convergenceImprovements.push(entry);
    this._trim(this.convergenceImprovements);
    return { success: true };
  }

  recordNondeterminismCorrection(entry) {
    this.nondeterminismCorrections.push(entry);
    this._trim(this.nondeterminismCorrections);
    return { success: true };
  }

  _trim(collection) {
    while (collection.length > this.maxEntries) {
      collection.shift();
    }
  }
}

export class FailurePatternAnalyzer {
  analyzeFailures(failures = []) {
    const byReason = {};
    const bySubsystem = {};

    for (const failure of failures) {
      const reason = failure.reason || 'UNKNOWN';
      const subsystem = failure.subsystem || 'UNKNOWN';
      byReason[reason] = (byReason[reason] || 0) + 1;
      bySubsystem[subsystem] = (bySubsystem[subsystem] || 0) + 1;
    }

    return {
      totalFailures: failures.length,
      byReason,
      bySubsystem
    };
  }

  analyzeInstability(instabilities = []) {
    const byCause = {};
    let totalImpact = 0;

    for (const instability of instabilities) {
      const cause = instability.cause || 'UNKNOWN';
      byCause[cause] = (byCause[cause] || 0) + 1;
      totalImpact += instability.impactScore || 0;
    }

    return {
      totalInstabilities: instabilities.length,
      byCause,
      averageImpact: Number((instabilities.length > 0 ? totalImpact / instabilities.length : 0).toFixed(3))
    };
  }
}

export class LongHorizonEvolutionMemoryEngine {
  constructor(options = {}) {
    this.store = new OutcomeMemoryStore(options);
    this.analyzer = new FailurePatternAnalyzer(options);
  }

  recordOutcome(cycleId, proposalId, outcome = 'SUCCESS', metricsDelta = {}, metadata = {}) {
    return this.store.recordOutcome({
      cycleId,
      proposalId,
      outcome,
      metricsDelta,
      improvementScore: metadata.improvementScore == null
        ? this._estimateImprovement(metricsDelta)
        : metadata.improvementScore,
      timestamp: Date.now(),
      metadata
    });
  }

  recordFailure(cycleId, proposalId, reason, subsystem = 'general', metadata = {}) {
    return this.store.recordFailure({
      cycleId,
      proposalId,
      reason,
      subsystem,
      timestamp: Date.now(),
      metadata
    });
  }

  recordInstability(cycleId, cause, impactScore = 0.5, metadata = {}) {
    return this.store.recordInstability({
      cycleId,
      cause,
      impactScore,
      timestamp: Date.now(),
      metadata
    });
  }

  recordConvergenceImprovement(cycleId, before, after, metadata = {}) {
    return this.store.recordConvergenceImprovement({
      cycleId,
      before,
      after,
      delta: Number((after - before).toFixed(6)),
      timestamp: Date.now(),
      metadata
    });
  }

  recordNondeterminismCorrection(cycleId, suite, fixType, metadata = {}) {
    return this.store.recordNondeterminismCorrection({
      cycleId,
      suite,
      fixType,
      timestamp: Date.now(),
      metadata
    });
  }

  getWhatWorked(limit = 10) {
    return this.store.outcomes
      .filter((entry) => entry.outcome === 'SUCCESS')
      .slice()
      .sort((a, b) => b.improvementScore - a.improvementScore)
      .slice(0, limit);
  }

  getWhatFailed(limit = 10) {
    return this.store.failures.slice(-limit);
  }

  getInstabilityDrivers() {
    return this.analyzer.analyzeInstability(this.store.instabilities);
  }

  getFailurePatterns() {
    return this.analyzer.analyzeFailures(this.store.failures);
  }

  generateRecommendations() {
    const failurePatterns = this.getFailurePatterns();
    const instability = this.getInstabilityDrivers();
    const recommendations = [];

    if ((failurePatterns.byReason.REGRESSION_RISK_HIGH || 0) > 1) {
      recommendations.push('Tighten regression guardrails before auto-apply.');
    }

    if ((failurePatterns.byReason.TEST_PASS_RATE_LOW || 0) > 1) {
      recommendations.push('Require stronger pre-merge test pass thresholds.');
    }

    if ((instability.byCause.LATENCY_REGRESSION_LIMIT_EXCEEDED || 0) > 0) {
      recommendations.push('Keep exploration latency regression caps strict.');
    }

    if (this.store.nondeterminismCorrections.length > 0) {
      recommendations.push('Preserve deterministic hooks in all test-only paths.');
    }

    if (recommendations.length === 0) {
      recommendations.push('No recurring risk pattern detected; continue current governance.');
    }

    return recommendations;
  }

  getInstitutionalMemoryReport() {
    const worked = this.getWhatWorked(5);
    const failed = this.getWhatFailed(5);
    const failurePatterns = this.getFailurePatterns();
    const instability = this.getInstabilityDrivers();

    return {
      timestamp: Date.now(),
      totals: {
        outcomes: this.store.outcomes.length,
        failures: this.store.failures.length,
        instabilities: this.store.instabilities.length,
        convergenceImprovements: this.store.convergenceImprovements.length,
        nondeterminismCorrections: this.store.nondeterminismCorrections.length
      },
      worked,
      failed,
      failurePatterns,
      instability,
      recommendations: this.generateRecommendations()
    };
  }

  _estimateImprovement(metricsDelta = {}) {
    const values = [];
    for (const [key, value] of Object.entries(metricsDelta)) {
      if (value && typeof value === 'object' && typeof value.relativeDelta === 'number') {
        let contribution = value.relativeDelta;
        if (key.toLowerCase().includes('latency') || key.toLowerCase().includes('failure')) {
          contribution = -contribution;
        }
        values.push(contribution);
      }
    }

    if (values.length === 0) return 0;
    const avg = values.reduce((sum, n) => sum + n, 0) / values.length;
    return Number(avg.toFixed(4));
  }
}

export default {
  OutcomeMemoryStore,
  FailurePatternAnalyzer,
  LongHorizonEvolutionMemoryEngine
};

