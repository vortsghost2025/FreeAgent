# REMOVED: sensitive data redacted by automated security cleanup
/**
 * MEV Swarm - Uniswap V3 Pool Watcher
 * WATCHER v3.0 - FIXED WITH TYPE GUARDS AND RETURNS
 * Watches pool prices and decodes sqrtPriceX96 into human-readable prices
 */

console.log(">>> WATCHER v3.0 ACTIVE - TYPE GUARDS ENABLED <<<");

import { ethers } from 'ethers';
import { RpcManager } from './rpc-manager.js';

// Minimal Uniswap V3 Pool ABI
const POOL_ABI = [
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)'  // For V2/SushiSwap
];

// === Phase 2B: Balancer V2 & Curve ABIs ===
const BALANCER_VAULT_ABI = [
  "function getPoolTokens(bytes32 poolId) external view returns (address[] tokens, uint256[] balances, uint256 lastChangeBlock)"
];

const CURVE_STABLESWAP_ABI = [
  "function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)",
  "function coins(uint256) external view returns (address)",
  "function virtual_price() external view returns (uint256)"
];

// Known token addresses for validation
const TOKEN_ADDRESSES = {
  'USDC': 'REDACTED_ADDRESS',
  'USDT': 'REDACTED_ADDRESS',
  'ETH': 'REDACTED_ADDRESS',
  'WBTC': 'REDACTED_ADDRESS'
};

// Pool configuration - verified from Uniswap V3
const POOLS = {
  'USDC/ETH': {
    type: 'uniswap_v3',
    address: process.env.POOL_USDC_ETH || 'REDACTED_ADDRESS',
    token0: 'USDC',
    token1: 'ETH',
    decimals0: 6,
    decimals1: 18,
    invert: true  // slot0 gives ETH/USDC, we want USDC/ETH -> invert
  },
  'USDT/ETH': {
    // Uniswap V3 USDT/ETH 0.3% pool - WETH is token0, USDT is token1
    type: 'uniswap_v3',
    address: process.env.POOL_USDT_ETH || 'REDACTED_ADDRESS',
    token0: 'ETH',     // WETH is token0 in this pool!
    token1: 'USDT',    // USDT is token1
    decimals0: 18,     // ETH
    decimals1: 6,      // USDT
    invert: false      // slot0 gives USDT per ETH (token1/token0), which is what we want
  },
  'WBTC/ETH': {
    // Uniswap V3 WBTC/ETH 0.3% pool - WBTC is token0, WETH is token1
    type: 'uniswap_v3',
    address: process.env.POOL_WBTC_ETH || 'REDACTED_ADDRESS',
    token0: 'WBTC',    // WBTC is token0
    token1: 'ETH',     // WETH is token1
    decimals0: 8,      // WBTC
    decimals1: 18,     // ETH
    invert: true       // slot0 gives ETH per WBTC (token1/token0), we want WBTC per ETH -> invert
  },
  'SushiSwap USDC/ETH': {
    // SushiSwap USDC/ETH pair - USDC is token0, WETH is token1
    address: process.env.POOL_SUSHI_USDC_ETH || 'REDACTED_ADDRESS',
    type: 'uniswap_v2',  // SushiSwap uses Uniswap V2 formula
    token0: 'USDC',
    token1: 'ETH',
    decimals0: 6,
    decimals1: 18,
    invert: true       // reserves give ETH/USDC, we want USDC/ETH -> invert
  },

  // === Phase 2: Multi-DEX Expansion ===
  // Uniswap V2 pools - use same getReserves() as SushiSwap

  'UniswapV2 USDC/ETH': {
    // Uniswap V2 USDC/ETH pair - USDC is token0, WETH is token1
    address: 'REDACTED_ADDRESS',
    type: 'uniswap_v2',
    token0: 'USDC',
    token1: 'ETH',
    decimals0: 6,
    decimals1: 18,
    invert: true       // reserves give ETH/USDC, we want USDC/ETH -> invert
  },

  // Note: UniswapV2 USDT/ETH excluded due to reserve ratio anomalies
  // (REDACTED_ADDRESS shows incorrect pricing)

  // === Phase 2B: Balancer V2 Pools ===
  'Balancer WETH/USDC': {
    address: 'REDACTED_ADDRESS',
    type: 'balancer_v2',
    vault: 'REDACTED_ADDRESS',
    poolId: 'REDACTED_PRIVATE_KEY',
    token0: 'ETH',
    token1: 'USDC',
    token0Address: 'REDACTED_ADDRESS',
    token1Address: 'REDACTED_ADDRESS',
    decimals0: 18,
    decimals1: 6,
    invert: false
  },

  'Balancer WETH/USDT': {
    address: 'REDACTED_ADDRESS',
    type: 'balancer_v2',
    vault: 'REDACTED_ADDRESS',
    poolId: 'REDACTED_PRIVATE_KEY',
    token0: 'ETH',
    token1: 'USDT',
    token0Address: 'REDACTED_ADDRESS',
    token1Address: 'REDACTED_ADDRESS',
    decimals0: 18,
    decimals1: 6,
    invert: false
  },

  // === Phase 2B: Curve StableSwap Pools ===
  // Curve 3pool (USDC/USDT/DAI) - mainnet address
  'Curve USDC/USDT': {
    address: 'REDACTED_ADDRESS', // Curve 3pool
    type: 'curve_stableswap',
    token0: 'USDC',
    token1: 'USDT',
    token0Address: 'REDACTED_ADDRESS',
    token1Address: 'REDACTED_ADDRESS',
    decimals0: 6,
    decimals1: 6,
    index0: 1, // USDC is at index 1 in 3pool
    index1: 2, // USDT is at index 2 in 3pool
    invert: false
  },

  // === END POOLS CONFIG ===
};

