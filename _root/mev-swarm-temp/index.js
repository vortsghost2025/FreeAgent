/**
 * MEV Swarm - Main Entry Point
 * Wires together BlockWatcher, PoolWatcher, and ArbAgent for real-time MEV detection
 * 
 * Usage:
 *   node index.js              # Start in real-time mode
 *   node index.js --dry-run    # Dry run (no execution)
 *   node index.js --test       # Test mode with mock data
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory (workspace root)
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { WebSocket } from 'ws';
import { ethers } from 'ethers';
import { BlockWatcher } from './block-watcher.js';
import { refreshAllPools, getPoolConfig } from './pool-watcher.js';
import { analyzeOpportunities, getStats, clearOpportunities } from './arb-agent.js';

const CONFIG = {
  wsUrl: process.env.ETH_WS_URL || 'wss://eth-mainnet.g.alchemy.com/v2/' + (process.env.ALCHEMY_API_KEY || ''),
  rpcUrl: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/' + (process.env.ALCHEMY_API_KEY || ''),
  checkInterval: parseInt(process.env.CHECK_INTERVAL || '5000'), // ms between price checks
  dryRun: process.argv.includes('--dry-run') || process.argv.includes('-d') || (process.env.DRY_RUN && process.env.DRY_RUN.toLowerCase() === 'true'),
  testMode: process.argv.includes('--test') || process.argv.includes('-t')
};

let blockWatcher = null;
let isRunning = false;
let checkInterval = null;
let ws = null;
let reconnectAttempts = 0;
let reconnectTimeout = null;
const MAX_RECONNECT_DELAY = 30000; // Max 30 seconds
const INITIAL_RECONNECT_DELAY = 1000; // Start with 1 second

// Calculate delay with exponential backoff
function getReconnectDelay() {
  const delay = Math.min(
    INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttempts),
    MAX_RECONNECT_DELAY
  );
  return delay;
}

// Handle WebSocket disconnection and reconnect
function handleDisconnect() {
  if (!isRunning) return;
  
  const delay = getReconnectDelay();
  reconnectAttempts++;
  
  console.log(`[MEV Swarm] 🔄 WebSocket disconnected. Reconnecting in ${delay / 1000}s (attempt ${reconnectAttempts})...`);
  
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }
  
  reconnectTimeout = setTimeout(async () => {
    try {
      ws = await initWebSocket();
      await subscribeToNewHeads(ws);
      reconnectAttempts = 0; // Reset on successful connection
      console.log('[MEV Swarm] ✓ WebSocket reconnected successfully');
    } catch (err) {
      console.error('[MEV Swarm] Reconnection failed:', err.message);
      handleDisconnect(); // Try again
    }
  }, delay);
}

// Initialize WebSocket connection
function initWebSocket() {
  return new Promise((resolve, reject) => {
    console.log('[MEV Swarm] Connecting to ' + CONFIG.wsUrl.substring(0, 50) + '...');
    
    const ws = new WebSocket(CONFIG.wsUrl);
    
    ws.on('open', () => {
      console.log('[MEV Swarm] ✓ WebSocket connected');
      resolve(ws);
    });
    
    ws.on('error', (err) => {
      console.error('[MEV Swarm] WebSocket error:', err.message);
      reject(err);
    });
    
    ws.on('close', () => {
      console.log('[MEV Swarm] WebSocket closed');
      if (isRunning) {
        handleDisconnect();
      }
    });
    
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        handleMessage(msg);
      } catch (e) {
        // Ignore non-JSON messages
      }
    });
  });
}

// Handle incoming WebSocket messages
let lastBlockTimestamp = 0;
let lastBlockArrivalTime = 0;
let lastNewBlockTime = Date.now();

function handleMessage(msg) {
  if (msg.params && msg.params.result) {
    const result = msg.params.result;
    
    // New block header
    if (result.number) {
      lastNewBlockTime = Date.now();
      onNewBlock(result);
    }
  }
}

// Called on each new block - pure head-driven orchestrator
async function onNewBlock(blockHeader) {
  const blockNumber = parseInt(blockHeader.number, 16);
  const blockTime = blockHeader.timestamp ? parseInt(blockHeader.timestamp, 16) * 1000 : 0;
  const now = Date.now();
  
  console.log('\n[MEV Swarm] 📦 New block: #' + blockNumber);
  
  // Calculate timing
  const timeSinceBlock = blockTime ? now - blockTime : 0;
  console.log(`[Timing] Block #${blockNumber} | Time since block: ${timeSinceBlock}ms`);
  
  // Clear per-block caches - critical for consistency
  clearSlot0Cache();
  
  try {
    // Refresh pool prices using this exact block
    console.log('[MEV Swarm] ↻ Fetching pool prices...');
    const pools = await refreshAllPools(blockNumber);
    
    // Analyze for arbitrage opportunities
    console.log('[MEV Swarm] 🔍 Analyzing opportunities...');
    const opps = await analyzeOpportunities();
    
    if (opps.length > 0) {
      console.log('[MEV Swarm] ✅ Found ' + opps.length + ' opportunity(ies)!');
    }
  } catch (err) {
    console.error('[MEV Swarm] Error in block handler:', err.message);
  }
}

// Subscribe to new block headers
async function subscribeToNewHeads(ws) {
  const subscription = {
    jsonrpc: '2.0',
    id: 1,
    method: 'eth_subscribe',
    params: ['newHeads', {}]
  };
  
  ws.send(JSON.stringify(subscription));
  console.log('[MEV Swarm] ✓ Subscribed to newHeads');
}

// Initial price fetch
async function initialFetch() {
  console.log('\n[MEV Swarm] 📊 Initial price fetch...');
  
  const pools = await refreshAllPools();
  console.log('[MEV Swarm] ✓ Fetched ' + Object.keys(pools).length + ' pool(s)');
  
  // Initial analysis
  await analyzeOpportunities();
  
  return pools;
}

// Periodic price check (backup to WebSocket - only runs if CHECK_INTERVAL > 0)
function startPeriodicChecks() {
  // If CHECK_INTERVAL is 0 or negative, skip periodic checks entirely
  // Let newHeads drive everything via WebSocket
  if (CONFIG.checkInterval <= 0) {
    console.log('[MEV Swarm] ✓ Periodic checks disabled (CHECK_INTERVAL=0) - using WebSocket only');
    return;
  }
  
  if (checkInterval) {
    clearInterval(checkInterval);
  }
  
  checkInterval = setInterval(async () => {
    if (!isRunning) return;
    
    try {
      const pools = await refreshAllPools();
      await analyzeOpportunities();
    } catch (err) {
      console.error('[MEV Swarm] Periodic check error:', err.message);
    }
  }, CONFIG.checkInterval);
  
  console.log('[MEV Swarm] ✓ Started periodic checks every ' + (CONFIG.checkInterval / 1000) + 's (backup mode)');
}

// Main startup
async function start() {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 MEV Swarm - Real-Time Arbitrage Detection');
  console.log('='.repeat(50));
  console.log('[Config] Dry run:', CONFIG.dryRun);
  console.log('[Config] Test mode:', CONFIG.testMode);
  console.log('[Config] Check interval:', CONFIG.checkInterval + 'ms');
  console.log('[Pools] Watching:', Object.keys(getPoolConfig()).join(', '));
  
  if (CONFIG.dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No actual trades will be executed\n');
  }
  
  try {
    // Initial fetch
    await initialFetch();
    
    if (!CONFIG.testMode) {
      // Connect WebSocket
      const ws = await initWebSocket();
      await subscribeToNewHeads(ws);
      
      // Start periodic checks as backup
      startPeriodicChecks();
    } else {
      console.log('[MEV Swarm] ⚠️ Test mode - using periodic checks only');
      startPeriodicChecks();
    }
    
    isRunning = true;
    console.log('\n[MEV Swarm] ✅ Swarm is running! Press Ctrl+C to stop.\n');
    
    // Handle shutdown
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    
  } catch (err) {
    console.error('[MEV Swarm] Failed to start:', err.message);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  console.log('\n[MEV Swarm] Shutting down...');
  isRunning = false;
  
  if (checkInterval) {
    clearInterval(checkInterval);
  }
  
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  
  if (ws) {
    ws.close();
    ws = null;
  }
  
  const stats = getStats();
  console.log('[MEV Swarm] 📊 Session stats:', JSON.stringify(stats));
  
  process.exit(0);
}

// Export for programmatic use
export { start, shutdown, CONFIG, getStats, analyzeOpportunities, refreshAllPools };

// Auto-start if run directly
if (import.meta.url === 'file://' + process.argv[1] || process.argv[1].includes('index.js')) {
  start();
} 
