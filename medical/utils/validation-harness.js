/**
 * Validation Harness - Drift Detection
 *
 * Detects behavioral drift by comparing current pipeline outputs
 * against known-good baseline results. Critical for production
 * systems to catch regressions when code changes.
 *
 * Features:
 * - Baseline generation from test cases
 * - Drift detection with configurable thresholds
 * - Detailed drift reports
 * - Regression alerts
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export class ValidationHarness {
  constructor(options = {}) {
    this.thresholds = {
      maxConfidenceDrift: options.maxConfidenceDrift || 0.1,  // ±10%
      maxRiskScoreDrift: options.maxRiskScoreDrift || 0.15,   // ±15%
      maxCompletenessDrift: options.maxCompletenessDrift || 0.1, // ±10%
      allowTypeChange: options.allowTypeChange || false,
      allowSeverityChange: options.allowSeverityChange || false
    };

    this.strict = options.strict || false;
    this.verbose = options.verbose || false;
  }

  /**
   * Generate baseline from test cases
   * Save known-good outputs for future comparison
   */
  async generateBaseline(orchestrator, testCases, baselinePath) {
    if (this.verbose) {
      console.log(`Generating baseline from ${testCases.length} test cases...`);
    }

    const baseline = {
      generatedAt: new Date().toISOString(),
      moduleVersion: '1.0.0',
      testCases: []
    };

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const inputHash = this._hashInput(testCase.input);

      if (this.verbose) {
        console.log(`  Processing test case ${i + 1}/${testCases.length}: ${testCase.name}`);
      }

      try {
        const result = await orchestrator.executePipeline(testCase.input);

        baseline.testCases.push({
          name: testCase.name,
          inputHash,
          expectedOutput: {
            classificationType: result.output.classification.type,
            classificationConfidence: result.output.classification.confidence,
            riskSeverity: result.output.riskScore.severity,
            riskScore: result.output.riskScore.score,
            summaryCompleteness: result.output.summary.completeness,
            fieldsExtracted: result.output.summary.fieldsExtracted
          }
        });
      } catch (error) {
        if (this.verbose) {
          console.error(`  Failed to process test case ${testCase.name}: ${error.message}`);
        }
        baseline.testCases.push({
          name: testCase.name,
          inputHash,
          error: error.message,
          expectedToFail: testCase.expectedToFail || false
        });
      }
    }

    // Save baseline
    fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));

    if (this.verbose) {
      console.log(`✅ Baseline saved to ${baselinePath}`);
    }

    return baseline;
  }

  /**
   * Load existing baseline
   */
  loadBaseline(baselinePath) {
    if (!fs.existsSync(baselinePath)) {
      throw new Error(`Baseline file not found: ${baselinePath}`);
    }

    const content = fs.readFileSync(baselinePath, 'utf8');
    return JSON.parse(content);
  }

  /**
   * Validate current output against baseline
   * Returns drift report
   */
  async validateAgainstBaseline(orchestrator, testCases, baselinePath) {
    const baseline = this.loadBaseline(baselinePath);

    if (this.verbose) {
      console.log(`Validating ${testCases.length} test cases against baseline...`);
      console.log(`Baseline generated: ${baseline.generatedAt}`);
    }

    const report = {
      validatedAt: new Date().toISOString(),
      baselineDate: baseline.generatedAt,
      totalTests: testCases.length,
      passed: 0,
      failed: 0,
      driftDetected: 0,
      results: []
    };

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const inputHash = this._hashInput(testCase.input);
      const baselineCase = baseline.testCases.find(bc => bc.inputHash === inputHash);

      if (!baselineCase) {
        report.results.push({
          name: testCase.name,
          status: 'SKIP',
          reason: 'No baseline found for this input'
        });
        continue;
      }

      if (this.verbose) {
        console.log(`  Validating ${i + 1}/${testCases.length}: ${testCase.name}`);
      }

      try {
        const result = await orchestrator.executePipeline(testCase.input);
        const currentOutput = {
          classificationType: result.output.classification.type,
          classificationConfidence: result.output.classification.confidence,
          riskSeverity: result.output.riskScore.severity,
          riskScore: result.output.riskScore.score,
          summaryCompleteness: result.output.summary.completeness,
          fieldsExtracted: result.output.summary.fieldsExtracted
        };

        const driftAnalysis = this._detectDrift(
          baselineCase.expectedOutput,
          currentOutput
        );

        if (driftAnalysis.hasDrift) {
          report.failed++;
          report.driftDetected++;
          report.results.push({
            name: testCase.name,
            status: 'DRIFT',
            drift: driftAnalysis.drifts,
            baseline: baselineCase.expectedOutput,
            current: currentOutput
          });
        } else {
          report.passed++;
          report.results.push({
            name: testCase.name,
            status: 'PASS'
          });
        }
      } catch (error) {
        // Check if baseline expected failure
        if (baselineCase.error) {
          report.passed++;
          report.results.push({
            name: testCase.name,
            status: 'PASS',
            note: 'Failed as expected'
          });
        } else {
          report.failed++;
          report.results.push({
            name: testCase.name,
            status: 'FAIL',
            reason: `Unexpected error: ${error.message}`,
            baseline: baselineCase.expectedOutput,
            current: { error: error.message }
          });
        }
      }
    }

    return report;
  }

  /**
   * Detect drift between baseline and current output
   */
  _detectDrift(baseline, current) {
    const drifts = [];

    // Classification type change
    if (baseline.classificationType !== current.classificationType) {
      if (!this.thresholds.allowTypeChange) {
        drifts.push({
          field: 'classification.type',
          baseline: baseline.classificationType,
          current: current.classificationType,
          severity: 'HIGH',
          message: 'Classification type changed'
        });
      }
    }

    // Confidence drift
    const confDrift = Math.abs(baseline.classificationConfidence - current.classificationConfidence);
    if (confDrift > this.thresholds.maxConfidenceDrift) {
      drifts.push({
        field: 'classification.confidence',
        baseline: baseline.classificationConfidence,
        current: current.classificationConfidence,
        drift: confDrift,
        threshold: this.thresholds.maxConfidenceDrift,
        severity: 'MEDIUM',
        message: `Confidence drifted by ${(confDrift * 100).toFixed(1)}%`
      });
    }

    // Risk severity change
    if (baseline.riskSeverity !== current.riskSeverity) {
      if (!this.thresholds.allowSeverityChange) {
        drifts.push({
          field: 'riskScore.severity',
          baseline: baseline.riskSeverity,
          current: current.riskSeverity,
          severity: 'HIGH',
          message: 'Risk severity changed'
        });
      }
    }

    // Risk score drift
    const riskDrift = Math.abs(baseline.riskScore - current.riskScore);
    if (riskDrift > this.thresholds.maxRiskScoreDrift) {
      drifts.push({
        field: 'riskScore.score',
        baseline: baseline.riskScore,
        current: current.riskScore,
        drift: riskDrift,
        threshold: this.thresholds.maxRiskScoreDrift,
        severity: 'MEDIUM',
        message: `Risk score drifted by ${(riskDrift * 100).toFixed(1)}%`
      });
    }

    // Completeness drift
    const completeDrift = Math.abs(baseline.summaryCompleteness - current.summaryCompleteness);
    if (completeDrift > this.thresholds.maxCompletenessDrift) {
      drifts.push({
        field: 'summary.completeness',
        baseline: baseline.summaryCompleteness,
        current: current.summaryCompleteness,
        drift: completeDrift,
        threshold: this.thresholds.maxCompletenessDrift,
        severity: 'LOW',
        message: `Completeness drifted by ${(completeDrift * 100).toFixed(1)}%`
      });
    }

    // Fields extracted count change (strict mode only)
    if (this.strict && baseline.fieldsExtracted !== current.fieldsExtracted) {
      drifts.push({
        field: 'summary.fieldsExtracted',
        baseline: baseline.fieldsExtracted,
        current: current.fieldsExtracted,
        severity: 'LOW',
        message: 'Number of extracted fields changed'
      });
    }

    return {
      hasDrift: drifts.length > 0,
      drifts
    };
  }

  /**
   * Generate human-readable drift report
   */
  formatReport(report) {
    const lines = [];

    lines.push('=== VALIDATION HARNESS REPORT ===\n');
    lines.push(`Validated At: ${report.validatedAt}`);
    lines.push(`Baseline Date: ${report.baselineDate}`);
    lines.push(`Total Tests: ${report.totalTests}`);
    lines.push(`Passed: ${report.passed}`);
    lines.push(`Failed: ${report.failed}`);
    lines.push(`Drift Detected: ${report.driftDetected}\n`);

    if (report.failed === 0 && report.driftDetected === 0) {
      lines.push('✅ ALL TESTS PASSED - No drift detected\n');
    } else {
      lines.push('⚠️  DRIFT DETECTED - Review changes below\n');
    }

    // Show failed/drifted tests
    const problemTests = report.results.filter(r => r.status === 'DRIFT' || r.status === 'FAIL');
    if (problemTests.length > 0) {
      lines.push('FAILED/DRIFTED TESTS:\n');
      problemTests.forEach(test => {
        lines.push(`  ❌ ${test.name}`);
        lines.push(`     Status: ${test.status}`);

        if (test.drift) {
          test.drift.forEach(d => {
            lines.push(`     • ${d.message}`);
            lines.push(`       Field: ${d.field}`);
            lines.push(`       Baseline: ${JSON.stringify(d.baseline)}`);
            lines.push(`       Current:  ${JSON.stringify(d.current)}`);
            if (d.drift) {
              lines.push(`       Drift: ${(d.drift * 100).toFixed(1)}% (threshold: ${(d.threshold * 100).toFixed(1)}%)`);
            }
          });
        }

        if (test.reason) {
          lines.push(`     Reason: ${test.reason}`);
        }

        lines.push('');
      });
    }

    // Show summary by severity
    const allDrifts = problemTests.flatMap(t => t.drift || []);
    if (allDrifts.length > 0) {
      const bySeverity = {
        HIGH: allDrifts.filter(d => d.severity === 'HIGH').length,
        MEDIUM: allDrifts.filter(d => d.severity === 'MEDIUM').length,
        LOW: allDrifts.filter(d => d.severity === 'LOW').length
      };

      lines.push('DRIFT SUMMARY BY SEVERITY:');
      if (bySeverity.HIGH > 0) lines.push(`  🔴 HIGH: ${bySeverity.HIGH}`);
      if (bySeverity.MEDIUM > 0) lines.push(`  🟡 MEDIUM: ${bySeverity.MEDIUM}`);
      if (bySeverity.LOW > 0) lines.push(`  🟢 LOW: ${bySeverity.LOW}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Hash input for stable comparison
   */
  _hashInput(input) {
    const normalized = JSON.stringify(input, Object.keys(input).sort());
    return crypto.createHash('md5').update(normalized).digest('hex');
  }
}

/**
 * Factory function
 */
export function createValidationHarness(options) {
  return new ValidationHarness(options);
}
