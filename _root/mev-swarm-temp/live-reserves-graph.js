/**
 * MEV Swarm - Live Reserves Graph Integration
 * Wires arbitrage graph into live pool watcher for real-time market data
 *
 * Dependencies:
 * - pool-watcher.js: Live price/reserves fetching
 * - arbitrage-graph.js: Multi-hop path discovery
 *
 * Capabilities Unlocked:
 * - Real-time multi-hop arbitrage
 * - Live slippage-aware path evaluation
 * - Dynamic opportunity scoring with fresh reserves
 */

import { ethers } from 'ethers';
import { POOLS, getPoolPrice } from './pool-watcher.js';
import { ArbitrageGraph } from './arbitrage-graph.js';

// Live reserves cache - stores fresh reserves per pool
const reservesCache = new Map(); // poolName -> { reserve0, reserve1, slot0, timestamp }

// Reserves freshness threshold (in milliseconds)
const RESERVES_STALE_MS = 3000; // 3 seconds

// Reserves refresh state
let lastRefreshTime = 0;
let refreshInProgress = false;

/**
 * Get live reserves for a specific pool
 * Fetches fresh data and caches results
 *
 * @param {string} poolName - Pool identifier from POOLS config
 * @param {boolean} force - Force refresh even if cache is fresh
 * @returns {Promise<Object|null>} Reserves data or null on error
 */
export async function getLiveReserves(poolName, force = false) {
  const config = POOLS[poolName];
  if (!config || !config.address) {
    console.warn(`[LiveReserves] Unknown pool: ${poolName}`);
    return null;
  }

  // Check cache freshness
  const cached = reservesCache.get(poolName);
  if (!force && cached && (Date.now() - cached.timestamp < RESERVES_STALE_MS)) {
    return cached;
  }

  try {
    // Import RpcManager dynamically to avoid initialization issues
    const { RpcManager } = await import('./rpc-manager.js');
    const rpcManager = new RpcManager();
    const provider = rpcManager.getProvider();

    const POOL_ABI = [
      'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
      'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)'
    ];

    const pool = new ethers.Contract(config.address, POOL_ABI, provider);

    // Fetch appropriate data based on pool type
    let reservesData;
    if (config.type === 'uniswap_v2') {
      const reserves = await pool.getReserves();
      reservesData = {
        poolName,
        type: 'V2',
        reserve0: reserves[0],
        reserve1: reserves[1],
        timestamp: Date.now()
      };
    } else {
      const slot0 = await pool.slot0();
      reservesData = {
        poolName,
        type: 'V3',
        sqrtPriceX96: slot0.sqrtPriceX96,
        tick: slot0.tick,
        timestamp: Date.now()
      };
    }

    // Cache the results
    reservesCache.set(poolName, reservesData);

    return reservesData;
  } catch (err) {
    console.error(`[LiveReserves] Failed to fetch reserves for ${poolName}:`, err.message);

    // Return cached data even if stale (better than nothing)
    return cached || null;
  }
}

/**
 * Get live reserves for all configured pools
 * Parallel fetch for efficiency
 *
 * @param {boolean} force - Force refresh all pools
 * @returns {Promise<Map>} Map of poolName -> reserves data
 */
export async function getAllLiveReserves(force = false) {
  const poolNames = Object.keys(POOLS);
  const results = new Map();

  // Parallel fetch with concurrency limit to avoid rate limiting
  const CONCURRENCY_LIMIT = 3;
  for (let i = 0; i < poolNames.length; i += CONCURRENCY_LIMIT) {
    const batch = poolNames.slice(i, i + CONCURRENCY_LIMIT);
    const batchResults = await Promise.all(
      batch.map(poolName => getLiveReserves(poolName, force))
    );

    batch.forEach((reserves, idx) => {
      if (reserves) {
        results.set(poolNames[i + idx], reserves);
      }
    });
  }

  lastRefreshTime = Date.now();

  console.log(`[LiveReserves] Fetched reserves for ${results.size}/${poolNames.length} pools`);

  return results;
}

/**
 * Load arbitrage graph from live pool configurations
 * Initializes graph structure and loads initial reserves
 *
 * @returns {Promise<ArbitrageGraph>} Initialized graph with live data
 */
