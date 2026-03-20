# Federation Coordinator Spec

> Phase 10 — Proto-Consensus Engine
> Domain-agnostic. Production-grade. Deterministic.

---

## Overview

The Federation Coordinator aggregates signals from all orchestrators, detects convergent patterns, identifies systemic risks, and promotes or vetoes strategies.

### Properties

| Property | Value |
|----------|-------|
| **Stateless** | No persistent state required |
| **Deterministic** | Same input = same output |
| **Governance-first** | Never compromises safety |
| **Fault-tolerant** | Survives N-1 failures |

---

## Core Loop

```typescript
async function coordinatorLoop(queue: MessageQueue): Promise<void> {
  while (true) {
    const msg = await queue.next();
    
    // Pre-validation
    if (!validateSchema(msg)) { reject(msg); continue; }
    if (!validateSignature(msg)) { reject(msg); continue; }
    if (!validateTimestamp(msg)) { reject(msg); continue; }
    
    // Route by type
    switch (msg.type) {
      case 'TrendSummaryMessage':
        trendBuffer.add(msg);
        break;
        
      case 'RiskSignalMessage':
        const riskLevel = computeGlobalRisk();
        if (riskLevel > THRESHOLD) {
          broadcastVeto();
        }
        break;
        
      case 'ProposalPatternMessage':
        const patternConfidence = updatePatternDB(msg);
        if (patternConfidence > 0.80) {
          promotePattern(msg);
        }
        break;
    }
    
    checkHeartbeats();
  }
}
```

---

## Global Risk Scoring

### Algorithm

```typescript
function computeGlobalRisk(): number {
  const signals = getAllRiskSignals();
  
  const weightedScore = (
    countLevel(signals, 'LOW') * 0.1 +
    countLevel(signals, 'MEDIUM') * 0.4 +
    countLevel(signals, 'HIGH') * 0.8 +
    countLevel(signals, 'CRITICAL') * 1.0
  ) / signals.length;
  
  return weightedScore;
}

// Risk Bands
const RISK_BANDS = {
  LOW: { min: 0.0, max: 0.1, action: 'allow_any' },
  MEDIUM: { min: 0.1, max: 0.3, action: 'require_simulation' },
  HIGH: { min: 0.3, max: 0.7, action: 'multi_node_consensus' },
  CRITICAL: { min: 0.7, max: 1.0, action: 'freeze_evolution' }
};
```

---

## Strategy Promotion

```typescript
interface Pattern {
  name: string;
  occurrences: number;
  success_rate: number;
  average_improvement: number;
}

function promotePattern(pattern: Pattern): void {
  // Wait for convergence
  if (pattern.occurrences < 3) {
    return;
  }
  
  // Too risky
  if (pattern.success_rate < 0.80) {
    return;
  }
  
  broadcast('PatternPromotion', {
    pattern_name: pattern.name,
    success_rate: pattern.success_rate,
    target_clusters: ['all other nodes']
  });
}
```

---

## Veto Engine

```typescript
interface Veto {
  reason: string;
  risk_score: number;
  affected_nodes: string[];
  until: string; // ISO timestamp
}

function broadcastVeto(reason: string): void {
  const veto: Veto = {
    reason,
    risk_score: currentRiskScore,
    affected_nodes: ['all'],
    until: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
  };
  
  broadcast('GlobalVeto', veto);
}

// Veto renewal
function shouldRenewVeto(veto: Veto): boolean {
  return currentRiskScore > RISK_BANDS.HIGH.min;
}
```

---

## Failure Handling

### Node Dropout

```typescript
function handleNodeDropout(nodeId: string): void {
  const deadNodeCount = offlineNodes.size;
  const tolerableFailures = (totalNodes - 1) / 2;
  
  if (deadNodeCount > tolerableFailures) {
    escalate('Too many nodes down');
    enterSafeMode();
    return;
  }
  
  // Mark offline, continue with others
  offlineNodes.add(nodeId);
}
```

### Stale Messages

```typescript
function validateTimestamp(msg: Message): boolean {
  const age = Date.now() - new Date(msg.timestamp).getTime();
  
  // Too old (> 60 seconds)
  if (age > 60000) {
    return false;
  }
  
  // Clock skew (> 30 seconds in future)
  if (age < -30000) {
    return false;
  }
  
  return true;
}
```

### Idempotent Replay

```typescript
// All messages are idempotent - replay recovers state
interface ProcessedMessage {
  id: string;
  hash: string;
  processed_at: string;
}

function isDuplicate(msg: Message): boolean {
  return processedMessages.has(msg.id);
}

function markProcessed(msg: Message): void {
  processedMessages.set(msg.id, {
    id: msg.id,
    hash: computeHash(msg),
    processed_at: new Date().toISOString()
  });
}
```

---

## Safety Properties

| Property | Description |
|----------|-------------|
| Global Veto Supremacy | Veto overrides all other logic |
| No Sensitive Data | PII/logs never leave node |
| Drift < 20% | Evolution freezes if prediction off by >20% |
| Heartbeat 10s | Nodes must pulse every 10 seconds |
| Stateless | Deterministic recovery from message replay |

---

## Related

- [SAFETY_INVARIANTS_SPEC.md](./SAFETY_INVARIANTS_SPEC.md)
- [FEDERATION_SCHEMA_SPEC.md](./FEDERATION_SCHEMA_SPEC.md)
- [FEDERATION_PROTOCOL.md](./FEDERATION_PROTOCOL.md)
- [CONSENSUS_ENGINE_SPEC.md](./CONSENSUS_ENGINE_SPEC.md)
