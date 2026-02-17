/**
 * Phase 4: Multi-Cluster Federation
 * Cluster Registry, Inter-Cluster Bus, Federated Router
 * Infrastructure-only: No domain logic, pure orchestration
 */

/**
 * Cluster Registry
 * Metadata-first registry of clusters in the federation
 */
export class ClusterRegistry {
  constructor(options = {}) {
    this.clusters = new Map();
    this.clustersById = new Map();
    this.debug = options.debug || false;
  }

  /**
   * Register a cluster
   */
  registerCluster(clusterId, metadata = {}) {
    const cluster = {
      id: clusterId,
      region: metadata.region || 'default',
      zone: metadata.zone || 'default',
      status: 'healthy',
      capabilities: metadata.capabilities || [],
      nodes: metadata.nodeCount || 0,
      load: 0,
      latency: metadata.latency || 0,
      costPerHour: metadata.costPerHour || 0,
      activeTasksCount: 0,
      avgLatency: 0,
      registeredAt: Date.now(),
      lastHeartbeat: Date.now(),
      metrics: {},
      maxNodes: metadata.maxNodes || 100,
      replicationFactor: metadata.replicationFactor || 1
    };

    this.clusters.set(metadata.region || 'default', this.clusters.get(metadata.region || 'default') || []);
    this.clusters.get(metadata.region || 'default').push(cluster);
    this.clustersById.set(clusterId, cluster);

    if (this.debug) {
      console.log(`[ClusterRegistry] Cluster registered: ${clusterId} in region ${cluster.region}`);
    }

    return cluster;
  }

  /**
   * Get cluster by ID
   */
  getCluster(clusterId) {
    return this.clustersById.get(clusterId) || null;
  }

  /**
   * Get clusters in region
   */
  getClustersInRegion(region) {
    return this.clusters.get(region) || [];
  }

  /**
   * Update cluster metrics
   */
  updateClusterMetrics(clusterId, metrics) {
    const cluster = this.clustersById.get(clusterId);
    if (!cluster) return { success: false, error: 'CLUSTER_NOT_FOUND' };

    cluster.load = metrics.load !== undefined ? metrics.load : cluster.load;
    cluster.latency = metrics.latency !== undefined ? metrics.latency : cluster.latency;
    cluster.avgLatency = metrics.avgLatency !== undefined ? metrics.avgLatency : cluster.avgLatency;
    cluster.activeTasksCount = metrics.activeTasksCount !== undefined ? metrics.activeTasksCount : cluster.activeTasksCount;
    cluster.nodes = metrics.nodeCount !== undefined ? metrics.nodeCount : cluster.nodes;
    cluster.metrics = { ...cluster.metrics, ...metrics };
    cluster.lastHeartbeat = Date.now();

    if (metrics.status) {
      cluster.status = metrics.status;
    }

    return { success: true };
  }

  /**
   * Get all healthy clusters
   */
  getHealthyClusters() {
    return Array.from(this.clustersById.values()).filter(c => c.status === 'healthy');
  }

  /**
   * Get federation stats
   */
  getFederationStats() {
    const allClusters = Array.from(this.clustersById.values());
    const byRegion = {};
    const totalMetrics = {
      totalClusters: allClusters.length,
      totalNodes: 0,
      healthyClusters: 0,
      degradedClusters: 0,
      capabilities: new Set(),
      regions: new Set()
    };

    allClusters.forEach(cluster => {
      byRegion[cluster.region] = (byRegion[cluster.region] || 0) + 1;
      totalMetrics.totalNodes += cluster.nodes;
      if (cluster.status === 'healthy') totalMetrics.healthyClusters++;
      if (cluster.status === 'degraded') totalMetrics.degradedClusters++;
      cluster.capabilities.forEach(cap => totalMetrics.capabilities.add(cap));
      totalMetrics.regions.add(cluster.region);
    });

    return {
      totalClusters: allClusters.length,
      healthyClusters: totalMetrics.healthyClusters,
      degradedClusters: totalMetrics.degradedClusters,
      totalNodes: totalMetrics.totalNodes,
      uniqueCapabilities: Array.from(totalMetrics.capabilities),
      uniqueRegions: totalMetrics.regions.size,
      byRegion
    };
  }

