# REMOVED: sensitive data redacted by automated security cleanup
const { ethers } = require("ethers");

const RPC_URL = "https://base-rpc.publicnode.com";
const provider = new ethers.JsonRpcProvider(RPC_URL);

const WETH = "REDACTED_ADDRESS";
const USDC = "REDACTED_ADDRESS";
const cbBTC = "REDACTED_ADDRESS";

const POOLS = [
  { name: "UniV3-USDC/ETH-0.05%", addr: "REDACTED_ADDRESS", type: "v3" },
  { name: "Aero-USDC/ETH-vol", addr: "REDACTED_ADDRESS", type: "v2" },
  { name: "Aero-USDC/ETH-stable", addr: "REDACTED_ADDRESS", type: "v2" },
  { name: "UniV3-cbBTC/ETH-0.3%", addr: "REDACTED_ADDRESS", type: "v3" },
  { name: "Aero-cbBTC/ETH-vol", addr: "REDACTED_ADDRESS", type: "v2" },
  { name: "UniV3-cbBTC/USDC-0.05%", addr: "REDACTED_ADDRESS", type: "v3" },
];

async function debugPool(pool) {
  console.log(`\n=== ${pool.name} ===`);
  
  if (pool.type === "v3") {
    const contract = new ethers.Contract(pool.addr, [
      "function token0() view returns (address)",
      "function token1() view returns (address)",
      "function slot0() view returns (uint160, int24, uint16, uint16, uint16, uint8, bool)"
    ], provider);
    
    const [token0, token1, slot0] = await Promise.all([
      contract.token0(),
      contract.token1(),
      contract.slot0()
    ]);
    
    const sqrtPriceX96 = slot0[0];
    const t0isWETH = token0.toLowerCase() === WETH.toLowerCase();
    const t0isUSDC = token0.toLowerCase() === USDC.toLowerCase();
    const t0iscbBTC = token0.toLowerCase() === cbBTC.toLowerCase();
    
    console.log(`  token0: ${token0} (${t0isWETH ? 'WETH' : t0isUSDC ? 'USDC' : t0iscbBTC ? 'cbBTC' : '???'})`);
    console.log(`  token1: ${token1}`);
    console.log(`  sqrtPriceX96: ${sqrtPriceX96.toString()}`);
    
    // Calculate price: (sqrtPrice^2 / 2^192) * 10^(dec0 - dec1)
    const Q192 = 2n ** 192n;
    const sqrtPrice = sqrtPriceX96;
    
    // Raw price = token1/token0
    let scaled = (sqrtPrice * sqrtPrice * 10n ** 18n) / Q192;
    let rawPrice = Number(scaled) / 1e18;
    
    console.log(`  raw price (token1/token0): ${rawPrice}`);
    
    // Determine decimals
    let dec0, dec1;
    if (t0isWETH) { dec0 = 18; }
    else if (t0isUSDC) { dec0 = 6; }
    else if (t0iscbBTC) { dec0 = 8; }
    else { dec0 = 18; }
    
    const t1isWETH = token1.toLowerCase() === WETH.toLowerCase();
    const t1isUSDC = token1.toLowerCase() === USDC.toLowerCase();
    const t1iscbBTC = token1.toLowerCase() === cbBTC.toLowerCase();
    
    if (t1isWETH) { dec1 = 18; }
    else if (t1isUSDC) { dec1 = 6; }
    else if (t1iscbBTC) { dec1 = 8; }
    else { dec1 = 18; }
    
    // Adjust for decimals
    const decAdj = Math.pow(10, dec0 - dec1);
    const adjustedPrice = rawPrice * decAdj;
    
    console.log(`  dec0=${dec0}, dec1=${dec1}, adj=${decAdj}`);
    console.log(`  adjusted price: ${adjustedPrice}`);
    
    // What does this price mean?
    if (t0isWETH && t1isUSDC) {
      console.log(`  → USDC per ETH: ${adjustedPrice}`);
    } else if (t0isUSDC && t1isWETH) {
      console.log(`  → ETH per USDC: ${adjustedPrice} → USDC per ETH: ${1/adjustedPrice}`);
    } else if (t0iscbBTC && t1isWETH) {
      console.log(`  → ETH per cbBTC: ${adjustedPrice}`);
    } else if (t0isWETH && t1iscbBTC) {
      console.log(`  → cbBTC per ETH: ${adjustedPrice} → ETH per cbBTC: ${1/adjustedPrice}`);
    } else if (t0iscbBTC && t1isUSDC) {
      console.log(`  → USDC per cbBTC: ${adjustedPrice}`);
    } else if (t0isUSDC && t1iscbBTC) {
      console.log(`  → cbBTC per USDC: ${adjustedPrice} → USDC per cbBTC: ${1/adjustedPrice}`);
    }
    
  } else {
    // V2
    const contract = new ethers.Contract(pool.addr, [
      "function token0() view returns (address)",
      "function token1() view returns (address)",
      "function getReserves() view returns (uint256, uint256, uint256)",
      "function stable() view returns (bool)"
    ], provider);
    
    let token0, token1, reserves, stable;
    try {
      [token0, token1, reserves, stable] = await Promise.all([
        contract.token0(),
        contract.token1(),
        contract.getReserves(),
        contract.stable().catch(() => false)
      ]);
    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
      return;
    }
    
    const t0isWETH = token0.toLowerCase() === WETH.toLowerCase();
    const t0isUSDC = token0.toLowerCase() === USDC.toLowerCase();
    const t0iscbBTC = token0.toLowerCase() === cbBTC.toLowerCase();
    
    console.log(`  token0: ${token0}`);
    console.log(`  token1: ${token1}`);
    console.log(`  reserve0: ${reserves[0].toString()}`);
    console.log(`  reserve1: ${reserves[1].toString()}`);
    console.log(`  stable: ${stable}`);
    
    // Get decimals
    let dec0 = t0isWETH ? 18 : t0isUSDC ? 6 : t0iscbBTC ? 8 : 18;
    let dec1 = token1.toLowerCase() === WETH.toLowerCase() ? 18 : 
               token1.toLowerCase() === USDC.toLowerCase() ? 6 : 
               token1.toLowerCase() === cbBTC.toLowerCase() ? 8 : 18;
    
    const r0 = Number(ethers.formatUnits(reserves[0], dec0));
    const r1 = Number(ethers.formatUnits(reserves[1], dec1));
    
    console.log(`  reserve0 formatted: ${r0}`);
    console.log(`  reserve1 formatted: ${r1}`);
    
    if (stable) {
      console.log(`  STABLE POOL - price calculation differs from x*y=k`);
    }
    
    const price = r1 / r0;
    console.log(`  price (r1/r0): ${price}`);
  }
}

async function main() {
  console.log("Debugging pool prices...\n");
  
  for (const pool of POOLS) {
    try {
      await debugPool(pool);
    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
    }
  }
}

main();
