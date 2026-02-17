# Medical Module Architecture

## System Design

### Overview

The Medical Data Processing Module uses a **5-agent swarm architecture** where agents are specialized workers that process data sequentially through a pipeline coordinated by an orchestrator.

```
┌──────────────────────────────────────────────────────────────┐
│                     MEDICAL ORCHESTRATOR                      │
│                  (Pipeline Coordinator)                       │
└────────┬─────────────────────────────────────────────────┬───┘
         │                                                   │
         ▼                                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  INPUT                                                           │
│  { raw: {...}, source: "system", timestamp: "..." }              │
└─────────┬───────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│  AGENT 1: INGESTION                                              │
│  Role: Normalize raw input into standard structure              │
│  Output: NormalizedData { raw, content, contentType, ... }      │
└─────────┬───────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│  AGENT 2: TRIAGE                                                 │
│  Role: Classify input type (symptoms/labs/imaging/vitals/etc)   │
│  Output: Classification { type, confidence, route, ... }         │
└─────────┬───────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│  AGENT 3: SUMMARIZATION                                          │
│  Role: Extract type-specific structured fields                  │
│  Output: Summary { fields, extractionMethod, completeness }     │
└─────────┬───────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│  AGENT 4: RISK                                                   │
│  Role: Structural risk scoring (NO clinical judgment)           │
│  Output: RiskScore { score, severity, factors, flags }          │
└─────────┬───────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│  AGENT 5: OUTPUT                                                 │
│  Role: Format final output and validate invariants              │
│  Output: FinalOutput { normalized, classification, summary, ... }│
└─────────┬───────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│  RESULT                                                          │
│  { output: {...}, state: {...}, metadata: {...} }                │
└─────────────────────────────────────────────────────────────────┘
```

## Core Principles

### 1. Structural-Only Processing
**Critical Constraint**: No medical reasoning, no clinical judgment, no PHI inference

- Agents analyze structure, patterns, and data completeness
- No diagnosis, treatment recommendations, or medical interpretation
- All risk scoring is rule-based on structural properties

### 2. Agent Contract
Every agent implements the same interface:

```javascript
async run(task, state) {
  // Process task
  return { task: {...}, state: {...} };
}
```

**Inputs**:
- `task`: Data payload with `id`, `data`, and accumulated processing results
- `state`: Pipeline state with flags and processing history

**Outputs**:
- Modified`task` with new processing results
- Updated `state` with completion flags

### 3. Data Immutability
Original raw data is never modified, preserved throughout pipeline

### 4. Fail-Fast Validation
Comprehensive validation at every stage with detailed error messages

## File Structure

```
medical/
├── agents/                      # Agent implementations
│   ├── ingestion_agent.js       # Normalize input
│   ├── triage_agent.js          # Classify type
│   ├── summarization_agent.js   # Extract fields
│   ├── risk_agent.js            # Risk scoring
│   └── output_agent.js          # Format output
├── utils/                       # Utility modules
│   ├── validators.js            # Input/output validation
│   ├── logger.js                # Production logging
│   └── health-monitor.js        # Health metrics
├── __tests__/                   # Test suite
│   └── medical-module.test.js   # Comprehensive tests
├── ui/                          # Browser interface
│   └── medical-ui.html          # Test harness
├── medical-workflows.js         # Orchestrator
├── medical-agent-roles.js       # Agent factories
├── schemas.js                   # Data schemas
└── README.md                    # Documentation
```

## Classification Algorithm

### Triage Agent Logic

```javascript
// 1. Extract content and structure
const content = data.content.toLowerCase();
const structure = data.structure;

// 2. Score each type
for (const [type, pattern] of Object.entries(patterns)) {
  // Keyword matching (weight: 1)
  for (const keyword of pattern.keywords) {
    if (content.includes(keyword)) score += 1;
  }

  // Structural hints (weight: 2)
  if (structure.hasStructuredData) {
    for (const hint of pattern.structuralHints) {
      if (rawKeys.includes(hint)) score += 2;
    }
  }
}

// 3. Calculate confidence (absolute scoring)
if (score >= 5) confidence = 0.7-1.0;
else if (score >= 3) confidence = 0.5-0.7;
else if (score >= 1) confidence = 0.3-0.5;

// 4. Fallback to 'other' if low confidence
if (confidence < 0.3) type = 'other';
```

### Why Absolute Scoring?

Previous approach: `confidence = score / totalPossibleScore`
- Problem: Adding keywords diluted confidence
- Solution: Fixed thresholds based on absolute score

## Risk Scoring System

### Risk Factors (Structural Only)

1. **Missing Required Fields** (weight: 0.5, severity: high)
   - Type-specific required fields not present

2. **Low Confidence Classification** (weight: 0.3, severity: medium)
   - Classification confidence < 0.3

3. **Partial Extraction** (weight: 0.2, severity: low)
   - Summary completeness < 0.7

