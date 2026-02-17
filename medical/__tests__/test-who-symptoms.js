/**
 * WHO Symptoms Test Suite
 * Tests WHO symptom data mapping, classification, and severity assessment
 */

import { mapWHOToInternal } from '../who/who-mapper.js';
import { evaluateRules } from '../ruleEngine.js';
import { enableWHODebugMode } from '../utils/config.js';

console.log('=== WHO SYMPTOMS TEST SUITE ===\n');

// Uncomment to enable debug logging
// enableWHODebugMode();

// TEST 1: Severe respiratory symptoms
console.log('TEST 1: Severe Respiratory Symptoms');
const severeRespiratoryCase = {
  source: 'who-surveillance',
  caseId: 'WHO-2024-001',
  symptoms: {
    list: [
      { term: 'severe chest pain', severity: 'severe' },
      { term: 'difficulty breathing', severity: 'critical' },
      { term: 'high fever', severity: 'severe' }
    ]
  }
};

const mapped1 = mapWHOToInternal(severeRespiratoryCase);
console.log('Mapped to internal format:', JSON.stringify(mapped1, null, 2));

const evaluation1 = await evaluateRules(severeRespiratoryCase, { version: '2024' });
console.log('Rule evaluation result:', JSON.stringify(evaluation1, null, 2));

console.log(`✅ TEST 1 Complete - Risk: ${evaluation1.riskSeverity}\n`);

// TEST 2: Mild symptoms
console.log('TEST 2: Mild Symptoms');
const mildCase = {
  source: 'who-clinical',
  symptoms: {
    list: [
      { term: 'mild cough', severity: 'mild' },
      { term: 'runny nose', severity: 'mild' }
    ]
  }
};

const mapped2 = mapWHOToInternal(mildCase);
const evaluation2 = await evaluateRules(mildCase, { version: '2024' });
console.log(`✅ TEST 2 Complete - Risk: ${evaluation2.riskSeverity}\n`);

// TODO: Add more test cases
// - Mixed severity symptoms
// - Symptoms with free text
// - Multi-language symptoms (2025 standards)
// - Unknown symptoms
// - Empty symptom lists

console.log('✅ WHO SYMPTOMS TEST SUITE COMPLETE\n');
console.log('📝 TODO: Add additional test cases for comprehensive coverage');
