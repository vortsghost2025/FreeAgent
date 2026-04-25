# REMOVED: sensitive data redacted by automated security cleanup
require('dotenv').config();
const { ethers } = require('ethers');

const WETH = 'REDACTED_ADDRESS';
const EXECUTOR = 'REDACTED_ADDRESS';
const WALLET = 'REDACTED_ADDRESS';

async function check() {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
    
    // Check WETH balance of executor contract
    const weth = new ethers.Contract(WETH, ['function balanceOf(address) view returns (uint256)'], provider);
    const executorBalance = await weth.balanceOf(EXECUTOR);
    console.log('Executor WETH balance:', ethers.formatEther(executorBalance), 'ETH');
    
    // Check allowance (wallet -> executor)
    const allowance = await weth.allowance(WALLET, EXECUTOR);
    console.log('Allowance (wallet -> executor):', ethers.formatEther(allowance), 'ETH');
  } catch(e) {
    console.log('Error:', e.message);
  }
}

check();
