/**
 * ENSEMBLE DRIFT DETECTOR
 * Self-Healing Autonomous Agent Orchestration Component
 * 
 * Monitors ensemble behavior and detects when agents start diverging
 * or producing degraded output using statistical methods (z-score).
 * 
 * Features:
 * - Sliding window of last 50 responses per agent
 * - Z-score based outlier detection
 * - Drift threshold: 0.7 (configurable)
 * - Consensus validation for multi-agent tasks
 * - Integration with ProviderScoreTracker and AgentWarmupController
 */

const MAX_RESPONSES = 50;
const DEFAULT_DRIFT_THRESHOLD = 0.7;
const Z_SCORE_THRESHOLD = 2.0;
const RECOVERY_THRESHOLD = 0.3;

class EnsembleDriftDetector {
  constructor(options = {}) {
    this.driftThreshold = options.driftThreshold || DEFAULT_DRIFT_THRESHOLD;
    this.maxResponses = options.maxResponses || MAX_RESPONSES;
    this.zScoreThreshold = options.zScoreThreshold || Z_SCORE_THRESHOLD;
    
    this.agentResponses = new Map();
    this.taskOutputs = new Map();
    this.driftScores = new Map();
    this.demotedAgents = new Set();
    this.providerScorer = null;
    this.warmupController = null;
    this.diagnosticsEngine = null;
    this.driftHistory = [];
    this.onDriftDetected = options.onDriftDetected || null;
    this.onRebalanceNeeded = options.onRebalanceNeeded || null;
    this.onAgentRecovered = options.onAgentRecovered || null;
  }

  setProviderScorer(providerScorer) {
    this.providerScorer = providerScorer;
  }

  setWarmupController(warmupController) {
    this.warmupController = warmupController;
  }

  setDiagnosticsEngine(diagnosticsEngine) {
    this.diagnosticsEngine = diagnosticsEngine;
  }

  recordAgentResponse(agentId, taskType, output, latency) {
    const record = {
      agentId,
      taskType,
      output,
      latency,
      timestamp: Date.now(),
      outputHash: this._hashOutput(output)
    };
    
    if (!this.agentResponses.has(agentId)) {
      this.agentResponses.set(agentId, []);
    }
    
    const responses = this.agentResponses.get(agentId);
    responses.push(record);
    
    if (responses.length > this.maxResponses) {
      responses.shift();
    }
    
    if (taskType) {
      this._updateTaskOutput(agentId, taskType, output);
    }
    
    const driftScore = this.detectDrift(agentId);
    
    if (driftScore >= this.driftThreshold && !this.demotedAgents.has(agentId)) {
      this._handleDriftDetected(agentId, driftScore);
    } else if (driftScore < RECOVERY_THRESHOLD && this.demotedAgents.has(agentId)) {
      this._handleAgentRecovery(agentId, driftScore);
    }
    
    if (this.diagnosticsEngine && this.diagnosticsEngine.recordAgentMetrics) {
      this.diagnosticsEngine.recordAgentMetrics(agentId, {
        latency,
        driftScore,
        responseCount: responses.length
      });
    }
    
    return {
      success: true,
      driftScore,
      responseCount: responses.length
    };
  }

  detectDrift(agentId) {
    const responses = this.agentResponses.get(agentId);
    if (!responses || responses.length < 3) {
      return 0;
    }
    
    const latencyDrift = this._calculateLatencyDrift(responses);
    const outputDrift = this._calculateOutputDrift(responses);
    const temporalDrift = this._calculateTemporalDrift(responses);
    
    const combinedDrift = (
      latencyDrift * 0.3 +
      outputDrift * 0.4 +
      temporalDrift * 0.3
    );
    
    const normalizedDrift = Math.min(1, Math.max(0, combinedDrift));
    
    this.driftScores.set(agentId, normalizedDrift);
    
    return normalizedDrift;
  }

  _calculateLatencyDrift(responses) {
    const latencies = responses.map(r => r.latency);
    const mean = this._mean(latencies);
    const std = this._std(latencies, mean);
    
    if (std === 0) return 0;
    
    const recent = responses.slice(-10);
    const recentLatencies = recent.map(r => r.latency);
    const recentMean = this._mean(recentLatencies);
    
    const zScore = Math.abs((recentMean - mean) / std);
    
    return Math.min(1, zScore / this.zScoreThreshold);
  }

