// base-arb-data-collector.cjs - Data collection mode for arbitrage analysis
// Run this to collect market data before enabling auto-execution
const { ethers } = require("ethers");
require('dotenv').config();

const RPC_URL = process.env.BASE_RPC_URL || "https://base-rpc.publicnode.com";
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Check for private key (needed for balance checks, not for execution)
if (!process.env.PRIVATE_KEY) {
  console.log("⚠️  Warning: PRIVATE_KEY not found - running in read-only mode");
}

const wallet = process.env.PRIVATE_KEY ? new ethers.Wallet(process.env.PRIVATE_KEY, provider) : null;

// Pool configurations - Cross-protocol!
const POOLS = [
  { 
    name: "UniV3-0.05%", 
    addr: "0xd0b53D9277642d899DF5C87A3966A349A798F224", 
    protocol: "uniswap",
    fee: 500 
  },
  { 
    name: "UniV3-0.3%", 
    addr: "0x6c561B446416E1A00E8E93E221854d6eA4171372", 
    protocol: "uniswap",
    fee: 3000 
  },
  { 
    name: "Aero-vol", 
    addr: "0xcDAC0d6c6C59727a65F871236188350531885C43", 
    protocol: "v2"
  },
];

// Token addresses on Base
const WETH = "0x4200000000000000000000000000000000000006";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// CONFIG - Learning mode!
const TRADE_SIZE_ETH = 0.005;
const AUTO_EXECUTE = false; // LEARNING MODE - no execution
const MIN_PROFIT_USD = 0.01; // Trigger threshold for "opportunity" logging
const LOG_THRESHOLD = 0.0015; // Log anything above 0.15% spread
const CHECK_INTERVAL = 2000; // 2 seconds

// Output files
const PRICE_LOG = "price-snapshots.jsonl";
const OPPORTUNITY_LOG = "opportunities.jsonl";
const STATS_FILE = "session-stats.json";

const fs = require('fs');

// Get price from Uniswap V3 pool
async function getV3Price(poolAddr) {
  const c = new ethers.Contract(poolAddr, [
    "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)"
  ], provider);
  const s = await c.slot0();
  const sqrtPriceX96 = s[0];
  const sqrtPrice = Number(sqrtPriceX96) / (2 ** 96);
  const price = sqrtPrice * sqrtPrice;
  return price * (10 ** 12);
}

// Get price from V2-style pool (Aerodrome)
async function getV2Price(poolAddr) {
  const c = new ethers.Contract(poolAddr, [
    "function getReserves() view returns (uint256 reserve0, uint256 reserve1, uint256 blockTimestampLast)"
  ], provider);
  const r = await c.getReserves();
  return Number(ethers.formatUnits(r[1], 6)) / Number(ethers.formatEther(r[0]));
}

async function getPrice(pool) {
  try {
    if (pool.protocol === "uniswap") {
      return await getV3Price(pool.addr);
    } else {
      return await getV2Price(pool.addr);
    }
  } catch (e) {
    return 0;
  }
}

function logToFile(filename, data) {
  fs.appendFileSync(filename, JSON.stringify(data) + '\n');
}

function loadStats() {
  try {
    if (fs.existsSync(STATS_FILE)) {
      return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
    }
  } catch (e) {}
  return {
    startTime: Date.now(),
    iterations: 0,
    maxSpread: 0,
    opportunitiesFound: 0,
    poolPairStats: {},
    spreadHistory: [],
    lastOpportunity: null
  };
}

function saveStats(stats) {
  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
}

function analyzePair(results) {
  const pairs = [];
  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      const a = results[i];
      const b = results[j];
      if (a.price > 0 && b.price > 0) {
        const spread = Math.abs(a.price - b.price) / Math.min(a.price, b.price);
        pairs.push({
          buyPool: a.price < b.price ? a.name : b.name,
          sellPool: a.price < b.price ? b.name : a.name,
          buyPrice: Math.min(a.price, b.price),
          sellPrice: Math.max(a.price, b.price),
          spread: spread,
          spreadPct: spread * 100
        });
      }
    }
  }
  return pairs;
}

