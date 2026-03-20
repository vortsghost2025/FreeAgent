// FILE: __tests__/summarization_agent.test.js
import { createSummarizationAgent } from '../agents/summarization_agent.js';

test('summarization factory and contract', async () => {
  const agent = createSummarizationAgent('sum-001');
  const task = {
    id: 't3',
    timestamp: new Date().toISOString(),
    data: {
      raw: { testName: 'WBC', results: [] },
      content: 'lab: WBC 12.3'
    },
    classification: { type: 'labs', confidence: 0.8 },
    debug: true
  };
  const state = { pipelineStart: new Date().toISOString(), processedBy: [] };

  const res = await agent.run(task, state);
  expect(res.task.summary).toBeDefined();
  expect(res.task.summary.fields).toBeDefined();
  expect(typeof res.task.summary.completeness).toBe('number');
  expect(res.state.summarizationComplete).toBe(true);
});

test('summarization extracts symptom fields', async () => {
  const agent = createSummarizationAgent('sum-002');
  const task = {
    id: 't4',
    timestamp: new Date().toISOString(),
    data: {
      raw: {
        reportedItems: ['headache', 'fever'],
        severity: 'moderate',
        duration: '3 days'
      },
      content: 'headache and fever'
    },
    classification: { type: 'symptoms', confidence: 0.9 }
  };
  const state = { pipelineStart: new Date().toISOString(), processedBy: [] };

  const res = await agent.run(task, state);
  expect(res.task.summary.fields.reportedItems).toEqual(['headache', 'fever']);
  expect(res.task.summary.fields.severity).toBe('moderate');
  expect(res.task.summary.fields.duration).toBe('3 days');
  expect(res.task.summary.completeness).toBeGreaterThan(0);
});

test('summarization handles missing fields', async () => {
  const agent = createSummarizationAgent('sum-003');
  const task = {
    id: 't5',
    timestamp: new Date().toISOString(),
    data: {
      raw: {},
      content: 'empty data'
    },
    classification: { type: 'labs', confidence: 0.5 }
  };
  const state = { pipelineStart: new Date().toISOString(), processedBy: [] };

  const res = await agent.run(task, state);
  expect(res.task.summary.completeness).toBeLessThan(1.0);
});
