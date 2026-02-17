// Phase 12: Evolutionary Simulation Layer
// SyntheticAgent: Deterministic Phase 9 agent running real pipeline with synthetic inputs
// Implements UniversalAgentInterface for Phase 11 federation compatibility

'use strict';

// Import dependencies
import { UniversalAgentInterface, AGENT_TYPE, CycleResult, HealthSignal } from './universal-agent-interface.js';
import { Phase9IntegratedOrchestrator } from './phase-9-integrated-orchestrator.js';

/**
 * POLICY_TYPE enum
 */
const POLICY_TYPE = {
  STABILITY_FIRST: 'STABILITY_FIRST',
  INNOVATION: 'INNOVATION',
  BALANCED: 'BALANCED',
  SIMPLIFICATION: 'SIMPLIFICATION'
};

/**
 * SyntheticAgent: Deterministic agent using Phase 9 pipeline with synthetic inputs
 * Implements UniversalAgentInterface for Phase 11 federation
 */
class SyntheticAgent extends UniversalAgentInterface {
  constructor(agentId, policy = POLICY_TYPE.BALANCED, environment = null) {
    super(agentId, AGENT_TYPE.PHASE9);

    this.policy = policy;
    this.environment = environment;

    // Real Phase 9 orchestrator instance
    this.orchestrator = new Phase9IntegratedOrchestrator(agentId);

    // Cycle tracking
    this.cycleCount = 0;
    this.nativeCycleResults = [];
  }

  /**
   * Run one cycle through real Phase 9 pipeline
   * Input is modified based on policy before execution
   */
  runCycle(cycleId, input = {}) {
    this.cycleCount++;

    // Get synthetic metrics from environment
    let syntheticInput = input;
    if (this.environment) {
      syntheticInput = this.environment.nextCycleInput();
    }

    // Apply policy by adjusting input parameters
    const adjustedInput = this.applyPolicy(syntheticInput);

    // Run through full Phase 8→9 pipeline using adjusted input
    let nativeResult = this.orchestrator.runPhase9Cycle(cycleId, adjustedInput);

    // Track native results
    this.nativeCycleResults.push({
      cycleId,
      policy: this.policy,
      nativeResult: nativeResult
    });

    // Return as CycleResult (Phase 9 result is already compatible)
    // Extract key metrics and shape as CycleResult
    return this.adaptPhase9ToCycleResult(nativeResult, cycleId);
  }

  /**
   * Apply policy by adjusting input parameters
   *
   * Policies:
   * - STABILITY_FIRST: Conservative thresholds, prefer safer proposals
   * - INNOVATION: Aggressive thresholds, allow bolder changes
   * - BALANCED: Middle ground
   * - SIMPLIFICATION: Prioritize complexity reduction
   */
  applyPolicy(input) {
    const adjusted = JSON.parse(JSON.stringify(input)); // Deep copy

    switch (this.policy) {
      case POLICY_TYPE.STABILITY_FIRST:
        // Lower learning efficiency → Phase 9 more cautious
        if (adjusted.learningMetrics) {
          adjusted.learningMetrics.learningEfficiency *= 0.7; // 30% reduction
          adjusted.learningMetrics.convergenceVelocity *= 0.6;
        }
        // Higher consistency requirements
        adjusted.architectureConsistency = Math.min(1, adjusted.architectureConsistency * 1.15);
        break;

      case POLICY_TYPE.INNOVATION:
        // Higher learning efficiency → Phase 9 more aggressive
        if (adjusted.learningMetrics) {
          adjusted.learningMetrics.learningEfficiency *= 1.3;  // 30% increase
          adjusted.learningMetrics.convergenceVelocity *= 1.5;
        }
        // Lower consistency requirements (accept some risk)
        adjusted.architectureConsistency *= 0.85;
        break;

      case POLICY_TYPE.BALANCED:
        // No major adjustment - use default behavior
        break;

      case POLICY_TYPE.SIMPLIFICATION:
        // Penalize complexity, reward simplification
        if (adjusted.learningMetrics) {
          adjusted.learningMetrics.learningEfficiency *= 0.9;
        }
        // Increase pressure to reduce complexity
        adjusted.complexityPenalty = 1.2; // Custom penalty multiplier
        break;
    }

    return adjusted;
  }

  /**
   * Adapt Phase 9 native result to CycleResult format
   * Phase 9 result already has the right structure, just normalize it
   */
  adaptPhase9ToCycleResult(nativeResult, cycleId) {
    // Create a new CycleResult from Phase 9 output
    const cycleResult = new CycleResult(cycleId, AGENT_TYPE.PHASE9);

    // Extract Phase 9 metrics
    if (nativeResult.phase_8) {
      cycleResult.primary_objective_delta = nativeResult.phase_8.improvements_implemented || 0;
    }

    // Extract stability from multiple sources
    if (nativeResult.phase_9) {
      // Use intent alignment as confidence metric
      cycleResult.execution_confidence = nativeResult.phase_9.intent_alignment || 0.8;

      // Compute stability from watchdog violations
      cycleResult.constraint_violations_count = nativeResult.phase_9.watchdog_violations || 0;
    }

    // Stability score: inverse of violations
    const maxViolations = 5;
    cycleResult.stability_score = Math.max(0, 1 - (cycleResult.constraint_violations_count / maxViolations));

    // Determine next action
    if (nativeResult.phase_9) {
      cycleResult.next_action = nativeResult.phase_9.next_action || 'SCHEDULE';
    }

    // Mark as completed
    cycleResult.cycle_status = 'COMPLETED';
    cycleResult.cycle_duration_ms = nativeResult.duration_ms || 0;

    // Preserve domain metrics (Phase 9 specific)
    cycleResult.domain_metrics = {
      phase_8: nativeResult.phase_8,
      phase_9: nativeResult.phase_9,
      phase_c: nativeResult.phase_c,
      phase_a: nativeResult.phase_a,
      phase_d: nativeResult.phase_d,
      phase_b: nativeResult.phase_b,
      phase_e: nativeResult.phase_e
    };

    return cycleResult;
  }

  /**
   * Get health status for federation health check
   */
  getHealthStatus() {
    // Synthetic agents are always healthy (no real failures)
    return new HealthSignal(
      this.agentId,
      true,    // isHealthy
      0        // criticalAlerts
    );
  }

  /**
   * Optional: Receive federation pattern recommendation
   * This allows federation to broadcast learned patterns back
   */
  acceptFederationPattern(pattern) {
    // Synthetic agents can optionally log pattern recommendations
    if (this.nativeCycleResults.length > 0) {
      const lastResult = this.nativeCycleResults[this.nativeCycleResults.length - 1];
      if (!lastResult.federationPatterns) {
        lastResult.federationPatterns = [];
      }
      lastResult.federationPatterns.push(pattern);
    }
  }

  /**
   * Get full cycle history for analysis
   */
  getCycleHistory() {
    return this.nativeCycleResults;
  }

  /**
   * Reset agent state (for multiple scenario runs)
   */
  reset() {
    this.cycleCount = 0;
    this.nativeCycleResults = [];
    // Note: orchestrator is not reset (maintains continuity across scenarios)
  }
}

// Export for test/usage
export {
  POLICY_TYPE,
  SyntheticAgent
};
