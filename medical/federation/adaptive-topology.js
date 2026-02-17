/**
 * Phase 4.5: Adaptive Topology
 * Dynamic scaling, reshaping, and rewiring of federation topology
 * Enables automatic optimization of cluster layout based on workload
 */

/**
 * Topology Node - represents a single node in adaptive topology
 */
export class TopologyNode {
  constructor(nodeId, metadata = {}) {
    this.nodeId = nodeId;
    this.region = metadata.region || 'default';
    this.cluster = metadata.cluster || 'default';
    this.capacity = metadata.capacity || 100;
    this.utilization = 0;
    this.load = 0;
    this.latency = 0;
    this.capabilities = metadata.capabilities || [];
    this.state = 'active'; // active, scaling, rewiring, draining
    this.peers = new Set(); // connected nodes
    this.connections = new Map(); // nodeId -> { latency, bandwidth, quality }
    this.lastUpdate = Date.now();
    this.joinedAt = Date.now();
  }

  /**
   * Add connection to another node
   */
  connectTo(peerId, metrics = {}) {
    this.peers.add(peerId);
    this.connections.set(peerId, {
      peerId,
      latency: metrics.latency || 0,
      bandwidth: metrics.bandwidth || 100,
      quality: metrics.quality || 1.0,
      established: Date.now()
    });
  }

  /**
   * Remove connection
   */
  disconnectFrom(peerId) {
    this.peers.delete(peerId);
    this.connections.delete(peerId);
  }

  /**
   * Update metrics
   */
  updateMetrics(metrics = {}) {
    if (metrics.load !== undefined) this.load = metrics.load;
    if (metrics.latency !== undefined) this.latency = metrics.latency;
    if (metrics.utilization !== undefined) this.utilization = metrics.utilization;
    if (metrics.capabilities !== undefined) this.capabilities = metrics.capabilities;
    this.lastUpdate = Date.now();
  }

  /**
   * Get health score (0-100)
   */
  getHealthScore() {
    const utilizationScore = Math.max(0, 100 - (this.utilization * 100));
    const latencyScore = Math.max(0, 100 - (this.latency / 10));
    const connectionScore = Math.min(100, this.peers.size * 10);

    return (utilizationScore * 0.5 + latencyScore * 0.3 + connectionScore * 0.2);
  }

  /**
   * Get connectivity metrics
   */
  getConnectivityMetrics() {
    const connections = Array.from(this.connections.values());
    if (connections.length === 0) {
      return { avgLatency: 0, avgBandwidth: 0, avgQuality: 0, peerCount: 0 };
    }

    return {
      avgLatency: connections.reduce((sum, c) => sum + c.latency, 0) / connections.length,
      avgBandwidth: connections.reduce((sum, c) => sum + c.bandwidth, 0) / connections.length,
      avgQuality: connections.reduce((sum, c) => sum + c.quality, 0) / connections.length,
      peerCount: connections.length
    };
  }
}

/**
 * Topology Reshaper
 * Dynamically reshapes cluster topology
 */
export class TopologyReshaper {
  constructor(options = {}) {
    this.nodes = new Map(); // nodeId -> TopologyNode
    this.reshapeHistory = [];
    this.maxHistorySize = options.maxHistorySize || 1000;
    this.debug = options.debug || false;
    this.handlers = [];
  }

  /**
   * Register node in topology
   */
  registerNode(nodeId, metadata = {}) {
    if (!this.nodes.has(nodeId)) {
      this.nodes.set(nodeId, new TopologyNode(nodeId, metadata));
    }
    return this.nodes.get(nodeId);
  }

  /**
   * Connect two nodes
   */
  connectNodes(nodeId1, nodeId2, metrics = {}) {
    const node1 = this.nodes.get(nodeId1);
    const node2 = this.nodes.get(nodeId2);

    if (!node1 || !node2) return { success: false, error: 'NODE_NOT_FOUND' };

    node1.connectTo(nodeId2, metrics);
    node2.connectTo(nodeId1, metrics);

    if (this.debug) {
      console.log(`[Reshaper] Connected ${nodeId1} ↔ ${nodeId2}`);
    }

    this._recordReshape('CONNECT', { node1: nodeId1, node2: nodeId2 });
    return { success: true };
  }

