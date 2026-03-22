/**
 * Withdraw Funds from MEV Swarm Contract
 * Run: node mev-swarm/withdraw-funds.js
 */

require('dotenv').config();
const { ethers } = require('ethers');

const CONTRACT_ADDRESS = '0x4fF5eF5d185195173b0B178eDe4A7679E7De272f';
const RPC_URL = process.env.ETHEREUM_RPC_URL || process.env.MAINNET_RPC_URL;

async function withdraw() {
  console.log('🔄 Connecting to Ethereum...');
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log('📋 Wallet:', wallet.address);
  
  // Check contract ETH balance
  const contractBalance = await provider.getBalance(CONTRACT_ADDRESS);
  console.log('💰 Contract balance:', ethers.formatEther(contractBalance), 'ETH');
  
  if (contractBalance === 0n) {
    console.log('❌ Contract has no ETH to withdraw');
    return;
  }
  
  // ABI for withdrawETH function
  const abi = ['function withdrawETH() external'];
  const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);
  
  console.log('📤 Calling withdrawETH()...');
  
  try {
    const tx = await contract.withdrawETH();
    console.log('⏳ Transaction sent:', tx.hash);
    console.log('📝 Waiting for confirmation...');
    
    await tx.wait();
    console.log('✅ Withdrawal successful!');
    
    // Check new wallet balance
    const newBalance = await provider.getBalance(wallet.address);
    console.log('💰 New wallet balance:', ethers.formatEther(newBalance), 'ETH');
    
  } catch (error) {
    console.error('❌ Withdrawal failed:', error.message);
  }
}

withdraw();
