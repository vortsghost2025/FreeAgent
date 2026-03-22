/**
 * Worker Pool
 * 
 * A robust worker pool system that:
 * - Manages a pool of task processors
 * - Performs health checks for stuck workers
 * - Automatically recovers failed workers
 * - Provides graceful degradation
 * 
 * Works with the ParallelTaskQueue to ensure reliable task processing
 * even when workers become unhealthy or stuck.
 */

const EventEmitter = require('events');

class Worker extends EventEmitter {
  constructor(workerId, options = {}) {
    super();
    
    this.id = workerId;
    this.status = 'idle'; // 'idle', 'busy', 'unhealthy', 'recovering', 'terminated'
    this.health = 'healthy'; // 'healthy', 'suspect', 'unhealthy'
    this.currentTask = null;
    
    // Health metrics
    this.tasksCompleted = 0;
    this.tasksFailed = 0;
    this.totalProcessTime = 0;
    this.avgProcessTime = 0;
    this.lastHeartbeat = Date.now();
    this.createdAt = Date.now();
    
    // Recovery configuration
    this.maxConsecutiveFailures = options.maxConsecutiveFailures || 3;
    this.healthCheckInterval = options.healthCheckInterval || 5000;
    this.staleThreshold = options.staleThreshold || 30000;
    this.recoveryTimeout = options.recoveryTimeout || 10000;
    
    this.consecutiveFailures = 0;
  }

  /**
   * Mark worker as assigned a task
   */
  assignTask(task) {
    this.status = 'busy';
    this.currentTask = task;
    this.lastHeartbeat = Date.now();
    this.emit('taskAssigned', { taskId: task.id, workerId: this.id });
  }

  /**
   * Mark task as completed
   */
  completeTask(processTime) {
    this.status = 'idle';
    this.tasksCompleted++;
    this.totalProcessTime += processTime;
    this.avgProcessTime = this.totalProcessTime / this.tasksCompleted;
    this.consecutiveFailures = 0;
    this.health = 'healthy';
    this.currentTask = null;
    this.lastHeartbeat = Date.now();
  }

  /**
   * Mark task as failed
   */
  failTask(error) {
    this.status = 'idle';
    this.tasksFailed++;
    this.consecutiveFailures++;
    this.currentTask = null;
    this.lastHeartbeat = Date.now();
    
    // Determine health based on consecutive failures
    if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
      this.health = 'unhealthy';
      this.status = 'unhealthy';
      this.emit('unhealthy', { 
        workerId: this.id, 
        consecutiveFailures: this.consecutiveFailures,
        error 
      });
    } else if (this.consecutiveFailures >= 2) {
      this.health = 'suspect';
      this.emit('suspect', { 
        workerId: this.id, 
        consecutiveFailures: this.consecutiveFailures 
      });
    }
  }

  /**
   * Update heartbeat
   */
  heartbeat() {
    this.lastHeartbeat = Date.now();
  }

  /**
   * Check if worker is stale (hasn't sent heartbeat)
   */
  isStale() {
    return (Date.now() - this.lastHeartbeat) > this.staleThreshold;
  }

  /**
   * Start recovery process
   */
  async recover(recoveryFn) {
    this.status = 'recovering';
    this.health = 'suspect';
    this.emit('recoveryStarted', { workerId: this.id });
    
    try {
      await Promise.race([
        recoveryFn(this),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Recovery timeout')), this.recoveryTimeout)
        )
      ]);
      
      // Recovery successful
      this.status = 'idle';
      this.health = 'healthy';
      this.consecutiveFailures = 0;
      this.emit('recovered', { workerId: this.id });
      return true;
      
    } catch (error) {
      // Recovery failed
      this.status = 'unhealthy';
      this.health = 'unhealthy';
      this.emit('recoveryFailed', { workerId: this.id, error: error.message });
      return false;
    }
  }

  /**
   * Terminate the worker
   */
  terminate() {
    this.status = 'terminated';
    this.emit('terminated', { workerId: this.id });
  }

  /**
   * Get worker stats
   */
  getStats() {
    return {
      id: this.id,
      status: this.status,
      health: this.health,
      tasksCompleted: this.tasksCompleted,
      tasksFailed: this.tasksFailed,
      avgProcessTime: this.avgProcessTime,
      uptime: Date.now() - this.createdAt,
      lastHeartbeat: this.lastHeartbeat,
      isStale: this.isStale(),
      consecutiveFailures: this.consecutiveFailures
    };
  }
}

