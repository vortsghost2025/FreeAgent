/**
 * Test arbitrage graph engine (simplified - no pool-watcher imports)
 * Demonstrates multi-hop path discovery and graph structure
 */

import { ArbitrageGraph } from './arbitrage-graph.js';

// Define pool configurations locally to avoid pool-watcher imports
const POOLS = {
  'USDC/ETH': {
    address: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640',
    token0: 'USDC',
    token1: 'ETH',
    decimals0: 6,
    decimals1: 18,
    type: 'uniswap_v3',
    invert: true,
    fee: 3000
  },
  'USDT/ETH': {
    address: '0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36',
    token0: 'ETH',
    token1: 'USDT',
    decimals0: 18,
    decimals1: 6,
    type: 'uniswap_v3',
    invert: false,
    fee: 3000
  },
  'WBTC/ETH': {
    address: '0xcbcdf9626bc03e24f779434178a73a0b4bad62ed',
    token0: 'WBTC',
    token1: 'ETH',
    decimals0: 8,
    decimals1: 18,
    type: 'uniswap_v3',
    invert: true,
    fee: 3000
  },
  'SushiSwap USDC/ETH': {
    address: '0x397FF1542f962076d0BFE58eA045FfA2d347ACa0',
    token0: 'USDC',
    token1: 'ETH',
    decimals0: 6,
    decimals1: 18,
    type: 'uniswap_v2',
    invert: true
  }
};

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

  // 4. Find arbitrage opportunities from each token
  console.log('=== Searching for Arbitrage Opportunities ===\n');

  const tokens = Array.from(graph.nodes.keys());

  for (const token of tokens) {
    const opportunities = graph.findArbitragePaths(token, 3, 10); // max 3 hops, min 10 bps

    if (opportunities.length > 0) {
      console.log(`\n🚨 Found ${opportunities.length} profitable paths from ${token}:`);
      opportunities.slice(0, 3).forEach((opp, i) => {
        console.log(`  ${i + 1}. ${opp.path.map(s => `${s.from}→${s.to}`).join(' → ')}`);
        console.log(`     Profit: ${opp.profitPercent.toFixed(2)}% (${opp.profitBps.toFixed(2)} bps)`);
        console.log(`     Pools:  ${opp.path.map(s => s.pool).join(', ')}`);
      });
    } else {
      console.log(`\n${token}: No arbitrage opportunities found (using simplified pricing)`);
    }
  }

  console.log('\n=== Note on Current Results ===');
  console.log('The current implementation uses simplified pricing:');
  console.log('  - 0.3% fee on all swaps');
  console.log('  - No actual slippage calculation (needs live reserves)');
  console.log('  - No gas costs');
  console.log('  - No flash loan costs');
  console.log('');
  console.log('This is expected to find false positives or miss real opportunities.');
  console.log('');
  console.log('Next Steps to Make Production-Ready:');
  console.log('  ✅ Fetch live reserves from all pools');
  console.log('  ✅ Integrate slippage engine (simulateSwapV2)');
  console.log('  ✅ Add gas cost estimation');
  console.log('  ✅ Include flash loan costs (0.09%)');
  console.log('  ✅ Build path evaluation with real swap simulation');
  console.log('  ✅ Add solver → executor pipeline');
  console.log('  ✅ Integrate mempool monitoring');

  console.log('\n=== Architecture Summary ===');
  console.log('✅ Graph structure: Tokens as nodes, pools as edges');
  console.log('✅ Multi-hop discovery: DFS with configurable depth');
  console.log('✅ Profit filtering: Configurable minimum profit threshold');
  console.log('✅ Path evaluation: Ready to integrate slippage engine');
  console.log('✅ Clean separation: Graph logic independent of swap simulation');
  console.log('');
  console.log('✅ Two-layer pattern preserved:');
  console.log('   - Low-level: BigInt swap math (simulateSwapV2)');
  console.log('   - High-level: Direction/decimals handling');
  console.log('   - Graph: Path discovery using low-level results');

  console.log('\n=== Test Complete ===');
}

testArbitrageGraph().catch(console.error);
