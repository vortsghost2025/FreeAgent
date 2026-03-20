/**
 * Multi-Agent Routing Test Script
 * Run this to verify each agent responds with its own voice/capabilities
 * 
 * Usage: node test-agents.js
 */

const WebSocket = require('ws');

const WS_URL = 'ws://localhost:3847/ws';
const TEST_MESSAGE = 'Hello! What agent are you? Give me a one-sentence description of your role.';

// Agents to test in order
const AGENTS = ['claude', 'gemini', 'local'];

function sendWsMessage(ws, data) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout')), 30000);
    ws.on('message', (msg) => {
      const data = JSON.parse(msg);
      clearTimeout(timeout);
      resolve(data);
    });
    ws.send(JSON.stringify(data));
  });
}

async function testAgent(ws, agent) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TESTING AGENT: ${agent.toUpperCase()}`);
  console.log('='.repeat(60));
  
  try {
    const response = await sendWsMessage(ws, {
      type: 'orchestrator_chat',
      message: TEST_MESSAGE,
      agent: agent,
      history: []
    });
    
    console.log(`Response type: ${response.type}`);
    console.log(`Agent used: ${response.agent}`);
    console.log(`Response: ${response.text.substring(0, 200)}...`);
    
    return {
      agent,
      success: response.type === 'orchestrator_response',
      responseAgent: response.agent,
      text: response.text
    };
  } catch (error) {
    console.error(`ERROR testing ${agent}:`, error.message);
    return { agent, success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🔬 Multi-Agent Routing Test');
  console.log(`Connecting to ${WS_URL}...`);
  
  const ws = new WebSocket(WS_URL);
  
  return new Promise((resolve, reject) => {
    ws.on('open', async () => {
      console.log('Connected!\n');
      
      const results = [];
      
      // Test each agent
      for (const agent of AGENTS) {
        const result = await testAgent(ws, agent);
        results.push(result);
        // Small delay between tests
        await new Promise(r => setTimeout(r, 500));
      }
      
      ws.close();
      
      // Summary
      console.log(`\n${'='.repeat(60)}`);
      console.log('📊 TEST RESULTS SUMMARY');
      console.log('='.repeat(60));
      
      for (const r of results) {
        const status = r.success ? '✅' : '❌';
        console.log(`${status} ${r.agent}: requested=${r.agent}, responded=${r.responseAgent || 'none'}`);
      }
      
      // Verify routing worked
      const routedCorrectly = results.every(r => r.success && r.responseAgent === r.agent);
      console.log(`\n${routedCorrectly ? '✅ ROUTING WORKING' : '❌ ROUTING FAILED'}`);
      
      resolve(results);
    });
    
    ws.on('error', reject);
  });
}

runTests().catch(console.error);
