/**
 * TRIAGE AGENT
 * Role: Classify input type and route to correct processing path
 *
 * STRUCTURAL ONLY - No medical diagnosis or clinical reasoning
 */

import {
  validateTask,
  validateState,
  validateClassification,
  ValidationError,
  AgentError
} from '../utils/validators.js';

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
    try {
      // Validate inputs
      validateTask(task, this.agentId);
      validateState(state, this.agentId);

      if (!task.data || !task.data.content) {
        throw new ValidationError(
          'Task data missing required content field for classification',
          'task.data.content',
          task.data
        );
      }

      console.log(`[${this.agentId}] Classifying input type...`);

      const classification = this._classifyInput(task.data);

      // Validate output
      validateClassification(classification, this.agentId);

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
    } catch (error) {
      console.error(`[${this.agentId}] Error during triage:`, error.message);

      // Re-throw validation errors
      if (error instanceof ValidationError) {
        throw error;
      }

      // Wrap other errors
      throw new AgentError(
        `Triage failed: ${error.message}`,
        this.agentId,
        'triage'
      );
    }
  }

  /**
   * Classify input based on structural patterns (NO CLINICAL REASONING)
   * @private
   */
  _classifyInput(data) {
    // Ensure content is always a string
    const rawContent = data.content ?? '';
    const content = typeof rawContent === 'string' ? rawContent.toLowerCase() : String(rawContent).toLowerCase();
    const structure = data.structure || {};

    // Classification patterns (keyword-based, structural)
    const patterns = {
      labs: {
        keywords: [
          // General lab terms
          'test', 'result', 'lab', 'laboratory', 'value', 'range', 'unit', 'abnormal', 'reference', 'collection', 'specimen', 'assay', 'analysis',
          // Common lab tests
          'cbc', 'complete blood count', 'wbc', 'rbc', 'hemoglobin', 'hematocrit', 'platelet',
          'bmp', 'cmp', 'metabolic panel', 'glucose', 'sodium', 'potassium', 'chloride', 'co2', 'bun', 'creatinine',
          'ast', 'alt', 'alkaline phosphatase', 'bilirubin', 'albumin', 'protein',
          'troponin', 'bnp', 'creatine kinase', 'ck-mb', 'd-dimer', 'procalcitonin',
          'tsh', 'thyroid', 't3', 't4', 'hemoglobin a1c', 'hba1c',
          'urinalysis', 'ua', 'culture', 'sensitivity', 'blood culture',
          'lipid panel', 'cholesterol', 'ldl', 'hdl', 'triglycerides',
          'pt', 'inr', 'ptt', 'coagulation', 'hct', 'mcv', 'mch', 'mchc'
        ],
        structuralHints: ['testName', 'results', 'values', 'referenceRange', 'labResults', 'testResults', 'metrics', 'measurements', 'units']
      },
      imaging: {
        keywords: [
          // Modalities
          'xr', 'x-ray', 'radiograph', 'ct', 'cat scan', 'computed tomography', 'mri', 'magnetic resonance',
          'ultrasound', 'us', 'sonography', 'pet', 'pet-ct', 'fluoroscopy', 'mammography', 'dexa',
          // General imaging terms
          'scan', 'imaging', 'radiology', 'radiological', 'image', 'study',
          // Report sections
          'impression', 'findings', 'indication', 'technique', 'comparison', 'conclusion',
          // Common findings
          'opacity', 'consolidation', 'infiltrate', 'nodule', 'mass', 'effusion', 'fracture',
          'abnormality', 'lesion', 'enhancement', 'attenuation', 'signal intensity',
          // Body regions often in imaging
          'chest', 'abdomen', 'pelvis', 'head', 'brain', 'spine', 'extremity', 'joint'
        ],
        structuralHints: ['studyType', 'bodyRegion', 'impression', 'findings', 'modality', 'technique', 'indication', 'comparison', 'imagingResults']
      },
      vitals: {
        keywords: [
          // Blood pressure
          'bp', 'blood pressure', 'systolic', 'diastolic', 'mmhg', 'hypertension', 'hypotension',
          // Heart rate
          'heart rate', 'hr', 'pulse', 'bpm', 'beats per minute', 'tachycardia', 'bradycardia',
          // Temperature
          'temperature', 'temp', 'fever', 'febrile', 'afebrile', 'celsius', 'fahrenheit',
          // Respiratory
          'respiratory rate', 'rr', 'respiration', 'breaths per minute', 'tachypnea', 'bradypnea',
          // Oxygen
          'oxygen saturation', 'o2 sat', 'spo2', 'pulse ox', 'oxygen', 'hypoxia',
          // Other vitals
          'vital signs', 'vitals', 'cvp', 'central venous pressure', 'map', 'mean arterial pressure',
          'weight', 'bmi', 'body mass index', 'height',
          // Vital sign patterns
          'stable', 'unstable', 'trending', 'baseline', 'monitoring'
        ],
        structuralHints: ['measurements', 'vitals', 'vitalSigns', 'heartRate', 'bloodPressure', 'temperature', 'respiratoryRate', 'oxygenSaturation', 'measurementSource', 'trendSummary', 'monitoring']
      },
      symptoms: {
        keywords: [
          // General symptom terms
          'symptom', 'complaint', 'reports', 'experiencing', 'complains of', 'presents with', 'chief complaint',
          // Pain
          'pain', 'ache', 'discomfort', 'soreness', 'tenderness', 'sharp', 'dull', 'throbbing', 'cramping',
          // Systemic
          'fever', 'chills', 'fatigue', 'weakness', 'malaise', 'tired', 'exhaustion',
          // Respiratory
          'cough', 'dyspnea', 'shortness of breath', 'sob', 'wheezing', 'congestion', 'sputum',
          // GI
          'nausea', 'vomiting', 'diarrhea', 'constipation', 'abdominal pain', 'heartburn', 'bloating',
          // Neurological
          'headache', 'dizziness', 'vertigo', 'confusion', 'numbness', 'tingling', 'weakness',
          // Other common
          'rash', 'itch', 'swelling', 'bruising', 'bleeding', 'palpitations',
          // Severity descriptors
          'severe', 'moderate', 'mild', 'acute', 'chronic', 'intermittent', 'constant'
        ],
        structuralHints: ['symptoms', 'reportedItems', 'severity', 'onset', 'duration', 'chiefComplaint', 'presentingSymptoms', 'patientReports', 'subjective']
      },
      notes: {
        keywords: [
          // Note types
          'note', 'documentation', 'admission', 'discharge', 'progress', 'progress note', 'consult', 'consultation',
          'history and physical', 'h&p', 'soap', 'operative note', 'procedure note',
          // Clinical sections
          'assessment', 'plan', 'history', 'physical exam', 'review of systems', 'ros',
          'subjective', 'objective', 'impression', 'differential diagnosis',
          // Clinical processes
          'admitted', 'discharged', 'transfer', 'evaluation', 'treatment', 'management',
          'follow-up', 'monitoring', 'recommended', 'prescribed', 'ordered',
          // Providers
          'physician', 'provider', 'attending', 'resident', 'nurse', 'clinician'
        ],
        structuralHints: ['noteType', 'assessment', 'plan', 'chiefComplaint', 'history', 'physicalExam', 'subjective', 'objective', 'documentation', 'clinical', 'provider']
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

    // Calculate confidence based on absolute score (not percentage)
    // This prevents dilution as keyword lists grow
    let confidence = 0.0;
    if (maxScore >= 5) {
      confidence = Math.min(0.7 + (maxScore - 5) * 0.05, 1.0); // 0.7-1.0 for high scores
    } else if (maxScore >= 3) {
      confidence = 0.5 + (maxScore - 3) * 0.1; // 0.5-0.7 for medium scores
    } else if (maxScore >= 1) {
      confidence = 0.3 + (maxScore - 1) * 0.1; // 0.3-0.5 for low scores
    }

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
