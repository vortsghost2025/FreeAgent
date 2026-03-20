/**
 * Parallel Task Queue Manager
 * 
 * A robust parallel task queue system that:
 * - Supports multiple concurrent workers (configurable, default 5)
 * - Executes tasks based on priority
 * - Batches tasks to prevent queue buildup
 * - Implements rate limiting per task type
 * - Auto-scales workers based on queue depth
 * 
 * Prevents getting "stuck" with 50+ tasks queued by dynamically adjusting
 * worker count and managing queue overflow.
 */

const EventEmitter = require('events');

class Task {
  constructor(taskData, options = {}) {
    this.id = options.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.data = taskData;
    this.type = options.type || 'default';
    this.priority = options.priority ?? 5; // 1-10, higher = more important
    this.createdAt = options.createdAt || Date.now();
    this.attempts = 0;
    this.maxAttempts = options.maxAttempts || 3;
    this.timeout = options.timeout || 30000;
    this.metadata = options.metadata || {};
    this.status = 'pending';
    this.result = null;
    this.error = null;
    this.startedAt = null;
    this.completedAt = null;
  }
}

class PriorityQueue {
  constructor() {
    this.heap = [];
  }

  // Binary heap parent index
  _parent(i) {
    return Math.floor((i - 1) / 2);
  }

  // Binary heap left child index
  _left(i) {
    return 2 * i + 1;
  }

  // Binary heap right child index
  _right(i) {
    return 2 * i + 2;
  }

  // Swap two elements in heap
  _swap(i, j) {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }

  // Heapify up - maintain max heap property (higher priority first)
  _heapifyUp(index) {
    while (index > 0) {
      const parent = this._parent(index);
      if (this.heap[parent].priority < this.heap[index].priority) {
        this._swap(parent, index);
        index = parent;
      } else {
        break;
      }
    }
  }

  // Heapify down - maintain max heap property
  _heapifyDown(index) {
    const length = this.heap.length;
    while (true) {
      const left = this._left(index);
      const right = this._right(index);
      let largest = index;

      if (left < length && this.heap[left].priority > this.heap[largest].priority) {
        largest = left;
      }
      if (right < length && this.heap[right].priority > this.heap[largest].priority) {
        largest = right;
      }

      if (largest !== index) {
        this._swap(index, largest);
        index = largest;
      } else {
        break;
      }
    }
  }

  enqueue(task) {
    // Add task to end of heap
    this.heap.push(task);
    // Restore heap property
    this._heapifyUp(this.heap.length - 1);
  }

  dequeue() {
    if (this.heap.length === 0) {
      return undefined;
    }
    // Get highest priority task
    const task = this.heap[0];
    // Move last element to root
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._heapifyDown(0);
    }
    return task;
  }

  peek() {
    return this.heap[0];
  }

  size() {
    return this.heap.length;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  clear() {
    this.heap = [];
  }

  getAll() {
    return [...this.heap];
  }
}

class RateLimiter {
  constructor() {
    this.limits = new Map(); // taskType -> { maxPerWindow, windowMs, current, resetTime }
  }

  configure(taskType, maxPerWindow, windowMs) {
    this.limits.set(taskType, {
      maxPerWindow,
      windowMs,
      current: 0,
      resetTime: Date.now() + windowMs,
      queue: [] // Tasks waiting for rate limit
    });
  }

  canExecute(taskType) {
    const limiter = this.limits.get(taskType);
    if (!limiter) return true;

    const now = Date.now();
    if (now >= limiter.resetTime) {
      // Reset the window
      limiter.current = 0;
      limiter.resetTime = now + limiter.windowMs;
    }

    return limiter.current < limiter.maxPerWindow;
  }

  acquire(taskType) {
    const limiter = this.limits.get(taskType);
    if (!limiter) return true;

    const now = Date.now();
    if (now >= limiter.resetTime) {
      limiter.current = 0;
      limiter.resetTime = now + limiter.windowMs;
    }

    if (limiter.current < limiter.maxPerWindow) {
      limiter.current++;
      return true;
    }
    return false;
  }

  release(taskType) {
    const limiter = this.limits.get(taskType);
    if (limiter && limiter.current > 0) {
      limiter.current--;
    }
  }

  getWaitTime(taskType) {
    const limiter = this.limits.get(taskType);
    if (!limiter) return 0;
    return Math.max(0, limiter.resetTime - Date.now());
  }
}

