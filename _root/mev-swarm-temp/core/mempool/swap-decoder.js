/**
 * MEV Swarm - Swap Decoder
 * Decodes and analyzes swap transactions from mempool
 *
 * Capabilities:
 * - V2 swap parameter extraction
 * - V3 swap parameter extraction
 * - Multi-hop path detection
 * - Token and amount identification
 */

import { ethers } from 'ethers';

// Standard ABIs for swap functions
export const SWAP_ABIS = {
  // Uniswap V2
  swapExactTokensForTokens: [
    'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)'
  ],
  swapExactETHForTokens: [
    'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)'
  ],
  swapExactTokensForETH: [
    'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)'
  ],

  // Uniswap V3
  exactInputSingle: [
    'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint deadline, uint amountIn, uint amountOutMinimum, uint160 sqrtPriceLimitX96) returns (uint amountOut)'
  ],
  exactInput: [
    'function exactInput((address tokenIn, address tokenOut, uint24 fee, address recipient, uint deadline, uint amountIn, uint amountOutMinimum, uint160 sqrtPriceLimitX96, bytes path) returns (uint amountOut)'
  ],

  // SushiSwap
  swapExactTokensForTokensSupportingFeeOnTransferTokens: [
    'function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)'
  ],

  // Curve
  exchange: [
    'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) returns (uint256)'
  ]
};

// Create interfaces for decoding
const INTERFACES = {};

for (const [name, abi] of Object.entries(SWAP_ABIS)) {
  INTERFACES[name] = new ethers.Interface(abi);
}

/**
 * Decode swap transaction
 */
export function decodeSwap(tx) {
  if (!tx.data || tx.data.length < 10) {
    return null;
  }

  const selector = tx.data.slice(0, 10);
  let decoded = null;

  // Try each interface
  for (const [name, iface] of Object.entries(INTERFACES)) {
    try {
      const parsed = iface.parseTransaction({ data: tx.data });
      if (parsed && parsed.name) {
        decoded = {
          swapType: name,
          functionName: parsed.name,
          args: parsed.args,
          selector
        };
        break;
      }
    } catch (error) {
      // Try next interface
    }
  }

  if (!decoded) {
    return null;
  }

  // Extract swap details
  return {
    ...decoded,
    details: extractSwapDetails(decoded, tx)
  };
}

/**
 * Extract swap details from decoded transaction
 */
export function extractSwapDetails(decoded, tx) {
  const { swapType, args } = decoded;

  switch (swapType) {
    case 'swapExactTokensForTokens':
    case 'swapExactTokensForTokensSupportingFeeOnTransferTokens':
      return {
        type: 'V2',
        amountIn: args.amountIn,
        amountOutMin: args.amountOutMin,
        path: args.path,
        recipient: args.to,
        deadline: args.deadline,
        hopCount: args.path?.length || 0,
        tokenIn: args.path?.[0],
        tokenOut: args.path?.[args.path.length - 1]
      };

    case 'swapExactETHForTokens':
      return {
        type: 'V2_ETH',
        amountIn: tx.value,
        amountOutMin: args.amountOutMin,
        path: args.path,
        recipient: args.to,
        deadline: args.deadline,
        hopCount: args.path?.length || 0,
        tokenIn: 'ETH',
        tokenOut: args.path?.[args.path.length - 1]
      };

    case 'swapExactTokensForETH':
      return {
        type: 'V2_ETH_OUT',
        amountIn: args.amountIn,
        amountOutMin: args.amountOutMin,
        path: args.path,
        recipient: args.to,
        deadline: args.deadline,
        hopCount: args.path?.length || 0,
        tokenIn: args.path?.[0],
        tokenOut: 'ETH'
      };

    case 'exactInputSingle':
      const params = args[0];
      return {
        type: 'V3_SINGLE',
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        fee: params.fee,
        recipient: params.recipient,
        amountIn: params.amountIn,
        amountOutMin: params.amountOutMinimum,
        deadline: params.deadline,
        sqrtPriceLimit: params.sqrtPriceLimitX96,
        poolFee: params.fee
      };

    case 'exactInput':
      const exactParams = args[0];
      return {
        type: 'V3_MULTI',
        tokenIn: exactParams.tokenIn,
        tokenOut: exactParams.tokenOut,
        recipient: exactParams.recipient,
        amountIn: exactParams.amountIn,
        amountOutMin: exactParams.amountOutMinimum,
        deadline: exactParams.deadline,
        sqrtPriceLimit: exactParams.sqrtPriceLimitX96,
        path: decodeV3Path(exactParams.path)
      };

    case 'exchange':
      return {
        type: 'CURVE',
        poolIndex: args.i,
        toPoolIndex: args.j,
        amountIn: args.dx,
        amountOutMin: args.min_dy
      };

    default:
      return { type: 'UNKNOWN' };
  }
}

/**
 * Decode V3 multi-hop path
 */
