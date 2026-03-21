# REMOVED: sensitive data redacted by automated security cleanup
// mev-data-collector.cjs - Phase 1: Collect blockchain data for ML training
// This script gathers price/spread data to train a predictive model
const { ethers } = require("ethers");
require('dotenv').config();

const RPC_URL = process.env.BASE_RPC_URL || "https://base-rpc.publicnode.com";
const provider = new ethers.JsonRpcProvider(RPC_URL);
const fs = require("fs");

// ============ REAL POOL ADDRESSES FROM YOUR base-arb-cross-protocol.cjs ============
const POOLS = [
  { 
    name: "UniV3-0.05%", 
    addr: "REDACTED_ADDRESS", 
    protocol: "uniswap",
    fee: 500  // 0.05%
  },
  { 
    name: "UniV3-0.3%", 
    addr: "REDACTED_ADDRESS", 
    protocol: "uniswap",
    fee: 3000  // 0.30%
  },
  { 
    name: "Aero-vol", 
    addr: "REDACTED_ADDRESS", 
    protocol: "v2",
    fee: 0  // Aerodrome fees vary, we'll estimate
  }
];

// ============ REALISTIC COST PARAMETERS ============
const COST_PARAMS = {
  // Gas costs (in USD, Base network)
  gasCostUSD: 0.15,           // ~$0.10-0.20 for simple swap on Base
  gasCostETH: 0.00007,        // ~70k gas * 1 gwei * ETH price
  
  // LP Fees (pool fees you pay when trading)
  lpFeeUniV3_005: 0.0005,     // 0.05%
  lpFeeUniV3_030: 0.003,      // 0.30%
  lpFeeAero: 0.002,           // ~0.2% estimate for Aerodrome
  
  // Slippage buffer (conservative estimate)
  slippageBuffer: 0.001,      // 0.1% slippage buffer
  
  // Minimum profitable spread after all costs
  getTotalCost: function() {
    // For cross-pool arb: pay LP fee on both sides
    // Buy from cheap pool + sell to expensive pool
    return this.lpFeeUniV3_005 + this.lpFeeUniV3_030 + this.slippageBuffer + (this.gasCostUSD / 2140);
  }
};

console.log(`\n📊 Cost Parameters:`);
console.log(`   Gas cost: ~${COST_PARAMS.gasCostUSD}`);
console.log(`   LP fees: 0.05% + 0.30% = 0.35%`);
console.log(`   Slippage buffer: 0.1%`);
console.log(`   Total minimum spread needed: ${(COST_PARAMS.getTotalCost() * 100).toFixed(2)}%\n`);

// Token addresses on Base
const WETH = "REDACTED_ADDRESS";
const USDC = "REDACTED_ADDRESS";

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

// ============ STATE MACHINE FOR OPPORTUNITY DETECTION ============
// This prevents overcounting by tracking when opportunities OPEN and CLOSE

let opportunityState = {
  isActive: false,
  currentOpportunity: null,
  opportunities: [],        // Array of deduplicated opportunities
  opportunitiesFound: 0,    // ACTUAL count (not tick count)
  iteration: 0,
  totalTicksInOpportunity: 0
};

let trainingData = [];

// Calculate if there's an arbitrage opportunity with REALISTIC costs
function calculateOpportunity(results) {
  const valid = results.filter(r => r.price > 100 && r.price < 10000);
  if (valid.length < 2) return null;
  
  const minPrice = Math.min(...valid.map(p => p.price));
  const maxPrice = Math.max(...valid.map(p => p.price));
  const spread = (maxPrice - minPrice) / minPrice;
  
  // Realistic cost calculation
  const TOTAL_COST = COST_PARAMS.getTotalCost(); // ~0.45% with gas + fees + slippage
  const TRADE_SIZE_ETH = 0.0015;
  const net = spread - TOTAL_COST;
  const profit = (TRADE_SIZE_ETH * minPrice * net);
  
  // Raw spread before costs (for analysis)
  const rawSpread = spread;
  
  return {
    timestamp: Date.now(),
    prices: valid.map(p => ({ name: p.name, price: p.price })),
    spread: spread,
    spreadPercent: spread * 100,
    rawSpreadPercent: rawSpread * 100,
    costPercent: TOTAL_COST * 100,
    profitEstimate: profit,
    isProfitable: profit >= MIN_PROFIT_THRESHOLD,  // Renamed for clarity
    isOpportunity: spread >= TOTAL_COST,          // Spread crosses threshold
    minPricePool: valid.find(p => p.price === minPrice)?.name,
    maxPricePool: valid.find(p => p.price === maxPrice)?.name
  };
}

