/**
 * UNIFIED INTEGRATION HUB
 * Central orchestrator for all integrations in Kilo Code YOLO
 * Features: Dynamic service discovery, unified error handling, health monitoring
 */

import { EventEmitter } from 'events';

/**
 * Service Registry - tracks all available services
 */
class ServiceRegistry {
  constructor() {
    this.services = new Map();
    this.metadata = new Map();
  }

  /**
   * Register a service
   * @param {string} name - Service name
   * @param {Object} service - Service instance
   * @param {Object} metadata - Service metadata
   */
  register(name, service, metadata = {}) {
    this.services.set(name, service);
    this.metadata.set(name, {
      ...metadata,
      registeredAt: Date.now(),
      version: metadata.version || '1.0.0'
    });
  }

  /**
   * Unregister a service
   * @param {string} name - Service name
   */
  unregister(name) {
    this.services.delete(name);
    this.metadata.delete(name);
  }

  /**
   * Get a service by name
   * @param {string} name - Service name
   * @returns {Object|null}
   */
  get(name) {
    return this.services.get(name) || null;
  }

  /**
   * Get all registered services
   * @returns {Map}
   */
  getAll() {
    return new Map(this.services);
  }

  /**
   * Get service metadata
   * @param {string} name - Service name
   * @returns {Object|null}
   */
  getMetadata(name) {
    return this.metadata.get(name) || null;
  }

  /**
   * Find services by capability
   * @param {string} capability - Required capability
   * @returns {Array}
   */
  findByCapability(capability) {
    const results = [];
    for (const [name, metadata] of this.metadata) {
      if (metadata.capabilities && metadata.capabilities.includes(capability)) {
        results.push({ name, service: this.services.get(name), metadata });
      }
    }
    return results;
  }
}

/**
 * Health Monitor - tracks health status of all services
 */
class IntegrationHealthMonitor {
  constructor() {
    this.healthStatus = new Map();
    this.checkIntervals = new Map();
    this.defaultCheckInterval = 30000; // 30 seconds
  }

  /**
   * Set health status for a service
   * @param {string} name - Service name
   * @param {Object} status - Health status
   */
  setStatus(name, status) {
    this.healthStatus.set(name, {
      ...status,
      lastCheck: Date.now()
    });
  }

  /**
   * Get health status for a service
   * @param {string} name - Service name
   * @returns {Object}
   */
  getStatus(name) {
    return this.healthStatus.get(name) || { healthy: false, lastCheck: null };
  }

  /**
   * Get all health statuses
   * @returns {Map}
   */
  getAllStatuses() {
    return new Map(this.healthStatus);
  }

  /**
   * Start health check for a service
   * @param {string} name - Service name
   * @param {Function} checkFn - Health check function
   * @param {number} interval - Check interval in ms
   */
  startHealthCheck(name, checkFn, interval = this.defaultCheckInterval) {
    this.stopHealthCheck(name);
    
    const check = async () => {
      try {
        const result = await checkFn();
        this.setStatus(name, { healthy: true, ...result });
      } catch (error) {
        this.setStatus(name, { healthy: false, error: error.message });
      }
    };

    check();
    const intervalId = setInterval(check, interval);
    this.checkIntervals.set(name, intervalId);
  }

  /**
   * Stop health check for a service
   * @param {string} name - Service name
   */
  stopHealthCheck(name) {
    const intervalId = this.checkIntervals.get(name);
    if (intervalId) {
      clearInterval(intervalId);
      this.checkIntervals.delete(name);
    }
  }

  /**
   * Get overall system health
   * @returns {Object}
   */
  getOverallHealth() {
    const statuses = Array.from(this.healthStatus.values());
    const healthyCount = statuses.filter(s => s.healthy).length;
    const totalCount = statuses.length;
    
    return {
      healthy: healthyCount === totalCount,
      services: {
        total: totalCount,
        healthy: healthyCount,
        unhealthy: totalCount - healthyCount
      },
      timestamp: Date.now()
    };
  }
}

/**
 * Unified Error Handler
 */
class UnifiedErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 1000;
    this.handlers = new Map();
  }

  /**
   * Log an error
   * @param {string} service - Service name
   * @param {Error} error - Error object
   * @param {Object} context - Additional context
   */
  log(service, error, context = {}) {
    const entry = {
      service,
      message: error.message || String(error),
      stack: error.stack,
      context,
      timestamp: Date.now()
    };
    
    this.errorLog.push(entry);
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // Notify handlers
    const handler = this.handlers.get(service);
    if (handler) {
      handler(entry);
    }

    return entry;
  }

  /**
   * Register error handler for a service
   * @param {string} service - Service name
   * @param {Function} handler - Error handler function
   */
  onError(service, handler) {
    this.handlers.set(service, handler);
  }

  /**
   * Get error log
   * @param {Object} filters - Filter options
   * @returns {Array}
   */
  getLog(filters = {}) {
    let log = [...this.errorLog];
    
    if (filters.service) {
      log = log.filter(e => e.service === filters.service);
    }
    if (filters.since) {
      log = log.filter(e => e.timestamp >= filters.since);
    }
    
    return log;
  }

  /**
   * Clear error log
   */
  clearLog() {
    this.errorLog = [];
  }
}

