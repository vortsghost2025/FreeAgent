/**
 * WE4Free Swarm Coordinator
 * 
 * Orchestrates distributed agent swarm with:
 * - Load balancing across agents
 * - Throughput monitoring
 * - Work rebalancing
 * - Performance metrics
 * - Swarm optimization
 * 
 * This is Track 4: Distributed Agent Swarm Layer
 */

// LOAD BALANCING STRATEGY
const LoadBalancingStrategy = {
  ROUND_ROBIN: 'round_robin',
  LEAST_LOADED: 'least_loaded',
  RANDOM: 'random',
  PRIORITY: 'priority'
};

// SWARM COORDINATOR
class SwarmCoordinator {
  constructor(coordinatorId) {
    this.coordinatorId = coordinatorId;
    this.agents = new Map(); // agentId -> Agent instance
    this.registry = null; // SwarmRegistry instance
    this.taskQueue = null; // TaskQueue instance
    this.gossipState = null; // GossipState instance
    this.healthMonitor = null; // SelfHealingMonitor instance
    this.loadBalancingStrategy = LoadBalancingStrategy.LEAST_LOADED;
    this.roundRobinIndex = 0;
    this.metrics = {
      tasksAssigned: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      workRebalances: 0,
      throughput: 0, // tasks/second
      avgLatency: 0, // milliseconds
      swarmEfficiency: 0 // 0-1
    };
    this.metricsHistory = [];
    this.metricsInterval = null;
    
    console.log(`🎯 Swarm Coordinator initialized: ${this.coordinatorId}`);
  }

  /**
   * Initialize coordinator with dependencies
   */
  initialize(options = {}) {
    // Create registry if not provided
    this.registry = options.registry || (window.SwarmRegistry ? new window.SwarmRegistry() : null);
    
    this.taskQueue = options.taskQueue;
    this.gossipState = options.gossipState;
    this.healthMonitor = options.healthMonitor;
    
    // Pass registry to health monitor if both exist
    if (this.healthMonitor && this.registry) {
      this.healthMonitor.registry = this.registry;
      this.healthMonitor._setupRegistryListeners?.();
    }
    
    if (this.taskQueue) {
      this._setupTaskQueueListeners();
    }
    
    if (this.healthMonitor) {
      this._setupHealthMonitorListeners();
    }
    
    // Start metrics collection
    this.startMetricsCollection(options.metricsInterval || 5000);
    
    console.log('✅ Swarm Coordinator initialized with dependencies');
  }

  /**
   * Register an agent with the coordinator
   */
  registerAgent(agent) {
    this.agents.set(agent.id, agent);
    
    // Register with registry if available
    if (this.registry) {
      this.registry.registerAgent(agent.id, agent.role);
    }
    
    // Listen for agent events
    agent.on('task:completed', (data) => {
      this.metrics.tasksCompleted++;
      this._updateThroughput();
      
      // Touch agent in registry
      if (this.registry) {
        this.registry.touchAgent(agent.id);
      }
    });
    
    agent.on('task:failed', (data) => {
      this.metrics.tasksFailed++;
    });
    
    agent.on('workload:changed', (data) => {
      this._checkLoadBalance();
    });
    
    console.log(`➕ Agent ${agent.id} registered (role: ${agent.role})`);
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId) {
    this.agents.delete(agentId);
    
    // Unregister from registry if available
    if (this.registry) {
      this.registry.unregisterAgent(agentId);
    }
    
    console.log(`➖ Agent ${agentId} unregistered`);
  }

  /**
   * Assign task to agent (load balanced)
   */
  assignTask(task, agentId = null) {
    let targetAgent;
    
    if (agentId) {
      targetAgent = this.agents.get(agentId);
    } else {
      targetAgent = this._selectAgent();
    }
    
    if (!targetAgent) {
      console.error('No available agents for task assignment');
      return false;
    }
    
    // Check if agent can perform tasks
    if (!targetAgent.hasCapability(window.AgentCapability?.PERFORM_TASKS)) {
      console.error(`Agent ${targetAgent.id} cannot perform tasks`);
      return false;
    }
    
    try {
      targetAgent.assignTask(targetAgent.id, task);
      targetAgent.updateWorkload(targetAgent.workload + 10);
      this.metrics.tasksAssigned++;
      
      console.log(`📌 Task ${task.id} assigned to ${targetAgent.id} (workload: ${targetAgent.workload}%)`);
      return true;
    } catch (error) {
      console.error(`Failed to assign task to ${targetAgent.id}:`, error);
      return false;
    }
  }

