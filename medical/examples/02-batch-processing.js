/**
 * EXAMPLE 2: Batch Processing
 *
 * This example shows how to process multiple inputs efficiently.
 */

import { createMedicalOrchestrator } from '../medical-workflows.js';

async function batchProcessingExample() {
  console.log('=== EXAMPLE 2: Batch Processing ===\n');

  const orchestrator = createMedicalOrchestrator();

  // Sample dataset
  const inputs = [
    {
      raw: { reportedItems: ['fever', 'cough'], severity: 'mild' },
      source: 'portal',
      timestamp: new Date().toISOString()
    },
    {
      raw: { testName: 'CBC', value: 12.5, unit: '10^3/uL' },
      source: 'lab',
      timestamp: new Date().toISOString()
    },
    {
      raw: { studyType: 'Chest X-Ray', impression: 'Normal' },
      source: 'radiology',
      timestamp: new Date().toISOString()
    },
    {
      raw: { measurements: [{ name: 'BP', value: '120/80', unit: 'mmHg' }] },
      source: 'vitals',
      timestamp: new Date().toISOString()
    },
    {
      raw: { noteType: 'Progress Note', assessment: 'Stable' },
      source: 'ehr',
      timestamp: new Date().toISOString()
    }
  ];

  console.log(`Processing ${inputs.length} inputs...\n`);

  // Sequential processing
  console.log('--- Sequential Processing ---');
  const start1 = Date.now();
  const results1 = [];

  for (const input of inputs) {
    try {
      const result = await orchestrator.executePipeline(input);
      results1.push({ success: true, data: result });
    } catch (error) {
      results1.push({ success: false, error: error.message });
    }
  }

  const time1 = Date.now() - start1;
  console.log(`Time: ${time1}ms (${(time1 / inputs.length).toFixed(2)}ms avg per item)`);

  // Concurrent processing
  console.log('\n--- Concurrent Processing ---');
  const start2 = Date.now();

  const results2 = await Promise.allSettled(
    inputs.map(input => orchestrator.executePipeline(input))
  );

  const time2 = Date.now() - start2;
  console.log(`Time: ${time2}ms (${(time2 / inputs.length).toFixed(2)}ms avg per item)`);
  console.log(`Speedup: ${(time1 / time2).toFixed(2)}x faster`);

  // Display results summary
  console.log('\n--- Results Summary ---');
  const successful = results2.filter(r => r.status === 'fulfilled').length;
  const failed = results2.filter(r => r.status === 'rejected').length;

  console.log(`Total: ${results2.length}`);
  console.log(`Success: ${successful} (${(successful / results2.length * 100).toFixed(0)}%)`);
  console.log(`Failed: ${failed}`);

  // Classification breakdown
  console.log('\n--- Classification Breakdown ---');
  const classificationCounts = {};

  results2.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      const type = result.value.output.classification.type;
      classificationCounts[type] = (classificationCounts[type] || 0) + 1;
      console.log(`Input ${i + 1}: ${type.toUpperCase()} (confidence: ${result.value.output.classification.confidence.toFixed(2)})`);
    } else {
      console.log(`Input ${i + 1}: FAILED - ${result.reason.message}`);
    }
  });

  console.log('\n--- Type Counts ---');
  Object.entries(classificationCounts).forEach(([type, count]) => {
    console.log(`${type}: ${count}`);
  });
}

// Run example
batchProcessingExample().catch(console.error);
