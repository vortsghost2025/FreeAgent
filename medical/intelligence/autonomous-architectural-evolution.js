/**
 * Phase 8.2: Autonomous Architectural Evolution
 * Proposes, validates, applies, and rolls back architectural changes under constraints.
 */

import { ReleasePolicyEngine } from './release-policy-engine.js';

export class ConstitutionalConstraintMapper {
  constructor(options = {}) {
    this.invariants = new Set(options.invariants || [
      'NO_SAFETY_INVARIANT_VIOLATION',
      'REVERSIBLE_CHANGES_ONLY',
      'AUDIT_TRAIL_REQUIRED',
      'PERFORMANCE_IMPACT_BOUNDED'
    ]);
  }

  validateChange(change = {}, context = {}) {
    const reasons = [];
    const maxPerformanceImpactPct = this._boundedNumber(
      context.maxPerformanceImpactPct,
      10,
      0,
      100
    );
    const maxSafetyRiskScore = this._boundedNumber(
      context.maxSafetyRiskScore,
      0.85,
      0,
      1
    );

    if (this.invariants.has('REVERSIBLE_CHANGES_ONLY')) {
      const hasRollbackPlan = typeof change.rollbackPlan === 'string' && change.rollbackPlan.length > 0;
      if (change.reversible !== true || !hasRollbackPlan) {
        reasons.push('REVERSIBILITY_REQUIREMENT_FAILED');
      }
    }

    if (this.invariants.has('AUDIT_TRAIL_REQUIRED')) {
      if (typeof change.auditRef !== 'string' || change.auditRef.length === 0) {
        reasons.push('AUDIT_TRAIL_MISSING');
      }
    }

    if (this.invariants.has('PERFORMANCE_IMPACT_BOUNDED')) {
      const performanceImpactPct = this._boundedNumber(change.performanceImpactPct, 0, 0, 1000);
      if (performanceImpactPct > maxPerformanceImpactPct) {
        reasons.push('PERFORMANCE_IMPACT_TOO_HIGH');
      }
    }

    if (this.invariants.has('NO_SAFETY_INVARIANT_VIOLATION')) {
      const safetyRiskScore = this._boundedNumber(change.safetyRiskScore, 0, 0, 1);
      if (safetyRiskScore > maxSafetyRiskScore) {
        reasons.push('SAFETY_RISK_TOO_HIGH');
      }
    }

    return {
      compliant: reasons.length === 0,
      reasons,
      evaluatedAt: Date.now()
    };
  }

  listInvariants() {
    return Array.from(this.invariants.values());
  }

  _boundedNumber(value, fallback, min, max) {
    if (value == null) return fallback;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(min, Math.min(max, numeric));
  }
}

export class ArchitecturalChangeLedger {
  constructor(options = {}) {
    this.changes = new Map();
    this.events = [];
    this.maxEvents = options.maxEvents || 10000;
  }

  addChange(change) {
    this.changes.set(change.changeId, change);
    this._log('CHANGE_PROPOSED', change.changeId, { target: change.target, type: change.type });
    return { success: true, changeId: change.changeId };
  }

  getChange(changeId) {
    return this.changes.get(changeId) || null;
  }

  listChanges() {
    return Array.from(this.changes.values());
  }

  setValidation(changeId, validation) {
    const change = this.getChange(changeId);
    if (!change) return { success: false, error: 'CHANGE_NOT_FOUND' };
    change.validation = validation;
    change.status = validation.isValid ? (validation.requiresHuman ? 'PENDING_HUMAN_REVIEW' : 'VALIDATED') : 'REJECTED';
    this._log('CHANGE_VALIDATED', changeId, {
      status: change.status,
      reasons: validation.reasons || []
    });
    return { success: true, change };
  }

  setImplemented(changeId, implementation = {}) {
    const change = this.getChange(changeId);
    if (!change) return { success: false, error: 'CHANGE_NOT_FOUND' };
    change.status = 'IMPLEMENTED';
    change.implementation = {
      ...implementation,
      implementedAt: Date.now()
    };
    this._log('CHANGE_IMPLEMENTED', changeId, implementation);
    return { success: true, change };
  }

  setRolledBack(changeId, reason = 'MANUAL_ROLLBACK') {
    const change = this.getChange(changeId);
    if (!change) return { success: false, error: 'CHANGE_NOT_FOUND' };
    change.status = 'ROLLED_BACK';
    change.rollback = {
      reason,
      rolledBackAt: Date.now()
    };
    this._log('CHANGE_ROLLED_BACK', changeId, { reason });
    return { success: true, change };
  }

  getStats() {
    const all = this.listChanges();
    const validated = all.filter((c) => c.validation && c.validation.isValid).length;
    const compliantValidated = all.filter((c) => c.validation && c.validation.constraintCheck && c.validation.constraintCheck.compliant).length;
    const implemented = all.filter((c) => c.status === 'IMPLEMENTED').length;
    const rolledBack = all.filter((c) => c.status === 'ROLLED_BACK').length;
    const pendingHuman = all.filter((c) => c.status === 'PENDING_HUMAN_REVIEW').length;

    return {
      total: all.length,
      validated,
      implemented,
      rolledBack,
      rejected: all.filter((c) => c.status === 'REJECTED').length,
      pendingHuman,
      changeSuccessRate: Number((validated > 0 ? implemented / validated : 0).toFixed(4)),
      constitutionalComplianceRate: Number((validated > 0 ? compliantValidated / validated : 1).toFixed(4)),
      reversibleCoverage: Number((all.length > 0
        ? all.filter((c) => c.reversible === true && typeof c.rollbackPlan === 'string' && c.rollbackPlan.length > 0).length / all.length
        : 1).toFixed(4))
    };
  }

