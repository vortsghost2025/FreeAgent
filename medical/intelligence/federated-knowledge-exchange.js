/**
 * Phase 6.1: Federated Knowledge Exchange
 * Distribute insights, patterns, and strategies across federated clusters
 * Privacy-preserving aggregation of intelligence from multiple sources
 */

/**
 * Pattern Distributor - shares detected patterns across clusters
 */
export class PatternDistributor {
  constructor(options = {}) {
    this.clusterId = options.clusterId || 'cluster-' + Date.now();
    this.patterns = new Map();
    this.distributedPatterns = new Map();
    this.shareLog = [];
    this.debug = options.debug || false;
  }

  registerPattern(patternId, pattern, sensitivity = 'LOW') {
    this.patterns.set(patternId, {
      patternId,
      pattern,
      sensitivity,
      confidence: pattern.strength || 0.5,
      source: this.clusterId,
      timestamp: Date.now(),
      shareCount: 0
    });

    return { success: true, patternId };
  }

  distributePattern(patternId, targetClusters = []) {
    const p = this.patterns.get(patternId);
    if (!p) return { success: false, error: 'PATTERN_NOT_FOUND' };

    // Apply privacy filter based on sensitivity
    const sanitized = this._sanitize(p);

    const distribution = {
      patternId,
      pattern: sanitized.pattern,
      confidence: sanitized.confidence,
      source: this.clusterId,
      timestamp: Date.now(),
      targets: targetClusters
    };

    this.shareLog.push(distribution);
    p.shareCount++;

    return { success: true, distributed: targetClusters.length };
  }

  receivePattern(patternId, pattern, sourceCluster) {
    if (!this.distributedPatterns.has(sourceCluster)) {
      this.distributedPatterns.set(sourceCluster, []);
    }

    this.distributedPatterns.get(sourceCluster).push({
      patternId,
      pattern,
      sourceCluster,
      receivedAt: Date.now(),
      integrated: false
    });

    return { success: true, patternId };
  }

  _sanitize(patternData) {
    // Privacy filter: reduce data leakage for sensitive patterns
    if (patternData.sensitivity === 'HIGH') {
      return {
        pattern: { type: patternData.pattern.type, direction: patternData.pattern.direction },
        confidence: Math.round(patternData.confidence * 100) / 100
      };
    }

    return {
      pattern: patternData.pattern,
      confidence: patternData.confidence
    };
  }

  getPatternStats() {
    const patterns = Array.from(this.patterns.values());
    return {
      totalPatterns: patterns.length,
      totalShares: patterns.reduce((sum, p) => sum + p.shareCount, 0),
      highSensitivity: patterns.filter(p => p.sensitivity === 'HIGH').length,
      avgConfidence: (patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length || 0).toFixed(2)
    };
  }

  getReceivedPatterns(sourceCluster) {
    return this.distributedPatterns.get(sourceCluster) || [];
  }
}

/**
 * Anomaly Aggregator - consolidates anomalies detected across clusters
 */
export class AnomalyAggregator {
  constructor(options = {}) {
    this.clusterId = options.clusterId || 'cluster-' + Date.now();
    this.localAnomalies = new Map();
    this.aggregatedAnomalies = new Map();
    this.aggregationLog = [];
    this.maxAnomalies = options.maxAnomalies || 1000;
  }

  reportAnomaly(anomalyId, anomaly) {
    this.localAnomalies.set(anomalyId, {
      anomalyId,
      anomaly,
      source: this.clusterId,
      timestamp: Date.now(),
      severity: anomaly.severity || 'MEDIUM',
      affectedNodes: anomaly.affectedNodes || 1
    });

    return { success: true, anomalyId };
  }

  aggregateAnomalies(clusterAnomalies) {
    // clusterAnomalies: { clusterId: [anomalies] }
    const aggregated = {};
    let totalCount = 0;

    for (const [source, anomalies] of Object.entries(clusterAnomalies || {})) {
      for (const anom of anomalies) {
        const key = anom.anomaly.type;
        if (!aggregated[key]) {
          aggregated[key] = {
            type: key,
            occurrences: 0,
            sources: [],
            severities: [],
            firstSeen: Date.now(),
            lastSeen: Date.now(),
            affectedNodes: 0
          };
        }

        aggregated[key].occurrences++;
        if (!aggregated[key].sources.includes(source)) {
          aggregated[key].sources.push(source);
        }
        aggregated[key].severities.push(anom.severity);
        aggregated[key].affectedNodes += anom.affectedNodes;
        totalCount++;
      }
    }

    // Add local anomalies
    for (const anom of this.localAnomalies.values()) {
      const key = anom.anomaly.type;
      if (!aggregated[key]) {
        aggregated[key] = {
          type: key,
          occurrences: 0,
          sources: [],
          severities: [],
          firstSeen: Date.now(),
          lastSeen: Date.now(),
          affectedNodes: 0
        };
      }
      aggregated[key].occurrences++;
      if (!aggregated[key].sources.includes(this.clusterId)) {
        aggregated[key].sources.push(this.clusterId);
      }
      aggregated[key].severities.push(anom.severity);
      aggregated[key].affectedNodes += anom.affectedNodes;
      totalCount++;
    }

    this.aggregationLog.push({
      timestamp: Date.now(),
      anomalyTypes: Object.keys(aggregated).length,
      totalAnomalies: totalCount
    });

    this.aggregatedAnomalies.clear();
    for (const [key, agg] of Object.entries(aggregated)) {
      this.aggregatedAnomalies.set(key, agg);
    }

    return { success: true, aggregated };
  }

