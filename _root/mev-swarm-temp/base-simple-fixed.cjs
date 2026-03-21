# REMOVED: sensitive data redacted by automated security cleanup
const { ethers } = require("ethers");

const RPC_URL = "https://base-rpc.publicnode.com";
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Only pools we KNOW work from debug
const POOLS = [
  { name: "UniV3-ETH-0.05%", addr: "REDACTED_ADDRESS", type: "v3", pair: "USDC/ETH" },
  { name: "UniV3-ETH-0.3%", addr: "REDACTED_ADDRESS", type: "v3", pair: "USDC/ETH" },
  { name: "Aero-ETH", addr: "REDACTED_ADDRESS", type: "v2", pair: "USDC/ETH" },
];

// ONE function that works for USDC/ETH - fixed BigInt math
async function getUSDCPerETH(pool) {
  if (pool.type === "v3") {
    const contract = new ethers.Contract(pool.addr, [
      "function slot0() view returns (uint160, int24, uint16, uint16, uint16, uint8, bool)"
    ], provider);
    
    const slot0 = await contract.slot0();
    const sqrtPriceX96 = slot0[0];
    
    // token0=WETH(18), token1=USDC(6)
    // USDC/ETH = (sqrtPrice^2 / 2^192) * 10^12
    const TWO_192 = 115792089237316195423570985008687907853269984665640564039457584007913129639936n;
    
    const sqrtSquared = sqrtPriceX96 * sqrtPriceX96;
    const scaled = sqrtSquared * 1000000000000n; // 10^12 for decimal adjustment
    const rawPrice = scaled / TWO_192;
    
    return Number(rawPrice) / 1e12;
    
  } else {
    // V2: token0=WETH, token1=USDC
    const contract = new ethers.Contract(pool.addr, [
      "function getReserves() view returns (uint256, uint256, uint256)"
    ], provider);
    
    const res = await contract.getReserves();
    const wethReserve = Number(ethers.formatEther(res[0]));
    const usdcReserve = Number(ethers.formatUnits(res[1], 6));
    
    return usdcReserve / wethReserve;
  }
}

async function main() {
  console.log("🚀 Base Arbitrage Bot (USDC/ETH only)\n");
  
  let cycle = 0;
  
  while (true) {
    cycle++;
    
    try {
      const results = await Promise.all(
        POOLS.map(async (pool) => {
          try {
            const price = await getUSDCPerETH(pool);
            return { ...pool, price };
          } catch (e) {
            return { ...pool, price: null, error: e.message };
          }
        })
      );
      
      const live = results.filter(p => p.price && p.price > 100 && p.price < 10000);
      
      if (live.length < 2) {
        console.log(`#${cycle} Waiting for valid prices...`);
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      
      // Display
      const prices = live.map(p => `${p.name}:$${p.price.toFixed(2)}`).join(" | ");
      const min = Math.min(...live.map(p => p.price));
      const max = Math.max(...live.map(p => p.price));
      const spread = (max - min) / min;
      const netSpread = spread - 0.0035; // Avg fee
      
      const tradeValue = 0.02 * (min + max) / 2;
      const grossProfit = tradeValue * netSpread;
      const netProfit = grossProfit - 0.004; // Gas
      
      let line = `#${cycle} | ${prices} | Spread:${(spread*100).toFixed(3)}% Net:${(netSpread*100).toFixed(3)}% | $${netProfit.toFixed(4)}`;
      
      if (netProfit > 0.01) {
        line += ` | 🚨 PROFIT`;
        const buyPool = live.find(p => p.price === min);
        const sellPool = live.find(p => p.price === max);
        console.log(line);
        console.log(`   Buy: ${buyPool.name} @ $${buyPool.price.toFixed(2)}`);
        console.log(`   Sell: ${sellPool.name} @ $${sellPool.price.toFixed(2)}`);
      } else {
        console.log(line);
      }
      
    } catch (e) {
      console.log(`#${cycle} ERROR: ${e.message}`);
    }
    
    await new Promise(r => setTimeout(r, 2000));
  }
}

main().catch(console.error);
