/**
 * Iteration Governor
 * Prevents infinite recursion and ensures convergence with configurable limits
 */

const { getCoordinator } = require('./agent-coordinator');

class IterationGovernor {
  constructor(config = {}) {
    this.coordinator = getCoordinator();
    this.maxIterations = config.maxIterations || 5;
    this.maxOutputLength = config.maxOutputLength || 10000;
    this.timeoutMs = config.timeoutMs || 30000;
    this.currentIterations = new Map();
    this.iterationHistory = [];
  }

  /**
   * Initialize governor
   */
  async initialize() {
    console.log('[IterationGovernor] Initialized with max iterations:', this.maxIterations);
    return { success: true, message: 'Governor initialized' };
  }

  /**
   * Check if an iteration should be allowed
   */
  async shouldAllowIteration(agentId, currentIteration, reason) {
    // Check iteration limits
    const stats = this.currentIterations.get(agentId) || { count: 0 };
    if (stats.count >= this.maxIterations) {
      return {
        allowed: false,
        reason: `Maximum iteration limit (${this.maxIterations}) reached`,
        message: `Iteration limit reached. Current: ${JSON.stringify(reason)}`
      };
    }

    // Check for convergence signals
    if (reason.final_output && this.hasTerminationSignal(reason.final_output)) {
      return {
        allowed: false,
        reason: 'Termination signal detected',
        message: 'Request contains termination signal - stopping iteration'
      };
    }

    // Check output length
    const outputLength = reason.final_output?.length || 0;
    if (outputLength > this.maxOutputLength) {
      return {
        allowed: false,
        reason: 'Output length limit',
        message: `Output (${outputLength} chars) exceeds limit (${this.maxOutputLength})`
      };
    }

    // Check for no progress
    if (stats.count > 1 && !this.hasProgress(reason.refinements_applied)) {
      return {
        allowed: false,
        reason: 'No progress detected',
        message: 'No meaningful progress across iterations'
      };
    }

    return { allowed: true };
  }

  /**
   * Check for termination signals
   */
  hasTerminationSignal(text) {
    if (!text) return false;
    const upperText = text.toUpperCase();
    return ['FINAL()', 'DONE()', 'END()', 'COMPLETE()'].some(signal =>
      upperText.includes(signal) || upperText.includes(signal));
  }

  /**
   * Check for progress in iterations
   */
  hasProgress(refinements) {
    if (!refinements || refinements.length === 0) {
      return false;
    }

    // Simple progress check: any new refinements applied
    return refinements.some(refinement =>
      refinement.type === 'code_change' ||
      refinement.type === 'logic_fix' ||
      refinement.type === 'optimization'
    );
  }

  /**
   * Record iteration start
   */
  async startIteration(agentId, reason) {
    const iterationId = this.generateIterationId(agentId);

    const existingIterations = this.currentIterations.get(agentId) || { count: 0 };
    this.currentIterations.set(agentId, {
      iterationId,
      reason,
      count: existingIterations.count,
      startTime: Date.now(),
      status: 'in_progress'
    });

    // Log to coordinator
    await this.coordinator.updateContext(agentId, {
      current_operation: 'iteration_start',
      iteration_id: iterationId,
      reason_summary: reason.refinements_applied
    });

    return iterationId;
  }

  /**
   * Complete an iteration
   */
  async completeIteration(agentId, iterationId, result) {
    const iterationData = this.currentIterations.get(agentId);
    if (!iterationData) return { success: false, error: 'Iteration not found' };

    this.currentIterations.set(agentId, {
      ...iterationData,
      endTime: Date.now(),
      status: 'completed',
      result: result
    });

    // Log to coordinator
    await this.coordinator.updateContext(agentId, {
      current_operation: 'iteration_completed',
      iteration_id: iterationId,
      result_summary: {
        final_output: result.final_output,
        tokens_used: result.metadata.estimated_tokens,
        iterations: iterationData.count + 1
      }
    });

    // Update history
    this.iterationHistory.push({
      agentId,
      iterationId,
      ...iterationData,
      result
    });

    return {
      success: true,
      iterationId,
      iteration_count: iterationData.count + 1
    };
  }

  /**
   * Stop all iterations for an agent
   */
  async stopIterations(agentId) {
    this.currentIterations.delete(agentId);

    await this.coordinator.updateContext(agentId, {
      current_operation: 'iterations_stopped',
      reason: 'User requested stop'
    });

    return { success: true, message: 'All iterations stopped' };
  }

  /**
   * Get iteration history
   */
  getIterationHistory(agentId) {
    return this.iterationHistory.filter(h => h.agentId === agentId);
  }

  /**
   * Get current status
   */
  getStatus(agentId) {
    const currentData = this.currentIterations.get(agentId);
    if (!currentData) {
      return {
        active: false,
        iteration_count: 0,
        message: 'No active iterations'
      };
    }

    return {
      active: currentData.status === 'in_progress',
      iteration_count: currentData.count,
      current_iteration: currentData.iterationId,
      reason_summary: currentData.reason.refinements_applied,
      message: this.getStatusMessage(currentData.status, currentData.count)
    };
  }

  getStatusMessage(status, count) {
    switch (status) {
      case 'pending':
        return `${count} iterations pending`;
      case 'in_progress':
        return `Iteration ${count} in progress`;
      case 'completed':
        return `${count} iterations completed`;
      default:
        return `${count} iterations`;
    }
  }

  /**
   * Generate unique IDs
   */
  generateIterationId(agentId) {
    return `iter_${agentId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateCallId() {
    return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = { IterationGovernor, getGovernor: (config) => new IterationGovernor(config) };