/**
 * WE4Free Self-Healing System
 * 
 * Monitors agent health and automatically:
 * - Detects disconnected peers
 * - Triggers reconnection attempts
 * - Marks degraded agents
 * - Redistributes work from failed agents
 * - Monitors latency and throughput
 * - Detects anomalies
 * 
 * This is Track 4: Distributed Agent Swarm Layer
 */

// HEALTH STATUS
const HealthStatus = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  DISCONNECTED: 'disconnected',
  FAILED: 'failed',
  RECOVERING: 'recovering'
};

// HEALTH METRICS
class HealthMetrics {
  constructor(peerId) {
    this.peerId = peerId;
    this.status = HealthStatus.HEALTHY;
    this.lastSeen = Date.now();
    this.lastResponse = Date.now();
    this.latency = 0; // milliseconds
    this.throughput = 0; // messages/second
    this.errorRate = 0; // 0-1
    this.reconnectAttempts = 0;
    this.consecutiveFailures = 0;
    this.measurements = {
      requests: 0,
      responses: 0,
      errors: 0,
      timeouts: 0
    };
  }

  /**
   * Update last seen timestamp
   */
  updateLastSeen() {
    this.lastSeen = Date.now();
    this.consecutiveFailures = 0;
  }

  /**
   * Record successful response
   */
  recordResponse(latencyMs) {
    this.lastResponse = Date.now();
    this.lastSeen = Date.now();
    this.latency = latencyMs;
    this.measurements.responses++;
    this.consecutiveFailures = 0;
    
    // Update error rate (exponential moving average)
    const errorRate = this.measurements.errors / Math.max(1, this.measurements.requests);
    this.errorRate = 0.7 * this.errorRate + 0.3 * errorRate;
  }

  /**
   * Record error
   */
  recordError() {
    this.measurements.errors++;
    this.consecutiveFailures++;
    
    // Update error rate
    const errorRate = this.measurements.errors / Math.max(1, this.measurements.requests);
    this.errorRate = 0.7 * this.errorRate + 0.3 * errorRate;
  }

  /**
   * Record timeout
   */
  recordTimeout() {
    this.measurements.timeouts++;
    this.consecutiveFailures++;
  }

  /**
   * Check if peer is stale
   */
  isStale(maxAgeMs = 5000) {
    return Date.now() - this.lastSeen > maxAgeMs;
  }

  /**
   * Check if peer is degraded
   */
  isDegraded() {
    return this.errorRate > 0.3 || this.consecutiveFailures >= 3 || this.latency > 1000;
  }

  /**
   * Check if peer has failed
   */
  hasFailed() {
    return this.consecutiveFailures >= 5 || this.errorRate > 0.7;
  }
}

// SELF-HEALING MONITOR
class SelfHealingMonitor {
  constructor(agentId, registry = null) {
    this.agentId = agentId;
    this.registry = registry; // Optional SwarmRegistry for connection state tracking
    this.peerHealth = new Map(); // peerId -> HealthMetrics
    this.reconnectQueue = new Set(); // Peers to reconnect
    this.eventHandlers = new Map();
    this.config = {
      healthCheckInterval: 2000, // 2 seconds
      staleTimeout: 5000, // 5 seconds
      reconnectDelay: 1000, // 1 second
      maxReconnectAttempts: 5,
      degradedThreshold: 3, // consecutive failures
      failedThreshold: 5 // consecutive failures
    };
    
    // Subscribe to registry events if available
    if (this.registry) {
      this._setupRegistryListeners();
    }
    
    // Start monitoring
    this.monitorInterval = setInterval(() => this._runHealthCheck(), this.config.healthCheckInterval);
    
    console.log(`🏥 Self-Healing Monitor initialized for ${this.agentId}`);
  }

  /**
   * Setup listeners for registry events
   */
  _setupRegistryListeners() {
    this.registry.on('connection:changed', (fromId, toId, state, oldState) => {
      // React to connection state changes
      if (state === 'disconnected' || state === 'failed') {
        // Schedule reconnection if within retry limits
        if (this.registry.shouldRetryConnection(fromId, toId)) {
          this._queueReconnect(`${fromId}-${toId}`);
        }
      } else if (state === 'connected') {
        // Clear any pending reconnections
        this.reconnectQueue.delete(`${fromId}-${toId}`);
      }
    });

    this.registry.on('agent:inactive', (agentId) => {
      console.warn(`⚠️ Agent ${agentId} marked inactive by registry`);
    });

    this.registry.on('agent:quarantined', (agentId) => {
      console.error(`🚫 Agent ${agentId} quarantined by registry`);
    });
  }

