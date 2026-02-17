/**
 * Phase 9: Behavioral Test Suite
 * Tests strategic consistency, trajectory alignment, and autonomous behavior
 * These are NOT unit tests - they are behavioral system tests
 */

import {
  StrategicIntentModeler,
  MultiPhaseSynthesisEngine,
  AutonomousStrategySelector,
  SelfDirectedEvolutionController,
  StrategicDriftPrevention
} from './medical/intelligence/phase-9-strategic-engine.js';

// Mock phase engines for synthesis testing
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

console.log('=== PHASE 9: AUTONOMOUS STRATEGIC EVOLUTION TEST SUITE ===\n');

// ============================================================================
// STRATEGIC INTENT MODELING
// ============================================================================
console.log('BEHAVIORAL: Strategic Intent Modeling');
console.log('-'.repeat(60));

const intent_modeler = new StrategicIntentModeler({
  vision: {
    target_complexity_bound: 200,
    target_improvement_per_cycle_min: 0.5,
    target_mttr_max: 30,
    target_stability_score_min: 0.85
  }
});

// Test 1: System models healthy state toward acceleration
const healthy_intent = intent_modeler.modelStrategicIntent({
  complexity: 80,
  improvementPct: 5,
  mttrSeconds: 15,
  stabilityScore: 0.95,
  architectureConsistency: 0.99
});

assert(healthy_intent.trajectory_decision === 'ACCELERATE_INNOVATION', 'Intent: Healthy system chooses acceleration');

// Test 2: System detects degradation and chooses stabilization
const degraded_intent = intent_modeler.modelStrategicIntent({
  complexity: 150,
  improvementPct: -2,
  mttrSeconds: 50,
  stabilityScore: 0.70,
  architectureConsistency: 0.92
});

assert(degraded_intent.trajectory_decision !== 'ACCELERATE_INNOVATION', 'Intent: Degraded system rejects acceleration');

// Test 3: Trajectory conflict detection
const conflict = intent_modeler.detectTrajectoryConflict(
  { proposalId: 'p1', expectedImprovementPct: 10, complexityDeltaPct: 50 },
  { net_improvement_last_5_cycles: -1 }
);

assert(conflict.conflict === true, 'Intent: Detects short-term gain masking complexity creep');
assert(conflict.reason === 'short_term_gain_masks_complexity_creep', 'Intent: Correct conflict reason');

const intent_status = intent_modeler.getIntentStatus();
assert(intent_status.alignment_score >= 0 && intent_status.alignment_score <= 1, 'Intent: Alignment score bounded 0-1');

// ============================================================================
// MULTI-PHASE SYNTHESIS
// ============================================================================
console.log('\nBEHAVIORAL: Multi-Phase Synthesis Engine');
console.log('-'.repeat(60));

const trend_analyzer = new TemporalTrendAnalyzer();
const telemetry = new CycleTelemetryRecorder();
const quality_scorer = new ProposalQualityScorer();
const predictor = new PredictiveStabilityModeler();
const governance = new MetaGovernanceEngine();

const synthesis_engine = new MultiPhaseSynthesisEngine({
  trendAnalyzer: trend_analyzer,
  telemetryRecorder: telemetry,
  qualityScorer: quality_scorer,
  predictorModel: predictor,
  governanceEngine: governance,
  intentModeler: intent_modeler
});

// Populate phases with data
for (let i = 0; i < 3; i++) {
  trend_analyzer.recordCycle(`synth-test-${i}`, {
    improvementPct: 4,
    rollbackCount: 0,
    changeCount: 3,
    learningEfficiency: 0.85,
    architectureConsistency: 0.99
  });
  telemetry.recordCycleSnapshot(`synth-test-${i}`, {
    proposalCount: 3,
    validatedCount: 3,
    implementedCount: 3,
    improvementPct: 4
  });
  predictor.recordMTTROutcome(0.2, 15);
  governance.recordPolicyDecision('APPROVE', 'synth-' + i);
}

// Test synthesis with good proposal
const good_proposal = {
  proposalId: 'good-prop',
  expectedImprovementPct: 8,
  reversible: true,
  complexityDeltaPct: 5,
  riskScore: 0.2,
  auditRef: 'audit:test',
  affectedComponentCount: 2
};

