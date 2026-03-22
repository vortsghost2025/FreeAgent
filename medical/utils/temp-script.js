/**
 * AUTO-RECOVERY SYSTEM
 * Automatic crash recovery and self-healing for Kilo Code YOLO
 * Features: State checkpointing, graceful degradation, self-healing mechanisms
 */

import { EventEmitter } from 'events';

/**
 * State Checkpoint - captures and restores system state
 */
class StateCheckpoint {
  constructor(options = {}) {
    this.maxCheckpoints = options.maxCheckpoints || 10;
    this.checkpoints = [];
    this.currentState = null;
  }

  /**
   * Create a checkpoint
   * @param {string} name - Checkpoint name
   * @param {Object} state - State to save
   * @returns {Object} Checkpoint data
   */
  create(name, state) {
    const checkpoint = {
      id: this._generateId(),
      name,
      state: this._deepClone(state),
      timestamp: Date.now(),
      sequence: this.checkpoints.length
    };

    this.checkpoints.push(checkpoint);
    this.currentState = checkpoint;

    // Trim old checkpoints
    if (this.checkpoints.length > this.maxCheckpoints) {
      this.checkpoints.shift();
    }

    return checkpoint;
  }

  /**
   * Get latest checkpoint
   * @returns {Object|null}
   */
  getLatest() {
    return this.currentState;
  }

  /**
   * Get checkpoint by name
   * @param {string} name - Checkpoint name
   * @returns {Object|null}
   */
  getByName(name) {
    return this.checkpoints.find(c => c.name === name) || null;
  }

  /**
   * Get checkpoint by ID
   * @param {string} id - Checkpoint ID
   * @returns {Object|null}
   */
  getById(id) {
    return this.checkpoints.find(c => c.id === id) || null;
  }

  /**
   * Get all checkpoints
   * @returns {Array}
   */
  getAll() {
    return [...this.checkpoints];
  }

  /**
   * Delete a checkpoint
   * @param {string} id - Checkpoint ID
   */
  delete(id) {
    const index = this.checkpoints.findIndex(c => c.id === id);
    if (index !== -1) {
      this.checkpoints.splice(index, 1);
    }
  }

  /**
   * Clear all checkpoints
   */
  clear() {
    this.checkpoints = [];
    this.currentState = null;
  }

