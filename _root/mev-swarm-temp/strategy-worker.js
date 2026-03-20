/**
 * 🧬 Strategy Worker - MEV Organism Nervous System
 * Dynamic execution layer that processes strategy tasks
 */

import StrategyRegistry from './strategy-registry.js';

class StrategyWorker {
  constructor(config = {}, modeConfig = {}) {
    this.registry = new StrategyRegistry();
    this.workerId = config.workerId || `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.isActive = false;
    this.currentTask = null;
    this.taskQueue = [];
    this.mode = modeConfig;
    this.feedbackEngine = null;
    
    this.metrics = {
      tasksProcessed: 0,
      tasksSuccess: 0,
      tasksFailed: 0,
      totalTime: 0,
      avgResponseTime: 0,
      modeCompliance: 0,
      adaptiveDecisions: 0
    };
  }

  async initialize(feedbackEngine = null) {
    await this.registry.initialize();
    this.feedbackEngine = feedbackEngine;
    this.isActive = true;
    console.log(`🧬 Strategy Worker ${this.workerId} initialized and active`);
    console.log(`🎭 Mode awareness: ${this.mode.name || 'default'} mode`);
  }

  async processTask(task) {
    if (!this.isActive) {
      throw new Error('Worker is not active');
    }

    const startTime = Date.now();
    this.currentTask = task;
    
    try {
      console.log(`🔄 Processing task: ${task.type} for ${task.targetChain || 'unknown chain'}`);
      
      // Apply mode-aware filtering
      if (!this.shouldProcessTaskInMode(task)) {
        console.log(`⏭️ Skipping task due to ${this.mode.name || 'current'} mode restrictions`);
        return {
          success: false,
          reason: `Task filtered by ${this.mode.name || 'current'} mode`,
          workerId: this.workerId,
          modeFiltered: true
        };
      }
      
      // Select optimal strategy based on task requirements
      const strategy = this.registry.selectStrategy({
        exclude: task.excludeStrategies || []
      });

      if (!strategy) {
        throw new Error('No suitable strategy found for task');
      }

      console.log(`🎯 Selected strategy: ${strategy.name}`);

      // Execute the strategy
      const result = await this.registry.executeStrategy(strategy.name, {
        ...task.data,
        workerId: this.workerId,
        taskId: task.id
      });

      const executionTime = Date.now() - startTime;
      
      // Update metrics
      this.metrics.tasksProcessed++;
      if (result.success) {
        this.metrics.tasksSuccess++;
      } else {
        this.metrics.tasksFailed++;
      }
      
      this.metrics.totalTime += executionTime;
      this.metrics.avgResponseTime = this.metrics.totalTime / this.metrics.tasksProcessed;
      
      // Mode compliance tracking
      if (this.shouldProcessTaskInMode(task)) {
        this.metrics.modeCompliance++;
      }
      
      // Record feedback for learning
      if (this.feedbackEngine) {
        await this.recordFeedback(strategy.name, result, executionTime, task);
      }

      console.log(`✅ Task completed: ${task.type} - Success: ${result.success} - Profit: ${result.profit || 0}`);

      return {
        success: true,
        result,
        executionTime,
        strategyUsed: strategy.name,
        workerId: this.workerId
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.metrics.tasksProcessed++;
      this.metrics.tasksFailed++;
      
      console.error(`❌ Task failed: ${task.type} - Error: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        executionTime,
        workerId: this.workerId
      };
    } finally {
      this.currentTask = null;
    }
  }

  async batchProcess(tasks) {
    const results = [];
    
    for (const task of tasks) {
      try {
        const result = await this.processTask(task);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          workerId: this.workerId
        });
      }
    }
    
    return results;
  }

  queueTask(task) {
    const taskWithId = {
      ...task,
      id: task.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      queuedAt: Date.now()
    };
    
    this.taskQueue.push(taskWithId);
    console.log(`📋 Task queued: ${taskWithId.type} (${this.taskQueue.length} in queue)`);
    
    return taskWithId.id;
  }

  async processQueue() {
    if (this.taskQueue.length === 0) {
      return [];
    }

    console.log(`🔄 Processing ${this.taskQueue.length} queued tasks...`);
    
    const results = [];
    const tasksToProcess = [...this.taskQueue];
    this.taskQueue = []; // Clear queue
    
    for (const task of tasksToProcess) {
      try {
        const result = await this.processTask(task);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          workerId: this.workerId
        });
      }
    }
    
    return results;
  }

  getWorkerStatus() {
    return {
      workerId: this.workerId,
      isActive: this.isActive,
      currentTask: this.currentTask,
      queueLength: this.taskQueue.length,
      metrics: { ...this.metrics },
      mode: this.mode.name || 'default',
      modeComplianceRate: this.metrics.tasksProcessed > 0 
        ? this.metrics.modeCompliance / this.metrics.tasksProcessed 
        : 0,
      uptime: this.startTime ? Date.now() - this.startTime : 0
    };
  }

  // Mode-aware task processing with dynamic economic parameters
  shouldProcessTaskInMode(task) {
    const modeName = this.mode.name || 'default';
    
    switch (modeName.toLowerCase()) {
      case 'economic engine':
      case 'economic':
        // Economic mode - use dynamic parameters from mode manager
        const economicParams = this.getEconomicParameters();
        
        if (!economicParams) {
          // Fallback to default economic filtering
          return task.priority >= 2 || 
                 (task.expectedProfit && task.expectedProfit > 0.001) ||
                 task.type === 'arbitrage';
        }
        
        // Apply dynamic economic filtering based on sub-mode
        const meetsPriority = task.priority >= this.getRequiredPriority(economicParams.taskFiltering);
        const meetsProfit = task.expectedProfit && task.expectedProfit >= economicParams.minProfitThreshold;
        const isArbitrage = task.type === 'arbitrage';
        const explorationAllowed = Math.random() < economicParams.explore;
        
        // In aggressive mode, allow more exploration of borderline opportunities
        if (economicParams.taskFiltering === 'loose') {
          return meetsPriority || meetsProfit || isArbitrage || explorationAllowed;
        }
        
        // Normal filtering
        return meetsPriority && (meetsProfit || isArbitrage);
        
      case 'research':
        // Research mode - exploration and learning
        return true; // Process everything but mark as simulation
        
      case 'cotrader':
        // Co-trader mode - human-aligned assistance
        return task.humanApproved || 
               task.priority >= 1 ||
               task.type === 'liquidation'; // Lower risk strategies
        
      default:
        // Default mode - balanced approach
        return task.priority >= 1 || 
               (task.expectedProfit && task.expectedProfit > 0.0005);
    }
  }
  
  // Helper method to get economic parameters from mode
  getEconomicParameters() {
    // In a real implementation, this would fetch from mode manager
    // For now, simulate based on mode configuration
    if (this.mode.economicParameters) {
      return this.mode.economicParameters[this.mode.economicSubMode || 'normal'];
    }
    return null;
  }
  
  // Helper method to determine required priority based on filtering style
  getRequiredPriority(filteringStyle) {
    switch (filteringStyle) {
      case 'strict': return 2;
      case 'balanced': return 1;
      case 'loose': return 0; // Allow all priorities
      default: return 1;
    }
  }

  // Feedback recording for learning
  async recordFeedback(strategyName, result, executionTime, task) {
    try {
      const feedbackData = {
        strategy: strategyName,
        chain: task.targetChain || 'unknown',
        success: result.success,
        profit: result.profit || 0,
        executionTime: executionTime,
        workerId: this.workerId,
        mode: this.mode.name || 'default',
        taskType: task.type,
        priority: task.priority || 0,
        gasCost: result.gasUsed ? (result.gasUsed * 20) / 1e9 : 0, // Estimated gas cost
        timestamp: Date.now()
      };
      
      await this.feedbackEngine.recordExecution(feedbackData);
      this.metrics.adaptiveDecisions++;
      
      console.log(`📊 Feedback recorded for ${strategyName} in ${this.mode.name || 'default'} mode`);
      
    } catch (error) {
      console.error(`❌ Failed to record feedback: ${error.message}`);
    }
  }

  // Dynamic mode updates
  updateMode(newModeConfig) {
    const oldMode = this.mode.name || 'default';
    this.mode = newModeConfig;
    console.log(`🎭 Mode updated: ${oldMode} → ${this.mode.name || 'default'}`);
    
    // Reset mode compliance metrics for new mode
    this.metrics.modeCompliance = 0;
  }

  getStrategyPerformance() {
    return this.registry.getAllStrategyStats();
  }

  pause() {
    this.isActive = false;
    console.log(`⏸️ Worker ${this.workerId} paused`);
  }

  resume() {
    this.isActive = true;
    console.log(`▶️ Worker ${this.workerId} resumed`);
  }

  async shutdown() {
    this.isActive = false;
    if (this.currentTask) {
      console.log(`🛑 Interrupting current task: ${this.currentTask.type}`);
    }
    console.log(`🔌 Worker ${this.workerId} shut down`);
  }
}

export default StrategyWorker;