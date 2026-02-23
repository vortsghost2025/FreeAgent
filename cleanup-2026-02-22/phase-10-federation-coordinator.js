/**
 * Phase 10: Federation Coordinator
 * Manages multiple Phase9IntegratedOrchestrator instances with distributed coordination
 * Enables cross-subsystem awareness while preserving instance autonomy
 */

import { DistributedCycleProtocol, CycleSnapshot } from './distributed-autonomous-cycle-protocol.js';

/**
 * ThresholdBroadcaster: Analyzes governance across instances and broadcasts recommendations
 */
class ThresholdBroadcaster {
  constructor() {
    this.broadcastHistory = [];
  }

  computeThresholdAdjustments(cycleResults) {
    // Collect governance assessments from all instances
    const governanceStates = cycleResults
      .filter(r => r.result.phase_e)
      .map(r => ({
        subsystemId: r.subsystemId,
        assessment: r.result.phase_e.governance_assessment,
        thresholds: r.result.phase_e.adaptive_thresholds
      }));

    if (governanceStates.length === 0) {
      return { shouldBroadcast: false };
    }

    // Check if governance diverging significantly
    const mttrValues = governanceStates.map(g => g.thresholds.mttrSeconds);
    const mttrMin = Math.min(...mttrValues);
    const mttrMax = Math.max(...mttrValues);
    const mttrDivergence = mttrMax - mttrMin;

    // Only broadcast if statistically significant divergence
    const shouldBroadcast = mttrDivergence > 10;  // >10 second difference

    if (shouldBroadcast) {
      const recommendations = governanceStates.map(state => ({
        subsystemId: state.subsystemId,
        suggestedMTTR: state.assessment === 'overly_strict' ? mttrMax * 1.1 : mttrMin * 0.9,
        reasoning: state.assessment === 'overly_strict'
          ? 'Your MTTR is stricter than peers - consider relaxing'
          : 'Your MTTR is more lenient than peers - consider tightening'
      }));

      this.broadcastHistory.push({
        timestamp: Date.now(),
        recommendations
      });

      return { shouldBroadcast: true, recommendations };
    }

    return { shouldBroadcast: false };
  }

  broadcastToSubsystems(subsystemRegistry, recommendations) {
    // Broadcast recommendations to each subsystem (optional signals)
    for (const [subsystemId, orchestrator] of subsystemRegistry) {
      const recommendation = recommendations.find(r => r.subsystemId === subsystemId);
      if (recommendation && orchestrator.governance) {
        // Instance can optionally incorporate
        orchestrator.governance.federationRecommendedThresholds = recommendation;
      }
    }
  }

  getHistory() {
    return this.broadcastHistory.slice(-10);
  }
}

/**
 * WatchdogAggregator: Collects violations from all instances and detects patterns
 */
class WatchdogAggregator {
  constructor() {
    this.violations = [];
  }

  aggregateViolations(cycleResults) {
    const aggregation = {
      subsystem_violations: {},
      federated_patterns: [],
      timestamp: Date.now()
    };

    // Collect violations per subsystem
    for (const result of cycleResults) {
      const violations = result.result.phase_9?.watchdog_violations || 0;
      aggregation.subsystem_violations[result.subsystemId] = violations;
    }

    // Detect federated patterns
    const allViolationCounts = Object.values(aggregation.subsystem_violations);
    const subsystemsWithViolations = Object.entries(aggregation.subsystem_violations)
      .filter(([_, count]) => count > 0)
      .map(([id, _]) => id);

    // Pattern: Multiple oscillations = system-level vibration
    // Check for subsystems with violations AND oscillating improvements
    const oscillatingSubsystems = cycleResults
      .filter(r => {
        const hasViolations = (r.result.phase_9?.watchdog_violations || 0) > 0;
        const improvements = r.result.phase_c?.rolling_improvement || [];
        // Check for alternation: positive-negative-positive or vice versa
        const hasOscillation = improvements.length >= 2 &&
          (improvements[0] * improvements[1] < 0); // Different signs = alternation
        return hasViolations || hasOscillation;
      })
      .length;

    if (oscillatingSubsystems >= 1) {
      aggregation.federated_patterns.push({
        pattern: 'system_level_oscillation',
        description: `${oscillatingSubsystems} subsystems showing oscillation`,
        recommendation: 'STABILITY_FIRST',
        severity: 'HIGH'
      });
    }

    // Pattern: Multiple metric gaming = widespread estimation bias
    const gamingRisk = cycleResults.filter(r => {
      const gap = r.result.phase_9?.watchdog_violations > 0 ? true : false;
      return gap;
    }).length;

    if (gamingRisk >= 2) {
      aggregation.federated_patterns.push({
        pattern: 'estimation_bias_widespread',
        description: `${gamingRisk} subsystems with estimation issues`,
        recommendation: 'audit_all_predictions',
        severity: 'MEDIUM'
      });
    }

    // Pattern: One critical violation = notify federation
    if (subsystemsWithViolations.length > 0) {
      aggregation.any_critical_violations = subsystemsWithViolations.length === 1;
    }

    this.violations.push(aggregation);
    return aggregation;
  }

