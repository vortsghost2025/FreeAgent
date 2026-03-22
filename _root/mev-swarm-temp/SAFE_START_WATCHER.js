/**
 * 🔒 SAFE STARTUP - Block Watcher
 *
 * This file enforces ALL security checks before the watcher can start.
 * If any check fails, the bot will NOT start.
 *
 * NEVER bypass these checks. They protect your funds.
 */

import { validateSecurity, getTradingMode } from './security-guard.js';

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
// Only after security checks pass, import and start the watcher
// ============================================================

import { BlockWatcher } from './block-watcher.js';
import { priceCalc } from './price-calculator.js';

console.log('🚀 Starting Block Watcher...\n');

// Create watcher with callback
const watcher = new BlockWatcher(async (blockNumber, data) => {
  if (data.type === 'new_block') {
    console.log(`\n📦 Block #${blockNumber} mined`);
  } else if (data.type === 'pending_tx') {
    const tx = data.transaction;

    // Parse and log DEX swaps
    const parsed = await parseDexTransaction(tx, watcher.provider);
    if (parsed && parsed.isDexSwap) {
      console.log(`🔄 ${parsed.dex} swap detected: ${tx.hash.substring(0, 10)}...`);
    }
  }
});

// Start the watcher
watcher.start().then(success => {
  if (success) {
    console.log('✅ Watcher started successfully');
    console.log('   Monitoring mempool for DEX swaps...\n');
  } else {
    console.error('❌ Failed to start watcher');
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ Watcher error:', error);
  process.exit(1);
});

// ============================================================
// Graceful shutdown
// ============================================================

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  watcher.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down...');
  watcher.stop();
  process.exit(0);
});
