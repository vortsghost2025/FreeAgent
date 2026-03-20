/**
 * MEV Swarm - Flash Loan Calculator
 * Models flash loan costs for arbitrage profitability
 *
 * Flash loan providers and fees:
 * - Aave: 0.09% (9 basis points)
 * - dYdX: 0% (for now, may change)
 * - Uniswap V3 Flash Swaps: 0.3% (variable)
 *
 * Cost formula: flashLoanFee = amount * feeRate / 10000
 */

import { ethers } from 'ethers';

// Flash loan fee rates (in basis points, 1 bps = 0.01%)
export const FLASH_LOAN_FEES = {
  'aave': 9n, // 0.09%
  'dydx': 0n, // 0% (may change)
  'uniswap_v3': 30n, // 0.3% (variable, depends on pool fee)
  'balancer': 0n, // 0% (variable, depends on pool)
};

// Default provider
export const DEFAULT_FLASH_LOAN_PROVIDER = 'aave';

/**
 * Calculate flash loan fee in token units
 */
export function calculateFlashLoanFee(amountIn, provider = DEFAULT_FLASH_LOAN_PROVIDER) {
  const feeRate = FLASH_LOAN_FEES[provider] || FLASH_LOAN_FEES['aave'];
  const fee = (amountIn * feeRate) / 10000n;
  return fee;
}

/**
 * Calculate total repayment amount (principal + fee)
 */
export function calculateFlashLoanRepayment(amountIn, provider = DEFAULT_FLASH_LOAN_PROVIDER) {
  const fee = calculateFlashLoanFee(amountIn, provider);
  return amountIn + fee;
}

/**
 * Check if flash loan is profitable
 */
export function isFlashLoanProfitable(amountIn, amountOut, gasCost, provider = DEFAULT_FLASH_LOAN_PROVIDER) {
  const fee = calculateFlashLoanFee(amountIn, provider);
  const netProfit = amountOut - amountIn - fee - gasCost;
  return netProfit > 0n;
}

/**
 * Calculate net profit after flash loan costs
 */
export function calculateNetProfit(amountIn, amountOut, gasCost, provider = DEFAULT_FLASH_LOAN_PROVIDER) {
  const fee = calculateFlashLoanFee(amountIn, provider);
  return amountOut - amountIn - fee - gasCost;
}

/**
 * Calculate minimum profitable amount
 */
export function calculateMinimumProfitableAmount(profitMargin, gasCost, provider = DEFAULT_FLASH_LOAN_PROVIDER) {
  // We need: amountOut - amountIn - fee - gasCost > 0
  // Assuming profitMargin% return on trade: amountOut = amountIn * (1 + profitMargin/100)
  // So: amountIn * profitMargin/100 - fee - gasCost > 0
  // fee = amountIn * feeRate/10000
  // amountIn * profitMargin/100 - amountIn * feeRate/10000 - gasCost > 0
  // amountIn * (profitMargin/100 - feeRate/10000) > gasCost
  // amountIn > gasCost / (profitMargin/100 - feeRate/10000)

  const feeRate = FLASH_LOAN_FEES[provider] || FLASH_LOAN_FEES['aave'];
  const profitMarginBps = profitMargin * 100n; // Convert to basis points

  const marginPerBps = profitMarginBps - feeRate;

  if (marginPerBps <= 0n) {
    return Infinity; // Impossible to profit
  }

  const minAmount = (gasCost * 10000n) / marginPerBps;
  return minAmount;
}

/**
 * Flash Loan Calculator Class
 * Main interface for flash loan calculations
 */
export class FlashLoanCalculator {
  constructor(config = {}) {
    this.provider = config.provider || DEFAULT_FLASH_LOAN_PROVIDER;
    this.customFeeRates = config.customFeeRates || {};
  }

  /**
   * Set flash loan provider
   */
  setProvider(provider) {
    this.provider = provider;
  }

  /**
   * Set custom fee rate for a provider
   */
  setFeeRate(provider, feeRate) {
    this.customFeeRates[provider] = BigInt(feeRate);
  }

  /**
   * Get current fee rate
   */
  getFeeRate() {
    return this.customFeeRates[this.provider] || FLASH_LOAN_FEES[this.provider] || FLASH_LOAN_FEES['aave'];
  }

  /**
   * Calculate fee for an amount
   */
  calculateFee(amountIn, provider = null) {
    const actualProvider = provider || this.provider;
    return calculateFlashLoanFee(amountIn, actualProvider);
  }

  /**
   * Calculate total repayment
   */
  calculateRepayment(amountIn, provider = null) {
    const actualProvider = provider || this.provider;
    return calculateFlashLoanRepayment(amountIn, actualProvider);
  }

  /**
   * Calculate net profit
   */
  calculateNetProfit(amountIn, amountOut, gasCost, provider = null) {
    const actualProvider = provider || this.provider;
    return calculateNetProfit(amountIn, amountOut, gasCost, actualProvider);
  }

  /**
   * Check profitability
   */
  isProfitable(amountIn, amountOut, gasCost, provider = null) {
    const actualProvider = provider || this.provider;
    return isFlashLoanProfitable(amountIn, amountOut, gasCost, actualProvider);
  }

  /**
   * Calculate minimum profitable amount
   */
  calculateMinimumProfitableAmount(profitMargin, gasCost, provider = null) {
    const actualProvider = provider || this.provider;
    return calculateMinimumProfitableAmount(profitMargin, gasCost, actualProvider);
  }

  /**
   * Compare providers for best rate
   */
  compareProviders(amountIn) {
    const providers = Object.keys(FLASH_LOAN_FEES);
    const comparisons = [];

    for (const provider of providers) {
      const fee = this.calculateFee(amountIn, provider);
      const feeRate = this.customFeeRates[provider] || FLASH_LOAN_FEES[provider];
      comparisons.push({
        provider,
        fee,
        feeRate: Number(feeRate) / 100, // Convert to percentage
        feePercentage: Number(fee * 10000n / amountIn) / 100
      });
    }

    // Sort by fee (ascending)
    return comparisons.sort((a, b) => Number(a.fee - b.fee));
  }

  /**
   * Get provider info
   */
  getProviderInfo() {
    return {
      currentProvider: this.provider,
      feeRate: Number(this.getFeeRate()) / 100, // Convert to percentage
      feeRateBps: this.getFeeRate(),
      availableProviders: Object.keys(FLASH_LOAN_FEES).map(provider => ({
        provider,
        feeRate: Number(FLASH_LOAN_FEES[provider]) / 100
      }))
    };
  }

  /**
   * Calculate breakeven point
   */
  calculateBreakeven(profitPerUnit, gasCost) {
    // We need: profitPerUnit * amount - fee - gasCost > 0
    // profitPerUnit * amount - (amount * feeRate/10000) - gasCost > 0
    // amount * (profitPerUnit - feeRate/10000) > gasCost
    // amount > gasCost / (profitPerUnit - feeRate/10000)

    const feeRate = this.getFeeRate();
    const feePerUnit = feeRate / 10000n;

    if (profitPerUnit <= feePerUnit) {
      return Infinity; // Impossible to profit
    }

    const breakeven = gasCost / (profitPerUnit - feePerUnit);
    return breakeven;
  }
}

export default FlashLoanCalculator;