  /**
   * Disconnect nodes
   */
  disconnectNodes(nodeId1, nodeId2) {
    const node1 = this.nodes.get(nodeId1);
    const node2 = this.nodes.get(nodeId2);

    if (!node1 || !node2) return { success: false, error: 'NODE_NOT_FOUND' };

    node1.disconnectFrom(nodeId2);
    node2.disconnectFrom(nodeId1);

    if (this.debug) {
      console.log(`[Reshaper] Disconnected ${nodeId1} ↔ ${nodeId2}`);
    }

    this._recordReshape('DISCONNECT', { node1: nodeId1, node2: nodeId2 });
    return { success: true };
  }

  /**
   * Rewire topology for latency optimization
   */
  rewireForLatency() {
    const nodes = Array.from(this.nodes.values());
    const changes = { connected: [], disconnected: [] };

    // Disconnect high-latency links
    for (const node of nodes) {
      const badConnections = Array.from(node.connections.values())
        .filter(c => c.latency > 100);

      for (const conn of badConnections) {
        this.disconnectNodes(node.nodeId, conn.peerId);
        changes.disconnected.push({ from: node.nodeId, to: conn.peerId });
      }
    }

    // Connect low-latency links
    for (const node1 of nodes) {
      for (const node2 of nodes) {
        if (node1.nodeId >= node2.nodeId) continue; // Avoid duplicates

        const latency = node1.latency + node2.latency; // Simple estimate
        if (latency < 50 && !node1.peers.has(node2.nodeId)) {
          this.connectNodes(node1.nodeId, node2.nodeId, { latency });
          changes.connected.push({ node1: node1.nodeId, node2: node2.nodeId });
        }
      }
    }

    this._recordReshape('LATENCY_OPTIMIZATION', changes);
    return changes;
  }

  /**
   * Rewire topology for load balancing
   */
  rewireForLoadBalance() {
    const nodes = Array.from(this.nodes.values());
    const changes = { connected: [], disconnected: [] };

    // Overloaded nodes shed connections to underutilized nodes
    const overloaded = nodes.filter(n => n.utilization > 0.8);
    const underutilized = nodes.filter(n => n.utilization < 0.2);

    for (const heavy of overloaded) {
      for (const light of underutilized) {
        if (heavy.nodeId === light.nodeId) continue;

        // Disconnect from old peer
        const worstPeer = Array.from(heavy.connections.values())
          .sort((a, b) => b.latency - a.latency)[0];

        if (worstPeer) {
          this.disconnectNodes(heavy.nodeId, worstPeer.peerId);
          changes.disconnected.push({ from: heavy.nodeId, to: worstPeer.peerId });
        }

        // Connect to underutilized node
        this.connectNodes(heavy.nodeId, light.nodeId);
        changes.connected.push({ node1: heavy.nodeId, node2: light.nodeId });
      }
    }

    this._recordReshape('LOAD_BALANCE_OPTIMIZATION', changes);
    return changes;
  }

  /**
   * Record reshape operation
   */
  _recordReshape(operation, details) {
    this.reshapeHistory.push({
      operation,
      details,
      timestamp: Date.now()
    });

    if (this.reshapeHistory.length > this.maxHistorySize) {
      this.reshapeHistory.shift();
    }

    this._emitReshape(operation, details);
  }

  /**
   * Emit reshape event
   */
  _emitReshape(operation, details) {
    this.handlers.forEach(handler => {
      try {
        handler({ operation, details, timestamp: Date.now() });
      } catch (error) {
        console.error(`[Reshaper] Handler error: ${error.message}`);
      }
    });
  }

  /**
   * Register event handler
   */
  onReshape(handler) {
    this.handlers.push(handler);
  }

  /**
   * Get topology statistics
   */
  getStats() {
    const nodes = Array.from(this.nodes.values());
    const totalConnections = nodes.reduce((sum, n) => sum + n.peers.size, 0) / 2;
    const avgHealth = nodes.length > 0
      ? nodes.reduce((sum, n) => sum + n.getHealthScore(), 0) / nodes.length
      : 0;

    return {
      totalNodes: nodes.length,
      totalConnections,
      avgConnectionsPerNode: nodes.length > 0 ? totalConnections * 2 / nodes.length : 0,
      avgHealth: avgHealth.toFixed(2),
      avgLatency: nodes.length > 0
        ? nodes.reduce((sum, n) => sum + n.latency, 0) / nodes.length
        : 0,
      avgUtilization: nodes.length > 0
        ? (nodes.reduce((sum, n) => sum + n.utilization, 0) / nodes.length * 100).toFixed(1)
        : 0
    };
  }
}

