/**
 * Comprehensive Test Suite for Phases C, A, D, B, E
 * Tests all 5 evolution paths
 */

import { TemporalTrendAnalyzer } from './medical/intelligence/temporal-trend-analyzer.js';
import { CycleTelemetryRecorder } from './medical/intelligence/cycle-telemetry-recorder.js';
import { ProposalQualityScorer } from './medical/intelligence/proposal-quality-scorer.js';
import { PredictiveStabilityModeler } from './medical/intelligence/predictive-stability-modeler.js';
import { MetaGovernanceEngine } from './medical/intelligence/meta-governance-engine.js';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (!condition) {
    console.log(`x ${message}`);
    testsFailed++;
  } else {
    console.log(`✓ ${message}`);
    testsPassed++;
  }
}

console.log('=== PHASE 8.9-9: EVOLUTION PATH TEST SUITE ===\n');

// ============================================================================
// PHASE C: TEMPORAL TREND ANALYSIS
// ============================================================================
console.log('PHASE C: TEMPORAL TREND ANALYZER');
console.log('-'.repeat(60));

const trendAnalyzer = new TemporalTrendAnalyzer({
  windowSize: 3,
  minNetGainPct: 1,
  maxRollbackFrequency: 0.4
});

// Record 5 cycles with improving trend
trendAnalyzer.recordCycle('c1', {
  improvementPct: 2,
  declaredImprovementPct: 3,
  rollbackCount: 0,
  changeCount: 4,
  learningEfficiency: 0.70,
  architectureConsistency: 0.98
});
trendAnalyzer.recordCycle('c2', {
  improvementPct: 3,
  rollbackCount: 0,
  changeCount: 4,
  learningEfficiency: 0.75,
  architectureConsistency: 0.99
});
trendAnalyzer.recordCycle('c3', {
  improvementPct: 4,
  rollbackCount: 1,
  changeCount: 5,
  learningEfficiency: 0.8,
  architectureConsistency: 0.99
});
trendAnalyzer.recordCycle('c4', {
  improvementPct: 5,
  rollbackCount: 1,
  changeCount: 5,
  learningEfficiency: 0.82,
  architectureConsistency: 0.98
});
trendAnalyzer.recordCycle('c5', {
  improvementPct: 6,
  rollbackCount: 1,
  changeCount: 5,
  learningEfficiency: 0.85,
  architectureConsistency: 0.99
});

const trendValidation = trendAnalyzer.validateTrends();
assert(trendValidation.passed === true, 'Phase C: Overall trend validation passes with healthy cycles');
assert(trendValidation.gates.rollingImprovement.passed === true, 'Phase C: Rolling improvement gate passes');
assert(trendValidation.gates.stagnation.stagnant === false, 'Phase C: No stagnation detected');
assert(trendValidation.gates.oscillation.oscillating === false, 'Phase C: No oscillation detected');
assert(trendValidation.gates.rollbackFrequency.healthy === true, 'Phase C: Rollback frequency within bounds');

// ============================================================================
// PHASE A: OBSERVABILITY & TELEMETRY
// ============================================================================
console.log('\nPHASE A: CYCLE TELEMETRY RECORDER');
console.log('-'.repeat(60));

const telemetryRecorder = new CycleTelemetryRecorder();

const snapshot1 = telemetryRecorder.recordCycleSnapshot('cycle-1', {
  architectureBefore: { components: ['a', 'b'], interfaces: ['a:b'] },
  architectureAfter: { components: ['a', 'b', 'c'], interfaces: ['a:b', 'a:c'] },
  proposalCount: 3,
  validatedCount: 3,
  implementedCount: 2,
  rolledBackCount: 1,
  improvementPct: 8,
  learningEfficiency: 0.75,
  architectureConsistency: 0.99,
  mttrSeconds: 15
});

assert(snapshot1.architecture.delta.componentsAdded === 1, 'Phase A: Architecture delta tracks added components');
assert(snapshot1.proposals.proposed === 3, 'Phase A: Proposal counts recorded');
assert(snapshot1.metrics.improvementPct === 8, 'Phase A: Improvement metric captured');

const rollbackTrace = telemetryRecorder.recordRollbackTrace('change-1', 'post-deploy-instability', {
  failureDetectedAt: Date.now() - 1000,
  rollbackInitiatedAt: Date.now() - 500,
  rolledBackAt: Date.now(),
  rollbackDurationSeconds: 5,
  affectedComponents: ['component-x']
});

assert(rollbackTrace.reason === 'post-deploy-instability', 'Phase A: Rollback trace captures reason');
assert(rollbackTrace.details.affectedComponents.length === 1, 'Phase A: Affected components recorded');