  /**
   * Register a peer for monitoring
   */
  registerPeer(peerId) {
    if (!this.peerHealth.has(peerId)) {
      this.peerHealth.set(peerId, new HealthMetrics(peerId));
      console.log(`👀 Monitoring peer: ${peerId}`);
    }
  }

  /**
   * Unregister a peer
   */
  unregisterPeer(peerId) {
    this.peerHealth.delete(peerId);
    this.reconnectQueue.delete(peerId);
    console.log(`🔕 Stopped monitoring peer: ${peerId}`);
  }

  /**
   * Record heartbeat from peer
   */
  recordHeartbeat(peerId) {
    const metrics = this.peerHealth.get(peerId);
    if (metrics) {
      metrics.updateLastSeen();
      
      if (metrics.status === HealthStatus.DEGRADED || 
          metrics.status === HealthStatus.RECOVERING) {
        metrics.status = HealthStatus.HEALTHY;
        this.emit('peer:recovered', { peerId, metrics });
        console.log(`✅ Peer ${peerId} recovered`);
      }
    }
  }

  /**
   * Record response from peer
   */
  recordResponse(peerId, latencyMs) {
    const metrics = this.peerHealth.get(peerId);
    if (metrics) {
      metrics.recordResponse(latencyMs);
    }
  }

  /**
   * Record error from peer
   */
  recordError(peerId) {
    const metrics = this.peerHealth.get(peerId);
    if (metrics) {
      metrics.recordError();
      this._updatePeerStatus(peerId, metrics);
    }
  }

  /**
   * Record timeout from peer
   */
  recordTimeout(peerId) {
    const metrics = this.peerHealth.get(peerId);
    if (metrics) {
      metrics.recordTimeout();
      this._updatePeerStatus(peerId, metrics);
    }
  }

  /**
   * Update peer status based on metrics
   */
  _updatePeerStatus(peerId, metrics) {
    const oldStatus = metrics.status;
    let newStatus = HealthStatus.HEALTHY;

    if (metrics.hasFailed()) {
      newStatus = HealthStatus.FAILED;
    } else if (metrics.isDegraded()) {
      newStatus = HealthStatus.DEGRADED;
    } else if (metrics.isStale(this.config.staleTimeout)) {
      newStatus = HealthStatus.DISCONNECTED;
    }

    if (newStatus !== oldStatus) {
      metrics.status = newStatus;
      
      switch (newStatus) {
        case HealthStatus.DEGRADED:
          this.emit('peer:degraded', { peerId, metrics });
          console.warn(`⚠️ Peer ${peerId} degraded (errors: ${metrics.consecutiveFailures}, latency: ${metrics.latency}ms)`);
          break;
          
        case HealthStatus.DISCONNECTED:
          this.emit('peer:disconnected', { peerId, metrics });
          console.warn(`🔌 Peer ${peerId} disconnected (last seen: ${Date.now() - metrics.lastSeen}ms ago)`);
          this._queueReconnect(peerId);
          break;
          
        case HealthStatus.FAILED:
          this.emit('peer:failed', { peerId, metrics });
          console.error(`❌ Peer ${peerId} failed (errors: ${metrics.consecutiveFailures}, error rate: ${(metrics.errorRate * 100).toFixed(1)}%)`);
          break;
      }
    }
  }

  /**
   * Run periodic health check
   */
  _runHealthCheck() {
    this.peerHealth.forEach((metrics, peerId) => {
      // SKIP health checking for local agents (same-tab JavaScript objects)
      // Only check health for WebRTC peer connections (format: "fromId-toId")
      // Local agents use their internal state, not network health metrics
      if (!peerId.includes('-agent-')) {
        return; // Skip local agents
      }
      
      // Check for stale peers
      if (metrics.isStale(this.config.staleTimeout) && 
          metrics.status !== HealthStatus.DISCONNECTED) {
        this._updatePeerStatus(peerId, metrics);
      }

      // Check for degraded peers
      if (metrics.isDegraded() && metrics.status === HealthStatus.HEALTHY) {
        this._updatePeerStatus(peerId, metrics);
      }

      // Check for failed peers
      if (metrics.hasFailed() && metrics.status !== HealthStatus.FAILED) {
        this._updatePeerStatus(peerId, metrics);
      }
    });

    // Process reconnect queue
    this._processReconnectQueue();
  }

