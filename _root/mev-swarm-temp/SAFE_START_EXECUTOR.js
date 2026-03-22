/**
 * 🔒 SAFE STARTUP - Arbitrage Executor
 *
 * This file enforces ALL security checks before the executor can start.
 * If LIVE_TRADING is not explicitly set to "true", it will NOT trade with real money.
 *
 * NEVER bypass these checks. They protect your funds.
 */

import { validateSecurity, getTradingMode, preventKeyExposure } from './security-guard.js';

// ============================================================
// 🔒 SECURITY GATE - Bot will NOT start without passing
// ============================================================

// Run all security checks before doing ANYTHING
validateSecurity();

// Check trading mode
const mode = getTradingMode();
console.log(`📊 Trading Mode: ${mode.mode}`);
console.log(`   Live Trading: ${mode.isLive ? 'YES ⚠️' : 'NO (SIMULATION)'}`);
console.log('');

// ============================================================
// BLOCK LIVE TRADING UNLESS EXPLICITLY ENABLED
// ============================================================

if (!mode.isLive) {
  console.log('\n🛡️  LIVE TRADING DISABLED');
  console.log('');
  console.log('The executor will NOT execute any trades.');
  console.log('It will only SIMULATE and log opportunities.');
  console.log('');
  console.log('To enable live trading:');
  console.log('1. Open .env.local file');
  console.log('2. Change LIVE_TRADING=false to LIVE_TRADING=true');
  console.log('3. Restart the bot');
  console.log('');
  console.log('⚠️  WARNING: Only enable when you are 100% ready.\n');
  process.exit(0); // Exit gracefully - simulation mode only
}

// ============================================================
// Only after security checks pass AND live trading is enabled, continue
// ============================================================

console.log('\n🚨 LIVE TRADING ENABLED');
console.log('');
console.log('⚠️  REAL MONEY AT RISK ⚠️');
console.log('');
console.log('The executor will execute trades with real funds.');
console.log('');
console.log('FINAL CHECKS:');
console.log('- [ ] Your wallet has enough ETH for gas');
console.log('- [ ] You understand the risks');
console.log('- [ ] You have tested in simulation mode first');
console.log('- [ ] You have tested on a testnet');
console.log('');
console.log('If all boxes are checked, the executor will start in 5 seconds...');
console.log('Press Ctrl+C NOW to cancel.\n');

// Wait 5 seconds for user to abort
await new Promise(resolve => setTimeout(resolve, 5000));

console.log('⚡ Starting Executor...\n');

// ============================================================
// Now safe to import and start the executor
// ============================================================

import { ArbitrageExecutor } from './arb-executor.js';

const executor = new ArbitrageExecutor();

console.log('✅ Executor initialized');
console.log(`   Wallet: ${executor.wallet.address.substring(0, 10)}...`);
console.log(`   Balance: ${(await executor.provider.getBalance(executor.wallet.address)).toString()} ETH`);
console.log('');
console.log('⏸️  Waiting for arbitrage opportunities...\n');

// ============================================================
// Graceful shutdown
// ============================================================

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down...');
  process.exit(0);
});
