/**
 * MEV Swarm - Multi-Hop Arbitrage Graph Engine
 * Builds token graph from pool configurations and finds profitable arbitrage paths
 */

import { ethers } from 'ethers';

// LOW-LEVEL: Pure math function for V2 swap simulation
// All inputs are raw BigInts (token wei)
export function simulateSwapV2(reserveIn, reserveOut, amountIn) {
  if (!reserveIn || !reserveOut || !amountIn ||
      Number(reserveIn) === 0 || Number(reserveOut) === 0 || Number(amountIn) === 0) {
    return null;
  }

  // Constant product formula with 0.3% fee: x * y = k
  const amountInWithFee = amountIn * 997n;
  const numerator = amountInWithFee * reserveOut;
  const denominator = (reserveIn * 1000n) + amountInWithFee;
  const amountOut = numerator / denominator;

  // Prices as unitless ratios
  const midPrice = Number(reserveOut) / Number(reserveIn);
  const executionPrice = Number(amountOut) / Number(amountIn);

  const priceImpactBps = ((midPrice - executionPrice) / midPrice) * 10000;

  return {
    amountOut,
    executionPrice,
    midPrice,
    priceImpactBps
  };
}

/**
 * Unified slippage simulation - works for both V2 and V3 pools
 * Returns { amountOut, executionPrice, priceImpactBps }
 * @param {BigInt} reserveIn - Input token reserve
 * @param {BigInt} reserveOut - Output token reserve  
 * @param {BigInt} amountIn - Amount to swap in
 * @param {string} poolType - 'V2' or 'V3'
 * @param {number} fee - Fee tier (e.g., 3000 for 0.3%)
 */
export function simulateSwap(reserveIn, reserveOut, amountIn, poolType = 'V2', fee = 3000) {
  if (!reserveIn || !reserveOut || !amountIn ||
      Number(reserveIn) === 0 || Number(reserveOut) === 0 || Number(amountIn) === 0) {
    return null;
  }

  if (poolType === 'V2') {
    // V2: constant product formula with 0.3% fee
    const feeMultiplier = 997n;
    const amountInWithFee = amountIn * feeMultiplier;
    const numerator = amountInWithFee * reserveOut;
    const denominator = (reserveIn * 1000n) + amountInWithFee;
    const amountOut = numerator / denominator;

    const midPrice = Number(reserveOut) / Number(reserveIn);
    const executionPrice = Number(amountOut) / Number(amountIn);
    const priceImpactBps = ((midPrice - executionPrice) / midPrice) * 10000;

    return { amountOut, executionPrice, midPrice, priceImpactBps };
  } else {
    // V3: uses fee tier (e.g., 3000 = 0.3%)
    // Note: fee value is already in basis points (3000 = 0.3%), so we don't divide by 100
    const feeMultiplier = (10000n - BigInt(fee)) / 10000n; // e.g., (10000-3000)/10000 = 0.7 for 0.3% fee
    const amountInWithFee = amountIn * feeMultiplier;

    // Correct V3 formula with proper scaling
    // denominator = reserveIn * 10000 + amountInWithFee
    const scaledReserveIn = reserveIn * 10000n;
    const numerator = amountInWithFee * reserveOut;
    const denominator = scaledReserveIn + amountInWithFee;
    const amountOut = numerator / denominator;

    const midPrice = Number(reserveOut) / Number(reserveIn);
    const executionPrice = Number(amountOut) / Number(amountIn);
    const priceImpactBps = ((midPrice - executionPrice) / midPrice) * 10000;

    return { amountOut, executionPrice, midPrice, priceImpactBps };
  }
}

// Graph node: represents a token
// Graph edge: represents a swap path between tokens via a pool
// Edge weight: function of slippage for a given trade size

export class ArbitrageGraph {
  constructor() {
    this.nodes = new Map();  // token symbol -> Node
    this.edges = new Map();  // edgeKey -> Edge
    this.pools = new Map(); // poolName -> Pool data
  }

