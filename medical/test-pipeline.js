/**
 * TEST PIPELINE HARNESS
 * Verifies all agents are properly invoked and return correct structure
 *
 * Run with: node test-pipeline.js
 */

const { createMedicalOrchestrator } = require('./medical-workflows.js');

// Test data for each classification type
const testCases = {
  symptoms: {
    raw: "Patient reports headache, fever, and nausea for 3 days",
    format: "text",
    source: "test-harness",
    timestamp: new Date().toISOString(),
    symptoms: ["headache", "fever", "nausea"],
    reportedItems: ["headache", "fever", "nausea"],
    duration: "3 days",
    severity: "moderate"
  },

  labs: {
    raw: "CBC test results",
    format: "structured",
    source: "test-harness",
    timestamp: new Date().toISOString(),
    testName: "Complete Blood Count",
    results: [
      { name: "WBC", value: 7.5, unit: "K/uL", timestamp: new Date().toISOString() },
      { name: "RBC", value: 4.5, unit: "M/uL", timestamp: new Date().toISOString() }
    ],
    referenceRange: [
      { name: "WBC", low: 4.5, high: 11.0, unit: "K/uL" },
      { name: "RBC", low: 4.0, high: 5.5, unit: "M/uL" }
    ],
    collectionTime: new Date().toISOString()
  },

  notes: {
    raw: "Admission note for patient presenting with chest pain",
    format: "text",
    source: "test-harness",
    timestamp: new Date().toISOString(),
    noteType: "admission",
    authorRole: "physician",
    chiefComplaint: "chest pain",
    assessment: "Possible acute coronary syndrome",
    plan: "Admit to cardiology, serial troponins, ECG"
  },

  imaging: {
    raw: "Chest X-ray report",
    format: "structured",
    source: "test-harness",
    timestamp: new Date().toISOString(),
    studyType: "XR",
    bodyRegion: "chest",
    impression: "No acute cardiopulmonary process",
    findings: ["Clear lung fields", "Normal heart size"],
    reportDate: new Date().toISOString()
  },

  vitals: {
    raw: "Vital signs recorded",
    format: "structured",
    source: "test-harness",
    timestamp: new Date().toISOString(),
    measurements: [
      { type: "BP", value: 120, unit: "mmHg", timestamp: new Date().toISOString() },
      { type: "HR", value: 75, unit: "bpm", timestamp: new Date().toISOString() },
      { type: "Temp", value: 98.6, unit: "F", timestamp: new Date().toISOString() }
    ],
    trendSummary: "stable",
    measurementSource: "device"
  }
};

/**
 * Run test pipeline for a single test case
 */
async function runTest(testName, testData) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: ${testName.toUpperCase()}`);
  console.log('='.repeat(60));

  try {
    const orchestrator = createMedicalOrchestrator();

    // Run pipeline
    const result = await orchestrator.executePipeline(testData);

    // Verify result structure
    console.log('\n✓ Pipeline completed successfully');
    console.log(`  Processing time: ${result.processingTime}ms`);
    console.log(`  Agents executed: ${result.state.processedBy.length}/5`);
    console.log(`  Agent chain: ${result.state.processedBy.join(' → ')}`);

    // Verify all agents ran
    const expectedAgents = 5;
    if (result.state.processedBy.length !== expectedAgents) {
      throw new Error(`Expected ${expectedAgents} agents, got ${result.state.processedBy.length}`);
    }

    // Verify output structure
    if (!result.output) {
      throw new Error('Missing output in result');
    }

    // Print classification
    const classification = result.output.classification;
    console.log(`\n  Classification:`);
    console.log(`    Type: ${classification.type}`);
    console.log(`    Confidence: ${classification.confidence}`);
    console.log(`    Route: ${classification.route}`);

    // Print risk score
    const riskScore = result.output.riskScore;
    console.log(`\n  Risk Score:`);
    console.log(`    Score: ${riskScore.score}`);
    console.log(`    Flags: ${riskScore.flags.length}`);
    if (riskScore.flags.length > 0) {
      riskScore.flags.forEach(flag => {
        console.log(`      - [${flag.severity.toUpperCase()}] ${flag.flag}: ${flag.reason}`);
      });
    }

    // Print human summary
    console.log(`\n  Human Summary:`);
    console.log(`    ${result.output.humanSummary}`);

    // Print audit log
    console.log(`\n  Audit Log:`);
    result.auditLog.forEach((entry, idx) => {
      console.log(`    ${idx + 1}. ${entry.role} (${entry.agentId}) - ${entry.status} in ${entry.processingTime}ms`);
      if (entry.stateFlags) {
        console.log(`       Flags: ${entry.stateFlags.join(', ')}`);
      }
    });

    console.log(`\n✓ TEST PASSED: ${testName}`);
    return true;

  } catch (error) {
    console.error(`\n✗ TEST FAILED: ${testName}`);
    console.error(`  Error: ${error.message}`);
    console.error(`  Stack: ${error.stack}`);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('MEDICAL PIPELINE TEST HARNESS');
  console.log('='.repeat(60));
  console.log('Testing agent invocation and pipeline integrity');

  const results = {};

  for (const [testName, testData] of Object.entries(testCases)) {
    results[testName] = await runTest(testName, testData);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = Object.values(results).filter(r => r).length;
  const failed = Object.values(results).filter(r => !r).length;
  const total = Object.keys(results).length;

  for (const [testName, result] of Object.entries(results)) {
    const status = result ? '✓ PASS' : '✗ FAIL';
    console.log(`  ${status}: ${testName}`);
  }

  console.log(`\nTotal: ${passed}/${total} passed, ${failed}/${total} failed`);

  if (failed === 0) {
    console.log('\n✓ ALL TESTS PASSED');
    process.exit(0);
  } else {
    console.log('\n✗ SOME TESTS FAILED');
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  runTest,
  runAllTests,
  testCases
};