// State machine to track opportunities as continuous events
function updateOpportunityState(opportunity) {
  const wasActive = opportunityState.isActive;
  const isNowOpportunity = opportunity.isOpportunity;
  
  if (isNowOpportunity && !wasActive) {
    // OPPORTUNITY OPENS - Start new opportunity event
    opportunityState.isActive = true;
    opportunityState.currentOpportunity = {
      id: opportunityState.opportunitiesFound + 1,
      startTime: opportunity.timestamp,
      endTime: null,
      duration: 0,
      tickCount: 1,
      maxSpread: opportunity.spreadPercent,
      avgSpread: opportunity.spreadPercent,
      minSpread: opportunity.spreadPercent,
      maxProfit: opportunity.profitEstimate,
      minPricePool: opportunity.minPricePool,
      maxPricePool: opportunity.maxPricePool
    };
    console.log(`\n🔓 OPPORTUNITY #${opportunityState.currentOpportunity.id} OPENED`);
    console.log(`   Spread: ${opportunity.spreadPercent.toFixed(3)}% | Pool: ${opportunity.minPricePool} → ${opportunity.maxPricePool}\n`);
    
  } else if (isNowOpportunity && wasActive) {
    // OPPORTUNITY CONTINUES - Update running stats
    opportunityState.currentOpportunity.tickCount++;
    opportunityState.currentOpportunity.maxSpread = Math.max(
      opportunityState.currentOpportunity.maxSpread, 
      opportunity.spreadPercent
    );
    opportunityState.currentOpportunity.minSpread = Math.min(
      opportunityState.currentOpportunity.minSpread, 
      opportunity.spreadPercent
    );
    opportunityState.currentOpportunity.maxProfit = Math.max(
      opportunityState.currentOpportunity.maxProfit,
      opportunity.profitEstimate
    );
    // Running average
    const current = opportunityState.currentOpportunity;
    current.avgSpread = (current.avgSpread * (current.tickCount - 1) + opportunity.spreadPercent) / current.tickCount;
    
  } else if (!isNowOpportunity && wasActive) {
    // OPPORTUNITY CLOSES - Record completed opportunity
    opportunityState.currentOpportunity.endTime = opportunity.timestamp;
    opportunityState.currentOpportunity.duration = 
      (opportunityState.currentOpportunity.endTime - opportunityState.currentOpportunity.startTime) / 1000;
    
    // Only count as valid if duration > 2 ticks (not just noise)
    if (opportunityState.currentOpportunity.tickCount >= 2) {
      opportunityState.opportunities.push(opportunityState.currentOpportunity);
      opportunityState.opportunitiesFound++;
      console.log(`\n🔒 OPPORTUNITY #${opportunityState.currentOpportunity.id} CLOSED`);
      console.log(`   Duration: ${opportunityState.currentOpportunity.duration.toFixed(1)}s | Ticks: ${opportunityState.currentOpportunity.tickCount}`);
      console.log(`   Max Spread: ${opportunityState.currentOpportunity.maxSpread.toFixed(3)}% | Avg: ${opportunityState.currentOpportunity.avgSpread.toFixed(3)}%\n`);
    } else {
      console.log(`\n⚠️  Filtered noise (${opportunityState.currentOpportunity.tickCount} tick) - not counted\n`);
    }
    
    opportunityState.currentOpportunity = null;
    opportunityState.isActive = false;
  }
  
  return opportunityState.currentOpportunity;
}

// Save data periodically
function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(trainingData, null, 2));
    console.log(`💾 Saved ${trainingData.length} data points to ${DATA_FILE}`);
  } catch (e) {
    console.log(`Error saving data: ${e.message}`);
  }
}

