/**
 * Phase 8.3 Test Suite - Incident Containment Engine
 */

import { IncidentContainmentEngine } from './medical/intelligence/incident-containment-engine.js';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (!condition) {
    console.log(`x ${message}`);
    testsFailed++;
  } else {
    console.log(`ok ${message}`);
    testsPassed++;
  }
}

console.log('=== PHASE 8.3: INCIDENT CONTAINMENT ENGINE ===\n');

const engine = new IncidentContainmentEngine();

// Test 1: Healthy telemetry is NONE severity
const healthy = engine.analyzeTelemetry('rel-healthy', {
  errorRatePct: 0.1,
  latencyRegressionPct: 1,
  availabilityPct: 99.95
});
assert(healthy.severity === 'NONE', 'Containment: healthy telemetry remains none');

// Test 2: Warning telemetry detected
const warning = engine.analyzeTelemetry('rel-warning', {
  errorRatePct: 0.2,
  latencyRegressionPct: 7,
  availabilityPct: 99.9
});
assert(warning.severity === 'WARNING', 'Containment: warning telemetry detected');

// Test 3: Critical telemetry detected
const critical = engine.analyzeTelemetry('rel-critical', {
  errorRatePct: 2,
  latencyRegressionPct: 3,
  availabilityPct: 99.9
});
assert(critical.severity === 'CRITICAL', 'Containment: critical telemetry detected');

// Test 4: Warning action freezes and escalates
const warningAction = engine.handleTelemetry('rel-warning-action', {
  errorRatePct: 0.3,
  latencyRegressionPct: 6.5,
  availabilityPct: 99.9
});
assert(warningAction.action === 'FREEZE_AND_ESCALATE', 'Containment: warning action is freeze and escalate');

// Test 5: Critical action contains and rolls back
const criticalAction = engine.handleTelemetry('rel-critical-action', {
  errorRatePct: 3,
  latencyRegressionPct: 5,
  availabilityPct: 99.9
});
assert(criticalAction.action === 'CONTAIN_AND_ROLLBACK', 'Containment: critical action is contain and rollback');

// Test 6: Threshold configuration bounds values
const configured = engine.configureThresholds({
  warningErrorRatePct: -2,
  criticalErrorRatePct: 999,
  warningLatencyRegressionPct: -10,
  criticalLatencyRegressionPct: 9999,
  warningAvailabilityPct: -4,
  criticalAvailabilityPct: 150
});
assert(
  configured.success &&
    configured.thresholds.warningErrorRatePct === 0 &&
    configured.thresholds.criticalErrorRatePct === 100 &&
    configured.thresholds.warningLatencyRegressionPct === 0 &&
    configured.thresholds.warningAvailabilityPct === 0 &&
    configured.thresholds.criticalAvailabilityPct === 100,
  'Containment: threshold bounds enforced'
);

// Test 7: Incident stats tracked
const stats = engine.getIncidentStats();
assert(
  stats.analyses >= 3 &&
    stats.warning >= 1 &&
    stats.critical >= 1 &&
    stats.actions.freezeAndEscalate >= 1 &&
    stats.actions.containAndRollback >= 1,
  'Containment: stats track severities and actions'
);

console.log(`\nTests: ${testsPassed}/${testsPassed + testsFailed} passed`);
process.exit(testsFailed > 0 ? 1 : 0);

