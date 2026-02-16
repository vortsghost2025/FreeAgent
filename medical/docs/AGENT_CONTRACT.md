# Agent Contract

Each agent must conform to this contract. Enforce via unit tests or CI checks.

## Exports

Each agent module must export:

- **Factory function**: Creates agent instances (e.g., `createIngestionAgent(agentId)`)
- **Agent instance** with the following properties:
  - `agentId`: string (unique identifier)
  - `role`: string (agent role constant)
  - `async run(task, state)`: async function

## run(task, state)

### Inputs

- **`task`**: canonical Task object (see [schemas.js](../schemas.js))
  - Must have: `id`, `timestamp`, `data`
  - May have: `classification`, `summary`, `riskScore`, `output`
  - Optional: `debug` (boolean) - enables debug tracing

- **`state`**: pipeline State object
  - Must have: `pipelineStart`, `processedBy`
  - May have: completion flags, errors, inputType

### Behavior

1. **Validate incoming schema** for expected fields
   - If invalid, throw an Error or return structured error in `state.errors`
   - Example: Check that required input data exists

2. **Do not perform side effects** outside the returned `task`/`state`
   - No global mutations
   - No file I/O (unless explicitly designed for persistence agents)
   - No network calls (unless explicitly designed for external agents)

3. **Debug mode**: If `task.debug === true`, append `debugTrace` entries:
   ```javascript
   task.debugTrace = task.debugTrace || [];
   task.debugTrace.push({
     agentId: this.agentId,
     time: new Date().toISOString(),
     note: "Parsed 5 fields, classified as 'symptoms'"
   });
   ```

4. **Process task**: Transform `task` and `state` according to agent role
   - Ingestion: Normalize `task.data`
   - Triage: Add `task.classification`
   - Summarization: Add `task.summary`
   - Risk: Add `task.riskScore`
   - Output: Add `task.output`

5. **Update state**: Mark completion and append to `processedBy`
   ```javascript
   state.ingestionComplete = true;  // Role-specific flag
   state.processedBy.push(this.agentId);
   ```

### Return Value

Must return an object containing **both** `task` and `state`:

```javascript
return {
  task: updatedTask,
  state: updatedState
};
```

**Do NOT:**
- Return `null`, `undefined`, or non-objects
- Return only `task` or only `state`
- Mutate and return the same object references without copying (prefer immutable updates)

**Example return:**
```javascript
return {
  task: {
    ...task,
    classification: { type: 'symptoms', confidence: 0.85 }
  },
  state: {
    ...state,
    triageComplete: true,
    processedBy: [...state.processedBy, this.agentId]
  }
};
```

## Error Handling

### Recoverable Errors

For recoverable issues (e.g., missing optional fields), add to `state.errors`:

```javascript
state.errors = state.errors || [];
state.errors.push({
  code: 'MISSING_OPTIONAL_FIELD',
  message: 'Field X not found, using default',
  agentId: this.agentId,
  severity: 'low'
});
```

### Fatal Errors

For fatal issues that should stop the pipeline, throw an Error:

```javascript
if (!task.data) {
  throw new Error('Missing task.data - cannot proceed with ingestion');
}
```

The orchestrator will catch this, log it in `auditLog`, and handle according to policy (stop or continue as partial).

## Logging

- **Do NOT rely on console.log** for production tracing
- Console logs are for development/debugging only
- The orchestrator's `auditLog` is the authoritative trace
- Agents should focus on data transformation, not logging

## Schema Expectations (by role)

### Ingestion Agent
- **Input**: `task.data` (raw input)
- **Output**: `task.data` (normalized)
  - Must set: `content`, `contentType`, `timestamp`, `format`, `source`, `structure`
- **State**: Must set `state.ingestionComplete = true`

### Triage Agent
- **Input**: `task.data` (normalized)
- **Output**: `task.classification`
  - Must set: `type`, `confidence`, `route`
  - Optional: `indicators`, `flags`, `subtype`
- **State**: Must set `state.triageComplete = true`, `state.inputType`

