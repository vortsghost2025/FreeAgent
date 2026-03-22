#!/usr/bin/env node
/**
 * Test cockpit API for rate limiting issues
 */

import http from 'http';

const PORT = 8889;
const HOST = 'localhost';

async function makeRequest(data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: HOST,
      port: PORT,
      path: '/api/execute',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: responseData
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function testRateLimiting() {
  console.log('🧪 Testing cockpit API for rate limiting...\n');
  
  const testData = {
    task: {
      type: 'test',
      data: 'test data for rate limiting check'
    }
  };

  // Make 5 rapid requests
  const requests = [];
  for (let i = 0; i < 5; i++) {
    requests.push(makeRequest(testData));
  }

  try {
    const results = await Promise.all(requests);
    
    console.log('📊 Results:');
    results.forEach((result, index) => {
      console.log(`Request ${index + 1}: Status ${result.statusCode}`);
      if (result.statusCode !== 200) {
        console.log(`  Error: ${result.data.substring(0, 200)}...`);
      }
      
      // Check for rate limiting headers
      if (result.headers['retry-after']) {
        console.log(`  ⚠️  Retry-After header: ${result.headers['retry-after']}`);
      }
      if (result.headers['x-ratelimit-limit']) {
        console.log(`  ⚠️  Rate Limit: ${result.headers['x-ratelimit-limit']}`);
      }
      if (result.headers['x-ratelimit-remaining']) {
        console.log(`  ⚠️  Remaining: ${result.headers['x-ratelimit-remaining']}`);
      }
      if (result.headers['x-ratelimit-reset']) {
        console.log(`  ⚠️  Reset: ${result.headers['x-ratelimit-reset']}`);
      }
    });
    
    // Check if any requests failed with 429 (Too Many Requests)
    const rateLimited = results.filter(r => r.statusCode === 429);
    if (rateLimited.length > 0) {
      console.log(`\n🚨 ${rateLimited.length} requests were rate limited (429 Too Many Requests)`);
    } else {
      console.log('\n✅ No rate limiting detected in rapid requests');
    }
    
  } catch (error) {
    console.error('❌ Error making requests:', error.message);
  }
}

// Run the test
testRateLimiting().catch(console.error);