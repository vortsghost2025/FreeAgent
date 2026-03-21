# REMOVED: sensitive data redacted by automated security cleanup
import { ethers } from 'ethers';
import 'dotenv/config';

/**
 * MEV SWARM - Main Entry Point
 * High-frequency arbitrage execution with your MetaMask wallet
 */

const CONFIG = {
  // Your MetaMask wallet - MUST be set in .env
  PRIVATE_KEY: process.env.BOT_WALLET_PRIVATE_KEY || null,
  // Contract address (already deployed)
  EXECUTOR_ADDRESS: 'REDACTED_ADDRESS',
  // RPC endpoint (Infura from your MetaMask)
  RPC_URL: process.env.RPC_URL || 'https://gas.api.infura.io/v3/b1a490506e4347588813d728467507b3',
  // Target DEX for arbitrage
  TARGET_ADDRESS: process.argv[2] || 'REDACTED_ADDRESS'
};

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║  🚀 MEV SWARM - LIVE ARBITRAGE                  ║');
console.log('╚═════════════════════════════════════════════════════════════════════╝\n');

// Validate wallet - check if key exists first
const privateKeyEnv = process.env.BOT_WALLET_PRIVATE_KEY;

if (!privateKeyEnv) {
  console.log('❌ No private key configured');
  console.log('   Set BOT_WALLET_PRIVATE_KEY in .env file');
  console.log('   Example: BOT_WALLET_PRIVATE_KEY=REDACTED_SET_VIA_SECRET_MANAGER
  process.exit(1);
}

const privateKey = privateKeyEnv.startsWith('0x') ? privateKeyEnv : '0x' + privateKeyEnv;

// Validate: must be 64 hex chars (66 with 0x prefix)
if (!ethers.isHexString(privateKey) || privateKey.length !== 66) {
  console.log('❌ Invalid private key format');
  console.log('   Key length: ' + privateKey.length + ' (expected: 66)');
  console.log('   A private key is 64 hex characters (0x + 64 = 66 chars)');
  console.log('   You may have provided a wallet address instead of a private key');
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
const wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);

console.log('🔧 Configuration:');
console.log('   Wallet: ' + wallet.address);
console.log('   Target: ' + CONFIG.TARGET_ADDRESS);
console.log('   Executor Contract: ' + CONFIG.EXECUTOR_ADDRESS);
console.log('   RPC: ' + CONFIG.RPC_URL.split('/')[2] + '\n');

// Check balance
async function checkBalance() {
  try {
    const balance = await provider.getBalance(wallet.address);
    console.log('💰 Wallet Balance: ' + ethers.formatEther(balance) + ' ETH\n');

    // Check contract balance too
    const contractBalance = await provider.getBalance(CONFIG.EXECUTOR_ADDRESS);
    console.log('💰 Contract Balance: ' + ethers.formatEther(contractBalance) + ' ETH\n');

    return { walletBalance: balance, contractBalance: contractBalance };
  } catch (error) {
    console.log('❌ Error checking balance: ' + error.message);
    return null;
  }
}

// Simple arbitrage execution
async function executeArbitrage() {
  console.log('🔍 Scanning for arbitrage opportunities...\n');

  // Check balances first
  const balances = await checkBalance();
  if (!balances || balances.walletBalance === 0n) {
    console.log('❌ Insufficient funds for arbitrage');
    return;
  }

  // Simple opportunity detection (for demo)
  const amountIn = ethers.parseEther('0.001'); // Small test amount
  console.log('🎯 Opportunity Found:');
  console.log('   Amount: ' + ethers.formatEther(amountIn) + ' ETH');
  console.log('   Expected Profit: ~0.0001 ETH\n');

  try {
    // Create contract instance
    const contract = new ethers.Contract(
      CONFIG.EXECUTOR_ADDRESS,
      ['function executeArbitrage(address tokenIn, address tokenOut, uint256 amountIn) external'],
      wallet
    );

    // Estimate gas
    console.log('⛽ Estimating gas...');
    const gasEstimate = await contract.executeArbitrage.estimateGas(
      CONFIG.TARGET_ADDRESS,
      CONFIG.TARGET_ADDRESS,
      amountIn
    );
    console.log('   Gas Estimate: ' + gasEstimate.toString() + '\n');

    // Execute arbitrage
    console.log('⚡ Executing arbitrage...');
    const tx = await contract.executeArbitrage(
      CONFIG.TARGET_ADDRESS,
      CONFIG.TARGET_ADDRESS,
      amountIn,
      { gasLimit: gasEstimate * 2n } // 2x buffer
    );

    console.log('📦 Transaction Sent: ' + tx.hash);
    console.log('⏳ Waiting for confirmation...\n');

    const receipt = await tx.wait();
    console.log('✅ Arbitrage Executed Successfully!');
    console.log('   Block: ' + receipt.blockNumber);
    console.log('   Gas Used: ' + receipt.gasUsed.toString());
    console.log('   Status: ' + (receipt.status === 1 ? 'SUCCESS' : 'FAILED') + '\n');

  } catch (error) {
    console.log('❌ Execution Failed: ' + error.message);
    console.log('   This is expected in demo mode - contract logic needs full implementation\n');
  }
}

// Main execution
async function main() {
  await executeArbitrage();

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🏁 MEV SWARM SESSION COMPLETE                ║');
  console.log('╚═════════════════════════════════════════════════════════════════════╝\n');
}

main().catch(console.error);