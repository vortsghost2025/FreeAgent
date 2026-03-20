/**
 * Test integrated swap simulation using pool-watcher.js
 * Verifies that the new clean architecture works correctly
 */

import { ethers } from 'ethers';
import { simulateSwap, POOLS, TOKEN_ADDRESSES } from './pool-watcher.js';

async function testSushiSwapIntegration() {
  console.log('=== Testing Integrated Swap Simulation ===\n');

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
