/**
 * Phase 8.9: Temporal Trend Analyzer
 * Multi-cycle memory, rolling windows, stagnation/oscillation detection
 */

export class TemporalTrendAnalyzer {
  constructor(options = {}) {
    this.windowSize = options.windowSize || 5;  // Last N cycles
    this.minNetGainPct = options.minNetGainPct || 0.5;  // Minimum net improvement
    this.maxRollbackFrequency = options.maxRollbackFrequency || 0.4;  // 40% rollback rate max
    this.stagnationThreshold = options.stagnationThreshold || 0.1;  // Learning efficiency <10% = stagnation
    this.oscillationThreshold = options.oscillationThreshold || 0.3;  // Change direction >30% = oscillation
    this.cycleHistory = [];
    this.maxHistorySize = options.maxHistorySize || 100;
  }

  recordCycle(cycleId, metrics = {}) {
    const record = {
      cycleId,
      timestamp: Date.now(),
      metrics: {
        improvementPct: Number(metrics.improvementPct || 0),
        declaredImpct: Number(metrics.declaredImprovementPct || 0),
        rollbackCount: Number(metrics.rollbackCount || 0),
        changeCount: Number(metrics.changeCount || 0),
        learningEfficiency: Number(metrics.learningEfficiency || 0),
        mttrSeconds: metrics.mttrSeconds == null ? null : Number(metrics.mttrSeconds),
        architectureConsistency: Number(metrics.architectureConsistency || 0)
      }
    };

    this.cycleHistory.push(record);
    if (this.cycleHistory.length > this.maxHistorySize) {
      this.cycleHistory.shift();
    }

    return record;
  }

  /**
   * Compute rolling improvement window: last N cycles must show net positive gain
   * Returns { passed: bool, netImprovement: num, windowSize: num, windowCycles: [] }
   */
  validateRollingImprovement() {
    if (this.cycleHistory.length === 0) {
      return { passed: true, reason: 'bootstrap', netImprovement: 0, windowSize: 0, windowCycles: [] };
    }

    const window = this.cycleHistory.slice(-this.windowSize);
    const netImprovement = window.reduce((sum, cycle) => sum + cycle.metrics.improvementPct, 0);
    const passed = netImprovement >= this.minNetGainPct || window.length < this.windowSize;

    return {
      passed,
      netImprovement: Number(netImprovement.toFixed(2)),
      windowSize: window.length,
      windowCycles: window.map(c => ({ cycleId: c.cycleId, improvement: c.metrics.improvementPct })),
      reason: passed ? 'improvement_sufficient' : 'net_gain_below_threshold'
    };
  }

  /**
   * Detect stagnation: if learning efficiency trend is flat/declining
   * Returns { stagnant: bool, trend: num, recentEff: num }
   */
  detectStagnation() {
    if (this.cycleHistory.length < 2) {
      return { stagnant: false, reason: 'insufficient_history', trend: 0, recentEff: 0 };
    }

    const recent = this.cycleHistory.slice(-5);
    const efficiencies = recent.map(c => c.metrics.learningEfficiency);
    const avgEfficiency = efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length;
    const trend = efficiencies[efficiencies.length - 1] - efficiencies[0];
    const stagnant = avgEfficiency < this.stagnationThreshold || trend < -0.05;

    return {
      stagnant,
      trend: Number(trend.toFixed(4)),
      recentEff: Number(avgEfficiency.toFixed(4)),
      reason: stagnant ? 'learning_efficiency_decline' : 'healthy_trend'
    };
  }

  /**
   * Detect oscillation: if improvement direction changes frequently (up/down/up/down pattern)
   * Returns { oscillating: bool, changeCount: num, direction: [] }
   */
  detectOscillation() {
    if (this.cycleHistory.length < 3) {
      return { oscillating: false, reason: 'insufficient_history', changeCount: 0, direction: [] };
    }

    const recent = this.cycleHistory.slice(-10);
    const improvements = recent.map(c => c.metrics.improvementPct);
    const directions = [];

    for (let i = 1; i < improvements.length; i++) {
      directions.push(improvements[i] > improvements[i - 1] ? 'UP' : improvements[i] < improvements[i - 1] ? 'DOWN' : 'FLAT');
    }

    let directionChanges = 0;
    for (let i = 1; i < directions.length; i++) {
      if (directions[i] !== directions[i - 1] && directions[i] !== 'FLAT' && directions[i - 1] !== 'FLAT') {
        directionChanges++;
      }
    }

    const oscillationRate = directions.length > 0 ? directionChanges / directions.length : 0;
    const oscillating = oscillationRate > this.oscillationThreshold;

    return {
      oscillating,
      oscillationRate: Number(oscillationRate.toFixed(3)),
      changeCount: directionChanges,
      direction: directions,
      reason: oscillating ? 'high_direction_change_rate' : 'stable_direction'
    };
  }

  /**
   * Validate rollback frequency: too many rollbacks = instability
   * Returns { healthy: bool, rollbackRate: num, rollbackCount: num }
   */
  validateRollbackFrequency() {
    if (this.cycleHistory.length === 0) {
      return { healthy: true, reason: 'no_cycles', rollbackRate: 0, rollbackCount: 0 };
    }

    const recent = this.cycleHistory.slice(-this.windowSize);
    const totalRollbacks = recent.reduce((sum, cycle) => sum + cycle.metrics.rollbackCount, 0);
    const totalChanges = recent.reduce((sum, cycle) => sum + cycle.metrics.changeCount, 0);
    const rollbackRate = totalChanges > 0 ? totalRollbacks / totalChanges : 0;
    const healthy = rollbackRate <= this.maxRollbackFrequency;

    return {
      healthy,
      rollbackRate: Number(rollbackRate.toFixed(3)),
      rollbackCount: totalRollbacks,
      changeCount: totalChanges,
      reason: healthy ? 'rollback_frequency_acceptable' : 'rollback_frequency_excessive'
    };
  }

  /**
   * Comprehensive trend validation: all gates must pass
   */
  validateTrends() {
    const improvement = this.validateRollingImprovement();
    const stagnation = this.detectStagnation();
    const oscillation = this.detectOscillation();
    const rollbackFreq = this.validateRollbackFrequency();

    return {
      passed: improvement.passed && !stagnation.stagnant && !oscillation.oscillating && rollbackFreq.healthy,
      gates: {
        rollingImprovement: improvement,
        stagnation: stagnation,
        oscillation: oscillation,
        rollbackFrequency: rollbackFreq
      },
      failedGates: [
        !improvement.passed ? 'rollingImprovement' : null,
        stagnation.stagnant ? 'stagnation' : null,
        oscillation.oscillating ? 'oscillation' : null,
        !rollbackFreq.healthy ? 'rollbackFrequency' : null
      ].filter(Boolean),
      cycleCount: this.cycleHistory.length
    };
  }

  /**
   * Get trend summary for orchestrator
   */
  getTrendStatus() {
    const validation = this.validateTrends();
    return {
      cycleCount: this.cycleHistory.length,
      windowSize: this.windowSize,
      trendValidation: validation,
      recentCycles: this.cycleHistory.slice(-5).map(c => ({
        cycleId: c.cycleId,
        improvement: c.metrics.improvementPct,
        efficiency: c.metrics.learningEfficiency,
        rollbacks: c.metrics.rollbackCount
      }))
    };
  }

  /**
   * Clear history (for testing)
   */
  reset() {
    this.cycleHistory = [];
  }
}

export default {
  TemporalTrendAnalyzer
};
