/**
 * Withdraw Funds from MEV Swarm Contract
 * Run: node mev-swarm/withdraw-funds.cjs
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
  
  // Check wallet ETH balance
  const walletBalance = await provider.getBalance(wallet.address);
  console.log('💰 Wallet balance:', ethers.formatEther(walletBalance), 'ETH');
  
  // Check contract ETH balance
  const contractBalance = await provider.getBalance(CONTRACT_ADDRESS);
  console.log('💰 Contract balance:', ethers.formatEther(contractBalance), 'ETH');
  
  if (contractBalance === 0n) {
    console.log('❌ Contract has no ETH to withdraw');
    return;
  }
  
  if (walletBalance < 100000000000000n) { // Less than 0.0001 ETH
    console.log('❌ Wallet does not have enough ETH for gas');
    console.log('Need at least 0.0001 ETH for gas, have:', ethers.formatEther(walletBalance));
    return;
  }
  
  // ABI for withdrawETH function
  const abi = ['function withdrawETH() external'];
  const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);
  
  console.log('📤 Calling withdrawETH()...');
  
  try {
    // Use minimal gas settings
    const feeData = await provider.getFeeData();
    console.log('📊 Current gas info:', {
      maxFeePerGas: ethers.formatUnits(feeData.maxFeePerGas || 0n, 'gwei'),
      maxPriorityFeePerGas: ethers.formatUnits(feeData.maxPriorityFeePerGas || 0n, 'gwei')
    });
    
    // Use lower gas to fit in wallet balance
    const gasLimit = 100000; // Lower estimate
    const maxFeePerGas = BigInt(10000000000); // 10 gwei
    const maxPriorityFeePerGas = BigInt(1000000000); // 1 gwei
    
    const tx = await contract.withdrawETH({
      gasLimit: gasLimit,
      maxFeePerGas: maxFeePerGas,
      maxPriorityFeePerGas: maxPriorityFeePerGas
    });
    
    console.log('⏳ Transaction sent:', tx.hash);
    console.log('📝 Waiting for confirmation...');
    
    const receipt = await tx.wait();
    console.log('✅ Withdrawal successful!');
    console.log('📋 Gas used:', receipt.gasUsed);
    
    // Check new wallet balance
    const newBalance = await provider.getBalance(wallet.address);
    console.log('💰 New wallet balance:', ethers.formatEther(newBalance), 'ETH');
    
  } catch (error) {
    console.error('❌ Withdrawal failed:', error.message);
  }
}

withdraw();
