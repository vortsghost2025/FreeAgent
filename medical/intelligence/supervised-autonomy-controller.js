/**
 * Phase 7.5: Supervised Autonomy Controller
 * Human-out-of-the-loop mode with strict guardrails, mutation zones, and escalation.
 */

export class GuardrailPolicy {
  constructor(options = {}) {
    this.thresholds = {
      maxRiskAuto: 0.45,
      minTestPassRate: 0.95,
      maxLatencyRegressionPct: 10,
      ...(options.thresholds || {})
    };
    this.forbiddenOperations = new Set(options.forbiddenOperations || []);
  }

  updateThresholds(partial = {}) {
    this.thresholds = { ...this.thresholds, ...partial };
    return { success: true, thresholds: this.thresholds };
  }

  setForbiddenOperations(operations = []) {
    this.forbiddenOperations = new Set(operations);
    return { success: true, forbiddenOperations: Array.from(this.forbiddenOperations) };
  }

  evaluate(action = {}) {
    const blockedReasons = [];
    const escalationReasons = [];

    for (const operation of action.operations || []) {
      if (this.forbiddenOperations.has(operation)) {
        blockedReasons.push(`FORBIDDEN_OPERATION:${operation}`);
      }
    }

    if ((action.riskScore || 0) > this.thresholds.maxRiskAuto) {
      escalationReasons.push('RISK_REQUIRES_HUMAN_REVIEW');
    }
    if ((action.testPassRate == null ? 1 : action.testPassRate) < this.thresholds.minTestPassRate) {
      escalationReasons.push('TEST_PASS_RATE_BELOW_GUARDRAIL');
    }
    if ((action.latencyRegressionPct || 0) > this.thresholds.maxLatencyRegressionPct) {
      escalationReasons.push('LATENCY_REGRESSION_ABOVE_GUARDRAIL');
    }
    if (action.highImpact === true) {
      escalationReasons.push('HIGH_IMPACT_CHANGE');
    }
    if (action.newCapability === true) {
      escalationReasons.push('NEW_CAPABILITY_PROPOSAL');
    }

    return {
      blocked: blockedReasons.length > 0,
      blockedReasons,
      requiresHuman: escalationReasons.length > 0,
      escalationReasons
    };
  }
}

export class MutationZoneManager {
  constructor(options = {}) {
    this.allowedZones = options.allowedZones || [];
  }

  setAllowedZones(zones = []) {
    this.allowedZones = zones.slice();
    return { success: true, allowedZones: this.allowedZones };
  }

  evaluatePaths(paths = []) {
    if (this.allowedZones.length === 0) {
      return { allowed: true, blockedPaths: [] };
    }

    const blockedPaths = [];
    for (const path of paths) {
      const allowed = this.allowedZones.some((zone) => path.startsWith(zone));
      if (!allowed) blockedPaths.push(path);
    }

    return {
      allowed: blockedPaths.length === 0,
      blockedPaths
    };
  }
}

export class AutonomyEscalationManager {
  constructor(options = {}) {
    this.escalations = new Map();
    this.escalationLog = [];
    this.maxLogSize = options.maxLogSize || 5000;
    this.sequence = 0;
  }

  createEscalation(action, reasons = []) {
    this.sequence += 1;
    const escalationId = `escalation-${Date.now()}-${this.sequence}`;
    const escalation = {
      escalationId,
      actionId: action.actionId,
      actionType: action.type,
      reasons,
      status: 'PENDING',
      createdAt: Date.now(),
      resolvedAt: null
    };
    this.escalations.set(escalationId, escalation);
    this._log(escalation);
    return escalation;
  }

  resolveEscalation(escalationId, resolution = 'APPROVED', actor = 'human') {
    const escalation = this.escalations.get(escalationId);
    if (!escalation) return { success: false, error: 'ESCALATION_NOT_FOUND' };

    escalation.status = resolution;
    escalation.resolvedAt = Date.now();
    escalation.resolvedBy = actor;
    this._log(escalation);
    return { success: true, escalation };
  }

