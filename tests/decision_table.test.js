const assert = require('assert');
const { makeContinuityDecision } = require('../core/continuity_decision.js');

function runTests() {
  console.log('Running decision table tests...');

  // Helper to test a case
  function testCase(name, inputs, expectedAction, expectedOverrideAllowed) {
    try {
      const result = makeContinuityDecision(inputs);
      if (result.action !== expectedAction) {
        throw new Error(`Expected action ${expectedAction} but got ${result.action}`);
      }
      if (result.overrideAllowed !== expectedOverrideAllowed) {
        throw new Error(`Expected overrideAllowed ${expectedOverrideAllowed} but got ${result.overrideAllowed}`);
      }
      console.log(`✓ ${name}`);
    } catch (err) {
      console.error(`✗ ${name}: ${err.message}`);
      process.exit(1);
    }
  }

  // Rule 1: authoritativeMismatch -> ESCALATE (overrideAllowed: false)
  testCase('authoritativeMismatch true -> ESCALATE', 
    { authoritativeMismatch: true, continuityMismatch: false, hashMismatch: false, phenotypeSimilarity: 0.9 }, 
    'ESCALATE', false);
  testCase('authoritativeMismatch true overrides others', 
    { authoritativeMismatch: true, continuityMismatch: true, hashMismatch: true, phenotypeSimilarity: 0.1 }, 
    'ESCALATE', false);

  // Rule 2: hashMismatch -> QUARANTINE (overrideAllowed: true) when authoritativeMismatch is false
  testCase('hashMismatch true -> QUARANTINE (no authoritativeMismatch)', 
    { authoritativeMismatch: false, continuityMismatch: false, hashMismatch: true, phenotypeSimilarity: 0.9 }, 
    'QUARANTINE', true);
  testCase('hashMismatch true with continuityMismatch -> QUARANTINE (hash takes precedence)', 
    { authoritativeMismatch: false, continuityMismatch: true, hashMismatch: true, phenotypeSimilarity: 0.9 }, 
    'QUARANTINE', true);

  // Rule 3: continuityMismatch -> QUARANTINE_REVIEW (overrideAllowed: true) when no authoritativeMismatch and no hashMismatch
  testCase('continuityMismatch true -> QUARANTINE_REVIEW', 
    { authoritativeMismatch: false, continuityMismatch: true, hashMismatch: false, phenotypeSimilarity: 0.9 }, 
    'QUARANTINE_REVIEW', true);

  // Rule 4: phenotypeSimilarity < 0.5 -> WARN (overrideAllowed: true) when no higher priority mismatches
  testCase('phenotypeSimilarity low -> WARN', 
    { authoritativeMismatch: false, continuityMismatch: false, hashMismatch: false, phenotypeSimilarity: 0.4 }, 
    'WARN', true);
  testCase('phenotypeSimilarity exactly 0.5 -> CONTINUE (since <0.5 is false)', 
    { authoritativeMismatch: false, continuityMismatch: false, hashMismatch: false, phenotypeSimilarity: 0.5 }, 
    'CONTINUE', true);

  // Rule 5: else -> CONTINUE (overrideAllowed: true)
  testCase('all good -> CONTINUE', 
    { authoritativeMismatch: false, continuityMismatch: false, hashMismatch: false, phenotypeSimilarity: 0.8 }, 
    'CONTINUE', true);

  console.log('All decision table tests passed!');
}

runTests();