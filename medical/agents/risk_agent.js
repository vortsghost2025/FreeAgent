/**
 * RISK AGENT
 * Role: Perform structural risk scoring (placeholder rules only)
 *
 * STRUCTURAL ONLY - No medical risk assessment or clinical judgment
 * All scoring rules are PLACEHOLDERS for user to define
 */

class RiskAgent {
  constructor(agentId) {
    this.agentId = agentId;
    this.role = 'RISK';
  }

  /**
   * Process task: apply structural risk scoring
   * @param {Object} task - Task with summary data
   * @param {Object} state - Current workflow state
   * @returns {Object} - {task, state} with risk scores
   */
  async run(task, state) {
    console.log(`[${this.agentId}] Applying structural risk scoring...`);

    // Apply structural risk scoring (no clinical judgment)
    const riskScore = this._calculateRiskScore(task.summary, task.classification, task);

    return {
      task: {
        ...task,
        riskScore
      },
      state: {
        ...state,
        riskScoringComplete: true,
        processedBy: [...(state.processedBy || []), this.agentId]
      }
    };
  }

  /**
   * Calculate structural risk score (NO CLINICAL JUDGMENT)
   * @private
   */
  _calculateRiskScore(summary, classification, task) {
    const factors = [];
    const flags = [];

    // Define severity weights
    const severityWeights = {
      high: 0.5,
      medium: 0.3,
      low: 0.1
    };

    // Check each risk factor
    this._checkMissingRequiredFields(summary, classification.type, factors, flags);
    this._checkTimestampValid(task, factors, flags);
    this._checkLowConfidenceClassification(classification, factors, flags);
    this._checkPartialExtraction(summary, factors, flags);
    this._checkLargePayload(task, factors, flags);
    this._checkMissingSource(task, factors, flags);
    this._checkSensitiveData(task, factors, flags);

    // Calculate overall risk score
    let totalScore = 0;
    for (const flag of flags) {
      totalScore += severityWeights[flag.severity] || 0;
    }

    // Normalize to 0-1 range
    const score = Math.min(totalScore, 1.0);

    return {
      score: Math.round(score * 100) / 100,
      factors,
      flags,
      scoringMethod: 'rule-based',
      confidence: 1.0 // Rule-based scoring is deterministic
    };
  }

  /**
   * Check for missing required fields
   * @private
   */
  _checkMissingRequiredFields(summary, type, factors, flags) {
    const requiredFieldsByType = {
      symptoms: ['reportedItems', 'severity'],
      notes: ['noteType', 'chiefComplaint'],
      labs: ['testName', 'results'],
      imaging: ['studyType', 'impression'],
      vitals: ['measurements'],
      other: []
    };

    const required = requiredFieldsByType[type] || [];
    const missing = [];

    for (const field of required) {
      const value = summary.fields?.[field];
      if (value === null || value === undefined || (Array.isArray(value) && value.length === 0)) {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      factors.push({
        factor: 'missing_required_fields',
        weight: 0.5,
        description: `Missing required fields: ${missing.join(', ')}`
      });
      flags.push({
        flag: 'missing_required_fields',
        severity: 'high',
        reason: `Required fields missing for type '${type}': ${missing.join(', ')}`
      });
    }
  }

  /**
   * Check timestamp validity
   * @private
   */
  _checkTimestampValid(task, factors, flags) {
    const timestamp = task.data?.timestamp;

    if (!timestamp) {
      factors.push({
        factor: 'timestamp_missing_or_invalid',
        weight: 0.5,
        description: 'Timestamp is missing'
      });
      flags.push({
        flag: 'timestamp_missing_or_invalid',
        severity: 'high',
        reason: 'No timestamp found in data'
      });
      return;
    }

    // Validate ISO8601 format
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
    if (!iso8601Regex.test(timestamp)) {
      factors.push({
        factor: 'timestamp_missing_or_invalid',
        weight: 0.5,
        description: 'Timestamp is not in ISO8601 format'
      });
      flags.push({
        flag: 'timestamp_missing_or_invalid',
        severity: 'high',
        reason: `Timestamp '${timestamp}' is not ISO8601 format`
      });
    }
  }

  /**
   * Check classification confidence
   * @private
   */
  _checkLowConfidenceClassification(classification, factors, flags) {
    const threshold = 0.3;

    if (classification.confidence < threshold) {
      factors.push({
        factor: 'low_confidence_classification',
        weight: 0.3,
        description: `Classification confidence ${classification.confidence} below threshold ${threshold}`
      });
      flags.push({
        flag: 'low_confidence_classification',
        severity: 'medium',
        reason: `Classification confidence (${classification.confidence}) is below threshold`
      });
    }
  }

  /**
   * Check extraction completeness
   * @private
   */
  _checkPartialExtraction(summary, factors, flags) {
    const threshold = 0.6;

    if (summary.completeness < threshold) {
      factors.push({
        factor: 'partial_extraction',
        weight: 0.3,
        description: `Completeness ${summary.completeness} below threshold ${threshold}`
      });
      flags.push({
        flag: 'partial_extraction',
        severity: 'medium',
        reason: `Only ${Math.round(summary.completeness * 100)}% of required fields extracted`
      });
    }
  }

  /**
   * Check payload size
   * @private
   */
  _checkLargePayload(task, factors, flags) {
    const threshold = 100000; // 100KB
    const size = task.data?.structure?.estimatedLength || 0;

    if (size > threshold) {
      factors.push({
        factor: 'large_payload',
        weight: 0.1,
        description: `Payload size ${size} exceeds threshold ${threshold}`
      });
      flags.push({
        flag: 'large_payload',
        severity: 'low',
        reason: `Payload size (${size} bytes) exceeds safe processing size`
      });
    }
  }

  /**
   * Check source metadata
   * @private
   */
  _checkMissingSource(task, factors, flags) {
    const source = task.data?.source;

    if (!source || source === 'unknown') {
      factors.push({
        factor: 'missing_source',
        weight: 0.1,
        description: 'Source metadata is missing or unknown'
      });
      flags.push({
        flag: 'missing_source',
        severity: 'low',
        reason: 'No source metadata provided'
      });
    }
  }

  /**
   * Check for sensitive data (basic PII detection)
   * @private
   */
  _checkSensitiveData(task, factors, flags) {
    const content = (task.data?.content || '').toLowerCase();

    // Basic PII patterns (structural detection only)
    const piiPatterns = [
      { pattern: /\b\d{3}-\d{2}-\d{4}\b/, name: 'SSN' },
      { pattern: /\b\d{16}\b/, name: 'Credit Card' },
      { pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, name: 'Email' }
    ];

    for (const { pattern, name } of piiPatterns) {
      if (pattern.test(content)) {
        factors.push({
          factor: 'sensitive_data_unredacted',
          weight: 0.5,
          description: `Possible ${name} detected in content`
        });
        flags.push({
          flag: 'sensitive_data_unredacted',
          severity: 'high',
          reason: `Possible PII (${name}) found in unredacted content`
        });
        break; // Only flag once
      }
    }
  }
}

// Export factory function
module.exports = {
  createRiskAgent: (agentId) => new RiskAgent(agentId)
};
