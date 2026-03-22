/**
 * WE4Free Agent Role System
 * 
 * Defines specialized agent types for distributed swarm coordination.
 * Agents can be: Coordinator, Worker, Observer, Router
 * 
 * This is Track 4: Distributed Agent Swarm Layer
 */

// AGENT ROLE DEFINITIONS
const AgentRole = {
  COORDINATOR: 'coordinator',
  WORKER: 'worker',
  OBSERVER: 'observer',
  ROUTER: 'router'
};

// AGENT CAPABILITIES
const AgentCapability = {
  // Coordinator capabilities
  ASSIGN_TASKS: 'assign_tasks',
  MONITOR_LOAD: 'monitor_load',
  REBALANCE_WORK: 'rebalance_work',
  DETECT_IDLE: 'detect_idle',

  // Worker capabilities
  PERFORM_TASKS: 'perform_tasks',
  REPORT_RESULTS: 'report_results',
  REQUEST_WORK: 'request_work',
  CLAIM_TASKS: 'claim_tasks',

  // Observer capabilities
  MONITOR_THROUGHPUT: 'monitor_throughput',
  DETECT_ANOMALIES: 'detect_anomalies',
  TRACK_MESSAGE_ORDER: 'track_message_order',
  MEASURE_LATENCY: 'measure_latency',

  // Router capabilities
  OPTIMIZE_PATHS: 'optimize_paths',
  DETECT_SLOW_PEERS: 'detect_slow_peers',
  REROUTE_MESSAGES: 'reroute_messages',
  MAINTAIN_TOPOLOGY: 'maintain_topology'
};

// ROLE CAPABILITY MAPPING
const ROLE_CAPABILITIES = {
  [AgentRole.COORDINATOR]: [
    AgentCapability.ASSIGN_TASKS,
    AgentCapability.MONITOR_LOAD,
    AgentCapability.REBALANCE_WORK,
    AgentCapability.DETECT_IDLE
  ],
  [AgentRole.WORKER]: [
    AgentCapability.PERFORM_TASKS,
    AgentCapability.REPORT_RESULTS,
    AgentCapability.REQUEST_WORK,
    AgentCapability.CLAIM_TASKS
  ],
  [AgentRole.OBSERVER]: [
    AgentCapability.MONITOR_THROUGHPUT,
    AgentCapability.DETECT_ANOMALIES,
    AgentCapability.TRACK_MESSAGE_ORDER,
    AgentCapability.MEASURE_LATENCY
  ],
  [AgentRole.ROUTER]: [
    AgentCapability.OPTIMIZE_PATHS,
    AgentCapability.DETECT_SLOW_PEERS,
    AgentCapability.REROUTE_MESSAGES,
    AgentCapability.MAINTAIN_TOPOLOGY
  ]
};

// AGENT CLASS
class Agent {
  constructor(id, role) {
    this.id = id;
    this.role = role;
    this.capabilities = ROLE_CAPABILITIES[role] || [];
    this.state = 'idle'; // idle, working, waiting, degraded
    this.workload = 0; // 0-100
    this.metrics = {
      tasksCompleted: 0,
      tasksInProgress: 0,
      tasksFailed: 0,
      messagesProcessed: 0,
      uptime: Date.now(),
      lastActivity: Date.now()
    };
    this.peers = new Set(); // Connected peer agent IDs
    this.eventHandlers = new Map();

    console.log(`✨ Agent ${this.id} spawned as ${this.role}`);
  }

  /**
   * Check if agent has a capability
   */
  hasCapability(capability) {
    return this.capabilities.includes(capability);
  }

  /**
   * Execute a task (if capable)
   */
  async executeTask(task) {
    if (!this.hasCapability(AgentCapability.PERFORM_TASKS)) {
      throw new Error(`Agent ${this.id} cannot perform tasks (role: ${this.role})`);
    }

    this.state = 'working';
    this.metrics.tasksInProgress++;
    this.metrics.lastActivity = Date.now();

    try {
      // Execute task function - check for different task execution methods
      let result;

      if (typeof task.execute === 'function') {
        // Task class instance with execute() method (from task-queue.js)
        result = await task.execute();
      } else if (typeof task._run === 'function') {
        // Task with _run method
        result = await task._run();
      } else if (typeof task.run === 'function') {
        // Task with run method
        result = await task.run();
      } else if (typeof task.fn === 'function') {
        // Task with fn property
        result = await task.fn(task.data);
      } else if (task.type && task.data) {
        // Compute task with type (map, reduce, pipeline, etc.) - delegate to compute handler
        result = await this._executeComputeTask(task);
      } else {
        throw new Error(`Task ${task.id || 'unknown'} has no executable method (execute, _run, run, or fn)`);
      }

      this.metrics.tasksCompleted++;
      this.metrics.tasksInProgress--;
      this.state = 'idle';

      this.emit('task:completed', { taskId: task.id, result });
      return result;

    } catch (error) {
      this.metrics.tasksFailed++;
      this.metrics.tasksInProgress--;
      this.state = 'idle';

      this.emit('task:failed', { taskId: task.id, error: error.message });
      throw error;
    }
  }

