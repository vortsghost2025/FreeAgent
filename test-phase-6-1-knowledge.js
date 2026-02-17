/**
 * Phase 6.1 Test Suite - Federated Knowledge Exchange
 */

import {
  PatternDistributor,
  AnomalyAggregator,
  StrategyConsensus,
  KnowledgeReplicator,
  FederatedKnowledgeExchangeEngine
} from './medical/intelligence/federated-knowledge-exchange.js';

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

console.log('=== PHASE 6.1: FEDERATED KNOWLEDGE EXCHANGE ===\n');

// Test 1: Pattern distribution
const distributor = new PatternDistributor({ clusterId: 'cluster-1' });
distributor.registerPattern('pat-1', { type: 'UPTREND', direction: 'UP', strength: 0.85 }, 'LOW');
const distResult = distributor.distributePattern('pat-1', ['cluster-2', 'cluster-3']);
assert(distResult.success && distResult.distributed === 2, 'Pattern distribution: Distribute to clusters');

// Test 2: Pattern receive
const receiver = new PatternDistributor({ clusterId: 'cluster-2' });
receiver.receivePattern('pat-1', { type: 'UPTREND', direction: 'UP', strength: 0.85 }, 'cluster-1');
const received = receiver.getReceivedPatterns('cluster-1');
assert(received.length === 1, 'Pattern distribution: Receive pattern');

// Test 3: Pattern stats
const stats = distributor.getPatternStats();
assert(stats.totalPatterns === 1 && stats.totalShares === 1, 'Pattern distribution: Pattern stats');

// Test 4: Anomaly reporting
const aggregator = new AnomalyAggregator({ clusterId: 'cluster-1' });
aggregator.reportAnomaly('anom-1', { type: 'SPIKE', severity: 'HIGH', affectedNodes: 3 });
aggregator.reportAnomaly('anom-2', { type: 'DRIFT', severity: 'MEDIUM', affectedNodes: 1 });
const localAnomalies = aggregator.localAnomalies.size;
assert(localAnomalies === 2, 'Anomaly aggregation: Report anomalies');

// Test 5: Anomaly aggregation from multiple clusters
const clusterAnomalies = {
  'cluster-1': [
    { anomaly: { type: 'SPIKE' }, severity: 'HIGH', affectedNodes: 2 },
    { anomaly: { type: 'DRIFT' }, severity: 'MEDIUM', affectedNodes: 1 }
  ],
  'cluster-2': [
    { anomaly: { type: 'SPIKE' }, severity: 'CRITICAL', affectedNodes: 5 }
  ]
};
const aggResult = aggregator.aggregateAnomalies(clusterAnomalies);
assert(aggResult.success && Object.keys(aggResult.aggregated).length > 0, 'Anomaly aggregation: Aggregate from clusters');

// Test 6: Anomaly report
const anomReport = aggregator.getAnomalyReport();
assert(anomReport.totalTypes >= 1, 'Anomaly aggregation: Get anomaly report');

// Test 7: Strategy proposal
const consensus = new StrategyConsensus({ clusterId: 'cluster-1', consensusThreshold: 0.67 });
const proposed = consensus.proposeStrategy('strat-1', { action: 'SCALE_UP', threshold: 0.8 }, 'cluster-1');
assert(proposed.success, 'Strategy consensus: Propose strategy');

// Test 8: Strategy voting
consensus.vote('strat-1', 'cluster-1', 'YES', 'Approved');
consensus.vote('strat-1', 'cluster-2', 'YES', 'Approved');
consensus.vote('strat-1', 'cluster-3', 'YES', 'Approved');
const tallyResult = consensus.tallyVotes('strat-1');
assert(tallyResult.status === 'APPROVED', 'Strategy consensus: Tally votes');

// Test 9: Get consensus strategies
const consensusStrats = consensus.getConsensusStrategies();
assert(consensusStrats.length === 1, 'Strategy consensus: Get consensus strategies');

