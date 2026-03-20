import Etherscan from "./index.js";
import thresholds from "../thresholds.js";
import fs from "fs";

const POLL_MS = 45000; // 45s cadence

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function parseGasPrice(data) {
  if (!data) return null;
  // Handle V2 gasoracle response (object with FastGasPrice, SafeGasPrice, ProposeGasPrice)
  if (typeof data === 'object' && !Array.isArray(data)) {
    // Use FastGasPrice as the primary gas price indicator
    return parseFloat(data.FastGasPrice || data.SafeGasPrice || data.ProposeGasPrice || 0);
  }
  // Handle array response (dailyavggasprice returns array)
  if (Array.isArray(data) && data.length > 0) {
    const latest = data[0];
    return parseFloat(latest.gasPrice || latest.average || latest.value || 0);
  }
  // Handle string/number response
  if (typeof data === "string") return parseFloat(data);
  if (typeof data === "number") return data;
  return null;
}

async function adaptOnce() {
  const gasData = await Etherscan.gas.getDailyAvgGasPrice();
  const blockTimeData = await Etherscan.stats.getDailyBlockTime();

  const avgGasGwei = parseGasPrice(gasData);

  // Adapt min profit after gas based on gas price
  if (avgGasGwei && avgGasGwei > 0) {
    const gasFactor = clamp(avgGasGwei / 50, 0.5, 3); // baseline 50 gwei
    const newMinProfit = Math.round((5 * gasFactor) * 100) / 100;
    thresholds.MIN_PROFIT_AFTER_GAS_USD = newMinProfit;
    console.log(`[Etherscan] Gas factor: ${gasFactor.toFixed(2)}x, min profit: $${newMinProfit}`);
  }

  // Adapt simulation timeout based on block time
  let avgBlockTime = 12;
  if (blockTimeData && Array.isArray(blockTimeData) && blockTimeData.length > 0) {
    avgBlockTime = parseFloat(blockTimeData[0].average || blockTimeData[0].time || 12);
  } else if (blockTimeData && typeof blockTimeData === "string") {
    avgBlockTime = parseFloat(blockTimeData);
  }

  // Block time affects simulation timeout (longer blocks = more time)
  const timeoutFactor = clamp(avgBlockTime / 12, 0.8, 1.5);
  // Note: We can't directly modify simulation timeout as it's not in the thresholds object
  // This would need to be added to thresholds.js

  // Persist snapshot
  try {
    fs.writeFileSync("./mev-swarm/etherscan/thresholds-snapshot.json", JSON.stringify({
      ts: Date.now(),
      gasGwei: avgGasGwei,
      blockTime: avgBlockTime,
      thresholds: {
        MIN_PRICE_IMPACT_PERCENT: thresholds.MIN_PRICE_IMPACT_PERCENT,
        MIN_ARBITRAGE_DELTA_PERCENT: thresholds.MIN_ARBITRAGE_DELTA_PERCENT,
        MIN_PROFIT_BEFORE_GAS_USD: thresholds.MIN_PROFIT_BEFORE_GAS_USD,
        MIN_PROFIT_AFTER_GAS_USD: thresholds.MIN_PROFIT_AFTER_GAS_USD,
        MIN_SWAP_SIZE_USD: thresholds.MIN_SWAP_SIZE_USD,
        MIN_LIQUIDITY_USD: thresholds.MIN_LIQUIDITY_USD
      }
    }, null, 2));
  } catch (e) {
    // ignore persistence errors
  }

  console.log("[Etherscan] Adaptive tick:", { avgGasGwei: avgGasGwei?.toFixed(2), avgBlockTime: avgBlockTime?.toFixed(2) });
}

export function startAdaptiveLoop() {
  console.log("[Etherscan] Starting adaptive threshold loop (45s cadence)");
  adaptOnce();
  setInterval(adaptOnce, POLL_MS);
}