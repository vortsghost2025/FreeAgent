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

    const inputData = task.data;

    // Extract the actual raw data (unwrap if needed)
    const rawData = inputData.raw || inputData;

    // Determine content type
    const contentType = this._detectContentType(inputData);

    // Extract main content
    const content = this._extractContent(inputData, contentType);

    // Analyze structure
    const structure = this._analyzeStructure(rawData, content);

    // Build normalized data according to NormalizedDataSchema
    const normalizedData = {
      raw: rawData, // Store ONLY the inner raw data, not the wrapper
      content: content,
      contentType: contentType,
      timestamp: inputData.timestamp || new Date().toISOString(),
      format: 'normalized',
      source: inputData.source || 'unknown',
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
      const textContent = typeof data === 'string' ? data : (data.raw || JSON.stringify(data));
      return typeof textContent === 'string' ? textContent : String(textContent);
    }

    if (contentType === 'structured') {
      // For structured data, create human-readable "key: value" pairs
      const rawContent = data.raw || data.content || data;

      if (typeof rawContent === 'string') {
        return rawContent;
      }

      // Handle empty objects
      if (typeof rawContent === 'object' && Object.keys(rawContent).length === 0) {
        return '';
      }

      // Build human-readable normalized content string
      const normalizedContent = Object.entries(rawContent)
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            // Handle arrays - extract values from objects within arrays
            const arrayContent = value.map(item => {
              if (typeof item === 'object' && item !== null) {
                // Extract all values from the object
                return Object.values(item).filter(v => v !== null && v !== undefined).join(' ');
              }
              return String(item);
            }).join(', ');
            return `${key}: ${arrayContent}`;
          }
          if (typeof value === "object" && value !== null) {
            // For nested objects, extract all values
            const objectValues = Object.values(value).filter(v => v !== null && v !== undefined).join(' ');
            return `${key}: ${objectValues}`;
          }
          return `${key}: ${value}`;
        })
        .join(" | ");

      return normalizedContent || '';
    }

    return String(data || '');
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
export function createIngestionAgent(agentId) {
  return new IngestionAgent(agentId);
}
