# REMOVED: sensitive data redacted by automated security cleanup
import 'dotenv/config';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import fs from 'fs';

// Explicitly load .env.local
dotenv.config({ path: '.env.local' });

const DEBUG_LOGS = process.env.DEBUG_LOGS === 'true';

// ============================================================
// 🔒 SECURITY GUARDS
// ============================================================
if (fs.existsSync('KILL_SWITCH')) {
  console.error('\n🛑 KILL SWITCH ACTIVATED');
  process.exit(1);
}

import { initSecurity, isLiveTrading, getPrivateKey } from './security-guard.js';
const security = initSecurity();
if (!security.isValid) {
  console.error('\n❌ Security initialization failed');
  process.exit(1);
}

if (!security.isLive) {
  console.log('\n🔒 SIMULATION MODE - No real trades will be executed\n');
} else {
  console.log('\n⚠️  LIVE TRADING MODE - Real money at risk!\n');
}

const key = getPrivateKey();

// ============================================================
// 🔧 CONFIGURATION
// ============================================================
process.title = 'WS-WATCHER';

// Use Flashbots Protect for full mempool access (MEV-optimized)
const RPC_URL = process.env.ETHEREUM_RPC_URL || 'https://rpc.flashbots.net';
const WS_URL = RPC_URL.replace('https://', 'wss://').replace('http://', 'ws://');

// DEX Routers
const DEX_ROUTERS = {
  'REDACTED_ADDRESS': 'Uniswap V2',
  'REDACTED_ADDRESS': 'Uniswap V3',
  'REDACTED_ADDRESS': 'Sushiswap',
  'REDACTED_ADDRESS': '1inch',
};

const DEX_FUNCTIONS = {
  '0x38ed1739': 'swapExactETHForTokens',
  '0x8803dbee': 'swapExactTokensForETH',
  '0xded9382a': 'swapExactTokensForTokens',
  '0xc04b8d59': 'exactInputSingle',
  '0x414bf389': 'exactInput',
  '0x3df02124': 'exchange',
  '0x12f3a5a3': 'swap',
  '0x12aa3caf': 'swap',
};

function isDexTransaction(toAddress) {
  if (!toAddress) return { isDex: false, dexName: null };
  const normalized = toAddress.toLowerCase();
  return {
    isDex: normalized in DEX_ROUTERS,
    dexName: DEX_ROUTERS[normalized] || null
  };
}

function decodeSwapData(input, value, dexName) {
  if (!input || input === '0x') return null;

  try {
    const funcSig = input.slice(0, 10);
    const funcName = DEX_FUNCTIONS[funcSig];
    if (!funcName) {
      if (DEBUG_LOGS && Math.random() < 0.1) {
        console.log(`  🐛 Unknown func sig: ${funcSig} for ${dexName}`);
      }
      return null;
    }

    return { function: funcName, dex: dexName, isSwap: true };
  } catch (error) {
    return { dex: dexName, function: 'unknown', isSwap: true };
  }
}

// ============================================================
// 🚀 MAIN WATCHER
// ============================================================
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        MEV Swarm - WebSocket Mempool Watcher                  ║');
  console.log('║   Real-time pending transaction monitoring via WebSocket            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`🔌 Connecting to WebSocket...`);
  console.log(`   URL: ${WS_URL}\n`);

  const provider = new ethers.WebSocketProvider(WS_URL);
  await provider.getNetwork();

  console.log('✅ Connected! Streaming pending transactions...\n');
  console.log('📡 Watching for DEX swaps... (Ctrl+C to stop)\n');

  let dexSwapCount = 0;
  let totalCount = 0;
  const startTime = Date.now();

  provider.on('pending', async (txHash) => {
    totalCount++;

    try {
      const tx = await provider.getTransaction(txHash);
      if (!tx || !tx.to) return;

      const { isDex, dexName } = isDexTransaction(tx.to);
      if (!isDex) return;

      dexSwapCount++;

      const valueEth = tx.value ? (Number(tx.value) / 1e18).toFixed(4) : '0';

      console.log(`🔄 DEX SWAP [${dexName}] | ${valueEth} ETH | ${dexName} router`);

      if (dexSwapCount % 10 === 0 && DEBUG_LOGS) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = (totalCount / elapsed).toFixed(1);
        console.log(`📊 Stats: ${dexSwapCount} DEX swaps, ${totalCount} total txs, ${rate} tx/sec`);
      }
    } catch (e) {
      // Ignore errors for fast-moving txs
    }
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n📊 Final Statistics:');
    console.log(`   Total transactions: ${totalCount}`);
    console.log(`   DEX swaps detected: ${dexSwapCount}`);
    console.log(`   DEX percentage: ${((dexSwapCount / totalCount) * 100).toFixed(1)}%`);
    console.log('\n👋 Shutting down...\n');

    provider.removeAllListeners();
    await provider.destroy();
    process.exit(0);
  });
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
