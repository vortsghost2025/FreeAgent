/**
 * Phase 9 Integrated Orchestrator
 * Extends SelfArchitectureOrchestrator with full Phase 9 strategic synthesis
 * Manages autonomous cycle lifecycle with multi-phase coordination
 */

import { SelfArchitectureOrchestrator } from './self-architecture-orchestrator.js';
import { TemporalTrendAnalyzer } from './temporal-trend-analyzer.js';
import { CycleTelemetryRecorder } from './cycle-telemetry-recorder.js';
import { ProposalQualityScorer } from './proposal-quality-scorer.js';
import { PredictiveStabilityModeler } from './predictive-stability-modeler.js';
import { MetaGovernanceEngine } from './meta-governance-engine.js';
import {
  StrategicIntentModeler,
  MultiPhaseSynthesisEngine,
  AutonomousStrategySelector,
  SelfDirectedEvolutionController,
  StrategicDriftPrevention
} from './phase-9-strategic-engine.js';

export class Phase9IntegratedOrchestrator extends SelfArchitectureOrchestrator {
  constructor(options = {}) {
    super(options);

    // Initialize all phase engines
    this.trend_analyzer = new TemporalTrendAnalyzer(options);
    this.telemetry = new CycleTelemetryRecorder(options);
    this.quality_scorer = new ProposalQualityScorer(options);
    this.predictor = new PredictiveStabilityModeler(options);
    this.governance = new MetaGovernanceEngine(options);  // Create governance engine independently

    // Phase 9 engines
    this.intent_modeler = new StrategicIntentModeler(options);
    this.synthesis_engine = new MultiPhaseSynthesisEngine({
      trendAnalyzer: this.trend_analyzer,
      telemetryRecorder: this.telemetry,
      qualityScorer: this.quality_scorer,
      predictorModel: this.predictor,
      governanceEngine: this.governance,
      intentModeler: this.intent_modeler
    });
    this.strategy_selector = new AutonomousStrategySelector(options);
    this.evolution_controller = new SelfDirectedEvolutionController(options);
    this.drift_prevention = new StrategicDriftPrevention(options);

    // Cycle management
    this.current_cycle_id = null;
    this.cycle_queue = [];
    this.next_cycle_scheduled_at = null;
    this.autonomous_mode = true;
  }

