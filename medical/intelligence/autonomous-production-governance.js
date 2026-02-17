/**
 * Phase 8.5/8.6: Autonomous Production Governance
 * Coordinates policy gating, progressive rollout, incident containment, and evidence logging.
 */

import { ReleasePolicyEngine } from './release-policy-engine.js';
import { ProgressiveRolloutManager } from './progressive-rollout-manager.js';
import { IncidentContainmentEngine } from './incident-containment-engine.js';
import { ComplianceEvidenceLedger } from './compliance-evidence-ledger.js';

export class HumanEscalationQueue {
  constructor(options = {}) {
    this.escalations = new Map();
    this.escalationLog = [];
    this.maxLogSize = options.maxLogSize || 5000;
    this.sequence = 0;
  }

  createEscalation(type, releaseId, reasons = [], context = {}) {
    this.sequence += 1;
    const escalationId = `release-escalation-${Date.now()}-${this.sequence}`;
    const escalation = {
      escalationId,
      type,
      releaseId,
      reasons: reasons.slice(),
      context,
      status: 'PENDING',
      createdAt: Date.now(),
      resolvedAt: null,
      resolvedBy: null,
      resolution: null
    };

    this.escalations.set(escalationId, escalation);
    this._log(escalation);
    return escalation;
  }

  resolveEscalation(escalationId, resolution = 'APPROVED', actor = 'human', note = '') {
    const escalation = this.escalations.get(escalationId);
    if (!escalation) return { success: false, error: 'ESCALATION_NOT_FOUND' };
    if (escalation.status !== 'PENDING') return { success: false, error: 'ESCALATION_ALREADY_RESOLVED' };

    escalation.status = resolution === 'APPROVED' ? 'APPROVED' : 'REJECTED';
    escalation.resolution = resolution;
    escalation.resolvedAt = Date.now();
    escalation.resolvedBy = actor;
    escalation.note = note;
    this._log(escalation);
    return { success: true, escalation: { ...escalation } };
  }

  getEscalation(escalationId) {
    const escalation = this.escalations.get(escalationId);
    return escalation ? { ...escalation } : null;
  }

  getPending() {
    return Array.from(this.escalations.values())
      .filter((e) => e.status === 'PENDING')
      .map((e) => ({ ...e }));
  }

  getStats() {
    const all = Array.from(this.escalations.values());
    return {
      total: all.length,
      pending: all.filter((e) => e.status === 'PENDING').length,
      approved: all.filter((e) => e.status === 'APPROVED').length,
      rejected: all.filter((e) => e.status === 'REJECTED').length,
      recent: this.escalationLog.slice(-20)
    };
  }

  _log(escalation) {
    this.escalationLog.push({ ...escalation });
    if (this.escalationLog.length > this.maxLogSize) {
      this.escalationLog.shift();
    }
  }
}

export class AutonomousProductionGovernanceEngine {
  constructor(options = {}) {
    this.policy = options.policyEngine || new ReleasePolicyEngine(options.policy || options);
    this.rollout = options.rolloutManager || new ProgressiveRolloutManager(options.rollout || options);
    this.incidents = options.incidentEngine || new IncidentContainmentEngine(options.incident || options);
    this.ledger = options.evidenceLedger || new ComplianceEvidenceLedger(options.ledger || options);
    this.escalations = options.escalationQueue || new HumanEscalationQueue(options);
    this.releaseLog = [];
    this.maxLogSize = options.maxLogSize || 5000;
  }

