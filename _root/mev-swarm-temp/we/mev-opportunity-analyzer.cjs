// mev-opportunity-analyzer.cjs - Proper opportunity detection with state machine
// Fixes the overcounting issue by deduplicating opportunities based on state transitions

const fs = require("fs");

// ============ CONFIGURATION ============
const CSV_FILE = "mev-training-data.csv";
const OUTPUT_FILE = "mev-opportunity-analysis.json";

// Profitability thresholds (in decimal, e.g., 0.002 = 0.2%)
const PROFITABILITY_THRESHOLD = 0.001; // 0.1% - minimum spread to be worth trading
const HIGH_VALUE_THRESHOLD = 0.0025;    // 0.25% - worth investigating

// Realistic cost parameters (Base network)
const COSTS = {
  // Gas costs (in USD, Base ~$0.001-0.003 per trade)
  gasUSD: 0.002,
  
  // LP fees (one pool for buy, one for sell)
  // UniV3 0.05% = 0.0005, UniV3 0.3% = 0.003, Aero = ~0.0004
  lpFeeBuy: 0.0005,   // 0.05% for buying from cheap pool
  lpFeeSell: 0.003,   // 0.3% for selling to expensive pool (worst case)
  
  // Slippage (estimated based on trade size vs liquidity)
  slippage: 0.001,    // 0.1% slippage
  
  // MEV/protection (realistic sandwich resistance)
  mevProtection: 0.0005, // 0.05% expected MEV slippage
  
  // Total cost to trade
  get total() {
    return this.gasUSD + this.lpFeeBuy + this.lpFeeSell + this.slippage + this.mevProtection;
  }
};

// Trade size for profit calculation (in ETH)
const TRADE_SIZE_ETH = 0.0015;

// ============ STATE MACHINE ============
const STATE = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN'
};

// ============ DATA LOADING ============
function loadCSVData() {
  const data = fs.readFileSync(CSV_FILE, "utf8");
  const lines = data.trim().split("\n");
  
  // Skip header
  const header = lines[0];
  const rows = lines.slice(1);
  
  console.log(`📂 Loaded ${rows.length} data points from ${CSV_FILE}`);
  
  return rows.map(line => {
    const parts = line.split(",");
    return {
      timestamp: parseInt(parts[0]),
      uniV3_005_price: parseFloat(parts[1]),
      uniV3_030_price: parseFloat(parts[2]),
      aero_price: parseFloat(parts[3]),
      spreadPercent: parseFloat(parts[4]),
      profitEstimate: parseFloat(parts[5]),
      isOpportunity: parseInt(parts[6]) === 1
    };
  });
}

// ============ PROFIT CALCULATION ============
function calculateRealisticProfit(spreadPercent, tradeSizeETH = TRADE_SIZE_ETH, ethPrice = 2100) {
  // Spread profit (before costs)
  const grossProfit = spreadPercent * tradeSizeETH * ethPrice;
  
  // Net profit (after costs)
  const netProfit = grossProfit - COSTS.total;
  
  // ROI (return on trade size)
  const roi = netProfit / (tradeSizeETH * ethPrice);
  
  return {
    grossProfit: grossProfit,
    netProfit: netProfit,
    totalCost: COSTS.total,
    roi: roi,
    isProfitable: netProfit > 0
  };
}

