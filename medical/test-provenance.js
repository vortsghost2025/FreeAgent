/**
 * Test Data Provenance Enhancement
 */

import { createMedicalOrchestrator } from './medical-workflows.js';

console.log('=== TESTING DATA PROVENANCE ===\n');

const orchestrator = createMedicalOrchestrator();

const input = {
  raw: {
    reportedItems: ['headache', 'fever'],
    severity: 'moderate'
  },
  source: 'test',
  timestamp: new Date().toISOString()
};

const result = await orchestrator.executePipeline(input);

console.log('✅ Pipeline Complete\n');

if (result.output && result.output.provenance) {
  console.log('📋 DATA PROVENANCE:');
  console.log(JSON.stringify(result.output.provenance, null, 2));
} else {
  console.log('❌ No provenance data found');
  console.log('Output keys:', Object.keys(result.output || {}));
}

console.log('\n📊 Full Output Summary:');
console.log('- Timestamp:', result.output?.timestamp);
console.log('- Pipeline Version:', result.output?.pipelineVersion);
console.log('- Module Version:', result.output?.provenance?.moduleVersion);
console.log('- Module Hash:', result.output?.provenance?.moduleHash);
console.log('- Node Version:', result.output?.provenance?.executionEnvironment?.nodeVersion);
console.log('- Processed By:', result.output?.pipeline?.join(' → '));
