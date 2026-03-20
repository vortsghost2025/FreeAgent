/**
 * Worker Manager - High-level worker orchestration and management
 * Coordinates multiple workers, handles scaling, and manages workload distribution
 */

import { EventEmitter } from 'events';
import WorkerLauncher from './worker-launcher.js';

class WorkerManager extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      minWorkers: config.minWorkers || 2,
      maxWorkers: config.maxWorkers || 10,
      workerScript: config.workerScript || './worker-process.js',
      autoScale: config.autoScale !== false,
      scaleUpThreshold: config.scaleUpThreshold || 0.8, // 80% utilization
      scaleDownThreshold: config.scaleDownThreshold || 0.3, // 30% utilization
      scaleInterval: config.scaleInterval || 30000, // 30 seconds
      ...config
    };

    this.launcher = new WorkerLauncher({
      maxWorkers: this.config.maxWorkers,
      workerScript: this.config.workerScript
    });

    this.workers = new Map();
    this.taskQueue = [];
    this.pendingTasks = new Map();
    this.scaleTimer = null;
    this.stats = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      totalWorkersLaunched: 0
    };
  }

  async initialize() {
    console.log('🔧 Initializing Worker Manager...');
    
    // Launch minimum workers
    const initialWorkers = [];
    for (let i = 0; i < this.config.minWorkers; i++) {
      initialWorkers.push({
        id: `worker-${i + 1}`,
        type: 'general'
      });
    }

    await this.launcher.launchMultiple(initialWorkers);
    this.startAutoScaling();
    
    console.log(`✅ Worker Manager initialized with ${this.config.minWorkers} workers`);
  }

  startAutoScaling() {
    if (!this.config.autoScale || this.scaleTimer) return;

    this.scaleTimer = setInterval(() => {
      this.evaluateScaling();
    }, this.config.scaleInterval);
  }

  evaluateScaling() {
    const utilization = this.getSystemUtilization();
    const currentWorkers = this.launcher.workerCount;

    console.log(`📊 System utilization: ${(utilization * 100).toFixed(1)}%, Workers: ${currentWorkers}`);

    if (utilization > this.config.scaleUpThreshold && currentWorkers < this.config.maxWorkers) {
      this.scaleUp();
    } else if (utilization < this.config.scaleDownThreshold && currentWorkers > this.config.minWorkers) {
      this.scaleDown();
    }
  }

  getSystemUtilization() {
    if (this.workers.size === 0) return 0;

    let busyWorkers = 0;
    for (const worker of this.workers.values()) {
      if (worker.status === 'busy') busyWorkers++;
    }

    return busyWorkers / this.workers.size;
  }

  async scaleUp() {
    const currentCount = this.launcher.workerCount;
    const targetCount = Math.min(currentCount + 1, this.config.maxWorkers);
    
    if (targetCount > currentCount) {
      console.log(`📈 Scaling up from ${currentCount} to ${targetCount} workers`);
      
      const newWorkerId = `worker-${targetCount}`;
      await this.launcher.launchWorker(newWorkerId, { type: 'general' });
    }
  }

  async scaleDown() {
    const currentCount = this.launcher.workerCount;
    const targetCount = Math.max(currentCount - 1, this.config.minWorkers);
    
    if (targetCount < currentCount) {
      console.log(`📉 Scaling down from ${currentCount} to ${targetCount} workers`);
      
      // Find least busy worker to terminate
      let leastBusyWorker = null;
      let minLoad = Infinity;
      
      for (const [workerId, worker] of this.workers) {
        if (worker.load < minLoad && worker.status !== 'busy') {
          minLoad = worker.load;
          leastBusyWorker = workerId;
        }
      }
      
      if (leastBusyWorker) {
        await this.launcher.terminateWorker(leastBusyWorker);
      }
    }
  }

  submitTask(taskData) {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const task = {
      id: taskId,
      ...taskData,
      submittedAt: Date.now(),
      status: 'queued'
    };

    this.taskQueue.push(task);
    this.stats.totalTasks++;
    
    console.log(`📥 Task ${taskId} queued (${task.type || 'general'})`);
    this.emit('task-queued', task);
    
    this.processQueue();
    return taskId;
  }

  processQueue() {
    while (this.taskQueue.length > 0 && this.hasAvailableWorker()) {
      const task = this.taskQueue.shift();
      this.assignTask(task);
    }
  }

  hasAvailableWorker() {
    for (const worker of this.workers.values()) {
      if (worker.status === 'idle') {
        return true;
      }
    }
    return false;
  }

  assignTask(task) {
    let assignedWorker = null;
    
    // Find best worker for this task type
    for (const [workerId, worker] of this.workers) {
      if (worker.status === 'idle' && 
          (!task.requiredCapabilities || 
           this.hasCapabilities(worker, task.requiredCapabilities))) {
        assignedWorker = workerId;
        break;
      }
    }

    if (assignedWorker) {
      this.dispatchTask(assignedWorker, task);
    } else {
      // Re-queue if no suitable worker available
      this.taskQueue.unshift(task);
    }
  }

  hasCapabilities(worker, requiredCapabilities) {
    if (!requiredCapabilities) return true;
    
    return requiredCapabilities.every(cap => 
      worker.capabilities.includes(cap)
    );
  }

  dispatchTask(workerId, task) {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    task.status = 'assigned';
    task.assignedTo = workerId;
    task.assignedAt = Date.now();
    
    worker.status = 'busy';
    worker.currentTask = task.id;
    worker.load = Math.min(worker.load + 0.1, 1.0);
    
    this.pendingTasks.set(task.id, task);
    
    console.log(`📤 Dispatching task ${task.id} to worker ${workerId}`);
    this.emit('task-assigned', { task, workerId });
    
    // Send task to worker process
    try {
      const workerProcess = this.launcher.workers.get(workerId)?.process;
      if (workerProcess && workerProcess.connected) {
        workerProcess.send({
          type: 'execute-task',
          task: task
        });
      }
    } catch (error) {
      console.error(`Failed to send task to worker ${workerId}:`, error.message);
      this.handleTaskFailure(task.id, error);
    }
  }

  handleTaskCompletion(taskId, result) {
    const task = this.pendingTasks.get(taskId);
    if (!task) return;

    task.status = 'completed';
    task.completedAt = Date.now();
    task.result = result;
    
    const worker = this.workers.get(task.assignedTo);
    if (worker) {
      worker.status = 'idle';
      worker.currentTask = null;
      worker.load = Math.max(worker.load - 0.1, 0.0);
      worker.stats.tasksCompleted++;
    }
    
    this.pendingTasks.delete(taskId);
    this.stats.completedTasks++;
    
    console.log(`✅ Task ${taskId} completed by worker ${task.assignedTo}`);
    this.emit('task-completed', { task, result });
    
    this.processQueue();
  }

  handleTaskFailure(taskId, error) {
    const task = this.pendingTasks.get(taskId);
    if (!task) return;

    task.status = 'failed';
    task.failedAt = Date.now();
    task.error = error.message;
    
    const worker = this.workers.get(task.assignedTo);
    if (worker) {
      worker.status = 'idle';
      worker.currentTask = null;
      worker.load = Math.max(worker.load - 0.1, 0.0);
      worker.stats.tasksFailed++;
    }
    
    this.pendingTasks.delete(taskId);
    this.stats.failedTasks++;
    
    console.error(`❌ Task ${taskId} failed:`, error.message);
    this.emit('task-failed', { task, error });
    
    this.processQueue();
  }

  registerWorker(workerId, capabilities = ['general']) {
    const worker = {
      id: workerId,
      status: 'idle',
      capabilities,
      load: 0.0,
      currentTask: null,
      stats: {
        tasksCompleted: 0,
        tasksFailed: 0,
        uptime: Date.now()
      }
    };
    
    this.workers.set(workerId, worker);
    console.log(`🤖 Registered worker ${workerId} with capabilities: ${capabilities.join(', ')}`);
    this.emit('worker-registered', worker);
  }

  unregisterWorker(workerId) {
    const worker = this.workers.get(workerId);
    if (worker) {
      this.workers.delete(workerId);
      console.log(`👋 Unregistered worker ${workerId}`);
      this.emit('worker-unregistered', worker);
    }
  }

  async shutdown() {
    console.log('🛑 Shutting down Worker Manager...');
    
    if (this.scaleTimer) {
      clearInterval(this.scaleTimer);
      this.scaleTimer = null;
    }
    
    // Complete pending tasks if possible
    for (const task of this.pendingTasks.values()) {
      if (task.status === 'assigned') {
        this.handleTaskFailure(task.id, new Error('Manager shutdown'));
      }
    }
    
    await this.launcher.terminateAll();
    console.log('✅ Worker Manager shutdown complete');
  }

  getStats() {
    return {
      ...this.stats,
      activeWorkers: this.workers.size,
      queuedTasks: this.taskQueue.length,
      pendingTasks: this.pendingTasks.size,
      workerDetails: Array.from(this.workers.values()).map(w => ({
        id: w.id,
        status: w.status,
        load: w.load,
        currentTask: w.currentTask,
        capabilities: w.capabilities,
        stats: w.stats
      }))
    };
  }
}

export default WorkerManager;