  /**
   * Assign task to another agent (coordinator only)
   */
  assignTask(targetAgentId, task) {
    if (!this.hasCapability(AgentCapability.ASSIGN_TASKS)) {
      throw new Error(`Agent ${this.id} cannot assign tasks (role: ${this.role})`);
    }

    this.emit('task:assign', { from: this.id, to: targetAgentId, task });
  }

  /**
   * Monitor workload (coordinator/observer only)
   */
  getSwarmMetrics() {
    if (!this.hasCapability(AgentCapability.MONITOR_LOAD) &&
      !this.hasCapability(AgentCapability.MONITOR_THROUGHPUT)) {
      throw new Error(`Agent ${this.id} cannot monitor metrics (role: ${this.role})`);
    }

    return {
      agentId: this.id,
      role: this.role,
      state: this.state,
      workload: this.workload,
      metrics: { ...this.metrics },
      peers: Array.from(this.peers),
      uptime: Date.now() - this.metrics.uptime
    };
  }

  /**
   * Optimize routing (router only)
   */
  optimizeRoute(from, to, options = {}) {
    if (!this.hasCapability(AgentCapability.OPTIMIZE_PATHS)) {
      throw new Error(`Agent ${this.id} cannot optimize routes (role: ${this.role})`);
    }

    // Simple routing: direct connection if available, otherwise find path
    if (this.peers.has(to)) {
      return [from, to];
    }

    // Multi-hop: find shortest path through mesh
    // (In real implementation, this would use Dijkstra or similar)
    return [from, ...this.findPath(from, to), to];
  }

  /**
   * Find path through mesh (simplified)
   */
  findPath(from, to) {
    // Placeholder: Real implementation would traverse peer graph
    return [];
  }

  /**
   * Update workload
   */
  updateWorkload(load) {
    this.workload = Math.max(0, Math.min(100, load));
    this.emit('workload:changed', { agentId: this.id, workload: this.workload });
  }

  /**
   * Start task execution loop (for workers)
   */
  startTaskExecution(taskQueue) {
    if (!this.hasCapability(AgentCapability.PERFORM_TASKS)) {
      console.warn(`Agent ${this.id} cannot perform tasks (role: ${this.role})`);
      return;
    }

    this.taskQueue = taskQueue;
    this.executionActive = true;

    // Start the execution loop
    this._taskExecutionLoop();

    console.log(`🔄 Agent ${this.id} started task execution loop`);
  }

  /**
   * Stop task execution loop
   */
  stopTaskExecution() {
    this.executionActive = false;
    console.log(`⏹️ Agent ${this.id} stopped task execution loop`);
  }

  /**
   * Task execution loop - claims and executes tasks
   */
  async _taskExecutionLoop() {
    while (this.executionActive && this.state !== 'shutdown') {
      try {
        // Try to claim a task
        const pendingTasks = Array.from(this.taskQueue.tasks.values())
          .filter(t => t.status === 'pending')
          .sort((a, b) => b.priority - a.priority); // Highest priority first

        if (pendingTasks.length > 0) {
          const task = pendingTasks[0];
          const claimResult = this.taskQueue.claimTask(task.id, this.id);

          if (claimResult.success) {
            // Execute the task
            await this._executeComputeTask(claimResult.task);
          }
        }

        // Wait before next iteration
        await this._sleep(100);

      } catch (error) {
        console.error(`Agent ${this.id} execution error:`, error);
        await this._sleep(1000); // Wait longer on error
      }
    }
  }

