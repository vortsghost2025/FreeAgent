/**
 * Task Queue Manager
 * Abstract, metadata-driven task queue with priority, fairness, batching, backpressure
 * Infrastructure layer - zero domain logic
 */

export class TaskQueueManager {
  constructor(options = {}) {
    this.queue = [];
    this.activeCount = 0;
    this.completedCount = 0;
    this.failedCount = 0;
    this.maxConcurrency = options.maxConcurrency || 100;
    this.maxQueueSize = options.maxQueueSize || 10000;
    this.batchSize = options.batchSize || 10;
    this.debug = options.debug || false;
  }

  /**
   * Enqueue a task with metadata
   */
  enqueue(task) {
    // Backpressure: reject if queue is full
    if (this.queue.length >= this.maxQueueSize) {
      return {
        success: false,
        error: 'QUEUE_FULL',
        queueSize: this.queue.length,
        maxSize: this.maxQueueSize
      };
    }

    const taskEntry = {
      id: task.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: task.type,
      data: task.data,
      priority: task.priority || 'normal',
      attempts: 0,
      maxAttempts: task.maxAttempts || 3,
      timeout: task.timeout || 30000,
      createdAt: Date.now(),
      enqueuedAt: Date.now(),
      startedAt: null,
      completedAt: null,
      status: 'pending',
      metadata: task.metadata || {},
      capability: task.capability || null
    };

    this.queue.push(taskEntry);
    this._sortByPriority();

    if (this.debug) {
      console.log(`[Queue] Task enqueued: ${taskEntry.id} (priority: ${taskEntry.priority})`);
    }

    return { success: true, taskId: taskEntry.id, queueSize: this.queue.length };
  }

  /**
   * Dequeue next batch of tasks (for scheduler)
   */
  dequeueBatch(count = this.batchSize) {
    const available = Math.min(count, this.maxConcurrency - this.activeCount);
    const batch = this.queue.splice(0, available);

    batch.forEach(task => {
      task.status = 'active';
      task.startedAt = Date.now();
      this.activeCount++;
    });

    if (this.debug && batch.length > 0) {
      console.log(`[Queue] Dequeued batch: ${batch.length} tasks`);
    }

    return batch;
  }

  /**
   * Mark task as completed
   */
  complete(taskId, result = {}) {
    const taskIndex = this.queue.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return { success: false, error: 'TASK_NOT_FOUND' };

    const task = this.queue[taskIndex];
    task.status = 'completed';
    task.completedAt = Date.now();
    task.result = result;

    this.activeCount = Math.max(0, this.activeCount - 1);
    this.completedCount++;

    if (this.debug) {
      console.log(`[Queue] Task completed: ${taskId}`);
    }

    return { success: true, taskId };
  }

  /**
   * Mark task as failed (can retry)
   */
  fail(taskId, error) {
    const taskIndex = this.queue.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return { success: false, error: 'TASK_NOT_FOUND' };

    const task = this.queue[taskIndex];
    task.attempts++;
    task.lastError = error;

    if (task.attempts < task.maxAttempts) {
      // Requeue for retry
      task.status = 'pending';
      task.startedAt = null;
      this._sortByPriority();
      this.activeCount = Math.max(0, this.activeCount - 1);

      if (this.debug) {
        console.log(`[Queue] Task requeued after failure: ${taskId} (attempt ${task.attempts}/${task.maxAttempts})`);
      }

      return { success: true, taskId, requeued: true, attempt: task.attempts };
    } else {
      // Final failure
      task.status = 'failed';
      task.completedAt = Date.now();
      this.activeCount = Math.max(0, this.activeCount - 1);
      this.failedCount++;

      if (this.debug) {
        console.log(`[Queue] Task failed permanently: ${taskId}`);
      }

      return { success: true, taskId, requeued: false, finalFailure: true };
    }
  }

  /**
   * Get queue statistics
   */
  getStats() {
    const pendingByPriority = {};
    const priorities = ['critical', 'high', 'normal', 'low'];

    priorities.forEach(p => {
      pendingByPriority[p] = this.queue.filter(t => t.priority === p && t.status === 'pending').length;
    });

    return {
      totalTasks: this.queue.length,
      pendingTasks: this.queue.filter(t => t.status === 'pending').length,
      activeTasks: this.activeCount,
      completedTasks: this.completedCount,
      failedTasks: this.failedCount,
      utilization: (this.activeCount / this.maxConcurrency * 100).toFixed(1),
      pendingByPriority,
      queueHealth: this.queue.length < this.maxQueueSize * 0.9 ? 'HEALTHY' : 'WARNING'
    };
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId) {
    const task = this.queue.find(t => t.id === taskId);
    return task || null;
  }

