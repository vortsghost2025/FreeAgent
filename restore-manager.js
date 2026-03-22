/**
 * Restore Manager - Track 5
 * Orchestrates swarm restoration from IndexedDB snapshots
 * Rebuilds agents, tasks, gossip state, and peer connections
 * 
 * For WE. For resurrection. 💙
 */

class RestoreManager {
  constructor(persistence, snapshot) {
    this.persistence = persistence;    // AgentPersistence instance
    this.snapshot = snapshot;          // SwarmSnapshot instance
    
    // Components (injected)
    this.webrtcManager = null;
    this.swarmCoordinator = null;
    this.metaAgent = null;
    this.gossipState = null;
    this.taskQueue = null;
    this.selfHealing = null;
    
    // Restore state
    this.isRestoring = false;
    this.restoreProgress = {
      stage: 'idle',
      agentsRestored: 0,
      tasksRestored: 0,
      peersReconnecting: 0,
      errors: []
    };
    
    // Metrics
    this.metrics = {
      restoreAttempts: 0,
      successfulRestores: 0,
      failedRestores: 0,
      totalAgentsRestored: 0,
      totalTasksRestored: 0,
      averageRestoreTime: 0
    };
    
    // Event handlers
    this.onRestoreComplete = null;
    this.onRestoreError = null;
  }

  /**
   * Register swarm components for restoration
   */
  registerComponents(components) {
    this.webrtcManager = components.webrtcManager;
    this.swarmCoordinator = components.swarmCoordinator;
    this.metaAgent = components.metaAgent;
    this.gossipState = components.gossipState;
    this.taskQueue = components.taskQueue;
    this.selfHealing = components.selfHealing;
    
    // Register components with snapshot manager
    this.snapshot.registerComponents(components);
    
    console.log('✅ Restore manager initialized with components');
  }

  /**
   * Check if saved state exists
   */
  async hasSavedState() {
    try {
      const snapshotExists = await this.snapshot.loadLatestSnapshot();
      return snapshotExists !== null;
    } catch (error) {
      console.error('❌ Failed to check for saved state:', error);
      return false;
    }
  }

