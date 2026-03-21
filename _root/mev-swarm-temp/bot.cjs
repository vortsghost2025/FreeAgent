# REMOVED: sensitive data redacted by automated security cleanup
const { ethers } = require("ethers");

const RPC_URL = "https://base-rpc.publicnode.com";
const provider = new ethers.JsonRpcProvider(RPC_URL);

// ONLY USDC/ETH - nothing else until this works
const POOLS = [
  { name: "UniV3-0.05%", addr: "REDACTED_ADDRESS", type: "v3" },
  { name: "UniV3-0.3%", addr: "REDACTED_ADDRESS", type: "v3" },
  { name: "Aero-vol", addr: "REDACTED_ADDRESS", type: "v2" },
];

const TWO_192 = 115792089237316195423570985008687907853269984665640564039457584007913129639936n;

async function getPrice(pool) {
  if (pool.type === "v3") {
    const c = new ethers.Contract(pool.addr, [
      "function slot0() view returns (uint160,int24,uint16,uint16,uint16,uint8,bool)"
    ], provider);
    const s = await c.slot0();
    const sq = s[0];
    const p = (sq * sq * 1000000000000n) / TWO_192;
    return Number(p) / 1e12;
  } else {
    const c = new ethers.Contract(pool.addr, [
      "function getReserves() view returns (uint256,uint256,uint256)"
    ], provider);
    const r = await c.getReserves();
    return Number(ethers.formatUnits(r[1], 6)) / Number(ethers.formatEther(r[0]));
  }
}

async function main() {
  console.log("🚀 Base Bot - USDC/ETH only\n");
  
  for (let i = 1; ; i++) {
    try {
      const results = await Promise.all(POOLS.map(async p => ({ ...p, price: await getPrice(p) })));
      const valid = results.filter(r => r.price > 100 && r.price < 10000);
      
      if (valid.length < 2) { console.log(`#${i} Bad prices`); await sleep(2000); continue; }
      
      const str = valid.map(p => `${p.name}:$${p.price.toFixed(2)}`).join(" | ");
      const min = Math.min(...valid.map(p => p.price));
      const max = Math.max(...valid.map(p => p.price));
      const spread = (max - min) / min;
      const net = spread - 0.003;
      const profit = (0.02 * min * net) - 0.004;
      
      console.log(`#${i} | ${str} | ${(spread*100).toFixed(3)}% | $${profit.toFixed(4)}`);
    } catch (e) { console.log(`#${i} ERR: ${e.message.slice(0,50)}`); }
    await sleep(2000);
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
main();
