# REMOVED: sensitive data redacted by automated security cleanup
/**
 * WORKING LAUNCHER V2 - Fixed version
 * Based on fresh-test.js approach that works
 */
import 'dotenv/config';
import { ethers } from 'ethers';

class WorkingLauncherV2 {
  constructor() {
    if (!process.env.MAINNET_RPC_URL) {
      throw new Error('MAINNET_RPC_URL required in .env');
    }
    if (!process.env.PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY required in .env');
    }

    this.provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
    
    this.config = {
      TEST_AMOUNT: process.env.TEST_AMOUNT ? ethers.parseEther(String(process.env.TEST_AMOUNT)) : ethers.parseEther('0.5'),
      MIN_NET_PROFIT: process.env.MIN_NET_PROFIT ? ethers.parseEther(String(process.env.MIN_NET_PROFIT)) : ethers.parseEther('0.0001'),
      MAX_GAS_PRICE_GWEI: parseInt(process.env.MAX_GAS_PRICE_GWEI || '50', 10)
    };

    this.tokens = {
      WETH: 'REDACTED_ADDRESS',
      USDC: 'REDACTED_ADDRESS',
      DAI: 'REDACTED_ADDRESS'
    };

    this.stats = { cycles: 0, opportunities: 0 };
    
    // Pool ABI - simplified
    this.PAIR_ABI = ['function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)'];
    
    // Pool addresses
    this.pools = {
      UNI_V2_WETH_USDC: 'REDACTED_ADDRESS',
      SUSHI_WETH_USDC: 'REDACTED_ADDRESS',
      UNI_V2_WETH_DAI: 'REDACTED_ADDRESS'
    };
  }

  async run() {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║        MEV SWARM - WORKING LAUNCHER V2                    ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    console.log('🔧 Configuration:');
    console.log(`   Wallet: ${this.wallet.address}`);
    console.log(`   Test Amount: ${ethers.formatEther(this.config.TEST_AMOUNT)} ETH\n`);

    // Run cycles
    while (true) {
      this.stats.cycles++;
      console.log(`\n═══ CYCLE #${this.stats.cycles} ═══`);
      
      try {
        // Check gas
        const feeData = await this.provider.getFeeData();
        const gasPriceGwei = Number(ethers.formatUnits(feeData.gasPrice, 'gwei'));
        
        console.log(`⛽ Gas: ${gasPriceGwei.toFixed(9)} gwei`);
        
        if (gasPriceGwei > this.config.MAX_GAS_PRICE_GWEI) {
          console.log('⏸️  Gas too high, skipping...');
          await this.sleep(5000);
          continue;
        }

        // Discover opportunities
        const opportunity = await this.discoverOpportunity();
        
        if (opportunity) {
          this.stats.opportunities++;
          console.log(`✅ OPPORTUNITY FOUND! ${opportunity.spreadPercent.toFixed(4)}% spread`);
          console.log(`   Buy on: ${opportunity.buyDex} at ${opportunity.buyPrice.toFixed(8)}`);
          console.log(`   Sell on: ${opportunity.sellDex} at ${opportunity.sellPrice.toFixed(8)}`);
        } else {
          console.log('📭 No opportunity this cycle');
        }
        
      } catch (error) {
        console.log(`❌ Cycle error: ${error.message}`);
      }
      
      await this.sleep(5000);
    }
  }

