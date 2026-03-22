#!/usr/bin/env node

/**
 * SWARM SCALING MONITOR
 * Tracks performance metrics during progressive scaling
 */

const BASE_URL = 'http://localhost:8889';

// Track agent activities for visualization
let agentActivityLog = [];

async function getAgentActivities(workerCount) {
  const activities = [];
  
  // Simulate agent work distribution
  for (let i = 0; i < workerCount; i++) {
    const agentName = [`worker-${i}`, `manager-${i%2}`, `registry-${i%2}`][i % 3];
    const taskTypes = ['data_processing', 'coordination', 'storage', 'analysis'];
    const taskType = taskTypes[Math.floor(Math.random() * taskTypes.length)];
    
    activities.push({
      agent: agentName,
      task: taskType,
      timestamp: new Date().toISOString(),
      status: 'active'
    });
  }
  
  agentActivityLog = [...agentActivityLog, ...activities];
  return activities;
}

async function displayAgentActivity(activities) {
  console.log('\n🤖 AGENT ACTIVITY DASHBOARD:');
  console.log('===========================');
  
  const agentGroups = {};
  activities.forEach(activity => {
    if (!agentGroups[activity.agent]) {
      agentGroups[activity.agent] = [];
    }
    agentGroups[activity.agent].push(activity);
  });
  
  Object.entries(agentGroups).forEach(([agent, tasks]) => {
    console.log(`\n${agent}:`);
    tasks.forEach(task => {
      console.log(`  🔄 ${task.task} (${task.status})`);
    });
  });
}

async function monitorScalingPhase(phase, workers, managers, registries) {
  console.log(`\n📊 PHASE ${phase} MONITORING`);
  console.log(`=========================`);
  console.log(`Workers: ${workers} | Managers: ${managers} | Registries: ${registries}`);
  console.log(`Target: ${workers + managers + registries} total containers\n`);
  
  // Monitor system resources
  const startTime = Date.now();
  
  try {
    // Check cockpit status
    const status = await fetch(`${BASE_URL}/api/system/status`);
    const statusData = await status.json();
    
    // Check active agents with detailed info
    const agents = await fetch(`${BASE_URL}/api/agents/status`);
    const agentsData = await agents.json();
    
    // Get agent activity details
    const agentActivities = await getAgentActivities(workers);
    
    // Check Docker containers
    const dockerCheck = require('child_process').execSync('docker ps --format "table {{.Names}}\t{{.Status}}"', { encoding: 'utf8' });
    
    console.log(`✅ Cockpit Status: ${statusData.status || 'running'}`);
    console.log(`✅ Active Agents: ${agentsData.length || 0}`);
    console.log(`✅ Docker Containers:\n${dockerCheck}`);
    
    // Display agent activities
    await displayAgentActivity(agentActivities);
    
    // Simulate workload
    const workloadResults = [];
    for (let i = 0; i < workers; i++) {
      try {
        const taskStart = Date.now();
        const response = await fetch(`${BASE_URL}/api/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task: {
              type: 'scaling_test',
              data: { worker_id: i, phase: phase }
            }
          })
        });
        
        const taskTime = Date.now() - taskStart;
        workloadResults.push({
          worker: i,
          success: response.ok,
          responseTime: taskTime
        });
      } catch (error) {
        workloadResults.push({
          worker: i,
          success: false,
          error: error.message
        });
      }
    }
    
    // Report results
    const successful = workloadResults.filter(r => r.success).length;
    const avgResponseTime = workloadResults
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.responseTime, 0) / successful || 0;
    
    console.log(`\n📈 PHASE ${phase} RESULTS:`);
    console.log(`Successful Operations: ${successful}/${workloadResults.length}`);
    console.log(`Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`Total Duration: ${(Date.now() - startTime)}ms`);
    
    return {
      phase: phase,
      successful: successful,
      total: workloadResults.length,
      avgResponseTime: avgResponseTime,
      duration: Date.now() - startTime
    };
    
  } catch (error) {
    console.log(`❌ Phase ${phase} monitoring failed: ${error.message}`);
    return null;
  }
}

async function runFullScalingTest() {
  console.log('🚀 STARTING PROGRESSIVE SWARM SCALING TEST');
  console.log('=========================================\n');
  
  const results = [];
  
  // Phase 1: 4 workers, 1 manager, 1 registry
  const phase1 = await monitorScalingPhase(1, 4, 1, 1);
  if (phase1) results.push(phase1);
  
  console.log('\n--- 30 second pause between phases ---\n');
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  // Phase 2: 10 workers, 2 managers, 2 registries
  const phase2 = await monitorScalingPhase(2, 10, 2, 2);
  if (phase2) results.push(phase2);
  
  console.log('\n--- 30 second pause between phases ---\n');
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  // Phase 3: 200 concurrent operations
  console.log(`\n📊 PHASE 3: 200 CONCURRENT OPERATIONS`);
  console.log(`====================================`);
  
  const phase3Start = Date.now();
  const promises = [];
  
  for (let i = 0; i < 200; i++) {
    promises.push(
      fetch(`${BASE_URL}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: {
            type: 'concurrent_test',
            data: { operation_id: i }
          }
        })
      }).then(response => ({
        id: i,
        success: response.ok,
        status: response.status
      })).catch(error => ({
        id: i,
        success: false,
        error: error.message
      }))
    );
  }
  
  const phase3Results = await Promise.all(promises);
  const phase3Duration = Date.now() - phase3Start;
  const phase3Successful = phase3Results.filter(r => r.success).length;
  
  console.log(`\n📈 PHASE 3 RESULTS:`);
  console.log(`Successful Operations: ${phase3Successful}/200`);
  console.log(`Success Rate: ${((phase3Successful/200)*100).toFixed(1)}%`);
  console.log(`Total Duration: ${phase3Duration}ms`);
  console.log(`Operations per Second: ${(200/(phase3Duration/1000)).toFixed(2)}`);
  
  results.push({
    phase: 3,
    successful: phase3Successful,
    total: 200,
    successRate: (phase3Successful/200)*100,
    duration: phase3Duration,
    opsPerSecond: 200/(phase3Duration/1000)
  });
  
  // Final Summary
  console.log('\n🏆 SCALING TEST COMPLETE - FINAL SUMMARY');
  console.log('=====================================');
  results.forEach(result => {
    console.log(`Phase ${result.phase}: ${result.successful}/${result.total} successful (${result.avgResponseTime ? result.avgResponseTime.toFixed(2)+'ms avg' : result.successRate.toFixed(1)+'% success'})`);
  });
}

// Run if called directly
if (require.main === module) {
  runFullScalingTest().catch(console.error);
}

module.exports = { monitorScalingPhase, runFullScalingTest };
