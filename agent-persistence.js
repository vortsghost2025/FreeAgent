/**
 * Agent Persistence Layer - Track 5
 * Saves and restores agent state to/from IndexedDB
 * Enables agents to survive browser refresh, crashes, and restarts
 * 
 * For WE. For immortal agents. 💙
 */

class AgentPersistence {
  constructor(dbName = 'we4free-swarm') {
    this.dbName = dbName;
    this.db = null;
    this.isInitialized = false;
    
    // Store names
    this.stores = {
      agents: 'agents',           // Agent state
      tasks: 'tasks',             // Task queue state
      metrics: 'metrics',         // Performance metrics
      snapshots: 'snapshots'      // Full swarm snapshots
    };
    
    // Metrics
    this.metrics = {
      agentsSaved: 0,
      agentsRestored: 0,
      tasksSaved: 0,
      tasksRestored: 0,
      snapshotsSaved: 0,
      snapshotsRestored: 0,
      errors: 0
    };
  }

  /**
   * Initialize IndexedDB connection
   */
  async initialize() {
    if (this.isInitialized) return true;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        console.error('❌ Failed to open IndexedDB:', request.error);
        this.metrics.errors++;
        reject(request.error);
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        this.isInitialized = true;
        console.log('✅ Agent persistence initialized');
        resolve(true);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create agents object store
        if (!db.objectStoreNames.contains(this.stores.agents)) {
          const agentStore = db.createObjectStore(this.stores.agents, { keyPath: 'id' });
          agentStore.createIndex('type', 'type', { unique: false });
          agentStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Create tasks object store
        if (!db.objectStoreNames.contains(this.stores.tasks)) {
          const taskStore = db.createObjectStore(this.stores.tasks, { keyPath: 'id' });
          taskStore.createIndex('state', 'state', { unique: false });
          taskStore.createIndex('priority', 'priority', { unique: false });
        }

        // Create metrics object store
        if (!db.objectStoreNames.contains(this.stores.metrics)) {
          db.createObjectStore(this.stores.metrics, { keyPath: 'id' });
        }

        // Create snapshots object store
        if (!db.objectStoreNames.contains(this.stores.snapshots)) {
          const snapshotStore = db.createObjectStore(this.stores.snapshots, { keyPath: 'timestamp' });
          snapshotStore.createIndex('version', 'version', { unique: false });
        }

        console.log('✅ IndexedDB schema created');
      };
    });
  }

  /**
   * Save agent state to IndexedDB
   */
  async saveAgent(agent) {
    if (!this.isInitialized) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.stores.agents], 'readwrite');
      const store = transaction.objectStore(this.stores.agents);

      const agentData = {
        id: agent.id,
        type: agent.type,
        isActive: agent.isActive,
        capabilities: Array.from(agent.capabilities || []),
        workload: agent.workload || 0,
        metrics: agent.metrics || {},
        lastActivity: agent.lastActivity || Date.now(),
        timestamp: Date.now()
      };

      // Include agent-specific state
      if (typeof agent.getState === 'function') {
        agentData.state = agent.getState();
      }

      const request = store.put(agentData);

      request.onsuccess = () => {
        this.metrics.agentsSaved++;
        console.log(`✅ Saved agent ${agent.id} (${agent.type})`);
        resolve(agentData);
      };

      request.onerror = () => {
        this.metrics.errors++;
        console.error(`❌ Failed to save agent ${agent.id}:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Restore agent from IndexedDB
   */
  async restoreAgent(agentId) {
    if (!this.isInitialized) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.stores.agents], 'readonly');
      const store = transaction.objectStore(this.stores.agents);
      const request = store.get(agentId);

      request.onsuccess = () => {
        const agentData = request.result;
        if (agentData) {
          this.metrics.agentsRestored++;
          console.log(`✅ Restored agent ${agentId} (${agentData.type})`);
          resolve(agentData);
        } else {
          console.warn(`⚠️ Agent ${agentId} not found in storage`);
          resolve(null);
        }
      };

      request.onerror = () => {
        this.metrics.errors++;
        console.error(`❌ Failed to restore agent ${agentId}:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * List all saved agents
   */
  async listAgents() {
    if (!this.isInitialized) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.stores.agents], 'readonly');
      const store = transaction.objectStore(this.stores.agents);
      const request = store.getAll();

      request.onsuccess = () => {
        const agents = request.result || [];
        console.log(`📋 Found ${agents.length} saved agent(s)`);
        resolve(agents);
      };

      request.onerror = () => {
        this.metrics.errors++;
        console.error('❌ Failed to list agents:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete agent from storage
   */
  async deleteAgent(agentId) {
    if (!this.isInitialized) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.stores.agents], 'readwrite');
      const store = transaction.objectStore(this.stores.agents);
      const request = store.delete(agentId);

      request.onsuccess = () => {
        console.log(`🗑️ Deleted agent ${agentId}`);
        resolve(true);
      };

      request.onerror = () => {
        this.metrics.errors++;
        console.error(`❌ Failed to delete agent ${agentId}:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Save task to IndexedDB
   */
  async saveTask(task) {
    if (!this.isInitialized) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.stores.tasks], 'readwrite');
      const store = transaction.objectStore(this.stores.tasks);

      const taskData = {
        id: task.id,
        type: task.type,
        data: task.data,
        priority: task.priority || 0,
        state: task.state || 'pending',
        claimedBy: task.claimedBy || null,
        claimedAt: task.claimedAt || null,
        attempts: task.attempts || 0,
        maxAttempts: task.maxAttempts || 3,
        timeout: task.timeout || 30000,
        createdAt: task.createdAt || Date.now(),
        timestamp: Date.now()
      };

      const request = store.put(taskData);

      request.onsuccess = () => {
        this.metrics.tasksSaved++;
        resolve(taskData);
      };

      request.onerror = () => {
        this.metrics.errors++;
        console.error(`❌ Failed to save task ${task.id}:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Restore all tasks from IndexedDB
   */
  async restoreTasks() {
    if (!this.isInitialized) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.stores.tasks], 'readonly');
      const store = transaction.objectStore(this.stores.tasks);
      const request = store.getAll();

      request.onsuccess = () => {
        const tasks = request.result || [];
        this.metrics.tasksRestored += tasks.length;
        console.log(`✅ Restored ${tasks.length} task(s)`);
        resolve(tasks);
      };

      request.onerror = () => {
        this.metrics.errors++;
        console.error('❌ Failed to restore tasks:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Clear completed/failed tasks (cleanup)
   */
  async clearCompletedTasks() {
    if (!this.isInitialized) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.stores.tasks], 'readwrite');
      const store = transaction.objectStore(this.stores.tasks);
      const index = store.index('state');

      let deletedCount = 0;

      // Delete completed tasks
      let request = index.openCursor(IDBKeyRange.only('completed'));
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        }
      };

      // Delete failed tasks
      request = index.openCursor(IDBKeyRange.only('failed'));
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        }
      };

      transaction.oncomplete = () => {
        console.log(`🗑️ Cleared ${deletedCount} completed/failed task(s)`);
        resolve(deletedCount);
      };

      transaction.onerror = () => {
        this.metrics.errors++;
        reject(transaction.error);
      };
    });
  }

  /**
   * Save metrics to IndexedDB
   */
  async saveMetrics(metricsId, metricsData) {
    if (!this.isInitialized) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.stores.metrics], 'readwrite');
      const store = transaction.objectStore(this.stores.metrics);

      const data = {
        id: metricsId,
        metrics: metricsData,
        timestamp: Date.now()
      };

      const request = store.put(data);

      request.onsuccess = () => {
        resolve(data);
      };

      request.onerror = () => {
        this.metrics.errors++;
        reject(request.error);
      };
    });
  }

  /**
   * Restore metrics from IndexedDB
   */
  async restoreMetrics(metricsId) {
    if (!this.isInitialized) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.stores.metrics], 'readonly');
      const store = transaction.objectStore(this.stores.metrics);
      const request = store.get(metricsId);

      request.onsuccess = () => {
        const data = request.result;
        resolve(data ? data.metrics : null);
      };

      request.onerror = () => {
        this.metrics.errors++;
        reject(request.error);
      };
    });
  }

  /**
   * Get persistence metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      isInitialized: this.isInitialized,
      dbName: this.dbName
    };
  }

  /**
   * Clear all stored data (nuclear option)
   */
  async clearAll() {
    if (!this.isInitialized) await this.initialize();

    const stores = Object.values(this.stores);
    const transaction = this.db.transaction(stores, 'readwrite');

    const promises = stores.map(storeName => {
      return new Promise((resolve, reject) => {
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    try {
      await Promise.all(promises);
      console.log('🗑️ Cleared all persistence data');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear data:', error);
      this.metrics.errors++;
      throw error;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AgentPersistence;
}
