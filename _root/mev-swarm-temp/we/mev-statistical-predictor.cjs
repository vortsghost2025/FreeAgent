// mev-statistical-predictor.cjs - Phase 2b: Simple statistical ML predictor
// Uses basic statistics and pattern recognition (no TensorFlow needed!)
// This is faster to run and doesn't require ML libraries

const fs = require("fs");

const DATA_FILE = "mev-training-data.json";
const MIN_DATA_POINTS = 50;
const PREDICTION_WINDOW = 5; // Predict 5 seconds ahead

// Simple Moving Average
function sma(arr, window) {
  if (arr.length < window) return null;
  const slice = arr.slice(-window);
  return slice.reduce((a, b) => a + b, 0) / window;
}

// Exponential Moving Average
function ema(arr, window) {
  if (arr.length < window) return null;
  const k = 2 / (window + 1);
  let emaVal = arr[0];
  for (let i = 1; i < arr.length; i++) {
    emaVal = arr[i] * k + emaVal * (1 - k);
  }
  return emaVal;
}

// Calculate price momentum (rate of change)
function momentum(arr, period = 3) {
  if (arr.length < period + 1) return 0;
  const current = arr[arr.length - 1];
  const past = arr[arr.length - period - 1];
  return (current - past) / past;
}

// Calculate volatility (standard deviation)
function volatility(arr, window = 10) {
  if (arr.length < window) return 0;
  const slice = arr.slice(-window);
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const squaredDiffs = slice.map(x => Math.pow(x - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / slice.length);
}

// Simple linear regression for trend
function linearTrend(arr, window = 5) {
  if (arr.length < window) return 0;
  const slice = arr.slice(-window);
  const n = slice.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += slice[i];
    sumXY += i * slice[i];
    sumX2 += i * i;
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return slope;
}

// Load and analyze data
function analyzePatterns(data) {
  console.log("\n📊 Analyzing patterns in training data...\n");
  
  // Extract time series for each pool
  const uniV3_005 = data.map(d => d.uniV3_005_price).filter(p => p > 0);
  const uniV3_030 = data.map(d => d.uniV3_030_price).filter(p => p > 0);
  const aero = data.map(d => d.aero_price).filter(p => p > 0);
  const spreads = data.map(d => d.spreadPercent).filter(s => s > 0);
  const profits = data.map(d => d.profitEstimate);
  
  console.log(`Data points: ${data.length}`);
  console.log(`Price range: $${Math.min(...uniV3_005).toFixed(0)} - $${Math.max(...uniV3_005).toFixed(0)}`);
  console.log(`Spread range: ${Math.min(...spreads).toFixed(3)}% - ${Math.max(...spreads).toFixed(3)}%`);
  
  // Find opportunities
  const opportunities = data.filter(d => d.isOpportunity);
  console.log(`\n🎯 Opportunities found: ${opportunities.length} (${((opportunities.length/data.length)*100).toFixed(1)}%)`);
  
  // Analyze what happens BEFORE opportunities
  if (opportunities.length > 0) {
    console.log("\n🔍 Pre-opportunity patterns:");
    
    // Get indices of opportunities
    const oppIndices = data.map((d, i) => d.isOpportunity ? i : -1).filter(i => i >= 0);
    
    // Look at patterns before each opportunity
    let momentumSum = 0, volatilitySum = 0, trendSum = 0;
    let count = 0;
    
    for (const idx of oppIndices) {
      if (idx < 3) continue; // Need at least 3 data points before
      
      const recentSpreads = spreads.slice(Math.max(0, idx - 5), idx);
      if (recentSpreads.length >= 3) {
        momentumSum += momentum(recentSpreads, 2);
        volatilitySum += volatility(recentSpreads, 3);
        trendSum += linearTrend(recentSpreads, 3);
        count++;
      }
    }
    
    if (count > 0) {
      console.log(`   Avg momentum before opportunity: ${(momentumSum/count * 100).toFixed(3)}%`);
      console.log(`   Avg volatility before opportunity: ${(volatilitySum/count * 100).toFixed(3)}%`);
      console.log(`   Avg trend before opportunity: ${(trendSum/count * 100).toFixed(3)}%`);
    }
  }
  
  // Analyze what happens when NO opportunity
  const noOpp = data.filter(d => !d.isOpportunity);
  if (noOpp.length > 0) {
    const noOppSpreads = noOpp.map(d => d.spreadPercent);
    const avgNoOpp = noOppSpreads.reduce((a,b)=>a+b,0)/noOppSpreads.length;
    console.log(`\n📉 When NO opportunity:`);
    console.log(`   Avg spread: ${avgNoOpp.toFixed(3)}%`);
  }
  
  return {
    uniV3_005,
    uniV3_030,
    aero,
    spreads,
    profits,
    opportunities
  };
}

// Build a simple rule-based predictor
function buildRulePredictor(data) {
  console.log("\n🏗️  Building rule-based predictor...\n");
  
  // Calculate thresholds from data
  const spreads = data.map(d => d.spreadPercent).filter(s => s > 0);
  const avgSpread = spreads.reduce((a, b) => a + b, 0) / spreads.length;
  const maxSpread = Math.max(...spreads);
  const minOppSpread = Math.min(...data.filter(d => d.isOpportunity).map(d => d.spreadPercent));
  
  console.log(`   Average spread: ${avgSpread.toFixed(3)}%`);
  console.log(`   Max spread: ${maxSpread.toFixed(3)}%`);
  console.log(`   Min opportunity spread: ${minOppSpread.toFixed(3)}%`);
  
  // Build simple rules
  const rules = {
    // Rule 1: If spread is increasing rapidly, opportunity likely
    spreadMomentumThreshold: 0.02, // 0.02% increase per tick
    
    // Rule 2: If spread > threshold, likely opportunity
    spreadThreshold: minOppSpread * 0.8, // 80% of min opportunity spread
    
    // Rule 3: If spread is BELOW average but rising, prepare
    prepareThreshold: avgSpread * 1.2,
    
    // Rule 4: Momentum indicator
    momentumLookback: 3
  };
  
  console.log(`\n📋 Prediction Rules:`);
  console.log(`   1. If spread rising by >${rules.spreadMomentumThreshold}%/tick -> HIGH probability`);
  console.log(`   2. If spread > ${rules.spreadThreshold.toFixed(3)}% -> Medium probability`);
  console.log(`   3. If spread > ${rules.prepareThreshold.toFixed(3)}% -> Low probability`);
  
  return rules;
}

// Make prediction based on recent data
function predict(rules, recentData) {
  if (recentData.length < 3) return { probability: 0, confidence: "low", reason: "insufficient data" };
  
  const currentSpread = recentData[recentData.length - 1].spreadPercent;
  const prevSpread = recentData[recentData.length - 2].spreadPercent;
  const prevPrevSpread = recentData[recentData.length - 3].spreadPercent;
  
  // Calculate momentum
  const momentum = currentSpread - prevSpread;
  const avgMomentum = (momentum + (prevSpread - prevPrevSpread)) / 2;
  
  // Rule 1: Strong momentum
  if (momentum > rules.spreadMomentumThreshold * 2) {
    return {
      probability: 0.9,
      confidence: "high",
      reason: `Strong upward momentum: +${momentum.toFixed(3)}%`
    };
  }
  
  // Rule 2: Moderate momentum
  if (momentum > rules.spreadMomentumThreshold) {
    return {
      probability: 0.7,
      confidence: "medium",
      reason: `Moderate upward momentum: +${momentum.toFixed(3)}%`
    };
  }
  
  // Rule 3: Above threshold
  if (currentSpread > rules.spreadThreshold) {
    return {
      probability: 0.5,
      confidence: "medium",
      reason: `Spread above threshold: ${currentSpread.toFixed(3)}% > ${rules.spreadThreshold.toFixed(3)}%`
    };
  }
  
  // Rule 4: Near threshold
  if (currentSpread > rules.prepareThreshold) {
    return {
      probability: 0.3,
      confidence: "low",
      reason: `Near threshold: ${currentSpread.toFixed(3)}%`
    };
  }
  
  // Default: low probability
  return {
    probability: 0.1,
    confidence: "high",
    reason: `Normal conditions: ${currentSpread.toFixed(3)}%`
  };
}

// Main
async function main() {
  console.log("=".repeat(60));
  console.log("🎯 MEV Statistical Predictor - Phase 2b");
  console.log("=".repeat(60));
  console.log("\nNo ML libraries required - pure JavaScript!");
  
  // Load data
  let data;
  try {
    data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (e) {
    console.log(`\n❌ No data found: ${DATA_FILE}`);
    console.log("   Run: node mev-data-collector.cjs");
    process.exit(1);
  }
  
  if (data.length < MIN_DATA_POINTS) {
    console.log(`\n⚠️  Need ${MIN_DATA_POINTS} data points, have ${data.length}`);
    console.log("   Keep the data collector running!\n");
    process.exit(0);
  }
  
  console.log(`\n✅ Loaded ${data.length} data points`);
  
  // Analyze patterns
  const stats = analyzePatterns(data);
  
  // Build predictor
  const rules = buildRulePredictor(data);
  
  // Test on recent data
  console.log("\n🧪 Testing predictor on recent data...\n");
  
  const recentData = data.slice(-20);
  for (let i = 5; i < recentData.length; i++) {
    const window = recentData.slice(0, i + 1);
    const prediction = predict(rules, window);
    const actual = recentData[i].isOpportunity;
    const correct = (prediction.probability > 0.5) === actual;
    
    console.log(`#${i} | Spread: ${window[window.length-1].spreadPercent.toFixed(3)}% | ` +
      `Pred: ${(prediction.probability*100).toFixed(0)}% (${prediction.confidence}) | ` +
      `Actual: ${actual ? 'YES' : 'NO'} | ${correct ? '✅' : '❌'}`);
  }
  
  console.log("\n📊 Prediction Rules Summary:");
  console.log("   The predictor uses 4 simple rules based on spread momentum and thresholds.");
  console.log("   It's fast, interpretable, and works without ML libraries!\n");
}

main().catch(console.error);
