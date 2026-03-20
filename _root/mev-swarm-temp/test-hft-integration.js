import { Orchestrator } from './core/engine/orchestrator.js';
import { CompetitionScorer } from './core/scoring/competition-scorer.js';
import { MempoolContentionTracker } from './core/data/mempool-contention-tracker.js';
import { ProposalAggregator } from './core/engine/proposal-aggregator.js';

class MockProvider {
  constructor() {
    this.events = new Map();
  }

  on(event, handler) {
    this.events.set(event, handler);
  }

  off(event, handler) {
    if (this.events.get(event) === handler) {
      this.events.delete(event);
    }
  }

  async getBlockNumber() {
    return 12345678;
  }

  async getGasPrice() {
    return 10000000000n;
  }

  async getTransaction(hash) {
    return {
      hash,
      from: '0x0000000000000000000000000000000000000000',
      to: '0x0000000000000000000000000000000000000000',
      data: '0x38ed1739' + '00'.repeat(200),
      gasPrice: 10000000000n,
      gasLimit: 300000n,
      value: 0n,
    };
  }
}

async function main() {
  console.log('🧪 HFT integration test start');

  const provider = new MockProvider();
  const orchestrator = new Orchestrator({
    provider,
    poolAddresses: [{ path: ['WETH', 'USDC'], reserve0: 100000n, reserve1: 50000000n }],
    graphEngine: { findAllPaths: () => [{ path: ['WETH','USDC'], pools: [{path:['WETH','USDC']}] }] },
    simulator: { simulate: async (pathObj) => ({ path: pathObj.path, pools: pathObj.pools, profit: 10000000000000000n, gasEstimate: 150000n, tokens: ['WETH','USDC'] }) },
    executor: { buildBundle: async () => ({ gasCost: 5000000000000000n }), simulateBundle: async () => ({ success: true, profit: 10000000000000000n, gasCost: 5000000000000000n }), submitBundle: async () => ({ result: { successful: true } }), getPendingBundles: async ()=>[] },
    graphEngine: null,
    simulator: null,
  });

  const scorer = new CompetitionScorer();
  const tracker = new MempoolContentionTracker();
  const aggregator = new ProposalAggregator({ maxAnalysts: 2 });

  // Basic run path
  const op = { expectedProfitWei: 10000000000000000n, gasEstimate: 150000n, pathSignature: 'p:WETH-USDC', pools: [{reserve0: 100000n,reserve1:50000000n}], tokens:['WETH','USDC'] };
  const score = scorer.score(op);
  console.log('score', score);

  const fakeTx1 = { hash:'0x1', from:'0x2', to:'0x3', data:'0x38ed17390000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000000f424000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002540be3f0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', gasPrice:10000000000n, gasLimit:300000n, value:0n };

  const contention = tracker.processTx(fakeTx1);

  const fakeTx2 = { hash:'0x2', from:'0x4', to:'0x3', data:'0x38ed17390000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000000f424000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002540be3f0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', gasPrice:10000000000n, gasLimit:300000n, value:0n };

  const contention2 = tracker.processTx(fakeTx2);
  console.log('contention', contention);

  const batch = await aggregator.solicitProposals({pools:[]});
  const aggregated = aggregator.aggregate(batch);
  console.log('aggregated count', aggregated.opportunities.length);

  console.log('✅ HFT integration test finished');
}

main().catch((err) => {
  console.error('❌ HFT integration test failed', err);
  process.exit(1);
});