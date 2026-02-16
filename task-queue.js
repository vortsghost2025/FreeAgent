/**
 * WE4Free Distributed Task Queue
 * 
 * Enables swarm-based work distribution with:
 * - Task broadcasting to mesh
 * - Agent claiming mechanism
 * - Automatic retry on failure
 * - Work stealing for load balancing
 * - Progress tracking
 * 
 * This is Track 4: Distributed Agent Swarm Layer
 */

// TASK STATUS
const TaskStatus = {
  PENDING: 'pending',
  CLAIMED: 'claimed',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  TIMEOUT: 'timeout'
};

// TASK PRIORITY
const TaskPriority = {
  LOW: 1,
  NORMAL: 5,
  HIGH: 10,
  CRITICAL: 20
};

// TASK
class Task {
  constructor(id, type, payload, options = {}) {
    this.id = id;
    this.type = type;
    this.payload = payload;
    this.status = TaskStatus.PENDING;
    this.priority = options.priority || TaskPriority.NORMAL;
    this.timeout = options.timeout || 30000; // 30s default
    this.maxRetries = options.maxRetries || 3;
    this.retries = 0;
    this.createdAt = Date.now();
    this.claimedAt = null;
    this.startedAt = null;
    this.completedAt = null;
    this.claimedBy = null;
    this.result = null;
    this.error = null;
  }

  /**
   * Execute the task
   */
  async execute() {
    this.status = TaskStatus.RUNNING;
    this.startedAt = Date.now();

    try {
      // This would be overridden with actual task logic
      const result = await this._run();
      
      this.status = TaskStatus.COMPLETED;
      this.completedAt = Date.now();
      this.result = result;
      
      return result;
    } catch (error) {
      this.status = TaskStatus.FAILED;
      this.completedAt = Date.now();
      this.error = error.message;
      
      throw error;
    }
  }

  /**
   * Override this with actual task logic
   */
  async _run() {
    throw new Error('Task._run() must be overridden');
  }

  /**
   * Check if task has timed out
   */
  hasTimedOut() {
    if (this.startedAt && this.timeout > 0) {
      return Date.now() - this.startedAt > this.timeout;
    }
    return false;
  }

  /**
   * Can retry?
   */
  canRetry() {
    return this.retries < this.maxRetries;
  }

  /**
   * Mark for retry
   */
  retry() {
    if (!this.canRetry()) {
      throw new Error(`Task ${this.id} exceeded max retries`);
    }
    
    this.retries++;
    this.status = TaskStatus.PENDING;
    this.claimedAt = null;
    this.startedAt = null;
    this.claimedBy = null;
    this.error = null;
  }

  /**
   * Clone task (for distribution)
   */
  clone() {
    const task = new Task(this.id, this.type, this.payload, {
      priority: this.priority,
      timeout: this.timeout,
      maxRetries: this.maxRetries
    });
    task.retries = this.retries;
    return task;
  }
}

// DISTRIBUTED TASK QUEUE
class TaskQueue {
  constructor(agentId) {
    this.agentId = agentId;
    this.tasks = new Map(); // taskId -> Task
    this.claimedTasks = new Map(); // taskId -> agentId
    this.completedTasks = new Map(); // taskId -> result
    this.failedTasks = new Map(); // taskId -> error
    this.peers = new Set(); // Connected peer queues
    this.eventHandlers = new Map();
    this.metrics = {
      tasksAdded: 0,
      tasksClaimed: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      tasksTimedOut: 0,
      tasksRetried: 0
    };
    
    // Start timeout monitor
    this.timeoutInterval = setInterval(() => this._checkTimeouts(), 1000);
    
    console.log(`📋 Task Queue initialized for ${this.agentId}`);
  }

  /**
   * Add task to queue
   */
  addTask(task) {
    if (this.tasks.has(task.id)) {
      console.warn(`Task ${task.id} already exists`);
      return false;
    }

    this.tasks.set(task.id, task);
    this.metrics.tasksAdded++;
    
    this.emit('task:added', { taskId: task.id, task });
    
    // Broadcast to peers
    this._broadcastTask(task);
    
    console.log(`➕ Task ${task.id} added (priority: ${task.priority})`);
    return true;
  }

  /**
   * Claim a task
   */
  claimTask(taskId, agentId = this.agentId) {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      return { success: false, reason: 'task_not_found' };
    }
    
    if (task.status !== TaskStatus.PENDING) {
      return { success: false, reason: 'task_not_available', status: task.status };
    }

    // Claim it
    task.status = TaskStatus.CLAIMED;
    task.claimedAt = Date.now();
    task.claimedBy = agentId;
    this.claimedTasks.set(taskId, agentId);
    this.metrics.tasksClaimed++;
    
    this.emit('task:claimed', { taskId, agentId });
    
