/**
 * Base Pool Discovery Script
 * Run: node discover-pools.js
 * 
 * Discovers pool addresses on Base for arbitrage opportunities
 */

const { ethers } = require("ethers");

// Free public Base RPC
const BASE_RPC_URL = "https://base-rpc.publicnode.com";
const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);

console.log("🔍 Connecting to Base mainnet...\n");

// ========== BASE TOKEN ADDRESSES ==========
const WETH  = "0x4200000000000000000000000000000000000006";
const USDC  = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const cbBTC = "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf";

// ========== FACTORY ADDRESSES ==========
const UNI_V3_FACTORY = "0x33128a8fC17869897dcE68Ed026d694621f6FDfD";
const AERODROME_FACTORY = "0x420DD381b31aEf6683db6B902084cB0FFECe40Da";

// ========== ABIs ==========
const uniV3FactoryAbi = [
  "function getPool(address,address,uint24) view returns (address)"
];

const aeroFactoryAbi = [
  "function getPool(address,address,bool) view returns (address)"
];

const erc20Abi = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)"
];

async function getTokenInfo(address) {
  try {
    const token = new ethers.Contract(address, erc20Abi, provider);
    const symbol = await token.symbol();
    const decimals = await token.decimals();
    return { symbol, decimals };
  } catch (e) {
    return { symbol: "UNKNOWN", decimals: 18 };
  }
}

async function checkPoolExists(address) {
  if (address === ethers.ZeroAddress) return false;
  try {
    const code = await provider.getCode(address);
    return code !== "0x";
  } catch {
    return false;
  }
}

async function main() {
  console.log("📡 Testing RPC connection...");
  const network = await provider.getNetwork();
  console.log(`✅ Connected to: Base (chainId: ${network.chainId})\n`);

  const uniV3Factory = new ethers.Contract(UNI_V3_FACTORY, uniV3FactoryAbi, provider);
  const aeroFactory = new ethers.Contract(AERODROME_FACTORY, aeroFactoryAbi, provider);

  // Get token info
  const wethInfo = await getTokenInfo(WETH);
  const usdcInfo = await getTokenInfo(USDC);
  const cbbtcInfo = await getTokenInfo(cbBTC);
  
  console.log("📊 Token Info:");
  console.log(`   WETH:  ${wethInfo.symbol} (${wethInfo.decimals} decimals)`);
  console.log(`   USDC:  ${usdcInfo.symbol} (${usdcInfo.decimals} decimals)`);
  console.log(`   cbBTC: ${cbbtcInfo.symbol} (${cbbtcInfo.decimals} decimals)\n`);

  console.log("🏊 Discovering pools...\n");

  // ========== UNISWAP V3 POOLS ==========
  console.log("--- Uniswap V3 Pools ---");
  const feeTiers = [100, 500, 3000, 10000];
  
  // WETH/USDC
  for (const fee of feeTiers) {
    const pool = await uniV3Factory.getPool(WETH, USDC, fee);
    if (await checkPoolExists(pool)) {
      console.log(`✅ UniV3 WETH/USDC (fee ${fee/10000}%): ${pool}`);
    }
  }

  // WETH/cbBTC
  for (const fee of feeTiers) {
    const pool = await uniV3Factory.getPool(WETH, cbBTC, fee);
    if (await checkPoolExists(pool)) {
      console.log(`✅ UniV3 WETH/cbBTC (fee ${fee/10000}%): ${pool}`);
    }
  }

  // USDC/cbBTC
  for (const fee of feeTiers) {
    const pool = await uniV3Factory.getPool(USDC, cbBTC, fee);
    if (await checkPoolExists(pool)) {
      console.log(`✅ UniV3 USDC/cbBTC (fee ${fee/10000}%): ${pool}`);
    }
  }

  console.log("\n--- Aerodrome V2 Pools ---");

  // Aerodrome: false = volatile, true = stable
  const stableOptions = [false, true];

  // WETH/USDC
  for (const stable of stableOptions) {
    const pool = await aeroFactory.getPool(WETH, USDC, stable);
    if (await checkPoolExists(pool)) {
      console.log(`✅ Aerodrome WETH/USDC (${stable ? "stable" : "volatile"}): ${pool}`);
    }
  }

  // WETH/cbBTC
  for (const stable of stableOptions) {
    const pool = await aeroFactory.getPool(WETH, cbBTC, stable);
    if (await checkPoolExists(pool)) {
      console.log(`✅ Aerodrome WETH/cbBTC (${stable ? "stable" : "volatile"}): ${pool}`);
    }
  }

  // USDC/cbBTC
  for (const stable of stableOptions) {
    const pool = await aeroFactory.getPool(USDC, cbBTC, stable);
    if (await checkPoolExists(pool)) {
      console.log(`✅ Aerodrome USDC/cbBTC (${stable ? "stable" : "volatile"}): ${pool}`);
    }
  }

  console.log("\n🎉 Discovery complete!");
  console.log("\n📝 Next steps:");
  console.log("1. Copy the pool addresses above");
  console.log("2. Verify token0/token1 order for each pool");
  console.log("3. Update simple-launcher.js with Base config");
}

main().catch(console.error);
