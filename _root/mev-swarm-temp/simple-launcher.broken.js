import 'dotenv/config';
import { ethers } from 'ethers';
import { refreshAllPools, compareCrossDexPrices, findArbitrageOpportunities } from './pool-watcher.js';

const CONFIG = {
  MIN_TRADE_ETH: 0.001,      // min 0.001 ETH to make gas worth it
  MIN_SPREAD_EXECUTE: 0.065, // min 0.065% spread to execute
  RISK_FRACTION: 0.25,       // use 25% of balance per trade
  ETH_PRICE_USD: 2500,       // ETH price for cost calculations
  MIN_PROFIT_THRESHOLD_USD: 0.01  // Minimum net profit threshold
};

const TOKENS = {
  ETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',  // WETH
  USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
};

class SwarmExecutor {
  constructor() {
    const privateKey = process.env.PRIVATE_KEY;
    // Use the proper RPC from env, fallback to Alchemy demo only if not set
    const rpcUrl = process.env.ETHEREUM_RPC_URL || process.env.RPC_URL || process.env.MAINNET_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo';
    
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    console.log('Executor wallet:', this.wallet.address);
    console.log('Using RPC:', rpcUrl.substring(0, 30) + '...');
    
    // Initialize WETH contract
    const WETH_ABI = [
      'function balanceOf(address owner) view returns (uint256)',
      'function approve(address spender, uint256 amount) returns (bool)',
      'function deposit() payable',
      'function withdraw(uint256 amount)'
    ];
    this.wethAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'; // WETH
    this.wethContract = new ethers.Contract(this.wethAddress, WETH_ABI, this.wallet);
  }

  async getWethBalance() {
    try {
      return await this.wethContract.balanceOf(this.wallet.address);
    } catch (e) {
      console.log('Error getting WETH balance:', e.message);
      return ethers.parseEther('0');
    }
  }

  async getBalance() {
    return await this.provider.getBalance(this.wallet.address);
  }

  async execute(params) {
    console.log('⚡ EXECUTING TRADE...');
    console.log('  Token In:', params.tokenIn);
    console.log('  Token Out:', params.tokenOut);
    console.log('  Amount:', ethers.formatEther(params.amountIn), 'ETH');
    
    // Check WETH balance first
    const wethBalance = await this.getWethBalance();
    const wethBalanceEth = ethers.formatEther(wethBalance);
    console.log('  WETH Balance:', wethBalanceEth);
    
    // If not enough WETH, wrap some ETH
    if (wethBalance < params.amountIn) {
      const ethBalance = await this.getBalance();
      const ethBalanceEth = ethers.formatEther(ethBalance);
      console.log('  ETH Balance:', ethBalanceEth, '- Wrapping to WETH...');
      
      try {
        const wrapAmount = params.amountIn;
        const wrapTx = await this.wethContract.deposit({ value: wrapAmount });
        console.log('  Wrap tx sent:', wrapTx.hash);
        await wrapTx.wait();
        console.log('  Wrapped successfully!');
      } catch (e) {
        console.log('  Wrap failed:', e.message);
      }
    }
    
    // Simulate execution for demo purposes
    return { 
      success: true, 
      txHash: '0x' + Math.random().toString(16).substr(2, 64),
      simulated: true 
    };
  }
}

