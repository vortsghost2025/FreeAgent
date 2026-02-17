/**
 * Phase 8.2 Test Suite - Autonomous Architectural Evolution
 */

import {
  ConstitutionalConstraintMapper,
  AutonomousArchitecturalEvolutionEngine
} from './medical/intelligence/autonomous-architectural-evolution.js';

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

console.log('=== PHASE 8.2: AUTONOMOUS ARCHITECTURAL EVOLUTION ===\n');

// Test 1: Constraint mapper approves compliant change
const mapper = new ConstitutionalConstraintMapper();
const compliant = mapper.validateChange({
  reversible: true,
  rollbackPlan: 'restore:snapshot-1',
  auditRef: 'audit:1',
  performanceImpactPct: 2,
  safetyRiskScore: 0.2
});
assert(compliant.compliant, 'Constraint mapper: approve compliant change');

// Test 2: Constraint mapper rejects non-reversible change
const nonReversible = mapper.validateChange({
  reversible: false,
  rollbackPlan: '',
  auditRef: 'audit:2',
  performanceImpactPct: 2,
  safetyRiskScore: 0.2
});
assert(!nonReversible.compliant, 'Constraint mapper: reject non-reversible change');

// Test 3: Register architecture proposals
const engine = new AutonomousArchitecturalEvolutionEngine({
  autoImplementRiskThreshold: 0.25
});
const registration = engine.registerProposals([
  {
    type: 'MODEL_SYNCHRONIZATION',
    target: 'architecture-model',
    summary: 'Sync architecture model',
    riskScore: 0.12,
    estimatedPerformanceImpactPct: 2.5
  },
  {
    type: 'DECISION_PIPELINE_STABILIZATION',
    target: 'governance-pipeline',
    summary: 'Stabilize governance decisions',
    riskScore: 0.8,
    expectedImpact: 'HIGH',
    estimatedPerformanceImpactPct: 4
  }
]);
assert(registration.success && registration.registeredCount === 2, 'Evolution engine: register proposals');

const safeChangeId = registration.registered[0].changeId;
const highRiskChangeId = registration.registered[1].changeId;

// Test 4: Validate safe change
const safeValidation = engine.validateChange(safeChangeId, {
  testPassRate: 1,
  canarySuccessRate: 1,
  errorRatePct: 0.1
});
assert(safeValidation.success && safeValidation.validation.isValid, 'Evolution engine: validate compliant safe change');

// Test 5: Autonomous implementation for low-risk change
const safeImplementation = engine.implementChange(safeChangeId, 'autonomous');
assert(safeImplementation.success && safeImplementation.status === 'IMPLEMENTED', 'Evolution engine: auto-implement low-risk validated change');

// Test 6: High-risk change requires human review
const highRiskValidation = engine.validateChange(highRiskChangeId, {
  testPassRate: 1,
  canarySuccessRate: 1,
  errorRatePct: 0.1
});
const highRiskImplementation = engine.implementChange(highRiskChangeId, 'autonomous');
assert(
  highRiskValidation.success &&
    highRiskImplementation.success &&
    highRiskImplementation.status === 'PENDING_HUMAN_REVIEW',
  'Evolution engine: hold high-risk change for human review'
);

// Test 7: Human implementation path works
const humanImplementation = engine.implementChange(highRiskChangeId, 'human-auditor');
assert(humanImplementation.success && humanImplementation.status === 'IMPLEMENTED', 'Evolution engine: allow human-approved implementation');

// Test 8: Rollback implemented change
const rolledBack = engine.rollbackChange(safeChangeId, 'post-deploy-instability');
assert(rolledBack.success && rolledBack.status === 'ROLLED_BACK', 'Evolution engine: rollback implemented change');

// Test 9: Evolution report stats
const report = engine.getEvolutionReport();
assert(report.stats.total === 2 && report.stats.implemented >= 1, 'Evolution engine: report change lifecycle stats');

console.log(`\nTests: ${testsPassed}/${testsPassed + testsFailed} passed`);
process.exit(testsFailed > 0 ? 1 : 0);

