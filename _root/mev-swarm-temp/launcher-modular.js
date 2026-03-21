# REMOVED: sensitive data redacted by automated security cleanup
import 'dotenv/config';
import { ethers } from 'ethers';
import { SwarmExecutor } from './core/SwarmExecutor.js';
import { refreshAllPools } from './pool-watcher.js';

const CONFIG = {
  MIN_TRADE_ETH: 0.001,      // min 0.001 ETH to make gas worth it
  MIN_SPREAD_EXECUTE: 0.065, // min 0.065% spread to execute
  RISK_FRACTION: 0.25,       // use 25% of balance per trade
  ETH_PRICE_USD: 2500,       // ETH price for cost calculations
  MIN_PROFIT_THRESHOLD_USD: 0.01  // Minimum net profit threshold
};

const TOKENS = {
  ETH: 'REDACTED_ADDRESS',  // WETH
  USDC: 'REDACTED_ADDRESS'
};

// Pure orchestrator - no initialization logic here
class SwarmOrchestrator {
  constructor() {
    this.executor = null;
    this.cycles = 0;
  }

  async initialize() {
    console.log('Starting MEV Swarm Bot (Modular)...');
    console.log('Min spread threshold: ' + CONFIG.MIN_SPREAD_EXECUTE + '%');
    console.log('Min profit threshold: $' + CONFIG.MIN_PROFIT_THRESHOLD_USD);
    console.log('');

    // Initialize executor (two-phase async init)
    this.executor = new SwarmExecutor();
    await this.executor.init();

    // Show initial balances
    const ethBalance = await this.executor.getEthBalance();
    const wethBalance = await this.executor.getWethBalance();

    console.log('');
    console.log('Initial Balances:');
    console.log('  ETH:', ethers.formatEther(ethBalance), 'ETH');
    console.log('  WETH:', ethers.formatEther(wethBalance), 'ETH');
    console.log('');
  }

  async findOpportunities() {
    const prices = await refreshAllPools();

    if (!prices || Object.keys(prices).length === 0) {
      console.log('No prices available');
      return [];
    }

    const opportunities = [];
    const tokenPairs = {};

    // Group prices by token pair
    for (const [poolName, result] of Object.entries(prices)) {
      const pairName = poolName.replace(/SushiSwap |UniswapV2 /g, '');
      if (!tokenPairs[pairName]) {
        tokenPairs[pairName] = [];
      }
      tokenPairs[pairName].push({
        source: poolName,
        price: result.price,
        timestamp: result.timestamp
      });
    }

    // Find cross-DEX arbitrage opportunities
    for (const [pairName, sources] of Object.entries(tokenPairs)) {
      if (sources.length < 2) continue;

      const sorted = [...sources].sort((a, b) => a.price - b.price);
      const minPrice = sorted[0];
      const maxPrice = sorted[sorted.length - 1];

      const spread = ((maxPrice.price - minPrice.price) / minPrice.price) * 100;

      if (spread > CONFIG.MIN_SPREAD_EXECUTE) {
        opportunities.push({
          pair: pairName,
          buyFrom: minPrice.source,
          sellTo: maxPrice.source,
          buyPrice: minPrice.price,
          sellPrice: maxPrice.price,
          spread: spread,
          timestamp: Date.now()
        });
      }
    }

    return opportunities;
  }

  calculateTradeAmount() {
    const balance = parseFloat(ethers.formatEther(this.executor.getEthBalance()));
    const tradeAmount = Math.max(balance * CONFIG.RISK_FRACTION, CONFIG.MIN_TRADE_ETH);
    return tradeAmount;
  }

  async calculateProfitability(entryPrice, exitPrice, amountEth) {
    const tradeValueUsd = amountEth * CONFIG.ETH_PRICE_USD;
    const grossProfit = (exitPrice - entryPrice) / entryPrice * tradeValueUsd;
    const gasCostUsd = 0.025; // Approximate gas cost
    const dexFees = tradeValueUsd * 0.006; // 0.6% DEX fee (0.3% × 2 swaps)
    const totalCostsUsd = gasCostUsd + dexFees;
    const netProfit = grossProfit - totalCostsUsd;

    return {
      execute: netProfit >= CONFIG.MIN_PROFIT_THRESHOLD_USD,
      tradeValueUsd,
      expectedGrossProfitUsd: grossProfit,
      gasCostUsd,
      estimatedFeesUsd: dexFees,
      totalCostsUsd: totalCostsUsd,
      netExpectedProfitUsd: netProfit
    };
  }

