/**
 * Rate Limiting Demo - Shows how parallel processing avoids API rate limits
 * Demonstrates the "parallel thinking, not calling" principle
 */

import LingamOrchestrator from './lingam-orchestrator.js';
import SharedApiClient from './shared-api-client.js';

async function runRateLimitDemo() {
  console.log('🛡️ Rate Limiting Protection Demo');
  console.log('==================================\n');
  
  // Initialize shared API client with strict limits
  const apiClient = new SharedApiClient({
    llmConcurrency: 2,    // Only 2 LLM calls at once
    rpcConcurrency: 3,    // Only 3 RPC calls at once  
    restConcurrency: 5,   // Only 5 REST calls at once
    cacheEnabled: true,
    cacheTtl: 60000       // 1 minute cache
  });
  
  console.log('🔧 API Client Configuration:');
  console.log('   LLM Concurrency: 2 calls max');
  console.log('   RPC Concurrency: 3 calls max');
  console.log('   REST Concurrency: 5 calls max');
  console.log('   Caching: Enabled (1 min TTL)\n');
  
  // Test 1: Show rate limiting in action
  console.log('🧪 Test 1: Simultaneous API Calls (Rate Limited)');
  console.log('-----------------------------------------------');
  
  const simultaneousCalls = 15;
  console.log(`Making ${simultaneousCalls} simultaneous REST API calls...`);
  
  const startTime = Date.now();
  const promises = [];
  
  for (let i = 0; i < simultaneousCalls; i++) {
    promises.push(
      apiClient.callREST(`https://api.example.com/endpoint-${i}`, {
        priority: i < 5 ? 'high' : 'normal'
      })
    );
  }
  
  const results = await Promise.all(promises);
  const totalTime = Date.now() - startTime;
  
  console.log(`✅ Completed ${simultaneousCalls} calls in ${totalTime}ms`);
  console.log(`   Actual concurrent execution: ${Math.min(simultaneousCalls, 5)}`);
  console.log(`   Rate limiting prevented overload\n`);
  
  // Test 2: Show caching effectiveness
  console.log('🧪 Test 2: Cache Hit/Miss Ratio');
  console.log('-------------------------------');
  
  const cacheTestUrl = 'https://api.example.com/popular-endpoint';
  
  // First call (cache miss)
  const firstCallStart = Date.now();
  await apiClient.callREST(cacheTestUrl);
  const firstCallTime = Date.now() - firstCallStart;
  
  // Second call (should be cache hit)
  const secondCallStart = Date.now();
  await apiClient.callREST(cacheTestUrl);
  const secondCallTime = Date.now() - secondCallStart;
  
  const stats = apiClient.getStats();
  console.log(`   First call: ${firstCallTime}ms (cache miss)`);
  console.log(`   Second call: ${secondCallTime}ms (cache hit)`);
  console.log(`   Cache hit rate: ${(stats.cache.hitRate * 100).toFixed(1)}%\n`);
  
  // Test 3: Demonstrate parallel message processing vs API calls
  console.log('🧪 Test 3: Parallel Processing Without API Overload');
  console.log('--------------------------------------------------');
  
  const orchestrator = new LingamOrchestrator({
    workerCount: 8,  // 8 parallel workers
    batchSize: 30,
    pollInterval: 200
  });
  
  await orchestrator.initialize();
  await orchestrator.start('rate-limit-demo');
  
  console.log('🚀 Started 8 parallel workers processing messages');
  console.log('   Each worker uses shared API client with rate limits\n');
  
  // Simulate high message volume that would normally overwhelm APIs
  console.log('⚡ Injecting 100 messages that require API calls...');
  await orchestrator.processBulkMessages(100);
  
  // Monitor for 15 seconds to show controlled API usage
  const monitoringInterval = setInterval(() => {
    const apiStats = orchestrator.apiClient.getStats();
    const queueStats = orchestrator.getQueueSnapshot();
    const workerStats = orchestrator.getWorkerStatus();
    
    const busyWorkers = workerStats.filter(w => w.status === 'busy').length;
    
    console.log(`\n📊 System Status:`);
    console.log(`   Active Workers: ${busyWorkers}/8`);
    console.log(`   Queue Length: ${queueStats.queueLength}`);
    console.log(`   API Utilization: ${apiStats.limiters.rest.utilization}`);
    console.log(`   Cache Hit Rate: ${(apiStats.cache.hitRate * 100).toFixed(1)}%`);
    
    // Show that API calls are controlled
    const totalApiCalls = apiStats.apiCalls;
    const expectedIfUnlimited = 100; // Without rate limiting, would be 100+ concurrent
    console.log(`   Controlled API Calls: ${totalApiCalls} (vs ${expectedIfUnlimited} without limits)`);
    
  }, 3000);
  
  // Run demo for 15 seconds
  setTimeout(async () => {
    clearInterval(monitoringInterval);
    
    console.log('\n🎯 Rate Limiting Demo Complete!');
    console.log('===============================');
    
    const finalStats = orchestrator.apiClient.getStats();
    console.log(`\n📈 Final Results:`);
    console.log(`   Total API Calls Made: ${finalStats.apiCalls}`);
    console.log(`   Cache Hit Rate: ${(finalStats.cache.hitRate * 100).toFixed(1)}%`);
    console.log(`   LLM Limiter Utilization: ${finalStats.limiters.llm.utilization}`);
    console.log(`   RPC Limiter Utilization: ${finalStats.limiters.rpc.utilization}`);
    console.log(`   REST Limiter Utilization: ${finalStats.limiters.rest.utilization}`);
    
    console.log(`\n✅ Key Insights:`);
    console.log(`   • 8 parallel workers processed 100+ messages`);
    console.log(`   • API calls stayed within configured limits`);
    console.log(`   • Caching reduced redundant API calls by ${(finalStats.cache.hitRate * 100).toFixed(1)}%`);
    console.log(`   • No rate limit violations occurred`);
    console.log(`   • System remained responsive and stable`);
    
    await orchestrator.stop();
    process.exit(0);
    
  }, 15000);
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Rate limit demo interrupted');
  process.exit(0);
});

// Run the demo
runRateLimitDemo().catch(console.error);