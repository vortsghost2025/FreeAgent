/**
 * Pattern Abstraction Layer
 * Translates domain-specific metrics to universal patterns
 * Detects patterns that can be shared across agent types
 */

import { CycleResult, AGENT_TYPE } from './universal-agent-interface.js';

/**
 * ABSTRACT PATTERN
 * Agent-agnostic pattern for cross-domain learning
 */
export class AbstractPattern {
  constructor(name, description = '') {
    this.name = name;                      // e.g., 'high_instability_risk'
    this.description = description;         // Human-readable explanation
    this.discovered_at_cycle = null;        // Which cycle discovered it
    this.discovered_by_agent_type = null;   // Which type (PHASE9, SERVICE, etc.)
    this.confidence = 0;                    // 0-1 (frequency observed)
    this.affected_agent_types = [];         // Which types this applies to
    this.recommendation = null;             // What action to take
    this.severity = 'MEDIUM';               // CRITICAL, HIGH, MEDIUM, LOW
  }

  toJSON() {
    return Object.freeze({
      name: this.name,
      description: this.description,
      confidence: this.confidence,
      severity: this.severity,
      affected_agent_types: this.affected_agent_types,
      recommendation: this.recommendation
    });
  }
}

/**
 * PATTERN RULE
 * Rule for detecting a pattern from cycle results
 */
export class PatternRule {
  constructor(checkFn, pattern) {
    this.checkFn = checkFn;  // Function: (cycleResult) → boolean
    this.pattern = pattern;  // AbstractPattern instance
  }

  check(cycleResult) {
    try {
      return this.checkFn(cycleResult) === true;
    } catch (e) {
      return false;
    }
  }
}

/**
 * PATTERN TRANSLATOR
 * Per-agent-type: converts native metrics → universal metrics + detects patterns
 */
export class PatternTranslator {
  constructor(agentType) {
    if (!Object.values(AGENT_TYPE).includes(agentType)) {
      throw new Error(`Invalid agent type: ${agentType}`);
    }

    this.agentType = agentType;
    this.sourceMetricMap = {};     // {domainPath: universalMetric}
    this.patternRules = [];        // PatternRule[] for pattern detection
  }

  /**
   * Translate native cycle result → normalized CycleResult
   */
  translateCycleResult(nativeResult) {
    if (!nativeResult || !nativeResult.cycleId) {
      throw new Error('Native result must have cycleId');
    }

    const normalized = new CycleResult(nativeResult.cycleId, this.agentType);

    // Translate domain-specific metrics to universal equivalents
    for (const [domainPath, universalMetric] of Object.entries(this.sourceMetricMap)) {
      const value = this.extractMetric(nativeResult, domainPath);
      if (value !== null && value !== undefined) {
        normalized[universalMetric] = value;
      }
    }

    // Preserve domain metrics with agent-type-specific filtering
    normalized.addDomainMetrics(this.extractDomainMetrics(nativeResult));

    // Mark as completed (override if needed)
    if (nativeResult.cycle_status === 'FAILED') {
      normalized.markFailed(nativeResult.error_message);
    } else {
      normalized.markCompleted();
    }

    return normalized;
  }

  /**
   * Detect patterns from native cycle result
   */
  detectPatterns(nativeResult) {
    const patterns = [];

    for (const rule of this.patternRules) {
      if (rule.check(nativeResult)) {
        patterns.push(rule.pattern);
      }
    }

    return patterns;
  }

  /**
   * Extract metric from nested object path
   * Examples: 'phase_8.improvement', 'domain_metrics.latency_ms'
   */
  extractMetric(obj, path) {
    if (!path) return null;

    const parts = path.split('.');
    let value = obj;

    for (const part of parts) {
      if (value == null) return null;
      value = value[part];
    }

    return value;
  }

  /**
   * Extract domain-specific metrics to preserve
   * Subclasses override to filter what gets preserved
   */
  extractDomainMetrics(nativeResult) {
    return nativeResult.domain_metrics || {};
  }

  /**
   * Register a pattern rule
   */
  addPatternRule(checkFn, pattern) {
    this.patternRules.push(new PatternRule(checkFn, pattern));
  }
}

/**
 * PHASE9 PATTERN TRANSLATOR
 * Translates Phase 9 orchestrator results to universal metrics
 */
