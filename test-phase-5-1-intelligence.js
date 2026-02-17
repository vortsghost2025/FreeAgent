/**
 * Phase 5.1: Adaptive Intelligence Core Tests
 */

import {
  PatternDetector,
  AnomalyDetector,
  TrendAnalyzer,
  PredictiveScorer,
  AdaptiveIntelligenceEngine
} from './medical/intelligence/adaptive-intelligence.js';

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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

console.log('\n=== PHASE 5.1: ADAPTIVE INTELLIGENCE CORE ===\n');

test('PatternDetector: Record observations', () => {
  const detector = new PatternDetector();
  detector.recordObservation('metric', 50);
  detector.recordObservation('metric', 52);
  assert(detector.timeSeries.has('metric'), 'Observations recorded');
});

test('AnomalyDetector: Establish baseline', () => {
  const detector = new AnomalyDetector();
  const values = [50, 51, 49, 50, 50, 51, 49, 50, 50, 51];
  detector.establishBaseline('latency', values);
  assert(detector.baselines.has('latency'), 'Baseline established');
});

test('AnomalyDetector: Detect anomaly', () => {
  const detector = new AnomalyDetector({ sensitivity: 0.95 });
  const values = [50, 51, 49, 50, 50, 51, 49, 50, 50, 51];
  detector.establishBaseline('latency', values);
  const anomaly = detector.detectAnomaly('latency', 500);
  assert(anomaly !== null, 'Anomaly detected');
});

test('TrendAnalyzer: Analyze trend', () => {
  const analyzer = new TrendAnalyzer();
  const values = Array.from({ length: 20 }, (_, i) => 10 + i * 2);
  const trend = analyzer.analyzeTrend('metric', values);
  assert(trend !== null, 'Trend analyzed');
});

test('PredictiveScorer: Score metric', () => {
  const scorer = new PredictiveScorer();
  const score = scorer.scoreMetric('latency', 50, 40, { direction: 'UP' });
  assert(score.score >= 0 && score.score <= 100, 'Score valid');
});

test('AdaptiveIntelligenceEngine: Initialize', () => {
  const engine = new AdaptiveIntelligenceEngine();
  const result = engine.initialize({ latency: [45, 48, 50, 47, 49, 51, 48, 50] });
  assert(result.success, 'Engine initialized');
});

console.log(`\nTests: ${testsPassed}/${testsPassed + testsFailed} passed\n`);
export { testsPassed, testsFailed };
