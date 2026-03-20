const { ethers } = require("ethers");

const provider = new ethers.JsonRpcProvider("https://base-rpc.publicnode.com");

const WETH  = "0x4200000000000000000000000000000000000006";
const USDC  = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Your two main pools
const UNI_V3_POOL = "0xd0b53D9277642d899DF5C87A3966A349A798F224";  // 0.05% fee
const AERO_POOL   = "0xcDAC0d6c6C59727a65F871236188350531885C43";  // volatile

async function main() {
  console.log("=== TEST 1: Uniswap V3 Pool ===");
  try {
    const uniPool = new ethers.Contract(UNI_V3_POOL, [
      "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
      "function token0() view returns (address)",
      "function token1() view returns (address)",
      "function liquidity() view returns (uint128)"
    ], provider);

    const token0 = await uniPool.token0();
    const token1 = await uniPool.token1();
    console.log("  token0:", token0);
    console.log("  token1:", token1);
    console.log("  token0 is WETH:", token0.toLowerCase() === WETH.toLowerCase());
    console.log("  token0 is USDC:", token0.toLowerCase() === USDC.toLowerCase());

    const slot0 = await uniPool.slot0();
    console.log("  sqrtPriceX96:", slot0.sqrtPriceX96.toString());
    console.log("  tick:", slot0.tick.toString());

    const liq = await uniPool.liquidity();
    console.log("  liquidity:", liq.toString());

    // Calculate price using CORRECT BigInt formula from pool-watcher.js
    const sqrtPriceX96 = slot0.sqrtPriceX96;
    const Q96 = 1n << 96n;
    
    // sqrtPriceX96 is Q96.96 fixed point - always gives token1/token0
    const numerator = sqrtPriceX96 * sqrtPriceX96;
    const denominator = 1n << 192n;
    
    // ratio scaled by 1e18
    const ratio = (numerator * 10n ** 18n) / denominator;
    
    // USDC has 6 decimals, WETH has 18
    const decimals0 = 6;  // Assuming USDC is token0
    const decimals1 = 18; // Assuming WETH is token1
    const decimalDiff = BigInt(decimals0) - BigInt(decimals1);
    
    let adjusted;
    if (decimalDiff >= 0n) {
      adjusted = ratio * 10n ** decimalDiff;
    } else {
      adjusted = ratio / 10n ** (-decimalDiff);
    }
    
    const price1Per0 = Number(adjusted) / 1e18;
    console.log("  raw price (token1/token0):", price1Per0);
    
    // If token0 = USDC, token1 = WETH
    // price1Per0 = WETH/USDC
    // We want USDC/WETH = 1/price1Per0
    const usdcPerEth = 1 / price1Per0;
    console.log("  USDC per ETH:", usdcPerEth);
    console.log("  ✅ UniV3 works!\n");
  } catch (e) {
    console.log("  ❌ FAILED:", e.message, "\n");
  }

  console.log("=== TEST 2: Aerodrome Pool ===");
  try {
    const aeroPool = new ethers.Contract(AERO_POOL, [
      "function getReserves() view returns (uint256, uint256, uint256)",
      "function token0() view returns (address)",
      "function token1() view returns (address)"
    ], provider);

    const token0 = await aeroPool.token0();
    const token1 = await aeroPool.token1();
    console.log("  token0:", token0);
    console.log("  token1:", token1);
    console.log("  token0 is WETH:", token0.toLowerCase() === WETH.toLowerCase());
    console.log("  token0 is USDC:", token0.toLowerCase() === USDC.toLowerCase());

    const reserves = await aeroPool.getReserves();
    console.log("  reserve0:", reserves[0].toString());
    console.log("  reserve1:", reserves[1].toString());
    console.log("  timestamp:", reserves[2].toString());

    if (token0.toLowerCase() === WETH.toLowerCase()) {
      const r0 = Number(ethers.formatUnits(reserves[0], 18)); // WETH
      const r1 = Number(ethers.formatUnits(reserves[1], 6));  // USDC
      console.log("  WETH reserve:", r0);
      console.log("  USDC reserve:", r1);
      console.log("  USDC per ETH:", r1/r0);
    } else {
      const r0 = Number(ethers.formatUnits(reserves[0], 6));  // USDC
      const r1 = Number(ethers.formatUnits(reserves[1], 18)); // WETH
      console.log("  USDC reserve:", r0);
      console.log("  WETH reserve:", r1);
      console.log("  USDC per ETH:", r0/r1);
    }
    console.log("  ✅ Aerodrome works!\n");
  } catch (e) {
    console.log("  ❌ FAILED:", e.message, "\n");
  }

  console.log("=== TEST 3: Aerodrome alt ABI ===");
  try {
    // Some Aerodrome pools use uint112 like classic UniV2
    const aeroPool2 = new ethers.Contract(AERO_POOL, [
      "function getReserves() view returns (uint112, uint112, uint32)"
    ], provider);
    const reserves = await aeroPool2.getReserves();
    console.log("  reserve0:", reserves[0].toString());
    console.log("  reserve1:", reserves[1].toString());
    console.log("  ✅ Alt ABI works!\n");
  } catch (e) {
    console.log("  ❌ Alt ABI also failed:", e.message, "\n");
  }
}

main().catch(console.error);
