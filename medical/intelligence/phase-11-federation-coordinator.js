/**
 * Phase 11: Federation Coordinator for Heterogeneous Agents
 * Extends Phase 10 to support multiple agent types with pattern learning
 */

import { Phase10FederationCoordinator } from './phase-10-federation-coordinator.js';
import { AGENT_TYPE, Phase9AgentAdapter } from './universal-agent-interface.js';
import {
  Phase9PatternTranslator,
  ServicePatternTranslator,
  MLTrainerPatternTranslator,
  DataPipelinePatternTranslator
} from './pattern-abstraction-layer.js';
import { CrossDomainPatternLearner } from './cross-domain-pattern-learner.js';

/**
 * PHASE11 FEDERATION COORDINATOR
 * Extends Phase 10 to support heterogeneous agent types with cross-domain pattern learning
 */
export class Phase11FederationCoordinator extends Phase10FederationCoordinator {
  constructor(options = {}) {
    super(options);

    // NEW: Agent type management
    this.agentTypeRegistry = new Map();      // subsystemId → agentType
    this.patternTranslators = new Map();     // agentType → PatternTranslator instance
    this.patternLearner = new CrossDomainPatternLearner(options);

    // Initialize agent types and translators
    this.initializeAgentTypes();
  }

  /**
   * Initialize all supported agent types and their translators
   */
  initializeAgentTypes() {
    this.registerAgentType(AGENT_TYPE.PHASE9, Phase9PatternTranslator);
    this.registerAgentType(AGENT_TYPE.SERVICE, ServicePatternTranslator);
    this.registerAgentType(AGENT_TYPE.ML_TRAINER, MLTrainerPatternTranslator);
    this.registerAgentType(AGENT_TYPE.DATA_PIPELINE, DataPipelinePatternTranslator);
  }

  /**
   * Register a new agent type and its translator
   */
  registerAgentType(agentType, translatorClass) {
    if (!Object.values(AGENT_TYPE).includes(agentType)) {
      throw new Error(`Invalid agent type: ${agentType}`);
    }

    const translator = new translatorClass();
    this.patternTranslators.set(agentType, translator);
  }

  /**
   * Register a subsystem with explicit agent type
   * Overrides parent to add type tracking (doesn't call parent validation)
   */
  registerSubsystem(subsystemId, agentInstance, agentType = AGENT_TYPE.PHASE9) {
    // Validate agent type is registered
    if (!this.patternTranslators.has(agentType)) {
      throw new Error(`Unknown agent type: ${agentType}. Register type first with registerAgentType()`);
    }

    // For Phase9 instances, wrap in adapter if needed
    let adaptedInstance = agentInstance;
    if (agentType === AGENT_TYPE.PHASE9 && !agentInstance.runCycle) {
      // Wrap Phase9IntegratedOrchestrator in adapter
      adaptedInstance = new Phase9AgentAdapter(agentInstance);
      adaptedInstance.agentId = subsystemId;
    }

    // Validate universal interface instead of Phase 9 interface
    if (!adaptedInstance.runCycle && !adaptedInstance.runPhase9Cycle) {
      throw new Error(`Subsystem ${subsystemId} must implement runCycle() or runPhase9Cycle()`);
    }

    // Track agent type
    this.agentTypeRegistry.set(subsystemId, agentType);

    // Register directly (skip parent which validates for Phase 9 only)
    this.subsystemRegistry.set(subsystemId, adaptedInstance);
    this.cycleRegistry = new Map();  // Reset cycle registry
  }