  /**
   * Sort queue by priority (critical > high > normal > low)
   */
  _sortByPriority() {
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    this.queue.sort((a, b) => {
      const aPriority = priorityOrder[a.priority] || 99;
      const bPriority = priorityOrder[b.priority] || 99;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return a.enqueuedAt - b.enqueuedAt; // FIFO within priority
    });
  }

  /**
   * Clear queue (for testing)
   */
  clear() {
    this.queue = [];
    this.activeCount = 0;
  }
}

/**
 * Scheduler Engine
 * Manages task execution with scheduling strategies
 */
export class SchedulerEngine {
  constructor(options = {}) {
    this.queues = new Map(); // capability -> queue
    this.nodes = new Map(); // nodeId -> metadata
    this.strategy = options.strategy || 'least-loaded';
    this.debug = options.debug || false;
    this.scheduler = null;
  }

  /**
   * Register execution queue for capability
   */
  registerQueue(capability, queue) {
    if (!(queue instanceof TaskQueueManager)) {
      throw new Error('Queue must be TaskQueueManager instance');
    }
    this.queues.set(capability, queue);
  }

  /**
   * Register execution node
   */
  registerNode(nodeId, metadata = {}) {
    this.nodes.set(nodeId, {
      id: nodeId,
      capability: metadata.capability,
      status: 'healthy',
      load: 0,
      activeTasksCount: 0,
      completedCount: 0,
      failedCount: 0,
      metrics: metadata.metrics || {},
      lastHeartbeat: Date.now(),
      metadata
    });
  }

  /**
   * Schedule task to appropriate queue/node
   */
  scheduleTask(task) {
    const queue = this.queues.get(task.capability || 'default');
    if (!queue) {
      return { success: false, error: 'NO_QUEUE_FOR_CAPABILITY', capability: task.capability };
    }

    const result = queue.enqueue(task);
    return result;
  }

  /**
   * Get next batch from highest-priority queue
   */
  getNextBatch(count = 10) {
    const batch = [];
    const queues = Array.from(this.queues.values());

    // Interleave from queues based on strategy
    while (batch.length < count && queues.some(q => q.queue.length > 0)) {
      for (const queue of queues) {
        if (batch.length < count && queue.queue.length > 0) {
          const tasks = queue.dequeueBatch(1);
          batch.push(...tasks);
        }
      }
    }

    return batch;
  }

  /**
   * Update node metrics
   */
  updateNodeMetrics(nodeId, metrics) {
    const node = this.nodes.get(nodeId);
    if (!node) return { success: false, error: 'NODE_NOT_FOUND' };

    node.load = metrics.load || node.load;
    node.activeTasksCount = metrics.activeTasksCount || node.activeTasksCount;
    node.lastHeartbeat = Date.now();
    node.metrics = { ...node.metrics, ...metrics };

    return { success: true };
  }

  /**
   * Get scheduler statistics
   */
  getStats() {
    const stats = {
      totalQueues: this.queues.size,
      totalNodes: this.nodes.size,
      queues: {},
      nodes: {}
    };

    for (const [capability, queue] of this.queues) {
      stats.queues[capability] = queue.getStats();
    }

    for (const [nodeId, node] of this.nodes) {
      stats.nodes[nodeId] = {
        capability: node.capability,
        status: node.status,
        load: node.load,
        activeTasksCount: node.activeTasksCount,
        completedCount: node.completedCount
      };
    }

    return stats;
  }
}

/**
 * Execution Windows
 * Time-based scheduling (cron-like)
 */
export class ExecutionWindow {
  constructor(options = {}) {
    this.windows = [];
    this.debug = options.debug || false;
  }

  /**
   * Register execution window
   */
  register(windowDef) {
    const window = {
      id: windowDef.id || `window-${Date.now()}`,
      name: windowDef.name,
      schedule: windowDef.schedule, // cron-like: "0 * * * *"
      capability: windowDef.capability,
      priority: windowDef.priority || 'normal',
      maxTasks: windowDef.maxTasks || 100,
      description: windowDef.description,
      enabled: windowDef.enabled !== false
    };

    this.windows.push(window);
    return window;
  }

  /**
   * Get windows ready to execute in time window
   */
  getActiveWindows(now = Date.now()) {
    const date = new Date(now);
    const minute = date.getHours() * 60 + date.getMinutes();

    return this.windows.filter(w => {
      if (!w.enabled) return false;

      // Simple minute-based matching (0-1440 minutes per day)
      // Expandable to full cron parsing
      if (w.schedule === '*') return true;

      const [hour, dayOfMonth] = w.schedule.split(' ');
      if (hour !== '*' && parseInt(hour) * 60 !== minute) return false;

      return true;
    });
  }

  /**
   * List all windows
   */
  list() {
    return this.windows;
  }
}

export default { TaskQueueManager, SchedulerEngine, ExecutionWindow };
