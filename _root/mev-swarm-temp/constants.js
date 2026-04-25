# REMOVED: sensitive data redacted by automated security cleanup
/**
 * MEV Swarm - Constants
 * Pure configuration constants with no side effects (no RPC, no .env required)
 */

// Uniswap V3 tick constants
export const TICK_SPACINGS = {
  500: 10,    // 0.05% pool
  3000: 60,   // 0.3% pool
  10000: 200  // 1% pool
};

// Token addresses
export const TOKEN_ADDRESSES = {
  'USDC': 'REDACTED_ADDRESS',
  'USDT': 'REDACTED_ADDRESS',
  'ETH': 'REDACTED_ADDRESS',
  'WBTC': 'REDACTED_ADDRESS'
};

// Pool configurations for arbitrage graph
export const POOL_CONFIGS = {
  'USDC/ETH': {
    address: 'REDACTED_ADDRESS',
    type: 'uniswap_v3',
    token0: 'USDC',
    token1: 'ETH',
    fee: 500
  },
  'USDT/ETH': {
    address: 'REDACTED_ADDRESS',
    type: 'uniswap_v3',
    token0: 'ETH',
    token1: 'USDT',
    fee: 3000
  },
  'WBTC/ETH': {
    address: 'REDACTED_ADDRESS',
    type: 'uniswap_v3',
    token0: 'WBTC',
    token1: 'ETH',
    fee: 3000
  },
  'SushiSwap USDC/ETH': {
    address: 'REDACTED_ADDRESS',
    type: 'uniswap_v2',
    token0: 'USDC',
    token1: 'ETH'
  }
};

export default {
  TICK_SPACINGS,
  TOKEN_ADDRESSES,
  POOL_CONFIGS
};