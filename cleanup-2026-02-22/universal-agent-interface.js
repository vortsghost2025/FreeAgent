/**
 * Universal Agent Interface
 * Base contract for all agent types in Phase 11 federation
 * All agents (Phase9, Service, ML, Pipeline) must conform to this interface
 */

/**
 * Agent Type Enumeration
 */
export const AGENT_TYPE = {
  PHASE9: 'PHASE9',
  SERVICE: 'SERVICE',
  ML_TRAINER: 'ML_TRAINER',
  DATA_PIPELINE: 'DATA_PIPELINE'
};

/**
 * Cycle Status Enumeration
 */
export const CYCLE_STATUS = {
  COMPLETED: 'COMPLETED',
  SKIPPED: 'SKIPPED',
  FAILED: 'FAILED'
};

/**
 * UNIVERSAL AGENT INTERFACE
 * All agents must implement this contract
 */
export class UniversalAgentInterface {
  constructor(agentId, agentType, options = {}) {
    if (!Object.values(AGENT_TYPE).includes(agentType)) {
      throw new Error(`Invalid agent type: ${agentType}`);
    }

    this.agentId = agentId;
    this.agentType = agentType;
    this.options = options;
  }

  /**
   * Run one cycle, return normalizeable metrics
   * @param {string} cycleId - Unique cycle identifier
   * @param {object} input - Cycle input parameters
   * @returns {object} Cycle result (must be transformable to CycleResult)
   */
  runCycle(cycleId, input = {}) {
    throw new Error(
      `${this.constructor.name} must implement runCycle(cycleId, input)`
    );
  }

  /**
   * Get current health status for federation health check
   * @returns {HealthSignal} Health status object
   */
  getHealthStatus() {
    throw new Error(
      `${this.constructor.name} must implement getHealthStatus()`
    );
  }

  /**
   * Receive feedback from federation (pattern recommendation)
   * Optional: agent can ignore federation patterns
   * @param {object} pattern - Learned pattern to optionally apply
   * @returns {object} Acknowledgment of pattern receipt
   */
  acceptFederationPattern(pattern) {
    // Default: acknowledge but don't act
    return {
      agentId: this.agentId,
      patternName: pattern.name,
      accepted: true,
      applied: false
    };
  }

  /**
   * Get agent status for federation status reporting
   * @returns {object} Current agent status
   */
  getAgentStatus() {
    return {
      agentId: this.agentId,
      agentType: this.agentType,
      timestamp: Date.now()
    };
  }
}

/**
 * HEALTH SIGNAL
 * Standardized health status from any agent
 */
export class HealthSignal {
  constructor(agentId, isHealthy = true, criticalAlerts = 0) {
    this.agentId = agentId;
    this.timestamp = Date.now();
    this.isHealthy = isHealthy;
    this.criticalAlerts = criticalAlerts;
    this.recentIssues = [];
  }

  addIssue(issueDescription) {
    this.recentIssues.push({
      timestamp: Date.now(),
      description: issueDescription
    });

    // Keep only last 10 issues
    if (this.recentIssues.length > 10) {
      this.recentIssues.shift();
    }
  }

  markCritical(alertCount = 1) {
    this.isHealthy = false;
    this.criticalAlerts = Math.max(this.criticalAlerts, alertCount);
  }

  toJSON() {
    return Object.freeze({
      agentId: this.agentId,
      timestamp: this.timestamp,
      isHealthy: this.isHealthy,
      criticalAlerts: this.criticalAlerts,
      recentIssueCount: this.recentIssues.length
    });
  }
}

/**
 * UNIVERSAL CYCLE RESULT
 * Every cycle must return this (+ domain-specific domain_metrics)
 * Agent translators convert native results → this representation
 */
export class CycleResult {
  constructor(cycleId, agentType) {
    if (!cycleId || !agentType) {
      throw new Error('cycleId and agentType are required');
    }

    this.cycleId = cycleId;
    this.agentType = agentType;
    this.timestamp = Date.now();

    // UNIVERSAL METRICS (all agents expose these):
    this.cycle_status = CYCLE_STATUS.COMPLETED;  // COMPLETED | SKIPPED | FAILED
    this.primary_objective_delta = 0;            // ↑ = improving, ↓ = degrading
    this.stability_score = 0.5;                  // 0-1 (consistency/reliability)
    this.execution_confidence = 0.8;             // 0-1 (model accuracy / agreement)
    this.constraint_violations_count = 0;        // Count of policy violations
    this.next_action = 'SCHEDULE';               // Control signal (SCHEDULE | PAUSE | ABORT)
    this.cycle_duration_ms = 0;                  // Execution time
    this.error_message = null;                   // If status === FAILED

    // DOMAIN-SPECIFIC METRICS (agent fills this):
    this.domain_metrics = {};
  }

