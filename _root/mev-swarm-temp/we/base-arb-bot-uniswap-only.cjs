// base-arb-bot-uniswap-only.cjs - Uniswap-only arbitrage (no Aerodrome)
const { ethers } = require("ethers");
require('dotenv').config();

const RPC_URL = process.env.BASE_RPC_URL || "https://base-rpc.publicnode.com";
const provider = new ethers.JsonRpcProvider(RPC_URL);

if (!process.env.PRIVATE_KEY) {
  console.log("❌ Error: PRIVATE_KEY not found in .env");
  process.exit(1);
}

const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Uniswap pools only - both work reliably
const POOLS = [
  { name: "UniV3-0.05%", addr: "0xd0b53D9277642d899DF5C87A3966A349A798F224", fee: 500 },
  { name: "UniV3-0.3%", addr: "0x6c561B446416E1A00E8E93E221854d6eA4171372", fee: 3000 },
];

const WETH = "0x4200000000000000000000000000000000000006";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const UNISWAP_V3_ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481";

const TRADE_SIZE_ETH = 0.008;  // Use 0.008 ETH per trade
const AUTO_EXECUTE = true;
const MIN_PROFIT_USD = 0.001;  // Minimum $0.001 profit

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)"
];

const UNISWAP_ROUTER_ABI = [
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)"
];

// Get V3 price - FIXED version
async function getV3Price(poolAddr) {
  const c = new ethers.Contract(poolAddr, [
    "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
    "function token0() view returns (address)",
    "function token1() view returns (address)"
  ], provider);
  
  const [s, t0, t1] = await Promise.all([
    c.slot0(),
    c.token0(),
    c.token1()
  ]);
  
  const sqrtPriceX96 = s.sqrtPriceX96;
  const sqrtPrice = Number(sqrtPriceX96) / (2 ** 96);
  const price = sqrtPrice * sqrtPrice;
  
  // token0 is WETH, token1 is USDC (for both pools)
  // If reversed, adjust
  const isReversed = t0.toLowerCase() === USDC.toLowerCase();
  
  if (isReversed) {
    return 1 / (price * (10 ** 12));
  }
  return price * (10 ** 12);
}

async function checkAndApprove(tokenAddr, spender, amount) {
  const token = new ethers.Contract(tokenAddr, ERC20_ABI, wallet);
  const allowance = await token.allowance(wallet.address, spender);
  
  if (allowance < amount) {
    console.log(`  📝 Approving...`);
    const tx = await token.approve(spender, ethers.MaxUint256);
    await tx.wait();
    console.log(`  ✅ Approved`);
  }
}

async function executeUniswapSwap(pool, tokenIn, tokenOut, amountIn, minAmountOut) {
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
  
  console.log(`  🔄 Swapping on ${pool.name} (fee: ${pool.fee/100}%)...`);
  const tx = await router.exactInputSingle(params, { gasLimit: 500000 });
  const receipt = await tx.wait();
  console.log(`  ✅ Done: ${receipt.hash.slice(0,16)}...`);
  
  return receipt;
}

