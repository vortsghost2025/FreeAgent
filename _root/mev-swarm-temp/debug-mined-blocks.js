import 'dotenv/config';
import { ethers } from 'ethers';

const RPC_URL = 'https://ethereum-mainnet.core.chainstack.com/4eaab7e73e2a832024e11e41e6688733';
const provider = new ethers.JsonRpcProvider(RPC_URL);

const DEX_ROUTERS = {
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'Uniswap V2',
  '0xe592427a0aece92de3edee1f18e0157c05861564': 'Uniswap V3',
  '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f': 'Sushiswap',
};

async function main() {
  console.log('🔍 Analyzing RECENTLY MINED blocks for DEX activity...\n');

  const currentBlock = await provider.getBlockNumber();
  console.log(`📍 Current block: #${currentBlock}\n`);

  let totalDex = 0;
  const BLOCKS_TO_CHECK = 5;

  for (let i = 0; i < BLOCKS_TO_CHECK; i++) {
    const blockNum = currentBlock - i;
    const block = await provider.getBlock(blockNum, true);

    let dexInBlock = 0;
    for (const tx of block.transactions) {
      const isDex = DEX_ROUTERS[tx.to?.toLowerCase()];
      if (isDex) {
        dexInBlock++;
        totalDex++;
        if (dexInBlock <= 3) { // Show first 3 per block
          console.log(`🎯 Block #${blockNum} - DEX tx #${dexInBlock}`);
          console.log(`   Hash: ${tx.hash}`);
          console.log(`   DEX: ${isDex}`);
          console.log(`   Value: ${ethers.formatEther(tx.value)} ETH`);
        }
      }
    }
    console.log(`📦 Block #${blockNum}: ${block.transactions.length} txs, ${dexInBlock} DEX swaps\n`);
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Blocks analyzed: ${BLOCKS_TO_CHECK}`);
  console.log(`   Total DEX swaps: ${totalDex}`);
  console.log(`   Avg DEX per block: ${(totalDex / BLOCKS_TO_CHECK).toFixed(1)}`);
}

main().catch(console.error);
