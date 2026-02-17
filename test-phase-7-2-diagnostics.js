/**
 * Phase 7.2 Test Suite - Federated Self-Diagnostics
 */

import {
  DriftDetector,
  NondeterminismScanner,
  VersionLedgerIntegrityChecker,
  PrivacyAggregatorCorrectnessChecker,
  ConvergenceStabilityAnalyzer,
  OrchestrationLatencyMonitor,
  FederatedSelfDiagnosticsEngine
} from './medical/intelligence/federated-self-diagnostics.js';

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

console.log('=== PHASE 7.2: FEDERATED SELF-DIAGNOSTICS ===\n');

// Test 1: Drift detector healthy
const drift = new DriftDetector({ driftThreshold: 0.2 });
const driftHealthy = drift.detect([100, 102, 98], [101, 100, 99]);
assert(driftHealthy.status === 'HEALTHY', 'Drift detector: healthy state');

// Test 2: Drift detector degraded
const driftBad = drift.detect([100, 100, 100], [150, 155, 160]);
assert(driftBad.status === 'DEGRADED', 'Drift detector: degraded state');

// Test 3: Nondeterminism scanner healthy
const scanner = new NondeterminismScanner();
const deterministic = scanner.scan([
  { suite: 'phase-6.2', passCount: 26, total: 26 },
  { suite: 'phase-6.2', passCount: 26, total: 26 }
]);
assert(deterministic.status === 'HEALTHY', 'Nondeterminism scanner: stable runs');

// Test 4: Nondeterminism scanner degraded
const flaky = scanner.scan([
  { suite: 'phase-6.2', passCount: 26, total: 26 },
  { suite: 'phase-6.2', passCount: 24, total: 26 }
]);
assert(flaky.status === 'DEGRADED', 'Nondeterminism scanner: detects flake');

// Test 5: Ledger integrity healthy
const ledger = new VersionLedgerIntegrityChecker();
const ledgerHealthy = ledger.verify([
  { modelId: 'm1', version: 1 },
  { modelId: 'm1', version: 2 },
  { modelId: 'm2', version: 1 }
]);
assert(ledgerHealthy.status === 'HEALTHY', 'Ledger checker: healthy sequence');

// Test 6: Ledger integrity degraded
const ledgerBad = ledger.verify([
  { modelId: 'm1', version: 1 },
  { modelId: 'm1', version: 3 }
]);
assert(ledgerBad.status === 'DEGRADED', 'Ledger checker: detects gaps');

// Test 7: Privacy checker healthy
const privacy = new PrivacyAggregatorCorrectnessChecker();
const privacyHealthy = privacy.verify(
  { status: 'COMPLIANT', complianceRate: 100 },
  [{ secureSum: 10, outlierCount: 0, valuesCount: 5 }]
);
assert(privacyHealthy.status === 'HEALTHY', 'Privacy checker: compliant');

// Test 8: Privacy checker degraded
const privacyBad = privacy.verify(
  { status: 'NON_COMPLIANT', complianceRate: 80 },
  [{ secureSum: 10, outlierCount: 5, valuesCount: 5 }]
);
assert(privacyBad.status === 'DEGRADED', 'Privacy checker: non-compliant');

// Test 9: Convergence analyzer improving
const convergence = new ConvergenceStabilityAnalyzer();
const improving = convergence.analyze([0.72, 0.75, 0.78, 0.8]);
assert(improving.trend === 'IMPROVING', 'Convergence analyzer: improving trend');

// Test 10: Convergence analyzer degrading
const degrading = convergence.analyze([0.9, 0.88, 0.84, 0.8]);
assert(degrading.status === 'DEGRADED', 'Convergence analyzer: degrading trend');

// Test 11: Latency monitor healthy
const latency = new OrchestrationLatencyMonitor({ maxP95LatencyMs: 250 });
const latencyHealthy = latency.check([100, 110, 120, 130, 140]);
assert(latencyHealthy.status === 'HEALTHY', 'Latency monitor: healthy p95');

// Test 12: Latency monitor degraded
const latencyBad = latency.check([200, 220, 240, 260, 500]);
assert(latencyBad.status === 'DEGRADED', 'Latency monitor: degraded p95');

// Test 13: Diagnostics engine repair trigger
const engine = new FederatedSelfDiagnosticsEngine();
const report = engine.runDiagnostics({
  referenceMetrics: [100, 100, 100],
  currentMetrics: [140, 145, 150],
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
  convergenceHistory: [0.9, 0.88, 0.85, 0.82],
  orchestrationLatencies: [120, 140, 160, 300]
});
assert(report.repairTriggered, 'Diagnostics engine: trigger repair when degraded');

// Test 14: Diagnostics status report
const status = engine.getDiagnosticsStatus();
assert(status.totalRuns === 1, 'Diagnostics engine: status summary');

console.log(`\nTests: ${testsPassed}/${testsPassed + testsFailed} passed`);
process.exit(testsFailed > 0 ? 1 : 0);