    console.log(`✋ Task ${taskId} claimed by ${agentId}`);
    return { success: true, task: typeof task.clone === 'function' ? task.clone() : Object.assign({}, task) };
  }

  /**
   * Release a claimed task back to pending (for role mismatch)
   */
  releaseTask(taskId) {
    const task = this.tasks.get(taskId);

    if (!task) {
      return false;
    }

    if (task.status !== TaskStatus.CLAIMED) {
      console.warn(`Cannot release task ${taskId}: not claimed (status: ${task.status})`);
      return false;
    }

    // Release it back to pending
    task.status = TaskStatus.PENDING;
    task.claimedBy = null;
    this.claimedTasks.delete(taskId);

    this.emit('task:released', { taskId });

    console.log(`🔓 Task ${taskId} released back to queue`);
    return true;
  }

  /**
   * Get next available task (by priority)
   */
  getNextTask() {
    const pending = Array.from(this.tasks.values())
      .filter(t => t.status === TaskStatus.PENDING)
      .sort((a, b) => b.priority - a.priority); // Higher priority first

    return pending.length > 0 ? pending[0] : null;
  }

  /**
   * Claim next available task
   */
  claimNextTask(agentId = this.agentId) {
    const task = this.getNextTask();
    if (!task) {
      return { success: false, reason: 'no_tasks_available' };
    }
    
    return this.claimTask(task.id, agentId);
  }

  /**
   * Report task completion
   */
  completeTask(taskId, result) {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      return false;
    }

    task.status = TaskStatus.COMPLETED;
    task.completedAt = Date.now();
    task.result = result;
    
    this.completedTasks.set(taskId, result);
    this.claimedTasks.delete(taskId);
    this.metrics.tasksCompleted++;
    
    this.emit('task:completed', { taskId, result });
    
    console.log(`✅ Task ${taskId} completed`);
    return true;
  }

  /**
   * Report task failure
   */
  failTask(taskId, error) {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      return false;
    }

    task.status = TaskStatus.FAILED;
    task.completedAt = Date.now();
    task.error = error;
    
    this.claimedTasks.delete(taskId);
    this.metrics.tasksFailed++;
    
    // Retry if possible
    if (task.canRetry()) {
      task.retry();
      this.metrics.tasksRetried++;
      console.log(`🔄 Task ${taskId} retry ${task.retries}/${task.maxRetries}`);
      this.emit('task:retry', { taskId, retries: task.retries });
    } else {
      // Store in failedTasks Map for polling
      this.failedTasks.set(taskId, error);
      console.error(`❌ Task ${taskId} failed permanently: ${error}`);
      this.emit('task:failed', { taskId, error });
    }
    
    return true;
  }

  /**
   * Check for timed out tasks
   */
  _checkTimeouts() {
    this.tasks.forEach((task, taskId) => {
      if (task.status === TaskStatus.RUNNING && task.hasTimedOut()) {
        task.status = TaskStatus.TIMEOUT;
        this.claimedTasks.delete(taskId);
        this.metrics.tasksTimedOut++;
        
        console.warn(`⏰ Task ${taskId} timed out`);
        this.emit('task:timeout', { taskId });
        
        // Retry if possible
        if (task.canRetry()) {
          task.retry();
          this.metrics.tasksRetried++;
          console.log(`🔄 Task ${taskId} retry ${task.retries}/${task.maxRetries} after timeout`);
          this.emit('task:retry', { taskId, retries: task.retries });
        }
      }
    });
  }

  /**
   * Broadcast task to peers
   */
  _broadcastTask(task) {
    this.peers.forEach(peer => {
      try {
        peer.receiveTask(task.clone());
      } catch (error) {
        console.error('Error broadcasting task to peer:', error);
      }
    });
  }

  /**
   * Receive task from peer
   */
  receiveTask(task) {
    if (this.tasks.has(task.id)) {
      // Already have this task
      return false;
    }

    this.tasks.set(task.id, task);
    this.emit('task:received', { taskId: task.id, task });
    
    return true;
  }

  /**
   * Connect to peer queue
   */
  connectToPeer(peerQueue) {
    this.peers.add(peerQueue);
    console.log(`🔗 Connected to peer task queue`);
  }

  /**
   * Disconnect from peer
   */
  disconnectFromPeer(peerQueue) {
    this.peers.delete(peerQueue);
    console.log(`🔌 Disconnected from peer task queue`);
  }

  /**
   * Get queue status
   */
  getStatus() {
    const tasks = Array.from(this.tasks.values());
    
    return {
      agentId: this.agentId,
      totalTasks: tasks.length,
      pending: tasks.filter(t => t.status === TaskStatus.PENDING).length,
      claimed: tasks.filter(t => t.status === TaskStatus.CLAIMED).length,
      running: tasks.filter(t => t.status === TaskStatus.RUNNING).length,
      completed: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
      failed: tasks.filter(t => t.status === TaskStatus.FAILED).length,
      timeout: tasks.filter(t => t.status === TaskStatus.TIMEOUT).length,
      connectedPeers: this.peers.size,
      metrics: { ...this.metrics }
    };
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status) {
    return Array.from(this.tasks.values())
      .filter(t => t.status === status);
  }

  /**
   * Get task result (for completed tasks)
   */
  getTaskResult(taskId) {
    const task = this.tasks.get(taskId);
    if (task && task.status === TaskStatus.COMPLETED) {
      return task.result;
    }
    return null;
  }

  /**
   * Clear completed tasks
   */
  clearCompleted() {
    let cleared = 0;
    
    this.tasks.forEach((task, taskId) => {
      if (task.status === TaskStatus.COMPLETED) {
        this.tasks.delete(taskId);
        this.completedTasks.delete(taskId);
        cleared++;
      }
    });

    if (cleared > 0) {
      console.log(`🗑️ Cleared ${cleared} completed tasks`);
    }
    
    return cleared;
  }

  /**
   * Event system
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler (${event}):`, error);
        }
      });
    }
  }

  /**
   * Shutdown
   */
  shutdown() {
    if (this.timeoutInterval) {
      clearInterval(this.timeoutInterval);
      this.timeoutInterval = null;
    }
    
    this.peers.clear();
    this.tasks.clear();
    this.claimedTasks.clear();
    this.completedTasks.clear();
    
    console.log('🛑 Task Queue shutdown');
  }
}

// Export for Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TaskStatus,
    TaskPriority,
    Task,
    TaskQueue
  };
}

// Browser global
if (typeof window !== 'undefined') {
  window.TaskStatus = TaskStatus;
  window.TaskPriority = TaskPriority;
  window.Task = Task;
  window.TaskQueue = TaskQueue;
}

console.log('✅ Distributed Task Queue loaded');
