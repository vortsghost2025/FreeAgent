/**
 * Phase 8.2: Progressive Rollout Manager
 * Controls deterministic staged releases with policy thresholds and rollback.
 */

export class RolloutGate {
  constructor(options = {}) {
    this.maxLatencyRegressionPct = this._boundedNumber(options.maxLatencyRegressionPct, 8, 0, 1000);
    this.maxErrorRatePct = this._boundedNumber(options.maxErrorRatePct, 1, 0, 100);
    this.minAvailabilityPct = this._boundedNumber(options.minAvailabilityPct, 99.5, 0, 100);
  }

  evaluateMetrics(metrics = {}) {
    const reasons = [];
    const latencyRegressionPct = this._boundedNumber(metrics.latencyRegressionPct, 0, 0, 1000);
    const errorRatePct = this._boundedNumber(metrics.errorRatePct, 0, 0, 100);
    const availabilityPct = this._boundedNumber(metrics.availabilityPct, 100, 0, 100);

    if (latencyRegressionPct > this.maxLatencyRegressionPct) {
      reasons.push('LATENCY_REGRESSION_LIMIT_EXCEEDED');
    }
    if (errorRatePct > this.maxErrorRatePct) {
      reasons.push('ERROR_RATE_LIMIT_EXCEEDED');
    }
    if (availabilityPct < this.minAvailabilityPct) {
      reasons.push('AVAILABILITY_BELOW_MINIMUM');
    }

    return {
      pass: reasons.length === 0,
      reasons,
      metrics: {
        latencyRegressionPct,
        errorRatePct,
        availabilityPct
      }
    };
  }

  _boundedNumber(value, fallback, min, max) {
    if (value == null) return fallback;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(min, Math.min(max, numeric));
  }
}

export class ProgressiveRolloutManager {
  constructor(options = {}) {
    this.gate = options.gate || new RolloutGate(options);
    this.stages = this._normalizeStages(options.stages || [1, 5, 25, 50, 100]);
    this.releases = new Map();
    this.rolloutLog = [];
    this.maxLogSize = options.maxLogSize || 5000;
  }

  startRelease(releaseId, metadata = {}) {
    if (!releaseId) return { success: false, error: 'RELEASE_ID_REQUIRED' };
    if (this.releases.has(releaseId)) {
      return { success: false, error: 'RELEASE_ALREADY_EXISTS' };
    }

    const now = Date.now();
    const release = {
      releaseId,
      status: 'ACTIVE',
      stages: this.stages.slice(),
      currentStageIndex: 0,
      currentStagePct: this.stages[0],
      completedStages: [],
      failedStages: [],
      rollbackCount: 0,
      freezeReason: null,
      rollbackReason: null,
      metadata,
      createdAt: now,
      updatedAt: now
    };

    this.releases.set(releaseId, release);
    this._log('RELEASE_STARTED', releaseId, { currentStagePct: release.currentStagePct });
    return { success: true, release: this._cloneRelease(release) };
  }

  recordStageResult(releaseId, metrics = {}) {
    const release = this.releases.get(releaseId);
    if (!release) return { success: false, error: 'RELEASE_NOT_FOUND' };
    if (release.status !== 'ACTIVE') return { success: false, error: 'RELEASE_NOT_ACTIVE' };

    const gateResult = this.gate.evaluateMetrics(metrics);
    const stageRecord = {
      stagePct: release.currentStagePct,
      pass: gateResult.pass,
      reasons: gateResult.reasons,
      metrics: gateResult.metrics,
      evaluatedAt: Date.now()
    };

    if (stageRecord.pass) {
      release.completedStages.push(stageRecord);
      if (release.currentStageIndex === release.stages.length - 1) {
        release.status = 'COMPLETED';
      }
    } else {
      release.failedStages.push(stageRecord);
      release.status = 'ROLLED_BACK';
      release.rollbackCount += 1;
      release.rollbackReason = stageRecord.reasons.join(',');
    }

    release.updatedAt = Date.now();
    this._log('STAGE_EVALUATED', releaseId, stageRecord);

    return {
      success: true,
      stageRecord,
      status: release.status,
      release: this._cloneRelease(release)
    };
  }

