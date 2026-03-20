/**
 * MEV Swarm - Profitability Calculator
 * Real net-profit calculation and opportunity ranking
 *
 * Combines gas costs and flash loan fees to calculate:
 * - Real net profit = finalOut - initialIn - gasCost - flashLoanFee
 * - Profitability thresholds and filtering
 * - Opportunity ranking across all paths
 * - ROI and risk-adjusted metrics
 */

import { ethers } from 'ethers';
import { GasEstimator } from './gas-estimator.js';
import { FlashLoanCalculator } from './flash-loan-calculator.js';

// Profitability thresholds (in basis points, 1 bps = 0.01%)
export const PROFITABILITY_THRESHOLDS = {
  MIN_PROFIT_BPS: 10n, // 0.1% minimum profit to consider
  GOOD_PROFIT_BPS: 50n, // 0.5% good profit
  EXCELLENT_PROFIT_BPS: 100n, // 1% excellent profit

  MIN_PROFIT_ETH: ethers.parseEther('0.01'), // $20 minimum profit in ETH
  MIN_PROFIT_USD: 20n * BigInt(1e18), // $20 minimum profit in USD
};

// Risk factors
export const RISK_FACTORS = {
  LIQUIDITY_RISK: 0.3, // 30% discount for low liquidity
  VOLATILITY_RISK: 0.1, // 10% discount for high volatility
  EXECUTION_RISK: 0.15, // 15% discount for execution uncertainty
};

/**
 * Calculate real net profit
 */
export function calculateRealNetProfit(amountIn, amountOut, gasCost, flashLoanFee = 0n) {
  return amountOut - amountIn - gasCost - flashLoanFee;
}

/**
 * Calculate profit in basis points
 */
export function calculateProfitBps(netProfit, amountIn) {
  if (amountIn === 0n) return 0n;
  return (netProfit * 10000n) / amountIn;
}

/**
 * Check if opportunity meets minimum profitability
 */
export function meetsMinimumProfitability(netProfit, amountIn, options = {}) {
  const minProfitBps = options.minProfitBps || PROFITABILITY_THRESHOLDS.MIN_PROFIT_BPS;
  const profitBps = calculateProfitBps(netProfit, amountIn);

  return profitBps >= minProfitBps;
}

/**
 * Calculate risk-adjusted profit
 */
export function calculateRiskAdjustedProfit(netProfit, riskFactors = {}) {
  let discountFactor = 1.0;

  if (riskFactors.lowLiquidity) {
    discountFactor *= (1.0 - RISK_FACTORS.LIQUIDITY_RISK);
  }

  if (riskFactors.highVolatility) {
    discountFactor *= (1.0 - RISK_FACTORS.VOLATILITY_RISK);
  }

  if (riskFactors.executionUncertainty) {
    discountFactor *= (1.0 - RISK_FACTORS.EXECUTION_RISK);
  }

  return BigInt(Math.floor(Number(netProfit) * discountFactor));
}

/**
 * Rank opportunities by profit
 */
export function rankOpportunities(opportunities) {
  return opportunities
    .filter(opp => opp.netProfit > 0n)
    .sort((a, b) => {
      // Primary sort: net profit
      const profitDiff = b.netProfit - a.netProfit;
      if (profitDiff !== 0n) return Number(profitDiff);

      // Secondary sort: profit percentage (BPS)
      const bpsDiff = b.profitBps - a.profitBps;
      if (bpsDiff !== 0n) return Number(bpsDiff);

      // Tertiary sort: gas efficiency (profit per gas)
      const gasEfficiencyA = a.netProfit / (a.gasCost || 1n);
      const gasEfficiencyB = b.netProfit / (b.gasCost || 1n);
      return Number(gasEfficiencyB - gasEfficiencyA);
    });
}

/**
 * Filter opportunities by profitability
 */
export function filterOpportunities(opportunities, options = {}) {
  const minProfitBps = options.minProfitBps || PROFITABILITY_THRESHOLDS.MIN_PROFIT_BPS;
  const minProfitEth = options.minProfitEth || PROFITABILITY_THRESHOLDS.MIN_PROFIT_ETH;

  return opportunities.filter(opp => {
    if (opp.netProfit <= 0n) return false;

    const profitBps = calculateProfitBps(opp.netProfit, opp.amountIn);
    const meetsBpsThreshold = profitBps >= minProfitBps;
    const meetsEthThreshold = opp.netProfit >= minProfitEth;

    return meetsBpsThreshold && meetsEthThreshold;
  });
}

/**
 * Calculate opportunity quality score
 */
export function calculateOpportunityQuality(opp) {
  let score = 0;

  // Profit score (0-40 points)
  if (opp.netProfit > ethers.parseEther('0.1')) score += 40; // >$200
  else if (opp.netProfit > ethers.parseEther('0.05')) score += 30; // >$100
  else if (opp.netProfit > ethers.parseEther('0.02')) score += 20; // >$40
  else if (opp.netProfit > ethers.parseEther('0.01')) score += 10; // >$20

  // Profit percentage score (0-30 points)
  if (opp.profitBps > 100n) score += 30; // >1%
  else if (opp.profitBps > 50n) score += 20; // >0.5%
  else if (opp.profitBps > 20n) score += 10; // >0.2%

  // Gas efficiency score (0-20 points)
  const gasEfficiency = opp.netProfit / (opp.gasCost || 1n);
  if (gasEfficiency > 100000000000000n) score += 20; // >0.1 ETH per gas
  else if (gasEfficiency > 50000000000000n) score += 10; // >0.05 ETH per gas

  // Execution risk score (0-10 points)
  if (!opp.riskFactors?.lowLiquidity && !opp.riskFactors?.highVolatility) {
    score += 10;
  }

  return score;
}