  /**
   * Execute a compute task (map/reduce/etc)
   */
  async _executeComputeTask(task) {
    try {
      this.state = 'working';
      this.metrics.tasksInProgress++;
      this.metrics.lastActivity = Date.now();
      this.updateWorkload(this.workload + 10);

      let result = null;

      // Execute based on task type
      if (task.type === 'map' && task.data) {
        // Deserialize and execute map function
        const mapFn = new Function('return ' + task.data.mapFn)();
        result = task.data.chunk.map(mapFn);

      } else if (task.type === 'reduce' && task.data) {
        // Deserialize and execute reduce function
        const reduceFn = new Function('return ' + task.data.reduceFn)();
        result = task.data.results.reduce(reduceFn);

      } else if (task.type === 'pipeline-stage' && task.data) {
        // Execute pipeline stage
        const fn = new Function('return ' + task.data.stageFn)();
        result = task.data.item ? fn(task.data.item) : fn(task.data.input);

      } else if (task.type === 'batch-item' && task.data) {
        // Execute batch function
        const fn = new Function('return ' + task.data.processFn)();
        result = await fn(task.data.item);

      } else if (task.type === 'transform' && task.data) {
        // Execute transform function
        const fn = new Function('return ' + task.data.transformFn)();
        result = task.data.chunk ? task.data.chunk.map(fn) : fn(task.data.item);

      } else if (task._run) {
        // Test tasks with custom _run function
        result = await task._run();
      } else {
        throw new Error(`Unknown task type: ${task.type}`);
      }

      // Mark task complete
      this.taskQueue.completeTask(task.id, result);

      this.metrics.tasksCompleted++;
      this.metrics.tasksInProgress--;
      this.state = 'idle';
      this.updateWorkload(Math.max(0, this.workload - 10));

      this.emit('task:completed', { taskId: task.id, result });

    } catch (error) {
      console.error(`Agent ${this.id} failed task ${task.id}:`, error);

      this.taskQueue.failTask(task.id, error.message);

      this.metrics.tasksFailed++;
      this.metrics.tasksInProgress--;
      this.state = 'idle';
      this.updateWorkload(Math.max(0, this.workload - 10));

      this.emit('task:failed', { taskId: task.id, error: error.message });
    }
  }

  /**
   * Sleep utility
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Mark as degraded (self-healing uses this)
   */
  markDegraded(reason) {
    this.state = 'degraded';
    this.executionActive = false; // Stop task execution
    this.emit('agent:degraded', { agentId: this.id, reason });
    console.warn(`⚠️ Agent ${this.id} degraded: ${reason}`);
  }

  /**
   * Recover from degraded state
   */
  recover() {
    if (this.state === 'degraded') {
      this.state = 'idle';
      this.emit('agent:recovered', { agentId: this.id });
      console.log(`✅ Agent ${this.id} recovered`);
    }
  }

  /**
   * Connect to peer agent
   */
  connectToPeer(peerId) {
    this.peers.add(peerId);
    this.emit('peer:connected', { agentId: this.id, peerId });
  }

  /**
   * Disconnect from peer agent
   */
  disconnectFromPeer(peerId) {
    this.peers.delete(peerId);
    this.emit('peer:disconnected', { agentId: this.id, peerId });
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
   * Shutdown agent
   */
  shutdown() {
    this.state = 'shutdown';
    this.emit('agent:shutdown', { agentId: this.id });
    console.log(`🛑 Agent ${this.id} shutdown`);
  }
}

// AGENT FACTORY
class AgentFactory {
  constructor() {
    this.agents = new Map();
    this.idCounter = 0;
  }

  /**
   * Spawn a new agent
   */
  spawn(role) {
    const id = `agent-${this.idCounter++}`;
    const agent = new Agent(id, role);
    this.agents.set(id, agent);
    return agent;
  }

  /**
   * Spawn multiple agents
   */
  spawnSwarm(config) {
    const swarm = {};

    // Spawn coordinators
    for (let i = 0; i < (config.coordinators || 1); i++) {
      swarm[`coordinator-${i}`] = this.spawn(AgentRole.COORDINATOR);
    }

    // Spawn workers
    for (let i = 0; i < (config.workers || 4); i++) {
      swarm[`worker-${i}`] = this.spawn(AgentRole.WORKER);
    }

    // Spawn observers
    for (let i = 0; i < (config.observers || 1); i++) {
      swarm[`observer-${i}`] = this.spawn(AgentRole.OBSERVER);
    }

    // Spawn routers
    for (let i = 0; i < (config.routers || 1); i++) {
      swarm[`router-${i}`] = this.spawn(AgentRole.ROUTER);
    }

    console.log(`🌐 Spawned swarm: ${Object.keys(swarm).length} agents`);
    return swarm;
  }

  /**
   * Get agent by ID
   */
  getAgent(id) {
    return this.agents.get(id);
  }

  /**
   * Get all agents
   */
  getAllAgents() {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by role
   */
  getAgentsByRole(role) {
    return this.getAllAgents().filter(agent => agent.role === role);
  }

  /**
   * Shutdown all agents
   */
  shutdownAll() {
    this.agents.forEach(agent => agent.shutdown());
    this.agents.clear();
    console.log('🛑 All agents shutdown');
  }
}

// Export for Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    AgentRole,
    AgentCapability,
    Agent,
    AgentFactory
  };
}

// Browser global
if (typeof window !== 'undefined') {
  window.AgentRole = AgentRole;
  window.AgentCapability = AgentCapability;
  window.Agent = Agent;
  window.AgentFactory = AgentFactory;
}

console.log('✅ Agent Role System loaded');
