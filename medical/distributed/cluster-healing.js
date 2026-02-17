/**
 * Self-Healing + Cluster Optimization
 * Enables anti-fragile, self-recovering distributed systems
 * Infrastructure layer - no domain logic
 */

/**
 * Node Quarantine
 * Automatically quarantine unhealthy nodes
 */
export class NodeQuarantine {
  constructor(options = {}) {
    this.quarantined = new Map(); // nodeId -> quarantine info
    this.failureThreshold = options.failureThreshold || 5; // failures before quarantine
    this.failureWindow = options.failureWindow || 60000; // 1 minute window
    this.quarantineDuration = options.quarantineDuration || 300000; // 5 minutes
    this.debug = options.debug || false;
  }

  /**
   * Record node failure
   */
  recordFailure(nodeId) {
    if (!this.quarantined.has(nodeId)) {
      this.quarantined.set(nodeId, {
        nodeId,
        failures: [],
        status: 'healthy',
        quarantinedAt: null,
        quarantineExpires: null
      });
    }

    const nodeInfo = this.quarantined.get(nodeId);
    const now = Date.now();

    // Add failure within window
    nodeInfo.failures.push(now);

    // Remove old failures outside window
    nodeInfo.failures = nodeInfo.failures.filter(t => now - t < this.failureWindow);

    // Quarantine if threshold exceeded
    if (nodeInfo.failures.length >= this.failureThreshold && nodeInfo.status !== 'quarantined') {
      this._quarantineNode(nodeId);
    }

    if (this.debug) {
      console.log(`[Quarantine] Failure recorded for ${nodeId}: ${nodeInfo.failures.length}/${this.failureThreshold}`);
    }
  }

  /**
   * Quarantine node
   */
  _quarantineNode(nodeId) {
    const nodeInfo = this.quarantined.get(nodeId);
    nodeInfo.status = 'quarantined';
    nodeInfo.quarantinedAt = Date.now();
    nodeInfo.quarantineExpires = Date.now() + this.quarantineDuration;

    if (this.debug) {
      console.log(`[Quarantine] Node ${nodeId} quarantined for ${(this.quarantineDuration / 1000).toFixed(0)}s`);
    }
  }

  /**
   * Check if node is quarantined
   */
  isQuarantined(nodeId) {
    const nodeInfo = this.quarantined.get(nodeId);
    if (!nodeInfo) return false;

    const now = Date.now();
    if (nodeInfo.status === 'quarantined' && now < nodeInfo.quarantineExpires) {
      return true;
    }

    // Auto-release after duration
    if (now >= nodeInfo.quarantineExpires) {
      nodeInfo.status = 'recovering';
      nodeInfo.failures = [];
      if (this.debug) {
        console.log(`[Quarantine] Node ${nodeId} released from quarantine`);
      }
    }

    return false;
  }

  /**
   * Get quarantine status
   */
  getStatus() {
    const now = Date.now();
    const active = Array.from(this.quarantined.values()).filter(
      info => info.status === 'quarantined' && now < info.quarantineExpires
    );

    return {
      quarantinedNodes: active.length,
      nodes: active.map(info => ({
        nodeId: info.nodeId,
        quarantinedSince: info.quarantinedAt,
        expiresIn: Math.max(0, Math.ceil((info.quarantineExpires - now) / 1000))
      }))
    };
  }

  /**
   * Clear quarantine (for testing)
   */
  clear() {
    this.quarantined.clear();
  }
}

/**
 * Auto-Drain
 * Stop routing tasks to degraded nodes
 */
export class AutoDrain {
  constructor(options = {}) {
    this.drainedNodes = new Set();
    this.drainReason = new Map(); // nodeId -> reason
    this.trackingStartTime = new Map();
    this.drainTimeout = options.drainTimeout || 600000; // 10 minutes
    this.debug = options.debug || false;
  }

  /**
   * Mark node for draining
   */
  drainNode(nodeId, reason = 'degraded') {
    if (!this.drainedNodes.has(nodeId)) {
      this.drainedNodes.add(nodeId);
      this.drainReason.set(nodeId, reason);
      this.trackingStartTime.set(nodeId, Date.now());

      if (this.debug) {
        console.log(`[Drain] Node ${nodeId} marked for draining (${reason})`);
      }
    }
  }

  /**
   * Check if node is drained
   */
  isDrained(nodeId) {
    if (!this.drainedNodes.has(nodeId)) return false;

    // Auto-remove after timeout
    const startTime = this.trackingStartTime.get(nodeId);
    if (Date.now() - startTime > this.drainTimeout) {
      this._undrain(nodeId);
      return false;
    }

    return true;
  }

  /**
   * Undrain node (resume routing)
   */
  _undrain(nodeId) {
    this.drainedNodes.delete(nodeId);
    this.drainReason.delete(nodeId);
    this.trackingStartTime.delete(nodeId);

    if (this.debug) {
      console.log(`[Drain] Node ${nodeId} drained timeout expired, resuming routing`);
    }
  }

  /**
   * Get drained nodes
   */
  getDrainedNodes() {
    const result = [];
    for (const nodeId of this.drainedNodes) {
      if (this.isDrained(nodeId)) {
        result.push({
          nodeId,
          reason: this.drainReason.get(nodeId),
          drainedSince: this.trackingStartTime.get(nodeId)
        });
      }
    }
    return result;
  }

  /**
   * Clear drainage (for testing)
   */
  clear() {
    this.drainedNodes.clear();
    this.drainReason.clear();
    this.trackingStartTime.clear();
  }
}

/**
 * Auto-Recover
 * Automatically reintroduce nodes after stability verification
 */
