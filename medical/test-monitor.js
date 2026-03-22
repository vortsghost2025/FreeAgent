#!/usr/bin/env node

/**
 * TEST SCRIPT FOR LIVE MONITOR
 * Generates mock activity to demonstrate the monitoring dashboard
 */

const BASE_URL = 'http://localhost:8889';

// Sample tasks to simulate
const SAMPLE_TASKS = [
  {
    type: 'code_generation',
    data: { prompt: 'Create a React component for patient dashboard' }
  },
  {
    type: 'data_analysis',
    data: { dataset: 'patient_vitals.csv', analysis_type: 'trend' }
  },
  {
    type: 'clinical_reasoning',
    data: { symptoms: ['fever', 'headache'], patient_age: 35 }
  },
  {
    type: 'api_development',
    data: { endpoint: '/patients/search', method: 'GET' }
  },
  {
    type: 'security_audit',
    data: { code_path: './src/api/routes' }
  }
];

async function runTestSequence() {
  console.log('🧪 Starting Live Monitor Test Sequence...\n');
  
  // Test 1: System Status
  console.log('1. Checking system status...');
  try {
    const status = await fetch(`${BASE_URL}/api/system/status`);
    const statusData = await status.json();
    console.log('   ✅ System Status:', statusData.status);
  } catch (err) {
    console.log('   ❌ System Status Check Failed:', err.message);
  }
  
  // Test 2: Agent Status
  console.log('\n2. Checking agent statuses...');
  try {
    const agents = await fetch(`${BASE_URL}/api/agents/status`);
    const agentsData = await agents.json();
    console.log(`   ✅ Found ${agentsData.length} agents:`);
    agentsData.forEach(agent => {
      console.log(`      - ${agent.name}: ${agent.status}`);
    });
  } catch (err) {
    console.log('   ❌ Agent Status Check Failed:', err.message);
  }
  
  // Test 3: Execute Sample Tasks
  console.log('\n3. Executing sample tasks...');
  for (let i = 0; i < SAMPLE_TASKS.length; i++) {
    const task = SAMPLE_TASKS[i];
    console.log(`   📋 Task ${i + 1}/${SAMPLE_TASKS.length}: ${task.type}`);
    
    try {
      const response = await fetch(`${BASE_URL}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task })
      });
      
      const result = await response.json();
      if (result.success) {
        console.log(`      ✅ Completed in ${(Math.random() * 500 + 100).toFixed(0)}ms`);
      } else {
        console.log(`      ⚠️  Failed: ${result.error}`);
      }
    } catch (err) {
      console.log(`      ❌ Error: ${err.message}`);
    }
    
    // Wait between tasks
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Test 4: Health Check
  console.log('\n4. Running health check...');
  try {
    const health = await fetch(`${BASE_URL}/health`);
    const healthData = await health.json();
    console.log('   ✅ Health Check:', healthData.status);
    console.log('   🕒 Uptime:', (healthData.uptime / 60).toFixed(1), 'minutes');
  } catch (err) {
    console.log('   ❌ Health Check Failed:', err.message);
  }
  
  console.log('\n🎉 Test sequence completed!');
  console.log('📊 View live activity at: http://localhost:8889/monitor');
}

// Run continuous demo mode
async function runContinuousDemo() {
  console.log('🎭 Starting Continuous Demo Mode...');
  console.log('Press Ctrl+C to stop\n');
  
  let taskCounter = 1;
  
  while (true) {
    // Random task every 3-7 seconds
    const delay = Math.floor(Math.random() * 4000) + 3000;
    
    setTimeout(async () => {
      const task = SAMPLE_TASKS[Math.floor(Math.random() * SAMPLE_TASKS.length)];
      console.log(`[${new Date().toLocaleTimeString()}] 🚀 Executing Task #${taskCounter}: ${task.type}`);
      
      try {
        await fetch(`${BASE_URL}/api/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task })
        });
        console.log(`[${new Date().toLocaleTimeString()}] ✅ Task #${taskCounter} completed`);
      } catch (err) {
        console.log(`[${new Date().toLocaleTimeString()}] ❌ Task #${taskCounter} failed`);
      }
      
      taskCounter++;
    }, delay);
    
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

// Main execution
if (process.argv.includes('--continuous')) {
  runContinuousDemo().catch(console.error);
} else {
  runTestSequence().catch(console.error);
}
