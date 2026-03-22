/**
 * MEV Swarm - Gas Estimator
 * Full execution-aware gas model for arbitrage profitability
 *
 * Models gas costs per hop type:
 * - V2 direct swap: ~50k gas
 * - V3 direct swap: ~100k-150k gas (varies with tick ranges)
 * - Multi-hop routes: Base + per-hop overhead
 * - Router execution: ~30k gas overhead for delegate calls
 */

import { ethers } from 'ethers';

// Gas cost constants (in gas units)
export const GAS_COSTS = {
  // Base transaction overhead
  BASE_TX: 21000n,

  // V2 swap costs
  V2_SWAP: 50000n,
  V2_SWAP_BASE: 30000n,

  // V3 swap costs (higher due to tick walking)
  V3_SWAP: 120000n,
  V3_SWAP_BASE: 80000n,
  V3_TICK_OVERHEAD: 5000n, // Additional per tick crossed

  // Router execution
  ROUTER_BASE: 30000n,
  ROUTER_OVERHEAD_PER_HOP: 10000n,

  // Flash operations
  FLASH_LOAN_CALLBACK: 80000n,
  FLASH_LOAN_BASE: 150000n,

  // Safety margin (12/10 = 1.2 = 20% buffer)
  SAFETY_MARGIN: 12n / 10n, // 20% buffer
};

// Pool type to gas mapping
export const POOL_GAS_COSTS = {
  'uniswap_v2': { base: GAS_COSTS.V2_SWAP, perHop: GAS_COSTS.V2_SWAP_BASE },
  'sushiswap': { base: GAS_COSTS.V2_SWAP, perHop: GAS_COSTS.V2_SWAP_BASE },
  'uniswap_v3': { base: GAS_COSTS.V3_SWAP, perHop: GAS_COSTS.V3_SWAP_BASE },
  'curve': { base: 80000n, perHop: 60000n }, // Curve is more expensive
};

/**
 * Estimate gas cost for a single hop
 */
export function estimateHopGasCost(poolType, options = {}) {
  const poolConfig = POOL_GAS_COSTS[poolType] || POOL_GAS_COSTS['uniswap_v2'];

  let gasCost = poolConfig.base;

  // Add V3 tick overhead if applicable
  if (poolType === 'uniswap_v3' && options.tickDistance) {
    const tickOverhead = BigInt(options.tickDistance) * GAS_COSTS.V3_TICK_OVERHEAD;
    gasCost += tickOverhead;
  }

  return gasCost;
}

/**
 * Estimate gas cost for a multi-hop path
 */
export function estimatePathGasCost(edges, options = {}) {
  if (!edges || edges.length === 0) {
    return GAS_COSTS.BASE_TX;
  }

  let totalGas = GAS_COSTS.BASE_TX;

  // Add per-hop costs
  for (const edge of edges) {
    const hopCost = estimateHopGasCost(edge.poolType, options);
    totalGas += hopCost;
  }

  // Add router overhead for multi-hop
  if (edges.length > 1) {
    totalGas += GAS_COSTS.ROUTER_BASE;
    totalGas += BigInt(edges.length) * GAS_COSTS.ROUTER_OVERHEAD_PER_HOP;
  }

  return totalGas;
}

/**
 * Estimate gas cost for flash loan execution
 */
export function estimateFlashLoanGasCost(edges, options = {}) {
  const swapGas = estimatePathGasCost(edges, options);
  return GAS_COSTS.FLASH_LOAN_BASE + swapGas + GAS_COSTS.FLASH_LOAN_CALLBACK;
}

/**
 * Convert gas cost to ETH wei
 */
export function gasToWei(gasUnits, gasPrice) {
  return gasUnits * gasPrice;
}

/**
 * Convert gas cost to token units
 */
export function gasToTokenUnits(gasCostWei, tokenDecimals, ethPriceInToken) {
  // ethPriceInToken = how much token 1 ETH is worth
  // gasCostWei / 1e18 = ETH cost
  // (gasCostWei / 1e18) * ethPriceInToken / 10^decimals = token cost

  const ethCost = Number(gasCostWei) / 1e18;
  const tokenCost = (ethCost * ethPriceInToken) / Math.pow(10, tokenDecimals);

  return BigInt(Math.floor(tokenCost * 1e18)); // Return as BigInt with 18 decimals
}

