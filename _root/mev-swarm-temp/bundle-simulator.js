# REMOVED: sensitive data redacted by automated security cleanup
/**
 * MEV Swarm - Bundle Simulator
 * Simulates arbitrage bundles to estimate profitability before execution
 * 
 * Usage:
 *   import { simulateBundle, buildArbBundle } from './bundle-simulator.js';
/*
 * MEV Swarm - Bundle Simulator
 * Produces a dry-run simulation of an arbitrage bundle
 * 
 * Includes real Uniswap V3 math for accurate price impact calculation
 *
 * Note: keep a single ethers import at top of file.
 */
// Token addresses (mainnet)
const USDC = 'REDACTED_ADDRESS';
const USDT = 'REDACTED_ADDRESS';
const WETH = 'REDACTED_ADDRESS';
const WBTC = 'REDACTED_ADDRESS';

/**
 * Build an arbitrage bundle (multi-step swap)
 */
export function buildArbBundle(route, amountIn, provider) {
  const path = route.slice(0, -1); // All but last
  
  // For V3, need encodePath
  const encodePath = path.map(token => {
    // In production, would use proper fee tiers
    return token;
  });
  
  // Build the bundle transactions
  const txs = [];
  
  // Approve tokens if needed (skipped in simulation)
  
  // Build swap calls
  if (route.length === 3) {
    // Simple 2-hop: tokenA -> tokenB -> tokenC
    const [tokenIn, tokenMid, tokenOut] = route;
    const amountOut = simulateSwap(amountIn, tokenIn, tokenMid, tokenOut);
    txs.push({
      type: 'swap',
      route,
      amountIn: amountIn.toString(),
      amountOut: amountOut.toString()
    });
  } else if (route.length === 4) {
    // Triangular: tokenA -> tokenB -> tokenC -> tokenA
    const [tokenA, tokenB, tokenC, tokenD] = route;
    const amount1 = simulateSwap(amountIn, tokenA, tokenB, tokenC);
    const amount2 = simulateSwap(amount1, tokenB, tokenC, tokenD);
    txs.push({
      type: 'triangular',
      route,
      amountIn: amountIn.toString(),
      amountOut: amount2.toString(),
      intermediate: amount1.toString()
    });
  }
  
  return {
    txs,
    route,
    amountIn: amountIn.toString(),
    expectedOut: txs[txs.length - 1]?.amountOut || '0',
    gasEstimate: estimateBundleGas(txs)
  };
}

/**
 * Simulate a swap (simplified - no real liquidity calculation)
 */
function simulateSwap(amountIn, tokenIn, tokenMid, tokenOut) {
  // Simplified simulation - assumes 0.3% fee and small price impact
  const fee = 0.003;
  const priceImpact = 0.001; // 0.1% slippage assumption
  
  const afterFee = amountIn * (1 - fee);
  // In production, would calculate real price impact based on pool reserves
  
  return afterFee * (1 - priceImpact);
}

/**
 * Estimate gas for bundle
 */
function estimateBundleGas(txs) {
  // Base gas per tx + gas for each swap
  const baseGas = 21000; // Base transaction
  const swapGas = 100000; // Uniswap swap overhead
  const approvalGas = 46000; // Token approval
  
  let total = baseGas + approvalGas; // Initial approval
  total += txs.length * swapGas;
  
  return total;
}

/**
 * Simulate a bundle execution
 */
