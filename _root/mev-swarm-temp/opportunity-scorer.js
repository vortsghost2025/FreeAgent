/**
 * MEV Swarm - Opportunity Scorer
 * Evaluates and scores arbitrage opportunities based on price deltas, gas costs, and profitability
 * 
 * Usage:
 *   import { scoreOpportunities, getBestOpportunity } from './opportunity-scorer.js';
 */

import { ethers } from 'ethers';

// Default gas settings
const DEFAULT_GAS_PRICE = ethers.parseUnits('30', 'gwei'); // 30 gwei
const DEFAULT_SWAP_GAS = 150000; // Gas for a swap
const DEFAULT_ARB_GAS = 250000; // Gas for arbitrage (2 swaps)
const MIN_PROFIT_THRESHOLD = 0.01; // Min 0.01 ETH profit

/**
 * Calculate price delta between two pools
 */
function calculatePriceDelta(priceA, priceB) {
  if (!priceA || !priceB || priceA === 0 || priceB === 0) return 0;
  return Math.abs((priceA - priceB) / priceB);
}

/**
 * Estimate gas cost in ETH
 */
function estimateGasCost(gasUnits, gasPrice = DEFAULT_GAS_PRICE) {
  return Number(ethers.formatEther(gasUnits * gasPrice));
}

/**
 * Calculate potential profit from arbitrage
 * @param {number} priceDelta - Price difference as decimal (e.g., 0.01 = 1%)
 * @param {number} tradeSize - Trade size in ETH
 * @param {number} gasCost - Gas cost in ETH
 */
function calculateProfit(priceDelta, tradeSize, gasCost) {
  const grossProfit = tradeSize * priceDelta;
  const netProfit = grossProfit - gasCost;
  return netProfit;
}

/**
 * Score an opportunity based on profitability and confidence
 */
function scoreOpportunity(opp, gasPrice = DEFAULT_GAS_PRICE) {
  const { type, poolA, poolB, priceA, priceB, route } = opp;
  
  // Calculate price delta
  const priceDelta = calculatePriceDelta(priceA, priceB);
  
  // Estimate gas cost
  const isMultiHop = route && route.length > 2;
  const gasUnits = isMultiHop ? DEFAULT_ARB_GAS * (route.length - 1) : DEFAULT_ARB_GAS;
  const gasCostEth = estimateGasCost(gasUnits, gasPrice);
  
  // Calculate optimal trade size based on liquidity (simplified)
  // In production, would query actual pool reserves
  const optimalTradeSize = Math.min(
    1, // Max 1 ETH per opportunity
    priceDelta > 0.02 ? 0.5 : 0.2 // Bigger trades for bigger deltas
  );
  
  // Calculate profit
  const profit = calculateProfit(priceDelta, optimalTradeSize, gasCostEth);
  
  // Score: 0-100 based on profit margin
  let score = 0;
  if (profit > 0.1) score = 100;
  else if (profit > 0.05) score = 80;
  else if (profit > 0.02) score = 60;
  else if (profit > 0.01) score = 40;
  else if (profit > 0) score = 20;
  
  // Confidence modifier based on price delta stability
  const confidence = Math.min(1, priceDelta * 10); // Higher delta = higher confidence
  
  return {
    ...opp,
    priceDelta: (priceDelta * 100).toFixed(4) + '%',
    gasCostEth: gasCostEth.toFixed(6),
    estimatedProfitEth: profit.toFixed(6),
    optimalTradeSize,
    score,
    confidence: (confidence * 100).toFixed(0) + '%',
    isViable: profit > 0.01,
    timestamp: Date.now()
  };
}

/**
 * Score all opportunities from pool data
 */
