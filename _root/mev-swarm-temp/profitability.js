/**
 * MEV Swarm - Profitability Engine
 * Calculates true net PnL accounting for gas, DEX fees, slippage, and transfer costs
 */

import { ethers } from 'ethers';

// DEX Fee Tiers (in basis points)
export const DEX_FEES = {
  UniswapV3_005: 5,   // 0.05% - stable pairs
  UniswapV3_030: 30,  // 0.30% - most pairs
  UniswapV3_100: 100, // 1.00% - exotic pairs
  UniswapV2: 30,      // 0.30%
  SushiSwap: 25       // 0.25%
};

// Default gas estimates (in gas units)
export const GAS_ESTIMATES = {
  // Arbitrage: 2 swaps (buy low, sell high)
  arbitrageTwoSwap: 250000,
  // Single swap (for comparison)
  singleSwap: 120000,
  // Token transfers
  erc20Transfer: 65000,
  // ETH wrap/unwrap
  wrapUnwrap: 45000
};

/**
 * Calculate gas cost in USD
 */
export async function calculateGasCost(provider, gasUnits, gasMultiplier = 1.2) {
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || 30000000000n; // default 30 gwei
  
  // Apply multiplier for safety buffer
  const adjustedGasPrice = gasPrice * BigInt(Math.floor(gasMultiplier * 100)) / 100n;
  
  const gasCostWei = BigInt(gasUnits) * adjustedGasPrice;
  
  // Get ETH price for USD conversion (simplified - you may want to fetch real price)
  // For now return in ETH, caller can convert
  return {
    gasCostWei,
    gasCostEth: parseFloat(ethers.formatEther(gasCostWei)),
    gasPriceWei: gasPrice,
    adjustedGasPriceWei: adjustedGasPrice,
    gasUnits
  };
}

/**
 * Calculate DEX fee in token terms
 */
export function calculateDexFee(amountIn, feeBps) {
  const feeNumerator = BigInt(feeBps);
  const feeDenominator = 10000n;
  const fee = amountIn * feeNumerator / feeDenominator;
  
  return {
    feeWei: fee,
    feeEth: parseFloat(ethers.formatEther(fee)),
    feeBps
  };
}

/**
 * Calculate slippage cost
 */
export function calculateSlippageCost(amountOut, slippageBps) {
  const slippageNumerator = BigInt(slippageBps);
  const slippageDenominator = 10000n;
  const slippageLoss = amountOut * slippageNumerator / slippageDenominator;
  
  return {
    slippageLossWei: slippageLoss,
    slippageLossEth: parseFloat(ethers.formatEther(slippageLoss)),
    slippageBps
  };
}

/**
 * Main profitability calculator
 * Returns full cost breakdown and net PnL estimates
 */
export async function calculateProfitability({
  provider,
  amountIn,           // BigInt: input amount in wei
  entryPrice,         // number: price at entry (USD per ETH)
  exitPrice,         // number: expected exit price (USD per ETH)
  feeBps = 30,        // DEX fee in bps (default 0.3%)
  slippageBps = 30,   // slippage tolerance in bps (default 0.3%)
  gasUnits = 250000,  // estimated gas for the trade
  gasMultiplier = 1.2,
  ethPriceUsd = 2500  // ETH price in USD (for gas cost conversion)
}) {
  // 1. Calculate entry value in USD
  const entryAmountUsd = parseFloat(ethers.formatEther(amountIn)) * entryPrice;
  
  // 2. Calculate expected output (before slippage)
  const expectedOutputWei = amountIn; // For ETH-USDC, output should be more than input
  const expectedOutputEth = parseFloat(ethers.formatEther(expectedOutputWei));
  const expectedOutputUsd = expectedOutputEth * exitPrice;
  
  // 3. Calculate gross PnL
  const grossPnlUsd = expectedOutputUsd - entryAmountUsd;
  const grossPnlEth = expectedOutputEth - parseFloat(ethers.formatEther(amountIn));
  
  // 4. Calculate gas costs
  const gasInfo = await calculateGasCost(provider, gasUnits, gasMultiplier);
  const gasCostUsd = gasInfo.gasCostEth * ethPriceUsd;
  
  // 5. Calculate DEX fees (on input amount)
  const dexFeeInfo = calculateDexFee(amountIn, feeBps);
  const dexFeeUsd = dexFeeInfo.feeEth * entryPrice;
  
  // 6. Calculate slippage cost (on output)
  const expectedOutputAfterSlippage = expectedOutputWei - (expectedOutputWei * BigInt(slippageBps) / 10000n);
  const slippageInfo = calculateSlippageCost(expectedOutputWei, slippageBps);
  const slippageUsd = slippageInfo.slippageLossEth * exitPrice;
  
  // 7. Total costs
  const totalCostsUsd = gasCostUsd + dexFeeUsd + slippageUsd;
  const totalCostsEth = gasInfo.gasCostEth + dexFeeInfo.feeEth + slippageInfo.slippageLossEth;
  
  // 8. Net PnL
  const netPnlUsd = grossPnlUsd - totalCostsUsd;
  const netPnlEth = grossPnlEth - totalCostsEth;
  
  // 9. Net PnL percentage
  const pnlPercent = entryAmountUsd > 0 ? (netPnlUsd / entryAmountUsd) * 100 : 0;
  
  // 10. Safety factor check
  // Requirement: expected_gross_pnl > estimated_total_costs × m
  const SAFETY_FACTOR = 2.0;
  const requiredGrossPnl = totalCostsUsd * SAFETY_FACTOR;
  const passesSafetyCheck = grossPnlUsd > requiredGrossPnl;
  
  return {
    // Inputs
    amountInEth: parseFloat(ethers.formatEther(amountIn)),
    amountInWei: amountIn.toString(),
    entryPrice,
    exitPrice,
    feeBps,
    slippageBps,
    ethPriceUsd,
    
    // Calculations
    entryAmountUsd,
    expectedOutputUsd,
    expectedOutputEth,
    
    // Costs breakdown
    gasCostEth: gasInfo.gasCostEth,
    gasCostUsd,
    dexFeeEth: dexFeeInfo.feeEth,
    dexFeeUsd,
    slippageEth: slippageInfo.slippageLossEth,
    slippageUsd,
    
    // Totals
    totalCostsUsd,
    totalCostsEth,
    
    // PnL
    grossPnlUsd,
    grossPnlEth,
    netPnlUsd,
    netPnlEth,
    pnlPercent,
    
    // Safety check
    requiredGrossPnl,
    passesSafetyCheck,
    safetyFactor: SAFETY_FACTOR
  };
}