// Load existing data if available
function loadExistingData() {
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
  console.log("🎯 MEV Data Collector - Phase 1 (Stateful)");
  console.log("==========================================");
  console.log(`Pools: ${POOLS.map(p => p.name).join(", ")}`);
  console.log(`Collection interval: ${COLLECTION_INTERVAL}ms`);
  console.log(`Profit threshold: ${MIN_PROFIT_THRESHOLD}`);
  console.log(`Minimum spread needed: ${(COST_PARAMS.getTotalCost() * 100).toFixed(2)}% (after costs)`);
  console.log("");
  
  loadExistingData();
  
  // Add header to CSV if first run
  const csvFile = "mev-training-data.csv";
  if (trainingData.length === 0 && !fs.existsSync(csvFile)) {
    const header = "timestamp,uniV3_005_price,uniV3_030_price,aero_price,spread_pct,cost_pct,profit_estimate,is_opportunity\n";
    fs.writeFileSync(csvFile, header);
  }
  
  while (true) {
    opportunityState.iteration++;
    
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
        
        // Update state machine (this handles deduplication)
        const activeOpp = updateOpportunityState(opportunity);
        
        // Log to console
        const spreadStr = opportunity.spreadPercent.toFixed(3);
        const costStr = opportunity.costPercent.toFixed(2);
        const profitStr = opportunity.profitEstimate.toFixed(4);
        const profitFlag = opportunity.isProfitable ? "💰" : (opportunity.isOpportunity ? "🎯" : "");
        
        // Show status indicator
        let status = "";
        if (opportunityState.isActive && opportunityState.currentOpportunity) {
          status = `[#${opportunityState.currentOpportunity.id} ${opportunityState.currentOpportunity.tickCount}t]`;
        }
        
        console.log(`#${opportunityState.iteration} | ${spreadStr}% (${costStr}%) | ${profitStr} ${profitFlag} ${status}`);
        
        // Add to training data - SAVE ALL DATA POINTS
        trainingData.push({
          ...opportunity,
          uniV3_005_price: uniV3_005,
          uniV3_030_price: uniV3_030,
          aero_price: aero,
          iteration: opportunityState.iteration,
          activeOpportunityId: activeOpp?.id || null
        });
        
        // Also append to CSV for easy analysis
        const csvLine = `${opportunity.timestamp},${uniV3_005},${uniV3_030},${aero},${opportunity.spreadPercent},${opportunity.costPercent},${opportunity.profitEstimate},${opportunity.isOpportunity ? 1 : 0}\n`;
        fs.appendFileSync(csvFile, csvLine);
        
        // Save every 100 iterations
        if (opportunityState.iteration % 100 === 0) {
          saveData();
        }
        
        // Print stats every 50 iterations
        if (opportunityState.iteration % 50 === 0 && opportunityState.opportunitiesFound > 0) {
          const activeDuration = opportunityState.currentOpportunity ? 
            ((Date.now() - opportunityState.currentOpportunity.startTime) / 1000).toFixed(1) : 0;
          console.log(`\n📊 CORRECTED Stats:`);
          console.log(`   Discrete opportunities: ${opportunityState.opportunitiesFound}`);
          console.log(`   Current opportunity: ${opportunityState.isActive ? activeDuration + 's active' : 'none'}`);
          console.log(`   Total ticks in opportunities: ${opportunityState.opportunities.reduce((a, b) => a + b.tickCount, 0)}\n`);
        }
      }
      
    } catch (e) {
      console.log(`Error in iteration ${opportunityState.iteration}: ${e.message.slice(0, 100)}`);
    }
    
    await sleep(COLLECTION_INTERVAL);
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n🛑 Shutting down...");
  saveData();
  
  // Calculate final statistics
  const totalTicks = opportunityState.opportunities.reduce((a, b) => a + b.tickCount, 0);
  const activeDuration = opportunityState.currentOpportunity ? 
    (Date.now() - opportunityState.currentOpportunity.startTime) / 1000 : 0;
  
  console.log(`\n📊 FINAL CORRECTED Stats:`);
  console.log(`   Total iterations: ${opportunityState.iteration}`);
  console.log(`   ─────────────────────────────────────`);
  console.log(`   DISCRETE opportunities: ${opportunityState.opportunitiesFound}`);
  console.log(`   Total ticks in opportunities: ${totalTicks}`);
  console.log(`   Compression ratio: ${(opportunityState.iteration / Math.max(1, opportunityState.opportunitiesFound)).toFixed(1)}x`);
  console.log(`   ─────────────────────────────────────`);
  
  if (opportunityState.opportunities.length > 0) {
    const durations = opportunityState.opportunities.map(o => o.duration);
    const avgDuration = durations.reduce((a,b) => a+b, 0) / durations.length;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);
    
    const spreads = opportunityState.opportunities.map(o => o.maxSpread);
    const avgMaxSpread = spreads.reduce((a,b) => a+b, 0) / spreads.length;
    const maxSpread = Math.max(...spreads);
    
    console.log(`   Avg opportunity duration: ${avgDuration.toFixed(1)}s`);
    console.log(`   Duration range: ${minDuration.toFixed(1)}s - ${maxDuration.toFixed(1)}s`);
    console.log(`   Avg max spread: ${avgMaxSpread.toFixed(3)}%`);
    console.log(`   Peak spread observed: ${maxSpread.toFixed(3)}%`);
  }
  
  console.log(`   ─────────────────────────────────────`);
  console.log(`   Data points collected: ${trainingData.length}`);
  console.log(`\n💡 The OLD methodology would have counted ~${totalTicks} opportunities!`);
  console.log(`   Now correctly showing ${opportunityState.opportunitiesFound} discrete events.`);
  
  // Save opportunities summary
  fs.writeFileSync("opportunities-summary.json", JSON.stringify(opportunityState.opportunities, null, 2));
  console.log(`\n💾 Saved opportunities summary to opportunities-summary.json`);
  
  process.exit(0);
});

collectData();
