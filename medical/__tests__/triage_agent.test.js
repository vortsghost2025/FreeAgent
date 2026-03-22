// FILE: __tests__/triage_agent.test.js
import { createTriageAgent } from '../agents/triage_agent.js';

test('triage factory and contract', async () => {
  const agent = createTriageAgent('triage-001');
  expect(agent.agentId).toBe('triage-001');
  expect(typeof agent.run).toBe('function');

  const task = {
    id: 't2',
    timestamp: new Date().toISOString(),
    data: {
      raw: 'fever and cough',
      content: 'fever and cough',
      structure: { hasStructuredData: false }
    },
    debug: true
  };
  const state = { pipelineStart: new Date().toISOString(), processedBy: [] };

  const res = await agent.run(task, state);
  expect(res.task.classification).toBeDefined();
  expect(typeof res.task.classification.type).toBe('string');
  expect(typeof res.task.classification.confidence).toBe('number');
  expect(res.state.triageComplete).toBe(true);
});

test('triage classifies symptoms correctly', async () => {
  const agent = createTriageAgent('triage-002');
  const task = {
    id: 't3',
    timestamp: new Date().toISOString(),
    data: {
      raw: {
        reportedItems: ['headache', 'fever'],
        symptoms: ['headache', 'fever'],
        severity: 'severe'
      },
      content: 'Patient reports severe headache and fever symptom complaint',
      structure: { hasStructuredData: true }
    }
  };
  const state = { pipelineStart: new Date().toISOString(), processedBy: [] };

  const res = await agent.run(task, state);
  expect(res.task.classification.type).toBe('symptoms');
  expect(res.task.classification.confidence).toBeGreaterThan(0);
  expect(res.state.inputType).toBe('symptoms');
});

test('triage classifies labs correctly', async () => {
  const agent = createTriageAgent('triage-003');
  const task = {
    id: 't4',
    timestamp: new Date().toISOString(),
    data: {
      raw: { testName: 'CBC', results: [] },
      content: 'CBC test results',
      structure: { hasStructuredData: true }
    }
  };
  const state = { pipelineStart: new Date().toISOString(), processedBy: [] };

  const res = await agent.run(task, state);
  expect(res.task.classification.type).toBe('labs');
});
