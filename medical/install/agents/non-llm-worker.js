/**
 * Non-LLM Worker Agents - Handle parallel processing without LLM inference
 * Prevents resource contention by avoiding local LLM calls
 */

import { EventEmitter } from 'events';
import SharedApiClient from './shared-api-client.js';

class NonLLMWorker extends EventEmitter {
  constructor(id, capabilities = ['general'], config = {}) {
    super();
    this.id = id;
    this.capabilities = capabilities;
    this.config = {
      maxConcurrent: config.maxConcurrent || 5,
      timeout: config.timeout || 30000,
      useRemoteLLM: true, // Always use remote LLM, never local
      ...config
    };
    
    this.status = 'idle';
    this.currentTasks = new Map();
    this.apiClient = new SharedApiClient();
    
    this.stats = {
      tasksProcessed: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      totalTime: 0
    };
  }

  async processTask(task, taskBus) {
    this.status = 'busy';
    this.currentTasks.set(task.id, {
      task,
      startTime: Date.now()
    });
    
    console.log(`🔧 Non-LLM Worker ${this.id} processing task ${task.id} (${task.category})`);
    
    try {
      // Handle task WITHOUT local LLM calls
      const result = await this.executeNonLLMTask(task);
      
      const taskRecord = this.currentTasks.get(task.id);
      const duration = Date.now() - taskRecord.startTime;
      
      this.stats.tasksCompleted++;
      this.stats.totalTime += duration;
      this.stats.tasksProcessed++;
      
      this.currentTasks.delete(task.id);
      this.status = this.currentTasks.size === 0 ? 'idle' : 'busy';
      
      // Report completion
      taskBus.completeTask(task.id, result);
      
      console.log(`✅ Worker ${this.id} completed non-LLM task ${task.id} in ${duration}ms`);
      
    } catch (error) {
      console.error(`❌ Worker ${this.id} failed task ${task.id}:`, error.message);
      
      this.stats.tasksFailed++;
      this.currentTasks.delete(task.id);
      this.status = this.currentTasks.size === 0 ? 'idle' : 'busy';
      
      taskBus.failTask(task.id, error);
    }
  }

  async executeNonLLMTask(task) {
    // These operations NEVER call local LLMs
    switch (task.category) {
      case 'system':
        return await this.handleSystemTask(task);
      case 'deployment':
        return await this.handleDeploymentTask(task);
      case 'monitoring':
        return await this.handleMonitoringTask(task);
      case 'configuration':
        return await this.handleConfigurationTask(task);
      case 'maintenance':
        return await this.handleMaintenanceTask(task);
      default:
        return await this.handleGeneralTask(task);
    }
  }

  async handleSystemTask(task) {
    // Pure system operations - no LLM needed
    await this.delay(500 + Math.random() * 1000);
    
    return {
      status: 'completed',
      action: 'System operation completed',
      details: `Processed: ${task.content.substring(0, 50)}...`,
      timestamp: new Date().toISOString(),
      worker: this.id,
      llmUsed: false // Explicitly mark no LLM used
    };
  }

  async handleDeploymentTask(task) {
    // Deployment operations using only APIs and scripts
    await this.delay(1000 + Math.random() * 2000);
    
    // Use remote APIs, never local LLM
    const deployResult = await this.apiClient.callREST(
      'https://api.deployment-service.com/deploy',
      {
        method: 'POST',
        body: JSON.stringify({ task: task.content }),
        priority: task.priority
      }
    );
    
    return {
      status: 'deployed',
      action: 'Deployment initiated',
      deploymentId: `dep_${Date.now()}`,
      service: 'remote-deployment-service',
      timestamp: new Date().toISOString(),
      worker: this.id,
      llmUsed: false,
      apiResponse: deployResult.data
    };
  }

  async handleMonitoringTask(task) {
    // Monitoring using existing data and APIs
    await this.delay(300 + Math.random() * 800);
    
    // Fetch monitoring data from remote sources
    const metrics = await this.apiClient.callREST(
      'https://api.monitoring-service.com/metrics',
      { priority: 'high' }
    );
    
    return {
      status: 'monitored',
      metrics: metrics.data,
      source: 'remote-monitoring-service',
      timestamp: new Date().toISOString(),
      worker: this.id,
      llmUsed: false
    };
  }

  async handleConfigurationTask(task) {
    // Configuration management without LLM assistance
    await this.delay(600 + Math.random() * 1200);
    
    // Use configuration APIs
    const configResult = await this.apiClient.callREST(
      'https://api.config-service.com/update',
      {
        method: 'PATCH',
        body: JSON.stringify({ update: task.content }),
        priority: task.priority
      }
    );
    
    return {
      status: 'configured',
      changes: configResult.data.applied_changes,
      scope: 'remote-configuration-service',
      timestamp: new Date().toISOString(),
      worker: this.id,
      llmUsed: false,
      backup: configResult.data.backup_created
    };
  }

  async handleMaintenanceTask(task) {
    // Automated maintenance without LLM
    await this.delay(1200 + Math.random() * 1800);
    
    // Use maintenance APIs
    const maintResult = await this.apiClient.callREST(
      'https://api.maintenance-service.com/execute',
      {
        method: 'POST',
        body: JSON.stringify({ operation: task.content }),
        priority: task.priority
      }
    );
    
    return {
      status: 'maintained',
      operation: maintResult.data.operation,
      duration: maintResult.data.duration,
      nextRun: maintResult.data.next_scheduled,
      timestamp: new Date().toISOString(),
      worker: this.id,
      llmUsed: false
    };
  }

  async handleGeneralTask(task) {
    // General processing using predefined rules
    await this.delay(400 + Math.random() * 800);
    
    // Parse and categorize without LLM
    const parsed = this.parseTaskContent(task.content);
    
    return {
      status: 'processed',
      summary: `Task categorized as: ${parsed.category}`,
      confidence: parsed.confidence,
      parsedContent: parsed.parsed,
      timestamp: new Date().toISOString(),
      worker: this.id,
      llmUsed: false
    };
  }

  parseTaskContent(content) {
    // Simple rule-based parsing instead of LLM
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('deploy') || lowerContent.includes('release')) {
      return { category: 'deployment', confidence: 0.9, parsed: 'Deployment request' };
    } else if (lowerContent.includes('monitor') || lowerContent.includes('check')) {
      return { category: 'monitoring', confidence: 0.85, parsed: 'Monitoring request' };
    } else if (lowerContent.includes('config') || lowerContent.includes('setting')) {
      return { category: 'configuration', confidence: 0.8, parsed: 'Configuration request' };
    } else if (lowerContent.includes('maintain') || lowerContent.includes('clean')) {
      return { category: 'maintenance', confidence: 0.75, parsed: 'Maintenance request' };
    } else {
      return { category: 'general', confidence: 0.7, parsed: 'General request' };
    }
  }

  delay(ms) {
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
          : '0ms'
      },
      llmUsage: {
        localLLMCalls: 0, // Always 0 for non-LLM workers
        remoteAPICalls: this.stats.tasksProcessed,
        llmFreeProcessing: '100%'
      }
    };
  }
}

export default NonLLMWorker;