4. **Large Payload** (weight: 0.3, severity: medium)
   - Content length > 10,000 characters

5. **Missing Source** (weight: 0.1, severity: low)
   - No source system identified

### Risk Severity Mapping

- Score >= 0.5 → **high**
- Score >= 0.3 → **medium**
- Score < 0.3 → **low**

## Error Handling Strategy

### Error Types

1. **ValidationError**: Input/output validation failures
   - Field: Which field failed
   - Value: What value was invalid

2. **AgentError**: Agent execution failures
   - AgentId: Which agent failed
   - Phase: What phase failed

3. **PipelineError**: Orchestrator failures
   - Stage: Which pipeline stage failed

### Error Propagation

```
Agent throws ValidationError/AgentError
    ↓
Orchestrator catches error
    ↓
Logs detailed error information
    ↓
Wraps in PipelineError with context
    ↓
Throws to caller
```

## Performance Characteristics

### Benchmarks (5 agents, typical input)

- **Execution Time**: 1-3ms average
- **Memory**: < 1MB per pipeline
- **Throughput**: 500+ pipelines/sec (single thread)
- **Concurrent**: Fully async, limited only by hardware

### Performance Optimizations

1. **Synchronous Agent Logic**: No async operations in agent core
2. **Minimal Cloning**: Spread operators instead of deep clones
3. **Lazy Evaluation**: Compute only when needed
4. **No External I/O**: Pure in-memory processing

## Extending the System

### Adding a New Classification Type

1. Add keywords to `triage_agent.js` patterns
2. Add structural hints for the type
3. Create field extractor in `summarization_agent.js`
4. Add required fields in `risk_agent.js`
5. Update schemas in `schemas.js`
6. Add tests

### Creating a Custom Agent

```javascript
class CustomAgent {
  constructor(agentId) {
    this.agentId = agentId;
    this.role = 'CUSTOM';
  }

  async run(task, state) {
    // Validate inputs
    validateTask(task, this.agentId);
    validateState(state, this.agentId);

    // Do processing
    const result = this._processTask(task);

    // Return contract
    return {
      task: {
        ...task,
        customResult: result
      },
      state: {
        ...state,
        customComplete: true,
        processedBy: [...(state.processedBy || []), this.agentId]
      }
    };
  }
}
```

### Adding Custom Validators

```javascript
export function validateCustomOutput(output, agentId) {
  if (!output || typeof output !== 'object') {
    throw new ValidationError(
      `Invalid custom output from ${agentId}`,
      'customOutput',
      output
    );
  }

  // Add validation logic

  return true;
}
```

## Logging Strategy

### Log Levels

- **DEBUG**: Detailed execution traces
- **INFO**: Pipeline milestones
- **WARN**: Degraded performance, low confidence
- **ERROR**: Agent failures, validation errors
- **FATAL**: Pipeline failures, unrecoverable errors

### What to Log

✅ **DO LOG**:
- Pipeline start/complete with execution time
- Agent execution with timing
- Classification results with confidence
- Risk scores with severity
- Validation errors with context
- Performance warnings

❌ **DON'T LOG**:
- Raw patient data (privacy)
- Full data payloads (too verbose)
- Debug traces in production (performance)

## Health Monitoring

### Metrics Tracked

**Pipeline Level**:
- Execution count, success/failure rates
- Average/min/max execution times
- Classification type distribution
- Risk severity distribution

**Agent Level**:
- Executions per agent
- Success rate per agent
- Average execution time per agent

**Data Quality**:
- Low confidence classification rate
- Partial extraction rate
- Missing required fields rate

### Alert Thresholds

- **Failure Rate > 10%**: WARNING
- **Avg Execution > 50ms**: WARNING
- **Low Confidence > 20%**: INFO

## Security Considerations

### Data Privacy

1. **No PHI Logging**: Never log patient-identifiable information
2. **Structural Only**: Process structure, not medical content
3. **No Persistence**: All processing in-memory
4. **No External Calls**: No API calls, no external I/O

### Input Validation

1. **Type Checking**: Validate all input types
2. **Required Fields**: Enforce required fields
3. **Sanitization**: Handle malformed data gracefully
4. **Size Limits**: Flag large payloads

## Testing Strategy

### Unit Tests
Individual agent functionality in isolation

### Integration Tests
Full pipeline execution with realistic data

### Edge Case Tests
- Empty input
- Null values
- Malformed data
- Large payloads
- Missing timestamps

### Performance Tests
- Execution time < 10ms
- Concurrent execution (10 pipelines)

## Future Enhancements

### Phase 2: ML Classification
- Train models on classified data
- Hybrid keyword + ML approach
- Active learning loop

### Phase 3: Real-Time Streaming
- Stream processing for continuous data
- Backpressure handling
- Stateful aggregations

### Phase 4: API Endpoints
- REST API wrapper
- GraphQL schema
- WebSocket streaming

---

**Design Philosophy**: Simple, fast, reliable, and transparent.
