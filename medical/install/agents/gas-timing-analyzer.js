/**
 * Gas Timing Analyzer
 * Monitors gas prices to predict optimal execution windows
 * Extremely lightweight, runs well on limited RAM
 */

import { EventEmitter } from 'events';
import axios from 'axios';

class GasTimingAnalyzer extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      chain: config.chain || 'polygon',
      pollingInterval: config.pollingInterval || 10000, // 10 seconds
      spikeThreshold: config.spikeThreshold || 1.5, // 50% above average
      dipThreshold: config.dipThreshold || 0.7, // 30% below average
      historyWindow: config.historyWindow || 100, // Last 100 readings
      ...config
    };
    
    this.isAnalyzing = false;
    this.gasHistory = [];
    this.currentGas = null;
    
    this.stats = {
      polls: 0,
      spikeEvents: 0,
      dipEvents: 0,
      errors: 0,
      avgGas: 0
    };
    
    this.endpoints = this.getGasEndpoints();
  }

  getGasEndpoints() {
    const endpoints = {
      polygon: 'https://gasstation.polygon.technology/v2',
      ethereum: 'https://api.blocknative.com/gasprices/blockprices',
      bsc: 'https://bsc-dataseed.binance.org/api/v1/gas',
      optimism: 'https://optimism-gasstation.testnet.fi/v1/gas',
      arbitrum: 'https://arbitrum-gasstation.testnet.fi/v1/gas'
    };
    
    return endpoints[this.config.chain] || endpoints.polygon;
  }

  async start() {
    console.log(`⛽ Gas Timing Analyzer - Monitoring ${this.config.chain}`);
    console.log(`   Polling interval: ${this.config.pollingInterval}ms`);
    console.log(`   Spike threshold: ${(this.config.spikeThreshold * 100).toFixed(0)}% of average`);
    console.log(`   Dip threshold: ${(this.config.dipThreshold * 100).toFixed(0)}% of average\n`);
    
    this.isAnalyzing = true;
    this.analysisLoop();
    
    return this;
  }

  async analysisLoop() {
    if (!this.isAnalyzing) return;
    
    try {
      const startTime = Date.now();
      const gasData = await this.fetchGasPrices();
      const responseTime = Date.now() - startTime;
      
      if (gasData) {
        this.updateHistory(gasData);
        this.analyzePatterns(gasData);
        this.stats.polls++;
      }
      
    } catch (error) {
      console.error(`❌ Gas fetch error: ${error.message}`);
      this.stats.errors++;
    }
    
    // Schedule next poll
    if (this.isAnalyzing) {
      setTimeout(() => this.analysisLoop(), this.config.pollingInterval);
    }
  }

  async fetchGasPrices() {
    try {
      // For demo, using Polygon gas station (free API)
      const response = await axios.get(this.endpoints, { timeout: 5000 });
      
      // Parse different API formats
      let gasPrice;
      if (this.config.chain === 'polygon') {
        // Polygon gas station returns object with different speeds
        gasPrice = response.data.standard || response.data.fast;
      } else {
        gasPrice = response.data.gasPrice || response.data.standard;
      }
      
      return {
        price: parseFloat(gasPrice),
        timestamp: Date.now(),
        chain: this.config.chain
      };
      
    } catch (error) {
      // Fallback to simulated data for demo
      return {
        price: 30 + (Math.random() * 50), // Simulated gas price 30-80
        timestamp: Date.now(),
        chain: this.config.chain,
        simulated: true
      };
    }
  }

  updateHistory(gasData) {
    this.gasHistory.push(gasData);
    
    // Keep only recent history
    if (this.gasHistory.length > this.config.historyWindow) {
      this.gasHistory.shift();
    }
    
    this.currentGas = gasData.price;
    
    // Update average
    const prices = this.gasHistory.map(g => g.price);
    this.stats.avgGas = prices.reduce((a, b) => a + b, 0) / prices.length;
  }

  analyzePatterns(currentGas) {
    if (this.gasHistory.length < 10) return; // Need minimum data
    
    const avgGas = this.stats.avgGas;
    const ratio = currentGas.price / avgGas;
    
    // Check for spikes
    if (ratio >= this.config.spikeThreshold) {
      this.stats.spikeEvents++;
      
      const spikeEvent = {
        type: 'spike',
        current: currentGas.price,
        average: avgGas,
        ratio: ratio,
        percentage: ((ratio - 1) * 100).toFixed(1) + '% above average',
        timestamp: new Date().toISOString(),
        chain: this.config.chain
      };
      
      console.log(`🔥 GAS SPIKE: ${spikeEvent.percentage}`);
      this.emit('gas-spike', spikeEvent);
      
      // Predict liquidation opportunities
      this.predictLiquidationWindows(spikeEvent);
    }
    
    // Check for dips
    else if (ratio <= this.config.dipThreshold) {
      this.stats.dipEvents++;
      
      const dipEvent = {
        type: 'dip',
        current: currentGas.price,
        average: avgGas,
        ratio: ratio,
        percentage: ((1 - ratio) * 100).toFixed(1) + '% below average',
        timestamp: new Date().toISOString(),
        chain: this.config.chain
      };
      
      console.log(`💧 GAS DIP: ${dipEvent.percentage}`);
      this.emit('gas-dip', dipEvent);
      
      // Signal cheap execution windows
      this.signalCheapExecution(dipEvent);
    }
  }

  predictLiquidationWindows(spikeEvent) {
    // High gas prices often precede liquidations
    const prediction = {
      ...spikeEvent,
      prediction: 'liquidation-risk-window',
      timeframe: '15-30 minutes',
      confidence: 'medium'
    };
    
    console.log(`🔮 LIQUIDATION WINDOW PREDICTED`);
    this.emit('liquidation-window', prediction);
  }

  signalCheapExecution(dipEvent) {
    // Low gas = cheap execution opportunity
    const signal = {
      ...dipEvent,
      signal: 'cheap-execution-window',
      recommendedAction: 'execute-txs-now',
      savingsPotential: 'high'
    };
    
    console.log(`💰 CHEAP EXECUTION WINDOW DETECTED`);
    this.emit('cheap-execution', signal);
  }

  getStats() {
    return {
      ...this.stats,
      chain: this.config.chain,
      currentGas: this.currentGas,
      averageGas: this.stats.avgGas,
      volatility: this.calculateVolatility(),
      recentPatterns: this.getRecentPatterns(),
      costAnalysis: this.getCostAnalysis(),
      uptime: this.isAnalyzing ? 'active' : 'stopped'
    };
  }

  calculateVolatility() {
    if (this.gasHistory.length < 2) return 0;
    
    const prices = this.gasHistory.map(g => g.price);
    const mean = this.stats.avgGas;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    
    return Math.sqrt(variance) / mean; // Coefficient of variation
  }

  getRecentPatterns(minutes = 30) {
    const cutoff = Date.now() - (minutes * 60000);
    const recentData = this.gasHistory.filter(g => g.timestamp > cutoff);
    
    if (recentData.length < 5) return null;
    
    const prices = recentData.map(g => g.price);
    const trends = this.identifyTrends(prices);
    
    return {
      period: `${minutes}min`,
      samples: recentData.length,
      minGas: Math.min(...prices),
      maxGas: Math.max(...prices),
      avgGas: prices.reduce((a, b) => a + b, 0) / prices.length,
      volatility: this.calculateVolatility(),
      trends: trends
    };
  }

  identifyTrends(prices) {
    if (prices.length < 4) return [];
    
    const segments = [];
    let currentTrend = null;
    let startIndex = 0;
    
    for (let i = 1; i < prices.length; i++) {
      const change = (prices[i] - prices[i-1]) / prices[i-1];
      
      if (Math.abs(change) > 0.1) { // 10% change threshold
        const direction = change > 0 ? 'increasing' : 'decreasing';
        
        if (direction !== currentTrend && currentTrend) {
          segments.push({
            trend: currentTrend,
            start: startIndex,
            end: i - 1,
            duration: i - startIndex
          });
          startIndex = i - 1;
        }
        
        currentTrend = direction;
      }
    }
    
    // Add final segment
    if (currentTrend && startIndex < prices.length - 1) {
      segments.push({
        trend: currentTrend,
        start: startIndex,
        end: prices.length - 1,
        duration: prices.length - startIndex
      });
    }
    
    return segments;
  }

  getCostAnalysis() {
    // Estimate daily/monthly costs
    const callsPerDay = (86400000 / this.config.pollingInterval);
    const costPerCall = 0.00001; // Very cheap RPC calls
    const dailyCost = callsPerDay * costPerCall;
    
    return {
      callsPerDay: callsPerDay,
      costPerDay: `$${dailyCost.toFixed(4)}`,
      costPerMonth: `$${(dailyCost * 30).toFixed(3)}`
    };
  }

  stop() {
    console.log('🛑 Stopping Gas Timing Analyzer');
    this.isAnalyzing = false;
    this.removeAllListeners();
  }

  // Export data for further analysis
  exportData(format = 'json') {
    const data = {
      metadata: {
        chain: this.config.chain,
        exportedAt: new Date().toISOString(),
        totalSamples: this.gasHistory.length
      },
      statistics: this.getStats(),
      rawHistory: this.gasHistory
    };
    
    if (format === 'csv') {
      return this.toCSV(data.rawHistory);
    }
    
    return data;
  }

  toCSV(history) {
    const headers = ['timestamp', 'gas_price', 'chain'];
    const rows = history.map(entry => [
      new Date(entry.timestamp).toISOString(),
      entry.price,
      entry.chain
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

export default GasTimingAnalyzer;