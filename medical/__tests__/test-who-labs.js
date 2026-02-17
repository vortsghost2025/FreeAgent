/**
 * WHO Laboratory Results Test Suite
 * Tests WHO lab data mapping, threshold evaluation, and alert generation
 */

import { mapWHOToInternal } from '../who/who-mapper.js';
import { evaluateRules } from '../ruleEngine.js';

console.log('=== WHO LABORATORY RESULTS TEST SUITE ===\n');

// TEST 1: Critical troponin level
console.log('TEST 1: Critical Troponin Level');
const criticalTroponin = {
  source: 'who-laboratory',
  caseId: 'WHO-LAB-001',
  laboratoryResults: {
    tests: [{
      testCode: 'LOINC:10839-9',
      testName: 'Troponin I',
      value: 12.0,
      unit: 'ng/mL',
      referenceRange: '< 0.04'
    }]
  }
};

const mapped1 = mapWHOToInternal(criticalTroponin);
console.log('Mapped:', JSON.stringify(mapped1.raw, null, 2));

// TODO: Add rule evaluation once lab thresholds are implemented
// const evaluation1 = await evaluateRules(criticalTroponin, { version: '2024', debug: true });
// console.log('Evaluation:', evaluation1);

console.log('✅ TEST 1 Complete\n');

// TODO: Add more test cases
// - Normal lab values
// - Multiple tests in panel
// - Missing reference ranges
// - Abnormal flags
// - LOINC code validation

console.log('✅ WHO LABORATORY TEST SUITE COMPLETE\n');
console.log('📝 TODO: Implement lab threshold evaluation in ruleEngine.js');
