/**
 * Disease Pattern Matching Engine
 *
 * Advanced clinical reasoning using:
 * - Symptom cluster matching
 * - Lab signature recognition
 * - Vital sign pattern analysis
 * - Weighted scoring with confidence intervals
 */

/**
 * Pattern Matcher
 * Scores patient data against disease definitions
 */
export class DiseasePatternMatcher {
  constructor(diseasePatterns, labThresholds, options = {}) {
    this.patterns = diseasePatterns;
    this.labThresholds = labThresholds;
    this.debug = options.debug || false;
  }

  /**
   * Match patient against all disease patterns
   * Returns ranked list of potential diagnoses
   */
  matchPatterns(patientData) {
    const matches = [];

    for (const [diseaseKey, pattern] of Object.entries(this.patterns)) {
      const score = this.scorePattern(diseaseKey, pattern, patientData);

      if (score.totalScore > 0) {
        matches.push({
          disease: diseaseKey,
          totalScore: score.totalScore,
          confidence: score.confidence,
          matched: score.matched,
          missing: score.missing,
          supporting: score.supporting,
          urgency: pattern.urgency,
          protocol: pattern.protocol,
          details: score.details
        });
      }
    }

    // Sort by total score descending
    matches.sort((a, b) => b.totalScore - a.totalScore);

    if (this.debug) {
      console.log(`[PatternMatcher] Evaluated ${Object.keys(this.patterns).length} patterns, found ${matches.length} matches`);
    }

    return matches;
  }

  /**
   * Score a single disease pattern against patient data
   */
  scorePattern(diseaseKey, pattern, patientData) {
    const score = {
      totalScore: 0,
      confidence: 0,
      matched: [],
      missing: [],
      supporting: [],
      details: {}
    };

    // Extract patient data
    const symptoms = this.extractSymptoms(patientData);
    const labs = this.extractLabs(patientData);
    const vitals = patientData.vitalSigns || {};

    // 1. Required symptoms check
    const requiredSymptoms = pattern.requiredSymptoms || [];
    let requiredSymptomScore = 0;

    requiredSymptoms.forEach(reqSymptom => {
      const normalized = reqSymptom.toLowerCase();
      const found = symptoms.some(s => {
        const sNorm = s.term.toLowerCase();
        return sNorm === normalized ||
               sNorm.includes(normalized) ||
               normalized.includes(sNorm);
      });

      if (found) {
        requiredSymptomScore += 1;
        score.matched.push({ type: 'required-symptom', value: reqSymptom });
      } else {
        score.missing.push({ type: 'required-symptom', value: reqSymptom });
      }
    });

    // If missing required symptoms, penalize heavily
    if (requiredSymptoms.length > 0) {
      const requiredRatio = requiredSymptomScore / requiredSymptoms.length;
      score.totalScore += requiredRatio * 40; // Up to 40 points for required symptoms
      score.details.requiredSymptomMatch = requiredRatio;

      // If less than 50% of required symptoms, not a good match
      if (requiredRatio < 0.5) {
        return score; // Early exit
      }
    }

    // 2. Supporting symptoms check
    const supportingSymptoms = pattern.supportingSymptoms || [];
    let supportingSymptomScore = 0;

    supportingSymptoms.forEach(suppSymptom => {
      const normalized = suppSymptom.toLowerCase();
      const found = symptoms.some(s => {
        const sNorm = s.term.toLowerCase();
        return sNorm === normalized ||
               sNorm.includes(normalized) ||
               normalized.includes(sNorm);
      });

      if (found) {
        supportingSymptomScore += 1;
        score.supporting.push({ type: 'supporting-symptom', value: suppSymptom });
      }
    });

    if (supportingSymptoms.length > 0) {
      const supportingRatio = supportingSymptomScore / supportingSymptoms.length;
      score.totalScore += supportingRatio * 20; // Up to 20 points for supporting symptoms
      score.details.supportingSymptomMatch = supportingRatio;
    }

    // 3. Required labs check
    const requiredLabs = pattern.requiredLabs || [];
    let requiredLabScore = 0;

    requiredLabs.forEach(reqLab => {
      const lab = labs.find(l => l.testName.toLowerCase().includes(reqLab.toLowerCase()));

      if (lab) {
        // Check if lab value is abnormal based on thresholds
        const threshold = this.labThresholds[reqLab.toLowerCase().replace(/\s+/g, '')];
        const isAbnormal = this.isLabAbnormal(lab, threshold);

        if (isAbnormal) {
          requiredLabScore += 1;
          score.matched.push({
            type: 'required-lab',
            value: reqLab,
            result: `${lab.value} ${lab.unit}`,
            status: isAbnormal
          });
        } else {
          score.missing.push({
            type: 'required-lab',
            value: reqLab,
            reason: 'within normal limits'
          });
        }
      } else {
        score.missing.push({ type: 'required-lab', value: reqLab, reason: 'not tested' });
      }
    });

    if (requiredLabs.length > 0) {
      const requiredLabRatio = requiredLabScore / requiredLabs.length;
      score.totalScore += requiredLabRatio * 30; // Up to 30 points for required labs
      score.details.requiredLabMatch = requiredLabRatio;
    }

    // 4. Supporting labs check
    const supportingLabs = pattern.supportingLabs || [];
    let supportingLabScore = 0;

    supportingLabs.forEach(suppLab => {
      const lab = labs.find(l => l.testName.toLowerCase().includes(suppLab.toLowerCase()));

      if (lab) {
        const threshold = this.labThresholds[suppLab.toLowerCase().replace(/\s+/g, '')];
        const isAbnormal = this.isLabAbnormal(lab, threshold);

        if (isAbnormal) {
          supportingLabScore += 1;
          score.supporting.push({
            type: 'supporting-lab',
            value: suppLab,
            result: `${lab.value} ${lab.unit}`,
            status: isAbnormal
          });
        }
      }
    });

    if (supportingLabs.length > 0) {
      const supportingLabRatio = supportingLabScore / supportingLabs.length;
      score.totalScore += supportingLabRatio * 10; // Up to 10 points for supporting labs
      score.details.supportingLabMatch = supportingLabRatio;
    }

    // 5. Vital signs pattern matching (if defined)
    if (pattern.vitalPatterns) {
      const vitalScore = this.matchVitalPatterns(vitals, pattern.vitalPatterns);
      score.totalScore += vitalScore.score;
      score.details.vitalMatch = vitalScore.ratio;

      if (vitalScore.matched.length > 0) {
        score.matched.push(...vitalScore.matched);
      }
    }

    // Calculate confidence based on data completeness and match quality
    const totalCriteria = (requiredSymptoms.length || 0) +
                          (supportingSymptoms.length || 0) +
                          (requiredLabs.length || 0) +
                          (supportingLabs.length || 0);

    const totalMatched = score.matched.length + score.supporting.length;

    if (totalCriteria > 0) {
      score.confidence = Math.min(100, (totalMatched / totalCriteria) * 100);
    }

    // Normalize total score to 0-100 range
    score.totalScore = Math.min(100, score.totalScore);

    return score;
  }