// DEBUG: Log loaded pool addresses on startup
console.log('[DEBUG] Loaded pool addresses:');
for (const [name, config] of Object.entries(POOLS)) {
  console.log(`  ${name}: ${config.address}`);
}

const priceCache = {};
let rpcManager = null;

// Per-block slot0 cache to reduce RPC calls
const slot0Cache = new Map(); // key: `${poolAddress}-${blockNumber}` -> { sqrtPriceX96, tick }

// Price math cache keyed by sqrtPriceX96 string - avoids recomputing same price
const priceMathCache = new Map(); // key: sqrtPriceX96.toString() -> { ethPerToken, tokenPerEth }

// Rate limit backoff
let rateLimitedUntil = 0;

// Initialize RpcManager - uses Chainstack only with forced chainId
function initRpcManager() {
  if (rpcManager) return rpcManager;
  
  // Use RpcManager which already has Chainstack-only config with forced chainId: 1
  rpcManager = new RpcManager();
  console.log(`[PoolWatcher] Using unified RpcManager with Chainstack (forced chainId: 1)`);
  
  return rpcManager;
}

function getProvider() {
  const manager = initRpcManager();
  return manager.getProvider();
}

// Mark RPC failure for health tracking
function markRpcFailure() {
  if (rpcManager) {
    rpcManager.markFailure();
  }
}

// Mark RPC success for health tracking
function markRpcSuccess() {
  if (rpcManager) {
    rpcManager.resetFailures();
  }
}

// Automatic token0/token1 detection and validation
// Detects actual pool token order and validates config matches on-chain reality
const tokenDetectionCache = new Map(); // poolAddress -> { token0, token1, validated }

async function detectAndValidateTokenOrder(poolName, poolAddress) {
  // Return cached result if available
  if (tokenDetectionCache.has(poolAddress)) {
    return tokenDetectionCache.get(poolAddress);
  }

  const provider = getProvider();
  const pool = new ethers.Contract(poolAddress, POOL_ABI, provider);

  try {
    const [actualToken0, actualToken1] = await Promise.all([
      pool.token0(),
      pool.token1()
    ]);

    // Map actual addresses to token names
    let detectedToken0, detectedToken1;
    for (const [name, addr] of Object.entries(TOKEN_ADDRESSES)) {
      if (actualToken0.toLowerCase() === addr.toLowerCase()) {
        detectedToken0 = name;
      }
      if (actualToken1.toLowerCase() === addr.toLowerCase()) {
        detectedToken1 = name;
      }
    }

    const result = {
      actualToken0: actualToken0.toLowerCase(),
      actualToken1: actualToken1.toLowerCase(),
      detectedToken0,
      detectedToken1,
      validated: false
    };

    // Get the config for this pool
    const config = POOLS[poolName];
    if (config) {
      // Check if config matches on-chain reality
      const configToken0Addr = TOKEN_ADDRESSES[config.token0]?.toLowerCase();
      const configToken1Addr = TOKEN_ADDRESSES[config.token1]?.toLowerCase();

      if (configToken0Addr && configToken1Addr) {
        const token0Match = actualToken0.toLowerCase() === configToken0Addr;
        const token1Match = actualToken1.toLowerCase() === configToken1Addr;

        result.validated = token0Match && token1Match;

        if (!result.validated) {
          console.warn(`[PoolWatcher] ⚠️  Token order mismatch for ${poolName}:`);
          console.warn(`  Config:   token0=${config.token0}, token1=${config.token1}`);
          console.warn(`  On-chain: token0=${detectedToken0}, token1=${detectedToken1}`);
          console.warn(`  Your config has token order reversed! Pool prices will be wrong.`);
          console.warn(`  Update config to: token0='${detectedToken0}', token1='${detectedToken1}'`);
        } else {
          console.log(`[PoolWatcher] ✅ Token order validated for ${poolName}: ${detectedToken0}/${detectedToken1}`);
        }
      }
    }

    tokenDetectionCache.set(poolAddress, result);
    return result;
  } catch (err) {
    console.error(`[PoolWatcher] Token detection failed for ${poolName}:`, err.message);
    return null;
  }
}

