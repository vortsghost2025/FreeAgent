#!/usr/bin/env node
/**
 * Kilo Recovery Status Check
 * Verifies that all systems Kilo was working on are operational
 */

import fs from 'fs';
import path from 'path';

async function checkKiloRecoveryStatus() {
  console.log('🔍 KILO RECOVERY STATUS CHECK');
  console.log('==============================');
  
  const checks = {
    systems: [],
    status: 'unknown'
  };
  
  try {
    // Check 1: Quantum Orchestrator
    console.log('\n1️⃣ Checking Quantum Orchestrator...');
    const qoPath = path.join('.', 'utils', 'quantum-orchestrator.js');
    if (fs.existsSync(qoPath)) {
      console.log('✅ Quantum Orchestrator: IMPLEMENTED');
      checks.systems.push('quantum-orchestrator');
    } else {
      console.log('❌ Quantum Orchestrator: MISSING');
    }
    
    // Check 2: Memory Systems
    console.log('\n2️⃣ Checking Memory Systems...');
    const wmPath = path.join('.', 'memory', 'working-memory.js');
    const emPath = path.join('.', 'memory', 'episodic-memory.js');
    
    if (fs.existsSync(wmPath) && fs.existsSync(emPath)) {
      console.log('✅ Memory Systems: BOTH IMPLEMENTED');
      checks.systems.push('working-memory', 'episodic-memory');
    } else {
      console.log('❌ Memory Systems: INCOMPLETE');
    }
    
    // Check 3: Parallel Collaboration
    console.log('\n3️⃣ Checking Parallel Collaboration...');
    const pcPath = path.join('.', 'utils', 'parallel-collaboration.js');
    if (fs.existsSync(pcPath)) {
      console.log('✅ Parallel Collaboration: IMPLEMENTED');
      checks.systems.push('parallel-collaboration');
    } else {
      console.log('❌ Parallel Collaboration: MISSING');
    }
    
    // Check 4: Context Distribution
    console.log('\n4️⃣ Checking Context Distribution...');
    const cdPath = path.join('.', 'utils', 'context-distributor.js');
    if (fs.existsSync(cdPath)) {
      console.log('✅ Context Distribution: IMPLEMENTED');
      checks.systems.push('context-distributor');
    } else {
      console.log('❌ Context Distribution: MISSING');
    }
    
    // Check 5: Cockpit Status
    console.log('\n5️⃣ Checking Cockpit Server...');
    try {
      const response = await fetch('http://localhost:8889/health');
      if (response.ok) {
        console.log('✅ Cockpit Server: RUNNING');
        checks.systems.push('cockpit-server');
      } else {
        console.log('❌ Cockpit Server: UNRESPONSIVE');
      }
    } catch (error) {
      console.log('❌ Cockpit Server: NOT ACCESSIBLE');
    }
    
    // Check 6: Agent Status
    console.log('\n6️⃣ Checking Agent Ensemble...');
    try {
      const response = await fetch('http://localhost:8889/api/ensemble/agents');
      if (response.ok) {
        const agents = await response.json();
        console.log(`✅ Agent Ensemble: ${agents.length} AGENTS LOADED`);
        checks.systems.push('agent-ensemble');
      } else {
        console.log('❌ Agent Ensemble: UNAVAILABLE');
      }
    } catch (error) {
      console.log('❌ Agent Ensemble: NOT ACCESSIBLE');
    }
    
    // Summary
    console.log('\n📊 RECOVERY STATUS SUMMARY:');
    console.log('===========================');
    
    const totalSystems = 6;
    const implementedSystems = checks.systems.length;
    const completionPercentage = Math.round((implementedSystems / totalSystems) * 100);
    
    console.log(`Systems Implemented: ${implementedSystems}/${totalSystems} (${completionPercentage}%)`);
    console.log(`Status: ${completionPercentage === 100 ? '✅ COMPLETE' : '⚠️  PARTIAL'}`);
    
    if (completionPercentage === 100) {
      console.log('\n🎉 ALL SYSTEMS RECOVERED!');
      console.log('Kilo can resume work immediately with full context restoration.');
      checks.status = 'complete';
    } else {
      console.log('\n🔧 SOME SYSTEMS NEED ATTENTION');
      console.log('Kilo should verify the missing components before continuing.');
      checks.status = 'partial';
    }
    
    // Save recovery status
    const statusFile = path.join('.', 'KILO_RECOVERY_STATUS.json');
    fs.writeFileSync(statusFile, JSON.stringify(checks, null, 2));
    console.log(`\n💾 Recovery status saved to: ${statusFile}`);
    
  } catch (error) {
    console.error('❌ Recovery check failed:', error.message);
    checks.status = 'error';
  }
  
  return checks;
}

// Run the check
checkKiloRecoveryStatus().catch(console.error);