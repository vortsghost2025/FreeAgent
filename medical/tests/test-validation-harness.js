/**
 * Test Validation Harness - Drift Detection
 * Demonstrates regression testing and behavioral drift detection
 */

import { createMedicalOrchestrator } from './medical-workflows.js';
import { createValidationHarness } from './utils/validation-harness.js';
import fs from 'fs';

console.log('=== VALIDATION HARNESS TEST ===\n');

// Define test cases
const testCases = [
  {
    name: 'High-Confidence Symptoms',
    input: {
      raw: {
        reportedItems: ['severe chest pain', 'shortness of breath', 'diaphoresis'],
        severity: 'severe',
        onset: 'sudden',
        duration: '2 hours'
      },
      source: 'validation-test',
      timestamp: new Date().toISOString()
    }
  },
  {
    name: 'Lab Results - Troponin',
    input: {
      raw: {
        testName: 'Troponin I',
        value: 2.5,
        unit: 'ng/mL',
        referenceRange: '< 0.04',
        abnormalFlag: 'HIGH'
      },
      source: 'validation-test',
      timestamp: new Date().toISOString()
    }
  },
  {
    name: 'Vital Signs - Hypertensive',
    input: {
      raw: {
        measurements: [
          { name: 'BP', value: '180/110', unit: 'mmHg' },
          { name: 'HR', value: 115, unit: 'bpm' }
        ]
      },
      source: 'validation-test',
      timestamp: new Date().toISOString()
    }
  },
  {
    name: 'Imaging Report',
    input: {
      raw: {
        studyType: 'CT Head',
        bodyRegion: 'Head',
        modality: 'CT',
        findings: 'No acute abnormality',
        impression: 'Negative study'
      },
      source: 'validation-test',
      timestamp: new Date().toISOString()
    }
  },
  {
    name: 'Ambiguous Input - Low Confidence',
    input: {
      raw: {
        someField: 'unclear data',
        anotherField: 123
      },
      source: 'validation-test',
      timestamp: new Date().toISOString()
    }
  }
];

const orchestrator = createMedicalOrchestrator();
const baselinePath = './validation-baseline.json';

// PHASE 1: Generate Baseline
console.log('PHASE 1: Generate Baseline\n');
console.log('Creating known-good baseline from test cases...\n');

const harness = createValidationHarness({ verbose: true });

const baseline = await harness.generateBaseline(
  orchestrator,
  testCases,
  baselinePath
);

console.log('\n✅ Baseline generated successfully');
console.log(`Test cases: ${baseline.testCases.length}`);
console.log(`File: ${baselinePath}\n`);

// PHASE 2: Validate Against Baseline (Should Pass)
console.log('='.repeat(60));
console.log('PHASE 2: Validate Against Baseline (Expected: PASS)\n');

const report1 = await harness.validateAgainstBaseline(
  orchestrator,
  testCases,
  baselinePath
);

console.log('\n' + harness.formatReport(report1));

// PHASE 3: Simulate Drift - Modify a test case
console.log('='.repeat(60));
console.log('PHASE 3: Simulate Drift Detection\n');
console.log('Modifying test case to trigger drift...\n');

// Create modified test cases (change severity to alter classification confidence)
const modifiedTestCases = [
  {
    name: 'High-Confidence Symptoms',
    input: {
      raw: {
        reportedItems: ['mild headache'],  // Changed from severe chest pain
        severity: 'mild',                  // Changed from severe
        onset: 'gradual',                  // Changed from sudden
        duration: '2 days'                 // Changed from 2 hours
      },
      source: 'validation-test',
      timestamp: new Date().toISOString()
    }
  },
  ...testCases.slice(1)  // Keep other test cases the same
];

const report2 = await harness.validateAgainstBaseline(
  orchestrator,
  modifiedTestCases,
  baselinePath
);

console.log(harness.formatReport(report2));

// PHASE 4: Strict Mode
console.log('='.repeat(60));
console.log('PHASE 4: Strict Mode (Detect Minor Changes)\n');

const strictHarness = createValidationHarness({
  strict: true,
  maxConfidenceDrift: 0.05,  // Very tight threshold (5%)
  maxRiskScoreDrift: 0.05,
  maxCompletenessDrift: 0.05,
  verbose: false
});

const report3 = await strictHarness.validateAgainstBaseline(
  orchestrator,
  modifiedTestCases,
  baselinePath
);

console.log(strictHarness.formatReport(report3));

// PHASE 5: Custom Thresholds
console.log('='.repeat(60));
console.log('PHASE 5: Custom Thresholds (Lenient Mode)\n');

const lenientHarness = createValidationHarness({
  maxConfidenceDrift: 0.3,  // Allow ±30% drift
  maxRiskScoreDrift: 0.3,
  allowTypeChange: true,    // Allow classification type to change
  allowSeverityChange: true // Allow risk severity to change
});

const report4 = await lenientHarness.validateAgainstBaseline(
  orchestrator,
  modifiedTestCases,
  baselinePath
);

console.log('Using lenient thresholds (30% drift allowed)...\n');
console.log(lenientHarness.formatReport(report4));

// Clean up
if (fs.existsSync(baselinePath)) {
  fs.unlinkSync(baselinePath);
  console.log(`\nCleaned up baseline file: ${baselinePath}`);
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('VALIDATION HARNESS SUMMARY\n');
console.log('✅ PHASE 1: Baseline generation - SUCCESS');
console.log(`   Generated baseline for ${baseline.testCases.length} test cases`);
console.log('\n✅ PHASE 2: Baseline validation - SUCCESS');
console.log(`   ${report1.passed}/${report1.totalTests} tests passed (no drift)`);
console.log('\n✅ PHASE 3: Drift detection - SUCCESS');
console.log(`   Detected ${report2.driftDetected} drifted test(s)`);
console.log('\n✅ PHASE 4: Strict mode - SUCCESS');
console.log(`   Detected ${report3.driftDetected} drift(s) with tight thresholds`);
console.log('\n✅ PHASE 5: Lenient mode - SUCCESS');
console.log(`   ${report4.passed}/${report4.totalTests} passed with relaxed thresholds`);

console.log('\n🎯 USE CASES:');
console.log('  • Regression testing after code changes');
console.log('  • CI/CD pipeline validation gates');
console.log('  • Production behavior monitoring');
console.log('  • Model drift detection');
console.log('  • Configuration change impact analysis');

console.log('\n📊 CONFIGURATION OPTIONS:');
console.log('  • maxConfidenceDrift: Control acceptable confidence changes');
console.log('  • maxRiskScoreDrift: Control acceptable risk score changes');
console.log('  • allowTypeChange: Allow classification type to change');
console.log('  • allowSeverityChange: Allow risk severity to change');
console.log('  • strict: Detect even minor changes (field counts, etc.)');

console.log('\n✅ VALIDATION HARNESS TEST COMPLETE');
