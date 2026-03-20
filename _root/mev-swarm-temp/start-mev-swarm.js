import { ethers } from 'ethers';
import 'dotenv/config';

/**
 * MEV SWARM - SIMPLE STARTER
 * No more key hell - just runs with whatever is in .env
 */

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  🚀 MEV SWARM - NO MORE KEY HELL              ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

// Use whatever is in .env
const CONFIG = {
  EXECUTOR_ADDRESS: process.env.EXECUTOR_ADDRESS,
  PRIVATE_KEY: process.env.PRIVATE_KEY,
  RPC_URL: process.env.MAINNET_RPC_URL
};

if (!CONFIG.PRIVATE_KEY || !CONFIG.RPC_URL || !CONFIG.EXECUTOR_ADDRESS) {
  console.log('❌ Missing config - check your .env file');
  console.log('   EXECUTOR_ADDRESS:', CONFIG.EXECUTOR_ADDRESS ? '✅' : '❌');
  console.log('   PRIVATE_KEY:', CONFIG.PRIVATE_KEY ? '✅' : '❌');
  console.log('   RPC_URL:', CONFIG.RPC_URL ? '✅' : '❌');
  process.exit(1);
}

console.log('✅ Configuration found - starting MEV Swarm...\n');

const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
const wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);

console.log('🔧 Wallet: ' + wallet.address);
console.log('🔗 RPC: ' + CONFIG.RPC_URL.split('/')[2]);
console.log('📦 Contract: ' + CONFIG.EXECUTOR_ADDRESS + '\n');

async function checkStatus() {
  try {
    const balance = await provider.getBalance(wallet.address);
    console.log('💰 Balance: ' + ethers.formatEther(balance) + ' ETH\n');

    const contractBalance = await provider.getBalance(CONFIG.EXECUTOR_ADDRESS);
    console.log('💰 Contract: ' + ethers.formatEther(contractBalance) + ' ETH\n');

    console.log('✅ MEV Swarm is ready!');
    console.log('📊 Infrastructure operational');
    console.log('🔒 Security: Private keys in .env only');
    console.log('🚀 Ready to arbitrage\n');

  } catch (error) {
    console.log('❌ Error: ' + error.message);
  }
}

checkStatus();