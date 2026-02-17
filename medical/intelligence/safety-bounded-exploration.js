/**
 * Phase 7.4: Safety-Bounded Exploration
 * Controlled strategy exploration inside constraints with guaranteed rollback.
 */

export class SafetyConstraintEngine {
  constructor(options = {}) {
    this.allowedStrategies = new Set(options.allowedStrategies || [
      'ALT_AGGREGATION',
      'STRICT_CONVERGENCE',
      'RESILIENCE_HEURISTIC',
      'VERSION_MERGE_LOGIC'
    ]);
    this.forbiddenOperations = new Set(options.forbiddenOperations || []);
    this.maxRiskScore = this._boundedNumber(options.maxRiskScore, 0.6, 0, 1);
    this.maxLatencyRegressionPct = this._boundedNumber(options.maxLatencyRegressionPct, 15, 0, 100);
    this.maxFailureRateIncreasePct = this._boundedNumber(options.maxFailureRateIncreasePct, 10, 0, 100);
  }

  updateConstraints(partial = {}) {
    if (Array.isArray(partial.allowedStrategies)) {
      this.allowedStrategies = new Set(partial.allowedStrategies);
    }
    if (Array.isArray(partial.forbiddenOperations)) {
      this.forbiddenOperations = new Set(partial.forbiddenOperations);
    }
    this.maxRiskScore = this._boundedNumber(partial.maxRiskScore, this.maxRiskScore, 0, 1);
    this.maxLatencyRegressionPct = this._boundedNumber(
      partial.maxLatencyRegressionPct,
      this.maxLatencyRegressionPct,
      0,
      100
    );
    this.maxFailureRateIncreasePct = this._boundedNumber(
      partial.maxFailureRateIncreasePct,
      this.maxFailureRateIncreasePct,
      0,
      100
    );
    return { success: true, constraints: this.getConstraints() };
  }

  evaluateExperiment(strategy = {}) {
    const reasons = [];
    if (!this.allowedStrategies.has(strategy.type)) {
      reasons.push('STRATEGY_NOT_ALLOWED');
    }

    for (const operation of strategy.operations || []) {
      if (this.forbiddenOperations.has(operation)) {
        reasons.push(`FORBIDDEN_OPERATION:${operation}`);
      }
    }

    if ((strategy.riskScore || 0) > this.maxRiskScore) {
      reasons.push('RISK_ABOVE_LIMIT');
    }

    return {
      allowed: reasons.length === 0,
      reasons
    };
  }

  getConstraints() {
    return {
      allowedStrategies: Array.from(this.allowedStrategies),
      forbiddenOperations: Array.from(this.forbiddenOperations),
      maxRiskScore: this.maxRiskScore,
      maxLatencyRegressionPct: this.maxLatencyRegressionPct,
      maxFailureRateIncreasePct: this.maxFailureRateIncreasePct
    };
  }

  _boundedNumber(value, fallback, min, max) {
    if (value == null) return fallback;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(min, Math.min(max, numeric));
  }
}

export class RollbackManager {
  constructor() {
    this.checkpoints = new Map();
    this.rollbackLog = [];
  }

  createCheckpoint(experimentId, state = {}) {
    const snapshot = JSON.parse(JSON.stringify(state));
    this.checkpoints.set(experimentId, {
      experimentId,
      snapshot,
      createdAt: Date.now()
    });
    return { success: true, experimentId };
  }

  rollback(experimentId, reason = 'SAFETY_VIOLATION') {
    const checkpoint = this.checkpoints.get(experimentId);
    if (!checkpoint) return { success: false, error: 'CHECKPOINT_NOT_FOUND' };

    this.rollbackLog.push({
      experimentId,
      reason,
      timestamp: Date.now()
    });

    return {
      success: true,
      experimentId,
      restoredState: checkpoint.snapshot,
      reason
    };
  }

  getStats() {
    return {
      checkpoints: this.checkpoints.size,
      rollbacks: this.rollbackLog.length
    };
  }
}

