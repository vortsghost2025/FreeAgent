// mev-pre-signer.cjs - Phase 3: Pre-sign transactions for instant submission
// This component pre-signs arbitrage transactions so they can be submitted instantly
// when the ML model predicts an opportunity

const { ethers } = require("ethers");
require('dotenv').config();

const RPC_URL = process.env.BASE_RPC_URL || "https://base-rpc.publicnode.com";
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Your wallet
if (!process.env.PRIVATE_KEY) {
  console.log("❌ PRIVATE_KEY required in .env");
  process.exit(1);
}

const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Pool addresses (same as data collector)
const POOLS = [
  { name: "UniV3-0.05%", addr: "0xd0b53D9277642d899DF5C87A3966A349A798F224", protocol: "uniswap", fee: 500 },
  { name: "UniV3-0.3%", addr: "0x6c561B446416E1A00E8E93E221854d6eA4171372", protocol: "uniswap", fee: 3000 },
  { name: "Aero-vol", addr: "0xcDAC0d6c6C59727a65F871236188350531885C43", protocol: "v2" }
];

const WETH = "0x4200000000000000000000000000000000000006";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

const UNISWAP_V3_ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481";
const AERODROME_ROUTER = "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43";

const TRADE_SIZE_ETH = 0.0015;
const MIN_PROFIT_USD = 0.01;

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
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata routes, address to, uint deadline) external returns (uint[] memory amounts)"
];

// Price fetching
async function getV3Price(poolAddr) {
  const c = new ethers.Contract(poolAddr, [
    "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)"
  ], provider);
  const s = await c.slot0();
  const sqrtPrice = Number(s[0]) / (2 ** 96);
  return (sqrtPrice * sqrtPrice) * (10 ** 12);
}

async function getAerodromePrice(poolAddr) {
  const c = new ethers.Contract(poolAddr, [
    "function getReserves() view returns (uint256 reserve0, uint256 reserve1, uint256 blockTimestampLast)"
  ], provider);
  const r = await c.getReserves();
  return Number(ethers.formatUnits(r[1], 6)) / Number(ethers.formatEther(r[0]));
}

async function getPrice(pool) {
  try {
    if (pool.protocol === "uniswap") return await getV3Price(pool.addr);
    else return await getAerodromePrice(pool.addr);
  } catch (e) { return 0; }
}

// Approval check
async function ensureApproval(tokenAddr, spender, amount) {
  const token = new ethers.Contract(tokenAddr, ERC20_ABI, wallet);
  const allowance = await token.allowance(wallet.address, spender);
  if (allowance < amount) {
    console.log(`  📝 Approving ${spender === UNISWAP_V3_ROUTER ? 'Uniswap' : 'Aerodrome'}...`);
    const tx = await token.approve(spender, ethers.MaxUint256);
    await tx.wait();
    console.log(`  ✅ Approved`);
  }
}

// Build pre-signed transaction for Uniswap
async function buildUniswapTx(buyPool, sellPool, amountInETH) {
  const amountInWei = ethers.parseEther(amountInETH.toString());
  
  // Step 1: WETH -> USDC on buyPool
  await ensureApproval(WETH, UNISWAP_V3_ROUTER, amountInWei);
  
  const minUSDC = ethers.parseUnits((amountInETH * 2100 * 0.98).toFixed(0), 6);
  
  const params1 = {
    tokenIn: WETH,
    tokenOut: USDC,
    fee: buyPool.fee,
    recipient: wallet.address,
    amountIn: amountInWei,
    amountOutMinimum: minUSDC,
    sqrtPriceLimitX96: 0
  };
  
  // Build transaction
  const router = new ethers.Contract(UNISWAP_V3_ROUTER, UNISWAP_ROUTER_ABI, wallet);
  
  // Get gas estimate
  const gasEstimate = await router.exactInputSingle.estimateGas(params1);
  const gasPrice = await provider.getGasPrice();
  
  const tx1 = {
    to: UNISWAP_V3_ROUTER,
    data: router.interface.encodeFunctionData("exactInputSingle", [params1]),
    value: 0,
    gasLimit: Math.floor(gasEstimate * 1.2),
    gasPrice: gasPrice,
    nonce: await provider.getTransactionCount(wallet.address),
    chainId: 8453 // Base
  };
  
  // Sign transaction
  const signedTx1 = await wallet.signTransaction(tx1);
  
  return signedTx1;
}

// Alternative: Simple single-hop swap (more reliable)
async function buildSimpleSwapTx(direction = "buy") {
  const amountInWei = ethers.parseEther(TRADE_SIZE_ETH.toString());
  
  await ensureApproval(WETH, UNISWAP_V3_ROUTER, amountInWei);
  
  // Simple: WETH -> USDC (direction = "buy")
  // Or: USDC -> WETH (direction = "sell")
  
  const params = {
    tokenIn: direction === "buy" ? WETH : USDC,
    tokenOut: direction === "buy" ? USDC : WETH,
    fee: 500, // Use 0.05% fee pool
    recipient: wallet.address,
    amountIn: amountInWei,
    amountOutMinimum: 0, // Will be calculated dynamically
    sqrtPriceLimitX96: 0
  };
  
  const router = new ethers.Contract(UNISWAP_V3_ROUTER, UNISWAP_ROUTER_ABI, wallet);
  const gasEstimate = await router.exactInputSingle.estimateGas(params);
  const gasPrice = await provider.getGasPrice();
  
  const tx = {
    to: UNISWAP_V3_ROUTER,
    data: router.interface.encodeFunctionData("exactInputSingle", [params]),
    value: 0,
    gasLimit: Math.floor(gasEstimate * 1.3),
    gasPrice: gasPrice,
    nonce: await provider.getTransactionCount(wallet.address),
    chainId: 8453
  };
  
  return tx;
}