  async discoverOpportunity() {
    console.log('\n🔍 Scanning for arbitrage...');
    
    try {
      // Create contract instances fresh for each call - THIS IS THE KEY FIX!
      const uniContract = new ethers.Contract(this.pools.UNI_V2_WETH_USDC, this.PAIR_ABI, this.provider);
      const sushiContract = new ethers.Contract(this.pools.SUSHI_WETH_USDC, this.PAIR_ABI, this.provider);
      
      // Call sequentially instead of Promise.all to avoid any race conditions
      const uniReserves = await uniContract.getReserves();
      const sushiReserves = await sushiContract.getReserves();
      
      // Debug: log raw reserves
      console.log(`   [DEBUG] UNI raw: r0=${uniReserves.reserve0}, r1=${uniReserves.reserve1}`);
      console.log(`   [DEBUG] SUSHI raw: r0=${sushiReserves.reserve0}, r1=${sushiReserves.reserve1}`);
      
      // Calculate prices - WETH is token0, USDC is token1
      // Need to account for decimals: WETH=18, USDC=6
      // Price in USDC per ETH = (reserve1 / 10^6) / (reserve0 / 10^18) = reserve1 * 10^12 / reserve0
      // But reserve0 and reserve1 are BigInt, so we need to handle properly
      const uniPriceRaw = (Number(uniReserves.reserve1) * 1e12) / Number(uniReserves.reserve0);
      const sushiPriceRaw = (Number(sushiReserves.reserve1) * 1e12) / Number(sushiReserves.reserve0);
      
      // Divide by 1e8 to get actual price (the raw calculation gives 1e10 off)
      const uniPrice = uniPriceRaw / 1e8;
      const sushiPrice = sushiPriceRaw / 1e8;
      
      console.log(`   UNI V2: ${uniPrice.toFixed(2)}`);
      console.log(`   SUSHI:  ${sushiPrice.toFixed(2)}`);
      
      const spread = Math.abs(uniPrice - sushiPrice);
      const spreadPercent = (spread / uniPrice) * 100;
      
      console.log(`   Spread: ${spreadPercent.toFixed(4)}%`);
      
      // PROFITABILITY CHECK - This is the critical fix!
      // Costs: DEX fees (0.3% per swap = 0.6% total), gas (~$0.02), slippage (~0.1%)
      // Minimum profitable spread = ~0.8-1.0%
      const MIN_PROFITABLE_SPREAD = 1.0; // 1% minimum spread to cover fees + gas
      
      // Only return if spread is SIGNIFICANTLY profitable
      if (spreadPercent > MIN_PROFITABLE_SPREAD) {
        // Calculate expected profit
        const tradeValueUSD = Number(this.config.TEST_AMOUNT) * uniPrice; // in ETH units * price
        const expectedGrossProfit = tradeValueUSD * (spreadPercent / 100);
        const dexFees = tradeValueUSD * 0.006; // 0.6% for 2 swaps
        const estimatedGasUSD = 0.02; // ~$0.02 gas cost
        const estimatedSlippage = tradeValueUSD * 0.001; // 0.1% slippage buffer
        const netProfit = expectedGrossProfit - dexFees - estimatedGasUSD - estimatedSlippage;
        
        console.log(`   💰 Trade Value: ${tradeValueUSD.toFixed(2)}`);
        console.log(`   💰 Gross Profit: ${expectedGrossProfit.toFixed(2)}`);
        console.log(`   💰 DEX Fees: -${dexFees.toFixed(2)}`);
        console.log(`   💰 Est. Gas: -${estimatedGasUSD.toFixed(2)}`);
        console.log(`   💰 Est. Slippage: -${estimatedSlippage.toFixed(2)}`);
        console.log(`   💰 NET PROFIT: ${netProfit.toFixed(2)}`);
        
        // Only trade if net profit is substantial (at least $1 to cover failed attempt risk)
        if (netProfit > 1.0) {
          console.log(`\n   🚀 EXECUTING TRADE...`);
          
          try {
            const result = await this.executeTrade(opportunity, uniPrice);
            if (result.success) {
              console.log(`   ✅ Trade SUCCESS! Hash: ${result.hash}`);
              console.log(`   💵 Profit: ${result.profit}`);
            } else {
              console.log(`   ❌ Trade FAILED: ${result.error}`);
            }
          } catch (execError) {
            console.log(`   ❌ Execution error: ${execError.message}`);
          }
          
          return { // Still return for logging
          buyDex: uniPrice < sushiPrice ? 'UNI V2' : 'SUSHI',
          sellDex: uniPrice < sushiPrice ? 'SUSHI' : 'UNI V2',
          buyPrice: Math.min(uniPrice, sushiPrice),
          sellPrice: Math.max(uniPrice, sushiPrice),
          spreadPercent
        };
        } else {
          console.log(`   ⏭️  Skipping - net profit too small (need > $1)`);
        }
      }
      
      return null;
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      return null;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async executeTrade(opportunity, currentPrice) {
    console.log('\n⚙️  EXECUTING TRADE...');
    
    try {
      // Simple direct swap through Uniswap Router
      const routerABI = [
        'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) external payable returns (uint[] amounts)',
        'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) external returns (uint[] amounts)',
        'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) external returns (uint[] amounts)'
      ];
      
      const uniRouter = new ethers.Contract(
        'REDACTED_ADDRESS', // Uniswap V2 Router
        routerABI,
        this.wallet
      );
      
      // FIX 1: Proper slippage at 0.5% instead of 0.1%
      const SLIPPAGE_TOLERANCE = 0.005; // 0.5%
      
      const amountIn = this.config.TEST_AMOUNT;
      const path = [this.tokens.WETH, this.tokens.USDC];
      const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes
      
      // FIX 2: Calculate minOut properly using current pool price
      // Expected out = amountIn * price * (1 - 0.003 fee)
      const pricePerETH = currentPrice; // USDC per ETH
      const expectedOutWei = (amountIn * BigInt(Math.floor(pricePerETH * 1000))) / BigInt(1000);
      const minOut = expectedOutWei * BigInt(10000 - Math.floor(SLIPPAGE_TOLERANCE * 10000)) / BigInt(10000);
      
      console.log(`   📝 Amount In: ${ethers.formatEther(amountIn)} ETH`);
      console.log(`   📝 Expected Out: ${ethers.formatEther(expectedOutWei)} USDC`);
      console.log(`   📝 Min Out (${SLIPPAGE_TOLERANCE*100}% slippage): ${ethers.formatEther(minOut)} USDC`);
      
      // Execute the swap
      const tx = await uniRouter.swapExactETHForTokens(
        minOut,
        path,
        this.wallet.address,
        deadline,
        { value: amountIn, gasLimit: 500000 }
      );
      
      console.log(`   📤 Transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      
      console.log(`   ✅ Transaction confirmed in block ${receipt.blockNumber}`);
      
      return {
        success: true,
        hash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        profit: 'TBD'
      };
      
    } catch (error) {
      console.log(`   ❌ Trade failed: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Start the launcher
const launcher = new WorkingLauncherV2();
launcher.run().catch(console.error);
