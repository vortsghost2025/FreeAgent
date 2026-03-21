# REMOVED: sensitive data redacted by automated security cleanup
import { Orchestrator } from './core/engine/orchestrator.js';
import { CompetitionScorer } from './core/scoring/competition-scorer.js';
import { MempoolContentionTracker } from './core/data/mempool-contention-tracker.js';
import { ProposalAggregator } from './core/engine/proposal-aggregator.js';
import assert from 'assert';

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
      from: 'REDACTED_ADDRESS',
      to: 'REDACTED_ADDRESS',
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
  const scoreRes = scorer.score(op);
  const score = scoreRes.score;
  console.log('score', score);

  const fakeTx1 = {
    hash: 'REDACTED_PRIVATE_KEY',
    from: 'REDACTED_ADDRESS',
    to: 'REDACTED_ADDRESS',
    data: '0x38ed17390000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000000f424000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002540be3f0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    gasPrice: 10000000000n,
    gasLimit: 300000n,
    value: 0n,
  };

  console.log('DEBUG: Processing fakeTx1...');
  console.log('  tx data selector:', fakeTx1.data.slice(0, 10));
  const contention = tracker.processTx(fakeTx1);
  console.log('DEBUG: tracker.senderProfiles:', tracker.senderProfiles.size);
  console.log('DEBUG: tracker.pathContention:', tracker.pathContention.size);

  const fakeTx2 = {
    hash: 'REDACTED_PRIVATE_KEY',
    from: 'REDACTED_ADDRESS',
    to: 'REDACTED_ADDRESS',
    data: '0x38ed17390000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000000f424000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002540be3f0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    gasPrice: 10000000000n,
    gasLimit: 300000n,
    value: 0n,
  };

  const contention2 = tracker.processTx(fakeTx2);
  console.log('contention', contention);

  // Register a simple analyst and wire aggregator into the orchestrator
  aggregator.registerAnalyst('analyst-1');
  // Provide a callable analyst implementation returning a single opportunity
  aggregator.callAnalyst = async (analystId, chunk, snapshot) => ({
    opportunities: [{
      type: 'arbitrage',
      path: [fakeTx1.from, fakeTx1.to],
      expectedProfitWei: 50000000000000000n,
      gasEstimate: 150000n,
      confidence: 0.9,
      pathSignature: `${fakeTx1.from}->${fakeTx1.to}`,
      tokens: ['WETH', 'USDC'],
      pools: [{ reserve0: 100000n, reserve1: 50000000n }],
    }],
    metadata: {},
  });
  orchestrator.aggregator = aggregator;

  // Sanity: ensure orchestrator didn't overwrite the aggregator
  assert.strictEqual(orchestrator.aggregator, aggregator, 'Orchestrator overwrote aggregator');

  const { batch, aggregated, decision } = await aggregator.runPipeline({ pools: [] }, scorer, tracker);
  console.log('aggregated count', aggregated.opportunities.length);

  const top = decision.topDecision;
  const recommendation = top?.finalAction || 'SKIP';
  const topScore = top?.scoring?.score || 0;
  console.log(`Score: ${topScore} recommendation: ${recommendation}`);
  console.log('contention', top?.contention);

  // FIX #3: Add assertions to ensure test actually validates behavior
  assert.notStrictEqual(top?.contention, null, 'Contention tracking failed');
  assert(aggregated.opportunities.length > 0, 'No opportunities found');
  assert(score >= 500, `Score ${score} below threshold`);
  assert(recommendation === 'EXECUTE', `Expected EXECUTE, got ${recommendation}`);

  // --- High-contention scenario: simulate 5 competing txs for the same path ---
  const highPath = `${fakeTx1.from}->${fakeTx1.to}`;
  for (let i = 0; i < 5; i++) {
    const entry = {
      hash: `0xhc${i}` + '0'.repeat(56),
      from: `0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa${(10 + i).toString(16).padStart(2, '0')}`,
      to: fakeTx1.to,
      selector: fakeTx1.data.slice(0, 10),
      gasPrice: 10000000000n + BigInt(i) * 1000000000n,
      gasLimit: 300000n,
      value: 0n,
      pathSignature: highPath,
      decodedPath: [fakeTx1.from, fakeTx1.to],
      timestamp: Date.now() + i,
    };
    // Directly update path contention to simulate competing mempool txs
    tracker.updatePathContention(entry);
  }

  // Re-run the aggregation/pipeline to see effect of contention
  const { aggregated: aggregated2, decision: decision2 } = await aggregator.runPipeline({ pools: [] }, scorer, tracker);
  const top2 = decision2.topDecision;
  const topScore2 = top2?.scoring?.score || 0;
  console.log('High-contention Score:', topScore2, 'previous:', topScore);

  // Score under contention should be lower than the solo case
  assert(topScore2 < topScore, `High-contention score ${topScore2} did not drop below ${topScore}`);

  console.log('✅ HFT integration test finished');
}

main().catch((err) => {
  console.error('❌ HFT integration test failed', err);
  process.exit(1);
});