/**
 * MEDICAL MODULE COMPREHENSIVE TEST HARNESS
 * Tests all 6 classification types + edge cases
 * Run with: node test-harness.js
 */

import { createMedicalOrchestrator } from './medical-workflows.js';

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// -------------------------
// Test Scenarios
// -------------------------

const testCases = {
  // 1. SYMPTOMS - Patient-reported symptoms
  symptoms_moderate: {
    name: "Symptoms - Moderate Severity",
    input: {
      raw: {
        reportedItems: ["headache", "fever", "fatigue"],
        severity: "moderate",
        duration: "3 days",
        onset: "gradual",
        context: "No recent travel"
      },
      format: "structured",
      source: "patient-portal",
      timestamp: new Date().toISOString()
    },
    expectedType: "symptoms",
    expectedCompleteness: "> 0.8"
  },

  symptoms_severe: {
    name: "Symptoms - Severe with Associated Symptoms",
    input: {
      raw: {
        reportedItems: ["chest pain", "shortness of breath"],
        severity: "severe",
        duration: "2 hours",
        onset: "sudden",
        laterality: "left-sided",
        associatedSymptoms: ["nausea", "sweating"]
      },
      format: "structured",
      source: "emergency-intake",
      timestamp: new Date().toISOString()
    },
    expectedType: "symptoms",
    expectedCompleteness: "1.0"
  },

  // 2. LABS - Laboratory results
  labs_cbc: {
    name: "Labs - Complete Blood Count",
    input: {
      raw: {
        testName: "CBC",
        results: [
          { name: "WBC", value: 12.5, unit: "K/uL", referenceRange: "4.5-11.0" },
          { name: "RBC", value: 4.8, unit: "M/uL", referenceRange: "4.5-5.5" },
          { name: "Hemoglobin", value: 14.2, unit: "g/dL", referenceRange: "13.5-17.5" }
        ],
        abnormalFlags: ["WBC_HIGH"],
        collectionTime: new Date().toISOString()
      },
      format: "structured",
      source: "lab-system",
      timestamp: new Date().toISOString()
    },
    expectedType: "labs",
    expectedCompleteness: "1.0"
  },

  labs_metabolic: {
    name: "Labs - Basic Metabolic Panel",
    input: {
      raw: {
        testName: "BMP",
        results: [
          { name: "Glucose", value: 105, unit: "mg/dL" },
          { name: "Sodium", value: 138, unit: "mmol/L" },
          { name: "Potassium", value: 4.2, unit: "mmol/L" }
        ],
        referenceRange: ["70-100 mg/dL", "135-145 mmol/L", "3.5-5.0 mmol/L"],
        abnormalFlags: ["GLUCOSE_HIGH"],
        collectionTime: new Date(Date.now() - 3600000).toISOString()
      },
      format: "structured",
      source: "lab-system",
      timestamp: new Date().toISOString()
    },
    expectedType: "labs",
    expectedCompleteness: "1.0"
  },

  // 3. IMAGING - Radiology reports
  imaging_chest_xray: {
    name: "Imaging - Chest X-Ray",
    input: {
      raw: {
        studyType: "Chest X-Ray",
        bodyRegion: "chest",
        impression: "Clear lung fields, no acute cardiopulmonary abnormality",
        findings: ["Normal cardiac silhouette", "No pleural effusion", "No pneumothorax"],
        reportDate: new Date().toISOString()
      },
      format: "structured",
      source: "radiology-pacs",
      timestamp: new Date().toISOString()
    },
    expectedType: "imaging",
    expectedCompleteness: "1.0"
  },

  imaging_ct_abdomen: {
    name: "Imaging - CT Abdomen/Pelvis",
    input: {
      raw: {
        studyType: "CT",
        bodyRegion: "abdomen/pelvis",
        impression: "Small liver lesion, likely benign cyst. Follow-up recommended.",
        findings: [
          "2.3cm low-density lesion in right hepatic lobe",
          "No other acute findings",
          "Normal appendix"
        ],
        reportDate: new Date(Date.now() - 7200000).toISOString()
      },
      format: "structured",
      source: "radiology-pacs",
      timestamp: new Date().toISOString()
    },
    expectedType: "imaging",
    expectedCompleteness: "1.0"
  },

  // 4. VITALS - Vital signs measurements
  vitals_er: {
    name: "Vitals - Emergency Room Intake",
    input: {
      raw: {
        measurements: [
          { name: "BP", value: "145/92", unit: "mmHg" },
          { name: "HR", value: 88, unit: "bpm" },
          { name: "Temp", value: 98.6, unit: "F" },
          { name: "SpO2", value: 97, unit: "%" },
          { name: "RR", value: 16, unit: "breaths/min" }
        ],
        measurementSource: "automated-cuff",
        trendSummary: "BP elevated compared to baseline"
      },
      format: "structured",
      source: "vital-signs-monitor",
      timestamp: new Date().toISOString()
    },
    expectedType: "vitals",
    expectedCompleteness: "1.0"
  },

  vitals_icu: {
    name: "Vitals - ICU Monitoring",
    input: {
      raw: {
        measurements: [
          { name: "BP", value: "110/70", unit: "mmHg" },
          { name: "HR", value: 72, unit: "bpm" },
          { name: "CVP", value: 8, unit: "mmHg" },
          { name: "SpO2", value: 99, unit: "%" }
        ],
        measurementSource: "arterial-line",
        trendSummary: "Stable hemodynamics"
      },
      format: "structured",
      source: "icu-monitor",
      timestamp: new Date().toISOString()
    },
    expectedType: "vitals",
    expectedCompleteness: "1.0"
  },

  // 5. NOTES - Clinical notes
  notes_admission: {
    name: "Notes - Admission Note",
    input: {
      raw: {
        noteType: "admission",
        authorRole: "attending-physician",
        chiefComplaint: "Chest pain",
        assessment: "Likely musculoskeletal etiology. Cardiac workup negative.",
        plan: "Observe overnight. Repeat troponin in AM. Discharge if stable.",
        keyFindings: ["Normal EKG", "Negative troponin", "Reproducible chest wall tenderness"]
      },
      format: "structured",
      source: "emr-system",
      timestamp: new Date().toISOString()
    },
    expectedType: "notes",
    expectedCompleteness: "1.0"
  },

  notes_progress: {
    name: "Notes - Progress Note",
    input: {
      raw: {
        noteType: "progress",
        authorRole: "resident",
        chiefComplaint: "Post-op day 2 status",
        assessment: "Recovering well from appendectomy. Tolerating diet. Pain controlled.",
        plan: "Continue current management. Advance diet as tolerated. D/C planning for tomorrow.",
        keyFindings: ["Afebrile", "Incision clean/dry/intact", "Bowel sounds present"]
      },
      format: "structured",
      source: "emr-system",
      timestamp: new Date().toISOString()
    },
    expectedType: "notes",
    expectedCompleteness: "1.0"
  },

  // 6. EDGE CASES - Testing robustness
  edge_empty: {
    name: "Edge Case - Empty Data",
    input: {
      raw: {},
      format: "text",
      timestamp: new Date().toISOString()
    },
    expectedType: "other",
    expectedCompleteness: "< 1.0"
  },

  edge_text_only: {
    name: "Edge Case - Text-Only Input",
    input: {
      raw: "Patient reports feeling unwell",
      format: "text"
    },
    expectedType: "other",
    expectedCompleteness: "< 1.0"
  },

  edge_missing_timestamp: {
    name: "Edge Case - Missing Timestamp",
    input: {
      raw: {
        testName: "Urinalysis",
        results: []
      },
      format: "structured",
      source: "lab-system"
      // No timestamp
    },
    expectedType: "labs",
    expectedCompleteness: "< 1.0"
  },

  edge_unstructured_imaging: {
    name: "Edge Case - Unstructured Imaging Report",
    input: {
      raw: "MRI brain: No acute intracranial abnormality. Age-appropriate volume loss.",
      format: "text",
      source: "radiology-pacs",
      timestamp: new Date().toISOString()
    },
    expectedType: "other", // Should classify as 'other' due to lack of structure
    expectedCompleteness: "< 1.0"
  }
};