export function decodeV3Path(encodedPath) {
  if (!encodedPath || encodedPath === '0x') {
    return [];
  }

  const path = [];
  const data = encodedPath.slice(2); // Remove 0x

  let offset = 0;

  while (offset < data.length) {
    // Token address (20 bytes)
    if (offset + 40 > data.length) break;

    const token = '0x' + data.slice(offset, offset + 40);
    path.push({ token, offset });

    offset += 40;

    // Fee (3 bytes) if not last
    if (offset + 6 > data.length) break;

    const fee = parseInt('0x' + data.slice(offset, offset + 6), 16);
    path.push({ fee, offset });

    offset += 6;
  }

  return path;
}

/**
 * Get pools affected by swap
 */
export function getAffectedPools(swapDetails) {
  const pools = [];

  switch (swapDetails.type) {
    case 'V2':
    case 'V2_ETH':
    case 'V2_ETH_OUT':
      // Each adjacent pair in path is a pool
      if (swapDetails.path && swapDetails.path.length >= 2) {
        for (let i = 0; i < swapDetails.path.length - 1; i++) {
          pools.push({
            type: 'V2',
            token0: swapDetails.path[i],
            token1: swapDetails.path[i + 1],
            hop: i + 1
          });
        }
      }
      break;

    case 'V3_SINGLE':
      pools.push({
        type: 'V3',
        token0: swapDetails.tokenIn,
        token1: swapDetails.tokenOut,
        fee: swapDetails.poolFee,
        hop: 1
      });
      break;

    case 'V3_MULTI':
      const path = swapDetails.path;
      for (let i = 0; i < path.length; i += 2) {
        if (i + 1 < path.length) {
          pools.push({
            type: 'V3',
            token0: path[i].token,
            token1: path[i + 2]?.token || swapDetails.tokenOut,
            fee: path[i + 1]?.fee,
            hop: (i / 2) + 1
          });
        }
      }
      break;

    case 'CURVE':
      pools.push({
        type: 'CURVE',
        poolIndex: swapDetails.poolIndex,
        hop: 1
      });
      break;
  }

  return pools;
}

/**
 * Calculate swap impact on reserves
 */
export function calculateSwapImpact(swapDetails, poolReserves) {
  const affectedPools = getAffectedPools(swapDetails);
  const impacts = [];

  for (const pool of affectedPools) {
    const reserves = poolReserves.get(getPoolKey(pool));
    if (!reserves) continue;

    let impact = { pool, currentReserves: reserves };

    switch (pool.type) {
      case 'V2':
        // Simplified V2 impact calculation
        impact.predictedReserves = {
          reserve0: BigInt(reserves.reserve0) - (swapDetails.amountIn / 2n),
          reserve1: BigInt(reserves.reserve1) + (swapDetails.amountOutMin || 0n)
        };
        impact.priceImpact = calculatePriceImpact(
          reserves.reserve0,
          reserves.reserve1,
          impact.predictedReserves.reserve0,
          impact.predictedReserves.reserve1
        );
        break;

      case 'V3':
        // V3 requires more complex calculation
        impact.predictedReserves = {
          sqrtPriceX96: reserves.sqrtPriceX96,
          liquidity: reserves.liquidity
        };
        impact.priceImpact = 0; // Placeholder
        break;

      case 'CURVE':
        // Curve impact calculation
        impact.predictedReserves = {
          balances: reserves.balances
        };
        impact.priceImpact = 0; // Placeholder
        break;
    }

    impacts.push(impact);
  }

  return impacts;
}

/**
 * Calculate price impact
 */
export function calculatePriceImpact(currentRes0, currentRes1, newRes0, newRes1) {
  const currentPrice = Number(currentRes1) / Number(currentRes0);
  const newPrice = Number(newRes1) / Number(newRes0);

  return Math.abs((newPrice - currentPrice) / currentPrice);
}

/**
 * Get pool key for reserves lookup
 */
export function getPoolKey(pool) {
  switch (pool.type) {
    case 'V2':
      return `V2-${pool.token0}-${pool.token1}`;
    case 'V3':
      return `V3-${pool.token0}-${pool.token1}-${pool.fee}`;
    case 'CURVE':
      return `CURVE-${pool.poolIndex}`;
    default:
      return `UNKNOWN-${pool.hop}`;
  }
}

/**
 * Format swap for display
 */
export function formatSwapForDisplay(swap) {
  const details = swap.details;

  return {
    hash: swap.hash.substring(0, 10) + '...',
    type: details.type,
    functionName: swap.functionName,
    amountIn: formatAmount(details.amountIn),
    amountOutMin: formatAmount(details.amountOutMin),
    path: details.path ? details.path.slice(0, 3).join(' → ') : 'N/A',
    affectedPools: getAffectedPools(details).length,
    hopCount: details.hopCount || 1,
    timestamp: new Date(swap.timestamp).toISOString()
  };
}

/**
 * Format amount for display
 */
function formatAmount(amount) {
  if (!amount) return 'N/A';
  const value = Number(amount) / 1e18;
  return value.toFixed(4);
}

export default {
  decodeSwap,
  extractSwapDetails,
  getAffectedPools,
  calculateSwapImpact,
  decodeV3Path
};