import fs from 'fs';
import path from 'path';

export class PostMortemClassifier {
  constructor(config = {}) {
    this.config = {
      logDir: config.logDir || './logs/post-mortems',
      maxEntriesInMemory: 10_000,
      writeInterval: 30_000,
      ...config
    };

    this.attempts = [];
    this.flushInterval = setInterval(() => this.flush(), this.config.writeInterval);

    if (!fs.existsSync(this.config.logDir)) fs.mkdirSync(this.config.logDir, { recursive: true });

    this.stats = { total: 0, wins: 0, losses: 0, byReason: {}, byContentionLevel: {}, avgProfitError: 0, runningProfitErrorSum: 0 };
  }

  classify(attempt) {
    const classified = {
      attemptId: attempt.attemptId || this.generateId(),
      timestamp: Date.now(),
      txHash: attempt.txHash,
      blockNumber: attempt.blockNumber,
      pathSignature: attempt.pathSignature,
      tokens: attempt.tokens,
      pools: attempt.pools,
      predictedProfit: attempt.predictedProfit,
      predictedGasCost: attempt.predictedGasCost,
      predictedNetProfit: attempt.predictedNetProfit,
      actualProfit: attempt.actualProfit,
      actualGasCost: attempt.actualGasCost,
      actualNetProfit: attempt.actualNetProfit,
      profitError: null,
      score: attempt.score,
      contentionLevel: attempt.contentionLevel,
      gasStrategy: attempt.gasStrategy,
      gasPriceUsed: attempt.gasPriceUsed,
      gasUsed: attempt.gasUsed,
      status: attempt.status,
      revertReason: attempt.revertReason,
      flashbotsResponse: attempt.flashbotsResponse,
      wonBy: null,
      lostBy: null,
      tags: [],
      rootCause: null,
      severity: null,
    };

    if (classified.actualNetProfit !== null && classified.actualNetProfit !== undefined) {
      classified.profitError = classified.predictedNetProfit - classified.actualNetProfit;
      this.stats.runningProfitErrorSum += Number(classified.profitError || 0n);
    }

    if (classified.status === 'LANDED') this.classifyWin(classified); else this.classifyLoss(classified);

    this.attempts.push(classified);
    this.updateStats(classified);

    if (this.attempts.length > this.config.maxEntriesInMemory) this.flush();
    return classified;
  }

  classifyWin(classified) {
    classified.wonBy = this.determineWinReason(classified);
    classified.severity = 'INFO';
    switch (classified.wonBy) {
      case 'SOLO_LANE': classified.tags = ['no_competition', 'efficient']; classified.rootCause = 'No competing txs on this path'; break;
      case 'GAS_DOMINANCE': classified.tags = ['aggressive_gas', 'paid_premium']; classified.rootCause = `Won via gas premium: ${this.formatGasDiff(classified)}`; break;
      case 'BUNDLE_PRIORITY': classified.tags = ['flashbots', 'bundle_lane']; classified.rootCause = 'Won via Flashbots bundle priority'; break;
      case 'SPEED': classified.tags = ['fast_detection', 'low_latency']; classified.rootCause = 'Detected and submitted faster than competitors'; break;
      case 'ROUTING_ADVANTAGE': classified.tags = ['better_path', 'routing_edge']; classified.rootCause = 'Found a more efficient route than competitors'; break;
      default: classified.tags = ['uncategorized_win']; classified.rootCause = 'Won but reason unclear — review manually';
    }
  }

