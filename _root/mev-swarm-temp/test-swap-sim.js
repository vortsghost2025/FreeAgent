import { ethers } from 'ethers';
import { simulateSwapV2 } from './pool-watcher.js';

async function testSushiSwap() {
  const provider = new ethers.JsonRpcProvider('https://ethereum-mainnet.core.chainstack.com/4eaab7e73e2a832024e11e41e6688733');
  const SUSHI_PAIR = '0x397FF1542f962076d0BFE58eA045FfA2d347ACa0';
  const PAIR_ABI = [
    'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)'
  ];

  const pair = new ethers.Contract(SUSHI_PAIR, PAIR_ABI, provider);
  const reserves = await pair.getReserves();

  console.log('SushiSwap USDC/ETH Reserves:');
  console.log('  Reserve0 (USDC):', reserves[0].toString());
  console.log('  Reserve1 (ETH):', reserves[1].toString());

  // Test different trade sizes
  const tradeSizes = [
    ethers.parseEther('0.01'),   // $20 worth
    ethers.parseEther('0.1'),    // $200 worth
    ethers.parseEther('1.0'),     // $2,000 worth
  ];

  console.log('\n=== Slippage Simulation ===\n');

  for (const amountIn of tradeSizes) {
    const result = simulateSwapV2(reserves[0], reserves[1], amountIn);
    if (result) {
      const ethAmount = Number(ethers.formatEther(amountIn));
      const usdcAmount = Number(result.amountOut) / 1e6;
      const midPrice = 1 / result.midPrice;  // ETH per USDC
      const execPrice = 1 / result.executionPrice;  // ETH per USDC

      console.log(`Trade ${ethAmount.toFixed(4)} ETH → USDC:`);
      console.log(`  Amount Out:  ${usdcAmount.toFixed(2)} USDC`);
      console.log(`  Mid Price:   ${midPrice.toFixed(8)} ETH/USDC`);
      console.log(`  Exec Price:   ${execPrice.toFixed(8)} ETH/USDC`);
      console.log(`  Price Impact: ${(result.priceImpactBps / 100).toFixed(4)}%`);
      console.log();
    }
  }
}

testSushiSwap();
