/**
 * test-workflow-with-protocols.js
 * End-to-end integration test: Clinical workflow with Protocol Activator v2
 */

import WHOClinicalWorkflow from '../who-clinical-workflow.js';

console.log('🚀 Starting End-to-End Workflow Test with Protocol Activation\n');

const workflow = new WHOClinicalWorkflow({ standardsVersion: '2024', debug: false });

async function runWorkflowTest() {
  try {
    // Initialize workflow (loads all engines)
    await workflow.initialize();
    console.log('✅ Workflow initialized\n');

    // Simulate a critical patient case: ACS with DKA symptoms
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📋 TEST CASE 1: Acute Coronary Syndrome (Multi-Protocol)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const caseId = 'case-acs-001';
    const mockResult = await processMockCase(workflow, caseId);
    printCaseResults(mockResult);

    // Test case 2: Eclampsia (Obstetric Emergency)
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📋 TEST CASE 2: Eclampsia (Obstetric Emergency)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const obsCase = 'case-eclampsia-001';
    const obsResult = await processMockCase(workflow, obsCase, 'eclampsia');
    printCaseResults(obsResult);

    // Test case 3: Anaphylaxis (Critical with rapid escalation)
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📋 TEST CASE 3: Anaphylaxis (Rapid Protocol Activation)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const anaCase = 'case-ana-001';
    const anaResult = await processMockCase(workflow, anaCase, 'anaphylaxis');
    printCaseResults(anaResult);

  } catch (error) {
    console.error('❌ Workflow test failed:', error);
  }
}

async function processMockCase(workflow, caseId, caseType = 'acs') {
  const mockWHOData = getMockCaseData(caseType);

  // Simulate manual processing since we're using mock data
  const startTime = Date.now();

  // Normalize
  const { normalizeWHOCase } = await import('../normalizers/who-normalizer.js');
  const normalizedData = normalizeWHOCase(mockWHOData, { language: 'en', convertUnits: true });

  // Evaluate protocols
  const protocolActivation = workflow.protocolActivator.evaluateProtocolActivation(normalizedData);

  // Red flags
  const redFlags = workflow.redFlagDetector.detectRedFlags(normalizedData);

  // Differential
  const differential = workflow.differentialEngine.generateDifferential(normalizedData, {
    maxDifferentials: 5,
    minScore: 15
  });

  const processingTime = Date.now() - startTime;

  return {
    caseId,
    caseType,
    patientDemographics: normalizedData.patientDemographics,
    emergencyProtocols: protocolActivation,
    redFlags,
    differential,
    processingTime
  };
}

function getMockCaseData(caseType = 'acs') {
  const baseMock = {
    caseId: 'case-001',
    source: 'WHO-TEST',
    country: 'TEST-COUNTRY',
    facility: 'TEST-FACILITY',
    patientDemographics: {}
  };

  switch (caseType) {
    case 'acs':
      return {
        ...baseMock,
        patientDemographics: { age: 65, sex: 'M' },
        symptoms: {
          list: [
            { term: 'chest pain', severity: 'critical', duration: '45 min' },
            { term: 'shortness of breath', severity: 'severe' },
            { term: 'diaphoresis', severity: 'severe' },
            { term: 'nausea', severity: 'moderate' }
          ]
        },
        vitalSigns: {
          bloodPressure: { systolic: 145, diastolic: 92 },
          heartRate: 110,
          respiratoryRate: 20,
          oxygenSaturation: 94.5,
          temperature: 37.2
        },
        laboratoryResults: {
          tests: [
            { testName: 'Troponin I', value: 8.5, unit: 'ng/mL' },
            { testName: 'BNP', value: 450, unit: 'pg/mL' },
            { testName: 'WBC', value: 11.2, unit: 'K/uL' },
            { testName: 'CRP', value: 8.5, unit: 'mg/L' }
          ]
        }
      };

    case 'eclampsia':
      return {
        ...baseMock,
        patientDemographics: { age: 32, sex: 'F', pregnant: true },
        symptoms: {
          list: [
            { term: 'eclampsia', severity: 'critical' },
            { term: 'seizure', severity: 'critical' },
            { term: 'severe headache', severity: 'critical' },
            { term: 'vision changes', severity: 'severe' },
            { term: 'hyperreflexia', severity: 'moderate' }
          ]
        },
        vitalSigns: {
          bloodPressure: { systolic: 175, diastolic: 115 },
          heartRate: 115,
          respiratoryRate: 22,
          oxygenSaturation: 96,
          temperature: 37.8
        },
        laboratoryResults: {
          tests: [
            { testName: 'Platelet count', value: 85, unit: 'K/uL' },
            { testName: 'AST', value: 120, unit: 'U/L' },
            { testName: 'Creatinine', value: 1.8, unit: 'mg/dL' },
            { testName: 'Proteinuria', value: 2.5, unit: 'g/24hr' }
          ]
        }
      };

    case 'anaphylaxis':
      return {
        ...baseMock,
        patientDemographics: { age: 28, sex: 'F' },
        symptoms: {
          list: [
            { term: 'anaphylaxis', severity: 'critical' },
            { term: 'urticaria', severity: 'severe' },
            { term: 'angioedema', severity: 'severe' },
            { term: 'stridor', severity: 'critical' },
            { term: 'wheezing', severity: 'severe' },
            { term: 'nausea', severity: 'moderate' }
          ]
        },
        vitalSigns: {
          bloodPressure: { systolic: 72, diastolic: 38 },
          heartRate: 145,
          respiratoryRate: 28,
          oxygenSaturation: 88,
          temperature: 37.1
        },
        laboratoryResults: {
          tests: [
            { testName: 'Tryptase', value: 25, unit: 'ng/mL' },
            { testName: 'WBC', value: 13.5, unit: 'K/uL' }
          ]
        }
      };

    default:
      return baseMock;
  }
}