  submitReleaseCandidate(candidate = {}, evidence = {}) {
    const releaseId = candidate.releaseId || `release-${Date.now()}`;
    const normalizedCandidate = { ...candidate, releaseId };
    const evaluation = this.policy.evaluateCandidate(normalizedCandidate, evidence);

    this.ledger.appendEvidence('CANDIDATE_SUBMITTED', releaseId, {
      candidate: {
        target: normalizedCandidate.target || 'unknown-target',
        expectedImpact: normalizedCandidate.expectedImpact || 'MEDIUM',
        riskScore: normalizedCandidate.riskScore == null ? null : Number(normalizedCandidate.riskScore)
      },
      evaluation
    });

    if (evaluation.decision === 'BLOCKED') {
      this.ledger.appendEvidence('CANDIDATE_BLOCKED', releaseId, { blockedReasons: evaluation.blockedReasons });
      const blocked = {
        success: false,
        releaseId,
        status: 'BLOCKED',
        blockedReasons: evaluation.blockedReasons,
        evaluation
      };
      this._log(blocked);
      return blocked;
    }

    if (evaluation.decision === 'ESCALATE_HUMAN') {
      const escalation = this.escalations.createEscalation(
        'CANDIDATE',
        releaseId,
        evaluation.escalationReasons,
        { candidate: normalizedCandidate, evidence, evaluation }
      );
      this.ledger.appendEvidence('CANDIDATE_ESCALATED', releaseId, {
        escalationId: escalation.escalationId,
        reasons: evaluation.escalationReasons
      });

      const escalated = {
        success: true,
        releaseId,
        status: 'ESCALATED',
        escalationId: escalation.escalationId,
        evaluation
      };
      this._log(escalated);
      return escalated;
    }

    const started = this.rollout.startRelease(releaseId, {
      target: normalizedCandidate.target || 'unknown-target',
      createdBy: normalizedCandidate.createdBy || 'AUTONOMOUS_SYSTEM'
    });

    if (!started.success) {
      return {
        success: false,
        releaseId,
        status: 'FAILED_TO_START',
        error: started.error,
        evaluation
      };
    }

    this.ledger.appendEvidence('RELEASE_STARTED', releaseId, {
      currentStagePct: started.release.currentStagePct
    });

    const active = {
      success: true,
      releaseId,
      status: 'ACTIVE',
      currentStagePct: started.release.currentStagePct,
      evaluation
    };
    this._log(active);
    return active;
  }

  approveEscalation(escalationId, actor = 'human', note = '') {
    const resolved = this.escalations.resolveEscalation(escalationId, 'APPROVED', actor, note);
    if (!resolved.success) return resolved;

    const escalation = resolved.escalation;
    this.ledger.appendEvidence('ESCALATION_APPROVED', escalation.releaseId, {
      escalationId: escalation.escalationId,
      actor,
      note
    });

    if (escalation.type === 'CANDIDATE') {
      const candidate = escalation.context.candidate || { releaseId: escalation.releaseId };
      const started = this.rollout.startRelease(escalation.releaseId, {
        target: candidate.target || 'unknown-target',
        createdBy: 'HUMAN_APPROVAL'
      });
      if (!started.success) return { success: false, error: started.error, escalation };
      this.ledger.appendEvidence('RELEASE_STARTED', escalation.releaseId, {
        currentStagePct: started.release.currentStagePct,
        source: 'HUMAN_APPROVAL'
      });
      return {
        success: true,
        escalation,
        release: started.release
      };
    }

    if (escalation.type === 'OPERATIONS') {
      const resumed = this.rollout.resumeRelease(escalation.releaseId);
      if (!resumed.success) return resumed;
      this.ledger.appendEvidence('RELEASE_RESUMED', escalation.releaseId, {
        escalationId: escalation.escalationId
      });
      return {
        success: true,
        escalation,
        release: resumed.release
      };
    }

    return { success: true, escalation };
  }

  rejectEscalation(escalationId, actor = 'human', note = 'Rejected') {
    const resolved = this.escalations.resolveEscalation(escalationId, 'REJECTED', actor, note);
    if (!resolved.success) return resolved;

    const escalation = resolved.escalation;
    this.ledger.appendEvidence('ESCALATION_REJECTED', escalation.releaseId, {
      escalationId: escalation.escalationId,
      actor,
      note
    });

    if (escalation.type === 'OPERATIONS') {
      const rollback = this.rollout.forceRollback(escalation.releaseId, 'HUMAN_REJECTED_CONTINUE');
      if (rollback.success) {
        this.ledger.appendEvidence('RELEASE_ROLLED_BACK', escalation.releaseId, {
          reason: 'HUMAN_REJECTED_CONTINUE'
        });
      }
      return rollback.success ? { success: true, escalation, release: rollback.release } : rollback;
    }

    return { success: true, escalation };
  }

