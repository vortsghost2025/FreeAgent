/**
 * Price Oracle - Get prices for token pairs across multiple DEXes
 * Queries pool reserves or uses DEX APIs to get current prices
 */

import { ethers } from 'ethers';

// Uniswap V2 Pair ABI (for getting reserves)
const PAIR_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)'
];

// Known DEX factory addresses
const FACTORY_ADDRESSES = {
  'Uniswap V2': '0x5C69bee701ef814a2b6fd3d28fde2642f7b15f',
  'Sushiswap': '0xc0aEe778fd80EaDdd86Ff1eAcbebe8ae'
};

// Common tokens with addresses
const TOKENS = {
  'WETH': '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  'USDC': '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  'USDT': '0xdac17f958d2ee523a2206206994597c13d831ec7',
  'DAI': '0x6b175474e89094c44da98b954edeac495271d0f'
};

const TOKEN_ADDRESSES = Object.fromEntries(
  Object.entries(TOKENS).map(([k, v]) => [v.toLowerCase(), k])
);

/**
 * Price Oracle - Queries prices across DEXes
 */
export class PriceOracle {
  constructor(provider) {
    this.provider = provider;
    this.pairCache = new Map();
    this.cacheTimeout = 5000; // 5 seconds
  }

  /**
   * Get current price for a token pair across all DEXes
   * @param {string} tokenA - Token address
   * @param {string} tokenB - Token address
   * @returns {Promise<Array>} Array of { dex, price, pairAddress }
   */
  async getPrices(tokenA, tokenB) {
    const tA = tokenA.toLowerCase();
    const tB = tokenB.toLowerCase();

    const prices = [];

    // Query each DEX's pools
    for (const [dexName, factoryAddr] of Object.entries(FACTORY_ADDRESSES)) {
      try {
        const price = await this.getUniswapV2Price(tA, tB, factoryAddr);
        if (price) {
          prices.push({
            dex: dexName,
            price: price.price,
            pairAddress: price.pairAddress,
            timestamp: price.timestamp
          });
        }
      } catch (error) {
        // Skip DEXes that fail
        continue;
      }
    }

    return prices.length > 0 ? prices : null;
  }

  /**
   * Get price from a Uniswap V2 pair
   * Uses pool reserves: price = reserve1 / reserve0
   */
  async getUniswapV2Price(tokenA, tokenB, factoryAddress) {
    const factory = new ethers.Contract(factoryAddress, [
      'function getPair(address,address) external view returns (address)'
    ], this.provider);

    // Get pair address
    const pairAddress = await factory.getPair(tokenA, tokenB);
    if (!pairAddress || pairAddress === ethers.ZeroAddress) {
      return null;
    }

    const pairContract = new ethers.Contract(pairAddress, PAIR_ABI, this.provider);

    // Get reserves
    const reserves = await pairContract.getReserves();
    const reserve0 = reserves[0];
    const reserve1 = reserves[1];

    // Calculate price (quote: token0 price in terms of token1)
    if (BigInt(reserve0) === 0n) {
      return null; // No liquidity
    }

    const price = Number(reserve1) / Number(reserve0);
    const timestamp = Date.now();

    return { price, pairAddress, timestamp, reserve0, reserve1 };
  }

  /**
   * Get token symbol from address
   */
  getTokenSymbol(address) {
    const token = Object.entries(TOKEN_ADDRESSES).find(([addr, name]) =>
      addr === address.toLowerCase()
    );
    return token ? token[1] : address.slice(0, 6);
  }

  /**
   * Format price for display
   */
  formatPrice(price) {
    if (price >= 1e6) return (price / 1e6).toFixed(2) + 'M';
    if (price >= 1e3) return (price / 1e3).toFixed(2) + 'K';
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(6);
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.pairCache) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.pairCache.delete(key);
      }
    }
  }
}