/**
 * Simplified check - should we execute this trade?
 * Returns true if trade passes profitability and safety thresholds
 */
export async function shouldExecute({
  provider,
  amountIn,
  entryPrice,
  exitPrice,
  feeBps = 30,
  slippageBps = 30,
  gasUnits = 250000,
  gasMultiplier = 1.2,
  ethPriceUsd = 2500,
  minNetPnlUsd = 0.50  // Minimum $0.50 profit to bother
}) {
  const analysis = await calculateProfitability({
    provider,
    amountIn,
    entryPrice,
    exitPrice,
    feeBps,
    slippageBps,
    gasUnits,
    gasMultiplier,
    ethPriceUsd
  });
  
  return {
    execute: analysis.passesSafetyCheck && analysis.netPnlUsd >= minNetPnlUsd,
    analysis,
    reason: !analysis.passesSafetyCheck 
      ? `Gross PnL $${analysis.grossPnlUsd.toFixed(2)} < required $${analysis.requiredGrossPnl.toFixed(2)} (safety factor ${analysis.safetyFactor}x)`
      : analysis.netPnlUsd < minNetPnlUsd
        ? `Net PnL $${analysis.netPnlUsd.toFixed(2)} < minimum $${minNetPnlUsd}`
        : 'OK'
  };
}

/**
 * Format profitability analysis for console logging
 */
export function formatProfitabilityLog(analysis) {
  const lines = [
    '══════════════════════════════════════════════════════',
    '💰 PROFITABILITY ANALYSIS',
    '══════════════════════════════════════════════════════',
    `📥 Entry:    ${analysis.amountInEth.toFixed(6)} ETH @ $${analysis.entryPrice.toFixed(2)} = $${analysis.entryAmountUsd.toFixed(2)}`,
    `📤 Exit:     ${analysis.expectedOutputEth.toFixed(6)} ETH @ $${analysis.exitPrice.toFixed(2)} = $${analysis.expectedOutputUsd.toFixed(2)}`,
    '',
    '💸 COSTS:',
    `   ⛽ Gas:       $${analysis.gasCostUsd.toFixed(4)} (${analysis.gasCostEth.toFixed(6)} ETH)`,
    `   📊 DEX Fee:   $${analysis.dexFeeUsd.toFixed(4)} (${analysis.dexFeeEth.toFixed(6)} ETH @ ${analysis.feeBps/100}%)`,
    `   📉 Slippage: $${analysis.slippageUsd.toFixed(4)} (${analysis.slippageEth.toFixed(6)} ETH @ ${analysis.slippageBps/100}%)`,
    `   ─────────────────────────────`,
    `   💵 TOTAL:    $${analysis.totalCostsUsd.toFixed(4)}`,
    '',
    '📈 PnL:',
    `   Gross:    $${analysis.grossPnlUsd.toFixed(4)} (${analysis.grossPnlEth.toFixed(6)} ETH)`,
    `   Net:      $${analysis.netPnlUsd.toFixed(4)} (${analysis.netPnlEth.toFixed(6)} ETH)`,
    `   %:        ${analysis.pnlPercent.toFixed(2)}%`,
    '',
    `🛡️  Safety:  ${analysis.passesSafetyCheck ? '✅ PASS' : '❌ FAIL'} (need ${analysis.safetyFactor}x costs = $${analysis.requiredGrossPnl.toFixed(2)})`,
    '══════════════════════════════════════════════════════'
  ];
  
  return lines.join('\n');
}

export default {
  DEX_FEES,
  GAS_ESTIMATES,
  calculateGasCost,
  calculateDexFee,
  calculateSlippageCost,
  calculateProfitability,
  shouldExecute,
  formatProfitabilityLog
};
