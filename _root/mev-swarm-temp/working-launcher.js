import { ethers } from 'ethers';
import 'dotenv/config';
import { MEVCloser } from './closer.js';

/**
 * WORKING LAUNCHER - MEV Swarm Executor
 * Actually executes arbitrage opportunities on mainnet
 * NO FLASHBOTS - direct RPC execution for simplicity
 */

class WorkingLauncher {
  constructor() {
    // Validate environment
    if (!process.env.MAINNET_RPC_URL) {
      throw new Error('MAINNET_RPC_URL required in .env');
    }
    if (!process.env.PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY required in .env');
    }
    if (!process.env.EXECUTOR_ADDRESS) {
      throw new Error('EXECUTOR_ADDRESS required in .env');
    }

    this.provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);

    this.contract = new ethers.Contract(
      process.env.EXECUTOR_ADDRESS,
      [
        'function executeArbitrage(address tokenIn, address tokenOut, uint256 amountIn) external',
        'function getStats() external view returns (uint256 totalExecuted, uint256 totalProfit, uint256 totalFailed, bool paused)',
        'event ArbitrageExecuted(address indexed tokenA, address indexed tokenB, uint256 amountIn, uint256 profit, uint256 timestamp)'
      ],
      this.wallet
    );

    // Configuration from environment
    this.config = {
      MIN_NET_PROFIT: process.env.MIN_NET_PROFIT ? ethers.parseEther(String(process.env.MIN_NET_PROFIT)) : ethers.parseEther('0.0001'),
      MAX_GAS_PRICE_GWEI: parseInt(process.env.MAX_GAS_PRICE_GWEI || '50', 10),
      TEST_AMOUNT: process.env.TEST_AMOUNT ? ethers.parseEther(String(process.env.TEST_AMOUNT)) : ethers.parseEther('0.01')
    };

    // Common token addresses
    this.tokens = {
      WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
    };

    // 🚨 CRITICAL FIX: Always initialize WETH contract for balance checks
    this.wethContract = new ethers.Contract(
      this.tokens.WETH,
      [
        'function balanceOf(address owner) view returns (uint256)',
        'function approve(address spender, uint256 amount) returns (bool)',
        'function allowance(address owner, address spender) view returns (uint256)'
      ],
      this.wallet
    );

    // Statistics
    this.stats = {
      cycles: 0,
      opportunitiesFound: 0,
      executionsAttempted: 0,
      executionsSucceeded: 0,
      totalProfit: 0n
    };