  getStats() {
    const all = Array.from(this.escalations.values());
    return {
      total: all.length,
      pending: all.filter((e) => e.status === 'PENDING').length,
      approved: all.filter((e) => e.status === 'APPROVED').length,
      rejected: all.filter((e) => e.status === 'REJECTED').length
    };
  }

  _log(entry) {
    this.escalationLog.push({ ...entry });
    if (this.escalationLog.length > this.maxLogSize) {
      this.escalationLog.shift();
    }
  }
}

export class SupervisedAutonomyController {
  constructor(options = {}) {
    this.guardrails = new GuardrailPolicy(options);
    this.mutationZones = new MutationZoneManager(options);
    this.escalationMgr = new AutonomyEscalationManager(options);
    this.decisionLog = [];
    this.maxLogSize = options.maxLogSize || 5000;
  }

  configureGuardrails(thresholds = {}) {
    return this.guardrails.updateThresholds(thresholds);
  }

  configureForbiddenOperations(operations = []) {
    return this.guardrails.setForbiddenOperations(operations);
  }

  configureMutationZones(zones = []) {
    return this.mutationZones.setAllowedZones(zones);
  }

  evaluateAction(action = {}) {
    const normalized = {
      actionId: action.actionId || `action-${Date.now()}`,
      type: action.type || 'UNKNOWN',
      riskScore: action.riskScore || 0,
      operations: action.operations || [],
      filePaths: action.filePaths || [],
      testPassRate: action.testPassRate == null ? 1 : action.testPassRate,
      latencyRegressionPct: action.latencyRegressionPct || 0,
      highImpact: action.highImpact === true,
      newCapability: action.newCapability === true
    };

    const guardrailResult = this.guardrails.evaluate(normalized);
    const mutationResult = this.mutationZones.evaluatePaths(normalized.filePaths);

    const blockedReasons = guardrailResult.blockedReasons.slice();
    if (!mutationResult.allowed) {
      blockedReasons.push(...mutationResult.blockedPaths.map((path) => `PATH_OUTSIDE_MUTATION_ZONE:${path}`));
    }

    let decision = 'AUTO_APPROVED';
    let escalation = null;

    if (blockedReasons.length > 0) {
      decision = 'BLOCKED';
    } else if (guardrailResult.requiresHuman) {
      decision = 'ESCALATE_HUMAN';
      escalation = this.escalationMgr.createEscalation(normalized, guardrailResult.escalationReasons);
    }

    const result = {
      action: normalized,
      decision,
      blockedReasons,
      escalationReasons: guardrailResult.escalationReasons,
      escalationId: escalation ? escalation.escalationId : null,
      evaluatedAt: Date.now()
    };

    this._log(result);
    return result;
  }

  recordOutcome(actionId, outcome = {}) {
    const record = {
      actionId,
      outcome,
      timestamp: Date.now()
    };
    this._log(record);
    return { success: true };
  }

  getSupervisionStatus() {
    const totalDecisions = this.decisionLog.filter((d) => d.decision).length;
    const autoApproved = this.decisionLog.filter((d) => d.decision === 'AUTO_APPROVED').length;
    const escalated = this.decisionLog.filter((d) => d.decision === 'ESCALATE_HUMAN').length;
    const blocked = this.decisionLog.filter((d) => d.decision === 'BLOCKED').length;

    return {
      totalDecisions,
      autoApproved,
      escalated,
      blocked,
      escalation: this.escalationMgr.getStats(),
      recentDecisions: this.decisionLog.slice(-10)
    };
  }

  _log(entry) {
    this.decisionLog.push(entry);
    if (this.decisionLog.length > this.maxLogSize) {
      this.decisionLog.shift();
    }
  }
}

export default {
  GuardrailPolicy,
  MutationZoneManager,
  AutonomyEscalationManager,
  SupervisedAutonomyController
};

