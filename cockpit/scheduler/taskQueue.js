/**
 * Task Queue - Priority Queue for Multi-Agent Scheduler
 * 
 * A priority-based task queue that supports:
 * - Priority levels (high, normal, low)
 * - FIFO ordering within same priority
 * - Task metadata and tracking
 * 
 * @module cockpit/scheduler/taskQueue
 */

class TaskQueue {
  constructor(options = {}) {
    // Priority levels with numeric weights (higher = more important)
    this.priorityLevels = {
      high: 3,
      normal: 2,
      low: 1
    };
    
    // Internal storage - separate arrays per priority level
    this.queues = {
      high: [],
      normal: [],
      low: []
    };
    
    // Track all tasks for lookup
    this.taskMap = new Map();
    
    // Task ID counter
    this.taskIdCounter = 0;
    
    // Configuration
    this.maxSize = options.maxSize || 1000;
    
    // Logger
    this.logger = options.logger || console;
  }

  /**
   * Generate unique task ID
   * @private
   * @returns {string} - Unique task ID
   */
  _generateTaskId() {
    return `task_${Date.now()}_${++this.taskIdCounter}`;
  }

  /**
   * Validate priority level
   * @private
   * @param {string} priority - Priority level
   * @returns {string} - Validated priority
   */
  _validatePriority(priority) {
    const validPriorities = Object.keys(this.priorityLevels);
    if (!validPriorities.includes(priority)) {
      this.logger.warn(`[TaskQueue] Invalid priority "${priority}", defaulting to "normal"`);
      return 'normal';
    }
    return priority;
  }

  /**
   * Add a task to the queue
   * @param {object} task - Task object with required properties
   * @param {string} task.input - Task input/content
   * @param {string} [task.agent] - Agent to use
   * @param {string} [task.sessionId] - Session ID
   * @param {string} [task.priority='normal'] - Priority level ('high', 'normal', 'low')
   * @param {object} [task.metadata] - Additional metadata
   * @returns {object} - Task with assigned ID
   */
  enqueue(task) {
    if (this.size() >= this.maxSize) {
      this.logger.warn(`[TaskQueue] Queue full (max: ${this.maxSize}), rejecting task`);
      return null;
    }

    const priority = this._validatePriority(task.priority || 'normal');
    const taskId = task.id || this._generateTaskId();
    
    const queueTask = {
      id: taskId,
      input: task.input,
      agent: task.agent || null,
      sessionId: task.sessionId || null,
      priority,
      priorityWeight: this.priorityLevels[priority],
      metadata: task.metadata || {},
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      status: 'pending'
    };

    // Add to appropriate priority queue (FIFO within priority)
    this.queues[priority].push(queueTask);
    this.taskMap.set(taskId, queueTask);
    
    this.logger.log(`[TaskQueue] Enqueued task ${taskId} with priority "${priority}"`);
    
    return queueTask;
  }

  /**
   * Remove and return the highest priority task
   * @returns {object|null} - Task object or null if queue is empty
   */
  dequeue() {
    // Find highest priority non-empty queue
    for (const priority of ['high', 'normal', 'low']) {
      if (this.queues[priority].length > 0) {
        const task = this.queues[priority].shift();
        task.status = 'processing';
        task.startedAt = Date.now();
        this.logger.log(`[TaskQueue] Dequeued task ${task.id} (priority: ${priority})`);
        return task;
      }
    }
    
    return null;
  }

  /**
   * Peek at the next task without removing it
   * @returns {object|null} - Task object or null if queue is empty
   */
  peek() {
    // Find highest priority non-empty queue
    for (const priority of ['high', 'normal', 'low']) {
      if (this.queues[priority].length > 0) {
        return this.queues[priority][0];
      }
    }
    
    return null;
  }

  /**
   * Get total number of tasks in queue
   * @returns {number} - Total task count
   */
  size() {
    return this.queues.high.length + this.queues.normal.length + this.queues.low.length;
  }

