const { ethers } = require('ethers');

const provider = new ethers.JsonRpcProvider('https://base-rpc.publicnode.com');
const wallet = new ethers.Wallet('0x6d0c81a083464c4e554106c21a0146e4ef3af44b5aa1556e95c7246f92636535', provider);

const WETH = '0x4200006a8500000000000000000000000000006';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

const erc20Abi = [
  'function balanceOf(address owner) view returns (uint256)'
];

async function check() {
  console.log('Wallet:', wallet.address);
  
  const ethBal = await provider.getBalance(wallet.address);
  console.log('ETH:', ethers.formatEther(ethBal));
  
  try {
    const weth = new ethers.Contract(WETH, erc20Abi, provider);
    const wBal = await weth.balanceOf(wallet.address);
    console.log('WETH:', ethers.formatEther(wBal));
  } catch(e) {
    console.log('WETH: error -', e.message);
  }
  
  try {
    const usdc = new ethers.Contract(USDC, erc20Abi, provider);
    const uBal = await usdc.balanceOf(wallet.address);
    console.log('USDC:', ethers.formatUnits(uBal, 6));
  } catch(e) {
    console.log('USDC: error -', e.message);
  }
}

check().catch(console.error);