  /**
   * List all clusters
   */
  listClusters(filter = {}) {
    return Array.from(this.clustersById.values()).filter(cluster => {
      if (filter.region && cluster.region !== filter.region) return false;
      if (filter.status && cluster.status !== filter.status) return false;
      if (filter.capability && !cluster.capabilities.includes(filter.capability)) return false;
      return true;
    });
  }
}

/**
 * Inter-Cluster Bus Adapter
 * Abstracts message passing between clusters
 */
export class InterClusterBusAdapter {
  constructor(options = {}) {
    this.messages = new Map();
    this.messageLog = [];
    this.broadcasts = new Map();
    this.messageCount = 0;
    this.broadcastCount = 0;
    this.maxLogSize = options.maxLogSize || 10000;
    this.debug = options.debug || false;
  }

  /**
   * Send message to remote cluster
   */
  sendMessage(sourceClusterId, targetClusterId, message) {
    const msg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      messageId: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sourceCluster: sourceClusterId,
      targetCluster: targetClusterId,
      type: message.type,
      payload: message.payload,
      timestamp: Date.now(),
      attempts: 0,
      delivered: false,
      status: 'pending'
    };

    const msgId = msg.id;
    this.messages.set(msgId, msg);
    this.messageLog.push(msg);
    this.messageCount++;

    if (this.messageLog.length > this.maxLogSize) {
      this.messageLog.shift();
    }

    if (this.debug) {
      console.log(`[InterClusterBus] Message queued: ${msgId} from ${sourceClusterId} to ${targetClusterId}`);
    }

    return { success: true, messageId: msgId, delivered: false };
  }

  /**
   * Broadcast message to all clusters
   */
  broadcast(sourceClusterId, message) {
    const broadcastId = `broadcast-${++this.broadcastCount}`;
    const msg = {
      id: broadcastId,
      broadcastId,
      source: sourceClusterId,
      type: message.type,
      payload: message.payload,
      timestamp: Date.now(),
      targets: [],
      status: 'broadcasting'
    };

    this.broadcasts.set(broadcastId, msg);
    this.messageLog.push(msg);

    if (this.debug) {
      console.log(`[InterClusterBus] Broadcast initiated: ${broadcastId}`);
    }

    return { success: true, broadcastId };
  }

  /**
   * Get message status
   */
  getMessageStatus(messageId) {
    return this.messages.get(messageId) || null;
  }

  /**
   * Get bus statistics
   */
  getStats() {
    const pending = this.messageLog.filter(m => m.status === 'pending').length;
    const delivered = this.messageLog.filter(m => m.delivered === true).length;
    const failed = this.messageLog.filter(m => m.status === 'failed').length;

    return {
      totalMessages: this.messageCount + this.broadcastCount,
      totalMessagesSent: this.messageCount,
      totalBroadcasts: this.broadcastCount,
      pending,
      delivered,
      failed,
      successRate: delivered / (delivered + failed) * 100 || 0
    };
  }
}

/**
 * Federated Router
 * Routes tasks across clusters based on strategies
 */
export class FederatedRouter {
  constructor(clusterRegistryOrOptions, options = {}) {
    // Handle case where first arg is options (no registry)
    if (clusterRegistryOrOptions && typeof clusterRegistryOrOptions === 'object' && !clusterRegistryOrOptions.clusters && typeof clusterRegistryOrOptions.registerCluster !== 'function') {
      // First arg is options, not registry
      this.registry = null;
      const opts = clusterRegistryOrOptions;
      this.strategy = opts.strategy || 'least-loaded';
      this.debug = opts.debug || false;
      this.maxHistorySize = opts.maxHistorySize || 5000;
    } else {
      // First arg is a registry (or null/undefined)
      this.registry = clusterRegistryOrOptions instanceof ClusterRegistry ? clusterRegistryOrOptions : null;
      this.strategy = options.strategy || 'least-loaded';
      this.debug = options.debug || false;
      this.maxHistorySize = options.maxHistorySize || 5000;
    }

    this.clusters = [];
    this.routingHistory = [];
    this.taskCount = 0;
  }

