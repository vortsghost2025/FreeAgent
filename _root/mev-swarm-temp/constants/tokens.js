# REMOVED: sensitive data redacted by automated security cleanup
/**
 * Core token definitions for filtering and normalization
 * Canonical WETH + major stablecoins
 */

export const CORE_TOKENS = {
  WETH: {
    address: 'REDACTED_ADDRESS',
    symbol: 'WETH',
    decimals: 18,
    name: 'Wrapped Ether'
  },
  USDC: {
    address: 'REDACTED_ADDRESS',
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin'
  },
  USDT: {
    address: 'REDACTED_ADDRESS',
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
