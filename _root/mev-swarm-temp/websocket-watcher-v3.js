/**
 * MEV Swarm v3 - Modular WebSocket Mempool Watcher
 * Real-time DEX swap monitoring with arbitrage detection
 */

import 'dotenv/config';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import fs from 'fs';
import WebSocket from 'ws';

// Force-load .env.local even if renv blocks automatic loading (production-safe)
dotenv.config({ path: '.env.local', override: true });

const DEBUG_LOGS = process.env.DEBUG_LOGS === 'true';

// Explicit fallback + logging (works even when renv is active)
const RPC_URL =
  process.env.ETHEREUM_RPC_URL ||
  process.env.RPC_URL ||
  process.env.WSS_URL ||
  null;

if (!RPC_URL) {
  console.error(
    '[ENV] No RPC URL found. Checked: ETHEREUM_RPC_URL, RPC_URL, WSS_URL. ' +
    'renv may be blocking environment variables.'
  );
  process.exit(1);
} else {
  console.log('[ENV] Loaded RPC URL:', RPC_URL.slice(0, 40) + '...');
}

// Convert to HTTP for provider (WebSocket still used for mempool stream)
const HTTP_URL = RPC_URL.includes('wss://') ? RPC_URL.replace('wss://', 'https://') : RPC_URL.replace('ws://', 'http://');

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
process.title = 'WS-WATCHER-V3';

// ============================================================
// 📦 MODULE IMPORTS
// ============================================================
import { decodeSwap } from './swap-decoder.js';
import { PriceOracle } from './price-oracle.js';
import { ArbitrageEngine } from './arb-engine.js';
import { CORE_TOKENS } from './constants/tokens.js';

// ============================================================
// 🌐 RESILIENT WEBSOCKET WRAPPER
// ============================================================
class ResilientWebSocket {
  constructor(url, { onMessage, onOpen, onClose, onError }) {
    this.url = url;
    this.onMessage = onMessage;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.onError = onError;

    this.ws = null;
    this.forcedClose = false;
    this.reconnectAttempts = 0;
    this.maxReconnectDelayMs = 30000;
    this.baseReconnectDelayMs = 1000;
    this.heartbeatIntervalMs = 15000;
    this.heartbeatTimeoutMs = 45000;

    this.heartbeatInterval = null;
    this.heartbeatTimeout = null;

    this.connect();
  }

  connect() {
    if (this.forcedClose) return;

    const ws = new WebSocket(this.url);
    this.ws = ws;

    ws.on('open', () => {
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.onOpen?.();
    });

    ws.on('message', (data) => {
      this.bumpHeartbeat();
      this.onMessage?.(data);
    });

    ws.on('error', (err) => {
      console.error('[WS] error:', err.code || err.message);
      this.onError?.(err);
    });

    ws.on('close', (code, reason) => {
      this.stopHeartbeat();
      this.onClose?.(code, reason);
      if (!this.forcedClose) this.scheduleReconnect();
    });
  }

