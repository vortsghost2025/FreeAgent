/**
 * HEALTH MONITORING AND METRICS COLLECTION
 * Tracks pipeline health, performance, error rates, and agent status
 */

/**
 * Metrics Collector - collects and aggregates pipeline metrics
 */
export class MetricsCollector {
  constructor() {
    this.reset();
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = {
      // Pipeline execution metrics
      pipelineExecutions: 0,
      pipelineSuccesses: 0,
      pipelineFailures: 0,
      pipelineTimeouts: 0,

      // Agent-specific metrics
      agentMetrics: {},

      // Classification metrics
      classificationCounts: {
        symptoms: 0,
        labs: 0,
        imaging: 0,
        vitals: 0,
        notes: 0,
        other: 0
      },

      // Risk metrics
      riskDistribution: {
        low: 0,
        medium: 0,
        high: 0
      },

      // Performance metrics
      executionTimes: [],
      averageExecutionTime: 0,
      minExecutionTime: Infinity,
      maxExecutionTime: 0,

      // Error tracking
      errorCounts: {},
      validationErrors: 0,
      timeoutErrors: 0,

      // Data quality metrics
      lowConfidenceClassifications: 0,
      partialExtractions: 0,
      missingRequiredFields: 0,

      // Timestamps
      startTime: Date.now(),
      lastResetTime: Date.now()
    };
  }

  /**
   * Record pipeline execution start
   */
  recordPipelineStart() {
    this.metrics.pipelineExecutions++;
  }

  /**
   * Record successful pipeline execution
   */
  recordPipelineSuccess(executionTime, result) {
    this.metrics.pipelineSuccesses++;
    this._recordExecutionTime(executionTime);

    // Record classification type
    if (result.output?.classification?.type) {
      const type = result.output.classification.type;
      if (this.metrics.classificationCounts[type] !== undefined) {
        this.metrics.classificationCounts[type]++;
      }

      // Track low confidence
      if (result.output.classification.confidence < 0.3) {
        this.metrics.lowConfidenceClassifications++;
      }
    }

    // Record risk severity
    if (result.output?.riskScore?.severity) {
      const severity = result.output.riskScore.severity;
      if (this.metrics.riskDistribution[severity] !== undefined) {
        this.metrics.riskDistribution[severity]++;
      }
    }

    // Track data quality issues
    if (result.output?.summary?.completeness < 0.7) {
      this.metrics.partialExtractions++;
    }

    if (result.output?.riskScore?.flags) {
      const flags = result.output.riskScore.flags;
      if (flags.some(f => f.flag === 'missing_required_fields')) {
        this.metrics.missingRequiredFields++;
      }
    }
  }

  /**
   * Record failed pipeline execution
   */
  recordPipelineFailure(executionTime, error) {
    this.metrics.pipelineFailures++;
    if (executionTime) {
      this._recordExecutionTime(executionTime);
    }

    // Track error types
    const errorType = error?.name || 'UnknownError';
    this.metrics.errorCounts[errorType] = (this.metrics.errorCounts[errorType] || 0) + 1;

    if (errorType === 'ValidationError') {
      this.metrics.validationErrors++;
    } else if (errorType === 'TimeoutError') {
      this.metrics.timeoutErrors++;
    }
  }

  /**
   * Record agent execution
   */
  recordAgentExecution(agentId, role, executionTime, success) {
    if (!this.metrics.agentMetrics[agentId]) {
      this.metrics.agentMetrics[agentId] = {
        role,
        executions: 0,
        successes: 0,
        failures: 0,
        totalTime: 0,
        avgTime: 0,
        minTime: Infinity,
        maxTime: 0
      };
    }

    const agentMetrics = this.metrics.agentMetrics[agentId];
    agentMetrics.executions++;

    if (success) {
      agentMetrics.successes++;
    } else {
      agentMetrics.failures++;
    }

    if (executionTime !== undefined) {
      agentMetrics.totalTime += executionTime;
      agentMetrics.avgTime = agentMetrics.totalTime / agentMetrics.executions;
      agentMetrics.minTime = Math.min(agentMetrics.minTime, executionTime);
      agentMetrics.maxTime = Math.max(agentMetrics.maxTime, executionTime);
    }
  }

  /**
   * Record execution time
   * @private
   */
  _recordExecutionTime(time) {
    this.metrics.executionTimes.push(time);
    this.metrics.minExecutionTime = Math.min(this.metrics.minExecutionTime, time);
    this.metrics.maxExecutionTime = Math.max(this.metrics.maxExecutionTime, time);

    // Calculate average
    const sum = this.metrics.executionTimes.reduce((a, b) => a + b, 0);
    this.metrics.averageExecutionTime = sum / this.metrics.executionTimes.length;
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.startTime,
      successRate: this.metrics.pipelineExecutions > 0
        ? (this.metrics.pipelineSuccesses / this.metrics.pipelineExecutions)
        : 0,
      failureRate: this.metrics.pipelineExecutions > 0
        ? (this.metrics.pipelineFailures / this.metrics.pipelineExecutions)
        : 0
    };
  }

  /**
   * Get metrics summary for logging/display
   */
  getSummary() {
    const metrics = this.getMetrics();

    return {
      overview: {
        totalExecutions: metrics.pipelineExecutions,
        successes: metrics.pipelineSuccesses,
        failures: metrics.pipelineFailures,
        successRate: `${(metrics.successRate * 100).toFixed(2)}%`,
        uptime: `${(metrics.uptime / 1000).toFixed(2)}s`
      },
      performance: {
        avgExecutionTime: `${metrics.averageExecutionTime.toFixed(2)}ms`,
        minExecutionTime: `${metrics.minExecutionTime === Infinity ? 'N/A' : metrics.minExecutionTime + 'ms'}`,
        maxExecutionTime: `${metrics.maxExecutionTime === 0 ? 'N/A' : metrics.maxExecutionTime + 'ms'}`
      },
      classification: metrics.classificationCounts,
      risk: metrics.riskDistribution,
      dataQuality: {
        lowConfidence: metrics.lowConfidenceClassifications,
        partialExtractions: metrics.partialExtractions,
        missingFields: metrics.missingRequiredFields
      },
      errors: {
        validationErrors: metrics.validationErrors,
        timeoutErrors: metrics.timeoutErrors,
        byType: metrics.errorCounts
      }
    };
  }
}

