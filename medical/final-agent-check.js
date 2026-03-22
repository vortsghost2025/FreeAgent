#!/usr/bin/env node
/**
 * Final Agent Status Verification
 */

async function verifyAllAgents() {
  console.log('=== FINAL AGENT STATUS VERIFICATION ===');
  
  const agents = ['code', 'data', 'clinical', 'test', 'security', 'api', 'db', 'devops', 'kilo'];
  let onlineCount = 0;
  
  for (const agent of agents) {
    try {
      const response = await fetch(`http://localhost:8889/api/agents/${agent}/memory`);
      const status = response.ok ? '✅ ONLINE' : `❌ ${response.status}`;
      console.log(`${agent.padEnd(12)}: ${status}`);
      if (response.ok) onlineCount++;
    } catch (error) {
      console.log(`${agent.padEnd(12)}: ❌ OFFLINE`);
    }
  }
  
  console.log(`\n📊 SUMMARY: ${onlineCount}/${agents.length} agents operational`);
  
  if (onlineCount === agents.length) {
    console.log('🎉 SUCCESS: ALL AGENTS ARE NOW FULLY OPERATIONAL!');
    console.log('✅ Mega Cockpit should now show all agent tabs as working');
  } else {
    console.log('⚠️  Some agents still offline - further investigation needed');
  }
}

verifyAllAgents().catch(console.error);