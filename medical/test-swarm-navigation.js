#!/usr/bin/env node
/**
 * Verify Swarm UI Navigation Tabs
 */

import http from 'http';

const PORT = 8889;
const TABS = [
  { name: 'Cockpit', path: '/cockpit', expected: 200 },
  { name: 'Master Control', path: '/cockpit', expected: 200 }, // Points to cockpit
  { name: 'Swarm', path: '/swarm', expected: 200 },
  { name: 'Genomics', path: '/swarm-ui.html', expected: 200 }, // Handled by JS
  { name: 'Medical', path: '/cockpit', expected: 200 }, // Points to cockpit
  { name: 'Compute', path: '/swarm-ui.html', expected: 200 } // Handled by JS
];

console.log('🧪 Testing Swarm UI Navigation Tabs...\n');

async function testTab(tab) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${PORT}${tab.path}`, (res) => {
      const status = res.statusCode;
      const isSuccess = status === tab.expected;
      
      console.log(`${isSuccess ? '✅' : '❌'} ${tab.name}: ${status} ${isSuccess ? 'OK' : 'FAILED'}`);
      
      if (!isSuccess) {
        console.log(`   Expected: ${tab.expected}, Got: ${status}`);
      }
      
      resolve(isSuccess);
    });
    
    req.on('error', (err) => {
      console.log(`❌ ${tab.name}: Connection Error - ${err.message}`);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      console.log(`❌ ${tab.name}: Timeout`);
      req.destroy();
      resolve(false);
    });
  });
}

async function runTests() {
  let passed = 0;
  let total = TABS.length;
  
  console.log('📋 Testing Navigation Targets:');
  console.log('============================');
  
  for (const tab of TABS) {
    const success = await testTab(tab);
    if (success) passed++;
  }
  
  console.log('\n📊 Results Summary:');
  console.log('==================');
  console.log(`✅ Passed: ${passed}/${total} (${Math.round((passed/total)*100)}%)`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 All navigation tabs are working correctly!');
  } else {
    console.log('\n⚠️  Some navigation targets need attention.');
  }
  
  console.log('\n💡 Note: Genomics and Compute tabs are client-side only');
  console.log('   and handled by JavaScript within swarm-ui.html');
}

// Run the tests
runTests().catch(console.error);