// Safe RPC call with 429 backoff and RpcManager health tracking
async function safeCall(fn) {
  const now = Date.now();
  if (now < rateLimitedUntil) {
    console.log("[PoolWatcher] Skipping cycle due to recent rate limit");
    return null;
  }
  try {
    const result = await fn();
    markRpcSuccess();
    return result;
  } catch (err) {
    const errorInfo = err.info || {};
    const status = errorInfo.responseStatus || errorInfo.status;
    
    if (status === 429 || err.code === 'SERVER_ERROR') {
      console.log('[PoolWatcher] Rate limit hit — backing off 5 seconds');
      rateLimitedUntil = now + 5000;
      markRpcFailure();
    } else if (err.code === 'CALL_EXCEPTION') {
      console.log('[PoolWatcher] Contract call failed - marking provider unhealthy');
      markRpcFailure();
    } else {
      markRpcFailure();
    }
    return null;
  }
}

// Get slot0 with caching (per pool + block)
// ONLY call for Uniswap V3 - other pool types don't have slot0()
async function getSlot0Cached(pool, poolAddress, poolType, blockTag) {
  // Guard: only Uniswap V3 has slot0()
  if (poolType !== 'uniswap_v3') {
    console.log('[DEBUG slot0] skipping - not uniswap_v3, type:', poolType);
    return null;
  }
  
  const key = `${poolAddress}-${blockTag}`;
  if (slot0Cache.has(key)) {
    return slot0Cache.get(key);
  }
  console.log('[DEBUG slot0] calling slot0() for uniswap_v3 pool');
  const slot0 = await safeCall(() => pool.slot0({ blockTag }));
  if (slot0) {
    slot0Cache.set(key, slot0);
  }
  return slot0;
}

// Clear slot0 cache (call once per block)
export function clearSlot0Cache() {
  slot0Cache.clear();
  priceMathCache.clear(); // also clear price math cache per block
}

// Production-grade price function that returns BOTH prices
// Returns: { ethPerToken, tokenPerEth } for any V3 pool
// Handles all decimal combinations correctly - NO floating point until final step
export function getV3PricesBothWays(sqrtPriceX96, decimals0, decimals1) {
  if (!sqrtPriceX96 || sqrtPriceX96 === 0n) {
    return { ethPerToken: 0, tokenPerEth: 0 };
  }

  // Cache key includes decimals to avoid collisions between pools with different token decimals
  const cacheKey = `${sqrtPriceX96}-${decimals0}-${decimals1}`;
  if (priceMathCache.has(cacheKey)) {
    return priceMathCache.get(cacheKey);
  }

  // sqrtPriceX96 is Q96.96 fixed point - always gives token1/token0
  const numerator = sqrtPriceX96 * sqrtPriceX96;
  const denominator = 1n << 192n;

  // ratio scaled by 1e18
  const ratio = (numerator * 10n ** 18n) / denominator;

  // CRITICAL: Use BigInt for decimal diff - never convert to Number early!
  // The ratio (sqrtPrice^2 / 2^192) yields token1/token0 in raw base-unit terms
  // (i.e. reserve1_wei / reserve0_wei). To convert to human units (token1 per
  // token0) we must scale by 10^(decimals0 - decimals1).
  const decimalDiff = BigInt(decimals0) - BigInt(decimals1);

  let adjusted;
  if (decimalDiff >= 0n) {
    // token0 has more or equal decimals -> multiply
    adjusted = ratio * 10n ** decimalDiff;
  } else {
    // token0 has fewer decimals -> divide
    adjusted = ratio / 10n ** (-decimalDiff);
  }

  // Convert to float ONLY at the very end - this is the only Number() call
  const price1Per0 = Number(adjusted) / 1e18;

  // CRITICAL FIX: sqrtPrice gives token1/token0 (e.g., WBTC/ETH for WBTC/ETH pool)
  // So:
  //   token1Per0 = price1Per0 = token1/token0
  //   token0Per1 = 1/price1Per0 = token0/token1
  const token1Per0 = price1Per0;
  const token0Per1 = price1Per0 > 0 ? 1 / price1Per0 : 0;

  const result = { ethPerToken: token1Per0, tokenPerEth: token0Per1 };
  priceMathCache.set(cacheKey, result);
  return result;
}