  getAnomalyReport() {
    const anomalies = Array.from(this.aggregatedAnomalies.values());
    const critical = anomalies.filter(a => a.severities.some(s => s === 'CRITICAL')).length;
    const widespread = anomalies.filter(a => a.sources.length > 2).length;

    return {
      totalTypes: anomalies.length,
      criticalCount: critical,
      widespreadCount: widespread,
      avgAffectedNodes: (anomalies.reduce((sum, a) => sum + a.affectedNodes, 0) / (anomalies.length || 1)).toFixed(1),
      anomaliesByType: anomalies.map(a => ({
        type: a.type,
        occurrences: a.occurrences,
        sources: a.sources.length
      }))
    };
  }
}

/**
 * Strategy Consensus Engine - reaches consensus on strategies across clusters
 */
export class StrategyConsensus {
  constructor(options = {}) {
    this.clusterId = options.clusterId || 'cluster-' + Date.now();
    this.proposals = new Map();
    this.votes = new Map();
    this.consensus = new Map();
    this.consensusThreshold = options.consensusThreshold || 0.67;
  }

  proposeStrategy(strategyId, strategy, proposedBy) {
    this.proposals.set(strategyId, {
      strategyId,
      strategy,
      proposedBy,
      timestamp: Date.now(),
      status: 'PENDING',
      votes: new Map()
    });

    this.votes.set(strategyId, new Map());

    return { success: true, strategyId };
  }

  vote(strategyId, clusterId, voteValue, reasoning = '') {
    const proposal = this.proposals.get(strategyId);
    if (!proposal) return { success: false, error: 'STRATEGY_NOT_FOUND' };

    proposal.votes.set(clusterId, { value: voteValue, reasoning, timestamp: Date.now() });

    return { success: true, voteRecorded: true };
  }

  tallyVotes(strategyId) {
    const proposal = this.proposals.get(strategyId);
    if (!proposal) return { success: false, error: 'STRATEGY_NOT_FOUND' };

    const votes = Array.from(proposal.votes.values());
    if (votes.length === 0) {
      return { success: false, error: 'NO_VOTES_CAST' };
    }

    const supportingVotes = votes.filter(v => v.value === 'YES').length;
    const support = supportingVotes / votes.length;

    let consensusStatus = 'REJECTED';
    if (support >= this.consensusThreshold) {
      consensusStatus = 'APPROVED';
      proposal.status = 'APPROVED';
      this.consensus.set(strategyId, proposal.strategy);
    } else {
      proposal.status = 'REJECTED';
    }

    return {
      success: true,
      strategyId,
      support: support.toFixed(2),
      status: consensusStatus,
      votingClusters: votes.length
    };
  }

  getConsensusStrategies() {
    return Array.from(this.consensus.entries()).map(([id, strat]) => ({
      strategyId: id,
      strategy: strat
    }));
  }

  getProposalStatus(strategyId) {
    const proposal = this.proposals.get(strategyId);
    if (!proposal) return null;

    return {
      strategyId,
      status: proposal.status,
      votingClusters: proposal.votes.size,
      proposedBy: proposal.proposedBy
    };
  }
}

/**
 * Knowledge Replicator - ensures critical knowledge is replicated across clusters
 */
export class KnowledgeReplicator {
  constructor(options = {}) {
    this.clusterId = options.clusterId || 'cluster-' + Date.now();
    this.localKnowledge = new Map();
    this.remoteKnowledge = new Map();
    this.replicationLog = [];
    this.replicationFactor = options.replicationFactor || 3;
  }

  storeKnowledge(knowledgeId, knowledge, criticalLevel = 'NORMAL') {
    this.localKnowledge.set(knowledgeId, {
      knowledgeId,
      knowledge,
      criticalLevel,
      source: this.clusterId,
      timestamp: Date.now(),
      replicas: 1, // Local copy
      lastVerified: Date.now()
    });

    return { success: true, knowledgeId };
  }

