/**
 * 🧠 Feedback Engine - MEV Organism Learning Cortex
 * Self-optimization through performance analysis and adaptation
 */

class FeedbackEngine {
  constructor(config = {}) {
    this.learningRate = config.learningRate || 0.1;
    this.memoryWindow = config.memoryWindow || 100;
    this.adaptationThreshold = config.adaptationThreshold || 0.7;
    
    this.performanceHistory = [];
    this.strategyAdjustments = new Map();
    this.chainPreferences = new Map();
    this.timeBasedPatterns = new Map();
    this.anomalyDetector = null;
    
    this.isLearning = false;
  }

  async initialize() {
    this.isLearning = true;
    this.anomalyDetector = new AnomalyDetector();
    console.log('🧠 Feedback Engine initialized - learning mode active');
  }

  recordExecution(executionData) {
    const record = {
      ...executionData,
      timestamp: Date.now(),
      hourOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay()
    };
    
    this.performanceHistory.push(record);
    
    // Maintain memory window
    if (this.performanceHistory.length > this.memoryWindow) {
      this.performanceHistory.shift();
    }
    
    // Update analytics
    this.updateChainPreferences(record);
    this.updateTimePatterns(record);
    this.detectAnomalies(record);
    
    console.log(`📊 Recorded execution: ${record.strategy} on ${record.chain} - Profit: ${record.profit}`);
  }

  updateChainPreferences(record) {
    if (!this.chainPreferences.has(record.chain)) {
      this.chainPreferences.set(record.chain, {
        executions: 0,
        successes: 0,
        totalProfit: 0,
        avgGasCost: 0
      });
    }
    
    const chainData = this.chainPreferences.get(record.chain);
    chainData.executions++;
    if (record.success) {
      chainData.successes++;
    }
    chainData.totalProfit += record.profit || 0;
    
    // Update average gas cost
    if (record.gasCost) {
      chainData.avgGasCost = ((chainData.avgGasCost * (chainData.executions - 1)) + record.gasCost) / chainData.executions;
    }
  }

  updateTimePatterns(record) {
    const timeKey = `${record.hourOfDay}-${record.dayOfWeek}`;
    
    if (!this.timeBasedPatterns.has(timeKey)) {
      this.timeBasedPatterns.set(timeKey, {
        executions: 0,
        successes: 0,
        totalProfit: 0,
        strategies: new Map()
      });
    }
    
    const timeData = this.timeBasedPatterns.get(timeKey);
    timeData.executions++;
    if (record.success) {
      timeData.successes++;
    }
    timeData.totalProfit += record.profit || 0;
    
    // Track strategy performance by time
    if (!timeData.strategies.has(record.strategy)) {
      timeData.strategies.set(record.strategy, { executions: 0, successes: 0, profit: 0 });
    }
    
    const stratData = timeData.strategies.get(record.strategy);
    stratData.executions++;
    if (record.success) {
      stratData.successes++;
    }
    stratData.profit += record.profit || 0;
  }

  detectAnomalies(record) {
    if (!this.anomalyDetector) return;
    
    const isAnomaly = this.anomalyDetector.detect(record);
    if (isAnomaly) {
      console.warn(`🚨 Anomaly detected: ${record.strategy} on ${record.chain} at ${new Date(record.timestamp).toISOString()}`);
      this.triggerAdaptiveResponse(record);
    }
  }

  triggerAdaptiveResponse(anomalousRecord) {
    // Adjust strategy weights based on anomaly
    const strategyKey = `${anomalousRecord.strategy}-${anomalousRecord.chain}`;
    
    if (!this.strategyAdjustments.has(strategyKey)) {
      this.strategyAdjustments.set(strategyKey, 1.0);
    }
    
    // Reduce weight for poor performance
    let currentWeight = this.strategyAdjustments.get(strategyKey);
    currentWeight *= (1 - this.learningRate);
    this.strategyAdjustments.set(strategyKey, Math.max(0.1, currentWeight));
    
    console.log(`🔧 Adaptive adjustment: Reduced ${strategyKey} weight to ${currentWeight.toFixed(2)}`);
  }

  getOptimizationSuggestions() {
    const suggestions = [];
    
    // Chain optimization suggestions
    for (const [chain, data] of this.chainPreferences.entries()) {
      const successRate = data.successes / data.executions;
      const avgProfit = data.totalProfit / data.executions;
      
      if (successRate < 0.5) {
        suggestions.push({
          type: 'chain_avoid',
          chain,
          reason: `Low success rate: ${(successRate * 100).toFixed(1)}%`,
          confidence: successRate
        });
      }
      
      if (avgProfit < 0) {
        suggestions.push({
          type: 'chain_optimize_gas',
          chain,
          reason: `Negative average profit: ${avgProfit.toFixed(4)} ETH`,
          suggestedGasMultiplier: 0.8
        });
      }
    }
    
    // Time-based optimization
    for (const [timeKey, data] of this.timeBasedPatterns.entries()) {
      const successRate = data.successes / data.executions;
      const avgProfit = data.totalProfit / data.executions;
      
      if (successRate > 0.8 && avgProfit > 0.01) {
        suggestions.push({
          type: 'prime_time',
          timeSlot: timeKey,
          reason: `High performance period`,
          successRate,
          avgProfit
        });
      }
    }
    
    // Strategy adjustments
    for (const [strategyKey, weight] of this.strategyAdjustments.entries()) {
      if (weight < 0.5) {
        suggestions.push({
          type: 'strategy_reduce_weight',
          strategy: strategyKey,
          currentWeight: weight,
          reason: 'Poor historical performance'
        });
      }
    }
    
    return suggestions.sort((a, b) => (b.confidence || b.avgProfit || 0) - (a.confidence || a.avgProfit || 0));
  }

