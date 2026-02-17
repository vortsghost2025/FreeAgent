/**
 * Phase 4.6: Self-Tuning Behavior
 * Autonomous parameter adjustment, metrics-driven optimization, and self-optimization loops
 * Final component: closes the feedback loop for federation-wide autonomous optimization
 */

/**
 * Parameter Tuner - autonomously adjusts system parameters
 */
export class ParameterTuner {
  constructor(options = {}) {
    this.parameters = new Map(); // paramName -> { value, min, max, tuningRate }
    this.tuningHistory = [];
    this.maxHistorySize = options.maxHistorySize || 1000;
    this.debug = options.debug || false;
    this.handlers = [];
  }

  /**
   * Register parameter for tuning
   */
  registerParameter(name, initialValue, constraints = {}) {
    this.parameters.set(name, {
      name,
      value: initialValue,
      min: constraints.min || 0,
      max: constraints.max || 100,
      tuningRate: constraints.tuningRate || 0.1,
      history: [{ value: initialValue, timestamp: Date.now() }],
      adjustmentCount: 0
    });

    return this.getParameter(name);
  }

  /**
   * Get parameter value
   */
  getParameter(name) {
    const param = this.parameters.get(name);
    return param ? param.value : null;
  }

  /**
   * Adjust parameter based on metrics
   */
  adjustParameter(name, targetValue, reason = '') {
    const param = this.parameters.get(name);
    if (!param) return { success: false, error: 'PARAMETER_NOT_FOUND' };

    const oldValue = param.value;
    const change = targetValue - oldValue;
    const adjustedValue = Math.max(param.min, Math.min(param.max, targetValue));

    param.value = adjustedValue;
    param.adjustmentCount++;
    param.history.push({ value: adjustedValue, timestamp: Date.now() });

    if (param.history.length > 100) {
      param.history.shift();
    }

    const adjustment = {
      parameter: name,
      oldValue,
      newValue: adjustedValue,
      change,
      reason,
      timestamp: Date.now()
    };

    this.tuningHistory.push(adjustment);
    if (this.tuningHistory.length > this.maxHistorySize) {
      this.tuningHistory.shift();
    }

    if (this.debug) {
      console.log(`[ParameterTuner] ${name}: ${oldValue} → ${adjustedValue} (${reason})`);
    }

    this._emitAdjustment(adjustment);
    return { success: true, adjustment };
  }

  /**
   * Get parameter stats
   */
  getParameterStats(name) {
    const param = this.parameters.get(name);
    if (!param) return null;

    const history = param.history;
    const values = history.map(h => h.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      name,
      current: param.value,
      average: avg,
      min,
      max,
      adjustmentCount: param.adjustmentCount,
      history: history.slice(-10)
    };
  }

  /**
   * Emit adjustment event
   */
  _emitAdjustment(adjustment) {
    this.handlers.forEach(handler => {
      try {
        handler(adjustment);
      } catch (error) {
        console.error(`[ParameterTuner] Handler error: ${error.message}`);
      }
    });
  }

  /**
   * Register event handler
   */
  onAdjustment(handler) {
    this.handlers.push(handler);
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalParameters: this.parameters.size,
      totalAdjustments: this.tuningHistory.length,
      avgAdjustmentsPerParameter: this.parameters.size > 0
        ? this.tuningHistory.length / this.parameters.size
        : 0,
      parameters: Array.from(this.parameters.keys())
    };
  }
}

/**
 * Metrics-Driven Optimizer
 * Analyzes metrics and makes optimization decisions
 */
export class MetricsDrivenOptimizer {
  constructor(options = {}) {
    this.tuner = options.tuner || new ParameterTuner();
    this.metrics = new Map(); // metricName -> [values]
    this.optimizationThresholds = options.thresholds || {
      latency: 50,
      load: 0.8,
      errorRate: 0.05,
      failureRate: 0.01
    };
    this.debug = options.debug || false;
    this.handlers = [];
  }

  /**
   * Record metric
   */
  recordMetric(name, value) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const values = this.metrics.get(name);
    values.push({ value, timestamp: Date.now() });

