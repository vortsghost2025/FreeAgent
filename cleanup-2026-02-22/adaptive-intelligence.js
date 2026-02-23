/**
 * Phase 5.1: Adaptive Intelligence Core
 * Continuous observation, pattern detection, anomaly detection, trend analysis, predictive scoring
 * The "brainstem" of the system's intelligence layer
 */

/**
 * Pattern Detector - identifies recurring patterns in system behavior
 */
export class PatternDetector {
  constructor(options = {}) {
    this.patterns = new Map();
    this.timeSeries = new Map();
    this.windowSize = options.windowSize || 100;
    this.sensitivity = options.sensitivity || 0.8;
    this.debug = options.debug || false;
  }

  recordObservation(metricName, value) {
    if (!this.timeSeries.has(metricName)) {
      this.timeSeries.set(metricName, []);
    }
    const series = this.timeSeries.get(metricName);
    series.push({ value, timestamp: Date.now() });
    if (series.length > this.windowSize) series.shift();
  }

  detectPatterns(metricName) {
    const series = this.timeSeries.get(metricName);
    if (!series || series.length < 10) return [];

    const values = series.map(s => s.value);
    const patterns = [];

    // Detect trending pattern
    const trend = this._detectTrend(values);
    if (trend) patterns.push(trend);

    // Detect cyclical pattern
    const cycle = this._detectCycle(values);
    if (cycle) patterns.push(cycle);

    // Detect spike pattern
    const spikes = this._detectSpikes(values);
    if (spikes.length > 0) patterns.push(...spikes);

    return patterns;
  }

  _detectTrend(values) {
    const recent = values.slice(-10);
    const older = values.slice(-20, -10);

    const recentAvg = recent.reduce((a, b) => a + b) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b) / older.length;

    if (recentAvg > olderAvg * 1.2) {
      return { type: 'UPTREND', severity: ((recentAvg - olderAvg) / olderAvg).toFixed(2) };
    } else if (recentAvg < olderAvg * 0.8) {
      return { type: 'DOWNTREND', severity: ((olderAvg - recentAvg) / olderAvg).toFixed(2) };
    }
    return null;
  }

  _detectCycle(values) {
    if (values.length < 20) return null;
    // Simplified cycle detection
    return null;
  }

  _detectSpikes(values) {
    const avg = values.reduce((a, b) => a + b) / values.length;
    const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length);

    const spikes = [];
    values.forEach((v, i) => {
      if (v > avg + stdDev * 3) {
        spikes.push({ type: 'SPIKE', index: i, severity: ((v - avg) / avg).toFixed(2) });
      }
    });
    return spikes;
  }
}

/**
 * Anomaly Detector - identifies abnormal system behavior
 */
export class AnomalyDetector {
  constructor(options = {}) {
    this.baselines = new Map();
    this.anomalies = [];
    this.sensitivity = options.sensitivity || 0.85;
    this.maxAnomalies = options.maxAnomalies || 1000;
    this.debug = options.debug || false;
  }

  establishBaseline(metricName, values) {
    const avg = values.reduce((a, b) => a + b) / values.length;
    const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length);

    this.baselines.set(metricName, { avg, stdDev, established: Date.now() });
  }

  detectAnomaly(metricName, value) {
    const baseline = this.baselines.get(metricName);
    if (!baseline) return null;

    const zScore = Math.abs((value - baseline.avg) / baseline.stdDev);
    const threshold = -Math.log(1 - this.sensitivity);

    if (zScore > threshold) {
      const anomaly = {
        metric: metricName,
        value,
        zScore: zScore.toFixed(2),
        baseline: baseline.avg.toFixed(2),
        timestamp: Date.now(),
        severity: Math.min(100, zScore * 10)
      };

      this.anomalies.push(anomaly);
      if (this.anomalies.length > this.maxAnomalies) this.anomalies.shift();

      return anomaly;
    }
    return null;
  }

  getRecentAnomalies(count = 10) {
    return this.anomalies.slice(-count);
  }
}

/**
 * Trend Analyzer - analyzes long-term trends and trajectories
 */
export class TrendAnalyzer {
  constructor(options = {}) {
    this.trends = new Map();
    this.forecastWindow = options.forecastWindow || 10;
    this.debug = options.debug || false;
  }

  analyzeTrend(metricName, values) {
    if (values.length < 5) return null;

    // Linear regression
    const n = values.length;
    const sumX = n * (n - 1) / 2;
    const sumY = values.reduce((a, b) => a + b);
    const sumXY = values.reduce((sum, v, i) => sum + (i * v), 0);
    const sumX2 = n * (n - 1) * (2 * n - 1) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const trend = {
      metric: metricName,
      slope: slope.toFixed(4),
      direction: slope > 0 ? 'UP' : slope < 0 ? 'DOWN' : 'STABLE',
      strength: Math.abs(slope).toFixed(4),
      forecast: this._forecast(slope, intercept, this.forecastWindow)
    };

    this.trends.set(metricName, trend);
    return trend;
  }