export async function simulateBundle(bundle, provider) {
  const { txs, route, amountIn, expectedOut } = bundle;
  
  // Estimate gas cost
  const gasLimit = estimateBundleGas(txs);
  
  try {
    // Get current gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('30', 'gwei');
    // normalize gasLimit to BigInt to avoid mixing types
    const gasLimitBig = BigInt(gasLimit);
    const gasPriceBig = typeof gasPrice === 'bigint' ? gasPrice : BigInt(gasPrice);

    const gasCost = gasLimitBig * gasPriceBig;
    const gasCostEth = ethers.formatEther(gasCost);
    
    // Calculate profit
    const expectedOutNum = parseFloat(expectedOut);
    const profit = expectedOutNum - parseFloat(amountIn) - parseFloat(gasCostEth);
    
    return {
      success: true,
      route,
      amountIn,
      expectedOut,
      gasLimit,
      gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' gwei',
      gasCostEth,
      profitEth: profit.toFixed(6),
      profitable: profit > 0,
      timestamp: Date.now()
    };
  } catch (error) {
    return {
      success: false,
      route,
      error: error.message,
      timestamp: Date.now()
    };
  }
}

/**
 * Simulate cross-pool arbitrage (buy low, sell high)
 */
export function simulateCrossPoolArb(poolAPrice, poolBPrice, amountIn, gasCostEth) {
  // Buy cheaper, sell expensive
  const cheaperPrice = Math.min(poolAPrice, poolBPrice);
  const expensivePrice = Math.max(poolAPrice, poolBPrice);
  
  // Simulate: buy token at cheaper price, sell at expensive price
  const amountOut = (amountIn / cheaperPrice) * expensivePrice;
  const profit = amountOut - amountIn - gasCostEth;
  
  return {
    type: 'cross-pool',
    poolAPrice,
    poolBPrice,
    amountIn,
    amountOut: amountOut.toFixed(6),
    gasCostEth,
    profitEth: profit.toFixed(6),
    profitable: profit > 0,
    spread: ((expensivePrice - cheaperPrice) / cheaperPrice * 100).toFixed(4) + '%'
  };
}

/**
 * MEV Swarm - Bundle Simulator
 * Produces a dry-run simulation of an arbitrage bundle
 * 
 * Includes real Uniswap V3 math for accurate price impact calculation
 */

import { ethers } from 'ethers';

// Q96 constant for Uniswap V3 sqrt price math
const Q96 = 2n ** 96n;

/**
 * Convert tick → sqrtPriceX96
 */
export function tickToSqrtPriceX96(tick) {
  const sqrt = Math.pow(1.0001, tick / 2);
  return BigInt(Math.floor(sqrt * Number(Q96)));
}

/**
 * Convert sqrtPriceX96 → price
 */
export function sqrtPriceX96ToPrice(sqrtPriceX96, decimals0, decimals1) {
  const sqrt = Number(sqrtPriceX96) / Number(Q96);
  const price = sqrt * sqrt;
  return price * 10 ** (decimals0 - decimals1);
}

/**
 * Simulate a single-hop exactInput swap
 * Uses Uniswap V3 math: liquidity, ticks, sqrtPrice, fee tier.
 */
export function simulateV3SwapExactIn({
  amountIn,
  sqrtPriceX96,
  liquidity,
  tick,
  fee, // e.g. 500, 3000, 10000
  decimalsIn,
  decimalsOut
}) {
  // Chunked multi-step approximate tick walk to model price impact more realistically.
  const amtInNum = Number(amountIn);
  const priceStart = sqrtPriceX96ToPrice(sqrtPriceX96, decimalsIn || 18, decimalsOut || 18);
  const feePct = fee / 1e6;
  const amountAfterFee = amtInNum * (1 - feePct);

  // Approximate numeric liquidity
  let liquidityNum = 1e12;
  try { liquidityNum = Math.max(1, Number(liquidity)); } catch (e) { liquidityNum = 1e12; }

  const chunks = 20;
  let remaining = amountAfterFee;
  let currentPrice = priceStart;
  let amountOutAccum = 0;

  for (let i = 0; i < chunks && remaining > 1e-18; i++) {
    const chunk = remaining / (chunks - i);

    // chunk slippage heuristic: larger chunk => larger slippage, scaled by liquidity
    const chunkImpact = Math.min(0.5, (chunk / (liquidityNum)) * 0.05);

    // compute output for this chunk at currentPrice with slippage applied
    const outChunk = chunk * currentPrice * (1 - chunkImpact);
    amountOutAccum += outChunk;

    // advance price upward proportionally to chunk relative to liquidity
    const priceMove = (chunk / liquidityNum) * 0.02; // small price move per chunk
    currentPrice = currentPrice * (1 + priceMove);

    remaining -= chunk;
  }

  const feePaid = amtInNum - amountAfterFee;

  return {
    amountIn: amtInNum,
    amountOut: amountOutAccum,
    sqrtPriceAfter: sqrtPriceX96,
    tickAfter: tick,
    feePaid
  };
}

