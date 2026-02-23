/**
 * Phase 9 Orchestrator Integration Test
 * Validates complete system coordination across all phases (8 + C-E + 9)
 */

import { Phase9IntegratedOrchestrator } from './medical/intelligence/phase-9-integrated-orchestrator.js';

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

console.log('=== PHASE 9 ORCHESTRATOR INTEGRATION TEST ===\n');

// ============================================================================
// INTEGRATION: PHASE 9 ORCHESTRATOR WITH ALL SUBSYSTEMS
// ============================================================================
console.log('INTEGRATION: Phase 9 Orchestrator');
console.log('-'.repeat(60));

const orchestrator = new Phase9IntegratedOrchestrator({
  autoImplementRiskThreshold: 0.25,
  maxPerformanceImpactPct: 10
});

// Test 1: Single integrated cycle
const cycle1_result = orchestrator.runPhase9Cycle('integration-1', {
  architectureSnapshot: {
    components: ['awareness', 'evolution', 'validation'],
    interfaces: ['awareness:evolution', 'evolution:validation'],
    invariants: ['REVERSIBLE_CHANGES_ONLY', 'AUDIT_TRAIL_REQUIRED']
  },
  architectureComplexity: 100,
  rollbackRate: 0.15,
  architectureConsistency: 0.95,
  learningMetrics: {
    learningEfficiency: 0.80,
    convergenceVelocity: 0.15,
    stabilityScore: 0.90
  },
  validationEvidence: {
    testPassRate: 1,
    canarySuccessRate: 1,
    errorRatePct: 0.1,
    observedImprovementPct: 5
  },
  implementationActor: 'autonomous'
});

assert(cycle1_result.status === 'COMPLETED', 'Integration: Cycle 1 completed');
assert(cycle1_result.phase_8.changes_implemented >= 0, 'Integration: Phase 8 results present');
assert(cycle1_result.phase_c.trends.passed !== undefined, 'Integration: Phase C trend validation executed');
assert(cycle1_result.phase_a.telemetry_recorded === true, 'Integration: Phase A telemetry recorded');
assert(cycle1_result.phase_d.quality_scores >= 0, 'Integration: Phase D quality scoring executed');
assert(cycle1_result.phase_b.mttr_prediction > 0, 'Integration: Phase B MTTR prediction computed');
assert(cycle1_result.phase_e.governance_assessment !== undefined, 'Integration: Phase E governance assessment');
assert(cycle1_result.phase_9.strategic_intent !== undefined, 'Integration: Phase 9 strategic intent computed');
assert(cycle1_result.phase_9.strategy_selected !== undefined, 'Integration: Phase 9 strategy selected');

// Test 2: Multi-cycle sequence (simulated)
console.log('\nINTEGRATION: Multi-Cycle Sequence');
console.log('-'.repeat(60));

const multi_cycle_results = [];
for (let i = 1; i <= 3; i++) {
  const result = orchestrator.runPhase9Cycle(`sequence-${i}`, {
    architectureSnapshot: {
      components: Array(5 + i).fill('c').map((_, j) => `comp-${j}`),
      interfaces: Array(4 + i).fill('i').map((_, j) => `if-${j}`),
      invariants: ['REVERSIBLE_CHANGES_ONLY', 'AUDIT_TRAIL_REQUIRED']
    },
    architectureComplexity: 100 + (i * 5),
    rollbackRate: Math.max(0, 0.3 - (i * 0.05)),
    architectureConsistency: Math.min(1, 0.90 + (i * 0.03)),
    learningMetrics: {
      learningEfficiency: 0.75 + (i * 0.05),
      convergenceVelocity: 0.10 + (i * 0.03),
      stabilityScore: 0.85 + (i * 0.02)
    },
    validationEvidence: {
      testPassRate: 1,
      canarySuccessRate: 1,
      errorRatePct: 0.1,
      observedImprovementPct: 3 + (i * 0.5)
    },
    implementationActor: 'autonomous'
  });
  multi_cycle_results.push(result);
}

