import fs from 'fs';
import path from 'path';

class WeightTrainer {
  constructor(scorer, postMortem, config = {}) {
    this.scorer = scorer;
    this.postMortem = postMortem;
    this.config = {
      minSamples: 50,
      maxAdjustment: 0.05,
      trainInterval: 600_000,
      logDir: config.logDir || './logs/weight-training',
      ...config,
    };

    this.trainingHistory = [];
    this.interval = null;

    if (!fs.existsSync(this.config.logDir)) fs.mkdirSync(this.config.logDir, { recursive: true });
  }

  start() {
    if (this.interval) return;
    this.interval = setInterval(() => this.train(), this.config.trainInterval);
    console.log('🧠 Weight trainer started (every', this.config.trainInterval / 1000, 's)');
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  train() {
    try {
      const report = this.postMortem.getDiagnosticReport(3600_000);
      if (!report.summary || report.summary.totalAttempts < this.config.minSamples) return;

      const currentWeights = { ...this.scorer.config.weights };
      const adjustments = {};

      const lossReasons = report.breakdown?.lossReasons || {};
      const winReasons = report.breakdown?.winReasons || {};
      const byContention = report.breakdown?.byContentionLevel || {};

      const totalLosses = Object.values(lossReasons).reduce((s, v) => s + v, 0);
      const totalWins = Object.values(winReasons).reduce((s, v) => s + v, 0);
      if (totalLosses === 0) return;

      const outbidRate = (lossReasons['OUTBID'] || 0) / totalLosses;
      if (outbidRate > 0.3) {
        adjustments.gasEfficiency = this.config.maxAdjustment * outbidRate;
        adjustments.rawProfit = -this.config.maxAdjustment * outbidRate * 0.5;
      }

      const staleRate = (lossReasons['STALE_RESERVES'] || 0) / totalLosses;
      if (staleRate > 0.15) {
        adjustments.poolStaleness = this.config.maxAdjustment * staleRate * 2;
        adjustments.routeComplexity = -this.config.maxAdjustment * staleRate;
      }

      const soloWinRate = (byContention['SOLO']?.wins || 0) / Math.max(totalWins, 1);
      if (soloWinRate > 0.6) {
        adjustments.competitorRisk = -this.config.maxAdjustment * 0.5;
        adjustments.rawProfit = this.config.maxAdjustment * 0.3;
      }

      const frontrunRate = (lossReasons['FRONT_RUN'] || 0) / totalLosses;
      if (frontrunRate > 0.2) {
        adjustments.competitorRisk = this.config.maxAdjustment * frontrunRate;
      }

      if (report.summary.predictionAccuracy < 0.7) {
        adjustments.poolStaleness = (adjustments.poolStaleness || 0) + this.config.maxAdjustment * 0.5;
        adjustments.liquidityDepth = (adjustments.liquidityDepth || 0) + this.config.maxAdjustment * 0.5;
      }

      if (Object.keys(adjustments).length > 0) {
        const newWeights = this.applyAdjustments(currentWeights, adjustments);
        const entry = { timestamp: Date.now(), before: currentWeights, adjustments, after: newWeights, trigger: { totalAttempts: report.summary.totalAttempts } };
        this.trainingHistory.push(entry);
        Object.assign(this.scorer.config.weights, newWeights);
        fs.appendFileSync(path.join(this.config.logDir, 'weight-history.jsonl'), JSON.stringify(entry) + '\n');
        console.log('🧠 Weights adjusted:', this.formatChanges(currentWeights, newWeights));
      }

      if (this.trainingHistory.length > 1000) this.trainingHistory = this.trainingHistory.slice(-500);
    } catch (e) {
      console.error('WeightTrainer.train error', e.message);
    }
  }

  applyAdjustments(current, adjustments) {
    const result = { ...current };
    for (const [key, delta] of Object.entries(adjustments)) {
      if (result[key] !== undefined) result[key] = Math.max(0.01, result[key] + delta);
    }
    const sum = Object.values(result).reduce((s, v) => s + v, 0);
    if (sum > 0) for (const key of Object.keys(result)) result[key] = result[key] / sum;
    return result;
  }

  formatChanges(before, after) {
    const changes = [];
    for (const key of Object.keys(after)) {
      const delta = after[key] - (before[key] || 0);
      if (Math.abs(delta) > 0.001) {
        const arrow = delta > 0 ? '↑' : '↓';
        changes.push(`${key}: ${ (before[key] || 0).toFixed(3) } → ${ after[key].toFixed(3) } ${arrow}`);
      }
    }
    return changes.join(', ');
  }

  getDiagnostics() {
    return { totalTrainingCycles: this.trainingHistory.length, lastTraining: this.trainingHistory.at(-1) || null, currentWeights: { ...this.scorer.config.weights } };
  }
}

export default WeightTrainer;