  _calculateOutputDrift(responses) {
    if (responses.length < 2) return 0;
    
    const recentOutputs = responses.slice(-10).map(r => r.outputHash);
    const uniqueOutputs = new Set(recentOutputs);
    const diversity = uniqueOutputs.size / recentOutputs.length;
    
    const allOutputs = responses.map(r => r.outputHash);
    const allUnique = new Set(allOutputs).size / allOutputs.length;
    
    const drift = Math.max(0, diversity - allUnique) * 2;
    return Math.min(1, drift);
  }

  _calculateTemporalDrift(responses) {
    if (responses.length < 10) return 0;
    
    const halfIndex = Math.floor(responses.length / 2);
    const recentHalf = responses.slice(halfIndex);
    const olderHalf = responses.slice(0, halfIndex);
    
    const recentMean = this._mean(recentHalf.map(r => r.latency));
    const olderMean = this._mean(olderHalf.map(r => r.latency));
    
    if (olderMean === 0) return 0;
    
    const increase = (recentMean - olderMean) / olderMean;
    
    return Math.max(0, Math.min(1, (increase - 0.2) * 2.5));
  }

  getConsensusScore(taskId, outputs) {
    if (!outputs || outputs.size < 2) {
      return {
        score: 1,
        agreement: true,
        agents: Array.from(outputs.keys()),
        details: 'Insufficient agents for consensus'
      };
    }
    
    const agentOutputs = Array.from(outputs.values());
    
    const similarities = [];
    for (let i = 0; i < agentOutputs.length; i++) {
      for (let j = i + 1; j < agentOutputs.length; j++) {
        similarities.push(this._calculateSimilarity(agentOutputs[i], agentOutputs[j]));
      }
    }
    
    const avgSimilarity = this._mean(similarities);
    const agreement = avgSimilarity >= 0.7;
    
    const outlierAgents = [];
    if (!agreement) {
      const agentIds = Array.from(outputs.keys());
      for (let i = 0; i < agentIds.length; i++) {
        const otherOutputs = agentOutputs.filter((_, idx) => idx !== i);
        const similarityToOthers = otherOutputs.map(o => 
          this._calculateSimilarity(agentOutputs[i], o)
        );
        const avgSimilarityToOthers = this._mean(similarityToOthers);
        
        if (avgSimilarityToOthers < 0.5) {
          outlierAgents.push(agentIds[i]);
        }
      }
    }
    
    return {
      score: avgSimilarity,
      agreement,
      agents: Array.from(outputs.keys()),
      outlierAgents,
      needsReview: !agreement && outlierAgents.length > 0,
      details: agreement ? 
        'Agents consensus reached' : 
        `Disagreement detected: ${outlierAgents.length} outlier(s)`
    };
  }

  getDriftingAgents() {
    const drifting = [];
    
    for (const [agentId, score] of this.driftScores) {
      if (score >= this.driftThreshold) {
        const responses = this.agentResponses.get(agentId) || [];
        const recentLatency = responses.slice(-5).reduce((sum, r) => sum + r.latency, 0) / Math.min(5, responses.length);
        
        drifting.push({
          agentId,
          driftScore: score,
          responseCount: responses.length,
          recentLatency: recentLatency || 0,
          isDemoted: this.demotedAgents.has(agentId)
        });
      }
    }
    
    return drifting.sort((a, b) => b.driftScore - a.driftScore);
  }

  requestRebalance(agentId) {
    const currentScore = this.driftScores.get(agentId) || 0;
    
    this.demotedAgents.add(agentId);
    
    if (this.providerScorer && this.providerScorer.demoteProvider) {
      this.providerScorer.demoteProvider(agentId, 0.5);
    }
    
    if (this.warmupController && this.warmupController.cooldownAgent) {
      this.warmupController.cooldownAgent(agentId, 60000);
    }
    
    this.driftHistory.push({
      agentId,
      event: 'rebalance',
      driftScore: currentScore,
      timestamp: Date.now()
    });
    
    const result = {
      success: true,
      agentId,
      action: 'demoted',
      driftScore: currentScore,
      message: `Agent ${agentId} has been demoted and tasks redistributed`,
      timestamp: Date.now()
    };
    
    if (this.onRebalanceNeeded) {
      this.onRebalanceNeeded(result);
    }
    
    return result;
  }

