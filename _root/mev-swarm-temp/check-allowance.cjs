require('dotenv').config();
const { ethers } = require('ethers');

const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const EXECUTOR = '0x34769bE7087F1fE5B9ad5C50cC1526BC63217341';
const WALLET = '0x29F7830AfD1F612935cFAfC65BF7b02272E79E0F';

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
