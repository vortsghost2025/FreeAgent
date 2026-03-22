#!/usr/bin/env node
/**
 * Autonomous Orchestration Demonstration
 * Tests the dynamic provider scoring system
 */

import { quantumOrchestrator } from './utils/quantum-orchestrator.js';

async function demonstrateAutonomousOrchestration() {
  console.log('🚀 Autonomous Orchestration Demonstration');
  console.log('==========================================\n');
  
  // Initial state
  console.log('1. Initial Provider Scores:');
  let scores = quantumOrchestrator.getProviderScores();
  Object.entries(scores).forEach(([provider, data]) => {
    console.log(`   ${provider}: ${data.scorerScore.toFixed(3)} (calls: ${data.performance.totalCalls})`);
  });
  
  console.log('\n2. Running Sample Tasks...');
  
  // Run multiple tasks to generate performance data
  const tasks = [
    { agent: 'code', task: 'Generate a Python function', complexity: 'medium' },
    { agent: 'data', task: 'Analyze this dataset', complexity: 'high' },
    { agent: 'clinical', task: 'Diagnose patient symptoms', complexity: 'high' },
    { agent: 'security', task: 'Audit this code for vulnerabilities', complexity: 'medium' },
    { agent: 'test', task: 'Write unit tests', complexity: 'low' }
  ];
  
  // Execute tasks multiple times to build up metrics
  for (let i = 0; i < 15; i++) {
    const task = tasks[i % tasks.length];
    const result = await quantumOrchestrator.execute(task.agent, {
      task: task.task,
      complexity: task.complexity
    });
    
    if (i % 3 === 0) {
      console.log(`   Task ${i+1}: ${task.agent} → ${result.provider} (${result.latency}ms, ${result.success ? '✓' : '✗'})`);
    }
  }
  
  console.log('\n3. Updated Provider Scores:');
  scores = quantumOrchestrator.getProviderScores();
  Object.entries(scores).forEach(([provider, data]) => {
    const perf = data.performance;
    console.log(`   ${provider}: ${data.scorerScore.toFixed(3)} (${perf.totalCalls} calls, ${(perf.successRate * 100).toFixed(1)}% success, ${Math.round(perf.avgLatency)}ms avg)`);
  });
  
  console.log('\n4. Provider Ranking for Complex Task:');
  const complexTaskProvider = quantumOrchestrator.selectOptimalProvider({ complexity: 'high', type: 'analysis' });
  console.log(`   Selected: ${complexTaskProvider}`);
  
  console.log('\n5. Provider Ranking for Simple Task:');
  const simpleTaskProvider = quantumOrchestrator.selectOptimalProvider({ complexity: 'low', type: 'basic' });
  console.log(`   Selected: ${simpleTaskProvider}`);
  
  console.log('\n6. Final Performance Summary:');
  const totalCalls = Object.values(scores).reduce((sum, p) => sum + p.performance.totalCalls, 0);
  const avgSuccessRate = Object.values(scores)
    .filter(p => p.performance.totalCalls > 0)
    .reduce((sum, p) => sum + p.performance.successRate, 0) / 
    Object.values(scores).filter(p => p.performance.totalCalls > 0).length;
  
  console.log(`   Total API calls: ${totalCalls}`);
  console.log(`   Average success rate: ${(avgSuccessRate * 100).toFixed(1)}%`);
  console.log(`   Best performing provider: ${Object.entries(scores)
    .reduce((best, [prov, data]) => 
      data.scorerScore > (scores[best]?.scorerScore || 0) ? prov : best, 
      Object.keys(scores)[0]
    )}`);
  
  console.log('\n✅ Autonomous orchestration demonstration complete!');
  console.log('The system now makes intelligent provider selections based on:');
  console.log('- Historical performance (latency, success rate)');
  console.log('- Real-time metrics tracking');
  console.log('- Dynamic scoring algorithms');
  console.log('- Rate limit awareness');
}

// Run the demonstration
demonstrateAutonomousOrchestration().catch(console.error);