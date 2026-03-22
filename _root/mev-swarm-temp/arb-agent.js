/**
 * MEV Swarm - Arbitrage Detection Agent
 * Analyzes price differences across pools and calculates profitable trades
 */

import { getCachedPrices, refreshAllPools } from './pool-watcher.js';

const OPPORTUNITY_THRESHOLD = parseFloat(process.env.ARB_THRESHOLD || '0.003'); // 0.3% min profit
const MIN_PROFIT_USD = parseFloat(process.env.MIN_PROFIT_USD || '10'); // $10 min profit
const DRY_RUN = process.env.DRY_RUN === 'true' || (process.env.DRY_RUN === undefined && process.argv.includes('--dry-run'));

// Safety warning for live trading
if (!DRY_RUN) {
  console.warn('\n⚠️  WARNING: LIVE TRADING MODE ENABLED ⚠️');
  console.warn('    Set DRY_RUN=true to run in simulation mode\n');
} else {
  console.log('🔒 DRY RUN MODE - No real trades will be executed');
}
const MAX_HISTORY = 1000;
const MAX_OPPORTUNITIES = 100;

// Gas estimation (in Gwei)
const GAS_PRICES = {
  ethereum: { standard: 20, fast: 50, instant: 100 },
  arbitrum: { standard: 0.1, fast: 0.2, instant: 0.5 },
  optimism: { standard: 0.001, fast: 0.005, instant: 0.01 },
  bsc: { standard: 3, fast: 5, instant: 10 }
};

// Average gas usage per operation type
const GAS_ESTIMATES = {
  swap: 150000,
  approve: 50000,
  transfer: 21000
};

// Exchange fee structures (in basis points)
const EXCHANGE_FEES = {
  'uniswap-v3': 30,
  'uniswap-v2': 30,
  'sushiswap': 30,
  'curve': 4,
  'balancer': 10,
  'pancakeswap': 25,
  'default': 30
};

const opportunities = [];
const opportunityHistory = [];
let lastAnalysisTime = 0;

// Trim opportunityHistory to prevent memory exhaustion
function trimOpportunityHistory() {
  if (opportunityHistory.length > MAX_HISTORY) {
    opportunityHistory.splice(0, opportunityHistory.length - MAX_HISTORY);
  }
  if (opportunities.length > MAX_OPPORTUNITIES) {
    opportunities.splice(0, opportunities.length - MAX_OPPORTUNITIES);
  }
}

// Calculate gas cost in USD
function calculateGasCost(chain, gasUnits = GAS_ESTIMATES.swap, speed = 'fast') {
  const gweiPrice = GAS_PRICES[chain]?.[speed] || GAS_PRICES.ethereum.fast;
  const ethPrice = Number(process.env.ETH_PRICE ?? 3000); // Configurable via ETH_PRICE env var
  return (gasUnits * gweiPrice * ethPrice) / 1e9;
}

// Calculate profitability after fees and gas
function calculateProfitability(buyPrice, sellPrice, tradeSizeUSD, chain, exchanges) {
  const fee1 = EXCHANGE_FEES[exchanges[0]] || EXCHANGE_FEES.default;
  const fee2 = EXCHANGE_FEES[exchanges[1]] || EXCHANGE_FEES.default;
  const totalFees = (fee1 + fee2) / 10000;
  const gasCost = calculateGasCost(chain);
  const grossProfit = (sellPrice - buyPrice) / buyPrice;
  const netProfit = grossProfit - totalFees - (gasCost / tradeSizeUSD);
  return {
    grossProfitPercent: grossProfit * 100,
    netProfitPercent: netProfit * 100,
    feesPercent: totalFees * 100,
    gasCostUSD: gasCost,
    isProfitable: netProfit > 0
  };
}

// Detect which chain an exchange belongs to
function detectChain(exchange) {
  const chainMap = {
    'uniswap': 'ethereum',
    'sushiswap': 'ethereum',
    'curve': 'ethereum',
    'balancer': 'ethereum',
    'pancakeswap': 'bsc',
    'quickswap': 'polygon',
    'traderjoe': 'avalanche'
  };
  for (const [dex, chain] of Object.entries(chainMap)) {
    if (exchange?.toLowerCase().includes(dex)) {
      return chain;
    }
  }
  return 'ethereum';
}

