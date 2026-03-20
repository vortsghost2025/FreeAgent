/**
 * WE4Free Swarm Diagnostics Layer - Track 6A
 *
 * Real-time observability for the swarm:
 * - Performance profiling (task latency, throughput over time)
 * - Error tracing (structured error log with context)
 * - Agent health timeline (state transitions)
 * - Task queue analytics (pending/claimed/completed rates)
 * - Compute job profiling (map/reduce timing breakdown)
 * - Ring buffer for bounded memory usage
 */

// ============================================================================
// RING BUFFER - Bounded memory storage for diagnostics data
// ============================================================================

class RingBuffer {
  constructor(capacity = 1000) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
    this.head = 0;
    this.size = 0;
  }

  push(item) {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this.size < this.capacity) this.size++;
  }

  toArray() {
    if (this.size < this.capacity) {
      return this.buffer.slice(0, this.size);
    }
    // Wrap around: tail to end, then start to head
    const tail = this.head; // oldest item
    return [...this.buffer.slice(tail), ...this.buffer.slice(0, tail)];
  }

  last(n = 10) {
    const arr = this.toArray();
    return arr.slice(-n);
  }

  clear() {
    this.buffer = new Array(this.capacity);
    this.head = 0;
    this.size = 0;
  }
}

// ============================================================================
// DIAGNOSTICS ENGINE
// ============================================================================

class SwarmDiagnostics {
  constructor() {
    // Event trace log
    this.events = new RingBuffer(2000);

    // Per-agent state timelines
    this.agentTimelines = new Map(); // agentId -> RingBuffer of { timestamp, state, workload }

    // Task latency measurements
    this.taskLatencies = new RingBuffer(500);

    // Compute job profiles
    this.jobProfiles = new RingBuffer(100);

    // Error log with context
    this.errors = new RingBuffer(500);

    // Throughput samples (tasks completed per interval)
    this.throughputSamples = new RingBuffer(300); // 5 min at 1s intervals

    // Snapshot interval
    this._snapshotInterval = null;
    this._lastCompletedCount = 0;

    // Attached components
    this._coordinator = null;
    this._taskQueue = null;
    this._registry = null;
    this._healthMonitor = null;
    this._computeEngine = null;

    console.log('🔬 SwarmDiagnostics initialized');
  }

  // ==========================================================================
  // ATTACH - Wire into existing swarm components
  // ==========================================================================

  attach({ coordinator, taskQueue, registry, healthMonitor, computeEngine }) {
    if (coordinator) this._attachCoordinator(coordinator);
    if (taskQueue) this._attachTaskQueue(taskQueue);
    if (registry) this._attachRegistry(registry);
    if (healthMonitor) this._attachHealthMonitor(healthMonitor);
    if (computeEngine) this._attachComputeEngine(computeEngine);

    // Start periodic throughput sampling
    this._startSampling();

    this._trace('DIAG', 'Diagnostics attached to swarm components');
  }

  _attachCoordinator(coordinator) {
    this._coordinator = coordinator;

    // Track agent registrations
    const origRegister = coordinator.registerAgent.bind(coordinator);
    coordinator.registerAgent = (agent) => {
      origRegister(agent);
      this._trace('AGENT', `Registered: ${agent.id} (${agent.role})`);
      this._ensureTimeline(agent.id);

      // Hook agent state changes
      agent.on('task:completed', (data) => {
        this._trace('TASK', `Agent ${agent.id} completed task ${data.taskId}`);
      });
      agent.on('task:failed', (data) => {
        this._traceError('TASK', `Agent ${agent.id} failed task ${data.taskId}`, data.error);
      });
      agent.on('workload:changed', (data) => {
        this._recordAgentState(agent.id, agent.state, agent.workload);
      });
    };
  }