  /**
   * Check if lab value is abnormal based on thresholds
   */
  isLabAbnormal(lab, threshold) {
    if (!threshold || lab.value === undefined) {
      return null;
    }

    // Check critical thresholds
    if (threshold.critical) {
      if (typeof threshold.critical === 'object' && threshold.critical.value !== undefined) {
        if (lab.value >= threshold.critical.value) {
          return 'critical';
        }
      }
    }

    if (threshold.critical_high && lab.value >= threshold.critical_high.value) {
      return 'critical-high';
    }

    if (threshold.critical_low && lab.value <= threshold.critical_low.value) {
      return 'critical-low';
    }

    // Check abnormal thresholds
    if (threshold.elevated && lab.value >= threshold.elevated.value) {
      return 'elevated';
    }

    if (threshold.abnormal && lab.value >= threshold.abnormal.value) {
      return 'abnormal';
    }

    if (threshold.high && lab.value >= threshold.high.value) {
      return 'high';
    }

    if (threshold.low && lab.value <= threshold.low.value) {
      return 'low';
    }

    return null; // Within normal limits
  }

  /**
   * Match vital sign patterns
   */
  matchVitalPatterns(vitals, vitalPatterns) {
    const result = {
      score: 0,
      ratio: 0,
      matched: []
    };

    let totalPatterns = 0;
    let matchedPatterns = 0;

    // Heart rate patterns
    if (vitalPatterns.heartRate) {
      totalPatterns++;
      const hr = vitals.heartRate;

      if (hr) {
        if (vitalPatterns.heartRate.tachycardia && hr >= 100) {
          matchedPatterns++;
          result.matched.push({ type: 'vital-pattern', value: 'tachycardia', hr });
        }
        if (vitalPatterns.heartRate.severeTachycardia && hr >= 130) {
          matchedPatterns++;
          result.matched.push({ type: 'vital-pattern', value: 'severe-tachycardia', hr });
        }
        if (vitalPatterns.heartRate.bradycardia && hr <= 60) {
          matchedPatterns++;
          result.matched.push({ type: 'vital-pattern', value: 'bradycardia', hr });
        }
      }
    }

    // Blood pressure patterns
    if (vitalPatterns.bloodPressure) {
      totalPatterns++;
      const bp = vitals.bloodPressure;

      if (bp && bp.systolic) {
        if (vitalPatterns.bloodPressure.hypertension && bp.systolic >= 140) {
          matchedPatterns++;
          result.matched.push({ type: 'vital-pattern', value: 'hypertension', systolic: bp.systolic });
        }
        if (vitalPatterns.bloodPressure.hypotension && bp.systolic <= 90) {
          matchedPatterns++;
          result.matched.push({ type: 'vital-pattern', value: 'hypotension', systolic: bp.systolic });
        }
        if (vitalPatterns.bloodPressure.shock && bp.systolic <= 70) {
          matchedPatterns++;
          result.matched.push({ type: 'vital-pattern', value: 'shock', systolic: bp.systolic });
        }
      }
    }

    // Oxygen saturation patterns
    if (vitalPatterns.oxygenSaturation) {
      totalPatterns++;
      const o2 = vitals.oxygenSaturation;

      if (o2) {
        if (vitalPatterns.oxygenSaturation.hypoxia && o2 <= 94) {
          matchedPatterns++;
          result.matched.push({ type: 'vital-pattern', value: 'hypoxia', o2 });
        }
        if (vitalPatterns.oxygenSaturation.severeHypoxia && o2 <= 88) {
          matchedPatterns++;
          result.matched.push({ type: 'vital-pattern', value: 'severe-hypoxia', o2 });
        }
      }
    }

    // Respiratory rate patterns
    if (vitalPatterns.respiratoryRate) {
      totalPatterns++;
      const rr = vitals.respiratoryRate;

      if (rr) {
        if (vitalPatterns.respiratoryRate.tachypnea && rr >= 20) {
          matchedPatterns++;
          result.matched.push({ type: 'vital-pattern', value: 'tachypnea', rr });
        }
        if (vitalPatterns.respiratoryRate.severeTachypnea && rr >= 30) {
          matchedPatterns++;
          result.matched.push({ type: 'vital-pattern', value: 'severe-tachypnea', rr });
        }
      }
    }

    if (totalPatterns > 0) {
      result.ratio = matchedPatterns / totalPatterns;
      result.score = result.ratio * 10; // Up to 10 points for vital patterns
    }

    return result;
  }

