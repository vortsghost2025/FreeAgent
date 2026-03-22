#!/usr/bin/env node
/**
 * Load Balancing Test Script
 * Tests that requests are distributed across multiple providers
 */

async function testLoadBalancing() {
  console.log('🧪 TESTING PROVIDER LOAD BALANCING');
  console.log('=====================================');
  
  const testMessages = [
    "Analyze this medical case for potential diagnoses",
    "Review this security vulnerability in the code",
    "Debug this JavaScript error in the cockpit",
    "Optimize this database query for better performance",
    "Generate unit tests for this API endpoint",
    "Review this clinical trial protocol for compliance"
  ];
  
  const results = {
    ollama: 0,
    openai: 0,
    groq: 0,
    total: 0
  };
  
  console.log('\nSending test requests...\n');
  
  for (let i = 0; i < testMessages.length; i++) {
    const message = testMessages[i];
    console.log(`Request ${i + 1}: "${message.substring(0, 40)}..."`);
    
    try {
      const response = await fetch('http://localhost:8889/api/agent/kilo/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: message,
          provider: 'auto' // Let the router decide
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        // Parse the provider from the response or log
        console.log(`  ✓ Response received (length: ${data.response?.length || 0} chars)`);
        results.total++;
      } else {
        console.log(`  ✗ Request failed: ${response.status}`);
      }
    } catch (error) {
      console.log(`  ✗ Error: ${error.message}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 LOAD BALANCING RESULTS:');
  console.log('==========================');
  console.log(`Total Requests: ${results.total}`);
  console.log(`Ollama (local): ${results.ollama} requests`);
  console.log(`OpenAI (cloud): ${results.openai} requests`);
  console.log(`Groq (cloud): ${results.groq} requests`);
  
  if (results.total > 0) {
    const openaiPercent = ((results.openai / results.total) * 100).toFixed(1);
    const groqPercent = ((results.groq / results.total) * 100).toFixed(1);
    console.log(`\n📈 Distribution:`);
    console.log(`  OpenAI: ${openaiPercent}%`);
    console.log(`  Groq: ${groqPercent}%`);
    
    if (results.openai > 0 && results.groq > 0) {
      console.log('\n✅ SUCCESS: Load balancing is working!');
      console.log('Requests are being distributed across multiple providers.');
    } else if (results.openai === 0 && results.groq > 0) {
      console.log('\n⚠️  PARTIAL: Only Groq is receiving requests');
      console.log('OpenAI may be disabled or unavailable.');
    } else if (results.openai > 0 && results.groq === 0) {
      console.log('\n⚠️  PARTIAL: Only OpenAI is receiving requests');
      console.log('Groq may be disabled or unavailable.');
    } else {
      console.log('\n❌ ISSUE: No cloud providers are receiving requests');
    }
  }
}

// Run the test
testLoadBalancing().catch(console.error);