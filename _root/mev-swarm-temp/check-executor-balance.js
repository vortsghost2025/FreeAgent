/**
 * Quick balance checker for executor wallet
 * Run: node check-executor-balance.js
 */
require('dotenv').config();
const { ethers } = require('ethers');

const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log('🔍 Executor Balance Checker');
  console.log('===========================');
  console.log('Wallet:', wallet.address);
  console.log('');
  
  // Get ETH balance
  const ethBalance = await provider.getBalance(wallet.address);
  console.log('💰 ETH Balance:', ethers.formatEther(ethBalance), 'ETH');
  
  // Get WETH balance
  const wethContract = new ethers.Contract(
    WETH_ADDRESS,
    ['function balanceOf(address) view returns (uint256)'],
    provider
  );
  const wethBalance = await wethContract.balanceOf(wallet.address);
  console.log('💰 WETH Balance:', ethers.formatEther(wethBalance), 'WETH');
  
  // Get USDC balance
  const usdcContract = new ethers.Contract(
    USDC_ADDRESS,
    ['function balanceOf(address) view returns (uint256)'],
    provider
  );
  const usdcBalance = await usdcContract.balanceOf(wallet.address);
  console.log('💰 USDC Balance:', ethers.formatUnits(usdcBalance, 6), 'USDC');
  
  console.log('');
  console.log('📊 Total ETH-equivalent:', 
    (parseFloat(ethers.formatEther(ethBalance)) + parseFloat(ethers.formatEther(wethBalance))).toFixed(6), 
    'ETH');
}

main().catch(console.error);
