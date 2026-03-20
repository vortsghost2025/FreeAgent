require('dotenv').config();
const { ethers } = require('ethers');

// Configuration
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";  // Base USDC
const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";   // Base WETH
const UNISWAP_ROUTER = "0x3fCcC3e1dEeD3b0EFaEE2c5c5d5b12F8C93DD50"; // Base Uniswap V3 Router

const USDC_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

const ROUTER_ABI = [
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) returns (uint256 amountOut)"
];

async function main() {
  if (!PRIVATE_KEY) {
    console.log("Error: PRIVATE_KEY not found in .env");
    console.log("Add: PRIVATE_KEY=0x...");
    return;
  }

  const provider = new ethers.JsonRpcProvider("https://base.llamarpc.com");
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("=== Swapping USDC → WETH on Base ===");
  console.log("Wallet:", wallet.address);

  const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet);
  const router = new ethers.Contract(UNISWAP_ROUTER, ROUTER_ABI, wallet);

  // Check balance
  const balance = await usdc.balanceOf(wallet.address);
  const decimals = await usdc.decimals();
  const balanceFormatted = ethers.formatUnits(balance, decimals);
  
  console.log("USDC Balance:", balanceFormatted);

  if (balance === 0n) {
    console.log("No USDC to swap!");
    return;
  }

  // Approve
  console.log("Approving USDC...");
  const approveTx = await usdc.approve(UNISWAP_ROUTER, balance);
  await approveTx.wait();
  console.log("Approved!");

  // Get WETH price estimate (using simple 1:1 for now - you may want to add price check)
  const amountOutMin = balance; // Set slippage tolerance accordingly

  // Execute swap via Uniswap V3
  console.log("Swapping USDC → WETH...");
  const swapParams = {
    tokenIn: USDC_ADDRESS,
    tokenOut: WETH_ADDRESS,
    fee: 3000, // 0.3% fee tier
    recipient: wallet.address,
    deadline: Math.floor(Date.now() / 1000) + 600, // 10 minutes
    amountIn: balance,
    amountOutMinimum: amountOutMin * 99n / 100n, // 1% slippage
    sqrtPriceLimitX96: 0
  };

  try {
    const tx = await router.exactInputSingle(swapParams);
    console.log("Transaction sent:", tx.hash);
    console.log("Waiting for confirmation...");
    const receipt = await tx.wait();
    console.log("✅ Swap complete! Block:", receipt.blockNumber);
    
    // Check new WETH balance
    const weth = new ethers.Contract(WETH_ADDRESS, ["function balanceOf(address) view returns (uint256)"], provider);
    const wethBalance = await weth.balanceOf(wallet.address);
    console.log("New WETH Balance:", ethers.formatEther(wethBalance), "WETH");
  } catch (err) {
    console.log("Swap failed:", err.message);
  }
}

main();
