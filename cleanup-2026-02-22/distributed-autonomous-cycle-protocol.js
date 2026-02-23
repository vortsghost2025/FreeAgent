/**
 * Distributed Autonomous Cycle Protocol
 * Defines communication contracts and schemas for federated Phase 9 instances
 */

/**
 * DistributedCycleProtocol: Validation and schema definitions
 * Ensures all federated instances follow consistent communication patterns
 */
export class DistributedCycleProtocol {
  /**
   * Validate cycle ID format (must be "subsystemId:cycleNumber")
   */
  static validateCycleId(cycleId) {
    const parts = String(cycleId).split(':');
    if (parts.length !== 2) {
      return { valid: false, error: 'Cycle ID must be "subsystemId:cycleNumber"' };
    }

    const [subsystemId, cycleNumber] = parts;
    if (!subsystemId || subsystemId.trim() === '') {
      return { valid: false, error: 'Subsystem ID cannot be empty' };
    }
    if (isNaN(parseInt(cycleNumber))) {
      return { valid: false, error: 'Cycle number must be numeric' };
    }

    return { valid: true, cycleId, subsystemId, cycleNumber: parseInt(cycleNumber) };
  }

  /**
   * Validate CycleSnapshot schema (immutable result from Phase9Cycle)
   */
  static validateCycleSnapshot(snapshot) {
    const errors = [];

    // Required fields
    if (!snapshot.cycleId) errors.push('Missing cycleId');
    if (!snapshot.subsystemId) errors.push('Missing subsystemId');
    if (!snapshot.timestamp) errors.push('Missing timestamp');
    if (!snapshot.phase_9) errors.push('Missing phase_9 result');

    // Validate cycleId format
    const cycleIdCheck = this.validateCycleId(snapshot.cycleId);
    if (!cycleIdCheck.valid) errors.push(cycleIdCheck.error);

    // Validate phase_9 has required fields
    if (snapshot.phase_9) {
      if (typeof snapshot.phase_9.next_action === 'undefined') {
        errors.push('Missing phase_9.next_action');
      }
      if (typeof snapshot.phase_9.watchdog_violations === 'undefined') {
        errors.push('Missing phase_9.watchdog_violations');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      snapshot
    };
  }

  /**
   * Validate FederationDecision schema
   */
  static validateFederationDecision(decision) {
    const errors = [];

    if (!decision.cycleId) errors.push('Missing cycleId');
    if (!decision.subsystemId) errors.push('Missing subsystemId');
    if (!decision.timestamp) errors.push('Missing timestamp');
    if (typeof decision.approved === 'undefined') errors.push('Missing approved flag');
    if (!decision.reasoning) errors.push('Missing reasoning');

    // Validate approved is boolean
    if (typeof decision.approved !== 'boolean') {
      errors.push('approved must be boolean');
    }

    return {
      valid: errors.length === 0,
      errors,
      decision
    };
  }

  /**
   * Validate WatchdogViolation schema
   */
  static validateWatchdogViolation(violation) {
    const validRules = [
      'over_optimization',
      'runaway_complexity',
      'governance_collapse',
      'oscillation_loop',
      'metric_gaming',
      'long_term_degradation'
    ];

    const errors = [];
    if (!violation.rule) errors.push('Missing rule');
    if (!validRules.includes(violation.rule)) errors.push(`Invalid rule: ${violation.rule}`);
    if (!violation.subsystemId) errors.push('Missing subsystemId');
    if (!violation.timestamp) errors.push('Missing timestamp');

    return {
      valid: errors.length === 0,
      errors,
      violation
    };
  }

  /**
   * Validate ThresholdRecommendation schema
   */
  static validateThresholdRecommendation(recommendation) {
    const errors = [];

    if (!recommendation.subsystemId) errors.push('Missing subsystemId');
    if (!recommendation.timestamp) errors.push('Missing timestamp');
    if (!recommendation.reasoning) errors.push('Missing reasoning');
    if (!recommendation.recommendedThresholds) errors.push('Missing recommendedThresholds');

    const thresholds = recommendation.recommendedThresholds;
    if (thresholds) {
      if (typeof thresholds.mttrSeconds !== 'number') errors.push('mttrSeconds must be number');
      if (typeof thresholds.riskScoreMax !== 'number') errors.push('riskScoreMax must be number');
    }

    return {
      valid: errors.length === 0,
      errors,
      recommendation
    };
  }

  /**
   * Validate SubsystemHealthStatus schema
   */
  static validateSubsystemHealthStatus(status) {
    const errors = [];

    if (!status.subsystemId) errors.push('Missing subsystemId');
    if (typeof status.isHealthy === 'undefined') errors.push('Missing isHealthy flag');
    if (typeof status.recentViolations === 'undefined') errors.push('Missing recentViolations');
    if (typeof status.lastCycleStatus === 'undefined') errors.push('Missing lastCycleStatus');

    return {
      valid: errors.length === 0,
      errors,
      status
    };
  }
}

/**
 * CycleSnapshot: Immutable result from Phase9IntegratedOrchestrator.runPhase9Cycle()
 * Federation consumes these (read-only)
 */
export class CycleSnapshot {
  constructor(cycleId, subsystemId, phase9Result) {
    this.cycleId = cycleId;
    this.subsystemId = subsystemId;
    this.timestamp = Date.now();

    // Copy immutable fields from phase9Result
    this.phase_8 = phase9Result.phase_8;
    this.phase_c = phase9Result.phase_c;
    this.phase_a = phase9Result.phase_a;
    this.phase_d = phase9Result.phase_d;
    this.phase_b = phase9Result.phase_b;
    this.phase_e = phase9Result.phase_e;
    this.phase_9 = phase9Result.phase_9;
    this.all_gates_passed = phase9Result.all_gates_passed;

    // Computed federation metadata
    this.allGatesPassed = phase9Result.all_gates_passed;
    this.nextAction = phase9Result.phase_9?.next_action || 'UNKNOWN';
    this.watchdogViolationCount = phase9Result.phase_9?.watchdog_violations || 0;
    this.strategySelected = phase9Result.phase_9?.strategy_selected || 'UNKNOWN';
  }