export function scoreOpportunities(poolData, gasPrice = DEFAULT_GAS_PRICE) {
  const opportunities = [];
  
  // Get normalized prices (handle inverted prices)
  const prices = normalizePrices(poolData);
  
  // Check for two-pool arbitrage (USDC vs USDT)
  // FIXED: Higher token-per-ETH = cheaper token (can buy more with 1 ETH)
  if (prices.USDC && prices.USDT) {
    const usdcPerEth = prices.USDC;  // ~1970 USDC per ETH
    const usdtPerEth = prices.USDT;  // ~2000 USDT per ETH
    
    // USDC cheaper (higher token-per-ETH means you get more USDC per ETH)
    if (usdcPerEth > usdtPerEth * 1.005) { // 0.5% threshold
      opportunities.push({
        type: 'two-pool-arb',
        name: 'USDC→USDT',
        poolA: 'USDC/ETH',
        poolB: 'USDT/ETH',
        priceA: usdcPerEth,
        priceB: usdtPerEth,
        route: ['USDC', 'ETH', 'USDT'],
        direction: 'USDC→USDT'
      });
    }
    
    // USDT cheaper
    if (usdtPerEth > usdcPerEth * 1.005) {
      opportunities.push({
        type: 'two-pool-arb',
        name: 'USDT→USDC',
        poolA: 'USDT/ETH',
        poolB: 'USDC/ETH',
        priceA: usdtPerEth,
        priceB: usdcPerEth,
        route: ['USDT', 'ETH', 'USDC'],
        direction: 'USDT→USDC'
      });
    }
  }
  
  // Check for triangular arbitrage (USDC → USDT → ETH → USDC)
  if (prices.USDC && prices.USDT) {
    // Simplified triArb calculation
    const usdcToUsdt = 1 / prices.USDC; // How much USDT per USDC
    const usdtToEth = 1 / prices.USDT;  // How much ETH per USDT
    const ethToUsdc = prices.USDC;       // How much USDC per ETH
    
    const roundTrip = usdcToUsdt * usdtToEth * ethToUsdc;
    const triDelta = roundTrip - 1;
    
    if (Math.abs(triDelta) > 0.005) { // > 0.5% delta
      opportunities.push({
        type: 'triangular-arb',
        name: 'Triangular USDC-USDT-ETH',
        poolA: 'USDC/ETH',
        poolB: 'USDT/ETH',
        priceA: prices.USDC,
        priceB: prices.USDT,
        route: ['USDC', 'USDT', 'ETH', 'USDC'],
        triDelta: (triDelta * 100).toFixed(4) + '%'
      });
    }
  }
  
  // Check WBTC opportunities
  // FIXED: Removed incorrect implied price calculation
  if (prices.WBTC && prices.USDC) {
    // WBTC per ETH is ~0.029 (very small because it's WBTC, not USD)
    // USDC per ETH is ~1970
    // Just check if there's significant deviation from expected BTC/ETH ratio
    const wbtcPerEth = prices.WBTC;
    const usdcPerEth = prices.USDC;
    
    // Implied BTC price = USDC per ETH / WBTC per ETH
    // Should be around 68,000 (BTC price) if pools are efficient
    const impliedBtcPrice = usdcPerEth / wbtcPerEth;
    
    // If implied BTC price is way off from reality (~68k), flag it
    if (impliedBtcPrice < 50000 || impliedBtcPrice > 90000) {
      opportunities.push({
        type: 'wbtc-anomaly',
        name: 'WBTC Price Anomaly',
        poolA: 'WBTC/ETH',
        poolB: 'USDC/ETH',
        priceA: wbtcPerEth,
        priceB: usdcPerEth,
        route: ['WBTC', 'ETH', 'USDC'],
        impliedBtcPrice: impliedBtcPrice.toFixed(0)
      });
    }
  }
  
  // Score all opportunities
  return opportunities
    .map(opp => scoreOpportunity(opp, gasPrice))
    .filter(opp => opp.isViable)
    .sort((a, b) => b.score - a.score);
}

/**
 * Normalize prices to token-per-ETH base
 * FIXED: Use tokenPerEth directly from pool data
 */
function normalizePrices(poolData) {
  const prices = {};
  
  for (const [key, data] of Object.entries(poolData)) {
    // Use tokenPerEth directly (e.g., 1970 USDC per ETH)
    if (data?.tokenPerEth) {
      prices[key] = data.tokenPerEth;
    }
  }
  
  return prices;
}

/**
 * Get the best opportunity from scored opportunities
 */
export function getBestOpportunity(scoredOpps) {
  if (!scoredOpps || scoredOpps.length === 0) return null;
  return scoredOpps[0];
}

/**
 * Format opportunity for display
 */
export function formatOpportunity(opp) {
  if (!opp) return 'No opportunities';
  
  return `[${opp.type.toUpperCase()}] ${opp.name}
  Delta: ${opp.priceDelta} | Gas: ~${opp.gasCostEth} ETH
  Profit: ${opp.estimatedProfitEth} ETH | Score: ${opp.score}/100
  Route: ${opp.route?.join(' → ') || 'N/A'}`;
}

export default {
  scoreOpportunities,
  getBestOpportunity,
  formatOpportunity,
  calculateProfit,
  estimateGasCost
};