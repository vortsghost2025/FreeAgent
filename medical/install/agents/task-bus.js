/**
 * Task Bus / Consensus Hub - Intelligent task routing
 * Routes structured tasks to appropriate handlers based on classification
 * Prevents Lingam from being overwhelmed by raw message volume
 */

import { EventEmitter } from 'events';

class TaskBus extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      maxQueueSize: config.maxQueueSize || 500,
      priorityLevels: ['low', 'normal', 'high', 'critical'],
      ...config
    };
    
    // Separate queues for different handlers
    this.queues = {
      lingam: [],    // Code review and complex reasoning tasks
      kilo: [],      // Execution and operational tasks  
      workers: [],   // System and maintenance tasks
      general: []    // Uncategorized tasks
    };
    
    this.handlers = new Map(); // Registered task handlers
    this.activeTasks = new Map();
    this.stats = {
      tasksReceived: 0,
      tasksRouted: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      routingDecisions: {}
    };
    
    this.startTime = Date.now();
  }

  registerHandler(handlerId, handlerFunction, capabilities) {
    this.handlers.set(handlerId, {
      id: handlerId,
      handler: handlerFunction,
      capabilities: capabilities || ['general'],
      status: 'idle',
      currentTask: null
    });
    
    console.log(`🤖 Registered handler: ${handlerId} (${capabilities.join(', ')})`);
  }

  submitTask(task) {
    this.stats.tasksReceived++;
    
    // Route task based on classification
    const routing = this.routeTask(task);
    this.queues[routing.queue].push(task);
    
    // Track routing decisions
    this.stats.routingDecisions[routing.handler] = 
      (this.stats.routingDecisions[routing.handler] || 0) + 1;
    
    console.log(`📋 Task ${task.id} routed to ${routing.handler} (${task.type})`);
    
    // Try immediate assignment
    this.assignQueuedTasks();
  }

  routeTask(task) {
    // Route based on the ingestion agent's classification
    switch (task.routing) {
      case 'lingam-supervisor':
        return { queue: 'lingam', handler: 'lingam' };
      case 'kilo-executor':
        return { queue: 'kilo', handler: 'kilo' };
      case 'worker-pool':
        return { queue: 'workers', handler: 'workers' };
      default:
        return { queue: 'general', handler: 'general' };
    }
  }

  assignQueuedTasks() {
    // Assign tasks from each queue to appropriate handlers
    Object.keys(this.queues).forEach(queueName => {
      const queue = this.queues[queueName];
      while (queue.length > 0) {
        const task = queue.shift();
        const assigned = this.assignTaskToHandler(task);
        
        if (assigned) {
          this.stats.tasksRouted++;
        } else {
          // Put task back if no handler available
          queue.unshift(task);
          break;
        }
      }
    });
  }

  assignTaskToHandler(task) {
    // Find appropriate handler based on routing
    let handlerId;
    switch (task.routing) {
      case 'lingam-supervisor':
        handlerId = 'lingam';
        break;
      case 'kilo-executor':
        handlerId = 'kilo';
        break;
      case 'worker-pool':
        handlerId = 'workers';
        break;
      default:
        handlerId = 'general';
    }
    
    const handler = this.handlers.get(handlerId);
    if (handler && handler.status === 'idle') {
      this.executeTask(handler, task);
      return true;
    }
    
    return false;
  }

  executeTask(handler, task) {
    handler.status = 'busy';
    handler.currentTask = task;
    
    this.activeTasks.set(task.id, {
      task,
      handlerId: handler.id,
      assignedAt: Date.now()
    });
    
    console.log(`🎯 Assigned ${task.id} to ${handler.id}`);
    
    // Execute the task
    Promise.resolve(handler.handler(task))
      .then(result => {
        this.completeTask(task.id, result);
      })
      .catch(error => {
        this.failTask(task.id, error);
      });
  }

  completeTask(taskId, result) {
    const taskRecord = this.activeTasks.get(taskId);
    if (!taskRecord) return;
    
    const handler = this.handlers.get(taskRecord.handlerId);
    if (handler) {
      handler.status = 'idle';
      handler.currentTask = null;
    }
    
    this.activeTasks.delete(taskId);
    this.stats.tasksCompleted++;
    
    console.log(`✅ Task ${taskId} completed by ${taskRecord.handlerId}`);
    this.emit('task-completed', { taskId, result, handlerId: taskRecord.handlerId });
    
    // Check for more work
    this.assignQueuedTasks();
  }

  failTask(taskId, error) {
    const taskRecord = this.activeTasks.get(taskId);
    if (!taskRecord) return;
    
    const handler = this.handlers.get(taskRecord.handlerId);
    if (handler) {
      handler.status = 'idle';
      handler.currentTask = null;
    }
    
    this.activeTasks.delete(taskId);
    this.stats.tasksFailed++;
    
    console.log(`❌ Task ${taskId} failed on ${taskRecord.handlerId}: ${error.message}`);
    this.emit('task-failed', { taskId, error, handlerId: taskRecord.handlerId });
    
    // Check for more work
    this.assignQueuedTasks();
  }

  getQueueStats() {
    const stats = {};
    Object.keys(this.queues).forEach(queue => {
      stats[queue] = this.queues[queue].length;
    });
    
    return {
      ...stats,
      activeTasks: this.activeTasks.size,
      totalQueued: Object.values(stats).reduce((sum, count) => sum + count, 0)
    };
  }

  getRoutingStats() {
    return {
      ...this.stats.routingDecisions,
      totalRouted: this.stats.tasksRouted,
      completionRate: this.stats.tasksReceived > 0 ? 
        (this.stats.tasksCompleted / this.stats.tasksReceived * 100).toFixed(1) + '%' : '0%'
    };
  }

  getStats() {
    return {
      ...this.stats,
      queues: this.getQueueStats(),
      routing: this.getRoutingStats(),
      uptime: Date.now() - this.startTime
    };
  }
}

export default TaskBus;