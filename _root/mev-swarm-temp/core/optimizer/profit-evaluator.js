/**
 * MEV Swarm - Profit Evaluator for Trade Size Optimization
 * Evaluates profit including gas and flash loan costs
 *
 * Treats path as a black box:
 *   profit(x) = finalAmountOut(x) - amountIn(x) - gasCost
 *
 * Dependencies: Existing evaluatePath from graph layer
 */

import { ethers } from 'ethers';

/**
 * Evaluate profit for a given path and trade size
 * Considers gas cost (can be injected)
 *
 * @param {Array} path - Array of swap edges (SwappableEdge)
 * @param {BigInt} amountIn - Trade size in raw units
 * @param {BigInt} gasCost - Gas cost in wei (optional, defaults to 0)
 * @returns {Promise<Object>} Profit evaluation result
 */
export async function evaluateProfitForPath(path, amountIn, { gasCost = 0n } = {}) {
  if (!path || path.length === 0 || !amountIn) {
    return null;
  }

  // 1. Get human-readable amount for first edge simulation
  const firstEdge = path[0];
  const decimalsIn = firstEdge.poolConfig.decimals0; // Simplified - use token0 decimals
  const amountInHuman = Number(ethers.formatUnits(amountIn, decimalsIn));

  // 2. Simulate the path (edge.simulate handles V2/V3 internally)
  let currentAmount = amountInHuman;
  const detailedSwaps = [];
  const totalGasUsed = gasCost;

  for (let i = 0; i < path.length; i++) {
    const edge = path[i];
    const result = await edge.simulate(currentAmount);

    if (!result) {
      return null;
    }

    detailedSwaps.push({
      edge: edge.poolId,
      from: result.inputAmount || currentAmount,
      to: result.amountOut,
      executionPrice: result.executionPrice,
      midPrice: result.midPrice,
      priceImpactBps: result.priceImpactBps,
      poolType: result.poolType
    });

    currentAmount = result.amountOut;
  }

  // 3. Calculate profit
  const finalAmountRaw = ethers.parseUnits(currentAmount.toString(), decimalsIn);
  const profitRaw = finalAmountRaw - amountIn;
  const profit = Number(ethers.formatEther(profitRaw));

  // 4. Apply gas cost
  const gasCostEther = Number(ethers.formatEther(totalGasUsed));
  const netProfit = profit - gasCostEther;

  // 5. Return structured result
  return {
    amountIn: amountInHuman,
    amountInRaw,
    finalAmount: currentAmount,
    finalAmountRaw,
    profitRaw,
    profit,
    profitBps: (profit / amountInHuman) * 10000,
    gasCost: totalGasUsed,
    gasCostEther,
    netProfit,
    netProfitBps: (netProfit / amountInHuman) * 10000,
    detailedSwaps,
    hopCount: path.length
  };
}

/**
 * Compare two trade size options
 * Useful for optimization decisions
 *
 * @param {Object} optionA - First evaluation result
 * @param {Object} optionB - Second evaluation result
 * @returns {Object} Comparison result
 */
export function compareTradeOptions(optionA, optionB) {
  if (!optionA || !optionB) {
    return null;
  }

  const profitDiff = optionB.netProfit - optionA.netProfit;
  const profitDiffBps = optionB.netProfitBps - optionA.netProfitBps;
  const improvementPercent = (profitDiff / optionA.netProfit) * 100;

  return {
    optionA,
    optionB,
    profitDiff,
    profitDiffBps,
    improvementPercent,
    better: optionB.netProfit > optionA.netProfit,
    recommendation: optionB.netProfit > optionA.netProfit
      ? `Choose option B (+${improvementPercent.toFixed(1)}% profit)`
      : `Choose option A (+${Math.abs(improvementPercent).toFixed(1)}% profit)`
  };
}

/**
 * Batch evaluate multiple paths at multiple trade sizes
 * Efficient for finding best opportunities
 *
 * @param {Array} paths - Array of paths to evaluate
 * @param {Array<BigInt>} amountIns - Trade sizes to test
 * @param {Object} options - Evaluation options (gas cost, etc.)
 * @returns {Promise<Array>} All evaluation results
 */
export async function batchEvaluatePaths(paths, amountIns, options = {}) {
  const results = [];

  for (const path of paths) {
    for (const amountIn of amountIns) {
      const result = await evaluateProfitForPath(path, amountIn, options);
      if (result) {
        results.push({
          path,
          amountIn: result.amountIn,
          amountInRaw: result.amountInRaw,
          finalAmount: result.finalAmount,
          profit: result.profit,
          netProfit: result.netProfit,
          gasCost: result.gasCost,
          hopCount: result.hopCount
        });
      }
    }
  }

  // Sort by net profit (descending)
  results.sort((a, b) => b.netProfit - a.netProfit);

  return results;
}

export default {
  evaluateProfitForPath,
  compareTradeOptions,
  batchEvaluatePaths
};