  async executeOpportunity(opportunity) {
    console.log('\\nOpportunity: ' + opportunity.pair);
    console.log('  Spread: ' + opportunity.spread.toFixed(4) + '%');
    console.log('  Buy from:', opportunity.buyFrom);
    console.log('  Sell to:', opportunity.sellTo);

    // Calculate trade amount
    const tradeAmountEth = this.calculateTradeAmount();
    console.log('  Trade amount: ' + tradeAmountEth.toFixed(4) + ' ETH');

    // Profitability check
    const profitCheck = await this.calculateProfitability(
      opportunity.buyPrice,
      opportunity.sellPrice,
      tradeAmountEth
    );

    console.log('\\n  PROFITABILITY:');
    console.log('    Trade value:    $' + profitCheck.tradeValueUsd.toFixed(2));
    console.log('    Expected gross: $' + profitCheck.expectedGrossProfitUsd.toFixed(4));
    console.log('    Gas cost:      $' + profitCheck.gasCostUsd.toFixed(4));
    console.log('    DEX fees:      $' + profitCheck.estimatedFeesUsd.toFixed(4));
    console.log('    Total costs:   $' + profitCheck.totalCostsUsd.toFixed(4));
    console.log('    NET EXPECTED:  $' + profitCheck.netExpectedProfitUsd.toFixed(4));

    // Skip negative profit trades but execute if positive
    if (profitCheck.netExpectedProfitUsd >= CONFIG.MIN_PROFIT_THRESHOLD_USD) {
      console.log('\\n  *** PASSES CHECK - EXECUTING TRADE ***');

      // Execute via modular SwarmExecutor
      const result = await this.executor.executeArbitrage({
        tokenIn: TOKENS.ETH,
        tokenOut: TOKENS.USDC,
        amountIn: ethers.parseEther(tradeAmountEth.toString()),
        expectedProfitWei: BigInt(Math.floor(profitCheck.netExpectedProfitUsd * 1e18 / CONFIG.ETH_PRICE_USD)),
        gasCostWei: BigInt(Math.floor(profitCheck.gasCostUsd * 1e18 / CONFIG.ETH_PRICE_USD))
      });

      console.log('\\n  Result:', JSON.stringify(result, null, 2));
      return result;
    } else {
      console.log('\\n  *** SKIPPED: Net profit below threshold ***');
      return null;
    }
  }

  async runCycle() {
    this.cycles++;
    console.log('\\n--- Cycle #' + this.cycles + ' ---');

    try {
      const opportunities = await this.findOpportunities();

      if (opportunities.length === 0) {
        console.log('No opportunities (spread < ' + CONFIG.MIN_SPREAD_EXECUTE + '%)');
      } else {
        console.log('Found ' + opportunities.length + ' opportunity(ies)');

        for (const opp of opportunities) {
          await this.executeOpportunity(opp);
        }
      }
    } catch (err) {
      console.log('Cycle error:', err.message);
    }
  }

  async start() {
    const CYCLE_INTERVAL = 12000; // 12 seconds (Ethereum block time)

    console.log('Starting main loop...');
    console.log('Cycle interval: ' + (CYCLE_INTERVAL/1000) + 's');
    console.log('');

    while (true) {
      await this.runCycle();
      console.log('\\nWaiting ' + (CYCLE_INTERVAL/1000) + 's...');
      await new Promise(r => setTimeout(r, CYCLE_INTERVAL));
    }
  }
}

// Main execution
async function main() {
  const orchestrator = new SwarmOrchestrator();
  await orchestrator.initialize();
  await orchestrator.start();
}

main().catch(console.error);
