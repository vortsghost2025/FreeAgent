/**
 * WHO Integration Test - Full End-to-End
 * Tests complete WHO data flow with new directory structure
 */

import { mapWHOToInternal } from '../mapping/who-mapper.js';
import { normalizeWHOCase } from '../normalizers/who-normalizer.js';
import { evaluateRules, loadStandards, getAvailableVersions } from '../rules/ruleEngine.js';

console.log('=== WHO INTEGRATION TEST ===\n');

// TEST 1: Verify available standards versions
console.log('TEST 1: Standards Versions');
const versions = getAvailableVersions();
console.log('Available versions:', versions.join(', '));

for (const version of versions) {
  const { metadata, thresholds } = loadStandards(version);
  console.log(`\n${version}:`);
  console.log(`  Name: ${metadata.name}`);
  console.log(`  Status: ${metadata.status || 'active'}`);
  console.log(`  Risk thresholds: ${Object.keys(thresholds.risk).join(', ')}`);
}

// TEST 2: Normalization pipeline
console.log('\n\n' + '='.repeat(60));
console.log('TEST 2: WHO Data Normalization');

const rawWHOCase = {
  caseId: 'WHO-TEST-001',
  source: 'who-surveillance',
  reportDate: '2024-02-17T10:00:00Z',
  country: 'USA',
  symptoms: {
    list: [
      { term: 'Shortness of breath', severity: 'severe' },
      { term: 'Feverish', severity: 'moderate' },
      { term: 'thoracic pain', severity: 'severe' }
    ]
  },
  laboratoryResults: {
    tests: [{
      testName: 'Troponin I',
      value: 12.0,
      unit: 'ng/mL',
      referenceRange: '< 0.04'
    }]
  }
};

console.log('\nNormalizing WHO case...');
const normalized = normalizeWHOCase(rawWHOCase);

console.log('Normalized symptoms:');
normalized.symptoms.list.forEach(s => {
  console.log(`  ${s.originalTerm} → ${s.term} (${s.severity})`);
});

console.log('\nNormalized labs:');
normalized.laboratoryResults.tests.forEach(t => {
  console.log(`  ${t.testName}: ${t.value} ${t.unit} (abnormal: ${t.isAbnormal})`);
});

// TEST 3: Map to internal format
console.log('\n' + '='.repeat(60));
console.log('TEST 3: WHO to Internal Mapping');

const internalFormat = mapWHOToInternal(normalized);
console.log('Mapped to internal format:');
console.log(`  Source: ${internalFormat.source}`);
console.log(`  Symptoms count: ${internalFormat.raw.reportedItems ? internalFormat.raw.reportedItems.length : 0}`);
console.log(`  Severity: ${internalFormat.raw.severity || 'N/A'}`);

// TEST 4: Rule evaluation with 2024 standards
console.log('\n' + '='.repeat(60));
console.log('TEST 4: Rule Evaluation (WHO 2024)');

const evaluation = await evaluateRules(normalized, { version: '2024', debug: true });

console.log('\nEvaluation result:');
console.log(`  Version: ${evaluation.version}`);
console.log(`  Risk Score: ${(evaluation.riskScore * 100).toFixed(0)}%`);
console.log(`  Risk Severity: ${evaluation.riskSeverity}`);
console.log(`  Findings: ${evaluation.findings.length}`);
console.log(`  Alerts: ${evaluation.alerts.length}`);

evaluation.findings.forEach(finding => {
  console.log(`\n  Finding: ${finding.type}`);
  if (finding.matched && finding.matched.length > 0) {
    console.log(`    Matched: ${finding.matched.length} symptom(s)`);
    finding.matched.forEach(m => {
      console.log(`      - "${m.symptom}" → ${m.level}`);
    });
  }
  console.log(`    Risk contribution: ${(finding.riskContribution * 100).toFixed(0)}%`);
});

// TEST 5: Compare across versions
console.log('\n' + '='.repeat(60));
console.log('TEST 5: Cross-Version Comparison');

for (const version of versions) {
  const result = await evaluateRules(normalized, { version });
  console.log(`${version}: risk=${(result.riskScore * 100).toFixed(0)}%, severity=${result.riskSeverity}`);
}

console.log('\n✅ WHO INTEGRATION TEST COMPLETE');
