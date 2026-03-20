// FILE: __tests__/risk_agent.test.js
import { createRiskAgent } from '../agents/risk_agent.js';

test('risk factory and contract', async () => {
  const agent = createRiskAgent('risk-001');
  const task = {
    id: 't4',
    timestamp: new Date().toISOString(),
    data: {
      timestamp: new Date().toISOString(),
      source: 'test',
      structure: { estimatedLength: 100 }
    },
    summary: {
      fields: {},
      completeness: 1.0
    },
    classification: {
      type: 'other',
      confidence: 0.8
    },
    debug: true
  };
  const state = { pipelineStart: new Date().toISOString(), processedBy: [] };

  const res = await agent.run(task, state);
  expect(res.task.riskScore).toBeDefined();
  expect(typeof res.task.riskScore.score).toBe('number');
  expect(Array.isArray(res.task.riskScore.flags)).toBe(true);
  expect(res.state.riskScoringComplete).toBe(true);
});

test('risk detects low confidence classification', async () => {
  const agent = createRiskAgent('risk-002');
  const task = {
    id: 't5',
    timestamp: new Date().toISOString(),
    data: {
      timestamp: new Date().toISOString(),
      source: 'test',
      structure: { estimatedLength: 100 }
    },
    summary: {
      fields: {},
      completeness: 1.0
    },
    classification: {
      type: 'symptoms',
      confidence: 0.2  // Below threshold
    }
  };
  const state = { pipelineStart: new Date().toISOString(), processedBy: [] };

  const res = await agent.run(task, state);
  expect(res.task.riskScore.score).toBeGreaterThan(0);
  expect(res.task.riskScore.flags.some(f => f.flag === 'low_confidence_classification')).toBe(true);
});

test('risk detects missing required fields', async () => {
  const agent = createRiskAgent('risk-003');
  const task = {
    id: 't6',
    timestamp: new Date().toISOString(),
    data: {
      timestamp: new Date().toISOString(),
      source: 'test',
      structure: { estimatedLength: 100 }
    },
    summary: {
      fields: {
        reportedItems: [],  // Empty, should flag
        severity: null      // Missing, should flag
      },
      completeness: 0.0
    },
    classification: {
      type: 'symptoms',
      confidence: 0.9
    }
  };
  const state = { pipelineStart: new Date().toISOString(), processedBy: [] };

  const res = await agent.run(task, state);
  const hasMissingFieldsFlag = res.task.riskScore.flags.some(f => f.flag === 'missing_required_fields');
  expect(hasMissingFieldsFlag).toBe(true);
});

test('risk detects partial extraction', async () => {
  const agent = createRiskAgent('risk-004');
  const task = {
    id: 't7',
    timestamp: new Date().toISOString(),
    data: {
      timestamp: new Date().toISOString(),
      source: 'test',
      structure: { estimatedLength: 100 }
    },
    summary: {
      fields: {},
      completeness: 0.4  // Below threshold
    },
    classification: {
      type: 'labs',
      confidence: 0.8
    }
  };
  const state = { pipelineStart: new Date().toISOString(), processedBy: [] };

  const res = await agent.run(task, state);
  const hasPartialFlag = res.task.riskScore.flags.some(f => f.flag === 'partial_extraction');
  expect(hasPartialFlag).toBe(true);
});