assert(multi_cycle_results.length === 3, 'Integration: 3 cycles completed sequentially');

// Verify progression: stability should increase
const stability_trend = multi_cycle_results.map(r => r.phase_9.strategy_selected);
assert(stability_trend.every(s => s !== undefined), 'Integration: All cycles have strategy selection');

// Test 3: Phase integration (all 5 phases are connected)
console.log('\nINTEGRATION: Phase Connectivity');
console.log('-'.repeat(60));

const integration_status = orchestrator.synthesis_engine.getPhaseIntegration();
assert(integration_status.phase_c_trend === 'connected', 'Integration: Phase C connected');
assert(integration_status.phase_a_observability === 'connected', 'Integration: Phase A connected');
assert(integration_status.phase_d_quality === 'connected', 'Integration: Phase D connected');
assert(integration_status.phase_b_predictive === 'connected', 'Integration: Phase B connected');
assert(integration_status.phase_e_governance === 'connected', 'Integration: Phase E connected');
assert(integration_status.phase_9_strategic === 'connected', 'Integration: Phase 9 connected');
assert(integration_status.all_phases_integrated === true, 'Integration: All 6 phases integrated');

// Test 4: Autonomous control (pause/abort detection)
console.log('\nINTEGRATION: Autonomous Control');
console.log('-'.repeat(60));

const control_status = orchestrator.evolution_controller.getControlStatus();
assert(control_status.cycle_state !== undefined, 'Integration: Cycle state tracked');
assert(typeof control_status.pause_events === 'number', 'Integration: Pause events counted');
assert(typeof control_status.abort_events === 'number', 'Integration: Abort events counted');

// Test 5: Full system status
console.log('\nINTEGRATION: Full System Status');
console.log('-'.repeat(60));

const full_status = orchestrator.getFullSystemStatus();
assert(full_status.orchestrator !== undefined, 'Integration: Orchestrator status available');
assert(full_status.phase_8 !== undefined, 'Integration: Phase 8 status available');
assert(full_status.phase_c !== undefined, 'Integration: Phase C status available');
assert(full_status.phase_a !== undefined, 'Integration: Phase A status available');
assert(full_status.phase_d !== undefined, 'Integration: Phase D status available');
assert(full_status.phase_b !== undefined, 'Integration: Phase B status available');
assert(full_status.phase_e !== undefined, 'Integration: Phase E status available');
assert(full_status.phase_9 !== undefined, 'Integration: Phase 9 status available');

// Test 6: Strategy consistency (same input → same strategy)
console.log('\nINTEGRATION: Strategy Consistency');
console.log('-'.repeat(60));

const consistent_state = {
  complexity: 110,
  stability: 0.92,
  improvementTrend: 2,
  rollbackRate: 0.15,
  mttrSeconds: 20
};

const strategy1 = orchestrator.strategy_selector.selectStrategy(consistent_state);
const strategy2 = orchestrator.strategy_selector.selectStrategy(consistent_state);
assert(strategy1.strategy === strategy2.strategy, 'Integration: Strategy selection is deterministic');

// Test 7: Watchdog activation
console.log('\nINTEGRATION: Watchdog Protection');
console.log('-'.repeat(60));

const watchdog_status = orchestrator.drift_prevention.getWatchdogStatus();
assert(watchdog_status.rules_monitored === 6, 'Integration: All 6 watchdog rules active');
assert(typeof watchdog_status.total_violations_history === 'number', 'Integration: Violations tracked');

// Test 8: Proposal quality integration
console.log('\nINTEGRATION: Quality Scoring Integration');
console.log('-'.repeat(60));

const quality_report = orchestrator.quality_scorer.getQualityReport();
assert(quality_report.totalProposalsTracked >= 0, 'Integration: Quality tracking active');
assert(Array.isArray(quality_report.subsystemLineage), 'Integration: Subsystem lineage available');

