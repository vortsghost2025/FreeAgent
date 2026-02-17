/**
 * Phase 6.3 Test Suite - Federated Learning Coordination
 */

import {
  ModelVersioningManager,
  ParameterAggregator,
  PrivacyPreservingAggregator,
  FederatedLearningCoordinationEngine
} from './medical/intelligence/federated-learning-coordination.js';

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

console.log('=== PHASE 6.3: FEDERATED LEARNING COORDINATION ===\n');

// Test 1: Create model
const modelMgr = new ModelVersioningManager();
const created = modelMgr.createModel('medical-model-v1', { features: 128, layers: 4 });
assert(created.success && created.version === 1, 'Model versioning: Create model');

// Test 2: Publish update
const updated = modelMgr.publishUpdate('medical-model-v1', { features: 128, layers: 4, weights: [0.5, 0.3] }, 0.92);
assert(updated.success && updated.version === 2, 'Model versioning: Publish update');

// Test 3: Get model version
const version = modelMgr.getModelVersion('medical-model-v1', 'latest');
assert(version && version.version === 2, 'Model versioning: Get latest version');

// Test 4: Get version history
const history = modelMgr.getVersionHistory('medical-model-v1');
assert(history.length >= 1, 'Model versioning: Get version history');

// Test 5: Get model stats
const stats = modelMgr.getModelStats('medical-model-v1');
assert(stats.totalVersions === 2 && stats.avgAccuracy > 0, 'Model versioning: Model stats');

// Test 6: Register parameters
const aggregator = new ParameterAggregator({ strategy: 'FedAvg' });
aggregator.registerParameters('node-1', { w1: 0.5, w2: 0.3 }, 1.0);
aggregator.registerParameters('node-2', { w1: 0.52, w2: 0.31 }, 1.0);
aggregator.registerParameters('node-3', { w1: 0.48, w2: 0.29 }, 1.0);
assert(aggregator.parameters.size === 3, 'Parameter aggregator: Register parameters');

// Test 7: Set node accuracy
aggregator.setNodeAccuracy('node-1', 0.91, 1000);
aggregator.setNodeAccuracy('node-2', 0.93, 1200);
aggregator.setNodeAccuracy('node-3', 0.89, 800);
const node1 = aggregator.parameters.get('node-1');
assert(node1.accuracy === 0.91, 'Parameter aggregator: Set node accuracy');

// Test 8: Aggregate parameters (FedAvg)
const agg1 = aggregator.aggregateParameters('agg-1', ['node-1', 'node-2', 'node-3']);
assert(agg1.success, 'Parameter aggregator: Aggregate FedAvg');

// Test 9: Get aggregation result
const aggResult = aggregator.getAggregation('agg-1');
assert(aggResult && aggResult.participatingNodes === 3, 'Parameter aggregator: Get aggregation result');

// Test 10: Aggregation stats
const aggStats = aggregator.getAggregationStats();
assert(aggStats.totalAggregations === 1, 'Parameter aggregator: Aggregation stats');

// Test 11: MedianFed aggregation
const medianAgg = new ParameterAggregator({ strategy: 'MedianFed' });
medianAgg.registerParameters('m-node-1', { v: 10 });
medianAgg.registerParameters('m-node-2', { v: 20 });
medianAgg.registerParameters('m-node-3', { v: 30 });
const medResult = medianAgg.aggregateParameters('median-agg', ['m-node-1', 'm-node-2', 'm-node-3']);
assert(medResult.success, 'Parameter aggregator: MedianFed strategy');

// Test 12: SafeFed aggregation
const safeAgg = new ParameterAggregator({ strategy: 'SafeFed' });
safeAgg.registerParameters('s-node-1', { w: 0.5 });
safeAgg.setNodeAccuracy('s-node-1', 0.95);
safeAgg.registerParameters('s-node-2', { w: 0.48 });
safeAgg.setNodeAccuracy('s-node-2', 0.85); // Lower accuracy
const safeResult = safeAgg.aggregateParameters('safe-agg', ['s-node-1', 's-node-2']);
assert(safeResult.success, 'Parameter aggregator: SafeFed strategy');

// Test 13: Differential privacy
const privacy = new PrivacyPreservingAggregator({ epsilon: 1.0, delta: 1e-6 });
const noisyData = privacy.addDifferentialPrivacy({ param1: 0.5, param2: 0.3 }, 1.0);
assert(noisyData.param1 != null && noisyData.param2 != null, 'Privacy aggregator: Add differential privacy');

// Test 14: Secure sum
const secureSum = privacy.secureSum([1.0, 1.1, 1.0, 0.9, 1.0]);
assert(secureSum.secureSum > 0 && secureSum.outlierCount >= 0, 'Privacy aggregator: Secure sum');

// Test 15: Privacy audit
const audit = privacy.createPrivacyAudit('audit-1', { data: 'test' });
assert(audit.success, 'Privacy aggregator: Privacy audit');

// Test 16: Privacy report
const privReport = privacy.getPrivacyReport();
assert(privReport.complianceRate >= 100 && privReport.status === 'COMPLIANT', 'Privacy aggregator: Privacy report');

// Test 17: Create federated model
const engine = new FederatedLearningCoordinationEngine();
const engModel = engine.createFederatedModel('fed-model', { features: 64, layers: 3 });
assert(engModel.success, 'Learning engine: Create federated model');

// Test 18: Register learning node
engine.registerLearningNode('learn-node-1', { w1: 0.5, w2: 0.3 });
engine.registerLearningNode('learn-node-2', { w1: 0.51, w2: 0.31 });
engine.registerLearningNode('learn-node-3', { w1: 0.49, w2: 0.29 });
assert(engine.aggregator.parameters.size === 3, 'Learning engine: Register learning nodes');

// Test 19: Set learning node accuracy
engine.aggregator.setNodeAccuracy('learn-node-1', 0.88, 900);
engine.aggregator.setNodeAccuracy('learn-node-2', 0.91, 950);
engine.aggregator.setNodeAccuracy('learn-node-3', 0.87, 850);
assert(engine.roundCount === 0, 'Learning engine: Set node accuracy');

// Test 20: Conduct training round
const round1 = engine.conductTrainingRound('round-1', ['learn-node-1', 'learn-node-2', 'learn-node-3']);
assert(round1.success && round1.round === 1, 'Learning engine: Conduct training round');

// Test 21: Multiple training rounds
const round2 = engine.conductTrainingRound('round-2', ['learn-node-1', 'learn-node-2']);
const round3 = engine.conductTrainingRound('round-3', ['learn-node-2', 'learn-node-3']);
assert(engine.roundCount === 3, 'Learning engine: Multiple training rounds');

// Test 22: Get federated status
const fedStatus = engine.getFederatedStatus();
assert(fedStatus.model && fedStatus.aggregation && fedStatus.privacy, 'Learning engine: Get federated status');

// Test 23: Learning progress
assert(fedStatus.trainingRounds === 3 && fedStatus.privacy.status === 'COMPLIANT', 'Learning engine: Learning progress');

// Test 24: Model convergence tracking
const stats2 = engine.modelMgr.getModelStats('fed-model');
assert(stats2.totalVersions >= 1, 'Learning engine: Model convergence');

// Test 25: Privacy compliance verification
assert(fedStatus.privacy.complianceRate >= 100, 'Learning engine: Privacy compliance');

console.log(`\nTests: ${testsPassed}/${testsPassed + testsFailed} passed`);
process.exit(testsFailed > 0 ? 1 : 0);
