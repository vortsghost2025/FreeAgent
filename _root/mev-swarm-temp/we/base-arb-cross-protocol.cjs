// base-arb-cross-protocol.cjs - Cross-protocol arbitrage (Uniswap vs Aerodrome)
const { ethers } = require("ethers");
require('dotenv').config();

const RPC_URL = process.env.BASE_RPC_URL || "https://base-rpc.publicnode.com";
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Check for private key
if (!process.env.PRIVATE_KEY) {
  console.log("❌ Error: PRIVATE_KEY not found in .env file");
  console.log("\n📝 Setup steps:");
  console.log("1. Copy .env.example to .env");
  console.log("2. Add your Base wallet private key to .env");
  console.log("3. Run: node base-arb-cross-protocol.cjs\n");
  process.exit(1);
}

const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Pool configurations - Cross-protocol!
const POOLS = [
  { 
    name: "UniV3-0.05%", 
    addr: "0xd0b53D9277642d899DF5C87A3966A349A798F224", 
    protocol: "uniswap",
    fee: 500 
  },
  { 
    name: "UniV3-0.3%", 
    addr: "0x6c561B446416E1A00E8E93E221854d6eA4171372", 
    protocol: "uniswap",
    fee: 3000 
  },
  { 
    name: "Aero-vol", 
    addr: "0xcDAC0d6c6C59727a65F871236188350531885C43", 
    protocol: "v2"
  }
];

// Token addresses on Base
const WETH = "0x4200000000000000000000000000000000000006";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Router addresses
const UNISWAP_V3_ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481";
const AERODROME_ROUTER = "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43";

// CONFIG
const TRADE_SIZE_ETH = 0.0015; // Reduced to match wallet balance (~0.002 WETH)
const AUTO_EXECUTE = true;
const MIN_PROFIT_USD = 0.01; // Target $0.01+ profits based on data analysis

// ABIs
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)"
];

const UNISWAP_ROUTER_ABI = [
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)"
];

// CORRECTED Aerodrome ABI - uses simple address[] path
const AERODROME_ROUTER_ABI = [
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata routes, address to, uint deadline) external returns (uint[] memory amounts)"
];

// Get price from Uniswap V3 pool
async function getV3Price(poolAddr) {
  const c = new ethers.Contract(poolAddr, [
    "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)"
  ], provider);
  
  const s = await c.slot0();
  const sqrtPriceX96 = s[0];
  
  // Convert to Number early to avoid BigInt overflow
  const sqrtPrice = Number(sqrtPriceX96) / (2 ** 96);
  const price = sqrtPrice * sqrtPrice;
  return price * (10 ** 12); // Adjust for decimals (18-6 = 12)
}

// Get price from Aerodrome (v2-style)
async function getAerodromePrice(poolAddr) {
  const c = new ethers.Contract(poolAddr, [
    "function getReserves() view returns (uint256 reserve0, uint256 reserve1, uint256 blockTimestampLast)"
  ], provider);
  
  const r = await c.getReserves();
  return Number(ethers.formatUnits(r[1], 6)) / Number(ethers.formatEther(r[0]));
}

async function getPrice(pool) {
  try {
    if (pool.protocol === "uniswap") {
      return await getV3Price(pool.addr);
    } else {
      return await getAerodromePrice(pool.addr);
    }
  } catch (e) {
    console.log(`Error getting price from ${pool.name}: ${e.message.slice(0, 50)}`);
    return 0;
  }
}

async function checkAndApprove(tokenAddr, spender, amount) {
  const token = new ethers.Contract(tokenAddr, ERC20_ABI, wallet);
  const allowance = await token.allowance(wallet.address, spender);
  
  if (allowance < amount) {
    console.log(`  📝 Approving ${spender === UNISWAP_V3_ROUTER ? 'Uniswap' : 'Aerodrome'}...`);
    const tx = await token.approve(spender, ethers.MaxUint256);
    await tx.wait();
    console.log(`  ✅ Approved`);
  }
}

async function swapUniswap(tokenIn, tokenOut, fee, amountIn, minAmountOut) {
  const router = new ethers.Contract(UNISWAP_V3_ROUTER, UNISWAP_ROUTER_ABI, wallet);
  
  await checkAndApprove(tokenIn, UNISWAP_V3_ROUTER, amountIn);
  
  const params = {
    tokenIn,
    tokenOut,
    fee,
    recipient: wallet.address,
    amountIn,
    amountOutMinimum: minAmountOut,
    sqrtPriceLimitX96: 0
  };
  
  console.log(`  🔄 Swapping on Uniswap...`);
  const tx = await router.exactInputSingle(params, { gasLimit: 300000 });
  const receipt = await tx.wait();
  console.log(`  ✅ Uniswap done`);
  
  return receipt;
}

async function swapAerodrome(tokenIn, tokenOut, amountIn, minAmountOut) {
  const router = new ethers.Contract(AERODROME_ROUTER, AERODROME_ROUTER_ABI, wallet);
  
  await checkAndApprove(tokenIn, AERODROME_ROUTER, amountIn);
  
  // Simple path: tokenIn -> tokenOut
  const path = [tokenIn, tokenOut];
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  
  console.log(`  🔄 Swapping on Aerodrome...`);
  const tx = await router.swapExactTokensForTokens(
    amountIn,
    minAmountOut,
    path,
    wallet.address,
    deadline,
    { gasLimit: 400000 }
  );
  const receipt = await tx.wait();
  console.log(`  ✅ Aerodrome done`);
  
  return receipt;
}

