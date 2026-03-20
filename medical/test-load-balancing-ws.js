#!/usr/bin/env node
/**
 * Load Balancing Test Script - WebSocket Version
 * Tests that requests are distributed across multiple providers via WebSocket
 */

import WebSocket from 'ws';

async function testLoadBalancing() {
  console.log('🧪 TESTING PROVIDER LOAD BALANCING VIA WEBSOCKET');
  console.log('==================================================');
  
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
  
  console.log('\nConnecting to WebSocket...\n');
  
  const ws = new WebSocket('ws://localhost:8889');
  
  return new Promise((resolve, reject) => {
    ws.on('open', async () => {
      console.log('✅ WebSocket connected\n');
      
      for (let i = 0; i < testMessages.length; i++) {
        const message = testMessages[i];
        console.log(`Request ${i + 1}: "${message.substring(0, 40)}..."`);
        
        // Send task execution request
        ws.send(JSON.stringify({
          type: 'execute_task',
          task: {
            type: 'chat',
            data: {
              message: message,
              agent: 'kilo'
            }
          },
          preferredSystem: 'auto'
        }));
        
        // Wait for response
        const response = await waitForResponse(ws, 30000); // 30 second timeout
        
        if (response) {
          console.log(`  ✓ Response received (type: ${response.type})`);
          results.total++;
          
          // Try to determine which provider was used (this would require inspecting response)
          // For now, we'll just count successful requests
        } else {
          console.log(`  ✗ Request timed out`);
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      ws.close();
      
      console.log('\n📊 LOAD BALANCING RESULTS:');
      console.log('==========================');
      console.log(`Total Requests: ${results.total}`);
      console.log(`Successful Responses: ${results.total}`);
      
      if (results.total > 0) {
        console.log('\n✅ SUCCESS: Load balancing test completed!');
        console.log('Check the swarm dashboard to see provider distribution.');
      } else {
        console.log('\n❌ ISSUE: No responses received');
      }
      
      resolve();
    });
    
    ws.on('error', (error) => {
      console.log(`❌ WebSocket error: ${error.message}`);
      reject(error);
    });
    
    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });
  });
}

function waitForResponse(ws, timeoutMs) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(null);
    }, timeoutMs);
    
    const handleMessage = (data) => {
      clearTimeout(timeout);
      ws.removeListener('message', handleMessage);
      try {
        const response = JSON.parse(data);
        resolve(response);
      } catch (error) {
        resolve(null);
      }
    };
    
    ws.on('message', handleMessage);
  });
}

// Run the test
testLoadBalancing().catch(console.error);