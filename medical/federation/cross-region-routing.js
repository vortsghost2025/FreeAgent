/**
 * Cross-Region Routing
 * Geography-aware routing with failover, replication, and outage handling
 */

/**
 * Region Manager
 * Manages regions and their metadata
 */
export class RegionManager {
  constructor(options = {}) {
    this.regions = new Map();
    this.latencyMatrix = new Map(); // region -> region -> latency
    this.debug = options.debug || false;
  }

  /**
   * Register region
   */
  registerRegion(regionId, metadata = {}) {
    const region = {
      id: regionId,
      name: metadata.name || regionId,
      location: metadata.location || 'unknown',
      clusters: metadata.clusterCount || 0,
      status: 'healthy',
      latencyToOthers: {},
      failoverTarget: metadata.failoverTarget || null,
      replicationFactor: metadata.replicationFactor || 2,
      registeredAt: Date.now()
    };

    this.regions.set(regionId, region);
    this.latencyMatrix.set(regionId, new Map());

    if (this.debug) {
      console.log(`[RegionManager] Region registered: ${regionId}`);
    }

    return region;
  }

  /**
   * Set latency between regions
   */
  setLatency(sourceRegion, targetRegion, latencyMs) {
    if (!this.latencyMatrix.has(sourceRegion)) {
      this.latencyMatrix.set(sourceRegion, new Map());
    }
    this.latencyMatrix.get(sourceRegion).set(targetRegion, latencyMs);
  }

  /**
   * Get latency between regions
   */
  getLatency(sourceRegion, targetRegion) {
    if (sourceRegion === targetRegion) return 0;
    return this.latencyMatrix.get(sourceRegion)?.get(targetRegion) || Infinity;
  }

  /**
   * Get nearest healthy region
   */
  getNearestHealthyRegion(fromRegion, excludeRegions = []) {
    const allRegions = Array.from(this.regions.values())
      .filter(r => r.status === 'healthy' && !excludeRegions.includes(r.id) && r.id !== fromRegion);

    if (allRegions.length === 0) return null;

    let nearest = null;
    let minLatency = Infinity;

    allRegions.forEach(region => {
      const latency = this.getLatency(fromRegion, region.id);
      if (latency < minLatency && latency !== Infinity) {
        minLatency = latency;
        nearest = region;
      }
    });

    // If no latency info found, return first healthy region
    if (nearest === null && allRegions.length > 0) {
      nearest = allRegions[0];
    }

    return nearest;
  }

  /**
   * Get all regions
   */
  listRegions(statusFilter = null) {
    return Array.from(this.regions.values()).filter(r =>
      !statusFilter || r.status === statusFilter
    );
  }

  /**
   * Update region status
   */
  updateRegionStatus(regionId, status) {
    const region = this.regions.get(regionId);
    if (!region) return { success: false, error: 'REGION_NOT_FOUND' };

    region.status = status;
    if (this.debug) {
      console.log(`[RegionManager] Region ${regionId} status: ${status}`);
    }

    return { success: true };
  }

  /**
   * Get region statistics
   */
  getStats() {
    const regions = Array.from(this.regions.values());
    return {
      totalRegions: regions.length,
      healthyRegions: regions.filter(r => r.status === 'healthy').length,
      degradedRegions: regions.filter(r => r.status === 'degraded').length,
      totalClusters: regions.reduce((sum, r) => sum + r.clusters, 0),
      regions: regions.map(r => ({ id: r.id, status: r.status, clusters: r.clusters }))
    };
  }
}

/**
 * Cross-Region Router
 * Routes tasks across regions with failover and replication
 */
export class CrossRegionRouter {
  constructor(regionManager, clusterRouter, options = {}) {
    this.regionManager = regionManager;
    this.clusterRouter = clusterRouter;
    this.replicationPolicy = options.replicationPolicy || 'none'; // none, min, aggressive
    this.failoverChain = options.failoverChain || []; // list of fallback regions
    this.taskReplicaMap = new Map(); // taskId -> list of cluster replicas
    this.debug = options.debug || false;
  }

  /**
   * Route task across regions
   */
  routeTaskWithFailover(task) {
    const preferredRegion = task.preferredRegion || 'default';
    const route = this._routeInRegion(task, preferredRegion);

    if (route.success) {
      this._applyReplication(task.id, route.clusterId);
      return route;
    }

    // Failover to secondary regions
    if (this.failoverChain.length > 0) {
      for (const fallbackRegion of this.failoverChain) {
        const fallbackRoute = this._routeInRegion(task, fallbackRegion);
        if (fallbackRoute.success) {
          fallbackRoute.failoverApplied = true;
          fallbackRoute.originalRegion = preferredRegion;
          fallbackRoute.failoverRegion = fallbackRegion;
          this._applyReplication(task.id, fallbackRoute.clusterId);
          return fallbackRoute;
        }
      }
    }

    // Try nearest healthy region
    const nearestRegion = this.regionManager.getNearestHealthyRegion(
      preferredRegion,
      [preferredRegion]
    );

    if (nearestRegion) {
      const fallbackRoute = this._routeInRegion(task, nearestRegion.id);
      if (fallbackRoute.success) {
        fallbackRoute.failoverApplied = true;
        fallbackRoute.originalRegion = preferredRegion;
        fallbackRoute.failoverRegion = nearestRegion.id;
        return fallbackRoute;
      }
    }

    return { success: false, error: 'NO_AVAILABLE_CLUSTER' };
  }

  /**
   * Route within a specific region
   */
  _routeInRegion(task, regionId) {
    const region = this.regionManager.regions.get(regionId);
    if (!region || region.status !== 'healthy') {
      return { success: false, error: 'REGION_UNAVAILABLE' };
    }

    const taskWithRegion = { ...task, preferredRegion: regionId };
    const route = this.clusterRouter.routeTask(taskWithRegion);

    return route;
  }

  /**
   * Apply replication policy
   */
  _applyReplication(taskId, primaryClusterId) {
    const replicas = [primaryClusterId];

    switch (this.replicationPolicy) {
      case 'aggressive':
        // Replicate to 3+ regions
        const allClusters = Array.from(this.clusterRouter.registry.clustersById.values());
        const otherClusters = allClusters.filter(c => c.id !== primaryClusterId).slice(0, 2);
        replicas.push(...otherClusters.map(c => c.id));
        break;
      case 'min':
        // Replicate to 1 secondary
        const clusters = Array.from(this.clusterRouter.registry.clustersById.values())
          .filter(c => c.id !== primaryClusterId);
        if (clusters.length > 0) {
          replicas.push(clusters[0].id);
        }
        break;
      case 'none':
      default:
        // No replication
        break;
    }

    this.taskReplicaMap.set(taskId, replicas);

    if (this.debug && replicas.length > 1) {
      console.log(`[CrossRegionRouter] Task ${taskId} replicated to ${replicas.length} clusters`);
    }
  }

  /**
   * Handle region outage
   */
  handleRegionOutage(regionId) {
    const region = this.regionManager.regions.get(regionId);
    if (!region) return { success: false, error: 'REGION_NOT_FOUND' };

    region.status = 'outage';

    if (this.debug) {
      console.log(`[CrossRegionRouter] Region ${regionId} marked as outage`);
    }

    return { success: true, affectedRegion: regionId };
  }

  /**
   * Get routing statistics
   */
  getStats() {
    return {
      totalTasksReplicated: this.taskReplicaMap.size,
      replicationPolicy: this.replicationPolicy,
      failoverChain: this.failoverChain,
      regionStats: this.regionManager.getStats()
    };
  }
}

export default { RegionManager, CrossRegionRouter };
