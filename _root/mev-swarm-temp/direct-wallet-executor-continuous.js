# REMOVED: sensitive data redacted by automated security cleanup
import { ethers } from 'ethers';
import 'dotenv/config';
import { initSecurity, getPrivateKey } from './security-guard.js';

/**
 * Direct Wallet Executor - Continuous Mode
 * Executes arbitrage directly from wallet with continuous scanning
 *
 * Safety Features:
 * - WETH contract always initialized
 * - Net-profit guardrail before every trade
 * - DRY_RUN enforcement prevents live trading
 * - Continuous scanning every 5 seconds
 */

const UNISWAP_V2_ROUTER = 'REDACTED_ADDRESS';
const WETH_ADDRESS = 'REDACTED_ADDRESS';

const ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)'
];

const WETH_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function deposit() external payable',
  'function balanceOf(address) external view returns (uint256)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function deposit() external payable'
];

const USDC_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address) external view returns (uint256)'
];

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║        MEV SWARM - CONTINUOUS DIRECT EXECUTOR           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

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

  console.log(`Wallet: ${wallet.address}`);
  console.log(`Scan Interval: 5 seconds\n`);

  // 🔴 CRITICAL FIX #1: Always initialize WETH contract
  const weth = new ethers.Contract(WETH_ADDRESS, ERC20_ABI, wallet);

  // 🔴 CRITICAL FIX #2: Use WETH contract for balance checks
  const wethBalance = async () => await weth.balanceOf(wallet.address);

  let balance = await wethBalance();
  const ethUsd = Number(process.env.ETH_PRICE_USD || '2000');
  console.log(`WETH Balance: ${ethers.formatEther(balance)} WETH`);

  const USDC_ADDRESS = 'REDACTED_ADDRESS';
  const router = new ethers.Contract(UNISWAP_V2_ROUTER, ROUTER_ABI, wallet);

  // Continuous scanning loop
  const SCAN_INTERVAL = 5000; // 5 seconds
  let cycleCount = 0;
  let stats = { blocked: 0, passed: 0, errors: 0 };

  console.log('\n🚀 Starting continuous scanning...\n');

  while (true) {
    cycleCount++;
    console.log(`\n═══ CYCLE #${cycleCount} ═══`);
    console.log(`Stats: ${stats.blocked} blocked, ${stats.passed} passed, ${stats.errors} errors`);

    try {
      const amountIn = ethers.parseEther('0.001');
      const path = [WETH_ADDRESS, USDC_ADDRESS];

      console.log('🔄 Getting router quote...');
      const amounts = await router.getAmountsOut(amountIn, path);
      const expectedOutput = ethers.formatUnits(amounts[1], 6);
      console.log(`Expected output: ${expectedOutput} USDC\n`);

      // 🔴 CRITICAL FIX #3: Net-profit guardrail
      const amountOutUsdc = Number(ethers.formatUnits(amounts[1], 6));
      const tradeValueUsd = Number(ethers.formatEther(amountIn)) * ethUsd;
      const receivedUsd = amountOutUsdc;
      const expectedProfitUsd = receivedUsd - tradeValueUsd;

      const feeData = await provider.getFeeData();
      const estimatedGas = 100000n;
      const gasPrice = feeData.gasPrice || feeData.maxFeePerGas || 0n;
      const estimatedGasCostWei = estimatedGas * gasPrice;
      const estimatedGasUsd = Number(ethers.formatEther(estimatedGasCostWei)) * ethUsd;
      const estimatedFeesUsd = tradeValueUsd * 0.003;

      const netExpected = expectedProfitUsd - (estimatedGasUsd + estimatedFeesUsd);

      console.log(`Profit check → gross: $${expectedProfitUsd.toFixed(4)}, gas+fees: $${(estimatedGasUsd + estimatedFeesUsd).toFixed(4)}, net: $${netExpected.toFixed(4)}`);

      if (netExpected <= 0) {
        stats.blocked++;
        console.log('⛔ BLOCKED: Net profit negative after gas/fees');
      } else {
        console.log('✅ PASS: Net profit positive\n');

        // 🔒 DRY_RUN ENFORCEMENT
        if (DRY_RUN) {
          stats.passed++;
          if (balance < amountIn) {
            console.log('⚠️  Live mode would require WETH balance top-up or wrap before execution');
          }
          console.log('⚡ Executing swap... (SIMULATION)');
          console.log('🔒 [DRY_RUN] Trade would have executed, but prevented by safety mode');
          console.log('💰 Simulated result:');
          console.log(`   WETH spent: 0.001 ETH`);
          console.log(`   USDC received: ${expectedOutput} USDC`);
        } else {
          const ethBalance = await provider.getBalance(wallet.address);
          if (balance < amountIn) {
            const need = amountIn - balance;
            if (ethBalance < need) {
              throw new Error('Insufficient ETH to wrap into WETH for live execution');
            }

            console.log(`🔄 Wrapping ${ethers.formatEther(need)} ETH to WETH...`);
            const wrapTx = await weth.deposit({ value: need });
            console.log(`Wrap tx: ${wrapTx.hash}`);
            await wrapTx.wait();
            balance = await wethBalance();
            console.log('✅ Wrapped successfully!\n');
          }

          const allowance = await weth.allowance(wallet.address, UNISWAP_V2_ROUTER);
          if (allowance < amountIn) {
            console.log('🔄 Approving Uniswap V2 router...');
            const approveTx = await weth.approve(UNISWAP_V2_ROUTER, amountIn);
            console.log(`Approve tx: ${approveTx.hash}`);
            await approveTx.wait();
            console.log('✅ Approved!\n');
          }

          console.log('⚡ Executing swap... (LIVE MODE)\n');

          const swapTx = await router.swapExactTokensForTokens(
            amountIn,
            0, // No slippage protection
            path,
            wallet.address,
            Math.floor(Date.now() / 1000) + 3600
          );

          console.log(`Swap tx: ${swapTx.hash}`);
          console.log('⏳ Waiting for confirmation...');

          const receipt = await swapTx.wait();
          console.log(`✅ Confirmed in block ${receipt.blockNumber}`);
          console.log(`Gas used: ${receipt.gasUsed.toString()}`);

          balance = await wethBalance();
          stats.passed++;
          console.log('💰 New WETH Balance:', ethers.formatEther(balance));
        }
      }

    } catch (error) {
      stats.errors++;
      console.log(`❌ Cycle error: ${error.message}`);
    }

    console.log(`   Next scan in ${SCAN_INTERVAL/1000} seconds...\n`);
    await new Promise(resolve => setTimeout(resolve, SCAN_INTERVAL));
  }
}

main().catch(console.error);
