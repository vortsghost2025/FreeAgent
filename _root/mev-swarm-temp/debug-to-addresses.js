# REMOVED: sensitive data redacted by automated security cleanup
import 'dotenv/config';
import { ethers } from 'ethers';

const RPC_URL = 'https://ethereum-mainnet.core.chainstack.com/4eaab7e73e2a832024e11e41e6688733';
const provider = new ethers.JsonRpcProvider(RPC_URL);

async function main() {
  console.log('🔍 Analyzing transaction "to" addresses in recent blocks...\n');

  const blockNum = await provider.getBlockNumber();
  const block = await provider.getBlock(blockNum, true);

  const toCounts = new Map();
  let uniqueTos = new Set();

  for (const tx of block.transactions) {
    if (tx.to) {
      const addr = tx.to.toLowerCase();
      toCounts.set(addr, (toCounts.get(addr) || 0) + 1);
      uniqueTos.add(addr);
    }
  }

  console.log(`📊 Block #${blockNum}: ${block.transactions.length} transactions`);
  console.log(`📍 Unique "to" addresses: ${uniqueTos.size}\n`);

  // Top 10 most common "to" addresses
  const sorted = [...toCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  console.log('🔥 Top 10 "to" addresses:');
  sorted.forEach(([addr, count], i) => {
    console.log(`   ${i+1}. ${addr} (${count} txs)`);
  });

  // Check if any DEX routers in the top 20
  const DEX_ROUTERS = {
    'REDACTED_ADDRESS': 'Uniswap V2',
    'REDACTED_ADDRESS': 'Uniswap V3',
    'REDACTED_ADDRESS': 'Sushiswap',
  };

  console.log('\n🎯 DEX router check:');
  Object.entries(DEX_ROUTERS).forEach(([addr, name]) => {
    const count = toCounts.get(addr) || 0;
    console.log(`   ${name}: ${count} txs`);
  });

  // Show 10 random "to" addresses to see what's happening
  const randomTos = [...uniqueTos].sort(() => Math.random() - 0.5).slice(0, 10);
  console.log('\n🎲 10 random "to" addresses:');
  randomTos.forEach((addr, i) => {
    const count = toCounts.get(addr) || 0;
    console.log(`   ${i+1}. ${addr} (${count} txs)`);
  });
}

main().catch(console.error);
