/**
 * Phase 9: Autonomous Strategic Evolution Engine
 * Synthesizes Phases C, A, D, B, E into a single strategic decision-making system
 */

export class StrategicIntentModeler {
  constructor(options = {}) {
    this.vision = options.vision || {
      target_complexity_bound: 200,
      target_improvement_per_cycle_min: 0.5,
      target_mttr_max: 30,
      target_stability_score_min: 0.85
    };
    this.intent_history = [];
    this.trajectory = [];
    this.maxHistorySize = options.maxHistorySize || 100;
  }

  /**
   * Infer long-term architectural direction from cycle data
   */
  modelStrategicIntent(cycle_metrics = {}) {
    const vision_alignment = {
      complexity_ok: (cycle_metrics.complexity || 0) < this.vision.target_complexity_bound,
      improvement_ok: (cycle_metrics.improvementPct || 0) >= this.vision.target_improvement_per_cycle_min,
      mttr_ok: (cycle_metrics.mttrSeconds || null) === null || cycle_metrics.mttrSeconds <= this.vision.target_mttr_max,
      stability_ok: (cycle_metrics.stabilityScore || 0) >= this.vision.target_stability_score_min
    };

    // Compute trajectory based on alignment
    let trajectory_decision = 'BALANCED_EVOLUTION';
    const all_ok = Object.values(vision_alignment).every(v => v === true);
    if (all_ok) {
      trajectory_decision = 'ACCELERATE_INNOVATION';
    } else {
      const failures = Object.entries(vision_alignment)
        .filter(([k, v]) => v === false)
        .map(([k]) => k);

      if (failures.includes('stability_ok')) {
        trajectory_decision = 'STABILIZATION_MODE';
      } else if (failures.includes('mttr_ok')) {
        trajectory_decision = 'RELIABILITY_HARDENING';
      } else if (failures.includes('complexity_ok')) {
        trajectory_decision = 'SIMPLIFICATION';
      } else if (failures.includes('improvement_ok')) {
        trajectory_decision = 'OPTIMIZATION';
      }
    }

    const intent = {
      timestamp: Date.now(),
      current_state: {
        complexity: cycle_metrics.complexity || 0,
        improvement_rate: cycle_metrics.improvementPct || 0,
        mttr: cycle_metrics.mttrSeconds || 0,
        stability: cycle_metrics.stabilityScore || 0,
        consistency: cycle_metrics.architectureConsistency || 0
      },
      vision_alignment,
      trajectory_decision
    };

    this.intent_history.push(intent);
    if (this.intent_history.length > this.maxHistorySize) {
      this.intent_history.shift();
    }

    return intent;
  }

  /**
   * Detect conflicts between short-term gains and long-term trajectory
   */
  detectTrajectoryConflict(proposal = {}, trend_data = {}) {
    const short_term_gain = proposal.expectedImprovementPct || 0;
    const long_term_complexity_delta = proposal.complexityDeltaPct || 0;
    const historical_trend = trend_data.net_improvement_last_5_cycles || 0;

    const conflict = {
      proposal_id: proposal.proposalId,
      short_term_gain,
      long_term_cost: long_term_complexity_delta,
      historical_trend,
      conflict: false,
      reason: 'no_conflict'
    };

    // Detect: short-term gain masks long-term complexity creep
    if (short_term_gain > 5 && long_term_complexity_delta > 20) {
      conflict.conflict = true;
      conflict.reason = 'short_term_gain_masks_complexity_creep';
    }

    // Detect: improvement rate declining despite apparent gains
    if (short_term_gain > 0 && historical_trend < -1) {
      conflict.conflict = true;
      conflict.reason = 'declining_improvement_trajectory';
    }

    // Detect: approaching complexity bound
    if ((proposal.current_complexity || 0) + (long_term_complexity_delta / 100) * (proposal.current_complexity || 200) > this.vision.target_complexity_bound) {
      conflict.conflict = true;
      conflict.reason = 'complexity_bound_exceeded';
    }

    return conflict;
  }

  getIntentStatus() {
    if (this.intent_history.length === 0) {
      return { status: 'no_data' };
    }

    const recent = this.intent_history.slice(-1)[0];
    const aligned = Object.values(recent.vision_alignment).filter(v => v === true).length;
    const total = Object.values(recent.vision_alignment).length;

    return {
      latest_intent: recent.trajectory_decision,
      alignment_score: Number((aligned / total).toFixed(2)),
      alignment_details: recent.vision_alignment,
      vision: this.vision
    };
  }
}

