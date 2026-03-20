#!/usr/bin/env node

/**
 * LIVE ACTIVITY GENERATOR
 * Creates realistic demo traffic for screen recording
 */

const BASE_URL = 'http://localhost:8889';

const ACTIVITIES = [
  {
    type: 'chat',
    endpoint: '/api/chat',
    data: { message: "Generate a React component for patient vitals monitoring", agent: 'code' },
    description: '💻 Code Generation Request'
  },
  {
    type: 'chat',
    endpoint: '/api/chat',
    data: { message: "Analyze patient symptoms: fever, headache, fatigue", agent: 'clinical' },
    description: '🏥 Clinical Reasoning Request'
  },
  {
    type: 'chat',
    endpoint: '/api/chat',
    data: { message: "Create API endpoint for patient data retrieval", agent: 'api' },
    description: '📡 API Development Request'
  },
  {
    type: 'status',
    endpoint: '/api/status',
    description: '📊 System Status Check'
  },
  {
    type: 'agents',
    endpoint: '/api/ensemble/agents',
    description: '🤖 Agent Inventory Request'
  },
  {
    type: 'autonomous',
    endpoint: '/api/autonomous/status',
    description: '⚙️ Autonomous Engine Check'
  }
];

async function simulateActivity(count = 15) {
  console.log('🎭 STARTING LIVE ACTIVITY SIMULATION');
  console.log('====================================\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < count; i++) {
    // Pick random activity
    const activity = ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)];
    
    // Random delay between 1-4 seconds
    const delay = Math.floor(Math.random() * 3000) + 1000;
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    const timestamp = new Date().toLocaleTimeString();
    process.stdout.write(`[${timestamp}] ${activity.description}... `);
    
    try {
      const options = {
        method: activity.endpoint.includes('/api/chat') ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' }
      };
      
      if (activity.data) {
        options.body = JSON.stringify(activity.data);
      }
      
      const response = await fetch(`${BASE_URL}${activity.endpoint}`, options);
      
      if (response.ok) {
        console.log('✅');
        successCount++;
      } else {
        console.log('⚠️');
        failCount++;
      }
    } catch (error) {
      console.log('❌');
      failCount++;
    }
  }
  
  console.log('\n🏁 SIMULATION COMPLETE');
  console.log('=====================');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📊 Success Rate: ${((successCount / (successCount + failCount)) * 100).toFixed(1)}%`);
}

// Continuous mode
async function continuousMode() {
  console.log('🎭 CONTINUOUS DEMO MODE - Press Ctrl+C to stop');
  console.log('==============================================\n');
  
  let counter = 1;
  
  while (true) {
    const activity = ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)];
    const delay = Math.floor(Math.random() * 4000) + 2000; // 2-6 seconds
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] 🚀 Activity #${counter}: ${activity.description}`);
    
    try {
      const options = {
        method: activity.endpoint.includes('/api/chat') ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' }
      };
      
      if (activity.data) {
        options.body = JSON.stringify(activity.data);
      }
      
      await fetch(`${BASE_URL}${activity.endpoint}`, options);
      console.log(`[${timestamp}] ✅ Completed`);
    } catch (error) {
      console.log(`[${timestamp}] ❌ Failed`);
    }
    
    counter++;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.includes('--continuous')) {
  continuousMode().catch(console.error);
} else {
  const count = parseInt(args[0]) || 15;
  simulateActivity(count).catch(console.error);
}
