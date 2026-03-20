/**
 * Lingam Parallel Orchestration Demo
 * Demonstrates processing 60+ message queue with parallel workers
 * Shows the transformation from sequential to parallel processing
 */

import LingamOrchestrator from './lingam-orchestrator.js';

async function runParallelDemo() {
  console.log('🎭 Lingam Parallel Orchestration Demo');
  console.log('=====================================\n');
  
  // Initialize the orchestration system
  const orchestrator = new LingamOrchestrator({
    workerCount: 12,
    batchSize: 25,
    pollInterval: 300
  });
  
  await orchestrator.initialize();
  
  // Start the system
  await orchestrator.start('cockpit-demo');
  
  console.log('\n🚀 System Started - Monitoring Parallel Processing\n');
  
  // Display initial system status
  displaySystemStatus(orchestrator);
  
  // Simulate high-volume message load
  console.log('\n⚡ Injecting 60+ message burst...');
  await orchestrator.processBulkMessages(65);
  
  // Monitor processing for 30 seconds
  const monitoringInterval = setInterval(() => {
    displayProcessingProgress(orchestrator);
  }, 3000);
  
  // Run for 30 seconds to demonstrate parallel processing
  setTimeout(async () => {
    clearInterval(monitoringInterval);
    
    console.log('\n🎯 Demo Complete - Final Statistics:');
    displayFinalStats(orchestrator);
    
    // Stop the system
    await orchestrator.stop();
    
    console.log('\n✅ Parallel orchestration demo completed successfully!');
    process.exit(0);
  }, 30000);
}

function displaySystemStatus(orchestrator) {
  const stats = orchestrator.getStats();
  const workers = orchestrator.getWorkerStatus();
  
  console.log('📊 SYSTEM STATUS:');
  console.log(`   Workers: ${workers.length} active`);
  console.log(`   Queue: ${stats.taskBus.queueStats.queueLength} tasks`);
  console.log(`   Active Tasks: ${stats.taskBus.queueStats.activeTasks}`);
  console.log(`   Available Workers: ${stats.taskBus.queueStats.availableWorkers}`);
  
  console.log('\n🤖 WORKER DISTRIBUTION:');
  const capabilityCount = {};
  workers.forEach(worker => {
    worker.capabilities.forEach(cap => {
      capabilityCount[cap] = (capabilityCount[cap] || 0) + 1;
    });
  });
  
  Object.entries(capabilityCount).forEach(([cap, count]) => {
    console.log(`   ${cap}: ${count} workers`);
  });
}

function displayProcessingProgress(orchestrator) {
  const stats = orchestrator.getStats();
  const workers = orchestrator.getWorkerStatus();
  const queue = orchestrator.getQueueSnapshot();
  
  const busyWorkers = workers.filter(w => w.status === 'busy').length;
  const idleWorkers = workers.filter(w => w.status === 'idle').length;
  
  console.log(`\n⏱️  PROGRESS UPDATE:`);
  console.log(`   Messages Processed: ${stats.supervisor.messagesProcessed}`);
  console.log(`   Tasks Dispatched: ${stats.supervisor.tasksDispatched}`);
  console.log(`   Queue Length: ${queue.queueLength}`);
  console.log(`   Workers - Busy: ${busyWorkers}, Idle: ${idleWorkers}`);
  console.log(`   Processing Rate: ${stats.supervisor.messagesPerMinute.toFixed(1)} msgs/min`);
  
  // Show some active tasks
  if (queue.activeTasks > 0) {
    console.log(`   Active Tasks: ${queue.activeTasks}`);
  }
}

function displayFinalStats(orchestrator) {
  const stats = orchestrator.getStats();
  const workers = orchestrator.getWorkerStats();
  
  console.log('\n📈 FINAL DEMO RESULTS:');
  console.log(`   Total Messages Processed: ${stats.supervisor.messagesProcessed}`);
  console.log(`   Tasks Dispatched: ${stats.supervisor.tasksDispatched}`);
  console.log(`   System Uptime: ${(stats.supervisor.uptime / 1000).toFixed(1)} seconds`);
  console.log(`   Average Processing Rate: ${stats.supervisor.messagesPerMinute.toFixed(1)} messages/minute`);
  
  console.log('\n🤖 WORKER PERFORMANCE:');
  workers.forEach(worker => {
    console.log(`   ${worker.id}: ${worker.performance.successRate} success, ${worker.performance.avgProcessingTime} avg`);
  });
  
  console.log('\n📋 QUEUE EFFICIENCY:');
  console.log(`   Peak Queue Size: ${stats.taskBus.queueStats.queueLength}`);
  console.log(`   Task Completion Rate: ${((stats.taskBus.tasksCompleted / stats.taskBus.tasksReceived) * 100 || 0).toFixed(1)}%`);
  
  // Calculate parallel efficiency
  const theoreticalSequentialTime = workers.reduce((sum, w) => sum + (w.performance.tasksCompleted * parseFloat(w.performance.avgProcessingTime)), 0);
  const actualTime = stats.supervisor.uptime;
  const parallelEfficiency = ((theoreticalSequentialTime / actualTime) * 100).toFixed(1);
  
  console.log(`\n⚡ PARALLEL EFFICIENCY: ${parallelEfficiency}%`);
  console.log(`   (vs sequential processing time)`);
}

// Run different demo scenarios
async function runScalabilityTest() {
  console.log('🔬 Scalability Test - Dynamic Worker Scaling');
  
  const orchestrator = new LingamOrchestrator({ workerCount: 5 });
  await orchestrator.initialize();
  await orchestrator.start('scalability-test');
  
  console.log('Starting with 5 workers...');
  
  // Gradually increase load and scale workers
  setTimeout(async () => {
    console.log('Scaling to 15 workers for high load...');
    await orchestrator.scaleWorkers(15);
    
    await orchestrator.processBulkMessages(100);
  }, 5000);
  
  setTimeout(async () => {
    console.log('Reducing to 8 workers for normal load...');
    await orchestrator.scaleWorkers(8);
  }, 15000);
  
  setTimeout(async () => {
    const finalStats = orchestrator.getStats();
    console.log(`Final processing rate: ${finalStats.supervisor.messagesPerMinute.toFixed(1)} msgs/min`);
    await orchestrator.stop();
    process.exit(0);
  }, 25000);
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Demo interrupted - shutting down gracefully...');
  process.exit(0);
});

// Run the demo
console.log('Choose demo mode:');
console.log('1. Standard Parallel Processing (60+ messages)');
console.log('2. Scalability Test (Dynamic worker scaling)');
console.log('3. Health Monitoring Demo');

// For now, run the standard demo
runParallelDemo().catch(console.error);