  classifyLoss(classified) {
    classified.lostBy = this.determineLossReason(classified);
    classified.severity = this.getLossSeverity(classified.lostBy);
    switch (classified.lostBy) {
      case 'OUTBID': classified.tags = ['gas_competition', 'outbid']; classified.rootCause = `Competitor paid higher gas. Target: ${this.formatGas(classified.gasPriceUsed)}`; break;
      case 'FRONT_RUN': classified.tags = ['frontrun', 'sandwich_risk']; classified.rootCause = 'Competitor executed same arb first (same block)'; break;
      case 'STALE_RESERVES': classified.tags = ['data_staleness', 'reserve_drift']; classified.rootCause = 'Pool reserves changed between scan and execution'; break;
      case 'SLIPPAGE_EXCEEDED': classified.tags = ['slippage', 'price_impact']; classified.rootCause = 'Slippage exceeded tolerance. Actual price impact too high.'; break;
      case 'GAS_EXHAUSTED': classified.tags = ['gas_limit', 'oog']; classified.rootCause = 'Transaction ran out of gas (estimate too low)'; break;
      case 'SIMULATION_FAILED': classified.tags = ['sim_failure', 'pre_check']; classified.rootCause = classified.revertReason || 'Bundle simulation reverted'; break;
      case 'BUNDLE_NOT_INCLUDED': classified.tags = ['flashbots_reject', 'bundle_timing']; classified.rootCause = 'Flashbots bundle was not included in block'; break;
      case 'PROFIT_ERODED': classified.tags = ['gas_eaten_profit', 'unprofitable']; classified.rootCause = 'Gas cost exceeded profit margin at execution time'; break;
      case 'CONTENTION_TIMEOUT': classified.tags = ['timeout', 'race_condition']; classified.rootCause = 'Could not resolve contention within time window'; break;
      case 'SKIPPED_HOSTILE': classified.tags = ['circuit_breaker', 'risk_avoidance']; classified.rootCause = 'Skipped due to CROWDED_HOSTILE contention'; break;
      case 'SUBMISSION_ERROR': classified.tags = ['infrastructure', 'rpc_error']; classified.rootCause = classified.revertReason || 'RPC or network error during submission'; break;
      default: classified.tags = ['unknown_failure']; classified.rootCause = 'Unknown failure — needs manual review'; classified.severity = 'CRITICAL';
    }
  }

  determineWinReason(classified) {
    if (classified.contentionLevel === 'SOLO') return 'SOLO_LANE';
    if (classified.gasStrategy === 'AGGRESSIVE' && classified.contentionLevel !== 'SOLO') return 'GAS_DOMINANCE';
    if (classified.gasStrategy === 'BUNDLE') return 'BUNDLE_PRIORITY';
    if (classified.profitError && classified.profitError < 0n) return 'ROUTING_ADVANTAGE';
    return 'SPEED';
  }

  determineLossReason(classified) {
    switch (classified.status) {
      case 'FAILED_SIM': return 'SIMULATION_FAILED';
      case 'REVERTED': if (classified.revertReason?.includes('slippage') || classified.revertReason?.includes('INSUFFICIENT')) return 'SLIPPAGE_EXCEEDED'; if (classified.revertReason?.includes('gas') || classified.gasUsed >= classified.gasLimit) return 'GAS_EXHAUSTED'; return 'FRONT_RUN';
      case 'LOST_BID': if (classified.contentionLevel === 'CROWDED' || classified.contentionLevel === 'CROWDED_HOSTILE') return 'OUTBID'; return 'BUNDLE_NOT_INCLUDED';
      case 'TIMED_OUT': if (classified.contentionLevel !== 'SOLO') return 'CONTENTION_TIMEOUT'; return 'STALE_RESERVES';
      case 'SKIPPED': if (classified.contentionLevel === 'CROWDED_HOSTILE') return 'SKIPPED_HOSTILE'; return 'PROFIT_ERODED';
      case 'FAILED_SUBMIT': return 'SUBMISSION_ERROR';
      default: return 'SIMULATION_FAILED';
    }
  }

  getLossSeverity(lostBy) {
    const critical = ['STALE_RESERVES', 'GAS_EXHAUSTED', 'SUBMISSION_ERROR'];
    const warning = ['OUTBID', 'FRONT_RUN', 'BUNDLE_NOT_INCLUDED'];
    const info = ['PROFIT_ERODED', 'SKIPPED_HOSTILE', 'SIMULATION_FAILED', 'SLIPPAGE_EXCEEDED'];
    if (critical.includes(lostBy)) return 'CRITICAL';
    if (warning.includes(lostBy)) return 'WARNING';
    if (info.includes(lostBy)) return 'INFO';
    return 'INFO';
  }

