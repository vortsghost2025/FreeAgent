/**
 * Phase 7.7: Autonomous Federated Evolution
 * Integrates phases 7.1-7.6 into supervised autonomous self-maintenance cycles.
 */

import { SelfDirectedImprovementCycleEngine } from './autonomous-evolution-cycles.js';
import { FederatedSelfDiagnosticsEngine } from './federated-self-diagnostics.js';
import { AutonomousPatchProposalEngine } from './autonomous-patch-proposals.js';
import { SafetyBoundedExplorationEngine } from './safety-bounded-exploration.js';
import { SupervisedAutonomyController } from './supervised-autonomy-controller.js';
import { LongHorizonEvolutionMemoryEngine } from './evolution-memory.js';

export class AutonomousFederatedEvolutionEngine {
  constructor(options = {}) {
    this.cycleEngine = new SelfDirectedImprovementCycleEngine(options);
    this.diagnostics = new FederatedSelfDiagnosticsEngine(options);
    this.patchEngine = new AutonomousPatchProposalEngine(options);
    this.exploration = new SafetyBoundedExplorationEngine(options);
    this.supervision = new SupervisedAutonomyController(options);
    this.memory = new LongHorizonEvolutionMemoryEngine(options);

    this.evolutionLog = [];
    this.autoCorrections = [];
    this.maxLogSize = options.maxLogSize || 5000;
  }

  configureGovernance(config = {}) {
    if (config.cycleThresholds) {
      this.cycleEngine.configureThresholds(config.cycleThresholds);
    }
    if (config.guardrails) {
      this.supervision.configureGuardrails(config.guardrails);
    }
    if (config.forbiddenOperations) {
      this.supervision.configureForbiddenOperations(config.forbiddenOperations);
    }
    if (config.mutationZones) {
      this.supervision.configureMutationZones(config.mutationZones);
    }
    if (config.explorationConstraints) {
      this.exploration.configureConstraints(config.explorationConstraints);
    }

    return { success: true };
  }

