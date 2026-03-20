/**
 * 🧬 Meta Controller - MEV Organism Autonomic Nervous System
 * Automatic adaptation and system-wide coordination
 */

import StrategyRegistry from './strategy-registry.js';
import StrategyWorker from './strategy-worker.js';
import FeedbackEngine from './feedback-engine.js';
import ModeManager from './mode-manager.js';
import MetaLearningEngine from './meta-learning-engine.js';

class MetaController {
  constructor(config = {}) {
    this.registry = new StrategyRegistry();
    this.feedbackEngine = new FeedbackEngine(config.feedback);
    this.modeManager = new ModeManager(config.mode);
    this.metaLearningEngine = new MetaLearningEngine(config.metaLearning);
    
    this.workers = new Map();
    this.systemMetrics = {
      uptime: 0,
      totalExecutions: 0,
      totalProfit: 0,
      systemHealth: 1.0,
      adaptationEvents: 0
    };
    
    this.adaptationRules = [];
    this.healthMonitors = [];
    this.isRunning = false;
    this.startTime = null;
    
    this.setupAdaptationRules();
    this.setupHealthMonitors();
  }

  async initialize() {
    console.log('🧬 Initializing Meta Controller...');
    
    await this.registry.initialize();
    await this.feedbackEngine.initialize();
    await this.metaLearningEngine.initialize();
    
    // Set up mode change callback to update workers
    this.modeManager.onSubModeChange((subMode, params) => {
      this.updateAllWorkersMode();
    });
    
    // Initialize core worker
    const modeConfig = this.modeManager.getCurrentModeConfig();
    const primaryWorker = new StrategyWorker(
      { workerId: 'primary-001' }, 
      modeConfig
    );
    await primaryWorker.initialize(this.feedbackEngine);
    this.workers.set('primary-001', primaryWorker);
    
    this.startTime = Date.now();
    this.isRunning = true;
    
    // Start monitoring loops
    this.startHealthMonitoring();
    this.startAdaptationLoop();
    
    console.log('✅ Meta Controller fully initialized and operational');
  }

  setupAdaptationRules() {
    this.adaptationRules = [
      {
        name: 'performance_degradation',
        condition: (metrics) => metrics.successRate < 0.6,
        action: async () => {
          console.log('🔧 Adapting to performance degradation...');
          await this.modeManager.switchMode('cotrader', { reason: 'performance_degradation' });
          
          // Scale back strategy aggressiveness
          const currentWeights = this.modeManager.getStrategyWeights();
          Object.keys(currentWeights).forEach(strategy => {
            currentWeights[strategy] *= 0.8; // Reduce all weights by 20%
          });
        }
      },
      {
        name: 'high_volatility',
        condition: (metrics) => metrics.volatility > 3.0,
        action: async () => {
          console.log('🌪️ Adapting to high market volatility...');
          await this.modeManager.switchMode('research', { reason: 'high_volatility' });
        }
      },
      {
        name: 'profit_optimization',
        condition: (metrics) => metrics.successRate > 0.8 && metrics.drawdown < 0.03,
        action: async () => {
          console.log('🚀 Optimizing for high performance...');
          await this.modeManager.switchMode('economic', { reason: 'profit_optimization' });
        }
      },
      {
        name: 'resource_pressure',
        condition: (metrics) => metrics.cpuUsage > 85 || metrics.memoryUsage > 80,
        action: async () => {
          console.log('💻 Managing resource pressure...');
          // Pause non-critical workers
          for (const [id, worker] of this.workers.entries()) {
            if (id !== 'primary-001') {
              worker.pause();
            }
          }
        }
      }
    ];
  }

  setupHealthMonitors() {
    this.healthMonitors = [
      {
        name: 'system_health',
        interval: 30000, // 30 seconds
        check: async () => {
          const metrics = await this.collectSystemMetrics();
          return this.evaluateSystemHealth(metrics);
        }
      },
      {
        name: 'strategy_performance',
        interval: 60000, // 1 minute
        check: async () => {
          const strategyStats = this.registry.getAllStrategyStats();
          return this.evaluateStrategyHealth(strategyStats);
        }
      },
      {
        name: 'worker_status',
        interval: 15000, // 15 seconds
        check: async () => {
          const workerHealth = [];
          for (const [id, worker] of this.workers.entries()) {
            workerHealth.push({
              id,
              status: worker.getWorkerStatus(),
              healthy: worker.isActive
            });
          }
          return workerHealth.every(w => w.healthy);
        }
      }
    ];
  }

