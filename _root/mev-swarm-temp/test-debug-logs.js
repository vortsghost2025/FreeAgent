import 'dotenv/config';

const DEBUG_LOGS = process.env.DEBUG_LOGS === 'true';

console.log('🔍 Testing DEBUG_LOGS environment variable...\n');
console.log(`process.env.DEBUG_LOGS = "${process.env.DEBUG_LOGS}"`);
console.log(`process.env.DEBUG_LOGS === 'true' = ${process.env.DEBUG_LOGS === 'true'}`);
console.log(`DEBUG_LOGS variable = ${DEBUG_LOGS}`);

if (DEBUG_LOGS) {
  console.log('\n✅ DEBUG_LOGS is TRUE - debug logging should work');
} else {
  console.log('\n❌ DEBUG_LOGS is FALSE - debug logging disabled');
}

console.log('\n🧪 Testing decodeSwapData function...');

import { ethers } from 'ethers';

const DEX_FUNCTIONS = {
  '0x38ed1739': 'swapExactETHForTokens',
  '0x8803dbee': 'swapExactTokensForETH',
  '0xded9382a': 'swapExactTokensForTokens',
};

function decodeSwapData(input, value, dexName) {
  if (DEBUG_LOGS && Math.random() < 0.5) {
    console.log(`🐛 decodeSwapData called with dexName: ${dexName}`);
  }

  if (!input || input === '0x') return null;

  try {
    const funcSig = input.slice(0, 10);
    const funcName = DEX_FUNCTIONS[funcSig];
    if (!funcName) {
      if (DEBUG_LOGS) {
        console.log(`  🐛 Unknown function signature: ${funcSig}`);
      }
      return null;
    }

    if (DEBUG_LOGS) {
      console.log(`  ✅ Known function: ${funcName}`);
    }

    return { function: funcName, dex: dexName, isSwap: true };
  } catch (error) {
    if (DEBUG_LOGS) {
      console.log(`  🐛 DECODE ERROR: ${error.message}`);
    }
    return { dex: dexName, function: 'unknown', isSwap: true, note: 'Could not decode' };
  }
}

// Test with a real Uniswap V2 swap call
const testInput = '0x38ed1739000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044bc2a0739f727d026da1d6b4450589c3b229c';
const result = decodeSwapData(testInput, '0', 'Uniswap V2');
console.log(`\n📊 Result:`, result);