  _forecast(slope, intercept, window) {
    const forecast = [];
    const baseValue = intercept;
    for (let i = 1; i <= window; i++) {
      forecast.push((baseValue + slope * i).toFixed(2));
    }
    return forecast;
  }

  getTrend(metricName) {
    return this.trends.get(metricName) || null;
  }
}

/**
 * Predictive Scorer - predicts system behavior and assigns scores
 */
export class PredictiveScorer {
  constructor(options = {}) {
    this.predictions = [];
    this.scoreHistory = [];
    this.maxHistory = options.maxHistory || 1000;
    this.debug = options.debug || false;
  }

  scoreMetric(metricName, currentValue, baseline, trend) {
    let score = 100;

    // Deviation from baseline
    if (baseline) {
      const deviation = Math.abs(currentValue - baseline) / baseline;
      score -= Math.min(50, deviation * 100);
    }

    // Trend analysis
    if (trend && trend.direction === 'UP' && trend.strength) {
      score -= Math.min(20, Math.abs(parseFloat(trend.strength)) * 10);
    }

    score = Math.max(0, Math.min(100, score));

    const prediction = {
      metric: metricName,
      score: score.toFixed(1),
      timestamp: Date.now(),
      currentValue,
      baseline,
      trend: trend ? trend.direction : 'UNKNOWN'
    };

    this.predictions.push(prediction);
    if (this.predictions.length > this.maxHistory) this.predictions.shift();

    return prediction;
  }

  predictFailure(metrics) {
    let failureRisk = 0;
    let factors = [];

    for (const [name, value] of Object.entries(metrics)) {
      if (value > 0.8) {
        failureRisk += 0.2;
        factors.push(name);
      }
    }

    return {
      failureRisk: Math.min(100, failureRisk * 100),
      riskFactors: factors,
      recommendation: failureRisk > 0.5 ? 'IMMEDIATE_ACTION' : 'MONITOR'
    };
  }
}

/**
 * Adaptive Intelligence Engine
 * Orchestrates pattern detection, anomaly detection, trend analysis, and predictive scoring
 */
export class AdaptiveIntelligenceEngine {
  constructor(options = {}) {
    this.patternDetector = new PatternDetector(options);
    this.anomalyDetector = new AnomalyDetector(options);
    this.trendAnalyzer = new TrendAnalyzer(options);
    this.predictiveScorer = new PredictiveScorer(options);
    this.intelligenceLog = [];
    this.maxLogSize = options.maxLogSize || 5000;
    this.debug = options.debug || false;
  }

  initialize(metrics = {}) {
    for (const [name, values] of Object.entries(metrics)) {
      if (Array.isArray(values) && values.length > 10) {
        this.anomalyDetector.establishBaseline(name, values);
      }
    }
    return { success: true, baselinesEstablished: Object.keys(metrics).length };
  }

  observeMetric(metricName, value) {
    this.patternDetector.recordObservation(metricName, value);

    const anomaly = this.anomalyDetector.detectAnomaly(metricName, value);
    if (anomaly) {
      this._logIntelligence({ type: 'ANOMALY_DETECTED', anomaly });
    }
  }

  analyze(metricName, values) {
    const patterns = this.patternDetector.detectPatterns(metricName);
    const trend = this.trendAnalyzer.analyzeTrend(metricName, values);
    const baseline = this.anomalyDetector.baselines.get(metricName);

    const score = this.predictiveScorer.scoreMetric(
      metricName,
      values[values.length - 1],
      baseline ? baseline.avg : null,
      trend
    );

    return {
      metric: metricName,
      patterns,
      trend,
      score,
      anomalies: this.anomalyDetector.getRecentAnomalies(3)
    };
  }

  predictSystemState(allMetrics) {
    const failurePrediction = this.predictiveScorer.predictFailure(allMetrics);
    const scores = [];

    for (const [name, value] of Object.entries(allMetrics)) {
      const trend = this.trendAnalyzer.getTrend(name);
      const score = this.predictiveScorer.scoreMetric(name, value, null, trend);
      scores.push(score);
    }

    return {
      timestamp: Date.now(),
      failurePrediction,
      metricScores: scores,
      systemHealthScore: (scores.reduce((a, b) => a + parseFloat(b.score), 0) / scores.length).toFixed(1),
      recommendation: failurePrediction.recommendation
    };
  }

  _logIntelligence(entry) {
    this.intelligenceLog.push({ ...entry, timestamp: Date.now() });
    if (this.intelligenceLog.length > this.maxLogSize) this.intelligenceLog.shift();
  }

  getIntelligenceReport() {
    return {
      recentInsights: this.intelligenceLog.slice(-20),
      anomalies: this.anomalyDetector.getRecentAnomalies(10),
      trends: Array.from(this.trendAnalyzer.trends.values()).slice(-5),
      predictions: this.predictiveScorer.predictions.slice(-10)
    };
  }
}

export default {
  PatternDetector,
  AnomalyDetector,
  TrendAnalyzer,
  PredictiveScorer,
  AdaptiveIntelligenceEngine
};
