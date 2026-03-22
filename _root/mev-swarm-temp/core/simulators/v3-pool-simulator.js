/**
 * MEV Swarm - V3 Pool Simulator (High-Level)
 * Pool-aware helper for V3 swap simulation
 *
 * Mirrors V2 two-layer pattern:
 * - Low-level: pure math (simulateSwapV3Raw)
 * - High-level: direction, decimals, display scaling
 */

import { ethers } from 'ethers';
import {
  simulateSwapV3Raw,
  simulateSwapV3Quick,
  tickFromSqrtPriceX96,
  sqrtPriceX96FromTick,
  getZeroForOne
} from '../math/simulate-v3.js';

/**
 * Simulate V3 swap for a specific pool
 * Handles direction, decimals, and display formatting
 *
 * @param {Object} params - Simulation parameters
 * @param {Object} params.poolConfig - Pool configuration
 * @param {Object} params.v3State - V3 state from live-reserves layer
 * @param {string} params.tokenIn - Input token symbol
 * @param {number|string} params.amountInHuman - Input amount in human units
 * @param {boolean} params.useTickWalking - Whether to use full tick walking (default: false for speed)
 * @returns {Promise<Object|null>} Swap simulation result
 */
export async function simulateSwapV3ForPool({
  poolConfig,
  v3State,
  tokenIn,
  amountInHuman,
  useTickWalking = false
}) {
  if (!poolConfig || !v3State || !tokenIn) {
    console.warn('[simulateSwapV3ForPool] Missing required parameters');
    return null;
  }

  // 1. Determine swap direction (zeroForOne flag)
  const zeroForOne = getZeroForOne(tokenIn, poolConfig.token0);

  // 2. Determine decimals based on direction
  const decimalsIn = zeroForOne ? poolConfig.decimals0 : poolConfig.decimals1;
  const decimalsOut = zeroForOne ? poolConfig.decimals1 : poolConfig.decimals0;

  // 3. Scale amountIn to raw BigInt
  const amountInRaw = ethers.parseUnits(amountInHuman.toString(), decimalsIn);

  // 4. Extract V3 state
  const { sqrtPriceX96, liquidity, tick } = v3State;

  // 5. Choose simulation method based on trade size
  const useFullTickWalking = useTickWalking || Number(amountInHuman) > 1000; // Use tick walking for larger trades

  let result;
  if (useFullTickWalking) {
    // Full tick-walking for accurate slippage on large trades
    result = simulateSwapV3Raw({
      sqrtPriceX96,
      liquidity,
      tick,
      tickSpacing: poolConfig.fee === 500 ? 10 : poolConfig.fee === 10000 ? 200 : 60,
      fee: poolConfig.fee || 3000,
      amountIn: amountInRaw,
      zeroForOne
    });
  } else {
    // Quick simulation for small trades (assumes within current tick)
    result = simulateSwapV3Quick({
      sqrtPriceX96,
      liquidity,
      tick,
      fee: poolConfig.fee || 3000,
      amountIn: amountInRaw,
      zeroForOne
    });
  }

  if (!result) {
    return null;
  }

  // 6. Compute mid price (spot price at current tick)
  const priceRatio = Number(sqrtPriceX96) / Number(2n ** 96n);
  const midPriceRaw = zeroForOne ? priceRatio : 1 / priceRatio;
  const midPriceHuman = zeroForOne ? midPriceRaw : 1 / midPriceRaw;

  // 7. Scale output to human units
  const amountOutHuman = Number(ethers.formatUnits(result.amountOut, decimalsOut));

  // 8. Compute execution price in human units
  const executionPriceHuman = amountOutHuman / Number(amountInHuman);

  // 9. Compute price impact (in basis points)
  const priceImpactBps = ((midPriceHuman - executionPriceHuman) / midPriceHuman) * 10000;

  // 10. Apply invert flag if configured (for display direction)
  let finalMidPrice = midPriceHuman;
  let finalExecutionPrice = executionPriceHuman;

  if (poolConfig.invert) {
    finalMidPrice = 1 / midPriceHuman;
    finalExecutionPrice = 1 / executionPriceHuman;
  }

  // 11. Return display-ready result
  return {
    amountOut: amountOutHuman,
    executionPrice: finalExecutionPrice,
    midPrice: finalMidPrice,
    priceImpactBps,
    sqrtPriceX96After: result.sqrtPriceX96After,
    tickAfter: result.tickAfter,
    liquidityAfter: result.liquidityAfter,
    feeAmount: result.feeAmount,
    feeTier: result.feeTier,
    ticksCrossed: result.ticksCrossed,
    poolType: 'V3',
    simulationMethod: useFullTickWalking ? 'tick-walking' : 'quick'
  };
}

/**
 * Get V3 state description for debugging
 *
 * @param {Object} v3State - V3 state object
 * @returns {string} Human-readable description
 */
export function describeV3State(v3State) {
  if (!v3State) {
    return 'No V3 state available';
  }

  const { sqrtPriceX96, liquidity, tick } = v3State;

  return `tick=${tick}, liquidity=${liquidity.toString()}, sqrtPriceX96=${sqrtPriceX96.toString()}`;
}

/**
 * Determine if trade size warrants tick-walking
 * Larger trades may cross multiple tick boundaries
 *
 * @param {number} amountInHuman - Trade size in human units
 * @param {number} liquidity - Current liquidity
 * @returns {boolean} True if tick-walking recommended
 */
export function shouldUseTickWalking(amountInHuman, liquidity) {
  // Use tick-walking for trades > 1000 units or > 0.1% of liquidity
  const liquidityHuman = Number(liquidity) / 1e18;

  if (amountInHuman > 1000) {
    return true;
  }

  if (amountInHuman / liquidityHuman > 0.001) {
    return true;
  }

  return false;
}

export default {
  simulateSwapV3ForPool,
  describeV3State,
  shouldUseTickWalking
};
