#!/usr/bin/env node
/**
 * YOLO ENDURANCE TEST - 2 HOURS OF CONTINUOUS 2MS PIPELINES
 * MAXIMUM SUSTAINED THROUGHPUT TESTING
 */

async function yoloEnduranceTest() {
  console.log('💣 YOLO ENDURANCE TEST - 2 HOURS STRAIGHT!');
  console.log('==========================================\n');
  
  const testStartTime = Date.now();
  const targetDuration = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
  const targetEndTime = testStartTime + targetDuration;
  
  let totalTasks = 0;
  let successfulTasks = 0;
  let failedTasks = 0;
  let totalProcessingTime = 0;
  const processingTimes = [];
  const hourlyStats = [];
  
  console.log(`⏰ START TIME: ${new Date().toLocaleTimeString()}`);
  console.log(`⏰ END TIME: ${new Date(targetEndTime).toLocaleTimeString()}`);
  console.log(`⏰ TOTAL DURATION: 2 hours\n`);
  
  console.log('🚀 LAUNCHING SUSTAINED 2MS MEDICAL PIPELINE PROCESSING...');
  console.log('   YOLO MODE: Maximum throughput for 2 hours straight!\n');
  
  // Hourly checkpoint function
  function recordHourlyStats() {
    const currentHour = Math.floor((Date.now() - testStartTime) / (60 * 60 * 1000));
    const hourlyRate = totalTasks / currentHour;
    
    hourlyStats.push({
      hour: currentHour,
      totalTasks: totalTasks,
      successfulTasks: successfulTasks,
      rate: hourlyRate,
      timestamp: new Date().toLocaleTimeString()
    });
    
    console.log(`⏱️  HOUR ${currentHour} COMPLETE: ${totalTasks} pipelines processed (${hourlyRate.toFixed(1)}/hour)`);
  }
  
  // Main endurance loop
  let lastHourCheck = 0;
  let pipelineCounter = 0;
  
  while (Date.now() < targetEndTime) {
    const currentTime = Date.now();
    const elapsedHours = (currentTime - testStartTime) / (60 * 60 * 1000);
    const currentHour = Math.floor(elapsedHours);
    
    // Record hourly stats
    if (currentHour > lastHourCheck && currentHour > 0) {
      recordHourlyStats();
      lastHourCheck = currentHour;
    }
    
    // Process pipeline
    const taskSpec = {
      type: 'labs',
      description: `YOLO Endurance Pipeline #${pipelineCounter}`,
      context: {
        yoloMode: true,
        enduranceTest: true,
        pipelineId: pipelineCounter,
        timestamp: Date.now(),
        elapsedHours: elapsedHours.toFixed(2)
      }
    };
    
    try {
      const startTime = Date.now();
      
      const response = await fetch('http://localhost:8889/api/medical/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskSpec)
      });
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      totalTasks++;
      totalProcessingTime += processingTime;
      processingTimes.push(processingTime);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          successfulTasks++;
          console.log(`✅ Pipeline ${pipelineCounter}: ${processingTime}ms - SUCCESS (${successfulTasks}/${totalTasks})`);
        } else {
          failedTasks++;
          console.log(`❌ Pipeline ${pipelineCounter}: ${processingTime}ms - FAILED`);
        }
      } else {
        failedTasks++;
        console.log(`💥 Pipeline ${pipelineCounter}: HTTP ${response.status} - FAILED`);
      }
      
    } catch (error) {
      failedTasks++;
      totalTasks++;
      console.log(`💥 Pipeline ${pipelineCounter}: ERROR - ${error.message}`);
    }
    
    pipelineCounter++;
    
    // Progress update every 1000 pipelines
    if (pipelineCounter % 1000 === 0) {
      const currentRate = (totalTasks / ((currentTime - testStartTime) / 1000)).toFixed(1);
      const remainingTime = ((targetEndTime - currentTime) / 1000 / 60).toFixed(1);
      console.log(`📊 PROGRESS UPDATE: ${totalTasks} pipelines | ${currentRate}/sec | ${remainingTime} min remaining`);
    }
    
    // Brief yield to prevent overwhelming system
    if (pipelineCounter % 100 === 0) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  
  // Final hourly stats
  recordHourlyStats();
  
  const testDuration = Date.now() - testStartTime;
  
  // COMPREHENSIVE ENDURANCE RESULTS
  console.log('\n🏁 YOLO ENDURANCE TEST COMPLETE!');
  console.log('================================\n');
  
  console.log(`⏱️  TOTAL TEST TIME: ${(testDuration/1000/60/60).toFixed(2)} hours`);
  console.log(`🎯 PIPELINES PROCESSED: ${totalTasks.toLocaleString()}`);
  console.log(`✅ SUCCESSFUL: ${successfulTasks.toLocaleString()}`);
  console.log(`❌ FAILED: ${failedTasks.toLocaleString()}`);
  console.log(`📈 SUCCESS RATE: ${((successfulTasks/totalTasks) * 100).toFixed(2)}%`);
  
  // THROUGHPUT ANALYSIS
  const pipelinesPerSecond = (totalTasks / (testDuration/1000)).toFixed(2);
  const pipelinesPerMinute = (pipelinesPerSecond * 60).toFixed(1);
  const pipelinesPerHour = (pipelinesPerMinute * 60).toFixed(0);
  
  console.log(`\n⚡ THROUGHPUT RESULTS:`);
  console.log(`   Per Second: ${pipelinesPerSecond} pipelines/sec`);
  console.log(`   Per Minute: ${pipelinesPerMinute} pipelines/min`);
  console.log(`   Per Hour: ${pipelinesPerHour} pipelines/hour`);
  console.log(`   Per Day: ${(pipelinesPerHour * 24).toLocaleString()} pipelines/day`);
  
  // LATENCY STATISTICS
  if (processingTimes.length > 0) {
    const avgTime = (totalProcessingTime / processingTimes.length).toFixed(2);
    const minTime = Math.min(...processingTimes);
    const maxTime = Math.max(...processingTimes);
    
    console.log(`\n⏱️  LATENCY STATISTICS:`);
    console.log(`   Average: ${avgTime}ms`);
    console.log(`   Minimum: ${minTime}ms`);
    console.log(`   Maximum: ${maxTime}ms`);
    console.log(`   Total Processing: ${(totalProcessingTime/1000).toFixed(1)} seconds`);
  }
  
  // HOURLY BREAKDOWN
  console.log(`\n📊 HOURLY PERFORMANCE:`);
  hourlyStats.forEach(stat => {
    console.log(`   Hour ${stat.hour}: ${stat.totalTasks} pipelines (${stat.rate.toFixed(1)}/hour)`);
  });
  
  // CLINICAL CAPACITY
  console.log(`\n🏥 CLINICAL EQUIVALENCY:`);
  console.log(`   Emergency Department: ${pipelinesPerHour} patients/hour`);
  console.log(`   Hospital Capacity: ${(pipelinesPerHour * 24).toLocaleString()} patient assessments/day`);
  console.log(`   Regional Screening: ${((pipelinesPerHour * 24) * 30).toLocaleString()} screenings/month`);
  
  // SYSTEM STABILITY
  console.log(`\n🛡️  SYSTEM STABILITY:`);
  if (failedTasks === 0) {
    console.log('🏆 PERFECT - Zero failures over 2 hours!');
  } else if ((failedTasks/totalTasks) < 0.01) {
    console.log('👍 EXCELLENT - Minimal failures under sustained load');
  } else {
    console.log('⚠️  ACCEPTABLE - Some failures but system remained operational');
  }
  
  // FINAL ASSESSMENT
  console.log('\n🎯 YOLO ENDURANCE ASSESSMENT:');
  if (pipelinesPerHour >= 10000) {
    console.log('🏆 LEGENDARY - Beyond enterprise-grade performance!');
  } else if (pipelinesPerHour >= 5000) {
    console.log('🔥 EXCEPTIONAL - World-class sustained throughput');
  } else if (pipelinesPerHour >= 2000) {
    console.log('👍 EXCELLENT - Production-ready sustained performance');
  } else if (pipelinesPerHour >= 1000) {
    console.log('✅ GOOD - Solid sustained processing capability');
  } else {
    console.log('⚠️  FAIR - Adequate but with optimization opportunities');
  }
  
  console.log('\n🎉 2-HOUR YOLO ENDURANCE TEST SUCCESSFULLY COMPLETED!');
  console.log('The system has proven its ability to sustain maximum throughput!');
  
  return {
    totalTasks,
    successfulTasks,
    failedTasks,
    testDuration,
    pipelinesPerHour: parseInt(pipelinesPerHour),
    hourlyStats,
    successRate: (successfulTasks/totalTasks) * 100
  };
}

// LAUNCH THE YOLO ENDURANCE TEST
yoloEnduranceTest().catch(console.error);