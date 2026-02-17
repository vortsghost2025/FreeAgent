/**
 * Phase 8 Aggregate Test Runner
 * Executes all Phase 8 test suites sequentially and summarizes results.
 */

import { spawnSync } from 'child_process';

const suites = [
  'test-phase-8-1-policy.js',
  'test-phase-8-2-rollout.js',
  'test-phase-8-3-containment.js',
  'test-phase-8-4-evidence.js',
  'test-phase-8-5-governance.js',
  'test-phase-8-completion.js'
];

let passed = 0;
let failed = 0;
const results = [];

console.log('=== PHASE 8: AGGREGATE TEST RUNNER ===');

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

console.log('\n=== PHASE 8: FINAL SUMMARY ===');
for (const result of results) {
  console.log(`${result.suite} -> exit=${result.exitCode}; ${result.summaryLine}`);
}
console.log(`\nSuites Passed: ${passed}/${suites.length}`);
console.log(`Suites Failed: ${failed}/${suites.length}`);

process.exit(failed > 0 ? 1 : 0);

