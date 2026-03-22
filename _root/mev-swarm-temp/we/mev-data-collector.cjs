// mev-data-collector.cjs - Phase 1: Collect blockchain data for ML training
// This script gathers price/spread data to train a predictive model
const { ethers } = require("ethers");
require('dotenv').config();

const RPC_URL = process.env.BASE_RPC_URL || "https://base-rpc.publicnode.com";
const provider = new ethers.JsonRpcProvider(RPC_URL);

// ============ REAL POOL ADDRESSES FROM YOUR base-arb-cross-protocol.cjs ============
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
  }
];

// Token addresses on Base
const WETH = "0x4200000000000000000000000000000000000006";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Output file for training data
const DATA_FILE = "mev-training-data.json";
const COLLECTION_INTERVAL = 2000; // Match your bot's polling interval
const MIN_PROFIT_THRESHOLD = 0.001; // $0.001 - lower threshold to capture more training data

// ============ PRICE FETCHING FUNCTIONS ============

// Get price from Uniswap V3 pool
async function getV3Price(poolAddr) {
  const c = new ethers.Contract(poolAddr, [
    "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)"
  ], provider);
  
  const s = await c.slot0();
  const sqrtPriceX96 = s[0];
  const sqrtPrice = Number(sqrtPriceX96) / (2 ** 96);
  const price = sqrtPrice * sqrtPrice;
  return price * (10 ** 12); // Adjust for WETH (18 decimals) - USDC (6 decimals)
}

// Get price from Aerodrome (v2-style)
async function getAerodromePrice(poolAddr) {
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
      return await getAerodromePrice(pool.addr);
    }
  } catch (e) {
    console.log(`Error getting price from ${pool.name}: ${e.message.slice(0, 50)}`);
    return 0;
  }
}

// ============ DATA COLLECTION ============

let trainingData = [];
let iteration = 0;
let opportunitiesFound = 0;
let totalSpreadTime = 0;
let spreadCount = 0;

// Calculate if there's an arbitrage opportunity
function calculateOpportunity(results) {
  const valid = results.filter(r => r.price > 100 && r.price < 10000);
  if (valid.length < 2) return null;
  
  const minPrice = Math.min(...valid.map(p => p.price));
  const maxPrice = Math.max(...valid.map(p => p.price));
  const spread = (maxPrice - minPrice) / minPrice;
  
  // Your bot's actual cost calculation from base-arb-cross-protocol.cjs
  const COST = 0.0015; // 0.15% (realistic cross-protocol fees)
  const TRADE_SIZE_ETH = 0.0015;
  const net = spread - COST;
  const profit = (TRADE_SIZE_ETH * minPrice * net);
  
  return {
    timestamp: Date.now(),
    prices: valid.map(p => ({ name: p.name, price: p.price })),
    spread: spread,
    spreadPercent: spread * 100,
    profitEstimate: profit,
    isOpportunity: profit >= MIN_PROFIT_THRESHOLD,
    minPricePool: valid.find(p => p.price === minPrice)?.name,
    maxPricePool: valid.find(p => p.price === maxPrice)?.name
  };
}

// Save data periodically
function saveData() {
  const fs = require("fs");
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(trainingData, null, 2));
    console.log(`💾 Saved ${trainingData.length} data points to ${DATA_FILE}`);
  } catch (e) {
    console.log(`Error saving data: ${e.message}`);
  }
}

// Load existing data if available
function loadExistingData() {
  const fs = require("fs");
  try {
    if (fs.existsSync(DATA_FILE)) {
      trainingData = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
      console.log(`📂 Loaded ${trainingData.length} existing data points`);
    }
  } catch (e) {
    console.log(`No existing data file found, starting fresh`);
  }
}

// Main collection loop
async function collectData() {
  console.log("🎯 MEV Data Collector - Phase 1");
  console.log("================================");
  console.log(`Pools: ${POOLS.map(p => p.name).join(", ")}`);
  console.log(`Collection interval: ${COLLECTION_INTERVAL}ms`);
  console.log(`Profit threshold: $${MIN_PROFIT_THRESHOLD}`);
  console.log("");
  
  loadExistingData();
  
  // Add header to CSV if first run
  const fs = require("fs");
  const csvFile = "mev-training-data.csv";
  if (trainingData.length === 0 && !fs.existsSync(csvFile)) {
    const header = "timestamp,uniV3_005_price,uniV3_030_price,aero_price,spread_pct,profit_estimate,is_opportunity\n";
    fs.writeFileSync(csvFile, header);
  }
  
  while (true) {
    iteration++;
    
    try {
      // Fetch all pool prices in parallel
      const results = await Promise.all(POOLS.map(async p => {
        try {
          return { ...p, price: await getPrice(p) };
        } catch (e) {
          return { ...p, price: 0 };
        }
      }));
      
      const opportunity = calculateOpportunity(results);
      
      if (opportunity) {
        // Find individual prices
        const uniV3_005 = results.find(r => r.name === "UniV3-0.05%")?.price || 0;
        const uniV3_030 = results.find(r => r.name === "UniV3-0.3%")?.price || 0;
        const aero = results.find(r => r.name === "Aero-vol")?.price || 0;
        
        // Log to console
        const spreadStr = opportunity.spreadPercent.toFixed(3);
        const profitStr = opportunity.profitEstimate.toFixed(4);
        const oppStr = opportunity.isOpportunity ? "🎯 OPPORTUNITY!" : "";
        
        console.log(`#${iteration} | UniV3-005: ${uniV3_005.toFixed(2)} | UniV3-030: ${uniV3_030.toFixed(2)} | Aero: ${aero.toFixed(2)} | Spread: ${spreadStr}% | Profit: ${profitStr} ${oppStr}`);
        
        // Add to training data - SAVE ALL DATA POINTS
        trainingData.push({
          ...opportunity,
          uniV3_005_price: uniV3_005,
          uniV3_030_price: uniV3_030,
          aero_price: aero,
          iteration
        });
        
        // Also append to CSV for easy analysis
        const csvLine = `${opportunity.timestamp},${uniV3_005},${uniV3_030},${aero},${opportunity.spreadPercent},${opportunity.profitEstimate},${opportunity.isOpportunity ? 1 : 0}\n`;
        fs.appendFileSync(csvFile, csvLine);
        
        if (opportunity.isOpportunity) {
          opportunitiesFound++;
          totalSpreadTime += COLLECTION_INTERVAL;
          spreadCount++;
        }
        
        // Save every 100 iterations
        if (iteration % 100 === 0) {
          saveData();
        }
        
        // Print stats every 50 iterations
        if (iteration % 50 === 0 && opportunitiesFound > 0) {
          const avgTimeBetweenSpreads = (iteration * COLLECTION_INTERVAL / opportunitiesFound / 1000).toFixed(1);
          console.log(`\n📊 Stats: ${opportunitiesFound} opportunities found | Avg time between: ${avgTimeBetweenSpreads}s\n`);
        }
      }
      
    } catch (e) {
      console.log(`Error in iteration ${iteration}: ${e.message.slice(0, 100)}`);
    }
    
    await sleep(COLLECTION_INTERVAL);
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n🛑 Shutting down...");
  saveData();
  console.log(`\n📊 Final Stats:`);
  console.log(`   Total iterations: ${iteration}`);
  console.log(`   Opportunities found: ${opportunitiesFound}`);
  console.log(`   Data points collected: ${trainingData.length}`);
  process.exit(0);
});

collectData();
