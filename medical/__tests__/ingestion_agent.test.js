// FILE: __tests__/ingestion_agent.test.js
const { createIngestionAgent } = require('../agents/ingestion_agent');

test('ingestion factory and contract', async () => {
  const agent = createIngestionAgent('test-001');
  expect(agent.agentId).toBe('test-001');
  expect(agent.role).toBeDefined();
  expect(typeof agent.run).toBe('function');

  const task = { id: 't1', timestamp: new Date().toISOString(), data: { raw: 'test' }, debug: true };
  const state = { pipelineStart: new Date().toISOString(), processedBy: [] };

  const res = await agent.run(task, state);
  expect(res).toBeDefined();
  expect(res.task).toBeDefined();
  expect(res.state).toBeDefined();
  expect(Array.isArray(res.state.processedBy)).toBe(true);
  expect(res.state.processedBy).toContain('test-001');
  expect(res.state.ingestionComplete).toBe(true);
});

test('ingestion normalizes data structure', async () => {
  const agent = createIngestionAgent('norm-001');
  const task = {
    id: 't2',
    timestamp: new Date().toISOString(),
    data: {
      raw: 'patient data',
      source: 'test-harness',
      format: 'text'
    }
  };
  const state = { pipelineStart: new Date().toISOString(), processedBy: [] };

  const res = await agent.run(task, state);

  expect(res.task.data.content).toBeDefined();
  expect(res.task.data.contentType).toBeDefined();
  expect(res.task.data.timestamp).toBeDefined();
  expect(res.task.data.format).toBe('normalized');
  expect(res.task.data.structure).toBeDefined();
  expect(res.task.data.structure.hasStructuredData).toBe(true);
});
