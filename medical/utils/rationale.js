/**
 * RATIONALE GENERATOR
 * Generates human-readable explanations for classifications
 */

/**
 * Generate rationale for classification decision
 * @param {Object} classification - Classification result
 * @param {Object} summary - Summary with extracted fields
 * @returns {Object} - Rationale with explanation
 */
export function generateRationale(classification, summary) {
  const { type, confidence, indicators, flags } = classification;

  // Build rationale based on classification type
  const rationale = {
    decision: `Classified as: ${type.toUpperCase()}`,
    confidence: `Confidence Level: ${(confidence * 100).toFixed(0)}%`,
    reasoning: _buildReasoning(type, indicators, summary),
    keyFeatures: _extractKeyFeatures(indicators),
    warnings: flags.length > 0 ? _formatWarnings(flags) : null,
    humanReadable: null // Will be generated last
  };

  // Generate human-readable summary
  rationale.humanReadable = _generateHumanSummary(rationale);

  return rationale;
}

/**
 * Build reasoning explanation
 * @private
 */
function _buildReasoning(type, indicators, summary) {
  const reasoning = [];

  // Main classification reason
  const keywordCount = indicators.filter(i => i.startsWith('keyword:')).length;
  const structureCount = indicators.filter(i => i.startsWith('structure:')).length;

  if (keywordCount > 0) {
    reasoning.push(`Found ${keywordCount} relevant keyword${keywordCount > 1 ? 's' : ''} matching ${type} pattern`);
  }

  if (structureCount > 0) {
    reasoning.push(`Detected ${structureCount} structural hint${structureCount > 1 ? 's' : ''} indicating ${type} data format`);
  }

  // Add type-specific reasoning
  const typeSpecificReason = _getTypeSpecificReasoning(type, summary);
  if (typeSpecificReason) {
    reasoning.push(typeSpecificReason);
  }

  return reasoning;
}

/**
 * Get type-specific reasoning
 * @private
 */
function _getTypeSpecificReasoning(type, summary) {
  const fields = summary?.fields || {};

  switch (type) {
    case 'symptoms':
      if (fields.reportedItems && fields.reportedItems.length > 0) {
        return `Patient reported ${fields.reportedItems.length} symptom${fields.reportedItems.length > 1 ? 's' : ''}`;
      }
      break;

    case 'labs':
      if (fields.testName) {
        return `Laboratory test identified: ${fields.testName}`;
      }
      if (fields.results && fields.results.length > 0) {
        return `Contains ${fields.results.length} lab result${fields.results.length > 1 ? 's' : ''}`;
      }
      break;

    case 'imaging':
      if (fields.studyType) {
        return `Imaging study type: ${fields.studyType}`;
      }
      if (fields.modality) {
        return `Modality detected: ${fields.modality}`;
      }
      break;

    case 'vitals':
      if (fields.measurements && fields.measurements.length > 0) {
        return `Contains ${fields.measurements.length} vital sign measurement${fields.measurements.length > 1 ? 's' : ''}`;
      }
      break;

    case 'notes':
      if (fields.noteType) {
        return `Clinical note type: ${fields.noteType}`;
      }
      break;

    case 'other':
      return 'Could not confidently classify into a specific medical data type';

    default:
      return null;
  }

  return null;
}

/**
 * Extract key features that influenced decision
 * @private
 */
function _extractKeyFeatures(indicators) {
  const features = [];

  // Group indicators by type
  const keywords = indicators
    .filter(i => i.startsWith('keyword:'))
    .map(i => i.replace('keyword:', ''))
    .slice(0, 5); // Top 5

  const structures = indicators
    .filter(i => i.startsWith('structure:'))
    .map(i => i.replace('structure:', ''))
    .slice(0, 5); // Top 5

  if (keywords.length > 0) {
    features.push({
      type: 'keywords',
      values: keywords,
      description: `Key medical terms found: ${keywords.join(', ')}`
    });
  }

  if (structures.length > 0) {
    features.push({
      type: 'structure',
      values: structures,
      description: `Structured fields detected: ${structures.join(', ')}`
    });
  }

  return features;
}

/**
 * Format warnings
 * @private
 */
function _formatWarnings(flags) {
  return flags.map(flag => ({
    warning: flag,
    impact: _getWarningImpact(flag)
  }));
}

/**
 * Get warning impact description
 * @private
 */
function _getWarningImpact(flag) {
  if (flag === 'low_confidence_classification') {
    return 'Classification may be unreliable - consider manual review';
  }
  return 'May affect classification accuracy';
}

/**
 * Generate human-readable summary
 * @private
 */
function _generateHumanSummary(rationale) {
  const parts = [];

  // Decision
  parts.push(rationale.decision);

  // Confidence
  const confidenceNum = parseFloat(rationale.confidence.match(/\d+/)[0]);
  if (confidenceNum >= 70) {
    parts.push(`This classification is highly confident (${rationale.confidence.match(/\d+/)[0]}%).`);
  } else if (confidenceNum >= 50) {
    parts.push(`This classification is moderately confident (${rationale.confidence.match(/\d+/)[0]}%).`);
  } else {
    parts.push(`This classification has lower confidence (${rationale.confidence.match(/\d+/)[0]}%) and should be reviewed.`);
  }

  // Reasoning
  if (rationale.reasoning.length > 0) {
    parts.push(`\nReasoning: ${rationale.reasoning.join('; ')}.`);
  }

  // Key features
  if (rationale.keyFeatures.length > 0) {
    parts.push(`\nKey indicators: ${rationale.keyFeatures.map(f => f.description).join('; ')}.`);
  }

  // Warnings
  if (rationale.warnings && rationale.warnings.length > 0) {
    parts.push(`\n⚠️ Warnings: ${rationale.warnings.map(w => w.impact).join('; ')}.`);
  }

  return parts.join(' ');
}

/**
 * Create a simplified rationale (one-liner)
 */
export function generateSimpleRationale(classification) {
  const { type, confidence, indicators } = classification;

  const keywordCount = indicators.filter(i => i.startsWith('keyword:')).length;
  const structureCount = indicators.filter(i => i.startsWith('structure:')).length;

  return `Classified as ${type} with ${(confidence * 100).toFixed(0)}% confidence based on ${keywordCount} keyword matches and ${structureCount} structural hints.`;
}
