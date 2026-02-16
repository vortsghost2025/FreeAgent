# Medical Module Architecture

**Version:** 1.0
**Last Updated:** 2026-02-16
**Status:** Active Development

---

## Overview

The Medical Module is part of a swarm architecture implementing a map/reduce pipeline for processing medical data. This document defines the complete architecture, schemas, invariants, and recovery protocols.

### Core Principles

1. **Structural Processing Only** - No clinical reasoning or medical diagnosis
2. **Pure Functions** - Agents are stateless, deterministic
3. **Immutable Pipeline** - Orchestrator enforces strict ordering
4. **Invariant Enforcement** - Validation at every boundary
5. **Full Auditability** - Complete trace of all processing steps

---

## Module Structure

```
/medical/
├── agents/
│   ├── ingestion_agent.js      # Normalize raw input
│   ├── triage_agent.js          # Classify and route
│   ├── summarization_agent.js   # Extract structured fields
│   ├── risk_agent.js            # Structural risk scoring
│   └── output_agent.js          # Format and validate
├── medical-agent-roles.js       # Role registry and factories
├── medical-workflows.js         # Orchestrator (map/reduce)
├── schemas.js                   # Data schemas
├── ui/
│   └── medical-ui.html          # Test harness
└── docs/
    └── MEDICAL_MODULE_ARCHITECTURE.md
```

---

## Pipeline Flow

```
Input Data
    ↓
[Ingestion Agent] → Normalized Data
    ↓
[Triage Agent] → Classification
    ↓
[Summarization Agent] → Structured Summary
    ↓
[Risk Agent] → Risk Score
    ↓
[Output Agent] → Final Output
```

**Pattern:** Each agent receives `{task, state}` and returns `{task, state}`

---

## Classification Types

The system supports 6 classification types:

| Type | Description | Use Case |
|------|-------------|----------|
| `symptoms` | Patient-reported symptoms | Symptom checkers, triage |
| `notes` | Clinical notes | Documentation processing |
| `labs` | Laboratory results | Lab value extraction |
| `imaging` | Imaging reports | Radiology processing |
| `vitals` | Vital signs | Vitals monitoring |
| `other` | Unclassified data | Fallback routing |

---

## Schema Specifications

### Summary Fields by Classification Type

#### Symptoms
```javascript
{
  reportedItems: ["array of symptom strings"],
  onset: "ISO8601 or relative duration",
  duration: "normalized duration (days/hours)",
  severity: "mild | moderate | severe",
  laterality: "left | right | bilateral (optional)",
  context: "trigger/relief factors",
  associatedSymptoms: ["array"]
}
```

#### Notes
```javascript
{
  noteType: "admission | consult | progress | discharge",
  authorRole: "physician | nurse | tech",
  chiefComplaint: "short string",
  assessment: "extracted assessment (optional)",
  plan: "extracted plan (optional)",
  keyFindings: ["array"]
}
```

#### Labs
```javascript
{
  testName: "canonical test name",
  results: [
    {name: "string", value: "any", unit: "string", timestamp: "ISO8601"}
  ],
  referenceRange: [
    {name: "string", low: "number", high: "number", unit: "string"}
  ],
  abnormalFlags: [{name: "string", flag: "string"}],
  collectionTime: "ISO8601"
}
```

#### Imaging
```javascript
{
  studyType: "XR | CT | MRI | US | etc",
  bodyRegion: "string",
  impression: "extracted impression text",
  findings: ["array of key findings"],
  reportDate: "ISO8601"
}
```

#### Vitals
```javascript
{
  measurements: [
    {type: "string", value: "number", unit: "string", timestamp: "ISO8601"}
  ],
  trendSummary: "stable | declining | improving",
  measurementSource: "device | manual"
}
```

#### Other
```javascript
{
  schemaHint: "free text hint for routing",
  rawPayload: "preserved raw object"
}
```

---

## Structural Risk Factors

**IMPORTANT:** Risk scoring is structural only - no clinical judgment.

### Risk Factor Definitions

| Factor | Severity | Description |
|--------|----------|-------------|
| `missing_required_fields` | HIGH | Required keys absent for the type |
| `timestamp_missing_or_invalid` | HIGH | No valid ISO timestamps |
| `sensitive_data_unredacted` | HIGH | PII present when policy requires redaction |
| `low_confidence_classification` | MEDIUM | Classification confidence < threshold |
| `partial_extraction` | MEDIUM | Completeness < threshold (e.g., < 0.6) |
| `inconsistent_units` | MEDIUM | Unit mismatches across values |
| `duplicate_records` | LOW | Same test/time duplicated |
| `large_payload` | LOW | estimatedLength exceeds safe size |
| `missing_source` | LOW | No source metadata |
| `out_of_range_format` | MEDIUM | Numeric fields contain non-numeric text |
| `contradictory_fields` | MEDIUM | Mutually exclusive fields both present |

### Severity Thresholds

- **HIGH:** Blocks processing or requires immediate human review
- **MEDIUM:** Flags for review, processing continues
- **LOW:** Logged for audit, minimal impact

---

## Final Output Schema

### Required Top-Level Fields

