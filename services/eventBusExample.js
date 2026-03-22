/**
 * Example: Agent subscribing to Event Bus
 * 
 * This shows how agents can:
 * 1. Subscribe to task streams
 * 2. Process tasks in parallel
 * 3. Publish results back
 */

const { createEventBus, STREAMS } = require('./eventBus');

/**
 * Example task handler - processes different task types
 */
async function handleTask(task) {
  console.log(`\n[Agent] Processing task: ${task.type}`);
  console.log(`[Agent] Payload:`, task.payload);
  
  // Simulate work based on task type
  let result;
  
  switch (task.type) {
    case 'code':
      result = await processCodeTask(task.payload);
      break;
    case 'test':
      result = await processTestTask(task.payload);
      break;
    case 'data':
      result = await processDataTask(task.payload);
      break;
    default:
      result = { message: `Processed by agent`, taskType: task.type };
  }
  
  return result;
}

/**
 * Example: Code agent processing
 */
async function processCodeTask(payload) {
  // Simulate AI processing
  await simulateWork(500);
  
  return {
    action: 'code_generated',
    language: payload.language || 'javascript',
    lines: Math.floor(Math.random() * 100) + 10
  };
}

/**
 * Example: Test agent processing
 */
async function processTestTask(payload) {
  await simulateWork(300);
  
  return {
    action: 'tests_run',
    passed: Math.floor(Math.random() * 10) + 1,
    failed: 0
  };
}

/**
 * Example: Data agent processing  
 */
async function processDataTask(payload) {
  await simulateWork(200);
  
  return {
    action: 'data_analyzed',
    records: Math.floor(Math.random() * 1000) + 100
  };
}

/**
 * Simulate async work
 */
function simulateWork(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main: Start agent consumer
 */
async function main() {
  const agentType = process.argv[2] || 'code';
  
  console.log(`\n========================================`);
  console.log(`Starting FreeAgent: ${agentType.toUpperCase()} Agent`);
  console.log(`========================================\n`);
  
  // Create event bus consumer
  const eventBus = await createEventBus({
    consumerName: `freeagent-${agentType}`,
    stream: STREAMS.TASKS
  });
  
  // Subscribe to tasks
  await eventBus.subscribe(handleTask);
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n[Agent] Shutting down...');
    eventBus.stop();
    await eventBus.disconnect();
    process.exit(0);
  });
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { handleTask };
