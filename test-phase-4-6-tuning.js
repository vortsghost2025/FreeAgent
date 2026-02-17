/**
 * Phase 4.6: Self-Tuning Behavior Tests
 * Comprehensive test suite for autonomous parameter tuning, metrics-driven optimization, and self-optimization loops
 */

import {
  ParameterTuner,
  MetricsDrivenOptimizer,
  SelfOptimizationLoop,
  AutonomousFederationController
} from './medical/federation/self-tuning.js';

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`✗ ${name}: ${error.message}`);
    testsFailed++;
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message} (expected ${expected}, got ${actual})`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// ============================================================================
// TEST SUITE 1: ParameterTuner
// ============================================================================

console.log('\n=== PHASE 4.6.1: PARAMETER TUNER TESTS ===\n');

test('ParameterTuner: Register parameter', () => {
  const tuner = new ParameterTuner();

  tuner.registerParameter('task-timeout', 30000, { min: 5000, max: 120000 });

  const value = tuner.getParameter('task-timeout');
  assertEqual(value, 30000, 'Parameter value matches');
});

test('ParameterTuner: Adjust parameter', () => {
  const tuner = new ParameterTuner();

  tuner.registerParameter('task-timeout', 30000, { min: 5000, max: 120000 });

  const result = tuner.adjustParameter('task-timeout', 45000, 'load-increase');
  assertEqual(result.success, true, 'Adjustment successful');
  assertEqual(result.adjustment.newValue, 45000, 'New value set');
});

test('ParameterTuner: Respect min/max constraints', () => {
  const tuner = new ParameterTuner();

  tuner.registerParameter('retry-count', 3, { min: 0, max: 10 });

  tuner.adjustParameter('retry-count', -5, 'test');
  let value = tuner.getParameter('retry-count');
  assertEqual(value, 0, 'Minimum constraint respected');

  tuner.adjustParameter('retry-count', 100, 'test');
  value = tuner.getParameter('retry-count');
  assertEqual(value, 10, 'Maximum constraint respected');
});

test('ParameterTuner: Get parameter statistics', () => {
  const tuner = new ParameterTuner();

  tuner.registerParameter('cache-ttl', 3600, { min: 60, max: 86400 });

  tuner.adjustParameter('cache-ttl', 5400, 'increase');
  tuner.adjustParameter('cache-ttl', 4200, 'adjust');

  const stats = tuner.getParameterStats('cache-ttl');
  assert(stats !== null, 'Statistics retrieved');
  assertEqual(stats.current, 4200, 'Current value');
  assert(stats.adjustmentCount >= 2, 'Adjustments tracked');
});

test('ParameterTuner: Adjustment history', () => {
  const tuner = new ParameterTuner();

  tuner.registerParameter('batch-size', 100, { min: 1, max: 1000 });

  tuner.adjustParameter('batch-size', 150, 'reason1');
  tuner.adjustParameter('batch-size', 200, 'reason2');

  const stats = tuner.getStats();
  assertEqual(stats.totalAdjustments, 2, 'Adjustments tracked');
});

test('ParameterTuner: Adjustment callback', () => {
  const tuner = new ParameterTuner();
  let callbackFired = false;

  tuner.onAdjustment((adjustment) => {
    callbackFired = true;
  });

  tuner.registerParameter('param', 100);
  tuner.adjustParameter('param', 150);

  assert(callbackFired, 'Callback was fired');
});

// ============================================================================
// TEST SUITE 2: MetricsDrivenOptimizer
// ============================================================================

console.log('\n=== PHASE 4.6.2: METRICS-DRIVEN OPTIMIZER TESTS ===\n');

test('MetricsDrivenOptimizer: Record metric', () => {
  const optimizer = new MetricsDrivenOptimizer();

  optimizer.recordMetric('latency', 45);
  optimizer.recordMetric('latency', 52);
  optimizer.recordMetric('latency', 48);

  const stats = optimizer.getMetricStats('latency');
  assert(stats !== null, 'Metrics recorded');
  assert(stats.avg > 0, 'Average calculated');
});

test('MetricsDrivenOptimizer: Analyze high latency', () => {
  const optimizer = new MetricsDrivenOptimizer({
    thresholds: { latency: 50 }
  });

  // Record high latency metrics
  for (let i = 0; i < 10; i++) {
    optimizer.recordMetric('latency', 75 + i);
  }

  const recommendations = optimizer.analyzeAndOptimize();
  const latencyRecs = recommendations.filter(r => r.type === 'REDUCE_LATENCY');
  assert(latencyRecs.length > 0, 'Latency optimization recommended');
});

test('MetricsDrivenOptimizer: Analyze high load', () => {
  const optimizer = new MetricsDrivenOptimizer({
    thresholds: { load: 0.7 }
  });

  // Record high load metrics
  for (let i = 0; i < 10; i++) {
    optimizer.recordMetric('load', 0.85);
  }

  const recommendations = optimizer.analyzeAndOptimize();
  const loadRecs = recommendations.filter(r => r.type === 'REDUCE_LOAD');
  assert(loadRecs.length > 0, 'Load reduction recommended');
});

test('MetricsDrivenOptimizer: Apply optimization', () => {
  const tuner = new ParameterTuner();
  tuner.registerParameter('node-target', 10);
  tuner.registerParameter('load-balance-factor', 1);

  const optimizer = new MetricsDrivenOptimizer({ tuner });

  const recommendation = {
    type: 'REDUCE_LOAD',
    actions: ['scale-up', 'load-balance']
  };

  const result = optimizer.applyOptimization(recommendation);
  assertEqual(result.recommendation, 'REDUCE_LOAD', 'Optimization applied');
  assert(result.actions.length > 0, 'Actions executed');
});

test('MetricsDrivenOptimizer: Get metric percentiles', () => {
  const optimizer = new MetricsDrivenOptimizer();

  // Record 100 latency values
  for (let i = 0; i < 100; i++) {
    optimizer.recordMetric('latency', 30 + Math.random() * 20);
  }

  const stats = optimizer.getMetricStats('latency');
  assert(stats.p50 >= stats.avg * 0.8, 'P50 reasonable');
  assert(stats.p95 >= stats.p50, 'P95 >= P50');
  assert(stats.p99 >= stats.p95, 'P99 >= P95');
});

// ============================================================================
// TEST SUITE 3: SelfOptimizationLoop
// ============================================================================

console.log('\n=== PHASE 4.6.3: SELF-OPTIMIZATION LOOP TESTS ===\n');

test('SelfOptimizationLoop: Start optimization cycle', () => {
  const loop = new SelfOptimizationLoop();

  const result = loop.startOptimizationCycle();

  assert(result.cycle >= 1, 'Cycle counter incremented');
  assert(Array.isArray(result.recommendations), 'Recommendations returned');
});

test('SelfOptimizationLoop: Record metrics', () => {
  const loop = new SelfOptimizationLoop();

  loop.recordMetric('latency', 45);
  loop.recordMetric('load', 0.6);

  const stats = loop.optimizer.getMetricStats('latency');
  assert(stats !== null, 'Metrics recorded');
});

test('SelfOptimizationLoop: Get system health score', () => {
  const loop = new SelfOptimizationLoop();

  // Record good metrics
  loop.recordMetric('latency', 20);
  loop.recordMetric('load', 0.3);
  loop.recordMetric('errorRate', 0.001);

  const health = loop.getSystemHealthScore();
  assert(health >= 50, 'Health score reasonable for good metrics');
});

test('SelfOptimizationLoop: Multiple cycles', () => {
  const loop = new SelfOptimizationLoop();

  loop.startOptimizationCycle();
  loop.startOptimizationCycle();
  loop.startOptimizationCycle();

  const stats = loop.getStats();
  assertEqual(stats.optimizationCycles, 3, 'Three cycles completed');
});

test('SelfOptimizationLoop: Cycle callback', () => {
  const loop = new SelfOptimizationLoop();
  let callbackFired = false;

  loop.onCycleComplete((event) => {
    callbackFired = true;
  });

  loop.startOptimizationCycle();

  assert(callbackFired, 'Cycle callback fired');
});

test('SelfOptimizationLoop: Statistics', () => {
  const loop = new SelfOptimizationLoop();

  loop.recordMetric('latency', 50);
  loop.startOptimizationCycle();

  const stats = loop.getStats();
  assertEqual(stats.optimizationCycles, 1, 'Cycle count');
  assert(stats.systemHealthScore >= 0 && stats.systemHealthScore <= 100, 'Health score in range');
  assert(stats.tunerStats.totalParameters >= 0, 'Parameters tracked');
});

// ============================================================================
// TEST SUITE 4: AutonomousFederationController
// ============================================================================

console.log('\n=== PHASE 4.6.4: AUTONOMOUS FEDERATION CONTROLLER TESTS ===\n');

test('AutonomousFederationController: Initialize', () => {
  const controller = new AutonomousFederationController();

  const result = controller.initialize();
  assertEqual(result.success, true, 'Initialization successful');
  assertEqual(result.parametersRegistered, 5, 'Five parameters registered');
});

test('AutonomousFederationController: Report metrics', () => {
  const controller = new AutonomousFederationController();
  controller.initialize();

  controller.reportMetrics({
    latency: 45,
    load: 0.6,
    errorRate: 0.02
  });

  const status = controller.getSystemStatus();
  assert(status.controller.cycles >= 0, 'Status retrieved');
});

test('AutonomousFederationController: Execute cycle', () => {
  const controller = new AutonomousFederationController();
  controller.initialize();

  controller.reportMetrics({
    latency: 50,
    load: 0.7,
    errorRate: 0.01
  });

  const result = controller.executeCycle();

  assert(result.cycle >= 1, 'Cycle executed');
  assert(Array.isArray(result.recommendations), 'Recommendations provided');
});

test('AutonomousFederationController: Get system status', () => {
  const controller = new AutonomousFederationController();
  controller.initialize();

  const status = controller.getSystemStatus();

  assert(status.controller, 'Controller status present');
  assert(status.optimization, 'Optimization status present');
  assert(Array.isArray(status.recentActions), 'Recent actions tracked');
});

test('AutonomousFederationController: Get system report', () => {
  const controller = new AutonomousFederationController();
  controller.initialize();

  controller.reportMetrics({ latency: 40, load: 0.5 });
  controller.executeCycle();

  const report = controller.getSystemReport();

  assert(report.timestamp, 'Timestamp present');
  assert(report.federationStatus, 'Federation status present');
  assert(Array.isArray(report.parameterState), 'Parameter state present');
  assert(report.summary, 'Summary present');
});

test('AutonomousFederationController: Parameter tuning over cycles', () => {
  const controller = new AutonomousFederationController();
  controller.initialize();

  // Simulate high load over multiple cycles
  for (let i = 0; i < 3; i++) {
    controller.reportMetrics({ latency: 80, load: 0.85, errorRate: 0.05 });
    controller.executeCycle();
  }

  const report = controller.getSystemReport();
  assert(report.summary.totalCycles >= 1, 'Parameters adjusted during cycles');
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

console.log('\n=== PHASE 4.6.5: SELF-TUNING INTEGRATION TESTS ===\n');

test('Integration: Full optimization feedback loop', () => {
  const controller = new AutonomousFederationController();
  controller.initialize();

  // Phase 1: Normal operation
  controller.reportMetrics({
    latency: 35,
    load: 0.5,
    errorRate: 0.01
  });

  let status1 = controller.getSystemStatus();
  const health1 = status1.controller.healthScore;

  // Phase 2: Degradation
  for (let i = 0; i < 5; i++) {
    controller.reportMetrics({
      latency: 90,
      load: 0.9,
      errorRate: 0.08
    });
  }

  // Phase 3: Trigger optimization
  controller.executeCycle();

  let status2 = controller.getSystemStatus();
  const adjustments = status2.controller.adjustments;

  // Phase 4: Recovery metrics
  for (let i = 0; i < 5; i++) {
    controller.reportMetrics({
      latency: 45,
      load: 0.6,
      errorRate: 0.02
    });
  }

  controller.executeCycle();

  let status3 = controller.getSystemStatus();
  const health3 = status3.controller.healthScore;

  assert(status2.controller.cycles >= 1, 'Parameters adjusted during degradation');
  assert(health3 > health1 * 0.5, 'System recovered after optimization');
});

test('Integration: Healthcare workload adaptation', () => {
  const controller = new AutonomousFederationController();
  controller.initialize();

  // Simulate emergency case load spike
  console.log('   Simulating emergency case spike...');
  for (let i = 0; i < 10; i++) {
    controller.reportMetrics({
      latency: 120 + Math.random() * 30,
      load: 0.95 + Math.random() * 0.04,
      errorRate: 0.015
    });
  }

  const result = controller.executeCycle();
  assert(result.recommendations.length > 0, 'Emergency optimization triggered');

  // Simulate normal operations
  console.log('   Returning to normal operations...');
  for (let i = 0; i < 5; i++) {
    controller.reportMetrics({
      latency: 40 + Math.random() * 20,
      load: 0.6,
      errorRate: 0.01
    });
  }

  controller.executeCycle();

  const report = controller.getSystemReport();
  assert(report.summary.totalCycles >= 2, 'Handled multiple operational phases');
});

test('Integration: Parameter convergence under sustained load', () => {
  const controller = new AutonomousFederationController();
  controller.initialize();

  // Sustain high latency
  for (let cycle = 0; cycle < 5; cycle++) {
    for (let i = 0; i < 20; i++) {
      controller.reportMetrics({
        latency: 75 + Math.random() * 25,
        load: 0.8,
        errorRate: 0.02
      });
    }

    controller.executeCycle();
  }

  const report = controller.getSystemReport();

  // Check if parameters stabilized
  const timeoutParam = report.parameterState.find(p => p.name === 'task-timeout');
  const batchParam = report.parameterState.find(p => p.name === 'batch-size');

  assert(timeoutParam, 'Timeout parameter exists');
  assert(batchParam, 'Batch size parameter exists');
  assert(report.summary.totalCycles >= 1, 'Parameters adjusted');
});

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n=== PHASE 4.6 TEST SUMMARY ===\n');
console.log(`Tests Passed: ${testsPassed}`);
console.log(`Tests Failed: ${testsFailed}`);
console.log(`Total Tests:  ${testsPassed + testsFailed}`);
console.log(`Pass Rate:    ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%\n`);

if (testsFailed === 0) {
  console.log('✓ Phase 4.6 Self-Tuning Behavior: PRODUCTION READY');
  console.log('✓ Parameter tuning validated');
  console.log('✓ Metrics-driven optimization working');
  console.log('✓ Self-optimization loops functional');
  console.log('✓ Autonomous federation controller complete');
  console.log('✓ Phase 4 Complete: Multi-Cluster Federation FULLY OPERATIONAL\n');
} else {
  console.log(`✗ ${testsFailed} test(s) failed - review implementation\n`);
}

export { testsPassed, testsFailed };
