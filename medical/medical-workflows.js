/**
 * MEDICAL WORKFLOWS
 * Orchestrates map/reduce pipeline for medical data processing
 *
 * STRUCTURAL ONLY - No medical domain logic
 * Enforces invariants and agent ordering
 */

import { AGENT_ROLES, createAgent } from './medical-agent-roles.js';

class MedicalWorkflowOrchestrator {
  constructor() {
    // Initialize agent pool (one of each role)
    this.agents = {
      [AGENT_ROLES.INGESTION]: createAgent(AGENT_ROLES.INGESTION, 'ingestion-001'),
      [AGENT_ROLES.TRIAGE]: createAgent(AGENT_ROLES.TRIAGE, 'triage-001'),
      [AGENT_ROLES.SUMMARIZATION]: createAgent(AGENT_ROLES.SUMMARIZATION, 'summarization-001'),
      [AGENT_ROLES.RISK]: createAgent(AGENT_ROLES.RISK, 'risk-001'),
      [AGENT_ROLES.OUTPUT]: createAgent(AGENT_ROLES.OUTPUT, 'output-001')
    };

    // Define pipeline order (IMMUTABLE)
    this.pipelineOrder = [
      AGENT_ROLES.INGESTION,
      AGENT_ROLES.TRIAGE,
      AGENT_ROLES.SUMMARIZATION,
      AGENT_ROLES.RISK,
      AGENT_ROLES.OUTPUT
    ];
  }

  /**
   * Execute full pipeline on input data
   * @param {Object} inputData - Raw input data
   * @returns {Object} - Final processed output
   */
  async executePipeline(inputData) {
    console.log('=== MEDICAL PIPELINE START ===');
    const startTime = Date.now();

    // Initialize task and state
    let task = {
      id: this._generateTaskId(),
      data: inputData,
      timestamp: new Date().toISOString()
    };

    let state = {
      pipelineStart: task.timestamp,
      processedBy: [],
      auditLog: [], // Detailed audit trail
      errors: []
    };

    // Execute pipeline in order (map/reduce pattern)
    for (const role of this.pipelineOrder) {
      const agent = this.agents[role];
      const agentStartTime = Date.now();

      console.log(`\n[Pipeline] ✓ Executing ${role} (${agent.agentId})...`);
      console.log(`[Pipeline]   Input keys: ${Object.keys(task).join(', ')}`);

      try {
        // Agent processes and returns {task, state}
        const result = await agent.run(task, state);

        const agentProcessingTime = Date.now() - agentStartTime;
        console.log(`[Pipeline] ✓ ${role} completed in ${agentProcessingTime}ms`);

        // Validate result structure (enforce invariants)
        this._validateResult(result, role);

        // Log successful agent execution
        state.auditLog.push({
          agentId: agent.agentId,
          role: role,
          status: 'success',
          timestamp: new Date().toISOString(),
          processingTime: agentProcessingTime,
          inputKeys: Object.keys(task),
          outputKeys: Object.keys(result.task),
          stateFlags: this._extractStateFlags(result.state)
        });

        // Update task and state for next agent
        task = result.task;
        state = result.state;

        console.log(`[Pipeline]   Output keys: ${Object.keys(task).join(', ')}`);
        console.log(`[Pipeline]   State flags: ${this._extractStateFlags(state).join(', ')}`);

      } catch (error) {
        const agentProcessingTime = Date.now() - agentStartTime;
        console.error(`[Pipeline] ✗ ${role} FAILED after ${agentProcessingTime}ms`);
        console.error(`[Pipeline]   Error: ${error.message}`);
        console.error(`[Pipeline]   Stack: ${error.stack}`);

        // Log failed agent execution
        state.auditLog.push({
          agentId: agent.agentId,
          role: role,
          status: 'error',
          timestamp: new Date().toISOString(),
          processingTime: agentProcessingTime,
          error: {
            message: error.message,
            stack: error.stack,
            code: error.code || 'AGENT_ERROR'
          }
        });

        // Record error
        state.errors.push({
          code: 'AGENT_ERROR',
          message: `${role} agent failed: ${error.message}`,
          stack: error.stack,
          agentId: agent.agentId
        });

        // Rethrow to stop pipeline
        throw new Error(`Pipeline failed at ${role}: ${error.message}`);
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`\n=== MEDICAL PIPELINE COMPLETE (${processingTime}ms) ===`);
    console.log(`Agents executed: ${state.processedBy.length}/5`);
    console.log(`Agents: ${state.processedBy.join(' → ')}`);

    return {
      success: true,
      output: task.output,
      state: state,
      processingTime,
      auditLog: state.auditLog
    };
  }

  /**
   * Extract state completion flags
   * @private
   */
  _extractStateFlags(state) {
    const flags = [];
    const flagKeys = ['ingestionComplete', 'triageComplete', 'summarizationComplete', 'riskScoringComplete', 'outputComplete'];

    for (const key of flagKeys) {
      if (state[key]) {
        flags.push(key);
      }
    }

    return flags;
  }

  /**
   * Validate agent result structure (INVARIANT ENFORCEMENT)
   * @private
   */
  _validateResult(result, role) {
    if (!result || typeof result !== 'object') {
      throw new Error(`Invariant violation: ${role} must return an object`);
    }
    if (!result.task || !result.state) {
      throw new Error(`Invariant violation: ${role} must return {task, state}`);
    }
    if (!Array.isArray(result.state.processedBy)) {
      throw new Error(`Invariant violation: ${role} must maintain processedBy array`);
    }
  }

  /**
   * Generate unique task ID
   * @private
   */
  _generateTaskId() {
    return `medical-task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get pipeline status
   */
  getStatus() {
    return {
      pipelineOrder: this.pipelineOrder,
      agents: Object.keys(this.agents).map(role => ({
        role,
        agentId: this.agents[role].agentId
      }))
    };
  }
}

/**
 * Factory function to create orchestrator
 */
function createMedicalOrchestrator() {
  return new MedicalWorkflowOrchestrator();
}

// Export orchestrator
export {
  createMedicalOrchestrator,
  MedicalWorkflowOrchestrator
};