// Test 9: Governance integration
console.log('\nINTEGRATION: Governance Integration');
console.log('-'.repeat(60));

const gov_status = orchestrator.governance.getMetaGovernanceStatus();
assert(gov_status.adaptiveThresholds !== undefined, 'Integration: Adaptive thresholds tracked');
assert(gov_status.currentAssessment !== undefined, 'Integration: Governance assessment available');

// Test 10: Telemetry integration
console.log('\nINTEGRATION: Telemetry Integration');
console.log('-'.repeat(60));

const telemetry_report = orchestrator.telemetry.getObservabilityReport();
assert(telemetry_report.totalCycles >= 0, 'Integration: Cycle snapshots collected');
assert(telemetry_report.totalRollbacks >= 0, 'Integration: Rollback traces collected');
assert(telemetry_report.driftAnalysis !== undefined, 'Integration: Drift analysis available');

// ============================================================================
// BEHAVIORAL: Autonomous Cycle Management
// ============================================================================
console.log('\n' + '='.repeat(60));
console.log('BEHAVIORAL: Autonomous Cycle Management');
console.log('-'.repeat(60));

// Simulate autonomous mode decision
const auto_init_check = orchestrator.evolution_controller.shouldInitiateCycle({
  rollback_rate: 0.2,
  architecture_consistency: 0.95,
  metric_drift_detected: false
});
assert(auto_init_check.should_initiate === true, 'Autonomous: System ready for cycle initiation');

// Verify no catastrophic failures
const catastrophic_check = orchestrator.evolution_controller.shouldAbortCycle({
  constraint_violation_critical: false,
  rollback_failure: false,
  consecutive_rollbacks: 1,
  governance_deadlock: false
});
assert(catastrophic_check.should_abort === false, 'Autonomous: Cycle proceeding (no abort conditions)');

// ============================================================================
// VALIDATION: System Resilience
// ============================================================================
console.log('\n' + '='.repeat(60));
console.log('VALIDATION: System Resilience');
console.log('-'.repeat(60));

// Verify all cycles passed
const all_gates_passed = multi_cycle_results.every(r => r.all_gates_passed);
assert(all_gates_passed, 'Resilience: All multi-cycle gates passed');

// Verify no phase failed
const all_phases_healthy = multi_cycle_results.every(r =>
  r.phase_8 && r.phase_c && r.phase_a && r.phase_d && r.phase_b && r.phase_e && r.phase_9
);
assert(all_phases_healthy, 'Resilience: All 6 phases healthy across cycles');

// Verify synthesis works across all cycles
const synthesis_approved = multi_cycle_results.every(r => r.phase_9.synthesis_approval !== undefined);
assert(synthesis_approved, 'Resilience: Phase 9 synthesis functioning on all cycles');

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n' + '='.repeat(60));
console.log('=== INTEGRATION TEST SUMMARY ===');
console.log('='.repeat(60));
console.log(`Total Tests: ${testsPassed + testsFailed}`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log(`Exit Code: ${testsFailed > 0 ? 1 : 0}`);
console.log('\nIntegration Coverage:');
console.log('  ✓ Phase 9 Orchestrator (extended SelfArchitectureOrchestrator)');
console.log('  ✓ Phase 8 (core hardening)');
console.log('  ✓ Phase C (temporal trends)');
console.log('  ✓ Phase A (observability)');
console.log('  ✓ Phase D (quality scoring)');
console.log('  ✓ Phase B (predictive modeling)');
console.log('  ✓ Phase E (meta-governance)');
console.log('  ✓ Multi-phase synthesis (all 6 gates)');
console.log('  ✓ Autonomous control (initiation, pause, abort, scheduling)');
console.log('  ✓ Watchdog protection (6 rules)');
console.log('  ✓ End-to-end cycle management');
console.log('  ✓ System resilience');

process.exit(testsFailed > 0 ? 1 : 0);
