import { ReserveCache } from '../data/reserve-cache.js';
import { MempoolStream } from '../data/mempool-stream.js';
import { CompetitionScorer } from '../scoring/competition-scorer.js';
import { HFTDecisionLoop } from './hft-loop.js';
import { CircuitBreaker } from '../../circuit-breaker.js';
import { SAFETY_CONFIG as safetyConfig } from '../../safety-config.js';
import { MempoolContentionTracker } from '../data/mempool-contention-tracker.js';
import PostMortemClassifier from '../analysis/post-mortem-classifier.js';
import ProposalAggregator from './proposal-aggregator.js';
import StrategyPerformance from '../scoring/strategy-performance.js';
import WeightTrainer from '../learning/weight-trainer.js';

export class Orchestrator {
  constructor(config = {}) {
    this.config = config;
    this.breaker = new CircuitBreaker();

    const provider = config.provider;
    this.chambers = {
      reserves: new ReserveCache(provider, config.poolAddresses, config.reserveRefreshInterval),
      mempool: new MempoolStream(provider, config.watchedSelectors),
      gas: { getLatestGasPrice: async () => (await provider.getFeeData()).gasPrice || 0n },
      graph: config.graphEngine,
      simulator: config.simulator,
      executor: config.executor,
    };

    this.scorer = new CompetitionScorer(config.scorer);
    this.loop = new HFTDecisionLoop(this.chambers, this.scorer, config.loop);

    // Full components
    this.contentionTracker = new MempoolContentionTracker();
    this.postMortem = new PostMortemClassifier({ logDir: './logs/post-mortems' });
    this.aggregator = new ProposalAggregator({ maxAnalysts: config.maxAnalysts || 4 });
    this.strategyPerf = new StrategyPerformance();
    this.trainer = new WeightTrainer(this.scorer, this.postMortem, { logDir: config.weightLogDir || './logs/weight-training', minSamples: config.minTrainerSamples || 50 });
  }

  async start() {
    await this.chambers.reserves.refreshAll();
    await this.chambers.mempool.connect();
    this.chambers.mempool?.on?.('pending', (tx) => { this.contentionTracker.processTx(tx); });
    // Wire loop execute -> aggregator / executor path (listener)
    this.loop.on?.('execute', async (opportunity) => {
      const contention = this.contentionTracker.getPathContention(opportunity.pathSignature);
      // pass to executor via existing executor API
      try {
        if (this.chambers.executor && this.chambers.executor.executeOpportunity) {
          await this.chambers.executor.executeOpportunity(opportunity, { contention });
        }
      } catch (e) {
        // record failure
        this.postMortem.classify({ ...opportunity, status: 'FAILED_SUBMIT', revertReason: String(e), contentionLevel: contention.level });
      }
    });

    // Wire executor events -> post mortem
    if (this.chambers.executor && this.chambers.executor.on) {
      this.chambers.executor.on('bundleLanded', (result) => {
        const classified = this.postMortem.classify({ ...result, status: 'LANDED', contentionLevel: this.contentionTracker.getPathContention(result.pathSignature).level });
        // Feed back into strategy performance
        try {
          const strat = classified.contentionLevel === 'SOLO' ? 'solo' : (classified.contentionLevel === 'CONTESTED' || classified.contentionLevel === 'CONTESTED_LIGHT' ? 'contested' : 'crowded');
          this.strategyPerf.recordAttempt(strat, { status: 'LANDED', actualNetProfit: BigInt(classified.actualNetProfit || 0n), actualGasCost: BigInt(classified.actualGasCost || 0n) });
        } catch (e) {}
      });
      this.chambers.executor.on('bundleFailed', (result) => {
        const classified = this.postMortem.classify({ ...result, status: result.status || 'REVERTED', contentionLevel: this.contentionTracker.getPathContention(result.pathSignature).level });
        try {
          const strat = classified.contentionLevel === 'SOLO' ? 'solo' : (classified.contentionLevel === 'CONTESTED' || classified.contentionLevel === 'CONTESTED_LIGHT' ? 'contested' : 'crowded');
          this.strategyPerf.recordAttempt(strat, { status: classified.status || 'REVERTED', actualNetProfit: BigInt(classified.actualNetProfit || 0n), actualGasCost: BigInt(classified.actualGasCost || 0n) });
        } catch (e) {}
      });
    }
    // Start weight trainer
    try {
      this.trainer.start();
    } catch (e) {
      console.warn('Weight trainer failed to start:', e.message);
    }
    await this.loop.start();
  }

  stop() {
    this.loop.stop();
    this.chambers.mempool.disconnect();
  }

  async status() {
    return {
      loop: this.loop.state,
      breaker: { tripped: this.breaker.tripped },
      reserves: { lastUpdate: this.chambers.reserves.lastUpdate },
      mempool: { connected: this.chambers.mempool.connected },
    };
  }
}
