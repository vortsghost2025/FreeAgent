import 'dotenv/config';
import { ethers } from 'ethers';

const RPC_URL = 'https://ethereum-mainnet.core.chainstack.com/4eaab7e73e2a832024e11e41e6688733';
const provider = new ethers.JsonRpcProvider(RPC_URL);

async function main() {
  console.log('🔍 Checking transaction structure...\n');

  const blockNum = await provider.getBlockNumber();
  console.log(`📍 Block #${blockNum}\n`);

  // Get block with full transactions
  const block = await provider.getBlock(blockNum, true);

  console.log(`📦 Block has ${block.transactions.length} transactions\n`);

  // Check first transaction structure
  const firstTx = block.transactions[0];
  console.log('🔍 First transaction:');
  console.log(`   Type: ${typeof firstTx}`);
  console.log(`   Is string: ${typeof firstTx === 'string'}`);
  console.log(`   Is object: ${typeof firstTx === 'object'}`);

  if (typeof firstTx === 'object') {
    console.log(`   Has "to": ${'to' in firstTx}`);
    console.log(`   Has "hash": ${'hash' in firstTx}`);
    console.log(`   To value: ${firstTx.to}`);
  } else {
    console.log(`   Value: ${firstTx}`);
  }

  // Check second transaction
  const secondTx = block.transactions[1];
  console.log('\n🔍 Second transaction:');
  console.log(`   Type: ${typeof secondTx}`);
  if (typeof secondTx === 'object') {
    console.log(`   To: ${secondTx.to}`);
  }

  // Count how many are objects vs strings
  let objectCount = 0;
  let stringCount = 0;
  for (const tx of block.transactions) {
    if (typeof tx === 'object') objectCount++;
    else stringCount++;
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Objects (with details): ${objectCount}`);
  console.log(`   Strings (hashes only): ${stringCount}`);
}

main().catch(console.error);
