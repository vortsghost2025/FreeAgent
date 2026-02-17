/**
 * WHO Clinical Workflow Engine
 *
 * End-to-end pipeline for processing WHO clinical cases
 * Integrates: data fetching → normalization → mapping → rule evaluation → decision support
 */

import WHODataFetcher from './who/who-data-fetcher.js';
import { normalizeWHOCase } from './normalizers/who-normalizer.js';
import { mapWHOToInternal } from './mapping/who-mapper.js';
import { evaluateRules, loadStandards } from './rules/ruleEngine.js';

/**
 * Clinical Workflow Orchestrator
 */
export class WHOClinicalWorkflow {
  constructor(options = {}) {
    this.dataFetcher = new WHODataFetcher({ mockMode: options.mockMode !== false });
    this.standardsVersion = options.standardsVersion || '2024';
    this.standards = null;
    this.debug = options.debug || false;
  }

  /**
   * Initialize workflow (load standards)
   */
  async initialize() {
    if (this.debug) console.log('[Workflow] Initializing...');
    this.standards = loadStandards(this.standardsVersion);
    if (this.debug) console.log(`[Workflow] Loaded standards: ${this.standards.metadata.name} v${this.standards.metadata.version}`);
  }

  /**
   * Process a single WHO case through complete pipeline
   * @param {string} caseId - WHO case identifier
   * @returns {Object} Complete clinical assessment
   */
  async processCase(caseId) {
    const startTime = Date.now();

    // Step 1: Fetch WHO data
    if (this.debug) console.log(`\n[Workflow] Step 1: Fetching case ${caseId}...`);
    const rawWHOData = await this.dataFetcher.fetchCase(caseId);
    if (!rawWHOData) {
      throw new Error(`Failed to fetch case ${caseId}`);
    }
    if (this.debug) console.log(`[Workflow] Fetched from: ${rawWHOData.source} (${rawWHOData.country})`);

    // Step 2: Normalize WHO data
    if (this.debug) console.log('[Workflow] Step 2: Normalizing data...');
    const normalizedData = normalizeWHOCase(rawWHOData, { language: 'en', convertUnits: true });
    if (this.debug) {
      console.log(`[Workflow] Normalized ${normalizedData.symptoms?.list?.length || 0} symptoms`);
      console.log(`[Workflow] Normalized ${normalizedData.laboratoryResults?.tests?.length || 0} lab tests`);
    }

    // Step 3: Map to internal format
    if (this.debug) console.log('[Workflow] Step 3: Mapping to internal format...');
    const internalFormat = mapWHOToInternal(normalizedData);

    // Step 4: Evaluate clinical rules
    if (this.debug) console.log('[Workflow] Step 4: Evaluating clinical rules...');
    const evaluation = await evaluateRules(normalizedData, {
      version: this.standardsVersion,
      debug: this.debug
    });

    // Step 5: Generate clinical recommendations
    if (this.debug) console.log('[Workflow] Step 5: Generating recommendations...');
    const recommendations = this.generateRecommendations(evaluation, normalizedData);

    // Step 6: Check for critical protocols
    if (this.debug) console.log('[Workflow] Step 6: Checking critical protocols...');
    const protocols = this.identifyProtocols(evaluation);

    const processingTime = Date.now() - startTime;

    return {
      caseId: rawWHOData.caseId,
      source: rawWHOData.source,
      country: rawWHOData.country,
      facility: rawWHOData.facility,
      patientDemographics: normalizedData.patientDemographics,
      evaluation: {
        riskScore: evaluation.riskScore,
        riskSeverity: evaluation.riskSeverity,
        confidence: evaluation.confidence || 0.85,
        findings: evaluation.findings,
        alerts: evaluation.alerts
      },
      recommendations,
      protocols,
      processingTime,
      timestamp: new Date().toISOString(),
      standardsVersion: this.standardsVersion
    };
  }