    // Setup graceful shutdown
    this.closer = new MEVCloser();
    this.setupCloser();
  }

  /**
   * Setup graceful shutdown handler
   */
  setupCloser() {
    this.closer.startMonitoring(() => {
      console.log('\n💰 FINAL STATISTICS:');
      console.log(`   Cycles Run: ${this.stats.cycles}`);
      console.log(`   Opportunities Found: ${this.stats.opportunitiesFound}`);
      console.log(`   Executions Attempted: ${this.stats.executionsAttempted}`);
      console.log(`   Executions Succeeded: ${this.stats.executionsSucceeded}`);
      console.log(`   Total Profit: ${ethers.formatEther(this.stats.totalProfit)} ETH`);
    });
  }

  /**
   * Main execution cycle
   */
  async run() {
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║        MEV SWARM - WORKING LAUNCHER                                ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

    console.log('🔧 CONFIGURATION:');
    console.log(`   Executor: ${this.wallet.address}`);
    console.log(`   Contract: ${process.env.EXECUTOR_ADDRESS}`);
    console.log(`   Min Profit: ${ethers.formatEther(this.config.MIN_NET_PROFIT)} ETH`);
    console.log(`   Max Gas: ${this.config.MAX_GAS_PRICE_GWEI} gwei`);
    console.log(`   Test Amount: ${ethers.formatEther(this.config.TEST_AMOUNT)} ETH\n`);

    // Check system health
    const healthy = await this.checkSystemHealth();
    if (!healthy) {
      console.log('❌ System health check failed - cannot start');
      return;
    }

    // Main loop
    console.log('🚀 STARTING MAIN LOOP...\n');

    while (true) {
      await this.executeCycle();

      // Wait 5 seconds between cycles
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  /**
   * Check system health before starting
   */
  async checkSystemHealth() {
    console.log('🔍 SYSTEM HEALTH CHECK:');

    try {
      // Check network connection
      const network = await this.provider.getNetwork();
      console.log(`   ✅ Network: ${network.name} (chainId: ${network.chainId})`);

      // Check wallet balance
      const balance = await this.provider.getBalance(this.wallet.address);
      console.log(`   ✅ Wallet Balance: ${ethers.formatEther(balance)} ETH`);

      if (balance < ethers.parseEther('0.001')) {
        console.log('   ⚠️  WARNING: Low wallet balance - may not cover gas');
      }

      // Check contract status
      const stats = await this.contract.getStats();
      console.log(`   ✅ Contract Status: ${stats.paused ? 'PAUSED' : 'ACTIVE'}`);
      console.log(`   📊 Previous Executions: ${stats.totalExecuted}`);
      console.log(`   💰 Previous Profit: ${ethers.formatEther(stats.totalProfit)} ETH`);

      // Check gas price
      const feeData = await this.provider.getFeeData();
      const gasPriceGwei = Number(ethers.formatUnits(feeData.gasPrice, 'gwei'));
      console.log(`   ⛽ Current Gas: ${gasPriceGwei} gwei`);

      if (gasPriceGwei > this.config.MAX_GAS_PRICE_GWEI) {
        console.log(`   ⚠️  WARNING: Gas price above threshold (${this.config.MAX_GAS_PRICE_GWEI} gwei)`);
      }

      console.log('   ✅ SYSTEM HEALTHY\n');
      return true;

    } catch (error) {
      console.log(`   ❌ Health check failed: ${error.message}\n`);
      return false;
    }
  }

  /**
   * Single execution cycle
   */
  async executeCycle() {
    this.stats.cycles++;
    const cycleStart = Date.now();

    console.log(`\n═══ CYCLE #${this.stats.cycles} ═══`);

    try {
      // Check gas price first
      const feeData = await this.provider.getFeeData();
      const gasPriceGwei = Number(ethers.formatUnits(feeData.gasPrice, 'gwei'));

      if (gasPriceGwei > this.config.MAX_GAS_PRICE_GWEI) {
        console.log(`⏸️  Gas too high (${gasPriceGwei} gwei) - skipping cycle`);
        return;
      }

      console.log(`⛽ Gas: ${gasPriceGwei} gwei ✓`);

      // Discover opportunity
      const opportunity = await this.discoverOpportunity();
      if (!opportunity) {
        console.log('📭 No opportunity found this cycle');
        return;
      }

      this.stats.opportunitiesFound++;
      console.log(`💰 Opportunity Found: ${opportunity.description}`);
      console.log(`   Expected Profit: ${ethers.formatEther(opportunity.expectedProfit)} ETH`);

      // Validate opportunity
      if (!this.validateOpportunity(opportunity)) {
        console.log('❌ Opportunity failed validation');
        return;
      }

      // Execute opportunity
      const result = await this.executeOpportunity(opportunity);

      if (result.success) {
        this.stats.executionsSucceeded++;
        this.stats.totalProfit += opportunity.expectedProfit;
        console.log(`✅ Execution successful! Tx: ${result.txHash}`);
      } else {
        console.log(`❌ Execution failed: ${result.error}`);
      }

    } catch (error) {
      console.log(`❌ Cycle error: ${error.message}`);
    }

    const cycleTime = Date.now() - cycleStart;
    console.log(`⏱️  Cycle time: ${cycleTime}ms\n`);
  }

  /**
   * Discover arbitrage opportunity
   * Queries real Uniswap V2 pools to find price discrepancies
   */
  async discoverOpportunity() {
    // Uniswap V2 pair ABI for getReserves
    const PAIR_ABI = [
      'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)'
    ];

    // Pool addresses (use lowercase - ethers will handle checksum)
    const pools = {
      'UNI_V2_WETH_USDC': '0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc',
      'SUSHI_WETH_USDC': '0x397ff1542f962076d0bfe58ea045ffa2d347aca0',
      'UNI_V2_WETH_DAI': '0xa478c2975ab1ea89e8196811f51a7b7ade33eb8e',
    };

    try {
      console.log('\n🔍 Scanning for arbitrage opportunities...');
      
      // Get reserves from pools
      const [uniV2EthUsdc, sushiEthUsdc, uniV2EthDai] = await Promise.all([
        new ethers.Contract(pools.UNI_V2_WETH_USDC, PAIR_ABI, this.provider).getReserves(),
        new ethers.Contract(pools.SUSHI_WETH_USDC, PAIR_ABI, this.provider).getReserves(),
        new ethers.Contract(pools.UNI_V2_WETH_DAI, PAIR_ABI, this.provider).getReserves()
      ]);

      // Calculate prices (ETH per USDC = reserve0/reserve1 for WETH/USDC where WETH is token0)
      const uniPrice = Number(uniV2EthUsdc.reserve0) / Number(uniV2EthUsdc.reserve1); // ETH/USDC
      const sushiPrice = Number(sushiEthUsdc.reserve0) / Number(sushiEthUsdc.reserve1);
      const daiPrice = Number(uniV2EthDai.reserve0) / Number(uniV2EthDai.reserve1); // ETH/DAI

      console.log(`   UNI V2 ETH/USDC: ${uniPrice.toFixed(8)}`);
      console.log(`   SUSHI ETH/USDC: ${sushiPrice.toFixed(8)}`);
      console.log(`   UNI V2 ETH/DAI: ${daiPrice.toFixed(8)}`);

      // Check for spread between UNI and Sushi
      const spread = Math.abs(uniPrice - sushiPrice);
      const spreadPercent = (spread / uniPrice) * 100;
      
      console.log(`   Spread: ${spread.toFixed(8)} (${spreadPercent.toFixed(4)}%)`);

      // If spread is > 0.5%, we might have an opportunity
      if (spreadPercent > 0.5) {
        const amountIn = this.config.TEST_AMOUNT;
        const expectedProfit = amountIn * BigInt(Math.floor(spreadPercent * 10)) / 1000n;
        
        console.log(`   ✅ Opportunity found! Spread: ${spreadPercent.toFixed(4)}%`);
        
        return {
          tokenIn: this.tokens.WETH,
          tokenOut: this.tokens.USDC,
          amountIn: amountIn,
          expectedProfit: expectedProfit,
          description: `WETH/USDC arbitrage: UNI vs Sushi spread ${spreadPercent.toFixed(4)}%`,
          gasEstimate: 200000n,
          poolA: pools.UNI_V2_WETH_USDC,
          poolB: pools.SUSHI_WETH_USDC
        };
      }

      console.log(`   📭 No profitable opportunity found (spread: ${spreadPercent.toFixed(4)}% < 0.5%)`);
      return null;

    } catch (error) {
      console.log(`   ❌ Error discovering opportunities: ${error.message}`);
      return null;
    }
  }

  /**
   * Validate opportunity
   */
  validateOpportunity(opportunity) {
    console.log('\n🔍 VALIDATING OPPORTUNITY:');

    // Check required fields
    const required = ['tokenIn', 'tokenOut', 'amountIn', 'expectedProfit'];
    const missing = required.filter(field => !opportunity[field]);

    if (missing.length > 0) {
      console.log(`   ❌ Missing fields: ${missing.join(', ')}`);
      return false;
    }

    // Check profit threshold
    if (opportunity.expectedProfit < this.config.MIN_NET_PROFIT) {
      console.log(`   ❌ Profit too low: ${ethers.formatEther(opportunity.expectedProfit)} < ${ethers.formatEther(this.config.MIN_NET_PROFIT)}`);
      return false;
    }

    // Check address format
    try {
      ethers.getAddress(opportunity.tokenIn);
      ethers.getAddress(opportunity.tokenOut);
    } catch (error) {
      console.log(`   ❌ Invalid address format`);
      return false;
    }

    // Check amount is positive
    if (opportunity.amountIn <= 0n) {
      console.log(`   ❌ Amount must be positive`);
      return false;
    }

    console.log(`   ✅ All validation checks passed`);
    return true;
  }

  /**
   * Execute opportunity
   */
  async executeOpportunity(opportunity) {
    this.stats.executionsAttempted++;

    console.log('\n⚡ EXECUTING OPPORTUNITY:');
    console.log(`   Token In: ${opportunity.tokenIn}`);
    console.log(`   Token Out: ${opportunity.tokenOut}`);
    console.log(`   Amount: ${ethers.formatEther(opportunity.amountIn)} ETH`);
    console.log(`   Expected Profit: ${ethers.formatEther(opportunity.expectedProfit)} ETH`);

    // 🚨 CRITICAL FIX: Check actual WETH balance before executing
    try {
      const wethBalance = await this.wethContract.balanceOf(this.wallet.address);
      console.log(`   💰 Wallet WETH Balance: ${ethers.formatEther(wethBalance)} ETH`);
      
      if (wethBalance < opportunity.amountIn) {
        console.log(`   ⛔ INSUFFICIENT BALANCE: Have ${ethers.formatEther(wethBalance)} WETH, need ${ethers.formatEther(opportunity.amountIn)} WETH`);
        return { success: false, error: 'Insufficient WETH balance' };
      }
    } catch (error) {
      console.log(`   ⚠️  Balance check failed: ${error.message}`);
      return { success: false, error: 'Balance check failed: ' + error.message };
    }

    try {
      // Estimate gas
      const gasEstimate = await this.contract.executeArbitrage.estimateGas(
        opportunity.tokenIn,
        opportunity.tokenOut,
        opportunity.amountIn
      );

      console.log(`   ⛽ Gas Estimate: ${gasEstimate.toString()}`);

      // Calculate gas cost
      const feeData = await this.provider.getFeeData();
      const gasCost = gasEstimate * feeData.gasPrice;
      const gasCostEth = ethers.formatEther(gasCost);

      console.log(`   💸 Gas Cost: ${gasCostEth} ETH`);

      // 🚨 CRITICAL FIX: Net profit check (gross profit - gas cost)
      const netExpectedProfit = opportunity.expectedProfit - gasCost;
      console.log(`   💵 Net Expected Profit: ${ethers.formatEther(netExpectedProfit)} ETH`);
      
      if (netExpectedProfit <= 0n) {
        console.log(`   ⛔ BLOCKED: Net profit would be negative (profit: ${ethers.formatEther(opportunity.expectedProfit)} - gas: ${gasCostEth} = ${ethers.formatEther(netExpectedProfit)})`);
        return { success: false, error: 'Net profit would be negative' };
      }

      // Check if gross profit covers gas (backup check)
      if (opportunity.expectedProfit <= gasCost) {
        console.log(`   ❌ Profit doesn't cover gas cost`);
        return { success: false, error: 'Profit < gas cost' };
      }

      // Execute transaction
      console.log(`   📝 Sending transaction...`);

      const tx = await this.contract.executeArbitrage(
        opportunity.tokenIn,
        opportunity.tokenOut,
        opportunity.amountIn,
        {
          gasLimit: gasEstimate * 120n / 100n // 20% buffer
        }
      );

      console.log(`   📦 Tx Sent: ${tx.hash}`);
      console.log(`   ⏳ Waiting for confirmation...`);

      const receipt = await tx.wait();

      console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);

      // Parse events
      const events = receipt.logs.filter(log => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed?.name === 'ArbitrageExecuted';
        } catch {
          return false;
        }
      });

      if (events.length > 0) {
        const parsed = this.contract.interface.parseLog(events[0]);
        console.log(`   💰 Profit Realized: ${ethers.formatEther(parsed.args.profit)} ETH`);
      }

      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed
      };

    } catch (error) {
      console.log(`   ❌ Execution error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

// ==================== MAIN ENTRY POINT ====================

async function main() {
  try {
    const launcher = new WorkingLauncher();
    await launcher.run();
  } catch (error) {
    console.error('💥 FATAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