const contrib = telemetryRecorder.recordProposalContribution('prop-1', 'change-1', 4, 0.5);
assert(contrib.improvementDelta === 4, 'Phase A: Proposal contribution recorded with improvement delta');

const report = telemetryRecorder.getObservabilityReport();
assert(report.totalCycles === 1, 'Phase A: Observability report tracks cycle count');
assert(report.totalRollbacks === 1, 'Phase A: Rollback tracking accurate');
assert(report.totalContributions === 1, 'Phase A: Proposal contributions tracked');

// ============================================================================
// PHASE D: PROPOSAL QUALITY SCORING
// ============================================================================
console.log('\nPHASE D: PROPOSAL QUALITY SCORER');
console.log('-'.repeat(60));

const qualityScorer = new ProposalQualityScorer();

const proposal1 = {
  proposalId: 'prop-high-quality',
  expectedImprovementPct: 20,
  reversible: true,
  complexityDeltaPct: 5,
  riskScore: 0.2,
  auditRef: 'audit:123',
  subsystem: 'awareness-engine'
};

const score1 = qualityScorer.scoreProposal(proposal1);
assert(score1.score >= 80, 'Phase D: High-quality proposal scores well (>= 80)', 80, score1.score);
assert(score1.rating === 'EXCELLENT', 'Phase D: Excellent quality proposal rated properly');
assert(score1.shouldSelect === true, 'Phase D: High-quality proposal should be selected');

const proposal2 = {
  proposalId: 'prop-low-quality',
  expectedImprovementPct: 0.5,
  reversible: false,
  complexityDeltaPct: 50,
  riskScore: 0.9,
  subsystem: 'unknown'
};

const score2 = qualityScorer.scoreProposal(proposal2);
assert(score2.score < 40, 'Phase D: Low-quality proposal scores poorly (< 40)');
assert(score2.shouldSelect === false, 'Phase D: Low-quality proposal should not be selected');

// Record outcomes
qualityScorer.recordProposalOutcome('prop-high-quality', 'change-1', 22, true, 'awareness-engine');
qualityScorer.recordProposalOutcome('prop-high-quality', 'change-2', 19, true, 'awareness-engine');

const lineage = qualityScorer.getSubsystemLineage();
assert(lineage.length > 0, 'Phase D: Subsystem lineage tracked');
assert(lineage[0].subsystem === 'awareness-engine', 'Phase D: Top performer subsystem identified');

// ============================================================================
// PHASE B: PREDICTIVE STABILITY MODELING
// ============================================================================
console.log('\nPHASE B: PREDICTIVE STABILITY MODELER');
console.log('-'.repeat(60));

const predictor = new PredictiveStabilityModeler();

// Feed historical MTTR data
for (let i = 0; i < 10; i++) {
  predictor.recordMTTROutcome(0.3, 15 + Math.random() * 5);
  predictor.recordRiskOutcome(0.3, false);
  predictor.recordComplexityOutcome(50 + i * 2);
}

const mttrPrediction = predictor.predictMTTR({
  riskScore: 0.3,
  complexityDeltaPct: 5,
  affectedComponentCount: 2
});

assert(mttrPrediction.confidence > 0, 'Phase B: MTTR prediction confidence > 0 with history');
assert(mttrPrediction.predictedMTTR > 10 && mttrPrediction.predictedMTTR < 50, 'Phase B: MTTR prediction within reasonable bounds');

const riskForecast = predictor.forecastRisk({
  riskScore: 0.3,
  complexityDeltaPct: 5
});

assert(riskForecast.forecastedFailureRate <= 1, 'Phase B: Risk forecast bounded at 1.0');

const complexityPrediction = predictor.predictComplexityGrowth(100, [{ complexityDeltaPct: 10 }]);
assert(complexityPrediction.projectedComplexity > 100, 'Phase B: Complexity growth prediction detects increase');

const rollbackSim = predictor.simulateRollbackSuccess({
  riskScore: 0.3,
  complexityDeltaPct: 5
});

assert(rollbackSim.estimatedRollbackSuccessRate >= 0 && rollbackSim.estimatedRollbackSuccessRate <= 1, 'Phase B: Rollback success rate bounded 0-1');

// ============================================================================
// PHASE E: META-GOVERNANCE ENGINE
// ============================================================================
console.log('\nPHASE E: META-GOVERNANCE ENGINE');
console.log('-'.repeat(60));

const governance = new MetaGovernanceEngine({
  baselineMTTR: 30,
  baselineRisk: 0.5,
  baselineImprovement: 0.5,
  baselineRollbackFreq: 0.4
});

// Record balanced policy decisions
for (let i = 0; i < 15; i++) {
  const actions = ['APPROVE', 'BLOCK', 'REVIEW'];
  const action = actions[Math.floor(Math.random() * 3)];
  governance.recordPolicyDecision(action, 'test-' + i);
}

