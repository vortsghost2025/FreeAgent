# REMOVED: sensitive data redacted by automated security cleanup
/**
 * WETH Approval Script
 * Run this to approve the executor contract to spend WETH from your wallet
 * 
 * Usage: node approve-weth.cjs
 */

require('dotenv').config();
const { ethers } = require('ethers');

// Configuration
const WETH_ADDRESS = 'REDACTED_ADDRESS';
const EXECUTOR_ADDRESS = 'REDACTED_ADDRESS';

// ERC20 ABI for approve function
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

async function main() {
  console.log('🔐 WETH Approval Script');
  console.log('========================\n');

  // Check required env vars
  if (!process.env.MAINNET_RPC_URL) {
    console.error('❌ Error: MAINNET_RPC_URL not set in .env');
    process.exit(1);
  }
  if (!process.env.PRIVATE_KEY) {
    console.error('❌ Error: PRIVATE_KEY not set in .env');
    process.exit(1);
  }

  // Connect to network
  const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log('📝 Wallet:', wallet.address);
  console.log('🔗 Network:', (await provider.getNetwork()).name);
  console.log('');

  // Connect to WETH contract
  const weth = new ethers.Contract(WETH_ADDRESS, ERC20_ABI, wallet);

  // Check current allowance
  const currentAllowance = await weth.allowance(wallet.address, EXECUTOR_ADDRESS);
  console.log('💰 Current WETH allowance:', ethers.formatEther(currentAllowance), 'ETH');

  if (currentAllowance > 0n) {
    console.log('✅ Already approved!\n');
    return;
  }

  console.log('📤 Approving executor contract to spend WETH...');
  console.log('   Contract:', EXECUTOR_ADDRESS);
  console.log('');

  try {
    // Set max approval (type(uint256).max)
    const maxApproval = ethers.MaxUint256;
    
    const tx = await weth.approve(EXECUTOR_ADDRESS, maxApproval);
    console.log('📦 Transaction sent:', tx.hash);
    console.log('⏳ Waiting for confirmation...\n');
    
    const receipt = await tx.wait();
    console.log('✅ Approval confirmed in block:', receipt.blockNumber);
    console.log('');
    console.log('🎉 Success! The MEV Swarm bot can now execute trades.');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
