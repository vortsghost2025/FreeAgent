/**
 * Scheduler Service - Background task scheduling
 * Enables scheduled and delayed task execution
 */
const EventEmitter = require('events');

class SchedulerService extends EventEmitter {
  constructor(options = {}) {
    super();
    this.name = 'scheduler';
    this.enabled = false;
    this.tasks = new Map();
    this.intervals = new Map();
    this.timeouts = new Map();
    this.maxTasks = options.maxTasks || 100;
  }

  // Schedule a one-time delayed task
  async scheduleDelay(taskId, delayMs, callback, data = {}) {
    if (this.tasks.size >= this.maxTasks) {
      return { success: false, error: 'Max tasks limit reached' };
    }

    const timeoutId = setTimeout(async () => {
      try {
        const result = await callback(data);
        this.tasks.delete(taskId);
        this.timeouts.delete(taskId);
        this.emit('task:complete', { taskId, result });
        return { success: true, taskId, result };
      } catch (err) {
        this.emit('task:error', { taskId, error: err.message });
        return { success: false, taskId, error: err.message };
      }
    }, delayMs);

    this.tasks.set(taskId, { type: 'delay', scheduled: Date.now() + delayMs, callback });
    this.timeouts.set(taskId, timeoutId);
    
    return { success: true, taskId, scheduledFor: Date.now() + delayMs };
  }

  // Schedule a recurring interval task
  async scheduleInterval(taskId, intervalMs, callback, data = {}) {
    if (this.tasks.size >= this.maxTasks) {
      return { success: false, error: 'Max tasks limit reached' };
    }

    const intervalId = setInterval(async () => {
      try {
        const result = await callback(data);
        this.emit('task:interval', { taskId, result });
      } catch (err) {
        this.emit('task:error', { taskId, error: err.message });
      }
    }, intervalMs);

    this.tasks.set(taskId, { type: 'interval', interval: intervalMs, callback, data });
    this.intervals.set(taskId, intervalId);
    
    return { success: true, taskId, interval: intervalMs };
  }

  // Schedule a task at specific time (cron-like)
  async scheduleAt(taskId, timestamp, callback, data = {}) {
    const delayMs = timestamp - Date.now();
    if (delayMs <= 0) {
      return { success: false, error: 'Timestamp must be in the future' };
    }
    return this.scheduleDelay(taskId, delayMs, callback, data);
  }

  // Cancel a scheduled task
  async cancel(taskId) {
    if (this.timeouts.has(taskId)) {
      clearTimeout(this.timeouts.get(taskId));
      this.timeouts.delete(taskId);
    }
    if (this.intervals.has(taskId)) {
      clearInterval(this.intervals.get(taskId));
      this.intervals.delete(taskId);
    }
    this.tasks.delete(taskId);
    return { success: true, taskId };
  }

  // Get all scheduled tasks
  async listTasks() {
    const tasks = [];
    for (const [id, task] of this.tasks) {
      tasks.push({ id, ...task });
    }
    return { success: true, count: tasks.length, tasks };
  }

  // Clear all tasks
  async clearAll() {
    for (const timeoutId of this.timeouts.values()) {
      clearTimeout(timeoutId);
    }
    for (const intervalId of this.intervals.values()) {
      clearInterval(intervalId);
    }
    this.tasks.clear();
    this.timeouts.clear();
    this.intervals.clear();
    return { success: true };
  }
}

// Factory function
function createScheduler(options) {
  return new SchedulerService(options);
}

module.exports = { SchedulerService, createScheduler };