  replicateKnowledge(knowledgeId, targetClusters) {
    const knowledge = this.localKnowledge.get(knowledgeId);
    if (!knowledge) return { success: false, error: 'KNOWLEDGE_NOT_FOUND' };

    // Determine replication count based on criticality
    const targetReplicas = knowledge.criticalLevel === 'CRITICAL' ?
      Math.min(this.replicationFactor, targetClusters.length) :
      Math.floor(this.replicationFactor / 2);

    const replicas = targetClusters.slice(0, targetReplicas);

    this.replicationLog.push({
      knowledgeId,
      source: this.clusterId,
      replicas,
      timestamp: Date.now(),
      criticalLevel: knowledge.criticalLevel
    });

    knowledge.replicas = replicas.length + 1; // +1 for local

    return { success: true, replicatedTo: replicas };
  }

  receiveReplicatedKnowledge(knowledgeId, knowledge, sourceCluster) {
    if (!this.remoteKnowledge.has(sourceCluster)) {
      this.remoteKnowledge.set(sourceCluster, new Map());
    }

    this.remoteKnowledge.get(sourceCluster).set(knowledgeId, {
      knowledgeId,
      knowledge,
      sourceCluster,
      receivedAt: Date.now(),
      verified: false
    });

    return { success: true, knowledgeId };
  }

  verifyKnowledge(knowledgeId, sourceCluster) {
    const remote = this.remoteKnowledge.get(sourceCluster);
    if (!remote) return { success: false, error: 'SOURCE_NOT_FOUND' };

    const knowledge = remote.get(knowledgeId);
    if (!knowledge) return { success: false, error: 'KNOWLEDGE_NOT_FOUND' };

    knowledge.verified = true;
    knowledge.verifiedAt = Date.now();

    return { success: true, verified: true };
  }

  getReplicationStats() {
    const knowledge = Array.from(this.localKnowledge.values());
    const critical = knowledge.filter(k => k.criticalLevel === 'CRITICAL').length;
    const avgReplicas = knowledge.length > 0 ?
      (knowledge.reduce((sum, k) => sum + k.replicas, 0) / knowledge.length).toFixed(1) : 0;

    return {
      totalKnowledge: knowledge.length,
      criticalItems: critical,
      avgReplicas,
      totalReplications: this.replicationLog.length
    };
  }
}

/**
 * Federated Knowledge Exchange Engine - orchestrates all knowledge sharing
 */
export class FederatedKnowledgeExchangeEngine {
  constructor(options = {}) {
    this.clusterId = options.clusterId || 'cluster-' + Date.now();
    this.distributor = new PatternDistributor(options);
    this.aggregator = new AnomalyAggregator(options);
    this.consensus = new StrategyConsensus(options);
    this.replicator = new KnowledgeReplicator(options);
    this.exchangeLog = [];
    this.debug = options.debug || false;
  }

  exchangePatternKnowledge(patternId, pattern, targetClusters) {
    const registered = this.distributor.registerPattern(patternId, pattern);
    if (!registered.success) return registered;

    const distributed = this.distributor.distributePattern(patternId, targetClusters);

    this.exchangeLog.push({
      type: 'PATTERN_EXCHANGE',
      patternId,
      targets: targetClusters.length,
      timestamp: Date.now()
    });

    return distributed;
  }

  synthesizeAnomalies(clusterAnomalies) {
    const result = this.aggregator.aggregateAnomalies(clusterAnomalies);
    return this.aggregator.getAnomalyReport();
  }

  proposeAndConsensus(strategyId, strategy, proposedBy, targetClusters) {
    const proposed = this.consensus.proposeStrategy(strategyId, strategy, proposedBy);
    if (!proposed.success) return proposed;

    // Simulate gathering votes from target clusters
    for (const cluster of targetClusters) {
      this.consensus.vote(strategyId, cluster, 'YES', 'Approved by ' + cluster);
    }

    return this.consensus.tallyVotes(strategyId);
  }

  storeAndReplicateCritical(knowledgeId, knowledge, targetClusters) {
    const stored = this.replicator.storeKnowledge(knowledgeId, knowledge, 'CRITICAL');
    if (!stored.success) return stored;

    const replicated = this.replicator.replicateKnowledge(knowledgeId, targetClusters);

    this.exchangeLog.push({
      type: 'KNOWLEDGE_REPLICATION',
      knowledgeId,
      replicatedTo: targetClusters.length,
      timestamp: Date.now()
    });

    return replicated;
  }

  getExchangeStatus() {
    return {
      patterns: this.distributor.getPatternStats(),
      anomalies: this.aggregator.getAnomalyReport(),
      consensusStrategies: this.consensus.getConsensusStrategies().length,
      knowledge: this.replicator.getReplicationStats(),
      totalExchanges: this.exchangeLog.length,
      timestamp: Date.now()
    };
  }
}

export default {
  PatternDistributor,
  AnomalyAggregator,
  StrategyConsensus,
  KnowledgeReplicator,
  FederatedKnowledgeExchangeEngine
};
