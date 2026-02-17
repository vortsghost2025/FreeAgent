/**
 * Phase 8.4 Test Suite - Compliance Evidence Ledger
 */

import { ComplianceEvidenceLedger } from './medical/intelligence/compliance-evidence-ledger.js';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (!condition) {
    console.log(`x ${message}`);
    testsFailed++;
  } else {
    console.log(`ok ${message}`);
    testsPassed++;
  }
}

console.log('=== PHASE 8.4: COMPLIANCE EVIDENCE LEDGER ===\n');

// Test 1: Append evidence entries
const ledger = new ComplianceEvidenceLedger();
const e1 = ledger.appendEvidence('CANDIDATE_SUBMITTED', 'rel-a', { target: 'scheduler' });
const e2 = ledger.appendEvidence('RELEASE_STARTED', 'rel-a', { stagePct: 1 });
const e3 = ledger.appendEvidence('STAGE_EVALUATED', 'rel-a', { pass: true });
assert(e1.success && e2.success && e3.success, 'Evidence ledger: append evidence entries');

// Test 2: Integrity verifies for untampered chain
const valid = ledger.verifyIntegrity();
assert(valid.valid, 'Evidence ledger: verify chain integrity');

// Test 3: Query entries by release id
const relA = ledger.getEntriesByRelease('rel-a');
assert(relA.length === 3, 'Evidence ledger: query entries by release');

// Test 4: Recent entries limit works
const recent = ledger.getRecentEntries(2);
assert(recent.length === 2, 'Evidence ledger: return limited recent entries');

// Test 5: Summary returns by event type
const summary = ledger.getSummary();
assert(summary.totalEntries === 3 && summary.byEventType.RELEASE_STARTED === 1, 'Evidence ledger: summary by event type');

// Test 6: Tamper detection catches mutated payload
const tampered = new ComplianceEvidenceLedger();
tampered.appendEvidence('A', 'rel-b', { value: 1 });
tampered.appendEvidence('B', 'rel-b', { value: 2 });
tampered.entries[1].payload.value = 9;
const tamperResult = tampered.verifyIntegrity();
assert(!tamperResult.valid && tamperResult.failedAtIndex === 1, 'Evidence ledger: detect tampering');

console.log(`\nTests: ${testsPassed}/${testsPassed + testsFailed} passed`);
process.exit(testsFailed > 0 ? 1 : 0);

