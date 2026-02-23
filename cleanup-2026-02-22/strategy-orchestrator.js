/**
 * Phase 5.3: Strategy Orchestrator
 * Executive function for the intelligence layer
 * Decides what to apply, when, how aggressively, how safely, how reversibly
 * Prevents oscillation, thrashing, runaway rebalancing, and contradictory decisions
 */

/**
 * Strategy Evaluator - evaluates proposed strategies for safety and effectiveness
 */
export class StrategyEvaluator {
  constructor(options = {}) {
    this.strategies = [];
    this.executionHistory = [];
    this.oscillationThreshold = options.oscillationThreshold || 3;
    this.reverseWindow = options.reverseWindow || 5 * 60 * 1000; // 5 min
    this.debug = options.debug || false;
  }

  evaluateStrategy(strategy) {
    const evaluation = {
      id: `strategy-${Date.now()}`,
      strategy,
      safetyScore: this._calculateSafety(strategy),
      effectivenessScore: this._calculateEffectiveness(strategy),
      reversibility: this._calculateReversibility(strategy),
      riskLevel: 'UNKNOWN',
      recommendation: 'UNKNOWN',
      timestamp: Date.now()
    };

    // Determine risk level
    if (evaluation.safetyScore < 30) {
      evaluation.riskLevel = 'CRITICAL';
      evaluation.recommendation = 'REJECT';
    } else if (evaluation.safetyScore < 60) {
      evaluation.riskLevel = 'HIGH';
      evaluation.recommendation = 'CAUTION';
    } else if (evaluation.safetyScore < 80) {
      evaluation.riskLevel = 'MEDIUM';
      evaluation.recommendation = 'PROCEED_MONITORED';
    } else {
      evaluation.riskLevel = 'LOW';
      evaluation.recommendation = 'EXECUTE';
    }

    return evaluation;
  }

  _calculateSafety(strategy) {
    let score = 100;

    // Check for contradictions with recent strategies
    const recent = this.executionHistory.slice(-5);
    const contradictions = recent.filter(ex => this._isContradictory(ex.strategy, strategy)).length;
    score -= contradictions * 20;

    // Check for oscillation
    if (this._detectOscillation(strategy)) {
      score -= 30;
    }

    // Check implementation maturity
    if (strategy.confidence) {
      score *= strategy.confidence;
    }

    return Math.max(0, Math.min(100, score));
  }

  _calculateEffectiveness(strategy) {
    let score = 0;

    if (strategy.expectedImprovement) {
      score += strategy.expectedImprovement * 100;
    }

    if (strategy.scope === 'GLOBAL') {
      score += 20;
    } else if (strategy.scope === 'REGIONAL') {
      score += 15;
    }

    if (strategy.urgency === 'CRITICAL') {
      score += 10;
    }

    return Math.min(100, score);
  }

  _calculateReversibility(strategy) {
    if (strategy.isReversible) return 100;
    if (strategy.canRollback) return 80;
    if (strategy.hasSnapshot) return 60;
    return 20;
  }

  _isContradictory(strategy1, strategy2) {
    if (strategy1.type === strategy2.type && strategy1.direction && strategy2.direction) {
      if (strategy1.direction !== strategy2.direction) {
        return true;
      }
    }
    return false;
  }

  _detectOscillation(strategy) {
    const similar = this.executionHistory
      .filter(ex => ex.strategy.type === strategy.type)
      .slice(-this.oscillationThreshold);

    if (similar.length >= this.oscillationThreshold) {
      // Check if alternating direction
      let oscillating = true;
      for (let i = 1; i < similar.length; i++) {
        if (similar[i].strategy.direction === similar[i - 1].strategy.direction) {
          oscillating = false;
          break;
        }
      }
      return oscillating;
    }

    return false;
  }

  recordExecution(strategy) {
    this.executionHistory.push({
      strategy,
      timestamp: Date.now()
    });

    if (this.executionHistory.length > 100) {
      this.executionHistory.shift();
    }
  }
}

/**
 * Execution Controller - manages safe execution with monitoring
 */
export class ExecutionController {
  constructor(options = {}) {
    this.activeStrategies = [];
    this.executionLog = [];
    this.monitoringInterval = options.monitoringInterval || 1000;
    this.debug = options.debug || false;
  }

  executeStrategy(strategy, evaluator) {
    const evaluation = evaluator.evaluateStrategy(strategy);

    if (evaluation.recommendation === 'REJECT') {
      return {
        success: false,
        reason: 'SAFETY_CONCERNS',
        evaluation
      };
    }

    const execution = {
      id: `exec-${Date.now()}`,
      strategy,
      evaluation,
      status: 'RUNNING',
      startTime: Date.now(),
      checkpoints: [],
      shouldMonitor: evaluation.riskLevel !== 'LOW'
    };

    this.activeStrategies.push(execution);
    this.executionLog.push(execution);

    evaluator.recordExecution(strategy);

    if (this.debug) {
      console.log(`[ExecutionController] Started: ${strategy.type} (${evaluation.riskLevel})`);
    }

    return { success: true, executionId: execution.id, evaluation };
  }

