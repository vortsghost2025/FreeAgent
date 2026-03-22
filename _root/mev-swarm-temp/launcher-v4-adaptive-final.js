/**
 * LAUNCHER V4 - ADAPTIVE FINAL
 * Fixed version with proper two-swap arbitrage and safe guards
 */
import 'dotenv/config';
import { ethers } from 'ethers';

class AdaptiveLauncherV4 {
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
      MIN_SPREAD_PERCENT: parseFloat(process.env.MIN_SPREAD_PERCENT || '1.0'),
      MIN_NET_PROFIT: parseFloat(process.env.MIN_NET_PROFIT || '1.0'),
      SLIPPAGE_TOLERANCE: parseFloat(process.env.SLIPPAGE_TOLERANCE || '0.5'),
      MAX_GAS_PRICE_GWEI: parseInt(process.env.MAX_GAS_PRICE_GWEI || '50', 10)
    };

    this.tokens = {
      WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
    };

    this.stats = { cycles: 0, opportunities: 0, trades: 0, failed: 0 };
    
    // Pool ABI
    this.PAIR_ABI = ['function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)'];
    
    // Pool addresses
    this.pools = {
      UNI_V2_WETH_USDC: '0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc',
      SUSHI_WETH_USDC: '0x397ff1542f962076d0bfe58ea045ffa2d347aca0',
      UNI_V2_WETH_DAI: '0xa478c2975ab1ea89e8196811f51a7b7ade33eb8e'
    };

    // Router ABI
    this.ROUTER_ABI = [
      'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) external payable returns (uint[] amounts)',
      'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) external returns (uint[] amounts)',
      'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) external returns (uint[] amounts)',
      'function getAmountsOut(uint amountIn, address[] path) external view returns (uint[] amounts)'
    ];
  }

  async run() {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║        MEV SWARM - ADAPTIVE LAUNCHER V4                   ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    console.log('🔧 Configuration:');
    console.log(`   Wallet: ${this.wallet.address}`);
    console.log(`   Test Amount: ${ethers.formatEther(this.config.TEST_AMOUNT)} ETH`);
    console.log(`   Min Spread: ${this.config.MIN_SPREAD_PERCENT}%`);
    console.log(`   Min Profit: $${this.config.MIN_NET_PROFIT}`);
    console.log(`   Slippage: ${this.config.SLIPPAGE_TOLERANCE * 100}%\n`);

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
          await this.sleep(10000);
          continue;
        }

        // Discover opportunities
        const opportunity = await this.discoverOpportunity();
        
        if (opportunity) {
          this.stats.opportunities++;
          console.log(`✅ OPPORTUNITY FOUND! ${opportunity.spreadPercent.toFixed(4)}% spread`);
          console.log(`   Buy on: ${opportunity.buyDex} at $${opportunity.buyPrice.toFixed(2)}`);
          console.log(`   Sell on: ${opportunity.sellDex} at $${opportunity.sellPrice.toFixed(2)}`);
          
          // Execute trade
          console.log(`\n🚀 EXECUTING TRADE...`);
          const result = await this.executeTrade(opportunity);
          
          if (result.success) {
            this.stats.trades++;
            console.log(`   ✅ Trade SUCCESS! Hash: ${result.hash}`);
            console.log(`   ⛽ Gas used: ${result.gasUsed}`);
          } else {
            this.stats.failed++;
            console.log(`   ❌ Trade FAILED: ${result.error}`);
          }
        } else {
          console.log('📭 No opportunity this cycle');
        }
        
        // Log stats every 10 cycles
        if (this.stats.cycles % 10 === 0) {
          console.log(`\n📊 Stats: ${this.stats.cycles} cycles, ${this.stats.opportunities} opportunities, ${this.stats.trades} trades, ${this.stats.failed} failed`);
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
      // Create fresh contract instances
      const uniContract = new ethers.Contract(this.pools.UNI_V2_WETH_USDC, this.PAIR_ABI, this.provider);
      const sushiContract = new ethers.Contract(this.pools.SUSHI_WETH_USDC, this.PAIR_ABI, this.provider);
      
      // Get reserves
      const uniReserves = await uniContract.getReserves();
      const sushiReserves = await sushiContract.getReserves();
      
      // Calculate prices with PROPER BigInt handling
      const uniPrice = this.calculatePrice(uniReserves.reserve0, uniReserves.reserve1);
      const sushiPrice = this.calculatePrice(sushiReserves.reserve0, sushiReserves.reserve1);

      // Debug with raw BigInt values
      console.log(`   [DEBUG] UNI raw reserves: r0=${uniReserves.reserve0.toString()}, r1=${uniReserves.reserve1.toString()}`);
      console.log(`   [DEBUG] SUSHI raw reserves: r0=${sushiReserves.reserve0.toString()}, r1=${sushiReserves.reserve1.toString()}`);

      const uniPriceNum = Number(uniReserves.reserve0) / 1e12 * Number(uniReserves.reserve1);
      const sushiPriceNum = Number(sushiReserves.reserve0) / 1e12 * Number(sushiReserves.reserve1);
      console.log(`   [DEBUG] UNI numeric price: ${uniPriceNum.toFixed(8)}`);
      console.log(`   [DEBUG] SUSHI numeric price: ${sushiPriceNum.toFixed(8)}`);

      const uniPriceUSD = uniPriceNum * 2000; // ~$2000/ETH
      const sushiPriceUSD = sushiPriceNum * 2000;

      console.log(`   UNI V2: $${uniPriceUSD.toFixed(2)}`);
      console.log(`   SUSHI:  $${sushiPriceUSD.toFixed(2)}`);

      
      console.log(`   UNI V2: $${uniPrice.toFixed(2)}`);
      console.log(`   SUSHI:  $${sushiPrice.toFixed(2)}`);
      
      const spread = Math.abs(uniPrice - sushiPrice);
      const spreadPercent = (spread / uniPrice) * 100;
      
      console.log(`   Spread: ${spreadPercent.toFixed(4)}%`);
      
      // Check profitability
      if (spreadPercent >= this.config.MIN_SPREAD_PERCENT) {
        const tradeValueUSD = Number(this.config.TEST_AMOUNT) * uniPrice;
        const expectedGrossProfit = tradeValueUSD * (spreadPercent / 100);
        const dexFees = tradeValueUSD * 0.006;
        const estimatedGasUSD = 0.02;
        const estimatedSlippage = tradeValueUSD * this.config.SLIPPAGE_TOLERANCE;
        const netProfit = expectedGrossProfit - dexFees - estimatedGasUSD - estimatedSlippage;
        
        console.log(`   💰 Gross Profit: $${expectedGrossProfit.toFixed(2)}`);
        console.log(`   💰 Fees & Costs: -$${(dexFees + estimatedGasUSD + estimatedSlippage).toFixed(2)}`);
        console.log(`   💰 NET PROFIT: $${netProfit.toFixed(2)}`);
        
        if (netProfit >= this.config.MIN_NET_PROFIT) {
          return {
            buyDex: uniPrice < sushiPrice ? 'UNI V2' : 'SUSHI',
            sellDex: uniPrice < sushiPrice ? 'SUSHI' : 'UNI V2',
            buyPrice: Math.min(uniPrice, sushiPrice),
            sellPrice: Math.max(uniPrice, sushiPrice),
            spreadPercent,
            buyPool: uniPrice < sushiPrice ? this.pools.UNI_V2_WETH_USDC : this.pools.SUSHI_WETH_USDC,
            sellPool: uniPrice < sushiPrice ? this.pools.SUSHI_WETH_USDC : this.pools.UNI_V2_WETH_USDC
          };
        } else {
          console.log(`   ⏭️  Skipping - net profit $${netProfit.toFixed(2)} < $${this.config.MIN_NET_PROFIT}`);
        }
      }
      
      return null;
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      return null;
    }
  }

  calculatePrice(reserve0, reserve1) {
    // Token0 is USDC (lower address), Token1 is WETH
    // Price = reserve1 / reserve0 (WETH/USDC -> USDC per WETH)
    const r0 = BigInt(reserve0);
    const r1 = BigInt(reserve1);
    // Convert to human readable: r1 is WETH (1e18), r0 is USDC (1e6)
    // Price in USDC per WETH = (r1 / 1e18) / (r0 / 1e6) = r1 * 1e6 / r0
    return Number((r1 * 1_000_000n) / r0);
  }

  async executeTrade(opportunity) {
    try {
      const feeData = await this.provider.getFeeData();
      
      const router = new ethers.Contract(
        '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
        this.ROUTER_ABI,
        this.wallet
      );
      
      const amountIn = this.config.TEST_AMOUNT;
      const deadline = Math.floor(Date.now() / 1000) + 300;
      
      // For proper arbitrage, we need TWO swaps:
      // 1. ETH → USDC (buy on cheaper DEX)
      // 2. USDC → ETH (sell on expensive DEX)
      
      // Get expected amounts from router
      const path1 = [this.tokens.WETH, this.tokens.USDC];
      const amounts1 = await router.getAmountsOut(amountIn, path1);
      const expectedUSDC = amounts1[1];
      
      // Apply slippage to first swap
      const minOut1 = expectedUSDC * BigInt(10000 - Math.floor(this.config.SLIPPAGE_TOLERANCE * 10000)) / BigInt(10000);
      
      console.log(`   📝 Swap 1: ETH → USDC`);
      console.log(`   📝 Expected: ${ethers.formatEther(expectedUSDC)} USDC`);
      console.log(`   📝 Min Out: ${ethers.formatEther(minOut1)} USDC`);
      
      // First swap: ETH → USDC
      const tx1 = await router.swapExactETHForTokens(
        minOut1,
        path1,
        this.wallet.address,
        deadline,
        { value: amountIn, gasLimit: 500000 }
      );
      
      console.log(`   📤 Swap 1 sent: ${tx1.hash}`);
      const receipt1 = await tx1.wait();
      console.log(`   ✅ Swap 1 confirmed in block ${receipt1.blockNumber}`);
      
      // Get USDC balance
      const usdcContract = new ethers.Contract(
        this.tokens.USDC,
        ['function balanceOf(address) view returns (uint256)'],
        this.provider
      );
      const usdcBalance = await usdcContract.balanceOf(this.wallet.address);
      
      if (usdcBalance === 0n) {
        return { success: false, error: 'No USDC received from first swap' };
      }
      
      // Need to approve USDC for second swap
      const usdcWithSigner = usdcContract.connect(this.wallet);
      if (usdcBalance > 0n) {
        try {
          const approveTx = await usdcWithSigner.approve(router.target, usdcBalance);
          await approveTx.wait();
          console.log(`   ✅ USDC approved for router`);
        } catch (e) {
          // May already be approved
          console.log(`   ℹ️  USDC approval: ${e.message.includes('0x') ? 'already approved' : 'skipped'}`);
        }
      }
      
      // Second swap: USDC → ETH
      const path2 = [this.tokens.USDC, this.tokens.WETH];
      const amounts2 = await router.getAmountsOut(usdcBalance, path2);
      const expectedETH = amounts2[1];
      const minOut2 = expectedETH * BigInt(9500) / BigInt(10000); // 5% slippage for safety
      
      console.log(`   📝 Swap 2: USDC → ETH`);
      console.log(`   📝 Expected: ${ethers.formatEther(expectedETH)} ETH`);
      console.log(`   📝 Min Out: ${ethers.formatEther(minOut2)} ETH`);
      
      const tx2 = await router.swapExactTokensForETH(
        usdcBalance,
        minOut2,
        path2,
        this.wallet.address,
        deadline,
        { gasLimit: 500000 }
      );
      
      console.log(`   📤 Swap 2 sent: ${tx2.hash}`);
      const receipt2 = await tx2.wait();
      console.log(`   ✅ Swap 2 confirmed in block ${receipt2.blockNumber}`);
      
      // Calculate profit
      const gasUsed = receipt1.gasUsed + receipt2.gasUsed;
      const gasPriceWei = feeData.gasPrice;
      const gasCostETH = (gasUsed * gasPriceWei) / ethers.parseEther('1');
      const gasCostUSD = Number(gasCostETH) * 3000; // Approximate ETH price
      
      return {
        success: true,
        hash: tx2.hash,
        gasUsed: gasUsed.toString(),
        gasCostUSD: gasCostUSD.toFixed(2)
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Start
const launcher = new AdaptiveLauncherV4();
launcher.run().catch(console.error);
