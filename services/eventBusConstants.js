/**
 * FreeAgent Event Bus - Constants & Schema Definitions
 * 
 * This file defines:
 * - Stream names
 * - Consumer groups
 * - Task/Result schemas
 * - Agent roles
 */

// ============================================
// STREAMS
// ============================================

const STREAMS = {
  TASKS: 'freeagent:tasks',
  RESULTS: 'freeagent:results',
  EVENTS: 'freeagent:events',
  METRICS: 'freeagent:metrics'
};

// ============================================
// CONSUMER GROUPS (per agent type)
// ============================================

const GROUPS = {
  RESEARCHER: 'researcher-group',
  PLANNER: 'planner-group', 
  CODER: 'coder-group',
  MEMORY: 'memory-group',
  ROUTER: 'router-group',
  TEST: 'test-group',
  SECURITY: 'security-group',
  DB: 'db-group',
  API: 'api-group',
  DEVOPS: 'devops-group'
};

// ============================================
// AGENT ROLES
// ============================================

const ROLES = {
  RESEARCHER: 'researcher',
  PLANNER: 'planner',
  CODER: 'coder',
  MEMORY: 'memory',
  ROUTER: 'router',
  TEST: 'test',
  SECURITY: 'security',
  DB: 'db',
  API: 'api',
  DEVOPS: 'devops'
};

// ============================================
// PRIORITIES
// ============================================

const PRIORITY = {
  LOW: 0,
  NORMAL: 1,
  HIGH: 2
};

// ============================================
// SOURCES
// ============================================

const SOURCES = {
  COCKPIT: 'cockpit',
  ROUTER: 'router',
  SYSTEM: 'system'
};

// ============================================
// STATUS
// ============================================

const STATUS = {
  OK: 'ok',
  ERROR: 'error',
  PENDING: 'pending',
  TIMEOUT: 'timeout'
};

// ============================================
// TASK SCHEMA
// ============================================

/**
 * Canonical task message shape for freeagent:tasks
 * 
 * @typedef {Object} TaskMessage
 * @property {string} task_id - UUID
 * @property {string} agent_role - e.g. 'researcher', 'planner', 'coder'
 * @property {number} priority - 0=low, 1=normal, 2=high
 * @property {string} payload - JSON string
 * @property {string} session_id - for threading/context
 * @property {string} source - 'cockpit'|'router'|'system'
 * @property {number} created_at - Unix timestamp
 */

// ============================================
// RESULT SCHEMA  
// ============================================

/**
 * Canonical result message shape for freeagent:results
 * 
 * @typedef {Object} ResultMessage
 * @property {string} task_id - matches original task
 * @property {string} agent_role - which agent processed it
 * @property {string} status - 'ok'|'error'|'timeout'
 * @property {string} output - JSON string result
 * @property {string} logs - optional debug logs
 * @property {number} duration_ms - processing time
 * @property {number} completed_at - Unix timestamp
 */

// ============================================
// FACTORY FUNCTIONS
// ============================================

/**
 * Create a task message
 */
function createTask({ taskId, agentRole, payload, priority = PRIORITY.NORMAL, sessionId = '', source = SOURCES.COCKPIT }) {
  return {
    task_id: taskId,
    agent_role: agentRole,
    priority,
    payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
    session_id: sessionId,
    source,
    created_at: Date.now()
  };
}

/**
 * Create a result message
 */
function createResult({ taskId, agentRole, status, output, logs = '', durationMs = 0 }) {
  return {
    task_id: taskId,
    agent_role: agentRole,
    status,
    output: typeof output === 'string' ? output : JSON.stringify(output),
    logs,
    duration_ms: durationMs,
    completed_at: Date.now()
  };
}

/**
 * Get consumer group for agent role
 */
function getGroupForRole(role) {
  const mapping = {
    [ROLES.RESEARCHER]: GROUPS.RESEARCHER,
    [ROLES.PLANNER]: GROUPS.PLANNER,
    [ROLES.CODER]: GROUPS.CODER,
    [ROLES.MEMORY]: GROUPS.MEMORY,
    [ROLES.ROUTER]: GROUPS.ROUTER,
    [ROLES.TEST]: GROUPS.TEST,
    [ROLES.SECURITY]: GROUPS.SECURITY,
    [ROLES.DB]: GROUPS.DB,
    [ROLES.API]: GROUPS.API,
    [ROLES.DEVOPS]: GROUPS.DEVOPS
  };
  return mapping[role] || GROUPS.CODER; // default
}

module.exports = {
  STREAMS,
  GROUPS,
  ROLES,
  PRIORITY,
  SOURCES,
  STATUS,
  createTask,
  createResult,
  getGroupForRole
};
