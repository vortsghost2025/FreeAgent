/**
 * Phase 7 Aggregate Test Runner
 * Executes all Phase 7 test suites sequentially and summarizes results.
 */

import { spawnSync } from 'child_process';

const suites = [
  'test-phase-7-1-cycles.js',
  'test-phase-7-2-diagnostics.js',
  'test-phase-7-3-proposals.js',
  'test-phase-7-4-exploration.js',
  'test-phase-7-5-supervision.js',
  'test-phase-7-6-memory.js',
  'test-phase-7-completion.js'
];

let passed = 0;
let failed = 0;
const results = [];

console.log('=== PHASE 7: AGGREGATE TEST RUNNER ===');

for (const suite of suites) {
  console.log(`\n[Runner] ${suite}`);
  const run = spawnSync(process.execPath, [suite], {
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe']
  });

  const out = (run.stdout || '') + (run.stderr || '');
  const summaryLine = out
    .split(/\r?\n/)
    .filter((line) => /^Tests:\s+\d+\/\d+\s+passed/.test(line))
    .slice(-1)[0] || 'Tests: summary not found';

  if (run.status === 0) {
    passed++;
  } else {
    failed++;
  }

  results.push({
    suite,
    exitCode: run.status,
    summaryLine
  });

  process.stdout.write(out);
}

console.log('\n=== PHASE 7: FINAL SUMMARY ===');
for (const result of results) {
  console.log(`${result.suite} -> exit=${result.exitCode}; ${result.summaryLine}`);
}
console.log(`\nSuites Passed: ${passed}/${suites.length}`);
console.log(`Suites Failed: ${failed}/${suites.length}`);

process.exit(failed > 0 ? 1 : 0);

