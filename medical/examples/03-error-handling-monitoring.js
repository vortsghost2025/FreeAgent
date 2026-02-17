/**
 * EXAMPLE 3: Error Handling & Health Monitoring
 *
 * This example shows proper error handling and health monitoring.
 */

import { createMedicalOrchestrator } from '../medical-workflows.js';
import { ValidationError, AgentError } from '../utils/validators.js';
import { createHealthMonitor } from '../utils/health-monitor.js';
import { createLogger, LogLevel } from '../utils/logger.js';

async function errorHandlingExample() {
  console.log('=== EXAMPLE 3: Error Handling & Health Monitoring ===\n');

  // Setup
  const orchestrator = createMedicalOrchestrator();
  const healthMonitor = createHealthMonitor({
    failureRateThreshold: 0.2,
    avgExecutionTimeThreshold: 10,
    lowConfidenceThreshold: 0.3
  });
  const metrics = healthMonitor.getMetrics();

  const logger = createLogger({
    level: LogLevel.INFO,
    format: 'compact'
  });

  // Test inputs (mix of valid and invalid)
  const inputs = [
    // Valid inputs
    { raw: { reportedItems: ['fever'], severity: 'mild' }, source: 'test', timestamp: new Date().toISOString() },
    { raw: { testName: 'CBC', value: 10 }, source: 'test', timestamp: new Date().toISOString() },
    { raw: { studyType: 'X-Ray', impression: 'Normal' }, source: 'test', timestamp: new Date().toISOString() },

    // Invalid inputs (will trigger errors)
    null, // Null input
    undefined, // Undefined input
    { raw: {} }, // Empty object
    { notRaw: 'bad structure' } // Wrong structure
  ];

  console.log('--- Processing Inputs with Error Handling ---\n');

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    metrics.recordPipelineStart();
    const start = Date.now();

    try {
      logger.info('pipeline', `Processing input ${i + 1}/${inputs.length}`);

      const result = await orchestrator.executePipeline(input);
      const executionTime = Date.now() - start;

      metrics.recordPipelineSuccess(executionTime, result);

      console.log(`✓ Input ${i + 1}: SUCCESS`);
      console.log(`  Type: ${result.output.classification.type}`);
      console.log(`  Risk: ${result.output.riskScore.severity}`);
      console.log(`  Time: ${executionTime}ms`);

      // Record agent executions
      if (result.state.processedBy) {
        for (const agentId of result.state.processedBy) {
          metrics.recordAgentExecution(agentId, 'AGENT', executionTime / 5, true);
        }
      }
    } catch (error) {
      const executionTime = Date.now() - start;
      metrics.recordPipelineFailure(executionTime, error);

      console.log(`✗ Input ${i + 1}: FAILED`);

      // Handle specific error types
      if (error instanceof ValidationError) {
        console.log(`  Error Type: ValidationError`);
        console.log(`  Field: ${error.field}`);
        console.log(`  Message: ${error.message}`);
        logger.error('validation', error.message, { field: error.field });
      } else if (error instanceof AgentError) {
        console.log(`  Error Type: AgentError`);
        console.log(`  Agent: ${error.agentId}`);
        console.log(`  Phase: ${error.phase}`);
        console.log(`  Message: ${error.message}`);
        logger.error(error.agentId, error.message, { phase: error.phase });
      } else {
        console.log(`  Error Type: ${error.name || 'UnknownError'}`);
        console.log(`  Message: ${error.message}`);
        logger.error('pipeline', error.message);
      }
    }

    console.log('');
  }

  // Health check
  console.log('--- Health Status ---\n');
  const health = healthMonitor.getHealthStatus();

  console.log(`Status: ${health.status.toUpperCase()}`);
  console.log(`Timestamp: ${health.timestamp}`);

  if (health.alerts.length > 0) {
    console.log('\nAlerts:');
    health.alerts.forEach((alert, i) => {
      console.log(`  ${i + 1}. [${alert.level.toUpperCase()}] ${alert.type}`);
      console.log(`     ${alert.message}`);
      if (alert.agentId) {
        console.log(`     Agent: ${alert.agentId}`);
      }
    });
  } else {
    console.log('\nNo alerts');
  }

  // Metrics summary
  console.log('\n--- Metrics Summary ---\n');
  const summary = metrics.getSummary();

  console.log('Overview:');
  console.log(`  Total Executions: ${summary.overview.totalExecutions}`);
  console.log(`  Successes: ${summary.overview.successes}`);
  console.log(`  Failures: ${summary.overview.failures}`);
  console.log(`  Success Rate: ${summary.overview.successRate}`);

  console.log('\nPerformance:');
  console.log(`  Avg Execution Time: ${summary.performance.avgExecutionTime}`);
  console.log(`  Min Execution Time: ${summary.performance.minExecutionTime}`);
  console.log(`  Max Execution Time: ${summary.performance.maxExecutionTime}`);

  console.log('\nClassifications:');
  Object.entries(summary.classification).forEach(([type, count]) => {
    if (count > 0) {
      console.log(`  ${type}: ${count}`);
    }
  });

  console.log('\nRisk Distribution:');
  Object.entries(summary.risk).forEach(([severity, count]) => {
    if (count > 0) {
      console.log(`  ${severity}: ${count}`);
    }
  });

  console.log('\nData Quality:');
  console.log(`  Low Confidence: ${summary.dataQuality.lowConfidence}`);
  console.log(`  Partial Extractions: ${summary.dataQuality.partialExtractions}`);
  console.log(`  Missing Fields: ${summary.dataQuality.missingFields}`);

  console.log('\nErrors:');
  console.log(`  Validation Errors: ${summary.errors.validationErrors}`);
  console.log(`  Timeout Errors: ${summary.errors.timeoutErrors}`);
  if (Object.keys(summary.errors.byType).length > 0) {
    console.log('  By Type:');
    Object.entries(summary.errors.byType).forEach(([type, count]) => {
      console.log(`    ${type}: ${count}`);
    });
  }

  console.log('\n--- Agent-Level Metrics ---\n');
  const allMetrics = metrics.getMetrics();
 for (const [agentId, agentMetrics] of Object.entries(allMetrics.agentMetrics)) {
    if (agentMetrics.executions > 0) {
      const successRate = (agentMetrics.successes / agentMetrics.executions * 100).toFixed(0);
      console.log(`${agentId}:`);
      console.log(`  Executions: ${agentMetrics.executions}`);
      console.log(`  Success Rate: ${successRate}%`);
      console.log(`  Avg Time: ${agentMetrics.avgTime.toFixed(2)}ms`);
    }
  }
}

// Run example
errorHandlingExample().catch(console.error);
