/**
 * Adaptive Routing
 * Dynamic, metrics-driven routing for distributed task execution
 * Infrastructure layer - pure routing logic
 */

export class RoutingStrategy {
  /**
   * Round-Robin Strategy
   */
  static roundRobin(nodes, lastIndex = 0) {
    if (nodes.length === 0) return null;
    const index = (lastIndex + 1) % nodes.length;
    return { node: nodes[index], nextIndex: index };
  }

  /**
   * Least-Loaded Strategy (based on active tasks)
   */
  static leastLoaded(nodes) {
    if (nodes.length === 0) return null;
    const best = nodes.reduce((min, node) =>
      node.activeTasksCount < min.activeTasksCount ? node : min
    );
    return { node: best, reason: 'least-loaded' };
  }

  /**
   * Capability-Aware Routing
   */
  static capabilityAware(nodes, requiredCapability) {
    if (nodes.length === 0) return null;
    const capable = nodes.filter(n => n.capability === requiredCapability);
    if (capable.length === 0) return null;
    return this.leastLoaded(capable);
  }

  /**
   * Latency-Aware Routing (based on historical metrics)
   */
  static latencyAware(nodes) {
    if (nodes.length === 0) return null;
    const best = nodes.reduce((min, node) => {
      const nodeLatency = node.metrics?.avgLatency || Infinity;
      const minLatency = min.metrics?.avgLatency || Infinity;
      return nodeLatency < minLatency ? node : min;
    });
    return { node: best, reason: 'latency-optimized' };
  }

  /**
   * Cost-Based Routing (metadata-only)
   */
  static costBased(nodes, costMetric = 'cpu') {
    if (nodes.length === 0) return null;
    const best = nodes.reduce((min, node) => {
      const nodeCost = node.metrics?.[costMetric] || 1;
      const minCost = min.metrics?.[costMetric] || 1;
      return nodeCost < minCost ? node : min;
    });
    return { node: best, reason: 'cost-optimized' };
  }
}

/**
 * Metrics Feedback Loop
 * Collects real-time metrics for adaptive routing decisions
 */
export class MetricsFeedbackLoop {
  constructor(options = {}) {
    this.metrics = new Map(); // nodeId -> metrics history
    this.historySize = options.historySize || 100;
    this.aggregationWindow = options.aggregationWindow || 60000; // 1 minute
    this.debug = options.debug || false;
  }

  /**
   * Record task execution metrics
   */
  recordExecution(nodeId, taskMetrics) {
    if (!this.metrics.has(nodeId)) {
      this.metrics.set(nodeId, []);
    }

    const history = this.metrics.get(nodeId);
    history.push({
      timestamp: Date.now(),
      duration: taskMetrics.duration,
      success: taskMetrics.success,
      taskType: taskMetrics.taskType,
      load: taskMetrics.load || 0,
      memory: taskMetrics.memory || 0
    });

    // Keep only recent history
    if (history.length > this.historySize) {
      history.shift();
    }

    if (this.debug) {
      console.log(`[Feedback] Recorded metrics for ${nodeId}: ${taskMetrics.duration.toFixed(0)}ms`);
    }
  }

  /**
   * Get aggregated metrics for node
   */
  getNodeMetrics(nodeId) {
    const history = this.metrics.get(nodeId);
    if (!history || history.length === 0) return null;

    const now = Date.now();
    const recent = history.filter(m => now - m.timestamp < this.aggregationWindow);
    if (recent.length === 0) return null;

    const durations = recent.map(m => m.duration);
    const successes = recent.filter(m => m.success).length;

    return {
      nodeId,
      avgLatency: durations.reduce((a, b) => a + b) / durations.length,
      minLatency: Math.min(...durations),
      maxLatency: Math.max(...durations),
      successRate: (successes / recent.length * 100).toFixed(1),
      executionCount: recent.length,
      p95Latency: this._percentile(durations, 0.95),
      p99Latency: this._percentile(durations, 0.99)
    };
  }

  /**
   * Calculate percentile
   */
  _percentile(arr, p) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Get all node metrics
   */
  getAllMetrics() {
    const all = {};
    for (const nodeId of this.metrics.keys()) {
      all[nodeId] = this.getNodeMetrics(nodeId);
    }
    return all;
  }

  /**
   * Detect hot spots (overloaded nodes)
   */
  detectHotSpots(threshold = 0.8) {
    const allMetrics = this.getAllMetrics();
    const hotSpots = [];

    for (const [nodeId, metrics] of Object.entries(allMetrics)) {
      if (metrics && parseFloat(metrics.successRate) < threshold * 100) {
        hotSpots.push({
          nodeId,
          successRate: metrics.successRate,
          avgLatency: metrics.avgLatency,
          reason: 'low-success-rate'
        });
      }
    }

    return hotSpots;
  }

