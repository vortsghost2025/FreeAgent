/**
 * SUMMARIZATION AGENT
 * Role: Produce structured summaries and extract key fields
 *
 * STRUCTURAL ONLY - No clinical interpretation or medical reasoning
 */

class SummarizationAgent {
  constructor(agentId) {
    this.agentId = agentId;
    this.role = 'SUMMARIZATION';
  }

  /**
   * Process task: create structured summary
   * @param {Object} task - Task with classified data
   * @param {Object} state - Current workflow state
   * @returns {Object} - {task, state} with summary
   */
  async run(task, state) {
    console.log(`[${this.agentId}] Generating structured summary...`);

    // TODO: USER FILLS THIS - Summarization logic based on input type
    // Example summaries:
    // - Extract key-value pairs
    // - Identify structured fields
    // - Create normalized representation
    // NO CLINICAL INTERPRETATION

    const summary = this._generateSummary(task.data, task.classification);

    return {
      task: {
        ...task,
        summary
      },
      state: {
        ...state,
        summarizationComplete: true,
        processedBy: [...(state.processedBy || []), this.agentId]
      }
    };
  }

  /**
   * Generate structured summary based on classification type
   * @private
   */
  _generateSummary(data, classification) {
    const type = classification.type;

    // Route to type-specific extractor
    let fields = {};
    switch (type) {
      case 'symptoms':
        fields = this._extractSymptoms(data);
        break;
      case 'notes':
        fields = this._extractNotes(data);
        break;
      case 'labs':
        fields = this._extractLabs(data);
        break;
      case 'imaging':
        fields = this._extractImaging(data);
        break;
      case 'vitals':
        fields = this._extractVitals(data);
        break;
      case 'other':
      default:
        fields = this._extractOther(data);
        break;
    }

    // Extract key-value pairs
    const keyValuePairs = this._extractKeyValuePairs(data);

    // Calculate completeness
    const completeness = this._calculateCompleteness(fields, type);

    return {
      fields,
      extractionMethod: `type-specific:${type}`,
      fieldsExtracted: Object.keys(fields).length,
      completeness,
      keyValuePairs
    };
  }

  /**
   * Extract symptoms-specific fields
   * @private
   */
  _extractSymptoms(data) {
    const raw = data.raw || {};
    const content = data.content || '';

    return {
      reportedItems: raw.reportedItems || raw.symptoms || [],
      onset: raw.onset || null,
      duration: raw.duration || null,
      severity: raw.severity || null,
      laterality: raw.laterality || null,
      context: raw.context || null,
      associatedSymptoms: raw.associatedSymptoms || []
    };
  }

  /**
   * Extract notes-specific fields
   * @private
   */
  _extractNotes(data) {
    const raw = data.raw || {};

    return {
      noteType: raw.noteType || null,
      authorRole: raw.authorRole || null,
      chiefComplaint: raw.chiefComplaint || null,
      assessment: raw.assessment || null,
      plan: raw.plan || null,
      keyFindings: raw.keyFindings || []
    };
  }

  /**
   * Extract labs-specific fields
   * @private
   */
  _extractLabs(data) {
    const raw = data.raw || {};

    return {
      testName: raw.testName || null,
      results: raw.results || [],
      referenceRange: raw.referenceRange || [],
      abnormalFlags: raw.abnormalFlags || [],
      collectionTime: raw.collectionTime || null
    };
  }

  /**
   * Extract imaging-specific fields
   * @private
   */
  _extractImaging(data) {
    const raw = data.raw || {};

    return {
      studyType: raw.studyType || null,
      bodyRegion: raw.bodyRegion || null,
      impression: raw.impression || null,
      findings: raw.findings || [],
      reportDate: raw.reportDate || null
    };
  }

  /**
   * Extract vitals-specific fields
   * @private
   */
  _extractVitals(data) {
    const raw = data.raw || {};

    return {
      measurements: raw.measurements || [],
      trendSummary: raw.trendSummary || null,
      measurementSource: raw.measurementSource || null
    };
  }

  /**
   * Extract other-type fields
   * @private
   */
  _extractOther(data) {
    const raw = data.raw || {};

    return {
      schemaHint: raw.schemaHint || null,
      rawPayload: raw
    };
  }

  /**
   * Extract key-value pairs from content
   * @private
   */
  _extractKeyValuePairs(data) {
    const raw = data.raw || {};
    const pairs = [];

    // Simple key-value extraction from raw object
    for (const [key, value] of Object.entries(raw)) {
      if (typeof value !== 'object' || value === null) {
        pairs.push({ key, value });
      }
    }

    return pairs;
  }

  /**
   * Calculate completeness score based on required fields
   * @private
   */
  _calculateCompleteness(fields, type) {
    const requiredFieldsByType = {
      symptoms: ['reportedItems', 'severity'],
      notes: ['noteType', 'chiefComplaint'],
      labs: ['testName', 'results'],
      imaging: ['studyType', 'impression'],
      vitals: ['measurements'],
      other: ['rawPayload']
    };

    const required = requiredFieldsByType[type] || [];
    if (required.length === 0) return 1.0;

    let filledCount = 0;
    for (const field of required) {
      const value = fields[field];
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          if (value.length > 0) filledCount++;
        } else {
          filledCount++;
        }
      }
    }

    return Math.round((filledCount / required.length) * 100) / 100;
  }
}

// Export factory function
module.exports = {
  createSummarizationAgent: (agentId) => new SummarizationAgent(agentId)
};
