/**
 * Differential Diagnosis Engine
 *
 * Clinical reasoning system that generates ranked differential diagnoses
 * with supporting evidence, confidence scores, and recommended workup
 */

import { DiseasePatternMatcher } from './disease-pattern-matcher.js';

/**
 * Differential Diagnosis Generator
 */
export class DifferentialDiagnosisEngine {
  constructor(standards, options = {}) {
    this.standards = standards;
    this.debug = options.debug || false;

    // Initialize pattern matcher
    // Standards structure: standards.rules.rules.diseasePatterns
    this.patternMatcher = new DiseasePatternMatcher(
      standards.rules.rules.diseasePatterns,
      standards.rules.rules.labThresholds,
      { debug: this.debug }
    );
  }

  /**
   * Generate differential diagnosis for a patient
   * Returns ranked list with clinical reasoning
   */
  generateDifferential(patientData, options = {}) {
    const maxDifferentials = options.maxDifferentials || 5;
    const minScore = options.minScore || 20; // Minimum score threshold

    // Get pattern matches
    const matches = this.patternMatcher.matchPatterns(patientData);

    // Filter by minimum score
    const significantMatches = matches.filter(m => m.totalScore >= minScore);

    // Categorize by urgency
    const critical = significantMatches.filter(m => m.urgency === 'critical');
    const high = significantMatches.filter(m => m.urgency === 'high');
    const medium = significantMatches.filter(m => m.urgency === 'medium');

    // Get top N
    const topDifferentials = significantMatches.slice(0, maxDifferentials);

    // Generate clinical reasoning
    const differentials = topDifferentials.map(match => {
      return this.buildDifferential(match, patientData);
    });

    // Identify "can't miss" diagnoses
    const cantMiss = this.identifyCantMissDiagnoses(significantMatches, patientData);

    // Generate recommended workup
    const workup = this.generateWorkup(topDifferentials, patientData);

    // Generate clinical pearl
    const pearl = this.generateClinicalPearl(topDifferentials, patientData);

    if (this.debug) {
      console.log(`[DifferentialDx] Generated ${differentials.length} differentials`);
      console.log(`[DifferentialDx] Critical: ${critical.length}, High: ${high.length}, Medium: ${medium.length}`);
    }

    return {
      differentials,
      cantMiss,
      workup,
      pearl,
      summary: {
        total: significantMatches.length,
        critical: critical.length,
        high: high.length,
        medium: medium.length,
        topScore: topDifferentials[0]?.totalScore || 0,
        topDiagnosis: topDifferentials[0]?.disease || 'none'
      }
    };
  }

  /**
   * Build detailed differential entry
   */
  buildDifferential(match, patientData) {
    return {
      rank: null, // Will be assigned by caller
      diagnosis: this.formatDiagnosisName(match.disease),
      score: match.totalScore,
      confidence: match.confidence,
      urgency: match.urgency,
      likelihood: this.scoreToBayesian(match.totalScore, match.confidence),
      supporting: this.buildEvidenceList(match.matched, match.supporting),
      against: this.buildEvidenceList(match.missing, []),
      protocol: match.protocol,
      nextSteps: this.generateNextSteps(match.disease, match.missing),
      clinicalReasoning: this.generateReasoning(match, patientData)
    };
  }

  /**
   * Format disease name for display
   */
  formatDiagnosisName(diseaseKey) {
    // Convert from camelCase to readable
    const readable = diseaseKey
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // Add abbreviations in parentheses
    const abbreviations = {
      'Acute Coronary Syndrome': 'ACS',
      'Diabetic Ketoacidosis': 'DKA',
      'Pulmonary Embolism': 'PE',
      'Acute Kidney Injury': 'AKI'
    };

    if (abbreviations[readable]) {
      return `${readable} (${abbreviations[readable]})`;
    }

    return readable;
  }

  /**
   * Convert score to likelihood category
   */
  scoreToBayesian(score, confidence) {
    // Adjust likelihood based on both score and confidence
    const adjustedScore = score * (confidence / 100);

    if (adjustedScore >= 70) return 'very likely';
    if (adjustedScore >= 50) return 'likely';
    if (adjustedScore >= 30) return 'possible';
    if (adjustedScore >= 15) return 'unlikely';
    return 'very unlikely';
  }

  /**
   * Build evidence list from matched/supporting items
   */
  buildEvidenceList(matched, supporting) {
    const evidence = [];

    matched.forEach(item => {
      let text = item.value;
      if (item.result) {
        text += `: ${item.result}`;
        if (item.status) {
          text += ` (${item.status})`;
        }
      }
      evidence.push({
        text,
        strength: 'strong',
        type: item.type
      });
    });

    supporting.forEach(item => {
      let text = item.value;
      if (item.result) {
        text += `: ${item.result}`;
      }
      evidence.push({
        text,
        strength: 'moderate',
        type: item.type
      });
    });

    return evidence;
  }

