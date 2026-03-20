import { performance } from 'perf_hooks';

export class HFTDecisionLoop {
  constructor(chambers, scorer, config = {}) {
    this.chambers = chambers;
    this.scorer = scorer;
    this.config = {
      maxCycleMs: 500,
      tickIntervalMs: 50,
      minScoreToExecute: 500,
      maxConcurrentScans: 50,
      reserveRefreshInterval: 30000,
      ...config,
    };

    this.state = {
      phase: 'IDLE',
      cycleCount: 0,
      lastCycleMs: 0,
      opportunitiesFound: 0,
      bundlesSubmitted: 0,
      bundlesLanded: 0,
      totalProfit: 0n,
      totalGas: 0n,
    };

    this.running = false;
    this.reserveLoop = null;
  }

  async start() {
    this.running = true;
    this.reserveLoop = this.startReserveLoop();
    await this.hotLoop();
  }

  stop() {
    this.running = false;
    if (this.reserveLoop) clearInterval(this.reserveLoop);
  }

  async startReserveLoop() {
    return setInterval(async () => {
      if (!this.running) return;
      try {
        await this.chambers.reserves.refreshAll();
      } catch (err) {
        console.warn('reserve refresh failed', err);
      }
    }, this.config.reserveRefreshInterval);
  }

  async hotLoop() {
    while (this.running) {
      const cycleStart = performance.now();
      this.state.phase = 'SNAPSHOT';

      const snapshot = await this.takeSnapshot();

      this.state.phase = 'SCAN';
      const opportunities = await this.scanOpportunities(snapshot);

      this.state.phase = 'SCORE';
      const scored = opportunities.map(op => ({ opportunity: op, scoring: this.scorer.score(op) }))
        .filter(s => s.scoring.score >= this.config.minScoreToExecute)
        .sort((a, b) => b.scoring.score - a.scoring.score);

      this.state.phase = 'EXECUTE';
      if (scored.length) {
        await this.executeBest(scored[0]);
      }

      this.state.phase = 'RECORD';
      this.recordCycle(snapshot, scored.length);

      const elapsed = performance.now() - cycleStart;
      this.state.lastCycleMs = elapsed;

      if (elapsed < this.config.tickIntervalMs) {
        await new Promise(r => setTimeout(r, this.config.tickIntervalMs - elapsed));
      }

      this.state.cycleCount++;
    }
  }

  async takeSnapshot() {
    const [pools, pendingBundles, gasPrice] = await Promise.all([
      this.chambers.reserves.getCachedPools(),
      this.chambers.executor.getPendingBundles?.() || [],
      this.chambers.gas.getLatestGasPrice?.() || 0n,
    ]);

    return { pools, pendingBundles, gasPrice, blockNumber: this.chambers.reserves.getLastBlock(), timestamp: Date.now() };
  }

  async scanOpportunities(snapshot) {
    const paths = this.chambers.graph.findAllPaths(snapshot.pools, { maxHops: 4, maxPaths: this.config.maxConcurrentScans, startTokens: ['WETH', 'USDC'] });
    const results = [];

    for (const path of paths) {
      const sim = await this.chambers.simulator.simulate(path, snapshot.pools);
      if (sim && sim.profit > 0n) {
        results.push({ path: sim.path, pools: sim.pools, expectedProfitWei: sim.profit, gasEstimate: sim.gasEstimate, gasTier: this.classifyGasTier(snapshot.gasPrice), recentlyArbed: this.wasRecentlyArbed(sim.path) });
      }
    }

    return results;
  }

  classifyGasTier(gasPrice) {
    const gwei = Number(gasPrice) / 1e9;
    if (gwei < 15) return 'LOW';
    if (gwei < 40) return 'MEDIUM';
    if (gwei < 100) return 'HIGH';
    return 'EXTREME';
  }

  async executeBest({ opportunity, scoring }) {
    if (this.circuitBreaker?.isTripped?.()) {
      this.emit('breakerTripped', { opportunity });
      return null;
    }
    if (scoring.recommendation === 'SKIP') return null;
    if (scoring.recommendation === 'MONITOR') return null;

    const bundle = await this.chambers.executor.buildBundle(opportunity, { gasStrategy: scoring.gasStrategy, scoring });
    const simResult = await this.chambers.executor.simulateBundle(bundle);

    if (!simResult.success) return null;

    const netProfit = simResult.profit - bundle.gasCost;
    if (netProfit <= 0n) return null;

    const submission = await this.chambers.executor.submitBundle(bundle);
    if (submission?.result?.successful) {
      this.state.bundlesLanded += 1;
      this.state.totalProfit += netProfit;
      this.state.totalGas += bundle.gasCost;
    }

    this.state.bundlesSubmitted += 1;
    return submission;
  }

  wasRecentlyArbed(path) {
    return false;
  }

  recordCycle(snapshot, count) {
    this.state.opportunitiesFound += count;
  }
}