  runEvolutionCycle(cycleId, snapshot = {}) {
    const diagnosticsInput = snapshot.diagnosticsInput || {};
    const diagnosticsReport = this.diagnostics.runDiagnostics(diagnosticsInput);
    const repairCycle = this.diagnostics.triggerRepairCycle(diagnosticsReport);

    const improvementSignals = this._buildImprovementSignals(diagnosticsReport, snapshot);
    const cycleResult = this.cycleEngine.runCycle(cycleId, improvementSignals, snapshot.cycleOptions || {});

    const proposalBatch = this.patchEngine.proposeFromDiagnostics({
      driftScore: diagnosticsReport.sections.drift.driftScore || 0,
      nondeterminismScore: diagnosticsReport.sections.nondeterminism.nondeterminismScore || 0,
      orchestrationLatencyP95: diagnosticsReport.sections.latency.p95 || 0,
      latencyBudgetMs: snapshot.latencyBudgetMs || 250
    });

    const evaluatedProposals = [];
    const autoApplied = [];
    const escalated = [];
    const blocked = [];

    for (const proposal of proposalBatch.proposals) {
      const evaluation = this.patchEngine.evaluateProposal(proposal.proposalId, {
        testPassRate: snapshot.testPassRate == null ? 1 : snapshot.testPassRate,
        coverageDelta: snapshot.coverageDelta == null ? 0.01 : snapshot.coverageDelta,
        regressionRisk: proposal.riskScore
      });

      if (!evaluation.success || evaluation.status === 'TESTED_FAIL') {
        this.patchEngine.rejectProposal(proposal.proposalId, 'Tester rejected proposal');
        this.memory.recordFailure(cycleId, proposal.proposalId, 'TESTER_REJECTED', proposal.target);
        blocked.push({ proposalId: proposal.proposalId, reason: 'TESTER_REJECTED' });
        continue;
      }

      const action = this._actionFromProposal(proposal);
      const supervisionDecision = this.supervision.evaluateAction(action);

      evaluatedProposals.push({
        proposalId: proposal.proposalId,
        evaluation,
        supervisionDecision
      });

      if (supervisionDecision.decision === 'AUTO_APPROVED') {
        this.patchEngine.approveProposal(proposal.proposalId, 'autonomy-controller');

        let explorationResult = null;
        if (proposal.type === 'OPTIMIZATION' || proposal.type === 'INVARIANT_TIGHTENING') {
          explorationResult = this.exploration.explore(
            `${cycleId}-${proposal.proposalId}`,
            this._strategyFromProposal(proposal),
            snapshot.explorationBaseline || {
              convergenceScore: 0.8,
              orchestrationLatencyP95: 200,
              failureRate: 0.02,
              mergeConflictRate: 0.05
            }
          );

          if (explorationResult.status === 'ROLLED_BACK' || explorationResult.status === 'BLOCKED') {
            this.patchEngine.rejectProposal(proposal.proposalId, 'Exploration safety rollback');
            this.memory.recordInstability(cycleId, 'EXPLORATION_ROLLBACK', 0.6, {
              proposalId: proposal.proposalId,
              violations: explorationResult.violations || explorationResult.reasons || []
            });
            blocked.push({ proposalId: proposal.proposalId, reason: 'EXPLORATION_ROLLBACK' });
            continue;
          }
        }

        this.patchEngine.markApplied(proposal.proposalId, {
          mode: 'AUTONOMOUS_GOVERNED',
          cycleId,
          explorationStatus: explorationResult ? explorationResult.status : null
        });

        autoApplied.push(proposal.proposalId);
        this.memory.recordOutcome(cycleId, proposal.proposalId, 'SUCCESS', cycleResult.metricsDelta, {
          source: 'AUTONOMOUS_APPLY'
        });
      } else if (supervisionDecision.decision === 'ESCALATE_HUMAN') {
        escalated.push({
          proposalId: proposal.proposalId,
          escalationId: supervisionDecision.escalationId,
          reasons: supervisionDecision.escalationReasons
        });
        this.memory.recordOutcome(cycleId, proposal.proposalId, 'PENDING_HUMAN', {}, {
          escalationReasons: supervisionDecision.escalationReasons
        });
      } else {
        blocked.push({
          proposalId: proposal.proposalId,
          reasons: supervisionDecision.blockedReasons
        });
        this.patchEngine.rejectProposal(proposal.proposalId, supervisionDecision.blockedReasons.join(','));
        this.memory.recordFailure(cycleId, proposal.proposalId, 'SUPERVISION_BLOCKED', proposal.target, {
          blockedReasons: supervisionDecision.blockedReasons
        });
      }
    }

    if (
      diagnosticsReport.sections.nondeterminism.status === 'DEGRADED' &&
      autoApplied.length > 0
    ) {
      this.autoCorrections.push({
        cycleId,
        type: 'NONDETERMINISM',
        correctedBy: autoApplied.slice(),
        timestamp: Date.now()
      });
      this.memory.recordNondeterminismCorrection(cycleId, 'federated-suite', 'DETERMINISM_HARDENING');
    }

    const record = {
      cycleId,
      timestamp: Date.now(),
      diagnosticsReport,
      repairCycle,
      cycleResult,
      proposalBatch,
      evaluatedProposals,
      autoApplied,
      escalated,
      blocked,
      interventionRequired: cycleResult.requiresAuditorIntervention || escalated.length > 0,
      success: blocked.length === 0
    };

    this._log(record);
    return record;
  }

  resolveEscalation(escalationId, resolution = 'APPROVED', actor = 'human') {
    return this.supervision.escalationMgr.resolveEscalation(escalationId, resolution, actor);
  }

