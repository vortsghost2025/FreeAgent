# REMOVED: sensitive data redacted by automated security cleanup
const { ethers } = require("ethers");

const provider = new ethers.JsonRpcProvider("https://base-rpc.publicnode.com");

const UNI_V3_POOL = "REDACTED_ADDRESS";

async function main() {
  const uniPool = new ethers.Contract(UNI_V3_POOL, [
    "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
    "function token0() view returns (address)",
    "function token1() view returns (address)"
  ], provider);

  const [token0, token1, slot0] = await Promise.all([
    uniPool.token0(),
    uniPool.token1(),
    uniPool.slot0()
  ]);

  console.log("token0:", token0);
  console.log("token1:", token1);
  console.log("tick:", slot0.tick.toString());
  console.log("sqrtPriceX96:", slot0.sqrtPriceX96.toString());

  const tick = Number(slot0.tick);
  
  // Test: use tick formula
  const rawPrice = Math.pow(1.0001, tick);
  console.log("\nrawPrice (1.0001^tick):", rawPrice);
  
  // For WETH (18 decimals) / USDC (6 decimals)
  // We want USDC per WETH
  // rawPrice = USDC_wei / WETH_wei
  // USDC_per_WETH = (USDC_wei / 1e6) / (WETH_wei / 1e18)
  //              = rawPrice * 1e12
  const decimalAdjustment = Math.pow(10, 18 - 6);
  const price = rawPrice * decimalAdjustment;
  
  console.log("decimalAdjustment (10^12):", decimalAdjustment);
  console.log("USDC per ETH:", price);
  console.log("ETH per USDC:", 1/price);
}

main();