  /**
   * Deep clone an object
   * @param {Object} obj - Object to clone
   * @returns {Object}
   */
  _deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Generate unique ID
   * @returns {string}
   */
  _generateId() {
    return `chk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Recovery Strategy - handles different failure scenarios
 */
class RecoveryStrategy {
  constructor(type, handler, options = {}) {
    this.type = type;
    this.handler = handler;
    this.options = {
      maxRetries: options.maxRetries || 3,
      backoffMs: options.backoffMs || 1000,
      timeout: options.timeout || 30000,
      ...options
    };
  }

  /**
   * Execute recovery
   * @param {Object} context - Recovery context
   * @returns {Promise}
   */
  async execute(context) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        const result = await this._executeWithTimeout(
          this.handler(context),
          this.options.timeout
        );
        return { success: true, result, attempts: attempt };
      } catch (error) {
        lastError = error;
        
        if (attempt < this.options.maxRetries) {
          const delay = this.options.backoffMs * attempt;
          await this._sleep(delay);
        }
      }
    }

    return { success: false, error: lastError, attempts: this.options.maxRetries };
  }

  /**
   * Execute with timeout
   * @param {Promise} promise - Promise to execute
   * @param {number} ms - Timeout in ms
   * @returns {Promise}
   */
  async _executeWithTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Recovery timeout')), ms)
      )
    ]);
  }

  /**
   * Sleep helper
   * @param {number} ms - Milliseconds
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Health Monitor - monitors system health
 */
class RecoveryHealthMonitor {
  constructor() {
    this.metrics = {
      uptime: 0,
      failures: 0,
      recoveries: 0,
      startTime: Date.now(),
      lastFailure: null,
      lastRecovery: null
    };
  }

  /**
   * Record a failure
   * @param {Error} error - Error that occurred
   */
  recordFailure(error) {
    this.metrics.failures++;
    this.metrics.lastFailure = {
      error: error.message || String(error),
      timestamp: Date.now()
    };
  }

  /**
   * Record a successful recovery
   */
  recordRecovery() {
    this.metrics.recoveries++;
    this.metrics.lastRecovery = Date.now();
  }

  /**
   * Get uptime
   * @returns {number}
   */
  getUptime() {
    return Date.now() - this.metrics.startTime;
  }

  /**
   * Get health metrics
   * @returns {Object}
   */
  getMetrics() {
    return {
      ...this.metrics,
      uptime: this.getUptime()
    };
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      uptime: 0,
      failures: 0,
      recoveries: 0,
      startTime: Date.now(),
      lastFailure: null,
      lastRecovery: null
    };
  }
}

/**
 * Graceful Degradation Manager
 */
class DegradationManager {
  constructor() {
    this.degradedServices = new Map();
    this.fallbackHandlers = new Map();
  }

  /**
   * Mark a service as degraded
   * @param {string} service - Service name
   * @param {string} reason - Degradation reason
   * @param {number} severity - Severity level (1-5)
   */
  degrade(service, reason, severity = 1) {
    this.degradedServices.set(service, {
      reason,
      severity,
      degradedAt: Date.now(),
      attempts: 0
    });
  }

  /**
   * Restore a service
   * @param {string} service - Service name
   */
  restore(service) {
    this.degradedServices.delete(service);
  }

  /**
   * Check if service is degraded
   * @param {string} service - Service name
   * @returns {boolean}
   */
  isDegraded(service) {
    return this.degradedServices.has(service);
  }

  /**
   * Get degradation status
   * @param {string} service - Service name
   * @returns {Object|null}
   */
  getStatus(service) {
    return this.degradedServices.get(service) || null;
  }

  /**
   * Get all degraded services
   * @returns {Map}
   */
  getAllDegraded() {
    return new Map(this.degradedServices);
  }

  /**
   * Register fallback handler
   * @param {string} service - Service name
   * @param {Function} handler - Fallback handler
   */
  registerFallback(service, handler) {
    this.fallbackHandlers.set(service, handler);
  }

  /**
   * Get fallback handler
   * @param {string} service - Service name
   * @returns {Function|null}
   */
  getFallback(service) {
    return this.fallbackHandlers.get(service) || null;
  }

  /**
   * Execute with fallback
   * @param {string} service - Service name
   * @param {Function} primary - Primary handler
   * @param {Object} args - Arguments
   * @returns {Promise}
   */
  async executeWithFallback(service, primary, args) {
    if (this.isDegraded(service)) {
      const fallback = this.getFallback(service);
      if (fallback) {
        return fallback(args);
      }
      throw new Error(`Service ${service} is degraded and no fallback available`);
    }

    return primary(args);
  }
}

/**
 * Main Auto-Recovery System
 */
export class AutoRecovery extends EventEmitter {
  constructor(options = {}) {
    super();
    this.checkpoint = new StateCheckpoint(options.checkpoint);
    this.healthMonitor = new RecoveryHealthMonitor();
    this.degradationManager = new DegradationManager();
    this.strategies = new Map();
    this.recoveryInProgress = false;
    this.config = {
      autoCheckpoint: options.autoCheckpoint !== false,
      checkpointInterval: options.checkpointInterval || 60000,
      maxRecoveryAttempts: options.maxRecoveryAttempts || 5,
      ...options
    };

    // Start auto checkpoint
    if (this.config.autoCheckpoint) {
      this._startAutoCheckpoint();
    }
  }

  /**
   * Register a recovery strategy
   * @param {string} type - Failure type
   * @param {Function} handler - Recovery handler
   * @param {Object} options - Strategy options
   */
  registerStrategy(type, handler, options = {}) {
    this.strategies.set(type, new RecoveryStrategy(type, handler, options));
  }

  /**
   * Create a checkpoint
   * @param {string} name - Checkpoint name
   * @param {Object} state - State to save
   * @returns {Object}
   */
  createCheckpoint(name, state) {
    const checkpoint = this.checkpoint.create(name, state);
    this.emit('checkpoint:created', checkpoint);
    return checkpoint;
  }

  /**
   * Restore from checkpoint
   * @param {string} checkpointId - Checkpoint ID
   * @returns {Object|null}
   */
  async restoreFromCheckpoint(checkpointId) {
    const checkpoint = this.checkpoint.getById(checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${checkpointId}`);
    }

    this.emit('checkpoint:restoring', checkpoint);
    return checkpoint.state;
  }

  /**
   * Restore from latest checkpoint
   * @returns {Object|null}
   */
  async restoreFromLatest() {
    const checkpoint = this.checkpoint.getLatest();
    if (!checkpoint) {
      return null;
    }

    this.emit('checkpoint:restoring', checkpoint);
    return checkpoint.state;
  }

  /**
   * Attempt recovery
   * @param {string} failureType - Type of failure
   * @param {Object} context - Recovery context
   * @returns {Promise<Object>}
   */
  async attemptRecovery(failureType, context = {}) {
    if (this.recoveryInProgress) {
      return { success: false, error: 'Recovery already in progress' };
    }

    this.recoveryInProgress = true;
    this.emit('recovery:started', { failureType, context });

    try {
      const strategy = this.strategies.get(failureType);
      
      if (!strategy) {
        // Use default recovery
        const result = await this._defaultRecovery(context);
        this.healthMonitor.recordRecovery();
        this.emit('recovery:completed', result);
        return result;
      }

      const result = await strategy.execute(context);
      
      if (result.success) {
        this.healthMonitor.recordRecovery();
        this.emit('recovery:completed', result);
      } else {
        this.emit('recovery:failed', result);
      }

      return result;
    } catch (error) {
      this.healthMonitor.recordFailure(error);
      this.emit('recovery:error', error);
      return { success: false, error };
    } finally {
      this.recoveryInProgress = false;
    }
  }

  /**
   * Default recovery strategy
   * @param {Object} context - Recovery context
   * @returns {Promise}
   */
  async _defaultRecovery(context) {
    // Try to restore from latest checkpoint
    const checkpoint = this.checkpoint.getLatest();
    
    if (checkpoint) {
      return {
        success: true,
        recoveredFrom: checkpoint.id,
        state: checkpoint.state
      };
    }

    return { success: false, error: 'No checkpoint available' };
  }

  /**
   * Degrade a service gracefully
   * @param {string} service - Service name
   * @param {string} reason - Reason for degradation
   * @param {number} severity - Severity level
   */
  degradeService(service, reason, severity = 1) {
    this.degradationManager.degrade(service, reason, severity);
    this.emit('service:degraded', { service, reason, severity });
  }

  /**
   * Restore a degraded service
   * @param {string} service - Service name
   */
  restoreService(service) {
    this.degradationManager.restore(service);
    this.emit('service:restored', { service });
  }

  /**
   * Register fallback for service
   * @param {string} service - Service name
   * @param {Function} handler - Fallback handler
   */
  registerFallback(service, handler) {
    this.degradationManager.registerFallback(service, handler);
  }

  /**
   * Execute with automatic fallback
   * @param {string} service - Service name
   * @param {Function} primary - Primary handler
   * @param {Object} args - Arguments
   * @returns {Promise}
   */
  async executeWithFallback(service, primary, args = {}) {
    return this.degradationManager.executeWithFallback(service, primary, args);
  }

  /**
   * Handle uncaught exception
   * @param {Error} error - Uncaught error
   */
  async handleUncaughtException(error) {
    this.healthMonitor.recordFailure(error);
    this.emit('uncaught:exception', { error, timestamp: Date.now() });
    
    // Create emergency checkpoint
    this.createCheckpoint('emergency', { error: error.message });
    
    // Attempt recovery
    return this.attemptRecovery('uncaught_exception', { error });
  }

  /**
   * Handle unhandled rejection
   * @param {Promise} promise - Rejected promise
   */
  async handleUnhandledRejection(reason) {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    this.healthMonitor.recordFailure(error);
    this.emit('unhandled:rejection', { reason, timestamp: Date.now() });
    
    return this.attemptRecovery('unhandled_rejection', { reason });
  }

  /**
   * Get health status
   * @returns {Object}
   */
  getHealthStatus() {
    return {
      health: this.healthMonitor.getMetrics(),
      degradedServices: Array.from(this.degradationManager.getAllDegraded().entries()),
      checkpoints: this.checkpoint.checkpoints.length,
      recoveryInProgress: this.recoveryInProgress,
      timestamp: Date.now()
    };
  }

  /**
   * Get checkpoints
   * @returns {Array}
   */
  getCheckpoints() {
    return this.checkpoint.getAll();
  }

  /**
   * Start auto checkpoint
   * @private
   */
  _startAutoCheckpoint() {
    this._checkpointInterval = setInterval(() => {
      this.emit('checkpoint:auto', { timestamp: Date.now() });
    }, this.config.checkpointInterval);
  }

  /**
   * Stop auto checkpoint
   */
  stopAutoCheckpoint() {
    if (this._checkpointInterval) {
      clearInterval(this._checkpointInterval);
      this._checkpointInterval = null;
    }
  }

  /**
   * Cleanup and shutdown
   */
  shutdown() {
    this.stopAutoCheckpoint();
    this.emit('shutdown', { timestamp: Date.now() });
  }
}

// Default singleton instance
let defaultRecovery = null;

/**
 * Get default auto-recovery instance
 * @returns {AutoRecovery}
 */
export function getAutoRecovery() {
  if (!defaultRecovery) {
    defaultRecovery = new AutoRecovery();
  }
  return defaultRecovery;
}

/**
 * Create new auto-recovery instance
 * @param {Object} options - Recovery options
 * @returns {AutoRecovery}
 */
export function createAutoRecovery(options) {
  return new AutoRecovery(options);
}

export default AutoRecovery; */