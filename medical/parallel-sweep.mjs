#!/usr/bin/env node

/**
 * PARALLEL AGENT SYSTEMS SWEEP (ES MODULE VERSION)
 * Coordinated by Kilo to sweep all 5 agents simultaneously
 */

const BASE_URL = 'http://localhost:8889';

class ParallelAgentSweep {
  constructor() {
    this.agents = [
      { name: 'code', role: 'Code Generation Agent' },
      { name: 'data', role: 'Data Analysis Agent' },
      { name: 'clinical', role: 'Clinical Reasoning Agent' },
      { name: 'test', role: 'Testing Agent' },
      { name: 'security', role: 'Security Audit Agent' }
    ];
    this.results = [];
  }
  
  async executeSweep() {
    console.log('👑 KILO COORDINATED PARALLEL AGENT SWEEP');
    console.log('=====================================');
    console.log(`Initiating simultaneous sweep of ${this.agents.length} agents...\n`);
    
    const startTime = Date.now();
    
    // Execute all agent checks in parallel using Promise.all
    const sweepPromises = this.agents.map(async (agent) => {
      const agentStartTime = Date.now();
      
      try {
        console.log(`🚀 Activating ${agent.name.toUpperCase()} agent...`);
        
        // Send parallel request to each agent
        const response = await fetch(`${BASE_URL}/api/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task: {
              type: 'system_sweep',
              data: {
                agent: agent.name,
                sweep_type: 'full_status',
                initiated_by: 'kilo_coordinator'
              }
            },
            preferredSystem: 'coding_ensemble'
          })
        });
        
        const agentEndTime = Date.now();
        const responseTime = agentEndTime - agentStartTime;
        
        if (response.ok) {
          const result = await response.json();
          return {
            agent: agent.name,
            role: agent.role,
            status: 'SUCCESS',
            responseTime: responseTime,
            data: result,
            timestamp: new Date().toISOString()
          };
        } else {
          return {
            agent: agent.name,
            role: agent.role,
            status: 'FAILED',
            responseTime: responseTime,
            error: `HTTP ${response.status}`,
            timestamp: new Date().toISOString()
          };
        }
      } catch (error) {
        return {
          agent: agent.name,
          role: agent.role,
          status: 'ERROR',
          responseTime: Date.now() - agentStartTime,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    });
    
    // Wait for all agents to complete (truly parallel)
    console.log('🔄 All agents activated simultaneously - awaiting responses...\n');
    this.results = await Promise.all(sweepPromises);
    
    const totalTime = Date.now() - startTime;
    this.displayResults(totalTime);
    
    return this.results;
  }
  
  displayResults(totalTime) {
    console.log('\n📊 PARALLEL SWEEP RESULTS');
    console.log('========================');
    console.log(`Total Execution Time: ${totalTime}ms\n`);
    
    // Group by status
    const successful = this.results.filter(r => r.status === 'SUCCESS');
    const failed = this.results.filter(r => r.status === 'FAILED');
    const errored = this.results.filter(r => r.status === 'ERROR');
    
    console.log(`✅ SUCCESSFUL: ${successful.length}/${this.results.length}`);
    successful.forEach(result => {
      console.log(`  🟢 ${result.agent.toUpperCase()}: ${result.role}`);
      console.log(`     Response Time: ${result.responseTime}ms`);
    });
    
    if (failed.length > 0) {
      console.log(`\n❌ FAILED: ${failed.length}`);
      failed.forEach(result => {
        console.log(`  🔴 ${result.agent.toUpperCase()}: ${result.error}`);
        console.log(`     Response Time: ${result.responseTime}ms`);
      });
    }
    
    if (errored.length > 0) {
      console.log(`\n💥 ERRORED: ${errored.length}`);
      errored.forEach(result => {
        console.log(`  ⚠️  ${result.agent.toUpperCase()}: ${result.error}`);
        console.log(`     Response Time: ${result.responseTime}ms`);
      });
    }
    
    // Performance metrics
    const avgResponseTime = this.results.reduce((sum, r) => sum + r.responseTime, 0) / this.results.length;
    const maxResponseTime = Math.max(...this.results.map(r => r.responseTime));
    const minResponseTime = Math.min(...this.results.map(r => r.responseTime));
    
    console.log('\n📈 PERFORMANCE METRICS:');
    console.log(`  Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`  Fastest Agent: ${minResponseTime}ms`);
    console.log(`  Slowest Agent: ${maxResponseTime}ms`);
    console.log(`  Parallel Efficiency: ${((minResponseTime / avgResponseTime) * 100).toFixed(1)}%`);
    
    // Success rate
    const successRate = ((successful.length / this.results.length) * 100).toFixed(1);
    console.log(`  Success Rate: ${successRate}%`);
    
    console.log('\n👑 KILO COORDINATION COMPLETE');
    console.log('============================');
    console.log('All 5 agents swept simultaneously with full parallel processing!');
  }
}

// Execute the sweep
async function runSweep() {
  const sweeper = new ParallelAgentSweep();
  await sweeper.executeSweep();
}

// Run when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSweep().catch(console.error);
}

export default ParallelAgentSweep;
export { runSweep };
