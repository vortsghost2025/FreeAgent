/**
 * MEV Swarm - Gas & Profitability Layer
 * Main export module for Chamber 4
 *
 * This layer provides:
 * - Gas cost estimation per hop type
 * - Flash loan fee modeling
 * - Real net-profit calculation
 * - Opportunity filtering and ranking
 */

export {
  // Gas Estimator
  GasEstimator,
  GAS_COSTS,
  POOL_GAS_COSTS,
  estimateHopGasCost,
  estimatePathGasCost,
  estimateFlashLoanGasCost,
  gasToWei,
  gasToTokenUnits,
  estimatePathGasCostWei,
  estimateFlashLoanGasCostWei,
  applySafetyMargin
} from './gas-estimator.js';

export {
  // Flash Loan Calculator
  FlashLoanCalculator,
  FLASH_LOAN_FEES,
  DEFAULT_FLASH_LOAN_PROVIDER,
  calculateFlashLoanFee,
  calculateFlashLoanRepayment,
  isFlashLoanProfitable,
  calculateNetProfit,
  calculateMinimumProfitableAmount
} from './flash-loan-calculator.js';

export {
  // Profitability Calculator
  ProfitabilityCalculator,
  PROFITABILITY_THRESHOLDS,
  RISK_FACTORS,
  calculateRealNetProfit,
  calculateProfitBps,
  meetsMinimumProfitability,
  calculateRiskAdjustedProfit,
  rankOpportunities,
  filterOpportunities,
  calculateOpportunityQuality
} from './profitability-calculator.js';

export { default as GasEstimator } from './gas-estimator.js';
export { default as FlashLoanCalculator } from './flash-loan-calculator.js';
export { default as ProfitabilityCalculator } from './profitability-calculator.js';