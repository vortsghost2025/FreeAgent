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
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  },
  BSC: {
    WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    USDT: '0x55d398326f99059fF775485246999027B3197955',
  },
  arbitrum: {
    WETH: '0x82aF49447D8a07e3bd95BD0d56f7814154a1E1',
    USDC: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    USDT: '0xFd086bC7CD5C481DCC394C643068aF76854f244'
  },
  optimism: {
    ETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
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