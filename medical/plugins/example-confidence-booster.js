/**
 * Example Plugin: Confidence Booster
 *
 * Demonstrates plugin architecture by adding a simple enhancement:
 * Boosts classification confidence for high-quality structured data.
 *
 * This plugin shows:
 * - Hook registration (post-triage)
 * - Data modification
 * - Rule-based logic
 * - Metadata structure
 */

export default {
  metadata: {
    name: 'confidence-booster',
    version: '1.0.0',
    description: 'Boosts confidence for high-quality structured data',
    author: 'WE4FREE Platform',
    requiresModuleVersion: '1.0.0',
    tags: ['enhancement', 'classification']
  },

  boostHistory: [],

  async initialize() {
    console.log('[confidence-booster] Plugin initialized');
    this.boostHistory = [];
  },

  get hooks() {
    const plugin = this;
    return {
      /**
       * Post-triage hook: Adjust confidence based on data quality
       */
      'post-triage': async (data) => {
        const { classification, normalized } = data;
        const { structure } = normalized;

        // Check if data is high-quality structured data
        const isStructured = structure?.type === 'object';
        const hasMultipleKeys = structure?.keyCount > 3;
        const hasTypedValues = structure?.hasArrays || structure?.hasNested;

        if (isStructured && hasMultipleKeys && hasTypedValues) {
          const originalConfidence = classification.confidence;
          const boost = 0.1; // Boost by 10%

          // Apply boost (cap at 1.0)
          classification.confidence = Math.min(1.0, originalConfidence + boost);

          // Add flag to indicate boost was applied
          if (classification.confidence > originalConfidence) {
            classification.flags = classification.flags || [];
            classification.flags.push('confidence-boosted');
            classification.indicators = classification.indicators || [];
            classification.indicators.push('boost:structured-data-quality');

            // Track boost for statistics
            plugin.boostHistory.push({
              timestamp: new Date().toISOString(),
              originalConfidence,
              boostedConfidence: classification.confidence,
              boost
            });

            console.log(`[confidence-booster] Boosted confidence: ${(originalConfidence * 100).toFixed(0)}% → ${(classification.confidence * 100).toFixed(0)}%`);
          }
        }

        return data;
      },

      /**
       * Post-output hook: Add plugin statistics to output
       */
      'post-output': async (data) => {
        // Add plugin metadata to output
        data.output.pluginMetadata = data.output.pluginMetadata || {};
        data.output.pluginMetadata.confidenceBooster = {
          applied: data.output.classification.flags?.includes('confidence-boosted') || false,
          totalBoosts: plugin.boostHistory.length
        };

        return data;
      }
    };
  },

  /**
   * Get boost statistics
   */
  getStatistics() {
    return {
      totalBoosts: this.boostHistory.length,
      history: this.boostHistory
    };
  },

  async cleanup() {
    console.log(`[confidence-booster] Plugin cleanup (boosted ${this.boostHistory.length} classifications)`);
    this.boostHistory = [];
  }
};
