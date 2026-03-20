/**
 * MEV Swarm - Profit Curve Builder
 * Computes profit curves across trade sizes for optimization
 *
 * Samples linearly or exponentially between min and max amounts
 */

import { ethers } from 'ethers';
import { evaluateProfitForPath } from './profit-evaluator.js';

/**
 * Compute profit curve for a given path
 * Returns points { amountIn, profit, finalOut } for analysis
 *
 * @param {Array} path - Array of swap edges
 * @param {BigInt} minAmountIn - Minimum trade size
 * @param {BigInt} maxAmountIn - Maximum trade size
 * @param {number} steps - Number of samples
 * @param {string} sampling - 'linear' or 'log' (exponential)
 * @param {Object} options - Additional options (gas cost, etc.)
 * @returns {Promise<Object>} Profit curve data
 */
export async function computeProfitCurve(path, minAmountIn, maxAmountIn, steps = 10, sampling = 'log', options = {}) {
  if (!path || path.length === 0) {
    return null;
  }

  // Determine sampling strategy
  const useLinear = sampling === 'linear';
  const logBase = useLinear ? (maxAmountIn / minAmountIn) ** (1 / steps) : 2;

  const points = [];
  let bestProfit = -Infinity;
  let bestAmountIn = 0n;

  // Sample across trade sizes
  for (let i = 0; i <= steps; i++) {
    let amountIn;
    if (useLinear) {
      // Linear sampling: 0%, 10%, 20%, ..., 100% of range
      const factor = BigInt(Math.floor(i / steps * 100) / 100);
      amountIn = minAmountIn + (maxAmountIn - minAmountIn) * factor / 100n;
    } else {
      // Logarithmic sampling: powers of 2
      amountIn = minAmountIn * BigInt(Math.floor(logBase ** i));
    }

    // Evaluate profit at this size
    const result = await evaluateProfitForPath(path, amountIn, options);

    if (result && result.netProfit > bestProfit) {
      bestProfit = result.netProfit;
      bestAmountIn = amountIn;
    }

    if (result) {
      points.push({
        amountIn: result.amountIn,
        amountInRaw: result.amountInRaw,
        finalAmount: result.finalAmount,
        profit: result.profit,
        netProfit: result.netProfit,
        profitBps: result.profitBps,
        gasCostEther: result.gasCostEther,
        priceImpactAvg: result.detailedSwaps.reduce((sum, s) => sum + s.priceImpactBps, 0) / result.detailedSwaps.length
      });
    }
  }

  // Find best point
  const bestPoint = points.find(p => p.profit === bestProfit) || points[points.length - 1];

  return {
    path,
    minAmountIn,
    maxAmountIn,
    steps,
    sampling,
    points,
    bestPoint,
    bestProfit,
    bestAmountIn
  };
}

/**
 * Find optimal trade size using ternary search
 * More efficient than sampling for finding maximum
 *
 * @param {Array} path - Array of swap edges
 * @param {BigInt} minAmountIn - Minimum trade size
 * @param {BigInt} maxAmountIn - Maximum trade size
 * @param {number} tolerance - Profit tolerance in basis points (default: 1)
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Optimization result
 */
export async function findOptimalSizeTernary(path, minAmountIn, maxAmountIn, tolerance = 1, options = {}) {
  if (!path || minAmountIn >= maxAmountIn) {
    return null;
  }

  // Helper function to evaluate profit at a given amount
  const evaluateAtAmount = async (amountIn) => {
    const result = await evaluateProfitForPath(path, amountIn, options);
    return result ? result.netProfit : -Infinity;
  };

  // Ternary search
  let low = minAmountIn;
  let high = maxAmountIn;
  let mid = (low + high) / 2n;

  let bestAmount = minAmountIn;
  let bestProfit = await evaluateAtAmount(minAmountIn);
  let iterations = 0;
  const maxIterations = 50; // Safety limit

  while (high - low > 1n && iterations < maxIterations) {
    const profitLow = await evaluateAtAmount(low);
    const profitHigh = await evaluateAtAmount(high);

    if (profitHigh > profitLow) {
      // Higher amount has better profit, search upper half
      low = mid;
      mid = (mid + high) / 2n;
      bestProfit = profitHigh;
      bestAmount = high;
    } else {
      // Lower amount has better profit, search lower half
      high = mid;
      mid = (low + mid) / 2n;
      bestProfit = profitLow;
      bestAmount = low;
    }

    iterations++;
  }

  // Final evaluation at best amount
  const finalResult = await evaluateProfitForPath(path, bestAmount, options);

  return {
    path,
    bestAmountIn: bestAmount,
    bestProfit: finalResult.netProfit,
    finalAmount: finalResult.finalAmount,
    finalAmountRaw: finalResult.finalAmountRaw,
    iterations,
    converged: iterations < maxIterations,
    tolerance,
    gasCost: finalResult.gasCost
  };
}

/**
 * Find optimal size using golden section search
 * Good for unimodal profit functions
 *
 * @param {Array} path - Array of swap edges
 * @param {BigInt} minAmountIn - Minimum trade size
 * @param {BigInt} maxAmountIn - Maximum trade size
 * @param {number} tolerance - Profit tolerance in basis points
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Optimization result
 */
export async function findOptimalSizeGoldenSection(path, minAmountIn, maxAmountIn, tolerance = 1, options = {}) {
  if (!path || minAmountIn >= maxAmountIn) {
    return null;
  }

  const evaluateAtAmount = async (amountIn) => {
    const result = await evaluateProfitForPath(path, amountIn, options);
    return result ? result.netProfit : -Infinity;
  };

  let bestAmount = minAmountIn;
  let bestProfit = await evaluateAtAmount(minAmountIn);
  let iterations = 0;
  const maxIterations = 100;

  // Golden section search
  let left = minAmountIn;
  let right = maxAmountIn;

  while (right - left > 1n && iterations < maxIterations) {
    const mid = (left + right) / 2n;
    const profitMid = await evaluateAtAmount(mid);

    if (profitMid > bestProfit) {
      bestProfit = profitMid;
      bestAmount = mid;
      left = mid; // Search upper half
    } else {
      right = mid; // Search lower half
    }

    iterations++;
  }

  // Final evaluation at best amount
  const finalResult = await evaluateProfitForPath(path, bestAmount, options);

  return {
    path,
    bestAmountIn: bestAmount,
    bestProfit: finalResult.netProfit,
    finalAmount: finalResult.finalAmount,
    finalAmountRaw: finalResult.finalAmountRaw,
    iterations,
    converged: iterations < maxIterations,
    tolerance,
    gasCost: finalResult.gasCost
  };
}

export default {
  computeProfitCurve,
  findOptimalSizeTernary,
  findOptimalSizeGoldenSection
};