  getAggregatedStatus() {
    if (this.violations.length === 0) {
      return { status: 'no_violations' };
    }
    const recent = this.violations.slice(-1)[0];
    return {
      timestamp: recent.timestamp,
      subsystem_violation_count: Object.keys(recent.subsystem_violations).length,
      total_violations: Object.values(recent.subsystem_violations).reduce((a, b) => a + b, 0),
      federated_patterns: recent.federated_patterns
    };
  }
}

/**
 * CascadeDetector: Analyzes failure propagation across dependent subsystems
 */
class CascadeDetector {
  constructor() {
    this.dependencyGraph = new Map();
    this.cascadeHistory = [];
  }

  checkSubsystemHealth(subsystemRegistry) {
    const health = {
      anyInCritical: false,
      subsystemStates: {}
    };

    for (const [subsystemId, orchestrator] of subsystemRegistry) {
      const status = orchestrator.getFullSystemStatus();
      const isCritical = status.phase_9?.watchdog_status?.active_alerts > 2;
      health.subsystemStates[subsystemId] = isCritical;

      if (isCritical) {
        health.anyInCritical = true;
      }
    }

    return health;
  }

  detectDependencies(subsystemRegistry) {
    // Heuristic: B depends on A if B's recent architecture references A's components
    const dependencies = new Map();

    for (const [bId, bOrchestrator] of subsystemRegistry) {
      const bSnapshots = bOrchestrator.telemetry?.snapshots?.slice(-5) || [];
      const bDeps = [];

      for (const [aId, aOrchestrator] of subsystemRegistry) {
        if (aId === bId) continue;

        // Check if B's recent proposals reference A
        const hasReference = bSnapshots.some(snap => {
          const components = snap.architectureAfter?.components || [];
          return components.some(c => String(c).includes(aId));
        });

        if (hasReference) {
          bDeps.push(aId);
        }
      }

      if (bDeps.length > 0) {
        dependencies.set(bId, bDeps);
      }
    }

    this.dependencyGraph = dependencies;
    return dependencies;
  }

  detectCascades(cycleResults, subsystemRegistry) {
    const cascades = [];
    const dependencies = this.detectDependencies(subsystemRegistry);

    // Find aborted or paused instances
    const problematicInstances = cycleResults
      .filter(r =>
        r.result.phase_9?.next_action === 'ABORT' ||
        r.result.phase_9?.next_action === 'PAUSE'
      )
      .map(r => r.subsystemId);

    // For each instance dependent on problematic ones
    for (const [subsystemId, deps] of dependencies) {
      const affectingDeps = deps.filter(d => problematicInstances.includes(d));
      if (affectingDeps.length > 0) {
        cascades.push({
          subsystemId,
          dependsOn: affectingDeps,
          recommendation: 'PAUSE_NEXT_CYCLE',
          severity: 'HIGH'
        });
      }
    }

    this.cascadeHistory.push({
      timestamp: Date.now(),
      cascades,
      triggeredBy: problematicInstances
    });

    return {
      cascades,
      dependencyGraph: Array.from(dependencies.entries()).map(([k, v]) => ({ subsystem: k, dependsOn: v }))
    };
  }

