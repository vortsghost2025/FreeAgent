import 'dotenv/config';
import { ethers } from 'ethers';

const RPC_URL = process.env.ETHEREUM_RPC_URL || 'https://ethereum-mainnet.core.chainstack.com/4eaab7e73e2a832024e11e41e6688733';
const provider = new ethers.JsonRpcProvider(RPC_URL);

// WETH contract
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const WETH_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function deposit() payable',
  'function withdraw(uint256) external',
  'event Transfer(address indexed from, address indexed to, uint256 value)'
];

async function main() {
  console.log('🔍 Checking WETH balances...\n');

  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '', provider);
  const address = wallet.address;

  console.log(`📍 Wallet Address: ${address}`);

  if (!process.env.PRIVATE_KEY || process.env.PRIVATE_KEY === '') {
    console.log('\n❌ No private key in .env.local');
    console.log('💡 Add your private key to check balance:');
    console.log('   PRIVATE_KEY=0x...\n');
    return;
  }

  const weth = new ethers.Contract(WETH_ADDRESS, WETH_ABI, provider);

  // Check ETH balance
  const ethBalance = await provider.getBalance(address);
  console.log(`💰 ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);

  // Check WETH balance
  const wethBalance = await weth.balanceOf(address);
  console.log(`💎 WETH Balance: ${ethers.formatEther(wethBalance)} WETH\n`);

  // Get recent WETH Transfer events for this address
  console.log('📜 Recent WETH Transfers (last 5):\n');
  const filter = weth.filters.Transfer(null, address); // TO this address
  const events = await weth.queryFilter(filter, -500); // Last 500 blocks

  // Filter for incoming transfers only
  const incoming = events.filter(e => e.args.from.toLowerCase() !== address.toLowerCase());

  if (incoming.length === 0) {
    console.log('❌ No incoming WETH transfers found in last 500 blocks');
    console.log('💡 This means the WETH wrapping transaction either:');
    console.log('   1. Failed or reverted');
    console.log('   2. Sent from a different account');
    console.log('   3. Is still pending (not mined yet)');
    console.log('\n🔗 Check Etherscan:');
    console.log(`   https://etherscan.io/address/${address}\n`);
  } else {
    incoming.slice(-5).reverse().forEach((e, i) => {
      const block = await provider.getBlock(e.blockNumber);
      const time = block ? new Date(block.timestamp * 1000).toLocaleString() : 'Unknown';
      const value = ethers.formatEther(e.args.value);
      const from = e.args.from.slice(0, 8) + '...';
      console.log(`${i+1}. ${value} WETH received from ${from}`);
      console.log(`   Block: ${e.blockNumber} | Time: ${time}\n`);
    });
  }
}

main().catch(console.error);