    // Keep last 100 values
    if (values.length > 100) {
      values.shift();
    }
  }

  /**
   * Get metric statistics
   */
  getMetricStats(name) {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return null;

    const nums = values.map(v => v.value);
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
    const sorted = [...nums].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    return { avg, p50, p95, p99, current: nums[nums.length - 1] };
  }

  /**
   * Analyze metrics and recommend optimizations
   */
  analyzeAndOptimize() {
    const recommendations = [];

    // Analyze latency
    const latencyStats = this.getMetricStats('latency');
    if (latencyStats && latencyStats.p95 > this.optimizationThresholds.latency) {
      recommendations.push({
        type: 'REDUCE_LATENCY',
        reason: `P95 latency ${latencyStats.p95}ms exceeds threshold ${this.optimizationThresholds.latency}ms`,
        actions: ['optimize-routing', 'increase-redundancy', 'reduce-hops']
      });
    }

    // Analyze load
    const loadStats = this.getMetricStats('load');
    if (loadStats && loadStats.avg > this.optimizationThresholds.load) {
      recommendations.push({
        type: 'REDUCE_LOAD',
        reason: `Average load ${loadStats.avg.toFixed(2)} exceeds threshold ${this.optimizationThresholds.load}`,
        actions: ['scale-up', 'load-balance', 'circuit-break']
      });
    }

    // Analyze error rate
    const errorStats = this.getMetricStats('errorRate');
    if (errorStats && errorStats.avg > this.optimizationThresholds.errorRate) {
      recommendations.push({
        type: 'REDUCE_ERRORS',
        reason: `Error rate ${(errorStats.avg * 100).toFixed(2)}% exceeds threshold ${(this.optimizationThresholds.errorRate * 100).toFixed(2)}%`,
        actions: ['retry-policy', 'fallback', 'health-check']
      });
    }

    this._emitOptimization(recommendations);
    return recommendations;
  }

  /**
   * Apply optimization recommendation
   */
  applyOptimization(recommendation) {
    const result = {
      recommendation: recommendation.type,
      actions: [],
      timestamp: Date.now()
    };

    for (const action of recommendation.actions) {
      if (action === 'optimize-routing') {
        this.tuner.adjustParameter('routing-timeout', 100, 'latency-optimization');
        result.actions.push('routing-timeout adjusted');
      } else if (action === 'scale-up') {
        this.tuner.adjustParameter('node-target', Math.ceil((this.tuner.getParameter('node-target') || 10) * 1.2), 'load-reduction');
        result.actions.push('node-target increased for scale-up');
      } else if (action === 'load-balance') {
        this.tuner.adjustParameter('load-balance-factor', Math.max(0.5, (this.tuner.getParameter('load-balance-factor') || 1) * 0.8), 'load-optimization');
        result.actions.push('load-balance-factor adjusted');
      } else if (action === 'circuit-break') {
        this.tuner.adjustParameter('failure-threshold', Math.max(0.01, (this.tuner.getParameter('failure-threshold') || 0.05) * 0.5), 'error-reduction');
        result.actions.push('failure-threshold lowered for faster circuit break');
      }
    }

    if (this.debug) {
      console.log(`[Optimizer] Applied ${recommendation.type}: ${result.actions.length} actions`);
    }

    return result;
  }

  /**
   * Emit optimization event
   */
  _emitOptimization(recommendations) {
    this.handlers.forEach(handler => {
      try {
        handler({ recommendations, timestamp: Date.now() });
      } catch (error) {
        console.error(`[Optimizer] Handler error: ${error.message}`);
      }
    });
  }

  /**
   * Register event handler
   */
  onOptimization(handler) {
    this.handlers.push(handler);
  }
}

/**
 * Self-Optimization Loop
 * Continuously monitors and optimizes the system
 */
export class SelfOptimizationLoop {
  constructor(options = {}) {
    this.tuner = new ParameterTuner(options);
    this.optimizer = new MetricsDrivenOptimizer({ tuner: this.tuner, ...options });
    this.loopState = 'idle'; // idle, monitoring, optimizing
    this.optimizationCycles = 0;
    this.improvementMetrics = [];
    this.maxMetricsSize = options.maxMetricsSize || 1000;
    this.debug = options.debug || false;
    this.handlers = [];
  }

  /**
   * Start optimization cycle
   */
  startOptimizationCycle() {
    this.loopState = 'monitoring';
    this.optimizationCycles++;

    // Analyze current metrics
    const recommendations = this.optimizer.analyzeAndOptimize();

    if (recommendations.length > 0) {
      this.loopState = 'optimizing';

      for (const recommendation of recommendations) {
        const result = this.optimizer.applyOptimization(recommendation);
        this.improvementMetrics.push(result);

        if (this.improvementMetrics.length > this.maxMetricsSize) {
          this.improvementMetrics.shift();
        }
      }
    }

    this.loopState = 'idle';

    if (this.debug) {
      console.log(`[OptimizationLoop] Cycle ${this.optimizationCycles}: ${recommendations.length} optimizations applied`);
    }

    this._emitCycleComplete(recommendations);
    return { cycle: this.optimizationCycles, recommendations };
  }

  /**
   * Record system metric
   */
  recordMetric(name, value) {
    this.optimizer.recordMetric(name, value);
  }

