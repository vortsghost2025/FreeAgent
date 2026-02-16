/**
 * MEDICAL MODULE DATA SCHEMAS
 * Defines the shape of data as it flows through the pipeline
 *
 * Each agent transforms data from one schema to the next
 */

/**
 * STAGE 0: Raw Input (before ingestion)
 * This is what the user provides
 */
const RawInputSchema = {
  // The actual content (text, structured data, etc.)
  raw: "string | object",

  // Optional metadata
  format: "text | json | structured",
  source: "string (optional)",
  timestamp: "ISO8601 string (optional)",

  // Any additional fields the user provides
  metadata: "object (optional)"
};

/**
 * STAGE 1: After Ingestion Agent
 * Data has been normalized into standard structure
 */
const NormalizedDataSchema = {
  // Original raw data preserved
  raw: "any",

  // Normalized fields
  content: "string",  // Main content extracted
  contentType: "text | json | structured",

  // Metadata
  timestamp: "ISO8601 string",
  format: "normalized",
  source: "string",

  // Structural analysis
  structure: {
    hasStructuredData: "boolean",
    fieldCount: "number",
    estimatedLength: "number"
  }
};

/**
 * STAGE 2: After Triage Agent
 * Input has been classified and routed
 */
const ClassificationSchema = {
  // Classification result
  type: "symptoms | notes | labs | imaging | vitals | other",
  confidence: "number (0-1)",
  route: "string (processing path)",

  // Classification reasoning (structural)
  indicators: ["array of strings"],
  flags: ["array of strings"],

  // Subtype (if applicable)
  subtype: "string (optional)"
};

/**
 * STAGE 3: After Summarization Agent
 * Structured summary has been generated
 */
const SummarySchema = {
  // Extracted fields (structure depends on classification type)
  fields: {
    // For 'symptoms' type:
    symptoms: {
      reportedItems: ["array of symptom strings"],
      onset: "ISO8601 or relative duration string",
      duration: "normalized duration (days/hours)",
      severity: "mild | moderate | severe",
      laterality: "left | right | bilateral (optional)",
      context: "trigger/relief factors",
      associatedSymptoms: ["array"]
    },

    // For 'notes' type:
    notes: {
      noteType: "admission | consult | progress | discharge",
      authorRole: "physician | nurse | tech",
      chiefComplaint: "short string extracted from top",
      assessment: "extracted assessment section (optional)",
      plan: "extracted plan section (optional)",
      keyFindings: ["array of extracted items"]
    },

    // For 'labs' type:
    labs: {
      testName: "canonical test name",
      results: [{name: "string", value: "any", unit: "string", timestamp: "ISO8601"}],
      referenceRange: [{name: "string", low: "number", high: "number", unit: "string"}],
      abnormalFlags: [{name: "string", flag: "string"}],
      collectionTime: "ISO8601"
    },

    // For 'imaging' type:
    imaging: {
      studyType: "XR | CT | MRI | US | etc",
      bodyRegion: "string",
      impression: "extracted impression text",
      findings: ["array of key findings"],
      reportDate: "ISO8601"
    },

    // For 'vitals' type:
    vitals: {
      measurements: [{type: "string", value: "number", unit: "string", timestamp: "ISO8601"}],
      trendSummary: "stable | declining | improving",
      measurementSource: "device | manual"
    },

    // For 'other' type:
    other: {
      schemaHint: "free text hint for downstream routing",
      rawPayload: "preserved raw object"
    }
  },

  // Summary metadata
  extractionMethod: "string",
  fieldsExtracted: "number",
  completeness: "number (0-1)",

  // Key-value pairs found
  keyValuePairs: [{key: "string", value: "any"}]
};

/**
 * STAGE 4: After Risk Agent
 * Structural risk score has been calculated
 */
