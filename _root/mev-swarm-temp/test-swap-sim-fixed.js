import { ethers } from 'ethers';

function simulateSwapV2(reserveIn, reserveOut, amountIn, decimalsIn, decimalsOut) {
  if (!reserveIn || !reserveOut || Number(reserveIn) === 0 || Number(reserveOut) === 0) {
    return null;
  }

  const amountInNum = Number(amountIn) / (10 ** decimalsIn);  // Normalize input amount
  const rIn = Number(reserveIn) / (10 ** decimalsIn);         // Normalize input reserve
  const rOut = Number(reserveOut) / (10 ** decimalsOut);       // Normalize output reserve

  // Constant product formula with 0.3% fee: x * y = k
  // amountOut = (rOut * amountIn * 0.997) / (rIn + amountIn * 0.997)
  const amountInWithFee = amountInNum * 0.997;
  const amountOutNum = (rOut * amountInWithFee) / (rIn + amountInWithFee);

  // Mid price (spot price, no slippage) = tokenOut / tokenIn
  const midPrice = rOut / rIn;

  // Execution price (what we actually get)
  const executionPrice = amountOutNum / amountInNum;

  // Price impact as basis points
  const priceImpactBps = ((midPrice - executionPrice) / midPrice) * 10000;

  return {
    amountOut: amountOutNum,
    executionPrice,
    midPrice,
    priceImpactBps
  };
}

async function testSushiSwap() {
  const provider = new ethers.JsonRpcProvider('https://ethereum-mainnet.core.chainstack.com/4eaab7e73e2a832024e11e41e6688733');
  const SUSHI_PAIR = '0x397FF1542f962076d0BFE58eA045FfA2d347ACa0';
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

  // Known addresses
  const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

  const isUsdcToken0 = token0.toLowerCase() === USDC.toLowerCase();

  // Test different trade sizes - swapping ETH for USDC
  const tradeSizes = [
    ethers.parseEther('0.01'),   // ~$20 worth
    ethers.parseEther('0.1'),    // ~$200 worth
    ethers.parseEther('1.0'),     // ~$2,000 worth
  ];

  console.log('\n=== Swapping ETH → USDC ===\n');

  for (const amountIn of tradeSizes) {
    let result;
    const ethAmount = Number(ethers.formatEther(amountIn));

    if (isUsdcToken0) {
      // token0 = USDC, token1 = ETH
      // To swap ETH → USDC: ETH is token1 (reserveOut), USDC is token0 (reserveIn)
      result = simulateSwapV2(reserves[0], reserves[1], amountIn, 6, 18);
    } else {
      // token0 = ETH, token1 = USDC
      // To swap ETH → USDC: ETH is token0 (reserveIn), USDC is token1 (reserveOut)
      result = simulateSwapV2(reserves[1], reserves[0], amountIn, 6, 18);
    }

    if (result) {
      const usdcAmount = result.amountOut;

      console.log(`Trade ${ethAmount.toFixed(4)} ETH → USDC:`);
      console.log(`  Amount Out:  ${usdcAmount.toFixed(2)} USDC`);
      console.log(`  Mid Price:   ${result.midPrice.toFixed(8)} USDC per ETH`);
      console.log(`  Exec Price:  ${result.executionPrice.toFixed(8)} USDC per ETH`);
      console.log(`  Price Impact: ${(result.priceImpactBps / 100).toFixed(4)}%`);
      console.log(`  Rate:        ${(usdcAmount / ethAmount).toFixed(2)} USDC/ETH`);
      console.log();
    }
  }

  // Test swapping USDC for ETH
  console.log('=== Swapping USDC → ETH ===\n');

  const usdcTradeSizes = [1000, 10000, 100000]; // $1K, $10K, $100K

  for (const usdcAmountIn of usdcTradeSizes) {
    let result;
    const amountIn = ethers.parseUnits(usdcAmountIn.toString(), 6);

    if (isUsdcToken0) {
      // token0 = USDC, token1 = ETH
      // To swap USDC → ETH: USDC is token0 (reserveIn), ETH is token1 (reserveOut)
      result = simulateSwapV2(reserves[0], reserves[1], amountIn, 6, 18);
    } else {
      // token0 = ETH, token1 = USDC
      // To swap USDC → ETH: USDC is token1 (reserveIn), ETH is token0 (reserveOut)
      result = simulateSwapV2(reserves[1], reserves[0], amountIn, 6, 18);
    }

    if (result) {
      const ethAmount = result.amountOut;

      console.log(`Trade ${usdcAmountIn.toLocaleString()} USDC → ETH:`);
      console.log(`  Amount Out:  ${ethAmount.toFixed(6)} ETH`);
      console.log(`  Mid Price:   ${result.midPrice.toFixed(8)} ETH per USDC`);
      console.log(`  Exec Price:  ${result.executionPrice.toFixed(8)} ETH per USDC`);
      console.log(`  Price Impact: ${(result.priceImpactBps / 100).toFixed(4)}%`);
      console.log(`  Rate:        ${(ethAmount / usdcAmountIn).toFixed(8)} ETH/USDC`);
      console.log();
    }
  }
}

testSushiSwap();
