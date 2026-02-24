/**
 * Health Monitor - Track Health of All Agents and Providers
 *
 * Monitors the health and performance of:
 * - Local providers (Ollama, LM Studio)
 * - Remote VPS instances
 * - Cloud API providers
 * - P2P peers
 *
 * Features:
 * - Heartbeat monitoring
 * - Latency tracking
 * - Error rate calculation
 * - Automatic failover triggers
 * - Alert generation
 */

import { EventEmitter } from "events";

// Health status levels
export const HEALTH_STATUS = {
  HEALTHY: "healthy",
  DEGRADED: "degraded",
  UNHEALTHY: "unhealthy",
  UNKNOWN: "unknown",
};

// Alert severity levels
export const ALERT_SEVERITY = {
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
  CRITICAL: "critical",
};

export class HealthMonitor extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = config;

    // Health data for each monitored entity
    this.healthData = new Map();

    // Configuration
    this.checkInterval = config.checkInterval || 30000; // 30 seconds
    this.latencyThreshold = config.latencyThreshold || 5000; // 5 seconds
    this.errorRateThreshold = config.errorRateThreshold || 0.1; // 10%
    this.unhealthyThreshold = config.unhealthyThreshold || 3; // 3 consecutive failures

    // Timers
    this.checkTimer = null;

    // Alert history
    this.alerts = [];
    this.maxAlerts = config.maxAlerts || 100;

    // Metrics
    this.metrics = {
      totalChecks: 0,
      successfulChecks: 0,
      failedChecks: 0,
      alertsGenerated: 0,
    };

    console.log("🏥 Health Monitor initialized");
  }

  /**
   * Initialize health monitoring
   */
  async initialize(entities = []) {
    console.log("🔧 Starting health monitoring...");

    // Register initial entities
    for (const entity of entities) {
      this.registerEntity(entity);
    }

    // Start monitoring loop
    this.startMonitoring();

    console.log(
      `✅ Health Monitor ready, monitoring ${this.healthData.size} entities`,
    );
    this.emit("initialized", { entityCount: this.healthData.size });
  }

  /**
   * Register an entity for monitoring
   */
  registerEntity(entity) {
    const { id, type, checkFn, name } = entity;

    this.healthData.set(id, {
      id,
      name: name || id,
      type,
      checkFn,
      status: HEALTH_STATUS.UNKNOWN,
      lastCheck: null,
      lastSuccess: null,
      latency: null,
      consecutiveFailures: 0,
      errorRate: 0,
      checkHistory: [],
      maxHistory: 20,
    });

    console.log(`📋 Registered entity for monitoring: ${id}`);
    this.emit("entity_registered", { id, type });
  }

  /**
   * Unregister an entity
   */
  unregisterEntity(id) {
    if (this.healthData.has(id)) {
      this.healthData.delete(id);
      this.emit("entity_unregistered", { id });
    }
  }

  /**
   * Start monitoring loop
   */
  startMonitoring() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }

    // Run initial check
    this.runHealthChecks();

    // Start periodic checks
    this.checkTimer = setInterval(() => {
      this.runHealthChecks();
    }, this.checkInterval);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  /**
   * Run health checks on all entities
   */
  async runHealthChecks() {
    const results = {};

    for (const [id, data] of this.healthData) {
      results[id] = await this.checkEntity(id);
    }

    this.emit("health_check_complete", results);
    return results;
  }

  /**
   * Check health of a specific entity
   */
  async checkEntity(id) {
    const data = this.healthData.get(id);
    if (!data) return null;

    this.metrics.totalChecks++;
    const startTime = Date.now();

    try {
      // Execute health check function
      const result = await data.checkFn();
      const latency = Date.now() - startTime;

      // Update health data
      data.lastCheck = Date.now();
      data.latency = latency;

      if (result.healthy) {
        data.lastSuccess = Date.now();
        data.consecutiveFailures = 0;
        this.metrics.successfulChecks++;

        // Determine status based on latency
        if (latency > this.latencyThreshold) {
          data.status = HEALTH_STATUS.DEGRADED;
          this.generateAlert(
            id,
            ALERT_SEVERITY.WARNING,
            `High latency: ${latency}ms`,
          );
        } else {
          data.status = HEALTH_STATUS.HEALTHY;
        }
      } else {
        throw new Error(result.error || "Health check failed");
      }

      // Update history
      this.updateHistory(data, {
        success: true,
        latency,
        timestamp: Date.now(),
      });

      return {
        id,
        status: data.status,
        latency,
        healthy: true,
      };
    } catch (error) {
      const latency = Date.now() - startTime;

      data.lastCheck = Date.now();
      data.consecutiveFailures++;
      this.metrics.failedChecks++;

      // Update history
      this.updateHistory(data, {
        success: false,
        error: error.message,
        timestamp: Date.now(),
      });

      // Calculate error rate
      data.errorRate = this.calculateErrorRate(data);

      // Determine status
      if (data.consecutiveFailures >= this.unhealthyThreshold) {
        data.status = HEALTH_STATUS.UNHEALTHY;
        this.generateAlert(
          id,
          ALERT_SEVERITY.ERROR,
          `Entity unhealthy: ${error.message}`,
        );
      } else {
        data.status = HEALTH_STATUS.DEGRADED;
        this.generateAlert(
          id,
          ALERT_SEVERITY.WARNING,
          `Health check failed: ${error.message}`,
        );
      }

      return {
        id,
        status: data.status,
        healthy: false,
        error: error.message,
      };
    }
  }

  /**
   * Update check history
   */
  updateHistory(data, entry) {
    data.checkHistory.push(entry);

    // Trim history
    if (data.checkHistory.length > data.maxHistory) {
      data.checkHistory.shift();
    }
  }

  /**
   * Calculate error rate from history
   */
  calculateErrorRate(data) {
    if (data.checkHistory.length === 0) return 0;

    const failures = data.checkHistory.filter((h) => !h.success).length;
    return failures / data.checkHistory.length;
  }

  /**
   * Generate an alert
   */
  generateAlert(entityId, severity, message) {
    const alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      entityId,
      severity,
      message,
      timestamp: Date.now(),
      acknowledged: false,
    };

    this.alerts.unshift(alert);
    this.metrics.alertsGenerated++;

    // Trim alerts
    if (this.alerts.length > this.maxAlerts) {
      this.alerts.pop();
    }

    console.log(`🚨 Alert [${severity}] ${entityId}: ${message}`);
    this.emit("alert", alert);

    return alert;
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId) {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.emit("alert_acknowledged", alert);
    }
  }

  /**
   * Get health status for an entity
   */
  getHealth(id) {
    return this.healthData.get(id);
  }

  /**
   * Get all health data
   */
  getAllHealth() {
    const health = {};
    for (const [id, data] of this.healthData) {
      health[id] = {
        id: data.id,
        name: data.name,
        type: data.type,
        status: data.status,
        lastCheck: data.lastCheck,
        lastSuccess: data.lastSuccess,
        latency: data.latency,
        consecutiveFailures: data.consecutiveFailures,
        errorRate: data.errorRate,
      };
    }
    return health;
  }

  /**
   * Get entities by status
   */
  getByStatus(status) {
    const results = [];
    for (const [id, data] of this.healthData) {
      if (data.status === status) {
        results.push(data);
      }
    }
    return results;
  }

  /**
   * Get healthy entities
   */
  getHealthyEntities() {
    return this.getByStatus(HEALTH_STATUS.HEALTHY);
  }

  /**
   * Get unhealthy entities
   */
  getUnhealthyEntities() {
    return this.getByStatus(HEALTH_STATUS.UNHEALTHY);
  }

  /**
   * Get recent alerts
   */
  getAlerts(limit = 20) {
    return this.alerts.slice(0, limit);
  }

  /**
   * Get unacknowledged alerts
   */
  getUnacknowledgedAlerts() {
    return this.alerts.filter((a) => !a.acknowledged);
  }

  /**
   * Get monitoring metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      entityCount: this.healthData.size,
      healthyCount: this.getHealthyEntities().length,
      unhealthyCount: this.getUnhealthyEntities().length,
      degradedCount: this.getByStatus(HEALTH_STATUS.DEGRADED).length,
      unacknowledgedAlerts: this.getUnacknowledgedAlerts().length,
    };
  }

  /**
   * Get summary dashboard data
   */
  getDashboardData() {
    const health = this.getAllHealth();
    const metrics = this.getMetrics();
    const alerts = this.getAlerts(10);

    // Calculate overall system health
    let overallStatus = HEALTH_STATUS.HEALTHY;
    if (metrics.unhealthyCount > 0) {
      overallStatus = HEALTH_STATUS.UNHEALTHY;
    } else if (metrics.degradedCount > 0) {
      overallStatus = HEALTH_STATUS.DEGRADED;
    }

    return {
      overallStatus,
      entities: health,
      metrics,
      recentAlerts: alerts,
      timestamp: Date.now(),
    };
  }

  /**
   * Shutdown monitor
   */
  shutdown() {
    this.stopMonitoring();
    this.healthData.clear();
    this.alerts = [];
    console.log("🏥 Health Monitor shutdown complete");
  }
}

/**
 * Create health check function for Ollama
 */
export function createOllamaHealthCheck(url) {
  return async () => {
    try {
      const response = await fetch(`${url}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      return { healthy: response.ok };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  };
}

/**
 * Create health check function for OpenAI-compatible API
 */
export function createOpenAIHealthCheck(url) {
  return async () => {
    try {
      const response = await fetch(`${url}/models`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      return { healthy: response.ok };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  };
}

/**
 * Create health check function for generic HTTP endpoint
 */
export function createHttpHealthCheck(url) {
  return async () => {
    try {
      const response = await fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      return { healthy: response.ok };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  };
}

export default HealthMonitor;