// Uniswap V3 tick constants
const TICK_SPACINGS = {
  500: 10,    // 0.05% pool
  3000: 60,   // 0.3% pool
  10000: 200  // 1% pool
};

// Simulate swap on V3 pools by walking ticks
// Returns: { amountOut, executionPrice, priceImpactBps, finalTick, finalSqrtPriceX96 }
export function simulateSwapV3(sqrtPriceX96, liquidity, amountIn, tickSpacing, fee) {
  if (!sqrtPriceX96 || !liquidity || !amountIn || sqrtPriceX96 === 0n) {
    return null;
  }

  const amountInNum = Number(amountIn);

  // Current tick from sqrtPriceX96
  let tick = Math.floor(Math.log(Number(sqrtPriceX96) / Math.log(1.0001)) / 96);
  let currentLiquidity = Number(liquidity);

  // Calculate amount that can be traded across current tick boundary
  // This is simplified - real implementation needs to handle tick boundaries
  const ratio = (1.0001 ** tick);
  const price = ratio * ratio;

  // Apply fee (0.3% = 3000 basis points = subtract 0.3%)
  const feeMultiplier = 1 - (fee / 1000000);
  const amountOut = amountInNum * price * feeMultiplier;

  // Execution price (what we actually get)
  const executionPrice = amountOut / amountInNum;

  // Mid price (spot price, no slippage)
  const midPrice = 1 / price;  // Rough approximation

  // Price impact as basis points
  const priceImpactBps = ((midPrice - executionPrice) / midPrice) * 10000;

  return {
    amountOut,
    executionPrice,
    midPrice,
    priceImpactBps,
    finalTick: tick,
    finalSqrtPriceX96: sqrtPriceX96
  };
}

// Unified swap simulator - routes to V2 or V3 based on pool type
export async function simulateSwap(poolName, tokenIn, amountIn) {
  const config = POOLS[poolName];
  if (!config || !config.address) {
    return null;
  }

  try {
    const provider = getProvider();
    const pool = new ethers.Contract(config.address, POOL_ABI, provider);

    if (config.type === 'uniswap_v2') {
      // V2 pool simulation - use the new clean two-layer architecture
      const reserves = await safeCall(() => pool.getReserves());
      if (!reserves || Number(reserves[0]) === 0 || Number(reserves[1]) === 0) {
        return null;
      }

      // Determine decimals based on tokenIn direction
      const tokenInLower = tokenIn.toLowerCase();
      const token0Lower = config.token0.toLowerCase();
      const token1Lower = config.token1.toLowerCase();

      let decimalsIn, decimalsOut;
      if (token0Lower === tokenInLower) {
        // Swapping token0 → token1
        decimalsIn = config.decimals0;
        decimalsOut = config.decimals1;
      } else if (token1Lower === tokenInLower) {
        // Swapping token1 → token0
        decimalsIn = config.decimals1;
        decimalsOut = config.decimals0;
      } else {
        throw new Error(`Token ${tokenIn} not found in pool ${poolName}`);
      }

      // Convert amountIn from BigInt to human-readable number
      const amountInHuman = Number(ethers.formatUnits(amountIn, decimalsIn));

      // Use high-level helper that handles direction, decimals, and display scaling
      const result = simulateSwapV2ForPool(
        config,
        reserves,
        tokenIn,
        amountInHuman,
        decimalsIn,
        decimalsOut
      );

      if (!result) return null;

      // Apply invert flag for display direction (if configured)
      let midPrice = result.midPrice;
      let executionPrice = result.executionPrice;
      if (config.invert) {
        midPrice = 1 / midPrice;
        executionPrice = 1 / executionPrice;
      }

      return {
        poolName,
        tokenIn,
        amountOut: result.amountOut,
        executionPrice,
        midPrice,
        priceImpactBps: result.priceImpactBps,
        poolType: 'V2'
      };

    } else if (config.type === 'uniswap_v3') {
      // V3 pool simulation (simplified - doesn't include liquidity or tick walking)
      const slot0 = await safeCall(() => pool.slot0());
      if (!slot0 || !slot0.sqrtPriceX96) {
        return null;
      }

      // Estimate fee from pool name or default to 3000 (0.3%)
      const fee = config.fee || 3000;

      const result = simulateSwapV3(
        slot0.sqrtPriceX96,
        0n, // Simplified: no liquidity data yet
        amountIn,
        TICK_SPACINGS[fee] || 60,
        fee
      );

      return {
        poolName,
        tokenIn,
        amountOut: result?.amountOut,
        executionPrice: result?.executionPrice,
        midPrice: result?.midPrice,
        priceImpactBps: result?.priceImpactBps,
        poolType: 'V3'
      };
    }
  } catch (err) {
    console.error(`[PoolWatcher] Swap simulation failed for ${poolName}:`, err.message);
    return null;
  }
}