// -------------------------
// Test Runner
// -------------------------

async function runAllTests() {
  console.log(`${colors.bright}${colors.cyan}╔═══════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║   MEDICAL MODULE COMPREHENSIVE TEST HARNESS                   ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║   Testing all 6 classification types + edge cases             ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚═══════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log();

  const orchestrator = createMedicalOrchestrator();
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
  };

  for (const [key, testCase] of Object.entries(testCases)) {
    results.total++;
    console.log(`${colors.bright}${colors.blue}[TEST ${results.total}/${Object.keys(testCases).length}]${colors.reset} ${testCase.name}`);
    console.log(`${colors.cyan}Expected:${colors.reset} type=${testCase.expectedType}, completeness${testCase.expectedCompleteness}`);

    try {
      const startTime = Date.now();
      const result = await orchestrator.executePipeline(testCase.input);
      const processingTime = Date.now() - startTime;

      // Validate results
      const actualType = result.output.classification.type;
      const actualCompleteness = result.output.summary.completeness;
      const actualRiskScore = result.output.riskScore.score;

      // Check if test passed
      const typeMatch = actualType === testCase.expectedType;
      const completenessMatch = evaluateCompleteness(actualCompleteness, testCase.expectedCompleteness);
      const testPassed = typeMatch && completenessMatch;

      if (testPassed) {
        results.passed++;
        console.log(`${colors.green}✓ PASS${colors.reset} (${processingTime}ms)`);
      } else {
        results.failed++;
        console.log(`${colors.red}✗ FAIL${colors.reset}`);
        if (!typeMatch) {
          console.log(`  ${colors.red}Type mismatch:${colors.reset} expected=${testCase.expectedType}, actual=${actualType}`);
        }
        if (!completenessMatch) {
          console.log(`  ${colors.red}Completeness mismatch:${colors.reset} expected${testCase.expectedCompleteness}, actual=${actualCompleteness}`);
        }
      }

      // Display key metrics
      console.log(`  ${colors.cyan}Type:${colors.reset} ${actualType} (confidence: ${result.output.classification.confidence})`);
      console.log(`  ${colors.cyan}Completeness:${colors.reset} ${actualCompleteness}`);
      console.log(`  ${colors.cyan}Risk Score:${colors.reset} ${actualRiskScore}`);
      console.log(`  ${colors.cyan}Flags:${colors.reset} ${result.output.riskScore.flags.length > 0 ? result.output.riskScore.flags.map(f => f.flag).join(', ') : 'none'}`);
      console.log(`  ${colors.cyan}Agents:${colors.reset} ${result.output.pipeline.join(' → ')}`);
      console.log();

      results.tests.push({
        name: testCase.name,
        passed: testPassed,
        actualType,
        actualCompleteness,
        actualRiskScore,
        processingTime
      });

    } catch (error) {
      results.failed++;
      console.log(`${colors.red}✗ ERROR${colors.reset}`);
      console.log(`  ${colors.red}${error.message}${colors.reset}`);
      console.log();

      results.tests.push({
        name: testCase.name,
        passed: false,
        error: error.message
      });
    }
  }

  // Print summary
  console.log();
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}                     TEST SUMMARY                               ${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log();
  console.log(`${colors.bright}Total Tests:${colors.reset}    ${results.total}`);
  console.log(`${colors.green}${colors.bright}Passed:${colors.reset}         ${results.passed}${colors.reset}`);
  console.log(`${colors.red}${colors.bright}Failed:${colors.reset}         ${results.failed}${colors.reset}`);
  console.log(`${colors.bright}Success Rate:${colors.reset}   ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log();

  // Show failed tests details
  if (results.failed > 0) {
    console.log(`${colors.red}${colors.bright}Failed Tests:${colors.reset}`);
    results.tests.filter(t => !t.passed).forEach(t => {
      console.log(`  ${colors.red}✗${colors.reset} ${t.name}`);
      if (t.error) {
        console.log(`    Error: ${t.error}`);
      }
    });
    console.log();
  }

  // Performance metrics
  const avgProcessingTime = results.tests
    .filter(t => t.processingTime)
    .reduce((sum, t) => sum + t.processingTime, 0) / results.tests.filter(t => t.processingTime).length;

  console.log(`${colors.cyan}${colors.bright}Performance Metrics:${colors.reset}`);
  console.log(`  Average processing time: ${avgProcessingTime.toFixed(2)}ms`);
  console.log(`  Fastest: ${Math.min(...results.tests.filter(t => t.processingTime).map(t => t.processingTime))}ms`);
  console.log(`  Slowest: ${Math.max(...results.tests.filter(t => t.processingTime).map(t => t.processingTime))}ms`);
  console.log();

  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.green}                  ALL TESTS COMPLETE                           ${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log();

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Helper function to evaluate completeness expectations
function evaluateCompleteness(actual, expected) {
  if (expected === "1.0") {
    return actual === 1.0;
  } else if (expected.startsWith("> ")) {
    const threshold = parseFloat(expected.substring(2));
    return actual > threshold;
  } else if (expected.startsWith("< ")) {
    const threshold = parseFloat(expected.substring(2));
    return actual < threshold;
  }
  return true;
}

// Run all tests
runAllTests().catch(err => {
  console.error(`${colors.red}${colors.bright}Fatal error:${colors.reset}`, err);
  process.exit(1);
});
