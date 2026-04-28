# Governance Layer Spec

This file is an operational guide for the FreeAgent runtime. Constitutional governance resides in the 4-lane lattice. In case of conflict, lattice rules prevail.

> Domain-agnostic. Production-grade. Deterministic.

---


## 1. Core Governance Contract

### 1.1 Action Gating

Every action must pass through governance before execution:

```
Observe → Analyze → Strategize → Simulate → PROPOSE → GOVERN → ACT → Learn
                                                          ↑
                                                    [GATEKEEPER]
```

### 1.2 Governance Rules

```typescript
interface GovernanceRule {
  id: string;
  name: string;
  condition: (action: Action) => boolean;
  check: (action: Action) => Promise<GovernanceResult>;
  fallback?: 'allow' | 'deny' | 'escalate';
  priority: number;
}
```

### 1.3 Default Rules

| Rule | Condition | Check | Fallback |
|------|-----------|-------|----------|
| **Safety Check** | All actions | No harmful commands | deny |
| **Resource Cap** | All actions | Within limits | deny |
| **Auth Check** | Cockpit actions | Valid token | deny |
| **Rate Limit** | All actions | Under threshold | deny |
| **Consensus** | High-impact actions | Dual-lane agreement | escalate |

---

## 2. Governance Decision Types

### 2.1 Decision Matrix

```
                    Impact Level
                 Low    Medium    High
              ┌────────┬────────┬────────┐
     Low      │ ALLOW  │ ALLOW  │ REVIEW │
  Confidence  ├────────┼────────┼────────┤
     High     │ ALLOW  │ REVIEW │ DENY   │
              └────────┴────────┴────────┘
```

### 2.2 Decision Types

```typescript
type Decision = 
  | { type: 'allow'; confidence: number }
  | { type: 'deny'; reason: string; confidence: number }
  | { type: 'review'; reviewers: string[] }
  | { type: 'escalate'; escalateTo: string; reason: string }
  | { type: 'modify'; modifications: ActionDiff };
```

### 2.3 Confidence Scoring

```typescript
function calculateConfidence(action: Action, history: HistoryEntry[]): number {
  const baseScore = 1.0;
  
  // Reduce confidence for:
  const penalties = {
    newAgent: -0.2,
    highImpact: -0.15,
    unusualTime: -0.1,
    firstTimeAction: -0.1,
    highFrequency: -0.1
  };
  
  // Increase confidence for:
  const bonuses = {
    verifiedAgent: +0.2,
    lowImpact: +0.15,
    repeatedAction: +0.1,
    consensus: +0.15
  };
  
  return clamp(baseScore + sum(bonuses) - sum(penalties), 0, 1);
}
```

---

## 3. Review Workflows

### 3.1 Dual Verification Lane

See [DUAL_VERIFICATION_PROTOCOL.md](./DUAL_VERIFICATION_PROTOCOL.md)

### 3.2 Escalation Path

```typescript
interface EscalationPath {
  level: number;
  name: string;
  actors: string[];
  timeout: number; // ms
  onTimeout: 'auto_allow' | 'auto_deny' | 'continue';
}

const defaultEscalation: EscalationPath[] = [
  { level: 1, name: 'peer_review', actors: ['*'], timeout: 30000, onTimeout: 'auto_deny' },
  { level: 2, name: 'senior_review', actors: ['senior'], timeout: 60000, onTimeout: 'auto_deny' },
  { level: 3, name: 'human_review', actors: ['human'], timeout: 300000, onTimeout: 'continue' }
];
```

---

## 4. Action Modification

### 4.1 Modification Types

```typescript
type Modification = 
  | { op: 'add_constraint'; constraint: Constraint }
  | { op: 'reduce_scope'; reduction: number }
  | { op: 'add_rollback'; rollback: Action }
  | { op: 'delay'; delay: number }
  | { op: 'require_approval'; approver: string };
```

### 4.2 Modification Application

```typescript
function applyModifications(action: Action, mods: Modification[]): Action {
  let modified = { ...action };
  
  for (const mod of mods) {
    switch (mod.op) {
      case 'add_constraint':
        modified.constraints = [...(modified.constraints || []), mod.constraint];
        break;
      case 'reduce_scope':
        modified.params.scope = modified.params.scope * (1 - mod.reduction);
        break;
      case 'add_rollback':
        modified.rollback = mod.rollback;
        break;
      case 'delay':
        modified.executeAfter = Date.now() + mod.delay;
        break;
      case 'require_approval':
        modified.requiredApproval = mod.approver;
        break;
    }
  }
  
  return modified;
}
```

---

## 5. Governance Metrics

### 5.1 Tracked Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|------------------|
| `governance.total` | Total actions processed | N/A |
| `governance.allowed` | Actions allowed | N/A |
| `governance.denied` | Actions denied | > 20% |
| `governance.review` | Actions sent to review | > 30% |
| `governance.escalated` | Actions escalated | > 10% |
| `governance.latency` | Avg decision time | > 500ms |
| `governance.modified` | Actions modified | > 15% |

### 5.2 Audit Log

```typescript
interface GovernanceAuditEntry {
  timestamp: string;
  actionId: string;
  agentId: string;
  decision: Decision;
  rulesApplied: string[];
  latency: number;
  modifiers?: Modification[];
}
```

---

## 6. Configuration

### 6.1 Governance Config

```typescript
interface GovernanceConfig {
  enabled: boolean;
  defaultDecision: 'allow' | 'deny';
  confidenceThreshold: {
    low: 0.3,
    medium: 0.6,
    high: 0.85
  };
  rules: GovernanceRule[];
  escalationPaths: EscalationPath[];
  maxReviewTime: number;
  enableDualLane: boolean;
}
```

---

## Related

- [DUAL_VERIFICATION_PROTOCOL.md](./DUAL_VERIFICATION_PROTOCOL.md)
- [GOVERNED_ACTION_PIPELINE.md](./GOVERNED_ACTION_PIPELINE.md)
- [RESILIENCE_LAYER_SPEC.md](./RESILIENCE_LAYER_SPEC.md)
