/**
 * Iteration Governor - Safety mechanism for preventing runaway agent loops
 * 
 * Features:
 * - Track iteration counts per agent/task
 * - Configurable max iteration limits (default: 10 for simple tasks, 50 for complex)
 * - Per-agent limits support (different agents can have different limits)
 * - Circuit breaker pattern - if errors exceed threshold, pause the agent
 * - Warning logs when approaching limits
 * 
 * Methods:
 * - checkLimit(agentId, taskType): Check if agent can continue
 * - recordIteration(agentId, taskType): Record an iteration
 * - getStatus(agentId): Get current status for an agent
 * - reset(agentId): Reset state for an agent
 * - tripCircuitBreaker(agentId, reason): Manually trip the circuit breaker
 */

class IterationGovernor {
  constructor(options = {}) {
    // Default limits
    this.defaultSimpleLimit = options.simpleLimit || 10;
    this.defaultComplexLimit = options.complexLimit || 50;
    
    // Per-agent limits override
    this.agentLimits = options.agentLimits || {};
    
    // Circuit breaker settings
    this.circuitBreakerThreshold = options.circuitBreakerThreshold || 5; // errors before tripping
    this.circuitBreakerResetTime = options.circuitBreakerResetTime || 60000; // 60 seconds
    
    // Warning threshold (percentage of limit at which to warn)
    this.warningThreshold = options.warningThreshold || 0.8; // 80% of limit
    
    // State storage
    this.state = new Map(); // agentId -> { iterations, errors, circuitBreakerOpen, lastErrorTime, taskType }
    
    // Event callbacks
    this.onLimitWarning = options.onLimitWarning || null;
    this.onLimitExceeded = options.onLimitExceeded || null;
    this.onCircuitBreakerTripped = options.onCircuitBreakerTripped || null;
    
    // Logger
    this.logger = options.logger || console;
  }

  /**
   * Get the max iteration limit for an agent
   * @param {string} agentId - The agent identifier
   * @param {string} taskType - Type of task ('simple' or 'complex')
   * @returns {number} - Maximum iterations allowed
   */
  getLimit(agentId, taskType = 'simple') {
    // Check per-agent override first
    if (this.agentLimits[agentId]) {
      return this.agentLimits[agentId];
    }
    // Fall back to task type defaults
    return taskType === 'complex' ? this.defaultComplexLimit : this.defaultSimpleLimit;
  }

  /**
   * Initialize state for an agent if not exists
   * @param {string} agentId - The agent identifier
   * @param {string} taskType - Type of task
   */
  _ensureState(agentId, taskType = 'simple') {
    if (!this.state.has(agentId)) {
      this.state.set(agentId, {
        iterations: 0,
        errors: 0,
        circuitBreakerOpen: false,
        circuitBreakerOpenedAt: null,
        taskType: taskType,
        lastResetAt: Date.now()
      });
    }
    // Update task type if provided
    const state = this.state.get(agentId);
    if (taskType && state.taskType !== taskType) {
      state.taskType = taskType;
    }
  }

  /**
   * Check if an agent can continue executing
   * @param {string} agentId - The agent identifier
   * @param {string} taskType - Type of task ('simple' or 'complex')
   * @returns {object} - { allowed: boolean, reason?: string, status: object }
   */
  checkLimit(agentId, taskType = 'simple') {
    this._ensureState(agentId, taskType);
    const state = this.state.get(agentId);
    const maxLimit = this.getLimit(agentId, taskType);
    
    // Check circuit breaker first
    if (state.circuitBreakerOpen) {
      // Check if circuit breaker should be reset
      if (Date.now() - state.circuitBreakerOpenedAt > this.circuitBreakerResetTime) {
        // Auto-reset circuit breaker after reset time
        state.circuitBreakerOpen = false;
        state.circuitBreakerOpenedAt = null;
        state.errors = 0; // Reset error count
        this.logger.log(`[IterationGovernor] Circuit breaker auto-reset for agent: ${agentId}`);
      } else {
        return {
          allowed: false,
          reason: `Circuit breaker is open for agent: ${agentId}. Too many errors occurred.`,
          status: this.getStatus(agentId)
        };
      }
    }
    
    // Check iteration limit
    if (state.iterations >= maxLimit) {
      return {
        allowed: false,
        reason: `Iteration limit exceeded for agent: ${agentId} (${state.iterations}/${maxLimit})`,
        status: this.getStatus(agentId)
      };
    }
    
    // Warning if approaching limit
    const warningAt = Math.floor(maxLimit * this.warningThreshold);
    if (state.iterations >= warningAt) {
      const warningMsg = `[IterationGovernor] ⚠️  Agent ${agentId} approaching limit: ${state.iterations}/${maxLimit} (${Math.round((state.iterations / maxLimit) * 100)}%)`;
      this.logger.log(warningMsg);
      
      if (this.onLimitWarning) {
        this.onLimitWarning(agentId, state.iterations, maxLimit);
      }
    }
    
    return {
      allowed: true,
      status: this.getStatus(agentId)
    };
  }

  /**
   * Record an iteration for an agent
   * @param {string} agentId - The agent identifier
   * @param {string} taskType - Type of task ('simple' or 'complex')
   * @returns {object} - Updated status
   */
  recordIteration(agentId, taskType = 'simple') {
    this._ensureState(agentId, taskType);
    const state = this.state.get(agentId);
    
    state.iterations += 1;
    state.taskType = taskType;
    
    // Check if limit exceeded after recording
    const maxLimit = this.getLimit(agentId, taskType);
    if (state.iterations >= maxLimit) {
      const msg = `[IterationGovernor] ❌ Agent ${agentId} has reached iteration limit: ${state.iterations}/${maxLimit}`;
      this.logger.log(msg);
      
      if (this.onLimitExceeded) {
        this.onLimitExceeded(agentId, state.iterations, maxLimit);
      }
    }
    
    return this.getStatus(agentId);
  }

