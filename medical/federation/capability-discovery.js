/**
 * Phase 4.3: Dynamic Capability Discovery
 * Heartbeat-based capability broadcasting and synchronization
 * Enables automatic federation topology awareness
 */

/**
 * Heartbeat Manager
 * Manages periodic health checks and capability updates
 */
export class HeartbeatManager {
  constructor(options = {}) {
    this.heartbeats = new Map(); // nodeId -> heartbeat info
    this.interval = options.interval || 30000; // 30 seconds
    this.timeout = options.timeout || 90000; // 3 missed beats = timeout
    this.maxHistory = options.maxHistory || 100;
    this.debug = options.debug || false;
    this.handlers = [];
  }

  /**
   * Register a node for heartbeats
   */
  registerNode(nodeId, metadata = {}) {
    this.heartbeats.set(nodeId, {
      nodeId,
      status: 'online',
      lastBeat: Date.now(),
      beatCount: 0,
      capabilities: metadata.capabilities || [],
      region: metadata.region || 'unknown',
      cluster: metadata.cluster || 'unknown',
      latency: metadata.latency || 0,
      load: metadata.load || 0,
      history: [],
      failureCount: 0
    });

    if (this.debug) {
      console.log(`[Heartbeat] Node registered: ${nodeId}`);
    }
  }

  /**
   * Record heartbeat from node
   */
  recordBeat(nodeId, metadata = {}) {
    const node = this.heartbeats.get(nodeId);
    if (!node) {
      this.registerNode(nodeId, metadata);
      return;
    }

    const now = Date.now();
    node.lastBeat = now;
    node.beatCount++;
    node.failureCount = 0;
    node.status = 'online';

    // Update capabilities if provided
    if (metadata.capabilities) {
      node.capabilities = metadata.capabilities;
    }

    // Update metrics if provided
    if (metadata.latency !== undefined) node.latency = metadata.latency;
    if (metadata.load !== undefined) node.load = metadata.load;
    if (metadata.region !== undefined) node.region = metadata.region;

    // Keep history
    node.history.push({
      timestamp: now,
      latency: metadata.latency || node.latency,
      load: metadata.load || node.load,
      capabilities: metadata.capabilities || node.capabilities
    });

    if (node.history.length > this.maxHistory) {
      node.history.shift();
    }

    this._emitNodeUpdate(nodeId, node);

    if (this.debug) {
      console.log(`[Heartbeat] Beat received: ${nodeId} (count: ${node.beatCount})`);
    }
  }

  /**
   * Check for stale nodes
   */
  checkStaleNodes() {
    const now = Date.now();
    const staleNodes = [];

    for (const [nodeId, node] of this.heartbeats) {
      const timeSinceLastBeat = now - node.lastBeat;

      if (timeSinceLastBeat > this.timeout) {
        node.status = 'offline';
        staleNodes.push({
          nodeId,
          timeSinceLastBeat,
          lastBeat: node.lastBeat
        });

        if (this.debug) {
          console.log(`[Heartbeat] Node offline: ${nodeId} (${(timeSinceLastBeat / 1000).toFixed(1)}s since beat)`);
        }
      } else if (timeSinceLastBeat > this.interval * 2) {
        node.status = 'degraded';
        node.failureCount++;
      }
    }

    return staleNodes;
  }

  /**
   * Get node status
   */
  getNodeStatus(nodeId) {
    return this.heartbeats.get(nodeId) || null;
  }

  /**
   * Get all online nodes
   */
  getOnlineNodes() {
    return Array.from(this.heartbeats.values()).filter(n => n.status === 'online');
  }

  /**
   * Get nodes with specific capability
   */
  getNodesWithCapability(capability) {
    return Array.from(this.heartbeats.values()).filter(n =>
      n.status !== 'offline' && n.capabilities.includes(capability)
    );
  }

  /**
   * Get nodes by region
   */
  getNodesByRegion(region) {
    return Array.from(this.heartbeats.values()).filter(n =>
      n.status !== 'offline' && n.region === region
    );
  }

  /**
   * Register handler for node updates
   */
  onNodeUpdate(handler) {
    this.handlers.push(handler);
  }

  /**
   * Emit node update event
   */
  _emitNodeUpdate(nodeId, nodeInfo) {
    this.handlers.forEach(handler => {
      try {
        handler({ nodeId, nodeInfo, timestamp: Date.now() });
      } catch (error) {
        console.error(`[Heartbeat] Handler error: ${error.message}`);
      }
    });
  }

