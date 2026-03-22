/**
 * Lightweight Price Drift Watcher
 * Monitors token pairs on low-gas chains for arbitrage opportunities
 * Minimal compute, cheap RPC calls, high event frequency
 */

import { EventEmitter } from 'events';
import axios from 'axios';

class PriceDriftWatcher extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      chain: config.chain || 'polygon', // Low gas cost chain
      pair: config.pair || 'MATIC/USDC',
      pollingInterval: config.pollingInterval || 5000, // 5 seconds
      driftThreshold: config.driftThreshold || 0.02, // 2% threshold
      maxRetries: config.maxRetries || 3,
      ...config
    };
    
    this.isWatching = false;
    this.prices = {
      last: null,
      current: null,
      history: []
    };
    
    this.stats = {
      polls: 0,
      driftEvents: 0,
      errors: 0,
      avgResponseTime: 0
    };
    
    this.rpcEndpoints = this.getRpcEndpoints();
  }

  getRpcEndpoints() {
    const endpoints = {
      polygon: [
        'https://polygon-rpc.com',
        'https://rpc-mainnet.maticvigil.com',
        'https://matic-mainnet.chainstacklabs.com'
      ],
      bsc: [
        'https://bsc-dataseed.binance.org',
        'https://bsc-dataseed1.defibit.io',
        'https://bsc-dataseed1.ninicoin.io'
      ],
      base: [
        'https://mainnet.base.org',
        'https://base-rpc.publicnode.com'
      ]
    };
    
    return endpoints[this.config.chain] || endpoints.polygon;
  }

  async start() {
    console.log(`🚀 Price Drift Watcher - Monitoring ${this.config.pair} on ${this.config.chain}`);
    console.log(`   Polling interval: ${this.config.pollingInterval}ms`);
    console.log(`   Drift threshold: ${(this.config.driftThreshold * 100).toFixed(1)}%\n`);
    
    this.isWatching = true;
    this.watchLoop();
    
    return this;
  }

  async watchLoop() {
    if (!this.isWatching) return;
    
    try {
      const startTime = Date.now();
      const price = await this.fetchPrice();
      const responseTime = Date.now() - startTime;
      
      this.updateStats(responseTime);
      
      if (price) {
        const drift = this.calculateDrift(price);
        this.checkForDrift(drift, price);
        
        this.prices.last = this.prices.current;
        this.prices.current = price;
        this.prices.history.push({
          price,
          timestamp: Date.now(),
          drift: drift || 0
        });
        
        // Keep only last 100 data points
        if (this.prices.history.length > 100) {
          this.prices.history.shift();
        }
      }
      
    } catch (error) {
      console.error(`❌ Price fetch error: ${error.message}`);
      this.stats.errors++;
    }
    
    // Schedule next poll
    if (this.isWatching) {
      setTimeout(() => this.watchLoop(), this.config.pollingInterval);
    }
  }

  async fetchPrice() {
    // Try multiple endpoints for reliability
    for (let i = 0; i < this.rpcEndpoints.length; i++) {
      try {
        const endpoint = this.rpcEndpoints[i];
        const price = await this.getPriceFromEndpoint(endpoint);
        return price;
      } catch (error) {
        if (i === this.rpcEndpoints.length - 1) {
          throw error; // All endpoints failed
        }
        // Try next endpoint
      }
    }
  }

  async getPriceFromEndpoint(endpoint) {
    // For demo purposes, using CoinGecko API (free tier)
    // In production, you'd use actual DEX APIs or Uniswap subgraphs
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${this.getTokenId()}&vs_currencies=usd`,
      { timeout: 5000 }
    );
    
    const tokenId = this.getTokenId();
    return response.data[tokenId]?.usd || null;
  }

  getTokenId() {
    // Map common pairs to CoinGecko IDs
    const mappings = {
      'MATIC/USDC': 'matic-network',
      'BNB/USDT': 'binancecoin',
      'ETH/USDC': 'ethereum',
      'BTC/USDT': 'bitcoin'
    };
    
    return mappings[this.config.pair] || 'matic-network';
  }

  calculateDrift(currentPrice) {
    if (!this.prices.last || !currentPrice) return 0;
    
    const drift = (currentPrice - this.prices.last) / this.prices.last;
    return drift;
  }

  checkForDrift(drift, currentPrice) {
    const absDrift = Math.abs(drift);
    
    if (absDrift >= this.config.driftThreshold) {
      this.stats.driftEvents++;
      
      const eventData = {
        pair: this.config.pair,
        chain: this.config.chain,
        price: currentPrice,
        drift: drift,
        percentage: (drift * 100).toFixed(2) + '%',
        timestamp: new Date().toISOString(),
        direction: drift > 0 ? 'up' : 'down'
      };
      
      console.log(`📈 DRIFT ALERT: ${this.config.pair} ${eventData.direction} ${eventData.percentage}`);
      this.emit('drift-detected', eventData);
      
      // Log significant events for pattern analysis
      if (absDrift >= this.config.driftThreshold * 2) {
        console.log(`🚨 SIGNIFICANT DRIFT: ${eventData.percentage}`);
        this.emit('significant-drift', eventData);
      }
    }
  }

  updateStats(responseTime) {
    this.stats.polls++;
    this.stats.avgResponseTime = (
      (this.stats.avgResponseTime * (this.stats.polls - 1) + responseTime) / 
      this.stats.polls
    );
  }

  getStats() {
    return {
      ...this.stats,
      pair: this.config.pair,
      chain: this.config.chain,
      currentPrice: this.prices.current,
      lastPrice: this.prices.last,
      priceHistory: this.prices.history.length,
      uptime: this.isWatching ? 'active' : 'stopped',
      costEstimate: this.estimateCost()
    };
  }

  estimateCost() {
    // Rough cost estimation for Polygon (~$0.0001 per RPC call)
    const callsPerHour = (3600000 / this.config.pollingInterval);
    const costPerHour = callsPerHour * 0.0001; // ~$0.072/hour
    const costPerDay = costPerHour * 24; // ~$1.73/day
    
    return {
      perHour: `$${costPerHour.toFixed(4)}`,
      perDay: `$${costPerDay.toFixed(2)}`,
      perMonth: `$${(costPerDay * 30).toFixed(2)}`
    };
  }

  stop() {
    console.log('🛑 Stopping Price Drift Watcher');
    this.isWatching = false;
    this.removeAllListeners();
  }

  // Pattern analysis methods
  getRecentPatterns(minutes = 60) {
    const cutoff = Date.now() - (minutes * 60000);
    const recentData = this.prices.history.filter(p => p.timestamp > cutoff);
    
    if (recentData.length < 2) return null;
    
    const prices = recentData.map(p => p.price);
    const drifts = recentData.map(p => p.drift);
    
    return {
      period: `${minutes}min`,
      dataPoints: recentData.length,
      avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
      priceVolatility: this.calculateVolatility(prices),
      avgDrift: drifts.reduce((a, b) => a + b, 0) / drifts.length,
      maxDrift: Math.max(...drifts.map(Math.abs)),
      trend: this.calculateTrend(prices)
    };
  }

  calculateVolatility(prices) {
    if (prices.length < 2) return 0;
    
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const squaredDiffs = prices.map(price => Math.pow(price - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
    
    return Math.sqrt(avgSquaredDiff) / mean; // Coefficient of variation
  }

  calculateTrend(prices) {
    if (prices.length < 2) return 'neutral';
    
    const firstHalf = prices.slice(0, Math.floor(prices.length / 2));
    const secondHalf = prices.slice(Math.floor(prices.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const change = (secondAvg - firstAvg) / firstAvg;
    
    if (change > 0.01) return 'upward';
    if (change < -0.01) return 'downward';
    return 'neutral';
  }
}

export default PriceDriftWatcher;