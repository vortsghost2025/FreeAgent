/**
 * INGESTION AGENT
 * Role: Load raw input and normalize into standard structure
 *
 * STRUCTURAL ONLY - No medical reasoning
 */

class IngestionAgent {
  constructor(agentId) {
    this.agentId = agentId;
    this.role = 'INGESTION';
  }

  /**
   * Process task: normalize raw input into standard structure
   * @param {Object} task - Task with raw input data
   * @param {Object} state - Current workflow state
   * @returns {Object} - {task, state} with normalized data
   */
  async run(task, state) {
    console.log(`[${this.agentId}] Ingesting raw input...`);

    const rawData = task.data;

    // Determine content type
    const contentType = this._detectContentType(rawData);

    // Extract main content
    const content = this._extractContent(rawData, contentType);

    // Analyze structure
    const structure = this._analyzeStructure(rawData, content);

    // Build normalized data according to NormalizedDataSchema
    const normalizedData = {
      raw: rawData, // Preserve original
      content: content,
      contentType: contentType,
      timestamp: rawData.timestamp || new Date().toISOString(),
      format: 'normalized',
      source: rawData.source || 'unknown',
      structure: structure
    };

    return {
      task: {
        ...task,
        data: normalizedData
      },
      state: {
        ...state,
        ingestionComplete: true,
        processedBy: [...(state.processedBy || []), this.agentId]
      }
    };
  }

  /**
   * Detect content type from raw data
   * @private
   */
  _detectContentType(data) {
    if (typeof data === 'string') {
      return 'text';
    }

    if (typeof data === 'object' && data !== null) {
      // Check if it has explicit format
      if (data.format) {
        return data.format;
      }

      // Check for structured fields
      if (data.raw && typeof data.raw === 'string') {
        return 'text';
      }

      return 'structured';
    }

    return 'text';
  }

  /**
   * Extract main content from data
   * @private
   */
  _extractContent(data, contentType) {
    if (contentType === 'text') {
      return typeof data === 'string' ? data : (data.raw || JSON.stringify(data));
    }

    if (contentType === 'structured') {
      return data.raw || data.content || JSON.stringify(data);
    }

    return String(data);
  }

  /**
   * Analyze structural properties
   * @private
   */
  _analyzeStructure(data, content) {
    const hasStructuredData = typeof data === 'object' && data !== null;

    const fieldCount = hasStructuredData
      ? Object.keys(data).length
      : 0;

    const estimatedLength = content ? content.length : 0;

    return {
      hasStructuredData,
      fieldCount,
      estimatedLength
    };
  }
}

// Export factory function
module.exports = {
  createIngestionAgent: (agentId) => new IngestionAgent(agentId)
};