  /**
   * Get system health score based on optimization state
   */
  getSystemHealthScore() {
    const latencyStats = this.optimizer.getMetricStats('latency');
    const loadStats = this.optimizer.getMetricStats('load');
    const errorStats = this.optimizer.getMetricStats('errorRate');

    let score = 100;

    if (latencyStats) {
      const latencyHealth = Math.max(0, 100 - (latencyStats.p95 / 10));
      score -= (100 - latencyHealth) * 0.3;
    }

    if (loadStats) {
      const loadHealth = Math.max(0, 100 - (loadStats.avg * 100));
      score -= (100 - loadHealth) * 0.4;
    }

    if (errorStats) {
      const errorHealth = Math.max(0, 100 - (errorStats.avg * 1000));
      score -= (100 - errorHealth) * 0.3;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Emit cycle complete event
   */
  _emitCycleComplete(recommendations) {
    this.handlers.forEach(handler => {
      try {
        handler({ cycle: this.optimizationCycles, recommendations, timestamp: Date.now() });
      } catch (error) {
        console.error(`[OptimizationLoop] Handler error: ${error.message}`);
      }
    });
  }

  /**
   * Register event handler
   */
  onCycleComplete(handler) {
    this.handlers.push(handler);
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      optimizationCycles: this.optimizationCycles,
      currentState: this.loopState,
      systemHealthScore: this.getSystemHealthScore(),
      improvementActions: this.improvementMetrics.length,
      tunerStats: this.tuner.getStats(),
      recentImprovements: this.improvementMetrics.slice(-5)
    };
  }
}

/**
 * Autonomous Federation Controller
 * Top-level orchestrator for self-tuning medical federation
 */
export class AutonomousFederationController {
  constructor(options = {}) {
    this.optimization = new SelfOptimizationLoop(options);
    this.controlLog = [];
    this.maxLogSize = options.maxLogSize || 5000;
    this.debug = options.debug || false;
  }

  /**
   * Initialize controller
   */
  initialize() {
    // Register key parameters for tuning
    this.optimization.tuner.registerParameter('task-timeout', 30000, { min: 5000, max: 120000 });
    this.optimization.tuner.registerParameter('cache-ttl', 3600, { min: 60, max: 86400 });
    this.optimization.tuner.registerParameter('retry-count', 3, { min: 0, max: 10 });
    this.optimization.tuner.registerParameter('batch-size', 100, { min: 1, max: 1000 });
    this.optimization.tuner.registerParameter('connection-pool-size', 50, { min: 10, max: 500 });

    if (this.debug) {
      console.log('[Controller] Initialized with 5 core parameters');
    }

    return { success: true, parametersRegistered: 5 };
  }

  /**
   * Report system metrics
   */
  reportMetrics(metrics) {
    for (const [name, value] of Object.entries(metrics)) {
      this.optimization.recordMetric(name, value);
    }

    this._logControl({ type: 'METRICS_REPORTED', metricsCount: Object.keys(metrics).length });
  }

  /**
   * Execute optimization cycle
   */
  executeCycle() {
    const result = this.optimization.startOptimizationCycle();

    this._logControl({
      type: 'OPTIMIZATION_CYCLE',
      cycle: result.cycle,
      recommendations: result.recommendations.length
    });

    return result;
  }

  /**
   * Get system status
   */
  getSystemStatus() {
    const stats = this.optimization.getStats();
    return {
      controller: {
        state: this.optimization.loopState,
        cycles: stats.optimizationCycles,
        healthScore: stats.systemHealthScore,
        parameters: stats.tunerStats.totalParameters,
        adjustments: stats.tunerStats.totalAdjustments
      },
      optimization: stats,
      recentActions: this.controlLog.slice(-10)
    };
  }

  /**
   * Log control action
   */
  _logControl(entry) {
    this.controlLog.push({
      ...entry,
      timestamp: Date.now()
    });

    if (this.controlLog.length > this.maxLogSize) {
      this.controlLog.shift();
    }
  }

  /**
   * Get full system report
   */
  getSystemReport() {
    const status = this.getSystemStatus();
    const tunerStats = Array.from(this.optimization.tuner.parameters.values()).map(p =>
      this.optimization.tuner.getParameterStats(p.name)
    );

    return {
      timestamp: Date.now(),
      federationStatus: status,
      parameterState: tunerStats,
      controlLog: this.controlLog.slice(-20),
      summary: {
        totalCycles: status.controller.cycles,
        healthScore: status.controller.healthScore,
        adjustedParameters: tunerStats.filter(p => p.adjustmentCount > 0).length,
        recommendationsApplied: status.optimization.improvementActions
      }
    };
  }
}

export default {
  ParameterTuner,
  MetricsDrivenOptimizer,
  SelfOptimizationLoop,
  AutonomousFederationController
};
