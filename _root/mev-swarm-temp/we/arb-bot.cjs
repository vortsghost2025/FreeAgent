const { ethers } = require("ethers");

const RPC_URL = "https://base-rpc.publicnode.com";
const provider = new ethers.JsonRpcProvider(RPC_URL);

const POOLS = [
  { name: "UniV3-0.05%", addr: "0xd0b53D9277642d899DF5C87A3966A349A798F224", type: "v3" },
  { name: "UniV3-0.3%", addr: "0x6c561B446416E1A00E8E93E221854d6eA4171372", type: "v3" },
  { name: "Aero-vol", addr: "0xcDAC0d6c6C59727a65F871236188350531885C43", type: "v2" },
];

async function getPrice(pool) {
  if (pool.type === "v3") {
    const c = new ethers.Contract(pool.addr, [
      "function slot0() view returns (uint160,int24,uint16,uint16,uint16,uint8,bool)"
    ], provider);
    const s = await c.slot0();
    const sqrtPriceX96 = s[0];
    const sqrtPrice = Number(sqrtPriceX96) / (2 ** 96);
    const price = sqrtPrice * sqrtPrice;
    return price * (10 ** 12);
  } else {
    const c = new ethers.Contract(pool.addr, [
      "function getReserves() view returns (uint256,uint256,uint256)"
    ], provider);
    const r = await c.getReserves();
    return Number(ethers.formatUnits(r[1], 6)) / Number(ethers.formatEther(r[0]));
  }
}

async function main() {
  console.log("🚀 Base Arb Bot - First Penny Edition\n");
  console.log("Target: ANY positive profit");
  console.log("Trade size: 0.05 ETH (~$107)");
  console.log("Cost estimate: 0.2% (realistic for Base)\n");
  
  let maxSpreadSeen = 0;
  let opportunitiesFound = 0;
  
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
        console.log(`#${i} Bad prices (${valid.length}/3 valid)`); 
        await sleep(2000); 
        continue; 
      }
      
      const str = valid.map(p => `${p.name}:$${p.price.toFixed(2)}`).join(" | ");
      const min = Math.min(...valid.map(p => p.price));
      const max = Math.max(...valid.map(p => p.price));
      const spread = (max - min) / min;
      
      if (spread > maxSpreadSeen) {
        maxSpreadSeen = spread;
      }
      
      const REALISTIC_COST = 0.002;
      const net = spread - REALISTIC_COST;
      
      const TRADE_SIZE_ETH = 0.05;
      const profit = (TRADE_SIZE_ETH * min * net) - 0.002;
      
      console.log(`#${i} | ${str} | ${(spread*100).toFixed(3)}% | $${profit.toFixed(4)}`);
      
      if (profit > 0) {
        opportunitiesFound++;
        console.log(`\n${"=".repeat(60)}`);
        console.log(`🎯 OPPORTUNITY #${opportunitiesFound} - PROFITABLE! 🎯`);
        console.log(`${"=".repeat(60)}`);
        console.log(`Spread:      ${(spread*100).toFixed(3)}%`);
        console.log(`Net profit:  $${profit.toFixed(4)} (after costs)`);
        console.log(`Buy from:    ${valid.find(p => p.price === min).name} @ $${min.toFixed(2)}`);
        console.log(`Sell to:     ${valid.find(p => p.price === max).name} @ $${max.toFixed(2)}`);
        console.log(`Trade size:  ${TRADE_SIZE_ETH} ETH (~$${(TRADE_SIZE_ETH * min).toFixed(2)})`);
        console.log(`${"=".repeat(60)}\n`);
      }
      
      if (i % 50 === 0) {
        console.log(`\n📊 Stats: Max spread seen: ${(maxSpreadSeen*100).toFixed(3)}% | Opportunities: ${opportunitiesFound}\n`);
      }
      
    } catch (e) { 
      console.log(`#${i} ERR: ${e.message.slice(0,50)}`); 
    }
    await sleep(2000);
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
main();

