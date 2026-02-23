/**
 * Phase 5.4: Long-Horizon Memory
 * Historical learning, seasonal patterns, stability scoring, reliability modeling
 * The "experience" layer that enables smarter future decisions
 */

/**
 * Historical Metrics Store - persists and analyzes historical data
 */
export class HistoricalMetricsStore {
  constructor(options = {}) {
    this.metrics = new Map(); // metricName -> [{ value, timestamp }]
    this.aggregations = new Map(); // metricName -> { hourly, daily, weekly }
    this.maxHistorySize = options.maxHistorySize || 100000;
    this.debug = options.debug || false;
  }

  recordMetric(metricName, value) {
    if (!this.metrics.has(metricName)) {
      this.metrics.set(metricName, []);
    }

    const series = this.metrics.get(metricName);
    series.push({ value, timestamp: Date.now() });

    if (series.length > this.maxHistorySize) {
      series.shift();
    }

    this._updateAggregations(metricName);
  }

  _updateAggregations(metricName) {
    const series = this.metrics.get(metricName);
    const now = Date.now();
    const hour = 60 * 60 * 1000;
    const day = 24 * hour;
    const week = 7 * day;

    const hourly = series
      .filter(m => now - m.timestamp < hour)
      .map(m => m.value);

    const daily = series
      .filter(m => now - m.timestamp < day)
      .map(m => m.value);

    const weekly = series
      .filter(m => now - m.timestamp < week)
      .map(m => m.value);

    const aggregation = {
      hourly: this._aggregate(hourly),
      daily: this._aggregate(daily),
      weekly: this._aggregate(weekly)
    };

    this.aggregations.set(metricName, aggregation);
  }

  _aggregate(values) {
    if (values.length === 0) return null;

    const avg = values.reduce((a, b) => a + b) / values.length;
    const sorted = [...values].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];

    return { avg, min: Math.min(...values), max: Math.max(...values), p50, p95 };
  }

  getHistoricalData(metricName, period = 'daily') {
    const aggregation = this.aggregations.get(metricName);
    if (!aggregation) return null;
    return aggregation[period];
  }

  getAllHistory(metricName) {
    return this.metrics.get(metricName) || [];
  }
}

/**
 * Pattern Learner - identifies and learns seasonal/cyclical patterns
 */
export class PatternLearner {
  constructor(options = {}) {
    this.patterns = new Map();
    this.confidence = options.confidence || 0.75;
    this.debug = options.debug || false;
  }

  identifyPattern(metricName, history) {
    if (history.length < 20) return null;

    const values = history.map(h => h.value);
    const pattern = {
      metric: metricName,
      type: 'UNKNOWN',
      frequency: null,
      amplitude: null,
      phase: null,
      confidence: 0
    };

    // Detect diurnal pattern (daily cycle)
    if (history.length > 24 * 10) {
      pattern.type = 'DIURNAL';
      pattern.frequency = 24;
      pattern.confidence = 0.8;
    }

    // Detect weekly pattern
    if (history.length > 7 * 10) {
      pattern.type = 'WEEKLY';
      pattern.frequency = 7;
      pattern.confidence = 0.7;
    }

    // Calculate amplitude
    const avg = values.reduce((a, b) => a + b) / values.length;
    const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length);
    pattern.amplitude = stdDev;

    if (pattern.confidence >= this.confidence) {
      this.patterns.set(metricName, pattern);
      return pattern;
    }

    return null;
  }

  getPredictedValue(metricName, hoursAhead) {
    const pattern = this.patterns.get(metricName);
    if (!pattern) return null;

    // Simple sinusoidal prediction
    const phase = (hoursAhead % pattern.frequency) / pattern.frequency;
    const prediction = Math.sin(phase * Math.PI * 2) * pattern.amplitude;

    return {
      metric: metricName,
      predictedValue: prediction,
      hoursAhead,
      pattern: pattern.type,
      confidence: pattern.confidence
    };
  }

  getAllPatterns() {
    return Array.from(this.patterns.values());
  }
}

/**
 * Stability Scorer - scores system stability based on historical data
 */
export class StabilityScorer {
  constructor(options = {}) {
    this.scores = [];
    this.maxScores = options.maxScores || 1000;
    this.debug = options.debug || false;
  }

  scoreStability(metrics) {
    let score = 100;

    // Handle both array of metrics and single metrics object
    const metricsArray = Array.isArray(metrics) ? metrics : [metrics];
    let totalVolatility = 0;

    // Score based on metric variance
    for (const metric of metricsArray) {
      if (metric.volatility > 0.8) {
        score -= 20;
      } else if (metric.volatility > 0.5) {
        score -= 10;
      }
      totalVolatility += metric.volatility || 0;
    }

    // Score based on failure patterns
    const recentFailures = metrics.recentFailures || 0;
    if (recentFailures > 3) {
      score -= 30;
    } else if (recentFailures > 1) {
      score -= 15;
    }

    // Score based on recovery speed
    if (metrics.recoveryTime && metrics.recoveryTime < 60000) {
      score += 10; // Fast recovery is good
    }

    const stabilityScore = {
      score: Math.max(0, Math.min(100, score)),
      timestamp: Date.now(),
      factors: {
        volatility: totalVolatility / metricsArray.length,
        failurePattern: recentFailures,
        recovery: metrics.recoveryTime
      }
    };

    this.scores.push(stabilityScore);
    if (this.scores.length > this.maxScores) {
      this.scores.shift();
    }

    return stabilityScore;
  }

