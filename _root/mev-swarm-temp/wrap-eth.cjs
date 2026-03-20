/**
 * Wrap ETH to WETH
 * Converts native ETH to Wrapped ETH (WETH) for DEX trading
 */
require('dotenv').config();
const { ethers } = require('ethers');

const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const WALLET = '0x29F7830AfD1F612935cFAfC65BF7b02272E79E0F';

async function wrapEth() {
  try {
    // Setup provider and wallet
    const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    // WETH ABI - deposit function
    const wethAbi = [
      'function deposit() payable',
      'function balanceOf(address) view returns (uint256)'
    ];
    
    const weth = new ethers.Contract(WETH, wethAbi, wallet);
    
    // Get current ETH and WETH balance
    const ethBalance = await provider.getBalance(wallet.address);
    const wethBalance = await weth.balanceOf(wallet.address);
    
    console.log('=== Current Balances ===');
    console.log('ETH:', ethers.formatEther(ethBalance), 'ETH');
    console.log('WETH:', ethers.formatEther(wethBalance), 'WETH');
    
    // Amount to wrap (use 0.01 ETH, leave some for gas)
    const wrapAmount = ethers.parseEther('0.01');
    
    if (ethBalance < wrapAmount) {
      console.log('❌ Not enough ETH to wrap. Need at least 0.01 ETH');
      return;
    }
    
    console.log(`\n=== Wrapping ${ethers.formatEther(wrapAmount)} ETH to WETH ===`);
    
    // Send deposit transaction
    const tx = await weth.deposit({ value: wrapAmount });
    console.log('Transaction sent:', tx.hash);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    console.log('✅ Transaction confirmed in block:', receipt.blockNumber);
    
    // Check new balances
    const newEthBalance = await provider.getBalance(wallet.address);
    const newWethBalance = await weth.balanceOf(wallet.address);
    
    console.log('\n=== New Balances ===');
    console.log('ETH:', ethers.formatEther(newEthBalance), 'ETH');
    console.log('WETH:', ethers.formatEther(newWethBalance), 'WETH');
    
  } catch(e) {
    console.log('❌ Error:', e.message);
  }
}

wrapEth();
