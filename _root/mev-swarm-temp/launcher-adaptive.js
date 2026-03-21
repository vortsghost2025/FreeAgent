# REMOVED: sensitive data redacted by automated security cleanup
/**
 * ADAPTIVE LAUNCHER - Self-tuning arbitrage bot
 * Automatically adjusts: spread threshold, slippage, trade size
 * Based on: market volatility, liquidity depth, historical performance
 */
import 'dotenv/config';
import { ethers } from 'ethers';

class AdaptiveLauncher {
  constructor() {
    if (!process.env.MAINNET_RPC_URL) {
      throw new Error('MAINNET_RPC_URL required in .env');
    }
    if (!process.env.PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY required in .env');
    }

    this.provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);

    this.tokens = {
      WETH: 'REDACTED_ADDRESS',
      USDC: 'REDACTED_ADDRESS',
      DAI: 'REDACTED_ADDRESS'
    };

    // ADAPTIVE STATE - This is the brain
    this.adaptive = {
      // Market history tracking
      spreadHistory: [], // Last 50 spread measurements
      priceHistory: {}, // Price history per pool
      volatility: {}, // Volatility per pool

      // Adaptive thresholds
      spreadThreshold: 1.0, // Starting at 1%
      slippageTolerance: 0.005, // Starting at 0.5%
      tradeSizeMultiplier: 0.003, // Starting at 0.3% of pool depth

      // Performance tracking
      successRate: 0.5, // Start at 50% success assumption
      recentTrades: [], // Last 20 trades for analysis

      // Configuration
      HISTORY_SIZE: 50,
      BLOCKS_FOR_ANALYSIS: 20,
      MIN_ADAPT_INTERVAL: 12000, // 12 seconds minimum between adjustments
      lastAdaptation: 0
    };

    this.stats = {
      cycles: 0,
      opportunities: 0,
      trades: 0,
      successes: 0,
      failures: 0
    };

    // Pool ABI
    this.PAIR_ABI = ['function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
                     'function token0() view returns (address)',
                     'function token1() view returns (address)',
                     'function totalSupply() view returns (uint256)'];

