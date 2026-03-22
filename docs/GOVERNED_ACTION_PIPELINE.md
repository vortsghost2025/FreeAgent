# Governed Action Pipeline

## Overview

A domain-agnostic governance framework for autonomous agents. Adapted from the Elasticsearch Optimization Pipeline but applicable to any agent system.

> Core invariant: **No changes applied without governance approval.**

---

## The Pipeline

```
┌─────────┐   ┌─────────┐   ┌──────────┐   ┌─────────┐   ┌─────────┐   ┌──────────┐   ┌───────┐   ┌────────┐
│ Observe │ → │ Analyze │ → │Strategize│ → │ Simulate│ → │ Propose │ → │ Govern  │ → │  Act  │ → │ Learn  │
│ (Phase8)│   │         │   │ (Phase9) │   │(Phase12)│   │(Phase13)│   │ (PhaseE)│   │       │   │(Phase11)│
└─────────┘   └─────────┘   └──────────┘   └─────────┘   └─────────┘   └──────────┘   └───────┘   └────────┘
```

### Phase 1: Observe

Gather current state:
- Metrics, logs, events
- External system state
- User requests
- Time-series data

### Phase 2: Analyze

Process observations:
- Detect anomalies or degradation
- Identify root causes
- Prioritize issues
- Extract opportunities

### Phase 3: Strategize

Select approach:
- **Performance-First**: Aggressive optimization
- **Balanced**: Tradeoff across metrics
- **Stability-Focused**: Conservative improvement

### Phase 4: Simulate

Predict outcomes:
- Generate 3-5 scenarios
- Deterministic simulation
- Impact prediction
- Confidence scoring

### Phase 5: Propose

Create options:
- Ranked proposals
- Impact, confidence, risk scores
- Tradeoff documentation

### Phase 6: Govern (The Gate)

**Hard validation before any action:**

| Check | Threshold |
|-------|-----------|
| Confidence | ≥ 85% |
| Risk Level | ≤ MEDIUM |
| System Health | ≠ CRITICAL |
| Rollback Plan | Available |
| Recent Failures | None in last N minutes |
| Drift Check | No violations |

**If ALL pass → Proceed to Act**
**If ANY fail → Reject or Escalate**

### Phase 7: Act

Execute approved proposal:
- Pre-flight safety checks
- Implementation
- Change recording
- Rollback capability (configurable window)

### Phase 8: Learn

Post-action:
- Store patterns discovered
- Update confidence scores
- Broadcast to peers (federation)
- Update failure history

---

## Autonomy Levels

### Level 1: Supervised

- Governance always requires human acknowledgment
- Cockpit asks before every action
- Use: High-risk environments, initial deployment

### Level 2: Semi-Autonomous

- Auto-approve LOW risk
- Escalate MEDIUM risk to human
- Reject HIGH risk automatically
- Use: Production with oversight

### Level 3: Fully Autonomous

- Auto-approve all governance-passing proposals
- Background escalation only
- Use: Mature systems, trusted environments

---

## Safety Checklist (Governance Gate)

Every action must pass:

```typescript
interface SafetyCheck {
  name: string;
  threshold: any;
  current: any;
  passed: boolean;
}

const safetyChecklist = [
  { name: 'confidence', threshold: 0.85, passed: conf >= 0.85 },
  { name: 'riskLevel', threshold: 'MEDIUM', passed: risk <= 'MEDIUM' },
  { name: 'systemHealth', threshold: '!CRITICAL', passed: health !== 'CRITICAL' },
  { name: 'rollbackAvailable', threshold: true, passed: !!rollbackPlan },
  { name: 'recentFailures', threshold: 0, passed: failureCount === 0 },
  { name: 'driftViolations', threshold: 0, passed: drift === 0 },
];

const approved = safetyChecklist.every(c => c.passed);
```

---

## Implementation

### Basic Usage

```javascript
const { GovernedPipeline } = require('./services/governedPipeline');

const pipeline = new GovernedPipeline({
  autonomyLevel: 'semi',  // supervised | semi | full
  governance: {
    minConfidence: 0.85,
    maxRiskLevel: 'MEDIUM',
    rollbackWindow: 300000,  // 5 minutes
    failureCooldown: 60000   // 1 minute
  }
});

// Execute governed action
const result = await pipeline.execute({
  observe: () => gatherMetrics(),
  analyze: (metrics) => detectIssues(metrics),
  strategize: (issues) => selectStrategy(issues),
  simulate: (strategy) => runSimulation(strategy),
  propose: (simulation) => generateProposals(simulation),
  act: (proposal) => applyProposal(proposal),
  learn: (result) => recordOutcome(result)
});
```

### Integration with Orchestrator

```javascript
// In orchestrator.js
async function handleTask(task) {
  // Build pipeline for this task
  const pipeline = new GovernedPipeline(task.config);
  
  // Execute with full governance
  const result = await pipeline.execute(task);
  
  if (result.governance.approved) {
    return result.output;
  } else {
    return await cockpit.escalate(result.governance);
  }
}
```

### Governance Hooks

```javascript
const pipeline = new GovernedPipeline({
  onGovernanceCheck: async (checklist) => {
    // Custom logging
    log.info('Governance check', checklist);
    
    // External validation
    await externalAudit.record(checklist);
  },
  
  onEscalation: async (proposal, reasons) => {
    await notify.human(proposal, reasons);
  },
  
  onRollback: async (action, reason) => {
    await executeRollback(action);
    await notify.team(action, reason);
  }
});
```

---

## Federation & Learning

After each action (Phase 8):

```javascript
async function learn(action, outcome) {
  // 1. Store pattern
  await memory.learnPattern({
    name: action.type,
    effectiveness: outcome.success ? 1 : 0,
    context: action.context
  });
  
  // 2. Update confidence
  if (outcome.success) {
    await patterns.increaseConfidence(action.pattern);
  } else {
    await patterns.decreaseConfidence(action.pattern);
  }
  
  // 3. Broadcast to peers (if federated)
  if (federation.enabled) {
    await federation.broadcast({
      type: 'pattern_update',
      pattern: action.pattern,
      confidence: outcome.confidence
    });
  }
}
```

---

## Monitoring

### Key Metrics

| Metric | Description |
|--------|-------------|
| `pipeline_execution_time` | Total time Observe→Learn |
| `governance_approval_rate` | % passing governance |
| `governance_rejection_rate` | % rejected by safety checks |
| `escalation_rate` | % requiring human input |
| `simulation_accuracy` | Predicted vs actual outcomes |
| `rollback_frequency` | How often rollbacks occur |
| `autonomy_level` | Current level in effect |

---

## Related

- [DUAL_VERIFICATION_PROTOCOL.md](./DUAL_VERIFICATION_PROTOCOL.md) - Dual lane verification
- [persistentAgentMemory.js](./persistentAgentMemory.js) - Learning & pattern storage
- [memory.js](./memory.js) - Vector memory for context
