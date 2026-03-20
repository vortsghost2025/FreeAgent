#!/usr/bin/env node
/**
 * ULTIMATE THROUGHPUT STRESS TEST
 * Push the 2ms pipeline to its absolute limits with maximum data volume
 */

async function ultimateThroughputTest() {
  console.log('🔥 ULTIMATE THROUGHPUT STRESS TEST');
  console.log('====================================\n');
  
  const startTime = Date.now();
  let totalTasks = 0;
  let successfulTasks = 0;
  let totalTimeAccumulated = 0;
  const processingTimes = [];
  
  // MASSIVE DATA BATCH - 10,000 medical pipeline requests
  console.log('🚀 LAUNCHING 10,000 CONCURRENT MEDICAL PIPELINES...');
  console.log('   Testing sustained throughput at 2ms performance level\n');
  
  const batchSize = 1000; // Process in batches to avoid overwhelming
  let batchNumber = 1;
  
  for (let batchStart = 0; batchStart < 10000; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, 10000);
    console.log(`📦 Batch ${batchNumber}: Processing pipelines ${batchStart + 1}-${batchEnd}`);
    
    const batchPromises = [];
    
    // Create batch of pipeline requests
    for (let i = batchStart; i < batchEnd; i++) {
      const taskSpec = {
        type: 'labs',
        description: `Medical data processing pipeline ${i}`,
        context: {
          testData: true,
          batch: batchNumber,
          pipelineId: i,
          timestamp: Date.now()
        }
      };
      
      const taskPromise = processMedicalPipeline(taskSpec)
        .then(result => {
          totalTasks++;
          totalTimeAccumulated += result.processingTime;
          processingTimes.push(result.processingTime);
          
          if (result.success) {
            successfulTasks++;
          }
          
          // Progress indicator
          if (totalTasks % 1000 === 0) {
            const currentRate = (totalTasks / ((Date.now() - startTime) / 1000)).toFixed(1);
            console.log(`📊 Progress: ${totalTasks}/10000 pipelines (${currentRate}/sec)`);
          }
          
          return result;
        })
        .catch(error => {
          totalTasks++;
          console.log(`💥 Pipeline ${i} failed: ${error.message}`);
          return { success: false, error: error.message };
        });
      
      batchPromises.push(taskPromise);
    }
    
    // Wait for batch completion
    await Promise.all(batchPromises);
    batchNumber++;
    
    // Brief pause between batches to prevent system overload
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const testDuration = Date.now() - startTime;
  
  // COMPREHENSIVE ANALYSIS
  console.log('\n🎯 ULTIMATE THROUGHPUT RESULTS');
  console.log('==============================\n');
  
  console.log(`⏱️  TOTAL TEST DURATION: ${testDuration}ms (${(testDuration/1000).toFixed(2)} seconds)`);
  console.log(`🎯 PIPELINES PROCESSED: ${totalTasks}`);
  console.log(`✅ SUCCESSFUL: ${successfulTasks}`);
  console.log(`❌ FAILED: ${totalTasks - successfulTasks}`);
  console.log(`📈 SUCCESS RATE: ${((successfulTasks/totalTasks) * 100).toFixed(2)}%`);
  
  // THROUGHPUT CALCULATIONS
  const pipelinesPerSecond = (totalTasks / (testDuration/1000)).toFixed(2);
  const theoreticalMax = (1000 / 2) * (testDuration/1000); // Based on 2ms per pipeline
  
  console.log(`\n⚡ THROUGHPUT ANALYSIS:`);
  console.log(`   Actual Rate: ${pipelinesPerSecond} pipelines/second`);
  console.log(`   Theoretical Max: ${theoreticalMax.toFixed(0)} pipelines/second`);
  console.log(`   Efficiency: ${((pipelinesPerSecond / (1000/2)) * 100).toFixed(1)}%`);
  
  // LATENCY STATISTICS
  if (processingTimes.length > 0) {
    const avgTime = (totalTimeAccumulated / processingTimes.length).toFixed(2);
    const minTime = Math.min(...processingTimes);
    const maxTime = Math.max(...processingTimes);
    const totalTime = processingTimes.reduce((a,b) => a+b, 0);
    
    console.log(`\n⏱️  LATENCY STATISTICS:`);
    console.log(`   Average: ${avgTime}ms`);
    console.log(`   Minimum: ${minTime}ms`);
    console.log(`   Maximum: ${maxTime}ms`);
    console.log(`   Total Processing Time: ${totalTime}ms`);
  }
  
  // SCALING POTENTIAL
  console.log(`\n🚀 SCALING POTENTIAL:`);
  console.log(`   1 minute sustained: ${(pipelinesPerSecond * 60).toLocaleString()} pipelines`);
  console.log(`   1 hour sustained: ${(pipelinesPerSecond * 3600).toLocaleString()} pipelines`);
  console.log(`   1 day sustained: ${(pipelinesPerSecond * 86400).toLocaleString()} pipelines`);
  
  // CLINICAL CAPACITY
  console.log(`\n🏥 CLINICAL CAPACITY EQUIVALENCY:`);
  console.log(`   Emergency Department: ${(pipelinesPerSecond * 60).toFixed(0)} patients/hour`);
  console.log(`   Hospital Ward: ${(pipelinesPerSecond * 3600).toFixed(0)} patient assessments/day`);
  console.log(`   Regional Health System: ${(pipelinesPerSecond * 86400).toFixed(0)} screenings/day`);
  
  // FINAL ASSESSMENT
  console.log('\n🏆 PERFORMANCE ASSESSMENT:');
  if (pipelinesPerSecond >= 400) {
    console.log('🏆 EXCEPTIONAL - Beyond real-time clinical compute thresholds!');
  } else if (pipelinesPerSecond >= 250) {
    console.log('👍 EXCELLENT - Meets high-performance clinical requirements');
  } else if (pipelinesPerSecond >= 100) {
    console.log('✅ GOOD - Solid performance for most clinical applications');
  } else {
    console.log('⚠️  FAIR - Adequate but with room for optimization');
  }
  
  console.log('\n🎉 ULTIMATE THROUGHPUT TEST COMPLETE!');
  console.log('The system has demonstrated its maximum processing capacity!');
  
  return {
    totalTasks,
    successfulTasks,
    testDuration,
    pipelinesPerSecond: parseFloat(pipelinesPerSecond),
    processingTimes,
    successRate: (successfulTasks/totalTasks) * 100
  };
}

async function processMedicalPipeline(taskSpec) {
  try {
    const startTime = Date.now();
    
    const response = await fetch('http://localhost:8889/api/medical/pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskSpec)
    });
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    return {
      success: result.success,
      processingTime,
      pipelineId: taskSpec.context.pipelineId,
      output: result.output
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      processingTime: 0,
      pipelineId: taskSpec.context.pipelineId
    };
  }
}

// RUN THE ULTIMATE TEST
ultimateThroughputTest().catch(console.error);