  checkpointStrategy(executionId, metrics) {
    const execution = this.activeStrategies.find(e => e.id === executionId);
    if (!execution) return { success: false };

    const checkpoint = {
      timestamp: Date.now(),
      metrics,
      status: this._evaluateProgress(metrics)
    };

    execution.checkpoints.push(checkpoint);

    // Early termination if things go bad
    if (checkpoint.status === 'DEGRADING') {
      return { success: true, warning: 'DEGRADATION_DETECTED', shouldRollback: true };
    }

    return { success: true, checkpoint };
  }

  completeStrategy(executionId) {
    const execution = this.activeStrategies.find(e => e.id === executionId);
    if (!execution) return { success: false };

    execution.status = 'COMPLETED';
    execution.endTime = Date.now();
    execution.duration = execution.endTime - execution.startTime;

    this.activeStrategies = this.activeStrategies.filter(e => e.id !== executionId);

    return { success: true, duration: execution.duration };
  }

  rollbackStrategy(executionId, reason) {
    const execution = this.activeStrategies.find(e => e.id === executionId);
    if (!execution) return { success: false };

    execution.status = 'ROLLED_BACK';
    execution.rollbackReason = reason;
    execution.endTime = Date.now();

    this.activeStrategies = this.activeStrategies.filter(e => e.id !== executionId);

    if (this.debug) {
      console.log(`[ExecutionController] Rolled back: ${reason}`);
    }

    return { success: true, executionId };
  }

  _evaluateProgress(metrics) {
    if (metrics.improvement > 0) return 'IMPROVING';
    if (metrics.improvement < -0.1) return 'DEGRADING';
    return 'STABLE';
  }

  getActiveStrategies() {
    return this.activeStrategies.map(e => ({
      executionId: e.id,
      strategyType: e.strategy.type,
      status: e.status,
      duration: Date.now() - e.startTime,
      riskLevel: e.evaluation.riskLevel
    }));
  }
}

/**
 * Strategy Orchestrator - main decision-making engine
 */
export class StrategyOrchestrator {
  constructor(options = {}) {
    this.evaluator = new StrategyEvaluator(options);
    this.controller = new ExecutionController(options);
    this.orchestrationLog = [];
    this.maxLogSize = options.maxLogSize || 5000;
    this.debug = options.debug || false;
  }

  orchestrateResponse(systemState, recommendations) {
    const recs = Array.isArray(recommendations) ? recommendations : [recommendations].filter(r => r && r.type);
    const responses = [];

    for (const rec of recs) {
      const strategy = this._buildStrategy(rec, systemState);

      // Evaluate safety and effectiveness
      const evaluation = this.evaluator.evaluateStrategy(strategy);

      if (evaluation.recommendation !== 'REJECT') {
        // Execute with monitoring
        const execution = this.controller.executeStrategy(strategy, this.evaluator);

        responses.push({
          recommendation: rec,
          strategy,
          execution,
          evaluation
        });

        this._logOrchestration({
          type: 'STRATEGY_EXECUTED',
          recommendation: rec.type,
          strategy: strategy.type,
          riskLevel: evaluation.riskLevel
        });
      } else {
        this._logOrchestration({
          type: 'STRATEGY_REJECTED',
          recommendation: rec.type,
          reason: evaluation.riskLevel
        });
      }
    }

    return {
      strategiesExecuted: responses.length,
      responses,
      activeStrategies: this.controller.getActiveStrategies()
    };
  }

  _buildStrategy(recommendation, systemState) {
    return {
      type: recommendation.type,
      direction: recommendation.direction || 'UP',
      scope: this._determinScope(systemState),
      urgency: this._determineUrgency(recommendation),
      expectedImprovement: recommendation.expectedImprovement || 0.1,
      confidence: 0.85,
      isReversible: true,
      timestamp: Date.now()
    };
  }

  _determinScope(systemState) {
    if (systemState.failureRisk > 0.8) return 'GLOBAL';
    if (systemState.affectedRegions > 1) return 'REGIONAL';
    return 'LOCAL';
  }

  _determineUrgency(recommendation) {
    if (recommendation.severity > 0.8) return 'CRITICAL';
    if (recommendation.severity > 0.5) return 'HIGH';
    return 'NORMAL';
  }

  monitorActiveStrategies(metrics) {
    const active = this.controller.activeStrategies;

    for (const execution of active) {
      const result = this.controller.checkpointStrategy(execution.id, metrics);

      if (result.shouldRollback) {
        this.controller.rollbackStrategy(execution.id, 'PERFORMANCE_DEGRADATION');

        this._logOrchestration({
          type: 'AUTOMATIC_ROLLBACK',
          executionId: execution.id,
          reason: 'DEGRADATION'
        });
      }
    }
  }

  _logOrchestration(entry) {
    this.orchestrationLog.push({ ...entry, timestamp: Date.now() });
    if (this.orchestrationLog.length > this.maxLogSize) {
      this.orchestrationLog.shift();
    }
  }

  getOrchestrationStatus() {
    return {
      activeStrategies: this.controller.getActiveStrategies(),
      recentDecisions: this.orchestrationLog.slice(-10),
      evaluationStats: {
        total: this.evaluator.executionHistory.length,
        accepted: this.evaluator.executionHistory.filter(e => e.success).length,
        rejected: this.evaluator.executionHistory.filter(e => !e.success).length
      }
    };
  }
}

export default {
  StrategyEvaluator,
  ExecutionController,
  StrategyOrchestrator
};
