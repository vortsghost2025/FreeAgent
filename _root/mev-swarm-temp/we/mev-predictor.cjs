# REMOVED: sensitive data redacted by automated security cleanup
// mev-predictor.cjs - Phase 2: ML-powered opportunity prediction
// Uses TensorFlow.js to predict when arbitrage opportunities will appear
// Can leverage GPU via WebGL for fast inference

const fs = require("fs");
const path = require("path");

// Check for TensorFlow.js with GPU support
let tf;
try {
  // Try GPU version first
  tf = require("@tensorflow/tfjs-node-gpu");
  console.log("🎮 Using TensorFlow.js with GPU acceleration!");
} catch (e) {
  try {
    // Try regular CPU version
    tf = require("@tensorflow/tfjs");
    console.log("⚙️  Using TensorFlow.js (CPU mode)");
  } catch (e2) {
    console.log("❌ TensorFlow.js not installed. Installing...");
    console.log("   npm install @tensorflow/tfjs");
    process.exit(1);
  }
}

const DATA_FILE = "mev-training-data.json";
const MODEL_DIR = "./mev-predictor-model";
const MIN_DATA_POINTS = 100; // Minimum data needed to train
const PREDICTION_WINDOW = 5; // Predict 5 seconds ahead
const MIN_PROFIT_THRESHOLD = 0.01;

// Feature columns from our data collector
const FEATURE_COLUMNS = [
  "uniV3_005_price",
  "uniV3_030_price", 
  "aero_price",
  "spread",
  "spreadPercent"
];

// Load training data
function loadTrainingData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      console.log(`❌ No training data found: ${DATA_FILE}`);
      console.log("   Run mev-data-collector.cjs first to collect data");
      return null;
    }
    
    const rawData = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    console.log(`📂 Loaded ${rawData.length} data points from ${DATA_FILE}`);
    
    // Filter to only include opportunities (positive spreads)
    const opportunities = rawData.filter(d => d.isOpportunity);
    console.log(`🎯 Found ${opportunities.length} opportunities (${((opportunities.length/rawData.length)*100).toFixed(1)}%)`);
    
    return rawData;
  } catch (e) {
    console.log(`Error loading data: ${e.message}`);
    return null;
  }
}

// Prepare features and labels for ML
function prepareData(data) {
  console.log("\n🔧 Preparing features and labels...");
  
  // Normalize prices (divide by 2000 to get roughly 1.0 scale)
  const normalizeFactor = 2000;
  
  const features = [];
  const labels = [];
  
  for (let i = 0; i < data.length - PREDICTION_WINDOW; i++) {
    const current = data[i];
    const future = data[i + PREDICTION_WINDOW];
    
    if (!current || !future) continue;
    
    // Features: current state
    const feature = [
      current.uniV3_005_price / normalizeFactor,
      current.uniV3_030_price / normalizeFactor,
      current.aero_price / normalizeFactor,
      current.spread * 100, // Convert to percentage
      current.spreadPercent
    ];
    
    // Label: will there be an opportunity in PREDICTION_WINDOW seconds?
    const label = future.isOpportunity ? 1 : 0;
    
    features.push(feature);
    labels.push(label);
  }
  
  console.log(`✅ Prepared ${features.length} training samples`);
  
  // Print class distribution
  const positive = labels.filter(l => l === 1).length;
  const negative = labels.filter(l => l === 0).length;
  console.log(`   Class distribution: ${positive} positive, ${negative} negative`);
  
  return { features, labels };
}

// Build the neural network model
function buildModel() {
  console.log("\n🏗️  Building neural network...");
  
  const model = tf.sequential();
  
  // Input layer + Hidden layer 1
  model.add(tf.layers.dense({
    inputShape: [5], // 5 features
    units: 32,
    activation: 'relu',
    kernelInitializer: 'glorotNormal'
  }));
  
  // Dropout for regularization
  model.add(tf.layers.dropout({ rate: 0.2 }));
  
  // Hidden layer 2
  model.add(tf.layers.dense({
    units: 16,
    activation: 'relu'
  }));
  
  // Dropout
  model.add(tf.layers.dropout({ rate: 0.2 }));
  
  // Output layer (binary classification)
  model.add(tf.layers.dense({
    units: 1,
    activation: 'sigmoid'
  }));
  
  // Compile
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'binaryCrossentropy',
    metrics: ['accuracy', 'auc']
  });
  
  return model;
}