  /**
   * Register cluster directly (for inline usage without registry)
   */
  registerCluster(cluster) {
    if (typeof cluster === 'object' && cluster.id) {
      // Ensure cluster has default values and flatten metrics
      const normalizedCluster = {
        status: 'healthy',
        capabilities: [],
        activeTasksCount: 0,
        ...cluster,
        // Flatten metrics to top level
        avgLatency: cluster.metrics?.avgLatency || cluster.avgLatency || 0,
        costPerHour: cluster.metrics?.costPerHour || cluster.costPerHour || 0,
        load: cluster.metrics?.load || cluster.load || 0
      };
      this.clusters.push(normalizedCluster);
    }
  }

  /**
   * Route task to best cluster
   */
  routeTask(task) {
    let candidates = [];

    if (this.registry) {
      candidates = this.registry.getHealthyClusters();
    } else {
      candidates = this.clusters.filter(c => c.status === 'healthy');
    }

    if (candidates.length === 0) {
      return { success: false, error: 'NO_CLUSTERS_AVAILABLE' };
    }

    let selectedCluster;

    switch (this.strategy) {
      case 'least-loaded':
        selectedCluster = candidates.reduce((min, c) =>
          (c.activeTasksCount || c.load || 0) < (min.activeTasksCount || min.load || 0) ? c : min
        );
        break;
      case 'latency-aware':
        selectedCluster = candidates.reduce((min, c) =>
          (c.avgLatency || c.latency || 0) < (min.avgLatency || min.latency || 0) ? c : min
        );
        break;
      case 'cost-aware':
        selectedCluster = candidates.reduce((min, c) => (c.metrics?.costPerHour || c.costPerHour || 0) < (min.metrics?.costPerHour || min.costPerHour || 0) ? c : min);
        break;
      case 'capability-aware':
        const capableClusters = candidates.filter(c =>
          c.capabilities && c.capabilities.includes(task.capability)
        );
        if (capableClusters.length === 0) {
          return { success: false, error: 'NO_CAPABLE_CLUSTERS', capability: task.capability };
        }
        selectedCluster = capableClusters.reduce((min, c) => (c.activeTasksCount || c.load || 0) < (min.activeTasksCount || min.load || 0) ? c : min);
        break;
      case 'region-aware':
        const regionClusters = candidates.filter(c => c.region === task.preferredRegion);
        selectedCluster = regionClusters.length > 0
          ? regionClusters[0]
          : candidates[0];
        break;
      default:
        selectedCluster = candidates[0];
    }

    this._recordRoute(task.id, selectedCluster.id, this.strategy);

    if (this.debug) {
      console.log(`[FederatedRouter] Routed ${task.id} to cluster ${selectedCluster.id} (${this.strategy})`);
    }

    return {
      success: true,
      clusterId: selectedCluster.id,
      cluster: selectedCluster,
      strategy: this.strategy
    };
  }

  /**
   * Record routing decision
   */
  _recordRoute(taskId, clusterId, strategy) {
    this.taskCount++;
    this.routingHistory.push({
      taskId,
      clusterId,
      strategy,
      timestamp: Date.now()
    });

    if (this.routingHistory.length > this.maxHistorySize) {
      this.routingHistory.shift();
    }
  }

  /**
   * Get routing statistics
   */
  getStats() {
    const clusterRoutes = {};
    this.routingHistory.forEach(route => {
      clusterRoutes[route.clusterId] = (clusterRoutes[route.clusterId] || 0) + 1;
    });

    return {
      totalTasksRouted: this.taskCount,
      totalClusters: this.clusters.length,
      clusterDistribution: clusterRoutes,
      strategy: this.strategy
    };
  }
}

export default { ClusterRegistry, InterClusterBusAdapter, FederatedRouter };
