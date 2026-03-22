/**
 * Test script for IterationGovernor
 * 
 * Run with: node test-iteration-governor.js
 */

const IterationGovernor = require('./safety/iterationGovernor');

console.log('=== IterationGovernor Test Suite ===\n');

// Test 1: Basic initialization
console.log('Test 1: Basic initialization');
const governor = new IterationGovernor({
  simpleLimit: 5,
  complexLimit: 10,
  circuitBreakerThreshold: 3,
  circuitBreakerResetTime: 5000, // 5 seconds for testing
  warningThreshold: 0.6
});
console.log('✅ Governor created with simpleLimit=5, complexLimit=10\n');

// Test 2: Check limit for new agent (should be allowed)
console.log('Test 2: Check limit for new agent');
let result = governor.checkLimit('agent1', 'simple');
console.log('Result:', result.allowed ? '✅ Allowed' : '❌ Blocked');
console.log('Status:', result.status);
console.log('');

// Test 3: Record iterations
console.log('Test 3: Record iterations');
for (let i = 1; i <= 4; i++) {
  governor.recordIteration('agent1', 'simple');
  const status = governor.getStatus('agent1');
  console.log(`Iteration ${i}: ${status.iterations}/${status.limit} (${status.limitPercentage}%)`);
}
console.log('');

// Test 4: Warning threshold should be reached
console.log('Test 4: Warning threshold check (60% of 5 = 3)');
result = governor.checkLimit('agent1', 'simple');
console.log('At 60% warning threshold:', result.status.limitPercentage >= 60 ? '✅ Passed' : '❌ Failed');
console.log('');

// Test 5: Limit exceeded
console.log('Test 5: Limit exceeded');
governor.recordIteration('agent1', 'simple'); // 5th iteration - at limit
result = governor.checkLimit('agent1', 'simple');
console.log('Check at limit:', result.allowed ? '❌ Should be blocked' : '✅ Blocked correctly');
console.log('Reason:', result.reason);
console.log('');

// Test 6: Per-agent limits
console.log('Test 6: Per-agent limits');
governor.setAgentLimit('agent2', 20);
governor.recordIteration('agent2', 'simple'); // Should use custom limit of 20
const agent2Status = governor.getStatus('agent2');
console.log('Agent2 limit:', agent2Status.limit === 20 ? '✅ Custom limit applied' : '❌ Wrong limit');
console.log('');

// Test 7: Circuit breaker - record errors
console.log('Test 7: Circuit breaker');
const cbGovernor = new IterationGovernor({
  simpleLimit: 10,
  circuitBreakerThreshold: 3,
  circuitBreakerResetTime: 2000 // 2 seconds for testing
});

console.log('Recording errors...');
cbGovernor.recordError('agent3', 'Test error 1');
cbGovernor.recordError('agent3', 'Test error 2');
result = cbGovernor.checkLimit('agent3', 'simple');
console.log('After 2 errors - allowed:', result.allowed ? '✅ Still allowed' : '❌ Should be allowed');

cbGovernor.recordError('agent3', 'Test error 3'); // Should trip
result = cbGovernor.checkLimit('agent3', 'simple');
console.log('After 3 errors - allowed:', result.allowed ? '❌ Should be blocked' : '✅ Circuit breaker tripped');
console.log('Reason:', result.reason);
console.log('');

// Test 8: Reset
console.log('Test 8: Reset functionality');
governor.reset('agent1');
const resetStatus = governor.getStatus('agent1');
console.log('After reset:', resetStatus.iterations === 0 ? '✅ Reset successful' : '❌ Reset failed');
console.log('');

// Test 9: Complex task type
console.log('Test 9: Complex task type');
const complexGovernor = new IterationGovernor({
  simpleLimit: 5,
  complexLimit: 15
});
for (let i = 0; i < 10; i++) {
  complexGovernor.recordIteration('complexAgent', 'complex');
}
const complexStatus = complexGovernor.getStatus('complexAgent');
console.log('Complex task limit check:', complexStatus.limit === 15 ? '✅ Complex limit (15) applied' : '❌ Wrong limit');
console.log('');

// Test 10: Get all status
console.log('Test 10: Get all status');
governor.recordIteration('agent1', 'simple');
governor.recordIteration('agent2', 'simple');
governor.recordIteration('agent3', 'simple');
const allStatus = governor.getAllStatus();
console.log('All agents:', Object.keys(allStatus));
console.log('✅ Status retrieved for all agents');
console.log('');

// Test 11: Get stats
console.log('Test 11: Statistics');
const stats = governor.getStats();
console.log('Stats:', {
  totalAgents: stats.totalAgents,
  totalIterations: stats.totalIterations,
  defaultSimpleLimit: stats.defaultSimpleLimit,
  defaultComplexLimit: stats.defaultComplexLimit,
  circuitBreakerThreshold: stats.circuitBreakerThreshold
});
console.log('✅ Stats retrieved');
console.log('');

// Test 12: Circuit breaker auto-reset
console.log('Test 12: Circuit breaker auto-reset');
const autoResetGovernor = new IterationGovernor({
  simpleLimit: 10,
  circuitBreakerThreshold: 2,
  circuitBreakerResetTime: 1000 // 1 second for testing
});

// Trip the circuit breaker
autoResetGovernor.recordError('testAgent', 'Error 1');
autoResetGovernor.recordError('testAgent', 'Error 2');
result = autoResetGovernor.checkLimit('testAgent');
console.log('After 2 errors - blocked:', result.allowed ? '❌ Should be blocked' : '✅ Correctly blocked');

console.log('Waiting for auto-reset (1 second)...');
setTimeout(() => {
  result = autoResetGovernor.checkLimit('testAgent');
  console.log('After reset time - allowed:', result.allowed ? '✅ Auto-reset worked' : '❌ Auto-reset failed');
  console.log('');
  
  console.log('=== All Tests Complete ===');
}, 1500);