// Pre-sign and cache transactions
class PreSigner {
  constructor() {
    this.cachedTxs = {};
    this.lastBuildTime = 0;
    this.CACHE_DURATION = 30000; // 30 seconds
  }
  
  async buildCachedTransactions() {
    console.log("\n🎯 Building pre-signed transactions...");
    
    try {
      // Get current prices
      const results = await Promise.all(POOLS.map(async p => ({ ...p, price: await getPrice(p) })));
      const valid = results.filter(r => r.price > 100 && r.price < 10000);
      
      if (valid.length < 2) {
        console.log("  ⚠️  Invalid prices, skipping");
        return;
      }
      
      const minPrice = Math.min(...valid.map(p => p.price));
      const maxPrice = Math.max(...valid.map(p => p.price));
      const spread = (maxPrice - minPrice) / minPrice;
      const profit = TRADE_SIZE_ETH * minPrice * (spread - 0.0015);
      
      console.log(`  Prices: ${valid.map(p => `$${p.price.toFixed(0)}`).join(" | ")}`);
      console.log(`  Spread: ${(spread*100).toFixed(2)}% | Profit: $${profit.toFixed(4)}`);
      
      if (profit >= MIN_PROFIT_USD) {
        const buyPool = valid.find(p => p.price === minPrice);
        const sellPool = valid.find(p => p.price === maxPrice);
        
        console.log(`  ✅ Opportunity: ${buyPool.name} -> ${sellPool.name}`);
        
        // Build pre-signed transaction
        const tx = await buildSimpleSwapTx("buy");
        const signedTx = await wallet.signTransaction(tx);
        
        this.cachedTxs.current = {
          signedTx,
          buyPool: buyPool.name,
          sellPool: sellPool.name,
          profit,
          createdAt: Date.now()
        };
        
        console.log(`  ✅ Pre-signed tx cached!`);
        console.log(`     Nonce: ${tx.nonce}`);
        console.log(`     Gas: ${tx.gasLimit}`);
        
        this.lastBuildTime = Date.now();
      }
      
    } catch (e) {
      console.log(`  ❌ Error: ${e.message.slice(0, 100)}`);
    }
  }
  
  getCachedTransaction() {
    if (!this.cachedTxs.current) return null;
    
    const age = Date.now() - this.cachedTxs.current.createdAt;
    if (age > this.CACHE_DURATION) {
      console.log(`  ⏰ Cached tx expired (${Math.floor(age/1000)}s old)`);
      return null;
    }
    
    return this.cachedTxs.current;
  }
  
  async submitCachedTransaction() {
    const cached = this.getCachedTransaction();
    if (!cached) {
      console.log("❌ No valid cached transaction");
      return null;
    }
    
    try {
      console.log(`\n🚀 Submitting pre-signed transaction...`);
      console.log(`   Strategy: ${cached.buyPool} -> ${cached.sellPool}`);
      console.log(`   Expected profit: $${cached.profit.toFixed(4)}`);
      
      const tx = await provider.broadcastTransaction(cached.signedTx);
      console.log(`   📝 Transaction submitted: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);
      
      // Invalidate cache after use
      this.cachedTxs.current = null;
      
      return receipt;
    } catch (e) {
      console.log(`   ❌ Failed: ${e.message.slice(0, 100)}`);
      return null;
    }
  }
}

// Main loop
async function main() {
  console.log("=".repeat(60));
  console.log("🎯 MEV Pre-Signer - Phase 3");
  console.log("=".repeat(60));
  console.log(`\nWallet: ${wallet.address}`);
  console.log(`Trade size: ${TRADE_SIZE_ETH} ETH`);
  console.log(`Min profit: $${MIN_PROFIT_USD}`);
  
  // Check WETH balance
  const weth = new ethers.Contract(WETH, ERC20_ABI, wallet);
  const wethBalance = await weth.balanceOf(wallet.address);
  console.log(`WETH Balance: ${ethers.formatEther(wethBalance)}`);
  
  if (Number(ethers.formatEther(wethBalance)) < TRADE_SIZE_ETH) {
    console.log(`\n❌ Insufficient WETH balance! Need at least ${TRADE_SIZE_ETH} ETH`);
    process.exit(1);
  }
  
  const preSigner = new PreSigner();
  
  // Build initial transactions
  await preSigner.buildCachedTransactions();
  
  console.log("\n🔄 Starting pre-signer loop...");
  console.log("Press Ctrl+C to stop\n");
  
  let iteration = 0;
  
  while (true) {
    iteration++;
    
    // Rebuild every 30 seconds
    if (Date.now() - preSigner.lastBuildTime > 30000) {
      await preSigner.buildCachedTransactions();
    }
    
    // Check for submission (would be triggered by ML predictor in real system)
    if (iteration % 10 === 0) {
      const cached = preSigner.getCachedTransaction();
      if (cached) {
        console.log(`#${iteration} | Cached tx ready | ${cached.buyPool}->${cached.sellPool} | $${cached.profit.toFixed(4)}`);
      }
    }
    
    await new Promise(r => setTimeout(r, 1000));
  }
}

main().catch(console.error);
