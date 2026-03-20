const { ethers } = require('ethers');

const WALLET_1 = '0x34769bE7087F1fE5B9ad5C50cC1526BC63217341';
const WALLET_2 = '0xC649A2F94AFc4E5649D3d575d16E739e70B2BA2F';

const WETH_ETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const WETH_BASE = '0x4200000000000000000000000000000000000006';

const WETH_ABI = ['function balanceOf(address) view returns (uint256)'];

async function checkAll() {
  console.log('='.repeat(60));
  console.log('ETHEREUM MAINNET');
  console.log('='.repeat(60));
  
  const eth = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
  const wethEth = new ethers.Contract(WETH_ETH, WETH_ABI, eth);
  
  const [eth1, eth2, weth1, weth2] = await Promise.all([
    eth.getBalance(WALLET_1),
    eth.getBalance(WALLET_2),
    wethEth.balanceOf(WALLET_1),
    wethEth.balanceOf(WALLET_2)
  ]);
  
  console.log(`Wallet 1 (0x3476...): ${ethers.formatEther(eth1)} ETH | ${ethers.formatEther(weth1)} WETH`);
  console.log(`Wallet 2 (0xC649...): ${ethers.formatEther(eth2)} ETH | ${ethers.formatEther(weth2)} WETH`);
  
  console.log('\n' + '='.repeat(60));
  console.log('BASE NETWORK');
  console.log('='.repeat(60));
  
  const base = new ethers.JsonRpcProvider('https://base.llamarpc.com');
  const wethBase = new ethers.Contract(WETH_BASE, WETH_ABI, base);
  
  const [baseEth1, baseEth2, baseWeth1, baseWeth2] = await Promise.all([
    base.getBalance(WALLET_1),
    base.getBalance(WALLET_2),
    wethBase.balanceOf(WALLET_1),
    wethBase.balanceOf(WALLET_2)
  ]);
  
  console.log(`Wallet 1 (0x3476...): ${ethers.formatEther(baseEth1)} ETH | ${ethers.formatEther(baseWeth1)} WETH`);
  console.log(`Wallet 2 (0xC649...): ${ethers.formatEther(baseEth2)} ETH | ${ethers.formatEther(baseWeth2)} WETH`);
  
  console.log('\n' + '='.repeat(60));
  console.log('TOTAL COMBINED');
  console.log('='.repeat(60));
  const total1 = Number(ethers.formatEther(eth1)) + Number(ethers.formatEther(weth1)) + Number(ethers.formatEther(baseEth1)) + Number(ethers.formatEther(baseWeth1));
  const total2 = Number(ethers.formatEther(eth2)) + Number(ethers.formatEther(weth2)) + Number(ethers.formatEther(baseEth2)) + Number(ethers.formatEther(baseWeth2));
  console.log(`Wallet 1: ${total1.toFixed(6)} ETH+WETH`);
  console.log(`Wallet 2: ${total2.toFixed(6)} ETH+WETH`);
}

checkAll().catch(console.error);
