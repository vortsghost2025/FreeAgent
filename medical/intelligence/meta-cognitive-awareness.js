/**
 * Phase 8.1: Meta-Cognitive Awareness
 * Maintains self-architecture models, reflects on cognition, and proposes deterministic changes.
 */

export class SelfArchitectureModel {
  constructor() {
    this.components = new Map();
    this.interfaces = new Map();
    this.invariants = new Set();
    this.designPrinciples = new Set();
    this.lastUpdatedAt = null;
  }

  ingestSnapshot(snapshot = {}) {
    this.components.clear();
    this.interfaces.clear();
    this.invariants.clear();

    for (const component of snapshot.components || []) {
      const id = typeof component === 'string' ? component : component.componentId;
      if (!id) continue;
      this.components.set(id, typeof component === 'string' ? { componentId: id } : { ...component });
    }

    for (const iface of snapshot.interfaces || []) {
      const id = typeof iface === 'string' ? iface : iface.interfaceId;
      if (!id) continue;
      this.interfaces.set(id, typeof iface === 'string' ? { interfaceId: id } : { ...iface });
    }

    for (const invariant of snapshot.invariants || []) {
      if (typeof invariant === 'string' && invariant.length > 0) {
        this.invariants.add(invariant);
      }
    }

    if (Array.isArray(snapshot.designPrinciples)) {
      this.updateDesignPrinciples(snapshot.designPrinciples);
    }

    this.lastUpdatedAt = Date.now();
    return {
      success: true,
      componentCount: this.components.size,
      interfaceCount: this.interfaces.size,
      invariantCount: this.invariants.size
    };
  }

  updateDesignPrinciples(principles = []) {
    this.designPrinciples = new Set(principles.filter((p) => typeof p === 'string' && p.length > 0));
    return { success: true, designPrinciples: Array.from(this.designPrinciples) };
  }

  computeConsistency(externalInspection = {}) {
    const componentScore = this._overlapScore(this.components, externalInspection.components || [], 'componentId');
    const interfaceScore = this._overlapScore(this.interfaces, externalInspection.interfaces || [], 'interfaceId');
    const invariantScore = this._setOverlapScore(this.invariants, externalInspection.invariants || []);

    const consistency = Number(((componentScore + interfaceScore + invariantScore) / 3).toFixed(4));
    return {
      consistency,
      byCategory: {
        components: componentScore,
        interfaces: interfaceScore,
        invariants: invariantScore
      }
    };
  }

  getModel() {
    return {
      components: Array.from(this.components.values()),
      interfaces: Array.from(this.interfaces.values()),
      invariants: Array.from(this.invariants.values()),
      designPrinciples: Array.from(this.designPrinciples.values()),
      lastUpdatedAt: this.lastUpdatedAt
    };
  }

  _overlapScore(internalMap, externalItems, key) {
    if (!Array.isArray(externalItems) || externalItems.length === 0) {
      return 1;
    }
    let matches = 0;
    for (const item of externalItems) {
      const id = typeof item === 'string' ? item : item[key];
      if (id && internalMap.has(id)) {
        matches += 1;
      }
    }
    return Number((matches / externalItems.length).toFixed(4));
  }

  _setOverlapScore(internalSet, externalValues) {
    if (!Array.isArray(externalValues) || externalValues.length === 0) {
      return 1;
    }
    let matches = 0;
    for (const value of externalValues) {
      if (internalSet.has(value)) {
        matches += 1;
      }
    }
    return Number((matches / externalValues.length).toFixed(4));
  }
}

export class ArchitecturalReasoner {
  constructor(options = {}) {
    this.maxProposalsPerCycle = options.maxProposalsPerCycle || 5;
    this.sequence = 0;
  }

  proposeChanges(modelSummary = {}, reflectionSignals = {}) {
    const proposals = [];
    const consistency = modelSummary.consistency == null ? 1 : modelSummary.consistency;

    if (consistency < 0.99) {
      proposals.push(this._proposal(
        'MODEL_SYNCHRONIZATION',
        'architecture-model',
        'Synchronize internal model with observed architecture state',
        0.14,
        2.5
      ));
    }

    if ((reflectionSignals.decisionOscillationScore || 0) > 0.2) {
      proposals.push(this._proposal(
        'DECISION_PIPELINE_STABILIZATION',
        'governance-pipeline',
        'Reduce decision oscillation with stricter convergence windows',
        0.28,
        4.0
      ));
    }

    if ((reflectionSignals.validationBacklog || 0) > 0) {
      proposals.push(this._proposal(
        'VALIDATION_PARALLELIZATION',
        'validation-engine',
        'Parallelize validation flow to remove architectural backlog',
        0.22,
        3.6
      ));
    }

    if ((reflectionSignals.traceabilityCoverage ?? 1) < 1) {
      proposals.push(this._proposal(
        'AUDIT_CHAIN_HARDENING',
        'audit-ledger',
        'Close traceability gaps and enforce complete audit linkage',
        0.12,
        1.4
      ));
    }

    if ((reflectionSignals.learningEfficiencyTrend || 0) < 0) {
      proposals.push(this._proposal(
        'META_LEARNING_TUNING',
        'meta-learning',
        'Retune learning controls to recover optimization efficiency',
        0.2,
        2.8
      ));
    }

    if (proposals.length === 0) {
      proposals.push(this._proposal(
        'ARCHITECTURE_HYGIENE_SWEEP',
        'system-foundation',
        'Perform low-risk architecture hygiene and documentation cleanup',
        0.08,
        0.9
      ));
    }

    return proposals.slice(0, this.maxProposalsPerCycle);
  }

