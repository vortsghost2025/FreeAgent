/**
 * Rule Engine for WHO Standards
 *
 * Evaluates medical data against WHO clinical rules.
 * Supports versioned standards with thresholds and metadata.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load complete standards (rules + thresholds + metadata)
 */
export function loadStandards(version = '2024') {
  const basePath = path.join(__dirname, '..', 'standards', `who-${version}`);

  const rulesPath = path.join(basePath, 'rules.json');
  const thresholdsPath = path.join(basePath, 'thresholds.json');
  const metadataPath = path.join(basePath, 'metadata.json');

  if (!fs.existsSync(rulesPath)) {
    throw new Error(`Rules not found for version: ${version}`);
  }

  const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
  const thresholds = fs.existsSync(thresholdsPath)
    ? JSON.parse(fs.readFileSync(thresholdsPath, 'utf8'))
    : null;
  const metadata = fs.existsSync(metadataPath)
    ? JSON.parse(fs.readFileSync(metadataPath, 'utf8'))
    : null;

  return { rules, thresholds, metadata };
}

/**
 * Legacy function - load just rules
 */
export function loadRules(version = '2024') {
  const { rules } = loadStandards(version);
  return rules;
}

/**
 * Evaluate case against WHO standards
 */
export async function evaluateRules(caseData, options = {}) {
  const version = options.version || '2024';
  const debug = options.debug || false;
  const whoDebug = options.whoDebug || false;

  const { rules, thresholds, metadata } = loadStandards(version);

  const result = {
    version,
    evaluatedAt: new Date().toISOString(),
    findings: [],
    riskScore: 0,
    alerts: [],
    metadata: metadata
  };

  if (debug || whoDebug) {
    console.log(`[RuleEngine] Evaluating with WHO standards ${version}`);
    if (metadata) {
      console.log(`[RuleEngine] Standards: ${metadata.name} (${metadata.status || 'active'})`);
    }
  }

  // Evaluate symptoms
  if (caseData.symptoms) {
    const finding = evaluateSymptomSeverity(caseData.symptoms, rules.rules.symptomSeverity, debug || whoDebug);
    result.findings.push(finding);
    result.riskScore += finding.riskContribution || 0;
  }

  // Evaluate lab results (if implemented in rules)
  if (caseData.laboratoryResults && rules.rules.labThresholds) {
    const finding = evaluateLabThresholds(caseData.laboratoryResults, rules.rules.labThresholds, debug || whoDebug);
    result.findings.push(finding);
    result.riskScore += finding.riskContribution || 0;

    if (finding.alerts) {
      result.alerts.push(...finding.alerts);
    }
  }

  // Normalize risk score to 0-1
  result.riskScore = Math.min(1.0, result.riskScore);

  // Determine risk severity using thresholds
  if (thresholds && thresholds.risk) {
    result.riskSeverity = determineRiskSeverity(result.riskScore, thresholds.risk);
  } else {
    // Fallback to simple thresholds
    result.riskSeverity = result.riskScore >= 0.7 ? 'high' : result.riskScore >= 0.4 ? 'medium' : 'low';
  }

  if (debug || whoDebug) {
    console.log(`[RuleEngine] Final risk score: ${(result.riskScore * 100).toFixed(0)}% (${result.riskSeverity})`);
    console.log(`[RuleEngine] Findings: ${result.findings.length}, Alerts: ${result.alerts.length}`);
  }

  return result;
}

/**
 * Determine risk severity from score using thresholds
 */
function determineRiskSeverity(score, riskThresholds) {
  // Check in order: critical > high > medium > low
  if (riskThresholds.critical && score >= riskThresholds.critical.minScore) {
    return 'critical';
  }
  if (riskThresholds.high && score >= riskThresholds.high.minScore) {
    return 'high';
  }if (riskThresholds.medium &&
      score >= riskThresholds.medium.minScore &&
      score < riskThresholds.medium.maxScore) {
    return 'medium';
  }
  return 'low';
}

/**
 * Evaluate symptom severity
 */
function evaluateSymptomSeverity(symptoms, rules, debug) {
  const finding = {
    type: 'symptom-severity',
    matched: [],
    level: 'mild',
    riskContribution: 0
  };

  const symptomList = symptoms.list || [];
  let highestMultiplier = 0;

  for (const level in rules) {
    const rule = rules[level];
    for (const symptom of symptomList) {
      const term = symptom.term.toLowerCase();
      for (const keyword of rule.keywords || []) {
        if (term.includes(keyword.toLowerCase())) {
          finding.matched.push({ symptom: term, level, keyword });
          if (rule.scoreMultiplier > highestMultiplier) {
            highestMultiplier = rule.scoreMultiplier;
            finding.level = level;
          }

          if (debug) {
            console.log(`[RuleEngine] Matched: "${term}" → ${level} (keyword: "${keyword}")`);
          }
        }
      }
    }
  }

  finding.riskContribution = highestMultiplier * 0.5;
  return finding;
}

/**
 * Evaluate laboratory thresholds
 */
function evaluateLabThresholds(labs, rules, debug) {
  const finding = {
    type: 'laboratory-thresholds',
    abnormal: [],
    critical: [],
    riskContribution: 0,
    alerts: []
  };

  const tests = labs.tests || [];

  for (const test of tests) {
    const testKey = test.testName.toLowerCase().replace(/\s+/g, '');
    const rule = rules[testKey];

    if (!rule || test.value === undefined) continue;

    // Check critical threshold
    if (rule.critical && test.value >= rule.critical.value) {
      finding.critical.push({
        test: test.testName,
        value: test.value,
        threshold: rule.critical.value,
        unit: rule.critical.unit
      });
      finding.riskContribution += 0.3;

      if (rule.critical.action) {
        finding.alerts.push({
          level: 'critical',
          test: test.testName,
          action: rule.critical.action,
          value: test.value
        });
      }

      if (debug) {
        console.log(`[RuleEngine] CRITICAL: ${test.testName} = ${test.value} (threshold: ${rule.critical.value})`);
      }
    }
    // Check abnormal threshold
    else if (rule.abnormal && test.value >= rule.abnormal.value) {
      finding.abnormal.push({
        test: test.testName,
        value: test.value,
        threshold: rule.abnormal.value,
        unit: rule.abnormal.unit
      });
      finding.riskContribution += 0.1;

      if (debug) {
        console.log(`[RuleEngine] ABNORMAL: ${test.testName} = ${test.value} (threshold: ${rule.abnormal.value})`);
      }
    }
  }

  return finding;
}

/**
 * Get available standards versions
 */
export function getAvailableVersions() {
  const standardsDir = path.join(__dirname, '..', 'standards');

  if (!fs.existsSync(standardsDir)) {
    return [];
  }

  return fs.readdirSync(standardsDir)
    .filter(dir => dir.startsWith('who-'))
    .map(dir => dir.replace('who-', ''))
    .sort();
}