  /**
   * Build graph from pool configurations
   * Each pool creates edges between its tokens
   */
  buildGraph(poolConfigs) {
    this.nodes.clear();
    this.edges.clear();
    this.pools.clear();

    // Add nodes (tokens) from all pools
    for (const [poolName, config] of Object.entries(poolConfigs)) {
      if (!config.address) continue;

      // Add token nodes
      this.addNode(config.token0);
      this.addNode(config.token1);

      // Store pool configuration
      this.pools.set(poolName, {
        name: poolName,
        address: config.address,
        token0: config.token0,
        token1: config.token1,
        decimals0: config.decimals0,
        decimals1: config.decimals1,
        type: config.type || 'uniswap_v3',
        invert: config.invert || false,
        fee: config.fee || 3000
      });

      // Create bidirectional edges (can swap either direction)
      this.addEdge(poolName, config.token0, config.token1);
      this.addEdge(poolName, config.token1, config.token0);
    }

    console.log(`[ArbitrageGraph] Built graph:`);
    console.log(`  Nodes (tokens): ${this.nodes.size}`);
    console.log(`  Edges (paths):  ${this.edges.size}`);
    console.log(`  Pools:         ${this.pools.size}`);
  }

  addNode(tokenSymbol) {
    if (!this.nodes.has(tokenSymbol)) {
      this.nodes.set(tokenSymbol, {
        symbol: tokenSymbol,
        edges: []
      });
    }
  }

  addEdge(poolName, fromToken, toToken) {
    const edgeKey = `${fromToken}-${toToken}`;
    const edge = {
      from: fromToken,
      to: toToken,
      poolName: poolName,
      pool: this.pools.get(poolName),
      calculateOutput: this.createSwapFunction(poolName, fromToken, toToken)
    };

    this.edges.set(edgeKey, edge);
    this.nodes.get(fromToken).edges.push(edgeKey);
  }

  /**
   * Update edge reserves from live data
   * This enables real-time slippage calculation
   * @param {string} poolName - Pool name
   * @param {Object} reservesData - Reserves from getLiveReserves()
   */
  updateEdgeReserves(poolName, reservesData) {
    const pool = this.pools.get(poolName);
    if (!pool) return;

    // Find all edges using this pool and update their reserves
    for (const [edgeKey, edge] of this.edges) {
      if (edge.poolName === poolName) {
        // Store reserves on the edge
        edge.reserves = reservesData;
        
        // Update the edge's calculateOutput function to use real reserves
        const isForward = pool.token0.toLowerCase() === edge.from.toLowerCase();
        
        if (reservesData.type === 'V2') {
          edge.calculateOutput = (amountIn) => {
            const reserveIn = isForward ? reservesData.reserve0 : reservesData.reserve1;
            const reserveOut = isForward ? reservesData.reserve1 : reservesData.reserve0;
            return simulateSwap(reserveIn, reserveOut, amountIn, 'V2');
          };
        } else {
          // V3 - use virtual reserves from sqrtPriceX96
          edge.calculateOutput = (amountIn) => {
            const price = Number(reservesData.sqrtPriceX96 ** 2n) / Number(2n ** 192n);
            const baseReserve = 1000000n;
            const reserve0 = baseReserve;
            const reserve1 = baseReserve * BigInt(Math.round(price));
            
            const reserveIn = isForward ? reserve0 : reserve1;
            const reserveOut = isForward ? reserve1 : reserve0;
            
            return simulateSwap(reserveIn, reserveOut, amountIn, 'V3', pool.fee);
          };
        }
      }
    }
  }

  /**
   * Update all edges from reserves data map
   * @param {Map} reservesMap - Map of poolName -> reserves data
   */
  updateAllEdges(reservesMap) {
    for (const [poolName, reservesData] of reservesMap) {
      this.updateEdgeReserves(poolName, reservesData);
    }
    console.log(`[ArbitrageGraph] Updated edges for ${reservesMap.size} pools`);
  }

