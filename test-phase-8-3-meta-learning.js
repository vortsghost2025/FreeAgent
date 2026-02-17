/**
 * Phase 8.3 Test Suite - Meta-Learning Optimizer
 */

import {
  LearningAlgorithmOptimizer,
  MemoryArchitectureOptimizer,
  MetaLearningOptimizerEngine
} from './medical/intelligence/meta-learning-optimizer.js';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (!condition) {
    console.log(`x ${message}`);
    testsFailed++;
  } else {
    console.log(`✓ ${message}`);
    testsPassed++;
  }
}

console.log('=== PHASE 8.3: META-LEARNING OPTIMIZER ===\n');

// Test 1: Learning optimizer adjusts degraded convergence
const optimizer = new LearningAlgorithmOptimizer();
const tuned = optimizer.optimize(
  { learningRate: 0.02, batchSize: 128, regularization: 0.01 },
  { convergenceVelocity: -0.2, stabilityScore: 0.75, validationDrift: 0.2 }
);
assert(tuned.next.learningRate < tuned.previous.learningRate, 'Learning optimizer: reduce learning rate for degraded convergence');

// Test 2: Memory optimizer proposes actions for poor memory stats
const memoryOptimizer = new MemoryArchitectureOptimizer();
const memoryPlan = memoryOptimizer.optimize({
  retrievalLatencyMs: 180,
  hitRate: 0.82,
  fragmentation: 0.3,
  growthRate: 0.2
});
assert(memoryPlan.actions.length >= 3, 'Memory optimizer: produce memory optimization actions');

// Test 3: Record meta-learning cycles
const engine = new MetaLearningOptimizerEngine();
engine.recordCycle('c1', { learningEfficiency: 0.7, convergenceVelocity: 0.1, stabilityScore: 0.9 });
engine.recordCycle('c2', { learningEfficiency: 0.74, convergenceVelocity: 0.12, stabilityScore: 0.92 });
engine.recordCycle('c3', { learningEfficiency: 0.77, convergenceVelocity: 0.15, stabilityScore: 0.94 });
engine.recordCycle('c4', { learningEfficiency: 0.8, convergenceVelocity: 0.18, stabilityScore: 0.95 });
assert(engine.learningHistory.length === 4, 'Meta-learning engine: record learning cycles');

// Test 4: Improvement rate per 100 cycles
const improvement = engine.getImprovementRatePer100Cycles();
assert(improvement > 0.1, 'Meta-learning engine: compute positive improvement per 100 cycles');

// Test 5: Learning optimization invocation
const learningOptimization = engine.optimizeLearning(
  { learningRate: 0.01, batchSize: 64, regularization: 0.02 },
  { convergenceVelocity: 0.25, stabilityScore: 0.95, validationDrift: 0.01 }
);
assert(learningOptimization.success, 'Meta-learning engine: optimize learning configuration');

// Test 6: Memory optimization invocation
const memoryOptimization = engine.optimizeMemoryArchitecture({
  retrievalLatencyMs: 130,
  hitRate: 0.89,
  fragmentation: 0.22,
  growthRate: 0.12
});
assert(memoryOptimization.success, 'Meta-learning engine: optimize memory architecture');

// Test 7: Status summary
const status = engine.getMetaLearningStatus();
assert(status.recordedCycles === 4, 'Meta-learning engine: expose status summary');

console.log(`\nTests: ${testsPassed}/${testsPassed + testsFailed} passed`);
process.exit(testsFailed > 0 ? 1 : 0);