export async function loadGraphFromWatcher() {
  console.log('[LiveReserves] Loading graph from watcher configuration...\n');

  // Create graph instance
  const graph = new ArbitrageGraph();

  // Build graph structure from POOLS config
  graph.buildGraph(POOLS);

  // Fetch initial reserves for all pools
  console.log('[LiveReserves] Fetching initial reserves...\n');
  const reserves = await getAllLiveReserves(true);

  // Log reserves for each pool
  for (const [poolName, data] of reserves) {
    const config = POOLS[poolName];
    if (data.type === 'V2') {
      console.log(`  ${poolName}:`);
      console.log(`    Type:     V2`);
      console.log(`    Reserve0:  ${data.reserve0.toString()}`);
      console.log(`    Reserve1:  ${data.reserve1.toString()}`);
      console.log(`    Tokens:    ${config.token0}/${config.token1}`);
    } else {
      console.log(`  ${poolName}:`);
      console.log(`    Type:         V3`);
      console.log(`    sqrtPriceX96:  ${data.sqrtPriceX96.toString()}`);
      console.log(`    Tick:         ${data.tick}`);
      console.log(`    Tokens:       ${config.token0}/${config.token1}`);
    }
  }

  // Store reserves in graph instance for evaluation
  graph.reservesData = reserves;

  console.log(`\n[LiveReserves] Graph loaded with ${reserves.size} pools\n`);

  return graph;
}

/**
 * Refresh graph with fresh reserves
 * Updates edge weights without rebuilding structure
 *
 * @param {ArbitrageGraph} graph - Graph instance to refresh
 * @returns {Promise<boolean>} True if refresh succeeded
 */
export async function refreshGraph(graph) {
  if (refreshInProgress) {
    console.log('[LiveReserves] Refresh already in progress, skipping');
    return false;
  }

  refreshInProgress = true;

  try {
    console.log(`\n[LiveReserves] Refreshing graph (${new Date().toISOString()})...`);

    // Fetch fresh reserves
    const freshReserves = await getAllLiveReserves(true);

    // Update graph's reserves data
    graph.reservesData = freshReserves;

    // Log update summary
    const updatedPools = Array.from(freshReserves.keys());
    console.log(`[LiveReserves] Updated ${updatedPools.length} pools`);

    for (const poolName of updatedPools) {
      const data = freshReserves.get(poolName);
      const config = POOLS[poolName];
      if (data.type === 'V2') {
        const r0 = Number(data.reserve0) / (10 ** config.decimals0);
        const r1 = Number(data.reserve1) / (10 ** config.decimals1);
        const price = r1 / r0;
        console.log(`  ${poolName}: ${price.toFixed(2)} ${config.token1}/${config.token0}`);
      } else {
        // V3 price calculation would go here
        console.log(`  ${poolName}: tick ${data.tick}`);
      }
    }

    console.log(`[LiveReserves] Refresh complete\n`);

    return true;
  } catch (err) {
    console.error('[LiveReserves] Refresh failed:', err.message);
    return false;
  } finally {
    refreshInProgress = false;
  }
}

/**
 * Start continuous graph refresh loop
 * Runs every RESERVES_STALE_MS milliseconds
 *
 * @param {ArbitrageGraph} graph - Graph instance to refresh
 * @returns {Function} Cleanup function to stop the loop
 */
export function startGraphRefresh(graph) {
  console.log(`[LiveReserves] Starting continuous refresh (${RESERVES_STALE_MS}ms interval)\n`);

  const intervalId = setInterval(async () => {
    await refreshGraph(graph);
  }, RESERVES_STALE_MS);

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
    console.log('[LiveReserves] Stopped refresh loop');
  };
}

/**
 * Evaluate a specific arbitrage path with live reserves
 * Uses current reserves data from graph
 *
 * @param {ArbitrageGraph} graph - Graph instance with reserves data
 * @param {Array} path - Array of swap steps
 * @param {number} amountIn - Input amount in human units
 * @returns {Promise<Object|null>} Path evaluation results
 */
