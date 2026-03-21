# REMOVED: sensitive data redacted by automated security cleanup
/**
 * Base Multi-Pool Arbitrage Bot
 * Monitors USDC/WETH, cbBTC/WETH, cbBTC/USDC pools
 * Gas is ~$0.001 per swap on Base!
 */

const { ethers } = require("ethers");
require("dotenv").config();

// ========== CONFIG ==========
const RPC_URL = process.env.BASE_RPC_URL || "https://base-rpc.publicnode.com";
const TRADE_ETH = 0.02;
const CYCLE_MS = 2000;
const MIN_SPREAD = 0.1; // Minimum 0.1% spread to consider
// =============================

// BASE TOKENS
const WETH = "REDACTED_ADDRESS";
const USDC = "REDACTED_ADDRESS";
const cbBTC = "REDACTED_ADDRESS";

// ALL POOLS - NO STABLE POOLS (they use different math)
const POOLS = [
  // === USDC/WETH (volatile pools only) ===
  { name: "UniV3-0.01%", addr: "REDACTED_ADDRESS", type: "v3", fee: 0.0001, pair: "WETH/USDC", tokenA: WETH, decA: 18, tokenB: USDC, decB: 6 },
  { name: "UniV3-0.05%", addr: "REDACTED_ADDRESS", type: "v3", fee: 0.0005, pair: "WETH/USDC", tokenA: WETH, decA: 18, tokenB: USDC, decB: 6 },
  { name: "UniV3-0.3%", addr: "REDACTED_ADDRESS", type: "v3", fee: 0.003, pair: "WETH/USDC", tokenA: WETH, decA: 18, tokenB: USDC, decB: 6 },
  { name: "Aero-vol", addr: "REDACTED_ADDRESS", type: "v2", fee: 0.003, pair: "WETH/USDC", tokenA: WETH, decA: 18, tokenB: USDC, decB: 6 },
  
  // === cbBTC/WETH ===
  { name: "UniV3-0.01%", addr: "REDACTED_ADDRESS", type: "v3", fee: 0.0001, pair: "cbBTC/WETH", tokenA: cbBTC, decA: 8, tokenB: WETH, decB: 18 },
  { name: "UniV3-0.05%", addr: "REDACTED_ADDRESS", type: "v3", fee: 0.0005, pair: "cbBTC/WETH", tokenA: cbBTC, decA: 8, tokenB: WETH, decB: 18 },
  { name: "UniV3-0.3%", addr: "REDACTED_ADDRESS", type: "v3", fee: 0.003, pair: "cbBTC/WETH", tokenA: cbBTC, decA: 8, tokenB: WETH, decB: 18 },
  { name: "Aero-vol", addr: "REDACTED_ADDRESS", type: "v2", fee: 0.003, pair: "cbBTC/WETH", tokenA: WETH, decA: 18, tokenB: cbBTC, decB: 8 },
  
  // === cbBTC/USDC ===
  { name: "UniV3-0.05%", addr: "REDACTED_ADDRESS", type: "v3", fee: 0.0005, pair: "cbBTC/USDC", tokenA: USDC, decA: 6, tokenB: cbBTC, decB: 8 },
  { name: "Aero-vol", addr: "REDACTED_ADDRESS", type: "v2", fee: 0.003, pair: "cbBTC/USDC", tokenA: USDC, decA: 6, tokenB: cbBTC, decB: 8 },
];

// ========== PRICE FUNCTIONS ==========

function v3Price(sqrtPriceX96, decA, decB) {
  // Pure BigInt math — never touches Number on large values
  const Q192 = 2n ** 192n;
  const decDiff = BigInt(decA - decB);
  const scale = 10n ** (20n + decDiff);
  const scaled = (sqrtPriceX96 * sqrtPriceX96 * scale) / Q192;
  return Number(scaled) / 1e8;
}

async function fetchV3(provider, pool) {
  const contract = new ethers.Contract(pool.addr, [
    "function slot0() view returns (uint160,int24,uint16,uint16,uint16,uint8,bool)"
  ], provider);
  const slot0 = await contract.slot0();
  return v3Price(slot0[0], pool.decA, pool.decB);
}

async function fetchV2(provider, pool) {
  const poolContract = new ethers.Contract(pool.addr, [
    "function getReserves() view returns (uint256,uint256,uint256)",
    "function stable() view returns (bool)"
  ], provider);
  
  // Check if stable pool - if so, skip it
  const isStable = await poolContract.stable().catch(() => false);
  if (isStable) {
    throw new Error("Stable pool - not supported");
  }
  
  const r = await poolContract.getReserves();
  const a = Number(ethers.formatUnits(r[0], pool.decA));
  const b = Number(ethers.formatUnits(r[1], pool.decB));
  return b / a;
}

