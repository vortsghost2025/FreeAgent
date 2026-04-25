# REMOVED: sensitive data redacted by automated security cleanup
import { ethers } from 'ethers';
import 'dotenv/config';
import fs from 'fs';

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
    // Set process title for Windows Task Manager / PowerShell
    process.title = 'EXECUTOR - Arbitrage Executor (Simulation Mode)';
    console.log('🏷️  Process Label: EXECUTOR (SIMULATION)');
  } catch (e) {
    // Ignore if not supported
  }
}

// ============================================================
// Configuration
// ============================================================
const DRY_RUN = !security.isLive; // Use security guard's isLive

// Router Addresses
const UNISWAP_V2_ROUTER = 'REDACTED_ADDRESS';
const UNISWAP_V3_ROUTER = 'REDACTED_ADDRESS';

// ABI Definitions
const V2_ROUTER_ABI = [
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
];

const V3_ROUTER_ABI = [
  'function exactInput((address tokenIn, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) external payable returns (uint256 amountOut)',
];

// ERC20 ABI (for approvals)
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
];

// ============================================================
// Token Helper Functions
// ============================================================

// Known token addresses to symbols
const KNOWN_TOKENS = {
  // All keys are lowercase to match address.toLowerCase() in getTokenSymbol
  '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee': 'WETH', // placeholder WETH
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USDC', // USDC
  '0x6b175474e89094c44da98b954edeac495271d0f': 'DAI',  // DAI
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 'WBTC', // WBTC
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': 'UNI',  // UNI
  '0x514910771af9ca656af840dff83e8264ecf986ca': 'LINK', // LINK (mainnet)
  '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9': 'AAVE', // AAVE (mainnet)
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 'USDT'  // USDT
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
    console.log('   Input:', ethers.formatUnits(amountIn, tokenInDecimals), tokenInSymbol);
    console.log('   Expected Profit: $' + expectedProfitUsd.toFixed(2));

    // Build hops from route
    const numHops = route.length - 1;
    for (let i = 0; i < numHops; i++) {
      const tokenIn = route[i];
      const tokenOut = route[i + 1];

      console.log('\n📍 Route Hops:', numHops);
      for (const hop of this.hops) {
        console.log(`   ${i + 1}. ${hop.dex}: ${hop.tokenInSymbol} → ${hop.tokenOutSymbol}`);
      }
    }

    // ============================================================
    // Step 1: Simulate Route
    // ============================================================
    console.log('\n🔄 Simulating arbitrage route...');

    const feeData = await this.provider.getFeeData();

    // Build transaction for first hop
    const tx1 = {
      to: this.provider.estimateGas ? await this.provider.estimateGas(...) : 210000n,
      data: V2_ROUTER_ABI.encodeFunctionData('swapExactTokensForTokens', [
        amountIn,
        0,
        [...route.map(addr => addr), tokenOut],
        this.executorAddress,
        Math.floor(Date.now() / 1000) + 3600
      ]),
    };

    // Return early if dry run mode
    if (DRY_RUN) {