export class MultiPhaseSynthesisEngine {
  constructor(options = {}) {
    this.trend_analyzer = options.trendAnalyzer;
    this.telemetry = options.telemetryRecorder;
    this.quality_scorer = options.qualityScorer;
    this.predictor = options.predictorModel;
    this.governance = options.governanceEngine;
    this.intent_modeler = options.intentModeler;
  }

  /**
   * Synthesize decision based on all 5 phases
   */
  synthesizeDecision(proposal = {}) {
    const synthesis = {
      proposal_id: proposal.proposalId,
      timestamp: Date.now(),
      decisions: {}
    };

    // Phase C: Trend analysis
    if (this.trend_analyzer) {
      const trends = this.trend_analyzer.validateTrends();
      synthesis.decisions.trend_gate = {
        passed: trends.passed,
        reason: trends.failedGates.length === 0 ? 'healthy_trends' : 'trend_violation_' + trends.failedGates[0]
      };
    }

    // Phase A: Observability feedback
    if (this.telemetry) {
      const report = this.telemetry.getObservabilityReport();
      const drifting = report.driftAnalysis.driftingMetrics.length > 0;
      synthesis.decisions.observability_gate = {
        stable: !drifting,
        drifting_metrics: report.driftAnalysis.driftingMetrics
      };
    }

    // Phase D: Quality assessment
    if (this.quality_scorer) {
      const scored = this.quality_scorer.scoreProposal(proposal);
      synthesis.decisions.quality_gate = {
        score: scored.score,
        rating: scored.rating,
        should_select: scored.shouldSelect
      };
    }

    // Phase B: Predictive modeling
    if (this.predictor) {
      const mttr_pred = this.predictor.predictMTTR(proposal);
      const risk_pred = this.predictor.forecastRisk(proposal);
      const rollback_sim = this.predictor.simulateRollbackSuccess(proposal);
      synthesis.decisions.predictive_gate = {
        mttr_prediction: mttr_pred.predictedMTTR,
        mttr_acceptable: mttr_pred.predictedMTTR <= 30,
        risk_forecast: risk_pred.forecastedFailureRate,
        risk_acceptable: risk_pred.forecastedFailureRate < 0.3,
        rollback_success_odds: rollback_sim.estimatedRollbackSuccessRate,
        recommendation: rollback_sim.recommendation
      };
    }

    // Phase E: Governance validation
    if (this.governance) {
      const assessment = this.governance.assessGovernance();
      synthesis.decisions.governance_gate = {
        assessment: assessment.assessment,
        recommendation: assessment.recommendation
      };
    }

    // Phase 9: Strategic intent alignment
    if (this.intent_modeler) {
      const trajectory_conflict = this.intent_modeler.detectTrajectoryConflict(proposal, {});
      synthesis.decisions.strategic_gate = {
        conflict: trajectory_conflict.conflict,
        reason: trajectory_conflict.reason
      };
    }

    // Final synthesis: all gates must pass
    const all_gates_pass = Object.values(synthesis.decisions).every(gate => {
      if (gate.passed === false) return false;
      if (gate.should_select === false) return false;
      if (gate.mttr_acceptable === false) return false;
      if (gate.risk_acceptable === false) return false;
      if (gate.stable === false) return false;
      if (gate.conflict === true) return false;
      return true;
    });

    synthesis.approved = all_gates_pass;
    synthesis.all_gates = synthesis.decisions;

    return synthesis;
  }

  getPhaseIntegration() {
    return {
      phase_c_trend: this.trend_analyzer ? 'connected' : 'not_connected',
      phase_a_observability: this.telemetry ? 'connected' : 'not_connected',
      phase_d_quality: this.quality_scorer ? 'connected' : 'not_connected',
      phase_b_predictive: this.predictor ? 'connected' : 'not_connected',
      phase_e_governance: this.governance ? 'connected' : 'not_connected',
      phase_9_strategic: this.intent_modeler ? 'connected' : 'not_connected',
      all_phases_integrated: [
        this.trend_analyzer,
        this.telemetry,
        this.quality_scorer,
        this.predictor,
        this.governance,
        this.intent_modeler
      ].every(p => p !== null && p !== undefined)
    };
  }
}

