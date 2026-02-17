/**
 * Test Differential Diagnosis Engine
 */

import { WHOClinicalWorkflow } from '../who-clinical-workflow.js';

async function testDifferentialDiagnosis() {
  console.log('\n========================================');
  console.log('DIFFERENTIAL DIAGNOSIS ENGINE TEST');
  console.log('========================================\n');

  try {
    const workflow = new WHOClinicalWorkflow({
      mockMode: true,
      standardsVersion: '2024',
      debug: false
    });

    await workflow.initialize();
    console.log('✅ Workflow initialized\n');

    // Test 1: Process case with differential
    console.log('TEST 1: Processing case with differential diagnosis...\n');
    const start = Date.now();
    const result = await workflow.processCase('DIFF-DX-TEST-001');
    const time = Date.now() - start;

    console.log(`✅ Case processed in ${time}ms\n`);

    // Display summary
    console.log(workflow.generateSummary(result));

    // Display differential details
    if (result.differential) {
      const diff = result.differential;

      console.log('========================================');
      console.log('DIFFERENTIAL DIAGNOSIS DETAILS');
      console.log('========================================\n');

      console.log(`Total Matches: ${diff.summary.total}`);
      console.log(`Critical: ${diff.summary.critical}`);
      console.log(`High: ${diff.summary.high}`);
      console.log(`Medium: ${diff.summary.medium}`);
      console.log(`Top Diagnosis: ${diff.summary.topDiagnosis} (Score: ${diff.summary.topScore.toFixed(1)})\n`);

      if (diff.differentials && diff.differentials.length > 0) {
        console.log('TOP DIFFERENTIALS:');
        diff.differentials.forEach((dx, i) => {
          console.log(`\n${i + 1}. ${dx.diagnosis}`);
          console.log(`   Likelihood: ${dx.likelihood.toUpperCase()}`);
          console.log(`   Score: ${dx.score.toFixed(1)}/100`);
          console.log(`   Confidence: ${dx.confidence.toFixed(0)}%`);
          console.log(`   Urgency: ${dx.urgency}`);

          if (dx.supporting && dx.supporting.length > 0) {
            console.log(`   Supporting Evidence (${dx.supporting.length}):`);
            dx.supporting.slice(0, 3).forEach(ev => {
              console.log(`     • ${ev.text}`);
            });
          }

          if (dx.protocol) {
            console.log(`   Protocol: ${dx.protocol}`);
          }

          if (dx.nextSteps && dx.nextSteps.length > 0) {
            console.log(`   Next Steps:`);
            dx.nextSteps.slice(0, 3).forEach(step => {
              console.log(`     → ${step}`);
            });
          }
        });
      }

      if (diff.cantMiss && diff.cantMiss.length > 0) {
        console.log('\n⚠️  CAN\'T MISS DIAGNOSES:');
        diff.cantMiss.forEach(dx => {
          console.log(`   • ${dx.diagnosis}`);
          console.log(`     ${dx.reason}`);
          console.log(`     Action: ${dx.action}`);
        });
      }

      if (diff.workup) {
        console.log('\nRECOMMENDED WORKUP:');
        if (diff.workup.immediate && diff.workup.immediate.length > 0) {
          console.log('   IMMEDIATE:');
          diff.workup.immediate.forEach(item => console.log(`     • ${item}`));
        }
        if (diff.workup.urgent && diff.workup.urgent.length > 0) {
          console.log('   URGENT:');
          diff.workup.urgent.forEach(item => console.log(`     • ${item}`));
        }
      }

      if (diff.pearl) {
        console.log(`\n💡 CLINICAL PEARL:`);
        console.log(`   ${diff.pearl}`);
      }
    }

    console.log('\n========================================');
    console.log('✅ TEST COMPLETE');
    console.log('========================================\n');

    return result;

  } catch (error) {
    console.error('❌ TEST FAILED:');
    console.error(error);
    throw error;
  }
}

// Run test
testDifferentialDiagnosis().catch(console.error);
