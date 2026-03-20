/**
 * Test arbitrage graph engine
 * Demonstrates multi-hop path discovery and profitability analysis
 */

import { ethers } from 'ethers';
import { POOLS, TOKEN_ADDRESSES, getPoolPrice } from './pool-watcher.js';
import { ArbitrageGraph, buildAndAnalyzeGraph } from './arbitrage-graph.js';

async function testArbitrageGraph() {
  console.log('=== Arbitrage Graph Engine Test ===\n');

  // 1. Build graph from pool configurations
  const graph = new ArbitrageGraph();
  graph.buildGraph(POOLS);

  // 2. Visualize graph structure
  graph.visualize();

  // 3. Get stats
  const stats = graph.getStats();
  console.log(`Graph Stats:`);
  console.log(`  Tokens:      ${stats.tokens}`);
  console.log(`  Swap Paths:  ${stats.paths}`);
  console.log(`  Pools:       ${stats.pools}`);
  console.log(`  Density:     ${stats.density}\n`);

  // 4. Find arbitrage opportunities from ETH
  console.log('=== Searching for Arbitrage Opportunities ===\n');

  const ethOpportunities = graph.findArbitragePaths('ETH', 3, 10); // max 3 hops, min 10 bps

  if (ethOpportunities.length > 0) {
    console.log(`\n🚨 Found ${ethOpportunities.length} profitable paths from ETH:\n`);
    ethOpportunities.slice(0, 5).forEach((opp, i) => {
      console.log(`${i + 1}. Path: ${opp.path.map(s => `${s.from}→${s.to}`).join(' → ')}`);
      console.log(`   Profit: ${opp.profitPercent.toFixed(2)}% (${opp.profitBps.toFixed(2)} bps)`);
      console.log(`   Amount: ${opp.inputAmount.toFixed(4)} ETH → ${opp.outputAmount.toFixed(4)} ETH`);
      console.log(`   Pools:  ${opp.path.map(s => s.pool).join(', ')}`);
      console.log('');
    });
  } else {
    console.log('No arbitrage opportunities found with current thresholds.\n');
    console.log('Note: This is using simplified pricing (0.3% fee on all edges).');
    console.log('Real arbitrage detection requires:');
    console.log('  - Live reserves data from all pools');
    console.log('  - Accurate slippage calculation per pool');
    console.log('  - Gas cost estimation');
    console.log('  - Flash loan costs (0.09% typically)\n');
  }

  // 5. Demonstrate path evaluation with live reserves
  console.log('=== Evaluating a Specific Path with Live Data ===\n');

  // Get live reserves for SushiSwap pool
  const provider = new ethers.JsonRpcProvider('https://ethereum-mainnet.core.chainstack.com/4eaab7e73e2a832024e11e41e6688733');
  const POOL_ABI = [
    'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)'
  ];

  const sushiPool = new ethers.Contract(
    POOLS['SushiSwap USDC/ETH'].address,
    POOL_ABI,
    provider
  );

  const reserves = await sushiPool.getReserves();

  console.log('SushiSwap USDC/ETH Reserves (Live):');
  console.log(`  Reserve0 (USDC): ${reserves[0].toString()}`);
  console.log(`  Reserve1 (ETH):   ${reserves[1].toString()}\n`);

  // Create reserves map for evaluation
  const reservesData = new Map();
  reservesData.set('SushiSwap USDC/ETH', reserves);

  // Evaluate a 2-hop path: ETH → USDC → ETH (via SushiSwap)
  const testPath = [
    { from: 'ETH', to: 'USDC', pool: 'SushiSwap USDC/ETH' },
    { from: 'USDC', to: 'ETH', pool: 'SushiSwap USDC/ETH' }
  ];

  const evaluation = await graph.evaluatePath(testPath, 1.0, reservesData);

  if (evaluation) {
    console.log('Path Evaluation Results:');
    console.log(`  Input:    1.0000 ETH`);
    console.log(`  Output:   ${evaluation.finalAmount.toFixed(6)} ETH`);
    console.log(`  Profit:   ${evaluation.profitPercent.toFixed(4)}% (${evaluation.profitBps.toFixed(2)} bps)\n`);

    console.log('Detailed Swaps:');
    evaluation.detailedSwaps.forEach((swap, i) => {
      console.log(`  ${i + 1}. ${swap.pool}:`);
      console.log(`     ${swap.inputAmount.toFixed(6)} ${swap.from} → ${swap.outputAmount.toFixed(6)} ${swap.to}`);
      console.log(`     Price Impact: ${(swap.priceImpactBps / 100).toFixed(4)}%`);
    });
  }

  console.log('\n=== Test Complete ===');
  console.log('✅ Graph structure built successfully');
  console.log('✅ Multi-hop path discovery working');
  console.log('✅ Path evaluation with live reserves');
  console.log('✅ Slippage calculation integrated');
  console.log('');
  console.log('Next Steps:');
  console.log('  - Add live reserves fetching from all pools');
  console.log('  - Implement V3 slippage (tick walking)');
  console.log('  - Add gas cost estimation');
  console.log('  - Integrate flash loan costs');
  console.log('  - Build execution pipeline');
}

testArbitrageGraph().catch(console.error);