// Cross-pool arbitrage detection
export async function detectArbitrage(pools) {
  const found = [];
  const poolNames = Object.keys(pools);
  
  for (let i = 0; i < poolNames.length; i++) {
    for (let j = i + 1; j < poolNames.length; j++) {
      const poolA = pools[poolNames[i]];
      const poolB = pools[poolNames[j]];
      
      if (!poolA || !poolB) continue;
      
      // Check if pools share a token (e.g., both have ETH)
      const tokenA0 = poolNames[i].split('/')[0];
      const tokenA1 = poolNames[i].split('/')[1];
      const tokenB0 = poolNames[j].split('/')[0];
      const tokenB1 = poolNames[j].split('/')[1];
      
      // Find common token
      let commonToken, otherTokenA, otherTokenB;
      if (tokenA0 === tokenB0) {
        commonToken = tokenA0;
        otherTokenA = tokenA1;
        otherTokenB = tokenB1;
      } else if (tokenA0 === tokenB1) {
        commonToken = tokenA0;
        otherTokenA = tokenA1;
        otherTokenB = tokenB0;
      } else if (tokenA1 === tokenB0) {
        commonToken = tokenA1;
        otherTokenA = tokenA0;
        otherTokenB = tokenB1;
      } else if (tokenA1 === tokenB1) {
        commonToken = tokenA1;
        otherTokenA = tokenA0;
        otherTokenB = tokenB0;
      } else {
        continue; // No common token
      }
      
      if (otherTokenA === otherTokenB) {
        // Both pools trade the same token pair - check for price discrepancy
        const priceDiff = Math.abs(poolA.price - poolB.price) / Math.min(poolA.price, poolB.price);
        
        if (priceDiff > OPPORTUNITY_THRESHOLD) {
          const cheaperPool = poolA.price < poolB.price ? poolNames[i] : poolNames[j];
          const expensivePool = poolA.price < poolB.price ? poolNames[j] : poolNames[i];
          const profitPerUnit = Math.abs(poolA.price - poolB.price);
          
          // Estimate max profit based on liquidity (simplified)
          const estimatedMaxProfit = profitPerUnit * 10000; // Assume $10k liquidity
          
          if (estimatedMaxProfit > MIN_PROFIT_USD) {
            found.push({
              type: 'cross-pool',
              pair: otherTokenA + '/' + commonToken,
              cheapExchange: cheaperPool,
              expensiveExchange: expensivePool,
              buyPrice: Math.min(poolA.price, poolB.price),
              sellPrice: Math.max(poolA.price, poolB.price),
              spread: priceDiff * 100,
              estimatedProfitUSD: estimatedMaxProfit,
              timestamp: Date.now(),
              blockNumber: poolA.block
            });
          }
        }
      }
    }
  }
  
  return found;
}

// Triangular arbitrage detection
export async function detectTriangularArbitrage() {
  // This would require more complex pool data
  // For now, return empty - would need more DEXes
  return [];
}

// Main analysis function
export async function analyzeOpportunities() {
  const now = Date.now();
  
  // Rate limit: don't analyze more than once per second
  if (now - lastAnalysisTime < 1000) {
    return opportunities;
  }
  lastAnalysisTime = now;
  
  try {
    const pools = await refreshAllPools();
    const arbOpps = await detectArbitrage(pools);
    const triArbOpps = await detectTriangularArbitrage();
    
    const allOpps = [...arbOpps, ...triArbOpps];
    
    if (allOpps.length > 0) {
      console.log('\n[ArbAgent] 🚨 Found ' + allOpps.length + ' opportunity(ies)!');
      
      for (const opp of allOpps) {
        console.log('[ArbAgent]   ' + opp.pair + ' | Spread: ' + opp.spread.toFixed(2) + '% | Est. profit: ' + opp.estimatedProfitUSD.toFixed(2));
        
        if (!DRY_RUN && opp.estimatedProfitUSD > MIN_PROFIT_USD * 10) {
          console.log('[ArbAgent]   ⚠️ HIGH VALUE - Consider executing!');
        }
        
        opportunities.push(opp);
        opportunityHistory.push(opp);
        
        // Trim history to prevent memory exhaustion
        trimOpportunityHistory();
      }
    }
    
    return allOpps;
  } catch (err) {
    console.error('[ArbAgent] Error analyzing:', err.message);
    return [];
  }
}

// Get opportunity statistics
export function getStats() {
  const totalOpps = opportunityHistory.length;
  const totalEstimatedProfit = opportunityHistory.reduce((sum, o) => sum + o.estimatedProfitUSD, 0);
  const avgSpread = totalOpps > 0 
    ? opportunityHistory.reduce((sum, o) => sum + o.spread, 0) / totalOpps 
    : 0;
  
  return {
    totalOpportunities: totalOpps,
    totalEstimatedProfit,
    averageSpread: avgSpread,
    currentOpportunities: opportunities.length,
    dryRun: DRY_RUN
  };
}

export function clearOpportunities() {
  opportunities.length = 0;
}

export function getRecentOpportunities(count = 10) {
  return opportunityHistory.slice(-count);
}

export { opportunities, opportunityHistory, DRY_RUN, calculateGasCost, calculateProfitability }; 