  /**
   * Select agent based on load balancing strategy
   */
  _selectAgent() {
    // Get all agents with task capability
    let workers = Array.from(this.agents.values())
      .filter(a => a.hasCapability(window.AgentCapability?.PERFORM_TASKS))
      .filter(a => a.state !== 'degraded' && a.state !== 'shutdown');
    
    // DEFENSIVE: If no workers found, try without state filtering (maybe all marked degraded)
    if (workers.length === 0) {
      console.warn('⚠️ No non-degraded workers, trying all workers with capability...');
      workers = Array.from(this.agents.values())
        .filter(a => a.hasCapability(window.AgentCapability?.PERFORM_TASKS));
    }
    
    // Note: For local agents (same-tab), agent.state is sufficient
    // Registry filtering is only needed for distributed WebRTC agents
    
    if (workers.length === 0) {
      console.error('❌ No available agents for task assignment');
      console.error('   Total agents:', this.agents.size);
      console.error('   Agent IDs:', Array.from(this.agents.keys()));
      return null;
    }
    
    console.log(`✅ Found ${workers.length} available workers`);
    
    switch (this.loadBalancingStrategy) {
      case LoadBalancingStrategy.ROUND_ROBIN:
        this.roundRobinIndex = (this.roundRobinIndex + 1) % workers.length;
        return workers[this.roundRobinIndex];
        
      case LoadBalancingStrategy.LEAST_LOADED:
        return workers.reduce((least, agent) => 
          (least.workload < agent.workload) ? least : agent
        );
        
      case LoadBalancingStrategy.RANDOM:
        return workers[Math.floor(Math.random() * workers.length)];
        
      case LoadBalancingStrategy.PRIORITY:
        // Prioritize agents with lowest workload and highest uptime
        return workers.sort((a, b) => {
          if (a.workload !== b.workload) {
            return a.workload - b.workload;
          }
          return b.metrics.uptime - a.metrics.uptime;
        })[0];
        
      default:
        return workers[0];
    }
  }

  /**
   * Rebalance work across agents
   */
  rebalanceWork() {
    const workers = Array.from(this.agents.values())
      .filter(a => a.hasCapability(window.AgentCapability?.PERFORM_TASKS));
    
    if (workers.length < 2) {
      return; // Nothing to rebalance
    }
    
    // Calculate average workload
    const avgWorkload = workers.reduce((sum, a) => sum + a.workload, 0) / workers.length;
    
    // Find overloaded and underloaded agents
    const overloaded = workers.filter(a => a.workload > avgWorkload + 20);
    const underloaded = workers.filter(a => a.workload < avgWorkload - 20);
    
    if (overloaded.length === 0 || underloaded.length === 0) {
      return; // Balanced enough
    }
    
    console.log(`⚖️ Rebalancing work: ${overloaded.length} overloaded, ${underloaded.length} underloaded`);
    
    // Redistribute work
    overloaded.forEach(agent => {
      const excessLoad = agent.workload - avgWorkload;
      agent.updateWorkload(agent.workload - excessLoad / 2);
    });
    
    underloaded.forEach(agent => {
      const deficit = avgWorkload - agent.workload;
      agent.updateWorkload(agent.workload + deficit / 2);
    });
    
    this.metrics.workRebalances++;
    console.log(`✅ Work rebalanced (avg load: ${avgWorkload.toFixed(1)}%)`);
  }

  /**
   * Check if load balancing is needed
   */
  _checkLoadBalance() {
    const workers = Array.from(this.agents.values())
      .filter(a => a.hasCapability(window.AgentCapability?.PERFORM_TASKS));
    
    if (workers.length < 2) {
      return;
    }
    
    const workloads = workers.map(a => a.workload);
    const max = Math.max(...workloads);
    const min = Math.min(...workloads);
    
    // Trigger rebalance if difference is too large
    if (max - min > 30) {
      this.rebalanceWork();
    }
  }

  /**
   * Get swarm metrics
   */
  getSwarmMetrics() {
    const agents = Array.from(this.agents.values());
    const workers = agents.filter(a => a.hasCapability(window.AgentCapability?.PERFORM_TASKS));
    
    const totalWorkload = workers.reduce((sum, a) => sum + a.workload, 0);
    const avgWorkload = workers.length > 0 ? totalWorkload / workers.length : 0;
    
    const totalTasks = workers.reduce((sum, a) => 
      sum + a.metrics.tasksCompleted + a.metrics.tasksInProgress, 0
    );
    
    const totalUptime = agents.reduce((sum, a) => 
      sum + (Date.now() - a.metrics.uptime), 0
    );
    
    const avgUptime = agents.length > 0 ? totalUptime / agents.length : 0;
    
    // Calculate swarm efficiency (tasks completed per agent per second)
    const efficiency = workers.length > 0 
      ? this.metrics.tasksCompleted / (workers.length * (avgUptime / 1000))
      : 0;
    
    return {
      coordinatorId: this.coordinatorId,
      totalAgents: agents.length,
      workers: workers.length,
      coordinators: agents.filter(a => a.role === 'coordinator').length,
      observers: agents.filter(a => a.role === 'observer').length,
      routers: agents.filter(a => a.role === 'router').length,
      avgWorkload: avgWorkload,
      totalTasks: totalTasks,
      avgUptime: avgUptime,
      efficiency: efficiency,
      ...this.metrics
    };
  }

