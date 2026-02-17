// Phase 12: Evolutionary Simulation Layer
// PolicyEvaluationEngine: Compares strategies across scenarios and generates recommendations

'use strict';

// Import dependencies
import { ScenarioRunner } from './scenario-runner.js';
import { POLICY_TYPE } from './synthetic-agent.js';
import { getAllScenarios } from './synthetic-environment.js';
import { Phase11FederationCoordinator } from './phase-11-federation-coordinator.js';

/**
 * StrategyComparison: Results for a single scenario/policy combination
 */
class StrategyComparison {
  constructor(scenarioName, policy, runner) {
    this.scenarioName = scenarioName;
    this.policy = policy;
    this.improvement = runner.timeline.length > 0 ?
      this.computeTotalImprovement(runner.timeline) : 0;
    this.stability = runner.timeline.length > 0 ?
      runner.computeSummaryMetrics(runner.timeline).averageStability : 1;
    this.riskMetrics = runner.getRiskMetrics();
    this.governanceChanges = runner.timeline.length > 0 ?
      runner.computeSummaryMetrics(runner.timeline).governanceChanges : 0;
  }

  computeTotalImprovement(timeline) {
    return timeline.reduce((sum, entry) => {
      return sum + (entry.environmentState.improvement || 0);
    }, 0);
  }
}

/**
 * PolicyEvaluationEngine: Evaluates and compares strategies
 */
class PolicyEvaluationEngine {
  constructor(scenarios = null, policies = null) {
    this.scenarios = scenarios || getAllScenarios();
    this.policies = policies || [
      POLICY_TYPE.STABILITY_FIRST,
      POLICY_TYPE.INNOVATION,
      POLICY_TYPE.BALANCED,
      POLICY_TYPE.SIMPLIFICATION
    ];

    this.results = new Map(); // Key: "scenarioName|policy" → StrategyComparison
    this.runTimestamps = [];
  }

  /**
   * Run all scenario/policy combinations
   * Returns: { combinations_run, results_matrix, timestamp }
   */
  evaluateAllCombinations(numCyclesPerRun = 50, seedBase = 42) {
    console.log('[PolicyEvaluationEngine] Starting evaluation...');
    console.log(`  Scenarios: ${Object.keys(this.scenarios).length}`);
    console.log(`  Policies: ${this.policies.length}`);
    console.log(`  Cycles per run: ${numCyclesPerRun}`);

    const startTime = Date.now();
    let combinationCount = 0;

    // Iterate through all scenario/policy combinations
    for (const [scenarioKey, scenario] of Object.entries(this.scenarios)) {
      for (const policy of this.policies) {
        combinationCount++;

        try {
          // Create runner for this combination
          const coordinator = new Phase11FederationCoordinator();
          const runner = new ScenarioRunner(scenario, coordinator, policy);

          // Run with deterministic seed
          const seed = seedBase + combinationCount;
          runner.runSimulation(numCyclesPerRun, seed);

          // Record results
          const key = `${scenario.name}|${policy}`;
          const comparison = new StrategyComparison(scenario.name, policy, runner);
          this.results.set(key, comparison);

          console.log(`  ✓ ${scenario.name} + ${policy}`);
        } catch (error) {
          console.error(`  ✗ ${scenario.name} + ${policy}: ${error.message}`);
        }
      }
    }

    this.runTimestamps.push({
      timestamp: startTime,
      duration: Date.now() - startTime,
      combinations: combinationCount
    });

    console.log(`[PolicyEvaluationEngine] Evaluation complete (${Date.now() - startTime}ms)`);

    return {
      combinations_run: combinationCount,
      results_matrix: this.results,
      timestamp: startTime
    };
  }

  /**
   * Get ranked strategies for a specific scenario
   * Returns: [ { policy, improvement, stability, risk }, ... ] sorted by improvement
   */
  compareStrategiesForScenario(scenarioName) {
    const comparisons = [];

    for (const [key, comparison] of this.results.entries()) {
      if (comparison.scenarioName === scenarioName) {
        comparisons.push({
          policy: comparison.policy,
          improvement: comparison.improvement,
          stability: comparison.stability,
          rollbackFrequency: comparison.riskMetrics.rollbackFrequency,
          governanceChanges: comparison.governanceChanges,
          overallScore: this.computeOverallScore(comparison)
        });
      }
    }

    // Sort by improvement (descending)
    return comparisons.sort((a, b) => b.improvement - a.improvement);
  }

  /**
   * Compute overall score (weighted combination of metrics)
   */
  computeOverallScore(comparison) {
    // Weights for different metrics
    const weights = {
      improvement: 0.5,      // 50% weight on improvement
      stability: 0.3,        // 30% weight on stability
      lowRisk: 0.2           // 20% weight on low risk (1 - rollback frequency)
    };

    const normalizedImprovement = Math.min(comparison.improvement / 100, 1); // Cap at 100
    const normalizedRisk = 1 - comparison.riskMetrics.rollbackFrequency;

    return (
      weights.improvement * normalizedImprovement +
      weights.stability * comparison.stability +
      weights.lowRisk * normalizedRisk
    );
  }

