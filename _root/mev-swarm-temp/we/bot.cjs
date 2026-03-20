const { ethers } = require("ethers");

const RPC_URL = "https://base-rpc.publicnode.com";
const provider = new ethers.JsonRpcProvider(RPC_URL);

// ONLY USDC/ETH - nothing else until this works
const POOLS = [
  { name: "UniV3-0.05%", addr: "0xd0b53D9277642d899DF5C87A3966A349A798F224", type: "v3" },
  { name: "UniV3-0.3%", addr: "0x6c561B446416E1A00E8E93E221854d6eA4171372", type: "v3" },
  { name: "Aero-vol", addr: "0xcDAC0d6c6C59727a65F871236188350531885C43", type: "v2" },
];

async function getPrice(pool) {
  if (pool.type === "v3") {
    const c = new ethers.Contract(pool.addr, [
      "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)"
    ], provider);
    const s = await c.slot0();
    const sq = s.sqrtPriceX96;
    
    if (!sq || sq === 0n || sq === 0) return 0;
    
    // sqrtPriceX96 = sqrt(token1/token0) * 2^96
    // For WETH/USDC pool: token0=WETH, token1=USDC
    // So this is sqrt(USDC/WETH) * 2^96
    // Convert to Number early to avoid BigInt overflow
    const sqrtPrice = Number(sq) / (2 ** 96);
    const price = sqrtPrice * sqrtPrice; // USDC/WETH in raw units
    
    // Adjust for decimals: multiply by 10^(decimal0 - decimal1) = 10^(18-6)
    return price * (10 ** 12);
  } else {
    const c = new ethers.Contract(pool.addr, [
      "function getReserves() view returns (uint256,uint256,uint256)",
      "function token0() view returns (address)"
    ], provider);
    const r = await c.getReserves();
    const token0 = await c.token0();
    const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    
    if (token0.toLowerCase() === USDC.toLowerCase()) {
      // token0=USDC, token1=WETH: reserves[0]=USDC, reserves[1]=WETH
      return Number(ethers.formatUnits(r[0], 6)) / Number(ethers.formatEther(r[1]));
    } else {
      // token0=WETH, token1=USDC: reserves[0]=WETH, reserves[1]=USDC  
      return Number(ethers.formatUnits(r[1], 6)) / Number(ethers.formatEther(r[0]));
    }
  }
}

async function main() {
  console.log("🚀 Base Bot - USDC/ETH only\n");
  
  for (let i = 1; ; i++) {
    try {
      const results = await Promise.all(POOLS.map(async p => {
        try {
          return { ...p, price: await getPrice(p) };
        } catch (e) {
          return { ...p, price: 0 };
        }
      }));
      
      const valid = results.filter(r => r.price > 100 && r.price < 10000);
      if (valid.length < 2) { 
        console.log(`#${i} Bad prices`); 
        await sleep(2000); 
        continue; 
      }
      
      const str = valid.map(p => `${p.name}:${p.price.toFixed(2)}`).join(" | ");
      const min = Math.min(...valid.map(p => p.price));
      const max = Math.max(...valid.map(p => p.price));
      const spread = (max - min) / min;
      
      // MORE REALISTIC COSTS
      // UniV3-0.05% + Aero ≈ 0.05% + 0.15% swap fees + 0.001 gas = 0.201%
      const REALISTIC_COST = 0.002;  // 0.2%
      const net = spread - REALISTIC_COST;
      
      // Bigger trade size for your first penny
      const TRADE_SIZE_ETH = 0.05;  // $100+ trade
      const profit = (TRADE_SIZE_ETH * min * net) - 0.002;  // $0.002 gas buffer
      
      console.log(`#${i} | ${str} | ${(spread*100).toFixed(3)}% | ${profit.toFixed(4)}`);
      
      // ALERT WHEN PROFITABLE
      if (profit > 0) {
        console.log(`\n🎯 PROFITABLE OPPORTUNITY! 🎯`);
        console.log(`Spread: ${(spread*100).toFixed(3)}% | Estimated profit: ${profit.toFixed(4)}`);
        console.log(`Buy at: ${valid.find(p => p.price === min).name} (${min.toFixed(2)})`);
        console.log(`Sell at: ${valid.find(p => p.price === max).name} (${max.toFixed(2)})`);
        console.log(`---\n`);
      }
      
    } catch (e) { 
      console.log(`#${i} ERR: ${e.message.slice(0,50)}`); 
    }
    await sleep(2000);
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
main();
