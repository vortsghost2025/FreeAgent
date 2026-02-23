// Phase 12: Evolutionary Simulation Layer
// ScenarioRunner: Orchestrates full federation cycles with synthetic data and feedback loops

'use strict';

// Import dependencies
import { SyntheticEnvironment } from './synthetic-environment.js';
import { SyntheticAgent, POLICY_TYPE } from './synthetic-agent.js';
import { Phase11FederationCoordinator } from './phase-11-federation-coordinator.js';
import { AGENT_TYPE } from './universal-agent-interface.js';

/**
 * ScenarioRunner: Orchestrates N cycles with scenario + policy configuration
 * Runs full Phases 8→11 pipeline with synthetic agents
 */
class ScenarioRunner {
  constructor(scenario, phase11Coordinator = null, policy = 'BALANCED') {
    this.scenario = scenario;
    this.coordinator = phase11Coordinator || new Phase11FederationCoordinator();
    this.policy = policy;

    // Timeline tracking
    this.timeline = [];
    this.environment = null;
    this.agents = [];
  }

  /**
   * Run N cycles of simulation with given seed
   * Returns: { scenario, policy, numCycles, timeline, summaryMetrics }
   */
  runSimulation(numCycles = 100, seed = 42) {
    // Initialize environment
    this.environment = new SyntheticEnvironment(this.scenario, seed);

    // Create synthetic agent
    const agentId = `synthetic-${this.policy}-${Date.now()}`;
    const agent = new SyntheticAgent(agentId, this.policy, this.environment);
    this.agents.push(agent);

    // Register agent with coordinator
    this.coordinator.registerSubsystem(agentId, agent, AGENT_TYPE.PHASE9);

    // Run cycles with feedback loop
    const timeline = [];
    for (let cycleNum = 1; cycleNum <= numCycles; cycleNum++) {
      // Execute one federation round
      try {
        const roundResult = this.coordinator.coordinateRound(cycleNum);

        // Record timeline entry
        const timelineEntry = {
          cycleNum,
          environmentState: this.environment.getScenarioState(),
          roundResult: roundResult,
          agentMetrics: this.extractAgentMetrics(agent, cycleNum),
          timestamp: Date.now()
        };

        timeline.push(timelineEntry);
        this.timeline.push(timelineEntry);

        // Check for stop conditions
        if (roundResult.shouldPauseFederation) {
          console.log(`[ScenarioRunner] Federation paused at cycle ${cycleNum}`);
          break;
        }
        if (roundResult.anyInstanceAborted) {
          console.log(`[ScenarioRunner] Agent aborted at cycle ${cycleNum}`);
          break;
        }
      } catch (error) {
        console.error(`[ScenarioRunner] Error at cycle ${cycleNum}:`, error.message);
        throw error;
      }
    }

    // Compute summary metrics
    const summaryMetrics = this.computeSummaryMetrics(timeline);

    return {
      scenario: this.scenario.name,
      policy: this.policy,
      numCycles: numCycles,
      actualCycles: timeline.length,
      seed: seed,
      timeline: timeline,
      summaryMetrics: summaryMetrics,
      agentHistory: agent.getCycleHistory()
    };
  }

  /**
   * Extract metrics from synthetic agent
   */
  extractAgentMetrics(agent, cycleNum) {
    const history = agent.getCycleHistory();
    if (history.length === 0) return null;

    const lastEntry = history[history.length - 1];
    const nativeResult = lastEntry.nativeResult;

    return {
      cycleNum,
      agentId: agent.agentId,
      policy: agent.policy,
      phase_9_intent: nativeResult.phase_9?.strategic_intent || 'UNKNOWN',
      phase_9_strategy: nativeResult.phase_9?.strategy_selected || 'UNKNOWN',
      phase_9_alignment: nativeResult.phase_9?.intent_alignment || 0,
      watchdog_violations: nativeResult.phase_9?.watchdog_violations || 0,
      next_action: nativeResult.phase_9?.next_action || 'SCHEDULE'
    };
  }