const assessment = governance.assessGovernance();
assert(assessment.assessment !== 'insufficient_data', 'Phase E: Governance assessment completed');
assert(assessment.blockRate >= 0 && assessment.blockRate <= 1, 'Phase E: Block rate bounded 0-1');
assert(assessment.approvalRate >= 0 && assessment.approvalRate <= 1, 'Phase E: Approval rate bounded 0-1');

const drift = governance.detectPolicyDrift(
  [
    { type: 'REVERSIBLE_CHANGES_ONLY', required: true },
    { type: 'AUDIT_TRAIL_REQUIRED', required: true }
  ],
  [
    { type: 'REVERSIBLE_CHANGES_ONLY' },
    { type: 'AUDIT_TRAIL_REQUIRED' }
  ]
);

assert(drift.compliant === true, 'Phase E: Policy compliance detects no drift when behaviors match');
assert(drift.complianceRate >= 0 && drift.complianceRate <= 1, 'Phase E: Compliance rate bounded 0-1');

const adaptResult = governance.adaptThresholds({}, { recommendation: 'relax_thresholds' });
assert(adaptResult.newThresholds.mttrSeconds > governance.baselineThresholds.mttrSeconds, 'Phase E: Adaptive threshold relaxes MTTR on lenient policy');

const constitution = governance.enforceConstitution(
  [
    { reversible: true, auditRef: 'audit:123' },
    { reversible: true, auditRef: 'audit:456' }
  ],
  ['REVERSIBLE_CHANGES_ONLY', 'AUDIT_TRAIL_REQUIRED']
);

assert(constitution.compliant === true, 'Phase E: Constitutional enforcement passes compliant behaviors');
assert(constitution.invariantsEnforced.length === 2, 'Phase E: All enforced invariants tracked');

// ============================================================================
// INTEGRATION TEST: ALL PHASES WORKING TOGETHER
// ============================================================================
console.log('\nINTEGRATION: ALL PHASES TOGETHER');
console.log('-'.repeat(60));

// Simulate a complete cycle with all 5 engines
const trendAnalyzer2 = new TemporalTrendAnalyzer({ windowSize: 2 });
const telemetry2 = new CycleTelemetryRecorder();
const scorer2 = new ProposalQualityScorer();
const predictor2 = new PredictiveStabilityModeler();
const governance2 = new MetaGovernanceEngine();

// Record 2 healthy cycles
for (let i = 1; i <= 2; i++) {
  // Trend
  trendAnalyzer2.recordCycle(`full-test-${i}`, {
    improvementPct: 5,
    rollbackCount: 0,
    changeCount: 3,
    learningEfficiency: 0.85,
    architectureConsistency: 0.99
  });

  // Telemetry
  telemetry2.recordCycleSnapshot(`full-test-${i}`, {
    proposalCount: 3,
    validatedCount: 3,
    implementedCount: 3,
    improvementPct: 5,
    learningEfficiency: 0.85
  });

  // Governance
  governance2.recordPolicyDecision('APPROVE', 'healthy-' + i);

  // Predictor
  predictor2.recordMTTROutcome(0.2, 12);
  predictor2.recordRiskOutcome(0.2, false);
}

const fullTrendResult = trendAnalyzer2.validateTrends();
const fullTelemetryResult = telemetry2.getObservabilityReport();
const fullGovernanceStatus = governance2.getMetaGovernanceStatus();

assert(fullTrendResult.passed === true, 'Integration: Trend validation passes across all phases');
assert(fullTelemetryResult.totalCycles === 2, 'Integration: Telemetry tracks cycles consistently');
assert(fullGovernanceStatus.currentAssessment.assessment !== 'insufficient_data', 'Integration: Governance assessment ready');

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n' + '='.repeat(60));
console.log('=== PHASE C-E TEST SUMMARY ===');
console.log('='.repeat(60));
console.log(`Total Tests: ${testsPassed + testsFailed}`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log(`Exit Code: ${testsFailed > 0 ? 1 : 0}`);
console.log('\nPhases Tested:');
console.log('  ✓ Phase C: Temporal Trend Analyzer (multi-cycle memory, rolling windows)');
console.log('  ✓ Phase A: Cycle Telemetry Recorder (snapshots, traces, provenance)');
console.log('  ✓ Phase D: Proposal Quality Scorer (lineage, selection, subsystem tracking)');
console.log('  ✓ Phase B: Predictive Stability Modeler (MTTR, risk, complexity forecasting)');
console.log('  ✓ Phase E: Meta-Governance Engine (policy drift, adaptive thresholds, constitution)');
console.log('  ✓ Integration: All phases operating together');

process.exit(testsFailed > 0 ? 1 : 0);
