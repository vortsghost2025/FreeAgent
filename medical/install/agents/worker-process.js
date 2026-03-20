/**
 * Worker Process Template - Standard worker process that communicates with launcher
 * This is the template that gets forked by worker-launcher.js
 */

import { parentPort } from 'worker_threads';
import { EventEmitter } from 'events';

class WorkerProcess extends EventEmitter {
  constructor() {
    super();
    this.workerId = process.env.WORKER_ID || 'unknown';
    this.config = JSON.parse(process.env.WORKER_CONFIG || '{}');
    this.status = 'initializing';
    this.currentTask = null;
    
    this.setupIPC();
    this.initialize();
  }

  setupIPC() {
    // Handle messages from parent process
    if (process.send) {
      process.on('message', (message) => {
        this.handleParentMessage(message);
      });
    }

    // Handle worker thread messages
    if (parentPort) {
      parentPort.on('message', (message) => {
        this.handleParentMessage(message);
      });
    }
  }

  handleParentMessage(message) {
    switch (message.type) {
      case 'execute-task':
        this.executeTask(message.task);
        break;
      case 'health-check':
        this.sendHealthStatus();
        break;
      case 'terminate':
        this.terminate();
        break;
      case 'configure':
        this.updateConfig(message.config);
        break;
      default:
        console.log(`[Worker ${this.workerId}] Unknown message type: ${message.type}`);
    }
  }

  async initialize() {
    console.log(`[Worker ${this.workerId}] Initializing...`);
    
    // Simulate initialization work
    await this.delay(1000);
    
    this.status = 'ready';
    this.sendStatus('ready');
    console.log(`[Worker ${this.workerId}] Ready for tasks`);
  }

  async executeTask(task) {
    if (this.status !== 'ready') {
      this.sendError(task, new Error('Worker not ready'));
      return;
    }

    console.log(`[Worker ${this.workerId}] Executing task ${task.id}`);
    this.status = 'busy';
    this.currentTask = task;

    try {
      const result = await this.processTask(task);
      this.sendTaskComplete(task, result);
    } catch (error) {
      console.error(`[Worker ${this.workerId}] Task failed:`, error.message);
      this.sendTaskError(task, error);
    } finally {
      this.status = 'ready';
      this.currentTask = null;
    }
  }

  async processTask(task) {
    // Simulate task processing time
    const duration = task.estimatedDuration || 1000 + Math.random() * 2000;
    await this.delay(duration);

    // Process based on task type
    switch (task.type) {
      case 'compute':
        return this.handleComputeTask(task);
      case 'io':
        return this.handleIOTask(task);
      case 'network':
        return this.handleNetworkTask(task);
      default:
        return this.handleGenericTask(task);
    }
  }

  handleComputeTask(task) {
    // Simulate CPU-intensive work
    let result = 0;
    for (let i = 0; i < 1000000; i++) {
      result += Math.sin(i) * Math.cos(i);
    }
    
    return {
      type: 'compute-result',
      result: result,
      iterations: 1000000,
      workerId: this.workerId
    };
  }

  handleIOTask(task) {
    // Simulate I/O operations
    return {
      type: 'io-result',
      operation: 'file-read',
      size: Math.floor(Math.random() * 10000),
      workerId: this.workerId
    };
  }

  handleNetworkTask(task) {
    // Simulate network operations
    return {
      type: 'network-result',
      endpoint: task.endpoint || 'https://api.example.com',
      statusCode: 200,
      responseTime: Math.floor(Math.random() * 1000),
      workerId: this.workerId
    };
  }

  handleGenericTask(task) {
    return {
      type: 'generic-result',
      message: `Processed: ${task.content || 'no content'}`,
      workerId: this.workerId,
      timestamp: new Date().toISOString()
    };
  }

  sendStatus(type, data = {}) {
    const message = {
      type,
      workerId: this.workerId,
      timestamp: Date.now(),
      ...data
    };

    if (process.send) {
      process.send(message);
    }
    
    if (parentPort) {
      parentPort.postMessage(message);
    }
  }

  sendHealthStatus() {
    this.sendStatus('health-status', {
      status: this.status,
      currentTask: this.currentTask ? this.currentTask.id : null,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  }

  sendTaskComplete(task, result) {
    this.sendStatus('task-complete', {
      task,
      result
    });
  }

  sendTaskError(task, error) {
    this.sendStatus('task-error', {
      task,
      error: {
        message: error.message,
        stack: error.stack
      }
    });
  }

  sendError(task, error) {
    this.sendStatus('task-error', {
      task,
      error: {
        message: error.message,
        stack: error.stack
      }
    });
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log(`[Worker ${this.workerId}] Config updated`);
    this.sendStatus('config-updated', { config: this.config });
  }

  terminate() {
    console.log(`[Worker ${this.workerId}] Terminating...`);
    this.status = 'terminating';
    
    // Give some time for cleanup
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  log(level, message) {
    this.sendStatus('log', { level, message });
  }
}

// Start the worker process
const worker = new WorkerProcess();

// Handle process signals
process.on('SIGTERM', () => worker.terminate());
process.on('SIGINT', () => worker.terminate());

// Graceful shutdown
process.on('beforeExit', () => {
  console.log(`[Worker ${worker.workerId}] Process exiting`);
});