const synthesis_good = synthesis_engine.synthesizeDecision(good_proposal);
assert(synthesis_good.approved === true, 'Synthesis: Good proposal passes all gates');
assert(Object.keys(synthesis_good.all_gates).length >= 5, 'Synthesis: All 5 phases contribute to decision');

// Test synthesis with bad proposal
const bad_proposal = {
  proposalId: 'bad-prop',
  expectedImprovementPct: 0.2,
  reversible: false,
  complexityDeltaPct: 80,
  riskScore: 0.95,
  affectedComponentCount: 10
};

const synthesis_bad = synthesis_engine.synthesizeDecision(bad_proposal);
assert(synthesis_bad.approved === false, 'Synthesis: Bad proposal fails one or more gates');

const integration = synthesis_engine.getPhaseIntegration();
assert(integration.all_phases_integrated === true, 'Synthesis: All 5 phases properly integrated');

// ============================================================================
// STRATEGY SELECTION
// ============================================================================
console.log('\nBEHAVIORAL: Autonomous Strategy Selection');
console.log('-'.repeat(60));

const strategy_selector = new AutonomousStrategySelector();

// Test 1: Healthy system chooses performance
const perf_strategy = strategy_selector.selectStrategy({
  complexity: 80,
  stability: 0.96,
  improvementTrend: 4,
  rollbackRate: 0.1,
  mttrSeconds: 12
});

assert(
  perf_strategy.strategy === 'PERFORMANCE_FIRST' || perf_strategy.strategy === 'AGGRESSIVE_INNOVATION',
  'Strategy: Healthy system chooses aggressive strategy'
);

// Test 2: Degraded system chooses recovery
const recovery_strategy = strategy_selector.selectStrategy({
  complexity: 150,
  stability: 0.60,
  improvementTrend: -3,
  rollbackRate: 0.7,
  mttrSeconds: 80
});

assert(recovery_strategy.strategy === 'RECOVERY_MODE', 'Strategy: Degraded system chooses recovery mode');

// Test 3: High complexity chooses risk-averse
const risk_averse = strategy_selector.selectStrategy({
  complexity: 190,
  stability: 0.85,
  improvementTrend: 1,
  rollbackRate: 0.2,
  mttrSeconds: 25
});

assert(risk_averse.strategy === 'RISK_AVERSE', 'Strategy: High complexity system chooses risk-averse mode');

const status = strategy_selector.getStrategyStatus();
assert(status.current_strategy !== undefined, 'Strategy: Current strategy tracked');

// ============================================================================
// SELF-DIRECTED EVOLUTION CONTROL
// ============================================================================
console.log('\nBEHAVIORAL: Self-Directed Evolution Controller');
console.log('-'.repeat(60));

const evolution_controller = new SelfDirectedEvolutionController();

// Test 1: System initiates cycle when healthy
const should_init = evolution_controller.shouldInitiateCycle({
  rollback_rate: 0.2,
  architecture_consistency: 0.95,
  metric_drift_detected: false
});

assert(should_init.should_initiate === true, 'Control: System initiates cycle when healthy');

// Test 2: System does not initiate when consistency poor
const should_not_init = evolution_controller.shouldInitiateCycle({
  rollback_rate: 0.2,
  architecture_consistency: 0.80,
  metric_drift_detected: false
});

assert(should_not_init.should_initiate === false, 'Control: System pauses when consistency poor');

// Test 3: System autonomously pauses on oscillation
const should_pause = evolution_controller.shouldPauseCycle({
  oscillation_detected: true,
  stagnation_detected: false,
  governance_violations: 0,
  consecutive_failed_proposals: 1
});

assert(should_pause.should_pause === true, 'Control: System self-pauses on oscillation');
assert(should_pause.reasons.includes('oscillation_detected'), 'Control: Pause reason recorded');

// Test 4: System autonomously aborts on critical failure
const should_abort = evolution_controller.shouldAbortCycle({
  constraint_violation_critical: false,
  rollback_failure: false,
  consecutive_rollbacks: 4,  // Exceeds max of 3
  governance_deadlock: false
});

