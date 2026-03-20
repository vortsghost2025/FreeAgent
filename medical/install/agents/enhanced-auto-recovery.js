/**
 * ENHANCED AUTO-RECOVERY SYSTEM
 * Production-grade automatic crash recovery and self-healing for Kilo Code YOLO
 * Features: State checkpointing, graceful degradation, self-healing mechanisms, proper error handling
 */

import { EventEmitter } from 'events';

/**
 * State Checkpoint - captures and restores system state with proper JSON handling
 */
class StateCheckpoint extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxCheckpoints = options.maxCheckpoints || 10;
    this.checkpoints = new Map();
    this.currentState = null;
    this.stats = {
      totalCreated: 0,
      totalRestored: 0,
      failedCreations: 0
    };
  }

  /**
   * Create a checkpoint with proper deep cloning
   * @param {string} name - Checkpoint name
   * @param {Object} state - State to save
   * @returns {Object} Checkpoint data
   */
  createCheckpoint(name, state) {
    try {
      // Validate and sanitize state before checkpointing
      const jsonSafeState = this._ensureJSONSafe(state);
      const clonedState = this._robustDeepClone(jsonSafeState);
      
      const checkpoint = {
        id: this._generateId(),
        name,
        state: clonedState,
        timestamp: Date.now(),
        createdAt: new Date().toISOString(),
        size: JSON.stringify(clonedState).length
      };

      this.checkpoints.set(checkpoint.id, checkpoint);
      this.currentState = checkpoint;
      this.stats.totalCreated++;

      // Maintain checkpoint limit with LRU eviction
      if (this.checkpoints.size > this.maxCheckpoints) {
        const oldestId = this.checkpoints.keys().next().value;
        this.checkpoints.delete(oldestId);
      }

      this.emit('checkpoint:created', checkpoint);
      return checkpoint;
      
    } catch (error) {
      this.stats.failedCreations++;
      this.emit('checkpoint:error', { error: error.message, state });
      throw new Error(`Failed to create checkpoint: ${error.message}`);
    }
  }

  /**
   * Restore from checkpoint
   * @param {string} checkpointId - Checkpoint ID
   * @returns {Object|null}
   */
  restoreCheckpoint(checkpointId) {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint ${checkpointId} not found`);
    }

    try {
      const restored = this._robustDeepClone(checkpoint.state);
      this.stats.totalRestored++;
      this.emit('checkpoint:restored', { checkpoint, restored });
      return restored;
    } catch (error) {
      this.emit('checkpoint:restore-error', { checkpointId, error: error.message });
      throw new Error(`Failed to restore checkpoint: ${error.message}`);
    }
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
    for (const checkpoint of this.checkpoints.values()) {
      if (checkpoint.name === name) {
        return checkpoint;
      }
    }
    return null;
  }

  /**
   * Get all checkpoints
   * @returns {Array}
   */
  getAll() {
    return Array.from(this.checkpoints.values());
  }

  /**
   * Delete a checkpoint
   * @param {string} id - Checkpoint ID
   */
  delete(id) {
    this.checkpoints.delete(id);
    if (this.currentState && this.currentState.id === id) {
      this.currentState = this.checkpoints.size > 0 
        ? Array.from(this.checkpoints.values()).pop() 
        : null;
    }
  }

  /**
   * Clear all checkpoints
   */
  clear() {
    this.checkpoints.clear();
    this.currentState = null;
    this.stats = {
      totalCreated: 0,
      totalRestored: 0,
      failedCreations: 0
    };
  }

  /**
   * Ensure state is JSON-safe before serialization
   * @param {Object} obj - Object to sanitize
   * @returns {Object}
   */
  _ensureJSONSafe(obj) {
    if (obj === null || obj === undefined) return obj;
    
    // Handle primitive types
    if (typeof obj !== 'object') return obj;
    
    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(item => this._ensureJSONSafe(item));
    }
    
    // Handle objects
    const safeObj = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip functions and undefined values
      if (typeof value === 'function' || value === undefined) continue;
      
      // Convert special types to JSON-safe representations
      if (value instanceof Date) {
        safeObj[key] = value.toISOString();
      } else if (value instanceof Map) {
        safeObj[key] = Object.fromEntries(value);
      } else if (value instanceof Set) {
        safeObj[key] = Array.from(value);
      } else if (typeof value === 'bigint') {
        safeObj[key] = value.toString();
      } else {
        safeObj[key] = this._ensureJSONSafe(value);
      }
    }
    
    return safeObj;
  }

  /**
   * Robust deep clone with circular reference handling
   * @param {Object} obj - Object to clone
   * @returns {Object}
   */
  _robustDeepClone(obj) {
    const seen = new WeakMap();
    
    function clone(item) {
      if (item === null || typeof item !== 'object') {
        return item;
      }
      
      if (seen.has(item)) {
        return seen.get(item);
      }
      
      let cloned;
      if (item instanceof Date) {
        cloned = new Date(item);
      } else if (item instanceof Array) {
        cloned = [];
        seen.set(item, cloned);
        for (let i = 0; i < item.length; i++) {
          cloned[i] = clone(item[i]);
        }
      } else {
        cloned = {};
        seen.set(item, cloned);
        for (const key in item) {
          if (item.hasOwnProperty(key)) {
            cloned[key] = clone(item[key]);
          }
        }
      }
      
      return cloned;
    }
    
    return clone(obj);
  }

  /**
   * Generate unique ID
   * @returns {string}
   */
  _generateId() {
    return `chk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get checkpoint statistics
   * @returns {Object}
   */
  getStats() {
    return {
      ...this.stats,
      activeCheckpoints: this.checkpoints.size,
      maxCheckpoints: this.maxCheckpoints,
      currentCheckpoint: this.currentState ? this.currentState.id : null
    };
  }
}