  /**
   * Queue peer for reconnection
   */
  _queueReconnect(peerId) {
    const metrics = this.peerHealth.get(peerId);
    if (metrics && metrics.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.reconnectQueue.add(peerId);
    }
  }

  /**
   * Process reconnect queue
   */
  _processReconnectQueue() {
    if (this.reconnectQueue.size === 0) {
      return;
    }

    this.reconnectQueue.forEach(peerId => {
      // If using registry, check if reconnection should be attempted
      if (this.registry) {
        const [fromId, toId] = peerId.split('-');
        if (!this.registry.shouldRetryConnection(fromId, toId)) {
          this.reconnectQueue.delete(peerId);
          return;
        }
      }
      
      const metrics = this.peerHealth.get(peerId);
      if (!metrics) {
        this.reconnectQueue.delete(peerId);
        return;
      }

      // Check if enough time has passed since last attempt (exponential backoff)
      const timeSinceLastSeen = Date.now() - metrics.lastSeen;
      const backoffDelay = this.registry 
        ? this.registry.calculateBackoff(metrics.reconnectAttempts)
        : this.config.reconnectDelay * Math.pow(2, metrics.reconnectAttempts);
      
      if (timeSinceLastSeen < backoffDelay) {
        return;
      }

      // Attempt reconnect
      metrics.status = HealthStatus.RECOVERING;
      metrics.reconnectAttempts++;
      
      this.emit('peer:reconnect_attempt', { 
        peerId, 
        attempt: metrics.reconnectAttempts,
        maxAttempts: this.config.maxReconnectAttempts 
      });
      
      console.log(`🔄 Reconnecting to peer ${peerId} (attempt ${metrics.reconnectAttempts}/${this.config.maxReconnectAttempts}, backoff: ${backoffDelay}ms)`);
      
      // Remove from queue (will be re-queued if reconnect fails)
      this.reconnectQueue.delete(peerId);
      
      // Trigger actual reconnection (external handler)
      this.emit('peer:reconnect', { peerId, metrics });
    });
  }

  /**
   * Get health summary
   */
  getSummary() {
    const summary = {
      agentId: this.agentId,
      totalPeers: this.peerHealth.size,
      healthy: 0,
      degraded: 0,
      disconnected: 0,
      failed: 0,
      recovering: 0,
      peers: []
    };

    this.peerHealth.forEach((metrics, peerId) => {
      summary[metrics.status]++;
      summary.peers.push({
        peerId,
        status: metrics.status,
        lastSeen: Date.now() - metrics.lastSeen,
        latency: metrics.latency,
        errorRate: metrics.errorRate,
        reconnectAttempts: metrics.reconnectAttempts
      });
    });

    return summary;
  }

  /**
   * Get peer health
   */
  getPeerHealth(peerId) {
    const metrics = this.peerHealth.get(peerId);
    if (!metrics) {
      return null;
    }

    return {
      peerId,
      status: metrics.status,
      lastSeen: Date.now() - metrics.lastSeen,
      latency: metrics.latency,
      errorRate: metrics.errorRate,
      consecutiveFailures: metrics.consecutiveFailures,
      reconnectAttempts: metrics.reconnectAttempts,
      measurements: { ...metrics.measurements }
    };
  }

  /**
   * Force reconnect to peer
   */
  forceReconnect(peerId) {
    const metrics = this.peerHealth.get(peerId);
    if (metrics) {
      metrics.reconnectAttempts = 0; // Reset counter
      this._queueReconnect(peerId);
      console.log(`🔄 Forced reconnect queued for peer ${peerId}`);
    }
  }

  /**
   * Mark peer as healthy (manual override)
   */
  markHealthy(peerId) {
    const metrics = this.peerHealth.get(peerId);
    if (metrics) {
      metrics.status = HealthStatus.HEALTHY;
      metrics.consecutiveFailures = 0;
      metrics.reconnectAttempts = 0;
      metrics.updateLastSeen();
      console.log(`✅ Peer ${peerId} marked as healthy`);
    }
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
   * Shutdown
   */
  shutdown() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    
    this.peerHealth.clear();
    this.reconnectQueue.clear();
    
    console.log('🛑 Self-Healing Monitor shutdown');
  }
}

// Export for Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    HealthStatus,
    HealthMetrics,
    SelfHealingMonitor
  };
}

// Browser global
if (typeof window !== 'undefined') {
  window.HealthStatus = HealthStatus;
  window.HealthMetrics = HealthMetrics;
  window.SelfHealingMonitor = SelfHealingMonitor;
}

console.log('✅ Self-Healing System loaded');