export class ExplorationSandbox {
  simulate(strategy = {}, baselineMetrics = {}) {
    const baseline = {
      convergenceScore: baselineMetrics.convergenceScore == null ? 0.8 : baselineMetrics.convergenceScore,
      orchestrationLatencyP95: baselineMetrics.orchestrationLatencyP95 == null ? 200 : baselineMetrics.orchestrationLatencyP95,
      failureRate: baselineMetrics.failureRate == null ? 0.02 : baselineMetrics.failureRate,
      mergeConflictRate: baselineMetrics.mergeConflictRate == null ? 0.05 : baselineMetrics.mergeConflictRate
    };

    const simulated = { ...baseline };

    switch (strategy.type) {
      case 'ALT_AGGREGATION':
        simulated.convergenceScore += 0.03;
        simulated.orchestrationLatencyP95 *= 0.95;
        simulated.failureRate *= 0.98;
        break;
      case 'STRICT_CONVERGENCE':
        simulated.convergenceScore += 0.05;
        simulated.orchestrationLatencyP95 *= 1.06;
        break;
      case 'RESILIENCE_HEURISTIC':
        simulated.failureRate *= 0.8;
        simulated.orchestrationLatencyP95 *= 1.02;
        break;
      case 'VERSION_MERGE_LOGIC':
        simulated.mergeConflictRate *= 0.6;
        simulated.convergenceScore += 0.02;
        break;
      default:
        break;
    }

    const deltas = {
      convergenceScore: this._delta(baseline.convergenceScore, simulated.convergenceScore),
      orchestrationLatencyP95: this._delta(baseline.orchestrationLatencyP95, simulated.orchestrationLatencyP95),
      failureRate: this._delta(baseline.failureRate, simulated.failureRate),
      mergeConflictRate: this._delta(baseline.mergeConflictRate, simulated.mergeConflictRate)
    };

    return {
      baselineMetrics: baseline,
      simulatedMetrics: simulated,
      deltas
    };
  }

  _delta(before, after) {
    const absoluteDelta = after - before;
    const relativePct = before === 0 ? (after === 0 ? 0 : 100) : (absoluteDelta / before) * 100;
    return {
      before: Number(before.toFixed(6)),
      after: Number(after.toFixed(6)),
      absoluteDelta: Number(absoluteDelta.toFixed(6)),
      relativePct: Number(relativePct.toFixed(3))
    };
  }
}

export class SafetyBoundedExplorationEngine {
  constructor(options = {}) {
    this.constraints = new SafetyConstraintEngine(options);
    this.rollbackMgr = new RollbackManager(options);
    this.sandbox = new ExplorationSandbox(options);
    this.explorationLog = [];
    this.maxLogSize = options.maxLogSize || 5000;
  }

  configureConstraints(partial = {}) {
    return this.constraints.updateConstraints(partial);
  }

  explore(experimentId, strategy = {}, baselineState = {}) {
    this.rollbackMgr.createCheckpoint(experimentId, baselineState);
    const gate = this.constraints.evaluateExperiment(strategy);

    if (!gate.allowed) {
      const blocked = {
        success: false,
        experimentId,
        status: 'BLOCKED',
        reasons: gate.reasons,
        timestamp: Date.now()
      };
      this._log(blocked);
      return blocked;
    }

    const simulation = this.sandbox.simulate(strategy, baselineState);
    const violations = this._evaluateViolations(simulation.deltas);

    if (violations.length > 0) {
      const rollback = this.rollbackMgr.rollback(experimentId, violations.join(','));
      const result = {
        success: true,
        experimentId,
        status: 'ROLLED_BACK',
        violations,
        rollback,
        simulation,
        timestamp: Date.now()
      };
      this._log(result);
      return result;
    }

    const accepted = {
      success: true,
      experimentId,
      status: 'ACCEPTED_IN_SANDBOX',
      simulation,
      timestamp: Date.now()
    };
    this._log(accepted);
    return accepted;
  }

  _evaluateViolations(deltas = {}) {
    const violations = [];
    const latencyRegression = deltas.orchestrationLatencyP95 ? deltas.orchestrationLatencyP95.relativePct : 0;
    const failureIncrease = deltas.failureRate ? deltas.failureRate.relativePct : 0;

    if (latencyRegression > this.constraints.maxLatencyRegressionPct) {
      violations.push('LATENCY_REGRESSION_LIMIT_EXCEEDED');
    }

    if (failureIncrease > this.constraints.maxFailureRateIncreasePct) {
      violations.push('FAILURE_RATE_INCREASE_LIMIT_EXCEEDED');
    }

    return violations;
  }

  _log(entry) {
    this.explorationLog.push(entry);
    if (this.explorationLog.length > this.maxLogSize) {
      this.explorationLog.shift();
    }
  }

  getExplorationStatus() {
    const accepted = this.explorationLog.filter((e) => e.status === 'ACCEPTED_IN_SANDBOX').length;
    const rolledBack = this.explorationLog.filter((e) => e.status === 'ROLLED_BACK').length;
    const blocked = this.explorationLog.filter((e) => e.status === 'BLOCKED').length;

    return {
      totalExperiments: this.explorationLog.length,
      accepted,
      rolledBack,
      blocked,
      rollbackStats: this.rollbackMgr.getStats(),
      recentExperiments: this.explorationLog.slice(-10)
    };
  }
}

export default {
  SafetyConstraintEngine,
  RollbackManager,
  ExplorationSandbox,
  SafetyBoundedExplorationEngine
};