function printCaseResults(result) {
  console.log(`Case ID: ${result.caseId}`);
  console.log(`Patient: ${result.patientDemographics.age}yo ${result.patientDemographics.sex}`);
  console.log(`Processing Time: ${result.processingTime}ms\n`);

  // Emergency Protocols
  if (result.emergencyProtocols && result.emergencyProtocols.activatedProtocols.length > 0) {
    console.log('⚡ EMERGENCY PROTOCOLS ACTIVATED:');
    result.emergencyProtocols.activatedProtocols.forEach((proto, i) => {
      console.log(`   ${i + 1}. ${proto.protocol}`);
      console.log(`      Priority: ${proto.priority}`);
      console.log(`      Score: ${proto.score.toFixed(1)}`);
      console.log(`      Trigger Type: ${proto.triggerType}`);
      if (proto.immediateActions.length > 0) {
        console.log(`      Immediate Actions (${proto.immediateActions.length} total):`);
        proto.immediateActions.slice(0, 2).forEach(action => {
          console.log(`        • ${action}`);
        });
        if (proto.immediateActions.length > 2) {
          console.log(`        ... and ${proto.immediateActions.length - 2} more`);
        }
      }
    });
    console.log();
  } else {
    console.log('✅ No emergency protocols activated');
  }

  // Red Flags
  if (result.redFlags && result.redFlags.length > 0) {
    const critical = result.redFlags.filter(f => f.severity === 'critical');
    const urgent = result.redFlags.filter(f => f.severity === 'urgent');

    console.log(`🚨 RED FLAGS DETECTED (${result.redFlags.length} total):`);
    if (critical.length > 0) {
      console.log(`   CRITICAL (${critical.length}):`);
      critical.slice(0, 2).forEach(flag => {
        console.log(`      • ${flag.flag} [${flag.abcCategory || 'GENERAL'}]`);
        console.log(`        ${flag.value}`);
        console.log(`        ACTION: ${flag.action}`);
      });
    }
    if (urgent.length > 0) {
      console.log(`   URGENT (${urgent.length}):`);
      urgent.slice(0, 1).forEach(flag => {
        console.log(`      • ${flag.flag}`);
      });
    }
    console.log();
  }

  // Differential Diagnosis
  if (result.differential && result.differential.differentials.length > 0) {
    console.log(`📊 TOP DIFFERENTIAL DIAGNOSES:`);
    result.differential.differentials.slice(0, 3).forEach((dx, i) => {
      console.log(`   ${i + 1}. ${dx.diagnosis}`);
      console.log(`      Likelihood: ${dx.likelihood.toUpperCase()}`);
      console.log(`      Score: ${dx.score.toFixed(1)}/100`);
    });
    console.log();
  }

  if (result.differential && result.differential.cantMiss && result.differential.cantMiss.length > 0) {
    console.log(`⚠️  CAN'T MISS DIAGNOSES:`);
    result.differential.cantMiss.slice(0, 2).forEach(dx => {
      console.log(`   • ${dx.diagnosis}`);
    });
    console.log();
  }
}

// Run the test
await runWorkflowTest();

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('✅ End-to-End Workflow Tests Complete');
console.log('═══════════════════════════════════════════════════════════════\n');
