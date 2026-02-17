/**
 * Phase 7.6 Test Suite - Long-Horizon Evolution Memory
 */

import {
  OutcomeMemoryStore,
  FailurePatternAnalyzer,
  LongHorizonEvolutionMemoryEngine
} from './medical/intelligence/evolution-memory.js';

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

console.log('=== PHASE 7.6: LONG-HORIZON EVOLUTION MEMORY ===\n');

// Test 1: Raw store outcome
const store = new OutcomeMemoryStore();
store.recordOutcome({ cycleId: 'c1', proposalId: 'p1', outcome: 'SUCCESS' });
assert(store.outcomes.length === 1, 'Outcome store: record outcome');

// Test 2: Raw store failure
store.recordFailure({ cycleId: 'c1', proposalId: 'p2', reason: 'TEST_FAIL', subsystem: 'learning' });
assert(store.failures.length === 1, 'Outcome store: record failure');

// Test 3: Raw store instability
store.recordInstability({ cycleId: 'c1', cause: 'LATENCY_SPIKE', impactScore: 0.7 });
assert(store.instabilities.length === 1, 'Outcome store: record instability');

// Test 4: Failure analyzer
const analyzer = new FailurePatternAnalyzer();
const failurePatterns = analyzer.analyzeFailures(store.failures);
assert(failurePatterns.totalFailures === 1, 'Failure analyzer: analyze failures');

// Test 5: Memory engine record success
const memory = new LongHorizonEvolutionMemoryEngine();
memory.recordOutcome('c1', 'p1', 'SUCCESS', {
  latency: { before: 200, after: 180, relativeDelta: -0.1 }
});
assert(memory.store.outcomes.length === 1, 'Memory engine: record successful outcome');

// Test 6: Memory engine record failure
memory.recordFailure('c1', 'p2', 'REGRESSION_RISK_HIGH', 'scheduler');
assert(memory.store.failures.length === 1, 'Memory engine: record failure');

// Test 7: Memory engine record instability
memory.recordInstability('c1', 'LATENCY_REGRESSION_LIMIT_EXCEEDED', 0.8);
assert(memory.store.instabilities.length === 1, 'Memory engine: record instability');

// Test 8: Convergence and determinism records
memory.recordConvergenceImprovement('c1', 0.7, 0.78);
memory.recordNondeterminismCorrection('c1', 'phase-6.2', 'DETERMINISTIC_HOOK');
assert(
  memory.store.convergenceImprovements.length === 1 && memory.store.nondeterminismCorrections.length === 1,
  'Memory engine: convergence and determinism tracking'
);

// Test 9: What worked list
const worked = memory.getWhatWorked();
assert(worked.length >= 1, 'Memory engine: retrieve what worked');

// Test 10: Institutional memory report
const report = memory.getInstitutionalMemoryReport();
assert(report.totals.outcomes >= 1 && report.recommendations.length >= 1, 'Memory engine: institutional report');

console.log(`\nTests: ${testsPassed}/${testsPassed + testsFailed} passed`);
process.exit(testsFailed > 0 ? 1 : 0);