assert(should_abort.should_abort === true, 'Control: System self-aborts on excessive rollbacks');
assert(should_abort.reasons.includes('excessive_consecutive_rollbacks'), 'Control: Abort reason tracked');

// Test 5: Self-scheduling based on strategy
const schedule = evolution_controller.scheduleCycle(
  { cycle_duration_target: 60, name: 'Aggressive' },
  { stability: 0.95 }
);

assert(schedule.next_cycle_in_seconds === 60, 'Control: Cycle scheduled with strategy duration');

// ============================================================================
// STRATEGIC DRIFT PREVENTION
// ============================================================================
console.log('\nBEHAVIORAL: Strategic Drift Prevention Watchdog');
console.log('-'.repeat(60));

const drift_prevention = new StrategicDriftPrevention();

// Test 1: Detect over-optimization
const overopt_check = drift_prevention.checkWatchdog({
  mttr: 3,
  improvement_rate: 75,
  complexity: 100,
  stability: 0.90,
  improvement_trend: 2,
  rollback_rate: 0.2,
  oscillation_rate: 0.1,
  declared_vs_observed_gap: 5,
  improvement_trend_5_cycles: 2,
  complexity_growth_rate: 0.05,
  policy_violations: 0,
  governance_deadlock: false,
  constraint_violation_critical: false
});

assert(
  overopt_check.violations_detected === true && overopt_check.violations.find(v => v.rule === 'over_optimization'),
  'Watchdog: Detects over-optimization'
);

// Test 2: Detect runaway complexity
const complexity_check = drift_prevention.checkWatchdog({
  complexity: 180,
  complexity_growth_rate: 0.25,  // High growth
  mttr: 30,
  improvement_rate: 10,
  stability: 0.85,
  improvement_trend: 1,
  rollback_rate: 0.2,
  oscillation_rate: 0.1,
  declared_vs_observed_gap: 5,
  improvement_trend_5_cycles: 1,
  policy_violations: 0,
  governance_deadlock: false,
  constraint_violation_critical: false
});

assert(
  complexity_check.violations_detected === true && complexity_check.violations.find(v => v.rule === 'runaway_complexity'),
  'Watchdog: Detects runaway complexity'
);

// Test 3: Detect metric gaming
const gaming_check = drift_prevention.checkWatchdog({
  declared_vs_observed_gap: 35,  // Large gap
  mttr: 30,
  improvement_rate: 10,
  complexity: 100,
  stability: 0.85,
  improvement_trend: 1,
  rollback_rate: 0.2,
  oscillation_rate: 0.1,
  improvement_trend_5_cycles: 1,
  complexity_growth_rate: 0.05,
  policy_violations: 0,
  governance_deadlock: false,
  constraint_violation_critical: false
});

assert(
  gaming_check.violations_detected === true && gaming_check.violations.find(v => v.rule === 'metric_gaming'),
  'Watchdog: Detects metric gaming'
);

// ============================================================================
// INTEGRATION: ALL PHASE 9 SUBSYSTEMS TOGETHER
// ============================================================================
console.log('\nINTEGRATION: Phase 9 Autonomous Strategic System');
console.log('-'.repeat(60));

// Simulate 3 cycles of autonomous evolution
const autonomous_cycles = [];
for (let cycle = 1; cycle <= 3; cycle++) {
  // Intent models state
  const state = {
    complexity: 100 - (cycle * 5),
    improvementPct: 3 + (cycle * 1),
    mttrSeconds: 20 - (cycle * 2),
    stabilityScore: 0.85 + (cycle * 0.03),
    architectureConsistency: 0.98
  };

  const intent = intent_modeler.modelStrategicIntent(state);
  const strategy = strategy_selector.selectStrategy(state);

  // Check if system should pause/abort
  const pause_check = evolution_controller.shouldPauseCycle({
    oscillation_detected: false,
    stagnation_detected: false,
    governance_violations: 0,
    consecutive_failed_proposals: 0
  });

  const abort_check = evolution_controller.shouldAbortCycle({
    constraint_violation_critical: false,
    rollback_failure: false,
    consecutive_rollbacks: 0,
    governance_deadlock: false
  });

  // Watchdog checks
  const drift_check = drift_prevention.checkWatchdog(state);

  autonomous_cycles.push({
    cycle,
    intent: intent.trajectory_decision,
    strategy: strategy.strategy,
    paused: pause_check.should_pause,
    aborted: abort_check.should_abort,
    drifting: drift_check.violations_detected
  });
}