  /**
   * Generate next steps for workup
   */
  generateNextSteps(disease, missing) {
    const steps = [];

    // Based on what's missing, suggest next steps
    missing.forEach(item => {
      if (item.type === 'required-lab' && item.reason === 'not tested') {
        steps.push(`Order ${item.value}`);
      } else if (item.type === 'required-symptom') {
        steps.push(`Assess for ${item.value}`);
      }
    });

    // Disease-specific workup
    const diseaseWorkup = {
      acuteCoronarySyndrome: ['ECG', 'Continuous cardiac monitoring', 'Serial troponins', 'Cardiology consult'],
      sepsis: ['Blood cultures x2', 'Lactate q2h', 'Source control imaging', 'Broad-spectrum antibiotics'],
      stroke: ['STAT head CT', 'Neurology consult', 'Time last known well', 'tPA eligibility assessment'],
      pulmonaryEmbolism: ['CTA chest', 'D-dimer', 'Well\'s score', 'Anticoagulation'],
      diabeticKetoacidosis: ['VBG/ABG', 'Beta-hydroxybutyrate', 'Fingerstick glucose q1h', 'Insulin drip'],
      meningitis: ['Lumbar puncture', 'Blood cultures', 'Empiric antibiotics', 'Steroids if indicated'],
      acutePancreatitis: ['CT abdomen', 'Lipase', 'LFTs', 'Ultrasound RUQ', 'NPO status'],
      acuteHeartFailure: ['BNP', 'Chest X-ray', 'Echocardiogram', 'Diuresis'],
      acuteKidneyInjury: ['Renal ultrasound', 'Urine electrolytes', 'Assess for obstruction', 'Nephrology'],
      acuteLiverFailure: ['Hepatitis panel', 'Acetaminophen level', 'Ammonia', 'Hepatology consult']
    };

    if (diseaseWorkup[disease]) {
      steps.push(...diseaseWorkup[disease]);
    }

    return [...new Set(steps)]; // Remove duplicates
  }

  /**
   * Generate clinical reasoning narrative
   */
  generateReasoning(match, patientData) {
    const parts = [];

    // Age/demographics
    if (patientData.patientDemographics) {
      const age = patientData.patientDemographics.age;
      const sex = patientData.patientDemographics.sex;
      parts.push(`${age}-year-old ${sex === 'M' ? 'male' : 'female'}`);
    }

    // Chief complaint
    if (match.matched.length > 0) {
      const symptoms = match.matched.filter(m => m.type === 'required-symptom');
      if (symptoms.length > 0) {
        parts.push(`presenting with ${symptoms.map(s => s.value).join(' and ')}`);
      }
    }

    // Key findings
    const criticalFindings = match.matched.filter(m =>
      (m.type === 'required-lab' && m.status && m.status.includes('critical'))
    );

    if (criticalFindings.length > 0) {
      const findings = criticalFindings.map(f => `${f.value} ${f.result}`).join(', ');
      parts.push(`with concerning lab findings: ${findings}`);
    }

    // Clinical context
    if (match.disease === 'acuteCoronarySyndrome') {
      parts.push('Pattern consistent with cardiac ischemia; high clinical suspicion given troponin elevation');
    } else if (match.disease === 'sepsis') {
      parts.push('Meeting sepsis criteria; consider source control and early antibiotics');
    } else if (match.disease === 'stroke') {
      parts.push('Time-sensitive condition; assess for tPA/thrombectomy eligibility');
    }

    return parts.join('. ') + '.';
  }

  /**
   * Identify "can't miss" critical diagnoses
   */
  identifyCantMissDiagnoses(matches, patientData) {
    const cantMiss = [];

    // Critical diagnoses that shouldn't be missed even with lower scores
    const criticalDiseases = ['stroke', 'acuteCoronarySyndrome', 'sepsis', 'meningitis', 'acuteLiverFailure'];

    matches.forEach(match => {
      if (criticalDiseases.includes(match.disease) && match.totalScore >= 15) {
        cantMiss.push({
          diagnosis: this.formatDiagnosisName(match.disease),
          reason: `Life-threatening condition with ${match.matched.length} matching criteria`,
          score: match.totalScore,
          action: match.protocol || 'immediate-evaluation'
        });
      }
    });

    return cantMiss;
  }

  /**
   * Generate recommended workup strategy
   */
  generateWorkup(differentials, patientData) {
    const workup = {
      immediate: [],
      urgent: [],
      routine: []
    };

    // Collect all next steps from top differentials
    const allSteps = new Set();
    differentials.forEach(diff => {
      if (diff.nextSteps) {
        diff.nextSteps.forEach(step => allSteps.add(step));
      }
    });

    // Categorize by urgency
    const immediateKeywords = ['STAT', 'ECG', 'blood cultures', 'head CT', 'troponin', 'lactate', 'lumbar puncture'];
    const urgentKeywords = ['CT', 'ultrasound', 'consult', 'X-ray', 'cultures'];

    allSteps.forEach(step => {
      const stepLower = step.toLowerCase();

      if (immediateKeywords.some(keyword => stepLower.includes(keyword.toLowerCase()))) {
        workup.immediate.push(step);
      } else if (urgentKeywords.some(keyword => stepLower.includes(keyword.toLowerCase()))) {
        workup.urgent.push(step);
      } else {
        workup.routine.push(step);
      }
    });

    return workup;
  }