  getTrendingStability(window = 10) {
    const recent = this.scores.slice(-window);
    if (recent.length === 0) return null;

    const avgScore = recent.reduce((sum, s) => sum + s.score, 0) / recent.length;
    const trend = recent[recent.length - 1].score - recent[0].score;

    return {
      avgScore: avgScore.toFixed(1),
      trend: trend > 0 ? 'IMPROVING' : trend < 0 ? 'DEGRADING' : 'STABLE',
      trendStrength: Math.abs(trend).toFixed(1),
      stability: avgScore >= 80 ? 'HIGH' : avgScore >= 60 ? 'MEDIUM' : 'LOW'
    };
  }
}

/**
 * Reliability Modeler - builds predictive models of system reliability
 */
export class ReliabilityModeler {
  constructor(options = {}) {
    this.models = new Map();
    this.predictions = [];
    this.maxPredictions = options.maxPredictions || 1000;
    this.debug = options.debug || false;
  }

  buildModel(componentId, failureHistory) {
    if (failureHistory.length < 5) return null;

    const timeBetweenFailures = [];
    for (let i = 1; i < failureHistory.length; i++) {
      timeBetweenFailures.push(failureHistory[i] - failureHistory[i - 1]);
    }

    const avgTimeBetweenFailures = timeBetweenFailures.reduce((a, b) => a + b) / timeBetweenFailures.length;
    const failureRate = 1 / (avgTimeBetweenFailures / 1000 / 60); // failures per minute

    const model = {
      componentId,
      failureRate: failureRate.toFixed(6),
      mtbf: (avgTimeBetweenFailures / 1000 / 60).toFixed(2), // Mean Time Between Failures
      availability: Math.max(0, 1 - failureRate),
      lastUpdated: Date.now()
    };

    this.models.set(componentId, model);
    return model;
  }

  predictFailure(componentId, hoursAhead) {
    const model = this.models.get(componentId);
    if (!model) return null;

    const failureRate = parseFloat(model.failureRate);
    const failureProbability = 1 - Math.exp(-failureRate * hoursAhead);

    const prediction = {
      componentId,
      hoursAhead,
      failureProbability: (failureProbability * 100).toFixed(2),
      riskLevel: failureProbability > 0.5 ? 'HIGH' : failureProbability > 0.2 ? 'MEDIUM' : 'LOW',
      model: model.failureRate,
      timestamp: Date.now()
    };

    this.predictions.push(prediction);
    if (this.predictions.length > this.maxPredictions) {
      this.predictions.shift();
    }

    return prediction;
  }

  getModelStats() {
    const models = Array.from(this.models.values());
    const avgAvailability = models.length > 0
      ? models.reduce((sum, m) => sum + m.availability, 0) / models.length
      : 0;

    return {
      totalModels: models.length,
      avgAvailability: (avgAvailability * 100).toFixed(1),
      models: models.map(m => ({ id: m.componentId, mtbf: m.mtbf, failureRate: m.failureRate }))
    };
  }
}

/**
 * Long-Horizon Memory Engine - orchestrates historical learning
 */
export class LongHorizonMemoryEngine {
  constructor(options = {}) {
    this.metricsStore = new HistoricalMetricsStore(options);
    this.patternLearner = new PatternLearner(options);
    this.stabilityScorer = new StabilityScorer(options);
    this.reliabilityModeler = new ReliabilityModeler(options);
    this.insights = [];
    this.maxInsights = options.maxInsights || 5000;
    this.debug = options.debug || false;
  }

  recordObservation(metricName, value) {
    this.metricsStore.recordMetric(metricName, value);
  }

  learnPatterns() {
    const patterns = [];

    for (const [metricName, history] of this.metricsStore.metrics) {
      const pattern = this.patternLearner.identifyPattern(metricName, history);
      if (pattern) {
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  scoreSystemStability(metrics) {
    return this.stabilityScorer.scoreStability(metrics);
  }

  buildReliabilityModels(componentFailures) {
    const models = [];

    for (const [componentId, failures] of Object.entries(componentFailures)) {
      const model = this.reliabilityModeler.buildModel(componentId, failures);
      if (model) models.push(model);
    }

    return models;
  }

  makePredictions(hoursAhead = 24) {
    const predictions = [];

    // Predict failures
    for (const [componentId] of this.reliabilityModeler.models) {
      const failurePrediction = this.reliabilityModeler.predictFailure(componentId, hoursAhead);
      if (failurePrediction) {
        predictions.push(failurePrediction);
      }
    }

    // Predict metric values
    for (const metricName of this.metricsStore.metrics.keys()) {
      const pattern = this.patternLearner.patterns.get(metricName);
      if (pattern) {
        const prediction = this.patternLearner.getPredictedValue(metricName, hoursAhead);
        if (prediction) {
          predictions.push(prediction);
        }
      }
    }

    return predictions;
  }

  generateInsight(title, description, data) {
    const insight = {
      id: `insight-${Date.now()}`,
      title,
      description,
      data,
      timestamp: Date.now()
    };

    this.insights.push(insight);
    if (this.insights.length > this.maxInsights) {
      this.insights.shift();
    }

    return insight;
  }

  getMemoryReport() {
    const patterns = this.patternLearner.getAllPatterns();
    const stabilityTrend = this.stabilityScorer.getTrendingStability();
    const reliabilityStats = this.reliabilityModeler.getModelStats();

    return {
      timestamp: Date.now(),
      patterns: patterns.length,
      detectedPatterns: patterns.map(p => p.type).join(', '),
      stabilityTrend,
      reliabilityModels: reliabilityStats,
      recentInsights: this.insights.slice(-5),
      metricsTracked: this.metricsStore.metrics.size
    };
  }
}

export default {
  HistoricalMetricsStore,
  PatternLearner,
  StabilityScorer,
  ReliabilityModeler,
  LongHorizonMemoryEngine
};
