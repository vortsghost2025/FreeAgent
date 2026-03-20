/**
 * Worker Agent - Parallel Message Processor
 * Processes tasks assigned by the task bus
 * Part of Lingam Parallel Orchestration System
 */

import { EventEmitter } from 'events';
import SharedApiClient from './shared-api-client.js';

class WorkerAgent extends EventEmitter {
  constructor(id, capabilities = ['general'], config = {}) {
    super();
    this.id = id;
    this.capabilities = capabilities;
    this.config = {
      maxConcurrent: config.maxConcurrent || 3,
      timeout: config.timeout || 30000,
      errorThreshold: config.errorThreshold || 0.3,
      ...config
    };
    
    this.status = 'idle';
    this.currentTasks = new Map();
    this.stats = {
      tasksProcessed: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      totalTime: 0,
      errors: []
    };
    
    this.registered = false;
    this.apiClient = new SharedApiClient();
  }

  registerWithBus(taskBus) {
    if (this.registered) return;
    
    taskBus.registerWorker(this.id, this.capabilities);
    taskBus.on('task-assigned', ({ task, workerId }) => {
      if (workerId === this.id) {
        this.processTask(task, taskBus);
      }
    });
    
    this.registered = true;
    console.log(`🤖 Worker ${this.id} registered with capabilities: ${this.capabilities.join(', ')}`);
  }

  async processTask(task, taskBus) {
    this.status = 'busy';
    this.currentTasks.set(task.id, {
      task,
      startTime: Date.now()
    });
    
    console.log(`🔧 Worker ${this.id} processing task ${task.id} (${task.category})`);
    
    try {
      // Simulate processing time based on task complexity
      const processingTime = task.estimatedDuration || 2000;
      await this.simulateProcessing(task, processingTime);
      
      // Generate appropriate response based on task type
      const result = await this.executeTask(task);
      
      // Record completion
      const taskRecord = this.currentTasks.get(task.id);
      const duration = Date.now() - taskRecord.startTime;
      
      this.stats.tasksCompleted++;
      this.stats.totalTime += duration;
      this.stats.tasksProcessed++;
      
      this.currentTasks.delete(task.id);
      
      if (this.currentTasks.size === 0) {
        this.status = 'idle';
      }
      
      // Report completion to task bus
      taskBus.completeTask(task.id, result);
      
      console.log(`✅ Worker ${this.id} completed task ${task.id} in ${duration}ms`);
      
    } catch (error) {
      console.error(`❌ Worker ${this.id} failed task ${task.id}:`, error.message);
      
      this.stats.tasksFailed++;
      this.stats.errors.push({
        taskId: task.id,
        error: error.message,
        timestamp: Date.now()
      });
      
      this.currentTasks.delete(task.id);
      
      if (this.currentTasks.size === 0) {
        this.status = 'idle';
      }
      
      // Report failure to task bus
      taskBus.failTask(task.id, error);
    }
  }

  async simulateProcessing(task, duration) {
    // Simulate realistic processing delays
    const steps = Math.min(5, Math.ceil(duration / 500));
    const stepDelay = duration / steps;
    
    for (let i = 0; i < steps; i++) {
      await new Promise(resolve => setTimeout(resolve, stepDelay));
      if (this.currentTasks.has(task.id)) {
        console.log(`   Worker ${this.id}: ${task.id} - ${(i + 1) * (100 / steps).toFixed(0)}% complete`);
      }
    }
  }

  async executeTask(task) {
    // Different execution logic based on task category
    switch (task.category) {
      case 'system':
        return await this.executeSystemTask(task);
      case 'deployment':
        return await this.executeDeploymentTask(task);
      case 'monitoring':
        return await this.executeMonitoringTask(task);
      case 'configuration':
        return await this.executeConfigurationTask(task);
      case 'maintenance':
        return await this.executeMaintenanceTask(task);
      default:
        return await this.executeGeneralTask(task);
    }
  }