  /**
   * Check if queue is empty
   * @returns {boolean} - True if empty
   */
  isEmpty() {
    return this.size() === 0;
  }

  /**
   * Clear all tasks from queue
   * @returns {number} - Number of tasks cleared
   */
  clear() {
    const count = this.size();
    this.queues = { high: [], normal: [], low: [] };
    this.taskMap.clear();
    this.logger.log(`[TaskQueue] Cleared ${count} tasks`);
    return count;
  }

  /**
   * Get task by ID
   * @param {string} taskId - Task ID
   * @returns {object|null} - Task or null if not found
   */
  getTask(taskId) {
    return this.taskMap.get(taskId) || null;
  }

  /**
   * Update task status
   * @param {string} taskId - Task ID
   * @param {string} status - New status
   * @param {object} [result] - Optional result data
   * @returns {boolean} - Success
   */
  updateTaskStatus(taskId, status, result = null) {
    const task = this.taskMap.get(taskId);
    if (!task) {
      this.logger.warn(`[TaskQueue] Task ${taskId} not found`);
      return false;
    }

    task.status = status;
    if (status === 'completed' || status === 'failed') {
      task.completedAt = Date.now();
    }
    if (result) {
      task.result = result;
    }
    
    return true;
  }

  /**
   * Get all tasks (optionally filtered by status)
   * @param {string} [status] - Optional status filter
   * @returns {Array} - Array of tasks
   */
  getAllTasks(status = null) {
    const allTasks = Array.from(this.taskMap.values());
    
    if (status) {
      return allTasks.filter(t => t.status === status);
    }
    
    return allTasks;
  }

  /**
   * Get queue breakdown by priority
   * @returns {object} - Queue statistics
   */
  getQueueStats() {
    return {
      high: this.queues.high.length,
      normal: this.queues.normal.length,
      low: this.queues.low.length,
      total: this.size(),
      processing: this.getAllTasks('processing').length,
      pending: this.getAllTasks('pending').length,
      completed: this.getAllTasks('completed').length,
      failed: this.getAllTasks('failed').length
    };
  }

  /**
   * Remove a specific task from queue
   * @param {string} taskId - Task ID
   * @returns {boolean} - Success
   */
  removeTask(taskId) {
    const task = this.taskMap.get(taskId);
    if (!task) return false;

    // Only remove pending tasks
    if (task.status !== 'pending') {
      this.logger.warn(`[TaskQueue] Cannot remove task ${taskId} with status "${task.status}"`);
      return false;
    }

    // Remove from priority queue
    const queue = this.queues[task.priority];
    const index = queue.findIndex(t => t.id === taskId);
    if (index > -1) {
      queue.splice(index, 1);
    }

    this.taskMap.delete(taskId);
    this.logger.log(`[TaskQueue] Removed task ${taskId}`);
    
    return true;
  }

  /**
   * Get waiting time estimate for a priority level
   * @param {string} priority - Priority level
   * @param {number} avgTaskDuration - Average task duration in ms
   * @returns {number} - Estimated wait time in ms
   */
  getEstimatedWaitTime(priority, avgTaskDuration = 5000) {
    const validatedPriority = this._validatePriority(priority);
    
    // Count tasks in higher priority queues
    let tasksAhead = 0;
    if (validatedPriority === 'high') {
      tasksAhead = this.queues.high.filter(t => t.status === 'pending').length - 1;
    } else if (validatedPriority === 'normal') {
      tasksAhead = this.queues.high.length + this.queues.normal.filter(t => t.status === 'pending').length - 1;
    } else {
      tasksAhead = this.queues.high.length + this.queues.normal.length + this.queues.low.filter(t => t.status === 'pending').length - 1;
    }
    
    return tasksAhead * avgTaskDuration;
  }
}

module.exports = TaskQueue;

/**
 * Create a new TaskQueue instance
 * @param {object} options - Configuration options
 * @returns {TaskQueue}
 */
function createTaskQueue(options) {
  return new TaskQueue(options);
}

module.exports.createTaskQueue = createTaskQueue;