  /**
   * Update throughput metric
   */
  _updateThroughput() {
    if (this.metricsHistory.length < 2) {
      return;
    }
    
    const recent = this.metricsHistory.slice(-2);
    const timeDiff = (recent[1].timestamp - recent[0].timestamp) / 1000; // seconds
    const tasksDiff = recent[1].tasksCompleted - recent[0].tasksCompleted;
    
    this.metrics.throughput = tasksDiff / timeDiff;
  }

  /**
   * Start metrics collection
   */
  startMetricsCollection(intervalMs = 5000) {
    if (this.metricsInterval) {
      console.warn('Metrics collection already running');
      return;
    }
    
    this.metricsInterval = setInterval(() => {
      const snapshot = {
        timestamp: Date.now(),
        tasksCompleted: this.metrics.tasksCompleted,
        tasksFailed: this.metrics.tasksFailed,
        throughput: this.metrics.throughput
      };
      
      this.metricsHistory.push(snapshot);
      
      // Keep last 100 snapshots
      if (this.metricsHistory.length > 100) {
        this.metricsHistory.shift();
      }
      
      this._updateThroughput();
    }, intervalMs);
    
    console.log(`📊 Metrics collection started (interval: ${intervalMs}ms)`);
  }

  /**
   * Stop metrics collection
   */
  stopMetricsCollection() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
      console.log('🛑 Metrics collection stopped');
    }
  }

  /**
   * Setup task queue listeners
   */
  _setupTaskQueueListeners() {
    this.taskQueue.on('task:added', (data) => {
      // Auto-assign new tasks
      const task = data.task;
      this.assignTask(task);
    });
    
    this.taskQueue.on('task:failed', (data) => {
      // Try to reassign failed tasks
      const task = this.taskQueue.tasks.get(data.taskId);
      if (task && task.canRetry()) {
        console.log(`🔄 Reassigning failed task ${data.taskId}`);
        this.assignTask(task);
      }
    });
  }

  /**
   * Setup health monitor listeners
   */
  _setupHealthMonitorListeners() {
    this.healthMonitor.on('peer:degraded', (data) => {
      console.warn(`⚠️ Peer ${data.peerId} degraded, rebalancing work`);
      this.rebalanceWork();
    });
    
    this.healthMonitor.on('peer:failed', (data) => {
      console.error(`❌ Peer ${data.peerId} failed, rebalancing work`);
      this.rebalanceWork();
    });
    
    this.healthMonitor.on('peer:recovered', (data) => {
      console.log(`✅ Peer ${data.peerId} recovered`);
    });
  }

  /**
   * Set load balancing strategy
   */
  setLoadBalancingStrategy(strategy) {
    if (!Object.values(LoadBalancingStrategy).includes(strategy)) {
      console.error(`Invalid load balancing strategy: ${strategy}`);
      return false;
    }
    
    this.loadBalancingStrategy = strategy;
    console.log(`⚖️ Load balancing strategy: ${strategy}`);
    return true;
  }

  /**
   * Get agent status summary
   */
  getAgentStatus() {
    const agents = Array.from(this.agents.values());
    
    return agents.map(agent => ({
      id: agent.id,
      role: agent.role,
      state: agent.state,
      workload: agent.workload,
      tasksCompleted: agent.metrics.tasksCompleted,
      tasksInProgress: agent.metrics.tasksInProgress,
      tasksFailed: agent.metrics.tasksFailed,
      uptime: Date.now() - agent.metrics.uptime,
      peers: agent.peers.size
    }));
  }

  /**
   * Optimize swarm
   */
  optimize() {
    console.log('🔧 Optimizing swarm...');
    
    // Rebalance work
    this.rebalanceWork();
    
    // Check for idle agents
    const idle = Array.from(this.agents.values())
      .filter(a => a.state === 'idle' && a.workload < 10);
    
    if (idle.length > 0) {
      console.log(`💤 Found ${idle.length} idle agents`);
      
      // Assign pending tasks to idle agents
      if (this.taskQueue) {
        const pending = this.taskQueue.getTasksByStatus(window.TaskStatus?.PENDING);
        pending.forEach(task => {
          this.assignTask(task);
        });
      }
    }
    
    console.log('✅ Swarm optimization complete');
  }

  /**
   * Shutdown coordinator
   */
  shutdown() {
    this.stopMetricsCollection();
    this.agents.clear();
    this.metricsHistory = [];
    
    console.log('🛑 Swarm Coordinator shutdown');
  }
}

// Export for Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LoadBalancingStrategy,
    SwarmCoordinator
  };
}

// Browser global
if (typeof window !== 'undefined') {
  window.LoadBalancingStrategy = LoadBalancingStrategy;
  window.SwarmCoordinator = SwarmCoordinator;
}

console.log('✅ Swarm Coordinator loaded');