  /**
   * Mark cycle as successful
   */
  markCompleted() {
    this.cycle_status = CYCLE_STATUS.COMPLETED;
    this.error_message = null;
    return this;
  }

  /**
   * Mark cycle as skipped (no execution needed)
   */
  markSkipped(reason = '') {
    this.cycle_status = CYCLE_STATUS.SKIPPED;
    this.error_message = reason || null;
    return this;
  }

  /**
   * Mark cycle as failed
   */
  markFailed(errorMessage = '') {
    this.cycle_status = CYCLE_STATUS.FAILED;
    this.error_message = errorMessage || 'Unknown error';
    this.next_action = 'ABORT';
    return this;
  }

  /**
   * Set universal metrics
   */
  setUniversalMetrics(metrics = {}) {
    if (metrics.primary_objective_delta !== undefined) {
      this.primary_objective_delta = metrics.primary_objective_delta;
    }
    if (metrics.stability_score !== undefined) {
      this.stability_score = Math.max(0, Math.min(1, metrics.stability_score));
    }
    if (metrics.execution_confidence !== undefined) {
      this.execution_confidence = Math.max(0, Math.min(1, metrics.execution_confidence));
    }
    if (metrics.constraint_violations_count !== undefined) {
      this.constraint_violations_count = Math.max(0, metrics.constraint_violations_count);
    }
    if (metrics.next_action !== undefined) {
      this.next_action = metrics.next_action;
    }
    if (metrics.cycle_duration_ms !== undefined) {
      this.cycle_duration_ms = metrics.cycle_duration_ms;
    }
    return this;
  }

  /**
   * Add domain-specific metrics
   */
  addDomainMetrics(metrics = {}) {
    this.domain_metrics = { ...this.domain_metrics, ...metrics };
    return this;
  }

  /**
   * Validate universal metrics are in valid ranges
   */
  validate() {
    const errors = [];

    if (!Object.values(CYCLE_STATUS).includes(this.cycle_status)) {
      errors.push(`Invalid cycle_status: ${this.cycle_status}`);
    }
    if (typeof this.primary_objective_delta !== 'number') {
      errors.push('primary_objective_delta must be a number');
    }
    if (typeof this.stability_score !== 'number' || this.stability_score < 0 || this.stability_score > 1) {
      errors.push('stability_score must be a number between 0 and 1');
    }
    if (typeof this.execution_confidence !== 'number' || this.execution_confidence < 0 || this.execution_confidence > 1) {
      errors.push('execution_confidence must be a number between 0 and 1');
    }
    if (this.constraint_violations_count < 0) {
      errors.push('constraint_violations_count must be >= 0');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Convert to immutable federation representation
   */
  toFederationRepresentation() {
    const validation = this.validate();
    if (!validation.valid) {
      throw new Error(`Invalid CycleResult: ${validation.errors.join('; ')}`);
    }

    return Object.freeze({
      cycleId: this.cycleId,
      agentType: this.agentType,
      timestamp: this.timestamp,
      universal: {
        cycle_status: this.cycle_status,
        objective: this.primary_objective_delta,
        stability: this.stability_score,
        confidence: this.execution_confidence,
        violations: this.constraint_violations_count,
        action: this.next_action,
        duration_ms: this.cycle_duration_ms
      },
      domain: this.domain_metrics
    });
  }
}

/**
 * PHASE9 AGENT ADAPTER
 * Adapts existing Phase9IntegratedOrchestrator to universal interface
 */
export class Phase9AgentAdapter extends UniversalAgentInterface {
  constructor(phase9Instance) {
    super(phase9Instance.subsystemId, AGENT_TYPE.PHASE9);
    this.phase9Instance = phase9Instance;
  }

  runCycle(cycleId, input = {}) {
    return this.phase9Instance.runPhase9Cycle(cycleId, input);
  }

  getHealthStatus() {
    const status = this.phase9Instance.getFullSystemStatus();
    const isHealthy = (status.phase_9?.watchdog_status?.active_alerts || 0) === 0;
    return new HealthSignal(
      this.agentId,
      isHealthy,
      status.phase_9?.watchdog_status?.active_alerts || 0
    );
  }

  getAgentStatus() {
    const base = super.getAgentStatus();
    const status = this.phase9Instance.getFullSystemStatus();
    return {
      ...base,
      phase_9Specific: {
        strategy: status.phase_9?.strategy_selected,
        stability: status.phase_9?.stability,
        watchdogViolations: status.phase_9?.watchdog_status?.active_alerts
      }
    };
  }
}

export default {
  AGENT_TYPE,
  CYCLE_STATUS,
  UniversalAgentInterface,
  HealthSignal,
  CycleResult,
  Phase9AgentAdapter
};
