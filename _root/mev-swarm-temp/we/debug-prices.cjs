const { ethers } = require("ethers");

// Use Chainstack RPC (the paid one) or fallback to public RPC
const rpcUrl = process.env.ETHEREUM_RPC_URL || process.env.BASE_RPC_URL || 'https://base-rpc.publicnode.com';
console.log('Using RPC:', rpcUrl.substring(0, 40) + '...');
const provider = new ethers.JsonRpcProvider(rpcUrl);

const WETH  = "0x4200000000000000000000000000000000000006";
const USDC  = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

const UNI_V3_POOL = "0xd0b53D9277642d899DF5C87A3966A349A798F224";
const AERO_POOL   = "0xcDAC0d6c6C59727a65F871236188350531885C43";

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

    const sqrtPrice = Number(slot0.sqrtPriceX96);
    const price = (sqrtPrice / 2**96) ** 2;
    console.log("  raw price (token1/token0):", price);

    if (token0.toLowerCase() === USDC.toLowerCase()) {
      const ethPerUsdc = price * 10**(6-18);
      console.log("  ETH per USDC:", ethPerUsdc);
      console.log("  USDC per ETH:", 1/ethPerUsdc);
    } else {
      const usdcPerEth = price * 10**(18-6);
      console.log("  USDC per ETH:", usdcPerEth);
      console.log("  ETH per USDC:", 1/usdcPerEth);
      }
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
        const r0 = Number(ethers.formatUnits(reserves[0], 18));
        const r1 = Number(ethers.formatUnits(reserves[1], 6));
        console.log("  WETH reserve:", r0);
        console.log("  USDC reserve:", r1);
        console.log("  USDC per ETH:", r1/r0);
      } else {
        const r0 = Number(ethers.formatUnits(reserves[0], 6));
        const r1 = Number(ethers.formatUnits(reserves[1], 18));
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
  main().catch(console.error);
