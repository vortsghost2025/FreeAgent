/**
 * MEDICAL AGENT ROLES
 * Defines agent roles and capabilities for the medical module
 *
 * STRUCTURAL ONLY - No medical domain logic
 */

import { createIngestionAgent } from './agents/ingestion_agent.js';
import { createTriageAgent } from './agents/triage_agent.js';
import { createSummarizationAgent } from './agents/summarization_agent.js';
import { createRiskAgent } from './agents/risk_agent.js';
import { createOutputAgent } from './agents/output_agent.js';

// Agent role definitions
const AGENT_ROLES = {
  INGESTION: 'INGESTION',
  TRIAGE: 'TRIAGE',
  SUMMARIZATION: 'SUMMARIZATION',
  RISK: 'RISK',
  OUTPUT: 'OUTPUT'
};

// Agent capabilities mapping
const AGENT_CAPABILITIES = {
  [AGENT_ROLES.INGESTION]: {
    description: 'Load and normalize raw input data',
    tasks: ['INGEST', 'NORMALIZE'],
    pipelinePosition: 1
  },
  [AGENT_ROLES.TRIAGE]: {
    description: 'Classify input type and route to processing path',
    tasks: ['CLASSIFY', 'ROUTE'],
    pipelinePosition: 2
  },
  [AGENT_ROLES.SUMMARIZATION]: {
    description: 'Generate structured summaries and extract fields',
    tasks: ['SUMMARIZE', 'EXTRACT'],
    pipelinePosition: 3
  },
  [AGENT_ROLES.RISK]: {
    description: 'Apply structural risk scoring (placeholder rules)',
    tasks: ['SCORE', 'FLAG'],
    pipelinePosition: 4
  },
  [AGENT_ROLES.OUTPUT]: {
    description: 'Format final output and validate invariants',
    tasks: ['FORMAT', 'VALIDATE'],
    pipelinePosition: 5
  }
};

// Agent factory registry
const AGENT_FACTORIES = {
  [AGENT_ROLES.INGESTION]: createIngestionAgent,
  [AGENT_ROLES.TRIAGE]: createTriageAgent,
  [AGENT_ROLES.SUMMARIZATION]: createSummarizationAgent,
  [AGENT_ROLES.RISK]: createRiskAgent,
  [AGENT_ROLES.OUTPUT]: createOutputAgent
};

/**
 * Create an agent by role
 * @param {string} role - Agent role from AGENT_ROLES
 * @param {string} agentId - Unique agent identifier
 * @returns {Object} - Agent instance
 */
function createAgent(role, agentId) {
  const factory = AGENT_FACTORIES[role];
  if (!factory) {
    throw new Error(`Unknown agent role: ${role}`);
  }
  return factory(agentId);
}

/**
 * Get agent capabilities by role
 * @param {string} role - Agent role
 * @returns {Object} - Capability definition
 */
function getAgentCapabilities(role) {
  return AGENT_CAPABILITIES[role];
}

/**
 * Validate agent can handle task type
 * @param {string} role - Agent role
 * @param {string} taskType - Task type
 * @returns {boolean} - Can handle task
 */
function canAgentHandleTask(role, taskType) {
  const capabilities = AGENT_CAPABILITIES[role];
  return capabilities && capabilities.tasks.includes(taskType);
}

// Export role system
export {
  AGENT_ROLES,
  AGENT_CAPABILITIES,
  createAgent,
  getAgentCapabilities,
  canAgentHandleTask
};
