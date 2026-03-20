/**
 * Example: Using the Agent Loop Template
 * 
 * This shows how any agent can be created with just a role + handler
 */

// ============================================
// EXAMPLE 1: Coder Agent
// ============================================

const { quickAgent, createAgentLoop } = require('./agentLoop');
const { ROLES, PRIORITY, SOURCES, createTask } = require('./eventBusConstants');
const { createEventBus } = require('./eventBus');

// --- Simple coder using quickAgent ---
async function startCoderAgent() {
  const coder = quickAgent(ROLES.CODER, async (task) => {
    console.log(`[Coder] Received:`, task.payload);
    
    // Your AI coding logic here
    const result = {
      files: ['main.js', 'utils.js'],
      language: 'javascript'
    };
    
    return result;
  });
  
  await coder.start();
  coder.consume();
  
  process.on('SIGINT', async () => {
    coder.stop();
    await coder.disconnect();
    process.exit(0);
  });
}

// --- More complex agent with custom worker name ---
async function startResearcherAgent() {
  const researcher = createAgentLoop({
    agentRole: ROLES.RESEARCHER,
    workerName: 'researcher-primary',
    handler: async (task) => {
      console.log(`[Researcher] Doing research on:`, task.payload.query);
      
      // Your research logic here
      return {
        findings: ['result1', 'result2'],
        sources: 5
      };
    },
    onError: (error, task) => {
      console.error(`[Researcher] Failed:`, task.task_id);
    }
  });
  
  await researcher.start();
  researcher.consume();
}

// ============================================
// EXAMPLE 2: Publisher (from router/cockpit)
// ============================================

async function publishTask(agentRole, payload, options = {}) {
  const eventBus = await createEventBus();
  
  const task = createTask({
    taskId: options.taskId || require('uuid').v4(),
    agentRole,
    payload,
    priority: options.priority || PRIORITY.NORMAL,
    sessionId: options.sessionId || '',
    source: options.source || SOURCES.COCKPIT
  });
  
  const result = await eventBus.publishTask(task);
  await eventBus.disconnect();
  
  return result;
}

// Example usage:
// await publishTask(ROLES.CODER, { language: 'python', feature: 'auth' });
// await publishTask(ROLES.RESEARCHER, { query: 'latest AI news' });

// ============================================
// EXAMPLE 3: Running Multiple Agent Types
// ============================================

/**
 * Start all agent types in one process (for testing)
 */
async function startAllAgents() {
  const agents = [
    { role: ROLES.CODER, handler: (t) => ({ code: 'generated' }) },
    { role: ROLES.RESEARCHER, handler: (t) => ({ results: [] }) },
    { role: ROLES.TEST, handler: (t) => ({ passed: true }) }
  ];
  
  for (const { role, handler } of agents) {
    const agent = quickAgent(role, handler);
    await agent.start();
    agent.consume();
  }
  
  console.log('All agents started');
}

// Run if executed directly
if (require.main === module) {
  const role = process.argv[2];
  
  if (role === 'coder') {
    startCoderAgent();
  } else if (role === 'researcher') {
    startResearcherAgent();
  } else if (role === 'all') {
    startAllAgents();
  } else {
    console.log('Usage: node agentExamples.js [coder|researcher|all]');
    process.exit(1);
  }
}

module.exports = {
  quickAgent,
  createAgentLoop,
  publishTask
};
