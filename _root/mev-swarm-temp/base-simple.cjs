/**
 * Base Simple Launcher
 * Uses Base pool addresses (UniV3 + Aerodrome)
 * Gas is ~$0.001 per swap on Base!
 */

const { ethers } = require("ethers");
require("dotenv").config();

// ========== CONFIG ==========
const CONFIG = {
  rpcUrl: process.env.BASE_RPC_URL || process.env.ETHEREUM_RPC_URL,
  privateKey: process.env.PRIVATE_KEY,
  tradeEth: "0.005",      // ~$10 per trade to start safe
  minSpreadPct: 0.05,     // 0.05% - very viable on Base!
  cycleMs: 2000,
  gasCostUsd: 0.005,      // ~$0.005 for two swaps on Base
};

// ========== BASE POOLS ==========
// Discovered addresses
const POOLS = [
  {
    name: "UniV3 WETH/USDC",
    address: "0xd0b53D9277642d899DF5C87A3966A349A798F224",
    type: "uniswap_v3",
    fee: 500,
    token0: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
    token1: "0x4200000000000000000000000000000000000006", // WETH
    decimals0: 6,
    decimals1: 18,
  },
  {
    name: "Aerodrome WETH/USDC", 
    address: "0xcDAC0d6c6C59727a65F871236188350531885C43",
    type: "uniswap_v2", // Aerodrome volatile uses same interface
    token0: "0x4200000000000000000000000000000000000006", // WETH
    token1: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
    decimals0: 18,
    decimals1: 6,
  }
];

// ========== ABIs ==========
const poolV3Abi = [
  "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)"
];

const poolV2Abi = [
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)"
];

// ========== PRICE FETCHING ==========
async function getV3Price(provider, poolAddr) {
  try {
    const pool = new ethers.Contract(poolAddr, poolV3Abi, provider);
    const slot0 = await pool.slot0();
    const sqrtPriceX96 = slot0.sqrtPriceX96;
    
    // FIXED: Use pure BigInt math to avoid JavaScript precision loss
    // price = (sqrtPriceX96^2 * 10^12) / 2^192
    // 10^12 accounts for decimal difference (WETH 18 - USDC 6)
    const Q192 = 2n ** 192n;
    const scaled = (sqrtPriceX96 * sqrtPriceX96 * (10n ** 20n)) / Q192;
    return Number(scaled) / 1e8;
  } catch (e) {
    console.log(`  UniV3 error: ${e.message}`);
    return null;
  }
}

async function getV2Price(provider, poolAddr) {
  try {
    const pool = new ethers.Contract(poolAddr, poolV2Abi, provider);
    const reserves = await pool.getReserves();
    
    // This pool has token0=WETH, token1=USDC
    // reserve0 = WETH, reserve1 = USDC
    const weth = Number(ethers.formatEther(reserves.reserve0));
    const usdc = Number(ethers.formatUnits(reserves.reserve1, 6));
    
    // USDC per ETH
    const usdcPerEth = usdc / weth;
    return usdcPerEth;
  } catch (e) {
    console.log(`  Aerodrome error: ${e.message}`);
    return null;
  }
}

// ========== MAIN ==========
async function main() {
  console.log("🚀 Base Arbitrage Bot");
  console.log("====================\n");
  
  const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
  const wallet = new ethers.Wallet(CONFIG.privateKey.slice(2), provider);
  
  console.log(`📡 RPC: ${CONFIG.rpcUrl}`);
  console.log(`👛 Wallet: ${wallet.address}`);
  
  // Check ETH price (assume ~$2500 for now, or fetch)
  const ethPriceUsd = 2500;
  console.log(`💎 Assuming ETH price: $${ethPriceUsd}\n`);
  
  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`💰 Base ETH balance: ${ethers.formatEther(balance)} ETH\n`);
  
  if (ethers.formatEther(balance) < "0.01") {
    console.log("⚠️  Warning: Need ETH for gas!\n");
  }
  
  let cycle = 0;
  
  while (true) {
    cycle++;
    console.log(`--- Cycle #${cycle} ---`);
    
    try {
      // Get prices
      const uniPrice = await getV3Price(provider, POOLS[0].address);
      const aeroPrice = await getV2Price(provider, POOLS[1].address);
      
      console.log(`📊 UniV3:   $${uniPrice ? uniPrice.toFixed(2) : "ERROR"}/ETH`);
      console.log(`📊 Aerodrome: $${aeroPrice ? aeroPrice.toFixed(2) : "ERROR"}/ETH`);
      
      if (!uniPrice || !aeroPrice) {
        console.log("⚠️  Missing price data, retrying...\n");
        await new Promise(r => setTimeout(r, CONFIG.cycleMs));
        continue;
      }
      
      // Calculate spread
      const diff = Math.abs(uniPrice - aeroPrice);
      const spread = (diff / Math.max(uniPrice, aeroPrice)) * 100;
      
      console.log(`📐 Spread: ${spread.toFixed(4)}%`);
      
      if (spread >= CONFIG.minSpreadPct) {
        console.log(`\n🎯 ARBITRAGE OPPORTUNITY! ${spread.toFixed(2)}%`);
        
        const tradeValue = parseFloat(CONFIG.tradeEth) * ethPriceUsd;
        const expectedProfit = tradeValue * (spread / 100);
        const netProfit = expectedProfit - CONFIG.gasCostUsd;
        
        console.log(`   Trade: ${CONFIG.tradeEth} ETH = ~$${tradeValue.toFixed(2)}`);
        console.log(`   Expected profit: ~$${expectedProfit.toFixed(4)}`);
        console.log(`   Gas cost: ~$${CONFIG.gasCostUsd}`);
        console.log(`   Net: ~$${netProfit.toFixed(4)}`);
        
        if (netProfit > 0.001) {
          console.log(`\n✅ PROFITABLE! Would execute here.`);
          console.log(`   (Execution not implemented yet)`);
        } else {
          console.log(`\n⚠️  Not enough profit to execute`);
        }
      } else {
        console.log(`   No opportunity (min: ${CONFIG.minSpreadPct}%)`);
      }
      
    } catch (e) {
      console.log("❌ Error:", e.message);
    }
    
    console.log("");
    await new Promise(r => setTimeout(r, CONFIG.cycleMs));
  }
}

main().catch(console.error);
