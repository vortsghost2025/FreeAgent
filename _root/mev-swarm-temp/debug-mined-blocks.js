# REMOVED: sensitive data redacted by automated security cleanup
import 'dotenv/config';
import { ethers } from 'ethers';

const RPC_URL = 'https://ethereum-mainnet.core.chainstack.com/4eaab7e73e2a832024e11e41e6688733';
const provider = new ethers.JsonRpcProvider(RPC_URL);

const DEX_ROUTERS = {
  'REDACTED_ADDRESS': 'Uniswap V2',
  'REDACTED_ADDRESS': 'Uniswap V3',
  'REDACTED_ADDRESS': 'Sushiswap',
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