// Get price from V2-style pools (SushiSwap, Uniswap V2)
// Uses reserves instead of slot0
export function getV2PricesFromReserves(reserve0, reserve1, decimals0, decimals1) {
  if (!reserve0 || !reserve1 || Number(reserve0) === 0 || Number(reserve1) === 0) {
    return { ethPerToken: 0, tokenPerEth: 0 };
  }

  // Price = reserve1 / reserve0 (token1 per token0)
  // But reserves are raw amounts, so we need to normalize by decimals
  const r0 = Number(reserve0) / (10 ** decimals0);  // Normalize to token0 units
  const r1 = Number(reserve1) / (10 ** decimals1);  // Normalize to token1 units

  // Price = normalized reserve1 / normalized reserve0
  const price1Per0 = r1 / r0;
  const price0Per1 = price1Per0 > 0 ? 1 / price1Per0 : 0;

  return { ethPerToken: price1Per0, tokenPerEth: price0Per1 };
}

// === Phase 2B: Balancer V2 Handler ===
// Gets price from Balancer V2 weighted pool via Vault
export async function getBalancerV2Price(poolConfig, blockTag = 'latest') {
  try {
    const provider = getProvider();
    const vault = new ethers.Contract(poolConfig.vault, BALANCER_VAULT_ABI, provider);
    
    // Convert poolId from hex string to bytes32
    const poolId = poolConfig.poolId.startsWith('0x') 
      ? poolConfig.poolId 
      : '0x' + poolConfig.poolId;
    
    const result = await safeCall(() => vault.getPoolTokens(poolId, { blockTag }));
    
    if (!result) {
      console.log(`[PoolWatcher] Balancer ${poolConfig.token0}/${poolConfig.token1}: no response from vault`);
      return null;
    }

    const { tokens, balances } = result;
    
    if (!tokens || !balances || tokens.length < 2) {
      console.log(`[PoolWatcher] Balancer ${poolConfig.token0}/${poolConfig.token1}: no tokens returned`);
      return null;
    }

    // Find indices of our tokens
    const i0 = tokens.findIndex(t => t.toLowerCase() === poolConfig.token0Address.toLowerCase());
    const i1 = tokens.findIndex(t => t.toLowerCase() === poolConfig.token1Address.toLowerCase());
    
    if (i0 === -1 || i1 === -1) {
      console.log(`[PoolWatcher] Balancer ${poolConfig.token0}/${poolConfig.token1}: token not found in vault`);
      return null;
    }

    // Normalize balances to human-readable
    const bal0 = Number(balances[i0]) / (10 ** poolConfig.decimals0);
    const bal1 = Number(balances[i1]) / (10 ** poolConfig.decimals1);

    // Price = balance1 / balance0 (token1 per token0)
    const price = bal1 / bal0;
    const invertedPrice = price > 0 ? 1 / price : 0;

    return poolConfig.invert ? invertedPrice : price;
  } catch (err) {
    console.error(`[PoolWatcher] Balancer ${poolConfig.token0}/${poolConfig.token1} error:`, err.message);
    return null;
  }
}