  /**
   * Enhanced runCycle with full Phase 9 orchestration
   */
  runPhase9Cycle(cycleId, input = {}) {
    this.current_cycle_id = cycleId;

    // Phase 1: Prepare cycle (check readiness)
    const readiness = this.evolution_controller.shouldInitiateCycle({
      rollback_rate: input.rollbackRate || 0.2,
      architecture_consistency: input.architectureConsistency || 0.95,
      metric_drift_detected: false
    });

    if (!readiness.should_initiate && this.autonomous_mode) {
      return {
        cycleId,
        status: 'SKIPPED',
        reason: readiness.reason,
        timestamp: Date.now()
      };
    }

    // Phase 2: Run base orchestrator cycle
    const record = this.runCycle(cycleId, input);

    // Phase 3: Record telemetry
    this.telemetry.recordCycleSnapshot(cycleId, {
      architectureBefore: input.architectureSnapshot,
      architectureAfter: record.scan.model,
      proposalCount: record.registeredCount,
      validatedCount: record.validated.length,
      implementedCount: record.implemented.length,
      rolledBackCount: record.evolutionReport.stats.rollbackCount || 0,
      improvementPct: record.evolutionReport.stats.architecturalImprovementPct || 0,
      learningEfficiency: input.learningMetrics?.learningEfficiency || 0,
      architectureConsistency: record.scan.consistency,
      mttrSeconds: record.evolutionReport.stats.meanRollbackSeconds
    });

    // Phase 4: Update trend analyzer
    this.trend_analyzer.recordCycle(cycleId, {
      improvementPct: record.evolutionReport.stats.architecturalImprovementPct || 0,
      declaredImprovementPct: 0,  // Compute from proposals
      rollbackCount: record.evolutionReport.stats.rollbackCount || 0,
      changeCount: record.registeredCount,
      learningEfficiency: input.learningMetrics?.learningEfficiency || 0,
      architectureConsistency: record.scan.consistency
    });

    // Phase 5: Model strategic intent
    const intent = this.intent_modeler.modelStrategicIntent({
      complexity: input.architectureComplexity || 100,
      improvementPct: record.evolutionReport.stats.architecturalImprovementPct || 0,
      mttrSeconds: record.evolutionReport.stats.meanRollbackSeconds,
      stabilityScore: this._computeStability(record),
      architectureConsistency: record.scan.consistency
    });

    // Phase 6: Select strategy
    const strategy = this.strategy_selector.selectStrategy({
      complexity: input.architectureComplexity || 100,
      stability: this._computeStability(record),
      improvementTrend: this._computeImprovementTrend(),
      rollbackRate: input.rollbackRate || 0.2,
      mttrSeconds: record.evolutionReport.stats.meanRollbackSeconds || 30
    });

    // Phase 7: Check for autonomous pause/abort
    const pause_check = this.evolution_controller.shouldPauseCycle({
      oscillation_detected: this.trend_analyzer.detectOscillation().oscillating,
      stagnation_detected: this.trend_analyzer.detectStagnation().stagnant,
      governance_violations: 0,
      consecutive_failed_proposals: 0
    });

    const abort_check = this.evolution_controller.shouldAbortCycle({
      constraint_violation_critical: false,
      rollback_failure: false,
      consecutive_rollbacks: record.evolutionReport.stats.rollbackCount || 0,
      governance_deadlock: false
    });

    // Phase 8: Watchdog drift detection
    const drift_check = this.drift_prevention.checkWatchdog({
      mttr: record.evolutionReport.stats.meanRollbackSeconds || 30,
      improvement_rate: record.evolutionReport.stats.architecturalImprovementPct || 0,
      complexity: input.architectureComplexity || 100,
      stability: this._computeStability(record),
      improvement_trend: this._computeImprovementTrend(),
      rollback_rate: input.rollbackRate || 0.2,
      oscillation_rate: this.trend_analyzer.detectOscillation().oscillationRate || 0,
      declared_vs_observed_gap: 0,  // Compute from proposals
      improvement_trend_5_cycles: this._computeImprovementTrend(),
      complexity_growth_rate: 0.05,
      policy_violations: 0,
      governance_deadlock: false,
      constraint_violation_critical: false
    });

    // Phase 9: Schedule next cycle
    let next_cycle_action = 'SCHEDULE';
    let next_cycle_reason = 'normal';

    if (abort_check.should_abort) {
      next_cycle_action = 'ABORT';
      next_cycle_reason = abort_check.reasons[0];
    } else if (pause_check.should_pause) {
      next_cycle_action = 'PAUSE';
      next_cycle_reason = pause_check.reasons[0];
    } else if (drift_check.violations_detected) {
      next_cycle_action = 'WATCHDOG_ALERT';
      next_cycle_reason = drift_check.violations[0].rule;
    } else {
      const schedule = this.evolution_controller.scheduleCycle(strategy.config, {
        stability: this._computeStability(record)
      });
      this.next_cycle_scheduled_at = schedule.next_cycle_scheduled_at;
    }

    // Return comprehensive cycle result
    return {
      cycleId,
      status: 'COMPLETED',
      timestamp: Date.now(),
      phase_8: {
        cycle_result: record,
        changes_implemented: record.implemented.length,
        improvement: record.evolutionReport.stats.architecturalImprovementPct
      },
      phase_c: {
        trends: this.trend_analyzer.validateTrends(),
        rolling_improvement: this.trend_analyzer.validateRollingImprovement()
      },
      phase_a: {
        telemetry_recorded: true,
        cycles_tracked: this.telemetry.snapshots.length,
        rollbacks_logged: this.telemetry.rollbackTraces.length
      },
      phase_d: {
        quality_scores: record.registeredCount,
        top_subsystem: this.quality_scorer.getSubsystemLineage()[0]?.subsystem
      },
      phase_b: {
        mttr_prediction: this.predictor.predictMTTR({
          riskScore: 0.3,
          complexityDeltaPct: 5,
          affectedComponentCount: 2
        }).predictedMTTR,
        model_ready: this.predictor.getModelAccuracy().ready
      },
      phase_e: {
        governance_assessment: this.governance.assessGovernance(),
        adaptive_thresholds: this.governance.adaptiveThresholds
      },
      phase_9: {
        strategic_intent: intent.trajectory_decision,
        strategy_selected: strategy.strategy,
        strategy_config: strategy.config,
        intent_alignment: this.intent_modeler.getIntentStatus().alignment_score,
        synthesis_approval: this.synthesis_engine.synthesizeDecision({
          proposalId: 'cycle-' + cycleId,
          expectedImprovementPct: record.evolutionReport.stats.architecturalImprovementPct || 0,
          reversible: true,
          complexityDeltaPct: input.architectureComplexity ? -5 : 5,
          riskScore: 0.2,
          auditRef: 'audit:' + cycleId
        }).approved,
        watchdog_violations: drift_check.violations_detected ? drift_check.violations.length : 0,
        next_action: next_cycle_action,
        next_action_reason: next_cycle_reason,
        next_cycle_scheduled_at: this.next_cycle_scheduled_at
      },
      all_gates_passed: !abort_check.should_abort && !pause_check.should_pause && !drift_check.violations_detected
    };
  }

