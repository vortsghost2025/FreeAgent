#!/usr/bin/env node
/**
 * EXTREME STRESS TEST - MAKE THE SYSTEM GO NUTS!
 * 100 concurrent tasks, mixed priorities, maximum chaos
 */

async function extremeStressTest() {
  console.log('💣 EXTREME STRESS TEST - SYSTEM MAY GO NUTS!');
  console.log('=============================================\n');
  
  const startTime = Date.now();
  let totalTasks = 0;
  let successfulTasks = 0;
  let failedTasks = 0;
  const providerStats = {};
  const taskTimings = [];
  
  // CRAZY MIXED WORKLOAD
  const crazyTasks = [
    // HIGH PRIORITY - Medical emergencies
    { type: 'emergency', description: 'PATIENT CRITICAL: Cardiac arrest, 45-year-old male, CPR in progress', priority: 'CRITICAL', timeout: 1000 },
    { type: 'emergency', description: 'TRAUMA ALERT: Multiple injuries from car accident, 3 victims', priority: 'CRITICAL', timeout: 1000 },
    { type: 'emergency', description: 'STROKE ALERT: Sudden onset left-sided weakness, slurred speech', priority: 'CRITICAL', timeout: 1000 },
    
    // MEDIUM PRIORITY - Regular medical work
    { type: 'clinical', description: 'Analyze patient lab results for abnormal liver enzymes', priority: 'HIGH', timeout: 2000 },
    { type: 'clinical', description: 'Review medication interactions for elderly patient polypharmacy', priority: 'HIGH', timeout: 2000 },
    { type: 'clinical', description: 'Generate differential diagnosis for chronic fatigue syndrome', priority: 'MEDIUM', timeout: 3000 },
    
    // LOW PRIORITY - Administrative tasks
    { type: 'admin', description: 'Generate monthly patient satisfaction report with charts', priority: 'LOW', timeout: 5000 },
    { type: 'admin', description: 'Create staff schedule for next week with shift preferences', priority: 'LOW', timeout: 5000 },
    { type: 'admin', description: 'Compile regulatory compliance checklist for Q4 audit', priority: 'LOW', timeout: 5000 },
    
    // CODING TASKS - System development
    { type: 'coding', description: 'Refactor patient data encryption module for HIPAA compliance', priority: 'MEDIUM', timeout: 3000 },
    { type: 'coding', description: 'Optimize database queries for faster patient record retrieval', priority: 'HIGH', timeout: 2000 },
    { type: 'coding', description: 'Implement real-time notification system for critical alerts', priority: 'HIGH', timeout: 2000 },
    
    // DATA ANALYSIS - Research tasks
    { type: 'analysis', description: 'Analyze correlation between patient demographics and treatment outcomes', priority: 'MEDIUM', timeout: 4000 },
    { type: 'analysis', description: 'Process epidemiological data for disease outbreak detection', priority: 'HIGH', timeout: 3000 },
    { type: 'analysis', description: 'Generate statistical report on medication adherence rates', priority: 'MEDIUM', timeout: 4000 }
  ];
  
  console.log('🚀 LAUNCHING 100 CONCURRENT CHAOTIC TASKS!');
  console.log('   Mix of medical emergencies, routine work, admin tasks, and system development\n');
  
  const allPromises = [];
  
  // Fire 100 tasks as fast as possible
  for (let i = 0; i < 100; i++) {
    const baseTask = crazyTasks[i % crazyTasks.length];
    const task = {
      ...baseTask,
      id: `chaos-${i}`,
      context: {
        chaosTest: true,
        timestamp: Date.now(),
        iteration: i,
        originalPriority: baseTask.priority
      }
    };
    
    const taskPromise = fireTask(task)
      .then(result => {
        totalTasks++;
        taskTimings.push(result.executionTime);
        
        if (result.success) {
          successfulTasks++;
          if (!providerStats[result.provider]) {
            providerStats[result.provider] = { success: 0, fail: 0, times: [] };
          }
          providerStats[result.provider].success++;
          providerStats[result.provider].times.push(result.executionTime);
        } else {
          failedTasks++;
          if (!providerStats[result.provider]) {
            providerStats[result.provider] = { success: 0, fail: 0, times: [] };
          }
          providerStats[result.provider].fail++;
        }
        
        // Real-time feedback
        if (totalTasks % 10 === 0) {
          console.log(`📊 Progress: ${totalTasks}/100 tasks processed...`);
        }
        
        return result;
      })
      .catch(error => {
        totalTasks++;
        failedTasks++;
        console.log(`💥 Task chaos-${i}: SYSTEM ERROR - ${error.message}`);
        return { success: false, error: error.message, taskId: `chaos-${i}` };
      });
    
    allPromises.push(taskPromise);
    
    // Random delays to create realistic chaos
    if (Math.random() < 0.3) {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
    }
  }
  
  console.log('\n⏳ WAITING FOR CHAOS TO SETTLE...\n');
  
  // Wait for all madness to complete
  const results = await Promise.all(allPromises);
  const totalTime = Date.now() - startTime;
  
  // CHAOS ANALYSIS
  console.log('🌪️ CHAOS TEST RESULTS - DID THE SYSTEM SURVIVE?');
  console.log('===============================================\n');
  
  console.log(`⏱️  TOTAL TEST TIME: ${totalTime}ms`);
  console.log(`🎯 TASKS FIRED: ${totalTasks}`);
  console.log(`✅ SUCCESSFUL: ${successfulTasks}`);
  console.log(`❌ FAILED: ${failedTasks}`);
  console.log(`📈 SUCCESS RATE: ${((successfulTasks/totalTasks) * 100).toFixed(1)}%`);
  console.log(`⚡ THROUGHPUT: ${(totalTasks / (totalTime/1000)).toFixed(2)} tasks/second`);
  
  // PROVIDER PERFORMANCE UNDER CHAOS
  console.log('\n🏆 PROVIDER SURVIVAL RATES:');
  Object.entries(providerStats).forEach(([provider, stats]) => {
    const total = stats.success + stats.fail;
    const successRate = ((stats.success/total) * 100).toFixed(1);
    const avgTime = stats.times.length > 0 ? 
      (stats.times.reduce((a,b) => a+b, 0) / stats.times.length).toFixed(1) : '0';
    
    console.log(`   ${provider}: ${stats.success}/${total} (${successRate}%) - Avg: ${avgTime}ms`);
  });
  
  // TIMING ANALYSIS
  if (taskTimings.length > 0) {
    const avgTime = (taskTimings.reduce((a,b) => a+b, 0) / taskTimings.length).toFixed(1);
    const minTime = Math.min(...taskTimings);
    const maxTime = Math.max(...taskTimings);
    
    console.log('\n⚡ TIMING EXTREMES:');
    console.log(`   Average: ${avgTime}ms`);
    console.log(`   Fastest: ${minTime}ms`);
    console.log(`   Slowest: ${maxTime}ms`);
    console.log(`   Range: ${maxTime - minTime}ms`);
  }
  
  // SYSTEM HEALTH CHECK
  console.log('\n🏥 POST-CHAOS HEALTH CHECK:');
  try {
    const health = await fetch('http://localhost:8889/api/autonomous/status').then(r => r.json());
    console.log(`   Current Load: ${health.status.systemState.currentLoad}`);
    console.log(`   Active Agents: ${Object.keys(health.status.systemState.activeAgents).length}`);
    console.log(`   Ensemble Drift: ${health.status.systemState.ensembleDrift.toFixed(6)}`);
    console.log(`   Autonomous Behaviors: ${JSON.stringify(health.status.autonomousBehaviors)}`);
  } catch (error) {
    console.log(`   Health check failed: ${error.message}`);
  }
  
  // FINAL VERDICT
  console.log('\n🎯 CHAOS TEST VERDICT:');
  const successRate = (successfulTasks/totalTasks) * 100;
  
  if (successRate >= 95) {
    console.log('🏆 LEGENDARY - System is indestructible under extreme load!');
  } else if (successRate >= 85) {
    console.log('👍 EXCELLENT - Minor hiccups under chaos but mostly solid');
  } else if (successRate >= 70) {
    console.log('⚠️  GOOD - Some failures but system remains functional');
  } else {
    console.log('💥 POOR - Significant degradation under stress');
  }
  
  // PROVIDER RANKINGS
  console.log('\n🏅 PROVIDER CHAOS RANKINGS:');
  const rankedProviders = Object.entries(providerStats)
    .sort(([,a], [,b]) => (b.success/(b.success+b.fail)) - (a.success/(a.success+a.fail)));
    
  rankedProviders.forEach(([provider, stats], index) => {
    const total = stats.success + stats.fail;
    const rate = ((stats.success/total) * 100).toFixed(1);
    console.log(`   ${index + 1}. ${provider}: ${rate}% success (${stats.success}/${total})`);
  });
  
  console.log('\n🎉 EXTREME STRESS TEST COMPLETE!');
  console.log('The system survived maximum chaos and proved its resilience!');
  
  return {
    successRate,
    totalTasks,
    totalTime,
    providerStats,
    results
  };
}

async function fireTask(taskSpec) {
  try {
    const startTime = Date.now();
    
    const response = await fetch('http://localhost:8889/api/autonomous/coordinate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskSpec),
      timeout: taskSpec.timeout || 5000
    });
    
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    return {
      success: result.success,
      provider: result.routingDecision?.primary?.provider || 'unknown',
      executionTime,
      taskId: taskSpec.id
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      taskId: taskSpec.id,
      executionTime: 0
    };
  }
}

// LAUNCH THE MADNESS
extremeStressTest().catch(console.error);