export class Phase9PatternTranslator extends PatternTranslator {
  constructor() {
    super(AGENT_TYPE.PHASE9);

    // Map Phase 9 metrics to universal ones
    this.sourceMetricMap = {
      'phase_8.improvement': 'primary_objective_delta',
      'phase_9.stability': 'stability_score',
      'phase_b.mttr_prediction': 'execution_confidence',  // Inverted: low MTTR = high confidence
      'phase_9.watchdog_violations': 'constraint_violations_count'
    };

    // Phase 9 specific patterns
    this.addPatternRule(
      (result) => {
        const improvement = result.phase_8?.improvement || 0;
        const stability = result.phase_9?.stability || 1;
        return improvement > 30 && stability < 0.7;
      },
      new AbstractPattern(
        'high_improvement_low_stability',
        'Rapid improvements are creating instability'
      )
    );

    this.addPatternRule(
      (result) => {
        const violations = result.phase_9?.watchdog_violations || 0;
        return violations > 0;
      },
      new AbstractPattern(
        'watchdog_triggered',
        'Strategic drift detected by watchdog rules'
      )
    );

    this.addPatternRule(
      (result) => {
        const rolling = result.phase_c?.rolling_improvement || [];
        const hasOscillation = rolling.length >= 2 &&
          (rolling[0] * rolling[1] < 0);  // Alternating signs
        return hasOscillation;
      },
      new AbstractPattern(
        'oscillating_improvements',
        'Improvements alternating between positive and negative'
      )
    );
  }

  extractMetric(obj, path) {
    let value = super.extractMetric(obj, path);

    // Convert MTTR prediction to confidence (inverse relationship)
    if (path === 'phase_b.mttr_prediction' && typeof value === 'number') {
      // Lower MTTR = higher confidence (capped at 1.0)
      // Assume >30s MTTR = 0 confidence, <5s = 1.0 confidence
      const normalized = Math.max(0, Math.min(1, (30 - value) / 25));
      return normalized;
    }

    return value;
  }

  extractDomainMetrics(nativeResult) {
    return {
      improvement: nativeResult.phase_8?.improvement,
      watchdog_violations: nativeResult.phase_9?.watchdog_violations,
      strategy_selected: nativeResult.phase_9?.strategy_selected,
      intent_alignment: nativeResult.phase_9?.intent_alignment,
      governance_assessment: nativeResult.phase_e?.governance_assessment
    };
  }
}

/**
 * SERVICE PATTERN TRANSLATOR
 * Translates service/API metric results to universal metrics
 */
export class ServicePatternTranslator extends PatternTranslator {
  constructor() {
    super(AGENT_TYPE.SERVICE);

    // Map service metrics to universal
    this.sourceMetricMap = {
      'domain_metrics.p99_latency_ms': 'primary_objective_delta',  // Lower = more negative (improving)
      'domain_metrics.error_rate': 'stability_score',              // 1 - error_rate
      'domain_metrics.sla_breaches': 'constraint_violations_count'
    };

    // Service-specific patterns
    this.addPatternRule(
      (result) => {
        const latency = result.domain_metrics?.p99_latency_ms || 0;
        const errors = result.domain_metrics?.error_rate || 0;
        return latency > 1000 && errors > 0.05;  // Both high latency AND high errors
      },
      new AbstractPattern(
        'service_degradation',
        'Both latency and error rates elevated simultaneously'
      )
    );

    this.addPatternRule(
      (result) => {
        const breaches = result.domain_metrics?.sla_breaches || 0;
        return breaches > 0;
      },
      new AbstractPattern(
        'sla_breach_detected',
        'Service violated SLA thresholds'
      )
    );

    this.addPatternRule(
      (result) => {
        const throughput = result.domain_metrics?.throughput_ops_sec || 0;
        const latency = result.domain_metrics?.p99_latency_ms || 0;
        // Throughput spike + latency increase = potential bottleneck
        return throughput > 1000 && latency > 500;
      },
      new AbstractPattern(
        'throughput_latency_tradeoff',
        'High throughput correlating with increased latency'
      )
    );
  }

  extractMetric(obj, path) {
    let value = super.extractMetric(obj, path);

    // SERVICE: Latency improvements are negative deltas
    if (path === 'domain_metrics.p99_latency_ms') {
      return -value;  // Flip: lower latency = negative delta = improving
    }

    // Convert error rate to stability score
    if (path === 'domain_metrics.error_rate' && typeof value === 'number') {
      return Math.max(0, 1 - value);  // 1 - error_rate
    }

    return value;
  }