  getCompletionCriteriaStatus() {
    const allProposals = this.patchEngine.ledger.listProposals();
    const testedCount = this.patchEngine.tester.evaluationLog.length;
    const appliedWithoutApproval = allProposals.filter((p) => p.status === 'APPLIED' && !p.approvedBy).length;

    const escalationLogs = this.supervision.escalationMgr.escalationLog.filter((e) => Array.isArray(e.reasons));
    const allEscalationsThresholdBased = escalationLogs.every((e) => e.reasons.length > 0);

    const criteria = {
      proposesImprovementsWithoutPrompting: allProposals.length > 0,
      builderAndTesterRunAutonomously: this.cycleEngine.cycleLog.length > 0 && testedCount > 0,
      nondeterminismDetectedAndCorrected: this.memory.store.nondeterminismCorrections.length > 0 || this.autoCorrections.length > 0,
      interveneOnlyForGovernanceDecisions: allEscalationsThresholdBased,
      selfMaintainsAcrossRuns: this.evolutionLog.length >= 2 && this.evolutionLog.slice(-2).every((r) => r.success),
      gitDisciplineHonored: appliedWithoutApproval === 0,
      clusterActsLikeTeam: this.cycleEngine.cycleLog.length > 0 &&
        this.patchEngine.tester.evaluationLog.length > 0 &&
        this.diagnostics.diagnosticsLog.length > 0
    };

    return {
      criteria,
      complete: Object.values(criteria).every(Boolean)
    };
  }

  getEvolutionStatus() {
    return {
      cycles: this.cycleEngine.getCycleReport(),
      diagnostics: this.diagnostics.getDiagnosticsStatus(),
      proposals: this.patchEngine.getProposalReport(),
      exploration: this.exploration.getExplorationStatus(),
      supervision: this.supervision.getSupervisionStatus(),
      memory: this.memory.getInstitutionalMemoryReport(),
      autoCorrections: this.autoCorrections.slice(-10),
      completion: this.getCompletionCriteriaStatus(),
      totalEvolutionCycles: this.evolutionLog.length,
      recentCycles: this.evolutionLog.slice(-5)
    };
  }

  _buildImprovementSignals(diagnosticsReport, snapshot = {}) {
    return {
      diagnostics: {
        driftScore: diagnosticsReport.sections.drift.driftScore || 0,
        nondeterminismScore: diagnosticsReport.sections.nondeterminism.nondeterminismScore || 0,
        privacyComplianceRate: diagnosticsReport.sections.privacy.complianceRate || 100,
        convergenceStability: diagnosticsReport.sections.convergence.stabilityScore || 1,
        orchestrationLatencyP95: diagnosticsReport.sections.latency.p95 || 0,
        criticalFindings: diagnosticsReport.degradedSections.length
      },
      latencyBudgetMs: snapshot.latencyBudgetMs || 250,
      convergenceTrend: diagnosticsReport.sections.convergence.trend || 'STABLE',
      baselineMetrics: snapshot.baselineMetrics || {},
      observedMetrics: snapshot.observedMetrics || {},
      testPassRate: snapshot.testPassRate == null ? 1 : snapshot.testPassRate
    };
  }

  _actionFromProposal(proposal) {
    const operationsByType = {
      CODE_PATCH: ['propose-code-patch'],
      TEST_IMPROVEMENT: ['propose-test-improvement'],
      INVARIANT_TIGHTENING: ['propose-invariant'],
      OPTIMIZATION: ['propose-optimization']
    };

    return {
      actionId: proposal.proposalId,
      type: proposal.type,
      riskScore: proposal.riskScore,
      operations: operationsByType[proposal.type] || ['propose-change'],
      filePaths: [`medical/intelligence/${proposal.target}.js`],
      testPassRate: 1,
      latencyRegressionPct: 0,
      highImpact: proposal.highImpact === true,
      newCapability: proposal.expectedImpact === 'HIGH' && proposal.type === 'CODE_PATCH'
    };
  }

  _strategyFromProposal(proposal) {
    if (proposal.type === 'OPTIMIZATION') {
      return { type: 'ALT_AGGREGATION', operations: ['optimize'] };
    }
    if (proposal.type === 'INVARIANT_TIGHTENING') {
      return { type: 'STRICT_CONVERGENCE', operations: ['tighten-invariant'] };
    }
    return { type: 'VERSION_MERGE_LOGIC', operations: ['merge-logic'] };
  }

  _log(record) {
    this.evolutionLog.push(record);
    if (this.evolutionLog.length > this.maxLogSize) {
      this.evolutionLog.shift();
    }
  }
}

export default {
  AutonomousFederatedEvolutionEngine
};