  /**
   * Get federation statistics
   */
  getStats() {
    const nodes = Array.from(this.heartbeats.values());
    const online = nodes.filter(n => n.status === 'online').length;
    const degraded = nodes.filter(n => n.status === 'degraded').length;
    const offline = nodes.filter(n => n.status === 'offline').length;

    const allCapabilities = new Set();
    nodes.forEach(n => n.capabilities.forEach(c => allCapabilities.add(c)));

    const regions = new Set(nodes.map(n => n.region));

    return {
      totalNodes: nodes.length,
      onlineNodes: online,
      degradedNodes: degraded,
      offlineNodes: offline,
      capabilities: Array.from(allCapabilities),
      regions: Array.from(regions),
      avgLatency: nodes.length > 0
        ? nodes.reduce((sum, n) => sum + n.latency, 0) / nodes.length
        : 0,
      avgLoad: nodes.length > 0
        ? nodes.reduce((sum, n) => sum + n.load, 0) / nodes.length
        : 0
    };
  }
}

/**
 * Capability Registry
 * Maintains federation-wide capability index
 */
export class CapabilityRegistry {
  constructor(options = {}) {
    this.capabilities = new Map(); // capability -> [nodes providing it]
    this.nodeCapabilities = new Map(); // nodeId -> capabilities
    this.debug = options.debug || false;
    this.handlers = [];
  }

  /**
   * Register capability for node
   */
  registerCapability(nodeId, capability) {
    // Add node to capability index
    if (!this.capabilities.has(capability)) {
      this.capabilities.set(capability, []);
    }

    const nodes = this.capabilities.get(capability);
    if (!nodes.includes(nodeId)) {
      nodes.push(nodeId);

      if (this.debug) {
        console.log(`[CapabilityRegistry] Node ${nodeId} registered for ${capability}`);
      }
    }

    // Add capability to node index
    if (!this.nodeCapabilities.has(nodeId)) {
      this.nodeCapabilities.set(nodeId, []);
    }
    const caps = this.nodeCapabilities.get(nodeId);
    if (!caps.includes(capability)) {
      caps.push(capability);
    }

    this._emitCapabilityUpdate('REGISTERED', nodeId, capability);
  }

  /**
   * Unregister capability for node
   */
  unregisterCapability(nodeId, capability) {
    // Remove from capability -> nodes index
    const nodes = this.capabilities.get(capability);
    if (nodes) {
      const idx = nodes.indexOf(nodeId);
      if (idx >= 0) {
        nodes.splice(idx, 1);

        if (this.debug) {
          console.log(`[CapabilityRegistry] Node ${nodeId} unregistered from ${capability}`);
        }
      }

      // Remove capability if no providers left
      if (nodes.length === 0) {
        this.capabilities.delete(capability);
      }
    }

    // Remove from node -> capabilities index
    const caps = this.nodeCapabilities.get(nodeId);
    if (caps) {
      const capIdx = caps.indexOf(capability);
      if (capIdx >= 0) {
        caps.splice(capIdx, 1);
      }
    }

    this._emitCapabilityUpdate('UNREGISTERED', nodeId, capability);
  }

  /**
   * Sync capabilities for node
   */
  syncCapabilities(nodeId, capabilities) {
    // Get current capabilities
    const current = this.nodeCapabilities.get(nodeId) || [];

    // Find additions and removals
    const toAdd = capabilities.filter(c => !current.includes(c));
    const toRemove = current.filter(c => !capabilities.includes(c));

    // Apply changes
    toAdd.forEach(c => this.registerCapability(nodeId, c));
    toRemove.forEach(c => this.unregisterCapability(nodeId, c));

    return { added: toAdd, removed: toRemove };
  }

  /**
   * Get nodes providing capability
   */
  getProviders(capability) {
    return this.capabilities.get(capability) || [];
  }

  /**
   * Get capabilities provided by node
   */
  getCapabilities(nodeId) {
    return this.nodeCapabilities.get(nodeId) || [];
  }

  /**
   * Check if capability is available
   */
  hasCapability(capability) {
    return this.capabilities.has(capability) && this.capabilities.get(capability).length > 0;
  }

  /**
   * Get capability distribution
   */
  getDistribution() {
    const distribution = {};
    for (const [capability, nodes] of this.capabilities) {
      distribution[capability] = nodes.length;
    }
    return distribution;
  }

  /**
   * Register update handler
   */
  onCapabilityUpdate(handler) {
    this.handlers.push(handler);
  }

  /**
   * Emit capability update
   */
  _emitCapabilityUpdate(action, nodeId, capability) {
    this.handlers.forEach(handler => {
      try {
        handler({ action, nodeId, capability, timestamp: Date.now() });
      } catch (error) {
        console.error(`[CapabilityRegistry] Handler error: ${error.message}`);
      }
    });
  }

