/**
 * Blockchain Starter Kit
 * Combines price drift watching and gas timing analysis
 * Perfect entry point for your swarm with minimal resource usage
 */

import PriceDriftWatcher from './price-drift-watcher.js';
import GasTimingAnalyzer from './gas-timing-analyzer.js';
import { EventEmitter } from 'events';

class BlockchainStarterKit extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      mode: config.mode || 'both', // 'price', 'gas', or 'both'
      chains: config.chains || ['polygon'],
      pairs: config.pairs || ['MATIC/USDC'],
      ...config
    };
    
    this.watchers = new Map();
    this.analyzers = new Map();
    this.isRunning = false;
    
    this.stats = {
      startTime: Date.now(),
      totalEvents: 0,
      profitableSignals: 0,
      systemHealth: 'initializing'
    };
  }

  async initialize() {
    console.log('🚀 Blockchain Starter Kit - Initializing');
    console.log('========================================\n');
    
    // Initialize based on mode
    if (this.config.mode === 'price' || this.config.mode === 'both') {
      await this.initializePriceWatchers();
    }
    
    if (this.config.mode === 'gas' || this.config.mode === 'both') {
      await this.initializeGasAnalyzers();
    }
    
    console.log('✅ Blockchain Starter Kit Ready');
    console.log(`   Mode: ${this.config.mode}`);
    console.log(`   Chains: ${this.config.chains.join(', ')}`);
    console.log(`   Monthly Cost: ~$2-5 (pennies!)\n`);
    
    return this;
  }

  async initializePriceWatchers() {
    console.log('💱 Initializing Price Watchers...');
    
    for (const chain of this.config.chains) {
      for (const pair of this.config.pairs) {
        const watcherId = `price-${chain}-${pair.replace('/', '-')}`;
        const watcher = new PriceDriftWatcher({
          chain,
          pair,
          pollingInterval: 5000,
          driftThreshold: 0.02 // 2% threshold
        });
        
        // Set up event handlers
        watcher.on('drift-detected', (event) => {
          this.handlePriceEvent(event);
        });
        
        watcher.on('significant-drift', (event) => {
          this.handleSignificantDrift(event);
        });
        
        this.watchers.set(watcherId, watcher);
        console.log(`   📊 ${watcherId} ready`);
      }
    }
  }

  async initializeGasAnalyzers() {
    console.log('⛽ Initializing Gas Analyzers...');
    
    for (const chain of this.config.chains) {
      const analyzerId = `gas-${chain}`;
      const analyzer = new GasTimingAnalyzer({
        chain,
        pollingInterval: 10000,
        spikeThreshold: 1.5,
        dipThreshold: 0.7
      });
      
      // Set up event handlers
      analyzer.on('gas-spike', (event) => {
        this.handleGasEvent(event);
      });
      
      analyzer.on('gas-dip', (event) => {
        this.handleGasEvent(event);
      });
      
      analyzer.on('liquidation-window', (event) => {
        this.handleLiquidationSignal(event);
      });
      
      analyzer.on('cheap-execution', (event) => {
        this.handleExecutionOpportunity(event);
      });
      
      this.analyzers.set(analyzerId, analyzer);
      console.log(`   ⛽ ${analyzerId} ready`);
    }
  }

  async start() {
    if (this.isRunning) {
      console.log('⚠️ Starter kit already running');
      return this;
    }
    
    console.log('🎬 Starting Blockchain Starter Kit');
    console.log('==================================\n');
    
    this.isRunning = true;
    
    // Start all components
    for (const [id, watcher] of this.watchers) {
      await watcher.start();
    }
    
    for (const [id, analyzer] of this.analyzers) {
      await analyzer.start();
    }
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    console.log('⚡ Blockchain Starter Kit ACTIVE!');
    console.log('   Watching for profitable signals...');
    console.log('   Building infrastructure for future upgrades...\n');
    
    return this;
  }

  handlePriceEvent(event) {
    this.stats.totalEvents++;
    
    console.log(`📈 PRICE SIGNAL: ${event.pair} drifted ${event.percentage}`);
    
    // Emit for potential automated actions
    this.emit('profitable-opportunity', {
      type: 'price-arbitrage',
      ...event,
      potentialProfit: this.calculateArbitragePotential(event)
    });
  }

  handleSignificantDrift(event) {
    this.stats.profitableSignals++;
    
    console.log(`🚨 SIGNIFICANT OPPORTUNITY: ${event.percentage} drift detected!`);
    
    this.emit('high-confidence-opportunity', {
      type: 'significant-price-move',
      ...event,
      confidence: 'high',
      actionRecommended: 'investigate-arbitrage'
    });
  }

  handleGasEvent(event) {
    this.stats.totalEvents++;
    
    const eventType = event.type === 'spike' ? '🔥' : '💧';
    console.log(`${eventType} GAS EVENT: ${event.percentage} on ${event.chain}`);
    
    this.emit('gas-opportunity', event);
  }

  handleLiquidationSignal(event) {
    this.stats.profitableSignals++;
    
    console.log(`🔮 LIQUIDATION SIGNAL: Execute positions in 15-30 min window`);
    
    this.emit('liquidation-opportunity', {
      ...event,
      action: 'prepare-for-liquidations',
      timeframe: '15-30 minutes'
    });
  }

  handleExecutionOpportunity(event) {
    this.stats.profitableSignals++;
    
    console.log(`💰 EXECUTION SIGNAL: Cheap gas window - execute transactions now!`);
    
    this.emit('execution-opportunity', {
      ...event,
      action: 'execute-transactions',
      savings: 'significant'
    });
  }

  calculateArbitragePotential(event) {
    // Simple profit calculation based on drift
    const baseAmount = 1000; // $1000 hypothetical trade
    const profit = baseAmount * Math.abs(parseFloat(event.drift));
    return `$${profit.toFixed(2)}`;
  }

  startHealthMonitoring() {
    setInterval(() => {
      const health = this.getSystemHealth();
      this.stats.systemHealth = health.status;
      
      if (health.status !== 'healthy') {
        console.warn(`⚠️ System health: ${health.status}`, health.warnings);
      }
    }, 5000);
  }

  getSystemHealth() {
    const warnings = [];
    
    // Check component health
    for (const [id, watcher] of this.watchers) {
      const stats = watcher.getStats();
      if (stats.errors > stats.polls * 0.1) { // >10% error rate
        warnings.push(`High error rate in ${id}: ${stats.errors}/${stats.polls}`);
      }
    }
    
    for (const [id, analyzer] of this.analyzers) {
      const stats = analyzer.getStats();
      if (stats.errors > stats.polls * 0.1) {
        warnings.push(`High error rate in ${id}: ${stats.errors}/${stats.polls}`);
      }
    }
    
    // Check event generation
    if (this.stats.totalEvents === 0 && Date.now() - this.stats.startTime > 30000) {
      warnings.push('No events detected - check data sources');
    }
    
    return {
      status: warnings.length > 0 ? 'warning' : 'healthy',
      warnings,
      uptime: Date.now() - this.stats.startTime,
      eventRate: this.stats.totalEvents / ((Date.now() - this.stats.startTime) / 60000)
    };
  }

  async stop() {
    console.log('🛑 Stopping Blockchain Starter Kit');
    
    this.isRunning = false;
    
    // Stop all components
    for (const watcher of this.watchers.values()) {
      watcher.stop();
    }
    
    for (const analyzer of this.analyzers.values()) {
      analyzer.stop();
    }
    
    console.log('✅ Blockchain Starter Kit stopped');
  }

  getStats() {
    const watcherStats = Array.from(this.watchers.values()).map(w => w.getStats());
    const analyzerStats = Array.from(this.analyzers.values()).map(a => a.getStats());
    
    return {
      system: {
        ...this.stats,
        uptime: Date.now() - this.stats.startTime,
        components: {
          watchers: this.watchers.size,
          analyzers: this.analyzers.size
        }
      },
      watchers: watcherStats,
      analyzers: analyzerStats,
      opportunities: {
        totalEvents: this.stats.totalEvents,
        profitableSignals: this.stats.profitableSignals,
        successRate: this.stats.totalEvents > 0 ? 
          (this.stats.profitableSignals / this.stats.totalEvents * 100).toFixed(1) + '%' : '0%'
      }
    };
  }

  // Export all data for analysis
  exportAllData(format = 'json') {
    const data = {
      metadata: {
        exportedAt: new Date().toISOString(),
        configuration: this.config
      },
      stats: this.getStats(),
      watchers: {},
      analyzers: {}
    };
    
    // Export watcher data
    for (const [id, watcher] of this.watchers) {
      data.watchers[id] = {
        stats: watcher.getStats(),
        patterns: watcher.getRecentPatterns()
      };
    }
    
    // Export analyzer data
    for (const [id, analyzer] of this.analyzers) {
      data.analyzers[id] = {
        stats: analyzer.getStats(),
        patterns: analyzer.getRecentPatterns()
      };
    }
    
    return data;
  }
}

export default BlockchainStarterKit;