class ParallelTaskQueue extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Configuration
    this.maxWorkers = options.maxWorkers || 5;
    this.minWorkers = options.minWorkers || 1;
    this.defaultWorkers = options.defaultWorkers || 5;
    this.currentWorkers = this.defaultWorkers;
    
    // Queue management
    this.pendingQueue = new PriorityQueue();
    this.runningTasks = new Map(); // taskId -> { task, workerId, startTime, timeout }
    this.completedTasks = new Map();
    this.failedTasks = new Map();
    
    // Rate limiting
    this.rateLimiter = new RateLimiter();
    
    // Worker management
    this.workers = new Map(); // workerId -> { status, currentTask, health }
    this.workerIdCounter = 0;
    
    // Auto-scaling configuration
    this.autoScaleEnabled = options.autoScaleEnabled !== false;
    this.scaleUpThreshold = options.scaleUpThreshold || 10; // Queue depth to trigger scale up
    this.scaleDownThreshold = options.scaleDownThreshold || 2; // Queue depth to trigger scale down
    this.scaleUpCooldown = options.scaleUpCooldown || 5000; // ms between scale ups
    this.scaleDownCooldown = options.scaleDownCooldown || 30000; // ms between scale downs
    this.lastScaleUp = 0;
    this.lastScaleDown = 0;
    
    // Batching
    this.batchSize = options.batchSize || 10;
    this.batchTimeout = options.batchTimeout || 1000;
    
    // State
    this.isPaused = false;
    this.isShutdown = false;
    this.processingLoop = null;
    
    // Metrics
    this.metrics = {
      tasksProcessed: 0,
      tasksFailed: 0,
      tasksRejected: 0,
      totalWaitTime: 0,
      totalProcessTime: 0,
      scaleEvents: 0
    };

    // Initialize workers
    this._initializeWorkers();
  }

  _initializeWorkers() {
    for (let i = 0; i < this.defaultWorkers; i++) {
      this._createWorker();
    }
  }

  _createWorker() {
    const workerId = `worker_${++this.workerIdCounter}`;
    this.workers.set(workerId, {
      id: workerId,
      status: 'idle',
      currentTask: null,
      health: 'healthy',
      lastHeartbeat: Date.now(),
      tasksCompleted: 0,
      tasksFailed: 0
    });
    this.emit('workerCreated', { workerId, totalWorkers: this.workers.size });
    return workerId;
  }

  _removeWorker(workerId) {
    const worker = this.workers.get(workerId);
    if (worker && worker.status === 'idle') {
      this.workers.delete(workerId);
      this.emit('workerRemoved', { workerId, totalWorkers: this.workers.size });
      return true;
    }
    return false;
  }

  /**
   * Configure rate limiting for a specific task type
   * @param {string} taskType - The type of task to limit
   * @param {number} maxPerWindow - Maximum tasks per window
   * @param {number} windowMs - Window size in milliseconds
   */
  configureRateLimit(taskType, maxPerWindow, windowMs) {
    this.rateLimiter.configure(taskType, maxPerWindow, windowMs);
    this.emit('rateLimitConfigured', { taskType, maxPerWindow, windowMs });
  }

  /**
   * Add a task to the queue
   * @param {any} taskData - The task data to process
   * @param {Object} options - Task options (type, priority, etc.)
   * @returns {Promise<Task>} The created task
   */
  async enqueue(taskData, options = {}) {
    if (this.isShutdown) {
      throw new Error('Queue is shutdown');
    }

    const task = new Task(taskData, options);
    
    // Check if queue is full (backpressure)
    const queueDepth = this.pendingQueue.size() + this.runningTasks.size;
    if (queueDepth >= this.maxWorkers * 10) {
      this.metrics.tasksRejected++;
      this.emit('queueFull', { taskId: task.id, queueDepth });
      throw new Error(`Queue is full (${queueDepth} tasks). Try again later.`);
    }

    this.pendingQueue.enqueue(task);
    this.emit('taskEnqueued', { taskId: task.id, queueDepth: this.pendingQueue.size() });
    
    // Trigger auto-scaling check
    this._checkAutoScale();
    
    // Start processing if not already running
    this._startProcessing();
    
    return task;
  }

  /**
   * Add multiple tasks in a batch
   * @param {Array} tasksData - Array of task data
   * @param {Object} defaultOptions - Default options for all tasks
   * @returns {Promise<Array<Task>>} Array of created tasks
   */
  async enqueueBatch(tasksData, defaultOptions = {}) {
    const tasks = [];
    for (const data of tasksData) {
      const task = new Task(data, { ...defaultOptions, id: undefined });
      this.pendingQueue.enqueue(task);
      tasks.push(task);
    }
    
    this.emit('batchEnqueued', { count: tasks.length, queueDepth: this.pendingQueue.size() });
    this._checkAutoScale();
    this._startProcessing();
    
    return tasks;
  }

  /**
   * Get the next available task for a worker
   * @private
   */
  _getNextTask() {
    if (this.isPaused || this.pendingQueue.isEmpty()) {
      return null;
    }

    // Find a task that can be executed (rate limit check)
    const tasks = this.pendingQueue.getAll();
    for (const task of tasks) {
      if (this.rateLimiter.canExecute(task.type)) {
        // Remove from pending queue
        this.pendingQueue.clear();
        for (const t of tasks) {
          if (t.id !== task.id) {
            this.pendingQueue.enqueue(t);
          }
        }
        
        if (this.rateLimiter.acquire(task.type)) {
          return task;
        }
      }
    }

    return null;
  }

  /**
   * Start the task processing loop
   * @private
   */
  _startProcessing() {
    if (this.processingLoop) return;
    
    this.processingLoop = setInterval(() => {
      this._processTasks();
    }, 100);
  }

  /**
   * Stop the processing loop
   * @private
   */
  _stopProcessing() {
    if (this.processingLoop) {
      clearInterval(this.processingLoop);
      this.processingLoop = null;
    }
  }

  /**
   * Process available tasks
   * @private
   */
  _processTasks() {
    if (this.isPaused || this.isShutdown) return;

    // Find idle workers
    const idleWorkers = Array.from(this.workers.values())
      .filter(w => w.status === 'idle' && w.health === 'healthy');

    // Assign tasks to idle workers
    for (const worker of idleWorkers) {
      const task = this._getNextTask();
      if (!task) break;

      this._assignTaskToWorker(worker, task);
    }

    // Check for stalled tasks
    this._checkStalledTasks();

    // Check for auto-scaling
    this._checkAutoScale();
  }

  /**
   * Assign a task to a worker
   * @private
   */
  _assignTaskToWorker(worker, task) {
    task.status = 'running';
    task.startedAt = Date.now();
    worker.status = 'busy';
    worker.currentTask = task.id;

    this.runningTasks.set(task.id, {
      task,
      workerId: worker.id,
      startTime: Date.now(),
      timeout: setTimeout(() => {
        this._handleTaskTimeout(task.id);
      }, task.timeout)
    });

    this.emit('taskStarted', { 
      taskId: task.id, 
      workerId: worker.id,
      type: task.type,
      priority: task.priority
    });

    // Execute the task
    this._executeTask(task, worker);
  }

  /**
   * Execute a task
   * @private
   */
  async _executeTask(task, worker) {
    try {
      // Check if we have a handler
      if (!this.taskHandler) {
        throw new Error('No task handler configured');
      }

      const result = await this.taskHandler(task.data, task, worker);
      
      // Task completed successfully
      this._completeTask(task.id, result, worker);
      
    } catch (error) {
      // Task failed
      this._failTask(task.id, error, worker);
    }
  }

  /**
   * Complete a task successfully
   * @private
   */
  _completeTask(taskId, result, worker) {
    const runningTask = this.runningTasks.get(taskId);
    if (!runningTask) return;

    clearTimeout(runningTask.timeout);
    
    const task = runningTask.task;
    task.status = 'completed';
    task.result = result;
    task.completedAt = Date.now();
    
    // Update worker
    worker.status = 'idle';
    worker.currentTask = null;
    worker.tasksCompleted++;
    worker.lastHeartbeat = Date.now();
    
    // Release rate limiter
    this.rateLimiter.release(task.type);
    
    // Move from running to completed
    this.runningTasks.delete(taskId);
    this.completedTasks.set(taskId, task);
    
    // Update metrics
    const processTime = task.completedAt - task.startedAt;
    this.metrics.tasksProcessed++;
    this.metrics.totalProcessTime += processTime;
    this.metrics.totalWaitTime += task.startedAt - task.createdAt;
    
    // Keep completed tasks map bounded
    if (this.completedTasks.size > 1000) {
      const firstKey = this.completedTasks.keys().next().value;
      this.completedTasks.delete(firstKey);
    }

    this.emit('taskCompleted', {
      taskId,
      workerId: worker.id,
      processTime,
      type: task.type
    });

    // Check if we should scale down
    this._checkAutoScale();
  }

  /**
   * Fail a task
   * @private
   */
  _failTask(taskId, error, worker) {
    const runningTask = this.runningTasks.get(taskId);
    if (!runningTask) return;

    clearTimeout(runningTask.timeout);
    
    const task = runningTask.task;
    task.attempts++;
    
    // Release rate limiter
    this.rateLimiter.release(task.type);

    if (task.attempts < task.maxAttempts) {
      // Retry the task
      task.status = 'pending';
      task.error = error.message;
      this.pendingQueue.enqueue(task);
      this.runningTasks.delete(taskId);
      
      this.emit('taskRetried', {
        taskId,
        attempt: task.attempts,
        maxAttempts: task.maxAttempts,
        error: error.message
      });
      
    } else {
      // Task failed permanently
      task.status = 'failed';
      task.error = error.message;
      task.completedAt = Date.now();
      
      // Update worker
      worker.status = 'idle';
      worker.currentTask = null;
      worker.tasksFailed++;
      worker.lastHeartbeat = Date.now();
      
      // Move from running to failed
      this.runningTasks.delete(taskId);
      this.failedTasks.set(taskId, task);
      
      // Update metrics
      this.metrics.tasksFailed++;
      
      // Keep failed tasks map bounded
      if (this.failedTasks.size > 1000) {
        const firstKey = this.failedTasks.keys().next().value;
        this.failedTasks.delete(firstKey);
      }

      this.emit('taskFailed', {
        taskId,
        workerId: worker.id,
        error: error.message,
        attempts: task.attempts
      });
    }
  }

  /**
   * Handle task timeout
   * @private
   */
  _handleTaskTimeout(taskId) {
    const runningTask = this.runningTasks.get(taskId);
    if (!runningTask) return;

    const worker = this.workers.get(runningTask.workerId);
    const error = new Error(`Task timeout after ${runningTask.task.timeout}ms`);
    
    this.emit('taskTimeout', { taskId, workerId: runningTask.workerId });
    
    // Mark worker as potentially unhealthy
    if (worker) {
      worker.health = 'suspect';
      this.emit('workerHealthWarning', { 
        workerId: worker.id, 
        reason: 'task timeout' 
      });
    }
    
    this._failTask(taskId, error, worker);
  }

  /**
   * Check for stalled tasks and unhealthy workers
   * @private
   */
  _checkStalledTasks() {
    const now = Date.now();
    const staleThreshold = 60000; // 1 minute

    for (const [workerId, worker] of this.workers) {
      if (worker.status === 'busy') {
        const idleTime = now - worker.lastHeartbeat;
        
        // Worker hasn't sent heartbeat in a while
        if (idleTime > staleThreshold) {
          worker.health = 'unhealthy';
          this.emit('workerUnhealthy', { workerId, idleTime });
        }
      }
    }
  }

  /**
   * Auto-scale workers based on queue depth
   * @private
   */
  _checkAutoScale() {
    if (!this.autoScaleEnabled || this.isPaused) return;

    const queueDepth = this.pendingQueue.size();
    const runningCount = this.runningTasks.size;
    const now = Date.now();

    // Scale up
    if (queueDepth >= this.scaleUpThreshold && 
        this.currentWorkers < this.maxWorkers &&
        now - this.lastScaleUp > this.scaleUpCooldown) {
      
      this._scaleUp();
      this.lastScaleUp = now;
    }

    // Scale down
    if (queueDepth <= this.scaleDownThreshold && 
        this.currentWorkers > this.minWorkers &&
        runningCount === 0 &&
        now - this.lastScaleDown > this.scaleDownCooldown) {
      
      this._scaleDown();
      this.lastScaleDown = now;
    }
  }

  /**
   * Scale up worker count
   * @private
   */
  _scaleUp() {
    const newWorkerCount = Math.min(
      this.currentWorkers + 1,
      this.maxWorkers
    );
    
    while (this.currentWorkers < newWorkerCount) {
      this._createWorker();
      this.currentWorkers++;
    }
    
    this.metrics.scaleEvents++;
    this.emit('scaleUp', { 
      workerCount: this.currentWorkers,
      reason: 'high queue depth'
    });
  }

  /**
   * Scale down worker count
   * @private
   */
  _scaleDown() {
    const idleWorkers = Array.from(this.workers.values())
      .filter(w => w.status === 'idle' && w.health === 'healthy');
    
    // Don't scale below minWorkers
    const toRemove = Math.max(0, this.currentWorkers - this.minWorkers);
    const removeCount = Math.min(idleWorkers.length, toRemove);
    
    let removed = 0;
    for (const worker of idleWorkers) {
      if (removed >= removeCount) break;
      if (this._removeWorker(worker.id)) {
        removed++;
      }
    }
    
    this.currentWorkers = Math.max(this.minWorkers, this.currentWorkers - removed);
    
    if (removed > 0) {
      this.metrics.scaleEvents++;
      this.emit('scaleDown', { 
        workerCount: this.currentWorkers,
        removedWorkers: removed
      });
    }
  }

  /**
   * Set the task handler function
   * @param {Function} handler - Async function(taskData, task, worker)
   */
  setTaskHandler(handler) {
    this.taskHandler = handler;
  }

  /**
   * Pause task processing
   */
  pause() {
    this.isPaused = true;
    this.emit('paused');
  }

  /**
   * Resume task processing
   */
  resume() {
    this.isPaused = false;
    this.emit('resumed');
    this._startProcessing();
  }

  /**
   * Get current queue status
   */
  getStatus() {
    return {
      pending: this.pendingQueue.size(),
      running: this.runningTasks.size,
      completed: this.completedTasks.size,
      failed: this.failedTasks.size,
      workers: {
        total: this.workers.size,
        idle: Array.from(this.workers.values()).filter(w => w.status === 'idle').length,
        busy: Array.from(this.workers.values()).filter(w => w.status === 'busy').length,
        healthy: Array.from(this.workers.values()).filter(w => w.health === 'healthy').length,
        unhealthy: Array.from(this.workers.values()).filter(w => w.health === 'unhealthy').length
      },
      isPaused: this.isPaused,
      isShutdown: this.isShutdown,
      metrics: { ...this.metrics }
    };
  }

  /**
   * Get queue depth
   */
  getQueueDepth() {
    return this.pendingQueue.size() + this.runningTasks.size;
  }

  /**
   * Get a task by ID
   */
  getTask(taskId) {
    let task = this.pendingQueue.getAll().find(t => t.id === taskId);
    if (task) return task;
    
    task = this.runningTasks.get(taskId)?.task;
    if (task) return task;
    
    task = this.completedTasks.get(taskId);
    if (task) return task;
    
    return this.failedTasks.get(taskId);
  }

  /**
   * Wait for a specific task to complete
   * @param {string} taskId 
   * @param {number} timeout 
   */
  async waitForTask(taskId, timeout = 60000) {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const task = this.getTask(taskId);
        if (!task) {
          clearInterval(checkInterval);
          reject(new Error('Task not found'));
          return;
        }
        
        if (task.status === 'completed') {
          clearInterval(checkInterval);
          resolve(task.result);
        } else if (task.status === 'failed') {
          clearInterval(checkInterval);
          reject(new Error(task.error));
        }
      }, 100);

      // Timeout
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Task wait timeout'));
      }, timeout);
    });
  }

  /**
   * Clear the pending queue
   */
  clearQueue() {
    const count = this.pendingQueue.size();
    this.pendingQueue.clear();
    this.emit('queueCleared', { clearedCount: count });
    return count;
  }

  /**
   * Shutdown the queue gracefully
   */
  async shutdown(timeout = 30000) {
    this.isShutdown = true;
    this._stopProcessing();

    // Wait for running tasks to complete
    const runningCount = this.runningTasks.size;
    if (runningCount > 0) {
      this.emit('shutdown', { waitingForTasks: runningCount });
      
      await new Promise(resolve => setTimeout(resolve, Math.min(timeout, 5000)));
    }

    this.emit('shutdownComplete');
  }

  /**
   * Force shutdown without waiting
   */
  forceShutdown() {
    this.isShutdown = true;
    this._stopProcessing();
    
    // Clear all queues
    this.pendingQueue.clear();
    
    for (const [taskId, runningTask] of this.runningTasks) {
      clearTimeout(runningTask.timeout);
    }
    this.runningTasks.clear();
    
    this.emit('forceShutdown');
  }
}

module.exports = {
  ParallelTaskQueue,
  Task,
  PriorityQueue,
  RateLimiter
};