const RiskScoreSchema = {
  // Overall risk score (0-1, higher = more risk flags)
  score: "number (0-1)",

  // Risk factors identified (structural only - no clinical judgment)
  factors: [
    {
      factor: "missing_required_fields | timestamp_missing_or_invalid | low_confidence_classification | inconsistent_units | out_of_range_format | duplicate_records | partial_extraction | contradictory_fields | large_payload | sensitive_data_unredacted | missing_source",
      weight: "number",
      description: "string"
    }
  ],

  // Flags raised (severity mapping)
  // HIGH: missing_required_fields, timestamp_missing_or_invalid, sensitive_data_unredacted
  // MEDIUM: low_confidence_classification, partial_extraction, inconsistent_units
  // LOW: duplicate_records, large_payload, missing_source
  flags: [
    {
      flag: "string",
      severity: "low | medium | high",
      reason: "string"
    }
  ],

  // Scoring metadata
  scoringMethod: "rule-based | ml-based | hybrid",
  confidence: "number (0-1)"
};

/**
 * STAGE 5: Final Output
 * Formatted and validated output
 */
const FinalOutputSchema = {
  // Human-readable summary (top-level for quick triage)
  humanSummary: "1-2 sentence description of final state",

  // Pipeline metadata
  timestamp: "ISO8601 string",
  pipelineVersion: "string",
  processingTime: "number (ms)",
  schemaVersion: "string (version of schemas used)",

  // Provenance tracking
  provenance: {
    createdByAgentId: "string",
    createdAt: "ISO8601 string",
    originalMessageId: "string (optional)"
  },

  // Audit trail
  auditLog: [
    {
      agentId: "string",
      step: "string",
      timestamp: "ISO8601 string",
      action: "string",
      notes: "string (optional)"
    }
  ],

  // Pipeline execution trace
  pipeline: ["array of agent IDs"],

  // All processed data
  input: "RawInputSchema",
  normalized: "NormalizedDataSchema",
  classification: "ClassificationSchema",
  summary: "SummarySchema",
  riskScore: "RiskScoreSchema",

  // Status
  status: "complete | partial | error",

  // Validation results
  validation: {
    allStepsComplete: "boolean",
    invariantsSatisfied: "boolean",
    issues: ["array of strings"]
  },

  // Redaction tracking
  redactionSummary: {
    redacted: "boolean",
    fieldsRedacted: ["array of field keys"],
    method: "string (redaction method used)"
  },

  // Human review requirements
  humanReview: {
    required: "boolean",
    reviewerId: "string (optional)",
    notes: "string (optional)"
  },

  // Content integrity
  hash: "string (content hash for tamper detection, optional)",

  // Error details (if status = error)
  errorDetails: [
    {
      code: "string",
      message: "string",
      stack: "string (optional)",
      agentId: "string"
    }
  ]
};

/**
 * Task Structure (flows through pipeline)
 */
const TaskSchema = {
  id: "string (unique)",
  timestamp: "ISO8601 string",

  // Data gets progressively enriched
  data: "RawInputSchema (initially)",
  classification: "ClassificationSchema (after triage)",
  summary: "SummarySchema (after summarization)",
  riskScore: "RiskScoreSchema (after risk)",
  output: "FinalOutputSchema (after output)"
};

/**
 * State Structure (tracks pipeline progress)
 */
const StateSchema = {
  pipelineStart: "ISO8601 string",
  processedBy: ["array of agent IDs"],

  // Completion flags
  ingestionComplete: "boolean",
  triageComplete: "boolean",
  summarizationComplete: "boolean",
  riskScoringComplete: "boolean",
  outputComplete: "boolean",

  // Metadata
  inputType: "string (set by triage)",
  errors: ["array of error objects (optional)"]
};

// Export schemas
module.exports = {
  RawInputSchema,
  NormalizedDataSchema,
  ClassificationSchema,
  SummarySchema,
  RiskScoreSchema,
  FinalOutputSchema,
  TaskSchema,
  StateSchema
};
