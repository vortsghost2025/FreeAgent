/**
 * 🧠 Strategy Registry - MEV Organism Brain
 * Central nervous system for strategy management and selection
 */

class StrategyRegistry {
  // DRY_RUN mode - defaults to TRUE (safe) unless --live flag is set
  static DRY_RUN = !(process.argv.includes('--live') || process.argv.includes('-l') || process.env.DRY_RUN === 'false' || process.env.DRY_RUN?.toLowerCase() === 'false');

  constructor() {
    this.strategies = new Map();
    this.loadedStrategies = new Set();
    this.performanceMetrics = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    // Register core strategies
    await this.registerStrategy('arbitrage', './arb-agent.js');
    await this.registerStrategy('liquidation', './liquidator-agent.js');
    await this.registerStrategy('sandwich', './sandwich-agent.js');
    await this.registerStrategy('cross-chain', './cross-chain-agent.js');
    
    this.initialized = true;
    console.log('🧠 Strategy Registry initialized with 4 core strategies');
  }

  async registerStrategy(name, path) {
    try {
      const strategyModule = await import(path);
      
      // Handle both default export and named export
      const module = strategyModule.default || strategyModule;
      
      // Verify the module has an execute method
      if (!module.execute || typeof module.execute !== 'function') {
        console.warn(`⚠️ Strategy ${name} does not have an execute method, skipping`);
        return;
      }
      
      this.strategies.set(name, {
        name,
        module,
        path,
        registeredAt: Date.now(),
        executions: 0,
        successes: 0,
        failures: 0,
        avgProfit: 0
      });
      
      console.log(`✅ Registered strategy: ${name}`);
    } catch (error) {
      console.error(`❌ Failed to register strategy ${name}:`, error.message);
    }
  }

  selectStrategy(criteria = {}) {
    const availableStrategies = Array.from(this.strategies.values())
      .filter(strat => !criteria.exclude || !criteria.exclude.includes(strat.name));
    
    if (availableStrategies.length === 0) {
      return null;
    }

    // Performance-based selection
    const sortedByPerformance = availableStrategies.sort((a, b) => {
      const scoreA = this.calculateStrategyScore(a);
      const scoreB = this.calculateStrategyScore(b);
      return scoreB - scoreA;
    });

    return sortedByPerformance[0];
  }

  calculateStrategyScore(strategy) {
    if (strategy.executions === 0) return 0.5; // Default score for new strategies
    
    const successRate = strategy.successes / strategy.executions;
    const profitFactor = strategy.avgProfit > 0 ? 1.2 : 0.8;
    const recencyBonus = Math.max(0, (Date.now() - strategy.registeredAt) / (24 * 60 * 60 * 1000)); // Days since registration
    
    return successRate * profitFactor * (1 + recencyBonus * 0.1);
  }

  async executeStrategy(strategyName, data) {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`Strategy ${strategyName} not found`);
    }

    try {
      strategy.executions++;
      
      // DRY_RUN mode: simulate execution without actual trades
      if (StrategyRegistry.DRY_RUN) {
        console.log(`🔒 [DRY_RUN] Simulating strategy ${strategyName} execution`);
        const simulatedResult = await strategy.module.execute(data);
        
        // Return simulated result with DRY_RUN flag
        return {
          ...simulatedResult,
          dryRun: true,
          simulated: true
        };
      }
      
      const startTime = Date.now();
      const result = await strategy.module.execute(data);
      const executionTime = Date.now() - startTime;
      
      if (result.success) {
        strategy.successes++;
        strategy.avgProfit = ((strategy.avgProfit * (strategy.successes - 1)) + result.profit) / strategy.successes;
      } else {
        strategy.failures++;
      }
      
      // Update performance metrics
      this.updatePerformanceMetrics(strategyName, {
        executionTime,
        success: result.success,
        profit: result.profit || 0,
        timestamp: Date.now()
      });
      
      return result;
    } catch (error) {
      strategy.failures++;
      console.error(`Strategy execution failed for ${strategyName}:`, error);
      throw error;
    }
  }

  updatePerformanceMetrics(strategyName, metrics) {
    if (!this.performanceMetrics.has(strategyName)) {
      this.performanceMetrics.set(strategyName, []);
    }
    
    const metricsArray = this.performanceMetrics.get(strategyName);
    metricsArray.push(metrics);
    
    // Keep only last 100 executions for memory efficiency
    if (metricsArray.length > 100) {
      metricsArray.shift();
    }
  }

  getStrategyStats(strategyName) {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) return null;
    
    const metrics = this.performanceMetrics.get(strategyName) || [];
    
    return {
      name: strategy.name,
      executions: strategy.executions,
      successes: strategy.successes,
      failures: strategy.failures,
      successRate: strategy.executions > 0 ? strategy.successes / strategy.executions : 0,
      avgProfit: strategy.avgProfit,
      avgExecutionTime: metrics.length > 0 
        ? metrics.reduce((sum, m) => sum + m.executionTime, 0) / metrics.length 
        : 0,
      recentPerformance: metrics.slice(-10) // Last 10 executions
    };
  }

  getAllStrategyStats() {
    return Array.from(this.strategies.keys()).map(name => this.getStrategyStats(name));
  }

  getTopPerformingStrategies(limit = 3) {
    return this.getAllStrategyStats()
      .sort((a, b) => b.successRate * b.avgProfit - a.successRate * a.avgProfit)
      .slice(0, limit);
  }
}

export default StrategyRegistry;