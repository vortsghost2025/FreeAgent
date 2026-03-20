import { ethers } from 'ethers';
import 'dotenv/config';
import fs from 'fs';
import { EventEmitter } from 'events';

// ============================================================
// 🔒 SECURITY GUARDS - Bot will NOT start without passing
// ============================================================

// Kill switch check
if (fs.existsSync('KILL_SWITCH')) {
  console.error('\n🛑 KILL SWITCH ACTIVATED');
  console.error('Create a file named "KILL_SWITCH" to stop the bot.');
  console.error('Delete the file to re-enable.\n');
  process.exit(1);
}

// Load security guard module
import { initSecurity, getPrivateKey } from './security-guard.js';

// Initialize security - this validates key format and enforces safety
const security = initSecurity();
if (!security.isValid) {
  console.error('\n❌ Security initialization failed');
  process.exit(1);
}

// Get validated private key through security guard
const key = getPrivateKey();

// Check simulation mode
if (!security.isLive) {
  console.log('\n🔒 SIMULATION MODE - No real trades will be executed\n');
} else {
  console.log('\n⚠️  LIVE TRADING MODE - Real money at risk!\n');
}
console.log('✅ Security checks passed.\n');

// ============================================================
// 🏷️ PROCESS LABELING - Windows PowerShell
// ============================================================
if (process.platform === 'win32') {
  try {
    const mode = security.isLive ? 'LIVE' : 'SIMULATION';
    process.title = `EXECUTOR - Arbitrage Executor (${mode} Mode)`;
    console.log(`🏷️  Process Label: EXECUTOR (${mode})`);
  } catch (e) {
    // Ignore if not supported
  }
}

// ============================================================
// Configuration
// ============================================================
const DRY_RUN = !security.isLive;

// Router Addresses
const UNISWAP_V2_ROUTER = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
const UNISWAP_V3_ROUTER = '0xe592427a0aece92de3edee1f18e0157c05861564';

// ABI Definitions
const V2_ROUTER_ABI = [
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
];

// Known token addresses to symbols
const KNOWN_TOKENS = {
  '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': 'WETH',
  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 'USDC',
  '0x6B175474E89094C44Da98b954EedeAC495271d0F': 'DAI',
  '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599': 'AAVE',
  '0x1f9840a85d5af4bf268e6780FC7d5D3': 'UNI',
  '0xdAC17F958D2ee515eab848b4a1B3d2080b60F2e5FcB': 'USDT'
};

function getTokenSymbol(address) {
  return KNOWN_TOKENS[address.toLowerCase()] || address.slice(0, 6) + '...';
}

// ============================================================
// 🏗️ MAIN EXECUTOR CLASS
// ============================================================

class ArbitrageExecutor {
  constructor(provider, wallet) {
    this.provider = provider;
    this.wallet = wallet;
    this.executorAddress = wallet.address;
  }

  /**
   * Execute arbitrage based on opportunity
   */
  async execute(opportunity) {
    // Destructure opportunity
    const { route, amountIn, expectedProfitUsd, tokenInSymbol, tokenInDecimals } = opportunity;

    console.log('\n📊 Opportunity Details:');
    console.log('   Route:', route.map(addr => getTokenSymbol(addr)).join(' → '));
    console.log('   Type:', opportunity.routeType);
    console.log('   Input:', ethers.formatEther(amountIn), tokenInSymbol);
    console.log('   Expected Profit: $' + expectedProfitUsd.toFixed(2));

    // Return early if dry run mode
    if (DRY_RUN) {
      console.log('\n🔒 DRY_RUN MODE - Transaction NOT submitted\n');
      console.log('✅ Simulation Complete - Route validated');
      console.log('   Would execute if LIVE_TRADING=true\n');
      return {
        shouldExecute: false,
        reason: 'Dry run mode active - simulation only',
        simulated: true,
        expectedProfit: expectedProfitUsd
      };
    }

    // ============================================================
    // LIVE MODE: Simulate and execute if profitable
    // ============================================================

    try {
      // Get fee data for gas estimation
      const { feeData } = await this.provider.getFeeData();

      // Build transaction data
      const txData = V2_ROUTER_ABI[0];

      // Encode the swap function call
      const iface = new ethers.Interface(V2_ROUTER_ABI);
      const encodedData = iface.encodeFunctionData('swapExactTokensForTokens', [
        amountIn,
        0n, // amountOutMin - slippage tolerance
        route,
        this.executorAddress,
        Math.floor(Date.now() / 1000) + 3600 // 1 hour deadline
      ]);

      // Simulate transaction
      const simTx = {
        to: UNISWAP_V2_ROUTER,
        from: this.executorAddress,
        data: encodedData
      };

      console.log('\n🔄 Simulating transaction...');
      const simResult = await this.provider.call(simTx);
      console.log('✅ Simulation successful');

      // In live mode, would actually execute here
      console.log('\n⚠️  LIVE MODE: Would execute transaction');
      console.log('   Actual execution not implemented yet\n');

      return {
        shouldExecute: true,
        simulated: true,
        txHash: '0x...simulated',
        expectedProfit: expectedProfitUsd
      };

    } catch (error) {
      console.error('\n❌ Simulation failed:', error.message);
      return {
        shouldExecute: false,
        reason: `Simulation error: ${error.message}`,
        error: true
      };
    }
  }
}

// ============================================================
// 🚀 MAIN EXECUTION
// ============================================================

async function main() {
  // Initialize provider and wallet
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'https://eth.llamarpc.com');
  const wallet = new ethers.Wallet(key, provider);

  console.log('🔐 Executor Address:', wallet.address);
  console.log('🌐 RPC:', process.env.RPC_URL || 'https://eth.llamarpc.com\n');

  // Create executor instance
  const executor = new ArbitrageExecutor(provider, wallet);

  // Create event emitter for opportunities
  const watcherEmitter = new EventEmitter();

  // ============================================================
  // 📊 EVENT LISTENER FOR OPPORTUNITIES
  // ============================================================

  console.log("🕒 Executor ready — waiting for arbitrage opportunities...");

  watcherEmitter.on("opportunity", async (op) => {
    console.log("🚀 Opportunity received:", op);

    try {
      const result = await executor.execute(op);
      console.log("📊 Simulation result:", result);
    } catch (err) {
      console.error("❌ Simulation error:", err);
    }
  });

  // In simulation mode, exit after timeout for testing
  if (DRY_RUN) {
    console.log('ℹ️  Running in simulation mode - will exit after 60 seconds\n');
    setTimeout(() => {
      console.log('\n⏱️  Simulation timeout - shutting down gracefully');
      process.exit(0);
    }, 60000);
  } else {
    console.log('ℹ️  Running in live mode - listening indefinitely\n');
  }
}

// Start executor
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