  /**
   * Record an error for an agent (for circuit breaker)
   * @param {string} agentId - The agent identifier
   * @param {string} errorReason - Optional reason for the error
   * @returns {object} - Updated status
   */
  recordError(agentId, errorReason = '') {
    this._ensureState(agentId);
    const state = this.state.get(agentId);
    
    state.errors += 1;
    state.lastErrorTime = Date.now();
    
    this.logger.log(`[IterationGovernor] Error recorded for ${agentId}: ${state.errors}/${this.circuitBreakerThreshold}${errorReason ? ` - ${errorReason}` : ''}`);
    
    // Check if circuit breaker should trip
    if (state.errors >= this.circuitBreakerThreshold && !state.circuitBreakerOpen) {
      return this.tripCircuitBreaker(agentId, `Error threshold exceeded: ${state.errors} errors`);
    }
    
    return this.getStatus(agentId);
  }

  /**
   * Manually trip the circuit breaker for an agent
   * @param {string} agentId - The agent identifier
   * @param {string} reason - Reason for tripping
   * @returns {object} - Updated status
   */
  tripCircuitBreaker(agentId, reason = 'Manual trip') {
    this._ensureState(agentId);
    const state = this.state.get(agentId);
    
    state.circuitBreakerOpen = true;
    state.circuitBreakerOpenedAt = Date.now();
    
    const msg = `[IterationGovernor] 🔴 Circuit breaker TRIPPED for agent: ${agentId} - ${reason}`;
    this.logger.log(msg);
    
    if (this.onCircuitBreakerTripped) {
      this.onCircuitBreakerTripped(agentId, reason);
    }
    
    return {
      allowed: false,
      reason: `Circuit breaker tripped for agent: ${agentId}. ${reason}`,
      status: this.getStatus(agentId)
    };
  }

  /**
   * Reset state for an agent
   * @param {string} agentId - The agent identifier
   * @returns {boolean} - Success
   */
  reset(agentId) {
    if (this.state.has(agentId)) {
      const state = this.state.get(agentId);
      state.iterations = 0;
      state.errors = 0;
      state.circuitBreakerOpen = false;
      state.circuitBreakerOpenedAt = null;
      state.lastResetAt = Date.now();
      
      this.logger.log(`[IterationGovernor] Reset state for agent: ${agentId}`);
      return true;
    }
    return false;
  }

  /**
   * Get current status for an agent
   * @param {string} agentId - The agent identifier
   * @returns {object} - Current status
   */
  getStatus(agentId) {
    if (!this.state.has(agentId)) {
      return {
        agentId,
        initialized: false,
        iterations: 0,
        errors: 0,
        limit: this.defaultSimpleLimit,
        circuitBreakerOpen: false,
        taskType: 'simple'
      };
    }
    
    const state = this.state.get(agentId);
    const maxLimit = this.getLimit(agentId, state.taskType);
    
    return {
      agentId,
      initialized: true,
      iterations: state.iterations,
      errors: state.errors,
      limit: maxLimit,
      limitPercentage: Math.round((state.iterations / maxLimit) * 100),
      circuitBreakerOpen: state.circuitBreakerOpen,
      circuitBreakerOpenedAt: state.circuitBreakerOpenedAt,
      taskType: state.taskType,
      lastResetAt: state.lastResetAt,
      lastErrorTime: state.lastErrorTime
    };
  }

  /**
   * Get status for all agents
   * @returns {object} - Status for all agents
   */
  getAllStatus() {
    const allStatus = {};
    for (const agentId of this.state.keys()) {
      allStatus[agentId] = this.getStatus(agentId);
    }
    return allStatus;
  }

  /**
   * Set a custom limit for a specific agent
   * @param {string} agentId - The agent identifier
   * @param {number} limit - Custom limit
   */
  setAgentLimit(agentId, limit) {
    this.agentLimits[agentId] = limit;
    this.logger.log(`[IterationGovernor] Set custom limit for ${agentId}: ${limit}`);
  }

  /**
   * Clear all state
   */
  clearAll() {
    this.state.clear();
    this.logger.log('[IterationGovernor] All state cleared');
  }

  /**
   * Get governor statistics
   * @returns {object} - Statistics
   */
  getStats() {
    let totalIterations = 0;
    let totalErrors = 0;
    let agentsAtWarning = 0;
    let agentsAtLimit = 0;
    let circuitBreakersOpen = 0;

    for (const [agentId, state] of this.state) {
      const maxLimit = this.getLimit(agentId, state.taskType);
      totalIterations += state.iterations;
      totalErrors += state.errors;
      
      if (state.iterations >= maxLimit * this.warningThreshold && state.iterations < maxLimit) {
        agentsAtWarning++;
      }
      if (state.iterations >= maxLimit) {
        agentsAtLimit++;
      }
      if (state.circuitBreakerOpen) {
        circuitBreakersOpen++;
      }
    }

    return {
      totalAgents: this.state.size,
      totalIterations,
      totalErrors,
      agentsAtWarning,
      agentsAtLimit,
      circuitBreakersOpen,
      defaultSimpleLimit: this.defaultSimpleLimit,
      defaultComplexLimit: this.defaultComplexLimit,
      circuitBreakerThreshold: this.circuitBreakerThreshold
    };
  }
}

// Export both class and a factory function
module.exports = IterationGovernor;

/**
 * Create a new IterationGovernor instance
 * @param {object} options - Configuration options
 * @returns {IterationGovernor}
 */
function createIterationGovernor(options) {
  return new IterationGovernor(options);
}

module.exports.createIterationGovernor = createIterationGovernor;