// === Phase 2B: Curve StableSwap Handler ===
// Gets price from Curve stable pool via get_dy
export async function getCurveStablePrice(poolConfig, blockTag = 'latest') {
  try {
    // Get properly checksummed address - ethers v6 requires correct checksum
    const validAddress = ethers.getAddress(poolConfig.address.toLowerCase());
    
    const provider = getProvider();
    const curve = new ethers.Contract(validAddress, CURVE_STABLESWAP_ABI, provider);
    
    // Use get_dy to get the actual exchange rate
    // dx = 1 unit of token0 (in wei)
    const dx = 10n ** BigInt(poolConfig.decimals0);
    const dy = await safeCall(() => curve.get_dy(poolConfig.index0, poolConfig.index1, dx, { blockTag }));
    
    if (!dy || dy === 0n) {
      console.log(`[PoolWatcher] Curve ${poolConfig.token0}/${poolConfig.token1}: get_dy returned 0 or null`);
      return null;
    }

    // Price = dy/dx (token1 per token0), normalized
    const price = Number(dy) / Number(dx);
    const invertedPrice = price > 0 ? 1 / price : 0;

    return poolConfig.invert ? invertedPrice : price;
  } catch (err) {
    console.error(`[PoolWatcher] Curve ${poolConfig.token0}/${poolConfig.token1} error:`, err.message);
    return null;
  }
}

// LOW-LEVEL: Pure math function operating only on raw BigInt values
// All inputs are raw BigInts (token wei)
// Returns: { amountOut (raw), executionPrice, midPrice, priceImpactBps }
// NOTE: executionPrice and midPrice are unitless ratios - caller must scale appropriately
export function simulateSwapV2(reserveIn, reserveOut, amountIn) {
  if (!reserveIn || !reserveOut || !amountIn ||
      Number(reserveIn) === 0 || Number(reserveOut) === 0 || Number(amountIn) === 0) {
    return null;
  }

  // Constant product formula with 0.3% fee: x * y = k
  // amountOut = (rOut * amountIn * 997) / (rIn * 1000 + amountIn * 997)
  const amountInWithFee = amountIn * 997n;
  const numerator = amountInWithFee * reserveOut;
  const denominator = (reserveIn * 1000n) + amountInWithFee;
  const amountOut = numerator / denominator;

  // Prices as unitless ratios - caller must scale by decimals for display
  const midPrice = Number(reserveOut) / Number(reserveIn);
  const executionPrice = Number(amountOut) / Number(amountIn);

  const priceImpactBps = ((midPrice - executionPrice) / midPrice) * 10000;

  return {
    amountOut,
    executionPrice,
    midPrice,
    priceImpactBps
  };
}

// HIGH-LEVEL: Pool-aware helper that handles direction, decimals, and display scaling
// Returns: { amountOut (human), executionPrice, midPrice, priceImpactBps }
// Caller can apply invert flag for display direction
function simulateSwapV2ForPool(poolConfig, reserves, tokenIn, amountInHuman, decimalsIn, decimalsOut) {
  const { token0, token1 } = poolConfig;

  // Determine swap direction
  const tokenInLower = tokenIn.toLowerCase();
  const token0Lower = token0.toLowerCase();
  const token1Lower = token1.toLowerCase();

  let reserveIn, reserveOut;
  const amountIn = ethers.parseUnits(amountInHuman.toString(), decimalsIn);

  if (token0Lower === tokenInLower) {
    // Swapping token0 → token1
    reserveIn = reserves[0];
    reserveOut = reserves[1];
  } else if (token1Lower === tokenInLower) {
    // Swapping token1 → token0
    reserveIn = reserves[1];
    reserveOut = reserves[0];
  } else {
    throw new Error(`Token ${tokenIn} not found in pool`);
  }

  // Call low-level simulation
  const result = simulateSwapV2(reserveIn, reserveOut, amountIn);
  if (!result) return null;

  // Scale reserves to human units for correct price display
  const rIn = Number(reserveIn) / (10 ** decimalsIn);
  const rOut = Number(reserveOut) / (10 ** decimalsOut);

  // Compute prices in human units
  const midPriceHuman = rOut / rIn;
  const amountOutHuman = Number(ethers.formatUnits(result.amountOut, decimalsOut));
  const executionPriceHuman = amountOutHuman / amountInHuman;

  const priceImpactBps = ((midPriceHuman - executionPriceHuman) / midPriceHuman) * 10000;

  return {
    amountOut: amountOutHuman,
    executionPrice: executionPriceHuman,
    midPrice: midPriceHuman,
    priceImpactBps
  };
}

