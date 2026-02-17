/**
 * Rule Engine for WHO Standards
 *
 * Evaluates medical data against WHO clinical rules.
 * Supports versioned standards and pluggable rule sets.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadRules(version = '2024') {
  const rulesPath = path.join(__dirname, 'standards', `who-${version}`, 'rules.json');
  if (!fs.existsSync(rulesPath)) {
    throw new Error(`Rules not found for version: ${version}`);
  }
  return JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
}

export async function evaluateRules(caseData, options = {}) {
  const version = options.version || '2024';
  const debug = options.debug || false;
  const rules = loadRules(version);

  const result = {
    version,
    evaluatedAt: new Date().toISOString(),
    findings: [],
    riskScore: 0,
    alerts: []
  };

  if (debug) console.log(`[RuleEngine] Evaluating with WHO standards ${version}`);

  if (caseData.symptoms) {
    const finding = evaluateSymptomSeverity(caseData.symptoms, rules.rules.symptomSeverity, debug);
    result.findings.push(finding);
    result.riskScore += finding.riskContribution || 0;
  }

  result.riskScore = Math.min(1.0, result.riskScore);
  result.riskSeverity = result.riskScore >= 0.7 ? 'high' : result.riskScore >= 0.4 ? 'medium' : 'low';

  return result;
}

function evaluateSymptomSeverity(symptoms, rules, debug) {
  const finding = { type: 'symptom-severity', matched: [], level: 'mild', riskContribution: 0 };
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
        }
      }
    }
  }

  finding.riskContribution = highestMultiplier * 0.5;
  return finding;
}
