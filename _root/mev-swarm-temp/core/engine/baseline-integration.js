import { EventEmitter } from 'events';
import { ethers } from 'ethers';

/**
 * Bridges historical-baseline-launcher.js into the HFT decision loop.
 *
 * When BASELINE_EXECUTE=false: runs in inspect mode (what you have now)
 * When BASELINE_EXECUTE=true:  feeds into HFT loop for live execution
 */
export class BaselineIntegration extends EventEmitter {
  constructor(orchestrator, config = {}) {
    super();
    this.orchestrator = orchestrator;
    this.config = {
      dryRun: config.dryRun ?? true,
      liveTrading: config.liveTrading ?? false,
      baselineExecute: config.baselineExecute ?? false,
      // How long to wait for baseline data before timing out
      baselineTimeoutMs: 10_000,
      ...config
    };

    this.baselineState = {
      opportunities: [],
      lastBaselineRun: 0,
      totalRuns: 0,
      totalPromoted: 0,
    };
  }

  /**
   * Run the baseline launcher in the mode you've already built,
   * but now feed results into the HFT loop
   */
  async runBaselineCycle(snapshot) {
    this.baselineState.totalRuns++;

    // Phase 1: Collect opportunities (your existing flow)
    const rawOpportunities = await this.collectFromBaseline(snapshot);

    if (rawOpportunities.length === 0) {
      this.emit('baselineEmpty', { run: this.baselineState.totalRuns });
      return null;
    }

    // Phase 2: Feed into orchestrator's scoring pipeline
    const scored = [];
    for (const opp of rawOpportunities) {
      const scoring = this.orchestrator.scorer.score(opp);
      const contention = this.orchestrator.contentionTracker?.getPathContention(
        opp.pathSignature
      ) || { level: 'SOLO' };

      scored.push({ opportunity: opp, scoring, contention });
    }

    // Phase 3: Executive decision
    const actionable = scored.filter(s => {
      if (s.scoring.recommendation === 'SKIP') return false;
      if (s.contention.level === 'CROWDED_HOSTILE') return false;
      if (s.scoring.score < 500) return false;
      return true;
    });

    actionable.sort((a, b) => b.scoring.score - a.scoring.score);

    // Phase 4: Execute (or simulate if dry run)
    const results = [];
    for (const { opportunity, scoring, contention } of actionable.slice(0, 3)) {
      const result = await this.executeOrSimulate(opportunity, scoring, contention);
      results.push(result);

      // Phase 5: Feed outcome to post-mortem
      this.orchestrator.postMortem?.classify(result);

      // Phase 6: Update scorer with outcome
      this.orchestrator.scorer.recordOutcome(
        opportunity,
        scoring.score,
        result.status === 'LANDED',
        result.actualGasCost
      );
    }

    this.baselineState.totalPromoted += actionable.length;
    this.baselineState.lastBaselineRun = Date.now();

    return {
      run: this.baselineState.totalRuns,
      rawCount: rawOpportunities.length,
      scoredCount: scored.length,
      actionableCount: actionable.length,
      executed: results.length,
      results,
    };
  }

  /**
   * Collect opportunities from baseline launcher output
   * This wraps your existing historical-baseline-launcher.js
   */
  async collectFromBaseline(snapshot) {
    // In inspect mode, the baseline launcher logs to console/stdout
    // In execute mode, it returns structured data
    //
    // This adapter parses baseline output into the opportunity format
    // your scorer and executor expect

    const opportunities = [];

    // Read from your existing baseline data sources
    const pools = snapshot.pools || [];
    const startTokens = ['WETH', 'USDC', 'DAI', 'WBTC'];

    // Use the graph engine to find paths (same as baseline launcher does)
    const graphEngine = this.orchestrator.chambers?.graph;
    if (!graphEngine) return opportunities;

    for (const startToken of startTokens) {
      const paths = graphEngine.findPathsFrom(startToken, pools, {
        maxHops: 4,
        endToken: startToken, // Circular arb
      });

      for (const path of paths) {
        const simulated = this.orchestrator.chambers?.simulator?.simulate(path, pools);
        if (simulated && simulated.profit > 0n) {
          opportunities.push({
            pathSignature: this.computePathSignature(path),
            path: path.pools,
            tokens: path.tokens,
            pools: path.pools.map(p => ({
              address: p.address,
              version: p.version,
              reserve0: p.reserve0,
              reserve1: p.reserve1,
              lastUpdate: p.lastUpdate,
            })),
            expectedProfit: simulated.profit,
            gasEstimate: simulated.gasEstimate,
            startToken,
            source: 'baseline',
            timestamp: Date.now(),
          });
        }
      }
    }

    return opportunities;
  }

  /**
   * Execute or simulate based on configuration
   */
  async executeOrSimulate(opportunity, scoring, contention) {
    const gasStrategy = scoring.gasStrategy;
    const gasMultiplier = contention.recommendation?.gasMultiplier || 1.0;

    const result = {
      attemptId: `bl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      pathSignature: opportunity.pathSignature,
      tokens: opportunity.tokens,
      pools: opportunity.pools,
      predictedProfit: opportunity.expectedProfit,
      predictedGasCost: opportunity.gasEstimate * BigInt(Math.round(gasMultiplier * 1e9)),
      predictedNetProfit: opportunity.expectedProfit - (opportunity.gasEstimate * BigInt(Math.round(gasMultiplier * 1e9))),
      score: scoring.score,
      contentionLevel: contention.level,
      gasStrategy,
      timestamp: Date.now(),
    };

    if (this.config.dryRun || !this.config.liveTrading) {
      // Simulate only
      result.status = 'SIMULATED';
      result.actualProfit = result.predictedProfit;
      result.actualGasCost = 0n;
      result.actualNetProfit = result.predictedProfit;
      this.emit('simulated', result);
      return result;
    }

    // Live execution path
    try {
      const bundle = await this.orchestrator.chambers?.executor?.buildBundle(
        opportunity,
        { gasStrategy, gasMultiplier }
      );

      if (!bundle) {
        result.status = 'FAILED_BUILD';
        result.revertReason = 'Bundle construction failed';
        return result;
      }

      const simResult = await this.orchestrator.chambers?.executor?.simulateBundle(bundle);

      if (!simResult?.success) {
        result.status = 'FAILED_SIM';
        result.revertReason = simResult?.error || 'Simulation reverted';
        return result;
      }

      const submission = await this.orchestrator.chambers?.executor?.submitBundle(bundle);
      result.txHash = submission?.txHash;
      result.status = 'SUBMITTED';
      result.gasPriceUsed = bundle.gasPrice;

      // Outcome is tracked asynchronously via receipts
      this.emit('submitted', result);

    } catch (err) {
      result.status = 'FAILED_SUBMIT';
      result.revertReason = err.message;
      this.emit('error', { result, error: err.message });
    }

    return result;
  }

  computePathSignature(path) {
    const tokens = path.tokens || path.map?.(p => p.token0 || p.address) || [];
    return [...new Set(tokens)].sort().join('-');
  }
}