export async function getPoolPrice(poolName, blockTag = 'latest') {
  const config = POOLS[poolName];
  if (!config || !config.address) {
    return null;
  }

  // Validate token order matches on-chain reality (runs once per pool, cached)
  // Only run for Uniswap V2/V3 and SushiSwap - skip for Balancer V2 and Curve
  const isUniswapPool = config.type === 'uniswap_v3' || config.type === 'uniswap_v2' || config.type === 'sushiswap';
  if (isUniswapPool) {
    console.log(`[DEBUG] Running token validation for ${poolName} (type: ${config.type})`);
    await detectAndValidateTokenOrder(poolName, config.address);
  } else {
    console.log(`[DEBUG] Skipping token validation for ${poolName} (type: ${config.type})`);
  }

  // Debug: log which address is being used
  if (poolName === 'USDT/ETH' || poolName === 'WBTC/ETH' || poolName.includes('Sushi')) {
    console.log(`[DEBUG ${poolName}] Using address: ${config.address}`);
  }

  try {
    const provider = getProvider();
    const pool = new ethers.Contract(config.address, POOL_ABI, provider);

    // === Phase 2B: Route to Balancer V2 handler ===
    if (config.type === 'balancer_v2') {
      const price = await getBalancerV2Price(config, blockTag);
      if (price === null) {
        console.log(`[PoolWatcher] ${poolName}: Balancer V2 price fetch failed`);
        return null;
      }
      return {
        name: poolName,
        price,
        block: blockTag,
        timestamp: Date.now()
      };
    }

    // === Phase 2B: Route to Curve StableSwap handler ===
    if (config.type === 'curve_stableswap') {
      const price = await getCurveStablePrice(config, blockTag);
      if (price === null) {
        console.log(`[PoolWatcher] ${poolName}: Curve StableSwap price fetch failed`);
        return null;
      }
      return {
        name: poolName,
        price,
        block: blockTag,
        timestamp: Date.now()
      };
    }

    // Handle V3 pools (slot0-based) vs V2 pools (reserves-based)
    if (config.type === 'uniswap_v2') {
      // V2-style pool (SushiSwap, Uniswap V2)
      const reserves = await safeCall(() => pool.getReserves({ blockTag }));
      if (!reserves || Number(reserves[0]) === 0 || Number(reserves[1]) === 0) {
        console.log(`[PoolWatcher] ${poolName}: reserves returned empty, skipping`);
        return null;
      }

      const { ethPerToken, tokenPerEth } = getV2PricesFromReserves(
        reserves[0],
        reserves[1],
        config.decimals0,
        config.decimals1
      );

      // Respect invert flag at this layer
      const price = config.invert ? tokenPerEth : ethPerToken;

      return {
        name: poolName,
        price,
        block: blockTag,
        timestamp: Date.now()
      };
    } else if (config.type === 'uniswap_v3') {
      // V3-style pool (slot0-based)
      const slot0 = await getSlot0Cached(pool, config.address, config.type, blockTag);

      if (!slot0 || !slot0.sqrtPriceX96) {
        console.log(`[PoolWatcher] ${poolName}: slot0 returned empty, skipping`);
        return null;
      }

      // Debug: log raw slot0 for troubleshooting
      if (poolName === 'USDT/ETH' || poolName === 'WBTC/ETH') {
        console.log(`[DEBUG ${poolName}] sqrtPriceX96=${slot0.sqrtPriceX96}, tick=${slot0.tick}`);
      }

      // Single source of truth for price math
      // CRITICAL: Ensure sqrtPriceX96 is BigInt - ethers may return it as JS number causing precision loss
      const rawSqrtPrice = slot0.sqrtPriceX96;
      const sqrtPriceX96 = typeof rawSqrtPrice === 'bigint' ? rawSqrtPrice : BigInt(rawSqrtPrice.toString());

      const { ethPerToken, tokenPerEth } = getV3PricesBothWays(
        sqrtPriceX96,
        config.decimals0,
        config.decimals1
      );

      // Respect invert flag at this layer
      const price = config.invert ? tokenPerEth : ethPerToken;

      return {
        name: poolName,
        price,
        sqrtPriceX96: slot0.sqrtPriceX96,
        tick: slot0.tick,
        block: blockTag,
        timestamp: Date.now()
      };
    }
    // Handle unknown pool types - should never reach here if config is correct
    console.error(`[PoolWatcher] Unknown pool type: ${config.type} for ${poolName}`);
    return null;
  } catch (err) {
    console.error('[PoolWatcher] Error fetching ' + poolName + ':', err.message);
    return null;
  }
}

