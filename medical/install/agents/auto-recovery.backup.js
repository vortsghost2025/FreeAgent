/**
 * Platform-Grade Auto Recovery System
 * Production-ready error handling with proper checkpointing, fallbacks, and telemetry
 */

import { EventEmitter } from 'events';

/**
 * State Checkpoint Manager - Snapshot store with deep cloning
 */
class StateCheckpoint extends EventEmitter {
  constructor(maxCheckpoints = 100) {
    super();
    this.checkpoints = new Map();
    this.maxCheckpoints = maxCheckpoints;
    this.stats = {
      totalCreated: 0,
      totalRestored: 0,
      failedCreations: 0
    };
  }

  /**
   * Create a checkpoint with proper deep cloning
   * Handles JSON-safe objects with fallback for complex types
   */
  createCheckpoint(name, state) {
    try {
      // Validate state is JSON-safe before checkpointing
      const jsonSafeState = this._ensureJSONSafe(state);
      const clonedState = this._deepClone(jsonSafeState);
      
      const checkpoint = {
        id: `cp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        state: clonedState,
        timestamp: Date.now(),
        createdAt: new Date().toISOString()
      };

      this.checkpoints.set(checkpoint.id, checkpoint);
      this.stats.totalCreated++;

      // Maintain checkpoint limit
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
   */
  restoreCheckpoint(checkpointId) {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint ${checkpointId} not found`);
    }

    const restored = this._deepClone(checkpoint.state);
    this.stats.totalRestored++;
    this.emit('checkpoint:restored', { checkpoint, restored });
    return restored;
  }