/**
 * Health Monitor - monitors system health and alerts
 */
export class HealthMonitor {
  constructor(config = {}) {
    this.config = {
      failureRateThreshold: config.failureRateThreshold || 0.1, // 10%
      avgExecutionTimeThreshold: config.avgExecutionTimeThreshold || 50, // 50ms
      lowConfidenceThreshold: config.lowConfidenceThreshold || 0.2, // 20%
      ...config
    };

    this.metricsCollector = new MetricsCollector();
    this.alerts = [];
    this.healthStatus = 'healthy';
  }

  /**
   * Get metrics collector
   */
  getMetrics() {
    return this.metricsCollector;
  }

  /**
   * Check system health and generate alerts
   */
  checkHealth() {
    const metrics = this.metricsCollector.getMetrics();
    this.alerts = [];

    // Check failure rate
    if (metrics.failureRate > this.config.failureRateThreshold) {
      this.alerts.push({
        level: 'warning',
        type: 'high_failure_rate',
        message: `Failure rate ${(metrics.failureRate * 100).toFixed(2)}% exceeds threshold ${(this.config.failureRateThreshold * 100)}%`,
        value: metrics.failureRate,
        threshold: this.config.failureRateThreshold
      });
    }

    // Check average execution time
    if (metrics.averageExecutionTime > this.config.avgExecutionTimeThreshold) {
      this.alerts.push({
        level: 'warning',
        type: 'slow_execution',
        message: `Average execution time ${metrics.averageExecutionTime.toFixed(2)}ms exceeds threshold ${this.config.avgExecutionTimeThreshold}ms`,
        value: metrics.averageExecutionTime,
        threshold: this.config.avgExecutionTimeThreshold
      });
    }

    // Check low confidence classifications
    const lowConfidenceRate = metrics.pipelineSuccesses > 0
      ? metrics.lowConfidenceClassifications / metrics.pipelineSuccesses
      : 0;

    if (lowConfidenceRate > this.config.lowConfidenceThreshold) {
      this.alerts.push({
        level: 'info',
        type: 'low_confidence',
        message: `Low confidence classification rate ${(lowConfidenceRate * 100).toFixed(2)}% exceeds threshold ${(this.config.lowConfidenceThreshold * 100)}%`,
        value: lowConfidenceRate,
        threshold: this.config.lowConfidenceThreshold
      });
    }

    // Check agent health
    for (const [agentId, agentMetrics] of Object.entries(metrics.agentMetrics)) {
      const agentFailureRate = agentMetrics.executions > 0
        ? agentMetrics.failures / agentMetrics.executions
        : 0;

      if (agentFailureRate > this.config.failureRateThreshold) {
        this.alerts.push({
          level: 'error',
          type: 'agent_failure',
          message: `Agent ${agentId} failure rate ${(agentFailureRate * 100).toFixed(2)}% exceeds threshold`,
          agentId,
          value: agentFailureRate,
          threshold: this.config.failureRateThreshold
        });
      }
    }

    // Determine overall health status
    if (this.alerts.some(a => a.level === 'error')) {
      this.healthStatus = 'unhealthy';
    } else if (this.alerts.some(a => a.level === 'warning')) {
      this.healthStatus = 'degraded';
    } else {
      this.healthStatus = 'healthy';
    }

    return {
      status: this.healthStatus,
      alerts: this.alerts,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get current health status
   */
  getHealthStatus() {
    return this.checkHealth();
  }

  /**
   * Get detailed health report
   */
  getHealthReport() {
    const health = this.checkHealth();
    const summary = this.metricsCollector.getSummary();

    return {
      health,
      metrics: summary,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Reset monitoring
   */
  reset() {
    this.metricsCollector.reset();
    this.alerts = [];
    this.healthStatus = 'healthy';
  }
}

/**
 * Create a health monitor instance
 */
export function createHealthMonitor(config = {}) {
  return new HealthMonitor(config);
}

/**
 * Default health monitor (singleton)
 */
let defaultMonitor = null;

export function getDefaultHealthMonitor() {
  if (!defaultMonitor) {
    defaultMonitor = new HealthMonitor();
  }
  return defaultMonitor;
}

export function setDefaultHealthMonitor(monitor) {
  defaultMonitor = monitor;
}