  /**
   * Process batch of WHO cases
   * @param {Object} filters - Filter criteria for fetching cases
   * @returns {Array} Processed clinical assessments
   */
  async processBatch(filters = {}) {
    const startTime = Date.now();

    if (this.debug) console.log(`\n[Workflow] Processing batch with filters:`, filters);

    // Fetch cases
    const cases = await this.dataFetcher.fetchCases(filters);
    if (this.debug) console.log(`[Workflow] Fetched ${cases.length} cases`);

    // Process each case
    const results = [];
    for (let i = 0; i < cases.length; i++) {
      if (this.debug) console.log(`\n[Workflow] Processing case ${i + 1}/${cases.length}...`);

      try {
        // For batch processing, inject the case directly instead of fetching again
        const rawWHOData = cases[i];
        const normalizedData = normalizeWHOCase(rawWHOData, { language: 'en', convertUnits: true });
        const internalFormat = mapWHOToInternal(normalizedData);
        const evaluation = await evaluateRules(normalizedData, {
          version: this.standardsVersion,
          debug: false // Suppress debug for batch
        });
        const recommendations = this.generateRecommendations(evaluation, normalizedData);
        const protocols = this.identifyProtocols(evaluation);

        results.push({
          caseId: rawWHOData.caseId,
          source: rawWHOData.source,
          country: rawWHOData.country,
          riskScore: evaluation.riskScore,
          riskSeverity: evaluation.riskSeverity,
          recommendations: recommendations.map(r => r.action),
          protocols: protocols.map(p => p.name)
        });
      } catch (error) {
        console.error(`Failed to process case ${i}:`, error);
        results.push({
          caseId: cases[i].caseId,
          error: error.message
        });
      }
    }

    const totalTime = Date.now() - startTime;
    const avgTime = totalTime / cases.length;

    if (this.debug) {
      console.log(`\n[Workflow] Batch complete: ${results.length} cases processed in ${totalTime}ms (avg: ${avgTime.toFixed(1)}ms/case)`);
    }

    return {
      results,
      statistics: {
        totalCases: cases.length,
        successful: results.filter(r => !r.error).length,
        failed: results.filter(r => r.error).length,
        totalTime,
        avgTime
      }
    };
  }

  /**
   * Generate clinical recommendations based on evaluation
   */
  generateRecommendations(evaluation, patientData) {
    const recommendations = [];

    // Critical findings
    const criticalFindings = evaluation.findings?.filter(f => f.severity === 'critical' || f.critical?.length > 0);
    if (criticalFindings && criticalFindings.length > 0) {
      recommendations.push({
        priority: 'critical',
        action: 'Immediate medical attention required',
        reason: `${criticalFindings.length} critical finding(s) detected`,
        findings: criticalFindings
      });
    }

    // Risk-based recommendations
    if (evaluation.riskSeverity === 'critical' || evaluation.riskScore >= 0.85) {
      recommendations.push({
        priority: 'critical',
        action: 'Activate emergency response protocol',
        reason: `Critical risk score: ${(evaluation.riskScore * 100).toFixed(0)}%`
      });
    } else if (evaluation.riskSeverity === 'high' || evaluation.riskScore >= 0.65) {
      recommendations.push({
        priority: 'high',
        action: 'Urgent medical evaluation required',
        reason: `High risk score: ${(evaluation.riskScore * 100).toFixed(0)}%`
      });
    } else if (evaluation.riskSeverity === 'medium') {
      recommendations.push({
        priority: 'medium',
        action: 'Medical evaluation recommended',
        reason: `Moderate risk score: ${(evaluation.riskScore * 100).toFixed(0)}%`
      });
    }

    // Lab-specific recommendations
    const labFindings = evaluation.findings?.find(f => f.type === 'laboratory-thresholds');
    if (labFindings) {
      if (labFindings.critical && labFindings.critical.length > 0) {
        labFindings.critical.forEach(crit => {
          recommendations.push({
            priority: 'critical',
            action: `Critical lab: ${crit.test}`,
            value: crit.value,
            reason: 'Immediate intervention required'
          });
        });
      }

      if (labFindings.abnormal && labFindings.abnormal.length > 0) {
        recommendations.push({
          priority: 'medium',
          action: `${labFindings.abnormal.length} abnormal lab result(s)`,
          reason: 'Further investigation needed'
        });
      }
    }

    // Vital signs recommendations
    const vitalFindings = evaluation.findings?.find(f => f.type === 'vital-signs');
    if (vitalFindings && vitalFindings.abnormal && vitalFindings.abnormal.length > 0) {
      recommendations.push({
        priority: 'high',
        action: 'Monitor vital signs closely',
        abnormalities: vitalFindings.abnormal.map(a => a.vital),
        reason: 'Abnormal vital signs detected'
      });
    }

    // Drug interaction warnings
    if (patientData.medications) {
      // Check for contraindications based on lab results
      const drugWarnings = this.checkDrugInteractions(patientData, evaluation);
      recommendations.push(...drugWarnings);
    }

    return recommendations;
  }