  /**
   * Autonomous cycle manager (runs cycles until conditions stop it)
   */
  async runAutonomousCycles(max_cycles = 10, cycle_interval_seconds = 5) {
    const autonomou_results = [];
    let cycles_run = 0;

    for (let i = 0; i < max_cycles; i++) {
      const cycle_id = `autonomous-${i + 1}`;

      const result = this.runPhase9Cycle(cycle_id, {
        architectureSnapshot: {
          components: Array(10 + i).fill('c').map((_, idx) => `comp-${idx}`),
          interfaces: Array(8 + i).fill('i').map((_, idx) => `if-${idx}`),
          invariants: ['REVERSIBLE_CHANGES_ONLY', 'AUDIT_TRAIL_REQUIRED']
        },
        architectureComplexity: 100 + (i * 2),
        rollbackRate: Math.max(0, 0.3 - (i * 0.02)),
        architectureConsistency: Math.min(1, 0.90 + (i * 0.01)),
        learningMetrics: {
          learningEfficiency: 0.70 + (i * 0.03),
          convergenceVelocity: 0.1 + (i * 0.02),
          stabilityScore: 0.85 + (i * 0.01)
        },
        validationEvidence: {
          testPassRate: 1,
          canarySuccessRate: 1,
          errorRatePct: 0.1,
          observedImprovementPct: 3 + (i * 0.5)
        },
        implementationActor: 'autonomous'
      });

      autonomou_results.push(result);
      cycles_run++;

      // Check if system should stop
      if (result.phase_9.next_action === 'PAUSE') {
        console.log(`[Autonomous] System self-paused at cycle ${i + 1}: ${result.phase_9.next_action_reason}`);
        break;
      }
      if (result.phase_9.next_action === 'ABORT') {
        console.log(`[Autonomous] System self-aborted at cycle ${i + 1}: ${result.phase_9.next_action_reason}`);
        break;
      }

      // Wait for next scheduled cycle
      if (i < max_cycles - 1) {
        await new Promise(resolve => setTimeout(resolve, cycle_interval_seconds * 1000));
      }
    }

    return {
      total_cycles_run: cycles_run,
      cycles: autonomou_results,
      final_status: autonomou_results[autonomou_results.length - 1]?.phase_9.next_action || 'COMPLETED'
    };
  }

  /**
   * Get full system status (all phases)
   */
  getFullSystemStatus() {
    return {
      orchestrator: {
        cycles_run: this.cycleLog.length,
        current_strategy: this.strategy_selector.current_strategy,
        autonomous_mode: this.autonomous_mode,
        next_cycle_scheduled: this.next_cycle_scheduled_at
      },
      phase_8: {
        completion_criteria: this.getCompletionCriteriaStatus()
      },
      phase_c: {
        trend_validation: this.trend_analyzer.validateTrends()
      },
      phase_a: {
        cycles_tracked: this.telemetry.snapshots.length,
        observability: this.telemetry.getObservabilityReport()
      },
      phase_d: {
        quality_report: this.quality_scorer.getQualityReport()
      },
      phase_b: {
        model_accuracy: this.predictor.getModelAccuracy()
      },
      phase_e: {
        meta_governance_status: this.governance.getMetaGovernanceStatus()
      },
      phase_9: {
        intent_status: this.intent_modeler.getIntentStatus(),
        strategy_selection: this.strategy_selector.getStrategyStatus(),
        evolution_control: this.evolution_controller.getControlStatus(),
        watchdog_status: this.drift_prevention.getWatchdogStatus(),
        phase_integration: this.synthesis_engine.getPhaseIntegration()
      }
    };
  }

  // Helper methods
  _computeStability(record) {
    const consistency = record.scan?.consistency || 0.95;
    const error_rate = record.validated?.filter(v => !v.validation).length || 0;
    return Math.max(0, Math.min(1, consistency - (error_rate * 0.05)));
  }

  _computeImprovementTrend() {
    if (this.trend_analyzer.cycleHistory.length < 2) return 0;
    const recent = this.trend_analyzer.cycleHistory.slice(-3);
    const improvements = recent.map(c => c.metrics.improvementPct);
    let trend = 0;
    for (let i = 1; i < improvements.length; i++) {
      trend += improvements[i] - improvements[i - 1];
    }
    return trend / (improvements.length - 1);
  }
}

export default {
  Phase9IntegratedOrchestrator
};
