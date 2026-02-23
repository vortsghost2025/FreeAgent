// Phase 12: Evolutionary Simulation Layer
// SyntheticEnvironment: Deterministic metric generation for testing strategies
// Provides 5 predefined scenarios with seeded randomness

'use strict';

/**
 * SeededRandom: Deterministic RNG for reproducibility
 * Uses simple linear congruential generator for consistency
 */
class SeededRandom {
  constructor(seed = 42) {
    this.seed = seed;
    this.current = seed;
  }

  next() {
    // Linear congruential generator: 32-bit output
    this.current = (this.current * 1103515245 + 12345) & 0x7fffffff;
    return this.current / 0x7fffffff;
  }

  // Random integer between min (inclusive) and max (exclusive)
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min)) + min;
  }

  // Random float between min and max
  nextFloat(min, max) {
    return this.next() * (max - min) + min;
  }

  // Random boolean with probability p (0-1)
  nextBool(p = 0.5) {
    return this.next() < p;
  }
}

/**
 * ScenarioConfig: Configuration for a synthetic scenario
 */
class ScenarioConfig {
  constructor(name, description = '') {
    this.name = name;
    this.description = description;
    this.baseImprovement = 2.5;      // % improvement per cycle
    this.noiseLevel = 0.05;          // Noise magnitude (fraction)
    this.rollbackRate = 0.05;        // Probability of rollback
    this.complexityGrowth = 0.01;    // Complexity increase per cycle
    this.shockFrequency = 0.0;       // Probability of external shock per cycle
    this.behaviorSpecial = null;     // Special behavior (degradation, gaming, etc.)
  }
}

/**
 * SyntheticEnvironment: Deterministic metric stream generator
 * Shaped for Phase 9 input contract
 */
class SyntheticEnvironment {
  constructor(scenarioConfig, seed = 42) {
    this.scenario = scenarioConfig;
    this.rng = new SeededRandom(seed);
    this.cycle = 0;
    this.state = this.initializeState();
  }

  initializeState() {
    return {
      architecture: {
        before: { components: [], complexity: 100 },
        after: { components: [], complexity: 100 },
        delta: {}
      },
      improvement: this.scenario.baseImprovement,
      complexity: 100,
      rollbackCount: 0,
      mttrSeconds: 20,
      architectureConsistency: 0.95,
      learningEfficiency: 0.75,
      testPassRate: 0.98,
      errorRatePct: 0.01
    };
  }

  /**
   * Generate next cycle's synthetic input
   * Returns object shaped for Phase 9IntegratedOrchestrator.runPhase9Cycle()
   */
  nextCycleInput() {
    this.cycle++;
    const state = this.state;

    // Apply scenario-specific behavior
    this.applyScenarioBehavior();

    // Apply deterministic noise
    const noise = this.rng.nextFloat(-this.scenario.noiseLevel, this.scenario.noiseLevel);
    const improvement = Math.max(0, state.improvement + noise);

    // Apply shocks (external events)
    let mttraSeconds = state.mttrSeconds;
    if (this.rng.nextBool(this.scenario.shockFrequency)) {
      mttraSeconds *= (1 + this.rng.nextFloat(0.5, 2.0)); // 50-200% MTTR increase
    }

    // Rollback probability
    const rollbackOccurred = this.rng.nextBool(this.scenario.rollbackRate);
    if (rollbackOccurred) {
      state.rollbackCount++;
    }

    // Complexity evolution
    state.complexity += this.scenario.complexityGrowth;

    // Generate Phase 9 input
    return {
      architectureSnapshot: state.architecture,
      architectureComplexity: Math.round(state.complexity),
      rollbackRate: state.rollbackCount / Math.max(1, this.cycle),
      architectureConsistency: this.computeConsistency(),
      learningMetrics: {
        learningEfficiency: Math.min(1, state.learningEfficiency + noise * 0.1),
        convergenceVelocity: improvement / 100,
        stabilityScore: 1 - Math.abs(noise)
      },
      validationEvidence: {
        testPassRate: Math.min(1, state.testPassRate + improvement / 100 * 0.01),
        canarySuccessRate: 0.99,
        errorRatePct: Math.max(0, state.errorRatePct - improvement / 100 * 0.001)
      },
      implementationActor: 'synthetic-agent'
    };
  }

  /**
   * Apply scenario-specific behavior modifications
   */
  applyScenarioBehavior() {
    const behavior = this.scenario.behaviorSpecial;
    if (!behavior) return;

    if (behavior.type === 'DEGRADING') {
      // Scenario C: Metrics worsen over time
      const degradationFactor = 1 - (this.cycle * 0.02); // Linear degradation 2% per cycle
      this.scenario.baseImprovement = Math.max(-5, this.scenario.baseImprovement * degradationFactor);
    } else if (behavior.type === 'GAMING') {
      // Scenario D: Inflated improvements (watched by watchdog)
      if (this.cycle > 5) {
        // After 5 cycles, inflate improvements
        this.scenario.baseImprovement *= 1.5;
      }
    } else if (behavior.type === 'VOLATILE') {
      // Scenario B: High volatility
      this.scenario.noiseLevel = 0.15; // 15% noise
    }
  }