/**
 * Recovery Strategy - handles different failure scenarios with proper timeout/cancellation
 */
class RecoveryStrategy extends EventEmitter {
  constructor(type, handler, options = {}) {
    super();
    this.type = type;
    this.handler = handler;
    this.options = {
      maxRetries: options.maxRetries || 3,
      backoffMs: options.backoffMs || 1000,
      timeout: options.timeout || 30000,
      exponentialBackoff: options.exponentialBackoff !== false,
      ...options
    };
    this.abortController = null;
  }

  /**
   * Execute recovery with proper cancellation support
   * @param {Object} context - Recovery context
   * @returns {Promise}
   */
  async execute(context) {
    this.abortController = new AbortController();
    let lastError;
    
    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        // Add attempt info and abort signal to context
        const attemptContext = {
          ...context,
          attempt,
          maxRetries: this.options.maxRetries,
          timestamp: Date.now(),
          signal: this.abortController.signal
        };
        
        const result = await this._executeWithTimeout(
          this.handler(attemptContext),
          this.options.timeout,
          this.abortController.signal
        );
        
        this.emit('strategy:success', { 
          type: this.type, 
          attempt, 
          result,
          context: attemptContext 
        });
        
        return { 
          success: true, 
          result, 
          attempts: attempt,
          failureType: this.type
        };
        
      } catch (error) {
        lastError = error;
        
        if (attempt < this.options.maxRetries) {
          const delay = this.options.exponentialBackoff 
            ? this.options.backoffMs * Math.pow(2, attempt - 1)
            : this.options.backoffMs * attempt;
            
          this.emit('strategy:retry', { 
            type: this.type, 
            attempt, 
            delay, 
            error: error.message 
          });
          
          await this._sleep(delay);
        }
      }
    }

    this.emit('strategy:failed', { 
      type: this.type, 
      attempts: this.options.maxRetries, 
      error: lastError.message 
    });
    
    return { 
      success: false, 
      error: lastError.message, 
      attempts: this.options.maxRetries,
      failureType: this.type
    };
  }

  /**
   * Execute with timeout and cancellation support
   * @param {Promise} promise - Promise to execute
   * @param {number} ms - Timeout in ms
   * @param {AbortSignal} signal - Abort signal
   * @returns {Promise}
   */
  async _executeWithTimeout(promise, ms, signal = null) {
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Recovery timeout after ${ms}ms`));
      }, ms);
      
      // Clear timeout if aborted
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new Error('Recovery aborted'));
        });
      }
    });

    // Race promise against timeout
    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Sleep helper
   * @param {number} ms - Milliseconds
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Abort current execution
   */
  abort() {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Get strategy configuration
   * @returns {Object}
   */
  getConfig() {
    return {
      type: this.type,
      maxRetries: this.options.maxRetries,
      backoffMs: this.options.backoffMs,
      timeout: this.options.timeout,
      exponentialBackoff: this.options.exponentialBackoff
    };
  }
}

/**
 * Health Monitor - monitors system health with detailed metrics
 */
class RecoveryHealthMonitor extends EventEmitter {
  constructor() {
    super();
    this.metrics = {
      recoveryAttempts: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0,
      avgRecoveryTime: 0,
      checkpointCreations: 0,
      checkpointRestores: 0,
      degradationEvents: 0,
      serviceRestores: 0,
      startTime: Date.now(),
      lastFailure: null,
      lastRecovery: null,
      lastCheckpoint: null
    };
  }

  /**
   * Record a recovery attempt
   * @param {boolean} success - Whether recovery succeeded
   * @param {number} duration - Recovery duration in ms
   */
  recordRecovery(success = true, duration = 0) {
    this.metrics.recoveryAttempts++;
    if (success) {
      this.metrics.successfulRecoveries++;
      this.metrics.lastRecovery = Date.now();
    } else {
      this.metrics.failedRecoveries++;
    }
    
    // Update average recovery time
    this.metrics.avgRecoveryTime = (
      (this.metrics.avgRecoveryTime * (this.metrics.recoveryAttempts - 1) + duration) / 
      this.metrics.recoveryAttempts
    );
    
    this.emit('metrics:update', this.getMetrics());
  }

  /**
   * Record a failure
   * @param {Error} error - Error that occurred
   */
  recordFailure(error) {
    this.metrics.lastFailure = {
      error: error.message || String(error),
      timestamp: Date.now()
    };
    this.emit('failure:recorded', this.metrics.lastFailure);
  }

  /**
   * Record checkpoint operation
   * @param {string} operation - 'create' or 'restore'
   */
  recordCheckpoint(operation) {
    if (operation === 'create') {
      this.metrics.checkpointCreations++;
      this.metrics.lastCheckpoint = Date.now();
    } else if (operation === 'restore') {
      this.metrics.checkpointRestores++;
    }
    this.emit('checkpoint:recorded', { operation, timestamp: Date.now() });
  }

  /**
   * Record degradation event
   */
  recordDegradation() {
    this.metrics.degradationEvents++;
    this.emit('degradation:recorded', { timestamp: Date.now() });
  }

  /**
   * Record service restore
   */
  recordServiceRestore() {
    this.metrics.serviceRestores++;
    this.emit('service:restored', { timestamp: Date.now() });
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
    const uptime = this.getUptime();
    return {
      ...this.metrics,
      uptime,
      successRate: this.metrics.recoveryAttempts > 0 
        ? (this.metrics.successfulRecoveries / this.metrics.recoveryAttempts * 100).toFixed(1) + '%'
        : '0%',
      recoveryRate: this.metrics.recoveryAttempts > 0
        ? (this.metrics.recoveryAttempts / (uptime / 60000)).toFixed(2) + '/min'
        : '0/min',
      healthStatus: this.getHealthStatus()
    };
  }

  /**
   * Get health status
   * @returns {string}
   */
  getHealthStatus() {
    const successRate = this.metrics.recoveryAttempts > 0 
      ? (this.metrics.successfulRecoveries / this.metrics.recoveryAttempts * 100)
      : 100;
    
    if (successRate >= 95) return 'healthy';
    if (successRate >= 80) return 'degraded';
    return 'critical';
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      recoveryAttempts: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0,
      avgRecoveryTime: 0,
      checkpointCreations: 0,
      checkpointRestores: 0,
      degradationEvents: 0,
      serviceRestores: 0,
      startTime: Date.now(),
      lastFailure: null,
      lastRecovery: null,
      lastCheckpoint: null
    };
    this.emit('metrics:reset', { timestamp: Date.now() });
  }
}

/**
 * Graceful Degradation Manager with proper fallback execution
 */
class DegradationManager extends EventEmitter {
  constructor() {
    super();
    this.services = new Map();
    this.fallbacks = new Map();
    this.stats = {
      degradationEvents: 0,
      fallbackExecutions: 0,
      servicesRecovered: 0,
      totalDegradedServices: 0
    };
  }

  /**
   * Mark a service as degraded
   * @param {string} serviceName - Service name
   * @param {string} reason - Degradation reason
   * @param {number} severity - Severity level (1-5)
   */
  degradeService(serviceName, reason, severity = 1) {
    const service = {
      degraded: true,
      reason,
      severity,
      degradedAt: Date.now(),
      fallbackCount: 0,
      lastAttempt: null
    };
    
    this.services.set(serviceName, service);
    this.stats.degradationEvents++;
    this.stats.totalDegradedServices = this.services.size;
    
    this.emit('service:degraded', { serviceName, reason, severity, timestamp: Date.now() });
  }

  /**
   * Restore a service
   * @param {string} serviceName - Service name
   */
  restoreService(serviceName) {
    const service = this.services.get(serviceName);
    if (service) {
      service.degraded = false;
      service.restoredAt = Date.now();
      this.stats.servicesRecovered++;
      this.emit('service:recovered', { serviceName, timestamp: Date.now() });
    }
  }

  /**
   * Check if service is degraded
   * @param {string} serviceName - Service name
   * @returns {boolean}
   */
  isDegraded(serviceName) {
    const service = this.services.get(serviceName);
    return service ? service.degraded : false;
  }

  /**
   * Get degradation status
   * @param {string} serviceName - Service name
   * @returns {Object|null}
   */
  getStatus(serviceName) {
    return this.services.get(serviceName) || { degraded: false };
  }

  /**
   * Get all degraded services
   * @returns {Array}
   */
  getAllDegraded() {
    return Array.from(this.services.entries())
      .filter(([_, service]) => service.degraded)
      .map(([name, service]) => ({ name, ...service }));
  }

  /**
   * Register fallback handler
   * @param {string} serviceName - Service name
   * @param {Function} handler - Fallback handler
   */
  registerFallback(serviceName, handler) {
    this.fallbacks.set(serviceName, handler);
  }

  /**
   * Get fallback handler
   * @param {string} serviceName - Service name
   * @returns {Function|null}
   */
  getFallback(serviceName) {
    return this.fallbacks.get(serviceName) || null;
  }

  /**
   * Execute with fallback support using ...args for transparent forwarding
   * @param {string} serviceName - Service name
   * @param {Function} primaryFn - Primary handler
   * @param {...any} args - Arguments to pass
   * @returns {Promise}
   */
  async executeWithFallback(serviceName, primaryFn, ...args) {
    if (this.isDegraded(serviceName)) {
      const fallback = this.getFallback(serviceName);
      if (fallback) {
        this.stats.fallbackExecutions++;
        const service = this.services.get(serviceName);
        service.fallbackCount++;
        service.lastAttempt = Date.now();
        
        this.emit('service:fallback', { serviceName, args, timestamp: Date.now() });
        return await fallback(...args);
      }
      
      throw new Error(`Service ${serviceName} is degraded and no fallback available`);
    }

    return await primaryFn(...args);
  }

  /**
   * Get degradation statistics
   * @returns {Object}
   */
  getStats() {
    return {
      ...this.stats,
      activeDegradedServices: this.getAllDegraded().length,
      totalServices: this.services.size,
      fallbackHandlers: this.fallbacks.size
    };
  }
}

/**
 * Main Auto-Recovery System with enhanced process handling
 */
export class AutoRecovery extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Core components
    this.stateCheckpoint = new StateCheckpoint(options.checkpoint);
    this.recoveryStrategy = new RecoveryStrategy('default', this._defaultRecovery.bind(this), options.strategy);
    this.healthMonitor = new RecoveryHealthMonitor();
    this.degradationManager = new DegradationManager();
    
    // Configuration
    this.config = {
      autoRecovery: options.autoRecovery !== false,
      autoCheckpoint: options.autoCheckpoint !== false,
      getState: options.getState || (() => ({})),
      checkpointInterval: options.checkpointInterval || 60000,
      maxRetries: options.maxRetries || 3,
      ...options
    };
    
    // Internal state
    this._checkpointInterval = null;
    this._isInitialized = false;
    this._registeredStrategies = new Map();
    this._processHandlers = {
      uncaughtException: null,
      unhandledRejection: null,
      sigterm: null,
      sigint: null
    };
    
    // Wire up component events
    this._setupEventForwarding();
  }

  _setupEventForwarding() {
    // Forward checkpoint events
    this.stateCheckpoint.on('checkpoint:created', (cp) => {
      this.healthMonitor.recordCheckpoint('create');
      this.emit('checkpoint:created', cp);
    });
    
    this.stateCheckpoint.on('checkpoint:restored', (data) => {
      this.healthMonitor.recordCheckpoint('restore');
      this.emit('checkpoint:restored', data);
    });
    
    this.stateCheckpoint.on('checkpoint:error', (error) => {
      this.emit('checkpoint:error', error);
    });
    
    // Forward recovery events
    this.recoveryStrategy.on('strategy:success', (data) => {
      this.healthMonitor.recordRecovery(true);
      this.emit('recovery:success', data);
    });
    
    this.recoveryStrategy.on('strategy:failed', (data) => {
      this.healthMonitor.recordRecovery(false);
      this.emit('recovery:failed', data);
    });
    
    // Forward service events
    this.degradationManager.on('service:degraded', (data) => {
      this.healthMonitor.recordDegradation();
      this.emit('service:degraded', data);
    });
    
    this.degradationManager.on('service:recovered', (data) => {
      this.healthMonitor.recordServiceRestore();
      this.emit('service:recovered', data);
    });
  }

  /**
   * Initialize the recovery system
   */
  async initialize() {
    if (this._isInitialized) return this;
    
    console.log('🔄 Initializing Enhanced Auto Recovery System...');
    
    // Start auto-checkpointing if enabled
    if (this.config.autoCheckpoint) {
      this._startAutoCheckpoint();
    }
    
    // Set up process-level error handling
    if (this.config.autoRecovery) {
      this._setupProcessHandlers();
    }
    
    this._isInitialized = true;
    this.emit('recovery:initialized', { timestamp: Date.now() });
    
    console.log('✅ Enhanced Auto Recovery System initialized');
    return this;
  }

  _startAutoCheckpoint() {
    this._checkpointInterval = setInterval(() => {
      try {
        const state = this.config.getState();
        const checkpoint = this.stateCheckpoint.createCheckpoint('auto', state);
        this.emit('checkpoint:auto', { 
          checkpoint, 
          timestamp: Date.now(),
          stateSize: JSON.stringify(state).length 
        });
        console.log(`💾 Auto-checkpoint created: ${checkpoint.id}`);
      } catch (error) {
        console.error('❌ Auto-checkpoint failed:', error.message);
        this.emit('checkpoint:error', { error: error.message });
      }
    }, this.config.checkpointInterval);
  }

  _setupProcessHandlers() {
    // Handle uncaught exceptions
    this._processHandlers.uncaughtException = async (error) => {
      console.error('💥 Uncaught Exception:', error.message);
      await this.handleUncaughtException(error);
    };
    process.on('uncaughtException', this._processHandlers.uncaughtException);
    
    // Handle unhandled rejections (updated JSDoc)
    this._processHandlers.unhandledRejection = async (reason) => {
      console.error('💥 Unhandled Rejection:', reason);
      await this.handleUnhandledRejection(reason);
    };
    process.on('unhandledRejection', this._processHandlers.unhandledRejection);
    
    // Handle graceful shutdown
    this._processHandlers.sigterm = async () => {
      console.log('🛑 SIGTERM received, shutting down gracefully...');
      await this.shutdown();
    };
    process.on('SIGTERM', this._processHandlers.sigterm);
    
    this._processHandlers.sigint = async () => {
      console.log('🛑 SIGINT received, shutting down gracefully...');
      await this.shutdown();
    };
    process.on('SIGINT', this._processHandlers.sigint);
  }

  /**
   * Register a recovery strategy
   * @param {string} failureType - Failure type
   * @param {Function} handler - Recovery handler
   * @param {Object} options - Strategy options
   */
  registerStrategy(failureType, handler, options = {}) {
    const strategy = new RecoveryStrategy(failureType, handler, options);
    
    // Forward strategy events
    strategy.on('strategy:success', (data) => {
      this.emit('recovery:success', data);
    });
    
    strategy.on('strategy:failed', (data) => {
      this.emit('recovery:failed', data);
    });
    
    this._registeredStrategies.set(failureType, strategy);
    this.emit('strategy:registered', { failureType, options });
  }

  /**
   * Attempt recovery for a specific failure
   * @param {string} failureType - Type of failure to recover from
   * @param {Object} context - Context information for recovery
   */
  async attemptRecovery(failureType, context = {}) {
    console.log(`🔄 Attempting recovery for: ${failureType}`);
    
    const startTime = Date.now();
    
    // Check for registered strategy first
    const strategy = this._registeredStrategies.get(failureType);
    let result;
    
    if (strategy) {
      result = await strategy.execute(context);
    } else {
      // Use default recovery
      result = await this.recoveryStrategy.execute({ ...context, failureType });
    }
    
    const duration = Date.now() - startTime;
    
    // Only record successful recoveries
    if (result.success) {
      this.healthMonitor.recordRecovery(true, duration);
      this.emit('recovery:completed', { ...result, duration });
    } else {
      this.healthMonitor.recordRecovery(false, duration);
      this.emit('recovery:failed', { ...result, duration });
    }
    
    return result;
  }

  /**
   * Handle uncaught exception
   * @param {Error} error - The uncaught error
   */
  async handleUncaughtException(error) {
    const context = {
      error: error.message,
      stack: error.stack,
      timestamp: Date.now(),
      process: 'main'
    };
    
    return this.attemptRecovery('uncaught_exception', context);
  }

  /**
   * Handle unhandled rejection
   * @param {any} reason - The rejection reason (updated param name)
   */
  async handleUnhandledRejection(reason) {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    const context = {
      reason: error.message,
      stack: error.stack,
      timestamp: Date.now(),
      process: 'promise'
    };
    
    return this.attemptRecovery('unhandled_rejection', context);
  }

  /**
   * Default recovery strategy
   * @param {Object} context - Recovery context
   */
  async _defaultRecovery(context) {
    // Try to restore from latest checkpoint
    const checkpoint = this.stateCheckpoint.getLatest();
    
    if (checkpoint) {
      return {
        success: true,
        recoveredFrom: checkpoint.id,
        state: checkpoint.state,
        method: 'checkpoint_restore'
      };
    }

    return { 
      success: false, 
      error: 'No checkpoint available',
      method: 'default'
    };
  }

  /**
   * Execute with fallback support
   */
  async executeWithFallback(serviceName, primaryFn, ...args) {
    return this.degradationManager.executeWithFallback(serviceName, primaryFn, ...args);
  }

  /**
   * Degrade a service
   */
  degradeService(serviceName, reason, severity = 1) {
    this.degradationManager.degradeService(serviceName, reason, severity);
  }

  /**
   * Restore a service
   */
  restoreService(serviceName) {
    this.degradationManager.restoreService(serviceName);
  }

  /**
   * Create manual checkpoint
   */
  createCheckpoint(name, state) {
    return this.stateCheckpoint.createCheckpoint(name, state);
  }

  /**
   * Restore from checkpoint
   */
  async restoreFromCheckpoint(checkpointId) {
    return this.stateCheckpoint.restoreCheckpoint(checkpointId);
  }

  /**
   * Restore from latest checkpoint
   */
  async restoreFromLatest() {
    const checkpoint = this.stateCheckpoint.getLatest();
    if (!checkpoint) return null;
    return this.stateCheckpoint.restoreCheckpoint(checkpoint.id);
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('🔄 Shutting down Enhanced Auto Recovery System...');
    
    // Clear checkpoint interval
    if (this._checkpointInterval) {
      clearInterval(this._checkpointInterval);
    }
    
    // Remove process handlers
    if (this._processHandlers.uncaughtException) {
      process.removeListener('uncaughtException', this._processHandlers.uncaughtException);
    }
    if (this._processHandlers.unhandledRejection) {
      process.removeListener('unhandledRejection', this._processHandlers.unhandledRejection);
    }
    if (this._processHandlers.sigterm) {
      process.removeListener('SIGTERM', this._processHandlers.sigterm);
    }
    if (this._processHandlers.sigint) {
      process.removeListener('SIGINT', this._processHandlers.sigint);
    }
    
    // Create final checkpoint
    try {
      const finalState = this.config.getState();
      const finalCheckpoint = this.stateCheckpoint.createCheckpoint('shutdown', finalState);
      console.log(`💾 Final checkpoint created: ${finalCheckpoint.id}`);
    } catch (error) {
      console.error('❌ Final checkpoint failed:', error.message);
    }
    
    this.emit('recovery:shutdown', { timestamp: Date.now() });
    console.log('✅ Enhanced Auto Recovery System shutdown complete');
  }

  /**
   * Get system status
   */
  getStatus() {
    return {
      initialized: this._isInitialized,
      config: this.config,
      components: {
        checkpoint: this.stateCheckpoint.getStats(),
        recovery: this.recoveryStrategy.getConfig(),
        health: this.healthMonitor.getMetrics(),
        degradation: this.degradationManager.getStats()
      },
      strategies: Array.from(this._registeredStrategies.keys()),
      health: this.healthMonitor.getHealthStatus()
    };
  }

  /**
   * Get detailed diagnostics
   */
  getDiagnostics() {
    return {
      timestamp: Date.now(),
      system: this.getStatus(),
      checkpoints: this.stateCheckpoint.getAll(),
      degradedServices: this.degradationManager.getAllDegraded(),
      healthHistory: {
        lastFailure: this.healthMonitor.metrics.lastFailure,
        lastRecovery: this.healthMonitor.metrics.lastRecovery,
        lastCheckpoint: this.healthMonitor.metrics.lastCheckpoint
      }
    };
  }
}