  /**
   * Restore entire swarm from latest snapshot
   */
  async restoreSwarm() {
    if (this.isRestoring) {
      console.warn('⚠️ Restore already in progress');
      return false;
    }

    this.isRestoring = true;
    this.metrics.restoreAttempts++;
    this.restoreProgress.errors = [];
    
    const startTime = Date.now();
    
    try {
      console.log('🔄 Starting swarm restoration...');
      
      // Stage 1: Load snapshot
      this.restoreProgress.stage = 'loading-snapshot';
      const snapshotData = await this.snapshot.loadLatestSnapshot();
      
      if (!snapshotData) {
        console.log('⚠️ No saved state found. Starting fresh swarm.');
        this.isRestoring = false;
        return false;
      }
      
      console.log(`📦 Loaded snapshot from ${new Date(snapshotData.timestamp).toLocaleString()}`);
      console.log(`   Version: ${snapshotData.version}`);
      console.log(`   Agents: ${snapshotData.agents.length}`);
      console.log(`   Tasks: ${snapshotData.tasks.length}`);
      console.log(`   Peers: ${snapshotData.peers.length}`);
      
      // Stage 2: Restore meta-agent parameters
      this.restoreProgress.stage = 'restoring-parameters';
      if (snapshotData.parameters && this.metaAgent) {
        this.metaAgent.parameters = { ...this.metaAgent.parameters, ...snapshotData.parameters };
        console.log('✅ Meta-agent parameters restored');
      }
      
      // Stage 3: Restore gossip state
      this.restoreProgress.stage = 'restoring-gossip-state';
      if (snapshotData.gossipState && this.gossipState) {
        await this.restoreGossipState(snapshotData.gossipState);
      }
      
      // Stage 4: Restore agents
      this.restoreProgress.stage = 'restoring-agents';
      if (snapshotData.agents.length > 0) {
        await this.restoreAgents(snapshotData.agents);
      }
      
      // Stage 5: Restore tasks
      this.restoreProgress.stage = 'restoring-tasks';
      if (snapshotData.tasks.length > 0) {
        await this.restoreTasks(snapshotData.tasks);
      }
      
      // Stage 6: Reconnect to known peers
      this.restoreProgress.stage = 'reconnecting-peers';
      if (snapshotData.peers.length > 0) {
        await this.reconnectPeers(snapshotData.peers);
      }
      
      // Stage 7: Start gossip to reconcile with mesh
      this.restoreProgress.stage = 'reconciling';
      if (this.gossipState && this.webrtcManager) {
        const connectedPeers = Array.from(this.webrtcManager.peers.keys());
        if (connectedPeers.length > 0) {
          this.gossipState.startGossiping(connectedPeers);
          console.log('✅ Gossip reconciliation started');
        }
      }
      
      // Stage 8: Resume autonomous mode if it was active
      if (snapshotData.metrics?.metaAgent?.autonomous && this.metaAgent) {
        this.metaAgent.startAutonomous();
        console.log('✅ Autonomous mode resumed');
      }
      
      // Complete
      const restoreTime = Date.now() - startTime;
      this.restoreProgress.stage = 'complete';
      this.metrics.successfulRestores++;
      this.metrics.averageRestoreTime = 
        (this.metrics.averageRestoreTime * (this.metrics.successfulRestores - 1) + restoreTime) 
        / this.metrics.successfulRestores;
      
      console.log(`🎉 Swarm restored successfully in ${restoreTime}ms`);
      console.log(`   Agents: ${this.restoreProgress.agentsRestored}`);
      console.log(`   Tasks: ${this.restoreProgress.tasksRestored}`);
      console.log(`   Peers reconnecting: ${this.restoreProgress.peersReconnecting}`);
      
      if (this.onRestoreComplete) {
        this.onRestoreComplete(this.restoreProgress);
      }
      
      this.isRestoring = false;
      return true;
      
    } catch (error) {
      this.restoreProgress.stage = 'failed';
      this.restoreProgress.errors.push(error.message);
      this.metrics.failedRestores++;
      
      console.error('❌ Swarm restoration failed:', error);
      
      if (this.onRestoreError) {
        this.onRestoreError(error);
      }
      
      this.isRestoring = false;
      return false;
    }
  }

  /**
   * Restore gossip state from snapshot
   */
  async restoreGossipState(gossipStateData) {
    try {
      // Restore state map
      this.gossipState.state = new Map(gossipStateData.state);
      
      // Restore vector clock
      this.gossipState.vectorClock = new Map(gossipStateData.vectorClock);
      
      // Restore merge conflicts count
      if (gossipStateData.mergeConflicts !== undefined) {
        this.gossipState.mergeConflicts = gossipStateData.mergeConflicts;
      }
      
      console.log(`✅ Gossip state restored: ${this.gossipState.state.size} entries`);
      
    } catch (error) {
      console.error('❌ Failed to restore gossip state:', error);
      this.restoreProgress.errors.push(`Gossip state: ${error.message}`);
    }
  }

  /**
   * Restore agents from snapshot
   */
  async restoreAgents(agentsData) {
    try {
      for (const agentData of agentsData) {
        try {
          // Recreate agent based on type
          let agent;
          switch (agentData.type) {
            case 'coordinator':
              agent = new CoordinatorAgent(agentData.id);
              break;
            case 'worker':
              agent = new WorkerAgent(agentData.id);
              break;
            case 'observer':
              agent = new ObserverAgent(agentData.id);
              break;
            case 'router':
              agent = new RouterAgent(agentData.id);
              break;
            default:
              console.warn(`⚠️ Unknown agent type: ${agentData.type}`);
              continue;
          }
          
          // Restore agent properties
          agent.isActive = agentData.isActive;
          agent.capabilities = new Set(agentData.capabilities || []);
          agent.workload = agentData.workload || 0;
          agent.metrics = agentData.metrics || {};
          agent.lastActivity = agentData.lastActivity || Date.now();
          
          // Register with coordinator
          this.swarmCoordinator.registerAgent(agent);
          
          // Start agent if it was active
          if (agent.isActive) {
            agent.start();
          }
          
          this.restoreProgress.agentsRestored++;
          this.metrics.totalAgentsRestored++;
          
          console.log(`✅ Restored ${agent.type} agent ${agent.id}`);
          
        } catch (error) {
          console.error(`❌ Failed to restore agent ${agentData.id}:`, error);
          this.restoreProgress.errors.push(`Agent ${agentData.id}: ${error.message}`);
        }
      }
      
      console.log(`✅ Restored ${this.restoreProgress.agentsRestored} agent(s)`);
      
    } catch (error) {
      console.error('❌ Failed to restore agents:', error);
      throw error;
    }
  }

