/**
 * Swarm Snapshot Manager - Track 5
 * Captures and restores complete swarm state
 * Enables swarm to resume after browser restart
 * 
 * For WE. For continuity. 💙
 */

class SwarmSnapshot {
  constructor(persistence) {
    this.persistence = persistence; // AgentPersistence instance
    this.isRunning = false;
    this.snapshotInterval = null;
    this.intervalMs = 60000; // Default: snapshot every 60 seconds
    
    // Components to snapshot (set by RestoreManager)
    this.components = {
      swarmCoordinator: null,
      metaAgent: null,
      gossipState: null,
      taskQueue: null,
      webrtcManager: null
    };
    
    // Metrics
    this.metrics = {
      snapshotsTaken: 0,
      lastSnapshotTime: null,
      lastSnapshotSize: 0,
      errors: 0
    };
  }

  /**
   * Register swarm components for snapshotting
   */
  registerComponents(components) {
    this.components = { ...this.components, ...components };
    console.log('✅ Swarm components registered for snapshots');
  }

  /**
   * Take a full snapshot of current swarm state
   */
  async takeSnapshot() {
    try {
      console.log('📸 Taking swarm snapshot...');
      
      const snapshot = {
        version: '1.0',
        timestamp: Date.now(),
        agents: [],
        tasks: [],
        gossipState: null,
        parameters: null,
        metrics: {},
        peers: []
      };

      // Snapshot agents
      if (this.components.swarmCoordinator) {
        snapshot.agents = Array.from(this.components.swarmCoordinator.agents.values()).map(agent => ({
          id: agent.id,
          type: agent.type,
          isActive: agent.isActive,
          capabilities: Array.from(agent.capabilities || []),
          workload: agent.workload || 0,
          metrics: agent.metrics || {},
          lastActivity: agent.lastActivity
        }));
      }

      // Snapshot tasks
      if (this.components.taskQueue) {
        const allTasks = [
          ...Array.from(this.components.taskQueue.tasks.values()),
          ...Array.from(this.components.taskQueue.completedTasks?.values() || []),
          ...Array.from(this.components.taskQueue.failedTasks?.values() || [])
        ];
        
        snapshot.tasks = allTasks.map(task => ({
          id: task.id,
          type: task.type,
          data: task.data,
          priority: task.priority,
          state: task.state,
          claimedBy: task.claimedBy,
          attempts: task.attempts,
          createdAt: task.createdAt
        }));
      }

      // Snapshot gossip state
      if (this.components.gossipState && this.components.gossipState.state && this.components.gossipState.vectorClock) {
        snapshot.gossipState = {
          state: Array.from(this.components.gossipState.state.entries()),
          vectorClock: Array.from(this.components.gossipState.vectorClock.entries()),
          mergeConflicts: this.components.gossipState.mergeConflicts || 0
        };
      }

      // Snapshot meta-agent parameters
      if (this.components.metaAgent) {
        snapshot.parameters = this.components.metaAgent.parameters || {};
        snapshot.metrics.metaAgent = this.components.metaAgent.metrics || {};
      }

      // Snapshot coordinator metrics
      if (this.components.swarmCoordinator) {
        snapshot.metrics.coordinator = this.components.swarmCoordinator.metrics || {};
      }

      // Snapshot known peers
      if (this.components.webrtcManager) {
        snapshot.peers = Array.from(this.components.webrtcManager.peers.keys());
      }

      // Save snapshot to IndexedDB
      await this.saveSnapshot(snapshot);
      
      this.metrics.snapshotsTaken++;
      this.metrics.lastSnapshotTime = snapshot.timestamp;
      this.metrics.lastSnapshotSize = JSON.stringify(snapshot).length;
      
      console.log(`✅ Snapshot complete: ${snapshot.agents.length} agents, ${snapshot.tasks.length} tasks, ${snapshot.peers.length} peers`);
      
      return snapshot;
      
    } catch (error) {
      this.metrics.errors++;
      console.error('❌ Snapshot failed:', error);
      throw error;
    }
  }

