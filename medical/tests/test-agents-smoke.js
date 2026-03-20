// ==============================
// FILE: test-agents-smoke.js
// Purpose: smoke test harness to force-run each agent and print audit log + final state
// Usage: node test-agents-smoke.js
// Ensure orchestrator_wrapper.js is in same folder or adjust require path.
// ==============================

/*
  This harness expects the following:
  - ingestionAgent, triageAgent, summarizationAgent, riskAgent, outputAgent
    are importable in the current context (require or import).
  - Each agent exports `agentId` and `async run(task, state)` returning { task, state }.
*/

const { callAgent } = require('./orchestrator_wrapper');

// Import agent factory functions
const { createIngestionAgent } = require('./agents/ingestion_agent');
const { createTriageAgent } = require('./agents/triage_agent');
const { createSummarizationAgent } = require('./agents/summarization_agent');
const { createRiskAgent } = require('./agents/risk_agent');
const { createOutputAgent } = require('./agents/output_agent');

// Create agent instances
const agents = [
  createIngestionAgent('smoke-ingestion-001'),
  createTriageAgent('smoke-triage-001'),
  createSummarizationAgent('smoke-summarization-001'),
  createRiskAgent('smoke-risk-001'),
  createOutputAgent('smoke-output-001')
];

async function smokeTest() {
  console.log('='.repeat(60));
  console.log('SMOKE TEST: Force-run each agent with minimal payload');
  console.log('='.repeat(60));

  let task = {
    id: 'smoke-1',
    timestamp: new Date().toISOString(),
    data: {
      raw: 'SMOKE TEST PAYLOAD - minimal data to verify agent execution',
      format: 'text',
      source: 'smoke-test',
      timestamp: new Date().toISOString()
    },
    debug: true,
    debugTrace: []
  };

  let state = {
    pipelineStart: new Date().toISOString(),
    processedBy: [],
    errors: [],
    pipelineStatus: 'running'
  };

  const auditLog = [];

  console.log('\nExecuting agents...\n');

  for (const agent of agents) {
    const agentId = agent.agentId || 'unknown';
    console.log(`→ Calling ${agentId}...`);

    const res = await callAgent(agent, task, state, auditLog);
    task = res.task || task;
    state = res.state || state;

    // Check if agent was successful
    const lastEntry = auditLog[auditLog.length - 1];
    if (lastEntry.action === 'success') {
      console.log(`  ✓ ${agentId} succeeded`);
    } else if (lastEntry.action === 'error') {
      console.log(`  ✗ ${agentId} failed: ${lastEntry.error}`);
    } else {
      console.log(`  ⚠ ${agentId} warning: ${lastEntry.notes}`);
    }
  }

  // Finalize
  state.pipelineEnd = new Date().toISOString();
  state.auditLog = auditLog;

  console.log('\n' + '='.repeat(60));
  console.log('SMOKE TEST COMPLETE');
  console.log('='.repeat(60));

  console.log('\n--- AUDIT LOG ---');
  console.log(JSON.stringify(auditLog, null, 2));

  console.log('\n--- FINAL TASK (keys only) ---');
  console.log('Keys:', Object.keys(task).join(', '));

  console.log('\n--- FINAL STATE ---');
  console.log(JSON.stringify(state, null, 2));

  // Verify all agents ran
  console.log('\n--- VALIDATION ---');
  const successCount = auditLog.filter(e => e.action === 'success').length;
  const errorCount = auditLog.filter(e => e.action === 'error').length;
  const warningCount = auditLog.filter(e => e.action === 'warning').length;

  console.log(`Agents executed: ${auditLog.length}`);
  console.log(`  ✓ Success: ${successCount}`);
  console.log(`  ✗ Errors: ${errorCount}`);
  console.log(`  ⚠ Warnings: ${warningCount}`);

  if (errorCount === 0) {
    console.log('\n✓ SMOKE TEST PASSED - All agents executed successfully');
    process.exit(0);
  } else {
    console.log('\n✗ SMOKE TEST FAILED - Some agents encountered errors');
    process.exit(1);
  }
}

smokeTest().catch(e => {
  console.error('SMOKE TEST CRASHED', e && e.stack ? e.stack : e);
  process.exit(1);
});
