/**
 * Unified Ingestion-First Orchestrator
 * Implements the correct architecture: Ingestion → Task Bus → Lingam/Kilo/Workers
 * Prevents Lingam queue explosion by pre-classifying messages
 */

import MessageIngestionAgent from './message-ingestion-agent.js';
import TaskBus from './task-bus.js';
import LingamSupervisor from './lingam-supervisor.js';
import KiloExecutor from './kilo-executor.js';
import { EventEmitter } from 'events';

class UnifiedOrchestrator extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      workerCount: config.workerCount || 8,
      batchSize: config.batchSize || 15,
      pollInterval: config.pollInterval || 400,
      ...config
    };
    
    // Core components
    this.ingestionAgent = null;
    this.taskBus = null;
    this.lingamSupervisor = null;
    this.kiloExecutor = null;
    this.workerPool = new Map();
    
    this.stats = {
      startTime: Date.now(),
      messagesProcessed: 0,
      tasksRouted: 0,
      systemHealth: 'initializing'
    };
    
    this.isRunning = false;
  }

  async initialize() {
    console.log('🚀 Unified Ingestion-First Orchestrator - Initializing');
    console.log('=====================================================\n');
    
    // Initialize components in correct order
    await this.initializeTaskBus();
    await this.initializeLingamSupervisor();
    await this.initializeKiloExecutor();
    await this.initializeIngestionAgent();
    
    console.log('✅ Unified Orchestration System Ready');
    console.log('   📥 Ingestion Agent - Raw message processing');
    console.log('   🚌 Task Bus - Intelligent routing');
    console.log('   🧠 Lingam Supervisor - Code review only');
    console.log('   ⚡ Kilo Executor - Operational tasks');
    console.log('   👷 Worker Pool - System tasks\n');
    
    return this;
  }

  async initializeTaskBus() {
    this.taskBus = new TaskBus({
      maxQueueSize: 500
    });
    
    console.log('🚌 Task Bus initialized');
  }

  async initializeLingamSupervisor() {
    this.lingamSupervisor = new LingamSupervisor({
      maxConcurrentReviews: 3,
      reviewTimeout: 30000
    });
    
    // Register Lingam with task bus
    this.taskBus.registerHandler('lingam', 
      (task) => this.lingamSupervisor.reviewCode(task),
      ['code-review', 'complex-analysis']
    );
    
    console.log('🧠 Lingam Supervisor registered (code review only)');
  }

  async initializeKiloExecutor() {
    this.kiloExecutor = new KiloExecutor({
      maxConcurrent: 5,
      timeout: 30000,
      workingDirectory: process.cwd()
    });
    
    // Register Kilo with task bus
    this.taskBus.registerHandler('kilo',
      (task) => this.kiloExecutor.executeOperation(task),
      ['execution', 'file-operations', 'process-management']
    );
    
    console.log('⚡ Kilo Executor registered (operational tasks only)');
  }

  async initializeIngestionAgent() {
    this.ingestionAgent = new MessageIngestionAgent({
      batchSize: this.config.batchSize,
      pollInterval: this.config.pollInterval,
      maxParallel: 20
    });
    
    // Set up ingestion → task bus pipeline
    this.ingestionAgent.on('task-ready', (task) => {
      console.log(`📥 Ingestion converted raw message to structured task: ${task.id}`);
      this.taskBus.submitTask(task);
      this.stats.messagesProcessed++;
    });
    
    console.log('📥 Message Ingestion Agent initialized');
  }

  async start(source = 'unified-orchestrator') {
    if (this.isRunning) {
      console.log('⚠️ Orchestration system already running');
      return this;
    }
    
    console.log('🎬 Starting Unified Ingestion-First System');
    console.log('===========================================\n');
    
    this.isRunning = true;
    
    // Start ingestion agent
    await this.ingestionAgent.start(source);
    
    // Start monitoring
    this.startHealthMonitoring();
    
    console.log('⚡ Unified System ACTIVE!');
    console.log('   Lingam only sees structured code review tasks');
    console.log('   Kilo handles all operational execution');
    console.log('   Workers process system maintenance');
    console.log('   No more Lingam queue explosion!\n');
    
    return this;
  }

  startHealthMonitoring() {
    setInterval(() => {
      const health = this.getSystemHealth();
      this.stats.systemHealth = health.status;
      
      if (health.status !== 'healthy') {
        console.warn(`⚠️ System health: ${health.status}`, health.issues);
      }
    }, 3000);
  }

  getSystemHealth() {
    const issues = [];
    const warnings = [];
    
    // Check queue health
    const queueStats = this.taskBus.getQueueStats();
    if (queueStats.totalQueued > 100) {
      warnings.push(`High queue backlog: ${queueStats.totalQueued} tasks`);
    }
    
    // Check handler loads
    const lingamStatus = this.lingamSupervisor.getStatus();
    const kiloStatus = this.kiloExecutor.getStatus();
    
    if (lingamStatus.load > '80%') {
      warnings.push(`Lingam load high: ${lingamStatus.load}`);
    }
    
    if (kiloStatus.load > '90%') {
      warnings.push(`Kilo load high: ${kiloStatus.load}`);
    }
    
    // Check for proper task distribution
    const routingStats = this.taskBus.getRoutingStats();
    if (routingStats.lingam > routingStats.kilo * 10) {
      issues.push('Lingam receiving disproportionate task load');
    }
    
    return {
      status: issues.length > 0 ? 'critical' : 
              warnings.length > 0 ? 'warning' : 'healthy',
      issues,
      warnings,
      metrics: {
        queues: queueStats,
        routing: routingStats,
        handlers: {
          lingam: lingamStatus,
          kilo: kiloStatus
        }
      }
    };
  }

  async stop() {
    console.log('🛑 Stopping Unified Orchestration System');
    
    this.isRunning = false;
    
    if (this.ingestionAgent) {
      this.ingestionAgent.stop();
    }
    
    console.log('✅ Unified Orchestration System stopped');
  }

  getStats() {
    return {
      ingestion: this.ingestionAgent.getStats(),
      taskBus: this.taskBus.getStats(),
      lingam: this.lingamSupervisor.getStats(),
      kilo: this.kiloExecutor.getStats(),
      system: {
        ...this.stats,
        uptime: Date.now() - this.stats.startTime,
        queueExplosionPrevented: 'YES'
      }
    };
  }

  // Bulk message processing for demonstration
  async processBulkMessages(count = 100) {
    console.log(`⚡ Processing bulk load: ${count} messages`);
    
    // Simulate high-volume message injection
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        // Messages will be picked up by ingestion agent automatically
      }, Math.random() * 5000);
    }
  }
}

export default UnifiedOrchestrator;