  advanceStage(releaseId) {
    const release = this.releases.get(releaseId);
    if (!release) return { success: false, error: 'RELEASE_NOT_FOUND' };
    if (release.status !== 'ACTIVE') return { success: false, error: 'RELEASE_NOT_ACTIVE' };
    if (release.currentStageIndex >= release.stages.length - 1) {
      return { success: false, error: 'FINAL_STAGE_REACHED' };
    }

    const latestCompleted = release.completedStages[release.completedStages.length - 1];
    if (!latestCompleted || latestCompleted.stagePct !== release.currentStagePct) {
      return { success: false, error: 'STAGE_NOT_VERIFIED' };
    }

    release.currentStageIndex += 1;
    release.currentStagePct = release.stages[release.currentStageIndex];
    release.updatedAt = Date.now();
    this._log('STAGE_ADVANCED', releaseId, { currentStagePct: release.currentStagePct });

    return {
      success: true,
      currentStagePct: release.currentStagePct,
      release: this._cloneRelease(release)
    };
  }

  freezeRelease(releaseId, reason = 'WARNING_THRESHOLD_EXCEEDED') {
    const release = this.releases.get(releaseId);
    if (!release) return { success: false, error: 'RELEASE_NOT_FOUND' };
    if (release.status !== 'ACTIVE') return { success: false, error: 'RELEASE_NOT_ACTIVE' };

    release.status = 'FROZEN';
    release.freezeReason = reason;
    release.updatedAt = Date.now();
    this._log('RELEASE_FROZEN', releaseId, { reason });
    return { success: true, release: this._cloneRelease(release) };
  }

  resumeRelease(releaseId) {
    const release = this.releases.get(releaseId);
    if (!release) return { success: false, error: 'RELEASE_NOT_FOUND' };
    if (release.status !== 'FROZEN') return { success: false, error: 'RELEASE_NOT_FROZEN' };

    release.status = 'ACTIVE';
    release.freezeReason = null;
    release.updatedAt = Date.now();
    this._log('RELEASE_RESUMED', releaseId, { currentStagePct: release.currentStagePct });
    return { success: true, release: this._cloneRelease(release) };
  }

  forceRollback(releaseId, reason = 'MANUAL_ROLLBACK') {
    const release = this.releases.get(releaseId);
    if (!release) return { success: false, error: 'RELEASE_NOT_FOUND' };
    if (release.status === 'COMPLETED') return { success: false, error: 'RELEASE_ALREADY_COMPLETED' };

    release.status = 'ROLLED_BACK';
    release.rollbackCount += 1;
    release.rollbackReason = reason;
    release.updatedAt = Date.now();
    this._log('RELEASE_ROLLED_BACK', releaseId, { reason });
    return { success: true, release: this._cloneRelease(release) };
  }

  getReleaseStatus(releaseId) {
    const release = this.releases.get(releaseId);
    return release ? this._cloneRelease(release) : null;
  }

  getRolloutStats() {
    const releases = Array.from(this.releases.values());
    return {
      total: releases.length,
      active: releases.filter((r) => r.status === 'ACTIVE').length,
      frozen: releases.filter((r) => r.status === 'FROZEN').length,
      completed: releases.filter((r) => r.status === 'COMPLETED').length,
      rolledBack: releases.filter((r) => r.status === 'ROLLED_BACK').length,
      recentEvents: this.rolloutLog.slice(-20)
    };
  }

  _normalizeStages(stages = []) {
    const numeric = stages
      .map((s) => Number(s))
      .filter((s) => Number.isFinite(s))
      .map((s) => Math.max(1, Math.min(100, Math.round(s))));

    const deduped = Array.from(new Set(numeric)).sort((a, b) => a - b);
    if (deduped.length === 0) return [1, 5, 25, 50, 100];
    if (deduped[deduped.length - 1] !== 100) deduped.push(100);
    return deduped;
  }

  _cloneRelease(release) {
    return JSON.parse(JSON.stringify(release));
  }

  _log(eventType, releaseId, payload = {}) {
    this.rolloutLog.push({
      eventType,
      releaseId,
      payload,
      timestamp: Date.now()
    });
    if (this.rolloutLog.length > this.maxLogSize) {
      this.rolloutLog.shift();
    }
  }
}

export default {
  RolloutGate,
  ProgressiveRolloutManager
};

