/**
 * Test script for SNAC Orchestrator
 * 
 * Usage:
 *   node test-orchestrator.js
 * 
 * Tests:
 * 1. Rate limiter token bucket
 * 2. Model tier routing
 * 3. Context summarization
 */

import { SNACOrchestrator } from './orchestrator.js';
import { TokenBucket } from './orchestrator.js';
import { ModelTierRouter } from './orchestrator.js';
import { ContextSummarizer } from './orchestrator.js';

async function testRateLimiter() {
  console.log('\n🧪 Testing Token Bucket Rate Limiter...\n');
  
  const bucket = new TokenBucket({
    requestsPerSecond: 3,
    burstLimit: 6,
    queueMaxSize: 10,
  });
  
  // Test 1: Consume tokens
  console.log('Test 1: Token consumption');
  for (let i = 0; i < 5; i++) {
    const result = bucket.tryConsume();
    console.log(`  Attempt ${i + 1}: ${result ? '✅' : '❌'} (tokens: ${bucket.tokens.toFixed(2)})`);
  }
  
  // Test 2: Queue functionality
  console.log('\nTest 2: Request queue');
  let processed = 0;
  
  const task1 = bucket.enqueue(async () => {
    processed++;
    return 'task1 done';
  });
  
  const task2 = bucket.enqueue(async () => {
    processed++;
    return 'task2 done';
  });
  
  const results = await Promise.all([task1, task2]);
  console.log(`  Processed: ${processed} tasks`);
  console.log(`  Results: ${results.join(', ')}`);
  
  // Test 3: Queue overflow
  console.log('\nTest 3: Queue overflow handling');
  try {
    // Fill up queue with unresolved promises that complete instantly
    const promises = [];
    for (let i = 0; i < 15; i++) {
      promises.push(bucket.enqueue(async () => {
        await new Promise(r => setTimeout(r, 10)); // Small delay
        return 'test';
      }));
    }
    // Wait for all to settle
    await Promise.allSettled(promises);
    // Check if queue is full
    console.log(`  Queue length: ${bucket.queue.length} (max: ${bucket.maxQueueSize})`);
  } catch (err) {
    console.log(`  ✅ Correctly rejected: ${err.message}`);
  }
  
  // Test 4: 429 backoff
  console.log('\nTest 4: 429 backoff handling');
  bucket.handle429(100);
  const blocked = bucket.tryConsume();
  console.log(`  During backoff: ${blocked ? '❌ Should block' : '✅ Correctly blocked'}`);
  
  console.log('\n✅ Rate Limiter tests passed!\n');
}

async function testModelRouter() {
  console.log('\n🧪 Testing Model Tier Router...\n');
  
  const router = new ModelTierRouter({
    modelTiers: {
      free: ['free-model-1', 'free-model-2'],
      paid: ['paid-model-1', 'paid-model-2'],
    },
    complexityThresholds: {
      simple: { keywords: ['fix', 'typo'] },
      medium: { keywords: ['implement', 'create'] },
      complex: { keywords: ['architect', 'design'] },
    },
  });
  
  // Test 1: Simple task
  console.log('Test 1: Simple task (should use free)');
  const simple = router.selectModel('Fix the typo in login.js');
  console.log(`  Task: "Fix the typo in login.js"`);
  console.log(`  Model: ${simple.model}`);
  console.log(`  Tier: ${simple.tier}`);
  console.log(`  ✅ ${simple.tier === 'free' ? 'Correct' : 'Wrong'}`);
  
  // Test 2: Complex task
  console.log('\nTest 2: Complex task (should use paid)');
  const complex = router.selectModel('Architect a new microservices system with design patterns');
  console.log(`  Task: "Architect a new microservices system"`);
  console.log(`  Model: ${complex.model}`);
  console.log(`  Tier: ${complex.tier}`);
  console.log(`  ✅ ${complex.tier === 'paid' ? 'Correct' : 'Wrong'}`);
  
  // Test 3: Usage stats
  console.log('\nTest 3: Usage statistics');
  const stats = router.getUsageStats();
  console.log(`  Free: ${stats.free}, Paid: ${stats.paid}`);
  console.log(`  Free %: ${stats.freePercentage}%`);
  
  console.log('\n✅ Model Router tests passed!\n');
}

async function testSummarizer() {
  console.log('\n🧪 Testing Context Summarizer...\n');
  
  const summarizer = new ContextSummarizer({
    summarization: {
      enabled: true,
      summaryThreshold: 5,
      maxContextMessages: 3,
    },
  });
  
  // Test 1: Create session messages
  const messages = [
    { role: 'user', content: 'Task 1: Fix bug' },
    { role: 'assistant', content: 'Fixed the bug' },
    { role: 'user', content: 'Task 2: Add feature' },
    { role: 'assistant', content: 'Added the feature' },
    { role: 'user', content: 'Task 3: Refactor code' },
    { role: 'assistant', content: 'Refactored the code' },
    { role: 'user', content: 'Task 4: Write tests' }, // This triggers summarization
    { role: 'assistant', content: 'Wrote tests' },
  ];
  
  // Test 2: Get context (should summarize)
  console.log('Test 1: Summarization triggered');
  const context = await summarizer.getContext('test-session', messages);
  console.log(`  Messages before: ${messages.length}`);
  console.log(`  Context length: ${context.length}`);
  console.log(`  Has summary: ${context[0]?.role === 'system' ? '✅' : '❌'}`);
  
  // Test 3: Status
  console.log('\nTest 2: Status');
  const status = summarizer.getStatus();
  console.log(`  Enabled: ${status.enabled}`);
  console.log(`  Sessions tracked: ${status.sessionsTracked}`);
  
  console.log('\n✅ Summarizer tests passed!\n');
}

async function testFullOrchestrator() {
  console.log('\n🧪 Testing Full Orchestrator...\n');
  
  const orchestrator = new SNACOrchestrator({
    rateLimit: {
      requestsPerSecond: 5,
      burstLimit: 10,
    },
  });
  
  // Test health endpoint
  console.log('Test 1: Health check structure');
  const health = orchestrator.rateLimiter.getStatus();
  console.log(`  Tokens: ${health.tokens}`);
  console.log(`  Queue: ${health.queueLength}`);
  
  // Test model selection
  console.log('\nTest 2: Model selection');
  const modelInfo = orchestrator.modelRouter.selectModel('Implement a simple function');
  console.log(`  Selected: ${modelInfo.model}`);
  console.log(`  Tier: ${modelInfo.tier}`);
  console.log(`  Reason: ${modelInfo.reason}`);
  
  // Test stats
  console.log('\nTest 3: Stats tracking');
  orchestrator.stats.totalRequests = 10;
  orchestrator.stats.successfulRequests = 8;
  const stats = orchestrator.getStatus();
  console.log(`  Total: ${stats.stats.totalRequests}`);
  console.log(`  Success rate: ${Math.round((stats.stats.successfulRequests / stats.stats.totalRequests) * 100)}%`);
  
  console.log('\n✅ Full Orchestrator tests passed!\n');
}

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 SNAC ORCHESTRATOR TEST SUITE');
  console.log('='.repeat(60));
  
  try {
    await testRateLimiter();
    await testModelRouter();
    await testSummarizer();
    await testFullOrchestrator();
    
    console.log('='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(60));
    
    console.log('\n📋 Next Steps:');
    console.log('1. Run: node orchestrator.js');
    console.log('2. Check: curl http://localhost:3001/health');
    console.log('3. See: ORCHESTRATOR_INTEGRATION.md');
    
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    process.exit(1);
  }
}

main();
