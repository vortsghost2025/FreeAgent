/**
 * WHO Integration Stress Test
 * Performance validation under high load
 */

import { WHOClinicalWorkflow } from '../who-clinical-workflow.js';

async function runStressTest() {
  console.log('========================================');
  console.log('WHO INTEGRATION - STRESS TEST');
  console.log('========================================\n');

  // Initialize workflow
  const workflow = new WHOClinicalWorkflow({
    mockMode: true,
    standardsVersion: '2024',
    debug: false
  });

  await workflow.initialize();
  console.log('✅ Workflow initialized\n');

  // Test 1: Sequential processing (100 cases)
  console.log('TEST 1: Sequential processing (100 cases)');
  console.log('----------------------------------------');

  const startSeq = Date.now();
  let successfulSeq = 0;
  let failedSeq = 0;

  for (let i = 0; i < 100; i++) {
    try {
      await workflow.processCase(`SEQ-CASE-${i}`);
      successfulSeq++;
    } catch (error) {
      failedSeq++;
    }
  }

  const totalTimeSeq = Date.now() - startSeq;
  const avgTimeSeq = totalTimeSeq / 100;
  const throughputSeq = (100 / totalTimeSeq) * 1000;

  console.log(`✅ Sequential Test Complete:`);
  console.log(`   Total: 100 cases`);
  console.log(`   Successful: ${successfulSeq}`);
  console.log(`   Failed: ${failedSeq}`);
  console.log(`   Total Time: ${totalTimeSeq}ms`);
  console.log(`   Avg Time: ${avgTimeSeq.toFixed(2)}ms/case`);
  console.log(`   Throughput: ${throughputSeq.toFixed(0)} cases/sec\n`);

  // Test 2: Batch processing (10 batches of 50 cases)
  console.log('TEST 2: Batch processing (10 batches x 50 cases)');
  console.log('----------------------------------------');

  const startBatch = Date.now();
  const batchResults = [];
  let totalBatchCases = 0;
  let totalBatchSuccess = 0;

  for (let i = 0; i < 10; i++) {
    const result = await workflow.processBatch({ limit: 50 });
    batchResults.push(result);
    totalBatchCases += result.statistics.totalCases;
    totalBatchSuccess += result.statistics.successful;
  }

  const totalTimeBatch = Date.now() - startBatch;
  const avgTimeBatch = totalTimeBatch / totalBatchCases;
  const throughputBatch = (totalBatchCases / totalTimeBatch) * 1000;

  console.log(`✅ Batch Test Complete:`);
  console.log(`   Total: ${totalBatchCases} cases`);
  console.log(`   Successful: ${totalBatchSuccess}`);
  console.log(`   Failed: ${totalBatchCases - totalBatchSuccess}`);
  console.log(`   Total Time: ${totalTimeBatch}ms`);
  console.log(`   Avg Time: ${avgTimeBatch.toFixed(2)}ms/case`);
  console.log(`   Throughput: ${throughputBatch.toFixed(0)} cases/sec\n`);

  // Test 3: Peak load simulation (1000 cases)
  console.log('TEST 3: Peak load simulation (1000 cases)');
  console.log('----------------------------------------');

  const startPeak = Date.now();
  const peakResult = await workflow.processBatch({ limit: 1000 });
  const totalTimePeak = Date.now() - startPeak;
  const avgTimePeak = totalTimePeak / peakResult.statistics.totalCases;
  const throughputPeak = (peakResult.statistics.totalCases / totalTimePeak) * 1000;

  console.log(`✅ Peak Load Test Complete:`);
  console.log(`   Total: ${peakResult.statistics.totalCases} cases`);
  console.log(`   Successful: ${peakResult.statistics.successful}`);
  console.log(`   Failed: ${peakResult.statistics.failed}`);
  console.log(`   Total Time: ${totalTimePeak}ms`);
  console.log(`   Avg Time: ${avgTimePeak.toFixed(2)}ms/case`);
  console.log(`   Throughput: ${throughputPeak.toFixed(0)} cases/sec\n`);

  // Test 4: Memory efficiency check
  console.log('TEST 4: Memory efficiency check');
  console.log('----------------------------------------');

  const memBefore = process.memoryUsage();
  await workflow.processBatch({ limit: 100 });
  const memAfter = process.memoryUsage();

  const heapIncrease = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024;

  console.log(`✅ Memory Check Complete:`);
  console.log(`   Heap before: ${(memBefore.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Heap after: ${(memAfter.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Increase: ${heapIncrease.toFixed(2)} MB (for 100 cases)`);
  console.log(`   Per case: ${(heapIncrease / 100 * 1024).toFixed(2)} KB\n`);

  // Test 5: Sustained load test (5 seconds)
  console.log('TEST 5: Sustained load test (5 seconds)');
  console.log('----------------------------------------');

  let sustainedCount = 0;
  const sustainedStart = Date.now();
  const sustainedDuration = 5000; // 5 seconds

  while (Date.now() - sustainedStart < sustainedDuration) {
    try {
      await workflow.processCase(`SUSTAINED-${sustainedCount}`);
      sustainedCount++;
    } catch (error) {
      console.error(`Error in sustained test: ${error.message}`);
    }
  }

  const sustainedTime = Date.now() - sustainedStart;
  const sustainedThroughput = (sustainedCount / sustainedTime) * 1000;
  const sustainedAvg = sustainedTime / sustainedCount;

  console.log(`✅ Sustained Load Test Complete:`);
  console.log(`   Duration: ${sustainedTime}ms (${(sustainedTime / 1000).toFixed(1)}s)`);
  console.log(`   Cases processed: ${sustainedCount}`);
  console.log(`   Avg Time: ${sustainedAvg.toFixed(2)}ms/case`);
  console.log(`   Throughput: ${sustainedThroughput.toFixed(0)} cases/sec\n`);

  // Test 6: Concurrency simulation (parallel batches)
  console.log('TEST 6: Concurrency simulation (5 parallel batches)');
  console.log('----------------------------------------');

  const concStart = Date.now();
  const concurrentPromises = [];

  for (let i = 0; i < 5; i++) {
    // Create separate workflow instance for each "concurrent" request
    const concWorkflow = new WHOClinicalWorkflow({ mockMode: true, standardsVersion: '2024', debug: false });
    await concWorkflow.initialize();
    concurrentPromises.push(concWorkflow.processBatch({ limit: 20 }));
  }

  const concResults = await Promise.all(concurrentPromises);
  const concTime = Date.now() - concStart;
  const concTotal = concResults.reduce((sum, r) => sum + r.statistics.totalCases, 0);
  const concThroughput = (concTotal / concTime) * 1000;

  console.log(`✅ Concurrency Test Complete:`);
  console.log(`   Parallel batches: 5`);
  console.log(`   Total cases: ${concTotal}`);
  console.log(`   Total Time: ${concTime}ms`);
  console.log(`   Throughput: ${concThroughput.toFixed(0)} cases/sec`);
  console.log(`   Effective speedup: ${(concThroughput / throughputSeq).toFixed(2)}x\n`);

  // Performance Summary
  console.log('\n========================================');
  console.log('STRESS TEST SUMMARY');
  console.log('========================================\n');

  const allThroughputs = [throughputSeq, throughputBatch, throughputPeak, sustainedThroughput, concThroughput];
  const maxThroughput = Math.max(...allThroughputs);
  const minThroughput = Math.min(...allThroughputs);
  const avgThroughput = allThroughputs.reduce((a, b) => a + b, 0) / allThroughputs.length;

  console.log(`Performance Metrics:`);
  console.log(`   Max Throughput: ${maxThroughput.toFixed(0)} cases/sec`);
  console.log(`   Min Throughput: ${minThroughput.toFixed(0)} cases/sec`);
  console.log(`   Avg Throughput: ${avgThroughput.toFixed(0)} cases/sec`);
  console.log(`   Total Cases Processed: ${100 + totalBatchCases + peakResult.statistics.totalCases + 100 + sustainedCount + concTotal}`);
  console.log(`   Memory Per Case: ${(heapIncrease / 100 * 1024).toFixed(2)} KB`);

  console.log(`\nBenchmark Targets:`);
  const targets = {
    avgTime: { target: 10, actual: avgTimeSeq, unit: 'ms', pass: avgTimeSeq < 10 },
    throughput: { target: 1000, actual: avgThroughput, unit: 'cases/sec', pass: avgThroughput > 1000 },
    memory: { target: 5, actual: heapIncrease / 100 * 1024, unit: 'KB/case', pass: (heapIncrease / 100) < 0.005 }
  };

  Object.entries(targets).forEach(([name, metric]) => {
    const status = metric.pass ? '✅ PASS' : '⚠️  REVIEW';
    console.log(`   ${status} ${name}: ${metric.actual.toFixed(2)} ${metric.unit} (target: ${metric.target} ${metric.unit})`);
  });

  const allPassed = Object.values(targets).every(t => t.pass);

  console.log(`\n========================================`);
  console.log(allPassed ? '🎉 ALL PERFORMANCE TARGETS MET!' : '⚠️  Some targets need optimization');
  console.log('========================================\n');

  return {
    passed: allPassed,
    metrics: {
      throughput: avgThroughput,
      latency: avgTimeSeq,
      memory: heapIncrease / 100,
      totalCases: 100 + totalBatchCases + peakResult.statistics.totalCases + 100 + sustainedCount + concTotal
    }
  };
}

// Run test if executed directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  runStressTest().catch(console.error);
}

export { runStressTest };