// Train the model
async function trainModel(model, features, labels) {
  console.log("\n⚡ Training model...");
  
  // Convert to tensors
  const xs = tf.tensor2d(features);
  const ys = tf.tensor2d(labels, [labels.length, 1]);
  
  // Train
  const startTime = Date.now();
  
  await model.fit(xs, ys, {
    epochs: 50,
    batchSize: 32,
    validationSplit: 0.2,
    shuffle: true,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        if ((epoch + 1) % 10 === 0) {
          console.log(`   Epoch ${epoch + 1}/50 - loss: ${logs.loss.toFixed(4)} - acc: ${logs.acc.toFixed(4)}`);
        }
      }
    }
  });
  
  const trainTime = Date.now() - startTime;
  console.log(`\n✅ Training complete in ${(trainTime/1000).toFixed(1)}s`);
  
  // Cleanup
  xs.dispose();
  ys.dispose();
  
  return model;
}

// Evaluate model performance
async function evaluateModel(model, features, labels) {
  console.log("\n📊 Evaluating model...");
  
  const xs = tf.tensor2d(features);
  const ys = tf.tensor2d(labels, [labels.length, 1]);
  
  const eval = await model.evaluate(xs, ys);
  
  console.log(`   Loss: ${eval[0].dataSync()[0].toFixed(4)}`);
  console.log(`   Accuracy: ${eval[1].dataSync()[0].toFixed(4)}`);
  console.log(`   AUC: ${eval[2].dataSync()[0].toFixed(4)}`);
  
  xs.dispose();
  ys.dispose();
  
  return eval;
}

// Make a prediction
async function predict(model, currentPrices) {
  const normalizeFactor = 2000;
  
  const feature = [
    currentPrices.uniV3_005_price / normalizeFactor,
    currentPrices.uniV3_030_price / normalizeFactor,
    currentPrices.aero_price / normalizeFactor,
    currentPrices.spread * 100,
    currentPrices.spreadPercent
  ];
  
  const xs = tf.tensor2d([feature]);
  const prediction = model.predict(xs);
  const probability = prediction.dataSync()[0];
  
  xs.dispose();
  prediction.dispose();
  
  return probability;
}

// Save model
async function saveModel(model) {
  console.log("\n💾 Saving model...");
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(MODEL_DIR)) {
    fs.mkdirSync(MODEL_DIR, { recursive: true });
  }
  
  await model.save(`file://${MODEL_DIR}`);
  console.log(`✅ Model saved to ${MODEL_DIR}`);
}

// Load model
async function loadModel() {
  try {
    const model = await tf.loadLayersModel(`file://${MODEL_DIR}/model.json`);
    console.log(`✅ Loaded model from ${MODEL_DIR}`);
    return model;
  } catch (e) {
    console.log("❌ No saved model found");
    return null;
  }
}

