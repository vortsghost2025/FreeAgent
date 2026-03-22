// Test script for Capability Routing
// Tests automatic file operation detection and delegation

const { detectFileAccessRequirement, createDelegationResponse, Orchestrator } = require('./orchestrator');

console.log('='.repeat(60));
console.log('CAPABILITY ROUTING TEST SUITE');
console.log('='.repeat(60));

// Test cases that should trigger file delegation
const testCasesFileAccess = [
  { message: 'Read the file config.json', expected: true, description: 'READ keyword' },
  { message: 'Show me the contents of app.js', expected: true, description: 'SHOW/CONTENT' },
  { message: 'Write to file output.txt', expected: true, description: 'WRITE keyword' },
  { message: 'Create a new file called test.py', expected: true, description: 'CREATE FILE' },
  { message: 'Delete the temp folder', expected: true, description: 'DELETE' },
  { message: 'List all files in the directory', expected: true, description: 'LIST FILES' },
  { message: 'Search for pattern in src/', expected: true, description: 'SEARCH' },
  { message: 'Find all .js files', expected: true, description: 'FIND FILES' },
  { message: 'Run the build script', expected: true, description: 'EXECUTE' },
  { message: 'What is the absolute path to workspace?', expected: true, description: 'PATH' },
  { message: 'Initialize the workspace', expected: true, description: 'WORKSPACE' },
  { message: './src/index.js', expected: true, description: 'File path in message' },
  { message: 'C:\\Users\\test\\file.txt', expected: true, description: 'Windows path' },
  { message: '~/projects/myapp/package.json', expected: true, description: 'Home path' },
];

// Test cases that should NOT trigger file delegation
const testCasesNoFileAccess = [
  { message: 'What is the weather today?', expected: false, description: 'General question' },
  { message: 'Explain quantum computing', expected: false, description: 'Explanation request' },
  { message: 'Write a poem about love', expected: false, description: 'Creative writing' },
  { message: 'How do I make coffee?', expected: false, description: 'How-to question' },
  { message: 'Calculate 2+2', expected: false, description: 'Math calculation' },
];

console.log('\n--- FILE ACCESS DETECTION TESTS ---\n');

let passed = 0;
let failed = 0;

for (const test of testCasesFileAccess) {
  const result = detectFileAccessRequirement(test.message);
  const status = result.requiresFileAccess === test.expected ? '✓ PASS' : '✗ FAIL';
  if (result.requiresFileAccess === test.expected) {
    passed++;
  } else {
    failed++;
  }
  console.log(`${status}: "${test.message.substring(0, 40)}..."`);
  console.log(`       Expected: ${test.expected}, Got: ${result.requiresFileAccess}, Pattern: ${result.matchedPattern}`);
}

console.log('\n--- NON-FILE ACCESS TESTS ---\n');

for (const test of testCasesNoFileAccess) {
  const result = detectFileAccessRequirement(test.message);
  const status = result.requiresFileAccess === test.expected ? '✓ PASS' : '✗ FAIL';
  if (result.requiresFileAccess === test.expected) {
    passed++;
  } else {
    failed++;
  }
  console.log(`${status}: "${test.message.substring(0, 40)}..."`);
  console.log(`       Expected: ${test.expected}, Got: ${result.requiresFileAccess}`);
}

console.log('\n--- DELEGATION RESPONSE TEST ---\n');

const detection = detectFileAccessRequirement('Read the config file');
const delegation = createDelegationResponse('Read the config file', detection);
console.log('Delegation Response:');
console.log(JSON.stringify(delegation, null, 2));

console.log('\n--- ORCHESTRATOR INTEGRATION TEST ---\n');

const orchestrator = new Orchestrator({ capabilityRouting: true });
console.log('Capability Routing Status:', orchestrator.getCapabilityRoutingStatus());

console.log('\n' + '='.repeat(60));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

process.exit(failed > 0 ? 1 : 0);
