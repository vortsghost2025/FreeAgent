/**
 * Test publisher - sends tasks to Event Bus
 * Run this to test the parallel agent system
 */

const { createEventBus, STREAMS } = require('./eventBus');

async function main() {
  console.log('\n========================================');
  console.log('FreeAgent Event Bus - Test Publisher');
  console.log('========================================\n');
  
  const eventBus = await createEventBus();
  
  // Send multiple tasks in parallel
  const tasks = [
    {
      type: 'code',
      payload: { language: 'javascript', feature: 'user auth' },
      agentType: 'code'
    },
    {
      type: 'test',
      payload: { file: 'auth.js', coverage: 80 },
      agentType: 'test'
    },
    {
      type: 'data',
      payload: { query: 'SELECT * FROM users', format: 'json' },
      agentType: 'data'
    },
    {
      type: 'code',
      payload: { language: 'python', feature: 'data processing' },
      agentType: 'code'
    },
    {
      type: 'code',
      payload: { language: 'typescript', feature: 'api client' },
      agentType: 'code'
    }
  ];
  
  console.log('Publishing 5 tasks...\n');
  
  for (const task of tasks) {
    const result = await eventBus.publishTask(task);
    console.log(`✓ Published: ${task.type} task (${result.id})`);
  }
  
  console.log('\n✓ All tasks published!');
  console.log('Start agent workers to process them in parallel.\n');
  
  // Publish a system event
  await eventBus.publishEvent({
    type: 'test_run',
    message: '5 tasks dispatched'
  });
  
  await eventBus.disconnect();
}

main().catch(console.error);
