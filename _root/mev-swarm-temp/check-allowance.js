require('dotenv').config();
const { ethers } = require('ethers');

const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const EXECUTOR = '0x34769bE7087F1fE5B9ad5C50cC1526BC63217341';
const WALLET = '0x29F7830AfD1F612935cFAfC65BF7b02272E79E0F';

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
