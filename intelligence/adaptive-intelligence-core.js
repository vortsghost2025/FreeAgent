// Adaptive Intelligence Core
// Handles continuous observation, pattern detection, anomaly detection, trend analysis, predictive scoring

export class AdaptiveIntelligenceCore {
  constructor() {
    this.metrics = [];
    this.patterns = [];
    this.anomalies = [];
    this.trends = [];
    this.predictions = [];
  }

  observe(metric) {
    this.metrics.push(metric);
    this._detectPatterns();
    this._detectAnomalies();
    this._analyzeTrends();
    this._predict();
  }

  _detectPatterns() {
    // Simple pattern detection: look for repeated metric names
    const counts = {};
    for (const m of this.metrics) {
      counts[m.name] = (counts[m.name] || 0) + 1;
    }
    this.patterns = Object.entries(counts).filter(([_, c]) => c > 2).map(([name]) => name);
  }

  _detectAnomalies() {
    // Improved anomaly: value > 3x mean of previous values (excluding itself)
    const byName = {};
    for (const m of this.metrics) {
      if (!byName[m.name]) byName[m.name] = [];
      byName[m.name].push(m.value);
    }
    this.anomalies = [];
    for (const name in byName) {
      const vals = byName[name];
      for (let i = 1; i < vals.length; ++i) {
        const mean = vals.slice(0, i).reduce((a, b) => a + b, 0) / i;
        if (mean > 0 && vals[i] > 3 * mean) {
          this.anomalies.push({ name, value: vals[i], idx: i });
        }
      }
    }
  }

  _analyzeTrends() {
    // Simple trend: increasing or decreasing for each metric
    const trends = {};
    for (const m of this.metrics) {
      if (!trends[m.name]) trends[m.name] = [];
      trends[m.name].push(m.value);
    }
    this.trends = Object.entries(trends).map(([name, vals]) => {
      if (vals.length < 3) return { name, trend: 'flat' };
      const diff = vals[vals.length - 1] - vals[0];
      return { name, trend: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat' };
    });
  }

  _predict() {
    // Simple prediction: if trend is up, predict next value is higher
    this.predictions = this.trends.map(t => ({
      name: t.name,
      prediction: t.trend === 'up' ? 'increase' : t.trend === 'down' ? 'decrease' : 'stable'
    }));
  }

  getState() {
    return {
      patterns: this.patterns,
      anomalies: this.anomalies,
      trends: this.trends,
      predictions: this.predictions
    };
  }
}
