import { callEtherscan } from "./client.js";

// Note: V2 API doesn't have dailyavgblocktime/dailynetutilization
// These fallback to defaults in adaptive.js if they fail

export async function getDailyBlockTime() {
  // V2 doesn't have this endpoint - will fail gracefully
  return await callEtherscan({ module: "block", action: "dailyavgblocktime" });
}

export async function getNetworkUtilization() {
  // V2 doesn't have this endpoint - will fail gracefully  
  return await callEtherscan({ module: "stats", action: "dailynetutilization" });
}