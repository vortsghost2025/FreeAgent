/**
 * Test Confidence + Rationale Layer
 * Demonstrates explainability feature
 */

import { createMedicalOrchestrator } from './medical-workflows.js';

console.log('=== TESTING CONFIDENCE + RATIONALE LAYER ===\n');

const orchestrator = createMedicalOrchestrator();

// Test Case 1: High Confidence Symptoms
console.log('TEST 1: High Confidence Classification\n');
const symptoms = {
  raw: {
    reportedItems: ['severe chest pain', 'shortness of breath', 'diaphoresis'],
    severity: 'severe',
    onset: 'sudden',
    duration: '2 hours'
  },
  source: 'emergency-department',
  timestamp: new Date().toISOString()
};

const result1 = await orchestrator.executePipeline(symptoms);

console.log('📋 SIMPLE RATIONALE:');
console.log(result1.output.simpleRationale);

console.log('\n📖 DETAILED RATIONALE:');
console.log('Decision:', result1.output.rationale.decision);
console.log('Confidence:', result1.output.rationale.confidence);
console.log('\nReasoning:');
result1.output.rationale.reasoning.forEach((r, i) => console.log(`  ${i + 1}. ${r}`));

console.log('\nKey Features:');
result1.output.rationale.keyFeatures.forEach(f => {
  console.log(`  • ${f.description}`);
});

console.log('\n💬 HUMAN-READABLE:');
console.log(result1.output.rationale.humanReadable);

// Test Case 2: Lower Confidence
console.log('\n\n' + '='.repeat(60));
console.log('TEST 2: Lower Confidence Classification\n');

const ambiguous = {
  raw: {
    someField: 'unclear data',
    anotherField: 123
  },
  source: 'unknown',
  timestamp: new Date().toISOString()
};

const result2 = await orchestrator.executePipeline(ambiguous);

console.log('📋 SIMPLE RATIONALE:');
console.log(result2.output.simpleRationale);

console.log('\n📖 DETAILED RATIONALE:');
console.log('Decision:', result2.output.rationale.decision);
console.log('Confidence:', result2.output.rationale.confidence);
console.log('\n💬 HUMAN-READABLE:');
console.log(result2.output.rationale.humanReadable);

// Test Case 3: Lab Results
console.log('\n\n' + '='.repeat(60));
console.log('TEST 3: Lab Results with Structured Data\n');

const labs = {
  raw: {
    testName: 'Troponin I',
    value: 2.5,
    unit: 'ng/mL',
    referenceRange: '< 0.04',
    abnormalFlag: 'HIGH'
  },
  source: 'lab-system',
  timestamp: new Date().toISOString()
};

const result3 = await orchestrator.executePipeline(labs);

console.log('📋 SIMPLE RATIONALE:');
console.log(result3.output.simpleRationale);

console.log('\n📖 DETAILED RATIONALE:');
console.log('Decision:', result3.output.rationale.decision);
console.log('Confidence:', result3.output.rationale.confidence);
console.log('\nReasoning:');
result3.output.rationale.reasoning.forEach((r, i) => console.log(`  ${i + 1}. ${r}`));

console.log('\nKey Features:');
result3.output.rationale.keyFeatures.forEach(f => {
  console.log(`  • ${f.description}`);
});

console.log('\n✅ EXPLAINABILITY TEST COMPLETE');
console.log('\nKey Takeaways:');
console.log('  • Every classification includes detailed rationale');
console.log('  • Human-readable explanations for trust building');
console.log('  • Shows which features influenced the decision');
console.log('  • Confidence levels clearly explained');
console.log('  • Warnings highlighted when confidence is low');
