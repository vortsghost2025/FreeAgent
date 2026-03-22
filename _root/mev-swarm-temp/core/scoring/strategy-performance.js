/**
 * strategy-performance.js
 * Track per-strategy performance and expose a dynamic weight computation.
 */

export class StrategyPerformance {
  constructor(config = {}) {
    this.config = {
      strategies: ['solo', 'contested', 'crowded'],
      smoothing: 0.1,
      minWeight: 0.01,
      ...config
    };

    this.stats = {};
    for (const s of this.config.strategies) this.stats[s] = { attempts: 0, wins: 0, totalProfit: 0n, totalGasLost: 0n, weight: 1.0 };
  }

  recordAttempt(strategy, result) {
    if (!this.stats[strategy]) this.stats[strategy] = { attempts: 0, wins: 0, totalProfit: 0n, totalGasLost: 0n, weight: 1.0 };
    const stat = this.stats[strategy];
    stat.attempts++;
    if (result.status === 'LANDED') { stat.wins++; stat.totalProfit += BigInt(result.actualNetProfit || 0n); }
    else { stat.totalGasLost += BigInt(result.actualGasCost || 0n); }
    // Update weight
    stat.weight = this.computeWeight(stat);
  }

  computeWeight(stat) {
    if (stat.attempts === 0) return 1.0;
    const winRate = stat.wins / stat.attempts;
    const avgProfit = stat.wins > 0 ? Number(stat.totalProfit / BigInt(Math.max(1, stat.wins))) / 1e18 : 0;
    const raw = winRate * avgProfit;
    // Smooth with previous weight
    const prev = stat.weight || 1.0;
    const newW = prev * (1 - this.config.smoothing) + raw * this.config.smoothing;
    return Math.max(this.config.minWeight, newW);
  }

  getWeightFor(strategy) {
    return this.stats[strategy]?.weight ?? 1.0;
  }

  exportStats() {
    const out = {};
    for (const k of Object.keys(this.stats)) out[k] = { ...this.stats[k], totalProfitEth: Number(this.stats[k].totalProfit) / 1e18 };
    return out;
  }
}

export default StrategyPerformance;