  /**
   * Simulate a swap on an edge with current reserves
   * Unified interface for both V2 and V3
   * @param {string} edgeKey - Edge key (fromToken-toToken)
   * @param {BigInt} amountIn - Amount to swap in
   * @returns {Object|null} Swap result or null if edge doesn't exist
   */
  simulateEdge(edgeKey, amountIn) {
    const edge = this.edges.get(edgeKey);
    if (!edge || !edge.calculateOutput) return null;
    
    return edge.calculateOutput(amountIn);
  }

  /**
   * Factory function to create swap calculators for edges
   * Returns a function that calculates output amount for a given input
   */
  createSwapFunction(poolName, fromToken, toToken) {
    const pool = this.pools.get(poolName);
    return async (amountIn) => {
      // This will be called with actual reserves/slot0 during path evaluation
      // For now, return null (placeholder)
      return null;
    };
  }

  /**
   * Find all arbitrage cycles starting from a token
   * Uses Bellman-Ford or DFS to detect cycles with positive weight
   */
  findArbitragePaths(startToken, maxHops = 3, minProfitBps = 10) {
    console.log(`\n[ArbitrageGraph] Searching for arbitrage paths from ${startToken}...`);
    console.log(`  Max hops: ${maxHops}, Min profit: ${minProfitBps / 100}%`);

    const paths = [];

    // DFS to find all paths up to maxHops
    const dfs = (currentToken, path, visitedTokens, amount, swapCount) => {
      if (swapCount >= maxHops) return;

      const currentNode = this.nodes.get(currentToken);
      if (!currentNode) return;

      // Try all edges from current node
      for (const edgeKey of currentNode.edges) {
        const edge = this.edges.get(edgeKey);

        // Skip if we'd return to start token without completing a cycle
        if (edge.to === startToken && swapCount < 2) continue;

        // Skip if we've visited this token in current path (prevent infinite loops)
        if (visitedTokens.has(edge.to)) continue;

        // Calculate swap output (placeholder - needs reserves)
        const outputAmount = amount * 0.997; // Placeholder 0.3% fee

        // If we returned to start token, check profit
        if (edge.to === startToken) {
          const profitBps = ((outputAmount - amount) / amount) * 10000;
          if (profitBps > minProfitBps) {
            paths.push({
              path: [...path, { from: edge.from, to: edge.to, pool: edge.poolName }],
              profitBps,
              profitPercent: profitBps / 100,
              inputAmount: amount,
              outputAmount: outputAmount
            });
          }
        } else {
          // Continue DFS
          const newVisited = new Set(visitedTokens);
          newVisited.add(edge.to);
          dfs(edge.to, [...path, { from: edge.from, to: edge.to, pool: edge.poolName }],
              newVisited, outputAmount, swapCount + 1);
        }
      }
    };

    // Start DFS from start token with 1 ETH
    dfs(startToken, [], new Set([startToken]), 1.0, 0);

    // Sort paths by profit (descending)
    paths.sort((a, b) => b.profitBps - a.profitBps);

    console.log(`[ArbitrageGraph] Found ${paths.length} profitable paths\n`);

    return paths;
  }

