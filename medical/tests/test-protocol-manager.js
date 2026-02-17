/**
 * test-protocol-manager.js
 * Comprehensive test suite for Protocol Manager (10 protocols unified)
 */

import ProtocolManager from '../clinical-intelligence/protocol-manager.js';
import { loadStandards } from '../rules/ruleEngine.js';

console.log('🚀 Protocol Manager Test Suite - 10 Unified Emergency Protocols\n');

const standards = loadStandards('2024');
const manager = new ProtocolManager(standards, { debug: false });

// Show all available protocols
console.log('═══════════════════════════════════════════════════════════════');
console.log('📋 PROTOCOL REGISTRY');
console.log('═══════════════════════════════════════════════════════════════\n');

const allProtocols = manager.getAllProtocols();
console.log(`V2 Suite (5 protocols):`);
allProtocols.v2.forEach((p, i) => {
  console.log(`  ${i + 1}. ${p.name} [${p.priority}]`);
});

console.log(`\nExtended Suite (5 protocols):`);
allProtocols.extended.forEach((p, i) => {
  console.log(`  ${i + 1}. ${p.name} [${p.priority}]`);
});

console.log(`\nTotal: ${allProtocols.total} emergency protocols registered\n`);

// Complex test cases
const testCases = [
  {
    name: 'Multi-Protocol: Septic Shock + Altered Mental Status',
    patient: {
      symptoms: [
        { term: 'fever', severity: 'critical' },
        { term: 'confusion', severity: 'critical' },
        { term: 'sepsis', severity: 'critical' }
      ],
      vitalSigns: {
        temperature: 39.8,
        bloodPressure: { systolic: 75, diastolic: 40 },
        heartRate: 135,
        respiratoryRate: 28
      },
      laboratoryResults: {
        tests: [
          { testName: 'Lactate', value: 4.2, unit: 'mmol/L' },
          { testName: 'WBC', value: 22, unit: 'K/uL' }
        ]
      }
    },
    expectedPrimary: 'Sepsis Protocol'
  },
  {
    name: 'Conflict Case: Chest Pain - STEMI vs ACS vs Anaphylaxis',
    patient: {
      symptoms: [
        { term: 'chest pain', severity: 'critical' },
        { term: 'urticaria', severity: 'moderate' },
        { term: 'stridor', severity: 'moderate' }
      ],
      vitalSigns: {
        bloodPressure: { systolic: 125, diastolic: 75 },
        heartRate: 105,
        respiratoryRate: 20,
        oxygenSaturation: 92
      },
      laboratoryResults: {
        tests: [
          { testName: 'Troponin I', value: 0.12, unit: 'ng/mL' }
        ]
      }
    },
    expectedPrimary: 'STEMI Protocol',
    expectsConflict: true
  },
  {
    name: 'Conflict Case: Stroke-like Symptoms with Seizure',
    patient: {
      symptoms: [
        { term: 'stroke', severity: 'critical' },
        { term: 'facial droop', severity: 'severe' },
        { term: 'status epilepticus', severity: 'critical' }
      ],
      vitalSigns: {
        bloodPressure: { systolic: 145, diastolic: 85 },
        heartRate: 120,
        respiratoryRate: 28
      },
      laboratoryResults: {
        tests: [
          { testName: 'Glucose', value: 95, unit: 'mg/dL' }
        ]
      }
    },
    expectedPrimary: 'Acute Stroke Protocol',
    expectsConflict: true
  },
  {
    name: 'Severe Hypoglycemia with Seizure Activity',
    patient: {
      symptoms: [
        { term: 'severe hypoglycemia', severity: 'critical' },
        { term: 'seizure', severity: 'critical' },
        { term: 'loss of consciousness', severity: 'critical' }
      ],
      vitalSigns: {
        bloodPressure: { systolic: 110, diastolic: 70 },
        heartRate: 125,
        respiratoryRate: 22
      },
      laboratoryResults: {
        tests: [
          { testName: 'Glucose', value: 28, unit: 'mg/dL' }
        ]
      }
    },
    expectedPrimary: 'Severe Hypoglycemia Protocol'
  }
];

// Run comprehensive tests
testCases.forEach((testCase, index) => {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`TEST ${index + 1}: ${testCase.name}`);
  console.log(`${'═'.repeat(70)}\n`);

  const result = manager.evaluateAllProtocols(testCase.patient);

  console.log(`Protocols Evaluated: ${result.totalProtocolsEvaluated}`);
  console.log(`Protocols Activated: ${result.totalProtocolsActivated}`);
  console.log(`Processing Time: ${result.processingTime.toFixed(2)}ms\n`);

  if (result.primaryProtocol) {
    const isPrimary = result.primaryProtocol.protocol === testCase.expectedPrimary;
    const checkmark = isPrimary ? '✅' : '⚠️ ';
    console.log(`${checkmark} PRIMARY PROTOCOL: ${result.primaryProtocol.protocol}`);
    console.log(`   Score: ${result.primaryProtocol.score.toFixed(1)}/100`);
    console.log(`   Priority: ${result.primaryProtocol.priority}`);
    console.log(`   Triggers: ${result.primaryProtocol.triggerType}`);
    console.log(`   Actions: ${result.primaryProtocol.immediateActions.length}`);
  }

  if (result.activatedProtocols.length > 1) {
    console.log(`\n🚨 ALL ACTIVATED PROTOCOLS (${result.activatedProtocols.length}):`);
    result.activatedProtocols.forEach((proto, i) => {
      console.log(`   ${i + 1}. ${proto.protocol} [${proto.priority}] - ${proto.score.toFixed(0)}/100`);
    });
  }

  if (result.competingProtocols.length > 0) {
    if (!testCase.expectsConflict) {
      console.log(`\n⚠️  UNEXPECTED CONFLICTS DETECTED:`);
    } else {
      console.log(`\n✓ DETECTED COMPETING PROTOCOLS (as expected):`);
    }
    result.competingProtocols.forEach(conflict => {
      console.log(`\n   Family: ${conflict.family}`);
      conflict.protocols.forEach(p => console.log(`     • ${p}`));
      console.log(`   Recommendation: ${conflict.recommendation}`);
    });
  } else if (testCase.expectsConflict) {
    console.log(`\n⚠️  EXPECTED CONFLICTS NOT DETECTED`);
  }
});

// Benchmark summary
console.log(`\n\n${'═'.repeat(70)}`);
console.log(`📊 UNIFIED 10-PROTOCOL SYSTEM PERFORMANCE`);
console.log(`${'═'.repeat(70)}\n`);

const testData = testCases[0].patient;
let totalTime = 0;
const iterations = 100;

for (let i = 0; i < iterations; i++) {
  const start = performance.now();
  manager.evaluateAllProtocols(testData);
  const elapsed = performance.now() - start;
  totalTime += elapsed;
}

const avgTime = totalTime / iterations;
const casesPerSec = (1000 / avgTime).toFixed(0);

console.log(`100 evaluations completed:`);
console.log(`  Total Time: ${totalTime.toFixed(1)}ms`);
console.log(`  Average/Case: ${avgTime.toFixed(3)}ms`);
console.log(`  Cases/Second: ${casesPerSec}`);
console.log(`  v2 Protocols: 5`);
console.log(`  Extended Protocols: 5`);
console.log(`  Total Coverage: 10 emergency protocols\n`);

console.log(`${'═'.repeat(70)}`);
console.log(`✅ Protocol Manager Tests Complete`);
console.log(`${'═'.repeat(70)}\n`);
