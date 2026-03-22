/**
 * Lingam Parallel Orchestration System
 * Main supervisor that coordinates message ingestion, task distribution, and worker management
 * Transforms Lingam from solo processor to parallel dispatcher
 */

import MessageIngestionAgent from './message-ingestion-agent.js';
import TaskBus from './task-bus.js';
import WorkerAgent from './worker-agent.js';
import SharedApiClient from './shared-api-client.js';
import { EventEmitter } from 'events';

class LingamOrchestrator extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      workerCount: config.workerCount || 10,
      queueSources: config.queueSources || ['cockpit', 'discord', 'slack', 'telegram'],
      batchSize: config.batchSize || 20,
      pollInterval: config.pollInterval || 500,
      ...config
    };
    
    // Core components
    this.ingestionAgent = null;
    this.taskBus = null;
    this.workers = new Map();
    this.apiClient = null;
    this.supervisorStats = {
      startTime: Date.now(),
      messagesProcessed: 0,
      tasksDispatched: 0,
      systemHealth: 'operational'
    };
    
    this.isRunning = false;
  }

  async initialize() {
    console.log('🚀 Lingam Parallel Orchestration System - Initializing');
    
    // Initialize shared API client
    this.apiClient = new SharedApiClient({
      llmConcurrency: 2,
      rpcConcurrency: 3,
      restConcurrency: 5
    });
    
    // Initialize task bus first
    this.taskBus = new TaskBus({
      maxQueueSize: 1000,
      workerTimeout: 30000
    });
    
    // Set up task bus event handlers
    this.setupTaskBusHandlers();
    
    // Initialize ingestion agent
    this.ingestionAgent = new MessageIngestionAgent({
      batchSize: this.config.batchSize,
      pollInterval: this.config.pollInterval,
      maxParallel: 50
    });
    
    // Set up ingestion agent event handlers
    this.setupIngestionHandlers();
    
    // Deploy worker agents
    await this.deployWorkers();
    
    console.log('✅ Lingam Orchestration System initialized');
    return this;
  }

  setupTaskBusHandlers() {
    this.taskBus.on('task-assigned', ({ task, workerId }) => {
      console.log(`🎯 Supervisor: Task ${task.id} assigned to worker ${workerId}`);
      this.supervisorStats.tasksDispatched++;
      this.emit('task-dispatched', { task, workerId });
    });
    
    this.taskBus.on('task-completed', ({ taskId, result, workerId }) => {
      console.log(`✅ Supervisor: Task ${taskId} completed by worker ${workerId}`);
      this.supervisorStats.messagesProcessed++;
      this.emit('task-completed', { taskId, result, workerId });
    });
    
    this.taskBus.on('task-failed', ({ taskId, error, workerId }) => {
      console.log(`❌ Supervisor: Task ${taskId} failed on worker ${workerId}: ${error.message}`);
      this.emit('task-failed', { taskId, error, workerId });
    });
  }

  setupIngestionHandlers() {
    this.ingestionAgent.on('task-ready', (task) => {
      console.log(`📥 Supervisor: Received task ${task.id} from ingestion`);
      this.taskBus.submitTask(task);
    });
  }

  async deployWorkers() {
    console.log(`🤖 Deploying ${this.config.workerCount} worker agents`);
    
    const workerConfigs = [
      { id: 'sys-worker-1', capabilities: ['system', 'maintenance'] },
      { id: 'sys-worker-2', capabilities: ['system', 'configuration'] },
      { id: 'deploy-worker-1', capabilities: ['deployment', 'configuration'] },
      { id: 'deploy-worker-2', capabilities: ['deployment', 'maintenance'] },
      { id: 'monitor-worker-1', capabilities: ['monitoring', 'system'] },
      { id: 'monitor-worker-2', capabilities: ['monitoring', 'maintenance'] },
      { id: 'config-worker-1', capabilities: ['configuration', 'system'] },
      { id: 'general-worker-1', capabilities: ['general'] },
      { id: 'general-worker-2', capabilities: ['general'] },
      { id: 'general-worker-3', capabilities: ['general'] }
    ];
    
    // Create and register workers
    for (let i = 0; i < this.config.workerCount && i < workerConfigs.length; i++) {
      const config = workerConfigs[i];
      const worker = new WorkerAgent(config.id, config.capabilities, {
        maxConcurrent: 3,
        timeout: 30000
      });
      
      worker.registerWithBus(this.taskBus);
      this.workers.set(config.id, worker);
    }
    
    console.log(`✅ ${this.workers.size} workers deployed and registered`);
  }

  async start(queueSource = 'cockpit') {
    if (this.isRunning) {
      console.log('⚠️ Orchestration system already running');
      return this;
    }
    
    console.log('🎬 Starting Lingam Parallel Orchestration System');
    
    this.isRunning = true;
    
    // Start ingestion agent
    await this.ingestionAgent.start(queueSource);
    
    console.log('⚡ Lingam Orchestration System is now processing messages in parallel!');
    
    // Start periodic health monitoring
    this.startHealthMonitoring();
    
    return this;
  }

  startHealthMonitoring() {
    setInterval(() => {
      const health = this.getSystemHealth();
      this.supervisorStats.systemHealth = health.status;
      
      if (health.status === 'degraded') {
        console.warn('⚠️ System health degraded:', health.issues);
        this.emit('health-warning', health);
      }
    }, 5000);
  }

  getSystemHealth() {
    const issues = [];
    
    // Check worker health
    const workerStats = this.getWorkerStats();
    const unhealthyWorkers = workerStats.filter(w => w.status === 'offline' || w.errorRate > 30);
    if (unhealthyWorkers.length > 0) {
      issues.push(`${unhealthyWorkers.length} workers reporting issues`);
    }
    
    // Check queue health
    const queueStats = this.taskBus.getQueueStats();
    if (queueStats.queueLength > 500) {
      issues.push(`High queue backlog: ${queueStats.queueLength} tasks`);
    }
    
    // Check processing rate
    const processingRate = this.supervisorStats.messagesProcessed / 
                          ((Date.now() - this.supervisorStats.startTime) / 60000);
    if (processingRate < 10) {
      issues.push(`Low processing rate: ${processingRate.toFixed(1)} tasks/minute`);
    }
    
    return {
      status: issues.length === 0 ? 'operational' : 
              issues.length <= 2 ? 'degraded' : 'critical',
      issues,
      metrics: {
        workers: workerStats.length,
        activeWorkers: workerStats.filter(w => w.status === 'busy').length,
        queueLength: queueStats.queueLength,
        processingRate: processingRate.toFixed(1)
      }
    };
  }

  async stop() {
    console.log('🛑 Stopping Lingam Orchestration System');
    
    this.isRunning = false;
    
    // Stop ingestion agent
    if (this.ingestionAgent) {
      this.ingestionAgent.stop();
    }
    
    // Stop all workers
    for (const worker of this.workers.values()) {
      // Workers will be automatically unregistered when they complete
    }
    
    // Clean up task bus
    if (this.taskBus) {
      // Task bus will clean up its resources
    }
    
    console.log('✅ Lingam Orchestration System stopped');
  }

  getStats() {
    return {
      supervisor: {
        ...this.supervisorStats,
        uptime: Date.now() - this.supervisorStats.startTime,
        messagesPerMinute: this.supervisorStats.messagesProcessed / 
                          ((Date.now() - this.supervisorStats.startTime) / 60000)
      },
      ingestion: this.ingestionAgent ? this.ingestionAgent.getStats() : null,
      taskBus: this.taskBus ? this.taskBus.getStats() : null,
      workers: this.getWorkerStats()
    };
  }

  getWorkerStats() {
    return Array.from(this.workers.values()).map(worker => worker.getStats());
  }

  getWorkerStatus() {
    return Array.from(this.workers.values()).map(worker => worker.getStatus());
  }

  getQueueSnapshot() {
    return this.taskBus ? this.taskBus.getQueueStats() : null;
  }

  // Supervisor commands
  async scaleWorkers(targetCount) {
    if (targetCount > this.workers.size) {
      // Scale up
      const additionalWorkers = targetCount - this.workers.size;
      console.log(`📈 Scaling up: Adding ${additionalWorkers} workers`);
      
      for (let i = 0; i < additionalWorkers; i++) {
        const workerId = `dynamic-worker-${Date.now()}-${i}`;
        const worker = new WorkerAgent(workerId, ['general'], {
          maxConcurrent: 2,
          timeout: 30000
        });
        
        worker.registerWithBus(this.taskBus);
        this.workers.set(workerId, worker);
      }
    } else if (targetCount < this.workers.size) {
      // Scale down
      const workersToRemove = this.workers.size - targetCount;
      console.log(`📉 Scaling down: Removing ${workersToRemove} workers`);
      
      const workerIds = Array.from(this.workers.keys());
      for (let i = 0; i < workersToRemove; i++) {
        const workerId = workerIds[workerIds.length - 1 - i];
        this.taskBus.unregisterWorker(workerId);
        this.workers.delete(workerId);
      }
    }
    
    console.log(`✅ Worker count adjusted to ${this.workers.size}`);
  }

  async processBulkMessages(count = 100) {
    console.log(`⚡ Processing bulk message load: ${count} messages`);
    
    // Simulate high-volume message injection
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const bulkTask = {
          id: `bulk_${Date.now()}_${i}`,
          timestamp: Date.now(),
          content: `Bulk processing task #${i + 1}`,
          source: 'bulk-load',
          priority: i < 10 ? 'high' : 'normal',
          category: ['system', 'deployment', 'monitoring'][Math.floor(Math.random() * 3)],
          estimatedDuration: 1000 + Math.random() * 3000
        };
        
        this.taskBus.submitTask(bulkTask);
      }, Math.random() * 2000); // Stagger submissions
    }
  }
}

export default LingamOrchestrator;