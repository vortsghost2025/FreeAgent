/**
 * Phase 7.5 Test Suite - Supervised Autonomy Controller
 */

import {
  GuardrailPolicy,
  MutationZoneManager,
  AutonomyEscalationManager,
  SupervisedAutonomyController
} from './medical/intelligence/supervised-autonomy-controller.js';

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

console.log('=== PHASE 7.5: SUPERVISED AUTONOMY ===\n');

// Test 1: Guardrail evaluation pass
const guardrails = new GuardrailPolicy();
const safeEval = guardrails.evaluate({
  riskScore: 0.2,
  testPassRate: 1,
  latencyRegressionPct: 2,
  operations: []
});
assert(!safeEval.blocked && !safeEval.requiresHuman, 'Guardrails: allow safe action');

// Test 2: Guardrail escalation
const escalationEval = guardrails.evaluate({
  riskScore: 0.8,
  testPassRate: 1,
  latencyRegressionPct: 2,
  operations: []
});
assert(escalationEval.requiresHuman, 'Guardrails: escalate high risk action');

// Test 3: Guardrail forbidden operation
guardrails.setForbiddenOperations(['rm-all']);
const forbiddenEval = guardrails.evaluate({
  riskScore: 0.1,
  testPassRate: 1,
  latencyRegressionPct: 0,
  operations: ['rm-all']
});
assert(forbiddenEval.blocked, 'Guardrails: block forbidden operation');

// Test 4: Mutation zones
const zones = new MutationZoneManager({ allowedZones: ['medical/intelligence/'] });
const zoneOk = zones.evaluatePaths(['medical/intelligence/example.js']);
assert(zoneOk.allowed, 'Mutation zones: allow in-zone path');

// Test 5: Mutation zones block out-of-zone
const zoneBlock = zones.evaluatePaths(['core/unsafe.js']);
assert(!zoneBlock.allowed, 'Mutation zones: block out-of-zone path');

// Test 6: Mutation zones block traversal-style escape
const zoneTraversal = zones.evaluatePaths(['medical/intelligence/../outside.js']);
assert(!zoneTraversal.allowed, 'Mutation zones: block traversal path');

// Test 6: Escalation manager lifecycle
const escMgr = new AutonomyEscalationManager();
const escalation = escMgr.createEscalation({ actionId: 'a1', type: 'CODE_PATCH' }, ['HIGH_IMPACT']);
const resolved = escMgr.resolveEscalation(escalation.escalationId, 'APPROVED', 'human');
assert(resolved.success, 'Escalation manager: create and resolve escalation');

// Test 7: Controller auto-approve safe action
const controller = new SupervisedAutonomyController();
controller.configureMutationZones(['medical/intelligence/']);
const auto = controller.evaluateAction({
  actionId: 'act-1',
  type: 'OPTIMIZATION',
  riskScore: 0.2,
  operations: ['propose-optimization'],
  filePaths: ['medical/intelligence/scheduler.js'],
  testPassRate: 1,
  latencyRegressionPct: 1
});
assert(auto.decision === 'AUTO_APPROVED', 'Controller: auto-approve safe action');

// Test 8: Controller escalates high impact
const escalated = controller.evaluateAction({
  actionId: 'act-2',
  type: 'CODE_PATCH',
  riskScore: 0.3,
  operations: ['propose-code-patch'],
  filePaths: ['medical/intelligence/core.js'],
  testPassRate: 1,
  latencyRegressionPct: 1,
  highImpact: true
});
assert(escalated.decision === 'ESCALATE_HUMAN', 'Controller: escalate high impact action');

// Test 9: Controller blocks forbidden operation
controller.configureForbiddenOperations(['destructive-op']);
const blocked = controller.evaluateAction({
  actionId: 'act-3',
  type: 'CODE_PATCH',
  riskScore: 0.1,
  operations: ['destructive-op'],
  filePaths: ['medical/intelligence/safe.js'],
  testPassRate: 1
});
assert(blocked.decision === 'BLOCKED', 'Controller: block forbidden operation');

// Test 10: Controller blocks outside mutation zone
const blockedZone = controller.evaluateAction({
  actionId: 'act-4',
  type: 'CODE_PATCH',
  riskScore: 0.1,
  operations: ['propose-code-patch'],
  filePaths: ['outside/safe.js'],
  testPassRate: 1
});
assert(blockedZone.decision === 'BLOCKED', 'Controller: block out-of-zone mutation');

// Test 11: Supervision status counts
const status = controller.getSupervisionStatus();
assert(status.totalDecisions === 4, 'Controller: decision count tracked');

// Test 12: Escalation pending count
assert(status.escalation.pending >= 1, 'Controller: pending escalations tracked');

console.log(`\nTests: ${testsPassed}/${testsPassed + testsFailed} passed`);
process.exit(testsFailed > 0 ? 1 : 0);