// ============ STATE MACHINE OPPORTUNITY DETECTOR ============
function detectOpportunities(data) {
  const opportunities = [];
  let currentState = STATE.CLOSED;
  let currentOpportunity = null;
  
  console.log("\n🔍 Running state machine opportunity detection...");
  console.log(`   Threshold: ${PROFITABILITY_THRESHOLD * 100}%`);
  console.log(`   Total cost: ${(COSTS.total * 100).toFixed(2)}% (gas: $${COSTS.gasUSD}, LP fees: ${((COSTS.lpFeeBuy + COSTS.lpFeeSell) * 100).toFixed(1)}%, slippage: ${COSTS.slippage * 100}%)\n`);
  
  // Track statistics
  let rawTickCount = 0;
  let ticksAboveThreshold = 0;
  
  for (let i = 0; i < data.length; i++) {
    const tick = data[i];
    const spread = tick.spreadPercent / 100; // Convert to decimal
    
    rawTickCount++;
    
    // Check if above profitability threshold
    const isAboveThreshold = spread >= PROFITABILITY_THRESHOLD;
    
    if (isAboveThreshold) {
      ticksAboveThreshold++;
    }
    
    // State machine transitions
    if (currentState === STATE.CLOSED && isAboveThreshold) {
      // OPEN: Crossed above threshold - NEW opportunity starts
      currentState = STATE.OPEN;
      currentOpportunity = {
        id: opportunities.length + 1,
        startTime: tick.timestamp,
        endTime: null,
        startSpread: spread,
        maxSpread: spread,
        minSpread: spread,
        sumSpread: spread,
        tickCount: 1,
        dataPoints: [tick],
        isHighValue: spread >= HIGH_VALUE_THRESHOLD
      };
    } 
    else if (currentState === STATE.OPEN) {
      // Update statistics while OPEN
      currentOpportunity.maxSpread = Math.max(currentOpportunity.maxSpread, spread);
      currentOpportunity.minSpread = Math.min(currentOpportunity.minSpread, spread);
      currentOpportunity.sumSpread += spread;
      currentOpportunity.tickCount++;
      currentOpportunity.dataPoints.push(tick);
      
      if (spread >= HIGH_VALUE_THRESHOLD) {
        currentOpportunity.isHighValue = true;
      }
      
      // Check for CLOSE transition
      if (!isAboveThreshold) {
        // CLOSED: Dropped below threshold - opportunity ends
        currentState = STATE.CLOSED;
        currentOpportunity.endTime = tick.timestamp;
        currentOpportunity.duration = currentOpportunity.endTime - currentOpportunity.startTime;
        currentOpportunity.avgSpread = currentOpportunity.sumSpread / currentOpportunity.tickCount;
        
        // Calculate realistic profit metrics
        const profit = calculateRealisticProfit(currentOpportunity.maxSpread);
        currentOpportunity.grossProfit = profit.grossProfit;
        currentOpportunity.netProfit = profit.netProfit;
        currentOpportunity.isProfitable = profit.isProfitable;
        
        opportunities.push(currentOpportunity);
        currentOpportunity = null;
      }
    }
  }
  
  // Handle case where data ends while opportunity is still OPEN
  if (currentState === STATE.OPEN && currentOpportunity) {
    const lastTick = data[data.length - 1];
    currentOpportunity.endTime = lastTick.timestamp;
    currentOpportunity.duration = currentOpportunity.endTime - currentOpportunity.startTime;
    currentOpportunity.avgSpread = currentOpportunity.sumSpread / currentOpportunity.tickCount;
    
    const profit = calculateRealisticProfit(currentOpportunity.maxSpread);
    currentOpportunity.grossProfit = profit.grossProfit;
    currentOpportunity.netProfit = profit.netProfit;
    currentOpportunity.isProfitable = profit.isProfitable;
    
    opportunities.push(currentOpportunity);
  }
  
  console.log(`📊 Raw tick analysis:`);
  console.log(`   Total ticks: ${rawTickCount}`);
  console.log(`   Ticks above threshold: ${ticksAboveThreshold}`);
  console.log(`   (These were previously counted as ${ticksAboveThreshold} "opportunities")\n`);
  
  console.log(`✅ State machine result:`);
  console.log(`   Unique opportunities: ${opportunities.length}`);
  
  return opportunities;
}