  extractDomainMetrics(nativeResult) {
    return {
      p99_latency_ms: nativeResult.domain_metrics?.p99_latency_ms,
      error_rate: nativeResult.domain_metrics?.error_rate,
      sla_breaches: nativeResult.domain_metrics?.sla_breaches,
      throughput_ops_sec: nativeResult.domain_metrics?.throughput_ops_sec,
      concurrent_connections: nativeResult.domain_metrics?.concurrent_connections
    };
  }
}

/**
 * ML_TRAINER PATTERN TRANSLATOR
 * Translates ML training job results to universal metrics
 */
export class MLTrainerPatternTranslator extends PatternTranslator {
  constructor() {
    super(AGENT_TYPE.ML_TRAINER);

    // Map ML metrics to universal
    this.sourceMetricMap = {
      'domain_metrics.loss_delta': 'primary_objective_delta',
      'domain_metrics.val_accuracy': 'stability_score',
      'domain_metrics.divergence_detected': 'constraint_violations_count'
    };

    // ML-specific patterns
    this.addPatternRule(
      (result) => {
        const lossDelta = result.domain_metrics?.loss_delta || 0;
        const accuracy = result.domain_metrics?.val_accuracy || 0;
        // Loss decreasing but accuracy not improving = overfitting
        return lossDelta > 0.05 && accuracy < 0.5;
      },
      new AbstractPattern(
        'potential_overfitting',
        'Training loss improving but validation accuracy flat'
      )
    );

    this.addPatternRule(
      (result) => {
        const divergence = result.domain_metrics?.divergence_detected || false;
        return divergence === true;
      },
      new AbstractPattern(
        'training_divergence',
        'Model training diverging (loss increasing)'
      )
    );
  }

  extractMetric(obj, path) {
    return super.extractMetric(obj, path);
  }

  extractDomainMetrics(nativeResult) {
    return {
      loss_delta: nativeResult.domain_metrics?.loss_delta,
      val_accuracy: nativeResult.domain_metrics?.val_accuracy,
      divergence_detected: nativeResult.domain_metrics?.divergence_detected,
      learning_rate: nativeResult.domain_metrics?.learning_rate,
      iterations_run: nativeResult.domain_metrics?.iterations_run
    };
  }
}

/**
 * DATA_PIPELINE PATTERN TRANSLATOR
 * Translates data pipeline job results to universal metrics
 */
export class DataPipelinePatternTranslator extends PatternTranslator {
  constructor() {
    super(AGENT_TYPE.DATA_PIPELINE);

    // Map pipeline metrics to universal
    this.sourceMetricMap = {
      'domain_metrics.throughput_delta': 'primary_objective_delta',
      'domain_metrics.latency_p99_ratio': 'stability_score', // ratio to SLA
      'domain_metrics.backpressure_events': 'constraint_violations_count'
    };

    // Pipeline-specific patterns
    this.addPatternRule(
      (result) => {
        const delayEvents = result.domain_metrics?.backpressure_events || 0;
        return delayEvents > 0;
      },
      new AbstractPattern(
        'pipeline_backpressure',
        'Data pipeline experiencing queue buildup/backpressure'
      )
    );

    this.addPatternRule(
      (result) => {
        const throughput = result.domain_metrics?.throughput_delta || 0;
        const latency = result.domain_metrics?.latency_p99_ratio || 1;
        // Throughput decreasing AND latency increasing = health degradation
        return throughput < 0 && latency > 1.1;
      },
      new AbstractPattern(
        'pipeline_degradation',
        'Both throughput decreasing and latency increasing'
      )
    );
  }

  extractDomainMetrics(nativeResult) {
    return {
      throughput_delta: nativeResult.domain_metrics?.throughput_delta,
      latency_p99_ratio: nativeResult.domain_metrics?.latency_p99_ratio,
      backpressure_events: nativeResult.domain_metrics?.backpressure_events,
      batches_processed: nativeResult.domain_metrics?.batches_processed,
      queue_depth: nativeResult.domain_metrics?.queue_depth
    };
  }
}

export default {
  AbstractPattern,
  PatternRule,
  PatternTranslator,
  Phase9PatternTranslator,
  ServicePatternTranslator,
  MLTrainerPatternTranslator,
  DataPipelinePatternTranslator
};
