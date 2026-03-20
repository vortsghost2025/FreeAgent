// base-arb-bot-live.cjs - Live arbitrage trading bot for Base network
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
  console.log("3. Run: node base-arb-bot-live.cjs\n");
  process.exit(1);
}

const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Pool configurations
const POOLS = [
  { name: "UniV3-0.05%", addr: "0xd0b53D9277642d899DF5C87A3966A349A798F224", type: "v3", fee: 500 },
  { name: "UniV3-0.3%", addr: "0x6c561B446416E1A00E8E93E221854d6eA4171372", type: "v3", fee: 3000 },
  { name: "Aero-vol", addr: "0xcDAC0d6c6C59727a65F871236188350531885C43", type: "v2" },
];

// Token addresses on Base
const WETH = "0x4200000000000000000000000000000000000006";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Router addresses
const UNISWAP_V3_ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481";
const AERODROME_ROUTER = "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43";

// CONFIG - EDIT THESE
const TRADE_SIZE_ETH = 0.006;   // Trade size in WETH
const AUTO_EXECUTE = true;       // ACTUALLY TRADING!
const MIN_PROFIT_USD = 0.001;    // Minimum profit to trigger
const SLIPPAGE = 0.05;           // 5% slippage tolerance (generous!)

// ABIs
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)"
];

const UNISWAP_ROUTER_ABI = [
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)"
];

const AERODROME_ROUTER_ABI = [
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, tuple(address from, address to, bool stable)[] routes, address to, uint deadline) external returns (uint[] amounts)"
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
    if (pool.type === "v3") {
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
    console.log(`  📝 Approving ${spender.slice(0,8)}...`);
    const tx = await token.approve(spender, ethers.MaxUint256);
    await tx.wait();
    console.log(`  ✅ Approved`);
  }
}

async function executeUniswapV3Swap(pool, tokenIn, tokenOut, amountIn, minAmountOut) {
  const router = new ethers.Contract(UNISWAP_V3_ROUTER, UNISWAP_ROUTER_ABI, wallet);
  
  await checkAndApprove(tokenIn, UNISWAP_V3_ROUTER, amountIn);
  
  const params = {
    tokenIn,
    tokenOut,
    fee: pool.fee,
    recipient: wallet.address,
    amountIn,
    amountOutMinimum: minAmountOut,
    sqrtPriceLimitX96: 0
  };
  
  console.log(`  🔄 Swapping on ${pool.name}...`);
  const tx = await router.exactInputSingle(params, { gasLimit: 500000 });
  const receipt = await tx.wait();
  console.log(`  ✅ Done: ${receipt.hash.slice(0,10)}...`);
  
  return receipt;
}

async function executeAerodromeSwap(tokenIn, tokenOut, amountIn, minAmountOut) {
  const router = new ethers.Contract(AERODROME_ROUTER, AERODROME_ROUTER_ABI, wallet);
  
  await checkAndApprove(tokenIn, AERODROME_ROUTER, amountIn);
  
  const routes = [{
    from: tokenIn,
    to: tokenOut,
    stable: false
  }];
  
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  
  console.log(`  🔄 Swapping on Aerodrome...`);
  const tx = await router.swapExactTokensForTokens(
    amountIn,
    minAmountOut,
    routes,
    wallet.address,
    deadline,
    { gasLimit: 500000 }
  );
  const receipt = await tx.wait();
  console.log(`  ✅ Done: ${receipt.hash.slice(0,10)}...`);
  
  return receipt;
}

async function executeArbitrage(buyPool, sellPool, amountInETH, estimatedProfit) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`🚀 EXECUTING ARBITRAGE #${Date.now()}`);
  console.log(`${"=".repeat(70)}`);
  
  const startTime = Date.now();
  
  try {
    // Get starting balances
    const wethContract = new ethers.Contract(WETH, ERC20_ABI, wallet);
    const usdcContract = new ethers.Contract(USDC, ERC20_ABI, wallet);
    
    const startWETH = await wethContract.balanceOf(wallet.address);
    const startUSDC = await usdcContract.balanceOf(wallet.address);
    
    console.log(`📊 Starting: ${ethers.formatEther(startWETH)} WETH, ${ethers.formatUnits(startUSDC, 6)} USDC`);
    
    const amountInWei = ethers.parseEther(amountInETH.toString());
    
    // Step 1: Buy USDC
    console.log(`\n📍 Step 1: Buy USDC on ${buyPool.name}`);
    const minUSDC = ethers.parseUnits((amountInETH * 2000 * (1 - SLIPPAGE)).toFixed(0), 6); // Generous slippage
    
    if (buyPool.type === "v3") {
      await executeUniswapV3Swap(buyPool, WETH, USDC, amountInWei, minUSDC);
    } else {
      await executeAerodromeSwap(WETH, USDC, amountInWei, minUSDC);
    }
    
    const midUSDC = await usdcContract.balanceOf(wallet.address);
    const usdcGained = midUSDC - startUSDC;
    console.log(`  💰 Got ${ethers.formatUnits(usdcGained, 6)} USDC`);
    
    // Step 2: Sell USDC
    console.log(`\n📍 Step 2: Sell USDC on ${sellPool.name}`);
    const minWETH = ethers.parseEther((amountInETH * (1 - SLIPPAGE)).toString()); // Generous slippage
    
    if (sellPool.type === "v3") {
      await executeUniswapV3Swap(sellPool, USDC, WETH, usdcGained, minWETH);
    } else {
      await executeAerodromeSwap(USDC, WETH, usdcGained, minWETH);
    }
    
    // Final balances
    const endWETH = await wethContract.balanceOf(wallet.address);
    const endUSDC = await usdcContract.balanceOf(wallet.address);
    
    const wethProfit = endWETH - startWETH;
    const wethProfitNum = Number(ethers.formatEther(wethProfit));
    const usdProfit = wethProfitNum * 2100; // approximate
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`\n📊 Final: ${ethers.formatEther(endWETH)} WETH, ${ethers.formatUnits(endUSDC, 6)} USDC`);
    console.log(`\n💰 PROFIT: ${wethProfitNum > 0 ? '+' : ''}${wethProfitNum.toFixed(6)} WETH ($${usdProfit.toFixed(4)})`);
    console.log(`⏱️  Time: ${elapsed}s`);
    console.log(`${"=".repeat(70)}\n`);
    
    if (usdProfit >= 0.01) {
      console.log(`🎉 YOU GOT YOUR FIRST PENNY! 🎉\n`);
    }
    
  } catch (error) {
    console.log(`\n❌ ERROR: ${error.message}`);
    console.log(`${"=".repeat(70)}\n`);
  }
}

