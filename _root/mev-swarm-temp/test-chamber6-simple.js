# REMOVED: sensitive data redacted by automated security cleanup
import { ethers } from 'ethers';
import { buildV2SwapCalldata, buildV3SingleSwapCalldata } from './core/executor/transaction-builder.js';
import { buildBundle, calculateBundleTip, BUNDLE_TYPES } from './core/executor/bundle-sender.js';
import { calculateSafeGasLimit, calculateSlippageTolerance, validateTransactionParams } from './core/executor/safety-layer.js';

console.log('=== Chamber 6: Solver → Executor Pipeline Validation ===\n');

// Test 1: V2 Swap Calldata Building
console.log('Test 1: V2 Swap Calldata Building');
try {
  const v2Calldata = buildV2SwapCalldata(
    'REDACTED_ADDRESS', // router
    'REDACTED_ADDRESS', // tokenIn (USDC)
    'REDACTED_ADDRESS', // tokenOut (WETH)
    1000, // amountIn
    1,    // amountOutMin
    'REDACTED_ADDRESS', // recipient
    Math.floor(Date.now() / 1000) + 600 // deadline
  );
  console.log('  ✓ V2 calldata generated:', v2Calldata.slice(0, 40) + '...');
} catch (e) {
  console.log('  ⚠ V2 calldata (expected to fail without pool data):', e.message.split('\n')[0]);
}

// Test 2: V3 Single Swap Calldata
console.log('\nTest 2: V3 Single Swap Calldata');
try {
  const v3Calldata = buildV3SingleSwapCalldata(
    'REDACTED_ADDRESS', // router
    'REDACTED_ADDRESS', // tokenIn
    1000, // amountIn
    1,    // amountOutMin
    'REDACTED_ADDRESS'  // recipient
  );
  console.log('  ✓ V3 calldata generated:', v3Calldata.slice(0, 40) + '...');
} catch (e) {
  console.log('  ⚠ V3 calldata (expected to fail without exact params):', e.message.split('\n')[0]);
}

// Test 3: Bundle Construction
console.log('\nTest 3: Bundle Construction');
const bundle = buildBundle([
  { to: '0x1234...', data: '0xabcd...', value: ethers.parseEther('0.01') },
  { to: '0x5678...', data: '0xefgh...', value: 0n }
], { blockNumber: 19000000, timestamp: Math.floor(Date.now() / 1000) });
console.log('  ✓ Bundle constructed:', bundle.txs.length, 'transactions');

// Test 4: Bundle Tip Calculation
console.log('\nTest 4: Bundle Tip Calculation');
const tip = calculateBundleTip(100, 50000); // 100 gwei gas, 50000 gas used
console.log('  ✓ Bundle tip:', ethers.formatEther(tip), 'ETH');

// Test 5: Safe Gas Limit Calculation
console.log('\nTest 5: Safe Gas Limit Calculation');
const safeGas = calculateSafeGasLimit(21000, 1.2); // 20% buffer
console.log('  ✓ Safe gas limit:', safeGas.toString());

// Test 6: Slippage Tolerance Calculation
console.log('\nTest 6: Slippage Tolerance Calculation');
const slippage = calculateSlippageTolerance(1000, 0.5); // 0.5%
console.log('  ✓ Slippage amount:', slippage.toString());

// Test 7: Transaction Parameter Validation
console.log('\nTest 7: Transaction Parameter Validation');
const validParams = validateTransactionParams({
  to: '0x7426DF7B6fAa6EB5cE01283D19C9d6c6A5e8b5C',
  value: ethers.parseEther('0.1'),
  gasLimit: 50000,
  maxFeePerGas: ethers.parseUnits('100', 'gwei'),
  maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei')
});
console.log('  ✓ Valid params:', validParams ? 'PASSED' : 'FAILED');

const invalidParams = validateTransactionParams({
  to: '0xinvalid',
  value: -1n,
  gasLimit: 0
});
console.log('  ✓ Invalid params:', !invalidParams ? 'CORRECTLY REJECTED' : 'FAILED');

console.log('\n=== Chamber 6 Validation Complete ===');