  /**
   * Extract symptoms from patient data
   */
  extractSymptoms(patientData) {
    if (patientData.symptoms && patientData.symptoms.list) {
      return patientData.symptoms.list;
    }
    return [];
  }

  /**
   * Extract labs from patient data
   */
  extractLabs(patientData) {
    if (patientData.laboratoryResults && patientData.laboratoryResults.tests) {
      return patientData.laboratoryResults.tests;
    }
    return [];
  }

  /**
   * Get top N matches
   */
  getTopMatches(matches, n = 5) {
    return matches.slice(0, n);
  }

  /**
   * Format match for display
   */
  formatMatch(match) {
    const lines = [];
    lines.push(`\n${match.disease.toUpperCase()}`);
    lines.push(`  Score: ${match.totalScore.toFixed(1)}/100`);
    lines.push(`  Confidence: ${match.confidence.toFixed(0)}%`);
    lines.push(`  Urgency: ${match.urgency || 'medium'}`);

    if (match.matched.length > 0) {
      lines.push(`  Matched (${match.matched.length}):`);
      match.matched.slice(0, 3).forEach(m => {
        if (m.result) {
          lines.push(`    ✓ ${m.value}: ${m.result} (${m.status})`);
        } else {
          lines.push(`    ✓ ${m.value}`);
        }
      });
    }

    if (match.supporting.length > 0) {
      lines.push(`  Supporting (${match.supporting.length}):`);
      match.supporting.slice(0, 2).forEach(m => {
        if (m.result) {
          lines.push(`    + ${m.value}: ${m.result}`);
        } else {
          lines.push(`    + ${m.value}`);
        }
      });
    }

    if (match.missing.length > 0 && match.missing.length <= 3) {
      lines.push(`  Missing:`);
      match.missing.forEach(m => {
        lines.push(`    - ${m.value} ${m.reason ? `(${m.reason})` : ''}`);
      });
    }

    if (match.protocol) {
      lines.push(`  Protocol: ${match.protocol}`);
    }

    return lines.join('\n');
  }
}

export default DiseasePatternMatcher;
