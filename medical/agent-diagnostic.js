#!/usr/bin/env node
/**
 * Agent Status Diagnostic
 * Checks which agents are online/offline and identifies issues
 */

async function diagnoseAgentStatus() {
  console.log('🔍 AGENT STATUS DIAGNOSTIC');
  console.log('==========================');
  
  try {
    // Check 1: Direct agent registry loading
    console.log('\n1️⃣ Checking agent registry...');
    const { loadAgents } = await import('./free-coding-agent/src/agent-registry.js');
    const agents = await loadAgents();
    const agentNames = Object.keys(agents);
    
    console.log(`✅ Loaded agents: ${agentNames.length}`);
    agentNames.forEach(name => {
      const agent = agents[name];
      const hasProcessMethod = typeof agent.processTask === 'function';
      const hasStatusMethod = typeof agent.getStatus === 'function';
      console.log(`   - ${name}: processTask=${hasProcessMethod}, getStatus=${hasStatusMethod}`);
    });
    
    // Check 2: Cockpit server ensemble status
    console.log('\n2️⃣ Checking cockpit ensemble...');
    const response = await fetch('http://localhost:8889/api/ensemble/agents');
    if (response.ok) {
      const ensembleAgents = await response.json();
      console.log(`✅ Cockpit ensemble agents: ${ensembleAgents.length}`);
      console.log('   ', ensembleAgents);
    } else {
      console.log('❌ Failed to get ensemble status');
    }
    
    // Check 3: Individual agent health checks
    console.log('\n3️⃣ Checking individual agent health...');
    for (const agentName of agentNames) {
      try {
        const healthResponse = await fetch(`http://localhost:8889/api/agents/${agentName}/memory`);
        const status = healthResponse.status;
        const statusText = status === 200 ? '✅ ONLINE' : 
                          status === 404 ? '⚠️  NO MEMORY' : 
                          `❌ ERROR ${status}`;
        console.log(`   ${agentName}: ${statusText}`);
      } catch (error) {
        console.log(`   ${agentName}: ❌ CONNECTION FAILED`);
      }
    }
    
    // Check 4: Provider status
    console.log('\n4️⃣ Checking provider status...');
    const providerResponse = await fetch('http://localhost:8889/api/providers/status');
    if (providerResponse.ok) {
      const providerData = await providerResponse.json();
      console.log('Providers:');
      Object.entries(providerData.providers || {}).forEach(([name, info]) => {
        const healthy = info.healthy ? '✅' : '❌';
        const enabled = info.enabled ? 'ENABLED' : 'DISABLED';
        console.log(`   ${name}: ${healthy} ${enabled}`);
      });
    }
    
    // Summary
    console.log('\n📊 DIAGNOSTIC SUMMARY:');
    console.log('=====================');
    console.log(`Registry agents: ${agentNames.length}`);
    console.log(`Cockpit ensemble: ${ensembleAgents?.length || 'Unknown'}`);
    console.log('Issues identified:');
    
    const missingFromEnsemble = agentNames.filter(name => 
      !ensembleAgents || !ensembleAgents.includes(name)
    );
    
    if (missingFromEnsemble.length > 0) {
      console.log(`   ⚠️  Agents missing from ensemble: ${missingFromEnsemble.join(', ')}`);
    }
    
    const nonFunctional = agentNames.filter(name => {
      const agent = agents[name];
      return typeof agent.processTask !== 'function';
    });
    
    if (nonFunctional.length > 0) {
      console.log(`   ⚠️  Non-functional agents: ${nonFunctional.join(', ')}`);
    }
    
    if (missingFromEnsemble.length === 0 && nonFunctional.length === 0) {
      console.log('   ✅ All agents appear functional');
    }
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
  }
}

// Run diagnostic
diagnoseAgentStatus().catch(console.error);