  async collectSystemMetrics() {
    // In a real implementation, this would collect actual system metrics
    const workerMetrics = [];
    for (const worker of this.workers.values()) {
      workerMetrics.push(worker.getWorkerStatus().metrics);
    }
    
    const aggregatedMetrics = {
      totalExecutions: workerMetrics.reduce((sum, m) => sum + m.tasksProcessed, 0),
      successRate: workerMetrics.reduce((sum, m) => sum + (m.tasksSuccess / (m.tasksProcessed || 1)), 0) / workerMetrics.length,
      avgResponseTime: workerMetrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / workerMetrics.length,
      systemLoad: process.cpuUsage ? process.cpuUsage().user / 1000000 : 0,
      memoryUsage: process.memoryUsage ? (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100 : 0,
      uptime: Date.now() - this.startTime,
      volatility: Math.random() * 4, // Simulated volatility
      drawdown: Math.random() * 0.15 // Simulated drawdown
    };
    
    return aggregatedMetrics;
  }

  // 🧬 Unified Organism State Vector
  getOrganismState() {
    return {
      // Performance metrics from feedback engine
      performance: this.feedbackEngine.getPerformanceAnalytics(),
      
      // Worker metrics
      workers: {
        count: this.workers.size,
        active: Array.from(this.workers.values()).filter(w => w.isActive).length,
        metrics: Array.from(this.workers.values()).map(w => ({
          id: w.workerId,
          ...w.getWorkerStatus()
        })),
        avgPerformance: Array.from(this.workers.values()).reduce((sum, w) => {
          const status = w.getWorkerStatus();
          return sum + (status.metrics.tasksSuccess / (status.metrics.tasksProcessed || 1));
        }, 0) / this.workers.size
      },
      
      // Strategy metrics
      strategies: this.registry.getAllStrategyStats(),
      
      // System metrics
      system: {
        health: this.systemMetrics.systemHealth,
        uptime: Date.now() - this.startTime,
        totalExecutions: this.systemMetrics.totalExecutions,
        totalProfit: this.systemMetrics.totalProfit,
        adaptationEvents: this.systemMetrics.adaptationEvents,
        cpuUsage: process.cpuUsage ? process.cpuUsage().user / 1000000 : 0,
        memoryUsage: process.memoryUsage ? (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100 : 0
      },
      
      // Current mode
      mode: {
        current: this.modeManager.currentMode,
        config: this.modeManager.getCurrentModeConfig(),
        transitions: this.modeManager.getTransitionHistory(5)
      },
      
      // Timestamp for freshness
      timestamp: Date.now(),
      
      // Derived composite metrics
      derived: {
        stressLevel: this.calculateStressLevel(),
        adaptationReadiness: this.calculateAdaptationReadiness(),
        optimizationOpportunity: this.calculateOptimizationOpportunity()
      }
    };
  }

  // Calculate composite stress level
  calculateStressLevel() {
    const systemMetrics = this.systemMetrics;
    const cpuStress = (process.cpuUsage ? process.cpuUsage().user / 1000000 : 0) / 100;
    const memoryStress = process.memoryUsage ? (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) : 0;
    const healthStress = 1 - systemMetrics.systemHealth;
    const executionStress = systemMetrics.totalExecutions > 1000 ? 0.3 : systemMetrics.totalExecutions / 1000 * 0.3;
    
    return (cpuStress * 0.3 + memoryStress * 0.3 + healthStress * 0.2 + executionStress * 0.2);
  }

  // Calculate adaptation readiness
  calculateAdaptationReadiness() {
    const recentTransitions = this.modeManager.getTransitionHistory(3);
    const timeSinceLastTransition = recentTransitions.length > 0 
      ? (Date.now() - recentTransitions[0].timestamp) / 60000 // minutes
      : 999; // No recent transitions
    
    // Higher readiness if enough time has passed since last transition
    const timeFactor = Math.min(1, timeSinceLastTransition / 30); // 30 min cooldown
    const healthFactor = this.systemMetrics.systemHealth;
    
    return timeFactor * healthFactor;
  }

  // Calculate optimization opportunity
  calculateOptimizationOpportunity() {
    const strategyStats = this.registry.getAllStrategyStats();
    const avgSuccessRate = strategyStats.reduce((sum, s) => sum + s.successRate, 0) / strategyStats.length;
    const performanceVariation = Math.max(...strategyStats.map(s => s.successRate)) - 
                                Math.min(...strategyStats.map(s => s.successRate));
    
    // Higher opportunity when there's variation to exploit
    return performanceVariation > 0.2 ? 0.8 : performanceVariation * 4;
  }

  evaluateSystemHealth(metrics) {
    let healthScore = 1.0;
    
    // Penalize for poor performance
    if (metrics.successRate < 0.7) healthScore -= 0.3;
    if (metrics.successRate < 0.5) healthScore -= 0.4;
    
    // Penalize for high resource usage
    if (metrics.systemLoad > 80) healthScore -= 0.2;
    if (metrics.memoryUsage > 85) healthScore -= 0.25;
    
    // Penalize for high volatility/drawdown
    if (metrics.volatility > 2.5) healthScore -= 0.15;
    if (metrics.drawdown > 0.1) healthScore -= 0.2;
    
    return Math.max(0, Math.min(1, healthScore));
  }

  evaluateStrategyHealth(strategyStats) {
    const unhealthyStrategies = strategyStats.filter(stat => 
      stat.successRate < 0.5 || stat.executions < 5
    );
    
    return unhealthyStrategies.length === 0;
  }

  async adaptationLoop() {
    let previousState = null;
    
    while (this.isRunning) {
      try {
        // 🧬 Use unified organism state for all decisions
        const currentState = this.getOrganismState();
        
        // Record state before adaptations for learning
        const stateBefore = previousState ? { ...previousState } : null;
        
        // Check adaptation rules using unified state
        for (const rule of this.adaptationRules) {
          if (rule.condition(currentState)) {
            const startTime = Date.now();
            await rule.action(currentState);
            this.systemMetrics.adaptationEvents++;
            console.log(`⚡ Adaptation executed: ${rule.name}`);
            
            // Record adaptation event in feedback engine
            await this.feedbackEngine.recordExecution({
              strategy: 'adaptation_rule',
              chain: 'meta',
              success: true,
              profit: 0,
              executionTime: Date.now() - currentState.timestamp,
              workerId: 'meta-controller',
              mode: currentState.mode.current,
              adaptationRule: rule.name,
              timestamp: Date.now()
            });
            
            // Record for meta-learning
            if (this.metaLearningEngine.isLearning && stateBefore) {
              const outcomeMetrics = {
                before: stateBefore,
                after: this.getOrganismState(), // Fresh state after adaptation
                duration: Date.now() - startTime
              };
              
              this.metaLearningEngine.recordAdaptation({
                ruleName: rule.name,
                outcome: outcomeMetrics.after.system.health > outcomeMetrics.before.system.health ? 'success' : 'neutral',
                metricsBefore: outcomeMetrics.before,
                metricsAfter: outcomeMetrics.after,
                timestamp: Date.now()
              });
            }
          }
        }
        
        // Enhanced auto-mode transitions using organism state
        await this.evaluateAdvancedModeTransitions(currentState, stateBefore);
        
        // Update system metrics from unified state
        this.systemMetrics.systemHealth = currentState.system.health;
        this.systemMetrics.totalExecutions = currentState.system.totalExecutions;
        this.systemMetrics.uptime = currentState.system.uptime;
        this.systemMetrics.totalProfit = currentState.system.totalProfit;
        
        // Store current state for next iteration
        previousState = currentState;
        
        // Log comprehensive organism status
        console.log(`🧬 Organism Status: ${currentState.mode.current} mode | ` +
                   `Health: ${(currentState.system.health * 100).toFixed(1)}% | ` +
                   `Stress: ${(currentState.derived.stressLevel * 100).toFixed(1)}% | ` +
                   `Workers: ${currentState.workers.active}/${currentState.workers.count}`);
        
      } catch (error) {
        console.error('❌ Error in adaptation loop:', error);
      }
      
      // Wait before next iteration
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
    }
  }

  // Enhanced mode transitions using organism state
  async evaluateAdvancedModeTransitions(organismState) {
    // Multi-signal pattern detection
    const shouldSwitchToResearch = 
      organismState.derived.stressLevel > 0.7 ||
      organismState.system.health < 0.6 ||
      organismState.mode.current === 'economic' && organismState.performance.analytics?.recentSuccessRate < 0.5;
    
    const shouldSwitchToEconomic = 
      organismState.derived.stressLevel < 0.3 &&
      organismState.system.health > 0.8 &&
      organismState.derived.optimizationOpportunity > 0.6;
    
    const shouldSwitchToCoTrader = 
      organismState.derived.stressLevel > 0.5 &&
      organismState.system.health > 0.4 &&
      organismState.system.health < 0.7;
    
    // Apply transitions based on compound signals
    if (shouldSwitchToResearch && organismState.mode.current !== 'research' && 
        organismState.derived.adaptationReadiness > 0.5) {
      console.log('🔬 Switching to RESEARCH mode - high stress detected');
      await this.modeManager.switchMode('research', {
        reason: 'compound_stress_response',
        stressLevel: organismState.derived.stressLevel,
        health: organismState.system.health
      });
      
      // Reduce worker count in research mode
      await this.adjustWorkerPool('reduce');
      
    } else if (shouldSwitchToEconomic && organismState.mode.current !== 'economic' &&
               organismState.derived.adaptationReadiness > 0.5) {
      console.log('💰 Switching to ECONOMIC mode - optimal conditions');
      await this.modeManager.switchMode('economic', {
        reason: 'optimization_window',
        opportunity: organismState.derived.optimizationOpportunity,
        health: organismState.system.health
      });
      
      // Increase worker count for profit maximization
      await this.adjustWorkerPool('increase');
      
    } else if (shouldSwitchToCoTrader && organismState.mode.current !== 'cotrader' &&
               organismState.derived.adaptationReadiness > 0.5) {
      console.log('🤝 Switching to CO-TRADER mode - moderate stress');
      await this.modeManager.switchMode('cotrader', {
        reason: 'balanced_approach',
        stressLevel: organismState.derived.stressLevel,
        health: organismState.system.health
      });
    }
  }

  // Dynamic worker pool adjustment
  async adjustWorkerPool(action) {
    const currentWorkers = this.workers.size;
    const targetWorkers = action === 'increase' 
      ? Math.min(6, currentWorkers + 1)  // Max 6 workers
      : Math.max(2, currentWorkers - 1); // Min 2 workers
    
    if (targetWorkers !== currentWorkers) {
      console.log(`👥 Adjusting worker pool: ${currentWorkers} → ${targetWorkers}`);
      
      if (action === 'increase') {
        // Add new worker
        const newWorkerId = `worker-${Date.now()}`;
        const worker = new (await import('./strategy-worker.js')).default(
          { workerId: newWorkerId },
          this.modeManager.getCurrentModeConfig()
        );
        await worker.initialize(this.feedbackEngine);
        this.workers.set(newWorkerId, worker);
      } else {
        // Remove least active worker
        const workersArray = Array.from(this.workers.entries());
        const leastActive = workersArray.reduce((least, [id, worker]) => {
          const status = worker.getWorkerStatus();
          if (!least || status.metrics.tasksProcessed < least.status.metrics.tasksProcessed) {
            return { id, worker, status };
          }
          return least;
        }, null);
        
        if (leastActive && leastActive.id !== 'primary-001') { // Don't remove primary
          await leastActive.worker.shutdown();
          this.workers.delete(leastActive.id);
          console.log(`👋 Removed worker: ${leastActive.id}`);
        }
      }
    }
  }

  async healthMonitoringLoop() {
    while (this.isRunning) {
      try {
        for (const monitor of this.healthMonitors) {
          const isHealthy = await monitor.check();
          
          if (!isHealthy) {
            console.warn(`⚠️ Health monitor alert: ${monitor.name}`);
            // Trigger appropriate response based on monitor type
            await this.handleHealthAlert(monitor.name);
          }
        }
      } catch (error) {
        console.error('❌ Error in health monitoring:', error);
      }
      
      // Wait before next check (different intervals for different monitors)
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds base
    }
  }

  async handleHealthAlert(monitorName) {
    switch (monitorName) {
      case 'system_health':
        if (this.systemMetrics.systemHealth < 0.5) {
          console.log('🚨 Critical system health issue detected');
          await this.modeManager.emergencyPause();
        }
        break;
        
      case 'worker_status':
        console.log('🔧 Worker health issue - restarting failed workers');
        await this.restartFailedWorkers();
        break;
        
      default:
        console.log(`📢 Health alert for: ${monitorName}`);
    }
  }

  async restartFailedWorkers() {
    for (const [id, worker] of this.workers.entries()) {
      if (!worker.isActive) {
        console.log(`🔄 Restarting worker: ${id}`);
        try {
          await worker.shutdown();
          const newWorker = new StrategyWorker({ workerId: id });
          await newWorker.initialize();
          this.workers.set(id, newWorker);
        } catch (error) {
          console.error(`❌ Failed to restart worker ${id}:`, error);
        }
      }
    }
  }

  startAdaptationLoop() {
    this.adaptationLoop();
    console.log('⚡ Adaptation loop started');
  }

  startHealthMonitoring() {
    this.healthMonitoringLoop();
    console.log('❤️ Health monitoring started');
  }

  async submitTask(task) {
    // Route task through appropriate worker based on current mode
    const modeConfig = this.modeManager.getCurrentModeConfig();
    
    if (!this.modeManager.shouldExecuteStrategy(task.type)) {
      console.log(`🚫 Task rejected in current mode: ${this.modeManager.currentMode}`);
      return {
        success: false,
        reason: `Execution not allowed in ${this.modeManager.currentMode} mode`
      };
    }
    
    // Distribute to available workers
    const availableWorkers = Array.from(this.workers.values()).filter(w => w.isActive);
    if (availableWorkers.length === 0) {
      return { success: false, reason: 'No active workers available' };
    }
    
    // Simple round-robin distribution
    const worker = availableWorkers[this.systemMetrics.totalExecutions % availableWorkers.length];
    
    try {
      const result = await worker.processTask(task);
      
      // Feed result to feedback engine
      await this.feedbackEngine.recordExecution({
        strategy: task.type,
        chain: task.targetChain,
        success: result.success,
        profit: result.result?.profit || 0,
        executionTime: result.executionTime,
        workerId: result.workerId
      });
      
      this.systemMetrics.totalProfit += result.result?.profit || 0;
      
      return result;
    } catch (error) {
      console.error('❌ Task execution failed:', error);
      return { success: false, error: error.message };
    }
  }

  getSystemStatus() {
    return {
      isRunning: this.isRunning,
      uptime: Date.now() - this.startTime,
      currentMode: this.modeManager.currentMode,
      systemHealth: this.systemMetrics.systemHealth,
      totalExecutions: this.systemMetrics.totalExecutions,
      totalProfit: this.systemMetrics.totalProfit,
      adaptationEvents: this.systemMetrics.adaptationEvents,
      workerCount: this.workers.size,
      activeWorkers: Array.from(this.workers.values()).filter(w => w.isActive).length
    };
  }

  getPerformanceReport() {
    const analytics = this.feedbackEngine.getPerformanceAnalytics();
    const modeMetrics = this.modeManager.getModeMetrics();
    const systemStatus = this.getSystemStatus();
    
    return {
      system: systemStatus,
      analytics,
      mode: modeMetrics,
      optimizationSuggestions: this.feedbackEngine.getOptimizationSuggestions(),
      topStrategies: this.feedbackEngine.getTopPerformingStrategies(3),
      topChains: this.feedbackEngine.getTopPerformingChains(3)
    };
  }

  // Update all workers with current mode configuration
  updateAllWorkersMode() {
    const currentModeConfig = this.modeManager.getCurrentModeConfig();
    console.log(`🔄 Updating all workers to ${currentModeConfig.name} mode`);
    
    // Update primary worker
    if (this.primaryWorker) {
      this.primaryWorker.updateMode(currentModeConfig);
    }
    
    // Update all other workers
    for (const [workerId, worker] of this.workers) {
      worker.updateMode(currentModeConfig);
    }
    
    console.log(`✅ All workers updated to current mode`);
  }

  async shutdown() {
    console.log('🔌 Shutting down Meta Controller...');
    
    this.isRunning = false;
    
    // Shutdown all workers
    for (const worker of this.workers.values()) {
      await worker.shutdown();
    }
    
    console.log('✅ Meta Controller shutdown complete');
  }
}

export default MetaController;