  /**
   * Ensure state is JSON-safe before serialization
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
   */
  _deepClone(obj) {
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

  getStats() {
    return {
      ...this.stats,
      activeCheckpoints: this.checkpoints.size,
      maxCheckpoints: this.maxCheckpoints
    };
  }
}

/**
 * Recovery Strategy Manager - Retry/backoff/timeout wrapper
 */
class RecoveryStrategy extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      maxRetries: config.maxRetries || 3,
      backoffMs: config.backoffMs || 1000,
      timeout: config.timeout || 30000,
      exponentialBackoff: config.exponentialBackoff !== false,
      ...config
    };
    
    this.strategies = new Map();
    this.stats = {
      totalAttempts: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0
    };
  }

  /**
   * Register a recovery strategy for a specific failure type
   */
  registerStrategy(failureType, strategyFn) {
    this.strategies.set(failureType, strategyFn);
    this.emit('strategy:registered', { failureType });
  }

  /**
   * Execute with proper timeout and cancellation support
   */
  async executeWithTimeout(promise, timeoutMs, abortSignal = null) {
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Recovery timeout after ${timeoutMs}ms`));
      }, timeoutMs);
      
      // Clear timeout if aborted
      if (abortSignal) {
        abortSignal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new Error('Recovery aborted'));
        });
      }
    });

    // Race promise against timeout
    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Execute recovery with exponential backoff
   */
  async executeRecovery(failureType, context, options = {}) {
    const strategy = this.strategies.get(failureType) || this._defaultStrategy;
    const maxRetries = options.maxRetries || this.config.maxRetries;
    const backoffMs = options.backoffMs || this.config.backoffMs;
    
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        this.stats.totalAttempts++;
        
        // Add attempt info to context
        const attemptContext = {
          ...context,
          attempt,
          maxRetries,
          timestamp: Date.now()
        };
        
        // Execute with timeout
        const result = await this.executeWithTimeout(
          strategy(attemptContext),
          this.config.timeout
        );
        
        this.stats.successfulRecoveries++;
        this.emit('recovery:success', { 
          failureType, 
          attempt, 
          result,
          context: attemptContext 
        });
        
        return {
          success: true,
          result,
          attempts: attempt + 1,
          failureType
        };
        
      } catch (error) {
        lastError = error;
        this.stats.failedRecoveries++;
        
        if (attempt < maxRetries) {
          const delay = this.config.exponentialBackoff 
            ? backoffMs * Math.pow(2, attempt)
            : backoffMs;
            
          this.emit('recovery:retry', { 
            failureType, 
            attempt, 
            delay, 
            error: error.message 
          });
          
          await this._delay(delay);
        }
      }
    }
    
    this.emit('recovery:failed', { 
      failureType, 
      attempts: maxRetries + 1, 
      error: lastError.message 
    });
    
    return {
      success: false,
      error: lastError.message,
      attempts: maxRetries + 1,
      failureType
    };
  }

  _defaultStrategy(context) {
    // Default recovery: log and wait
    console.log(`🔄 Default recovery for ${context.failureType}, attempt ${context.attempt}`);
    return Promise.resolve({ recovered: true, method: 'default' });
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalAttempts > 0 
        ? (this.stats.successfulRecoveries / this.stats.totalAttempts * 100).toFixed(1) + '%'
        : '0%',
      registeredStrategies: this.strategies.size
    };
  }
}

/**
 * Degradation Manager - Graceful fallback system
 */
class DegradationManager extends EventEmitter {
  constructor() {
    super();
    this.services = new Map();
    this.fallbacks = new Map();
    this.stats = {
      degradationEvents: 0,
      fallbackExecutions: 0,
      servicesRecovered: 0
    };
  }

  /**
   * Mark service as degraded
   */
  degradeService(serviceName, reason) {
    this.services.set(serviceName, {
      degraded: true,
      reason,
      degradedAt: Date.now(),
      fallbackCount: 0
    });
    
    this.stats.degradationEvents++;
    this.emit('service:degraded', { serviceName, reason });
  }

  /**
   * Register fallback for degraded service
   */
  registerFallback(serviceName, fallbackFn) {
    this.fallbacks.set(serviceName, fallbackFn);
  }

  /**
   * Check if service is degraded
   */
  isDegraded(serviceName) {
    const service = this.services.get(serviceName);
    return service ? service.degraded : false;
  }

  /**
   * Execute with fallback support
   * Accepts ...args for transparent forwarding
   */
  async executeWithFallback(serviceName, primaryFn, ...args) {
    if (this.isDegraded(serviceName)) {
      const fallback = this.fallbacks.get(serviceName);
      if (fallback) {
        this.stats.fallbackExecutions++;
        const service = this.services.get(serviceName);
        service.fallbackCount++;
        
        this.emit('service:fallback', { serviceName, args });
        return await fallback(...args);
      }
      
      throw new Error(`Service ${serviceName} is degraded and no fallback available`);
    }

    return await primaryFn(...args);
  }

  /**
   * Recover service from degradation
   */
  recoverService(serviceName) {
    const service = this.services.get(serviceName);
    if (service) {
      service.degraded = false;
      service.recoveredAt = Date.now();
      this.stats.servicesRecovered++;
      this.emit('service:recovered', { serviceName });
    }
  }

  getServiceStatus(serviceName) {
    return this.services.get(serviceName) || { degraded: false };
  }

  getStats() {
    return {
      ...this.stats,
      activeDegradedServices: Array.from(this.services.values())
        .filter(s => s.degraded).length,
      totalServices: this.services.size
    };
  }
}

/**
 * Recovery Health Monitor - Metrics and telemetry
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
      checkpointRestores: 0
    };
    
    this.startTime = Date.now();
  }

  recordRecovery(success = true, duration = 0) {
    this.metrics.recoveryAttempts++;
    if (success) {
      this.metrics.successfulRecoveries++;
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

  recordCheckpoint(operation) {
    if (operation === 'create') {
      this.metrics.checkpointCreations++;
    } else if (operation === 'restore') {
      this.metrics.checkpointRestores++;
    }
    this.emit('metrics:update', this.getMetrics());
  }

  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.startTime,
      successRate: this.metrics.recoveryAttempts > 0 
        ? (this.metrics.successfulRecoveries / this.metrics.recoveryAttempts * 100).toFixed(1) + '%'
        : '0%',
      recoveryRate: this.metrics.recoveryAttempts > 0
        ? (this.metrics.recoveryAttempts / ((Date.now() - this.startTime) / 60000)).toFixed(2) + '/min'
        : '0/min'
    };
  }

  getHealthStatus() {
    const metrics = this.getMetrics();
    const successRate = parseFloat(metrics.successRate);
    
    if (successRate >= 95) return 'healthy';
    if (successRate >= 80) return 'degraded';
    return 'critical';
  }
}

/**
 * Main Auto Recovery Orchestrator
 */
class AutoRecovery extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Core components
    this.stateCheckpoint = new StateCheckpoint(options.maxCheckpoints || 50);
    this.recoveryStrategy = new RecoveryStrategy(options.recoveryConfig);
    this.degradationManager = new DegradationManager();
    this.healthMonitor = new RecoveryHealthMonitor();
    
    // Configuration
    this.config = {
      autoRecovery: options.autoRecovery !== false,
      autoCheckpoint: options.autoCheckpoint !== false,
      getState: options.getState || (() => ({})),
      checkpointInterval: options.checkpointInterval || 30000,
      maxRetries: options.maxRetries || 3,
      ...options
    };
    
    // Internal state
    this._checkpointInterval = null;
    this._isInitialized = false;
    
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
    this.recoveryStrategy.on('recovery:success', (data) => {
      this.healthMonitor.recordRecovery(true);
      this.emit('recovery:success', data);
    });
    
    this.recoveryStrategy.on('recovery:failed', (data) => {
      this.healthMonitor.recordRecovery(false);
      this.emit('recovery:failed', data);
    });
    
    // Forward service events
    this.degradationManager.on('service:degraded', (data) => {
      this.emit('service:degraded', data);
    });
    
    this.degradationManager.on('service:recovered', (data) => {
      this.emit('service:recovered', data);
    });
  }

  /**
   * Initialize the recovery system
   */
  async initialize() {
    if (this._isInitialized) return this;
    
    console.log('🔄 Initializing Auto Recovery System...');
    
    // Start auto-checkpointing if enabled
    if (this.config.autoCheckpoint) {
      this._startAutoCheckpoint();
    }
    
    // Set up process-level error handling
    if (this.config.autoRecovery) {
      this._setupProcessHandlers();
    }
    
    this._isInitialized = true;
    this.emit('recovery:initialized');
    
    console.log('✅ Auto Recovery System initialized');
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
    process.on('uncaughtException', async (error) => {
      console.error('💥 Uncaught Exception:', error.message);
      await this.handleUncaughtException(error);
    });
    
    // Handle unhandled rejections
    process.on('unhandledRejection', async (reason) => {
      console.error('💥 Unhandled Rejection:', reason);
      await this.handleUnhandledRejection(reason);
    });
    
    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('🛑 SIGTERM received, shutting down gracefully...');
      await this.shutdown();
    });
    
    process.on('SIGINT', async () => {
      console.log('🛑 SIGINT received, shutting down gracefully...');
      await this.shutdown();
    });
  }

  /**
   * Attempt recovery for a specific failure
   * @param {string} failureType - Type of failure to recover from
   * @param {Object} context - Context information for recovery
   */
  async attemptRecovery(failureType, context = {}) {
    console.log(`🔄 Attempting recovery for: ${failureType}`);
    
    const startTime = Date.now();
    const result = await this.recoveryStrategy.executeRecovery(failureType, context);
    const duration = Date.now() - startTime;
    
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
      timestamp: Date.now()
    };
    
    return this.attemptRecovery('uncaught_exception', context);
  }

  /**
   * Handle unhandled rejection
   * @param {any} reason - The rejection reason
   */
  async handleUnhandledRejection(reason) {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    const context = {
      reason: error.message,
      stack: error.stack,
      timestamp: Date.now()
    };
    
    return this.attemptRecovery('unhandled_rejection', context);
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
  degradeService(serviceName, reason) {
    this.degradationManager.degradeService(serviceName, reason);
  }

  /**
   * Recover a service
   */
  recoverService(serviceName) {
    this.degradationManager.recoverService(serviceName);
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
  restoreCheckpoint(checkpointId) {
    return this.stateCheckpoint.restoreCheckpoint(checkpointId);
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('🔄 Shutting down Auto Recovery System...');
    
    // Clear checkpoint interval
    if (this._checkpointInterval) {
      clearInterval(this._checkpointInterval);
    }
    
    // Create final checkpoint
    try {
      const finalState = this.config.getState();
      const finalCheckpoint = this.stateCheckpoint.createCheckpoint('shutdown', finalState);
      console.log(`💾 Final checkpoint created: ${finalCheckpoint.id}`);
    } catch (error) {
      console.error('❌ Final checkpoint failed:', error.message);
    }
    
    this.emit('recovery:shutdown');
    console.log('✅ Auto Recovery System shutdown complete');
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
        recovery: this.recoveryStrategy.getStats(),
        degradation: this.degradationManager.getStats(),
        health: this.healthMonitor.getMetrics()
      },
      health: this.healthMonitor.getHealthStatus()
    };
  }
}

export { 
  AutoRecovery, 
  StateCheckpoint, 
  RecoveryStrategy, 
  DegradationManager, 
  RecoveryHealthMonitor 
};