export class AutonomousStrategySelector {
  constructor(options = {}) {
    this.strategies = {
      STABILITY_FIRST: {
        name: 'Stability First',
        mttr_threshold: 20,  // Strict
        risk_tolerance: 0.2,  // Low
        improvement_min: 0.5,
        rollback_freq_max: 0.2,
        cycle_duration_target: 120,  // Slow and deliberate
        approval_strictness: 'HIGH'
      },
      PERFORMANCE_FIRST: {
        name: 'Performance First',
        mttr_threshold: 45,  // Permissive
        risk_tolerance: 0.6,  // Medium-high
        improvement_min: 5,  // High bar for improvement
        rollback_freq_max: 0.5,
        cycle_duration_target: 60,
        approval_strictness: 'MEDIUM'
      },
      RISK_AVERSE: {
        name: 'Risk Averse',
        mttr_threshold: 15,  // Very strict
        risk_tolerance: 0.1,  // Minimal
        improvement_min: 0.1,  // Accept any gain
        rollback_freq_max: 0.1,  // Intolerant of failures
        cycle_duration_target: 180,
        approval_strictness: 'VERY_HIGH'
      },
      AGGRESSIVE_INNOVATION: {
        name: 'Aggressive Innovation',
        mttr_threshold: 60,  // Very permissive
        risk_tolerance: 0.8,  // High
        improvement_min: 3,  // Must deliver gains
        rollback_freq_max: 0.6,
        cycle_duration_target: 30,  // Fast iteration
        approval_strictness: 'LOW'
      },
      RECOVERY_MODE: {
        name: 'Recovery Mode',
        mttr_threshold: 10,  // Extremely tight
        risk_tolerance: 0.05,  // Almost no risk
        improvement_min: 0,  // Accept stabilization
        rollback_freq_max: 0.05,  // No rollbacks allowed
        cycle_duration_target: 300,  // Very slow recovery
        approval_strictness: 'CRITICAL'
      }
    };

    this.current_strategy = 'BALANCED_EVOLUTION';
    this.strategy_history = [];
  }

  /**
   * Select strategy based on system state
   */
  selectStrategy(state = {}) {
    let recommended = 'BALANCED_EVOLUTION';
    const rationale = [];

    const complexity = state.complexity || 100;
    const stability = state.stabilityScore || 0.85;
    const improvement_trend = state.improvementTrend || 0;
    const rollback_rate = state.rollbackRate || 0;
    const mttr = state.mttrSeconds || 30;

    // RECOVERY_MODE if system is degrading
    if (stability < 0.65 || mttr > 60 || rollback_rate > 0.5) {
      recommended = 'RECOVERY_MODE';
      rationale.push('system_degradation_detected');
    }
    // RISK_AVERSE if approaching complexity bound
    else if (complexity > 180) {
      recommended = 'RISK_AVERSE';
      rationale.push('approaching_complexity_bound');
    }
    // STABILITY_FIRST if trends are declining
    else if (improvement_trend < -1) {
      recommended = 'STABILITY_FIRST';
      rationale.push('declining_improvement_trend');
    }
    // PERFORMANCE_FIRST if high improvement potential
    else if (improvement_trend > 3) {
      recommended = 'PERFORMANCE_FIRST';
      rationale.push('strong_improvement_signal');
    }
    // AGGRESSIVE_INNOVATION if system is very healthy
    else if (stability > 0.95 && complexity < 80 && improvement_trend > 0) {
      recommended = 'AGGRESSIVE_INNOVATION';
      rationale.push('system_very_healthy');
    }

    const strategy_record = {
      timestamp: Date.now(),
      selected_strategy: recommended,
      rationale,
      state_snapshot: {
        complexity,
        stability,
        improvement_trend,
        rollback_rate,
        mttr
      }
    };

    this.strategy_history.push(strategy_record);
    if (this.strategy_history.length > 100) {
      this.strategy_history.shift();
    }

    this.current_strategy = recommended;
    return {
      strategy: recommended,
      config: this.strategies[recommended],
      rationale,
      previous_strategy: this.strategy_history.length > 1 ? this.strategy_history[this.strategy_history.length - 2].selected_strategy : null
    };
  }

  getStrategyStatus() {
    return {
      current_strategy: this.current_strategy,
      config: this.strategies[this.current_strategy],
      history: this.strategy_history.slice(-5)
    };
  }
}

export class SelfDirectedEvolutionController {
  constructor(options = {}) {
    this.cycle_state = 'IDLE';  // IDLE, RUNNING, PAUSED, ABORTING
    this.cycle_queue = [];
    this.cycle_log = [];
    this.self_pause_reasons = [];
    this.self_abort_reasons = [];
    this.max_consecutive_rollbacks = options.maxConsecutiveRollbacks || 3;
  }

  /**
   * Autonomously initiate a cycle if conditions are met
   */
  shouldInitiateCycle(state = {}) {
    // Check health prerequisites
    if (state.rollback_rate > 0.6) {
      return { should_initiate: false, reason: 'excessive_rollback_rate' };
    }
    if (state.architecture_consistency < 0.85) {
      return { should_initiate: false, reason: 'poor_architecture_consistency' };
    }
    if (state.metric_drift_detected) {
      return { should_initiate: false, reason: 'metric_drift_detected' };
    }

    return { should_initiate: true, reason: 'system_ready' };
  }

