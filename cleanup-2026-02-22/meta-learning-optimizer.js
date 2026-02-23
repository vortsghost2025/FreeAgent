/**
 * Phase 8.3: Meta-Learning Optimizer
 * Optimizes the system's own learning configuration and memory architecture over time.
 */

export class LearningAlgorithmOptimizer {
  optimize(config = {}, cycleMetrics = {}) {
    const learningRate = this._boundedNumber(config.learningRate, 0.01, 0.0001, 1);
    const batchSize = Math.round(this._boundedNumber(config.batchSize, 64, 8, 4096));
    const regularization = this._boundedNumber(config.regularization, 0.01, 0, 1);

    const convergenceVelocity = this._boundedNumber(cycleMetrics.convergenceVelocity, 0, -1, 1);
    const stabilityScore = this._boundedNumber(cycleMetrics.stabilityScore, 1, 0, 1);
    const validationDrift = this._boundedNumber(cycleMetrics.validationDrift, 0, -1, 1);

    let tunedLearningRate = learningRate;
    let tunedBatchSize = batchSize;
    let tunedRegularization = regularization;
    const actions = [];

    if (convergenceVelocity < 0) {
      tunedLearningRate = learningRate * 0.9;
      actions.push('REDUCE_LEARNING_RATE_FOR_CONVERGENCE');
    } else if (convergenceVelocity > 0.2 && stabilityScore > 0.9) {
      tunedLearningRate = learningRate * 1.05;
      actions.push('INCREASE_LEARNING_RATE_FOR_FASTER_PROGRESS');
    }

    if (stabilityScore < 0.8) {
      tunedBatchSize = Math.max(8, Math.round(batchSize * 0.9));
      tunedRegularization = regularization * 1.1;
      actions.push('INCREASE_STABILITY_CONTROLS');
    }

    if (validationDrift > 0.1) {
      tunedRegularization = regularization * 1.15;
      actions.push('TIGHTEN_REGULARIZATION_FOR_DRIFT_CONTROL');
    }

    return {
      previous: {
        learningRate: Number(learningRate.toFixed(6)),
        batchSize,
        regularization: Number(regularization.toFixed(6))
      },
      next: {
        learningRate: Number(this._boundedNumber(tunedLearningRate, learningRate, 0.0001, 1).toFixed(6)),
        batchSize: Math.round(this._boundedNumber(tunedBatchSize, batchSize, 8, 4096)),
        regularization: Number(this._boundedNumber(tunedRegularization, regularization, 0, 1).toFixed(6))
      },
      actions
    };
  }

  _boundedNumber(value, fallback, min, max) {
    if (value == null) return fallback;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(min, Math.min(max, numeric));
  }
}

export class MemoryArchitectureOptimizer {
  optimize(memoryStats = {}) {
    const retrievalLatencyMs = this._boundedNumber(memoryStats.retrievalLatencyMs, 80, 1, 100000);
    const hitRate = this._boundedNumber(memoryStats.hitRate, 0.9, 0, 1);
    const fragmentation = this._boundedNumber(memoryStats.fragmentation, 0.1, 0, 1);
    const growthRate = this._boundedNumber(memoryStats.growthRate, 0.02, 0, 5);

    const actions = [];
    if (retrievalLatencyMs > 120) actions.push('REINDEX_LONG_HORIZON_MEMORY');
    if (hitRate < 0.9) actions.push('PROMOTE_FREQUENT_CONTEXT_WINDOWS');
    if (fragmentation > 0.25) actions.push('DEFRAGMENT_MEMORY_BLOCKS');
    if (growthRate > 0.1) actions.push('ENABLE_MEMORY_COMPACTION');

    const estimatedEfficiencyGain = Number((
      (actions.includes('REINDEX_LONG_HORIZON_MEMORY') ? 0.04 : 0) +
      (actions.includes('PROMOTE_FREQUENT_CONTEXT_WINDOWS') ? 0.03 : 0) +
      (actions.includes('DEFRAGMENT_MEMORY_BLOCKS') ? 0.02 : 0) +
      (actions.includes('ENABLE_MEMORY_COMPACTION') ? 0.01 : 0)
    ).toFixed(4));

    return {
      actions,
      estimatedEfficiencyGain
    };
  }

  _boundedNumber(value, fallback, min, max) {
    if (value == null) return fallback;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(min, Math.min(max, numeric));
  }
}

export class MetaLearningOptimizerEngine {
  constructor(options = {}) {
    this.algorithmOptimizer = options.algorithmOptimizer || new LearningAlgorithmOptimizer(options);
    this.memoryOptimizer = options.memoryOptimizer || new MemoryArchitectureOptimizer(options);
    this.learningHistory = [];
    this.optimizationLog = [];
    this.maxLogSize = options.maxLogSize || 10000;
  }

  recordCycle(cycleId, metrics = {}) {
    const record = {
      cycleId,
      learningEfficiency: this._boundedNumber(metrics.learningEfficiency, 0.5, 0, 1),
      convergenceVelocity: this._boundedNumber(metrics.convergenceVelocity, 0, -1, 1),
      stabilityScore: this._boundedNumber(metrics.stabilityScore, 1, 0, 1),
      timestamp: Date.now()
    };
    this.learningHistory.push(record);
    if (this.learningHistory.length > this.maxLogSize) {
      this.learningHistory.shift();
    }
    return { success: true, record };
  }

  optimizeLearning(config = {}, cycleMetrics = {}) {
    const tuned = this.algorithmOptimizer.optimize(config, cycleMetrics);
    this._log('LEARNING_OPTIMIZED', tuned);
    return {
      success: true,
      tuned
    };
  }

  optimizeMemoryArchitecture(memoryStats = {}) {
    const optimization = this.memoryOptimizer.optimize(memoryStats);
    this._log('MEMORY_OPTIMIZED', optimization);
    return {
      success: true,
      optimization
    };
  }

  getImprovementRatePer100Cycles() {
    if (this.learningHistory.length < 2) {
      return 0;
    }
    const first = this.learningHistory[0];
    const last = this.learningHistory[this.learningHistory.length - 1];
    const delta = last.learningEfficiency - first.learningEfficiency;
    const cycles = Math.max(1, this.learningHistory.length - 1);
    return Number(((delta / cycles) * 100).toFixed(4));
  }

  getMetaLearningStatus() {
    return {
      recordedCycles: this.learningHistory.length,
      improvementPer100Cycles: this.getImprovementRatePer100Cycles(),
      recentLearningHistory: this.learningHistory.slice(-10),
      recentOptimizations: this.optimizationLog.slice(-10)
    };
  }

  _log(eventType, payload) {
    this.optimizationLog.push({
      eventType,
      payload,
      timestamp: Date.now()
    });
    if (this.optimizationLog.length > this.maxLogSize) {
      this.optimizationLog.shift();
    }
  }

  _boundedNumber(value, fallback, min, max) {
    if (value == null) return fallback;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(min, Math.min(max, numeric));
  }
}

export default {
  LearningAlgorithmOptimizer,
  MemoryArchitectureOptimizer,
  MetaLearningOptimizerEngine
};

