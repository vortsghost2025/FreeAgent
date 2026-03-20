/**
 * Test integrated swap simulation using pool-watcher.js
 * Verifies that the new clean architecture works correctly
 */

import { ethers } from 'ethers';
import { POOLS, TOKEN_ADDRESSES } from './pool-watcher.js';
import { RpcManager } from './rpc-manager.js';

async function testSushiSwapIntegration() {
  console.log('=== Testing Integrated Swap Simulation ===\n');

  const rpcManager = new RpcManager();
  const provider = rpcManager.getProvider();

  const SUSHI_PAIR = POOLS['SushiSwap USDC/ETH'].address;
  const PAIR_ABI = [
    'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
    'function token0() view returns (address)',
    'function token1() view returns (address)'
  ];

  const pair = new ethers.Contract(SUSHI_PAIR, PAIR_ABI, provider);
  const [reserves, token0, token1] = await Promise.all([
    pair.getReserves(),
    pair.token0(),
    pair.token1()
  ]);

  console.log('SushiSwap Pair:');
  console.log('  Token0:', token0);
  console.log('  Token1:', token1);
  console.log('  Reserve0:', reserves[0].toString());
  console.log('  Reserve1:', reserves[1].toString());

  // Get token names from addresses
  let detectedToken0, detectedToken1;
  for (const [name, addr] of Object.entries(TOKEN_ADDRESSES)) {
    if (token0.toLowerCase() === addr.toLowerCase()) {
      detectedToken0 = name;
    }
    if (token1.toLowerCase() === addr.toLowerCase()) {
      detectedToken1 = name;
    }
  }

  console.log(`  Detected: ${detectedToken0}/${detectedToken1}\n`);

  // Import and test the simulateSwap function
  const { simulateSwap } = await import('./pool-watcher.js');

  // Test ETH → USDC swaps
  console.log('=== Testing ETH → USDC (via simulateSwap) ===\n');

  const ethTradeSizes = [
    ethers.parseEther('0.01'),   // ~$20 worth
    ethers.parseEther('0.1'),    // ~$200 worth
    ethers.parseEther('1.0'),     // ~$2,000 worth
  ];

  for (const amountIn of ethTradeSizes) {
    const result = await simulateSwap('SushiSwap USDC/ETH', 'ETH', amountIn);
    if (result) {
      const ethAmount = Number(ethers.formatEther(amountIn));
      const rate = result.amountOut / ethAmount;

      console.log(`Trade ${ethAmount.toFixed(4)} ETH → USDC:`);
      console.log(`  Amount Out:    ${result.amountOut.toFixed(2)} USDC`);
      console.log(`  Mid Price:     ${result.midPrice.toFixed(8)} USDC per ETH`);
      console.log(`  Exec Price:    ${result.executionPrice.toFixed(8)} USDC per ETH`);
      console.log(`  Price Impact:  ${(result.priceImpactBps / 100).toFixed(4)}%`);
      console.log(`  Rate:          ${rate.toFixed(2)} USDC/ETH`);
      console.log(`  Pool Type:     ${result.poolType}\n`);
    } else {
      console.log('Swap simulation failed for this amount\n');
    }
  }

  // Test USDC → ETH swaps
  console.log('=== Testing USDC → ETH (via simulateSwap) ===\n');

  const usdcTradeSizes = [
    ethers.parseUnits('1000', 6),   // $1K
    ethers.parseUnits('10000', 6),  // $10K
    ethers.parseUnits('100000', 6), // $100K
  ];

  for (const amountIn of usdcTradeSizes) {
    const result = await simulateSwap('SushiSwap USDC/ETH', 'USDC', amountIn);
    if (result) {
      const usdcAmount = Number(ethers.formatUnits(amountIn, 6));
      const rate = result.amountOut / usdcAmount;

      console.log(`Trade ${usdcAmount.toLocaleString()} USDC → ETH:`);
      console.log(`  Amount Out:    ${result.amountOut.toFixed(6)} ETH`);
      console.log(`  Mid Price:     ${result.midPrice.toFixed(8)} ETH per USDC`);
      console.log(`  Exec Price:    ${result.executionPrice.toFixed(8)} ETH per USDC`);
      console.log(`  Price Impact:  ${(result.priceImpactBps / 100).toFixed(4)}%`);
      console.log(`  Rate:          ${rate.toFixed(8)} ETH/USDC`);
      console.log(`  Pool Type:     ${result.poolType}\n`);
    } else {
      console.log('Swap simulation failed for this amount\n');
    }
  }

  console.log('=== Test Complete ===');
}

testSushiSwapIntegration().catch(console.error);
