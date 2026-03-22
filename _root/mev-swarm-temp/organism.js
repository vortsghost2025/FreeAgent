/**
 * 🦠 MEV Organism - Complete Living System
 * Main entry point orchestrating all components
 */

import MetaController from './meta-controller.js';
import StrategyRegistry from './strategy-registry.js';
import StrategyWorker from './strategy-worker.js';
import FeedbackEngine from './feedback-engine.js';
import ModeManager from './mode-manager.js';

class MEVOrganism {
  constructor(config = {}) {
    this.config = {
      initialMode: config.initialMode || 'economic',
      initialSubMode: config.initialSubMode || 'aggressive', // penny hunting by default
      workerCount: config.workerCount || 3,
      feedback: config.feedback || {},
      mode: config.mode || {}
    };
    
    this.metaController = null;
    this.isInitialized = false;
    this.startTime = null;
    
    console.log('🦠 MEV Organism initializing...');
  }

  async initialize() {
    if (this.isInitialized) {
      console.log('🔄 MEV Organism already initialized');
      return;
    }
    
    try {
      // Initialize core components
      this.metaController = new MetaController({
        feedback: this.config.feedback,
        mode: { initialMode: this.config.initialMode, initialSubMode: this.config.initialSubMode }
      });
      
      await this.metaController.initialize();
      
      // Create additional workers with mode awareness
      for (let i = 1; i < this.config.workerCount; i++) {
        const workerId = `worker-${String(i).padStart(3, '0')}`;
        const worker = new StrategyWorker(
          { workerId }, 
          this.metaController.modeManager.getCurrentModeConfig()
        );
        await worker.initialize(this.metaController.feedbackEngine);
        this.metaController.workers.set(workerId, worker);
      }
      
      // Update all workers to ensure they have the correct mode
      this.metaController.updateAllWorkersMode();
      
      this.isInitialized = true;
      this.startTime = Date.now();
      
      console.log(`✅ MEV Organism fully initialized with ${this.config.workerCount} workers`);
      console.log(`📊 Current status: ${this.getStatusSummary()}`);
      
    } catch (error) {
      console.error('❌ MEV Organism initialization failed:', error);
      throw error;
    }
  }

  async start() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    console.log('🚀 MEV Organism starting live operations...');
    
    // Begin continuous operation
    this.operationLoop();
    
    return this.getSystemStatus();
  }

  async operationLoop() {
    // Continuous task generation and processing
    while (this.metaController && this.metaController.isRunning) {
      try {
        // Generate synthetic tasks for demonstration
        const tasks = this.generateTasks();
        
        // Submit tasks for processing
        const results = [];
        for (const task of tasks) {
          const result = await this.metaController.submitTask(task);
          results.push(result);
        }
        
        // Log results
        const successfulTasks = results.filter(r => r.success).length;
        const totalProfit = results.reduce((sum, r) => sum + (r.profit || 0), 0);
        
        if (successfulTasks > 0) {
          console.log(`📈 Processed ${tasks.length} tasks: ${successfulTasks} successful, ${totalProfit.toFixed(6)} ETH profit`);
        }
        
      } catch (error) {
        console.error('❌ Error in operation loop:', error);
      }
      
      // Wait before next cycle
      await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds
    }
  }

  generateTasks() {
    const taskTypes = ['arbitrage', 'liquidation'];
    const chains = ['ethereum', 'bsc', 'polygon', 'arbitrum'];
    
    const taskCount = 2 + Math.floor(Math.random() * 3); // 2-4 tasks
    const tasks = [];
    
    for (let i = 0; i < taskCount; i++) {
      tasks.push({
        type: taskTypes[Math.floor(Math.random() * taskTypes.length)],
        targetChain: chains[Math.floor(Math.random() * chains.length)],
        data: {
          amount: 1 + (Math.random() * 5), // 1-5 ETH equivalent
          slippage: 0.005
        }
      });
    }
    
    return tasks;
  }

  async switchMode(newMode, context = {}) {
    if (!this.metaController) {
      throw new Error('Organism not initialized');
    }
    
    return await this.metaController.modeManager.switchMode(newMode, context);
  }

  getSystemStatus() {
    if (!this.metaController) {
      return { status: 'not_initialized' };
    }
    
    return this.metaController.getSystemStatus();
  }

  getPerformanceReport() {
    if (!this.metaController) {
      return { error: 'Organism not initialized' };
    }
    
    return this.metaController.getPerformanceReport();
  }

  getStatusSummary() {
    const status = this.getSystemStatus();
    return `${status.currentMode} mode | ${status.systemHealth.toFixed(2)} health | ${status.totalExecutions} executions | ${status.totalProfit.toFixed(4)} ETH profit`;
  }

  async pause() {
    if (this.metaController) {
      this.metaController.isRunning = false;
      console.log('⏸️ MEV Organism paused');
    }
  }

  async resume() {
    if (this.metaController) {
      this.metaController.isRunning = true;
      console.log('▶️ MEV Organism resumed');
      this.operationLoop(); // Restart operation loop
    }
  }

  async shutdown() {
    console.log('🔌 Shutting down MEV Organism...');
    
    if (this.metaController) {
      await this.metaController.shutdown();
    }
    
    this.isInitialized = false;
    this.startTime = null;
    
    console.log('✅ MEV Organism shutdown complete');
  }

  // Diagnostic methods
  getComponentStatus() {
    return {
      metaController: !!this.metaController,
      strategyRegistry: !!this.metaController?.registry,
      feedbackEngine: !!this.metaController?.feedbackEngine,
      modeManager: !!this.metaController?.modeManager,
      workerCount: this.metaController?.workers?.size || 0
    };
  }

  getLiveTradingStatus() {
    const status = this.getSystemStatus();
    return {
      isActive: status.isRunning,
      currentProfit: status.totalProfit,
      executionRate: status.totalExecutions > 0 ? 
        (status.totalExecutions / ((Date.now() - this.startTime) / 60000)).toFixed(2) : 0,
      healthScore: status.systemHealth
    };
  }
}

// Create and export singleton instance
const organism = new MEVOrganism();

// Export for external use
export default organism;
export { MEVOrganism };

// Quick start function
export async function startOrganism(config = {}) {
  const org = new MEVOrganism(config);
  await org.initialize();
  await org.start();
  return org;
}

// Execute when run directly
if (typeof require !== 'undefined' && require.main === module) {
  console.log('🎯 Starting MEV Organism for penny hunting...');
  startOrganism({
    initialMode: 'economic',
    initialSubMode: 'aggressive',
    workerCount: 3
  }).catch(error => {
    console.error('💥 Organism startup failed:', error);
    process.exit(1);
  });
}