const RPC_URL = "https://base-rpc.publicnode.com";
const provider = new ethers.JsonRpcProvider(RPC_URL);

const POOLS = [
  { name: "UniV3-0.05%", addr: "0xd0b53D9277642d899DF5C87A3966A349A798F224", type: "v3" },
  { name: "UniV3-0.3%", addr: "0x6c561B446416E1A00E8E93E221854d6eA4171372", type: "v3" },
  { name: "Aero-vol", addr: "0xcDAC0d6c6C59727a65F871236188350531885C43", type: "v2" },
];

async function getPrice(pool) {
  if (pool.type === "v3") {
    const c = new ethers.Contract(pool.addr, [
      "function slot0() view returns (uint160,int24,uint16,uint16,uint16,uint8,bool)"
    ], provider);
    const s = await c.slot0();
    const sqrtPriceX96 = s[0];
    const sqrtPrice = Number(sqrtPriceX96) / (2 ** 96);
    const price = sqrtPrice * sqrtPrice;
    return price * (10 ** 12);
  } else {
    const c = new ethers.Contract(pool.addr, [
      "function getReserves() view returns (uint256,uint256,uint256)"
    ], provider);
    const r = await c.getReserves();
    return Number(ethers.formatUnits(r[1], 6)) / Number(ethers.formatEther(r[0]));
  }
}

async function main() {
  console.log("🚀 Base Arb Bot - First Penny Edition\n");
  console.log("Target: ANY positive profit");
  console.log("Trade size: 0.05 ETH (~$107)");
  console.log("Cost estimate: 0.2% (realistic for Base)\n");
  
  let maxSpreadSeen = 0;
  let opportunitiesFound = 0;
  
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
        console.log(`#${i} Bad prices (${valid.length}/3 valid)`); 
        await sleep(2000); 
        continue; 
      }
      
      const str = valid.map(p => `${p.name}:$${p.price.toFixed(2)}`).join(" | ");
      const min = Math.min(...valid.map(p => p.price));
      const max = Math.max(...valid.map(p => p.price));
      const spread = (max - min) / min;
      
      if (spread > maxSpreadSeen) {
        maxSpreadSeen = spread;
      }
      
      const REALISTIC_COST = 0.002;
      const net = spread - REALISTIC_COST;
      
      const TRADE_SIZE_ETH = 0.05;
      const profit = (TRADE_SIZE_ETH * min * net) - 0.002;
      
      console.log(`#${i} | ${str} | ${(spread*100).toFixed(3)}% | $${profit.toFixed(4)}`);
      
      if (profit > 0) {
        opportunitiesFound++;
        console.log(`\n${"=".repeat(60)}`);
        console.log(`🎯 OPPORTUNITY #${opportunitiesFound} - PROFITABLE! 🎯`);
        console.log(`${"=".repeat(60)}`);
        console.log(`Spread:      ${(spread*100).toFixed(3)}%`);
        console.log(`Net profit:  $${profit.toFixed(4)} (after costs)`);
        console.log(`Buy from:    ${valid.find(p => p.price === min).name} @ $${min.toFixed(2)}`);
        console.log(`Sell to:     ${valid.find(p => p.price === max).name} @ $${max.toFixed(2)}`);
        console.log(`Trade size:  ${TRADE_SIZE_ETH} ETH (~$${(TRADE_SIZE_ETH * min).toFixed(2)})`);
        console.log(`${"=".repeat(60)}\n`);
      }
      
      if (i % 50 === 0) {
        console.log(`\n📊 Stats: Max spread seen: ${(maxSpreadSeen*100).toFixed(3)}% | Opportunities: ${opportunitiesFound}\n`);
      }
      
    } catch (e) { 
      console.log(`#${i} ERR: ${e.message.slice(0,50)}`); 
    }
    await sleep(2000);
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
main();