  /**
   * Get recommendation for a specific scenario
   */
  recommendStrategyForScenario(scenarioName) {
    const ranked = this.compareStrategiesForScenario(scenarioName);

    if (ranked.length === 0) {
      return {
        scenario: scenarioName,
        recommendation: 'NO DATA',
        reason: 'No evaluation results found'
      };
    }

    const best = ranked[0];
    const summary = ranked.map(r => ({
      policy: r.policy,
      score: r.overallScore,
      improvement: r.improvement
    }));

    return {
      scenario: scenarioName,
      recommendation: best.policy,
      overallScore: best.overallScore,
      improvement: best.improvement,
      stability: best.stability,
      rollbackFrequency: best.rollbackFrequency,
      reason: `Achieves ${best.improvement.toFixed(1)} total improvement with ` +
              `${(best.stability * 100).toFixed(1)}% stability`,
      allRanked: summary
    };
  }

  /**
   * Get detailed report for a scenario
   */
  getScenarioReport(scenarioName) {
    const ranked = this.compareStrategiesForScenario(scenarioName);
    const recommendation = this.recommendStrategyForScenario(scenarioName);

    return {
      scenario: scenarioName,
      recommendation: recommendation.recommendation,
      strategies: ranked.map((r, idx) => ({
        rank: idx + 1,
        policy: r.policy,
        improvement: r.improvement.toFixed(2),
        stability: (r.stability * 100).toFixed(1) + '%',
        rollbackFrequency: (r.rollbackFrequency * 100).toFixed(1) + '%',
        governanceChanges: r.governanceChanges,
        overallScore: (r.overallScore * 100).toFixed(1) + '%'
      })),
      details: ranked
    };
  }

  /**
   * Get full system report across all scenarios
   */
  getFullSystemReport() {
    const scenarioNames = [...new Set(
      Array.from(this.results.values()).map(r => r.scenarioName)
    )];

    const reports = {};
    const recommendations = {};

    for (const scenarioName of scenarioNames) {
      reports[scenarioName] = this.getScenarioReport(scenarioName);
      recommendations[scenarioName] = this.recommendStrategyForScenario(scenarioName).recommendation;
    }

    return {
      timestamp: new Date().toISOString(),
      totalEvaluations: this.results.size,
      scenarios: scenarioNames,
      recommendations: recommendations,
      reports: reports,
      summary: this.generateExecutiveSummary()
    };
  }

  /**
   * Generate executive summary
   */
  generateExecutiveSummary() {
    const allComparisons = Array.from(this.results.values());

    // Find best policy overall
    const bestByImprovement = allComparisons.reduce((best, curr) =>
      curr.improvement > best.improvement ? curr : best
    );

    const bestByStability = allComparisons.reduce((best, curr) =>
      curr.stability > best.stability ? curr : best
    );

    const bestByRisk = allComparisons.reduce((best, curr) =>
      curr.riskMetrics.rollbackFrequency < best.riskMetrics.rollbackFrequency ? curr : best
    );

    return {
      bestForImprovement: {
        policy: bestByImprovement.policy,
        scenario: bestByImprovement.scenarioName,
        improvement: bestByImprovement.improvement.toFixed(2)
      },
      bestForStability: {
        policy: bestByStability.policy,
        scenario: bestByStability.scenarioName,
        stability: (bestByStability.stability * 100).toFixed(1) + '%'
      },
      bestForRisk: {
        policy: bestByRisk.policy,
        scenario: bestByRisk.scenarioName,
        rollbackFrequency: (bestByRisk.riskMetrics.rollbackFrequency * 100).toFixed(1) + '%'
      },
      averageImprovement: (allComparisons.reduce((sum, c) => sum + c.improvement, 0) / allComparisons.length).toFixed(2),
      averageStability: ((allComparisons.reduce((sum, c) => sum + c.stability, 0) / allComparisons.length) * 100).toFixed(1) + '%'
    };
  }

  /**
   * Compare two specific policies across all scenarios
   */
  comparePoliciesToEachOther(policy1, policy2) {
    const policy1Results = [];
    const policy2Results = [];

    for (const [key, comparison] of this.results.entries()) {
      if (comparison.policy === policy1) {
        policy1Results.push(comparison);
      } else if (comparison.policy === policy2) {
        policy2Results.push(comparison);
      }
    }

    return {
      policy1: {
        name: policy1,
        avgImprovement: policy1Results.reduce((sum, c) => sum + c.improvement, 0) / policy1Results.length,
        avgStability: policy1Results.reduce((sum, c) => sum + c.stability, 0) / policy1Results.length,
        wins: this.countWins(policy1Results, policy2Results)
      },
      policy2: {
        name: policy2,
        avgImprovement: policy2Results.reduce((sum, c) => sum + c.improvement, 0) / policy2Results.length,
        avgStability: policy2Results.reduce((sum, c) => sum + c.stability, 0) / policy2Results.length,
        wins: this.countWins(policy2Results, policy1Results)
      }
    };
  }

  /**
   * Count wins for policy1 vs policy2 in same scenarios
   */
  countWins(policy1Results, policy2Results) {
    let wins = 0;
    for (const p1 of policy1Results) {
      const p2 = policy2Results.find(r => r.scenarioName === p1.scenarioName);
      if (p2 && p1.improvement > p2.improvement) {
        wins++;
      }
    }
    return wins;
  }
}

// Export for test/usage
export {
  StrategyComparison,
  PolicyEvaluationEngine
};