async function calculateProfitability(entryPrice, exitPrice, amountEth, provider) {
  const tradeValueUsd = amountEth * CONFIG.ETH_PRICE_USD;
  const grossProfit = (exitPrice - entryPrice) / entryPrice * tradeValueUsd;
  const gasCostUsd = 0.025; // Approximate gas cost
  const dexFees = tradeValueUsd * 0.006; // 0.6% DEX fee (0.3% × 2 swaps)
  // Slippage is inherent in the spread - not a separate cost
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

async function main() {
  console.log('Starting MEV Swarm Bot...');
  console.log('Min spread threshold: ' + CONFIG.MIN_SPREAD_EXECUTE + '%');
  console.log('Min profit threshold: $' + CONFIG.MIN_PROFIT_THRESHOLD_USD);
  
  const executor = new SwarmExecutor();
  
  const balance = await executor.getBalance();
  console.log('Balance:', ethers.formatEther(balance), 'ETH');
  
  const CYCLE_INTERVAL = 12000; // 12 seconds (Ethereum block time)
  let cycle = 0;
  
  while (true) {
    cycle++;
    console.log('\n--- Cycle #' + cycle + ' ---');
    
    try {
      // Get prices
      const prices = await refreshAllPools();
      
      if (!prices || Object.keys(prices).length === 0) {
        console.log('No prices available');
        await new Promise(r => setTimeout(r, CYCLE_INTERVAL));
        continue;
      }
      
      // Find opportunities
      const opportunities = [];
      const tokenPairs = {};
      
      for (const [poolName, result] of Object.entries(prices)) {
        const pairName = poolName.replace('SushiSwap ', '');
        if (!tokenPairs[pairName]) {
          tokenPairs[pairName] = [];
        }
        tokenPairs[pairName].push({ 
          source: poolName, 
          price: result.price, 
          timestamp: result.timestamp 
        });
      }
      
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
      
      if (opportunities.length === 0) {
        console.log('No opportunities (spread < ' + CONFIG.MIN_SPREAD_EXECUTE + '%)');
      } else {
        console.log('Found ' + opportunities.length + ' opportunity(ies)');
        
        for (const opp of opportunities) {
          console.log('\nOpportunity: ' + opp.pair);
          console.log('  Spread: ' + opp.spread.toFixed(4) + '%');
          
          // Calculate trade amount
          const balanceEth = parseFloat(ethers.formatEther(await executor.getBalance()));
          const tradeAmountEth = Math.max(balanceEth * CONFIG.RISK_FRACTION, CONFIG.MIN_TRADE_ETH);
          
          console.log('  Trade amount: ' + tradeAmountEth.toFixed(4) + ' ETH');
          
          // Profitability check
          try {
            const profitCheck = await calculateProfitability(
              opp.buyPrice,
              opp.sellPrice,
              tradeAmountEth,
              executor.provider
            );
            
            console.log('\n  PROFITABILITY:');
            console.log('    Trade value:    $' + profitCheck.tradeValueUsd.toFixed(2));
            console.log('    Expected gross: $' + profitCheck.expectedGrossProfitUsd.toFixed(4));
            console.log('    Gas cost:      $' + profitCheck.gasCostUsd.toFixed(4));
            console.log('    DEX fees:      $' + profitCheck.estimatedFeesUsd.toFixed(4));
            console.log('    Total costs:   $' + profitCheck.totalCostsUsd.toFixed(4));
            console.log('    NET EXPECTED:  $' + profitCheck.netExpectedProfitUsd.toFixed(4));
            
            // Skip negative profit trades but execute if positive
            if (profitCheck.netExpectedProfitUsd >= CONFIG.MIN_PROFIT_THRESHOLD_USD) {
              console.log('\n  *** PASSES CHECK - EXECUTING TRADE ***');
              
              const result = await executor.execute({
                tokenIn: TOKENS.ETH,
                tokenOut: TOKENS.USDC,
                amountIn: ethers.parseEther(tradeAmountEth.toString())
              });
              
              console.log('Result:', JSON.stringify(result));
            } else {
              console.log('\n  *** SKIPPED: Net profit below threshold ***');
            }
          } catch (err) {
            console.log('Profitability check error:', err.message);
          }
        }
      }
    } catch (err) {
      console.log('Cycle error:', err.message);
    }
    
    console.log('\nWaiting ' + (CYCLE_INTERVAL/1000) + 's...');
    await new Promise(r => setTimeout(r, CYCLE_INTERVAL));
  }
}

main().catch(console.error);
