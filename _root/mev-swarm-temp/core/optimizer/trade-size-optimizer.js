/**
 * MEV Swarm - Trade Size Optimizer
 * Finds optimal trade sizes for maximum profit
 *
 * Uses profit curve analysis and search algorithms
 */

import { ethers } from 'ethers';
import {
  computeProfitCurve,
  findOptimalSizeTernary,
  findOptimalSizeGoldenSection
} from './profit-curve.js';

/**
 * Trade Size Optimizer
 * Orchestrates trade size optimization across multiple paths
 */
export class TradeSizeOptimizer {
  constructor({ gasCost = 0n, maxIterations = 50, defaultTolerance = 1 } = {}) {
    this.gasCost = gasCost;
    this.maxIterations = maxIterations;
    this.defaultTolerance = defaultTolerance; // Basis points (1 bps = 0.01%)

    // Optimization state
    this.currentOptimizations = new Map(); // pathId -> optimization result
  }

  /**
   * Optimize a single path
   *
   * @param {Array} path - Array of swap edges
   * @param {BigInt} minAmountIn - Minimum trade size
   * @param {BigInt} maxAmountIn - Maximum trade size
   * @param {string} strategy - 'ternary', 'golden-section', or 'curve'
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Optimization result
   */
  async optimizePath(path, minAmountIn, maxAmountIn, strategy = 'ternary', options = {}) {
    if (!path || path.length === 0) {
      return null;
    }

    console.log(`[TradeSizeOptimizer] Optimizing path: ${path.map(e => e.poolId).join(' → ')}`);
    console.log(`  Strategy: ${strategy}`);
    console.log(`  Range: ${ethers.formatEther(minAmountIn)} to ${ethers.formatEther(maxAmountIn)}`);

    const optionsWithGas = { ...options, gasCost: this.gasCost };

    let result;
    switch (strategy) {
      case 'ternary':
        result = await findOptimalSizeTernary(path, minAmountIn, maxAmountIn, this.defaultTolerance, optionsWithGas);
        break;

      case 'golden-section':
        result = await findOptimalSizeGoldenSection(path, minAmountIn, maxAmountIn, this.defaultTolerance, optionsWithGas);
        break;

      case 'curve':
        result = await computeProfitCurve(path, minAmountIn, maxAmountIn, 10, 'linear', optionsWithGas);
        // Extract best point from curve
        if (result && result.bestPoint) {
          result = {
            ...result,
            bestAmountIn: result.bestAmountIn,
            bestProfit: result.bestPoint.profit
          };
        }
        break;

      default:
        console.warn(`[TradeSizeOptimizer] Unknown strategy: ${strategy}`);
        return null;
    }

    if (result) {
      console.log(`[TradeSizeOptimizer] Optimization complete:`);
      console.log(`  Best amount: ${ethers.formatEther(result.bestAmountIn)}`);
      console.log(`  Best profit: ${result.bestProfit.toFixed(4)} ETH`);
      console.log(`  Iterations: ${result.iterations}`);
    }

    // Cache result
    const pathKey = path.map(e => e.poolId).join('-');
    this.currentOptimizations.set(pathKey, result);

    return result;
  }

  /**
   * Batch optimize multiple paths
   *
   * @param {Array} paths - Array of paths to optimize
   * @param {BigInt} minAmountIn - Minimum trade size for all paths
   * @param {BigInt} maxAmountIn - Maximum trade size for all paths
   * @param {string} strategy - Optimization strategy
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} Optimization results sorted by profit
   */
  async batchOptimize(paths, minAmountIn, maxAmountIn, strategy = 'ternary', options = {}) {
    console.log(`\n[TradeSizeOptimizer] Batch optimizing ${paths.length} paths...`);
    console.log(`  Strategy: ${strategy}`);
    console.log(`  Range: ${ethers.formatEther(minAmountIn)} to ${ethers.formatEther(maxAmountIn)}\n`);

    const optionsWithGas = { ...options, gasCost: this.gasCost };
    const results = [];

    for (const path of paths) {
      const result = await this.optimizePath(path, minAmountIn, maxAmountIn, strategy, optionsWithGas);
      if (result) {
        results.push({
          path,
          ...result,
          pathKey: path.map(e => e.poolId).join('-')
        });
      }
    }

    // Sort by net profit (descending)
    results.sort((a, b) => b.bestProfit - a.bestProfit);

    // Show top results
    console.log(`[TradeSizeOptimizer] Batch optimization complete:`);
    console.log(`  Processed: ${results.length}/${paths.length} paths`);
    console.log(`  Best overall profit: ${results[0]?.bestProfit?.toFixed(4) || 'N/A'} ETH\n`);

    return results;
  }

  /**
   * Get cached optimization result for a path
   *
   * @param {Array} path - Array of swap edges
   * @returns {Object|null} Cached optimization or null
   */
  getCachedOptimization(path) {
    const pathKey = path.map(e => e.poolId).join('-');
    return this.currentOptimizations.get(pathKey) || null;
  }

  /**
   * Clear optimization cache
   */
  clearCache() {
    this.currentOptimizations.clear();
    console.log('[TradeSizeOptimizer] Cache cleared');
  }

  /**
   * Get cache statistics
   *
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    const stats = {
      totalPaths: this.currentOptimizations.size,
      avgIterations: 0,
      convergedCount: 0,
      avgProfit: 0,
      avgBestAmount: 0n
    };

    for (const [pathKey, result] of this.currentOptimizations) {
      if (result) {
        stats.avgIterations += result.iterations;
        if (result.converged) {
          stats.convergedCount++;
        }
        stats.avgProfit += result.bestProfit;
        stats.avgBestAmount += result.bestAmountIn;
      }
    }

    if (stats.totalPaths > 0) {
      stats.avgIterations /= stats.totalPaths;
      stats.avgProfit /= stats.totalPaths;
      stats.avgBestAmount = stats.avgBestAmount / BigInt(stats.totalPaths);
    }

    return stats;
  }
}

export default {
  TradeSizeOptimizer,
  computeProfitCurve,
  findOptimalSizeTernary,
  findOptimalSizeGoldenSection
};
