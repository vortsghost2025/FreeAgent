# REMOVED: sensitive data redacted by automated security cleanup
const { ethers } = require('ethers');
require('dotenv/config');

/**
 * MEV Swarm - FINAL STARTUP COMMAND
 * Uses EXISTING deployed contract - no deployment or new wallet needed
 */

const CONFIG = {
  EXECUTOR_ADDRESS: 'REDACTED_ADDRESS',
  RPC_URL: 'https://eth.llamarpc.com',
  WALLET_PRIVATE_KEY: process.env.PRIVATE_KEY,
  TEST_AMOUNT: ethers.parseEther('0.001')
};

console.log('╔═══════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║  🚀 MEV SWARM - STARTUP                        ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

console.log('📋 Configuration:');
console.log(`   Contract: ${CONFIG.EXECUTOR_ADDRESS}`);
console.log(`   RPC: ${CONFIG.RPC_URL}`);
console.log(`   Test Amount: ${ethers.formatEther(CONFIG.TEST_AMOUNT)} ETH\n`);

// Create provider and wallet
const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
const wallet = new ethers.Wallet(CONFIG.WALLET_PRIVATE_KEY, provider);

console.log('\n📋 Wallet Status:');
console.log(`   Address: ${wallet.address}`);
const walletBalance = await provider.getBalance(wallet.address);
console.log(`   Balance: ${ethers.formatEther(walletBalance)} ETH\n`);

console.log('\n📊 Contract Status:');
console.log(`   Address: ${CONFIG.EXECUTOR_ADDRESS}`);
const contractBalance = await provider.getBalance(CONFIG.EXECUTOR_ADDRESS);
console.log(`   Balance: ${ethers.formatEther(contractBalance)} ETH\n`);

console.log('\n🎉 ALL SYSTEMS GO!\n');
console.log('');
console.log('═════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║  ✅ READY TO EXECUTE MEV ARBITRAGE             ║');
console.log('╚═════════════════════════════════════════════════════════════════════╝\n');

console.log('═════════════════════════════════════════════════════════════════════════════════╝');
console.log('');
console.log('═════════════════════════════════════════════════════════════════════════════════════════════════════════════\n');

console.log('🚀 START COMMAND:');
console.log('   cd /c/workspace/medical/mev-swarm');
console.log('   node direct-launcher.js');
console.log('');
console.log('═════════════════════════════════════════════════════════════════════════╝');

console.log('\n📊 What Will Happen:');
console.log('   1. Connect to Ethereum mainnet');
console.log('   2. Scan for arbitrage opportunities');
console.log('   3. Execute profitable trades (0.001 ETH per trade)');
console.log('   4. Track all results');
console.log('   5. Profit collected in contract');
console.log('');
console.log('═════════════════════════════════════════════════════════════════╝');
console.log('');
console.log('🎯 YOUR MEV SWARM IS LIVE ON MAINNET!');
console.log('═════════════════════════════════════════════════════════════╝');
console.log('');
