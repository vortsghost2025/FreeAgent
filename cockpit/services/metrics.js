/**
 * Service Metrics Tracker
 * Tracks per-service metrics for cockpit visualization
 * Provides real-time graphs of service health, requests, latency, etc.
 */

const si = require('systeminformation');

class ServiceMetricsTracker {
  constructor(options = {}) {
    this.interval = options.interval || 5000; // 5 seconds default
    this.historySize = options.historySize || 60; // Keep 60 data points (5 min)
    this.services = new Map();
    this.timer = null;
    this.isRunning = false;
    
    // Initialize service trackers
    this.initializeDefaultServices();
  }

  /**
   * Initialize default service trackers
   */
  initializeDefaultServices() {
    const defaultServices = [
      'orchestrator',
      'claude',
      'gemini',
      'lmstudio',
      'claw',
      'governance',
      'scheduler',
      'datastore'
    ];

    for (const service of defaultServices) {
      this.services.set(service, this.createServiceTracker(service));
    }
  }

  /**
   * Create a new service tracker
   */
  createServiceTracker(name) {
    return {
      name,
      requests: 0,
      errors: 0,
      latency: 0,
      lastRequest: null,
      lastError: null,
      status: 'idle', // idle, active, error, degraded
      history: [], // Array of {timestamp, requests, errors, latency}
      uptime: Date.now()
    };
  }

  /**
   * Start the metrics tracker
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.timer = setInterval(() => this.collectMetrics(), this.interval);
    console.log('[ServiceMetrics] Tracker started');
  }

  /**
   * Stop the metrics tracker
   */
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log('[ServiceMetrics] Tracker stopped');
  }

  /**
   * Collect metrics for all services
   */
  async collectMetrics() {
    const snapshot = await getSystemSnapshot();
    const timestamp = Date.now();

    // Add system metrics to each service
    for (const [name, tracker] of this.services) {
      // Add history point
      tracker.history.push({
        timestamp,
        requests: tracker.requests,
        errors: tracker.errors,
        latency: tracker.latency,
        cpu: snapshot.cpu,
        ram: snapshot.ram,
        gpu: snapshot.gpu
      });

      // Trim history
      if (tracker.history.length > this.historySize) {
        tracker.history.shift();
      }

      // Update status based on recent errors
      if (tracker.errors > 0 && tracker.requests > 0) {
        const errorRate = tracker.errors / tracker.requests;
        if (errorRate > 0.5) {
          tracker.status = 'error';
        } else if (errorRate > 0.1) {
          tracker.status = 'degraded';
        }
      } else if (tracker.requests > 0) {
        tracker.status = 'active';
      } else {
        tracker.status = 'idle';
      }
    }

    return this.getAllMetrics();
  }

  /**
   * Record a request for a service
   */
  recordRequest(serviceName, latencyMs = 0) {
    const tracker = this.services.get(serviceName);
    if (!tracker) {
      this.services.set(serviceName, this.createServiceTracker(serviceName));
      return this.recordRequest(serviceName, latencyMs);
    }

    tracker.requests++;
    tracker.latency = latencyMs;
    tracker.lastRequest = Date.now();
    tracker.status = 'active';
  }

  /**
   * Record an error for a service
   */
  recordError(serviceName, error = null) {
    const tracker = this.services.get(serviceName);
    if (!tracker) {
      this.services.set(serviceName, this.createServiceTracker(serviceName));
      return this.recordError(serviceName, error);
    }

    tracker.errors++;
    tracker.lastError = Date.now();
    tracker.status = 'error';
  }

  /**
   * Get all metrics
   */
  getAllMetrics() {
    const services = {};
    for (const [name, tracker] of this.services) {
      services[name] = {
        name: tracker.name,
        requests: tracker.requests,
        errors: tracker.errors,
        latency: tracker.latency,
        lastRequest: tracker.lastRequest,
        lastError: tracker.lastError,
        status: tracker.status,
        uptime: Date.now() - tracker.uptime,
        history: tracker.history
      };
    }
    return services;
  }

  /**
   * Get metrics for a specific service
   */
  getServiceMetrics(serviceName) {
    return this.services.get(serviceName);
  }

  /**
   * Get summary for cockpit display
   */
  getSummary() {
    const metrics = this.getAllMetrics();
    let totalRequests = 0;
    let totalErrors = 0;
    let activeServices = 0;
    let errorServices = 0;

    for (const service of Object.values(metrics)) {
      totalRequests += service.requests;
      totalErrors += service.errors;
      if (service.status === 'active') activeServices++;
      if (service.status === 'error') errorServices++;
    }

    return {
      totalRequests,
      totalErrors,
      activeServices,
      errorServices,
      services: metrics,
      timestamp: Date.now()
    };
  }

  /**
   * Reset metrics for a service
   */
  resetService(serviceName) {
    const tracker = this.services.get(serviceName);
    if (tracker) {
      tracker.requests = 0;
      tracker.errors = 0;
      tracker.latency = 0;
      tracker.history = [];
    }
  }

  /**
   * Reset all metrics
   */
  resetAll() {
    for (const [name, tracker] of this.services) {
      tracker.requests = 0;
      tracker.errors = 0;
      tracker.latency = 0;
      tracker.history = [];
      tracker.status = 'idle';
    }
  }
}

/**
 * Get system snapshot (CPU, RAM, GPU, IO)
 */
async function getSystemSnapshot() {
  const cpuLoad = await si.currentLoad();
  const mem = await si.mem();
  let disk = { tIO: 0 };
  try {
    const diskData = await si.disksIO();
    if (diskData) disk = diskData;
  } catch (e) {
    // Disk IO not available
  }

  let gpuLoad = 0;
  try {
    const gpu = await si.graphics();
    if (gpu.controllers && gpu.controllers[0]) {
      gpuLoad = gpu.controllers[0].utilizationGpu / 100;
    }
  } catch (e) {
    gpuLoad = 0;
  }

  return {
    cpu: cpuLoad.currentLoad / 100,
    ram: mem.active / mem.total,
    gpu: gpuLoad,
    io: disk.tIO / 100000000,
  };
}

// Export
module.exports = { ServiceMetricsTracker, getSystemSnapshot };
