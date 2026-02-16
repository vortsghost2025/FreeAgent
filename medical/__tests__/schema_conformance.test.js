// FILE: __tests__/schema_conformance.test.js
const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true });

test('normalized data conforms to minimal schema', async () => {
  const { createIngestionAgent } = require('../agents/ingestion_agent');
  const agent = createIngestionAgent('test-schema');
  const task = { id: 't-schema', timestamp: new Date().toISOString(), data: { raw: 'x' } };
  const state = { pipelineStart: new Date().toISOString(), processedBy: [] };

  const res = await agent.run(task, state);
  const normalized = res.task.data;

  const normalizedSchema = {
    type: 'object',
    required: ['content', 'contentType', 'timestamp', 'format', 'structure'],
    properties: {
      content: { type: 'string' },
      contentType: { type: 'string' },
      timestamp: { type: 'string' },
      format: { type: 'string' },
      structure: {
        type: 'object',
        required: ['hasStructuredData', 'fieldCount', 'estimatedLength'],
        properties: {
          hasStructuredData: { type: 'boolean' },
          fieldCount: { type: 'number' },
          estimatedLength: { type: 'number' }
        }
      }
    }
  };

  const valid = ajv.validate(normalizedSchema, normalized);
  if (!valid) console.error('AJV errors', ajv.errors);
  expect(valid).toBe(true);
});

test('classification conforms to schema', async () => {
  const { createTriageAgent } = require('../agents/triage_agent');
  const agent = createTriageAgent('test-class');
  const task = {
    id: 't-class',
    timestamp: new Date().toISOString(),
    data: {
      raw: 'test',
      content: 'test',
      structure: {}
    }
  };
  const state = { pipelineStart: new Date().toISOString(), processedBy: [] };

  const res = await agent.run(task, state);
  const classification = res.task.classification;

  const classificationSchema = {
    type: 'object',
    required: ['type', 'confidence', 'route'],
    properties: {
      type: { type: 'string', enum: ['symptoms', 'notes', 'labs', 'imaging', 'vitals', 'other'] },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      route: { type: 'string' },
      indicators: { type: 'array' },
      flags: { type: 'array' }
    }
  };

  const valid = ajv.validate(classificationSchema, classification);
  if (!valid) console.error('AJV errors', ajv.errors);
  expect(valid).toBe(true);
});

test('risk score conforms to schema', async () => {
  const { createRiskAgent } = require('../agents/risk_agent');
  const agent = createRiskAgent('test-risk');
  const task = {
    id: 't-risk',
    timestamp: new Date().toISOString(),
    data: {
      timestamp: new Date().toISOString(),
      source: 'test',
      structure: { estimatedLength: 100 }
    },
    summary: { fields: {}, completeness: 1.0 },
    classification: { type: 'other', confidence: 0.5 }
  };
  const state = { pipelineStart: new Date().toISOString(), processedBy: [] };

  const res = await agent.run(task, state);
  const riskScore = res.task.riskScore;

  const riskScoreSchema = {
    type: 'object',
    required: ['score', 'factors', 'flags', 'scoringMethod', 'confidence'],
    properties: {
      score: { type: 'number', minimum: 0, maximum: 1 },
      factors: { type: 'array' },
      flags: {
        type: 'array',
        items: {
          type: 'object',
          required: ['flag', 'severity', 'reason'],
          properties: {
            flag: { type: 'string' },
            severity: { type: 'string', enum: ['low', 'medium', 'high'] },
            reason: { type: 'string' }
          }
        }
      },
      scoringMethod: { type: 'string' },
      confidence: { type: 'number', minimum: 0, maximum: 1 }
    }
  };

  const valid = ajv.validate(riskScoreSchema, riskScore);
  if (!valid) console.error('AJV errors', ajv.errors);
  expect(valid).toBe(true);
});