  runCanaryStep(releaseId, metrics = {}) {
    const incident = this.incidents.handleTelemetry(releaseId, metrics);

    if (incident.action === 'CONTAIN_AND_ROLLBACK') {
      const rollback = this.rollout.forceRollback(releaseId, incident.analysis.reasons.join(','));
      if (!rollback.success) return rollback;

      this.ledger.appendEvidence('INCIDENT_CONTAINMENT', releaseId, {
        action: incident.action,
        reasons: incident.analysis.reasons
      });
      const result = {
        success: true,
        releaseId,
        status: 'ROLLED_BACK',
        incident,
        release: rollback.release
      };
      this._log(result);
      return result;
    }

    const stageOutcome = this.rollout.recordStageResult(releaseId, metrics);
    if (!stageOutcome.success) return stageOutcome;

    this.ledger.appendEvidence('STAGE_EVALUATED', releaseId, {
      stagePct: stageOutcome.stageRecord.stagePct,
      pass: stageOutcome.stageRecord.pass,
      reasons: stageOutcome.stageRecord.reasons
    });

    if (stageOutcome.status === 'ROLLED_BACK') {
      this.ledger.appendEvidence('RELEASE_ROLLED_BACK', releaseId, {
        reason: stageOutcome.stageRecord.reasons.join(',')
      });
      const rolledBack = {
        success: true,
        releaseId,
        status: 'ROLLED_BACK',
        incident,
        stageOutcome,
        release: stageOutcome.release
      };
      this._log(rolledBack);
      return rolledBack;
    }

    if (incident.action === 'FREEZE_AND_ESCALATE') {
      const frozen = this.rollout.freezeRelease(releaseId, incident.analysis.reasons.join(','));
      if (!frozen.success) return frozen;

      const escalation = this.escalations.createEscalation(
        'OPERATIONS',
        releaseId,
        incident.analysis.reasons,
        { incident, stageOutcome }
      );

      this.ledger.appendEvidence('RELEASE_FROZEN', releaseId, {
        escalationId: escalation.escalationId,
        reasons: incident.analysis.reasons
      });

      const frozenResult = {
        success: true,
        releaseId,
        status: 'FROZEN',
        escalationId: escalation.escalationId,
        incident,
        stageOutcome,
        release: frozen.release
      };
      this._log(frozenResult);
      return frozenResult;
    }

    if (stageOutcome.status === 'COMPLETED') {
      this.ledger.appendEvidence('RELEASE_COMPLETED', releaseId, {
        completedStages: stageOutcome.release.completedStages.length
      });
      const completed = {
        success: true,
        releaseId,
        status: 'COMPLETED',
        incident,
        stageOutcome,
        release: stageOutcome.release
      };
      this._log(completed);
      return completed;
    }

    const advanced = this.rollout.advanceStage(releaseId);
    if (!advanced.success) return advanced;

    this.ledger.appendEvidence('STAGE_ADVANCED', releaseId, {
      currentStagePct: advanced.currentStagePct
    });

    const active = {
      success: true,
      releaseId,
      status: 'ACTIVE',
      currentStagePct: advanced.currentStagePct,
      incident,
      stageOutcome,
      release: advanced.release
    };
    this._log(active);
    return active;
  }

  getGovernanceStatus() {
    return {
      policy: this.policy.getPolicy(),
      rollout: this.rollout.getRolloutStats(),
      incidents: this.incidents.getIncidentStats(),
      escalations: this.escalations.getStats(),
      evidence: this.ledger.getSummary(),
      recent: this.releaseLog.slice(-10)
    };
  }

  _log(entry) {
    this.releaseLog.push(entry);
    if (this.releaseLog.length > this.maxLogSize) {
      this.releaseLog.shift();
    }
  }
}

export default {
  HumanEscalationQueue,
  AutonomousProductionGovernanceEngine
};

