const { ethers } = require("ethers");
require('dotenv').config();

const RPC_URL = "https://base-rpc.publicnode.com";
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const WETH = "0x4200000000000000000000000000000000000006";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const UNISWAP_V3_ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481";

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)"
];

const ROUTER_ABI = [
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)"
];

async function recoverUSDC() {
  console.log("\n🔧 Recovering USDC...\n");
  
  const usdcContract = new ethers.Contract(USDC, ERC20_ABI, wallet);
  const balance = await usdcContract.balanceOf(wallet.address);
  
  console.log(`USDC to recover: ${ethers.formatUnits(balance, 6)}`);
  
  if (balance == 0n) {
    console.log("Nothing to recover!");
    return;
  }
  
  // Approve
  console.log("\n📝 Approving Uniswap...");
  const approveTx = await usdcContract.approve(UNISWAP_V3_ROUTER, balance);
  await approveTx.wait();
  console.log("✅ Approved");
  
  // Swap USDC → WETH on Uniswap 0.05% pool
  const router = new ethers.Contract(UNISWAP_V3_ROUTER, ROUTER_ABI, wallet);
  
  const params = {
    tokenIn: USDC,
    tokenOut: WETH,
    fee: 500, // 0.05% pool
    recipient: wallet.address,
    amountIn: balance,
    amountOutMinimum: 0, // Accept any amount (we're recovering)
    sqrtPriceLimitX96: 0
  };
  
  console.log("\n🔄 Swapping USDC → WETH...");
  const tx = await router.exactInputSingle(params, { gasLimit: 500000 });
  console.log(`TX: ${tx.hash}`);
  
  const receipt = await tx.wait();
  console.log(`✅ Recovered! ${receipt.hash}`);
  
  // Check new balance
  const wethContract = new ethers.Contract(WETH, ERC20_ABI, wallet);
  const wethBal = await wethContract.balanceOf(wallet.address);
  console.log(`\n💰 New WETH balance: ${ethers.formatEther(wethBal)}\n`);
}

recoverUSDC().catch(console.error);
