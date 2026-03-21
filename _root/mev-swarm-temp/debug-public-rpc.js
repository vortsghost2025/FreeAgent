# REMOVED: sensitive data redacted by automated security cleanup
import { ethers } from 'ethers';

// Try multiple public RPCs
const RPCs = [
  'https://eth.llamarpc.com',
  'https://rpc.ankr.com/eth',
  'https://ethereum.publicnode.com',
];

const DEX_ROUTERS = {
  'REDACTED_ADDRESS': 'Uniswap V2',
  'REDACTED_ADDRESS': 'Uniswap V3',
  'REDACTED_ADDRESS': 'Sushiswap',
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