  /**
   * Compute summary metrics across all cycles
   */
  computeSummaryMetrics(timeline) {
    if (timeline.length === 0) {
      return {
        totalImprovement: 0,
        averageImprovement: 0,
        maxImprovement: 0,
        averageStability: 0,
        totalWatchdogViolations: 0,
        governanceChanges: 0
      };
    }

    // Extract improvements from timeline
    const improvements = timeline.map(entry => {
      const envState = entry.environmentState;
      return envState.improvement || 0;
    });

    const stability = timeline.map(entry => {
      const agentMetrics = entry.agentMetrics;
      if (!agentMetrics) return 1;
      const violations = agentMetrics.watchdog_violations || 0;
      return Math.max(0, 1 - (violations / 5));
    });

    const watchdogViolations = timeline.map(entry => {
      const agentMetrics = entry.agentMetrics;
      return agentMetrics?.watchdog_violations || 0;
    });

    // Count governance changes
    let governanceChanges = 0;
    for (let i = 1; i < timeline.length; i++) {
      const prev = timeline[i - 1].agentMetrics;
      const curr = timeline[i].agentMetrics;
      if (prev?.phase_9_intent !== curr?.phase_9_intent) {
        governanceChanges++;
      }
    }

    return {
      totalImprovement: improvements.reduce((a, b) => a + b, 0),
      averageImprovement: improvements.reduce((a, b) => a + b, 0) / improvements.length,
      maxImprovement: Math.max(...improvements),
      minImprovement: Math.min(...improvements),
      averageStability: stability.reduce((a, b) => a + b, 0) / stability.length,
      minStability: Math.min(...stability),
      totalWatchdogViolations: watchdogViolations.reduce((a, b) => a + b, 0),
      averageWatchdogViolations: watchdogViolations.reduce((a, b) => a + b, 0) / watchdogViolations.length,
      governanceChanges: governanceChanges,
      cycleCount: timeline.length
    };
  }

  /**
   * Get trajectory of improvements over time
   */
  getImprovementTrajectory() {
    return this.timeline.map((entry, idx) => ({
      cycle: idx + 1,
      improvement: entry.environmentState.improvement,
      complexity: entry.environmentState.complexity,
      stability: 1 - (entry.agentMetrics?.watchdog_violations || 0) / 5
    }));
  }

  /**
   * Get risk metrics (rollbacks, MTTR, violations)
   */
  getRiskMetrics() {
    const rollbacks = this.timeline.filter(entry =>
      entry.environmentState.rollbacks > 0
    ).length;

    const violations = this.timeline.map(entry =>
      entry.agentMetrics?.watchdog_violations || 0
    );

    return {
      rollbackFrequency: rollbacks / this.timeline.length,
      maxWatchdogViolations: Math.max(0, ...violations),
      governanceStability: 1 - (rollbacks / this.timeline.length)
    };
  }

  /**
   * Get governance evolution over time
   */
  getGovernanceEvolution() {
    return this.timeline.map((entry, idx) => ({
      cycle: idx + 1,
      intent: entry.agentMetrics?.phase_9_intent || 'UNKNOWN',
      strategy: entry.agentMetrics?.phase_9_strategy || 'UNKNOWN',
      alignment: entry.agentMetrics?.phase_9_alignment || 0,
       violations: entry.agentMetrics?.watchdog_violations || 0
    }));
  }

  /**
   * Get watchdog trigger timeline
   */
  getWatchdogTriggersTimeline() {
    const triggers = [];

    this.timeline.forEach((entry, idx) => {
      const violations = entry.agentMetrics?.watchdog_violations || 0;
      if (violations > 0) {
        triggers.push({
          cycle: idx + 1,
          violations: violations,
          trigger: this.getWatchdogReason(entry)
        });
      }
    });

    return triggers;
  }

  /**
   * Determine reason for watchdog trigger
   */
  getWatchdogReason(entry) {
    const violations = entry.agentMetrics?.watchdog_violations || 0;
    const intent = entry.agentMetrics?.phase_9_intent;

    if (intent && intent.includes('OSCILLATING')) {
      return 'Oscillation detected';
    }
    if (violations > 2) {
      return 'Multiple violations';
    }
    return 'Policy violation';
  }

  /**
   * Get metrics trajectory for accuracy analysis
   */
  getMetricsTrajectory() {
    return {
      cycles: this.timeline.map((e, i) => i + 1),
      improvements: this.timeline.map(e => e.environmentState.improvement),
      complexity: this.timeline.map(e => e.environmentState.complexity),
      stability: this.timeline.map(e => 1 - (e.agentMetrics?.watchdog_violations || 0) / 5),
      watchdog_violations: this.timeline.map(e => e.agentMetrics?.watchdog_violations || 0)
    };
  }

  /**
   * Generate human-readable report
   */
  generateReport() {
    const summary = this.timeline.length > 0 ?
      this.computeSummaryMetrics(this.timeline) :
      null;

    return {
      scenario: this.scenario.name,
      policy: this.policy,
      cycles: this.timeline.length,
      summary: summary,
      improvementTrajectory: this.getImprovementTrajectory(),
      riskMetrics: this.getRiskMetrics(),
      governanceEvolution: this.getGovernanceEvolution(),
      watchdogTriggers: this.getWatchdogTriggersTimeline()
    };
  }
}

// Export for test/usage
export {
  ScenarioRunner
};