// Test 10: Strategy rejection (low support)
const consensus2 = new StrategyConsensus({ consensusThreshold: 0.67 });
consensus2.proposeStrategy('strat-2', { action: 'SCALE_DOWN' }, 'cluster-1');
consensus2.vote('strat-2', 'cluster-1', 'YES');
consensus2.vote('strat-2', 'cluster-2', 'NO');
consensus2.vote('strat-2', 'cluster-3', 'NO');
const rejectResult = consensus2.tallyVotes('strat-2');
assert(rejectResult.status === 'REJECTED', 'Strategy consensus: Strategy rejection');

// Test 11: Knowledge storage
const replicator = new KnowledgeReplicator({ clusterId: 'cluster-1', replicationFactor: 3 });
const stored = replicator.storeKnowledge('know-1', { insight: 'Critical performance pattern' }, 'CRITICAL');
assert(stored.success, 'Knowledge replication: Store knowledge');

// Test 12: Knowledge replication
const replicated = replicator.replicateKnowledge('know-1', ['cluster-2', 'cluster-3', 'cluster-4']);
assert(replicated.success && replicated.replicatedTo.length <= 3, 'Knowledge replication: Replicate knowledge');

// Test 13: Receive replicated knowledge
replicator.receiveReplicatedKnowledge('know-1', { insight: 'Critical performance pattern' }, 'cluster-2');
const hasRemote = replicator.remoteKnowledge.has('cluster-2');
assert(hasRemote, 'Knowledge replication: Receive replicated knowledge');

// Test 14: Verify knowledge
const verified = replicator.verifyKnowledge('know-1', 'cluster-2');
assert(verified.success, 'Knowledge replication: Verify knowledge');

// Test 15: Replication stats
const repStats = replicator.getReplicationStats();
assert(repStats.totalKnowledge === 1 && repStats.criticalItems === 1, 'Knowledge replication: Replication stats');

// Test 16: Engine pattern exchange
const engine = new FederatedKnowledgeExchangeEngine({ clusterId: 'cluster-1' });
const exchangeResult = engine.exchangePatternKnowledge(
  'pat-exchange',
  { type: 'CYCLIC', period: 24 },
  ['cluster-2', 'cluster-3']
);
assert(exchangeResult.success, 'Knowledge exchange engine: Exchange patterns');

// Test 17: Engine anomaly synthesis
const synthesized = engine.synthesizeAnomalies({
  'cluster-1': [{ anomaly: { type: 'OUTLIER' }, severity: 'MEDIUM', affectedNodes: 1 }],
  'cluster-2': [{ anomaly: { type: 'OUTLIER' }, severity: 'HIGH', affectedNodes: 2 }]
});
assert(synthesized.totalTypes >= 1, 'Knowledge exchange engine: Synthesize anomalies');

// Test 18: Engine propose and consensus
const engineConsensus = engine.proposeAndConsensus(
  'strat-engine',
  { action: 'ADAPTIVE_REBALANCE' },
  'cluster-1',
  ['cluster-1', 'cluster-2', 'cluster-3']
);
assert(engineConsensus.status === 'APPROVED', 'Knowledge exchange engine: Propose and consensus');

// Test 19: Engine critical knowledge replication
const criticaReplica = engine.storeAndReplicateCritical(
  'critical-know',
  { type: 'SYSTEM_THRESHOLD', value: 0.95 },
  ['cluster-2', 'cluster-3', 'cluster-4']
);
assert(criticaReplica.success, 'Knowledge exchange engine: Store and replicate critical');

// Test 20: Exchange status
const status = engine.getExchangeStatus();
assert(status.patterns && status.anomalies && status.knowledge, 'Knowledge exchange engine: Get exchange status');

console.log(`\nTests: ${testsPassed}/${testsPassed + testsFailed} passed`);
process.exit(testsFailed > 0 ? 1 : 0);
