/**
 * EXAMPLE 1: Basic Pipeline Usage
 *
 * This example shows the simplest way to use the medical module.
 */

import { createMedicalOrchestrator } from '../medical-workflows.js';

async function basicExample() {
  console.log('=== EXAMPLE 1: Basic Pipeline Usage ===\n');

  // Create orchestrator
  const orchestrator = createMedicalOrchestrator();

  // Prepare input
  const input = {
    raw: {
      reportedItems: ['headache', 'fever', 'nausea'],
      severity: 'moderate',
      duration: '2 days'
    },
    source: 'patient-portal',
    timestamp: new Date().toISOString()
  };

  console.log('Input:', JSON.stringify(input, null, 2));

  // Execute pipeline
  const start = Date.now();
  const result = await orchestrator.executePipeline(input);
  const executionTime = Date.now() - start;

  // Display results
  console.log('\n=== RESULTS ===');
  console.log('Execution Time:', executionTime, 'ms');
  console.log('\nClassification:');
  console.log('  Type:', result.output.classification.type);
  console.log('  Confidence:', result.output.classification.confidence);
  console.log('  Indicators:', result.output.classification.indicators.join(', '));

  console.log('\nSummary:');
  console.log('  Reported Items:', result.output.summary.fields.reportedItems);
  console.log('  Severity:', result.output.summary.fields.severity);
  console.log('  Duration:', result.output.summary.fields.duration);
  console.log('  Completeness:', (result.output.summary.completeness * 100).toFixed(0) + '%');

  console.log('\nRisk Score:');
  console.log('  Score:', result.output.riskScore.score);
  console.log('  Severity:', result.output.riskScore.severity.toUpperCase());
  console.log('  Flags:', result.output.riskScore.flags.length);

  console.log('\nProcessed By:', result.state.processedBy.join(' → '));
}

// Run example
basicExample().catch(console.error);
