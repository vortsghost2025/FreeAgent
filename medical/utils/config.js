/**
 * SAFE DEFAULTS MODE
 * Conservative configuration for medical contexts
 * "I'm not sure" is safer than "I'm confident and wrong"
 */

/**
 * Safe Defaults Configuration
 */
export const SafeDefaults = {
  // Classification thresholds (more conservative)
  classificationThreshold: 0.5, // Default: 0.3, Safe: 0.5

  // Confidence thresholds
  minimumConfidence: 0.7, // Below this, mark for review
  highConfidenceThreshold: 0.85, // Only "high confidence" above this

  // Risk scoring thresholds (more sensitive)
  riskThresholds: {
    high: 0.4, // Default: 0.5, Safe: 0.4 (more sensitive)
    medium: 0.2 // Default: 0.3, Safe: 0.2
  },

  // Completeness requirements
  minimumCompleteness: 0.8, // Default: 0.6, Safe: 0.8

  // Fallback behavior
  fallbackToUnknown: true, // When uncertain, classify as 'other'
  requireHumanReview: true, // Flag everything for review by default

  // Strict validation
  strictValidation: true,
  rejectInvalidInputs: true,

  // Conservative timeouts
  agentTimeout: 5000, // 5 seconds max per agent
  pipelineTimeout: 30000 // 30 seconds max total
};

/**
 * Standard (Default) Configuration
 */
export const StandardConfig = {
  classificationThreshold: 0.3,
  minimumConfidence: 0.3,
  highConfidenceThreshold: 0.7,
  riskThresholds: {
    high: 0.5,
    medium: 0.3
  },
  minimumCompleteness: 0.6,
  fallbackToUnknown: false,
  requireHumanReview: false,
  strictValidation: false,
  rejectInvalidInputs: false,
  agentTimeout: 10000,
  pipelineTimeout: 60000
};

/**
 * Production Configuration (Balanced)
 */
export const ProductionConfig = {
  classificationThreshold: 0.4,
  minimumConfidence: 0.5,
  highConfidenceThreshold: 0.8,
  riskThresholds: {
    high: 0.45,
    medium: 0.25
  },
  minimumCompleteness: 0.7,
  fallbackToUnknown: false,
  requireHumanReview: true, // Always flag for review in production
  strictValidation: true,
  rejectInvalidInputs: false, // Log but don't reject
  agentTimeout: 8000,
  pipelineTimeout: 45000
};

/**
 * Configuration Manager
 */
export class ConfigManager {
  constructor(mode = 'standard') {
    this.setMode(mode);
  }

  /**
   * Set configuration mode
   * @param {string} mode - 'safe', 'standard', or 'production'
   */
  setMode(mode) {
    switch (mode.toLowerCase()) {
      case 'safe':
        this.config = { ...SafeDefaults };
        this.mode = 'safe';
        break;
      case 'production':
        this.config = { ...ProductionConfig };
        this.mode = 'production';
        break;
      case 'standard':
      default:
        this.config = { ...StandardConfig };
        this.mode = 'standard';
        break;
    }
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Get current mode
   */
  getMode() {
    return this.mode;
  }

  /**
   * Override specific config value
   */
  set(key, value) {
    this.config[key] = value;
  }

  /**
   * Check if classification meets threshold
   */
  meetsClassificationThreshold(confidence) {
    return confidence >= this.config.classificationThreshold;
  }

  /**
   * Check if requires human review
   */
  requiresHumanReview(classification, riskScore, summary) {
    // Always require review in safe mode
    if (this.config.requireHumanReview) {
      return true;
    }

    // Check confidence
    if (classification.confidence < this.config.minimumConfidence) {
      return true;
    }

    // Check risk
    if (riskScore.severity === 'high') {
      return true;
    }

    // Check completeness
    if (summary.completeness < this.config.minimumCompleteness) {
      return true;
    }

    return false;
  }

  /**
   * Apply safe defaults to classification
   */
  applySafeClassification(classification) {
    const adjusted = { ...classification };

    // If doesn't meet threshold, force to 'other'
    if (this.config.fallbackToUnknown &&
        !this.meetsClassificationThreshold(classification.confidence)) {
      adjusted.type = 'other';
      adjusted.route = 'default';
      adjusted.flags = [...(adjusted.flags || []), 'forced_fallback_safe_mode'];
      adjusted.originalType = classification.type;
      adjusted.originalConfidence = classification.confidence;
    }

    // Add confidence qualifier
    if (adjusted.confidence < this.config.minimumConfidence) {
      adjusted.confidenceQualifier = 'low - requires review';
    } else if (adjusted.confidence < this.config.highConfidenceThreshold) {
      adjusted.confidenceQualifier = 'moderate';
    } else {
      adjusted.confidenceQualifier = 'high';
    }

    return adjusted;
  }

  /**
   * Apply safe defaults to risk score
   */
  applySafeRiskScore(riskScore) {
    const adjusted = { ...riskScore };

    // More sensitive thresholds
    if (adjusted.score >= this.config.riskThresholds.high) {
      adjusted.severity = 'high';
    } else if (adjusted.score >= this.config.riskThresholds.medium) {
      adjusted.severity = 'medium';
    } else {
      adjusted.severity = 'low';
    }

    // Add safe mode flag
    if (this.mode === 'safe') {
      adjusted.safeMode = true;
      adjusted.conservativeAssessment = true;
    }

    return adjusted;
  }
}

/**
 * Create a config manager
 */
export function createConfigManager(mode = 'standard') {
  return new ConfigManager(mode);
}

/**
 * Global config instance (singleton)
 */
let globalConfig = null;

export function getGlobalConfig() {
  if (!globalConfig) {
    globalConfig = new ConfigManager('standard');
  }
  return globalConfig;
}

export function setGlobalConfigMode(mode) {
  getGlobalConfig().setMode(mode);
}

/**
 * Convenience exports for checking mode
 */
export function isSafeMode() {
  return getGlobalConfig().getMode() === 'safe';
}

export function isProductionMode() {
  return getGlobalConfig().getMode() === 'production';
}