class WorkerPool extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Pool configuration
    this.minWorkers = options.minWorkers || 5;
    this.maxWorkers = options.maxWorkers || 30;
    this.initialWorkers = options.initialWorkers || 20;
    
    // Worker configuration
    this.workerOptions = {
      maxConsecutiveFailures: options.maxConsecutiveFailures || 3,
      healthCheckInterval: options.healthCheckInterval || 5000,
      staleThreshold: options.staleThreshold || 30000,
      recoveryTimeout: options.recoveryTimeout || 10000
    };
    
    // Workers storage
    this.workers = new Map(); // workerId -> Worker
    this.idleWorkers = []; // Array of idle worker IDs
    this.busyWorkers = new Map(); // workerId -> task info
    
    // Recovery handler
    this.recoveryFn = options.recoveryFn || null;
    
    // Task handler
    this.taskHandler = options.taskHandler || null;
    
    // Health check interval
    this.healthCheckInterval = options.healthCheckInterval || 5000;
    this.healthCheckTimer = null;
    
    // Metrics
    this.metrics = {
      workersCreated: 0,
      workersTerminated: 0,
      workersRecovered: 0,
      tasksProcessed: 0,
      tasksFailed: 0,
      totalProcessTime: 0
    };
    
    // State
    this.isRunning = false;
    this.isShuttingDown = false;
    
    // Initialize workers
    this._initializeWorkers();
  }

  /**
   * Initialize initial workers
   * @private
   */
  _initializeWorkers() {
    for (let i = 0; i < this.initialWorkers; i++) {
      this._createWorker();
    }
  }

  /**
   * Create a new worker
   * @private
   */
  _createWorker() {
    if (this.workers.size >= this.maxWorkers) {
      return null;
    }
    
    const workerId = `pool_worker_${++this.metrics.workersCreated}`;
    const worker = new Worker(workerId, this.workerOptions);
    
    this.workers.set(workerId, worker);
    this.idleWorkers.push(workerId);
    
    worker.on('unhealthy', (data) => {
      this.emit('workerUnhealthy', { workerId: data.workerId, ...data });
      this._handleUnhealthyWorker(workerId);
    });
    
    worker.on('suspect', (data) => {
      this.emit('workerSuspect', { workerId: data.workerId, ...data });
    });
    
    worker.on('recovered', (data) => {
      this.metrics.workersRecovered++;
      this.emit('workerRecovered', data);
    });
    
    this.emit('workerCreated', { workerId, totalWorkers: this.workers.size });
    
    return worker;
  }

  /**
   * Get an idle worker using smart load balancing
   * Supports: round-robin, least-loaded, least-utilized
   * @private
   */
  _getIdleWorker(strategy = 'least-loaded') {
    if (this.idleWorkers.length === 0) {
      // Try to create more workers if below max
      if (this.workers.size < this.maxWorkers) {
        this._createWorker();
      }
      return null;
    }
    
    if (this.idleWorkers.length === 1) {
      return this.idleWorkers[0];
    }
    
    // Smart worker selection based on strategy
    switch (strategy) {
      case 'least-loaded': {
        // Select worker with lowest average process time (most efficient)
        let bestWorker = null;
        let bestAvgTime = Infinity;
        
        for (const workerId of this.idleWorkers) {
          const worker = this.workers.get(workerId);
          if (worker && worker.avgProcessTime < bestAvgTime) {
            bestAvgTime = worker.avgProcessTime;
            bestWorker = workerId;
          }
        }
        return bestWorker || this.idleWorkers[0];
      }
      
      case 'least-utilized': {
        // Select worker with fewest completed tasks (least worked)
        let bestWorker = null;
        let minTasks = Infinity;
        
        for (const workerId of this.idleWorkers) {
          const worker = this.workers.get(workerId);
          if (worker && worker.tasksCompleted < minTasks) {
            minTasks = worker.tasksCompleted;
            bestWorker = workerId;
          }
        }
        return bestWorker || this.idleWorkers[0];
      }
      
      case 'round-robin':
      default:
        // Original behavior - just return first idle worker
        return this.idleWorkers[0];
    }
  }

  /**
   * Handle unhealthy worker
   * @private
   */
  _handleUnhealthyWorker(workerId) {
    const worker = this.workers.get(workerId);
    if (!worker) return;
    
    // Try to recover if recovery function is provided
    if (this.recoveryFn && worker.status !== 'terminated') {
      worker.recover(this.recoveryFn);
    } else {
      // No recovery function, terminate the worker
      this._terminateWorker(workerId);
    }
  }

  /**
   * Terminate a worker
   * @private
   */
  _terminateWorker(workerId) {
    const worker = this.workers.get(workerId);
    if (!worker) return;
    
    // Remove from idle/busy lists
    const idleIndex = this.idleWorkers.indexOf(workerId);
    if (idleIndex !== -1) {
      this.idleWorkers.splice(idleIndex, 1);
    }
    this.busyWorkers.delete(workerId);
    
    worker.terminate();
    this.workers.delete(workerId);
    this.metrics.workersTerminated++;
    
    this.emit('workerTerminated', { workerId, totalWorkers: this.workers.size });
    
    // Create replacement worker if below minimum
    if (this.workers.size < this.minWorkers) {
      this._createWorker();
    }
  }

  /**
   * Start the worker pool
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Start health check timer
    this.healthCheckTimer = setInterval(() => {
      this._healthCheck();
    }, this.healthCheckInterval);
    
    this.emit('started', { totalWorkers: this.workers.size });
  }

  /**
   * Stop the worker pool
   */
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    
    this.emit('stopped');
  }

  /**
   * Perform health check on all workers
   * @private
   */
  _healthCheck() {
    for (const [workerId, worker] of this.workers) {
      // Check for stale workers
      if (worker.isStale() && worker.status === 'busy') {
        this.emit('workerStale', { workerId, lastHeartbeat: worker.lastHeartbeat });
        
        // Mark as suspect
        if (worker.health !== 'unhealthy') {
          worker.health = 'suspect';
          worker.status = 'unhealthy';
          this._handleUnhealthyWorker(workerId);
        }
      }
      
      // Update heartbeat for idle workers
      if (worker.status === 'idle') {
        worker.heartbeat();
      }
    }
    
    // Emit pool health status
    this.emit('healthCheck', {
      total: this.workers.size,
      idle: this.idleWorkers.length,
      busy: this.busyWorkers.size,
      healthy: Array.from(this.workers.values()).filter(w => w.health === 'healthy').length,
      unhealthy: Array.from(this.workers.values()).filter(w => w.health === 'unhealthy').length
    });
  }

  /**
   * Submit a task to the pool
   * @param {any} taskData - Task data to process
   * @param {Object} options - Task options
   * @returns {Promise<any>} Task result
   */
  async submit(taskData, options = {}) {
    if (!this.isRunning) {
      throw new Error('Worker pool is not running');
    }
    
    // Get an idle worker
    let workerId = this._getIdleWorker();
    
    // If no idle workers and below max, create one
    if (!workerId && this.workers.size < this.maxWorkers) {
      this._createWorker();
      workerId = this._getIdleWorker();
    }
    
    // Wait for an idle worker if none available
    if (!workerId) {
      if (options.wait !== false) {
        // Wait for worker to become available
        await this._waitForIdleWorker();
        workerId = this._getIdleWorker();
      } else {
        throw new Error('No workers available');
      }
    }
    
    const worker = this.workers.get(workerId);
    const task = {
      id: options.taskId || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      data: taskData,
      options,
      startTime: Date.now()
    };
    
    // Assign task to worker
    worker.assignTask(task);
    this.busyWorkers.set(workerId, task);
    this.idleWorkers = this.idleWorkers.filter(id => id !== workerId);
    
    this.emit('taskAssigned', { workerId, taskId: task.id });
    
    try {
      // Execute the task
      const result = await this._executeTask(worker, task);
      
      // Mark task complete
      const processTime = Date.now() - task.startTime;
      worker.completeTask(processTime);
      this.metrics.tasksProcessed++;
      this.metrics.totalProcessTime += processTime;
      
      // Move back to idle
      this.busyWorkers.delete(workerId);
      this.idleWorkers.push(workerId);
      
      this.emit('taskCompleted', { workerId, taskId: task.id, processTime });
      
      return result;
      
    } catch (error) {
      // Task failed
      worker.failTask(error);
      
      // Move back to idle (or remove if unhealthy)
      this.busyWorkers.delete(workerId);
      if (worker.status !== 'unhealthy' && worker.status !== 'terminated') {
        this.idleWorkers.push(workerId);
      }
      
      this.metrics.tasksFailed++;
      this.emit('taskFailed', { workerId, taskId: task.id, error: error.message });
      
      throw error;
    }
  }

  /**
   * Execute a task on a worker
   * @private
   */
  async _executeTask(worker, task) {
    if (!this.taskHandler) {
      // Default: just return the task data
      return task.data;
    }
    
    return this.taskHandler(task.data, task, worker);
  }

  /**
   * Wait for an idle worker
   * @private
   */
  _waitForIdleWorker() {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.idleWorkers.length > 0) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      
      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 30000);
    });
  }

  /**
   * Set the task handler
   */
  setTaskHandler(handler) {
    this.taskHandler = handler;
  }

  /**
   * Set the recovery function
   */
  setRecoveryFn(fn) {
    this.recoveryFn = fn;
  }

  /**
   * Submit multiple tasks in batch
   * @param {Array} tasksData - Array of task data
   * @param {Object} options - Default options
   * @returns {Promise<Array>} Array of results
   */
  async submitBatch(tasksData, options = {}) {
    const concurrency = options.concurrency || this.idleWorkers.length;
    const results = [];
    
    for (let i = 0; i < tasksData.length; i += concurrency) {
      const batch = tasksData.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(
        batch.map(data => this.submit(data, options))
      );
      results.push(...batchResults.map((r, idx) => ({
        index: i + idx,
        ...(r.status === 'fulfilled' ? { success: true, result: r.value } : { success: false, error: r.reason.message })
      })));
    }
    
    return results;
  }

  /**
   * Get pool status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      workers: {
        total: this.workers.size,
        idle: this.idleWorkers.length,
        busy: this.busyWorkers.size,
        healthy: Array.from(this.workers.values()).filter(w => w.health === 'healthy').length,
        suspect: Array.from(this.workers.values()).filter(w => w.health === 'suspect').length,
        unhealthy: Array.from(this.workers.values()).filter(w => w.health === 'unhealthy').length
      },
      metrics: { ...this.metrics },
      avgProcessTime: this.metrics.tasksProcessed > 0 
        ? this.metrics.totalProcessTime / this.metrics.tasksProcessed 
        : 0
    };
  }

  /**
   * Get worker statistics
   */
  getWorkerStats() {
    return Array.from(this.workers.values()).map(w => w.getStats());
  }

  /**
   * Get a specific worker
   */
  getWorker(workerId) {
    return this.workers.get(workerId);
  }

  /**
   * Scale up workers
   */
  scaleUp(count = 1) {
    const created = [];
    for (let i = 0; i < count && this.workers.size < this.maxWorkers; i++) {
      const worker = this._createWorker();
      if (worker) created.push(worker.id);
    }
    
    if (created.length > 0) {
      this.emit('scaledUp', { count: created.length, totalWorkers: this.workers.size });
    }
    
    return created;
  }

  /**
   * Scale down workers
   */
  scaleDown(count = 1) {
    const terminated = [];
    const idleToTerminate = this.idleWorkers.slice(0, count);
    
    for (const workerId of idleToTerminate) {
      if (this.workers.size <= this.minWorkers) break;
      this._terminateWorker(workerId);
      terminated.push(workerId);
    }
    
    if (terminated.length > 0) {
      this.emit('scaledDown', { count: terminated.length, totalWorkers: this.workers.size });
    }
    
    return terminated;
  }

  /**
   * Force terminate all workers and shutdown
   */
  async shutdown() {
    this.isShuttingDown = true;
    this.stop();
    
    // Terminate all workers
    for (const workerId of this.workers.keys()) {
      this._terminateWorker(workerId);
    }
    
    this.emit('shutdown');
  }

  /**
   * Drain the pool (wait for all tasks to complete)
   */
  async drain(timeout = 60000) {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (this.busyWorkers.size === 0) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Drain timeout'));
      }, timeout);
    });
  }
}

/**
 * Create a worker pool with default configuration
 */
function createWorkerPool(options = {}) {
  const pool = new WorkerPool(options);
  
  if (options.autoStart !== false) {
    pool.start();
  }
  
  return pool;
}

module.exports = {
  WorkerPool,
  Worker,
  createWorkerPool
};