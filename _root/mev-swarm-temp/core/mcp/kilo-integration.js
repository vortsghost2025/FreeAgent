/**
 * MEV Swarm - Kilo Integration (Chamber 7)
 * Persistent storage and state management
 *
 * Capabilities:
 * - Persistent task storage across sessions
 * - State management with versioning
 * - Task history and analytics
 * - Configuration persistence
 */

import { TASK_STATUS } from './orchestration-engine.js';

// Storage keys
export const STORAGE_KEYS = {
  TASKS: 'mev_swarm_tasks',
  EXECUTIONS: 'mev_swarm_executions',
  OPPORTUNITIES: 'mev_swarm_opportunities',
  CONFIG: 'mev_swarm_config',
  STATE: 'mev_swarm_state',
  ANALYTICS: 'mev_swarm_analytics'
};

/**
 * Kilo Storage Interface
 * This is a mock implementation - real implementation would use actual Kilo MCP server
 */
export class KiloStorage {
  constructor(config = {}) {
    this.storagePrefix = config.storagePrefix || 'mev_swarm';
    this.inMemoryStore = new Map();
    this.persistenceEnabled = config.persistenceEnabled !== false;
    this.version = '1.0.0';
  }

  /**
   * Set item
   */
  async set(key, value) {
    const fullKey = `${this.storagePrefix}:${key}`;
    const item = {
      value,
      version: this.version,
      timestamp: Date.now()
    };

    if (this.persistenceEnabled) {
      // In real implementation, this would store to Kilo
      this.inMemoryStore.set(fullKey, JSON.stringify(item));
    } else {
      this.inMemoryStore.set(fullKey, item);
    }

    return true;
  }

  /**
   * Get item
   */
  async get(key) {
    const fullKey = `${this.storagePrefix}:${key}`;
    const item = this.inMemoryStore.get(fullKey);

    if (!item) {
      return null;
    }

    if (this.persistenceEnabled) {
      return JSON.parse(item).value;
    }

    return item.value;
  }

  /**
   * Delete item
   */
  async delete(key) {
    const fullKey = `${this.storagePrefix}:${key}`;
    return this.inMemoryStore.delete(fullKey);
  }

  /**
   * Check if key exists
   */
  async has(key) {
    const fullKey = `${this.storagePrefix}:${key}`;
    return this.inMemoryStore.has(fullKey);
  }

  /**
   * Get all keys with prefix
   */
  async keys(prefix = '') {
    const allKeys = Array.from(this.inMemoryStore.keys());
    return allKeys
      .filter(key => key.startsWith(`${this.storagePrefix}:${prefix}`))
      .map(key => key.replace(`${this.storagePrefix}:`, ''));
  }

  /**
   * Clear all storage
   */
  async clear() {
    this.inMemoryStore.clear();
    return true;
  }

  /**
   * Get storage statistics
   */
  getStatistics() {
    return {
      totalKeys: this.inMemoryStore.size,
      prefix: this.storagePrefix,
      version: this.version,
      persistenceEnabled: this.persistenceEnabled
    };
  }
}

/**
 * MEV State Manager
 * Manages state across sessions with versioning
 */
export class MEVStateManager {
  constructor(config = {}) {
    this.storage = config.storage || new KiloStorage(config);
    this.currentState = {};
    this.stateHistory = [];
    this.maxHistorySize = config.maxHistorySize || 100;
  }

  /**
   * Initialize state
   */
  async initialize() {
    const savedState = await this.storage.get(STORAGE_KEYS.STATE);

    if (savedState) {
      this.currentState = savedState;
    } else {
      this.currentState = {
        version: '1.0.0',
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        statistics: {
          totalTasks: 0,
          totalExecutions: 0,
          totalProfit: '0',
          totalGas: '0'
        }
      };

      await this.saveState();
    }
  }

  /**
   * Get current state
   */
  async getState() {
    return this.currentState;
  }

  /**
   * Update state
   */
  async updateState(updates) {
    // Save to history before updating
    this.saveToHistory();

    // Apply updates
    Object.assign(this.currentState, updates, {
      lastUpdated: Date.now()
    });

    await this.saveState();
    return this.currentState;
  }

  /**
   * Save state
   */
  async saveState() {
    await this.storage.set(STORAGE_KEYS.STATE, this.currentState);
  }

  /**
   * Save to history
   */
  saveToHistory() {
    this.stateHistory.push({
      ...this.currentState,
      snapshotAt: Date.now()
    });

    // Trim history if too large
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory = this.stateHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get state history
   */
  async getHistory(limit = 10) {
    return this.stateHistory.slice(-limit);
  }

  /**
   * Get state at specific time
   */
  getStateAtTime(timestamp) {
    return this.stateHistory.find(state => state.lastUpdated <= timestamp);
  }

  /**
   * Rollback to previous state
   */
  async rollback(steps = 1) {
    if (this.stateHistory.length >= steps) {
      const previousState = this.stateHistory[this.stateHistory.length - steps];

      if (previousState) {
        this.currentState = {
          ...previousState,
          lastUpdated: Date.now()
        };

        await this.saveState();
        return this.currentState;
      }
    }

    throw new Error('Cannot rollback: not enough history');
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return this.currentState.statistics || {};
  }

  /**
   * Update statistics
   */
  async updateStatistics(updates) {
    const currentStats = this.currentState.statistics || {};

    const newStatistics = {
      ...currentStats,
      ...updates
    };

    return await this.updateState({ statistics: newStatistics });
  }
}

/**
 * Persistent Task Store
 * Manages task persistence across sessions
 */
export class PersistentTaskStore {
  constructor(config = {}) {
    this.storage = config.storage || new KiloStorage(config);
    this.tasks = new Map();
    this.taskIndex = new Map(); // Secondary indexes
  }