/**
 * Dynamic Scaler
 * Automatically scales topology up/down based on demand
 */
export class DynamicScaler {
  constructor(options = {}) {
    this.reshaper = options.reshaper || new TopologyReshaper();
    this.scaleThresholdHigh = options.scaleThresholdHigh || 0.8;
    this.scaleThresholdLow = options.scaleThresholdLow || 0.2;
    this.scaleHistory = [];
    this.maxHistorySize = options.maxHistorySize || 1000;
    this.debug = options.debug || false;
    this.handlers = [];
  }

  /**
   * Decide to scale up or down
   */
  makeScalingDecision() {
    const stats = this.reshaper.getStats();
    const nodes = Array.from(this.reshaper.nodes.values());

    const avgUtilization = nodes.length > 0
      ? nodes.reduce((sum, n) => sum + n.utilization, 0) / nodes.length
      : 0;

    let decision = 'STABLE';
    let details = { utilization: avgUtilization, nodeCount: nodes.length };

    if (avgUtilization > this.scaleThresholdHigh) {
      decision = 'SCALE_UP';
      details.recommendation = `Add ${Math.ceil(nodes.length * 0.2)} new nodes`;
    } else if (avgUtilization < this.scaleThresholdLow && nodes.length > 1) {
      decision = 'SCALE_DOWN';
      details.recommendation = `Remove ${Math.floor(nodes.length * 0.1)} underutilized nodes`;
    }

    this._recordScalingDecision(decision, details);
    return { decision, details };
  }

  /**
   * Scale up - add new nodes
   */
  scaleUp(count = 1, metadata = {}) {
    const newNodes = [];
    const nodeCount = this.reshaper.nodes.size;

    for (let i = 0; i < count; i++) {
      const newNodeId = `dynamic-node-${nodeCount + i}-${Date.now()}`;
      const node = this.reshaper.registerNode(newNodeId, metadata);
      newNodes.push(node);
    }

    // Connect new nodes to existing topology
    const existingNodes = Array.from(this.reshaper.nodes.values())
      .filter(n => !newNodes.includes(n))
      .slice(0, Math.min(3, this.reshaper.nodes.size - count)); // Connect to top 3

    for (const newNode of newNodes) {
      for (const existing of existingNodes) {
        this.reshaper.connectNodes(newNode.nodeId, existing.nodeId);
      }
    }

    if (this.debug) {
      console.log(`[Scaler] Scaled up: added ${count} nodes`);
    }

    this._recordScalingDecision('SCALE_UP_EXECUTED', { addedNodes: count });
    return { success: true, newNodes: newNodes.map(n => n.nodeId) };
  }

  /**
   * Scale down - remove underutilized nodes
   */
  scaleDown(count = 1) {
    const nodes = Array.from(this.reshaper.nodes.values())
      .sort((a, b) => a.utilization - b.utilization)
      .slice(0, count);

    const removedNodes = [];

    for (const node of nodes) {
      // Disconnect from all peers first
      for (const peerId of node.peers) {
        this.reshaper.disconnectNodes(node.nodeId, peerId);
      }

      // Remove node
      this.reshaper.nodes.delete(node.nodeId);
      removedNodes.push(node.nodeId);
    }

    if (this.debug) {
      console.log(`[Scaler] Scaled down: removed ${count} nodes`);
    }

    this._recordScalingDecision('SCALE_DOWN_EXECUTED', { removedNodes: count });
    return { success: true, removedNodes };
  }

  /**
   * Record scaling decision
   */
  _recordScalingDecision(decision, details) {
    this.scaleHistory.push({
      decision,
      details,
      timestamp: Date.now()
    });

    if (this.scaleHistory.length > this.maxHistorySize) {
      this.scaleHistory.shift();
    }

    this._emitScaling(decision, details);
  }

  /**
   * Emit scaling event
   */
  _emitScaling(decision, details) {
    this.handlers.forEach(handler => {
      try {
        handler({ decision, details, timestamp: Date.now() });
      } catch (error) {
        console.error(`[Scaler] Handler error: ${error.message}`);
      }
    });
  }

  /**
   * Register event handler
   */
  onScaling(handler) {
    this.handlers.push(handler);
  }

