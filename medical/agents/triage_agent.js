/**
 * TRIAGE AGENT
 * Role: Classify input type and route to correct processing path
 *
 * STRUCTURAL ONLY - No medical diagnosis or clinical reasoning
 */

class TriageAgent {
  constructor(agentId) {
    this.agentId = agentId;
    this.role = 'TRIAGE';
  }

  /**
   * Process task: classify input type and determine routing
   * @param {Object} task - Task with normalized data
   * @param {Object} state - Current workflow state
   * @returns {Object} - {task, state} with classification
   */
  async run(task, state) {
    console.log(`[${this.agentId}] Classifying input type...`);

    // TODO: USER FILLS THIS - Classification logic
    // Example classifications:
    // - 'symptoms' - patient-reported symptoms
    // - 'notes' - clinical notes
    // - 'labs' - lab results
    // - 'imaging' - imaging reports
    // - 'other' - unclassified

    const classification = this._classifyInput(task.data);

    return {
      task: {
        ...task,
        classification
      },
      state: {
        ...state,
        triageComplete: true,
        inputType: classification.type,
        processedBy: [...(state.processedBy || []), this.agentId]
      }
    };
  }

  /**
   * Classify input based on structural patterns (NO CLINICAL REASONING)
   * @private
   */
  _classifyInput(data) {
    const content = (data.content || '').toLowerCase();
    const structure = data.structure || {};

    // Classification patterns (keyword-based, structural)
    const patterns = {
      labs: {
        keywords: ['test', 'result', 'lab', 'value', 'range', 'unit', 'abnormal', 'reference', 'collection'],
        structuralHints: ['testName', 'results', 'values', 'referenceRange']
      },
      imaging: {
        keywords: ['xr', 'ct', 'mri', 'ultrasound', 'scan', 'imaging', 'radiology', 'impression', 'findings'],
        structuralHints: ['studyType', 'bodyRegion', 'impression']
      },
      vitals: {
        keywords: ['bp', 'blood pressure', 'heart rate', 'temperature', 'pulse', 'oxygen', 'spo2', 'vital'],
        structuralHints: ['measurements', 'vitals', 'heartRate', 'bloodPressure']
      },
      symptoms: {
        keywords: ['pain', 'ache', 'fever', 'cough', 'nausea', 'symptom', 'complaint', 'reports', 'experiencing'],
        structuralHints: ['symptoms', 'reportedItems', 'severity', 'onset']
      },
      notes: {
        keywords: ['note', 'admission', 'discharge', 'progress', 'consult', 'assessment', 'plan', 'history'],
        structuralHints: ['noteType', 'assessment', 'plan', 'chiefComplaint']
      }
    };

    // Score each type
    const scores = {};
    const indicators = [];
    const flags = [];

    for (const [type, pattern] of Object.entries(patterns)) {
      let score = 0;

      // Keyword matching
      for (const keyword of pattern.keywords) {
        if (content.includes(keyword)) {
          score += 1;
          indicators.push(`keyword:${keyword}`);
        }
      }

      // Structural hints (if data is structured)
      if (structure.hasStructuredData) {
        const rawKeys = Object.keys(data.raw || {});
        for (const hint of pattern.structuralHints) {
          if (rawKeys.some(key => key.toLowerCase().includes(hint.toLowerCase()))) {
            score += 2; // Structural hints weighted higher
            indicators.push(`structure:${hint}`);
          }
        }
      }

      scores[type] = score;
    }

    // Find best match
    const bestType = Object.keys(scores).reduce((a, b) =>
      scores[a] > scores[b] ? a : b
    );

    const maxScore = scores[bestType];
    const totalPossibleScore = patterns[bestType].keywords.length + patterns[bestType].structuralHints.length * 2;

    // Calculate confidence
    let confidence = maxScore > 0 ? Math.min(maxScore / totalPossibleScore, 1.0) : 0.0;

    // Determine type
    let type = maxScore > 0 ? bestType : 'other';
    let route = type;

    // Flag low confidence
    if (confidence < 0.3 && type !== 'other') {
      flags.push('low_confidence_classification');
      type = 'other'; // Fallback to 'other' if confidence too low
      route = 'default';
    }

    return {
      type,
      confidence: Math.round(confidence * 100) / 100, // Round to 2 decimals
      route,
      indicators,
      flags,
      subtype: null // Can be extended later
    };
  }
}

// Export factory function
export function createTriageAgent(agentId) {
  return new TriageAgent(agentId);
}