### Summarization Agent
- **Input**: `task.data`, `task.classification`
- **Output**: `task.summary`
  - Must set: `fields` (type-specific), `extractionMethod`, `fieldsExtracted`, `completeness`, `keyValuePairs`
- **State**: Must set `state.summarizationComplete = true`

### Risk Agent
- **Input**: `task.summary`, `task.classification`, `task.data`
- **Output**: `task.riskScore`
  - Must set: `score`, `factors`, `flags`, `scoringMethod`, `confidence`
- **State**: Must set `state.riskScoringComplete = true`

### Output Agent
- **Input**: All previous task fields
- **Output**: `task.output` (FinalOutputSchema)
  - Must set: `humanSummary`, `timestamp`, `pipelineVersion`, `processingTime`, `schemaVersion`, `provenance`, `auditLog`, `pipeline`, `input`, `normalized`, `classification`, `summary`, `riskScore`, `status`, `validation`, `redactionSummary`, `humanReview`, `hash`, `errorDetails`
- **State**: Must set `state.outputComplete = true`

## Debug Mode

When `task.debug === true`:

1. **Append debug traces** to `task.debugTrace`:
   ```javascript
   if (task.debug) {
     task.debugTrace = task.debugTrace || [];
     task.debugTrace.push({
       agentId: this.agentId,
       role: this.role,
       timestamp: new Date().toISOString(),
       note: 'Classified as symptoms with 0.85 confidence',
       details: { /* ... */ }
     });
   }
   ```

2. **Avoid gating logic** that might skip agents
   - All agents should still execute
   - Debug mode is for observability, not changing behavior

3. **Add verbose logging** (optional)
   - Can log intermediate values to help with debugging
   - But still keep core logic unchanged

## Testing Requirements

Each agent must have:

1. **Unit tests** verifying:
   - Correct input schema validation
   - Expected output schema
   - Error handling for invalid inputs
   - Completion flag setting

2. **Integration tests** verifying:
   - Agent works in pipeline context
   - Doesn't break when receiving unexpected (but valid) inputs
   - Handles missing optional fields gracefully

3. **Contract validation** verifying:
   - Returns `{task, state}` structure
   - Sets expected completion flags
   - Maintains `state.processedBy` array

## Example Agent Structure

```javascript
class ExampleAgent {
  constructor(agentId) {
    this.agentId = agentId;
    this.role = 'EXAMPLE';
  }

  async run(task, state) {
    console.log(`[${this.agentId}] Processing...`);

    // Validate inputs
    if (!task || !task.data) {
      throw new Error('Invalid task: missing data');
    }

    // Debug trace
    if (task.debug) {
      task.debugTrace = task.debugTrace || [];
      task.debugTrace.push({
        agentId: this.agentId,
        timestamp: new Date().toISOString(),
        note: 'Started processing'
      });
    }

    // Process
    const result = this._process(task.data);

    // Return contract
    return {
      task: {
        ...task,
        exampleResult: result
      },
      state: {
        ...state,
        exampleComplete: true,
        processedBy: [...(state.processedBy || []), this.agentId]
      }
    };
  }

  _process(data) {
    // Implementation here
    return { processed: true };
  }
}

module.exports = {
  createExampleAgent: (agentId) => new ExampleAgent(agentId)
};
```

## Enforcement

This contract should be enforced via:

1. **Orchestrator validation** (already implemented in `medical-workflows.js`)
2. **Unit tests** for each agent
3. **CI/CD checks** that run contract validation
4. **Code reviews** ensuring new agents follow contract
5. **Smoke tests** (see `test-agents-smoke.js`)

## Version History

- **v1.0** (2026-02-16): Initial contract definition
- Medical module implements this contract

## See Also

- [MEDICAL_MODULE_ARCHITECTURE.md](./MEDICAL_MODULE_ARCHITECTURE.md) - Full architecture
- [schemas.js](../schemas.js) - Data schemas
- [orchestrator_wrapper.js](../orchestrator_wrapper.js) - Agent invocation wrapper
- [test-agents-smoke.js](../test-agents-smoke.js) - Contract validation tests
