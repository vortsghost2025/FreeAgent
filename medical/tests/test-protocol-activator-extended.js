/**
 * test-protocol-activator-extended.js
 * Test suite for extended emergency protocols
 */

import { ProtocolActivatorExtended } from '../clinical-intelligence/protocol-activator-extended.js';

console.log('🧪 Extended Protocol Activator Test Suite\n');

const protocolActivatorExt = new ProtocolActivatorExtended();

// Test cases for 5 extended protocols
const testCases = [
  {
    name: 'STEMI Case',
    patient: {
      symptoms: [
        { term: 'chest pain', severity: 'critical' },
        { term: 'shortness of breath', severity: 'severe' },
        { term: 'diaphoresis', severity: 'severe' }
      ],
      vitalSigns: {
        bloodPressure: { systolic: 145, diastolic: 92 },
        heartRate: 115,
        respiratoryRate: 22
      },
      laboratoryResults: {
        tests: [
          { testName: 'Troponin I', value: 0.08, unit: 'ng/mL' },
          { testName: 'BNP', value: 500, unit: 'pg/mL' }
        ]
      }
    },
    expectedProtocol: 'STEMI Protocol'
  },
  {
    name: 'Sepsis Case',
    patient: {
      symptoms: [
        { term: 'fever', severity: 'moderate' },
        { term: 'confusion', severity: 'severe' }
      ],
      vitalSigns: {
        temperature: 39.2,
        bloodPressure: { systolic: 92, diastolic: 55 },
        heartRate: 125,
        respiratoryRate: 24
      },
      laboratoryResults: {
        tests: [
          { testName: 'Lactate', value: 3.5, unit: 'mmol/L' },
          { testName: 'WBC', value: 18.5, unit: 'K/uL' }
        ]
      }
    },
    expectedProtocol: 'Sepsis Protocol'
  },
  {
    name: 'Status Epilepticus Case',
    patient: {
      symptoms: [
        { term: 'status epilepticus', severity: 'critical' },
        { term: 'prolonged seizure', severity: 'critical' },
        { term: 'muscle rigidity', severity: 'severe' }
      ],
      vitalSigns: {
        heartRate: 145,
        respiratoryRate: 35,
        temperature: 38.5,
        oxygenSaturation: 91
      },
      laboratoryResults: {
        tests: [
          { testName: 'Glucose', value: 185, unit: 'mg/dL' },
          { testName: 'Phenytoin level', value: 15.2, unit: 'mcg/mL' }
        ]
      }
    },
    expectedProtocol: 'Status Epilepticus Protocol'
  },
  {
    name: 'Acute Stroke Case',
    patient: {
      symptoms: [
        { term: 'stroke', severity: 'critical' },
        { term: 'facial droop', severity: 'severe' },
        { term: 'arm weakness', severity: 'severe' },
        { term: 'speech difficulty', severity: 'severe' }
      ],
      vitalSigns: {
        bloodPressure: { systolic: 165, diastolic: 92 },
        heartRate: 88,
        respiratoryRate: 16
      },
      laboratoryResults: {
        tests: [
          { testName: 'Glucose', value: 145, unit: 'mg/dL' },
          { testName: 'INR', value: 1.1, unit: '' }
        ]
      }
    },
    expectedProtocol: 'Acute Stroke Protocol'
  },
  {
    name: 'Severe Hypoglycemia Case',
    patient: {
      symptoms: [
        { term: 'severe hypoglycemia', severity: 'critical' },
        { term: 'altered mental status', severity: 'critical' },
        { term: 'seizure', severity: 'critical' }
      ],
      vitalSigns: {
        bloodPressure: { systolic: 105, diastolic: 72 },
        heartRate: 110,
        respiratoryRate: 20
      },
      laboratoryResults: {
        tests: [
          { testName: 'Glucose', value: 32, unit: 'mg/dL' },
          { testName: 'Lactate', value: 1.2, unit: 'mmol/L' }
        ]
      }
    },
    expectedProtocol: 'Severe Hypoglycemia Protocol'
  }
];

