# REMOVED: sensitive data redacted by automated security cleanup
/**
 * Base Arbitrage Launcher
 * 
 * Optimized for Base where gas is cheap (~0.005-0.02 per swap)
 */

const { ethers } = require("ethers");

// ========== CONFIG ==========
const CONFIG = {
  // Your Ethereum private key (without 0x prefix)
  PRIVATE_KEY: "REDACTED_HEX_64",
  
  // Trading params for Base
  TRADE_ETH: "0.02",        // ~$50 per trade
  MIN_SPREAD_PCT: 0.03,     // 0.03% - viable on Base
  CYCLE_INTERVAL_MS: 2000,  // 2 seconds
  GAS_COST_USD: 0.01,       // ~$0.01 for two swaps on Base
};

// ========== POOL ADDRESSES (from discovery) ==========
const POOLS = {
  uniV3: { WETH_USDC: "REDACTED_ADDRESS", fee: 500 },
  aero: { WETH_USDC: "REDACTED_ADDRESS" },
};

// ========== TOKEN ADDRESSES ==========
const WETH = "REDACTED_ADDRESS";
const USDC = "REDACTED_ADDRESS";

// ========== ABIs ==========
const poolV3Abi = ["function token0() view returns (address)", "function token1() view returns (address)", "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)"];
const poolV2Abi = ["function token0() view returns (address)", "function token1() view returns (address)", "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)"];
const erc20Abi = ["function decimals() view returns (uint8)"];

// ========== HELPERS ==========
function calculateV3Price(slot0, decimals0, decimals1) {
  const sqrtPriceX96 = slot0.sqrtPriceX96;
  const ratio = sqrtPriceX96 ** 2n / (2n ** 192n);
  const price = ratio * (10n ** BigInt(decimals0)) / (10n ** BigInt(decimals1));
  return Number(price);
}

function calculateV2Price(reserve0, reserve1, decimals0, decimals1) {
  const price = (reserve1 * (10n ** BigInt(decimals0))) / (reserve0 * (10n ** BigInt(decimals1)));
  return Number(price);
}

async function getPoolPrices(provider) {
  const prices = {};
  const errors = [];
  
  // Uniswap V3
  try {
    const uniPool = new ethers.Contract(POOLS.uniV3.WETH_USDC, poolV3Abi, provider);
    const [token0Addr, token1Addr, slot0] = await Promise.all([
      uniPool.token0(), uniPool.token1(), uniPool.slot0()
    ]);
    
    const wethContract = new ethers.Contract(WETH, erc20Abi, provider);
    const usdcContract = new ethers.Contract(USDC, erc20Abi, provider);
    const [wethDec, usdcDec] = await Promise.all([wethContract.decimals(), usdcContract.decimals()]);
    
    const isWethToken0 = token0Addr.toLowerCase() === WETH.toLowerCase();
    const decimals0 = isWethToken0 ? wethDec : usdcDec;
    const decimals1 = isWethToken0 ? usdcDec : wethDec;
    
    prices.uniswapV3 = calculateV3Price(slot0, decimals0, decimals1);
  } catch (e) {
    errors.push(`UniV3: ${e.message}`);
  }
  
  // Aerodrome V2
  try {
    const aeroPool = new ethers.Contract(POOLS.aero.WETH_USDC, poolV2Abi, provider);
    const [token0Addr, token1Addr, reserves] = await Promise.all([
      aeroPool.token0(), aeroPool.token1(), aeroPool.getReserves()
    ]);
    
    const isWethToken0 = token0Addr.toLowerCase() === WETH.toLowerCase();
    
    if (isWethToken0) {
      prices.aerodrome = calculateV2Price(reserves.reserve0, reserves.reserve1, 18, 6);
    } else {
      prices.aerodrome = calculateV2Price(reserves.reserve1, reserves.reserve0, 18, 6);
    }
  } catch (e) {
    errors.push(`Aerodrome: ${e.message}`);
  }
  
  if (errors.length > 0) {
    console.log("⚠️  Errors:", errors.join("; "));
  }
  
  return prices;
}

async function main() {
  console.log("🚀 Base Arbitrage Bot Starting...\n");
  console.log(`💰 Trade size: ${CONFIG.TRADE_ETH} ETH`);
  console.log(`📊 Min spread: ${CONFIG.MIN_SPREAD_PCT * 100}%`);
  
  // Try multiple RPCs
  const rpcUrls = [
    "https://base-mainnet.public.blastapi.io",
    "https://base-rpc.publicnode.com", 
    "https://1rpc.io/base",
    "https://base.drpc.org"
  ];
  
  let provider = null;
  for (const url of rpcUrls) {
    try {
      console.log(`📡 Trying RPC: ${url.substring(0, 30)}...`);
      provider = new ethers.JsonRpcProvider(url, { name: 'base', chainId: 8453 });
      await provider.getBlockNumber();
      console.log(`✅ Connected!\n`);
      break;
    } catch (e) {
      console.log(`❌ Failed: ${e.message.substring(0, 50)}`);
    }
  }
  
  if (!provider) {
    console.log("\n⚠️  Could not connect to any Base RPC.");
    console.log("To run on Base, you need:");
    console.log("1. Get a free Alchemy/Chainstack Base RPC at https://alchemy.com{