  getDiagnosticReport(windowMs = 3600_000) {
    const cutoff = Date.now() - windowMs;
    const recent = this.attempts.filter(a => a.timestamp > cutoff);
    if (recent.length === 0) return { period: windowMs, attempts: 0, message: 'No data in window' };
    const wins = recent.filter(a => a.status === 'LANDED');
    const losses = recent.filter(a => a.status !== 'LANDED' && a.status !== 'SKIPPED');
    const skipped = recent.filter(a => a.status === 'SKIPPED');
    const lossReasons = {};
    for (const loss of losses) lossReasons[loss.lostBy] = (lossReasons[loss.lostBy] || 0) + 1;
    const winReasons = {};
    for (const win of wins) winReasons[win.wonBy] = (winReasons[win.wonBy] || 0) + 1;
    const totalPredictedProfit = wins.reduce((s, w) => s + (w.predictedNetProfit || 0n), 0n);
    const totalActualProfit = wins.reduce((s, w) => s + (w.actualNetProfit || 0n), 0n);
    const totalGasSpent = recent.reduce((s, a) => s + (a.actualGasCost || 0n), 0n);
    const byContention = {};
    for (const a of recent) { const level = a.contentionLevel || 'UNKNOWN'; if (!byContention[level]) byContention[level] = { total: 0, wins: 0 }; byContention[level].total++; if (a.status === 'LANDED') byContention[level].wins++; }
    const report = {
      period: windowMs,
      summary: {
        totalAttempts: recent.length,
        wins: wins.length,
        losses: losses.length,
        skipped: skipped.length,
        winRate: wins.length / (wins.length + losses.length) || 0,
        totalPredictedProfitWei: totalPredictedProfit.toString(),
        totalActualProfitWei: totalActualProfit.toString(),
        totalGasSpentWei: totalGasSpent.toString(),
        netProfitWei: (totalActualProfit - totalGasSpent).toString(),
        predictionAccuracy: totalPredictedProfit > 0n ? Number(totalActualProfit * 100n / totalPredictedProfit) / 100 : 0,
      },
      breakdown: { winReasons, lossReasons, byContentionLevel: byContention },
      recommendations: [],
    };
    if ((lossReasons['OUTBID'] || 0) > (losses.length * 0.3)) report.recommendations.push({ type: 'GAS_STRATEGY', priority: 'HIGH', message: `${lossReasons['OUTBID']} losses from outbidding. Consider raising gas multiplier for CONTESTED paths.`, action: 'Increase gasStrategy multiplier for CONTESTED contention level' });
    if ((lossReasons['STALE_RESERVES'] || 0) > 2) report.recommendations.push({ type: 'RESERVE_REFRESH', priority: 'HIGH', message: 'Multiple losses from stale reserves. Increase refresh frequency.', action: 'Decrease reserveRefreshInterval to 15_000ms or less' });
    if ((lossReasons['FRONT_RUN'] || 0) > 2) report.recommendations.push({ type: 'LATENCY', priority: 'HIGH', message: 'Getting frontrun on same-block arb attempts.', action: 'Reduce scan-to-submit latency, consider private mempool' });
    if (skipped.length > (recent.length * 0.5)) report.recommendations.push({ type: 'AGGRESSION', priority: 'MEDIUM', message: `${skipped.length}/${recent.length} attempts skipped. May be too conservative.`, action: 'Review CROWDED_HOSTILE thresholds — some may be profitable' });
    if (report.summary.predictionAccuracy < 0.7) report.recommendations.push({ type: 'SIMULATION', priority: 'MEDIUM', message: `Prediction accuracy ${(report.summary.predictionAccuracy * 100).toFixed(1)}% — simulation model drift.`, action: 'Review gas estimation and slippage calculation models' });
    return report;
  }

  flush() {
    if (this.attempts.length === 0) return;
    const filename = `post-mortem-${new Date().toISOString().slice(0, 10)}.jsonl`;
    const filepath = path.join(this.config.logDir, filename);
    const lines = this.attempts.map(a => JSON.stringify(a)).join('\n') + '\n';
    fs.appendFileSync(filepath, lines);
    const report = this.getDiagnosticReport();
    fs.writeFileSync(path.join(this.config.logDir, 'latest-report.json'), JSON.stringify(report, null, 2));
    this.attempts = [];
  }

  updateStats(classified) {
    this.stats.total++;
    if (classified.status === 'LANDED') this.stats.wins++; else if (classified.status !== 'SKIPPED') this.stats.losses++;
    const reason = classified.lostBy || classified.wonBy || 'UNKNOWN'; this.stats.byReason[reason] = (this.stats.byReason[reason] || 0) + 1;
    const level = classified.contentionLevel || 'UNKNOWN'; this.stats.byContentionLevel[level] = (this.stats.byContentionLevel[level] || 0) + 1;
    if (this.stats.total > 0) this.stats.avgProfitError = this.stats.runningProfitErrorSum / this.stats.total;
  }

  formatGas(price) { return `${(Number(price) / 1e9).toFixed(1)} gwei`; }
  formatGasDiff(classified) { return 'above competition'; }
  generateId() { return `pm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

  destroy() { this.flush(); clearInterval(this.flushInterval); }
}

export default PostMortemClassifier;
