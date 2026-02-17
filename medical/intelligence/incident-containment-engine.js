/**
 * Phase 8.3: Incident Containment Engine
 * Detects operational degradation and chooses deterministic containment actions.
 */

export class IncidentContainmentEngine {
  constructor(options = {}) {
    this.thresholds = {
      warningErrorRatePct: 0.8,
      criticalErrorRatePct: 1.5,
      warningLatencyRegressionPct: 6,
      criticalLatencyRegressionPct: 12,
      warningAvailabilityPct: 99.4,
      criticalAvailabilityPct: 98.5,
      ...(options.thresholds || options)
    };

    this.analysisLog = [];
    this.actionLog = [];
    this.maxLogSize = options.maxLogSize || 5000;
  }

  configureThresholds(partial = {}) {
    this.thresholds.warningErrorRatePct = this._boundedNumber(
      partial.warningErrorRatePct,
      this.thresholds.warningErrorRatePct,
      0,
      100
    );
    this.thresholds.criticalErrorRatePct = this._boundedNumber(
      partial.criticalErrorRatePct,
      this.thresholds.criticalErrorRatePct,
      0,
      100
    );
    this.thresholds.warningLatencyRegressionPct = this._boundedNumber(
      partial.warningLatencyRegressionPct,
      this.thresholds.warningLatencyRegressionPct,
      0,
      1000
    );
    this.thresholds.criticalLatencyRegressionPct = this._boundedNumber(
      partial.criticalLatencyRegressionPct,
      this.thresholds.criticalLatencyRegressionPct,
      0,
      1000
    );
    this.thresholds.warningAvailabilityPct = this._boundedNumber(
      partial.warningAvailabilityPct,
      this.thresholds.warningAvailabilityPct,
      0,
      100
    );
    this.thresholds.criticalAvailabilityPct = this._boundedNumber(
      partial.criticalAvailabilityPct,
      this.thresholds.criticalAvailabilityPct,
      0,
      100
    );
    return { success: true, thresholds: { ...this.thresholds } };
  }

  analyzeTelemetry(releaseId, telemetry = {}) {
    const metrics = {
      errorRatePct: this._boundedNumber(telemetry.errorRatePct, 0, 0, 100),
      latencyRegressionPct: this._boundedNumber(telemetry.latencyRegressionPct, 0, 0, 1000),
      availabilityPct: this._boundedNumber(telemetry.availabilityPct, 100, 0, 100)
    };

    const reasons = [];
    let severity = 'NONE';

    const critical = (
      metrics.errorRatePct >= this.thresholds.criticalErrorRatePct ||
      metrics.latencyRegressionPct >= this.thresholds.criticalLatencyRegressionPct ||
      metrics.availabilityPct <= this.thresholds.criticalAvailabilityPct
    );

    const warning = (
      metrics.errorRatePct >= this.thresholds.warningErrorRatePct ||
      metrics.latencyRegressionPct >= this.thresholds.warningLatencyRegressionPct ||
      metrics.availabilityPct <= this.thresholds.warningAvailabilityPct
    );

    if (critical) {
      severity = 'CRITICAL';
      if (metrics.errorRatePct >= this.thresholds.criticalErrorRatePct) reasons.push('CRITICAL_ERROR_RATE');
      if (metrics.latencyRegressionPct >= this.thresholds.criticalLatencyRegressionPct) reasons.push('CRITICAL_LATENCY_REGRESSION');
      if (metrics.availabilityPct <= this.thresholds.criticalAvailabilityPct) reasons.push('CRITICAL_AVAILABILITY_DROP');
    } else if (warning) {
      severity = 'WARNING';
      if (metrics.errorRatePct >= this.thresholds.warningErrorRatePct) reasons.push('WARNING_ERROR_RATE');
      if (metrics.latencyRegressionPct >= this.thresholds.warningLatencyRegressionPct) reasons.push('WARNING_LATENCY_REGRESSION');
      if (metrics.availabilityPct <= this.thresholds.warningAvailabilityPct) reasons.push('WARNING_AVAILABILITY_DROP');
    }

    const analysis = {
      releaseId,
      severity,
      reasons,
      metrics,
      timestamp: Date.now()
    };

    this.analysisLog.push(analysis);
    if (this.analysisLog.length > this.maxLogSize) this.analysisLog.shift();

    return analysis;
  }

  handleTelemetry(releaseId, telemetry = {}) {
    const analysis = this.analyzeTelemetry(releaseId, telemetry);

    let action = 'NONE';
    if (analysis.severity === 'CRITICAL') {
      action = 'CONTAIN_AND_ROLLBACK';
    } else if (analysis.severity === 'WARNING') {
      action = 'FREEZE_AND_ESCALATE';
    }

    const decision = {
      releaseId,
      action,
      analysis,
      timestamp: Date.now()
    };

    this.actionLog.push(decision);
    if (this.actionLog.length > this.maxLogSize) this.actionLog.shift();

    return decision;
  }

  getIncidentStats() {
    return {
      analyses: this.analysisLog.length,
      none: this.analysisLog.filter((a) => a.severity === 'NONE').length,
      warning: this.analysisLog.filter((a) => a.severity === 'WARNING').length,
      critical: this.analysisLog.filter((a) => a.severity === 'CRITICAL').length,
      actions: {
        none: this.actionLog.filter((a) => a.action === 'NONE').length,
        freezeAndEscalate: this.actionLog.filter((a) => a.action === 'FREEZE_AND_ESCALATE').length,
        containAndRollback: this.actionLog.filter((a) => a.action === 'CONTAIN_AND_ROLLBACK').length
      },
      recent: this.actionLog.slice(-20)
    };
  }

  _boundedNumber(value, fallback, min, max) {
    if (value == null) return fallback;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(min, Math.min(max, numeric));
  }
}

export default {
  IncidentContainmentEngine
};

