# REMOVED: sensitive data redacted by automated security cleanup
import { ethers } from 'ethers';

// LOW-LEVEL: Pure math function operating only on raw values
// All inputs are raw BigInts (token wei)
function simulateSwapV2(reserveIn, reserveOut, amountIn) {
  if (!reserveIn || !reserveOut || !amountIn ||
      Number(reserveIn) === 0 || Number(reserveOut) === 0 || Number(amountIn) === 0) {
    return null;
  }

  // Constant product formula with 0.3% fee: x * y = k
  // amountOut = (rOut * amountIn * 997) / (rIn * 1000 + amountIn * 997)
  // Using BigInt for precise arithmetic
  const amountInWithFee = amountIn * 997n;
  const numerator = amountInWithFee * reserveOut;
  const denominator = (reserveIn * 1000n) + amountInWithFee;
  const amountOut = numerator / denominator;

  // Mid price (spot price, no slippage) = reserveOut / reserveIn
  const midPrice = Number(reserveOut) / Number(reserveIn);

  // Execution price (what we actually get)
  const executionPrice = Number(amountOut) / Number(amountIn);

  // Price impact as basis points (1/100th of percent)
  const priceImpactBps = ((midPrice - executionPrice) / midPrice) * 10000;

  return {
    amountOut,
    executionPrice,
    midPrice,
    priceImpactBps
  };
}

// HIGH-LEVEL: Pool-aware helper that handles direction, decimals, and invert
function simulateSwapV2ForPool(poolConfig, reserves, tokenIn, amountInHuman) {
  const { decimals0, decimals1, token0, token1 } = poolConfig;

  // Determine swap direction
  const tokenInLower = tokenIn.toLowerCase();
  const token0Lower = token0.toLowerCase();
  const token1Lower = token1.toLowerCase();

  let reserveIn, reserveOut, decimalsIn, decimalsOut;
  const amountIn = ethers.parseUnits(amountInHuman.toString(), token0Lower === tokenInLower ? decimals0 : decimals1);

  if (token0Lower === tokenInLower) {
    // Swapping token0 → token1
    reserveIn = reserves[0];
    reserveOut = reserves[1];
    decimalsIn = decimals0;
    decimalsOut = decimals1;
  } else if (token1Lower === tokenInLower) {
    // Swapping token1 → token0
    reserveIn = reserves[1];
    reserveOut = reserves[0];
    decimalsIn = decimals1;
    decimalsOut = decimals0;
  } else {
    throw new Error(`Token ${tokenIn} not found in pool`);
  }

  // Call low-level simulation
  const result = simulateSwapV2(reserveIn, reserveOut, amountIn);

  if (!result) return null;

  // Scale output to human units
  const amountOutHuman = Number(ethers.formatUnits(result.amountOut, decimalsOut));

  return {
    amountOut: amountOutHuman,
    executionPrice: result.executionPrice,
    midPrice: result.midPrice,
    priceImpactBps: result.priceImpactBps
  };
}

async function testSushiSwap() {
  const provider = new ethers.JsonRpcProvider('https://ethereum-mainnet.core.chainstack.com/4eaab7e73e2a832024e11e41e6688733');
  const SUSHI_PAIR = 'REDACTED_ADDRESS';
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

  // Pool config
  const poolConfig = {
    token0: 'USDC',
    token1: 'ETH',
    decimals0: 6,
    decimals1: 18
  };

  // Test swapping ETH → USDC
  console.log('\n=== Swapping ETH → USDC ===\n');

  const ethTradeSizes = [0.01, 0.1, 1.0];

  for (const ethAmount of ethTradeSizes) {
    const result = simulateSwapV2ForPool(poolConfig, reserves, 'ETH', ethAmount);

    if (result) {
      const rate = result.amountOut / ethAmount;
      console.log(`Trade ${ethAmount.toFixed(4)} ETH → USDC:`);
      console.log(`  Amount Out:  ${result.amountOut.toFixed(2)} USDC`);
      console.log(`  Mid Price:   ${result.midPrice.toFixed(8)} USDC per ETH`);
      console.log(`  Exec Price:  ${result.executionPrice.toFixed(8)} USDC per ETH`);
      console.log(`  Price Impact: ${(result.priceImpactBps / 100).toFixed(4)}%`);
      console.log(`  Rate:        ${rate.toFixed(2)} USDC/ETH`);
      console.log();
    }
  }

  // Test swapping USDC → ETH
  console.log('=== Swapping USDC → ETH ===\n');

  const usdcTradeSizes = [1000, 10000, 100000];

  for (const usdcAmount of usdcTradeSizes) {
    const result = simulateSwapV2ForPool(poolConfig, reserves, 'USDC', usdcAmount);

    if (result) {
      const rate = result.amountOut / usdcAmount;
      console.log(`Trade ${usdcAmount.toLocaleString()} USDC → ETH:`);
      console.log(`  Amount Out:  ${result.amountOut.toFixed(6)} ETH`);
      console.log(`  Mid Price:   ${result.midPrice.toFixed(8)} ETH per USDC`);
      console.log(`  Exec Price:  ${result.executionPrice.toFixed(8)} ETH per USDC`);
      console.log(`  Price Impact: ${(result.priceImpactBps / 100).toFixed(4)}%`);
      console.log(`  Rate:        ${rate.toFixed(8)} ETH/USDC`);
      console.log();
    }
  }
}

testSushiSwap();