  /**
   * Convert to immutable JSON representation
   */
  toJSON() {
    return Object.freeze({
      cycleId: this.cycleId,
      subsystemId: this.subsystemId,
      timestamp: this.timestamp,
      phase_8: this.phase_8,
      phase_c: this.phase_c,
      phase_a: this.phase_a,
      phase_d: this.phase_d,
      phase_b: this.phase_b,
      phase_e: this.phase_e,
      phase_9: this.phase_9,
      allGatesPassed: this.allGatesPassed,
      nextAction: this.nextAction,
      watchdogViolationCount: this.watchdogViolationCount,
      strategySelected: this.strategySelected
    });
  }

  /**
   * Validate snapshot
   */
  validate() {
    return DistributedCycleProtocol.validateCycleSnapshot(this.toJSON());
  }
}

/**
 * FederationDecision: Result of federation-level consensus check
 */
export class FederationDecision {
  constructor(cycleId, subsystemId, approved, reasoning = '') {
    this.cycleId = cycleId;
    this.subsystemId = subsystemId;
    this.timestamp = Date.now();
    this.approved = approved;
    this.reasoning = reasoning;
  }

  validate() {
    return DistributedCycleProtocol.validateFederationDecision(this.toJSON());
  }

  toJSON() {
    return Object.freeze({
      cycleId: this.cycleId,
      subsystemId: this.subsystemId,
      timestamp: this.timestamp,
      approved: this.approved,
      reasoning: this.reasoning
    });
  }
}

/**
 * WatchdogViolationRecord: Result of watchdog rule check (single instance or federated)
 */
export class WatchdogViolationRecord {
  constructor(rule, subsystemId, consequence, stateSnapshot) {
    this.rule = rule;
    this.subsystemId = subsystemId;
    this.timestamp = Date.now();
    this.consequence = consequence;
    this.stateSnapshot = stateSnapshot;
  }

  validate() {
    return DistributedCycleProtocol.validateWatchdogViolation(this.toJSON());
  }

  toJSON() {
    return Object.freeze({
      rule: this.rule,
      subsystemId: this.subsystemId,
      timestamp: this.timestamp,
      consequence: this.consequence,
      stateSnapshot: this.stateSnapshot
    });
  }
}

/**
 * ThresholdRecommendation: Federation suggests threshold adjustment to instance
 */
export class ThresholdRecommendation {
  constructor(subsystemId, recommendedThresholds, reasoning = '') {
    this.subsystemId = subsystemId;
    this.timestamp = Date.now();
    this.recommendedThresholds = recommendedThresholds;
    this.reasoning = reasoning;
  }

  validate() {
    return DistributedCycleProtocol.validateThresholdRecommendation(this.toJSON());
  }

  toJSON() {
    return Object.freeze({
      subsystemId: this.subsystemId,
      timestamp: this.timestamp,
      recommendedThresholds: this.recommendedThresholds,
      reasoning: this.reasoning
    });
  }
}

/**
 * SubsystemHealthStatus: Federation's assessment of instance health
 */
export class SubsystemHealthStatus {
  constructor(subsystemId, isHealthy, recentViolations, lastCycleStatus) {
    this.subsystemId = subsystemId;
    this.timestamp = Date.now();
    this.isHealthy = isHealthy;
    this.recentViolations = recentViolations || [];
    this.lastCycleStatus = lastCycleStatus;
  }

  validate() {
    return DistributedCycleProtocol.validateSubsystemHealthStatus(this.toJSON());
  }

  toJSON() {
    return Object.freeze({
      subsystemId: this.subsystemId,
      timestamp: this.timestamp,
      isHealthy: this.isHealthy,
      recentViolations: this.recentViolations,
      lastCycleStatus: this.lastCycleStatus
    });
  }
}

export default {
  DistributedCycleProtocol,
  CycleSnapshot,
  FederationDecision,
  WatchdogViolationRecord,
  ThresholdRecommendation,
  SubsystemHealthStatus
};
