# Dual Verification Protocol

## Overview

This document defines the **Dual Verification Protocol** for FreeAgent/Kilo - a governance pattern that ensures epistemic hygiene through isolated verification lanes.

> Pattern adapted from: Dual-Federation Swarm Architecture with Isolated Verification Lanes

---

## Core Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CENTRAL COCKPIT                                │
│                    (Arbiter / Consensus Engine)                          │
│         Compares L vs R, detects disagreements, escalates              │
└─────────────────────────────────────────────────────────────────────────┘
                    │                           │
                    ▼                           ▼
        ┌───────────────────┐       ┌───────────────────┐
        │   VERIFICATION    │       │   VERIFICATION    │
        │      LANE L       │       │      LANE R       │
        │  (Conservative)   │       │  (Adversarial)    │
        │                   │       │                   │
        │  Verify-L         │       │  Verify-R         │
        │      ↓            │       │      ↓            │
        │  Validate-L       │       │  Validate-R       │
        │                   │       │                   │
        │  - Policy check   │       │  - Stress test    │
        │  - Safety check   │       │  - Edge cases     │
        │  - Spec adherence │       │  - Robustness     │
        └───────────────────┘       └───────────────────┘
                    │                           │
                    └───────────┬─────────────────┘
                                ▼
                    ┌───────────────────┐
                    │    WORK TIER      │
                    │                   │
                    │  - Coder Agent   │
                    │  - Planner       │
                    │  - Researcher    │
                    │  - Optimizer     │
                    │  - Kilo          │
                    │  - FreeAgent     │
                    └───────────────────┘
```

---

## Tier Definitions

### 1. Work Tier

Agents that produce outputs:
- **Kilo** - Orchestrator
- **FreeAgent** - Primary agent
- **Coder** - Code generation
- **Planner** - Task planning
- **Researcher** - Information gathering
- **Optimizer** - Performance improvements

### 2. Verification Lane L (Conservative)

Strict, policy-heavy verification:
- **Verify-L**: Initial check
  - Safety policy compliance
  - Constraint adherence
  - Format validation
  - Security scanning
  
- **Validate-L**: Deep validation
  - Specification adherence
  - Correctness proof
  - Regression check against known-good states

### 3. Verification Lane R (Adversarial)

Creative, stress-test verification:
- **Verify-R**: Edge case exploration
  - What could go wrong?
  - Missing error conditions
  - Race conditions
  - Resource exhaustion
  
- **Validate-R**: Robustness testing
  - Adversarial inputs
  - Boundary conditions
  - Failure mode analysis

---

## Message Schemas

### Work Result

```typescript
interface WorkResult {
  id: string;
  agent: string;
  task: string;
  output: any;
  confidence: number;        // 0-1
  metadata: {
    model: string;
    tokens: number;
    duration: number;
    timestamp: string;
  };
}
```

### Verification Report

```typescript
interface VerificationReport {
  id: string;
  lane: 'L' | 'R';
  workId: string;
  verdict: 'PASS' | 'FAIL' | 'CONDITIONAL';
  checks: {
    name: string;
    passed: boolean;
    severity: 'critical' | 'warning' | 'info';
    message: string;
    evidence?: any;
  }[];
  confidence: number;
  recommendations?: string[];
  timestamp: string;
}
```

### Consensus Payload

```typescript
interface ConsensusPayload {
  workId: string;
  workResult: WorkResult;
  laneL: VerificationReport;
  laneR: VerificationReport;
  agreement: 'FULL' | 'PARTIAL' | 'DISAGREE';
  consensusScore: number;    // 0-1
  resolvedOutput?: any;
  escalationRequired: boolean;
  timestamp: string;
}
```

---

## Consensus Mechanisms

### Agreement Scoring

| L Verdict | R Verdict | Agreement |
|-----------|-----------|-----------|
| PASS | PASS | FULL |
| PASS | CONDITIONAL | PARTIAL |
| CONDITIONAL | PASS | PARTIAL |
| CONDITIONAL | CONDITIONAL | PARTIAL |
| FAIL | * | DISAGREE |
| * | FAIL | DISAGREE |
| PASS | FAIL | DISAGREE |

### Decision Logic

```
IF agreement == FULL:
    output = workResult.output
    status = GREEN
    
