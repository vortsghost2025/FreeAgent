// ==============================
// FILE: orchestrator_wrapper.js
// Purpose: callAgent wrapper + minimal orchestrator runner
// Paste this into your orchestrator and call `callAgent` instead of invoking agents directly.
// ==============================

/**
 * callAgent(agent, task, state, auditLog)
 * - Ensures agent.run is awaited
 * - Records success/error entries into auditLog
 * - Updates state.processedBy and state.errors
 * - Returns { task, state } (policy: continue on error and mark partial)
 */
async function callAgent(agent, task, state, auditLog) {
  const agentId = agent.agentId || agent.name || 'unknown-agent';
  const entry = { agentId, start: new Date().toISOString() };

  try {
    // Defensive: ensure run exists
    if (typeof agent.run !== 'function') {
      throw new Error(`Agent ${agentId} missing async run(task, state)`);
    }

    // Await the agent result and validate shape
    const result = await agent.run(task, state);
    if (!result || typeof result !== 'object' || (!result.task && !result.state)) {
      // Normalize to contract: return at least the original task/state
      entry.action = 'warning';
      entry.notes = 'Agent returned unexpected shape; normalizing to {task,state}';
      auditLog.push(entry);
      return { task, state };
    }

    entry.end = new Date().toISOString();
    entry.action = 'success';
    entry.returnedKeys = Object.keys(result.task || task).join(',');
    auditLog.push(entry);

    state.processedBy = state.processedBy || [];
    state.processedBy.push({ agentId, time: entry.end });

    return result;
  } catch (err) {
    entry.end = new Date().toISOString();
    entry.action = 'error';
    entry.error = err && err.message ? err.message : String(err);
    auditLog.push(entry);

    state.errors = state.errors || [];
    state.errors.push({ agent: agentId, error: entry.error, time: entry.end });

    // Policy: mark pipeline partial and continue. Change to `throw err` for hard stop.
    state.pipelineStatus = state.pipelineStatus || 'partial';
    return { task, state };
  }
}

/**
 * Example orchestrator runner that uses callAgent
 * - agents: array of agent modules in pipeline order
 * - initialTask: canonical Task object
 * - initialState: canonical State object
 */
async function runPipeline(agents, initialTask, initialState) {
  const auditLog = [];
  let task = initialTask;
  let state = initialState;

  for (const agent of agents) {
    // Optional: route-based branching can be handled here
    const res = await callAgent(agent, task, state, auditLog);
    task = res.task || task;
    state = res.state || state;
  }

  // Attach auditLog and final validation to output
  state.auditLog = auditLog;
  return { task, state, auditLog };
}

// Export for CommonJS and ESM compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { callAgent, runPipeline };
}
