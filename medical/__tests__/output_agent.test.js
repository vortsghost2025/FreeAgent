// FILE: __tests__/output_agent.test.js
const { createOutputAgent } = require('../agents/output_agent');

test('output factory and contract', async () => {
  const agent = createOutputAgent('out-001');
  const task = {
    id: 't5',
    timestamp: new Date().toISOString(),
    data: {
      raw: {},
      timestamp: new Date().toISOString()
    },
    classification: {
      type: 'other',
      confidence: 0.5
    },
    summary: {
      fields: {},
      completeness: 1.0
    },
    riskScore: {
      score: 0.1,
      flags: []
    },
    debug: true
  };
  const state = {
    pipelineStart: new Date().toISOString(),
    processedBy: ['ing-001', 'tri-001', 'sum-001', 'risk-001'],
    ingestionComplete: true,
    triageComplete: true,
    summarizationComplete: true,
    riskScoringComplete: true
  };

  const res = await agent.run(task, state);
  expect(res.task.output).toBeDefined();
  expect(res.state.outputComplete).toBe(true);
});

test('output generates human summary', async () => {
  const agent = createOutputAgent('out-002');
  const task = {
    id: 't6',
    timestamp: new Date().toISOString(),
    data: {
      raw: {},
      timestamp: new Date().toISOString()
    },
    classification: {
      type: 'symptoms',
      confidence: 0.85
    },
    summary: {
      fields: {},
      completeness: 0.9
    },
    riskScore: {
      score: 0.2,
      flags: []
    }
  };
  const state = {
    pipelineStart: new Date().toISOString(),
    processedBy: ['ing-001', 'tri-001', 'sum-001', 'risk-001'],
    ingestionComplete: true,
    triageComplete: true,
    summarizationComplete: true,
    riskScoringComplete: true
  };

  const res = await agent.run(task, state);
  expect(res.task.output.humanSummary).toBeDefined();
  expect(typeof res.task.output.humanSummary).toBe('string');
  expect(res.task.output.humanSummary).toContain('symptoms');
  expect(res.task.output.humanSummary).toContain('85%');
});

test('output validates invariants', async () => {
  const agent = createOutputAgent('out-003');
  const task = {
    id: 't7',
    timestamp: new Date().toISOString(),
    data: {
      raw: {},
      timestamp: new Date().toISOString()
    },
    classification: { type: 'labs', confidence: 0.7 },
    summary: { fields: {}, completeness: 1.0 },
    riskScore: { score: 0.0, flags: [] }
  };

  // Missing some completion flags - should throw error
  const incompleteState = {
    pipelineStart: new Date().toISOString(),
    processedBy: [],
    ingestionComplete: true
    // Missing: triageComplete, summarizationComplete, riskScoringComplete
  };

  await expect(agent.run(task, incompleteState)).rejects.toThrow('Invariant violation');
});

test('output includes provenance and audit trail', async () => {
  const agent = createOutputAgent('out-004');
  const task = {
    id: 't8',
    timestamp: new Date().toISOString(),
    data: {
      raw: { test: 'data' },
      timestamp: new Date().toISOString()
    },
    classification: { type: 'notes', confidence: 0.9 },
    summary: { fields: {}, completeness: 1.0 },
    riskScore: { score: 0.1, flags: [] }
  };
  const state = {
    pipelineStart: new Date().toISOString(),
    processedBy: ['ing-001', 'tri-001', 'sum-001', 'risk-001'],
    ingestionComplete: true,
    triageComplete: true,
    summarizationComplete: true,
    riskScoringComplete: true
  };

  const res = await agent.run(task, state);
  expect(res.task.output.provenance).toBeDefined();
  expect(res.task.output.provenance.createdByAgentId).toBe('out-004');
  expect(res.task.output.auditLog).toBeDefined();
  expect(Array.isArray(res.task.output.auditLog)).toBe(true);
  expect(res.task.output.pipeline).toEqual(state.processedBy);
});