  /**
   * Compute architecture consistency metric
   */
  computeConsistency() {
    // Decay consistency with complexity growth
    const complexityPenalty = Math.min(0.3, this.state.complexity / 1000);
    return Math.max(0.5, 0.95 - complexityPenalty);
  }

  /**
   * Get current scenario state for debugging
   */
  getScenarioState() {
    return {
      scenario: this.scenario.name,
      cycle: this.cycle,
      improvement: this.state.improvement,
      complexity: this.state.complexity,
      mttr: this.state.mttrSeconds,
      rollbacks: this.state.rollbackCount,
      consistency: this.computeConsistency()
    };
  }
}

/**
 * PREDEFINED SCENARIOS
 */

/**
 * Scenario A: Stable but Noisy
 * Good conditions for testing INNOVATION strategy
 */
function createScenarioA() {
  const config = new ScenarioConfig(
    'Scenario A: Stable but Noisy',
    'Metrics improve steadily with predictable noise'
  );
  config.baseImprovement = 2.5;      // Steady improvement
  config.noiseLevel = 0.05;          // 5% noise
  config.rollbackRate = 0.03;        // < 5% rollbacks
  config.complexityGrowth = 0.005;   // Minimal complexity growth
  config.shockFrequency = 0.01;      // Rare shocks
  return config;
}

/**
 * Scenario B: High-Risk, High-Reward
 * Good conditions for testing STABILITY vs INNOVATION tradeoff
 */
function createScenarioB() {
  const config = new ScenarioConfig(
    'Scenario B: High-Risk High-Reward',
    'Volatile metrics with potential large improvements and failures'
  );
  config.baseImprovement = 5.0;      // High potential improvement
  config.noiseLevel = 0.15;          // 15% noise (volatile)
  config.rollbackRate = 0.18;        // > 15% rollbacks
  config.complexityGrowth = 0.02;    // Moderate complexity growth
  config.shockFrequency = 0.05;      // More frequent shocks
  return config;
}

/**
 * Scenario C: Degrading Infrastructure
 * Good conditions for testing governance adaptation
 */
function createScenarioC() {
  const config = new ScenarioConfig(
    'Scenario C: Degrading Infrastructure',
    'Metrics worsen over time, testing adaptive governance'
  );
  config.baseImprovement = 2.0;
  config.noiseLevel = 0.08;
  config.rollbackRate = 0.10;
  config.complexityGrowth = 0.03;    // Higher complexity growth
  config.shockFrequency = 0.08;      // Frequent shocks
  config.behaviorSpecial = { type: 'DEGRADING' }; // Metrics degrade over time
  return config;
}

/**
 * Scenario D: Metric Gaming Adversary
 * Good conditions for testing watchdog robustness
 */
function createScenarioD() {
  const config = new ScenarioConfig(
    'Scenario D: Metric Gaming Adversary',
    'Synthetic agent inflates improvements, testing watchdog detection'
  );
  config.baseImprovement = 1.5;
  config.noiseLevel = 0.03;
  config.rollbackRate = 0.20;        // High rollback rate (hidden)
  config.complexityGrowth = 0.05;    // High complexity growth (hidden)
  config.shockFrequency = 0.10;
  config.behaviorSpecial = { type: 'GAMING' }; // Inflated improvements after cycle 5
  return config;
}

/**
 * Scenario E: Governance Extremes
 * Good conditions for testing extreme governance thresholds
 */
function createScenarioE() {
  const config = new ScenarioConfig(
    'Scenario E: Governance Extremes',
    'Tests both strict and lenient governance limits'
  );
  config.baseImprovement = 3.0;
  config.noiseLevel = 0.10;
  config.rollbackRate = 0.08;
  config.complexityGrowth = 0.02;
  config.shockFrequency = 0.04;
  config.behaviorSpecial = null;     // No special behavior
  return config;
}

/**
 * Get all predefined scenarios
 */
function getAllScenarios() {
  return {
    A: createScenarioA(),
    B: createScenarioB(),
    C: createScenarioC(),
    D: createScenarioD(),
    E: createScenarioE()
  };
}

// Export for test/usage
export {
  SeededRandom,
  ScenarioConfig,
  SyntheticEnvironment,
  createScenarioA,
  createScenarioB,
  createScenarioC,
  createScenarioD,
  createScenarioE,
  getAllScenarios
};