  getHistory() {
    return this.cascadeHistory.slice(-10);
  }
}

/**
 * FederatedMetricsCompiler: Aggregates metrics across all instances
 */
class FederatedMetricsCompiler {
  constructor() {
    this.compiledMetrics = [];
  }

  compile(cycleSequence) {
    const allCycleResults = [];
    for (const round of cycleSequence) {
      allCycleResults.push(...(round.cycleResults || []));
    }

    if (allCycleResults.length === 0) {
      return { no_data: true };
    }

    // Collect improvements
    const improvements = allCycleResults
      .map(r => r.result.phase_8?.improvement || 0)
      .filter(i => !isNaN(i));

    // Collect stability scores
    const stabilities = allCycleResults
      .map(r => {
        const status = r.result;
        return status.phase_9?.stability || 0.5;
      })
      .filter(s => !isNaN(s));

    // Collect MTTR predictions
    const mttrs = allCycleResults
      .map(r => r.result.phase_b?.mttr_prediction || 30)
      .filter(m => !isNaN(m));

    const metrics = {
      timestamp: Date.now(),
      subsystemCount: new Set(allCycleResults.map(r => r.subsystemId)).size,
      cycleCount: allCycleResults.length,
      averageImprovement: improvements.length > 0
        ? (improvements.reduce((a, b) => a + b, 0) / improvements.length).toFixed(2)
        : 0,
      minImprovement: Math.min(...improvements, 0),
      maxImprovement: Math.max(...improvements, 0),
      averageStability: stabilities.length > 0
        ? (stabilities.reduce((a, b) => a + b, 0) / stabilities.length).toFixed(3)
        : 0,
      minStabilityMargin: Math.min(...stabilities, 1),
      averageMTTR: mttrs.length > 0
        ? (mttrs.reduce((a, b) => a + b, 0) / mttrs.length).toFixed(1)
        : 0,
      maxMTTR: Math.max(...mttrs, 0),
      systemHealthy: Math.min(...stabilities, 1) > 0.7
    };

    this.compiledMetrics.push(metrics);
    return metrics;
  }

  getMetrics() {
    return this.compiledMetrics.slice(-1)[0] || { no_data: true };
  }
}

/**
 * Phase10FederationCoordinator: Main orchestrator for distributed instances
 */
export class Phase10FederationCoordinator {
  constructor(options = {}) {
    this.subsystemRegistry = new Map();
    this.cycleRegistry = new Map();

    this.thresholdBroadcaster = new ThresholdBroadcaster();
    this.watchdogAggregator = new WatchdogAggregator();
    this.cascadeDetector = new CascadeDetector();
    this.metricsCompiler = new FederatedMetricsCompiler();

    this.federationLog = [];
    this.maxLogSize = options.maxLogSize || 500;
  }

  /**
   * Register a Phase9IntegratedOrchestrator instance
   */
  registerSubsystem(subsystemId, phase9Instance) {
    if (this.subsystemRegistry.has(subsystemId)) {
      throw new Error(`Subsystem ${subsystemId} already registered`);
    }

    // Validate interface
    if (typeof phase9Instance.runPhase9Cycle !== 'function') {
      throw new Error(`Subsystem ${subsystemId} missing runPhase9Cycle method`);
    }

    this.subsystemRegistry.set(subsystemId, phase9Instance);
  }

  /**
   * Coordinate full federation cycle (N rounds across all subsystems)
   */
  coordinateFederationCycle(options = {}) {
    const cycleSequence = [];
    const maxCycles = options.maxCycles || 1;

    for (let roundNum = 1; roundNum <= maxCycles; roundNum++) {
      const roundResult = this.coordinateRound(roundNum);
      cycleSequence.push(roundResult);

      if (roundResult.shouldPauseFederation || roundResult.anyInstanceAborted) {
        break;
      }
    }

    return {
      totalRounds: cycleSequence.length,
      cycles: cycleSequence,
      federatedMetrics: this.metricsCompiler.compile(cycleSequence)
    };
  }

