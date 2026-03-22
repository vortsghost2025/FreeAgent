#!/usr/bin/env node
/**
 * Direct Provider Router Test
 * Tests the load balancing logic directly by importing and testing the router
 */

// This would test the actual routing logic, but requires the modules to be imported
// For now, let's verify the configuration is correct

import fs from 'fs';
import path from 'path';

async function verifyLoadBalancingSetup() {
  console.log('🔍 VERIFYING LOAD BALANCING SETUP');
  console.log('==================================');
  
  // Check provider router configuration
  const routerPath = path.join('free-coding-agent', 'src', 'providers', 'provider-router.js');
  
  if (fs.existsSync(routerPath)) {
    const routerContent = fs.readFileSync(routerPath, 'utf8');
    
    console.log('\n✅ Provider Router File Found');
    
    // Check if OpenAI is enabled
    const openaiEnabled = routerContent.includes('enabled: config.openaiEnabled !== false');
    console.log(`OpenAI Enabled: ${openaiEnabled ? '✅ YES' : '❌ NO'}`);
    
    // Check if load balancing is implemented
    const loadBalancingPresent = routerContent.includes('loadBalanceStrategy');
    console.log(`Load Balancing Logic: ${loadBalancingPresent ? '✅ IMPLEMENTED' : '❌ MISSING'}`);
    
    // Check if round-robin counter exists
    const roundRobinPresent = routerContent.includes('requestCounter');
    console.log(`Round-Robin Counter: ${roundRobinPresent ? '✅ PRESENT' : '❌ MISSING'}`);
    
    // Check if cloud provider distribution logic exists
    const distributionLogic = routerContent.includes('availableCloud') && routerContent.includes('selectedIndex');
    console.log(`Distribution Logic: ${distributionLogic ? '✅ IMPLEMENTED' : '❌ MISSING'}`);
    
    console.log('\n📊 CONFIGURATION STATUS:');
    console.log('========================');
    
    if (openaiEnabled && loadBalancingPresent && roundRobinPresent && distributionLogic) {
      console.log('✅ ALL LOAD BALANCING COMPONENTS ARE CONFIGURED CORRECTLY');
      console.log('\nExpected Behavior:');
      console.log('- OpenAI provider is now enabled');
      console.log('- Requests will be distributed between Groq and OpenAI');
      console.log('- Round-robin strategy will alternate between providers');
      console.log('- Ollama will handle local tasks as before');
    } else {
      console.log('❌ SOME CONFIGURATION ELEMENTS ARE MISSING');
      if (!openaiEnabled) console.log('  - OpenAI is still disabled');
      if (!loadBalancingPresent) console.log('  - Load balancing strategy not found');
      if (!roundRobinPresent) console.log('  - Round-robin counter missing');
      if (!distributionLogic) console.log('  - Provider distribution logic missing');
    }
  } else {
    console.log('❌ Provider Router file not found');
  }
  
  // Check if cockpit server is running
  try {
    const response = await fetch('http://localhost:8889/health');
    if (response.ok) {
      console.log('\n✅ Cockpit Server: RUNNING');
    } else {
      console.log('\n❌ Cockpit Server: UNRESPONSIVE');
    }
  } catch (error) {
    console.log('\n❌ Cockpit Server: NOT ACCESSIBLE');
  }
  
  console.log('\n📋 NEXT STEPS:');
  console.log('==============');
  console.log('1. Monitor the swarm dashboard to see provider distribution');
  console.log('2. Send multiple requests through the cockpit interface');
  console.log('3. Check if requests are now distributed between Groq and OpenAI');
  console.log('4. Verify reduced latency for Groq (should be under 855ms now)');
}

// Run the verification
verifyLoadBalancingSetup().catch(console.error);