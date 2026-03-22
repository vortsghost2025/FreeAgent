/**
 * Test Smart Routing - Verify TaskRouter selects correct agents
 * Run: node test-smart-routing.js
 */

import { TaskRouter } from './free-coding-agent/src/task-router.js';

// Mock provider and memory for testing
const mockProvider = {
  generate: async (prompt) => ({ content: `Response to: ${prompt.substring(0, 50)}...` })
};

const mockMemory = {
  store: () => {},
  retrieve: () => null
};

// Mock agents
const mockAgents = {
  code: { 
    name: 'code', 
    role: 'Code Agent',
    handleMessage: async (msg) => ({ content: `[CODE] Handling: ${msg.substring(0, 30)}...` })
  },
  data: { 
    name: 'data', 
    role: 'Data Agent',
    handleMessage: async (msg) => ({ content: `[DATA] Handling: ${msg.substring(0, 30)}...` })
  },
  clinical: { 
    name: 'clinical', 
    role: 'Clinical Agent',
    handleMessage: async (msg) => ({ content: `[CLINICAL] Handling: ${msg.substring(0, 30)}...` })
  },
  test: { 
    name: 'test', 
    role: 'Test Agent',
    handleMessage: async (msg) => ({ content: `[TEST] Handling: ${msg.substring(0, 30)}...` })
  },
  security: { 
    name: 'security', 
    role: 'Security Agent',
    handleMessage: async (msg) => ({ content: `[SECURITY] Handling: ${msg.substring(0, 30)}...` })
  },
  api: { 
    name: 'api', 
    role: 'API Agent',
    handleMessage: async (msg) => ({ content: `[API] Handling: ${msg.substring(0, 30)}...` })
  },
  db: { 
    name: 'db', 
    role: 'Database Agent',
    handleMessage: async (msg) => ({ content: `[DB] Handling: ${msg.substring(0, 30)}...` })
  },
  devops: { 
    name: 'devops', 
    role: 'DevOps Agent',
    handleMessage: async (msg) => ({ content: `[DEVOPS] Handling: ${msg.substring(0, 30)}...` })
  }
};

const router = new TaskRouter(mockAgents, mockProvider, mockMemory);

// Test cases
const tests = [
  {
    name: 'Code query',
    message: 'write a python function to sort a list',
    expectedAgents: ['code']
  },
  {
    name: 'Clinical query',
    message: 'analyze this patient data for symptoms of diabetes',
    expectedAgents: ['clinical', 'data']
  },
  {
    name: 'Security query',
    message: 'run a security audit and check for vulnerabilities',
    expectedAgents: ['security']
  },
  {
    name: 'Database query',
    message: 'create a SQL query to join tables',
    expectedAgents: ['data', 'db']
  },
  {
    name: 'DevOps query',
    message: 'deploy to kubernetes cluster',
    expectedAgents: ['devops']
  },
  {
    name: 'API query',
    message: 'create a REST endpoint for user authentication',
    expectedAgents: ['api', 'security']
  },
  {
    name: 'Test query',
    message: 'write unit tests for coverage',
    expectedAgents: ['test']
  },
  {
    name: 'Ambiguous query (should default to code)',
    message: 'hello world',
    expectedAgents: ['code']
  }
];

console.log('='.repeat(60));
console.log('SMART ROUTING TEST');
console.log('='.repeat(60));
console.log();

let passed = 0;
let failed = 0;

for (const test of tests) {
  console.log(`\n📋 Test: ${test.name}`);
  console.log(`   Message: "${test.message}"`);
  
  const detected = router.detectRelevantAgents(test.message);
  const expected = test.expectedAgents;
  
  // Check if detected agents include at least one expected agent
  const matches = detected.some(agent => expected.includes(agent));
  
  if (matches) {
    console.log(`   ✅ PASS - Routed to: [${detected.join(', ')}]`);
    passed++;
  } else {
    console.log(`   ❌ FAIL - Expected one of: [${expected.join(', ')}], got: [${detected.join(', ')}]`);
    failed++;
  }
}

console.log('\n' + '='.repeat(60));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

process.exit(failed > 0 ? 1 : 0);