// ============ STATISTICS GENERATION ============
function generateStatistics(opportunities) {
  if (opportunities.length === 0) {
    console.log("\n⚠️  No opportunities detected!");
    return null;
  }
  
  // Basic stats
  const durations = opportunities.map(o => o.duration);
  const maxSpreads = opportunities.map(o => o.maxSpread * 100);
  const avgSpreads = opportunities.map(o => o.avgSpread * 100);
  const tickCounts = opportunities.map(o => o.tickCount);
  const netProfits = opportunities.map(o => o.netProfit);
  const profitableCount = opportunities.filter(o => o.isProfitable).length;
  const highValueCount = opportunities.filter(o => o.isHighValue).length;
  
  // Calculate totals
  const totalDuration = durations.reduce((a, b) => a + b, 0);
  const totalTicks = tickCounts.reduce((a, b) => a + b, 0);
  const totalGrossProfit = opportunities.reduce((a, b) => a + (b.grossProfit || 0), 0);
  const totalNetProfit = opportunities.reduce((a, b) => a + (b.netProfit || 0), 0);
  
  // Average functions
  const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
  const min = arr => Math.min(...arr);
  const max = arr => Math.max(...arr);
  
  const stats = {
    summary: {
      totalDataPoints: opportunities[0]?.dataPoints?.length || 0,
      totalRawTicks: opportunities.reduce((a, b) => a + b.tickCount, 0),
      uniqueOpportunities: opportunities.length,
      oldMethodCount: opportunities.reduce((a, b) => a + b.tickCount, 0),
      overcountingFactor: (opportunities.reduce((a, b) => a + b.tickCount, 0) / opportunities.length).toFixed(1),
      
      // Before vs after
      oldMethodOpportunities: opportunities.reduce((a, b) => a + b.tickCount, 0),
      newMethodOpportunities: opportunities.length,
      
      // Profitability
      profitableOpportunities: profitableCount,
      unprofitableOpportunities: opportunities.length - profitableCount,
      profitPercentage: ((profitableCount / opportunities.length) * 100).toFixed(1),
      
      // High value opportunities
      highValueOpportunities: highValueCount,
      highValuePercentage: ((highValueCount / opportunities.length) * 100).toFixed(1)
    },
    
    timing: {
      totalDurationMs: totalDuration,
      totalDurationSeconds: (totalDuration / 1000).toFixed(1),
      avgDurationSeconds: (avg(durations) / 1000).toFixed(1),
      minDurationMs: min(durations),
      maxDurationMs: max(durations),
      avgTicksPerOpportunity: avg(tickCounts).toFixed(1),
      avgTimeBetweenOpportunitiesMs: opportunities.length > 1 
        ? (totalDuration / (opportunities.length - 1)).toFixed(0) 
        : 0
    },
    
    spreads: {
      avgMaxSpreadPercent: avg(maxSpreads).toFixed(3),
      minMaxSpreadPercent: min(maxSpreads).toFixed(3),
      maxMaxSpreadPercent: max(maxSpreads).toFixed(3),
      avgAvgSpreadPercent: avg(avgSpreads).toFixed(3)
    },
    
    profit: {
      avgGrossProfit: avg(opportunities.map(o => o.grossProfit || 0)).toFixed(4),
      totalGrossProfit: totalGrossProfit.toFixed(4),
      avgNetProfit: avg(netProfits).toFixed(4),
      totalNetProfit: totalNetProfit.toFixed(4),
      maxNetProfit: max(netProfits).toFixed(4),
      minNetProfit: min(netProfits).toFixed(4)
    },
    
    costBreakdown: {
      gasUSD: COSTS.gasUSD,
      lpFeeBuyPercent: COSTS.lpFeeBuy * 100,
      lpFeeSellPercent: COSTS.lpFeeSell * 100,
      slippagePercent: COSTS.slippage * 100,
      mevProtectionPercent: COSTS.mevProtection * 100,
      totalCostPercent: COSTS.total * 100,
      totalCostUSD: COSTS.total
    }
  };
  
  return stats;
}

