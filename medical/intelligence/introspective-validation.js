/**
 * Phase 8.4: Introspective Validation
 * Verifies self-model quality, constitutional compliance, traceability, and reversibility.
 */

import crypto from 'node:crypto';

export class SelfVerificationProtocol {
  constructor(options = {}) {
    this.minSelfModelAccuracy = this._boundedNumber(options.minSelfModelAccuracy, 0.99, 0, 1);
    this.maxPerformanceRegressionPct = this._boundedNumber(options.maxPerformanceRegressionPct, 10, 0, 100);
  }

  runAll(inputs = {}) {
    const reasons = [];
    const checks = {
      selfModelAccuracy: this._checkSelfModelAccuracy(inputs.selfModelConsistency),
      constitutionalCompliance: this._checkConstitutionalCompliance(inputs.validationResults || []),
      reversibility: this._checkReversibility(inputs.changes || []),
      traceability: this._checkTraceability(inputs.changes || [], inputs.auditEntries || []),
      performanceRegression: this._checkPerformanceRegression(inputs.performanceRegressionPct)
    };

    for (const [name, result] of Object.entries(checks)) {
      if (!result.passed) {
        reasons.push(`${name}:${result.reason}`);
      }
    }

    return {
      passed: reasons.length === 0,
      reasons,
      checks,
      evaluatedAt: Date.now()
    };
  }

  _checkSelfModelAccuracy(consistency) {
    const score = this._boundedNumber(consistency, 0, 0, 1);
    return {
      passed: score >= this.minSelfModelAccuracy,
      reason: score >= this.minSelfModelAccuracy ? 'OK' : 'SELF_MODEL_ACCURACY_BELOW_THRESHOLD',
      score
    };
  }

  _checkConstitutionalCompliance(validationResults) {
    if (!Array.isArray(validationResults) || validationResults.length === 0) {
      return { passed: true, reason: 'NO_VALIDATION_RESULTS' };
    }
    const allCompliant = validationResults.every((r) => r && r.compliant === true);
    return {
      passed: allCompliant,
      reason: allCompliant ? 'OK' : 'CONSTITUTIONAL_NON_COMPLIANCE'
    };
  }

  _checkReversibility(changes) {
    if (!Array.isArray(changes) || changes.length === 0) {
      return { passed: true, reason: 'NO_CHANGES' };
    }
    const reversible = changes.every(
      (c) => c && c.reversible === true && typeof c.rollbackPlan === 'string' && c.rollbackPlan.length > 0
    );
    return {
      passed: reversible,
      reason: reversible ? 'OK' : 'REVERSIBILITY_REQUIREMENT_FAILED'
    };
  }

  _checkTraceability(changes, auditEntries) {
    if (!Array.isArray(changes) || changes.length === 0) {
      return { passed: true, reason: 'NO_CHANGES' };
    }
    const auditRefs = new Set(auditEntries.map((e) => e.auditRef).filter(Boolean));
    const allTraceable = changes.every((c) => {
      if (typeof c.auditRef !== 'string' || c.auditRef.length === 0) return false;
      return auditRefs.size === 0 ? true : auditRefs.has(c.auditRef);
    });
    return {
      passed: allTraceable,
      reason: allTraceable ? 'OK' : 'TRACEABILITY_GAP_DETECTED'
    };
  }

  _checkPerformanceRegression(performanceRegressionPct) {
    const regression = this._boundedNumber(performanceRegressionPct, 0, 0, 1000);
    return {
      passed: regression <= this.maxPerformanceRegressionPct,
      reason: regression <= this.maxPerformanceRegressionPct ? 'OK' : 'PERFORMANCE_REGRESSION_TOO_HIGH',
      regression
    };
  }

  _boundedNumber(value, fallback, min, max) {
    if (value == null) return fallback;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(min, Math.min(max, numeric));
  }
}

export class MetaGovernanceEngine {
  assess(verification = {}, context = {}) {
    const criticalFindings = verification.reasons || [];
    const requiresHuman = criticalFindings.length > 0 || context.highImpact === true;
    const decision = criticalFindings.length > 0
      ? 'REJECT_AND_ESCALATE'
      : (requiresHuman ? 'ESCALATE_HUMAN' : 'APPROVE');

    return {
      decision,
      requiresHuman,
      criticalFindings,
      decidedAt: Date.now()
    };
  }
}

export class IntrospectiveValidationEngine {
  constructor(options = {}) {
    this.verifier = options.verifier || new SelfVerificationProtocol(options);
    this.governance = options.governance || new MetaGovernanceEngine(options);
    this.auditLog = [];
    this.maxLogSize = options.maxLogSize || 10000;
  }

  runIntrospectiveValidation(inputs = {}) {
    const verification = this.verifier.runAll({
      selfModelConsistency: inputs.selfModelConsistency,
      validationResults: inputs.validationResults || [],
      changes: inputs.changes || [],
      auditEntries: inputs.auditEntries || this.auditLog,
      performanceRegressionPct: inputs.performanceRegressionPct
    });
    const governance = this.governance.assess(verification, {
      highImpact: inputs.highImpact === true
    });

    const auditEntry = this.appendAuditEntry('INTROSPECTIVE_VALIDATION', {
      verificationPassed: verification.passed,
      governanceDecision: governance.decision,
      reasons: verification.reasons
    });

    return {
      success: true,
      verification,
      governance,
      auditEntry
    };
  }

  appendAuditEntry(eventType, payload = {}) {
    const previousHash = this.auditLog.length > 0
      ? this.auditLog[this.auditLog.length - 1].hash
      : 'GENESIS';
    const body = {
      index: this.auditLog.length,
      eventType,
      payload,
      timestamp: Date.now()
    };
    const hash = this._hash({
      previousHash,
      ...body
    });
    const entry = {
      ...body,
      previousHash,
      hash,
      auditRef: `audit-entry-${body.index}`
    };

    this.auditLog.push(entry);
    if (this.auditLog.length > this.maxLogSize) {
      this.auditLog.shift();
    }
    return entry;
  }

  verifyAuditIntegrity() {
    let previousHash = 'GENESIS';
    for (let i = 0; i < this.auditLog.length; i += 1) {
      const entry = this.auditLog[i];
      const expectedHash = this._hash({
        previousHash,
        index: entry.index,
        eventType: entry.eventType,
        payload: entry.payload,
        timestamp: entry.timestamp
      });
      if (entry.hash !== expectedHash) {
        return {
          valid: false,
          index: i,
          reason: 'HASH_MISMATCH'
        };
      }
      previousHash = entry.hash;
    }
    return { valid: true };
  }

  getValidationStatus() {
    const integrity = this.verifyAuditIntegrity();
    return {
      auditEntries: this.auditLog.length,
      auditIntegrity: integrity.valid,
      auditIntegrityDetails: integrity,
      recentAuditEntries: this.auditLog.slice(-10)
    };
  }

  _hash(payload) {
    return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }
}

export default {
  SelfVerificationProtocol,
  MetaGovernanceEngine,
  IntrospectiveValidationEngine
};