```javascript
{
  // Quick triage
  humanSummary: "1-2 sentence summary",

  // Metadata
  timestamp: "ISO8601",
  pipelineVersion: "string",
  processingTime: "number (ms)",
  schemaVersion: "string",

  // Provenance
  provenance: {
    createdByAgentId: "string",
    createdAt: "ISO8601",
    originalMessageId: "string (optional)"
  },

  // Audit trail
  auditLog: [
    {
      agentId: "string",
      step: "string",
      timestamp: "ISO8601",
      action: "string",
      notes: "string (optional)"
    }
  ],

  // Processing trace
  pipeline: ["array of agent IDs"],

  // All data stages
  input: RawInputSchema,
  normalized: NormalizedDataSchema,
  classification: ClassificationSchema,
  summary: SummarySchema,
  riskScore: RiskScoreSchema,

  // Status
  status: "complete | partial | error",

  // Validation
  validation: {
    allStepsComplete: true,
    invariantsSatisfied: true,
    issues: []
  },

  // Redaction tracking
  redactionSummary: {
    redacted: false,
    fieldsRedacted: [],
    method: "none"
  },

  // Human review
  humanReview: {
    required: false,
    reviewerId: null,
    notes: null
  },

  // Integrity
  hash: "content hash (optional)",

  // Errors (if status=error)
  errorDetails: [
    {
      code: "string",
      message: "string",
      stack: "string",
      agentId: "string"
    }
  ]
}
```

---

## Invariants (MUST NEVER VIOLATE)

### Agent Invariants
1. ✅ Agents are pure functions
2. ✅ Agents return `{task, state}` structure
3. ✅ Agents do NOT perform medical reasoning
4. ✅ Agents do NOT infer clinical facts
5. ✅ Agents maintain `state.processedBy` array

### Orchestrator Invariants
1. ✅ Pipeline order is immutable
2. ✅ Each agent executes exactly once per task
3. ✅ Orchestrator validates result structure after each step
4. ✅ Orchestrator unwraps results before storing (if applicable)
5. ✅ Orchestrator enforces completion flags

### Data Invariants
1. ✅ Task has `{id, timestamp, data}` minimum
2. ✅ State has `{pipelineStart, processedBy}` minimum
3. ✅ All timestamps are ISO8601 format
4. ✅ All schemas are versioned
5. ✅ Audit log is append-only

---

## Validation Checklist

### Pre-Deployment Validation

**Invariants Check:**
- [ ] Agents are pure functions (no side effects)
- [ ] Agents do not contain domain logic
- [ ] Orchestrator enforces ordering
- [ ] Orchestrator rejects out-of-order calls

**Schema Conformance:**
- [ ] Each agent validates input against expected schema
- [ ] Each agent emits expected output schema keys
- [ ] Schema version is logged in final output

**Classification:**
- [ ] Triage confidence threshold configured
- [ ] Classification types cover all expected inputs
- [ ] Routing logic is deterministic

**Risk Scoring:**
- [ ] Severity mapping implemented
- [ ] Scoring weights configured
- [ ] No clinical judgment in risk factors

**Output:**
- [ ] FinalOutput includes provenance
- [ ] FinalOutput includes auditLog
- [ ] FinalOutput includes schemaVersion
- [ ] humanSummary is generated

**Human Review:**
- [ ] humanReview flag set when risk score > threshold
- [ ] humanReview flag set when completeness < threshold

---

## Recovery Protocol

### Session State Recovery

**What to Externalize:**
1. Current schemas (schemas.js)
2. Agent implementations (agents/*.js)
3. Orchestrator state (medical-workflows.js)
4. This architecture document

**Recovery Steps:**
1. Read `MEDICAL_MODULE_ARCHITECTURE.md`
2. Validate schemas against current implementation
3. Check invariants in orchestrator code
4. Run validation checklist
5. Test pipeline with UI harness

**Recovery Artifacts:**
- `schemas.js` - Data structures
- `medical-agent-roles.js` - Role definitions
- `medical-workflows.js` - Orchestrator logic
- `docs/MEDICAL_MODULE_ARCHITECTURE.md` - This document

---

## Testing Strategy

### Unit Testing
- Test each agent in isolation
- Validate input/output schemas
- Check error handling

### Integration Testing
- Test full pipeline execution
- Validate orchestrator ordering
- Check invariant enforcement

### UI Testing
- Use `medical-ui.html` test harness
- Test each classification type
- Validate final output structure

---

## Future Enhancements

### Planned Features
- [ ] Parallel agent execution (where safe)
- [ ] Agent pool scaling
- [ ] Persistent task queue
- [ ] Real-time monitoring dashboard
- [ ] Schema versioning and migration

### Maintenance Tasks
- [ ] Regular schema review
- [ ] Risk factor tuning
- [ ] Performance optimization
- [ ] Documentation updates

---

## References

- **WE4FREE Platform Conventions:** `c:\workspace\CLAUDE.md`
- **Genomics Module:** `c:\workspace\we4free_global\genomics-*`
- **Swarm Architecture Patterns:** See genomics implementation

---

**Document Owner:** Sean & Claude
**Review Cycle:** After each major change
**Next Review:** After initial implementation complete
