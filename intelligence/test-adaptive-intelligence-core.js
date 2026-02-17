// Test for AdaptiveIntelligenceCore
import { AdaptiveIntelligenceCore } from './adaptive-intelligence-core.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function testAdaptiveIntelligenceCore() {
  const core = new AdaptiveIntelligenceCore();

  // Feed metrics
  core.observe({ name: 'latency', value: 10 });
  core.observe({ name: 'latency', value: 12 });
  core.observe({ name: 'latency', value: 15 });
  core.observe({ name: 'latency', value: 40 }); // anomaly
  core.observe({ name: 'throughput', value: 100 });
  core.observe({ name: 'throughput', value: 120 });
  core.observe({ name: 'throughput', value: 130 });
  core.observe({ name: 'throughput', value: 140 });

  const state = core.getState();

  // Patterns: 'latency' and 'throughput' both >2
  assert(state.patterns.includes('latency'), 'Should detect pattern for latency');
  assert(state.patterns.includes('throughput'), 'Should detect pattern for throughput');

  // Anomalies: latency=40 is >3x mean
  assert(state.anomalies.some(m => m.name === 'latency' && m.value === 40), 'Should detect latency anomaly');

  // Trends: latency up, throughput up
  const latencyTrend = state.trends.find(t => t.name === 'latency');
  assert(latencyTrend && latencyTrend.trend === 'up', 'Latency trend should be up');
  const throughputTrend = state.trends.find(t => t.name === 'throughput');
  assert(throughputTrend && throughputTrend.trend === 'up', 'Throughput trend should be up');

  // Predictions
  const latencyPred = state.predictions.find(p => p.name === 'latency');
  assert(latencyPred && latencyPred.prediction === 'increase', 'Latency prediction should be increase');

  console.log('All AdaptiveIntelligenceCore tests passed!');
}

testAdaptiveIntelligenceCore();
