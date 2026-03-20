import { callEtherscan } from "./client.js";

// V2 API uses gastracker module with gasoracle action
export async function getGasOracle() {
  return await callEtherscan({ module: "gastracker", action: "gasoracle" });
}

// Keep for backwards compatibility, now uses gasoracle
export async function getDailyAvgGasPrice() {
  return await getGasOracle();
}

export async function getDailyGasUsed() {
  // V2 doesn't have dailygasused, use gasoracle result
  const result = await getGasOracle();
  return result?.gasUsedRatio || null;
}