  async executeSystemTask(task) {
    // Simulate system operations
    await this.delay(1000 + Math.random() * 2000);
    
    const actions = [
      'Restarted service successfully',
      'Applied system updates',
      'Cleared cache memory',
      'Optimized system performance',
      'Updated security patches'
    ];
    
    return {
      status: 'completed',
      action: actions[Math.floor(Math.random() * actions.length)],
      details: `System task processed: ${task.content.substring(0, 50)}...`
    };
  }

  async executeDeploymentTask(task) {
    // Simulate deployment operations
    await this.delay(2000 + Math.random() * 3000);
    
    const deployments = [
      'Deployed to staging environment',
      'Rolled back to previous version',
      'Scaled services to 10 instances',
      'Updated container images',
      'Applied database migrations'
    ];
    
    return {
      status: 'deployed',
      action: deployments[Math.floor(Math.random() * deployments.length)],
      version: `v${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 100)}`,
      environment: ['production', 'staging', 'development'][Math.floor(Math.random() * 3)]
    };
  }

  async executeMonitoringTask(task) {
    // Simulate monitoring operations
    await this.delay(500 + Math.random() * 1500);
    
    return {
      status: 'monitored',
      metrics: {
        cpu: `${(Math.random() * 100).toFixed(1)}%`,
        memory: `${(Math.random() * 100).toFixed(1)}%`,
        disk: `${(Math.random() * 100).toFixed(1)}%`,
        network: `${(Math.random() * 1000).toFixed(0)} Mbps`
      },
      alerts: Math.random() > 0.8 ? ['High CPU usage detected'] : [],
      timestamp: new Date().toISOString()
    };
  }

  async executeConfigurationTask(task) {
    // Simulate configuration operations
    await this.delay(800 + Math.random() * 1200);
    
    const configs = [
      'Updated environment variables',
      'Modified system settings',
      'Adjusted performance parameters',
      'Configured security policies',
      'Set up logging preferences'
    ];
    
    return {
      status: 'configured',
      changes: configs[Math.floor(Math.random() * configs.length)],
      scope: ['global', 'service', 'user', 'application'][Math.floor(Math.random() * 4)],
      backup: 'Configuration backup created'
    };
  }

  async executeMaintenanceTask(task) {
    // Simulate maintenance operations
    await this.delay(1500 + Math.random() * 2500);
    
    const maintenance = [
      'Database optimization completed',
      'Log rotation performed',
      'Cache cleared successfully',
      'Backup completed',
      'Security scan finished'
    ];
    
    return {
      status: 'maintained',
      operation: maintenance[Math.floor(Math.random() * maintenance.length)],
      duration: `${(Math.random() * 10).toFixed(1)} minutes`,
      nextScheduled: new Date(Date.now() + 86400000).toISOString()
    };
  }

  async executeGeneralTask(task) {
    // Simulate general task processing
    await this.delay(500 + Math.random() * 1000);
    
    return {
      status: 'processed',
      summary: `Handled request: ${task.content.substring(0, 100)}...`,
      response: 'Task completed successfully',
      timestamp: new Date().toISOString()
    };
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats() {
    return {
      id: this.id,
      status: this.status,
      capabilities: this.capabilities,
      activeTasks: this.currentTasks.size,
      performance: {
        tasksProcessed: this.stats.tasksProcessed,
        tasksCompleted: this.stats.tasksCompleted,
        tasksFailed: this.stats.tasksFailed,
        successRate: this.stats.tasksProcessed > 0 
          ? (this.stats.tasksCompleted / this.stats.tasksProcessed * 100).toFixed(1) + '%'
          : '0%',
        avgProcessingTime: this.stats.tasksCompleted > 0
          ? (this.stats.totalTime / this.stats.tasksCompleted).toFixed(0) + 'ms'
          : '0ms',
        errorRate: this.stats.tasksProcessed > 0
          ? (this.stats.tasksFailed / this.stats.tasksProcessed * 100).toFixed(1) + '%'
          : '0%'
      },
      recentErrors: this.stats.errors.slice(-5)
    };
  }

  getStatus() {
    return {
      id: this.id,
      status: this.status,
      currentTasks: Array.from(this.currentTasks.keys()),
      capabilities: this.capabilities,
      load: (this.currentTasks.size / this.config.maxConcurrent * 100).toFixed(0) + '%'
    };
  }
}

export default WorkerAgent;