  _log(type, changeId, payload = {}) {
    this.events.push({
      type,
      changeId,
      payload,
      timestamp: Date.now()
    });
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
  }
}

export class AutonomousArchitecturalEvolutionEngine {
  constructor(options = {}) {
    this.constraints = options.constraints || new ConstitutionalConstraintMapper(options);
    this.ledger = options.ledger || new ArchitecturalChangeLedger(options);
    this.policy = options.policy || new ReleasePolicyEngine(options);
    this.maxPerformanceImpactPct = this._boundedNumber(options.maxPerformanceImpactPct, 10, 0, 100);
    this.autoImplementRiskThreshold = this._boundedNumber(options.autoImplementRiskThreshold, 0.25, 0, 1);
    this.sequence = 0;
  }

  registerProposals(proposals = [], metadata = {}) {
    const registered = [];
    for (const proposal of proposals) {
      this.sequence += 1;
      const changeId = proposal.changeId || `arch-change-${Date.now()}-${this.sequence}`;
      const normalized = {
        changeId,
        type: proposal.type || 'ARCHITECTURE_ADJUSTMENT',
        target: proposal.target || 'unknown-target',
        summary: proposal.summary || 'No summary provided',
        riskScore: this._boundedNumber(proposal.riskScore, 0.1, 0, 1),
        expectedImpact: proposal.expectedImpact || 'MEDIUM',
        operations: Array.isArray(proposal.operations) ? proposal.operations.slice() : [],
        reversible: proposal.reversible !== false,
        rollbackPlan: proposal.rollbackPlan || `rollback:${changeId}`,
        performanceImpactPct: this._boundedNumber(
          proposal.performanceImpactPct != null ? proposal.performanceImpactPct : proposal.estimatedPerformanceImpactPct,
          0,
          0,
          1000
        ),
        safetyRiskScore: this._boundedNumber(proposal.safetyRiskScore, proposal.riskScore || 0, 0, 1),
        auditRef: proposal.auditRef || `audit:${changeId}`,
        createdAt: Date.now(),
        metadata
      };
      this.ledger.addChange(normalized);
      registered.push(normalized);
    }

    return {
      success: true,
      registeredCount: registered.length,
      registered
    };
  }

  validateChange(changeId, validationEvidence = {}) {
    const change = this.ledger.getChange(changeId);
    if (!change) return { success: false, error: 'CHANGE_NOT_FOUND' };

    const constraintCheck = this.constraints.validateChange(change, {
      maxPerformanceImpactPct: this.maxPerformanceImpactPct,
      maxSafetyRiskScore: validationEvidence.maxSafetyRiskScore
    });

    const policyDecision = this.policy.evaluateCandidate({
      releaseId: changeId,
      target: change.target,
      riskScore: change.riskScore,
      expectedImpact: change.expectedImpact,
      operations: change.operations
    }, {
      testPassRate: validationEvidence.testPassRate,
      canarySuccessRate: validationEvidence.canarySuccessRate == null ? 1 : validationEvidence.canarySuccessRate,
      latencyRegressionPct: change.performanceImpactPct,
      errorRatePct: validationEvidence.errorRatePct
    });

    const reasons = [];
    if (!constraintCheck.compliant) reasons.push(...constraintCheck.reasons);
    if (policyDecision.decision === 'BLOCKED') reasons.push(...policyDecision.blockedReasons);
    const requiresHuman = policyDecision.decision === 'ESCALATE_HUMAN';
    const isValid = reasons.length === 0;

    const validation = {
      isValid,
      requiresHuman,
      reasons,
      constraintCheck,
      policyDecision,
      validatedAt: Date.now()
    };

    this.ledger.setValidation(changeId, validation);
    return { success: true, validation };
  }

  implementChange(changeId, actor = 'autonomous') {
    const change = this.ledger.getChange(changeId);
    if (!change) return { success: false, error: 'CHANGE_NOT_FOUND' };
    if (!change.validation || !change.validation.isValid) {
      return { success: false, error: 'CHANGE_NOT_VALIDATED' };
    }

    const isAutonomous = actor === 'autonomous';
    if (isAutonomous && (change.validation.requiresHuman || change.riskScore > this.autoImplementRiskThreshold)) {
      return { success: true, status: 'PENDING_HUMAN_REVIEW', changeId };
    }

    this.ledger.setImplemented(changeId, { implementedBy: actor });
    return { success: true, status: 'IMPLEMENTED', changeId };
  }

  rollbackChange(changeId, reason = 'MANUAL_ROLLBACK') {
    const result = this.ledger.setRolledBack(changeId, reason);
    if (!result.success) return result;
    return { success: true, status: 'ROLLED_BACK', changeId, reason };
  }

  getEvolutionReport() {
    return {
      invariants: this.constraints.listInvariants(),
      stats: this.ledger.getStats(),
      recentEvents: this.ledger.events.slice(-20),
      recentChanges: this.ledger.listChanges().slice(-20)
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
  ConstitutionalConstraintMapper,
  ArchitecturalChangeLedger,
  AutonomousArchitecturalEvolutionEngine
};