  /**
   * Clear old metrics
   */
  clear() {
    this.metrics.clear();
  }
}

/**
 * Adaptive Router
 * Makes routing decisions based on real-time metrics
 */
export class AdaptiveRouter {
  constructor(options = {}) {
    this.nodes = [];
    this.strategy = options.strategy || 'least-loaded';
    this.feedback = new MetricsFeedbackLoop(options);
    this.lastRoundRobinIndex = 0;
    this.routingHistory = [];
    this.maxHistorySize = options.maxHistorySize || 1000;
    this.fallbackStrategy = options.fallbackStrategy || 'round-robin';
    this.debug = options.debug || false;
  }

  /**
   * Register node
   */
  registerNode(node) {
    if (!this.nodes.find(n => n.id === node.id)) {
      this.nodes.push({ ...node, status: 'healthy', activeTasksCount: 0 });
      if (this.debug) {
        console.log(`[Router] Registered node: ${node.id}`);
      }
    }
  }

  /**
   * Route task to best node
   */
  routeTask(task) {
    if (this.nodes.length === 0) {
      return { success: false, error: 'NO_NODES_AVAILABLE' };
    }

    // Filter healthy nodes
    const healthyNodes = this.nodes.filter(n => n.status === 'healthy');
    if (healthyNodes.length === 0) {
      return { success: false, error: 'NO_HEALTHY_NODES' };
    }

    // Select based on strategy
    let result;
    switch (this.strategy) {
      case 'least-loaded':
        result = RoutingStrategy.leastLoaded(healthyNodes);
        break;
      case 'latency-aware':
        result = RoutingStrategy.latencyAware(healthyNodes);
        break;
      case 'capability-aware':
        result = RoutingStrategy.capabilityAware(healthyNodes, task.capability);
        break;
      case 'cost-based':
        result = RoutingStrategy.costBased(healthyNodes);
        break;
      case 'round-robin':
      default:
        result = RoutingStrategy.roundRobin(healthyNodes, this.lastRoundRobinIndex);
        this.lastRoundRobinIndex = result.nextIndex;
        break;
    }

    if (!result || !result.node) {
      return { success: false, error: 'ROUTING_FAILURE' };
    }

    const selectedNode = result.node;
    this._recordRouting(task.id, selectedNode.id, this.strategy);

    if (this.debug) {
      console.log(`[Router] Routed task ${task.id} to node ${selectedNode.id} (${this.strategy})`);
    }

    return {
      success: true,
      nodeId: selectedNode.id,
      node: selectedNode,
      strategy: this.strategy
    };
  }

  /**
   * Record task execution result (for feedback loop)
   */
  recordExecution(nodeId, taskMetrics) {
    this.feedback.recordExecution(nodeId, taskMetrics);

    // Update node active task count
    const node = this.nodes.find(n => n.id === nodeId);
    if (node) {
      node.activeTasksCount = Math.max(0, node.activeTasksCount - 1);
    }
  }

  /**
   * Detect and handle hot spots
   */
  rebalanceIfNeeded() {
    const hotSpots = this.feedback.detectHotSpots();

    if (hotSpots.length > 0) {
      hotSpots.forEach(spot => {
        const node = this.nodes.find(n => n.id === spot.nodeId);
        if (node) {
          node.status = 'degraded';
          if (this.debug) {
            console.log(`[Router] Node ${spot.nodeId} marked as degraded`);
          }
        }
      });
      return { rebalanced: true, affectedNodes: hotSpots.length };
    }

    return { rebalanced: false };
  }

  /**
   * Get router statistics
   */
  getStats() {
    const nodeStats = this.nodes.map(n => ({
      id: n.id,
      status: n.status,
      activeTasksCount: n.activeTasksCount,
      metrics: this.feedback.getNodeMetrics(n.id)
    }));

    return {
      strategy: this.strategy,
      totalNodes: this.nodes.length,
      healthyNodes: this.nodes.filter(n => n.status === 'healthy').length,
      degradedNodes: this.nodes.filter(n => n.status === 'degraded').length,
      nodes: nodeStats,
      routingHistorySize: this.routingHistory.length
    };
  }

  /**
   * Record routing decision
   */
  _recordRouting(taskId, nodeId, strategy) {
    this.routingHistory.push({
      taskId,
      nodeId,
      strategy,
      timestamp: Date.now()
    });

    if (this.routingHistory.length > this.maxHistorySize) {
      this.routingHistory.shift();
    }
  }
}

export default { RoutingStrategy, MetricsFeedbackLoop, AdaptiveRouter };