  /**
   * Generate clinical pearl
   */
  generateClinicalPearl(differentials, patientData) {
    if (differentials.length === 0) {
      return 'Broad differential - consider obtaining additional history and objective data.';
    }

    const top = differentials[0];

    const pearls = {
      acuteCoronarySyndrome: 'Remember: Troponin can be falsely elevated in renal failure. Always correlate with clinical picture and ECG changes.',
      sepsis: 'Sepsis is a clinical diagnosis. Don\'t wait for positive cultures - treat empirically based on likely source.',
      stroke: 'Time = Brain. Last known well determines tPA window, not when symptoms were discovered.',
      pulmonaryEmbolism: 'Always consider PE in unexplained hypoxia. D-dimer is sensitive but not specific - clinical gestalt matters.',
      diabeticKetoacidosis: 'Don\'t forget to look for the precipitating cause (infection, MI, medication non-compliance).',
      meningitis: 'Don\'t delay antibiotics for LP. Give empiric coverage first if LP will be delayed.',
      acutePancreatitis: 'Lipase > 3x ULN is diagnostic. But remember: normal lipase doesn\'t rule out chronic pancreatitis.',
      acuteHeartFailure: 'BNP helps, but clinical exam (JVP, crackles, edema) is key. Treat based on volume status, not just BNP.',
      acuteKidneyInjury: 'Pre-renal, intrinsic, or post-renal? Always check for obstruction with ultrasound.',
      acuteLiverFailure: 'Acute liver failure is a medical emergency. Early hepatology involvement improves outcomes.'
    };

    return pearls[top.disease] || 'Clinical correlation is essential. Consider alternative diagnoses if presentation is atypical.';
  }

  /**
   * Format differential diagnosis report
   */
  formatReport(differential) {
    const lines = [];

    lines.push('\n========================================');
    lines.push('DIFFERENTIAL DIAGNOSIS');
    lines.push('========================================\n');

    if (differential.differentials.length === 0) {
      lines.push('No significant pattern matches found.');
      lines.push('Consider obtaining additional history and diagnostic studies.');
      return lines.join('\n');
    }

    // Top differentials
    differential.differentials.forEach((dx, index) => {
      dx.rank = index + 1;
      lines.push(`${dx.rank}. ${dx.diagnosis}`);
      lines.push(`   Likelihood: ${dx.likelihood.toUpperCase()} (Score: ${dx.score.toFixed(1)})`);
      lines.push(`   Confidence: ${dx.confidence.toFixed(0)}%`);

      if (dx.supporting && dx.supporting.length > 0) {
        lines.push(`   Supporting:`);
        dx.supporting.slice(0, 3).forEach(ev => {
          lines.push(`     • ${ev.text}`);
        });
      }

      if (dx.against && dx.against.length > 0 && dx.against.length <= 2) {
        lines.push(`   Against:`);
        dx.against.forEach(ev => {
          lines.push(`     • Missing: ${ev.text}`);
        });
      }

      lines.push('');
    });

    // Can't miss diagnoses
    if (differential.cantMiss && differential.cantMiss.length > 0) {
      lines.push('⚠️  CAN\'T MISS DIAGNOSES:');
      differential.cantMiss.forEach(dx => {
        lines.push(`   • ${dx.diagnosis}: ${dx.reason}`);
      });
      lines.push('');
    }

    // Recommended workup
    if (differential.workup) {
      lines.push('RECOMMENDED WORKUP:');

      if (differential.workup.immediate.length > 0) {
        lines.push('   IMMEDIATE:');
        differential.workup.immediate.forEach(step => {
          lines.push(`     • ${step}`);
        });
      }

      if (differential.workup.urgent.length > 0) {
        lines.push('   URGENT:');
        differential.workup.urgent.forEach(step => {
          lines.push(`     • ${step}`);
        });
      }

      if (differential.workup.routine.length > 0 && differential.workup.routine.length <= 5) {
        lines.push('   ROUTINE:');
        differential.workup.routine.forEach(step => {
          lines.push(`     • ${step}`);
        });
      }
      lines.push('');
    }

    // Clinical pearl
    if (differential.pearl) {
      lines.push('💡 CLINICAL PEARL:');
      lines.push(`   ${differential.pearl}`);
      lines.push('');
    }

    lines.push('========================================\n');

    return lines.join('\n');
  }
}

export default DifferentialDiagnosisEngine;