async function executeArbitrage(buyPool, sellPool, amountInETH) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`🚀 EXECUTING ARBITRAGE`);
  console.log(`${"=".repeat(70)}`);
  
  const startTime = Date.now();
  
  try {
    const wethContract = new ethers.Contract(WETH, ERC20_ABI, wallet);
    const usdcContract = new ethers.Contract(USDC, ERC20_ABI, wallet);
    
    const startWETH = await wethContract.balanceOf(wallet.address);
    const startUSDC = await usdcContract.balanceOf(wallet.address);
    
    console.log(`📊 Starting: ${ethers.formatEther(startWETH)} WETH, ${ethers.formatUnits(startUSDC, 6)} USDC`);
    
    const amountInWei = ethers.parseEther(amountInETH.toString());
    
    // Step 1: Buy USDC (WETH -> USDC on cheaper pool)
    console.log(`\n📍 Step 1: WETH → USDC on ${buyPool.name}`);
    const minUSDC = ethers.parseUnits((amountInETH * 2100 * 0.97).toFixed(0), 6); // 3% slippage
    
    await executeUniswapSwap(buyPool, WETH, USDC, amountInWei, minUSDC);
    
    const midUSDC = await usdcContract.balanceOf(wallet.address);
    const usdcGained = midUSDC - startUSDC;
    console.log(`  💰 Got ${ethers.formatUnits(usdcGained, 6)} USDC`);
    
    // Step 2: Sell USDC (USDC -> WETH on more expensive pool)
    console.log(`\n📍 Step 2: USDC → WETH on ${sellPool.name}`);
    const minWETH = ethers.parseEther((amountInETH * 0.97).toString()); // 3% slippage
    
    await executeUniswapSwap(sellPool, USDC, WETH, usdcGained, minWETH);
    
    // Final balances
    const endWETH = await wethContract.balanceOf(wallet.address);
    const endUSDC = await usdcContract.balanceOf(wallet.address);
    
    const wethProfit = endWETH - startWETH;
    const wethProfitNum = Number(ethers.formatEther(wethProfit));
    const usdProfit = wethProfitNum * 2100;
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`\n📊 Final: ${ethers.formatEther(endWETH)} WETH, ${ethers.formatUnits(endUSDC, 6)} USDC`);
    console.log(`\n💰 PROFIT: ${wethProfitNum > 0 ? '+' : ''}${wethProfitNum.toFixed(6)} WETH ($${usdProfit.toFixed(4)})`);
    console.log(`⏱️  Time: ${elapsed}s`);
    console.log(`${"=".repeat(70)}\n`);
    
    if (usdProfit >= 0.01) {
      console.log(`🎉 YOU MADE $${usdProfit.toFixed(2)}! 🎉\n`);
    }
    
  } catch (error) {
    console.log(`\n❌ ERROR: ${error.message}`);
    console.log(`${"=".repeat(70)}\n`);
  }
}

async function main() {
  console.log("\n🚀 Base Arb Bot - UNISWAP ONLY MODE\n");
  console.log("=".repeat(60));
  console.log(`Wallet: ${wallet.address}`);
  console.log(`Trade size: ${TRADE_SIZE_ETH} ETH (~$${(TRADE_SIZE_ETH * 2100).toFixed(2)})`);
  console.log(`Min profit: $${MIN_PROFIT_USD}`);
  console.log(`Mode: Uniswap V3 only (0.05% ↔ 0.3% pools)`);
  console.log("=".repeat(60) + "\n");
  
  const ethBalance = await provider.getBalance(wallet.address);
  const wethContract = new ethers.Contract(WETH, ERC20_ABI, wallet);
  const wethBalance = await wethContract.balanceOf(wallet.address);
  
  console.log(`💰 ETH: ${ethers.formatEther(ethBalance)}`);
  console.log(`💰 WETH: ${ethers.formatEther(wethBalance)}\n`);
  
  if (wethBalance < ethers.parseEther(TRADE_SIZE_ETH.toString())) {
    console.log(`⚠️  Need ${TRADE_SIZE_ETH} WETH to trade. Run wrap-eth.cjs!\n`);
    process.exit(1);
  }
  
  let opportunitiesFound = 0;
  let tradesExecuted = 0;
  
  for (let i = 1; ; i++) {
    try {
      const results = await Promise.all(POOLS.map(async p => {
        return { ...p, price: await getV3Price(p.addr) };
      }));
      
      const valid = results.filter(r => r.price > 100 && r.price < 10000);
      
      if (valid.length < 2) { 
        console.log(`#${i} Bad prices (${valid.length}/2 valid)`); 
        await sleep(2000); 
        continue; 
      }
      
      const str = valid.map(p => `${p.name}:$${p.price.toFixed(2)}`).join(" | ");
      const minPrice = Math.min(...valid.map(p => p.price));
      const maxPrice = Math.max(...valid.map(p => p.price));
      const spread = (maxPrice - minPrice) / minPrice;
      
      // Costs: 0.05% + 0.3% = 0.35% + gas ~$0.01
      const COST = 0.004;
      const net = spread - COST;
      const profit = TRADE_SIZE_ETH * minPrice * net;
      
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
          await executeArbitrage(buyPool, sellPool, TRADE_SIZE_ETH);
        } else {
          console.log(`\n⚠️  Set AUTO_EXECUTE=true to trade\n`);
        }
      }
      
      if (i % 50 === 0) {
        console.log(`\n📊 Stats: Opportunities: ${opportunitiesFound} | Executed: ${tradesExecuted}\n`);
      }
      
    } catch (e) { 
      console.log(`#${i} ERR: ${e.message.slice(0,80)}`); 
    }
    await sleep(2000);
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
main();