export async function refreshAllPools(blockNumber = null) {
  const blockTag = blockNumber || 'latest';
  const results = {};
  
  for (const [name, config] of Object.entries(POOLS)) {
    if (!config.address) continue;
    
    const result = await getPoolPrice(name, blockTag);
    if (result) {
      results[name] = result;
      priceCache[name] = result;
      
      // result.price is display-adjusted (invert applied in getPoolPrice)
      // For USDC/ETH with invert=true: result.price = USDC per ETH (~1967)
      // So displayPrice = token1 per token0 (USDC per ETH), inverse = token0 per token1 (ETH per USDC)
      const displayPrice = result.price;
      const inversePrice = displayPrice > 0 ? 1 / displayPrice : 0;

      // Labels: displayPrice (token1/token0) = quote per base, inverse = base per quote
      const baseToken = config.token0;
      const quoteToken = config.token1;

      console.log(
        `[Pool ${name}] Block #${blockTag} | `
        + `${quoteToken} per ${baseToken}: ${displayPrice.toFixed(6)} | `
        + `${baseToken} per ${quoteToken}: ${inversePrice.toFixed(8)} | `
        + `Tick: ${result.tick}`
      );
    }
  }

  // Run cross-DEX comparison to find arbitrage opportunities
  compareCrossDexPrices(results);

  return results;
}

// Cross-DEX price comparison - find arbitrage opportunities
export function compareCrossDexPrices(prices) {
  // Group by token pair (e.g., all USDC/ETH sources)
  const pairs = {};

  for (const [poolName, result] of Object.entries(prices)) {
    // Extract token pair from pool name
    const pairName = poolName.replace('SushiSwap ', ''); // Normalize names
    if (!pairs[pairName]) {
      pairs[pairName] = [];
    }
    pairs[pairName].push({ source: poolName, price: result.price, timestamp: result.timestamp });
  }

  // Compare prices within each pair
  console.log('\n🔍 Cross-DEX Price Comparison:');
  console.log('═'.repeat(60));

  for (const [pairName, sources] of Object.entries(pairs)) {
    if (sources.length < 2) continue; // Need at least 2 sources for comparison

    // Find min and max prices
    const sorted = [...sources].sort((a, b) => a.price - b.price);
    const minPrice = sorted[0];
    const maxPrice = sorted[sorted.length - 1];

    // Calculate spread percentage
    const spread = ((maxPrice.price - minPrice.price) / minPrice.price) * 100;

    console.log(`\n${pairName}:`);
    console.log(`  ${minPrice.source.padEnd(20)}: ${minPrice.price.toFixed(6)}`);
    console.log(`  ${maxPrice.source.padEnd(20)}: ${maxPrice.price.toFixed(6)}`);
    console.log(`  Spread: ${spread.toFixed(4)}%`);

    // Alert if spread is significant (> 0.05%)
    if (spread > 0.05) {
      console.log(`  🚨 ARBITRAGE OPPORTUNITY! Spread > 0.05%`);
    }
  }

  console.log('\n' + '═'.repeat(60));
  return pairs;
}

export function getCachedPrices() {
  return { ...priceCache };
}

export function getPoolConfig() {
  return POOLS;
}

// ========== ARBITRAGE OPPORTUNITY DETECTION ==========
// Returns opportunities found in cross-DEX price comparison

export async function findArbitrageOpportunities() {
  const opportunities = [];
  
  try {
    // Get prices from all pools
    const prices = await refreshAllPools();
    
    if (!prices || Object.keys(prices).length === 0) {
      return opportunities;
    }
    
    // Compare cross-DEX prices - this logs opportunities too
    const pairs = compareCrossDexPrices(prices);
    
    // Parse the console output to find opportunities
    // Actually, let's directly analyze prices for opportunities
    const tokenPairs = {};
    
    for (const [poolName, result] of Object.entries(prices)) {
      const pairName = poolName.replace('SushiSwap ', '');
      if (!tokenPairs[pairName]) {
        tokenPairs[pairName] = [];
      }
      tokenPairs[pairName].push({ 
        source: poolName, 
        price: result.price, 
        timestamp: result.timestamp 
      });
    }
    
    // Find arbitrage opportunities
    for (const [pairName, sources] of Object.entries(tokenPairs)) {
      if (sources.length < 2) continue;
      
      const sorted = [...sources].sort((a, b) => a.price - b.price);
      const minPrice = sorted[0];
      const maxPrice = sorted[sorted.length - 1];
      
      const spread = ((maxPrice.price - minPrice.price) / minPrice.price) * 100;
      
      if (spread > 0.05) {
        opportunities.push({
          pair: pairName,
          buyFrom: minPrice.source,
          sellTo: maxPrice.source,
          buyPrice: minPrice.price,
          sellPrice: maxPrice.price,
          spread: spread,
          timestamp: Date.now()
        });
      }
    }
  } catch (err) {
    console.log('⚠️  findArbitrageOpportunities error:', err.message);
  }
  
  return opportunities;
}

export { POOLS, priceCache, TOKEN_ADDRESSES, TICK_SPACINGS }; 