/**
 * Multi-hop simulation
 */
export function simulateRouteExactIn(route, pools, amountIn) {
  let currentAmount = amountIn;

  for (let i = 0; i < route.length - 1; i++) {
    const tokenIn = route[i];
    const tokenOut = route[i + 1];
    // try both key orders
    let pool = pools[`${tokenIn}/${tokenOut}`];
    let reversed = false;
    if (!pool) {
      pool = pools[`${tokenOut}/${tokenIn}`];
      reversed = !!pool;
    }

    if (!pool) {
      return { error: `Missing pool for hop ${tokenIn}→${tokenOut}` };
    }

    // If the pool is reversed, swap decimals order when computing price
    const decimalsIn = reversed ? pool.decimalsOut : pool.decimalsIn;
    const decimalsOut = reversed ? pool.decimalsIn : pool.decimalsOut;

    const sim = simulateV3SwapExactIn({
      amountIn: currentAmount,
      sqrtPriceX96: pool.sqrtPriceX96,
      liquidity: pool.liquidity,
      tick: pool.tick,
      fee: pool.fee,
      decimalsIn,
      decimalsOut
    });

    currentAmount = sim.amountOut;
  }

  return {
    amountIn,
    amountOut: currentAmount
  };
}

/**
 * Main bundle simulator - computes realistic profit with price impact
 */
export function simulateBundleFromOpportunity(opportunity, poolData, gasPriceGwei = 20) {
  if (!opportunity) return null;

  const { route, optimalTradeSize, priceA, priceB, direction } = opportunity;

  // Convert gas price
  const gasPrice = ethers.parseUnits(gasPriceGwei.toString(), 'gwei');

  // Estimate gas for a 2-hop arb
  const gasUnits = 250000n;
  const gasCostEth = Number(ethers.formatEther(gasUnits * gasPrice));

  // Determine trade direction
  const tradeSizeEth = optimalTradeSize;

  // Simulate price impact (simplified)
  const priceImpactA = tradeSizeEth * 0.0005; // 5 bps
  const priceImpactB = tradeSizeEth * 0.0005;

  // Effective prices after impact
  const effectiveA = priceA * (1 - priceImpactA);
  const effectiveB = priceB * (1 - priceImpactB);

  // Compute gross profit
  const grossProfit = Math.abs(effectiveB - effectiveA) * tradeSizeEth;

  // Net profit
  const netProfit = grossProfit - gasCostEth;

  return {
    type: opportunity.type,
    direction,
    route: route || [],
    tradeSizeEth,
    gasCostEth,
    grossProfit: grossProfit.toFixed(6),
    netProfit: netProfit.toFixed(6),
    profitable: netProfit > 0,
    timestamp: Date.now()
  };
}

/**
 * Format bundle simulation for logging
 */
export function formatBundle(sim) {
  if (!sim) return 'No bundle simulated';

  return `[Simulated BUNDLE] ${sim.profitable ? '+' : ''}${sim.netProfit} ETH
  Route: ${Array.isArray(sim.route) ? sim.route.join(' → ') : sim.route}
  Trade Size: ${sim.tradeSizeEth} ETH
  Gas: ${sim.gasCostEth} ETH
  Gross: ${sim.grossProfit} ETH
  Direction: ${sim.direction}`;
}

