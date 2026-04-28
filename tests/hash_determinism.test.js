const assert = require('assert');
const { hashContinuity } = require('../core/continuity_hasher.js');

function runTests() {
  console.log('Running hash determinism tests...');

  // Test 1: same inputs -> same hash
  try {
    const snapshot = { version: '1.0', data: [1, 2, 3] };
    const runtimeState = { timestamp: 1000, nodeId: 'abc' };
    const hash1 = hashContinuity(snapshot, runtimeState);
    const hash2 = hashContinuity(snapshot, runtimeState);
    assert.strictEqual(hash1, hash2);
    console.log('✓ Test 1 passed: same inputs -> same hash');
  } catch (err) {
    console.error('✗ Test 1 failed:', err.message);
    process.exit(1);
  }

  // Test 2: different snapshot -> different hash
  try {
    const snapshot1 = { version: '1.0', data: [1, 2, 3] };
    const snapshot2 = { version: '1.0', data: [1, 2, 4] };
    const runtimeState = { timestamp: 1000, nodeId: 'abc' };
    const hash1 = hashContinuity(snapshot1, runtimeState);
    const hash2 = hashContinuity(snapshot2, runtimeState);
    assert.notStrictEqual(hash1, hash2);
    console.log('✓ Test 2 passed: different snapshot -> different hash');
  } catch (err) {
    console.error('✗ Test 2 failed:', err.message);
    process.exit(1);
  }

  // Test 3: different runtime state -> different hash
  try {
    const snapshot = { version: '1.0', data: [1, 2, 3] };
    const runtimeState1 = { timestamp: 1000, nodeId: 'abc' };
    const runtimeState2 = { timestamp: 1000, nodeId: 'abd' };
    const hash1 = hashContinuity(snapshot, runtimeState1);
    const hash2 = hashContinuity(snapshot, runtimeState2);
    assert.notStrictEqual(hash1, hash2);
    console.log('✓ Test 3 passed: different runtime state -> different hash');
  } catch (err) {
    console.error('✗ Test 3 failed:', err.message);
    process.exit(1);
  }

  // Test 4: both change -> different hash
  try {
    const snapshot1 = { version: '1.0', data: [1, 2, 3] };
    const snapshot2 = { version: '1.0', data: [1, 2, 4] };
    const runtimeState1 = { timestamp: 1000, nodeId: 'abc' };
    const runtimeState2 = { timestamp: 1000, nodeId: 'abd' };
    const hash1 = hashContinuity(snapshot1, runtimeState1);
    const hash2 = hashContinuity(snapshot2, runtimeState2);
    assert.notStrictEqual(hash1, hash2);
    console.log('✓ Test 4 passed: both change -> different hash');
  } catch (err) {
    console.error('✗ Test 4 failed:', err.message);
    process.exit(1);
  }

  console.log('All hash determinism tests passed!');
}

runTests();