  /**
   * Get statistics
   */
  getStats() {
    const totalCapabilities = this.capabilities.size;
    const totalNodes = this.nodeCapabilities.size;
    const avgProvidersPerCapability = totalCapabilities > 0
      ? Array.from(this.capabilities.values()).reduce((sum, nodes) => sum + nodes.length, 0) / totalCapabilities
      : 0;

    return {
      totalCapabilities,
      totalNodes,
      avgProvidersPerCapability: avgProvidersPerCapability.toFixed(2),
      distribution: this.getDistribution()
    };
  }
}

/**
 * Capability Broadcaster
 * Handles federation-wide capability announcements
 */
export class CapabilityBroadcaster {
  constructor(options = {}) {
    this.nodeCapabilities = new Map(); // nodeId -> capabilities
    this.broadcasts = [];
    this.maxBroadcastHistory = options.maxBroadcastHistory || 1000;
    this.debug = options.debug || false;
  }

  /**
   * Announce capabilities from node
   */
  announce(nodeId, capabilities, metadata = {}) {
    const announcement = {
      id: `announce-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      nodeId,
      capabilities,
      metadata: {
        region: metadata.region || 'unknown',
        cluster: metadata.cluster || 'unknown',
        load: metadata.load || 0,
        latency: metadata.latency || 0,
        ...metadata
      },
      timestamp: Date.now(),
      replicas: []
    };

    // Store locally
    this.nodeCapabilities.set(nodeId, capabilities);

    // Record broadcast
    this.broadcasts.push(announcement);
    if (this.broadcasts.length > this.maxBroadcastHistory) {
      this.broadcasts.shift();
    }

    if (this.debug) {
      console.log(`[Broadcaster] Announcement from ${nodeId}: ${capabilities.join(', ')}`);
    }

    return announcement;
  }

  /**
   * Replicate announcement to other clusters
   */
  replicate(announcementId, targetClusterId) {
    const announcement = this.broadcasts.find(a => a.id === announcementId);
    if (!announcement) return { success: false, error: 'ANNOUNCEMENT_NOT_FOUND' };

    announcement.replicas.push({
      clusterId: targetClusterId,
      timestamp: Date.now(),
      status: 'delivered'
    });

    if (this.debug) {
      console.log(`[Broadcaster] Announcement ${announcementId} replicated to ${targetClusterId}`);
    }

    return { success: true, replicationCount: announcement.replicas.length };
  }

  /**
   * Get node capabilities
   */
  getCapabilities(nodeId) {
    return this.nodeCapabilities.get(nodeId) || [];
  }

  /**
   * Get recent announcements
   */
  getRecentAnnouncements(limit = 20) {
    return this.broadcasts.slice(-limit);
  }

  /**
   * Get announcement by ID
   */
  getAnnouncement(announcementId) {
    return this.broadcasts.find(a => a.id === announcementId) || null;
  }

  /**
   * Filter announcements by node
   */
  getAnnouncementsByNode(nodeId) {
    return this.broadcasts.filter(a => a.nodeId === nodeId);
  }

  /**
   * Filter announcements by capability
   */
  getAnnouncementsByCapability(capability) {
    return this.broadcasts.filter(a => a.capabilities.includes(capability));
  }

  /**
   * Get statistics
   */
  getStats() {
    const nodes = this.nodeCapabilities.size;
    const totalAnnouncements = this.broadcasts.length;
    const totalCapabilities = new Set();

    for (const caps of this.nodeCapabilities.values()) {
      caps.forEach(c => totalCapabilities.add(c));
    }

    const avgReplicasPerAnnouncement = totalAnnouncements > 0
      ? this.broadcasts.reduce((sum, a) => sum + a.replicas.length, 0) / totalAnnouncements
      : 0;

    return {
      nodesWithAnnouncements: nodes,
      totalAnnouncements,
      totalCapabilities: totalCapabilities.size,
      avgReplicasPerAnnouncement: avgReplicasPerAnnouncement.toFixed(2),
      replicationSuccess: totalAnnouncements > 0
        ? (this.broadcasts.filter(a => a.replicas.some(r => r.status === 'delivered')).length / totalAnnouncements * 100).toFixed(1)
        : 0
    };
  }
}

/**
 * Capability Discovery Engine
 * Orchestrates heartbeat, registry, and broadcasting
 */
export class CapabilityDiscoveryEngine {
  constructor(options = {}) {
    this.heartbeat = new HeartbeatManager(options);
    this.registry = new CapabilityRegistry(options);
    this.broadcaster = new CapabilityBroadcaster(options);
    this.discoveryLog = [];
    this.maxLogSize = options.maxLogSize || 5000;
    this.debug = options.debug || false;

    // Wire up handlers
    this._setupHandlers();
  }

  /**
   * Setup internal handlers
   */
  _setupHandlers() {
    // Update registry when heartbeat changes
    this.heartbeat.onNodeUpdate(({ nodeId, nodeInfo }) => {
      if (nodeInfo.capabilities && nodeInfo.capabilities.length > 0) {
        this.registry.syncCapabilities(nodeId, nodeInfo.capabilities);
      }

      this._logDiscoveryEvent({
        type: 'HEARTBEAT_UPDATE',
        nodeId,
        status: nodeInfo.status,
        capabilities: nodeInfo.capabilities,
        timestamp: Date.now()
      });
    });

    // Log capability updates
    this.registry.onCapabilityUpdate(({ action, nodeId, capability }) => {
      this._logDiscoveryEvent({
        type: 'CAPABILITY_CHANGE',
        action,
        nodeId,
        capability,
        timestamp: Date.now()
      });
    });
  }

  /**
   * Discover node
   */
  discoverNode(nodeId, metadata = {}) {
    this.heartbeat.registerNode(nodeId, metadata);

    if (metadata.capabilities) {
      metadata.capabilities.forEach(cap => {
        this.registry.registerCapability(nodeId, cap);
      });

      this.broadcaster.announce(nodeId, metadata.capabilities, metadata);
    }

    if (this.debug) {
      console.log(`[DiscoveryEngine] Node discovered: ${nodeId}`);
    }

    return this.heartbeat.getNodeStatus(nodeId);
  }

  /**
   * Update node with heartbeat
   */
  updateNode(nodeId, metadata = {}) {
    this.heartbeat.recordBeat(nodeId, metadata);

    if (metadata.capabilities) {
      const result = this.registry.syncCapabilities(nodeId, metadata.capabilities);
      if (result.added.length > 0 || result.removed.length > 0) {
        this.broadcaster.announce(nodeId, metadata.capabilities, metadata);
      }
    }

    return this.heartbeat.getNodeStatus(nodeId);
  }

  /**
   * Check federation health
   */
  checkHealth() {
    const stale = this.heartbeat.checkStaleNodes();
    const hbStats = this.heartbeat.getStats();
    const capStats = this.registry.getStats();
    const bcStats = this.broadcaster.getStats();

    return {
      timestamp: Date.now(),
      staleNodes: stale,
      heartbeat: hbStats,
      capabilities: capStats,
      broadcasting: bcStats,
      discoveryHealth: {
        discoveryRate: hbStats.onlineNodes / (hbStats.onlineNodes + hbStats.offlineNodes) * 100 || 0,
        capabilityCoverage: capStats.totalCapabilities > 0 ? capStats.totalNodes / capStats.totalCapabilities : 0
      }
    };
  }

  /**
   * Find nodes by capability
   */
  findProviders(capability, preferredRegion = null) {
    const providers = this.registry.getProviders(capability);
    const nodes = providers
      .map(nodeId => this.heartbeat.getNodeStatus(nodeId))
      .filter(n => n && n.status === 'online');

    if (preferredRegion) {
      // Sort with preferred region first, but include all regions
      return nodes.sort((a, b) => {
        const aPreferred = a.region === preferredRegion ? 0 : 1;
        const bPreferred = b.region === preferredRegion ? 0 : 1;
        if (aPreferred !== bPreferred) return aPreferred - bPreferred;
        return (a.latency || 0) - (b.latency || 0);
      });
    }

    return nodes.sort((a, b) => (a.latency || 0) - (b.latency || 0));
  }

  /**
   * Get federation topology
   */
  getTopology() {
    const nodes = this.heartbeat.getOnlineNodes();
    const byRegion = {};
    const byCluster = {};

    nodes.forEach(node => {
      // Group by region
      if (!byRegion[node.region]) {
        byRegion[node.region] = [];
      }
      byRegion[node.region].push(node.nodeId);

      // Group by cluster
      if (!byCluster[node.cluster]) {
        byCluster[node.cluster] = [];
      }
      byCluster[node.cluster].push(node.nodeId);
    });

    return {
      totalNodes: nodes.length,
      byRegion,
      byCluster,
      capabilities: this.registry.getDistribution(),
      avgLatency: this.heartbeat.getStats().avgLatency
    };
  }

  /**
   * Log discovery event
   */
  _logDiscoveryEvent(event) {
    this.discoveryLog.push(event);
    if (this.discoveryLog.length > this.maxLogSize) {
      this.discoveryLog.shift();
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      heartbeat: this.heartbeat.getStats(),
      capabilities: this.registry.getStats(),
      broadcasting: this.broadcaster.getStats(),
      discoveryEvents: this.discoveryLog.length,
      topology: this.getTopology()
    };
  }
}

export default {
  HeartbeatManager,
  CapabilityRegistry,
  CapabilityBroadcaster,
  CapabilityDiscoveryEngine
};