/**
 * Main Integration Hub
 */
export class IntegrationHub extends EventEmitter {
  constructor(options = {}) {
    super();
    this.registry = new ServiceRegistry();
    this.healthMonitor = new IntegrationHealthMonitor();
    this.errorHandler = new UnifiedErrorHandler();
    this.config = {
      autoHealthCheck: options.autoHealthCheck !== false,
      healthCheckInterval: options.healthCheckInterval || 30000,
      ...options
    };
  }

  /**
   * Register a service with the hub
   * @param {string} name - Service name
   * @param {Object} service - Service instance
   * @param {Object} options - Registration options
   */
  registerService(name, service, options = {}) {
    const metadata = {
      capabilities: options.capabilities || [],
      version: options.version || '1.0.0',
      description: options.description || '',
      healthCheck: options.healthCheck
    };

    this.registry.register(name, service, metadata);

    if (this.config.autoHealthCheck && options.healthCheck) {
      this.healthMonitor.startHealthCheck(
        name,
        options.healthCheck,
        this.config.healthCheckInterval
      );
    }

    this.emit('service:registered', { name, metadata });
  }

  /**
   * Unregister a service
   * @param {string} name - Service name
   */
  unregisterService(name) {
    this.healthMonitor.stopHealthCheck(name);
    this.registry.unregister(name);
    this.emit('service:unregistered', { name });
  }

  /**
   * Get a service
   * @param {string} name - Service name
   * @returns {Object|null}
   */
  getService(name) {
    return this.registry.get(name);
  }

  /**
   * Find services by capability
   * @param {string} capability - Required capability
   * @returns {Array}
   */
  findServicesByCapability(capability) {
    return this.registry.findByCapability(capability);
  }

  /**
   * Get service health
   * @param {string} name - Service name
   * @returns {Object}
   */
  getServiceHealth(name) {
    return this.healthMonitor.getStatus(name);
  }

  /**
   * Get all services health
   * @returns {Map}
   */
  getAllHealth() {
    return this.healthMonitor.getAllStatuses();
  }

  /**
   * Get overall system health
   * @returns {Object}
   */
  getOverallHealth() {
    return this.healthMonitor.getOverallHealth();
  }

  /**
   * Handle service error
   * @param {string} service - Service name
   * @param {Error} error - Error object
   * @param {Object} context - Additional context
   */
  handleError(service, error, context = {}) {
    const entry = this.errorHandler.log(service, error, context);
    this.emit('error', entry);
    return entry;
  }

  /**
   * Register error handler
   * @param {string} service - Service name
   * @param {Function} handler - Handler function
   */
  onServiceError(service, handler) {
    this.errorHandler.onError(service, handler);
  }

  /**
   * Get error log
   * @param {Object} filters - Filter options
   * @returns {Array}
   */
  getErrorLog(filters = {}) {
    return this.errorHandler.getLog(filters);
  }

  /**
   * Execute with operation automatic error handling
  }

  /**
   * Execute with operation automatic error handling
   * @param {string} service - Service name
   * @param {string} operation - Operation name
   * @param {Function} fn - Operation function
   * @param {Object} options - Execution options
   */
  async execute(service, operation, fn, options = {}) {
    const { timeout, retries = 0, backoff = 1000 } = options;
    
    const attempt = async (attemptNumber) => {
      try {
        const result = timeout 
          ? await this._withTimeout(fn(), timeout)
          : await fn();
        this.emit('operation:success', { service, operation, attemptNumber });
        return result;
      } catch (error) {
        if (attemptNumber < retries) {
          await this._sleep(backoff * attemptNumber);
          return attempt(attemptNumber + 1);
        }
        this.handleError(service, error, { operation, attemptNumber });
        throw error;
      }
    };

    return attempt(1);
  }

  /**
   * Execute operation on a service
   * @param {string} service - Service name
   * @param {string} method - Method name
   * @param {Array} args - Method arguments
   * @param {Object} options - Execution options
   */
  async executeServiceMethod(service, method, args = [], options = {}) {
    const svc = this.getService(service);
    if (!svc) {
      throw new Error(`Service not found: ${service}`);
    }

    const fn = () => svc[method](...args);
    return this.execute(service, method, fn, options);
  }

  /**
   * Get hub status
   * @returns {Object}
   */
  getStatus() {
    return {
      services: this.registry.getAll().size,
      health: this.getOverallHealth(),
      errors: this.errorHandler.getLog().length,
      timestamp: Date.now()
    };
  }

  /**
   * Sleep helper
   * @param {number} ms - Milliseconds
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Timeout wrapper
   * @param {Promise} promise - Promise to wrap
   * @param {number} ms - Timeout in ms
   */
  _withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Operation timeout')), ms)
      )
    ]);
  }
}

// Default singleton instance
let defaultHub = null;

/**
 * Get default integration hub instance
 * @returns {IntegrationHub}
 */
export function getIntegrationHub(options) {
  if (!defaultHub) {
    defaultHub = new IntegrationHub(options);
  }
  return defaultHub;
}

/**
 * Create new integration hub instance
 * @param {Object} options - Hub options
 * @returns {IntegrationHub}
 */
export function createIntegrationHub(options) {
  return new IntegrationHub(options);
}

export default IntegrationHub;