  /**
   * Evaluate a specific arbitrage path with actual slippage calculation
   * Returns: { finalAmount, profitBps, detailedSwaps }
   */
  async evaluatePath(path, inputAmount, reservesData) {
    console.log(`[ArbitrageGraph] Evaluating path with ${path.length} swaps...`);

    let currentAmount = inputAmount;
    const detailedSwaps = [];

    for (const step of path) {
      const pool = this.pools.get(step.pool);
      if (!pool) continue;

      // Get reserves for this pool
      const reserves = reservesData.get(pool.name);
      if (!reserves) {
        console.warn(`[ArbitrageGraph] No reserves data for pool ${pool.name}`);
        return null;
      }

      // Calculate swap output with slippage
      let outputAmount;
      if (pool.type === 'uniswap_v2') {
        // Determine direction
        const isForward = pool.token0.toLowerCase() === step.from.toLowerCase();
        const reserveIn = isForward ? reserves[0] : reserves[1];
        const reserveOut = isForward ? reserves[1] : reserves[0];

        // Scale amount to wei
        const decimalsIn = isForward ? pool.decimals0 : pool.decimals1;
        const amountInWei = ethers.parseUnits(currentAmount.toString(), decimalsIn);

        // Simulate swap
        const result = simulateSwapV2(reserveIn, reserveOut, amountInWei);
        if (!result) {
          console.warn(`[ArbitrageGraph] Swap simulation failed for ${step.pool}`);
          return null;
        }

        // Scale output back to human units
        const decimalsOut = isForward ? pool.decimals1 : pool.decimals0;
        outputAmount = Number(ethers.formatUnits(result.amountOut, decimalsOut));

        detailedSwaps.push({
          pool: step.pool,
          from: step.from,
          to: step.to,
          inputAmount: currentAmount,
          outputAmount,
          midPrice: result.midPrice,
          executionPrice: result.executionPrice,
          priceImpactBps: result.priceImpactBps
        });

      } else {
        // V3 pool simulation (simplified)
        // In production, this would need slot0, liquidity, tick walking
        outputAmount = currentAmount * 0.997; // Placeholder
        detailedSwaps.push({
          pool: step.pool,
          from: step.from,
          to: step.to,
          inputAmount: currentAmount,
          outputAmount,
          note: 'V3 simulation not yet implemented'
        });
      }

      currentAmount = outputAmount;
    }

    const profitBps = ((currentAmount - inputAmount) / inputAmount) * 10000;
    const profitPercent = profitBps / 100;

    console.log(`[ArbitrageGraph] Path evaluation complete:`);
    console.log(`  Input:    ${inputAmount.toFixed(4)} ${path[0].from}`);
    console.log(`  Output:   ${currentAmount.toFixed(4)} ${path[0].from}`);
    console.log(`  Profit:   ${profitPercent.toFixed(2)}% (${profitBps.toFixed(2)} bps)`);

    return {
      finalAmount: currentAmount,
      profitBps,
      profitPercent,
      detailedSwaps
    };
  }

  /**
   * Visualize graph structure
   */
  visualize() {
    console.log('\n=== Arbitrage Graph Structure ===\n');
    console.log('Tokens (Nodes):');
    for (const [symbol, node] of this.nodes) {
      console.log(`  ${symbol}: ${node.edges.length} outgoing edges`);
    }

    console.log('\nSwap Paths (Edges):');
    for (const [edgeKey, edge] of this.edges) {
      console.log(`  ${edge.from.padEnd(6)} → ${edge.to.padEnd(6)} via ${edge.poolName}`);
    }
    console.log('');
  }

  getStats() {
    return {
      tokens: this.nodes.size,
      paths: this.edges.size,
      pools: this.pools.size,
      density: (this.edges.size / (this.nodes.size * (this.nodes.size - 1))).toFixed(4)
    };
  }
}

/**
 * Build graph from pool-watcher configuration and analyze arbitrage opportunities
 */
export async function buildAndAnalyzeGraph(poolConfigs) {
  const graph = new ArbitrageGraph();
  graph.buildGraph(poolConfigs);
  graph.visualize();

  // Get all unique tokens
  const tokens = Array.from(graph.nodes.keys());

  console.log('\n=== Arbitrage Opportunity Analysis ===\n');

  // Search for arbitrage from each token
  const allOpportunities = [];
  for (const token of tokens) {
    const paths = graph.findArbitragePaths(token, 3, 10); // max 3 hops, min 10 bps profit
    allOpportunities.push(...paths);
  }

  // Sort by profit
  allOpportunities.sort((a, b) => b.profitBps - a.profitBps);

  console.log(`\n=== Top 10 Arbitrage Opportunities ===\n`);
  allOpportunities.slice(0, 10).forEach((opp, i) => {
    console.log(`${i + 1}. ${opp.path.map(s => `${s.from}→${s.to}`).join(' → ')}`);
    console.log(`   Profit: ${opp.profitPercent.toFixed(2)}% (${opp.profitBps.toFixed(2)} bps)`);
    console.log(`   Pools:  ${opp.path.map(s => s.pool).join(', ')}`);
    console.log('');
  });

  return {
    graph,
    opportunities: allOpportunities,
    stats: graph.getStats()
  };
}