  /**
   * Coordinate federation round with heterogeneous agents
   * Extends Phase 10 to translate metrics and learn patterns
   */
  coordinateRound(roundNumber) {
    const roundResult = {
      roundNumber,
      cycleResults: [],
      watchdogAggregation: null,
      cascadeAnalysis: { cascades: [], dependencyGraph: [] },  // Initialize
      discoveredPatterns: [],
      patternsLearned: 0,
      shouldPauseFederation: false,
      anyInstanceAborted: false,
      timestamp: Date.now()
    };

    // STAGE 1: Health check (heterogeneous)
    const healthStatus = this.checkHeterogeneousHealth();
    if (healthStatus.anyInCritical) {
      roundResult.shouldPauseFederation = true;
      return roundResult;
    }

    // STAGE 2: Execute all subsystems with translation
    const nativeResults = [];
    for (const [subsystemId, orchestrator] of this.subsystemRegistry) {
      const agentType = this.agentTypeRegistry.get(subsystemId);
      const translator = this.patternTranslators.get(agentType);

      // Run agent's cycle method (polymorphic)
      const nativeResult = this.executeCycleForAgent(orchestrator, agentType, subsystemId, roundNumber);

      // TRANSLATE to universal metrics
      const normalizedResult = translator.translateCycleResult(nativeResult);

      // DETECT patterns from native result (agent-type specific)
      const patterns = translator.detectPatterns(nativeResult);

      // Record cycle result with translation
      roundResult.cycleResults.push({
        subsystemId,
        agentType,
        cycleId: `${subsystemId}:${roundNumber}`,
        nativeResult,
        normalizedResult,
        detectedPatterns: patterns
      });

      nativeResults.push({ subsystemId, agentType, nativeResult, normalizedResult });

      // Check for abort
      if (normalizedResult.next_action === 'ABORT') {
        roundResult.anyInstanceAborted = true;
      }
    }

    // STAGE 3: Aggregate universal metrics (cross-domain)
    roundResult.watchdogAggregation = this.aggregateUniversalMetrics(
      roundResult.cycleResults
    );

    // STAGE 4: Detect cascades (using immutable snapshots)
    // Adapt cycleResults to format Phase 10 expects
    const adaptedResults = roundResult.cycleResults.map(r => ({
      subsystemId: r.subsystemId,
      result: {
        phase_9: { next_action: r.normalizedResult.next_action }
      }
    }));

    roundResult.cascadeAnalysis = this.cascadeDetector.detectCascades(
      adaptedResults,
      this.subsystemRegistry
    );

    // STAGE 5: Learn cross-domain patterns
    for (const result of roundResult.cycleResults) {
      this.patternLearner.recordObservation(
        result.agentType,
        result.normalizedResult,
        result.detectedPatterns
      );
    }

    // Get high-confidence patterns discovered this round
    const highConfidencePatterns = this.patternLearner.getHighConfidencePatterns();
    roundResult.discoveredPatterns = highConfidencePatterns;
    roundResult.patternsLearned = highConfidencePatterns.length;

    // STAGE 6: (Optional) Broadcast patterns to agents
    const broadcasts = this.patternLearner.broadcastPatternRecommendations(this);
    roundResult.patternBroadcasts = broadcasts.broadcastCount;

    // Record federation action
    this.federationLog.push({
      timestamp: Date.now(),
      roundNumber,
      cycleCount: roundResult.cycleResults.length,
      agentTypeDistribution: this.getAgentTypeDistribution(),
      patternsDiscovered: roundResult.patternsLearned,
      watchdogAggregation: roundResult.watchdogAggregation,
      cascadeCount: roundResult.cascadeAnalysis.cascades.length
    });

    if (this.federationLog.length > this.maxLogSize) {
      this.federationLog.shift();
    }

    return roundResult;
  }

  /**
   * Execute cycle for specific agent type
   * Polymorphic based on agent interface
   */
  executeCycleForAgent(agent, agentType, subsystemId, roundNumber) {
    const cycleId = `${subsystemId}:${roundNumber}`;
    const input =  {
      architectureSnapshot: null,
      architectureComplexity: 100,
      rollbackRate: 0.2,
      architectureConsistency: 0.95,
      learningMetrics: { learningEfficiency: 0.75 }
    };

    // Call appropriate cycle method
    if (typeof agent.runCycle === 'function') {
      // Universal interface
      return agent.runCycle(cycleId, input);
    } else if (typeof agent.runPhase9Cycle === 'function') {
      // Phase 9 direct
      return agent.runPhase9Cycle(cycleId, input);
    } else {
      throw new Error(`Agent ${subsystemId} has no runCycle or runPhase9Cycle method`);
    }
  }

  /**
   * Check health of heterogeneous agents
   */
  checkHeterogeneousHealth() {
    const health = { anyInCritical: false, statusPerType: {}, statusPerAgent: {} };

    for (const [subsystemId, agent] of this.subsystemRegistry) {
      const agentType = this.agentTypeRegistry.get(subsystemId);

      // Try universal getHealthStatus first
      let healthStatus = null;
      if (typeof agent.getHealthStatus === 'function') {
        healthStatus = agent.getHealthStatus();
      } else if (typeof agent.getFullSystemStatus === 'function') {
        // Fallback for Phase 9 (non-adapted)
        const status = agent.getFullSystemStatus();
        const isCritical = status.phase_9?.watchdog_status?.active_alerts > 2;
        healthStatus = {
          agentId: subsystemId,
          isHealthy: !isCritical,
          criticalAlerts: status.phase_9?.watchdog_status?.active_alerts || 0
        };
      }

      if (healthStatus) {
        health.statusPerAgent[subsystemId] = healthStatus;

        if (!health.statusPerType[agentType]) {
          health.statusPerType[agentType] = { healthy: 0, critical: 0 };
        }

        if (healthStatus.isHealthy === false) {
          health.anyInCritical = true;
          health.statusPerType[agentType].critical++;
        } else {
          health.statusPerType[agentType].healthy++;
        }
      }
    }

    return health;
  }

