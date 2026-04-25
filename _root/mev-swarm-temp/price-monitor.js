# REMOVED: sensitive data redacted by automated security cleanup
/**
 * MEV Swarm - Price Monitor
 * Watches DEX pairs across multiple chains for arbitrage opportunities
 */

import { ethers } from 'ethers';

const UNISWAP_V2_PAIR_ABI = [
  'function token0() view returns (address)',
  'function token1() view returns (address)', 
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)'
];

const TOKENS = {
  ethereum: {
    WETH: 'REDACTED_ADDRESS',
    USDC: 'REDACTED_ADDRESS',
    USDT: 'REDACTED_ADDRESS',
  },
  BSC: {
    WBNB: 'REDACTED_ADDRESS',
    USDC: 'REDACTED_ADDRESS',
    USDT: 'REDACTED_ADDRESS',
  },
  arbitrum: {
    WETH: '0x82aF49447D8a07e3bd95BD0d56f7814154a1E1',
    USDC: 'REDACTED_ADDRESS',
    USDT: '0xFd086bC7CD5C481DCC394C643068aF76854f244'
  },
  optimism: {
    ETH: 'REDACTED_ADDRESS',
    USDC: 'REDACTED_ADDRESS',
    USDT: '0x94b008aA00579c1307B0EF2c49487cb9b012F9b'
  }
};

class PriceMonitor {
  constructor(blockchainConnector) {
    this.connector = blockchainConnector;
    this.pairs = new Map();
    this.priceHistory = new Map();
    this.listeners = [];
    this.pollInterval = null;
    this.minPriceDiffPercent = 0.5;
  }

  async addPair(chain, tokenA, tokenB) {
    const provider = this.connector.getProvider(chain);
    if (!provider) throw new Error(`Not connected to ${chain}`);
    
    const tokenList = TOKENS[chain];
    const addrA = tokenA.startsWith('0x') ? tokenA : tokenList?.[tokenA];
    const addrB = tokenB.startsWith('0x') ? tokenB : tokenList?.[tokenB];
    
    if (!addrA || !addrB) throw new Error(`Unknown token: ${tokenA} or ${tokenB}`);
    
    const pairKey = `${chain}:${addrA}:${addrB}`;
    this.pairs.set(pairKey, { chain, tokenA: addrA, tokenB: addrB });
    console.log(`[PriceMonitor] Added: ${chain}/${tokenA}/${tokenB}`);
    return pairKey;
  }

  startPolling(intervalMs = 5000) {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => this.pollPrices(), intervalMs);
    console.log(`[PriceMonitor] Polling every ${intervalMs}ms`);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async pollPrices() {
    for (const [pairKey, pair] of this.pairs) {
      const mockPrice = this.simulatePrice(pairKey);
      
      if (!this.priceHistory.has(pairKey)) this.priceHistory.set(pairKey, []);
      const history = this.priceHistory.get(pairKey);
      history.push({ ...mockPrice, timestamp: Date.now() });
      if (history.length > 100) history.shift();
    }
    this.listeners.forEach(cb => cb(Array.from(this.priceHistory.entries())));
  }

  simulatePrice(pairKey) {
    const basePrice = 1 + Math.random() * 0.1;
    const spread = (Math.random() - 0.5) * 0.02;
    return {
      priceA: basePrice * (1 + spread),
      priceB: basePrice * (1 - spread),
      volume: Math.floor(Math.random() * 1000000)
    };
  }

  findArbitrageOpportunities() {
    const opportunities = [];
    const tokenPrices = new Map();
    
    for (const [pairKey, history] of this.priceHistory) {
      if (history.length < 2) continue;
      const latest = history[history.length - 1];
      const tokenPair = pairKey.split(':').slice(1).join('-');
      if (!tokenPrices.has(tokenPair)) tokenPrices.set(tokenPair, []);
      tokenPrices.get(tokenPair).push({ pairKey, ...latest });
    }
    
    for (const [tokenPair, prices] of tokenPrices) {
      if (prices.length < 2) continue;
      const sorted = prices.sort((a, b) => b.priceA - a.priceA);
      const maxDiff = ((sorted[0].priceA - sorted[sorted.length-1].priceA) / sorted[sorted.length-1].priceA) * 100;
      
      if (maxDiff > this.minPriceDiffPercent) {
        opportunities.push({
          tokenPair,
          buyOn: sorted[sorted.length-1].pairKey,
          sellOn: sorted[0].pairKey,
          profitPercent: maxDiff,
          timestamp: Date.now()
        });
      }
    }
    return opportunities;
  }

  onPriceUpdate(callback) {
    this.listeners.push(callback);
    return () => { this.listeners = this.listeners.filter(cb => cb !== callback); };
  }

  getCurrentPrices() {
    const prices = {};
    for (const [pairKey, history] of this.priceHistory) {
      if (history.length > 0) prices[pairKey] = history[history.length - 1];
    }
    return prices;
  }
}

export default PriceMonitor;
export { PriceMonitor, TOKENS };