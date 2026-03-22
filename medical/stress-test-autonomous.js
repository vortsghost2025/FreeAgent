#!/usr/bin/env node
/**
 * STRESS TEST: AUTONOMOUS ORCHESTRATION UNDER LOAD
 * Put the system through its paces while Kilo architects in the background
 */

async function runStressTest() {
  console.log('🏋️ AUTONOMOUS SYSTEM STRESS TEST');
  console.log('================================\n');
  
  const testStartTime = Date.now();
  let totalTasks = 0;
  let successfulTasks = 0;
  let providerUsage = {};
  
  // Test different task types under load
  const stressTasks = [
    { type: 'security', description: 'Analyze code for vulnerabilities in a complex medical application', priority: 'high' },
    { type: 'clinical', description: 'Review patient symptoms and suggest differential diagnoses', priority: 'critical' },
    { type: 'coding', description: 'Generate optimized React component for medical dashboard', priority: 'medium' },
    { type: 'data', description: 'Process patient vitals data and identify anomalies', priority: 'high' },
    { type: 'devops', description: 'Check system health and resource utilization', priority: 'low' },
    { type: 'api', description: 'Design RESTful endpoints for patient records system', priority: 'medium' },
    { type: 'test', description: 'Generate comprehensive test suite for authentication module', priority: 'medium' },
    { type: 'documentation', description: 'Create API documentation with examples', priority: 'low' }
  ];
  
  // Simulate concurrent load - 20 rapid tasks
  console.log('🚀 Launching 20 concurrent autonomous tasks...\n');
  
  const taskPromises = [];
  
  for (let i = 0; i < 20; i++) {
    const task = { ...stressTasks[i % stressTasks.length] };
    task.id = `stress-${i}`;
    task.context = { 
      stressTest: true, 
      timestamp: Date.now(),
      iteration: i
    };
    
    const taskPromise = submitAutonomousTask(task)
      .then(result => {
        totalTasks++;
        if (result.success) {
          successfulTasks++;
          if (!providerUsage[result.provider]) {
            providerUsage[result.provider] = 0;
          }
          providerUsage[result.provider]++;
          console.log(`✅ Task ${task.id}: ${result.provider} - ${result.executionTime}ms`);
        } else {
          console.log(`❌ Task ${task.id}: FAILED - ${result.error}`);
        }
        return result;
      })
      .catch(error => {
        totalTasks++;
        console.log(`💥 Task ${task.id}: ERROR - ${error.message}`);
        return { success: false, error: error.message };
      });
    
    taskPromises.push(taskPromise);
    
    // Stagger submissions slightly to simulate realistic load
    if (i % 5 === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // Wait for all tasks to complete
  console.log('\n⏳ Waiting for all tasks to complete...\n');
  const results = await Promise.all(taskPromises);
  
  const testDuration = Date.now() - testStartTime;
  
  // Analyze results
  console.log('📊 STRESS TEST RESULTS');
  console.log('=====================\n');
  
  console.log(`⏱️  Test Duration: ${testDuration}ms`);
  console.log(`🎯 Tasks Submitted: ${totalTasks}`);
  console.log(`✅ Successful: ${successfulTasks}`);
  console.log(`❌ Failed: ${totalTasks - successfulTasks}`);
  console.log(`📈 Success Rate: ${((successfulTasks/totalTasks) * 100).toFixed(1)}%`);
  console.log(`⚡ Throughput: ${(totalTasks / (testDuration/1000)).toFixed(2)} tasks/second`);
  
  console.log('\n🏆 PROVIDER PERFORMANCE UNDER LOAD:');
  Object.entries(providerUsage).forEach(([provider, count]) => {
    const percentage = ((count/totalTasks) * 100).toFixed(1);
    console.log(`   ${provider}: ${count} tasks (${percentage}%)`);
  });
  
  // Check system health during stress
  console.log('\n🏥 SYSTEM HEALTH CHECK:');
  try {
    const healthResponse = await fetch('http://localhost:8889/api/autonomous/status');
    const health = await healthResponse.json();
    
    console.log(`   Current Load: ${health.status.systemState.currentLoad}`);
    console.log(`   Active Agents: ${Object.keys(health.status.systemState.activeAgents).length}`);
    console.log(`   Ensemble Drift: ${health.status.systemState.ensembleDrift.toFixed(4)}`);
    console.log(`   Autonomous Behaviors: ${JSON.stringify(health.status.autonomousBehaviors)}`);
    
    // Provider score stability
    console.log('\n📊 PROVIDER SCORE STABILITY:');
    Object.entries(health.status.providerScores).forEach(([provider, score]) => {
      console.log(`   ${provider}: ${score.scorerScore.toFixed(3)} (${(score.performance.successRate * 100).toFixed(1)}% success)`);
    });
    
  } catch (error) {
    console.log(`   Health check failed: ${error.message}`);
  }
  
  // Performance analysis
  const executionTimes = results
    .filter(r => r.success)
    .map(r => r.executionTime);
    
  if (executionTimes.length > 0) {
    const avgTime = executionTimes.reduce((a,b) => a+b, 0) / executionTimes.length;
    const minTime = Math.min(...executionTimes);
    const maxTime = Math.max(...executionTimes);
    
    console.log('\n⚡ EXECUTION TIME ANALYSIS:');
    console.log(`   Average: ${avgTime.toFixed(1)}ms`);
    console.log(`   Minimum: ${minTime}ms`);
    console.log(`   Maximum: ${maxTime}ms`);
    console.log(`   Range: ${maxTime - minTime}ms`);
  }
  
  console.log('\n🎉 STRESS TEST COMPLETE!');
  
  // Final assessment
  const successRate = (successfulTasks/totalTasks) * 100;
  if (successRate >= 95) {
    console.log('🏆 EXCELLENT - System handles stress beautifully!');
  } else if (successRate >= 80) {
    console.log('👍 GOOD - Minor issues under heavy load');
  } else {
    console.log('⚠️  CONCERN - Significant performance degradation');
  }
  
  return {
    successRate,
    totalTasks,
    duration: testDuration,
    providerUsage,
    results
  };
}

async function submitAutonomousTask(taskSpec) {
  try {
    const response = await fetch('http://localhost:8889/api/autonomous/coordinate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskSpec)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    return {
      success: result.success,
      provider: result.routingDecision?.primary?.provider || 'unknown',
      executionTime: result.executionTime || 0,
      taskId: taskSpec.id
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      taskId: taskSpec.id
    };
  }
}

// Run the stress test
runStressTest().then(results => {
  console.log('\n📋 DETAILED METRICS SUMMARY:');
  console.log(JSON.stringify(results, null, 2));
}).catch(console.error);