// ============ PRINT RESULTS ============
function printResults(stats, opportunities) {
  console.log("\n" + "=".repeat(60));
  console.log("📊 OPPORTUNITY ANALYSIS RESULTS");
  console.log("=".repeat(60));
  
  console.log("\n🔴 OLD METHOD (misleading):");
  console.log(`   "Opportunities": ${stats.summary.oldMethodOpportunities}`);
  console.log(`   Avg time between: N/A (continuous state)`);
  
  console.log("\n🟢 NEW METHOD (stateful):");
  console.log(`   Unique opportunities: ${stats.summary.uniqueOpportunities}`);
  console.log(`   Overcounting factor: ${stats.summary.overcountingFactor}x`);
  
  console.log("\n📈 TIMING STATS:");
  console.log(`   Total collection time: ${stats.timing.totalDurationSeconds}s`);
  console.log(`   Avg opportunity duration: ${stats.timing.avgDurationSeconds}s`);
  console.log(`   Min duration: ${(stats.timing.minDurationMs / 1000).toFixed(1)}s`);
  console.log(`   Max duration: ${(stats.timing.maxDurationMs / 1000).toFixed(1)}s`);
  console.log(`   Avg ticks per opportunity: ${stats.timing.avgTicksPerOpportunity}`);
  
  console.log("\n📊 SPREAD STATS:");
  console.log(`   Avg max spread: ${stats.spreads.avgMaxSpreadPercent}%`);
  console.log(`   Min max spread: ${stats.spreads.minMaxSpreadPercent}%`);
  console.log(`   Max max spread: ${stats.spreads.maxMaxSpreadPercent}%`);
  console.log(`   Avg avg spread: ${stats.spreads.avgAvgSpreadPercent}%`);
  
  console.log("\n💰 PROFIT ANALYSIS (with realistic costs):");
  console.log(`   Gas: $${stats.costBreakdown.gasUSD}`);
  console.log(`   LP fees: ${stats.costBreakdown.lpFeeBuyPercent}% + ${stats.costBreakdown.lpFeeSellPercent}%`);
  console.log(`   Slippage: ${stats.costBreakdown.slippagePercent}%`);
  console.log(`   MEV protection: ${stats.costBreakdown.mevProtectionPercent}%`);
  console.log(`   Total cost: ${stats.costBreakdown.totalCostPercent.toFixed(2)}% ($${stats.costBreakdown.totalCostUSD})`);
  console.log(`   `);
  console.log(`   Profitable: ${stats.summary.profitableOpportunities} (${stats.summary.profitPercentage}%)`);
  console.log(`   Unprofitable: ${stats.summary.unprofitableOpportunities}`);
  console.log(`   `);
  console.log(`   Total gross profit: $${stats.profit.totalGrossProfit}`);
  console.log(`   Total NET profit: $${stats.profit.totalNetProfit}`);
  console.log(`   Avg net profit per opportunity: $${stats.profit.avgNetProfit}`);
  
  console.log("\n🔥 HIGH VALUE OPPORTUNITIES (>${HIGH_VALUE_THRESHOLD * 100}%):");
  console.log(`   Count: ${stats.summary.highValueOpportunities} (${stats.summary.highValuePercentage}%)`);
  
  // Show top opportunities
  const topOpps = [...opportunities]
    .filter(o => o.isHighValue)
    .sort((a, b) => b.maxSpread - a.maxSpread)
    .slice(0, 5);
    
  if (topOpps.length > 0) {
    console.log("\n   Top 5 opportunities:");
    topOpps.forEach((o, i) => {
      console.log(`   #${i + 1}: ${(o.maxSpread * 100).toFixed(3)}% spread, ` +
        `${(o.duration / 1000).toFixed(1)}s duration, ` +
        `net: $${o.netProfit?.toFixed(4) || 'N/A'}`);
    });
  }
  
  console.log("\n" + "=".repeat(60));
  
  // Interpretation
  console.log("\n💡 INTERPRETATION:");
  if (stats.summary.profitableOpportunities === 0) {
    console.log("   ⚠️  ALL opportunities are NEGATIVE EV after costs!");
    console.log("   This data shows persistent spreads that are already");
    console.log("   captured by other arbitrageurs. Not tradeable.");
  } else if (stats.summary.profitableOpportunities < opportunities.length * 0.5) {
    console.log("   ⚠️  Most opportunities are negative EV.");
    console.log("   Only the spikes (0.25%+) may be worth studying.");
  } else {
    console.log("   ✅ Significant portion are profitable.");
  }
  
  console.log("\n   The 0.05% UniV3 pool leads price.");
  console.log("   0.3% and Aero lag slightly.");
  console.log("   You're observing arb latency windows, not free money.");
}

// ============ MAIN ============
function main() {
  console.log("=".repeat(60));
  console.log("🎯 MEV OPPORTUNITY ANALYZER - State Machine Detection");
  console.log("=".repeat(60));
  
  // Load data
  const data = loadCSVData();
  
  // Detect opportunities with state machine
  const opportunities = detectOpportunities(data);
  
  // Generate statistics
  const stats = generateStatistics(opportunities);
  
  // Print results
  if (stats) {
    printResults(stats, opportunities);
    
    // Save results
    const output = {
      generatedAt: new Date().toISOString(),
      config: {
        profitabilityThreshold: PROFITABILITY_THRESHOLD,
        highValueThreshold: HIGH_VALUE_THRESHOLD,
        costs: COSTS,
        tradeSizeETH: TRADE_SIZE_ETH
      },
      statistics: stats,
      opportunities: opportunities.map(o => ({
        id: o.id,
        startTime: o.startTime,
        endTime: o.endTime,
        durationMs: o.duration,
        durationSeconds: (o.duration / 1000).toFixed(1),
        maxSpreadPercent: (o.maxSpread * 100).toFixed(3),
        avgSpreadPercent: (o.avgSpread * 100).toFixed(3),
        tickCount: o.tickCount,
        isHighValue: o.isHighValue,
        grossProfit: o.grossProfit?.toFixed(6),
        netProfit: o.netProfit?.toFixed(6),
        isProfitable: o.isProfitable
      }))
    };
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    console.log(`\n💾 Results saved to ${OUTPUT_FILE}`);
  }
  
  console.log("\n");
}

main();
// Duplicate block removed