  scheduleReconnect() {
    this.reconnectAttempts += 1;

    const exp = Math.min(this.reconnectAttempts, 8);
    const base = this.baseReconnectDelayMs * Math.pow(2, exp);
    const jitter = Math.random() * 1000;
    const delay = Math.min(base + jitter, this.maxReconnectDelayMs);

    console.log(`[WS] reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => this.connect(), delay);
  }

  startHeartbeat() {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        try {
          this.ws.ping();
        } catch (e) {
          console.error('[WS] ping error:', e.message);
        }
      }
    }, this.heartbeatIntervalMs);

    this.bumpHeartbeat();
  }

  bumpHeartbeat() {
    if (this.heartbeatTimeout) clearTimeout(this.heartbeatTimeout);

    this.heartbeatTimeout = setTimeout(() => {
      console.warn('[WS] heartbeat timeout — terminating socket');
      this.ws?.terminate();
    }, this.heartbeatTimeoutMs);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.heartbeatTimeout) clearTimeout(this.heartbeatTimeout);
    this.heartbeatInterval = null;
    this.heartbeatTimeout = null;
  }

  send(msg) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(msg);
    }
  }

  close() {
    this.forcedClose = true;
    this.stopHeartbeat();
    this.ws?.close();
  }
}

// ============================================================
// 🎯 MONITORED PAIRS (customize these)
// ============================================================
const MONITORED_PAIRS = [
  // WETH major pairs
  ['WETH', 'USDC'],
  ['WETH', 'USDT'],
  ['WETH', 'DAI'],

  // Major stablecoin pairs
  ['USDC', 'USDT'],
  ['USDC', 'DAI'],
  ['USDT', 'DAI'],
];

// ============================================================
// 🚀 MAIN SYSTEM
// ============================================================
async function main() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║     MEV Swarm v3 - Modular Arbitrage System            ║');
  console.log('║   WebSocket → Decoder → Oracle → Arb Engine            ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  console.log(`🔌 Connecting to WebSocket...`);
  console.log(`   URL: ${RPC_URL}\n`);

  // Create ethers provider for transaction queries (use HTTP to avoid rate limits)
  const provider = new ethers.JsonRpcProvider(HTTP_URL);

  // Create resilient WebSocket for mempool streaming
  const ws = new ResilientWebSocket(RPC_URL, {
    onOpen: () => {
      console.log('✅ WS connected, subscribing to mempool...\n');
      ws.send(JSON.stringify({
        id: 1,
        jsonrpc: '2.0',
        method: 'eth_subscribe',
        params: ['newPendingTransactions']
      }));
    },

    onMessage: async (data) => {
      try {
        const message = JSON.parse(data.toString());

        // Handle pending transaction notifications
        if (message.method === 'eth_subscription' && message.params) {
          const txHash = message.params[0];
          await handlePendingTx(txHash, provider);
        }
      } catch (error) {
        if (DEBUG_LOGS) {
          console.error('Error parsing WebSocket message:', error.message);
        }
      }
    },

    onClose: (code, reason) => {
      console.log(`\n[WS] closed: ${code} ${reason}`);
    },

    onError: (err) => {
      console.error('[WS] socket error:', err.message);
    }
  });

  // Initialize modules
  const priceOracle = new PriceOracle(provider);
  const arbEngine = new ArbitrageEngine();
  const wallet = new ethers.Wallet(key, provider);

  console.log(`📡 Watching ${MONITORED_PAIRS.length} monitored pairs for arbitrage...\n`);
  console.log(`📊 Pairs: ${MONITORED_PAIRS.join(', ')}\n`);
  console.log('📡 Watching for DEX swaps... (Ctrl+C to stop)\n');

  let stats = {
    totalTx: 0,
    dexSwaps: 0,
    arbitrage: 0,
    startTime: Date.now()
  };

  // Handle pending transactions
  async function handlePendingTx(txHash) {
    stats.totalTx++;

    try {
      const tx = await provider.getTransaction(txHash);
      if (!tx || !tx.to || !tx.data || tx.data === '0x') return;

      // Check if it's a DEX transaction
      const routerAddr = tx.to.toLowerCase();
      const swap = decodeSwap(tx.data, tx.to, 'Unknown');

      if (!swap || !swap.decoded) {
        return; // Not a swap we care about
      }

      stats.dexSwaps++;
      const valueEth = tx.value ? (Number(tx.value) / 1e18).toFixed(4) : '0';

      console.log(`\n🔄 DEX SWAP [${swap.routerName}]`);
      console.log(`   📥 Hash: ${txHash.slice(0, 12)}...`);
      console.log(`   💰 Amount: ${valueEth} ETH`);
      console.log(`   🔧 Method: ${swap.method}`);
      console.log(`   📊 Pair: ${swap.tokenInSymbol} → ${swap.tokenOutSymbol}`);

      // Get market prices for this pair
      const marketPrices = await priceOracle.getPrices(swap.tokenIn, swap.tokenOut);
      if (!marketPrices) return;

      // Evaluate for arbitrage
      const opportunity = arbEngine.evaluate(swap, marketPrices);
      arbEngine.format(opportunity);

      if (opportunity.type === 'arbitrage') {
        stats.arbitrage++;

        // Every 10 opportunities, show stats
        if (stats.arbitrage % 10 === 0 && DEBUG_LOGS) {
          const elapsed = (Date.now() - stats.startTime) / 1000;
          const rate = (stats.totalTx / elapsed).toFixed(1);
          console.log(`\n📊 LIVE STATS (Running ${elapsed}s)`);
          console.log(`   📡 Total Transactions: ${stats.totalTx}`);
          console.log(`   🔄 DEX Swaps: ${stats.dexSwaps}`);
          console.log(`   🎯 Arbitrage Opportunities: ${stats.arbitrage}`);
          console.log(`   📈 Detection Rate: ${rate} tx/sec`);
          console.log(`   📈 Arbitrage Rate: ${(stats.arbitrage / elapsed).toFixed(2)}/min`);
        }
      }

    } catch (e) {
      // Fast-moving transactions may fail to decode
      if (DEBUG_LOGS) {
        console.log(`  ⚠️  Error processing ${txHash.slice(0, 10)}...: ${e.message}`);
      }
    }
  }

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n╔══════════════════════════════════════════════════╗');
    console.log('║                    FINAL STATISTICS                     ║');
    console.log('╚══════════════════════════════════════════════════╝\n');

    const elapsed = (Date.now() - stats.startTime) / 1000;
    const rate = (stats.totalTx / elapsed).toFixed(1);

    console.log(`⏱️  Uptime: ${elapsed} seconds`);
    console.log(`📡 Total Transactions: ${stats.totalTx}`);
    console.log(`🔄 DEX Swaps: ${stats.dexSwaps}`);
    console.log(`🎯 Arbitrage Opportunities: ${stats.arbitrage}`);
    console.log(`📈 Detection Rate: ${rate} tx/sec`);
    console.log(`📈 Arbitrage Rate: ${(stats.arbitrage / elapsed).toFixed(2)}/min`);
    console.log(`📊 DEX %: ${((stats.dexSwaps / stats.totalTx) * 100).toFixed(1)}%`);
    console.log(`📊 Arbitrage %: ${((stats.arbitrage / stats.totalTx) * 100).toFixed(1)}%`);
    console.log('\n👋 Shutting down...\n');

    // Close WebSocket connection
    ws.close();

    // Get final stats from arb engine
    const finalStats = arbEngine.getStats();
    if (finalStats.arbitrage > 0) {
      console.log('\n💰 TOP 10 OPPORTUNITIES:\n');
      finalStats.opportunities.forEach((opp, i) => {
        console.log(`${i + 1}. ${opp.tokenPair} | ${opp.amountIn} ETH | +${opp.profitPercent} | ~$${opp.estimatedUsdProfit}`);
      });
    }

    provider.removeAllListeners();
    provider.destroy();
    process.exit(0);
  });
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