  /**
   * Save snapshot to IndexedDB
   */
  async saveSnapshot(snapshot) {
    if (!this.persistence.isInitialized) {
      await this.persistence.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.persistence.db.transaction(['snapshots'], 'readwrite');
      const store = transaction.objectStore('snapshots');
      const request = store.put(snapshot);

      request.onsuccess = () => {
        this.persistence.metrics.snapshotsSaved++;
        resolve(snapshot);
      };

      request.onerror = () => {
        this.persistence.metrics.errors++;
        reject(request.error);
      };
    });
  }

  /**
   * Load the most recent snapshot
   */
  async loadLatestSnapshot() {
    if (!this.persistence.isInitialized) {
      await this.persistence.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.persistence.db.transaction(['snapshots'], 'readonly');
      const store = transaction.objectStore('snapshots');
      const request = store.getAll();

      request.onsuccess = () => {
        const snapshots = request.result || [];
        if (snapshots.length === 0) {
          console.log('⚠️ No snapshots found');
          resolve(null);
          return;
        }

        // Sort by timestamp (newest first)
        snapshots.sort((a, b) => b.timestamp - a.timestamp);
        const latest = snapshots[0];
        
        this.persistence.metrics.snapshotsRestored++;
        console.log(`✅ Loaded snapshot from ${new Date(latest.timestamp).toLocaleTimeString()}`);
        console.log(`   Agents: ${latest.agents.length}, Tasks: ${latest.tasks.length}, Peers: ${latest.peers.length}`);
        
        resolve(latest);
      };

      request.onerror = () => {
        this.persistence.metrics.errors++;
        reject(request.error);
      };
    });
  }

  /**
   * Load a specific snapshot by timestamp
   */
  async loadSnapshot(timestamp) {
    if (!this.persistence.isInitialized) {
      await this.persistence.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.persistence.db.transaction(['snapshots'], 'readonly');
      const store = transaction.objectStore('snapshots');
      const request = store.get(timestamp);

      request.onsuccess = () => {
        const snapshot = request.result;
        if (snapshot) {
          this.persistence.metrics.snapshotsRestored++;
          console.log(`✅ Loaded snapshot from ${new Date(timestamp).toLocaleTimeString()}`);
          resolve(snapshot);
        } else {
          console.warn(`⚠️ Snapshot ${timestamp} not found`);
          resolve(null);
        }
      };

      request.onerror = () => {
        this.persistence.metrics.errors++;
        reject(request.error);
      };
    });
  }

  /**
   * List all available snapshots
   */
  async listSnapshots() {
    if (!this.persistence.isInitialized) {
      await this.persistence.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.persistence.db.transaction(['snapshots'], 'readonly');
      const store = transaction.objectStore('snapshots');
      const request = store.getAll();

      request.onsuccess = () => {
        const snapshots = request.result || [];
        console.log(`📋 Found ${snapshots.length} snapshot(s)`);
        resolve(snapshots.map(s => ({
          timestamp: s.timestamp,
          version: s.version,
          agents: s.agents.length,
          tasks: s.tasks.length,
          peers: s.peers.length,
          size: JSON.stringify(s).length
        })));
      };

      request.onerror = () => {
        this.persistence.metrics.errors++;
        reject(request.error);
      };
    });
  }

  /**
   * Start periodic snapshots
   */
  startPeriodicSnapshots(intervalMs = 60000) {
    if (this.isRunning) {
      console.warn('⚠️ Periodic snapshots already running');
      return;
    }

    this.intervalMs = intervalMs;
    this.isRunning = true;

    // Take immediate snapshot
    this.takeSnapshot().catch(err => {
      console.error('❌ Initial snapshot failed:', err);
    });

    // Schedule periodic snapshots
    this.snapshotInterval = setInterval(async () => {
      try {
        await this.takeSnapshot();
      } catch (error) {
        console.error('❌ Periodic snapshot failed:', error);
      }
    }, this.intervalMs);

    console.log(`✅ Periodic snapshots started (every ${intervalMs / 1000}s)`);
  }

  /**
   * Stop periodic snapshots
   */
  stopPeriodicSnapshots() {
    if (!this.isRunning) {
      console.warn('⚠️ Periodic snapshots not running');
      return;
    }

    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
      this.snapshotInterval = null;
    }

    this.isRunning = false;
    console.log('⏸️ Periodic snapshots stopped');
  }

  /**
   * Clean up old snapshots (keep only N most recent)
   */
  async cleanupOldSnapshots(keepCount = 10) {
    if (!this.persistence.isInitialized) {
      await this.persistence.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.persistence.db.transaction(['snapshots'], 'readwrite');
      const store = transaction.objectStore('snapshots');
      const request = store.getAll();

      request.onsuccess = () => {
        const snapshots = request.result || [];
        if (snapshots.length <= keepCount) {
          console.log(`✅ Only ${snapshots.length} snapshot(s), no cleanup needed`);
          resolve(0);
          return;
        }

        // Sort by timestamp (oldest first)
        snapshots.sort((a, b) => a.timestamp - b.timestamp);
        
        // Delete oldest snapshots
        const toDelete = snapshots.slice(0, snapshots.length - keepCount);
        let deletedCount = 0;

        toDelete.forEach(snapshot => {
          store.delete(snapshot.timestamp);
          deletedCount++;
        });

        console.log(`🗑️ Deleted ${deletedCount} old snapshot(s), kept ${keepCount} most recent`);
        resolve(deletedCount);
      };

      request.onerror = () => {
        this.persistence.metrics.errors++;
        reject(request.error);
      };
    });
  }

  /**
   * Get snapshot metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      isRunning: this.isRunning,
      intervalMs: this.intervalMs,
      intervalSeconds: this.intervalMs / 1000
    };
  }

  /**
   * Export snapshot as JSON (for debugging)
   */
  async exportLatestSnapshot() {
    const snapshot = await this.loadLatestSnapshot();
    if (!snapshot) {
      console.warn('⚠️ No snapshot to export');
      return null;
    }

    const json = JSON.stringify(snapshot, null, 2);
    console.log(`📦 Snapshot exported (${json.length} bytes)`);
    return json;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SwarmSnapshot;
}