ELIF agreement == PARTIAL:
    output = weightedMerge(workResult, laneL, laneR)
    status = YELLOW
    log.warning("Partial disagreement - review recommended")
    
ELIF agreement == DISAGREE:
    IF laneL.verdict == FAIL:
        output = null
        status = RED
        escalate = true
    ELSE:
        // R failed but L passed - flag for human review
        output = workResult.output
        status = YELLOW
        escalate = true
```

---

## Implementation

### Basic Usage

```javascript
const { DualVerifier } = require('./services/dualVerifier');

const verifier = new DualVerifier();

// Work tier produces output
const workResult = await coderAgent.generate(request);

// Send to both lanes simultaneously
const [laneL, laneR] = await Promise.all([
  verifier.verifyLaneL(workResult),
  verifier.verifyLaneR(workResult)
]);

// Cockpit computes consensus
const consensus = verifier.computeConsensus(workResult, laneL, laneR);

if (consensus.escalationRequired) {
  await cockpit.escalate(consensus);
} else {
  await cockpit.finalize(consensus);
}
```

### Lane Configuration

```javascript
const verifier = new DualVerifier({
  laneL: {
    strict: true,
    checks: ['safety', 'policy', 'security', 'format'],
    failOnFirst: true
  },
  laneR: {
    adversarial: true,
    checks: ['edge_cases', 'robustness', 'stress_test'],
    failOnFirst: false
  },
  consensus: {
    threshold: 0.7,
    autoResolve: true
  }
});
```

---

## Integration Points

### With Orchestrator

```javascript
// In orchestrator.js
async function processTask(task) {
  // 1. Work tier produces
  const result = await workTier.execute(task);
  
  // 2. Dual verification
  const [l, r] = await Promise.all([
    verifier.verifyLaneL(result),
    verifier.verifyLaneR(result)
  ]);
  
  // 3. Consensus
  const decision = verifier.computeConsensus(result, l, r);
  
  // 4. Execute or escalate
  if (decision.escalationRequired) {
    return await cockpit.humanReview(decision);
  }
  
  return decision.output;
}
```

### With Existing Agents

The protocol wraps any agent:

```javascript
const wrappedAgent = wrapWithVerification(agent, {
  verifyOnComplete: true,
  lanes: ['L', 'R']
});
```

---

## Fault Tolerance

### Lane Isolation

- Each lane operates in completely separate context
- Failure in one lane does not affect the other
- Lane state is isolated (no shared memory)

### Recovery

```
IF laneL fails:
    mark laneL as UNAVAILABLE
    use laneR output only
    flag for review
    
IF laneR fails:
    mark laneR as UNAVAILABLE
    use laneL output only  
    flag for review

IF both fail:
    ESCALATE to human immediately
```

---

## Monitoring

### Metrics to Track

| Metric | Description |
|--------|-------------|
| `verification_lane_l_pass_rate` | % of work passing Lane L |
| `verification_lane_r_pass_rate` | % of work passing Lane R |
| `consensus_full_agreement` | % with full L/R agreement |
| `consensus_escalation_rate` | % requiring human review |
| `verification_latency` | Time for dual verification |
| `lane_disagreement_correlation` | Which checks commonly disagree |

---

## Phased Implementation

### Phase 1: Basic Protocol
- [ ] Create `DualVerifier` service
- [ ] Define message schemas
- [ ] Implement consensus logic
- [ ] Add to orchestrator

### Phase 2: Lane Isolation
- [ ] Separate contexts for L vs R
- [ ] Independent check implementations
- [ ] Add adversarial checks to R

### Phase 3: Cockpit Integration
- [ ] UI for disagreement visualization
- [ ] Human review workflow
- [ ] Consensus history tracking

### Phase 4: Advanced
- [ ] Dynamic lane weighting
- [ ] Learning from escalations
- [ ] Automated lane improvement

---

## Related

- [persistentAgentMemory.js](./persistentAgentMemory.js) - Memory layer for verification history
- [memory.js](./memory.js) - Vector memory for semantic verification
- [sessions.js](./sessions.js) - Session state with verification status
