/**
 * Message Distributor
 * 
 * A robust message distribution system that:
 * - Distributes incoming tasks across multiple workers
 * - Prevents single-point bottlenecks
 * - Handles backpressure when queue is full
 * - Implements task deduplication
 * 
 * Works with the ParallelTaskQueue to ensure tasks are distributed
 * evenly and efficiently without overwhelming the system.
 */

const EventEmitter = require('events');
const crypto = require('crypto');

class MessageDistributor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Queue reference
    this.queue = options.queue || null;
    
    // Distribution strategy
    this.strategy = options.strategy || 'round-robin'; // 'round-robin', 'least-loaded', 'priority', 'weighted'
    
    // Backpressure configuration
    this.maxQueueDepth = options.maxQueueDepth || 100;
    this.backpressureThreshold = options.backpressureThreshold || 50;
    this.retryDelay = options.retryDelay || 1000;
    this.maxRetries = options.maxRetries || 3;
    
    // Deduplication
    this.deduplicationEnabled = options.deduplicationEnabled !== false;
    this.deduplicationWindow = options.deduplicationWindow || 60000; // 1 minute
    this.deduplicationKeys = new Map(); // key -> { timestamp, taskId }
    this.deduplicationOrder = []; // Sorted timestamps for O(1) cleanup
    
    // Worker tracking for distribution
    this.workers = new Map(); // workerId -> { load, weight, lastUsed }
    this.roundRobinIndex = 0;
    
    // Metrics
    this.metrics = {
      messagesReceived: 0,
      messagesDistributed: 0,
      messagesRejected: 0,
      messagesDuplicated: 0,
      messagesBackpressured: 0,
      distributionErrors: 0
    };
    
    // State
    this.isPaused = false;
    this.isShuttingDown = false;
    
    // Cleanup interval for deduplication
    this.cleanupInterval = setInterval(() => {
      this._cleanupDeduplication();
    }, this.deduplicationWindow);
  }

  /**
   * Set the queue to distribute messages to
   */
  setQueue(queue) {
    this.queue = queue;
    
    // Listen for queue events
    if (queue) {
      queue.on('workerCreated', ({ workerId }) => {
        this._registerWorker(workerId);
      });
      
      queue.on('workerRemoved', ({ workerId }) => {
        this._unregisterWorker(workerId);
      });
      
      queue.on('taskCompleted', ({ workerId }) => {
        this._updateWorkerLoad(workerId, -1);
      });
      
      queue.on('taskFailed', ({ workerId }) => {
        this._updateWorkerLoad(workerId, -1);
      });
    }
  }

  /**
   * Register a new worker
   * @private
   */
  _registerWorker(workerId, weight = 1) {
    this.workers.set(workerId, {
      id: workerId,
      load: 0,
      weight,
      lastUsed: Date.now(),
      status: 'active'
    });
    this.emit('workerRegistered', { workerId, totalWorkers: this.workers.size });
  }

  /**
   * Unregister a worker
   * @private
   */
  _unregisterWorker(workerId) {
    this.workers.delete(workerId);
    this.emit('workerUnregistered', { workerId, totalWorkers: this.workers.size });
  }

  /**
   * Update worker load after task completion/failure
   * @private
   */
  _updateWorkerLoad(workerId, delta) {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.load = Math.max(0, worker.load + delta);
      if (delta < 0) {
        worker.lastUsed = Date.now();
      }
    }
  }

  /**
   * Generate a deduplication key from task data
   */
  generateDedupKey(taskData, options = {}) {
    // Use custom key function if provided
    if (options.dedupKeyFn) {
      return options.dedupKeyFn(taskData);
    }
    
    // Default: hash of serialized task data
    const content = JSON.stringify(taskData);
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Check if a task is a duplicate
   * @private
   */
  _isDuplicate(key) {
    if (!this.deduplicationEnabled) return false;
    
    const existing = this.deduplicationKeys.get(key);
    if (existing) {
      const age = Date.now() - existing.timestamp;
      if (age < this.deduplicationWindow) {
        return existing.taskId;
      }
    }
    return false;
  }

  /**
   * Register a task in deduplication cache
   * @private
   */
  _registerDedup(key, taskId) {
    const timestamp = Date.now();
    this.deduplicationKeys.set(key, {
      taskId,
      timestamp
    });
    // Insert into sorted array - binary search for position
    this._insertSorted(timestamp, key);
  }

  /**
   * Binary search insert for sorted timestamps - O(log n)
   * @private
   */
  _insertSorted(timestamp, key) {
    const arr = this.deduplicationOrder;
    let low = 0, high = arr.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (arr[mid].timestamp < timestamp) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    arr.splice(low, 0, { timestamp, key });
  }

  /**
   * Clean up old deduplication entries - O(k) where k = expired entries
   * @private
   */
  _cleanupDeduplication() {
    const now = Date.now();
    const cutoff = now - this.deduplicationWindow;
    
    // Remove expired entries from sorted array
    while (this.deduplicationOrder.length > 0 && 
           this.deduplicationOrder[0].timestamp < cutoff) {
      const expired = this.deduplicationOrder.shift();
      this.deduplicationKeys.delete(expired.key);
    }
  }

  /**
   * Get the current queue depth
   */
  getQueueDepth() {
    if (!this.queue) return 0;
    return this.queue.getQueueDepth();
  }

  /**
   * Check if backpressure should be applied
   */
  shouldBackpressure() {
    const depth = this.getQueueDepth();
    return depth >= this.backpressureThreshold;
  }

  /**
   * Distribute a message/task to the queue
   * @param {any} taskData - The task data to distribute
   * @param {Object} options - Distribution options
   * @returns {Promise<Object>} Result with taskId and status
   */
  async distribute(taskData, options = {}) {
    if (this.isShuttingDown) {
      throw new Error('Distributor is shutting down');
    }

    this.metrics.messagesReceived++;
    
    // Check backpressure
    if (this.shouldBackpressure()) {
      this.metrics.messagesBackpressured++;
      this.emit('backpressure', { 
        queueDepth: this.getQueueDepth(),
        threshold: this.backpressureThreshold 
      });
      
      // Wait and retry if configured
      if (options.waitOnBackpressure !== false) {
        return this._waitAndRetry(taskData, options);
      }
      
      throw new Error('Backpressure: Queue is overloaded');
    }

    // Check for duplicate
    if (this.deduplicationEnabled && options.dedupe !== false) {
      const dedupKey = this.generateDedupKey(taskData, options);
      const existingTaskId = this._isDuplicate(dedupKey);
      
      if (existingTaskId) {
        this.metrics.messagesDuplicated++;
        this.emit('duplicate', { 
          key: dedupKey, 
          existingTaskId 
        });
        
        return {
          status: 'duplicate',
          taskId: existingTaskId,
          message: 'Task already exists in queue'
        };
      }
    }

    // Try to distribute
    try {
      const taskOptions = {
        type: options.type || 'default',
        priority: options.priority ?? 5,
        maxAttempts: options.maxAttempts || 3,
        timeout: options.timeout || 30000,
        metadata: {
          ...options.metadata,
          distributedAt: Date.now(),
          distributor: 'message-distributor'
        }
      };
      
      // Add worker preference if specified
      if (options.preferredWorker) {
        taskOptions.metadata.preferredWorker = options.preferredWorker;
      }
      
      // Set worker weight if specified
      if (options.workerWeight) {
        const worker = this.workers.get(options.preferredWorker);
        if (worker) {
          worker.weight = options.workerWeight;
        }
      }

      // Enqueue the task
      const task = await this.queue.enqueue(taskData, taskOptions);
      
      // Register for deduplication
      if (this.deduplicationEnabled) {
        const dedupKey = this.generateDedupKey(taskData, options);
        this._registerDedup(dedupKey, task.id);
      }

      this.metrics.messagesDistributed++;
      this.emit('distributed', { 
        taskId: task.id, 
        queueDepth: this.getQueueDepth(),
        type: taskOptions.type
      });

      return {
        status: 'queued',
        taskId: task.id,
        queueDepth: this.getQueueDepth()
      };
      
    } catch (error) {
      this.metrics.distributionErrors++;
      this.emit('distributionError', { error: error.message });
      throw error;
    }
  }

  /**
   * Wait and retry distribution
   * @private
   */
  async _waitAndRetry(taskData, options) {
    let attempts = 0;
    
    while (attempts < this.maxRetries) {
      await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      
      if (!this.shouldBackpressure()) {
        return this.distribute(taskData, options);
      }
      
      attempts++;
    }
    
    this.metrics.messagesRejected++;
    throw new Error(`Backpressure: Failed after ${this.maxRetries} retries`);
  }

  /**
   * Distribute multiple messages in batch
   * @param {Array} messagesData - Array of task data
   * @param {Object} options - Default options for all messages
   * @returns {Promise<Array<Object>>} Array of results
   */
  async distributeBatch(messagesData, options = {}) {
    const results = [];
    
    // Process in parallel with concurrency limit
    const concurrency = options.concurrency || 10;
    const batchSize = Math.ceil(messagesData.length / concurrency);
    
    for (let i = 0; i < messagesData.length; i += batchSize) {
      const batch = messagesData.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(msg => this.distribute(msg, options))
      );
      
      results.push(...batchResults.map((r, idx) => ({
        index: i + idx,
        ...(r.status === 'fulfilled' ? r.value : { status: 'error', error: r.reason.message })
      })));
    }
    
    this.emit('batchDistributed', { 
      total: messagesData.length,
      successful: results.filter(r => r.status === 'queued').length,
      duplicates: results.filter(r => r.status === 'duplicate').length,
      failed: results.filter(r => r.status === 'error').length
    });
    
    return results;
  }

  /**
   * Select the best worker based on distribution strategy
   * @private
   */
  _selectWorker() {
    const workersArray = Array.from(this.workers.values())
      .filter(w => w.status === 'active');
    
    if (workersArray.length === 0) {
      return null;
    }

    switch (this.strategy) {
      case 'round-robin':
        const worker = workersArray[this.roundRobinIndex % workersArray.length];
        this.roundRobinIndex++;
        return worker;
        
      case 'least-loaded':
        return workersArray.reduce((min, w) => 
          w.load < min.load ? w : min
        );
        
      case 'priority':
        // Select worker with lowest load among available workers
        // that have capacity (load < weight * threshold)
        const threshold = 5;
        const available = workersArray.filter(w => w.load < w.weight * threshold);
        if (available.length === 0) {
          // All workers at capacity, return least loaded
          return workersArray.reduce((min, w) => 
            w.load < min.load ? w : min
          );
        }
        return available.reduce((min, w) => 
          w.load < min.load ? w : min
        );
        
      case 'weighted':
        // Weighted random selection
        const totalWeight = workersArray.reduce((sum, w) => sum + w.weight, 0);
        let random = Math.random() * totalWeight;
        for (const w of workersArray) {
          random -= w.weight;
          if (random <= 0) return w;
        }
        return workersArray[workersArray.length - 1];
        
      default:
        return workersArray[0];
    }
  }

  /**
   * Set distribution strategy
   */
  setStrategy(strategy) {
    const validStrategies = ['round-robin', 'least-loaded', 'priority', 'weighted'];
    if (!validStrategies.includes(strategy)) {
      throw new Error(`Invalid strategy: ${strategy}. Valid: ${validStrategies.join(', ')}`);
    }
    this.strategy = strategy;
    this.emit('strategyChanged', { strategy });
  }

  /**
   * Get worker statistics
   */
  getWorkerStats() {
    return Array.from(this.workers.values()).map(w => ({
      id: w.id,
      load: w.load,
      weight: w.weight,
      lastUsed: w.lastUsed,
      status: w.status
    }));
  }

  /**
   * Get distributor status
   */
  getStatus() {
    return {
      strategy: this.strategy,
      queueDepth: this.getQueueDepth(),
      backpressureThreshold: this.backpressureThreshold,
      isBackpressured: this.shouldBackpressure(),
      workers: {
        total: this.workers.size,
        active: Array.from(this.workers.values()).filter(w => w.status === 'active').length
      },
      metrics: { ...this.metrics },
      deduplication: {
        enabled: this.deduplicationEnabled,
        cachedKeys: this.deduplicationKeys.size
      }
    };
  }

  /**
   * Pause message distribution
   */
  pause() {
    this.isPaused = true;
    this.emit('paused');
  }

  /**
   * Resume message distribution
   */
  resume() {
    this.isPaused = false;
    this.emit('resumed');
  }

  /**
   * Shutdown the distributor
   */
  async shutdown() {
    this.isShuttingDown = true;
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.emit('shutdown');
  }

  /**
   * Clear deduplication cache
   */
  clearDeduplicationCache() {
    const size = this.deduplicationKeys.size;
    this.deduplicationKeys.clear();
    this.emit('deduplicationCacheCleared', { clearedEntries: size });
    return size;
  }

  /**
   * Force clear backpressure state
   */
  clearBackpressure() {
    this.emit('backpressureCleared');
  }
}

/**
 * Create a distributed queue system with queue and distributor
 */
function createDistributedQueueSystem(options = {}) {
  const { ParallelTaskQueue } = require('./parallel-task-queue');
  
  const queue = new ParallelTaskQueue(options.queue || {});
  const distributor = new MessageDistributor({
    ...options.distributor,
    queue
  });
  
  return {
    queue,
    distributor,
    // Convenience methods
    enqueue: (data, options) => distributor.distribute(data, options),
    enqueueBatch: (data, options) => distributor.distributeBatch(data, options),
    getStatus: () => ({
      queue: queue.getStatus(),
      distributor: distributor.getStatus()
    }),
    pause: () => {
      queue.pause();
      distributor.pause();
    },
    resume: () => {
      queue.resume();
      distributor.resume();
    },
    shutdown: async () => {
      await queue.shutdown();
      await distributor.shutdown();
    }
  };
}

module.exports = {
  MessageDistributor,
  createDistributedQueueSystem
};