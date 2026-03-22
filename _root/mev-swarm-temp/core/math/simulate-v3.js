/**
 * MEV Swarm - V3 Tick-Walking Simulation (Low-Level)
 * Pure BigInt math for Uniswap V3 swap simulation
 *
 * No network calls, no ABI, no provider - just math.
 * Core requirement: accurate slippage calculation through tick boundaries.
 */

/**
 * Uniswap V3 Price Math
 * All calculations use Q96.96 fixed point representation
 */

const Q96 = 96n;
const Q96_RESOLUTION = 2n ** 96n;

/**
 * Get tick from sqrtPriceX96
 * tick = floor(log_1.0001(sqrtPriceX96 / 2^96))
 *
 * @param {BigInt} sqrtPriceX96 - Q96.96 price
 * @returns {number} Tick value
 */
export function tickFromSqrtPriceX96(sqrtPriceX96) {
  if (!sqrtPriceX96 || sqrtPriceX96 === 0n) {
    return 0;
  }

  // tick = floor(log(sqrtPriceX96 / 2^96) / log(1.0001))
  // Using Math.log for the division
  const priceRatio = Number(sqrtPriceX96) / Number(Q96_RESOLUTION);
  return Math.floor(Math.log(priceRatio) / Math.log(1.0001));
}

/**
 * Get sqrtPriceX96 from tick
 * sqrtPriceX96 = 2^96 * 1.0001^(tick/2)
 *
 * @param {number} tick - Tick value
 * @returns {BigInt} sqrtPriceX96
 */
export function sqrtPriceX96FromTick(tick) {
  // sqrtPriceX96 = 2^96 * 1.0001^(tick/2)
  const price = 1.0001 ** (tick / 2);
  return BigInt(Math.floor(price * Number(Q96_RESOLUTION)));
}

/**
 * Get liquidity at tick boundary
 * Calculates how much liquidity crosses a tick boundary
 *
 * @param {BigInt} currentLiquidity - Current pool liquidity
 * @param {number} tickSpacing - Pool tick spacing
 * @returns {BigInt} Liquidity at tick
 */
export function getTickLiquidity(currentLiquidity, tickSpacing) {
  // In a real implementation, this would query tick data
  // For pure math function, we assume uniform distribution
  return currentLiquidity;
}

/**
 * Calculate amount that can be traded within current tick
 * Using the V3 concentrated liquidity model
 *
 * @param {BigInt} liquidity - Current liquidity
 * @param {BigInt} sqrtPriceX96Current - Current sqrtPriceX96
 * @param {BigInt} sqrtPriceX96Target - Target tick's sqrtPriceX96
 * @param {boolean} zeroForOne - Direction (token0->token1 or token1->token0)
 * @returns {BigInt} Amount that can be traded
 */
export function getAmountInTick(liquidity, sqrtPriceX96Current, sqrtPriceX96Target, zeroForOne) {
  if (!liquidity || !sqrtPriceX96Current || !sqrtPriceX96Target) {
    return 0n;
  }

  // V3 concentrated liquidity formula
  // For zeroForOne = true (token0 -> token1):
  //   deltaLiquidity = liquidity * (sqrtPriceTarget - sqrtPriceCurrent)
  // For zeroForOne = false (token1 -> token0):
  //   deltaLiquidity = liquidity * (sqrtPriceTarget - sqrtPriceCurrent) / (sqrtPriceCurrent * sqrtPriceTarget)

  const deltaSqrtPrice = sqrtPriceX96Target - sqrtPriceX96Current;

  if (zeroForOne) {
    // token0 -> token1: simple difference
    return (liquidity * deltaSqrtPrice) / Q96_RESOLUTION;
  } else {
    // token1 -> token0: division by product
    const product = sqrtPriceX96Current * sqrtPriceX96Target;
    return (liquidity * deltaSqrtPrice * Q96_RESOLUTION) / product;
  }
}

/**
 * Get fee amount for V3 swap
 * Fee tiers: 500 (0.05%), 3000 (0.3%), 10000 (1%)
 *
 * @param {BigInt} amountIn - Input amount
 * @param {number} fee - Fee tier (e.g., 3000)
 * @returns {BigInt} Fee amount
 */
export function getV3Fee(amountIn, fee) {
  // Fee = amountIn * fee / 10000
  return (amountIn * BigInt(fee)) / 10000n;
}

/**
 * Simulate V3 swap with tick walking
 * Walks through ticks until amountIn is fully consumed
 *
 * @param {Object} params - Swap parameters
 * @param {BigInt} params.sqrtPriceX96 - Current sqrtPriceX96
 * @param {BigInt} params.liquidity - Current pool liquidity
 * @param {number} params.tick - Current tick
 * @param {number} params.tickSpacing - Pool tick spacing (500, 3000, or 10000)
 * @param {number} params.fee - Fee tier (500, 3000, 10000)
 * @param {BigInt} params.amountIn - Amount to swap (raw token units)
 * @param {boolean} params.zeroForOne - Direction: true = token0->token1, false = token1->token0
 * @returns {Object|null} Swap simulation result
 */