export class AutoRecover {
  constructor(options = {}) {
    this.recovering = new Map(); // nodeId -> recovery info
    this.recoveryProbeInterval = options.recoveryProbeInterval || 30000; // 30 seconds
    this.recoverySuccessThreshold = options.recoverySuccessThreshold || 5; // successes needed
    this.recoveryWindow = options.recoveryWindow || 120000; // 2 minutes
    this.debug = options.debug || false;
  }

  /**
   * Start recovery process for node
   */
  startRecovery(nodeId) {
    if (!this.recovering.has(nodeId)) {
      this.recovering.set(nodeId, {
        nodeId,
        startedAt: Date.now(),
        probeCount: 0,
        successCount: 0,
        status: 'recovering'
      });

      if (this.debug) {
        console.log(`[Recover] Started recovery for node ${nodeId}`);
      }
    }
  }

  /**
   * Record successful probe
   */
  recordProbeSuccess(nodeId) {
    const recovery = this.recovering.get(nodeId);
    if (recovery) {
      recovery.probeCount++;
      recovery.successCount++;

      if (recovery.successCount >= this.recoverySuccessThreshold) {
        this._completeRecovery(nodeId);
      }

      if (this.debug) {
        console.log(`[Recover] Probe success for ${nodeId}: ${recovery.successCount}/${this.recoverySuccessThreshold}`);
      }
    }
  }

  /**
   * Record probe failure
   */
  recordProbeFailure(nodeId) {
    const recovery = this.recovering.get(nodeId);
    if (recovery) {
      recovery.probeCount++;
      recovery.successCount = 0; // Reset success count

      if (this.debug) {
        console.log(`[Recover] Probe failure for ${nodeId}, resetting success count`);
      }
    }
  }

  /**
   * Complete recovery
   */
  _completeRecovery(nodeId) {
    const recovery = this.recovering.get(nodeId);
    recovery.status = 'recovered';
    recovery.completedAt = Date.now();

    if (this.debug) {
      console.log(`[Recover] Node ${nodeId} recovery completed`);
    }
  }

  /**
   * Get recovery status
   */
  getRecoveryStatus(nodeId) {
    return this.recovering.get(nodeId) || null;
  }

  /**
   * Get all recovering nodes
   */
  getRecoveringNodes() {
    return Array.from(this.recovering.values()).filter(r => r.status === 'recovering');
  }

  /**
   * Clear recovery data (for testing)
   */
  clear() {
    this.recovering.clear();
  }
}

/**
 * Cluster Optimizer
 * Optimizes cluster behavior under load
 */
export class ClusterOptimizer {
  constructor(options = {}) {
    this.loadShedThreshold = options.loadShedThreshold || 0.95; // shed at 95% utilization
    this.adaptiveTimeoutBase = options.adaptiveTimeoutBase || 30000; // 30 seconds
    this.metricsWindow = options.metricsWindow || 60000; // 1 minute
    this.debug = options.debug || false;
  }

  /**
   * Should load shed (drop low-priority tasks)
   */
  shouldLoadShed(clusterMetrics) {
    const utilization = clusterMetrics.utilization || 0;
    return utilization > this.loadShedThreshold;
  }

  /**
   * Get adaptive timeout based on performance
   */
  getAdaptiveTimeout(nodeMetrics) {
    if (!nodeMetrics || !nodeMetrics.avgLatency) {
      return this.adaptiveTimeoutBase;
    }

    // Timeout = base + 3x average latency
    const adaptiveTimeout = this.adaptiveTimeoutBase + nodeMetrics.avgLatency * 3;
    return Math.min(adaptiveTimeout, this.adaptiveTimeoutBase * 10); // Cap at 10x base
  }

  /**
   * Predict node health
   */
  predictNodeHealth(nodeMetrics) {
    if (!nodeMetrics) return 'unknown';

    const successRate = parseFloat(nodeMetrics.successRate);
    if (successRate < 0.8) return 'unhealthy';
    if (successRate < 0.95) return 'degraded';
    return 'healthy';
  }

  /**
   * Get optimization recommendations
   */
  getRecommendations(clusterMetrics) {
    const recommendations = [];

    if (this.shouldLoadShed(clusterMetrics)) {
      recommendations.push({
        action: 'LOAD_SHED',
        priority: 'critical',
        description: 'Cluster utilization critical, shedding low-priority tasks'
      });
    }

    if (clusterMetrics.degradedNodes > clusterMetrics.totalNodes * 0.3) {
      recommendations.push({
        action: 'SCALE_UP',
        priority: 'high',
        description: 'More than 30% nodes degraded, consider adding capacity'
      });
    }

    if (clusterMetrics.quarantinedNodes > 0) {
      recommendations.push({
        action: 'INVESTIGATE',
        priority: 'high',
        description: `${clusterMetrics.quarantinedNodes} nodes quarantined, investigate root cause`
      });
    }

    return recommendations;
  }

  /**
   * Calculate cluster health score
   */
  getHealthScore(clusterMetrics) {
    let score = 100;

    // Deduct for unhealthy nodes
    const degradedRatio = clusterMetrics.degradedNodes / clusterMetrics.totalNodes;
    score -= degradedRatio * 20;

    // Deduct for quarantined nodes
    const quarantinedRatio = clusterMetrics.quarantinedNodes / clusterMetrics.totalNodes;
    score -= quarantinedRatio * 30;

    // Deduct for high utilization
    const utilization = clusterMetrics.utilization || 0;
    score -= Math.max(0, utilization - 0.7) * 20;

    return Math.max(0, score);
  }
}

export default { NodeQuarantine, AutoDrain, AutoRecover, ClusterOptimizer };