  /**
   * Get statistics
   */
  getStats() {
    const scaleUpCount = this.scaleHistory.filter(h => h.decision === 'SCALE_UP_EXECUTED').length;
    const scaleDownCount = this.scaleHistory.filter(h => h.decision === 'SCALE_DOWN_EXECUTED').length;

    return {
      totalScalingEvents: this.scaleHistory.length,
      scaleUps: scaleUpCount,
      scaleDowns: scaleDownCount,
      currentNodes: this.reshaper.nodes.size,
      decisionHistory: this.scaleHistory.slice(-10)
    };
  }
}

/**
 * Adaptive Topology Engine
 * Orchestrates reshaping and scaling
 */
export class AdaptiveTopologyEngine {
  constructor(options = {}) {
    this.reshaper = new TopologyReshaper(options);
    this.scaler = new DynamicScaler({ reshaper: this.reshaper, ...options });
    this.adaptationLog = [];
    this.maxLogSize = options.maxLogSize || 5000;
    this.debug = options.debug || false;

    // Wire up handlers
    this._setupHandlers();
  }

  /**
   * Setup internal handlers
   */
  _setupHandlers() {
    this.reshaper.onReshape((event) => {
      this.adaptationLog.push({ type: 'RESHAPE', ...event });
      if (this.adaptationLog.length > this.maxLogSize) {
        this.adaptationLog.shift();
      }
    });

    this.scaler.onScaling((event) => {
      this.adaptationLog.push({ type: 'SCALING', ...event });
      if (this.adaptationLog.length > this.maxLogSize) {
        this.adaptationLog.shift();
      }
    });
  }

  /**
   * Register node
   */
  registerNode(nodeId, metadata = {}) {
    return this.reshaper.registerNode(nodeId, metadata);
  }

  /**
   * Update node metrics
   */
  updateNodeMetrics(nodeId, metrics = {}) {
    const node = this.reshaper.nodes.get(nodeId);
    if (!node) return { success: false, error: 'NODE_NOT_FOUND' };

    node.updateMetrics(metrics);
    return { success: true };
  }

  /**
   * Perform adaptive scaling
   */
  adaptiveScale() {
    const decision = this.scaler.makeScalingDecision();

    if (decision.decision === 'SCALE_UP') {
      const count = Math.max(1, Math.ceil(this.reshaper.nodes.size * 0.2));
      return this.scaler.scaleUp(count);
    } else if (decision.decision === 'SCALE_DOWN') {
      const count = Math.max(1, Math.floor(this.reshaper.nodes.size * 0.1));
      return this.scaler.scaleDown(count);
    }

    return { decision: 'STABLE' };
  }

  /**
   * Perform adaptive rewiring
   */
  adaptiveRewire(strategy = 'latency') {
    if (strategy === 'latency') {
      return this.reshaper.rewireForLatency();
    } else if (strategy === 'load') {
      return this.reshaper.rewireForLoadBalance();
    }

    return { connected: [], disconnected: [] };
  }

  /**
   * Check topology health
   */
  checkHealth() {
    const stats = this.reshaper.getStats();
    const nodes = Array.from(this.reshaper.nodes.values());

    const unhealthyNodes = nodes.filter(n => n.getHealthScore() < 30);
    const overloadedNodes = nodes.filter(n => n.utilization > 0.9);
    const isolatedNodes = nodes.filter(n => n.peers.size === 0 && nodes.length > 1);

    return {
      timestamp: Date.now(),
      stats,
      issues: {
        unhealthyNodes: unhealthyNodes.map(n => ({ id: n.nodeId, health: n.getHealthScore() })),
        overloadedNodes: overloadedNodes.map(n => ({ id: n.nodeId, load: n.load })),
        isolatedNodes: isolatedNodes.map(n => n.nodeId)
      },
      health: unhealthyNodes.length === 0 && overloadedNodes.length === 0 ? 'healthy' : 'degraded'
    };
  }

  /**
   * Get full status
   */
  getStatus() {
    return {
      reshaper: this.reshaper.getStats(),
      scaler: this.scaler.getStats(),
      health: this.checkHealth(),
      adaptationLog: this.adaptationLog.slice(-20)
    };
  }
}

export default {
  TopologyNode,
  TopologyReshaper,
  DynamicScaler,
  AdaptiveTopologyEngine
};
