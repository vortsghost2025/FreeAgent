import { ethers } from 'ethers';

// Try multiple public RPCs
const RPCs = [
  'https://eth.llamarpc.com',
  'https://rpc.ankr.com/eth',
  'https://ethereum.publicnode.com',
];

const DEX_ROUTERS = {
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'Uniswap V2',
  '0xe592427a0aece92de3edee1f18e0157c05861564': 'Uniswap V3',
  '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f': 'Sushiswap',
};

async function testRpc(rpcUrl) {
  console.log(`\n🔌 Testing RPC: ${rpcUrl}`);
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const blockNum = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNum, true);

    let dexCount = 0;
    for (const tx of block.transactions) {
      if (DEX_ROUTERS[tx.to?.toLowerCase()]) {
        dexCount++;
        if (dexCount <= 2) {
          console.log(`   ✅ DEX tx found: ${tx.hash.slice(0, 12)}... → ${DEX_ROUTERS[tx.to.toLowerCase()]}`);
        }
      }
    }
    console.log(`   📊 Block #${blockNum}: ${block.transactions.length} txs, ${dexCount} DEX`);
    return dexCount;
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    return 0;
  }
}

async function main() {
  console.log('🔍 Testing multiple public RPC endpoints for DEX activity...');

  for (const rpc of RPCs) {
    await testRpc(rpc);
  }

  console.log('\n💡 If all RPCs show 0 DEX, the router addresses might be wrong');
  console.log('💡 Or we need to check more blocks');
}

main().catch(console.error);
