/**
 * Health Monitoring Test - demonstrate health monitoring features
 */

import { createHealthMonitor } from './utils/health-monitor.js';
import { createMedicalOrchestrator } from './medical-workflows.js';

console.log('=== HEALTH MONITORING TEST ===\n');

// Create health monitor and orchestrator
const healthMonitor = createHealthMonitor({
  failureRateThreshold: 0.2,  // 20%
  avgExecutionTimeThreshold: 10,  // 10ms
  lowConfidenceThreshold: 0.3  // 30%
});

const orchestrator = createMedicalOrchestrator();
const metrics = healthMonitor.getMetrics();

// Test 1: Run successful pipelines
console.log('1. Running 5 successful pipelines...');
for (let i = 0; i < 5; i++) {
  const input = {
    raw: {
      reportedItems: ['headache', 'fever'],
      severity: 'moderate'
    },
    source: 'test',
    timestamp: new Date().toISOString()
  };

  metrics.recordPipelineStart();
  const start = Date.now();
  try {
    const result = await orchestrator.executePipeline(input);
    const executionTime = Date.now() - start;
    metrics.recordPipelineSuccess(executionTime, result);

    // Record agent executions
    if (result.state.processedBy) {
      for (const agentId of result.state.processedBy) {
        metrics.recordAgentExecution(agentId, 'AGENT', 2, true);
      }
    }
  } catch (error) {
    const executionTime = Date.now() - start;
    metrics.recordPipelineFailure(executionTime, error);
  }
}

console.log('\n2.Current Metrics Summary:');
console.log(JSON.stringify(metrics.getSummary(), null, 2));

console.log('\n3. Health Status:');
const health1 = healthMonitor.getHealthStatus();
console.log(`Status: ${health1.status}`);
console.log(`Alerts: ${health1.alerts.length > 0 ? JSON.stringify(health1.alerts, null, 2) : 'None'}`);

// Test 2: Add some failures
console.log('\n4. Simulating 2 failures...');
for (let i = 0; i < 2; i++) {
  metrics.recordPipelineStart();
  metrics.recordPipelineFailure(5, { name: 'ValidationError', message: 'Test error' });
}

console.log('\n5. Updated Metrics Summary:');
console.log(JSON.stringify(metrics.getSummary(), null, 2));

console.log('\n6. Updated Health Status:');
const health2 = healthMonitor.getHealthStatus();
console.log(`Status: ${health2.status}`);
console.log(`Alerts: ${health2.alerts.length > 0 ? JSON.stringify(health2.alerts, null, 2) : 'None'}`);

// Test 3: Full health report
console.log('\n7. Full Health Report:');
const report = healthMonitor.getHealthReport();
console.log(JSON.stringify(report, null, 2));

// Test 4: Agent-specific metrics
console.log('\n8. Agent-Specific Metrics:');
const allMetrics = metrics.getMetrics();
for (const [agentId, agentMetrics] of Object.entries(allMetrics.agentMetrics)) {
  console.log(`\n${agentId}:
  - Executions: ${agentMetrics.executions}
  - Success Rate: ${(agentMetrics.successes / agentMetrics.executions * 100).toFixed(2)}%
  - Avg Time: ${agentMetrics.avgTime.toFixed(2)}ms
  - Min/Max: ${agentMetrics.minTime}ms / ${agentMetrics.maxTime}ms`);
}

console.log('\n=== HEALTH MONITORING TEST COMPLETE ===');