  promoteAgent(agentId) {
    this.demotedAgents.delete(agentId);
    
    if (this.providerScorer && this.providerScorer.promoteProvider) {
      this.providerScorer.promoteProvider(agentId);
    }
    
    if (this.warmupController && this.warmupController.warmUpAgent) {
      this.warmupController.warmUpAgent(agentId);
    }
    
    this.driftHistory.push({
      agentId,
      event: 'recovery',
      driftScore: this.driftScores.get(agentId) || 0,
      timestamp: Date.now()
    });
    
    const result = {
      success: true,
      agentId,
      action: 'promoted',
      message: `Agent ${agentId} has recovered and restored to active duty`,
      timestamp: Date.now()
    };
    
    if (this.onAgentRecovered) {
      this.onAgentRecovered(result);
    }
    
    return result;
  }

  getStatus() {
    const totalAgents = this.agentResponses.size;
    const driftingAgents = this.getDriftingAgents();
    const demotedCount = this.demotedAgents.size;
    
    return {
      totalAgents,
      driftingCount: driftingAgents.length,
      demotedCount,
      healthyCount: totalAgents - demotedCount,
      threshold: this.driftThreshold,
      recentHistory: this.driftHistory.slice(-10)
    };
  }

  getAgentStats(agentId) {
    const responses = this.agentResponses.get(agentId) || [];
    if (responses.length === 0) {
      return { agentId, available: false };
    }
    
    const latencies = responses.map(r => r.latency);
    
    return {
      agentId,
      available: true,
      responseCount: responses.length,
      driftScore: this.driftScores.get(agentId) || 0,
      isDemoted: this.demotedAgents.has(agentId),
      latency: {
        mean: this._mean(latencies),
        min: Math.min(...latencies),
        max: Math.max(...latencies),
        std: this._std(latencies, this._mean(latencies))
      },
      recentTasks: responses.slice(-5).map(r => ({
        taskType: r.taskType,
        latency: r.latency,
        timestamp: r.timestamp
      }))
    };
  }

  resetAgent(agentId) {
    this.agentResponses.delete(agentId);
    this.driftScores.delete(agentId);
    this.demotedAgents.delete(agentId);
  }

  _hashOutput(output) {
    if (output === null || output === undefined) return 'null';
    if (typeof output === 'object') {
      try {
        return JSON.stringify(output).slice(0, 100);
      } catch {
        return String(output).slice(0, 100);
      }
    }
    return String(output).slice(0, 100);
  }

  _mean(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  _std(arr, mean) {
    if (!arr || arr.length < 2) return 0;
    const squaredDiffs = arr.map(val => Math.pow(val - mean, 2));
    return Math.sqrt(this._mean(squaredDiffs));
  }

  _calculateSimilarity(a, b) {
    if (a === b) return 1;
    if (typeof a !== typeof b) return 0;
    if (typeof a !== 'string' && typeof a !== 'object') return 0;
    
    const hashA = this._hashOutput(a);
    const hashB = this._hashOutput(b);
    
    if (hashA === hashB) return 1;
    if (hashA.length === 0 || hashB.length === 0) return 0;
    
    let matches = 0;
    const minLen = Math.min(hashA.length, hashB.length);
    for (let i = 0; i < minLen; i++) {
      if (hashA[i] === hashB[i]) matches++;
    }
    return matches / Math.max(hashA.length, hashB.length);
  }

  _updateTaskOutput(agentId, taskType, output) {
    if (!this.taskOutputs.has(taskType)) {
      this.taskOutputs.set(taskType, new Map());
    }
    this.taskOutputs.get(taskType).set(agentId, output);
  }

  _handleDriftDetected(agentId, driftScore) {
    const event = {
      agentId,
      driftScore,
      timestamp: Date.now(),
      type: 'drift_detected'
    };
    
    this.driftHistory.push(event);
    
    if (this.onDriftDetected) {
      this.onDriftDetected(event);
    }
    
    this.requestRebalance(agentId);
  }

  _handleAgentRecovery(agentId, driftScore) {
    const event = {
      agentId,
      driftScore,
      timestamp: Date.now(),
      type: 'agent_recovered'
    };
    
    this.driftHistory.push(event);
    
    this.promoteAgent(agentId);
  }
}

export { EnsembleDriftDetector };