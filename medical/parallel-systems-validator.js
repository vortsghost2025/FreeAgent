#!/usr/bin/env node
/**
 * Parallel Systems Test Validator
 * Tests that all agents can be activated and run tests in parallel
 */

import { loadAgents } from './free-coding-agent/src/agent-registry.js';

async function runParallelSystemsTest() {
  console.log('🧪 PARALLEL SYSTEMS TEST VALIDATOR');
  console.log('===================================');
  
  try {
    // Load all agents
    console.log('\n1️⃣ Loading all agents...');
    const agents = await loadAgents();
    const agentNames = Object.keys(agents);
    
    console.log(`✅ Loaded ${agentNames.length} agents:`, agentNames.join(', '));
    
    // Verify kilo agent is present
    console.log('\n2️⃣ Verifying Kilo agent...');
    if (agents.kilo) {
      console.log('✅ Kilo agent found and loaded');
      console.log('   Role:', agents.kilo.role);
      console.log('   Capabilities:', agents.kilo.capabilities.join(', '));
    } else {
      console.log('❌ Kilo agent NOT found - this was the previous error');
      return false;
    }
    
    // Test parallel activation
    console.log('\n3️⃣ Testing parallel agent activation...');
    
    const testTask = {
      id: 'test-' + Date.now(),
      type: 'system_check',
      description: 'Parallel systems test validation'
    };
    
    // Run all agents in parallel
    const agentPromises = agentNames.map(async (agentName) => {
      const agent = agents[agentName];
      try {
        console.log(`   🚀 Activating ${agentName} agent...`);
        const result = await agent.processTask(testTask);
        return { agent: agentName, success: true, result };
      } catch (error) {
        console.log(`   ❌ ${agentName} agent failed:`, error.message);
        return { agent: agentName, success: false, error: error.message };
      }
    });
    
    const results = await Promise.all(agentPromises);
    
    // Analyze results
    console.log('\n4️⃣ Test Results Summary:');
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`   ✅ Successful: ${successful}/${results.length}`);
    console.log(`   ❌ Failed: ${failed}/${results.length}`);
    
    if (failed > 0) {
      console.log('\n   Failed agents:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`     - ${r.agent}: ${r.error}`);
      });
    }
    
    // Final assessment
    console.log('\n🎯 FINAL ASSESSMENT:');
    if (successful === results.length) {
      console.log('   🎉 ALL AGENTS ACTIVATED SUCCESSFULLY!');
      console.log('   🚀 Parallel systems test should now work without "Agent kilo not found" error');
      return true;
    } else {
      console.log('   ⚠️  Some agents failed - investigation needed');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test validation failed:', error.message);
    return false;
  }
}

// Run the validation
runParallelSystemsTest().then(success => {
  if (success) {
    console.log('\n📋 RECOMMENDATION:');
    console.log('The "Agent kilo not found" error should now be resolved.');
    console.log('You can safely run the full parallel systems test.');
  } else {
    console.log('\n📋 ACTION REQUIRED:');
    console.log('Investigate the failed agents before proceeding.');
  }
}).catch(console.error);