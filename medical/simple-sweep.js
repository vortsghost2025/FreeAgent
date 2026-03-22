const BASE_URL = 'http://localhost:8889';

async function testAgentSweep() {
  console.log('👑 KILO INITIATING PARALLEL AGENT SWEEP');
  console.log('=====================================\n');
  
  const agents = ['code', 'data', 'clinical', 'test', 'security'];
  const startTime = Date.now();
  
  // Send parallel requests
  const promises = agents.map(async (agentName) => {
    const requestStart = Date.now();
    console.log(`🚀 Activating ${agentName.toUpperCase()} agent...`);
    
    try {
      const response = await fetch(`${BASE_URL}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: {
            type: 'status_check',
            data: { agent: agentName, check: 'health' }
          }
        })
      });
      
      const duration = Date.now() - requestStart;
      
      if (response.ok) {
        console.log(`✅ ${agentName.toUpperCase()} responded in ${duration}ms`);
        return { agent: agentName, status: 'SUCCESS', time: duration };
      } else {
        console.log(`❌ ${agentName.toUpperCase()} failed (${response.status}) in ${duration}ms`);
        return { agent: agentName, status: 'FAILED', time: duration };
      }
    } catch (error) {
      const duration = Date.now() - requestStart;
      console.log(`💥 ${agentName.toUpperCase()} error: ${error.message} (${duration}ms)`);
      return { agent: agentName, status: 'ERROR', time: duration };
    }
  });
  
  console.log('\n🔄 All agents launched simultaneously - collecting responses...\n');
  
  // Wait for all to complete
  const results = await Promise.all(promises);
  const totalTime = Date.now() - startTime;
  
  // Display results
  console.log('📊 PARALLEL SWEEP RESULTS');
  console.log('========================');
  console.log(`Total Time: ${totalTime}ms\n`);
  
  const successful = results.filter(r => r.status === 'SUCCESS');
  const failed = results.filter(r => r.status === 'FAILED');
  const errored = results.filter(r => r.status === 'ERROR');
  
  console.log(`✅ SUCCESSFUL: ${successful.length}/${results.length}`);
  successful.forEach(r => console.log(`  🟢 ${r.agent.toUpperCase()}: ${r.time}ms`));
  
  if (failed.length > 0) {
    console.log(`\n❌ FAILED: ${failed.length}`);
    failed.forEach(r => console.log(`  🔴 ${r.agent.toUpperCase()}: ${r.time}ms`));
  }
  
  if (errored.length > 0) {
    console.log(`\n💥 ERRORED: ${errored.length}`);
    errored.forEach(r => console.log(`  ⚠️  ${r.agent.toUpperCase()}: ${r.time}ms`));
  }
  
  const avgTime = results.reduce((sum, r) => sum + r.time, 0) / results.length;
  console.log(`\n📈 Average Response Time: ${avgTime.toFixed(2)}ms`);
  console.log(`👑 KILO COORDINATION COMPLETE!`);
}

testAgentSweep().catch(console.error);
