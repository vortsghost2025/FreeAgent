# Safety Invariants Spec

> Phase 10 — Federated Evolution Safety Contract
> Domain-agnostic. Production-grade. Non-negotiable.

---

## Overview

These invariants define what **must always be true** in a federated system. Violating any invariant is a **CRITICAL FAILURE** requiring immediate intervention.

---

## 1. Governance Invariants

### 1.1 Global Veto Supremacy

| Property | Value |
|----------|-------|
| **Invariant** | If federation issues global veto, no node may proceed with evolution |
| **Enforcement** | Coordinator broadcasts veto with timestamp |
| **Behavior** | All nodes pause evolution for 5 minutes |
| **Renewal** | Veto can be renewed or lifted explicitly |
| **Violation** | Node applies proposal during veto = CRITICAL FAILURE |

```typescript
interface GlobalVeto {
  reason: string;
  risk_score: number;
  affected_nodes: string[];
  until: string; // ISO timestamp
  issued_by: string;
}

// On receive
function handleVeto(veto: GlobalVeto): void {
  if (Date.now() < new Date(veto.until).getTime()) {
    evolutionPaused = true;
    log(`Evolution paused until ${veto.until}: ${veto.reason}`);
  }
}
```

### 1.2 Local Autonomy Boundaries

| Property | Value |
|----------|-------|
| **Invariant** | Nodes may evolve within their risk envelope only |
| **Enforcement** | Each node has `max_risk_level` (LOW, MEDIUM) |
| **Throttling** | Coordinator throttles proposals exceeding envelope |
| **Violation** | Node proposes HIGH risk when max is MEDIUM = ESCALATION |

```typescript
interface RiskEnvelope {
  node_id: string;
  max_risk_level: 'LOW' | 'MEDIUM';
  current_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

function canPropose(proposal: Proposal, envelope: RiskEnvelope): boolean {
  const levels = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };
  return levels[proposal.risk_level] <= levels[envelope.max_risk_level];
}
```

### 1.3 Governance Consistency

| Property | Value |
|----------|-------|
| **Invariant** | All nodes operate under same governance version |
| **Enforcement** | Coordinator broadcasts `governance_version` |
| **Rejection** | Nodes reject proposals from different versions |

---

## 2. Data Safety Invariants

### 2.1 No Sensitive Data Leaves a Node

| Allowed | Forbidden |
|---------|-----------|
| Aggregated trends (IMPROVING, STABLE, DEGRADING) | Raw logs |
| Risk levels (LOW, MEDIUM, HIGH, CRITICAL) | Tenant identifiers |
| Confidence scores (numeric) | User IDs |
| Pattern names (generic) | Configuration details |

**Enforcement:** Schema validation rejects forbidden fields.

```typescript
const FORBIDDEN_FIELDS = [
  'raw_logs', 'tenant_id', 'user_id', 
  'config', 'trace', 'pii', 'timestamps'
];

function validateNoSensitiveData(message: any): boolean {
  const fields = JSON.stringify(message);
  return !FORBIDDEN_FIELDS.some(f => fields.includes(f));
}
```

### 2.2 Message Size Limit

| Property | Value |
|----------|-------|
| **Invariant** | No message may exceed 32 KB |
| **Enforcement** | Oversized messages rejected |

### 2.3 Mandatory Signing

| Property | Value |
|----------|-------|
| **Invariant** | All messages must be cryptographically signed |
| **Empty signature** | REJECT |
| **Invalid signature** | REJECT |

---

## 3. Risk & Drift Invariants

### 3.1 Drift Cannot Exceed Threshold

| Condition | Action |
|-----------|--------|
| Drift > 20% | Set risk_level = HIGH |
| Drift > 50% | Trigger automatic veto |
| Drift ≤ 20% | Normal operation |

### 3.2 Systemic Risk Detection

| Property | Value |
|----------|-------|
| **Invariant** | If 2+ nodes report HIGH risk, federation must escalate globally |
| **Enforcement** | Coordinator monitors risk aggregation |

### 3.3 Simulation Before Action

| Property | Value |
|----------|-------|
| **Invariant** | No proposal may be applied without Phase 12 simulation |
| **Threshold** | Simulation success < 80% = reject proposal |

---

## 4. Liveness & Fault Tolerance

### 4.1 Heartbeat Requirement

| Property | Value |
|----------|-------|
| **Interval** | Every 10 seconds |
| **Timeout** | 15 seconds |
| **Missed** | 2 missed = node marked OFFLINE |
| **Silent** | >30s silent = escalate |

### 4.2 Node Dropout Tolerance

| Property | Value |
|----------|-------|
| **Invariant** | Federation survives N-1 nodes offline |
| **Toleration** | Up to (N-1)/2 nodes down |
| **Above threshold** | SAFE_MODE |

### 4.3 Stateless Coordinator

| Property | Value |
|----------|-------|
| **Invariant** | Coordinator stores nothing required for safety |
| **Recovery** | All decisions deterministic from message stream |
| **Replay** | Restart = message replay recovers state |

---

## 5. Validation Framework

### 5.1 Pre-Validation (Every Message)

| Check | Rule |
|-------|------|
| Schema | Required fields present, no forbidden fields |
| Signature | Valid SHA-256 |
| Timestamp | ±30 seconds |

### 5.2 Post-Validation

| Check | Rule |
|-------|------|
| Risk Envelope | Proposal within node's max risk |
| Governance | Same version as coordinator |
| Drift | Outcome deviation ≤ 20% |

---

## Summary Table

| Invariant | Check | Result |
|-----------|-------|--------|
| Global Veto | Active? | PAUSE |
| Data Safety | Forbidden fields? | REJECT |
| Drift | Outcome > 20%? | ESCALATE |
| Heartbeat | Silent > 15s? | OFFLINE |
| Stateless | State lost? | REPLAY |

---

## Related

- [FEDERATION_COORDINATOR_SPEC.md](./FEDERATION_COORDINATOR_SPEC.md)
- [FEDERATION_SCHEMA_SPEC.md](./FEDERATION_SCHEMA_SPEC.md)
- [FEDERATION_PROTOCOL.md](./FEDERATION_PROTOCOL.md)