// Real-time prediction loop
async function runPredictionLoop(model) {
  const { ethers } = require("ethers");
  
  const RPC_URL = process.env.BASE_RPC_URL || "https://base-rpc.publicnode.com";
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  
  // Pool addresses (same as data collector)
  const POOLS = [
    { name: "UniV3-0.05%", addr: "REDACTED_ADDRESS", protocol: "uniswap", fee: 500 },
    { name: "UniV3-0.3%", addr: "REDACTED_ADDRESS", protocol: "uniswap", fee: 3000 },
    { name: "Aero-vol", addr: "REDACTED_ADDRESS", protocol: "v2" }
  ];
  
  // Price fetching functions
  async function getV3Price(poolAddr) {
    const c = new ethers.Contract(poolAddr, [
      "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)"
    ], provider);
    const s = await c.slot0();
    const sqrtPrice = Number(s[0]) / (2 ** 96);
    return (sqrtPrice * sqrtPrice) * (10 ** 12);
  }
  
  async function getAerodromePrice(poolAddr) {
    const c = new ethers.Contract(poolAddr, [
      "function getReserves() view returns (uint256 reserve0, uint256 reserve1, uint256 blockTimestampLast)"
    ], provider);
    const r = await c.getReserves();
    return Number(ethers.formatUnits(r[1], 6)) / Number(ethers.formatEther(r[0]));
  }
  
  async function getPrice(pool) {
    try {
      if (pool.protocol === "uniswap") return await getV3Price(pool.addr);
      else return await getAerodromePrice(pool.addr);
    } catch (e) { return 0; }
  }
  
  console.log("\n🎯 Starting real-time prediction loop...");
  console.log("Press Ctrl+C to stop\n");
  
  let iteration = 0;
  
  while (true) {
    iteration++;
    
    try {
      // Fetch current prices
      const results = await Promise.all(POOLS.map(async p => ({ ...p, price: await getPrice(p) })));
      const valid = results.filter(r => r.price > 100 && r.price < 10000);
      
      if (valid.length < 2) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      
      const uniV3_005 = results.find(r => r.name === "UniV3-0.05%")?.price || 0;
      const uniV3_030 = results.find(r => r.name === "UniV3-0.3%")?.price || 0;
      const aero = results.find(r => r.name === "Aero-vol")?.price || 0;
      
      const minPrice = Math.min(uniV3_005, uniV3_030, aero);
      const maxPrice = Math.max(uniV3_005, uniV3_030, aero);
      const spread = (maxPrice - minPrice) / minPrice;
      
      // Make prediction
      const probability = await predict(model, {
        uniV3_005_price: uniV3_005,
        uniV3_030_price: uniV3_030,
        aero_price: aero,
        spread: spread,
        spreadPercent: spread * 100
      });
      
      const predStr = probability.toFixed(3);
      const spreadStr = (spread * 100).toFixed(3);
      const alert = probability > 0.7 ? "🔥🔥🔥 HIGH PROBABILITY!" : "";
      
      console.log(`#${iteration} | Prices: $${uniV3_005.toFixed(0)}/$${uniV3_030.toFixed(0)}/$${aero.toFixed(0)} | Spread: ${spreadStr}% | Prediction: ${predStr} ${alert}`);
      
    } catch (e) {
      console.log(`Error: ${e.message.slice(0, 50)}`);
    }
    
    await new Promise(r => setTimeout(r, 2000));
  }
}

// Main
async function main() {
  console.log("=".repeat(60));
  console.log("🎯 MEV PREDICTOR - Phase 2: ML Opportunity Prediction");
  console.log("=".repeat(60));
  
  // Check GPU
  console.log(`\nBackend: ${tf.getBackend()}`);
  
  const data = loadTrainingData();
  
  if (!data || data.length < MIN_DATA_POINTS) {
    console.log(`\n⚠️  Need at least ${MIN_DATA_POINTS} data points to train`);
    console.log(`   Current: ${data ? data.length : 0} points`);
    console.log("\n   Run: node mev-data-collector.cjs");
    console.log("   Let it collect data for at least 30 minutes\n");
    process.exit(0);
  }
  
  // Check for existing model
  let model = await loadModel();
  
  if (model) {
    console.log("\n✅ Using existing trained model");
  } else {
    // Prepare data
    const { features, labels } = prepareData(data);
    
    // Build and train
    model = buildModel();
    await trainModel(model, features, labels);
    
    // Evaluate
    await evaluateModel(model, features, labels);
    
    // Save
    await saveModel(model);
  }
  
  // Start prediction loop
  await runPredictionLoop(model);
}

main().catch(console.error);