// Run tests
testCases.forEach((testCase, index) => {
  console.log(`\n📋 Test ${index + 1}: ${testCase.name}`);
  console.log('─'.repeat(70));

  const result = protocolActivatorExt.evaluateProtocolActivation(testCase.patient);

  if (result.primaryProtocol) {
    console.log(`✅ Protocol Activated: ${result.primaryProtocol.protocol}`);
    console.log(`   Score: ${result.primaryProtocol.score.toFixed(1)}/100`);
    console.log(`   Priority: ${result.primaryProtocol.priority}`);
    console.log(`   Triggers Matched: ${result.primaryProtocol.matchedTriggers.length}`);

    if (result.primaryProtocol.immediateActions.length > 0) {
      console.log(`\n   🚨 IMMEDIATE ACTIONS (${result.primaryProtocol.immediateActions.length} total):`);
      result.primaryProtocol.immediateActions.slice(0, 3).forEach(action => {
        console.log(`      • ${action}`);
      });
      if (result.primaryProtocol.immediateActions.length > 3) {
        console.log(`      ... and ${result.primaryProtocol.immediateActions.length - 3} more`);
      }
    }

    if (result.primaryProtocol.protocol === testCase.expectedProtocol) {
      console.log(`\n   ✨ CORRECT PROTOCOL ACTIVATED`);
    } else {
      console.log(`\n   ⚠️  Expected: ${testCase.expectedProtocol}, Got: ${result.primaryProtocol.protocol}`);
    }
  } else {
    console.log(`❌ No protocol activated`);
  }

  if (Object.keys(result.allScores).length > 1) {
    console.log(`\n   📊 All Extended Protocol Scores:`);
    Object.entries(result.allScores).forEach(([name, score]) => {
      const status = score.activated ? '✓' : ' ';
      console.log(`      [${status}] ${name}: ${score.score.toFixed(1)}`);
    });
  }
});

// Test protocol details
console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('📌 Extended Protocol Details Sample - Sepsis Protocol');
console.log('═══════════════════════════════════════════════════════════════\n');

const sepsisProtocol = protocolActivatorExt.getProtocolDetails('Sepsis Protocol');
if (sepsisProtocol) {
  console.log(`Protocol: ${sepsisProtocol.name}`);
  console.log(`Priority: ${sepsisProtocol.priority}`);
  console.log(`\nqSOFA Components:`);
  Object.values(sepsisProtocol.qSOFAComponents).forEach(comp => {
    console.log(`  • ${comp}`);
  });
  console.log(`\nFirst 3 Hours Actions:`);
  sepsisProtocol.phases.first3Hours.slice(0, 4).forEach(action => {
    console.log(`  • ${action}`);
  });
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('📌 Extended Protocol Details - Acute Stroke (FAST Criteria)');
console.log('═══════════════════════════════════════════════════════════════\n');

const strokeProtocol = protocolActivatorExt.getProtocolDetails('Acute Stroke Protocol');
if (strokeProtocol) {
  console.log(`Protocol: ${strokeProtocol.name}`);
  console.log(`Priority: ${strokeProtocol.priority}`);
  console.log(`\nFAST Criteria:`);
  Object.entries(strokeProtocol.FASTCriteria).forEach(([key, desc]) => {
    console.log(`  ${key}: ${desc}`);
  });
  console.log(`\nCritical Thresholds:`);
  console.log(`  • Symptom Onset: <${strokeProtocol.criticalThresholds.symptomOnset} minutes`);
  console.log(`  • NIHSS Score Threshold: >${strokeProtocol.criticalThresholds.NIHSSScore}`);
  console.log(`  • Systolic BP: <${strokeProtocol.criticalThresholds.systolicBP} mmHg`);
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('✅ Extended Protocol Activator Tests Complete');
console.log('═══════════════════════════════════════════════════════════════\n');
