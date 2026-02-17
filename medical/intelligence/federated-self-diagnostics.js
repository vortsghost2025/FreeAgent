/**
 * Phase 7.2: Federated Self-Diagnostics
 * Drift, nondeterminism, ledger integrity, privacy correctness, convergence, latency.
 */

export class DriftDetector {
  constructor(options = {}) {
    this.driftThreshold = options.driftThreshold || 0.2;
  }

  detect(referenceMetrics = [], currentMetrics = []) {
    if (referenceMetrics.length === 0 || currentMetrics.length === 0) {
      return {
        status: 'UNKNOWN',
        driftScore: 0,
        reason: 'INSUFFICIENT_DATA'
      };
    }

    const refMean = referenceMetrics.reduce((sum, n) => sum + n, 0) / referenceMetrics.length;
    const curMean = currentMetrics.reduce((sum, n) => sum + n, 0) / currentMetrics.length;
    const denominator = Math.max(Math.abs(refMean), 1e-9);
    const driftScore = Math.abs(curMean - refMean) / denominator;

    return {
      status: driftScore > this.driftThreshold ? 'DEGRADED' : 'HEALTHY',
      driftScore: Number(driftScore.toFixed(4)),
      referenceMean: Number(refMean.toFixed(4)),
      currentMean: Number(curMean.toFixed(4))
    };
  }
}

export class NondeterminismScanner {
  scan(runResults = []) {
    if (runResults.length === 0) {
      return {
        status: 'UNKNOWN',
        nondeterminismScore: 0,
        unstableSuites: []
      };
    }

    const grouped = new Map();
    for (const run of runResults) {
      if (!grouped.has(run.suite)) grouped.set(run.suite, []);
      const signature = `${run.passCount || 0}/${run.total || 0}:${run.fingerprint || ''}`;
      grouped.get(run.suite).push(signature);
    }

    const unstableSuites = [];
    for (const [suite, signatures] of grouped) {
      const unique = new Set(signatures);
      if (unique.size > 1) unstableSuites.push(suite);
    }

    const nondeterminismScore = grouped.size > 0 ? unstableSuites.length / grouped.size : 0;
    return {
      status: unstableSuites.length > 0 ? 'DEGRADED' : 'HEALTHY',
      nondeterminismScore: Number(nondeterminismScore.toFixed(4)),
      unstableSuites
    };
  }
}

export class VersionLedgerIntegrityChecker {
  verify(versionHistory = []) {
    if (versionHistory.length === 0) {
      return {
        status: 'UNKNOWN',
        modelsChecked: 0,
        issues: ['EMPTY_LEDGER']
      };
    }

    const byModel = new Map();
    for (const entry of versionHistory) {
      if (!entry || !entry.modelId || typeof entry.version !== 'number') continue;
      if (!byModel.has(entry.modelId)) byModel.set(entry.modelId, []);
      byModel.get(entry.modelId).push(entry.version);
    }

    const issues = [];
    let brokenModels = 0;
    for (const [modelId, versions] of byModel) {
      const sorted = versions.slice().sort((a, b) => a - b);
      const seen = new Set();
      let isBroken = false;
      for (let i = 0; i < sorted.length; i++) {
        if (seen.has(sorted[i])) {
          isBroken = true;
          issues.push(`DUPLICATE_VERSION:${modelId}:${sorted[i]}`);
        }
        seen.add(sorted[i]);
        if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
          isBroken = true;
          issues.push(`VERSION_GAP:${modelId}:${sorted[i - 1]}-${sorted[i]}`);
        }
      }
      if (isBroken) brokenModels++;
    }

    return {
      status: issues.length > 0 ? 'DEGRADED' : 'HEALTHY',
      modelsChecked: byModel.size,
      brokenModels,
      issues
    };
  }
}

export class PrivacyAggregatorCorrectnessChecker {
  constructor(options = {}) {
    this.minComplianceRate = options.minComplianceRate || 100;
    this.maxOutlierRatio = options.maxOutlierRatio || 0.2;
  }

  verify(privacyReport = {}, secureSumSamples = []) {
    const issues = [];
    const complianceRate = Number(privacyReport.complianceRate || 0);

    if ((privacyReport.status || 'UNKNOWN') !== 'COMPLIANT') {
      issues.push('PRIVACY_STATUS_NON_COMPLIANT');
    }

    if (complianceRate < this.minComplianceRate) {
      issues.push('COMPLIANCE_RATE_BELOW_THRESHOLD');
    }

    for (const sample of secureSumSamples) {
      const valuesCount = sample.valuesCount || 1;
      const outlierCount = sample.outlierCount || 0;
      const ratio = outlierCount / Math.max(valuesCount, 1);
      if (!Number.isFinite(sample.secureSum)) {
        issues.push('SECURE_SUM_NON_FINITE');
      }
      if (ratio > this.maxOutlierRatio) {
        issues.push('SECURE_SUM_OUTLIER_RATIO_HIGH');
      }
    }

    const correctnessScore = Math.max(0, 1 - (issues.length / 6));
    return {
      status: issues.length > 0 ? 'DEGRADED' : 'HEALTHY',
      complianceRate,
      correctnessScore: Number(correctnessScore.toFixed(3)),
      issues
    };
  }
}

export class ConvergenceStabilityAnalyzer {
  constructor(options = {}) {
    this.minStabilityScore = options.minStabilityScore || 0.65;
  }

