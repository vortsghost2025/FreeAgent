# REMOVED: sensitive data redacted by automated security cleanup
import { ethers } from 'ethers';

function simulateSwapV2(reserveIn, reserveOut, amountIn) {
  if (!reserveIn || !reserveOut || Number(reserveIn) === 0 || Number(reserveOut) === 0) {
    return null;
  }

  const amountInNum = Number(amountIn);
  const rIn = Number(reserveIn);
  const rOut = Number(reserveOut);

  // Constant product formula: x * y = k
  const numerator = BigInt(rOut * amountInNum * 997);
  const denominator = BigInt(rIn * 1000 + amountInNum * 997);
  const amountOut = Number(numerator) / Number(denominator);

  // Mid price (spot price, no slippage)
  const midPrice = rOut / rIn;

  // Execution price (what we actually get)
  const executionPrice = amountOut / amountInNum;

  // Price impact as basis points
  const priceImpactBps = ((midPrice - executionPrice) / midPrice) * 10000;

  return {
    amountOut,
    executionPrice,
    midPrice,
    priceImpactBps
  };
}

async function testSushiSwap() {
  const provider = new ethers.JsonRpcProvider('https://ethereum-mainnet.core.chainstack.com/4eaab7e73e2a832024e11e41e6688733');
  const SUSHI_PAIR = 'REDACTED_ADDRESS';
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
      const midPrice = 1 / result.midPrice;
      const execPrice = 1 / result.executionPrice;

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
