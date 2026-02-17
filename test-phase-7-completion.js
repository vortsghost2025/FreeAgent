/**
 * Phase 7.7 Completion Test Suite - Autonomous Federated Evolution
 */

import { AutonomousFederatedEvolutionEngine } from './medical/intelligence/autonomous-federated-evolution.js';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (!condition) {
    console.log(`✗ ${message}`);
    testsFailed++;
  } else {
    console.log(`✓ ${message}`);
    testsPassed++;
  }
}

console.log('=== PHASE 7.7: AUTONOMOUS FEDERATED EVOLUTION COMPLETION ===\n');

const engine = new AutonomousFederatedEvolutionEngine();
engine.configureGovernance({
  cycleThresholds: { minPassRate: 0.65 },
  guardrails: { maxRiskAuto: 0.5, minTestPassRate: 0.95, maxLatencyRegressionPct: 10 },
  forbiddenOperations: ['destructive-op'],
  mutationZones: ['medical/intelligence/'],
  explorationConstraints: { maxLatencyRegressionPct: 15, maxFailureRateIncreasePct: 10 }
});

// Cycle 1: degraded state (should trigger autonomous proposals + corrections)
const cycle1 = engine.runEvolutionCycle('phase7-cycle-1', {
  diagnosticsInput: {
    referenceMetrics: [100, 100, 100],
    currentMetrics: [145, 150, 152],
    runResults: [
      { suite: 'phase-6.2', passCount: 26, total: 26 },
      { suite: 'phase-6.2', passCount: 24, total: 26 }
    ],
    versionHistory: [
      { modelId: 'm1', version: 1 },
      { modelId: 'm1', version: 3 }
    ],
    privacyReport: { status: 'COMPLIANT', complianceRate: 100 },
    secureSumSamples: [{ secureSum: 10, outlierCount: 0, valuesCount: 5 }],
    convergenceHistory: [0.9, 0.87, 0.84, 0.82],
    orchestrationLatencies: [180, 190, 220, 310]
  },
  baselineMetrics: { latency: 210, failureRate: 0.02 },
  observedMetrics: { latency: 185, failureRate: 0.015 },
  testPassRate: 1
});

assert(cycle1.cycleResult.proposalsGenerated > 0, 'Evolution engine: builder proposes improvements automatically');
assert(cycle1.proposalBatch.generatedCount > 0, 'Evolution engine: patch proposals generated without prompting');
assert(cycle1.evaluatedProposals.length > 0, 'Evolution engine: tester evaluates proposals autonomously');
assert(cycle1.autoApplied.length > 0, 'Evolution engine: safe proposals auto-applied under governance');
assert(cycle1.repairCycle.triggered, 'Evolution engine: diagnostics trigger repair cycle');

// Cycle 2: stable state (should continue with low intervention)
const cycle2 = engine.runEvolutionCycle('phase7-cycle-2', {
  diagnosticsInput: {
    referenceMetrics: [100, 101, 99],
    currentMetrics: [100, 100, 100],
    runResults: [
      { suite: 'phase-6.2', passCount: 26, total: 26 },
      { suite: 'phase-6.2', passCount: 26, total: 26 }
    ],
    versionHistory: [
      { modelId: 'm1', version: 1 },
      { modelId: 'm1', version: 2 }
    ],
    privacyReport: { status: 'COMPLIANT', complianceRate: 100 },
    secureSumSamples: [{ secureSum: 10, outlierCount: 0, valuesCount: 5 }],
    convergenceHistory: [0.78, 0.79, 0.8, 0.81],
    orchestrationLatencies: [140, 150, 160, 170]
  },
  baselineMetrics: { latency: 185, failureRate: 0.015 },
  observedMetrics: { latency: 175, failureRate: 0.012 },
  testPassRate: 1
});

assert(cycle2.success, 'Evolution engine: maintains itself across multiple runs');
assert(cycle2.blocked.length === 0, 'Evolution engine: no blocked actions in healthy cycle');

const completion = engine.getCompletionCriteriaStatus();
assert(completion.criteria.proposesImprovementsWithoutPrompting, 'Completion criteria: autonomous proposal generation');
assert(completion.criteria.builderAndTesterRunAutonomously, 'Completion criteria: autonomous builder/tester cycle');
assert(completion.criteria.nondeterminismDetectedAndCorrected, 'Completion criteria: nondeterminism corrected');
assert(completion.criteria.gitDisciplineHonored, 'Completion criteria: no apply without approval');

const status = engine.getEvolutionStatus();
assert(status.totalEvolutionCycles === 2, 'Evolution engine: cycle count tracked');
assert(status.memory.totals.nondeterminismCorrections >= 1, 'Evolution engine: long-horizon memory captures corrections');
assert(completion.complete, 'Completion criteria: Phase 7 complete');

console.log(`\nTests: ${testsPassed}/${testsPassed + testsFailed} passed`);
process.exit(testsFailed > 0 ? 1 : 0);