  _attachTaskQueue(taskQueue) {
    this._taskQueue = taskQueue;

    taskQueue.on('task:added', (data) => {
      this._trace('QUEUE', `Task added: ${data.taskId} (type: ${data.task?.type || 'unknown'})`);
    });

    taskQueue.on('task:claimed', (data) => {
      this._trace('QUEUE', `Task claimed: ${data.taskId} by ${data.agentId}`);
    });

    taskQueue.on('task:completed', (data) => {
      this._trace('QUEUE', `Task completed: ${data.taskId}`);

      // Measure latency
      const task = taskQueue.tasks.get(data.taskId);
      if (task && task.claimedAt) {
        const latency = Date.now() - task.claimedAt;
        this.taskLatencies.push({
          taskId: data.taskId,
          type: task.type,
          latency,
          timestamp: Date.now()
        });
      }
    });

    taskQueue.on('task:failed', (data) => {
      this._traceError('QUEUE', `Task failed: ${data.taskId}`, data.error);
    });

    taskQueue.on('task:timeout', (data) => {
      this._traceError('QUEUE', `Task timeout: ${data.taskId}`, 'Exceeded timeout');
    });

    taskQueue.on('task:retry', (data) => {
      this._trace('QUEUE', `Task retry: ${data.taskId} (attempt ${data.retries})`);
    });
  }

  _attachRegistry(registry) {
    this._registry = registry;

    registry.on('agent:added', (id, role) => {
      this._trace('REGISTRY', `Agent added: ${id} (${role})`);
    });

    registry.on('agent:removed', (id) => {
      this._trace('REGISTRY', `Agent removed: ${id}`);
    });

    registry.on('agent:quarantined', (id) => {
      this._traceError('REGISTRY', `Agent quarantined: ${id}`, 'Too many connection failures');
    });

    registry.on('connection:changed', (fromId, toId, state, oldState) => {
      this._trace('CONN', `${fromId} -> ${toId}: ${oldState || 'none'} -> ${state}`);
    });
  }

  _attachHealthMonitor(healthMonitor) {
    this._healthMonitor = healthMonitor;

    healthMonitor.on('peer:degraded', (data) => {
      this._traceError('HEALTH', `Peer degraded: ${data.peerId}`, `errors: ${data.metrics?.consecutiveFailures}`);
    });

    healthMonitor.on('peer:disconnected', (data) => {
      this._trace('HEALTH', `Peer disconnected: ${data.peerId}`);
    });

    healthMonitor.on('peer:failed', (data) => {
      this._traceError('HEALTH', `Peer failed: ${data.peerId}`, `error rate: ${(data.metrics?.errorRate * 100).toFixed(1)}%`);
    });

    healthMonitor.on('peer:recovered', (data) => {
      this._trace('HEALTH', `Peer recovered: ${data.peerId}`);
    });

    healthMonitor.on('peer:reconnect_attempt', (data) => {
      this._trace('HEALTH', `Reconnect attempt: ${data.peerId} (${data.attempt}/${data.maxAttempts})`);
    });
  }

  _attachComputeEngine(computeEngine) {
    this._computeEngine = computeEngine;

    // Wrap callbacks to capture job profiles
    const origOnComplete = computeEngine.onJobComplete;
    computeEngine.onJobComplete = (job) => {
      this.jobProfiles.push({
        jobId: job.id,
        type: job.type,
        duration: job.getDuration(),
        subtasks: job.subtasks.length,
        completedSubtasks: job.completedSubtasks,
        timestamp: Date.now()
      });
      this._trace('COMPUTE', `Job completed: ${job.id} (${job.getDuration()}ms, ${job.subtasks.length} subtasks)`);
      if (origOnComplete) origOnComplete(job);
    };

    const origOnFailed = computeEngine.onJobFailed;
    computeEngine.onJobFailed = (job) => {
      this._traceError('COMPUTE', `Job failed: ${job.id}`, job.error);
      if (origOnFailed) origOnFailed(job);
    };

    const origOnProgress = computeEngine.onProgress;
    computeEngine.onProgress = (job) => {
      this._trace('COMPUTE', `Job progress: ${job.id} ${job.progress}%`);
      if (origOnProgress) origOnProgress(job);
    };
  }

  // ==========================================================================
  // INTERNAL HELPERS
  // ==========================================================================

  _trace(category, message) {
    this.events.push({
      timestamp: Date.now(),
      category,
      message,
      level: 'info'
    });
  }

  _traceError(category, message, detail) {
    const entry = {
      timestamp: Date.now(),
      category,
      message,
      detail: typeof detail === 'string' ? detail : String(detail),
      level: 'error'
    };
    this.events.push(entry);
    this.errors.push(entry);
  }

  _ensureTimeline(agentId) {
    if (!this.agentTimelines.has(agentId)) {
      this.agentTimelines.set(agentId, new RingBuffer(300));
    }
  }