async function main() {
  console.log("\n🚀 Base Arb Bot - LIVE EXECUTION MODE\n");
  console.log("=".repeat(60));
  console.log(`Wallet: ${wallet.address}`);
  console.log(`Trade size: ${TRADE_SIZE_ETH} ETH (~$${(TRADE_SIZE_ETH * 2100).toFixed(2)})`);
  console.log(`Min profit: $${MIN_PROFIT_USD}`);
  console.log(`Auto-execute: ${AUTO_EXECUTE ? '✅ YES' : '❌ NO (monitor only)'}`);
  console.log("=".repeat(60) + "\n");
  
  // Check balances
  const ethBalance = await provider.getBalance(wallet.address);
  const wethContract = new ethers.Contract(WETH, ERC20_ABI, wallet);
  const wethBalance = await wethContract.balanceOf(wallet.address);
  
  console.log(`💰 ETH: ${ethers.formatEther(ethBalance)}`);
  console.log(`💰 WETH: ${ethers.formatEther(wethBalance)}\n`);
  
  if (wethBalance < ethers.parseEther(TRADE_SIZE_ETH.toString())) {
    console.log(`⚠️  Need ${TRADE_SIZE_ETH} WETH to trade. Run wrap-eth.cjs first!\n`);
  }
  
  let opportunitiesFound = 0;
  let tradesExecuted = 0;
  
  for (let i = 1; ; i++) {
    try {
      const results = await Promise.all(POOLS.map(async p => {
        return { ...p, price: await getPrice(p) };
      }));
      
      const valid = results.filter(r => r.price > 100 && r.price < 10000);
      
      if (valid.length < 2) { 
        console.log(`#${i} Bad prices (${valid.length}/3 valid)`); 
        await sleep(2000); 
        continue; 
      }
      
      const str = valid.map(p => `${p.name}:$${p.price.toFixed(2)}`).join(" | ");
      const minPrice = Math.min(...valid.map(p => p.price));
      const maxPrice = Math.max(...valid.map(p => p.price));
      const spread = (maxPrice - minPrice) / minPrice;
      
      const COST = 0.002;
      const net = spread - COST;
      const profit = (TRADE_SIZE_ETH * minPrice * net) - 0.002;
      
      console.log(`#${i} | ${str} | ${(spread*100).toFixed(3)}% | $${profit.toFixed(4)}`);
      
      if (profit >= MIN_PROFIT_USD) {
        opportunitiesFound++;
        const buyPool = valid.find(p => p.price === minPrice);
        const sellPool = valid.find(p => p.price === maxPrice);
        
        console.log(`\n${"=".repeat(60)}`);
        console.log(`🎯 OPPORTUNITY #${opportunitiesFound} - $${profit.toFixed(4)} profit`);
        console.log(`${"=".repeat(60)}`);
        console.log(`Buy:  ${buyPool.name} @ $${minPrice.toFixed(2)}`);
        console.log(`Sell: ${sellPool.name} @ $${maxPrice.toFixed(2)}`);
        console.log(`Spread: ${(spread*100).toFixed(3)}% | Net: ${(net*100).toFixed(3)}%`);
        
        if (AUTO_EXECUTE) {
          tradesExecuted++;
          await executeArbitrage(buyPool, sellPool, TRADE_SIZE_ETH, profit);
        } else {
          console.log(`\n⚠️  Set AUTO_EXECUTE=true to trade automatically\n`);
        }
      }
      
      if (i % 50 === 0) {
        console.log(`\n📊 Stats: Opportunities: ${opportunitiesFound} | Executed: ${tradesExecuted}\n`);
      }
      
    } catch (e) { 
      console.log(`#${i} ERR: ${e.message.slice(0,50)}`); 
    }
    await sleep(2000);
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
main();
