# Medical Module Usage Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Basic Usage](#basic-usage)
3. [Classification Examples](#classification-examples)
4. [Advanced Features](#advanced-features)
5. [Best Practices](#best-practices)
6. [Common Patterns](#common-patterns)

## Getting Started

### Prerequisites
- Node.js 18+ (ES6 modules support)
- npm or yarn

### Installation

```bash
cd medical
npm install
```

### Your First Pipeline

```javascript
import { createMedicalOrchestrator } from './medical-workflows.js';

// Create orchestrator
const orchestrator = createMedicalOrchestrator();

// Prepare input
const input = {
  raw: {
    reportedItems: ['fever', 'cough'],
    severity: 'mild',
    duration: '2 days'
  },
  source: 'patient-portal',
  timestamp: new Date().toISOString()
};

// Execute pipeline
const result = await orchestrator.executePipeline(input);

// Access results
console.log('Type:', result.output.classification.type); // 'symptoms'
console.log('Confidence:', result.output.classification.confidence); // 0.7
console.log('Risk:', result.output.riskScore.severity); // 'low'
```

## Basic Usage

### Input Format

All inputs must follow this structure:

```javascript
{
  raw: { /* your data - can be object or string */ },
  source: 'system-identifier', // optional, defaults to 'unknown'
  timestamp: '2026-02-17T12:00:00Z' // optional, auto-generated if missing
}
```

### Output Format

```javascript
{
  output: {
    normalized: {
      raw,           // original data preserved
      content,       // human-readable extracted content
      contentType,   // 'text' or 'structured'
      timestamp,
      source,
      structure      // structural analysis
    },
    classification: {
      type,          // 'symptoms', 'labs', 'imaging', 'vitals', 'notes',  'other'
      confidence,    // 0.0-1.0
      route,         // routing key
      indicators,    // what triggered classification
      flags          // any warnings
    },
    summary: {
      fields,        // type-specific extracted fields
      extractionMethod,
      fieldsExtracted,
      completeness,  // 0.0-1.0
      keyValuePairs
    },
    riskScore: {
      score,         // 0.0-1.0
      severity,      // 'low', 'medium', 'high'
      factors,       // risk factors identified
      flags          // structural issues found
    }
  },
  state: {
    ingestionComplete,
    triageComplete,
    summarizationComplete,
    riskScoringComplete,
    outputComplete,
    processedBy        // array of agent IDs
  }
}
```

## Classification Examples

### Example 1: Patient Symptoms

```javascript
const symptomsInput = {
  raw: {
    reportedItems: [
      'severe headache',
      'photophobia',
      'neck stiffness'
    ],
    severity: 'severe',
    onset: 'sudden',
    duration: '4 hours',
    associatedSymptoms: ['fever']
  },
  source: 'emergency-department',
  timestamp: new Date().toISOString()
};

const result = await orchestrator.executePipeline(symptomsInput);

console.log(result.output.summary.fields);
// {
//   reportedItems: ['severe headache', 'photophobia', 'neck stiffness'],
//   severity: 'severe',
//   onset: 'sudden',
//   duration: '4 hours',
//   associatedSymptoms: ['fever'],
//   ...
// }
```

### Example 2: Lab Results

```javascript
const labInput = {
  raw: {
    testName: 'Troponin I',
    value: 2.5,
    unit: 'ng/mL',
    referenceRange: '< 0.04',
    abnormalFlag: 'HIGH',
    collectionTime: '2026-02-17T08:00:00Z'
  },
  source: 'lab-information-system',
  timestamp: new Date().toISOString()
};

const result = await orchestrator.executePipeline(labInput);

console.log(result.output.classification);
// { type: 'labs', confidence: 0.8, ... }

console.log(result.output.riskScore);
// { score: 0.6, severity: 'high', factors: [...], flags: [...] }
```

### Example 3: Imaging Report

```javascript
const imagingInput = {
  raw: {
    studyType: 'CT Head without Contrast',
    bodyRegion: 'Head',
    modality: 'CT',
    indication: 'Acute headache, rule out intracranial hemorrhage',
    technique: 'Axial images from skull base to vertex',
    findings: 'No acute intracranial abnormality. No hemorrhage, mass effect, or midline shift.',
    impression: 'Negative CT head'
  },
  source: 'radiology-pacs',
  timestamp: new Date().toISOString()
};

const result = await orchestrator.executePipeline(imagingInput);

console.log(result.output.summary.fields);
// {
//   studyType: 'CT Head without Contrast',
//   bodyRegion: 'Head',
//   modality: 'CT',
//   impression: 'Negative CT head',
//   ...
// }
```

### Example 4: Vital Signs

```javascript
const vitalsInput = {
  raw: {
    measurements: [
      { name: 'BP', value: '180/110', unit: 'mmHg' },
      { name: 'HR', value: 115, unit: 'bpm' },
      { name: 'Temp', value: 101.2, unit: 'F' },
      { name: 'RR', value: 24, unit: 'breaths/min' },
      { name: 'SpO2', value: 92, unit: '%' }
    ],
    measurementSource: 'automated-monitor',
    measurementTime: '2026-02-17T12:30:00Z',
    trendSummary: 'BP and HR elevated from baseline'
  },
  source: 'vital-signs-monitor',
  timestamp: new Date().toISOString()
};

const result = await orchestrator.executePipeline(vitalsInput);

console.log(result.output.classification.type); // 'vitals'
console.log(result.output.riskScore.severity); // 'high'
```

### Example 5: Clinical Note

```javascript
const noteInput = {
  raw: {
    noteType: 'Progress Note',
    date: '2026-02-17',
    chiefComplaint: 'Hospital day 2, pneumonia',
    subjective: 'Patient reports improved breathing, less cough',
    objective: 'Vitals stable, lung sounds improved',
    assessment: 'Community-acquired pneumonia, responding to antibiotics',
    plan: 'Continue current antibiotics, likely discharge tomorrow'
  },
  source: 'ehr-system',
  timestamp: new Date().toISOString()
};

const result = await orchestrator.executePipeline(noteInput);

console.log(result.output.summary.fields);
// {
//   noteType: 'Progress Note',
//   chiefComplaint: 'Hospital day 2, pneumonia',
//   assessment: 'Community-acquired pneumonia, responding to antibiotics',
//   plan: 'Continue current antibiotics, likely discharge tomorrow',
//   ...
// }
```

### Example 6: Unstructured Text

```javascript
const textInput = {
  raw: 'Patient is a 45-year-old male presenting with sudden onset severe chest pain radiating to left arm, associated with diaphoresis and nausea. Pain started 2 hours ago while at rest.',
  source: 'ems-report',
  timestamp: new Date().toISOString()
};

const result = await orchestrator.executePipeline(textInput);

console.log(result.output.classification.type); // 'symptoms'
console.log(result.output.normalized.content); // "patient is a 45-year-old..."
```

## Advanced Features

### Error Handling

```javascript
import { ValidationError, AgentError } from './utils/validators.js';

try {
  const result = await orchestrator.executePipeline(input);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation Error:');
    console.error('  Field:', error.field);
    console.error('  Message:', error.message);
    console.error('  Value:', error.value);
  } else if (error instanceof AgentError) {
    console.error('Agent Error:');
    console.error('  Agent:', error.agentId);
    console.error('  Phase:', error.phase);
    console.error('  Message:', error.message);
  } else {
    console.error('Unknown Error:', error.message);
  }
}
```

### Custom Logging

```javascript
import { createLogger, LogLevel } from './utils/logger.js';

// Create custom logger
const logger = createLogger({
  level: LogLevel.WARN, // Only warnings and above
  format: 'json', // JSON format for log aggregation
  enableColors: false,
  enableTimestamps: true
});

// Add metadata
logger.addMetadata('environment', 'production');
logger.addMetadata('version', '1.0.0');

// Use logger
logger.info('pipeline', 'Starting execution', { pipelineId: '123' });
logger.error('agent-001', 'Processing failed', { error: 'details' });

// Create agent-specific logger
const agentLogger = logger.forAgent('triage-001');
agentLogger.info('Classification complete');
```

### Health Monitoring

```javascript
import { createHealthMonitor } from './utils/health-monitor.js';

// Create monitor with custom thresholds
const healthMonitor = createHealthMonitor({
  failureRateThreshold: 0.05, // 5%
  avgExecutionTimeThreshold: 20, // 20ms
  lowConfidenceThreshold: 0.15 // 15%
});

const metrics = healthMonitor.getMetrics();

// Process multiple pipelines
for (const input of inputs) {
  metrics.recordPipelineStart();
  const start = Date.now();

  try {
    const result = await orchestrator.executePipeline(input);
    const executionTime = Date.now() - start;
    metrics.recordPipelineSuccess(executionTime, result);

    // Record agent metrics
    for (const agentId of result.state.processedBy) {
      metrics.recordAgentExecution(agentId, 'AGENT', 2, true);
    }
  } catch (error) {
    const executionTime = Date.now() - start;
    metrics.recordPipelineFailure(executionTime, error);
  }
}

// Check health
const health = healthMonitor.getHealthStatus();
if (health.status !== 'healthy') {
  console.warn('System Health:', health.status);
  console.warn('Alerts:', health.alerts);
}

// Get detailed metrics
const summary = metrics.getSummary();
console.log('Performance:', summary.performance);
console.log('Classifications:', summary.classification);
console.log('Error Rates:', summary.errors);
```

## Best Practices

### 1. Always Provide Source

```javascript
// Good
{
  raw: {...},
  source: 'patient-portal', // Clear provenance
  timestamp: new Date().toISOString()
}

// Avoid
{
  raw: {...}
  // Missing source - defaults to 'unknown'
}
```

### 2. Use Structured Data When Possible

```javascript
// Better - will classify with higher confidence
{
  raw: {
    studyType: 'Chest X-Ray',
    findings: '...',
    impression: '...'
  }
}

// Still works, but lower confidence
{
  raw: 'Chest X-Ray shows...'
}
```

### 3. Handle Errors Gracefully

```javascript
// Good - specific error handling
try {
  const result = await orchestrator.executePipeline(input);
  // Process result
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation errors
  } else if (error instanceof AgentError) {
    // Handle agent errors
  } else {
    // Handle unknown errors
  }
}

// Avoid - swallowing errors silently
try {
  await orchestrator.executePipeline(input);
} catch (error) {
  // Nothing
}
```

### 4. Monitor Performance in Production

```javascript
const healthMonitor = createHealthMonitor();
const metrics = healthMonitor.getMetrics();

// Periodically check health
setInterval(() => {
  const health = healthMonitor.getHealthStatus();
  if (health.status !== 'healthy') {
    alertOps(health);
  }
}, 60000); // Every minute
```

## Common Patterns

### Pattern 1: Batch Processing

```javascript
const inputs = [/* array of inputs */];
const results = [];

for (const input of inputs) {
  try {
    const result = await orchestrator.executePipeline(input);
    results.push({ success: true, data: result });
  } catch (error) {
    results.push({ success: false, error: error.message });
  }
}

console.log(`Processed: ${results.length}`);
console.log(`Success: ${results.filter(r => r.success).length}`);
console.log(`Failed: ${results.filter(r => !r.success).length}`);
```

### Pattern 2: Concurrent Processing

```javascript
const inputs = [/* array of inputs */];

// Process all concurrently
const results = await Promise.all(
  inputs.map(input => orchestrator.executePipeline(input))
);

// With error handling
const results = await Promise.allSettled(
  inputs.map(input => orchestrator.executePipeline(input))
);

results.forEach((result, i) => {
  if (result.status === 'fulfilled') {
    console.log(`Input ${i}: Success`);
  } else {
    console.error(`Input ${i}: Failed - ${result.reason.message}`);
  }
});
```

### Pattern 3: Conditional Processing

```javascript
const result = await orchestrator.executePipeline(input);

// Route based on classification
switch (result.output.classification.type) {
  case 'symptoms':
    await handleSymptoms(result);
    break;
  case 'labs':
    await handleLabResults(result);
    break;
  case 'imaging':
    await handleImagingReport(result);
    break;
  case 'vitals':
    await handleVitalSigns(result);
    break;
  default:
    await handle UnclassifiedData(result);
}

// Route based on risk
if (result.output.riskScore.severity === 'high') {
  await escalate ToExpert(result);
} else {
  await routineProcessing(result);
}
```

### Pattern 4: Data Enrichment

```javascript
// Process input through pipeline
const result = await orchestrator.executePipeline(input);

// Enrich with external data
const enriched = {
  ...result.output,
  patientId: correlatePatientId(result),
  encounter: findEncounter(result),
  additionalContext: fetchContext(result)
};

// Store enriched result
await storeInDatabase(enriched);
```

## Troubleshooting

### Classification Returning 'other'

**Symptom**: Input is being classified as 'other' instead of expected type

**Causes**:
- Content doesn't match keyword patterns
- Confidence below 0.3 threshold
- Missing structural hints

**Solutions**:
```javascript
// Check confidence
console.log(result.output.classification.confidence);

// Check indicators
console.log(result.output.classification.indicators);

// If needed, add more keywords to triage agent
// Or restructure input to include type-specific fields
```

### Missing Fields in Summary

**Symptom**: Expected fields not appearing in summary.fields

**Causes**:
- Input not structured according to type schema
- Fields have null/undefined values
- Field names don't match expected schema

**Solutions**:
```javascript
// Check what was extracted
console.log(result.output.summary.fields);
console.log(result.output.summary.completeness);

// Ensure input follows expected structure
const betterInput = {
  raw: {
    testName: 'CBC', // Required field for labs
    results: [...],  // Required field for labs
    // ... other required fields
  }
};
```

### Slow Execution

**Symptom**: Pipeline taking longer than expected

**Causes**:
- Very large input payload
- System resource constraints

**Solutions**:
```javascript
// Check execution time
const start = Date.now();
const result = await orchestrator.executePipeline(input);
console.log(`Execution time: ${Date.now() - start}ms`);

// Check payload size
console.log('Content length:', result.output.normalized.content.length);

// Use health monitoring to track performance
const metrics = healthMonitor.getMetrics();
console.log('Avg time:', metrics.getSummary().performance.avgExecutionTime);
```

---

**Need more help?** Check out the [Architecture Documentation](./docs/ARCHITECTURE.md) or [README](./README.md).