  /**
   * Restore tasks from snapshot
   */
  async restoreTasks(tasksData) {
    try {
      for (const taskData of tasksData) {
        try {
          // Recreate task
          const task = new Task(
            taskData.id,
            taskData.type,
            taskData.data,
            taskData.priority
          );
          
          // Restore task properties
          task.state = taskData.state;
          task.claimedBy = taskData.claimedBy;
          task.attempts = taskData.attempts || 0;
          task.createdAt = taskData.createdAt;
          
          // Only restore pending/claimed/running tasks
          // Skip completed/failed tasks
          if (['pending', 'claimed', 'running'].includes(task.state)) {
            // Reset claimed/running tasks to pending (agent may no longer exist)
            if (task.state !== 'pending') {
              task.state = 'pending';
              task.claimedBy = null;
              task.claimedAt = null;
            }
            
            this.taskQueue.addTask(task);
            this.restoreProgress.tasksRestored++;
            this.metrics.totalTasksRestored++;
          }
          
        } catch (error) {
          console.error(`❌ Failed to restore task ${taskData.id}:`, error);
          this.restoreProgress.errors.push(`Task ${taskData.id}: ${error.message}`);
        }
      }
      
      console.log(`✅ Restored ${this.restoreProgress.tasksRestored} pending task(s)`);
      
    } catch (error) {
      console.error('❌ Failed to restore tasks:', error);
      throw error;
    }
  }

  /**
   * Attempt to reconnect to known peers
   */
  async reconnectPeers(peersData) {
    try {
      for (const peerId of peersData) {
        try {
          // Queue reconnection (handled by self-healing system)
          if (this.selfHealing) {
            this.selfHealing.queueReconnect(peerId);
            this.restoreProgress.peersReconnecting++;
          } else {
            console.warn('⚠️ Self-healing system not available for peer reconnection');
          }
          
        } catch (error) {
          console.error(`❌ Failed to queue reconnection for peer ${peerId}:`, error);
          this.restoreProgress.errors.push(`Peer ${peerId}: ${error.message}`);
        }
      }
      
      console.log(`✅ Queued ${this.restoreProgress.peersReconnecting} peer reconnection(s)`);
      
    } catch (error) {
      console.error('❌ Failed to reconnect peers:', error);
      throw error;
    }
  }

  /**
   * Get restore progress
   */
  getProgress() {
    return {
      ...this.restoreProgress,
      isRestoring: this.isRestoring
    };
  }

  /**
   * Get restore metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Clear saved state (start fresh)
   */
  async clearSavedState() {
    try {
      await this.persistence.clearAll();
      console.log('🗑️ Saved state cleared');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear saved state:', error);
      return false;
    }
  }

  /**
   * Auto-restore on page load (call this on startup)
   */
  async autoRestore() {
    const hasSaved = await this.hasSavedState();
    
    if (hasSaved) {
      console.log('🔄 Saved state detected, attempting auto-restore...');
      return await this.restoreSwarm();
    } else {
      console.log('✨ No saved state, starting fresh swarm');
      return false;
    }
  }

  /**
   * Export restore status (for debugging)
   */
  exportStatus() {
    return {
      isRestoring: this.isRestoring,
      progress: this.restoreProgress,
      metrics: this.metrics,
      persistence: this.persistence.getMetrics(),
      snapshot: this.snapshot.getMetrics()
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RestoreManager;
}