/**
 * Profitability Calculator Class
 * Main interface for profitability calculations
 */
export class ProfitabilityCalculator {
  constructor(config = {}) {
    this.gasEstimator = new GasEstimator(config.gas || {});
    this.flashLoanCalculator = new FlashLoanCalculator(config.flashLoan || {});
    this.minProfitBps = config.minProfitBps || PROFITABILITY_THRESHOLDS.MIN_PROFIT_BPS;
    this.minProfitEth = config.minProfitEth || PROFITABILITY_THRESHOLDS.MIN_PROFIT_ETH;
    this.useFlashLoans = config.useFlashLoans || false;
  }

  /**
   * Calculate full profitability for a path
   */
  calculatePathProfitability(edges, amountIn, amountOut, options = {}) {
    // Estimate gas cost
    const gasEstimate = this.gasEstimator.estimatePathCost(edges, options);
    const gasCost = gasEstimate.gasCostWithMargin;

    // Calculate flash loan fee if applicable
    let flashLoanFee = 0n;
    if (this.useFlashLoans) {
      flashLoanFee = this.flashLoanCalculator.calculateFee(amountIn);
    }

    // Calculate net profit
    const netProfit = calculateRealNetProfit(amountIn, amountOut, gasCost, flashLoanFee);
    const profitBps = calculateProfitBps(netProfit, amountIn);

    // Check profitability
    const isProfitable = netProfit > 0n;
    const meetsMinimum = meetsMinimumProfitability(netProfit, amountIn, {
      minProfitBps: this.minProfitBps
    });

    // Calculate risk-adjusted profit
    const riskAdjustedProfit = calculateRiskAdjustedProfit(netProfit, options.riskFactors);

    return {
      amountIn,
      amountOut,
      gasCost,
      flashLoanFee,
      gasEstimate,
      netProfit,
      riskAdjustedProfit,
      profitBps,
      profitPercentage: Number(profitBps) / 100,
      isProfitable,
      meetsMinimum,
      edges: edges.length,
      riskFactors: options.riskFactors || {}
    };
  }

  /**
   * Batch calculate profitability for multiple paths
   */
  batchCalculateProfitability(paths, options = {}) {
    return paths.map((pathData, index) => {
      const { edges, amountIn, amountOut } = pathData;
      return {
        index,
        path: edges,
        ...this.calculatePathProfitability(edges, amountIn, amountOut, options)
      };
    });
  }

  /**
   * Filter profitable opportunities
   */
  filterProfitable(opportunities, options = {}) {
    return filterOpportunities(opportunities, {
      minProfitBps: options.minProfitBps || this.minProfitBps,
      minProfitEth: options.minProfitEth || this.minProfitEth
    });
  }

  /**
   * Rank opportunities by profit
   */
  rankOpportunities(opportunities) {
    return rankOpportunities(opportunities);
  }

  /**
   * Get top opportunities
   */
  getTopOpportunities(opportunities, limit = 10) {
    const filtered = this.filterProfitable(opportunities);
    const ranked = this.rankOpportunities(filtered);
    return ranked.slice(0, limit);
  }

  /**
   * Calculate opportunity quality score
   */
  calculateQuality(opp) {
    return calculateOpportunityQuality(opp);
  }

  /**
   * Get opportunity summary
   */
  getOpportunitySummary(opp) {
    const quality = this.calculateQuality(opp);

    return {
      path: opp.path.map(e => e.poolId).join(' → '),
      amountIn: ethers.formatEther(opp.amountIn),
      amountOut: ethers.formatEther(opp.amountOut),
      netProfit: ethers.formatEther(opp.netProfit),
      profitBps: opp.profitBps,
      profitPercentage: opp.profitPercentage,
      gasCost: ethers.formatEther(opp.gasCost),
      flashLoanFee: ethers.formatEther(opp.flashLoanFee),
      quality,
      qualityLabel: this.getQualityLabel(quality),
      isProfitable: opp.isProfitable,
      meetsMinimum: opp.meetsMinimum
    };
  }

  /**
   * Get quality label
   */
  getQualityLabel(score) {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  }

  /**
   * Update configuration
   */
  updateConfig(config) {
    if (config.gas) {
      Object.assign(this.gasEstimator, config.gas);
    }
    if (config.flashLoan) {
      Object.assign(this.flashLoanCalculator, config.flashLoan);
    }
    if (config.minProfitBps) {
      this.minProfitBps = config.minProfitBps;
    }
    if (config.minProfitEth) {
      this.minProfitEth = config.minProfitEth;
    }
    if (config.useFlashLoans !== undefined) {
      this.useFlashLoans = config.useFlashLoans;
    }
  }

  /**
   * Get calculator statistics
   */
  getStats() {
    return {
      gasEstimator: this.gasEstimator.getGasStats(),
      flashLoanCalculator: this.flashLoanCalculator.getProviderInfo(),
      config: {
        minProfitBps: this.minProfitBps,
        minProfitEth: this.minProfitEth.toString(),
        useFlashLoans: this.useFlashLoans
      }
    };
  }
}

export default ProfitabilityCalculator;