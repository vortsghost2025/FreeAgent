// test-aerodrome-swap.cjs - Debug Aerodrome swap issues
const { ethers } = require("ethers");
require('dotenv').config();

const RPC_URL = "https://base-rpc.publicnode.com";
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const WETH = "0x4200000000000000000000000000000000000006";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Try different Aerodrome router addresses
const AERODROME_ROUTERS = [
  "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43", // Current
  "0x1a7b5ccb7e5e5a8d7e2d0e3b5c5e5d0e2d0e3b", // Need to find actual one
];

// Aerodrome stable pool Router
const AERODROME_ROUTER_V2 = "0x8f175d774d3d5d2c0f3d5e5d0e2d0e3b5c5e5a8";

// Let's check the Aerodrome pool directly
const AERODROME_POOL = "0xcDAC0d6c6C59727a65F871236188350531885C43";

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)"
];

async function main() {
  console.log("🔍 Debugging Aerodrome...\n");
  
  // Check pool info
  const pool = new ethers.Contract(AERODROME_POOL, [
    "function token0() view returns (address)",
    "function token1() view returns (address)",
    "function getReserves() view returns (uint256 reserve0, uint256 reserve1, uint256 blockTimestampLast)"
  ], provider);
  
  try {
    const [t0, t1, reserves] = await Promise.all([
      pool.token0(),
      pool.token1(),
      pool.getReserves()
    ]);
    
    console.log(`Pool: ${AERODROME_POOL}`);
    console.log(`Token0: ${t0}`);
    console.log(`Token1: ${t1}`);
    console.log(`Reserves0: ${reserves[0]}`);
    console.log(`Reserves1: ${reserves[1]}`);
    
    // Calculate price
    const reserve0 = Number(ethers.formatEther(reserves[0]));
    const reserve1 = Number(ethers.formatUnits(reserves[1], 6));
    const price = reserve1 / reserve0;
    
    console.log(`\nPrice (USDC per WETH): $${price.toFixed(2)}`);
    
    // Check which token is which
    const isWETHFirst = t0.toLowerCase() === WETH.toLowerCase();
    console.log(`WETH is token0: ${isWETHFirst}`);
    
  } catch (e) {
    console.log(`Error: ${e.message}`);
  }
  
  // Now test a small swap on Aerodrome
  console.log("\n--- Testing Aerodrome Swap ---\n");
  
  // First check WETH balance
  const weth = new ethers.Contract(WETH, ERC20_ABI, wallet);
  const wethBal = await weth.balanceOf(wallet.address);
  console.log(`WETH Balance: ${ethers.formatEther(wethBal)}`);
  
  if (wethBal < ethers.parseEther("0.001")) {
    console.log("Not enough WETH to test!");
    return;
  }
  
  // Try using the swapExactTokensForTokens on the router
  const routerABI = [
    "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, tuple(address from, address to, bool stable)[] routes, address to, uint deadline) external returns (uint[] amounts)"
  ];
  
  const router = new ethers.Contract(AERODROME_ROUTERS[0], routerABI, wallet);
  
  // Check allowance
  const allowance = await weth.allowanceOf(wallet.address, AERODROME_ROUTERS[0]);
  console.log(`WETH Allowance for router: ${allowance}`);
  
  if (allowance < ethers.parseEther("0.001")) {
    console.log("Approving WETH...");
    const tx = await weth.approve(AERODROME_ROUTERS[0], ethers.MaxUint256);
    await tx.wait();
    console.log("Approved!");
  }
  
  // Try the swap
  const amountIn = ethers.parseEther("0.001");
  const routes = [{
    from: WETH,
    to: USDC,
    stable: false
  }];
  
  console.log(`Trying to swap ${ethers.formatEther(amountIn)} WETH for USDC...`);
  
  try {
    const deadline = Math.floor(Date.now() / 1000) + 60 * 10;
    const tx = await router.swapExactTokensForTokens(
      amountIn,
      0, // Accept any amount
      routes,
      wallet.address,
      deadline,
      { gasLimit: 300000 }
    );
    console.log(`TX: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Success! ${receipt.hash}`);
  } catch (e) {
    console.log(`❌ Error: ${e.message}`);
    console.log(`\nThis is why Aerodrome swaps are failing!`);
  }
}

main().catch(console.error);
