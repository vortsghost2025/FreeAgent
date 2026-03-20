#!/usr/bin/env node
/**
 * Verify Unified Shell Routes
 */

import http from 'http';

const PORT = 8889;
const ROUTES = [
  { name: '/shell', path: '/shell', expected: 200 },
  { name: '/unified-shell', path: '/unified-shell', expected: 200 }
];

console.log('🧪 Testing Unified Shell Routes...\n');

async function testRoute(route) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${PORT}${route.path}`, (res) => {
      const status = res.statusCode;
      const isSuccess = status === route.expected;
      
      console.log(`${isSuccess ? '✅' : '❌'} ${route.name}: ${status} ${isSuccess ? 'OK' : 'FAILED'}`);
      
      if (!isSuccess) {
        console.log(`   Expected: ${route.expected}, Got: ${status}`);
      }
      
      // Read a small amount of response to check content
      let data = '';
      res.on('data', chunk => {
        data += chunk;
        if (data.length > 500) res.destroy(); // Stop after 500 chars
      });
      
      res.on('end', () => {
        const hasExpectedContent = data.includes('Claw Federation') || data.includes('Unified Cockpit');
        console.log(`   Content Check: ${hasExpectedContent ? '✅ Found' : '❌ Missing'} expected content`);
        resolve(isSuccess && hasExpectedContent);
      });
    });
    
    req.on('error', (err) => {
      console.log(`❌ ${route.name}: Connection Error - ${err.message}`);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      console.log(`❌ ${route.name}: Timeout`);
      req.destroy();
      resolve(false);
    });
  });
}

async function runTests() {
  let passed = 0;
  let total = ROUTES.length;
  
  console.log('📋 Testing Unified Shell Routes:');
  console.log('================================');
  
  for (const route of ROUTES) {
    const success = await testRoute(route);
    if (success) passed++;
  }
  
  console.log('\n📊 Results Summary:');
  console.log('==================');
  console.log(`✅ Passed: ${passed}/${total} (${Math.round((passed/total)*100)}%)`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 All unified shell routes are working correctly!');
    console.log('💡 Both /shell and /unified-shell now serve the same content');
  } else {
    console.log('\n⚠️  Some routes need attention.');
  }
}

// Run the tests
runTests().catch(console.error);