  estimatePerformanceImpact(proposal, context = {}) {
    const base = proposal.estimatedPerformanceImpactPct || 0;
    const loadFactor = (context.currentLoadPct || 50) > 80 ? 1.2 : 1;
    return Number((base * loadFactor).toFixed(3));
  }

  _proposal(type, target, summary, riskScore, impactPct) {
    this.sequence += 1;
    return {
      proposalId: `self-arch-proposal-${Date.now()}-${this.sequence}`,
      type,
      target,
      summary,
      riskScore: Number(Math.max(0, Math.min(1, riskScore)).toFixed(3)),
      reversible: true,
      estimatedPerformanceImpactPct: Number(Math.max(0, impactPct).toFixed(3)),
      createdAt: Date.now()
    };
  }
}

export class MetaCognitiveAwarenessEngine {
  constructor(options = {}) {
    this.model = options.model || new SelfArchitectureModel(options);
    this.reasoner = options.reasoner || new ArchitecturalReasoner(options);
    this.reflectionLog = [];
    this.scanLog = [];
    this.maxLogSize = options.maxLogSize || 5000;
    this.lastConsistency = 1;
  }

  scanArchitecture(snapshot = {}, externalInspection = {}) {
    const ingest = this.model.ingestSnapshot(snapshot);
    const consistency = this.model.computeConsistency(externalInspection);
    this.lastConsistency = consistency.consistency;

    const record = {
      type: 'SCAN',
      timestamp: Date.now(),
      ingest,
      consistency
    };
    this._pushLog(this.scanLog, record);

    return {
      success: true,
      consistency: consistency.consistency,
      byCategory: consistency.byCategory,
      model: this.model.getModel()
    };
  }

  reflectOnCognition(cycleTelemetry = {}) {
    const decisions = cycleTelemetry.decisions || [];
    const signals = {
      decisionOscillationScore: this._oscillationScore(decisions),
      validationBacklog: Math.max(0, Number(cycleTelemetry.validationBacklog || 0)),
      traceabilityCoverage: this._boundedNumber(cycleTelemetry.traceabilityCoverage, 1, 0, 1),
      learningEfficiencyTrend: Number(cycleTelemetry.learningEfficiencyTrend || 0)
    };

    const record = {
      type: 'REFLECTION',
      timestamp: Date.now(),
      signals
    };
    this._pushLog(this.reflectionLog, record);
    return signals;
  }

  proposeSelfArchitectureChanges(objectives = {}) {
    const latestReflection = this.reflectionLog.length > 0
      ? this.reflectionLog[this.reflectionLog.length - 1].signals
      : {
          decisionOscillationScore: 0,
          validationBacklog: 0,
          traceabilityCoverage: 1,
          learningEfficiencyTrend: 0
        };

    const proposals = this.reasoner.proposeChanges({
      consistency: this.lastConsistency,
      model: this.model.getModel(),
      objectives
    }, latestReflection);

    return {
      success: true,
      proposalCount: proposals.length,
      proposals
    };
  }

  getAwarenessStatus() {
    return {
      lastConsistency: this.lastConsistency,
      scans: this.scanLog.slice(-5),
      reflections: this.reflectionLog.slice(-5),
      model: this.model.getModel()
    };
  }

  _pushLog(log, record) {
    log.push(record);
    if (log.length > this.maxLogSize) {
      log.shift();
    }
  }

  _oscillationScore(decisions = []) {
    if (!Array.isArray(decisions) || decisions.length < 2) {
      return 0;
    }
    let transitions = 0;
    for (let i = 1; i < decisions.length; i += 1) {
      if (decisions[i] !== decisions[i - 1]) {
        transitions += 1;
      }
    }
    return Number((transitions / (decisions.length - 1)).toFixed(4));
  }

  _boundedNumber(value, fallback, min, max) {
    if (value == null) return fallback;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(min, Math.min(max, numeric));
  }
}

export default {
  SelfArchitectureModel,
  ArchitecturalReasoner,
  MetaCognitiveAwarenessEngine
};