  _recordAgentState(agentId, state, workload) {
    this._ensureTimeline(agentId);
    this.agentTimelines.get(agentId).push({
      timestamp: Date.now(),
      state,
      workload
    });
  }

  _startSampling() {
    if (this._snapshotInterval) return;

    this._snapshotInterval = setInterval(() => {
      // Throughput sample
      const currentCompleted = this._taskQueue
        ? this._taskQueue.metrics.tasksCompleted
        : 0;
      const delta = currentCompleted - this._lastCompletedCount;
      this._lastCompletedCount = currentCompleted;

      this.throughputSamples.push({
        timestamp: Date.now(),
        completed: delta, // tasks completed in last interval
        pending: this._taskQueue
          ? Array.from(this._taskQueue.tasks.values()).filter(t => t.status === 'pending').length
          : 0
      });

      // Record agent states
      if (this._coordinator) {
        this._coordinator.agents.forEach((agent, id) => {
          this._recordAgentState(id, agent.state, agent.workload);
        });
      }
    }, 1000);
  }

  // ==========================================================================
  // PUBLIC QUERIES
  // ==========================================================================

  /**
   * Get recent events, optionally filtered by category
   */
  getEvents(count = 50, category = null) {
    let events = this.events.last(count * 2); // grab extra, then filter
    if (category) {
      events = events.filter(e => e.category === category);
    }
    return events.slice(-count);
  }

  /**
   * Get recent errors
   */
  getErrors(count = 20) {
    return this.errors.last(count);
  }

  /**
   * Get task latency statistics
   */
  getLatencyStats() {
    const latencies = this.taskLatencies.toArray();
    if (latencies.length === 0) {
      return { count: 0, avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 };
    }

    const sorted = latencies.map(l => l.latency).sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
      count: sorted.length,
      avg: Math.round(sum / sorted.length),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  /**
   * Get throughput over time
   */
  getThroughputHistory(count = 60) {
    return this.throughputSamples.last(count);
  }

  /**
   * Get agent timeline (state + workload over time)
   */
  getAgentTimeline(agentId, count = 60) {
    const timeline = this.agentTimelines.get(agentId);
    return timeline ? timeline.last(count) : [];
  }

  /**
   * Get compute job profiles
   */
  getJobProfiles(count = 20) {
    return this.jobProfiles.last(count);
  }

  /**
   * Get full diagnostic snapshot
   */
  getSnapshot() {
    const latencyStats = this.getLatencyStats();
    const recentThroughput = this.throughputSamples.last(10);
    const avgThroughput = recentThroughput.length > 0
      ? recentThroughput.reduce((sum, s) => sum + s.completed, 0) / recentThroughput.length
      : 0;

    return {
      timestamp: Date.now(),
      latency: latencyStats,
      throughput: {
        current: avgThroughput,
        history: this.getThroughputHistory(60)
      },
      errors: {
        recent: this.getErrors(10),
        total: this.errors.size
      },
      jobs: this.getJobProfiles(10),
      agents: this._getAgentSummary(),
      registry: this._registry ? this._registry.getStats() : null,
      health: this._healthMonitor ? this._healthMonitor.getSummary() : null,
      queue: this._taskQueue ? this._taskQueue.getStatus() : null
    };
  }

  _getAgentSummary() {
    if (!this._coordinator) return [];
    return Array.from(this._coordinator.agents.values()).map(agent => ({
      id: agent.id,
      role: agent.role,
      state: agent.state,
      workload: agent.workload,
      tasksCompleted: agent.metrics.tasksCompleted,
      tasksFailed: agent.metrics.tasksFailed,
      uptime: Date.now() - agent.metrics.uptime
    }));
  }

  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================

  shutdown() {
    if (this._snapshotInterval) {
      clearInterval(this._snapshotInterval);
      this._snapshotInterval = null;
    }
    this.events.clear();
    this.errors.clear();
    this.taskLatencies.clear();
    this.jobProfiles.clear();
    this.throughputSamples.clear();
    this.agentTimelines.clear();
    console.log('🛑 SwarmDiagnostics shutdown');
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SwarmDiagnostics, RingBuffer };
}

if (typeof window !== 'undefined') {
  window.SwarmDiagnostics = SwarmDiagnostics;
  window.RingBuffer = RingBuffer;
}

console.log('✅ Swarm Diagnostics Layer loaded (Track 6A)');