/**
 * Estimate total gas cost in ETH for a path
 */
export function estimatePathGasCostWei(edges, gasPrice, options = {}) {
  const gasUnits = estimatePathGasCost(edges, options);
  return gasToWei(gasUnits, gasPrice);
}

/**
 * Estimate flash loan gas cost in ETH
 */
export function estimateFlashLoanGasCostWei(edges, gasPrice, options = {}) {
  const gasUnits = estimateFlashLoanGasCost(edges, options);
  return gasToWei(gasUnits, gasPrice);
}

/**
 * Apply safety margin to gas estimate
 */
export function applySafetyMargin(gasCost) {
  return (gasCost * GAS_COSTS.SAFETY_MARGIN) / 1n;
}

/**
 * Gas Estimator Class
 * Main interface for gas estimation
 */
export class GasEstimator {
  constructor(config = {}) {
    this.gasPrice = config.gasPrice || BigInt(30e9); // Default 30 gwei
    this.ethPrices = config.ethPrices || {}; // ETH prices in various tokens
    this.useFlashLoans = config.useFlashLoans || false;
    this.safetyMargin = config.safetyMargin || GAS_COSTS.SAFETY_MARGIN;
  }

  /**
   * Update gas price
   */
  setGasPrice(gasPrice) {
    this.gasPrice = BigInt(gasPrice);
  }

  /**
   * Update ETH price in specific token
   */
  setEthPrice(token, price) {
    this.ethPrices[token] = price;
  }

  /**
   * Estimate gas cost for a path
   */
  estimatePathCost(edges, options = {}) {
    const gasUnits = this.useFlashLoans
      ? estimateFlashLoanGasCost(edges, options)
      : estimatePathGasCost(edges, options);

    const gasCostWei = gasToWei(gasUnits, this.gasPrice);
    const gasCostWithMargin = applySafetyMargin(gasCostWei);

    return {
      gasUnits,
      gasCostWei,
      gasCostWithMargin,
      gwei: Number(this.gasPrice) / 1e9,
      ethCost: Number(gasCostWei) / 1e18,
      ethCostWithMargin: Number(gasCostWithMargin) / 1e18
    };
  }

  /**
   * Estimate gas cost in token units
   */
  estimatePathCostToken(edges, token, tokenDecimals, options = {}) {
    const gasCost = this.estimatePathCost(edges, options);
    const ethPriceInToken = this.ethPrices[token] || 0;

    if (ethPriceInToken === 0) {
      return {
        ...gasCost,
        tokenCost: 0n,
        tokenCostWithMargin: 0n,
        canConvert: false
      };
    }

    const tokenCost = gasToTokenUnits(gasCost.gasCostWei, tokenDecimals, ethPriceInToken);
    const tokenCostWithMargin = gasToTokenUnits(gasCost.gasCostWithMargin, tokenDecimals, ethPriceInToken);

    return {
      ...gasCost,
      tokenCost,
      tokenCostWithMargin,
      tokenDecimals,
      ethPriceInToken,
      canConvert: true
    };
  }

  /**
   * Batch estimate gas costs for multiple paths
   */
  batchEstimate(paths, options = {}) {
    return paths.map((edges, index) => ({
      index,
      path: edges,
      estimate: this.estimatePathCost(edges, options)
    }));
  }

  /**
   * Get gas price in Gwei
   */
  getGasPriceGwei() {
    return Number(this.gasPrice) / 1e9;
  }

  /**
   * Check if gas price is too high
   */
  isGasPriceTooHigh(maxGwei = 100) {
    return this.getGasPriceGwei() > maxGwei;
  }

  /**
   * Get gas statistics
   */
  getGasStats() {
    return {
      gasPrice: this.gasPrice.toString(),
      gasPriceGwei: this.getGasPriceGwei(),
      useFlashLoans: this.useFlashLoans,
      safetyMargin: Number(this.safetyMargin),
      tokenPrices: this.ethPrices
    };
  }
}

export default GasEstimator;