  getPerformanceAnalytics() {
    if (this.performanceHistory.length === 0) {
      return { message: 'No performance data available' };
    }
    
    const recentExecutions = this.performanceHistory.slice(-50);
    
    return {
      totalExecutions: this.performanceHistory.length,
      recentExecutions: recentExecutions.length,
      overallSuccessRate: this.calculateSuccessRate(this.performanceHistory),
      recentSuccessRate: this.calculateSuccessRate(recentExecutions),
      totalProfit: this.performanceHistory.reduce((sum, exec) => sum + (exec.profit || 0), 0),
      recentProfit: recentExecutions.reduce((sum, exec) => sum + (exec.profit || 0), 0),
      avgExecutionTime: this.performanceHistory.reduce((sum, exec) => sum + (exec.executionTime || 0), 0) / this.performanceHistory.length,
      topChains: this.getTopPerformingChains(3),
      topStrategies: this.getTopPerformingStrategies(3),
      timePatternInsights: this.getTimePatternInsights()
    };
  }

  calculateSuccessRate(executions) {
    if (executions.length === 0) return 0;
    const successes = executions.filter(exec => exec.success).length;
    return successes / executions.length;
  }

  getTopPerformingChains(limit = 5) {
    const chainPerformance = [];
    
    for (const [chain, data] of this.chainPreferences.entries()) {
      chainPerformance.push({
        chain,
        successRate: data.successes / data.executions,
        avgProfit: data.totalProfit / data.executions,
        executions: data.executions
      });
    }
    
    return chainPerformance
      .sort((a, b) => b.successRate * b.avgProfit - a.successRate * a.avgProfit)
      .slice(0, limit);
  }

  getTopPerformingStrategies(limit = 5) {
    const strategyPerformance = new Map();
    
    // Aggregate performance by strategy
    for (const execution of this.performanceHistory) {
      if (!strategyPerformance.has(execution.strategy)) {
        strategyPerformance.set(execution.strategy, {
          executions: 0,
          successes: 0,
          totalProfit: 0
        });
      }
      
      const data = strategyPerformance.get(execution.strategy);
      data.executions++;
      if (execution.success) {
        data.successes++;
      }
      data.totalProfit += execution.profit || 0;
    }
    
    const results = [];
    for (const [strategy, data] of strategyPerformance.entries()) {
      results.push({
        strategy,
        successRate: data.successes / data.executions,
        avgProfit: data.totalProfit / data.executions,
        executions: data.executions
      });
    }
    
    return results
      .sort((a, b) => b.successRate * b.avgProfit - a.successRate * a.avgProfit)
      .slice(0, limit);
  }

  getTimePatternInsights() {
    const insights = {
      bestHours: [],
      worstHours: [],
      bestDays: []
    };
    
    // Analyze hourly performance
    const hourlyPerformance = new Map();
    for (let hour = 0; hour < 24; hour++) {
      hourlyPerformance.set(hour, { executions: 0, successes: 0, profit: 0 });
    }
    
    for (const execution of this.performanceHistory) {
      const hourData = hourlyPerformance.get(execution.hourOfDay);
      hourData.executions++;
      if (execution.success) {
        hourData.successes++;
      }
      hourData.profit += execution.profit || 0;
    }
    
    // Find best and worst performing hours
    const hourStats = Array.from(hourlyPerformance.entries())
      .map(([hour, data]) => ({
        hour,
        successRate: data.executions > 0 ? data.successes / data.executions : 0,
        avgProfit: data.executions > 0 ? data.profit / data.executions : 0,
        executions: data.executions
      }))
      .filter(stat => stat.executions >= 5); // Minimum threshold
    
    insights.bestHours = hourStats
      .sort((a, b) => b.successRate * b.avgProfit - a.successRate * a.avgProfit)
      .slice(0, 3);
      
    insights.worstHours = hourStats
      .sort((a, b) => a.successRate * a.avgProfit - b.successRate * b.avgProfit)
      .slice(0, 3);
    
    return insights;
  }

  pauseLearning() {
    this.isLearning = false;
    console.log('⏸️ Feedback Engine learning paused');
  }

  resumeLearning() {
    this.isLearning = true;
    console.log('▶️ Feedback Engine learning resumed');
  }
}

// Simple anomaly detector
class AnomalyDetector {
  constructor() {
    this.baselineMetrics = new Map();
    this.anomalyThreshold = 2.0; // 2 standard deviations
  }

  detect(execution) {
    const key = `${execution.strategy}-${execution.chain}`;
    
    if (!this.baselineMetrics.has(key)) {
      this.baselineMetrics.set(key, {
        executions: [],
        profits: [],
        executionTimes: []
      });
    }
    
    const baseline = this.baselineMetrics.get(key);
    baseline.executions.push(execution.success ? 1 : 0);
    baseline.profits.push(execution.profit || 0);
    baseline.executionTimes.push(execution.executionTime || 0);
    
    // Keep only recent history
    if (baseline.executions.length > 50) {
      baseline.executions.shift();
      baseline.profits.shift();
      baseline.executionTimes.shift();
    }
    
    // Simple statistical anomaly detection
    if (baseline.executions.length < 10) return false; // Need sufficient data
    
    const profitMean = baseline.profits.reduce((a, b) => a + b, 0) / baseline.profits.length;
    const profitStd = Math.sqrt(
      baseline.profits.reduce((sum, profit) => sum + Math.pow(profit - profitMean, 2), 0) / baseline.profits.length
    );
    
    const normalizedProfit = (execution.profit - profitMean) / (profitStd || 1);
    
    return Math.abs(normalizedProfit) > this.anomalyThreshold;
  }
}

export default FeedbackEngine;