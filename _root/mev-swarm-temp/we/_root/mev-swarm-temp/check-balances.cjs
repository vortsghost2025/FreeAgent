# REMOVED: sensitive data redacted by automated security cleanup
const { ethers } = require('ethers');

const WALLET_1 = 'REDACTED_ADDRESS';
const WALLET_2 = 'REDACTED_ADDRESS';

// Token addresses
const WETH_ETH = 'REDACTED_ADDRESS';
const WETH_BASE = 'REDACTED_ADDRESS';

async function checkBalances() {
  console.log('=== Checking Wallet Balances ===\n');
  
  // Ethereum Mainnet
  console.log('🌐 ETHEREUM MAINNET');
  console.log('=====================');
  const ethProvider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
  
  try {
    const eth1 = await ethProvider.getBalance(WALLET_1);
    const eth2 = await ethProvider.getBalance(WALLET_2);
    console.log(`Wallet 1 (0x3476...): ${ethers.formatEther(eth1)} ETH`);
    console.log(`Wallet 2 (0xC649...): ${ethers.formatEther(eth2)} ETH`);
    
    // Check WETH on Ethereum
    const wethContract = new ethers.Contract(WETH_ETH, ['function balanceOf(address) view returns (uint256)'], ethProvider);
    const weth1 = await wethContract.balanceOf(WALLET_1);
    const weth2 = await wethContract.balanceOf(WALLET_2);
    console.log(`Wallet 1 WETH: ${ethers.formatEther(weth1)} WETH`);
    console.log(`Wallet 2 WETH: ${ethers.formatEther(weth2)} WETH`);
  } catch (e) {
    console.log('Error checking Ethereum:', e.message);
  }
  
  console.log('\n🌉 BASE NETWORK');
  console.log('================');
  const baseProvider = new ethers.JsonRpcProvider('https://base.llamarpc.com');
  
  try {
    const baseEth1 = await baseProvider.getBalance(WALLET_1);
    const baseEth2 = await baseProvider.getBalance(WALLET_2);
    console.log(`Wallet 1 (0x3476...): ${ethers.formatEther(baseEth1)} ETH`);
    console.log(`Wallet 2 (0xC649...): ${ethers.formatEther(baseEth2)} ETH`);
    
    // Check WETH on Base
    const wethBaseContract = new ethers.Contract(WETH_BASE, ['function balanceOf(address) view returns (uint256)'], baseProvider);
    const baseWeth1 = await wethBaseContract.balanceOf(WALLET_1);
    const baseWeth2 = await wethBaseContract.balanceOf(WALLET_2);
    console.log(`Wallet 1 WETH: ${ethers.formatEther(baseWeth1)} WETH`);
    console.log(`Wallet 2 WETH: ${ethers.formatEther(baseWeth2)} WETH`);
  } catch (e) {
    console.log('Error checking Base:', e.message);
  }
  
  console.log('\n=== Summary ===');
  console.log(`Total ETH+WETH Wallet 1: ${Number(ethers.formatEther(await ethProvider.getBalance(WALLET_1))) + Number(ethers.formatEther(await new ethers.Contract(WETH_ETH, ['function balanceOf(address) view returns (uint256)'], ethProvider).balanceOf(WALLET_1)))}`);
  console.log(`Total ETH+WETH Wallet 2: ${Number(ethers.formatEther(await ethProvider.getBalance(WALLET_2))) + Number(ethers.formatEther(await new ethers.Contract(WETH_ETH, ['function balanceOf(address) view returns (uint256)'], ethProvider).balanceOf(WALLET_2)))}`);
}

checkBalances();