  /**
   * Autonomously pause a cycle if issues detected
   */
  shouldPauseCycle(state = {}) {
    const pause_reasons = [];

    if (state.oscillation_detected) {
      pause_reasons.push('oscillation_detected');
    }
    if (state.stagnation_detected) {
      pause_reasons.push('stagnation_detected');
    }
    if (state.governance_violations > 0) {
      pause_reasons.push('governance_violation');
    }
    if (state.consecutive_failed_proposals > 2) {
      pause_reasons.push('proposal_failure_streak');
    }

    if (pause_reasons.length > 0) {
      this.self_pause_reasons.push(pause_reasons);
      return { should_pause: true, reasons: pause_reasons };
    }

    return { should_pause: false, reasons: [] };
  }

  /**
   * Autonomously abort a cycle if critical failure
   */
  shouldAbortCycle(state = {}) {
    const abort_reasons = [];

    if (state.constraint_violation_critical) {
      abort_reasons.push('critical_constraint_violation');
    }
    if (state.rollback_failure) {
      abort_reasons.push('rollback_failure');
    }
    if (state.consecutive_rollbacks >= this.max_consecutive_rollbacks) {
      abort_reasons.push('excessive_consecutive_rollbacks');
    }
    if (state.governance_deadlock) {
      abort_reasons.push('governance_deadlock');
    }

    if (abort_reasons.length > 0) {
      this.self_abort_reasons.push(abort_reasons);
      return { should_abort: true, reasons: abort_reasons };
    }

    return { should_abort: false, reasons: [] };
  }

  /**
   * Self-schedule next cycle based on strategy and current state
   */
  scheduleCycle(strategy = {}, state = {}) {
    const cycle_duration_target = strategy.cycle_duration_target || 120;
    const time_until_next = cycle_duration_target * 1000;  // Convert to ms

    return {
      next_cycle_in_seconds: cycle_duration_target,
      next_cycle_scheduled_at: Date.now() + time_until_next,
      strategy_target: strategy.name,
      reason: 'normal_scheduling'
    };
  }

  getControlStatus() {
    return {
      cycle_state: this.cycle_state,
      pause_events: this.self_pause_reasons.length,
      abort_events: this.self_abort_reasons.length,
      cycle_log_size: this.cycle_log.length,
      recent_pauses: this.self_pause_reasons.slice(-3),
      recent_aborts: this.self_abort_reasons.slice(-3)
    };
  }
}

export class StrategicDriftPrevention {
  constructor(options = {}) {
    this.watchdog_rules = [
      {
        name: 'over_optimization',
        check: (state) => state.mttr < 5 && state.improvement_rate > 50,
        consequence: 'may_mask_hidden_costs'
      },
      {
        name: 'runaway_complexity',
        check: (state) => state.complexity_growth_rate > 0.2,
        consequence: 'approach_complexity_bound'
      },
      {
        name: 'governance_collapse',
        check: (state) => state.policy_violations > 3,
        consequence: 'enforce_policy_reset'
      },
      {
        name: 'oscillation_loop',
        check: (state) => state.oscillation_rate > 0.4,
        consequence: 'halt_and_stabilize'
      },
      {
        name: 'metric_gaming',
        check: (state) => state.declared_vs_observed_gap > 20,
        consequence: 'audit_improvement_claims'
      },
      {
        name: 'long_term_degradation',
        check: (state) => state.improvement_trend_5_cycles < -2,
        consequence: 'enter_recovery_mode'
      }
    ];

    this.violations = [];
  }

  /**
   * Check all watchdog rules
   */
  checkWatchdog(state = {}) {
    const violations_this_check = [];

    for (const rule of this.watchdog_rules) {
      if (rule.check(state)) {
        violations_this_check.push({
          rule: rule.name,
          timestamp: Date.now(),
          consequence: rule.consequence,
          state_snapshot: { ...state }
        });
      }
    }

    this.violations.push(...violations_this_check);

    return {
      violations_detected: violations_this_check.length > 0,
      violations: violations_this_check,
      total_violations: this.violations.length
    };
  }

  getWatchdogStatus() {
    return {
      total_violations_history: this.violations.length,
      recent_violations: this.violations.slice(-5),
      rules_monitored: this.watchdog_rules.length,
      active_alerts: this.violations.filter(v => Date.now() - v.timestamp < 3600000).length  // Last hour
    };
  }
}

export default {
  StrategicIntentModeler,
  MultiPhaseSynthesisEngine,
  AutonomousStrategySelector,
  SelfDirectedEvolutionController,
  StrategicDriftPrevention
};
