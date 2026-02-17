/**
 * Phase 8.1 Test Suite - Meta-Cognitive Awareness
 */

import {
  SelfArchitectureModel,
  ArchitecturalReasoner,
  MetaCognitiveAwarenessEngine
} from './medical/intelligence/meta-cognitive-awareness.js';

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

console.log('=== PHASE 8.1: META-COGNITIVE AWARENESS ===\n');

// Test 1: Self model ingestion
const model = new SelfArchitectureModel();
const ingest = model.ingestSnapshot({
  components: [{ componentId: 'awareness' }, { componentId: 'evolution' }],
  interfaces: [{ interfaceId: 'awareness:evolution' }],
  invariants: ['REVERSIBLE_CHANGES_ONLY']
});
assert(ingest.success && ingest.componentCount === 2, 'Self model: ingest architecture snapshot');

// Test 2: Consistency score with matching external inspection
const consistencyHigh = model.computeConsistency({
  components: ['awareness', 'evolution'],
  interfaces: ['awareness:evolution'],
  invariants: ['REVERSIBLE_CHANGES_ONLY']
});
assert(consistencyHigh.consistency >= 0.99, 'Self model: high consistency for matching architecture');

// Test 3: Consistency score with mismatched external inspection
const consistencyLow = model.computeConsistency({
  components: ['missing-component'],
  interfaces: ['missing:interface'],
  invariants: ['REVERSIBLE_CHANGES_ONLY']
});
assert(consistencyLow.consistency < 0.99, 'Self model: detect architecture drift via lower consistency');

// Test 4: Reasoner fallback proposal
const reasoner = new ArchitecturalReasoner();
const fallback = reasoner.proposeChanges({ consistency: 1 }, {
  decisionOscillationScore: 0,
  validationBacklog: 0,
  traceabilityCoverage: 1,
  learningEfficiencyTrend: 0
});
assert(fallback.length === 1 && fallback[0].type === 'ARCHITECTURE_HYGIENE_SWEEP', 'Reasoner: produce fallback proposal when healthy');

// Test 5: Reasoner degraded proposal set
const degraded = reasoner.proposeChanges({ consistency: 0.9 }, {
  decisionOscillationScore: 0.4,
  validationBacklog: 2,
  traceabilityCoverage: 0.8,
  learningEfficiencyTrend: -0.1
});
assert(degraded.length >= 4, 'Reasoner: generate multiple proposals for degraded cognition signals');

// Test 6: Awareness scan and reflection
const engine = new MetaCognitiveAwarenessEngine();
const scan = engine.scanArchitecture({
  components: [{ componentId: 'model' }, { componentId: 'validator' }],
  interfaces: [{ interfaceId: 'model:validator' }],
  invariants: ['AUDIT_TRAIL_REQUIRED']
}, {
  components: ['model', 'validator'],
  interfaces: ['model:validator'],
  invariants: ['AUDIT_TRAIL_REQUIRED']
});
const reflection = engine.reflectOnCognition({
  decisions: ['A', 'B', 'A', 'B'],
  validationBacklog: 3,
  traceabilityCoverage: 0.75,
  learningEfficiencyTrend: -0.05
});
assert(scan.success && reflection.decisionOscillationScore > 0, 'Awareness engine: scan architecture and reflect on decision oscillation');

// Test 7: Awareness proposals use reflection context
const proposals = engine.proposeSelfArchitectureChanges({ objective: 'reduce-oscillation' });
assert(proposals.proposalCount > 0, 'Awareness engine: propose self-architecture changes');

console.log(`\nTests: ${testsPassed}/${testsPassed + testsFailed} passed`);
process.exit(testsFailed > 0 ? 1 : 0);

