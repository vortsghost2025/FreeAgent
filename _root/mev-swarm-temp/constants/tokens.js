/**
 * Core token definitions for filtering and normalization
 * Canonical WETH + major stablecoins
 */

export const CORE_TOKENS = {
  WETH: {
    address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    symbol: 'WETH',
    decimals: 18,
    name: 'Wrapped Ether'
  },
  USDC: {
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin'
  },
  USDT: {
    address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    symbol: 'USDT',
    decimals: 6,
    name: 'Tether USD'
  },
  DAI: {
    address: '0x6b175474e89094c44da98b954edeac495271d0f',
    symbol: 'DAI',
    decimals: 18,
    name: 'Dai Stablecoin'
  }
};

// Address → symbol mapping
export const TOKEN_MAP = Object.fromEntries(
  Object.entries(CORE_TOKENS).map(([key, info]) => [info.address.toLowerCase(), key])
);

export function getTokenByAddress(address) {
  const normalized = address.toLowerCase();
  return TOKEN_MAP[normalized] || null;
}

export function getTokenSymbol(address) {
  const token = getTokenByAddress(address);
  return token ? token.symbol : address.slice(0, 6);
}
