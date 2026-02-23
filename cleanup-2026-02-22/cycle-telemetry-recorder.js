/**
 * Phase 8.5: Observability & Telemetry Engine
 * Cycle snapshots, rollback traces, improvement provenance, metric drift detection
 */

export class CycleTelemetryRecorder {
  constructor(options = {}) {
    this.maxSnapshots = options.maxSnapshots || 50;
    this.snapshots = [];
    this.rollbackTraces = [];
    this.provenance = [];  // Which proposals contributed to improvements
    this.metricHistory = [];
  }

  recordCycleSnapshot(cycleId, input = {}) {
    const snapshot = {
      cycleId,
      timestamp: Date.now(),
      architecture: {
        before: input.architectureBefore || {},
        after: input.architectureAfter || {},
        delta: this._computeDelta(input.architectureBefore, input.architectureAfter)
      },
      proposals: {
        proposed: input.proposalCount || 0,
        validated: input.validatedCount || 0,
        implemented: input.implementedCount || 0,
        rolledBack: input.rolledBackCount || 0
      },
      metrics: {
        improvementPct: Number(input.improvementPct || 0),
        learningEfficiency: Number(input.learningEfficiency || 0),
        architectureConsistency: Number(input.architectureConsistency || 0),
        mttrSeconds: input.mttrSeconds == null ? null : Number(input.mttrSeconds)
      },
      governance: {
        reviewsRequired: input.humanReviewsRequired || 0,
        policyViolations: input.policyViolations || 0,
        constraintFailures: input.constraintFailures || 0
      }
    };

    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    return snapshot;
  }

  recordRollbackTrace(changeId, reason = '', details = {}) {
    const trace = {
      changeId,
      timestamp: Date.now(),
      reason,  // e.g., 'post-deploy-instability', 'performance-regression', 'safety-risk'
      details: {
        failureDetectedAt: details.failureDetectedAt,
        rollbackInitiatedAt: details.rollbackInitiatedAt,
        rolledBackAt: details.rolledBackAt,
        rollbackDurationSeconds: details.rollbackDurationSeconds,
        metricsBeforeChange: details.metricsBeforeChange || {},
        metricsAfterFailure: details.metricsAfterFailure || {},
        affectedComponents: details.affectedComponents || []
      }
    };

    this.rollbackTraces.push(trace);
    return trace;
  }

  recordProposalContribution(proposalId, changeId, improvementDelta = 0, weight = 1) {
    const contrib = {
      proposalId,
      changeId,
      timestamp: Date.now(),
      improvementDelta: Number(improvementDelta),
      weight: Number(weight),  // 0-1, how much this proposal contributed to overall improvement
      status: 'CONTRIBUTED'
    };

    this.provenance.push(contrib);
    return contrib;
  }

  /**
   * Detect metric drift: if key metrics degrading over time
   * Compare recent cycles to baseline
   */
  detectMetricDrift(metric = 'improvementPct', windowSize = 5, driftThreshold = -10) {
    if (this.snapshots.length < windowSize + 1) {
      return {
        drifting: false,
        reason: 'insufficient_history',
        metric,
        trend: 0,
        baseline: 0,
        recent: 0
      };
    }

    const all = this.snapshots.map(s => s.metrics[metric] || 0);
    const baseline = all.slice(0, Math.ceil(all.length / 2)).reduce((a, b) => a + b, 0) / Math.ceil(all.length / 2);
    const recent = all.slice(-windowSize).reduce((a, b) => a + b, 0) / windowSize;
    const trend = recent - baseline;
    const drifting = trend < driftThreshold;

    return {
      drifting,
      metric,
      trend: Number(trend.toFixed(2)),
      baseline: Number(baseline.toFixed(2)),
      recent: Number(recent.toFixed(2)),
      reason: drifting ? 'metric_degradation_detected' : 'metric_stable'
    };
  }

  /**
   * Get full observability report: snapshots, traces, provenance, drift
   */
  getObservabilityReport() {
    const improvementDrift = this.detectMetricDrift('improvementPct');
    const efficiencyDrift = this.detectMetricDrift('learningEfficiency');
    const consistencyDrift = this.detectMetricDrift('architectureConsistency');

    // Top contributing proposals
    const topProposals = this.provenance
      .sort((a, b) => (b.improvementDelta * b.weight) - (a.improvementDelta * a.weight))
      .slice(0, 5);

    return {
      totalCycles: this.snapshots.length,
      totalRollbacks: this.rollbackTraces.length,
      totalContributions: this.provenance.length,
      recentSnapshots: this.snapshots.slice(-5),
      recentRollbacks: this.rollbackTraces.slice(-3),
      topContributions: topProposals,
      driftAnalysis: {
        improvement: improvementDrift,
        efficiency: efficiencyDrift,
        consistency: consistencyDrift,
        driftingMetrics: [
          improvementDrift.drifting ? 'improvement' : null,
          efficiencyDrift.drifting ? 'efficiency' : null,
          consistencyDrift.drifting ? 'consistency' : null
        ].filter(Boolean)
      }
    };
  }

  /**
   * Compute architecture delta (before vs after)
   */
  _computeDelta(before = {}, after = {}) {
    return {
      componentsAdded: ((after.components || []).length) - ((before.components || []).length),
      componentsRemoved: ((before.components || []).length) - ((after.components || []).length),
      interfacesAdded: ((after.interfaces || []).length) - ((before.interfaces || []).length),
      interfacesRemoved: ((before.interfaces || []).length) - ((after.interfaces || []).length),
      invariantsAdded: ((after.invariants || []).length) - ((before.invariants || []).length),
      invariantsRemoved: ((before.invariants || []).length) - ((after.invariants || []).length)
    };
  }

  reset() {
    this.snapshots = [];
    this.rollbackTraces = [];
    this.provenance = [];
  }
}

export default {
  CycleTelemetryRecorder
};
