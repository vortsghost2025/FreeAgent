/**
 * VALIDATION UTILITIES
 * Input validation and error handling for medical module
 */

export class ValidationError extends Error {
  constructor(message, field, value) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

export class AgentError extends Error {
  constructor(message, agentId, phase) {
    super(message);
    this.name = 'AgentError';
    this.agentId = agentId;
    this.phase = phase;
  }
}

/**
 * Validate task object structure
 */
export function validateTask(task, agentId) {
  if (!task || typeof task !== 'object') {
    throw new ValidationError(
      `Invalid task object provided to ${agentId}`,
      'task',
      task
    );
  }

  if (!task.id) {
    throw new ValidationError(
      `Task missing required 'id' field in ${agentId}`,
      'task.id',
      task
    );
  }

  if (!task.data || typeof task.data !== 'object') {
    throw new ValidationError(
      `Task missing or invalid 'data' field in ${agentId}`,
      'task.data',
      task.data
    );
  }

  return true;
}

/**
 * Validate state object structure
 */
export function validateState(state, agentId) {
  if (!state || typeof state !== 'object') {
    throw new ValidationError(
      `Invalid state object provided to ${agentId}`,
      'state',
      state
    );
  }

  return true;
}

/**
 * Validate ingestion input data
 */
export function validateIngestionInput(data, agentId) {
  if (!data || typeof data !== 'object') {
    throw new ValidationError(
      `Invalid input data in ${agentId}`,
      'data',
      data
    );
  }

  // Input must have either 'raw' property or be the raw data itself
  const hasRaw = 'raw' in data;
  const hasContent = Object.keys(data).length > 0;

  if (!hasRaw && !hasContent) {
    throw new ValidationError(
      `Input data is empty in ${agentId}`,
      'data',
      data
    );
  }

  return true;
}

/**
 * Validate classification output
 */
export function validateClassification(classification, agentId) {
  if (!classification || typeof classification !== 'object') {
    throw new ValidationError(
      `Invalid classification object from ${agentId}`,
      'classification',
      classification
    );
  }

  const requiredFields = ['type', 'confidence', 'route'];
  for (const field of requiredFields) {
    if (!(field in classification)) {
      throw new ValidationError(
        `Classification missing required field '${field}' in ${agentId}`,
        `classification.${field}`,
        classification
      );
    }
  }

  // Validate type is a string
  if (typeof classification.type !== 'string') {
    throw new ValidationError(
      `Classification type must be a string in ${agentId}`,
      'classification.type',
      classification.type
    );
  }

  // Validate confidence is a number between 0 and 1
  if (typeof classification.confidence !== 'number' ||
      classification.confidence < 0 ||
      classification.confidence > 1) {
    throw new ValidationError(
      `Classification confidence must be a number between 0 and 1 in ${agentId}`,
      'classification.confidence',
      classification.confidence
    );
  }

  return true;
}

/**
 * Validate summary output
 */
export function validateSummary(summary, agentId) {
  if (!summary || typeof summary !== 'object') {
    throw new ValidationError(
      `Invalid summary object from ${agentId}`,
      'summary',
      summary
    );
  }

  const requiredFields = ['fields', 'extractionMethod', 'completeness'];
  for (const field of requiredFields) {
    if (!(field in summary)) {
      throw new ValidationError(
        `Summary missing required field '${field}' in ${agentId}`,
        `summary.${field}`,
        summary
      );
    }
  }

  // Validate completeness is a number between 0 and 1
  if (typeof summary.completeness !== 'number' ||
      summary.completeness < 0 ||
      summary.completeness > 1) {
    throw new ValidationError(
      `Summary completeness must be a number between 0 and 1 in ${agentId}`,
      'summary.completeness',
      summary.completeness
    );
  }

  return true;
}

/**
 * Validate risk score output
 */
export function validateRiskScore(riskScore, agentId) {
  if (!riskScore || typeof riskScore !== 'object') {
    throw new ValidationError(
      `Invalid riskScore object from ${agentId}`,
      'riskScore',
      riskScore
    );
  }

  const requiredFields = ['score', 'severity', 'factors'];
  for (const field of requiredFields) {
    if (!(field in riskScore)) {
      throw new ValidationError(
        `RiskScore missing required field '${field}' in ${agentId}`,
        `riskScore.${field}`,
        riskScore
      );
    }
  }

  // Validate score is a number between 0 and 1
  if (typeof riskScore.score !== 'number' ||
      riskScore.score < 0 ||
      riskScore.score > 1) {
    throw new ValidationError(
      `RiskScore score must be a number between 0 and 1 in ${agentId}`,
      'riskScore.score',
      riskScore.score
    );
  }

  // Validate severity is valid
  const validSeverities = ['low', 'medium', 'high'];
  if (!validSeverities.includes(riskScore.severity)) {
    throw new ValidationError(
      `RiskScore severity must be one of: ${validSeverities.join(', ')} in ${agentId}`,
      'riskScore.severity',
      riskScore.severity
    );
  }

  // Validate factors is an array
  if (!Array.isArray(riskScore.factors)) {
    throw new ValidationError(
      `RiskScore factors must be an array in ${agentId}`,
      'riskScore.factors',
      riskScore.factors
    );
  }

  return true;
}

/**
 * Validate final output
 */
export function validateFinalOutput(output, agentId) {
  if (!output || typeof output !== 'object') {
    throw new ValidationError(
      `Invalid output object from ${agentId}`,
      'output',
      output
    );
  }

  // Output should have at least classification, summary, and risk
  if (!output.classification && !output.summary && !output.riskScore) {
    throw new ValidationError(
      `Output must contain at least one of: classification, summary, riskScore in ${agentId}`,
      'output',
      output
    );
  }

  return true;
}

/**
 * Safe wrapper for agent execution with error handling
 */
export async function safeExecute(fn, agentId, phase) {
  try {
    const result = await fn();
    return { success: true, result };
  } catch (error) {
    console.error(`[${agentId}] Error in ${phase}:`, error.message);

    if (error instanceof ValidationError) {
      return {
        success: false,
        error: {
          type: 'ValidationError',
          message: error.message,
          field: error.field,
          phase,
          agentId
        }
      };
    }

    return {
      success: false,
      error: {
        type: error.name || 'UnknownError',
        message: error.message || 'Unknown error occurred',
        phase,
        agentId
      }
    };
  }
}