  /**
   * Aggregate universal metrics across all agent types
   */
  aggregateUniversalMetrics(cycleResults) {
    const aggregation = {
      avg_objective_delta: 0,
      min_stability: 1,
      max_violations: 0,
      constraint_violations_total: 0,
      by_agent_type: {},
      agent_count: cycleResults.length,
      timestamp: Date.now()
    };

    for (const result of cycleResults) {
      const norm = result.normalizedResult;

      // Aggregate universal metrics
      aggregation.avg_objective_delta += norm.primary_objective_delta || 0;
      aggregation.min_stability = Math.min(
        aggregation.min_stability,
        norm.stability_score || 1
      );
      aggregation.constraint_violations_total += norm.constraint_violations_count || 0;

      // Per-type aggregation
      const typeKey = result.agentType;
      if (!aggregation.by_agent_type[typeKey]) {
        aggregation.by_agent_type[typeKey] = {
          count: 0,
          avg_objective: 0,
          avg_stability: 0,
          total_violations: 0
        };
      }

      const typeAgg = aggregation.by_agent_type[typeKey];
      typeAgg.count++;
      typeAgg.avg_objective += norm.primary_objective_delta || 0;
      typeAgg.avg_stability += norm.stability_score || 0;
      typeAgg.total_violations += norm.constraint_violations_count || 0;
    }

    // Compute averages
    const count = cycleResults.length;
    if (count > 0) {
      aggregation.avg_objective_delta = parseFloat(
        (aggregation.avg_objective_delta / count).toFixed(2)
      );

      for (const typeAgg of Object.values(aggregation.by_agent_type)) {
        typeAgg.avg_objective = parseFloat((typeAgg.avg_objective / typeAgg.count).toFixed(2));
        typeAgg.avg_stability = parseFloat((typeAgg.avg_stability / typeAgg.count).toFixed(3));
      }
    }

    return aggregation;
  }

  /**
   * Get agent type distribution in federation
   */
  getAgentTypeDistribution() {
    const distribution = {};

    for (const agentType of this.agentTypeRegistry.values()) {
      distribution[agentType] = (distribution[agentType] || 0) + 1;
    }

    return distribution;
  }

  /**
   * Get federation status including heterogeneous insights
   */
  getFederationStatus() {
    // Build status manually since parent expects Phase 9 interface
    const status = {
      timestamp: Date.now(),
      subsystemCount: this.subsystemRegistry.size,
      subsystems: [],
      federatedMetrics: this.metricsCompiler.getMetrics(),
      watchdogStatus: this.watchdogAggregator.getAggregatedStatus(),
      cascadeHistory: this.cascadeDetector.getHistory(),
      federationLog: this.federationLog.slice(-5)
    };

    // Get status from all agents (heterogeneous)
    for (const [subsystemId, agent] of this.subsystemRegistry) {
      let agentStatus = null;

      // Try to get full system status (Phase 9)
      if (typeof agent.getFullSystemStatus === 'function') {
        agentStatus = agent.getFullSystemStatus();
      } else if (typeof agent.getAgentStatus === 'function') {
        agentStatus = agent.getAgentStatus();
      }

      status.subsystems.push({
        subsystemId,
        agentType: this.agentTypeRegistry.get(subsystemId),
        systemStatus: agentStatus
      });
    }

    // ADD heterogeneous insights
    status.agentTypes = this.getAgentTypeDistribution();
    status.patternsLearned = this.patternLearner.patternRegistry.length;
    status.highConfidencePatterns = this.patternLearner.getHighConfidencePatterns();
    status.learningInsights = this.patternLearner.getLearningInsights();

    return status;
  }

  /**
   * Export learning state for analysis
   */
  exportLearningState() {
    return {
      timestamp: Date.now(),
      federationStatus: this.getFederationStatus(),
      patternLearningState: this.patternLearner.exportState(),
      cycleHistory: this.federationLog.slice(-20)
    };
  }
}

export default {
  Phase11FederationCoordinator
};