async function main() {
  console.log("📊 Base Arb Data Collector - LEARNING MODE\n");
  console.log("=".repeat(60));
  console.log("This bot collects market data for analysis.");
  console.log("No trades will be executed (AUTO_EXECUTE = false)");
  console.log("=".repeat(60) + "\n");
  
  let stats = loadStats();
  console.log(`📁 Logging to: ${PRICE_LOG}, ${OPPORTUNITY_LOG}`);
  console.log(`📊 Stats file: ${STATS_FILE}`);
  console.log(`⏱️  Check interval: ${CHECK_INTERVAL}ms`);
  console.log(`📈 Log threshold: ${LOG_THRESHOLD * 100}% spread\n`);
  
  // Get block number and gas info
  const blockNum = await provider.getBlockNumber();
  console.log(`🔗 Current block: ${blockNum}\n`);
  
  for (let i = 1; ; i++) {
    try {
      const blockStart = await provider.getBlockNumber();
      const timestamp = Date.now();
      
      const results = await Promise.all(POOLS.map(async p => {
        return { name: p.name, protocol: p.protocol, price: await getPrice(p) };
      }));
      
      const valid = results.filter(r => r.price > 100 && r.price < 10000);
      
      if (valid.length < 2) { 
        console.log(`#${i} Bad prices`); 
        await sleep(CHECK_INTERVAL); 
        continue; 
      }
      
      // Analyze ALL pool pairs
      const pairs = analyzePair(valid);
      const bestPair = pairs.reduce((max, p) => p.spread > max.spread ? p : max, pairs[0]);
      
      // Update stats
      stats.iterations++;
      if (bestPair.spread > stats.maxSpread) {
        stats.maxSpread = bestPair.spread;
      }
      
      // Track pool pair performance
      const pairKey = `${bestPair.buyPool} → ${bestPair.sellPool}`;
      if (!stats.poolPairStats[pairKey]) {
        stats.poolPairStats[pairKey] = { count: 0, maxSpread: 0, avgSpread: 0 };
      }
      stats.poolPairStats[pairKey].count++;
      stats.poolPairStats[pairKey].maxSpread = Math.max(stats.poolPairStats[pairKey].maxSpread, bestPair.spread);
      
      const cost = 0.0015; // 0.15% assumed fees
      const net = bestPair.spread - cost;
      const profit = TRADE_SIZE_ETH * Math.min(bestPair.buyPrice, bestPair.sellPrice) * net;
      
      // Log all prices (every 10 iterations or significant spread)
      if (i % 10 === 0 || bestPair.spread > LOG_THRESHOLD) {
        const priceData = {
          timestamp,
          block: blockStart,
          prices: valid.map(p => ({ name: p.name, price: p.price })),
          bestPair,
          gasInfo: "collecting..."
        };
        logToFile(PRICE_LOG, priceData);
      }
      
      // Log opportunities (when profitable)
      if (profit >= MIN_PROFIT_USD) {
        stats.opportunitiesFound++;
        stats.lastOpportunity = {
          timestamp,
          block: blockStart,
          pair: bestPair,
          profitUSD: profit,
          gasEstimate: "TBD"
        };
        
        const oppData = {
          timestamp,
          block: blockStart,
          pair: bestPair,
          profitUSD: profit,
          estimatedGas: 0.005, // ~5 gwei * 100k
          netProfit: profit - 0.005 * 0.000001 * 2100 // rough gas estimate
        };
        logToFile(OPPORTUNITY_LOG, oppData);
        
        console.log(`🎯 #${i} | ${bestPair.buyPool} → ${bestPair.sellPool} | Spread: ${bestPair.spreadPct.toFixed(3)}% | Profit: $${profit.toFixed(4)} | OPPO!`);
      } else {
        console.log(`#${i} | ${bestPair.buyPool} → ${bestPair.sellPool} | ${bestPair.spreadPct.toFixed(3)}% | Est. profit: $${profit.toFixed(4)}`);
      }
      
      // Save stats periodically
      if (i % 50 === 0) {
        saveStats(stats);
        console.log(`\n📊 Stats: Iterations: ${stats.iterations} | Max spread: ${(stats.maxSpread*100).toFixed(3)}% | Opportunities: ${stats.opportunitiesFound}\n`);
        
        // Show top pool pairs
        const topPairs = Object.entries(stats.poolPairStats)
          .sort((a, b) => b[1].maxSpread - a[1].maxSpread)
          .slice(0, 3);
        console.log("🏆 Top pairs:", topPairs.map(([k, v]) => `${k}: ${(v.maxSpread*100).toFixed(2)}%`).join(", "));
        console.log("");
      }
      
    } catch (e) { 
      console.log(`#${i} ERR: ${e.message.slice(0,50)}`); 
    }
    await sleep(CHECK_INTERVAL);
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
main();