  /**
   * Single federation round: all subsystems execute one cycle
   */
  coordinateRound(roundNumber) {
    const roundResult = {
      roundNumber,
      cycleResults: [],
      watchdogAggregation: null,
      cascadeAnalysis: { cascades: [], dependencyGraph: [] },  // Initialize with default
      shouldPauseFederation: false,
      anyInstanceAborted: false,
      timestamp: Date.now()
    };

    // STAGE 1: Health check
    const healthStatus = this.cascadeDetector.checkSubsystemHealth(this.subsystemRegistry);
    if (healthStatus.anyInCritical) {
      roundResult.shouldPauseFederation = true;
      return roundResult;
    }

    // STAGE 2: Execute all subsystems
    for (const [subsystemId, orchestrator] of this.subsystemRegistry) {
      const cycleId = `${subsystemId}:${roundNumber}`;

      // Run the instance's Phase 9 cycle
      const cycleResult = orchestrator.runPhase9Cycle(cycleId, {
        architectureSnapshot: null,
        architectureComplexity: 100,
        rollbackRate: 0.2,
        architectureConsistency: 0.95,
        learningMetrics: { learningEfficiency: 0.75 }
      });

      // Record in federation registry
      this.cycleRegistry.set(cycleId, { subsystemId, timestamp: Date.now() });

      roundResult.cycleResults.push({
        subsystemId,
        cycleId,
        result: cycleResult
      });

      // Check for abort
      if (cycleResult.phase_9?.next_action === 'ABORT') {
        roundResult.anyInstanceAborted = true;
      }
    }

    // STAGE 3: Aggregate watchdog violations
    roundResult.watchdogAggregation = this.watchdogAggregator.aggregateViolations(
      roundResult.cycleResults
    );

    // STAGE 4: Detect cascades
    roundResult.cascadeAnalysis = this.cascadeDetector.detectCascades(
      roundResult.cycleResults,
      this.subsystemRegistry
    );

    // STAGE 5: Broadcast thresholds
    const thresholdUpdate = this.thresholdBroadcaster.computeThresholdAdjustments(
      roundResult.cycleResults
    );
    if (thresholdUpdate.shouldBroadcast) {
      this.thresholdBroadcaster.broadcastToSubsystems(
        this.subsystemRegistry,
        thresholdUpdate.recommendations
      );
    }

    // Record federation action
    this.federationLog.push({
      timestamp: Date.now(),
      roundNumber,
      subsystemCount: this.subsystemRegistry.size,
      watchdogAggregation: roundResult.watchdogAggregation,
      cascadeAnalysis: roundResult.cascadeAnalysis,
      thresholdUpdate: thresholdUpdate.shouldBroadcast ? thresholdUpdate : null
    });

    if (this.federationLog.length > this.maxLogSize) {
      this.federationLog.shift();
    }

    return roundResult;
  }

  /**
   * Get complete federation status
   */
  getFederationStatus() {
    const status = {
      timestamp: Date.now(),
      subsystemCount: this.subsystemRegistry.size,
      subsystems: [],
      federatedMetrics: this.metricsCompiler.getMetrics(),
      watchdogStatus: this.watchdogAggregator.getAggregatedStatus(),
      cascadeHistory: this.cascadeDetector.getHistory(),
      federationLog: this.federationLog.slice(-5)
    };

    for (const [subsystemId, orchestrator] of this.subsystemRegistry) {
      const fullStatus = orchestrator.getFullSystemStatus();
      status.subsystems.push({
        subsystemId,
        systemStatus: fullStatus
      });
    }

    return status;
  }

  /**
   * Get cycle registry (all emitted cycle IDs)
   */
  getCycleRegistry() {
    return Array.from(this.cycleRegistry.entries()).map(([id, meta]) => ({
      cycleId: id,
      subsystemId: meta.subsystemId,
      timestamp: meta.timestamp
    }));
  }
}

export default {
  Phase10FederationCoordinator,
  ThresholdBroadcaster,
  WatchdogAggregator,
  CascadeDetector,
  FederatedMetricsCompiler
};