  analyze(convergenceHistory = []) {
    const values = convergenceHistory
      .map((entry) => (typeof entry === 'number' ? entry : entry.accuracy))
      .filter((value) => typeof value === 'number');

    if (values.length < 2) {
      return {
        status: 'UNKNOWN',
        trend: 'UNKNOWN',
        stabilityScore: 0
      };
    }

    const mean = values.reduce((sum, n) => sum + n, 0) / values.length;
    const variance = values.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const volatility = stdDev / Math.max(Math.abs(mean), 1e-9);
    const slope = (values[values.length - 1] - values[0]) / Math.max(values.length - 1, 1);
    const stabilityScore = Math.max(0, 1 - volatility);

    let trend = 'STABLE';
    if (slope > 0.0025) trend = 'IMPROVING';
    if (slope < -0.0025) trend = 'DEGRADING';

    return {
      status: (stabilityScore < this.minStabilityScore || trend === 'DEGRADING') ? 'DEGRADED' : 'HEALTHY',
      trend,
      slope: Number(slope.toFixed(5)),
      stabilityScore: Number(stabilityScore.toFixed(4)),
      volatility: Number(volatility.toFixed(4))
    };
  }
}

export class OrchestrationLatencyMonitor {
  constructor(options = {}) {
    this.maxP95LatencyMs = options.maxP95LatencyMs || 250;
  }

  check(latencies = []) {
    if (latencies.length === 0) {
      return {
        status: 'UNKNOWN',
        p95: 0,
        avg: 0
      };
    }

    const sorted = latencies.slice().sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const avg = latencies.reduce((sum, n) => sum + n, 0) / latencies.length;

    return {
      status: p95 > this.maxP95LatencyMs ? 'DEGRADED' : 'HEALTHY',
      p95: Number(p95.toFixed(3)),
      avg: Number(avg.toFixed(3)),
      budget: this.maxP95LatencyMs
    };
  }
}

export class FederatedSelfDiagnosticsEngine {
  constructor(options = {}) {
    this.driftDetector = new DriftDetector(options);
    this.nondeterminismScanner = new NondeterminismScanner(options);
    this.ledgerChecker = new VersionLedgerIntegrityChecker(options);
    this.privacyChecker = new PrivacyAggregatorCorrectnessChecker(options);
    this.convergenceAnalyzer = new ConvergenceStabilityAnalyzer(options);
    this.latencyMonitor = new OrchestrationLatencyMonitor(options);
    this.diagnosticsLog = [];
    this.maxLogSize = options.maxLogSize || 5000;
  }

  runDiagnostics(snapshot = {}) {
    const drift = this.driftDetector.detect(snapshot.referenceMetrics || [], snapshot.currentMetrics || []);
    const nondeterminism = this.nondeterminismScanner.scan(snapshot.runResults || []);
    const ledger = this.ledgerChecker.verify(snapshot.versionHistory || []);
    const privacy = this.privacyChecker.verify(snapshot.privacyReport || {}, snapshot.secureSumSamples || []);
    const convergence = this.convergenceAnalyzer.analyze(snapshot.convergenceHistory || []);
    const latency = this.latencyMonitor.check(snapshot.orchestrationLatencies || []);

    const sections = { drift, nondeterminism, ledger, privacy, convergence, latency };
    const degradedSections = Object.entries(sections)
      .filter(([, value]) => value.status === 'DEGRADED')
      .map(([name]) => name);
    const unknownSections = Object.entries(sections)
      .filter(([, value]) => value.status === 'UNKNOWN')
      .map(([name]) => name);

    const healthScore = Math.max(
      0,
      100 - (degradedSections.length * 15) - (unknownSections.length * 5)
    );

    const report = {
      timestamp: Date.now(),
      sections,
      degraded: degradedSections.length > 0,
      degradedSections,
      unknownSections,
      healthScore,
      repairPlan: degradedSections.length > 0 ? this._buildRepairPlan(degradedSections) : null,
      repairTriggered: degradedSections.length > 0
    };

    this.diagnosticsLog.push(report);
    if (this.diagnosticsLog.length > this.maxLogSize) {
      this.diagnosticsLog.shift();
    }

    return report;
  }

  _buildRepairPlan(degradedSections = []) {
    const actions = [];
    if (degradedSections.includes('drift')) {
      actions.push('REBASELINE_METRICS');
    }
    if (degradedSections.includes('nondeterminism')) {
      actions.push('ENFORCE_DETERMINISTIC_TEST_MODE');
    }
    if (degradedSections.includes('ledger')) {
      actions.push('REPAIR_VERSION_LEDGER_GAPS');
    }
    if (degradedSections.includes('privacy')) {
      actions.push('HARDEN_PRIVACY_AGGREGATOR_CHECKS');
    }
    if (degradedSections.includes('convergence')) {
      actions.push('TUNE_CONVERGENCE_THRESHOLDS');
    }
    if (degradedSections.includes('latency')) {
      actions.push('OPTIMIZE_ORCHESTRATION_PATHS');
    }

    return {
      actionCount: actions.length,
      actions
    };
  }

  triggerRepairCycle(report) {
    if (!report || !report.degraded || !report.repairPlan) {
      return { triggered: false };
    }

    return {
      triggered: true,
      repairCycleId: `repair-${Date.now()}`,
      actions: report.repairPlan.actions
    };
  }

  getDiagnosticsStatus() {
    const totalRuns = this.diagnosticsLog.length;
    const degradedRuns = this.diagnosticsLog.filter((r) => r.degraded).length;
    const latest = this.diagnosticsLog[this.diagnosticsLog.length - 1] || null;

    return {
      totalRuns,
      degradedRuns,
      degradationRate: Number((totalRuns > 0 ? degradedRuns / totalRuns : 0).toFixed(3)),
      latest
    };
  }
}

export default {
  DriftDetector,
  NondeterminismScanner,
  VersionLedgerIntegrityChecker,
  PrivacyAggregatorCorrectnessChecker,
  ConvergenceStabilityAnalyzer,
  OrchestrationLatencyMonitor,
  FederatedSelfDiagnosticsEngine
};

