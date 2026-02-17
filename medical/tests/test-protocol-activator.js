/**
 * test-protocol-activator.js
 * Comprehensive testing for Protocol Activator v2
 */

import { ProtocolActivatorV2 } from '../clinical-intelligence/protocol-activator-v2.js';

console.log('🧪 Starting Protocol Activator v2 Tests\n');

// Mock standards object
const mockStandards = {
  rules: {
    rules: {
      diseasePatterns: {}
    }
  }
};

const protocolActivator = new ProtocolActivatorV2(mockStandards, { debug: false });

// Test cases
const testCases = [
  {
    name: 'DKA Protocol Activation',
    patient: {
      symptoms: [
        { term: 'diabetic ketoacidosis', severity: 'critical' },
        { term: 'kussmaul respiration', severity: 'severe' }
      ],
      vitals: {
        pH: 7.25,
        HCO3: 12,
        bloodGlucose: 350
      },
      labs: {
        anionGap: 18,
        ketoneBodies: 'large'
      }
    },
    expectedProtocol: 'DKA Protocol'
  },
  {
    name: 'Anaphylaxis Protocol Activation',
    patient: {
      symptoms: [
        { term: 'anaphylaxis', severity: 'critical' },
        { term: 'urticaria', severity: 'severe' },
        { term: 'stridor', severity: 'critical' }
      ],
      vitals: {
        bloodPressure: { systolic: 75, diastolic: 40 }
      }
    },
    expectedProtocol: 'Anaphylaxis Protocol'
  },
  {
    name: 'Trauma Primary Survey Activation',
    patient: {
      symptoms: [
        { term: 'motor vehicle accident', severity: 'critical' }
      ],
      vitals: {
        bloodPressure: { systolic: 85, diastolic: 50 },
        respiratoryRate: 32
      }
    },
    expectedProtocol: 'Trauma Primary Survey Protocol'
  },
  {
    name: 'Pediatric Fever Protocol Activation',
    patient: {
      ageMonths: 18,
      symptoms: [
        { term: 'fever in child', severity: 'moderate' },
        { term: 'irritability', severity: 'moderate' }
      ],
      vitals: {
        temperature: 39.5
      }
    },
    expectedProtocol: 'Pediatric Fever Protocol'
  },
  {
    name: 'Obstetric Emergency - Eclampsia Activation',
    patient: {
      pregnant: true,
      symptoms: [
        { term: 'eclampsia', severity: 'critical' },
        { term: 'seizure', severity: 'critical' }
      ],
      vitals: {
        bloodPressure: { systolic: 175, diastolic: 115 }
      },
      labs: {
        proteinuria: 2.5
      }
    },
    expectedProtocol: 'Obstetric Emergency Protocol'
  }
];

// Run tests
testCases.forEach((testCase, index) => {
  console.log(`\n📋 Test ${index + 1}: ${testCase.name}`);
  console.log('─'.repeat(60));

  const result = protocolActivator.evaluateProtocolActivation(testCase.patient);

  if (result.primaryProtocol) {
    console.log(`✅ Protocol Activated: ${result.primaryProtocol.protocol}`);
    console.log(`   Score: ${result.primaryProtocol.score.toFixed(1)}`);
    console.log(`   Priority: ${result.primaryProtocol.priority}`);
    console.log(`   Trigger Type: ${result.primaryProtocol.triggerType}`);
    console.log(`   Matched Triggers: ${result.primaryProtocol.matchedTriggers.length}`);

    // Show immediate actions
    if (result.primaryProtocol.immediateActions.length > 0) {
      console.log(`\n   🚨 IMMEDIATE ACTIONS:`);
      result.primaryProtocol.immediateActions.slice(0, 3).forEach(action => {
        console.log(`      • ${action}`);
      });
      if (result.primaryProtocol.immediateActions.length > 3) {
        console.log(`      ... and ${result.primaryProtocol.immediateActions.length - 3} more`);
      }
    }

    // Verify expected protocol
    if (result.primaryProtocol.protocol === testCase.expectedProtocol) {
      console.log(`\n   ✨ CORRECT PROTOCOL ACTIVATED`);
    } else {
      console.log(`\n   ⚠️  Expected: ${testCase.expectedProtocol}, Got: ${result.primaryProtocol.protocol}`);
    }
  } else {
    console.log(`❌ No protocol activated`);
  }

  if (Object.keys(result.allScores).length > 1) {
    console.log(`\n   📊 All Protocol Scores:`);
    Object.entries(result.allScores).forEach(([name, score]) => {
      const status = score.activated ? '✓' : ' ';
      console.log(`      [${status}] ${name}: ${score.score.toFixed(1)}`);
    });
  }
});

// Test protocol details retrieval
console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('📌 Protocol Details Sample - DKA Protocol');
console.log('═══════════════════════════════════════════════════════════════\n');

const dkaProtocol = protocolActivator.getProtocolDetails('DKA Protocol');
if (dkaProtocol) {
  console.log(`Protocol: ${dkaProtocol.name}`);
  console.log(`Priority: ${dkaProtocol.priority}`);
  console.log(`Estimated Duration: ${dkaProtocol.estimatedDuration} hours`);
  console.log(`\nCritical Thresholds:`);
  Object.entries(dkaProtocol.criticalThresholds).forEach(([key, value]) => {
    console.log(`  • ${key}: ${value}`);
  });
  console.log(`\nImmediate Actions:`);
  dkaProtocol.phases.immediate.slice(0, 5).forEach(action => {
    console.log(`  • ${action}`);
  });
}

// Test protocol details for complex scenario - Obstetric
console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('📌 Protocol Details Sample - Obstetric Emergency (Eclampsia)');
console.log('═══════════════════════════════════════════════════════════════\n');

const obsProtocol = protocolActivator.getProtocolDetails('Obstetric Emergency Protocol');
if (obsProtocol && obsProtocol.scenarios.eclampsia) {
  console.log(`Protocol: ${obsProtocol.name}`);
  console.log(`Scenario: Eclampsia`);
  console.log(`\nImmediate Actions:`);
  obsProtocol.scenarios.eclampsia.immediate.forEach(action => {
    console.log(`  • ${action}`);
  });
  console.log(`\nOngoing Management:`);
  obsProtocol.scenarios.eclampsia.ongoing.slice(0, 3).forEach(action => {
    console.log(`  • ${action}`);
  });
}

console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('✅ Protocol Activator v2 Tests Complete');
console.log('═══════════════════════════════════════════════════════════════\n');