export async function evaluatePathWithLiveReserves(graph, path, amountIn) {
  if (!graph.reservesData) {
    console.warn('[LiveReserves] No reserves data in graph, fetch first');
    await refreshGraph(graph);
  }

  console.log(`[LiveReserves] Evaluating path with ${path.length} swaps...`);

  let currentAmount = amountIn;
  const detailedSwaps = [];

  for (const step of path) {
    const pool = graph.pools.get(step.pool);
    if (!pool) {
      console.warn(`[LiveReserves] Unknown pool: ${step.pool}`);
      return null;
    }

    const reserves = graph.reservesData.get(step.pool);
    if (!reserves) {
      console.warn(`[LiveReserves] No reserves for pool: ${step.pool}`);
      return null;
    }

    // Simulate swap based on pool type
    let outputAmount;
    if (pool.type === 'uniswap_v2') {
      // V2 swap simulation
      const isForward = pool.token0.toLowerCase() === step.from.toLowerCase();
      const reserveIn = isForward ? reserves.reserve0 : reserves.reserve1;
      const reserveOut = isForward ? reserves.reserve1 : reserves.reserve0;

      const decimalsIn = isForward ? pool.decimals0 : pool.decimals1;
      const amountInWei = ethers.parseUnits(currentAmount.toString(), decimalsIn);

      // Import simulateSwapV2 locally to avoid circular deps
      const { simulateSwapV2 } = await import('./arbitrage-graph.js');
      const result = simulateSwapV2(reserveIn, reserveOut, amountInWei);

      if (!result) {
        console.warn(`[LiveReserves] V2 swap simulation failed for ${step.pool}`);
        return null;
      }

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
      // V3 swap simulation (simplified for now)
      // TODO: Integrate proper V3 tick-walking simulation
      outputAmount = currentAmount * 0.997; // Placeholder 0.3% fee

      detailedSwaps.push({
        pool: step.pool,
        from: step.from,
        to: step.to,
        inputAmount: currentAmount,
        outputAmount,
        note: 'V3 simulation not yet implemented - using simplified pricing'
      });
    }

    currentAmount = outputAmount;
  }

  const profitBps = ((currentAmount - amountIn) / amountIn) * 10000;
  const profitPercent = profitBps / 100;

  console.log(`[LiveReserves] Path evaluation complete:`);
  console.log(`  Input:    ${amountIn.toFixed(4)} ${path[0].from}`);
  console.log(`  Output:   ${currentAmount.toFixed(4)} ${path[0].from}`);
  console.log(`  Profit:   ${profitPercent.toFixed(2)}% (${profitBps.toFixed(2)} bps)`);

  return {
    finalAmount: currentAmount,
    profitBps,
    profitPercent,
    detailedSwaps,
    timestamp: Date.now()
  };
}

/**
 * Evaluate all arbitrage cycles from a starting token
 * Uses graph's discovery + live reserves evaluation
 *
 * @param {ArbitrageGraph} graph - Graph instance with live reserves
 * @param {string} startToken - Token to start from
 * @param {number} amountIn - Input amount
 * @param {number} maxHops - Maximum path length
 * @param {number} minProfitBps - Minimum profit threshold
 * @returns {Promise<Array>} Array of evaluated opportunities
 */
export async function evaluateAllCycles(
  graph,
  startToken,
  amountIn = 1.0,
  maxHops = 3,
  minProfitBps = 10
) {
  console.log(`\n[LiveReserves] Evaluating all cycles from ${startToken}...`);

  // Discover paths using graph's DFS
  const paths = graph.findArbitragePaths(startToken, maxHops, minProfitBps);

  if (paths.length === 0) {
    console.log(`[LiveReserves] No profitable paths found from ${startToken}`);
    return [];
  }

  // Evaluate each path with live reserves
  const evaluatedOpportunities = [];
  for (const path of paths) {
    const evaluation = await evaluatePathWithLiveReserves(graph, path.path, amountIn);
    if (evaluation) {
      evaluatedOpportunities.push({
        path: path.path,
        profitBps: evaluation.profitBps,
        profitPercent: evaluation.profitPercent,
        inputAmount: amountIn,
        outputAmount: evaluation.finalAmount,
        detailedSwaps: evaluation.detailedSwaps,
        timestamp: evaluation.timestamp
      });
    }
  }

  // Sort by profit (descending)
  evaluatedOpportunities.sort((a, b) => b.profitBps - a.profitBps);

  console.log(`[LiveReserves] Evaluated ${evaluatedOpportunities.length} opportunities\n`);

  return evaluatedOpportunities;
}

/**
 * Get current cache statistics
 * Useful for monitoring and debugging
 *
 * @returns {Object} Cache statistics
 */
export function getReservesCacheStats() {
  const now = Date.now();
  let freshCount = 0;
  let staleCount = 0;

  for (const [poolName, data] of reservesCache) {
    if (now - data.timestamp < RESERVES_STALE_MS) {
      freshCount++;
    } else {
      staleCount++;
    }
  }

  return {
    totalPools: reservesCache.size,
    freshPools: freshCount,
    stalePools: staleCount,
    lastRefresh: lastRefreshTime,
    stalenessThreshold: RESERVES_STALE_MS
  };
}

/**
 * Clear reserves cache
 * Useful for testing or forced refresh
 */
export function clearReservesCache() {
  reservesCache.clear();
  console.log('[LiveReserves] Reserves cache cleared');
}