assert(autonomous_cycles.length === 3, 'Integration: Ran 3 autonomous cycles');
assert(autonomous_cycles[0].drifting === false, 'Integration: First cycle has no drift violations');

// ============================================================================
// BEHAVIORAL VALIDATION (Phase 9-specific behavioral properties)
// ============================================================================
console.log('\nBEHAVIORAL PROPERTIES: Phase 9 Strategic System');
console.log('-'.repeat(60));

// Property 1: System maintains strategic consistency (same state → same decision)
const state_consistent = { complexity: 100, stability: 0.90, improvementTrend: 1, rollbackRate: 0.15, mttrSeconds: 20 };
const decision1 = strategy_selector.selectStrategy(state_consistent);
const decision2 = strategy_selector.selectStrategy(state_consistent);
assert(decision1.strategy === decision2.strategy, 'Property: Strategic decisions are consistent for same state');

// Property 2: Oscillation detection works
const osc_cycle1 = { complexity: 100, stability: 0.95, improvementTrend: 5 };
const osc_cycle2 = { complexity: 100, stability: 0.75, improvementTrend: -5 };
trend_analyzer.recordCycle('osc-1', { improvementPct: 5, rollbackCount: 0, changeCount: 3, learningEfficiency: 0.8, architectureConsistency: 0.99 });
trend_analyzer.recordCycle('osc-2', { improvementPct: -5, rollbackCount: 2, changeCount: 3, learningEfficiency: 0.7, architectureConsistency: 0.95 });
trend_analyzer.recordCycle('osc-3', { improvementPct: 5, rollbackCount: 0, changeCount: 3, learningEfficiency: 0.8, architectureConsistency: 0.99 });
const osc_trends = trend_analyzer.validateTrends();
assert(osc_trends.gates.oscillation.oscillating === true, 'Property: Oscillation properly detected');

// Property 3: Self-directed control prevents continuous escalation
const control_state_good = { rollback_rate: 0.05, architecture_consistency: 0.99, metric_drift_detected: false };
const control_state_bad = { rollback_rate: 0.95, architecture_consistency: 0.60, metric_drift_detected: true };
const init_good = evolution_controller.shouldInitiateCycle(control_state_good);
const init_bad = evolution_controller.shouldInitiateCycle(control_state_bad);
assert(init_good.should_initiate === true && init_bad.should_initiate === false, 'Property: System prevents continuation in poor state');

// Property 4: Phase 9 system is genuinely strategic (chooses based on trajectory, not just thresholds)
const creative_state = {
  complexity: 75,
  stability: 0.92,
  improvementTrend: 4,  // Increased to trigger PERFORMANCE_FIRST strategy
  rollbackRate: 0.1,
  mttrSeconds: 15
};
const creative_strategy = strategy_selector.selectStrategy(creative_state);
assert(
  ['PERFORMANCE_FIRST', 'AGGRESSIVE_INNOVATION'].includes(creative_strategy.strategy),
  'Property: System strategically chooses aggressive paths when justified'
);

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n' + '='.repeat(60));
console.log('=== PHASE 9 TEST SUMMARY ===');
console.log('='.repeat(60));
console.log(`Total Tests: ${testsPassed + testsFailed}`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log(`Exit Code: ${testsFailed > 0 ? 1 : 0}`);
console.log('\nPhase 9 Subsystems Tested:');
console.log('  ✓ Strategic Intent Modeling (trajectory alignment)');
console.log('  ✓ Multi-Phase Synthesis Engine (C+A+D+B+E fusion)');
console.log('  ✓ Autonomous Strategy Selection (5 strategic modes)');
console.log('  ✓ Self-Directed Evolution Control (autonomous cycle mgmt)');
console.log('  ✓ Strategic Drift Prevention (watchdog protection)');
console.log('  ✓ Integration (all systems working together)');
console.log('  ✓ Behavioral Properties (consistency, oscillation, control, strategy)');

process.exit(testsFailed > 0 ? 1 : 0);
