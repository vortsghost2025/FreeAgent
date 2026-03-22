import 'dotenv/config';
import { ethers } from 'ethers';

const RPC_URL = 'https://ethereum-mainnet.core.chainstack.com/4eaab7e73e2a832024e11e41e6688733';
const provider = new ethers.JsonRpcProvider(RPC_URL);

const DEX_ROUTERS = {
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'Uniswap V2',
  '0xe592427a0aece92de3edee1f18e0157c05861564': 'Uniswap V3',
  '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f': 'Sushiswap',
};

const DEX_FUNCTIONS = {
  '0x38ed1739': 'swapExactETHForTokens',
  '0x8803dbee': 'swapExactTokensForETH',
  '0xded9382a': 'swapExactTokensForTokens',
  '0xc04b8d59': 'exactInputSingle',
  '0x414bf389': 'exactInput',
  '0x3df02124': 'exchange',
};

async function main() {
  console.log('🔍 Analyzing pending mempool transactions...\n');

  const pendingBlock = await provider.getBlock('pending', true);
  console.log(`📦 Pending block has ${pendingBlock.transactions.length} transactions\n`);

  let dexCount = 0;
  const allTxs = pendingBlock.transactions.length;

  console.log(`📦 Scanning ALL ${allTxs} transactions...\n`);

  for (const tx of pendingBlock.transactions) {
    const isDex = DEX_ROUTERS[tx.to?.toLowerCase()];
    if (isDex) {
      dexCount++;
      console.log(`\n🎯 DEX Transaction #${dexCount}`);
      console.log(`   Hash: ${tx.hash}`);
      console.log(`   DEX: ${isDex}`);
      console.log(`   To: ${tx.to}`);
      console.log(`   Value: ${ethers.formatEther(tx.value)} ETH`);
      console.log(`   Has data: ${!!tx.data && tx.data !== '0x'}`);

      if (tx.data && tx.data !== '0x') {
        const funcSig = tx.data.slice(0, 10);
        const funcName = DEX_FUNCTIONS[funcSig];
        console.log(`   Func sig: ${funcSig}`);
        console.log(`   Func name: ${funcName || 'UNKNOWN'}`);
        console.log(`   Data preview: ${tx.data.slice(0, 80)}...`);

        if (funcName === 'exactInputSingle') {
          try {
            const params = ethers.AbiCoder.defaultAbiCoder().decode(
              ['address', 'address', 'uint24', 'address', 'uint256', 'uint256', 'uint256', 'uint160'],
              '0x' + tx.data.slice(10)
            );
            console.log(`   ✅ Decoded V3 exactInputSingle:`);
            console.log(`      Token In: ${params[0]}`);
            console.log(`      Token Out: ${params[1]}`);
            console.log(`      Fee: ${params[2]}`);
            console.log(`      Amount In: ${params[5].toString()}`);
          } catch (e) {
            console.log(`   ❌ Decode failed: ${e.message}`);
          }
        } else if (funcName === 'swapExactTokensForTokens') {
          try {
            const params = ethers.AbiCoder.defaultAbiCoder().decode(
              ['uint256', 'uint256', 'address[]', 'address', 'uint256'],
              '0x' + tx.data.slice(10)
            );
            console.log(`   ✅ Decoded V2 swapExactTokensForTokens:`);
            console.log(`      Amount In: ${params[0].toString()}`);
            console.log(`      Amount Out Min: ${params[1].toString()}`);
            console.log(`      Path: ${params[2].map(a => a)}`);
          } catch (e) {
            console.log(`   ❌ Decode failed: ${e.message}`);
          }
        }
      }
    }
  }

  console.log(`\n\n📊 Summary:`);
  console.log(`   Total scanned: ${allTxs}`);
  console.log(`   DEX transactions: ${dexCount}`);
  console.log(`   DEX percentage: ${((dexCount / allTxs) * 100).toFixed(1)}%`);
}

main().catch(console.error);
