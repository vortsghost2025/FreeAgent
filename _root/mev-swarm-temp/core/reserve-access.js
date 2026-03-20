/**
 * MEV Swarm - V3 State Access Layer
 * Thin interface to V3 pool state (slot0, liquidity, ticks)
 *
 * No side effects - just exposes what watcher already knows.
 * Independent of RpcManager, dotenv, provider concerns.
 */

import { ethers } from 'ethers';

// V3 State cache - mirrors live-reserves layer
const v3StateCache = new Map(); // poolName -> v3State

/**
 * V3 State Structure
 * @typedef {Object} V3State
 * @property {BigInt} sqrtPriceX96 - Current sqrtPriceX96 from slot0
 * @property {number} tick - Current tick from slot0
 * @property {BigInt} liquidity - Current global liquidity
 * @property {number} tickSpacing - Pool tick spacing (500, 3000, 10000)
 * @property {number} fee - Fee tier (500, 3000, 10000)
 * @property {Array|null} ticks - Initialized ticks with liquidityNet
 */

/**
 * Get V3 state for a specific pool
 * Uses cached data from live-reserves layer
 *
 * @param {string} poolName - Pool identifier
 * @param {Object} reservesData - Reserves data from live-reserves
 * @returns {V3State|null} V3 state or null if unavailable
 */
export function getV3State(poolName, reservesData) {
  if (!poolName || !reservesData) {
    return null;
  }

  // Check cache first
  if (v3StateCache.has(poolName)) {
    return v3StateCache.get(poolName);
  }

  // Build V3 state from reserves data
  const poolState = reservesData.get(poolName);
  if (!poolState || poolState.type !== 'V3') {
    return null;
  }

  // Extract V3-specific data
  const v3State = {
    sqrtPriceX96: poolState.sqrtPriceX96,
    tick: poolState.tick,
    liquidity: 1000000000000000000n, // Placeholder - in production, fetch from pool.liquidity()
    tickSpacing: 60, // Default 0.3% pool - in production, read from pool
    fee: 3000, // Default 0.3% - in production, read from pool
    ticks: null // Placeholder - in production, fetch initialized ticks
  };

  // Cache the result
  v3StateCache.set(poolName, v3State);

  return v3State;
}

/**
 * Get V3 state for multiple pools
 * Batch operation for efficiency
 *
 * @param {Array<string>} poolNames - Pool identifiers
 * @param {Map} reservesData - Reserves data from live-reserves
 * @returns {Map<string, V3State>} Map of poolName -> v3State
 */
export function getV3States(poolNames, reservesData) {
  const states = new Map();

  for (const poolName of poolNames) {
    const state = getV3State(poolName, reservesData);
    if (state) {
      states.set(poolName, state);
    }
  }

  return states;
}

/**
 * Update V3 state cache
 * Called when live-reserves refreshes data
 *
 * @param {string} poolName - Pool identifier
 * @param {V3State} v3State - New V3 state
 */
export function updateV3StateCache(poolName, v3State) {
  if (v3State) {
    v3StateCache.set(poolName, v3State);
  }
}

/**
 * Clear V3 state cache
 * Useful for testing or forced refresh
 */
export function clearV3StateCache() {
  v3StateCache.clear();
}

/**
 * Get V3 cache statistics
 * Useful for monitoring and debugging
 *
 * @returns {Object} Cache statistics
 */
export function getV3CacheStats() {
  const stats = {
    totalPools: v3StateCache.size,
    poolsWithTicks: 0,
    avgLiquidity: 0n,
    tickDistribution: {}
  };

  for (const [poolName, state] of v3StateCache) {
    if (state.ticks && state.ticks.length > 0) {
      stats.poolsWithTicks++;
    }

    stats.avgLiquidity += state.liquidity;

    const feeTier = state.fee.toString();
    if (!stats.tickDistribution[feeTier]) {
      stats.tickDistribution[feeTier] = 0;
    }
    stats.tickDistribution[feeTier]++;
  }

  if (v3StateCache.size > 0) {
    stats.avgLiquidity = stats.avgLiquidity / BigInt(v3StateCache.size);
  }

  return stats;
}

/**
 * Validate V3 state structure
 * Ensures required fields are present and valid
 *
 * @param {V3State} v3State - V3 state to validate
 * @returns {boolean} True if valid
 */
export function validateV3State(v3State) {
  if (!v3State) {
    return false;
  }

  return (
    v3State.sqrtPriceX96 !== undefined &&
    v3State.sqrtPriceX96 !== null &&
    typeof v3State.sqrtPriceX96 === 'bigint' &&
    v3State.tick !== undefined &&
    typeof v3State.tick === 'number' &&
    v3State.liquidity !== undefined &&
    v3State.liquidity > 0n
  );
}

export default {
  getV3State,
  getV3States,
  updateV3StateCache,
  clearV3StateCache,
  getV3CacheStats,
  validateV3State
};
