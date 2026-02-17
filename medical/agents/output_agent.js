/**
 * OUTPUT AGENT
 * Role: Format final output and ensure structural invariants
 *
 * STRUCTURAL ONLY - No medical conclusions or recommendations
 */

class OutputAgent {
  constructor(agentId) {
    this.agentId = agentId;
    this.role = 'OUTPUT';
  }

  /**
   * Process task: format final output
   * @param {Object} task - Task with all processed data
   * @param {Object} state - Current workflow state
   * @returns {Object} - {task, state} with formatted output
   */
  async run(task, state) {
    console.log(`[${this.agentId}] Formatting final output...`);

    // Validate invariants
    this._validateInvariants(task, state);

    // TODO: USER FILLS THIS - Output formatting logic
    // Format the final result structure

    const formattedOutput = this._formatOutput(task, state);

    return {
      task: {
        ...task,
        output: formattedOutput
      },
      state: {
        ...state,
        outputComplete: true,
        processedBy: [...(state.processedBy || []), this.agentId]
      }
    };
  }

  /**
   * Validate structural invariants
   * @private
   */
  _validateInvariants(task, state) {
    // Check pipeline completion
    const required = ['ingestionComplete', 'triageComplete', 'summarizationComplete', 'riskScoringComplete'];
    for (const step of required) {
      if (!state[step]) {
        throw new Error(`Invariant violation: ${step} not completed before output`);
      }
    }
  }

  /**
   * Format complete output according to FinalOutputSchema
   * @private
   */
  _formatOutput(task, state) {
    const now = new Date().toISOString();
    const processingTime = Date.now() - new Date(state.pipelineStart).getTime();

    // Generate human-readable summary
    const humanSummary = this._generateHumanSummary(task);

    // Build audit log
    const auditLog = this._buildAuditLog(state);

    // Determine if human review is required
    const humanReview = this._determineHumanReview(task);

    // Perform final validation
    const validation = this._performValidation(task, state);

    // Determine overall status
    const status = validation.invariantsSatisfied && validation.allStepsComplete
      ? 'complete'
      : validation.issues.length > 0
      ? 'partial'
      : 'complete';

    // Build final output according to schema
    return {
      // Human-readable summary (top-level)
      humanSummary,

      // Pipeline metadata
      timestamp: now,
      pipelineVersion: '1.0.0',
      processingTime,
      schemaVersion: '1.0.0',

      // Provenance tracking
      provenance: {
        createdByAgentId: this.agentId,
        createdAt: now,
        originalMessageId: task.id
      },

      // Audit trail
      auditLog,

      // Pipeline execution trace
      pipeline: state.processedBy,

      // All processed data
      input: task.data.raw,
      normalized: task.data,
      classification: task.classification,
      summary: task.summary,
      riskScore: task.riskScore,

      // Status
      status,

      // Validation results
      validation,

      // Redaction tracking
      redactionSummary: {
        redacted: false,
        fieldsRedacted: [],
        method: 'none'
      },

      // Human review requirements
      humanReview,

      // Content integrity (optional)
      hash: this._generateHash(task),

      // Error details (if any)
      errorDetails: state.errors || []
    };
  }

  /**
   * Generate human-readable summary
   * @private
   */
  _generateHumanSummary(task) {
    const type = task.classification.type;
    const confidence = task.classification.confidence;
    const riskScore = task.riskScore.score;

    return `Processed ${type} data with ${Math.round(confidence * 100)}% classification confidence. Risk score: ${riskScore}.`;
  }

  /**
   * Build audit log from state
   * @private
   */
  _buildAuditLog(state) {
    const log = [];
    const agents = state.processedBy || [];

    const steps = ['ingestion', 'triage', 'summarization', 'risk', 'output'];

    for (let i = 0; i < agents.length; i++) {
      log.push({
        agentId: agents[i],
        step: steps[i] || 'unknown',
        timestamp: new Date().toISOString(),
        action: 'processed',
        notes: null
      });
    }

    return log;
  }

  /**
   * Determine if human review is required
   * @private
   */
  _determineHumanReview(task) {
    const riskThreshold = 0.5;
    const completenessThreshold = 0.6;

    const requiresReview =
      task.riskScore.score > riskThreshold ||
      task.summary.completeness < completenessThreshold ||
      task.riskScore.flags.some(f => f.severity === 'high');

    return {
      required: requiresReview,
      reviewerId: null,
      notes: requiresReview
        ? `Review required: risk score ${task.riskScore.score} or completeness ${task.summary.completeness}`
        : null
    };
  }

  /**
   * Perform final validation
   * @private
   */
  _performValidation(task, state) {
    const issues = [];

    // Check all steps complete
    const requiredSteps = ['ingestionComplete', 'triageComplete', 'summarizationComplete', 'riskScoringComplete'];
    const allStepsComplete = requiredSteps.every(step => state[step]);

    if (!allStepsComplete) {
      issues.push('Not all pipeline steps completed');
    }

    // Check invariants
    let invariantsSatisfied = true;

    if (!task.classification) {
      issues.push('Classification missing');
      invariantsSatisfied = false;
    }

    if (!task.summary) {
      issues.push('Summary missing');
      invariantsSatisfied = false;
    }

    if (!task.riskScore) {
      issues.push('Risk score missing');
      invariantsSatisfied = false;
    }

    if (!state.processedBy || state.processedBy.length < 5) {
      issues.push('Pipeline did not execute all agents');
      invariantsSatisfied = false;
    }

    return {
      allStepsComplete,
      invariantsSatisfied,
      issues
    };
  }

  /**
   * Generate content hash for tamper detection
   * @private
   */
  _generateHash(task) {
    // Simple hash based on content (not cryptographic)
    const content = JSON.stringify({
      classification: task.classification,
      summary: task.summary,
      riskScore: task.riskScore
    });

    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return Math.abs(hash).toString(16);
  }
}

// Export factory function
export function createOutputAgent(agentId) {
  return new OutputAgent(agentId);
}