  /**
   * Initialize task store
   */
  async initialize() {
    const savedTasks = await this.storage.get(STORAGE_KEYS.TASKS);

    if (savedTasks) {
      for (const task of savedTasks) {
        this.tasks.set(task.id, task);
        this.updateIndexes(task);
      }
    }
  }

  /**
   * Add task
   */
  async addTask(task) {
    const taskWithMetadata = {
      ...task,
      createdAt: task.createdAt || Date.now(),
      updatedAt: Date.now(),
      version: '1.0.0'
    };

    this.tasks.set(task.id, taskWithMetadata);
    this.updateIndexes(taskWithMetadata);

    await this.saveTasks();
    return taskWithMetadata;
  }

  /**
   * Get task
   */
  async getTask(taskId) {
    return this.tasks.get(taskId);
  }

  /**
   * Get tasks
   */
  async getTasks(filters = {}) {
    let tasks = Array.from(this.tasks.values());

    // Apply filters
    if (filters.status) {
      tasks = tasks.filter(t => t.status === filters.status);
    }

    if (filters.type) {
      tasks = tasks.filter(t => t.type === filters.type);
    }

    if (filters.minPriority) {
      tasks = tasks.filter(t => t.priority >= filters.minPriority);
    }

    if (filters.limit) {
      tasks = tasks.slice(0, filters.limit);
    }

    if (filters.sortBy) {
      tasks = this.sortTasks(tasks, filters.sortBy, filters.sortOrder || 'desc');
    }

    return tasks;
  }

  /**
   * Update task
   */
  async updateTask(taskId, updates) {
    const task = this.tasks.get(taskId);

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const updatedTask = {
      ...task,
      ...updates,
      updatedAt: Date.now()
    };

    this.tasks.set(taskId, updatedTask);
    this.updateIndexes(updatedTask);

    await this.saveTasks();
    return updatedTask;
  }

  /**
   * Delete task
   */
  async deleteTask(taskId) {
    const task = this.tasks.get(taskId);

    if (!task) {
      return false;
    }

    this.tasks.delete(taskId);
    this.removeFromIndexes(task);

    await this.saveTasks();
    return true;
  }

  /**
   * Update indexes
   */
  updateIndexes(task) {
    // Status index
    if (!this.taskIndex.has(`status:${task.status}`)) {
      this.taskIndex.set(`status:${task.status}`, new Set());
    }
    this.taskIndex.get(`status:${task.status}`).add(task.id);

    // Type index
    if (!this.taskIndex.has(`type:${task.type}`)) {
      this.taskIndex.set(`type:${task.type}`, new Set());
    }
    this.taskIndex.get(`type:${task.type}`).add(task.id);

    // Priority index
    if (!this.taskIndex.has(`priority:${task.priority}`)) {
      this.taskIndex.set(`priority:${task.priority}`, new Set());
    }
    this.taskIndex.get(`priority:${task.priority}`).add(task.id);
  }

  /**
   * Remove from indexes
   */
  removeFromIndexes(task) {
    const statusIndex = this.taskIndex.get(`status:${task.status}`);
    if (statusIndex) {
      statusIndex.delete(task.id);
    }

    const typeIndex = this.taskIndex.get(`type:${task.type}`);
    if (typeIndex) {
      typeIndex.delete(task.id);
    }

    const priorityIndex = this.taskIndex.get(`priority:${task.priority}`);
    if (priorityIndex) {
      priorityIndex.delete(task.id);
    }
  }

  /**
   * Sort tasks
   */
  sortTasks(tasks, sortBy, sortOrder) {
    return tasks.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'priority':
          comparison = b.priority - a.priority;
          break;
        case 'createdAt':
          comparison = b.createdAt - a.createdAt;
          break;
        case 'updatedAt':
          comparison = b.updatedAt - a.updatedAt;
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? -comparison : comparison;
    });
  }

  /**
   * Save tasks
   */
  async saveTasks() {
    const tasksArray = Array.from(this.tasks.values());
    await this.storage.set(STORAGE_KEYS.TASKS, tasksArray);
  }

  /**
   * Get statistics
   */
  async getStatistics() {
    const tasks = Array.from(this.tasks.values());

    return {
      totalTasks: tasks.length,
      byStatus: {
        pending: tasks.filter(t => t.status === TASK_STATUS.PENDING).length,
        active: tasks.filter(t => t.status === TASK_STATUS.ACTIVE).length,
        completed: tasks.filter(t => t.status === TASK_STATUS.COMPLETED).length,
        failed: tasks.filter(t => t.status === TASK_STATUS.FAILED).length
      },
      byType: this.groupBy(tasks, 'type'),
      byPriority: this.groupBy(tasks, 'priority'),
      lastUpdated: Math.max(...tasks.map(t => t.updatedAt))
    };
  }

  /**
   * Group by property
   */
  groupBy(items, property) {
    return items.reduce((acc, item) => {
      const key = item[property];
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Clear all tasks
   */
  async clear() {
    this.tasks.clear();
    this.taskIndex.clear();
    await this.storage.delete(STORAGE_KEYS.TASKS);
  }
}

export default KiloStorage;