async function fetchPrice(provider, pool) {
  return pool.type === "v3"
    ? fetchV3(provider, pool)
    : fetchV2(provider, pool);
}

// ========== MAIN ==========

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  console.log(`✅ Connected: Base`);
  console.log(`📊 Monitoring ${POOLS.length} pools across 3 pairs`);
  console.log(`⚠️  No stable pools - using volatile only\n`);

  // ETH reference price (updated from WETH/USDC)
  let ethUsdRef = 2100;

  let cycle = 0;
  
  while (true) {
    cycle++;
    
    try {
      // Fetch all prices in parallel
      const results = await Promise.all(
        POOLS.map(async (p) => {
          try {
            const price = await fetchPrice(provider, p);
            return { ...p, price, ok: true };
          } catch (e) {
            return { ...p, price: null, ok: false, err: e.message.slice(0, 40) };
          }
        })
      );

      // Filter to live pools only
      const live = results.filter(r => r.ok && r.price > 0);
      const dead = results.filter(r => !r.ok);

      if (live.length === 0) {
        console.log(`#${cycle} All pools dead`);
        await new Promise(r => setTimeout(r, CYCLE_MS));
        continue;
      }

      // Update ETH reference from WETH/USDC pair only
      const ethPools = live.filter(r => r.pair === "WETH/USDC");
      if (ethPools.length > 0) {
        ethUsdRef = ethPools.reduce((s, r) => s + r.price, 0) / ethPools.length;
      }

      // Gas cost
      const feeData = await provider.getFeeData();
      const gasCostEth = Number(ethers.formatEther(300000n * (feeData.gasPrice || 1000000n)));
      const gasCostUSD = gasCostEth * ethUsdRef;

      // Find best arb per pair
      const pairs = [...new Set(live.map(r => r.pair))];
      const opps = [];

      for (const pair of pairs) {
        const pp = live.filter(r => r.pair === pair);
        if (pp.length < 2) continue;

        for (let i = 0; i < pp.length; i++) {
          for (let j = i + 1; j < pp.length; j++) {
            const a = pp[i], b = pp[j];
            const raw = Math.abs(a.price - b.price) / Math.min(a.price, b.price);
            const net = raw - a.fee - b.fee;
            if (raw * 100 < MIN_SPREAD) continue;

            const buy = a.price < b.price ? a : b;
            const sell = a.price < b.price ? b : a;
            
            // Calculate trade value
            let tvUSD;
            if (pair === "WETH/USDC") {
              tvUSD = TRADE_ETH * (a.price + b.price) / 2;
            } else if (pair === "cbBTC/WETH") {
              tvUSD = TRADE_ETH * ethUsdRef;
            } else {
              tvUSD = TRADE_ETH * ethUsdRef;
            }
            
            const gross = tvUSD * net;
            opps.push({ 
              pair, 
              raw, 
              net, 
              buy: buy.name, 
              sell: sell.name,
              buyPrice: buy.price,
              sellPrice: sell.price,
              gross, 
              gasCostUSD, 
              netUSD: gross - gasCostUSD 
            });
          }
        }
      }

      opps.sort((a, b) => b.netUSD - a.netUSD);

      // Build display
      const wethLine = ethPools.map(r => `${r.name}:$${r.price.toFixed(2)}`).join(" | ");
      const deadStr = dead.length > 0 ? ` [${dead.length} failed]` : "";

      if (opps.length > 0) {
        const best = opps[0];
        const sp = (best.raw * 100).toFixed(4);
        const alert = best.raw * 100 >= 0.5;

        if (alert) {
          console.log(`🚨 ALERT | ${best.pair} spread:${sp}% | $${best.netUSD.toFixed(4)} net`);
          console.log(`   Buy: ${best.buy} @ $${best.buyPrice.toFixed(2)}`);
          console.log(`   Sell: ${best.sell} @ $${best.sellPrice.toFixed(2)}`);
        }

        console.log(`#${cycle} | ${wethLine} | ${best.pair} ${sp}% net:$${best.netUSD.toFixed(4)}${deadStr}`);
      } else {
        console.log(`#${cycle} | ${wethLine} | No spreads > ${MIN_SPREAD}%${deadStr}`);
      }

    } catch (e) {
      console.log(`#${cycle} ERROR: ${e.message?.slice(0, 80)}`);
    }

    await new Promise(r => setTimeout(r, CYCLE_MS));
  }
}

main().catch(console.error);
