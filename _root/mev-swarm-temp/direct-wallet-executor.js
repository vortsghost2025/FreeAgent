import { ethers } from 'ethers';
import 'dotenv/config';
import { initSecurity, getPrivateKey } from './security-guard.js';

/**
 * Direct Wallet Executor - Executes arbitrage directly from wallet
 * Bypasses the contract entirely for immediate testing
 */

const UNISWAP_V2_ROUTER = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

const ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
  'function swapTokensForExactTokens(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)'
];

const WETH_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function deposit() external payable',
  'function balanceOf(address) external view returns (uint256)'
];

// ERC20_ABI for consistent balance checks
const ERC20_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

const USDC_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address) external view returns (uint256)'
];

async function main() {
  console.log('🚀 Direct Wallet Executor');
  console.log('==========================\n');

  const security = initSecurity();
  const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL || process.env.ETHEREUM_RPC_URL);
  const wallet = new ethers.Wallet(getPrivateKey(), provider);

  // 🔒 DRY_RUN SAFETY CHECK
  const DRY_RUN = process.env.DRY_RUN !== 'false' || !security.isLive;
  if (DRY_RUN) {
    console.log('🔒 DRY RUN MODE ENABLED - No real trades will execute\n');
  } else {
    console.warn('\n⚠️  WARNING: LIVE TRADING MODE ENABLED ⚠️');
    console.warn('    Set DRY_RUN=true to run in simulation mode\n');
  }

  console.log('Wallet:', wallet.address);

  // 🔴 CRITICAL FIX #1: Always initialize WETH contract
  const weth = new ethers.Contract(WETH_ADDRESS, ERC20_ABI, wallet);

  // Check balances
  const ethBalance = await provider.getBalance(wallet.address);

  // 🔴 CRITICAL FIX #2: Use WETH contract for balance checks
  const wethBalance = await weth.balanceOf(wallet.address);

  console.log('ETH Balance:', ethers.formatEther(ethBalance), 'ETH');
  console.log('WETH Balance:', ethers.formatEther(wethBalance), 'WETH');
  console.log('');

  // Test swap: WETH -> USDC
  const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  const router = new ethers.Contract(UNISWAP_V2_ROUTER, ROUTER_ABI, wallet);

  console.log('🔄 Testing swap: WETH -> USDC');
  console.log('Amount: 0.001 WETH');

  const path = [WETH_ADDRESS, USDC_ADDRESS];
  const amountIn = ethers.parseEther('0.001');

  // Get expected output
  const amounts = await router.getAmountsOut(amountIn, path);
  console.log('Expected output:', ethers.formatUnits(amounts[1], 6), 'USDC');
  console.log('');

  // 🔴 CRITICAL FIX #3: Net-profit guardrail
  // Use actual router quote for realistic profit calculation
  const amountOutUsdc = Number(ethers.formatUnits(amounts[1], 6));
  const ethUsd = Number(process.env.ETH_PRICE_USD || '2000');
  const tradeValueUsd = Number(ethers.formatEther(amountIn)) * ethUsd;
  const receivedUsd = amountOutUsdc;
  const expectedProfitUsd = receivedUsd - tradeValueUsd;

  const feeData = await provider.getFeeData();
  const estimatedGas = 100000n;
  const gasPrice = feeData.gasPrice || feeData.maxFeePerGas || 0n;
  const estimatedGasCostWei = estimatedGas * gasPrice;
  const estimatedGasUsd = Number(ethers.formatEther(estimatedGasCostWei)) * ethUsd;

  const estimatedFeesUsd = tradeValueUsd * 0.003; // 0.3% DEX fee

  const netExpected = expectedProfitUsd - (estimatedGasUsd + estimatedFeesUsd);

  console.log(`Profit check → gross: $${expectedProfitUsd.toFixed(4)}, gas+fees: $${(estimatedGasUsd + estimatedFeesUsd).toFixed(4)}, net: $${netExpected.toFixed(4)}`);

  if (netExpected <= 0) {
    console.log('⛔ BLOCKED: Net profit negative after gas/fees');
    return;
  }

  console.log('✅ PASS: Net profit positive');
  console.log('');

  // 🔒 DRY_RUN ENFORCEMENT: Never execute real trades unless explicitly disabled
  if (DRY_RUN) {
    if (wethBalance < amountIn) {
      console.log('⚠️  Live mode would require WETH balance top-up or wrap before execution');
    }
    console.log('⚡ Executing swap... (SIMULATION)');
    console.log('🔒 [DRY_RUN] Trade would have executed, but prevented by safety mode');
    console.log('   Set DRY_RUN=false in .env to enable live trading\n');
    console.log('💰 Simulated balances would be:');
    console.log('   WETH:', ethers.formatEther(wethBalance > amountIn ? wethBalance - amountIn : 0n), '(post-trade estimate)');
    console.log('   USDC:', ethers.formatUnits(amounts[1], 6), '(received)');
    return;
  }

  if (wethBalance < amountIn) {
    const need = amountIn - wethBalance;
    if (ethBalance < need) {
      throw new Error('Insufficient ETH to wrap into WETH for live execution');
    }

    console.log(`🔄 Wrapping ${ethers.formatEther(need)} ETH to WETH...`);
    const wrapTx = await weth.deposit({ value: need });
    console.log('Wrap tx:', wrapTx.hash);
    await wrapTx.wait();
    console.log('✅ Wrapped successfully!\n');
  }

  const allowance = await weth.allowance(wallet.address, UNISWAP_V2_ROUTER);
  if (allowance < amountIn) {
    console.log('🔄 Approving Uniswap V2 router...');
    const approveTx = await weth.approve(UNISWAP_V2_ROUTER, amountIn);
    console.log('Approve tx:', approveTx.hash);
    await approveTx.wait();
    console.log('✅ Approved!\n');
  }

  console.log('⚡ Executing swap... (LIVE MODE)');

  const swapTx = await router.swapExactTokensForTokens(
    amountIn,
    0, // No slippage protection for testing
    path,
    wallet.address,
    Math.floor(Date.now() / 1000) + 3600 // 1 hour deadline
  );

  console.log('Swap tx:', swapTx.hash);
  console.log('⏳ Waiting for confirmation...');

  const receipt = await swapTx.wait();
  console.log('✅ Confirmed in block', receipt.blockNumber);
  console.log('Gas used:', receipt.gasUsed.toString());

  // Check final balances
  const finalWethBalance = await weth.balanceOf(wallet.address);
  const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet);
  const finalUsdcBalance = await usdc.balanceOf(wallet.address);

  console.log('');
  console.log('💰 Final Balances:');
  console.log('WETH:', ethers.formatEther(finalWethBalance), 'WETH');
  console.log('USDC:', ethers.formatUnits(finalUsdcBalance, 6), 'USDC');
}

main().catch(console.error);