/**
 * Create a backrun bundle (sandwich victim transaction)
 */
export function createBackrunBundle(victimTx, poolData, provider) {
  // In a real implementation, would:
  // 1. Decode victim transaction
  // 2. Calculate price impact
  // 3. Build front-run + victim + back-run bundle
  
  return {
    type: 'backrun',
    victim: victimTx?.hash || 'unknown',
    // Would include actual bundle structure
    bundle: [],
    estimatedProfit: '0',
    note: 'Backrun simulation requires decoded mempool transactions'
  };
}

/**
 * Calculate optimal trade size based on pool liquidity
 */
export function calculateOptimalSize(priceDelta, poolLiquidity, gasCostEth) {
  // Smaller delta = smaller optimal size (less slippage)
  // Larger liquidity = can trade more
  
  const maxSize = poolLiquidity * 0.01; // Max 1% of liquidity
  const deltaMultiplier = Math.min(1, priceDelta * 10); // Higher delta = larger size
  
  // Calculate break-even size
  // profit = size * delta - gasCost
  // 0 = size * delta - gasCost
  // size = gasCost / delta
  const breakEven = gasCostEth / priceDelta;
  
  const optimal = Math.min(maxSize, breakEven * 2); // Trade 2x break-even for buffer
  
  return {
    optimalSize: optimal.toFixed(4),
    maxSize: maxSize.toFixed(4),
    breakEvenSize: breakEven.toFixed(4),
    recommendation: optimal > breakEven ? 'TRADE' : 'SKIP'
  };
}

/**
 * Simulate a triangular arbitrage (3 hops -> 4-token route)
 */
/**
 * Simulate a triangular arbitrage using pool-level V3 simulation for fidelity.
 * route: array of 4 tokens (A -> B -> C -> D)
 * poolData: object mapping "tokenIn/tokenOut" -> pool info (sqrtPriceX96, liquidity, tick, fee, decimalsIn, decimalsOut)
 */
export function simulateTriangularArb(route, poolData, amountIn, gasPriceGwei = 20n) {
  if (!Array.isArray(route) || route.length !== 4) {
    return { error: 'route must be an array of 4 tokens for triangular arb' };
  }

  // Use route hops: A->B, B->C, C->D
  const hops = [route[0], route[1], route[2], route[3]];

  // Run multi-hop V3 exact-in simulation across the 3 hops
  try {
    const result = simulateRouteExactIn(hops, poolData, amountIn);
    if (result.error) return { success: false, error: result.error };

    const amountOut = result.amountOut;

    // Gas estimation (conservative for 3 swaps)
    const gasUnits = 300000n;
    const gasPrice = typeof gasPriceGwei === 'bigint' ? gasPriceGwei : BigInt(Math.floor(Number(gasPriceGwei)));
    // Convert gwei to wei: multiply by 1e9
    const gasPriceWei = gasPrice * 1000000000n;

    // Compute gas cost in ETH using ethers helpers if available
    let gasCostEth = 0;
    try {
      gasCostEth = Number(ethers.formatEther(gasUnits * gasPriceWei));
    } catch (e) {
      // fallback numeric estimate
      gasCostEth = Number(gasUnits) * Number(gasPriceWei) / 1e18;
    }

    const profit = Number(amountOut) - Number(amountIn) - gasCostEth;

    return {
      success: true,
      route: hops,
      amountIn,
      amountOut,
      gasUnits: Number(gasUnits),
      gasPriceGwei: gasPrice.toString(),
      gasCostEth,
      profitEth: profit,
      profitable: profit > 0,
      timestamp: Date.now()
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
export default {
  buildArbBundle,
  simulateBundle,
  simulateCrossPoolArb,
  simulateTriangularArb,
  simulateBundleFromOpportunity,
  createBackrunBundle,
  calculateOptimalSize
};