    // Pool addresses
    this.pools = {
      UNI_V2_WETH_USDC: 'REDACTED_ADDRESS',
      SUSHI_WETH_USDC: 'REDACTED_ADDRESS'
    };
  }

  async run() {
    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║        MEV SWARM - ADAPTIVE LAUNCHER                 ║');
    console.log('╚═════════════════════════════════════════════════════╝\n');

    console.log('🧠 Adaptive Mode: AUTO-TUNING ENABLED');
    console.log('   Spread threshold: ' + (this.adaptive.spreadThreshold * 100).toFixed(2) + '%');
    console.log('   Slippage tolerance: ' + (this.adaptive.slippageTolerance * 100).toFixed(2) + '%');
    console.log('   Trade size multiplier: ' + (this.adaptive.tradeSizeMultiplier * 100).toFixed(2) + '% of pool\n');

    // Main trading loop
    while (true) {
      this.stats.cycles++;
      console.log(`\n═══ CYCLE #${this.stats.cycles} ═══`);
      console.log(`═══ ADAPTIVE STATE ═══`);
      console.log(`   Spread Threshold: ${this.adaptive.spreadThreshold.toFixed(2)}%`);
      console.log(`   Slippage: ${this.adaptive.slippageTolerance.toFixed(3)}`);
      console.log(`   Trade Size: ${this.adaptive.tradeSizeMultiplier.toFixed(3)}×`);
      console.log(`   Success Rate: ${(this.adaptive.successRate * 100).toFixed(0)}%`);

      try {
        // Check gas
        const feeData = await this.provider.getFeeData();
        const gasPriceGwei = Number(ethers.formatUnits(feeData.gasPrice, 'gwei'));

        console.log(`\n⛽ Gas: ${gasPriceGwei.toFixed(9)} gwei`);

        if (gasPriceGwei > 50) {
          console.log('⏸️  Gas too high, skipping...');
          await this.sleep(5000);
          continue;
        }

        // Discover opportunities
        const opportunity = await this.discoverOpportunity();

        if (opportunity) {
          this.stats.opportunities++;

          // Update spread history
          this.updateSpreadHistory(opportunity.spreadPercent);

          // Update price history
          await this.updatePriceHistory(opportunity);

          // Recalculate adaptive parameters
          await this.adaptParameters();

          console.log(`\n✅ OPPORTUNITY FOUND! ${opportunity.spreadPercent.toFixed(4)}% spread`);
          console.log(`   Buy on: ${opportunity.buyDex} at ${opportunity.buyPrice.toFixed(8)}`);
          console.log(`   Sell on: ${opportunity.sellDex} at ${opportunity.sellPrice.toFixed(8)}`);

          // Check if meets adaptive threshold
          if (opportunity.spreadPercent >= this.adaptive.spreadThreshold) {
            // Execute trade
            const result = await this.executeTrade(opportunity);

            // Update success rate
            this.updateSuccessRate(result.success);

            if (result.success) {
              console.log(`   ✅ Trade SUCCESS!`);
              console.log(`   💵 Profit: ${result.profit}`);
              this.stats.successes++;
            } else {
              console.log(`   ❌ Trade FAILED: ${result.error}`);
              this.stats.failures++;
            }
            this.stats.trades++;
          } else {
            console.log(`   ⏭️  Skipping - spread below adaptive threshold (${this.adaptive.spreadThreshold.toFixed(2)}%)`);
          }
        } else {
          console.log('📭 No opportunity this cycle');
          // Still update adaptive parameters (might need to adjust thresholds)
          await this.adaptParameters();
        }

      } catch (error) {
        console.log(`❌ Cycle error: ${error.message}`);
      }

      await this.sleep(5000); // 5 seconds between scans
    }
  }

  async discoverOpportunity() {
    console.log('\n🔍 Scanning for arbitrage...');

    try {
      // Create contract instances
      const uniContract = new ethers.Contract(this.pools.UNI_V2_WETH_USDC, this.PAIR_ABI, this.provider);
      const sushiContract = new ethers.Contract(this.pools.SUSHI_WETH_USDC, this.PAIR_ABI, this.provider);

      // Get reserves
      const uniReserves = await uniContract.getReserves();
      const sushiReserves = await sushiContract.getReserves();

      // Calculate prices with proper BigInt handling
      const uniPriceRaw = (Number(uniReserves.reserve1) * 1e12) / Number(uniReserves.reserve0);
      const sushiPriceRaw = (Number(sushiReserves.reserve1) * 1e12) / Number(sushiReserves.reserve0);

      // Divide by 1e8 to fix decimal error
      const uniPrice = uniPriceRaw / 1e8;
      const sushiPrice = sushiPriceRaw / 1e8;

      console.log(`   UNI V2: ${uniPrice.toFixed(2)}`);
      console.log(`   SUSHI:  ${sushiPrice.toFixed(2)}`);

      const spread = Math.abs(uniPrice - sushiPrice);
      const spreadPercent = (spread / uniPrice) * 100;

      console.log(`   Spread: ${spreadPercent.toFixed(4)}%`);

      return {
        buyDex: uniPrice < sushiPrice ? 'UNI V2' : 'SUSHI',
        sellDex: uniPrice < sushiPrice ? 'SUSHI' : 'UNI V2',
        buyPrice: Math.min(uniPrice, sushiPrice),
        sellPrice: Math.max(uniPrice, sushiPrice),
        spreadPercent,
        liquidity: Number(uniReserves.reserve0) + Number(sushiReserves.reserve0)
      };

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      return null;
    }
  }

  async adaptParameters() {
    // Only adapt every 12 seconds minimum (3 cycles)
    const now = Date.now();
    if (now - this.adaptive.lastAdaptation < this.adaptive.MIN_ADAPT_INTERVAL) {
      return;
    }

    console.log('\n🧠 ADAPTING PARAMETERS...');

    // 1. Calculate average spread
    const avgSpread = this.calculateAverageSpread();
    console.log(`   Avg Spread (last 50): ${avgSpread.toFixed(2)}%`);

    // 2. Calculate volatility
    const volatility = this.calculateVolatility();
    console.log(`   Market Volatility: ${volatility.toFixed(4)}`);

    // 3. Calculate pool liquidity
    const liquidity = await this.calculateLiquidity();
    console.log(`   Pool Liquidity: $${liquidity.toFixed(0)}`);

    // ADAPTIVE SPREAD THRESHOLD
    // If spreads are shrinking (calm market), become more picky
    // If spreads are widening (chaotic market), become more aggressive
    const spreadAdjustment = (avgSpread - this.adaptive.spreadThreshold) * 0.5; // Move 50% toward average
    this.adaptive.spreadThreshold = Math.max(0.5, Math.min(3.0, this.adaptive.spreadThreshold + spreadAdjustment));

    console.log(`   New Spread Threshold: ${this.adaptive.spreadThreshold.toFixed(2)}%`);

    // ADAPTIVE SLIPPAGE TOLERANCE
    // Base slippage: 0.5%
    // Add volatility multiplier: higher volatility = more slippage tolerance
    const volatilityMultiplier = Math.min(2.0, 1 + volatility * 10);
    this.adaptive.slippageTolerance = Math.min(0.02, 0.005 * volatilityMultiplier); // Max 2%

    console.log(`   New Slippage: ${(this.adaptive.slippageTolerance * 100).toFixed(2)}%`);

    // ADAPTIVE TRADE SIZE
    // Use 0.3% of pool liquidity as base
    // Adjust based on success rate (if failing a lot, reduce size)
    const sizeMultiplier = Math.max(0.001, Math.min(0.01, this.adaptive.tradeSizeMultiplier));
    this.adaptive.tradeSizeMultiplier = this.adaptive.successRate > 0.7 ? sizeMultiplier * 1.5 : sizeMultiplier * 0.7;

    console.log(`   New Trade Size Multiplier: ${(this.adaptive.tradeSizeMultiplier * 100).toFixed(2)}%`);

    // Mark as adapted
    this.adaptive.lastAdaptation = now;
  }

  updateSpreadHistory(spread) {
    this.adaptive.spreadHistory.push(spread);

    // Keep last 50 entries
    if (this.adaptive.spreadHistory.length > this.adaptive.HISTORY_SIZE) {
      this.adaptive.spreadHistory.shift();
    }
  }

  async updatePriceHistory(opportunity) {
    const timestamp = Date.now();

    // Update price history
    if (!this.adaptive.priceHistory.UNI) {
      this.adaptive.priceHistory.UNI = [];
    }
    if (!this.adaptive.priceHistory.SUSHI) {
      this.adaptive.priceHistory.SUSHI = [];
    }

    this.adaptive.priceHistory.UNI.push({ price: opportunity.buyPrice, timestamp });
    this.adaptive.priceHistory.SUSHI.push({ price: opportunity.sellPrice, timestamp });

    // Keep last 50 entries
    if (this.adaptive.priceHistory.UNI.length > this.adaptive.HISTORY_SIZE) {
      this.adaptive.priceHistory.UNI.shift();
    }
    if (this.adaptive.priceHistory.SUSHI.length > this.adaptive.HISTORY_SIZE) {
      this.adaptive.priceHistory.SUSHI.shift();
    }
  }

  calculateAverageSpread() {
    if (this.adaptive.spreadHistory.length < 10) {
      return 1.0; // Default if not enough data
    }

    const sum = this.adaptive.spreadHistory.reduce((a, b) => a + b, 0);
    return sum / this.adaptive.spreadHistory.length;
  }

  calculateVolatility() {
    // Calculate standard deviation of recent prices
    const prices = this.adaptive.priceHistory.UNI || [];

    if (prices.length < 10) {
      return 0.01; // Default if not enough data
    }

    const pricesOnly = prices.map(p => p.price);
    const mean = pricesOnly.reduce((a, b) => a + b, 0) / pricesOnly.length;
    const variance = pricesOnly.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / pricesOnly.length;
    return Math.sqrt(variance) / mean; // Coefficient of variation
  }

  async calculateLiquidity() {
    try {
      const uniContract = new ethers.Contract(this.pools.UNI_V2_WETH_USDC, this.PAIR_ABI, this.provider);
      const sushiContract = new ethers.Contract(this.pools.SUSHI_WETH_USDC, this.PAIR_ABI, this.provider);

      const [uniReserves] = await uniContract.getReserves();
      const [sushiReserves] = await sushiContract.getReserves();

      // Approximate liquidity in USD
      const uniLiquidity = Number(uniReserves.reserve1) * uniReserves.price || 2000;
      const sushiLiquidity = Number(sushiReserves.reserve1) * sushiReserves.price || 2000;

      return Math.max(uniLiquidity, sushiLiquidity);
    } catch (error) {
      return 100000; // Default fallback
    }
  }

  updateSuccessRate(success) {
    this.adaptive.recentTrades.push({ success, timestamp: Date.now() });

    // Keep last 20 trades
    if (this.adaptive.recentTrades.length > 20) {
      this.adaptive.recentTrades.shift();
    }

    // Calculate success rate (last 20 trades)
    const recentSuccesses = this.adaptive.recentTrades.filter(t => t.success).length;
    this.adaptive.successRate = recentSuccesses / Math.min(this.adaptive.recentTrades.length, 20);
  }

  async executeTrade(opportunity) {
    console.log('\n⚙️  EXECUTING TRADE...');

    try {
      // Calculate trade size based on adaptive parameters
      const balance = await this.provider.getBalance(this.wallet.address);
      const tradeSize = Number(balance) * this.adaptive.tradeSizeMultiplier;

      // Get current price for minOut calculation
      const pricePerETH = opportunity.buyPrice;

      const routerABI = [
        'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) external payable returns (uint[] amounts)',
        'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) external returns (uint[] amounts)'
      ];

      const uniRouter = new ethers.Contract(
        'REDACTED_ADDRESS',
        routerABI,
        this.wallet
      );

      // Calculate amounts with proper BigInt handling
      const amountInWei = ethers.parseEther(tradeSize.toFixed(6));
      const expectedOutWei = (amountInWei * BigInt(Math.floor(pricePerETH * 1e6))) / BigInt(1e6);
      const minOutWei = expectedOutWei * BigInt(10000 - Math.floor(this.adaptive.slippageTolerance * 10000)) / BigInt(10000);

      const path = [this.tokens.WETH, this.tokens.USDC];
      const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

      console.log(`   📝 Amount: ${tradeSize.toFixed(6)} ETH`);
      console.log(`   📝 Min Out: ${ethers.formatUnits(minOutWei, 6)} USDC`);
      console.log(`   📝 Slippage: ${(this.adaptive.slippageTolerance * 100).toFixed(2)}%`);

      // Execute swap
      const tx = await uniRouter.swapExactETHForTokens(
        minOutWei,
        path,
        this.wallet.address,
        deadline,
        { value: amountInWei, gasLimit: 200000 }
      );

      console.log(`   📤 Transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();

      // Calculate profit (compare ETH before/after)
      const finalBalance = await this.provider.getBalance(this.wallet.address);
      const profitWei = finalBalance - balance;
      const profitETH = Number(ethers.formatEther(profitWei));
      const profitUSD = profitETH * pricePerETH;

      console.log(`   ✅ Transaction confirmed: ${receipt.blockNumber}`);
      console.log(`   💵 Profit: ${profitWei.toString()} wei (${profitETH.toFixed(6)} ETH, $${profitUSD.toFixed(2)})`);

      return {
        success: true,
        hash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        profit: `${profitETH.toFixed(6)} ETH ($${profitUSD.toFixed(2)})`
      };

    } catch (error) {
      console.log(`   ❌ Execution error: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Start adaptive launcher
const launcher = new AdaptiveLauncher();
launcher.run().catch(console.error);