  /**
   * Identify applicable clinical protocols
   */
  identifyProtocols(evaluation) {
    const protocols = [];

    // Check for disease patterns that trigger protocols
    if (evaluation.diseasePatterns) {
      for (const [disease, match] of Object.entries(evaluation.diseasePatterns)) {
        if (match.matched && match.protocol) {
          protocols.push({
            name: match.protocol,
            disease: disease,
            confidence: match.confidence || 0.8,
            urgency: match.urgency,
            reason: `Pattern match: ${disease}`
          });
        }
      }
    }

    // Risk-based protocols
    if (evaluation.riskScore >= 0.85) {
      protocols.push({
        name: 'rapid-response-team',
        urgency: 'critical',
        reason: 'Critical risk score requires immediate response'
      });
    }

    // Lab-triggered protocols
    const labFindings = evaluation.findings?.find(f => f.type === 'laboratory-thresholds');
    if (labFindings && labFindings.alerts) {
      labFindings.alerts.forEach(alert => {
        if (alert.action) {
          protocols.push({
            name: alert.action,
            test: alert.test,
            urgency: alert.level,
            reason: `Lab alert: ${alert.test}`
          });
        }
      });
    }

    return protocols;
  }

  /**
   * Check for drug interactions and contraindications
   */
  checkDrugInteractions(patientData, evaluation) {
    const warnings = [];

    if (!patientData.medications || !this.standards.rules.drugInteractions) {
      return warnings;
    }

    // Check lab-based contraindications
    const labs = patientData.laboratoryResults?.tests || [];

    patientData.medications.forEach(med => {
      const drugRules = this.standards.rules.drugInteractions[med.toLowerCase()];
      if (!drugRules) return;

      // Check lab contraindications
      if (drugRules.contraindicated_if) {
        Object.entries(drugRules.contraindicated_if).forEach(([lab, condition]) => {
          const labResult = labs.find(l => l.testName.toLowerCase().includes(lab));
          if (labResult && condition.above && labResult.value > condition.above) {
            warnings.push({
              priority: 'critical',
              action: `CONTRAINDICATION: ${med}`,
              reason: `${lab} = ${labResult.value} (exceeds threshold ${condition.above})`,
              recommendation: 'Consider alternative medication'
            });
          }
        });
      }

      // Check drug-drug interactions
      if (drugRules.contraindicated) {
        patientData.medications.forEach(otherMed => {
          if (drugRules.contraindicated.includes(otherMed.toLowerCase())) {
            warnings.push({
              priority: 'high',
              action: `DRUG INTERACTION: ${med} + ${otherMed}`,
              reason: 'Contraindicated combination',
              recommendation: 'Review medication list with prescriber'
            });
          }
        });
      }
    });

    return warnings;
  }

  /**
   * Generate clinical summary report
   */
  generateSummary(result) {
    const lines = [];
    lines.push(`\n========================================`);
    lines.push(`WHO CLINICAL ASSESSMENT REPORT`);
    lines.push(`========================================`);
    lines.push(`Case ID: ${result.caseId}`);
    lines.push(`Source: ${result.source} (${result.country})`);
    lines.push(`Facility: ${result.facility}`);
    if (result.patientDemographics) {
      lines.push(`Patient: ${result.patientDemographics.age}yo ${result.patientDemographics.sex}`);
    }
    lines.push(`\n--- RISK ASSESSMENT ---`);
    lines.push(`Risk Score: ${(result.evaluation.riskScore * 100).toFixed(0)}% (${result.evaluation.riskSeverity.toUpperCase()})`);
    lines.push(`Confidence: ${(result.evaluation.confidence * 100).toFixed(0)}%`);

    if (result.evaluation.findings && result.evaluation.findings.length > 0) {
      lines.push(`\n--- CLINICAL FINDINGS ---`);
      result.evaluation.findings.forEach((finding, i) => {
        lines.push(`${i + 1}. ${finding.type}: ${finding.matched || finding.abnormal?.length || finding.critical?.length || 0} item(s)`);
        if (finding.critical && finding.critical.length > 0) {
          finding.critical.forEach(c => {
            lines.push(`   CRITICAL: ${c.test} = ${c.value}`);
          });
        }
      });
    }

    if (result.recommendations && result.recommendations.length > 0) {
      lines.push(`\n--- RECOMMENDATIONS ---`);
      result.recommendations.forEach((rec, i) => {
        lines.push(`${i + 1}. [${rec.priority.toUpperCase()}] ${rec.action}`);
        lines.push(`   ${rec.reason}`);
      });
    }

    if (result.protocols && result.protocols.length > 0) {
      lines.push(`\n--- ACTIVATED PROTOCOLS ---`);
      result.protocols.forEach((protocol, i) => {
        lines.push(`${i + 1}. ${protocol.name} (${protocol.urgency})`);
        lines.push(`   ${protocol.reason}`);
      });
    }

    lines.push(`\n--- METADATA ---`);
    lines.push(`Standards: WHO ${result.standardsVersion}`);
    lines.push(`Processing Time: ${result.processingTime}ms`);
    lines.push(`Timestamp: ${result.timestamp}`);
    lines.push(`========================================\n`);

    return lines.join('\n');
  }
}

export default WHOClinicalWorkflow;