async function executeArbitrage(buyPool, sellPool, amountInETH) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`🚀 EXECUTING CROSS-PROTOCOL ARBITRAGE`);
  console.log(`${"=".repeat(70)}`);
  console.log(`Buy on:  ${buyPool.name}`);
  console.log(`Sell on: ${sellPool.name}`);
  
  const startTime = Date.now();
  
  try {
    const wethContract = new ethers.Contract(WETH, ERC20_ABI, wallet);
    const usdcContract = new ethers.Contract(USDC, ERC20_ABI, wallet);
    
    const startWETH = await wethContract.balanceOf(wallet.address);
    const startUSDC = await usdcContract.balanceOf(wallet.address);
    
    console.log(`\n💰 Start: ${ethers.formatEther(startWETH)} WETH`);
    
    const amountInWei = ethers.parseEther(amountInETH.toString());
    
    // Step 1: Buy USDC
    console.log(`\n📍 Step 1: WETH → USDC on ${buyPool.name}`);
    const minUSDC = ethers.parseUnits((amountInETH * 2100 * 0.98).toFixed(0), 6);
    
    if (buyPool.protocol === "uniswap") {
      await swapUniswap(WETH, USDC, buyPool.fee, amountInWei, minUSDC);
    } else {
      await swapAerodrome(WETH, USDC, amountInWei, minUSDC);
    }
    
    const midUSDC = await usdcContract.balanceOf(wallet.address);
    const usdcGained = midUSDC - startUSDC;
    console.log(`  💰 Received: ${ethers.formatUnits(usdcGained, 6)} USDC`);
    
    // Step 2: Sell USDC
    console.log(`\n📍 Step 2: USDC → WETH on ${sellPool.name}`);
    const minWETH = ethers.parseEther((amountInETH * 0.98).toString());
    
    if (sellPool.protocol === "uniswap") {
      await swapUniswap(USDC, WETH, sellPool.fee, usdcGained, minWETH);
    } else {
      await swapAerodrome(USDC, WETH, usdcGained, minWETH);
    }
    
    const endWETH = await wethContract.balanceOf(wallet.address);
    
    const wethProfit = endWETH - startWETH;
    const wethProfitNum = Number(ethers.formatEther(wethProfit));
    const usdProfit = wethProfitNum * 2100;
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`\n💰 End: ${ethers.formatEther(endWETH)} WETH`);
    console.log(`\n${wethProfitNum >= 0 ? '🎉' : '📉'} P/L: ${wethProfitNum > 0 ? '+' : ''}${wethProfitNum.toFixed(6)} WETH ($${usdProfit.toFixed(4)})`);
    console.log(`⏱️  ${elapsed}s`);
    console.log(`${"=".repeat(70)}\n`);
    
    if (usdProfit >= 0.01) {
      console.log(`\n🎉🎉🎉 YOUR FIRST PENNY! 🎉🎉🎉\n`);
    }
    
    return usdProfit;
    
  } catch (error) {
    console.log(`\n❌ ${error.message.slice(0, 150)}`);
    console.log(`${"=".repeat(70)}\n`);
    return null;
  }
}

async function main() {
  console.log("🚀 Base Cross-Protocol Arb Bot\n");
  console.log(`Strategy: Uniswap V3 ↔ Aerodrome`);
  console.log(`Trade size: ${TRADE_SIZE_ETH} ETH`);
  console.log(`Min profit: $${MIN_PROFIT_USD}`);
  console.log(`Auto: ${AUTO_EXECUTE ? 'YES ⚡' : 'NO 👀'}\n`);
  
  const wethContract = new ethers.Contract(WETH, ERC20_ABI, wallet);
  const wethBalance = await wethContract.balanceOf(wallet.address);
  
  console.log(`💰 WETH: ${ethers.formatEther(wethBalance)}\n`);
  
  let opportunitiesFound = 0;
  let tradesExecuted = 0;
  let totalProfit = 0;
  
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
      
      const str = valid.map(p => `${p.name}:$${p.price.toFixed(2)}`).join(" | ");
      const minPrice = Math.min(...valid.map(p => p.price));
      const maxPrice = Math.max(...valid.map(p => p.price));
      const spread = (maxPrice - minPrice) / minPrice;
      
      const COST = 0.0015; // 0.15% (realistic cross-protocol fees)
      const net = spread - COST;
      const profit = (TRADE_SIZE_ETH * minPrice * net);
      
      console.log(`#${i} | ${str} | ${(spread*100).toFixed(3)}% | $${profit.toFixed(4)}`);
      
      if (profit >= MIN_PROFIT_USD) {
        opportunitiesFound++;
        const buyPool = valid.find(p => p.price === minPrice);
        const sellPool = valid.find(p => p.price === maxPrice);
        
        console.log(`\n🎯 OPPORTUNITY #${opportunitiesFound}: $${profit.toFixed(4)}`);
        console.log(`${buyPool.name} → ${sellPool.name}`);
        
        if (AUTO_EXECUTE) {
          tradesExecuted++;
          const actualProfit = await executeArbitrage(buyPool, sellPool, TRADE_SIZE_ETH);
          if (actualProfit !== null) totalProfit += actualProfit;
          
          console.log(`⏸️  10s cooldown...\n`);
          await sleep(10000);
        } else {
          console.log(`⚠️  AUTO_EXECUTE=false\n`);
        }
      }
      
      if (i % 100 === 0) {
        console.log(`\n📊 Ops: ${opportunitiesFound} | Trades: ${tradesExecuted} | P/L: $${totalProfit.toFixed(4)}\n`);
      }
      
    } catch (e) { 
      console.log(`#${i} ERR: ${e.message.slice(0,50)}`); 
    }
    await sleep(2000);
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
main();
