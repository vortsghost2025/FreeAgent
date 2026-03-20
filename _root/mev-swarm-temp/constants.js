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
  'USDC': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  'ETH': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  'WBTC': '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
};

// Pool configurations for arbitrage graph
export const POOL_CONFIGS = {
  'USDC/ETH': {
    address: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640',
    type: 'uniswap_v3',
    token0: 'USDC',
    token1: 'ETH',
    fee: 500
  },
  'USDT/ETH': {
    address: '0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36',
    type: 'uniswap_v3',
    token0: 'ETH',
    token1: 'USDT',
    fee: 3000
  },
  'WBTC/ETH': {
    address: '0xcbcdf9626bc03e24f779434178a73a0b4bad62ed',
    type: 'uniswap_v3',
    token0: 'WBTC',
    token1: 'ETH',
    fee: 3000
  },
  'SushiSwap USDC/ETH': {
    address: '0x397FF1542f962076d0BFE58eA045FfA2d347ACa0',
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