export function simulateSwapV3Raw({
  sqrtPriceX96,
  liquidity,
  tick,
  tickSpacing,
  fee = 3000,
  amountIn,
  zeroForOne = true
}) {
  if (!sqrtPriceX96 || sqrtPriceX96 === 0n ||
      !liquidity || liquidity === 0n ||
      !amountIn || amountIn === 0n) {
    return null;
  }

  // Track state across tick iterations
  let amountRemaining = amountIn;
  let currentTick = tick;
  let currentSqrtPrice = sqrtPriceX96;
  let currentLiquidity = liquidity;
  let totalAmountOut = 0n;
  let totalFee = 0n;
  let totalTicksCrossed = 0;

  // Walk ticks until amountIn is consumed
  while (amountRemaining > 0n) {
    // Calculate fee for current tick iteration
    const feeAmount = getV3Fee(amountRemaining, fee);

    // Amount after fee
    const amountInWithFee = amountRemaining - feeAmount;
    totalFee += feeAmount;

    // Calculate amount that can be traded within current tick
    // Determine next tick boundary
    const nextTick = zeroForOne
      ? Math.ceil(currentTick / tickSpacing) * tickSpacing + tickSpacing
      : Math.floor(currentTick / tickSpacing) * tickSpacing - tickSpacing;

    const nextSqrtPrice = sqrtPriceX96FromTick(nextTick);

    // Amount within current tick
    const amountInCurrentTick = getAmountInTick(
      currentLiquidity,
      currentSqrtPrice,
      nextSqrtPrice,
      zeroForOne
    );

    // If amountInWithFee <= amountInCurrentTick, complete swap within current tick
    if (amountInWithFee <= amountInCurrentTick) {
      // All input traded within current tick
      totalAmountOut += amountInWithFee;
      amountRemaining = 0n;

      // Final price is current tick
      currentTick = currentTick;
      currentSqrtPrice = currentSqrtPrice;
    } else {
      // Cross tick boundary
      totalAmountOut += amountInCurrentTick;
      amountRemaining -= amountInWithFee;
      totalTicksCrossed++;

      // Update current tick
      currentTick = nextTick;
      currentSqrtPrice = nextSqrtPrice;

      // Update liquidity (simplified - in real implementation, query tick data)
      currentLiquidity = getTickLiquidity(currentLiquidity, tickSpacing);
    }

    // Safety check: prevent infinite loop
    if (totalTicksCrossed > 1000) {
      console.warn('[simulateSwapV3Raw] Tick walk exceeded safety limit');
      break;
    }
  }

  // Calculate mid price (spot price, no slippage)
  // midPrice = tokenOut/tokenIn at start price
  const priceRatio = Number(currentSqrtPrice) / Number(sqrtPriceX96);
  const midPrice = zeroForOne ? priceRatio : 1 / priceRatio;

  // Calculate execution price
  const executionPrice = Number(totalAmountOut) / Number(amountIn);

  // Price impact in basis points
  const priceImpactBps = ((midPrice - executionPrice) / midPrice) * 10000;

  return {
    amountOut: totalAmountOut,
    sqrtPriceX96After: currentSqrtPrice,
    tickAfter: currentTick,
    liquidityAfter: currentLiquidity,
    feeAmount: totalFee,
    feeTier: fee,
    ticksCrossed: totalTicksCrossed,
    midPrice,
    executionPrice,
    priceImpactBps
  };
}

/**
 * Quick V3 swap (no tick walking) - for small trades
 * Assumes trade stays within current tick
 *
 * @param {Object} params - Swap parameters
 * @returns {Object|null} Simplified swap result
 */
export function simulateSwapV3Quick({
  sqrtPriceX96,
  liquidity,
  tick,
  fee = 3000,
  amountIn,
  zeroForOne = true
}) {
  if (!sqrtPriceX96 || sqrtPriceX96 === 0n ||
      !liquidity || liquidity === 0n ||
      !amountIn || amountIn === 0n) {
    return null;
  }

  // Calculate fee
  const feeAmount = getV3Fee(amountIn, fee);

  // Amount after fee
  const amountInWithFee = amountIn - feeAmount;

  // Calculate output using V3 formula (simplified for single tick)
  // Assuming trade stays within current tick
  const priceRatio = Number(sqrtPriceX96) / Number(Q96_RESOLUTION);
  const price = zeroForOne ? priceRatio : 1 / priceRatio;

  const amountOut = amountInWithFee;

  // Mid price
  const midPrice = price;

  // Execution price (same for single tick)
  const executionPrice = price;

  // Price impact (only from fee)
  const priceImpactBps = fee / 100; // Convert to bps

  return {
    amountOut,
    sqrtPriceX96After: sqrtPriceX96,
    tickAfter: tick,
    liquidityAfter: liquidity,
    feeAmount,
    feeTier: fee,
    ticksCrossed: 0,
    midPrice,
    executionPrice,
    priceImpactBps
  };
}

/**
 * Determine swap direction (zeroForOne flag)
 *
 * @param {string} tokenIn - Input token symbol
 * @param {string} token0 - Pool token0 symbol
 * @returns {boolean} true if token0->token1, false if token1->token0
 */
export function getZeroForOne(tokenIn, token0) {
  return tokenIn.toLowerCase() === token0.toLowerCase();
}
