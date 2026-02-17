/**
 * Phase 8.5: Self-Architecture Orchestrator
 * Integrates meta-cognitive awareness, architectural evolution, meta-learning, and introspective validation.
 */

import { MetaCognitiveAwarenessEngine } from './meta-cognitive-awareness.js';
import { AutonomousArchitecturalEvolutionEngine } from './autonomous-architectural-evolution.js';
import { MetaLearningOptimizerEngine } from './meta-learning-optimizer.js';
import { IntrospectiveValidationEngine } from './introspective-validation.js';

export class SelfArchitectureOrchestrator {
  constructor(options = {}) {
    this.awareness = options.awareness || new MetaCognitiveAwarenessEngine(options);
    this.evolution = options.evolution || new AutonomousArchitecturalEvolutionEngine(options);
    this.metaLearning = options.metaLearning || new MetaLearningOptimizerEngine(options);
    this.validation = options.validation || new IntrospectiveValidationEngine(options);
    this.cycleLog = [];
    this.maxLogSize = options.maxLogSize || 5000;
  }

  runCycle(cycleId, input = {}) {
    const scan = this.awareness.scanArchitecture(
      input.architectureSnapshot || {},
      input.externalInspection || {}
    );

    const reflection = this.awareness.reflectOnCognition(input.cognitiveTelemetry || {});
    const proposalBatch = this.awareness.proposeSelfArchitectureChanges(input.objectives || {});
    const registered = this.evolution.registerProposals(proposalBatch.proposals, {
      cycleId
    });

    const validated = [];
    const implemented = [];
    const pendingHuman = [];

    for (const change of registered.registered) {
      const validationResult = this.evolution.validateChange(change.changeId, {
        testPassRate: input.validationEvidence && input.validationEvidence.testPassRate,
        canarySuccessRate: input.validationEvidence && input.validationEvidence.canarySuccessRate,
        errorRatePct: input.validationEvidence && input.validationEvidence.errorRatePct,
        maxSafetyRiskScore: input.validationEvidence && input.validationEvidence.maxSafetyRiskScore
      });
      validated.push({
        changeId: change.changeId,
        validation: validationResult.validation
      });

      const implementationResult = this.evolution.implementChange(
        change.changeId,
        input.implementationActor || 'autonomous'
      );
      if (implementationResult.status === 'IMPLEMENTED') {
        implemented.push(change.changeId);
      } else if (implementationResult.status === 'PENDING_HUMAN_REVIEW') {
        pendingHuman.push(change.changeId);
      }
    }

    this.metaLearning.recordCycle(cycleId, input.learningMetrics || {});
    const learningOptimization = this.metaLearning.optimizeLearning(
      input.learningConfig || {},
      input.learningMetrics || {}
    );
    const memoryOptimization = this.metaLearning.optimizeMemoryArchitecture(
      input.memoryStats || {}
    );

    const evolutionReport = this.evolution.getEvolutionReport();
    const traceAuditEntries = [
      ...this.validation.auditLog,
      ...evolutionReport.recentChanges.map((change) => ({ auditRef: change.auditRef }))
    ];
    const validationInput = {
      selfModelConsistency: scan.consistency,
      validationResults: validated.map((v) => ({
        compliant: v.validation && v.validation.constraintCheck
          ? v.validation.constraintCheck.compliant
          : false
      })),
      changes: evolutionReport.recentChanges,
      auditEntries: traceAuditEntries,
      performanceRegressionPct: this._maxPerformanceImpact(evolutionReport.recentChanges),
      highImpact: pendingHuman.length > 0
    };
    const introspective = this.validation.runIntrospectiveValidation(validationInput);

    const record = {
      cycleId,
      timestamp: Date.now(),
      scan,
      reflection,
      proposalBatch,
      registeredCount: registered.registeredCount,
      validated,
      implemented,
      pendingHuman,
      learningOptimization,
      memoryOptimization,
      introspective,
      evolutionReport
    };

    this.cycleLog.push(record);
    if (this.cycleLog.length > this.maxLogSize) {
      this.cycleLog.shift();
    }

    return record;
  }

  getCompletionCriteriaStatus() {
    const evolutionStats = this.evolution.getEvolutionReport().stats;
    const awarenessStatus = this.awareness.getAwarenessStatus();
    const validationStatus = this.validation.getValidationStatus();
    const metaLearningStatus = this.metaLearning.getMetaLearningStatus();

    const stabilityScore = this._stabilityScore(
      awarenessStatus.reflections.map((r) => r.signals.decisionOscillationScore)
    );
    const maxPerformanceImpact = this._maxPerformanceImpact(
      this.evolution.getEvolutionReport().recentChanges
    );

    const criteria = {
      selfModelAccuracy: (awarenessStatus.lastConsistency || 0) >= 0.99,
      architecturalChangeSuccessRate: (evolutionStats.changeSuccessRate || 0) >= 0.95,
      architecturalImprovementDemonstrated: (evolutionStats.architecturalImprovementPct || 0) >= 15,
      constitutionalCompliance: (evolutionStats.constitutionalComplianceRate || 0) >= 1,
      metaLearningEffectiveness: (metaLearningStatus.improvementPer100Cycles || 0) >= 0.1,
      performancePreservation: maxPerformanceImpact <= 10,
      reversibility: (evolutionStats.reversibleCoverage || 0) >= 1,
      rollbackMTTR: (evolutionStats.meanRollbackSeconds == null) || evolutionStats.meanRollbackSeconds <= 30,
      auditability: validationStatus.auditIntegrity === true,
      stability: stabilityScore <= 0.2
    };

    return {
      criteria,
      complete: Object.values(criteria).every(Boolean),
      metrics: {
        lastConsistency: awarenessStatus.lastConsistency || 0,
        changeSuccessRate: evolutionStats.changeSuccessRate || 0,
        constitutionalComplianceRate: evolutionStats.constitutionalComplianceRate || 0,
        architecturalImprovementPct: evolutionStats.architecturalImprovementPct || 0,
        improvementPer100Cycles: metaLearningStatus.improvementPer100Cycles || 0,
        maxPerformanceImpact,
        meanRollbackSeconds: evolutionStats.meanRollbackSeconds,
        stabilityScore
      }
    };
  }

  getOrchestratorStatus() {
    return {
      cycles: this.cycleLog.length,
      awareness: this.awareness.getAwarenessStatus(),
      evolution: this.evolution.getEvolutionReport(),
      metaLearning: this.metaLearning.getMetaLearningStatus(),
      validation: this.validation.getValidationStatus(),
      completion: this.getCompletionCriteriaStatus(),
      recentCycles: this.cycleLog.slice(-5)
    };
  }

  _maxPerformanceImpact(changes = []) {
    if (!Array.isArray(changes) || changes.length === 0) return 0;
    let max = 0;
    for (const change of changes) {
      const impact = Number(change.performanceImpactPct || 0);
      if (Number.isFinite(impact) && impact > max) {
        max = impact;
      }
    }
    return Number(max.toFixed(4));
  }

  _stabilityScore(values = []) {
    if (!Array.isArray(values) || values.length === 0) return 0;
    const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Number(avg.toFixed(4));
  }
}

export default {
  SelfArchitectureOrchestrator
};
