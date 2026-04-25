# REMOVED: sensitive data redacted by automated security cleanup
require('dotenv').config();
const { ethers } = require('ethers');

const WETH = 'REDACTED_ADDRESS';
const EXECUTOR = 'REDACTED_ADDRESS';
const WALLET = 'REDACTED_ADDRESS';

async function check() {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
    
    // ERC20 ABI with allowance function
    const erc20Abi = [
      'function balanceOf(address) view returns (uint256)',
      'function allowance(address owner, address spender) view returns (uint256)'
    ];
    
    const weth = new ethers.Contract(WETH, erc20Abi, provider);
    
    // Check executor WETH balance
    const executorBalance = await weth.balanceOf(EXECUTOR);
    console.log('Executor WETH balance:', ethers.formatEther(executorBalance), 'ETH');
    
    // Check wallet WETH balance
    const walletWethBalance = await weth.balanceOf(WALLET);
    console.log('Wallet WETH balance:', ethers.formatEther(walletWethBalance), 'WETH');
    
    // Check allowance (wallet -> executor)
    const allowance = await weth.allowance(WALLET, EXECUTOR);
    console.log('Allowance (wallet -> executor):', ethers.formatEther(allowance), 'WETH');
    
    // Check wallet ETH balance
    const walletEthBalance = await provider.getBalance(WALLET);
    console.log('Wallet ETH balance:', ethers.formatEther(walletEthBalance), 'ETH');
    
  } catch(e) {
    console.log('Error:', e.message);
  }
}

check();
