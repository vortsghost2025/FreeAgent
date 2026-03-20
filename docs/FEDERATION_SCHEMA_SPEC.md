# Federation Schema Spec

> Phase 10 — Wire Format Contracts
> Domain-agnostic. Production-grade. Deterministic.

---

## Message Structure

```typescript
interface FederationMessage {
  message_type: MessageType;
  schema_version: string;
  node_id: string;
  timestamp: string; // ISO 8601
  signature: string; // SHA-256 hex
  payload: any;
}

type MessageType = 
  | 'TrendSummaryMessage'
  | 'GovernanceDeltaMessage'
  | 'RiskSignalMessage'
  | 'ProposalPatternMessage'
  | 'HeartbeatMessage'
  | 'GlobalVeto'
  | 'PatternPromotion';
```

---

## Safety Rules

| Rule | Value |
|------|-------|
| No raw logs | Forbidden |
| No tenant IDs or PII | Forbidden |
| No internal traces | Forbidden |
| Max message size | 32 KB |
| All messages signed | Mandatory |
| All messages timestamped | Mandatory |

---

## Message Types

### 1. TrendSummaryMessage

```typescript
interface TrendSummaryMessage {
  message_type: 'TrendSummaryMessage';
  cluster_name: string;
  latency_trend: 'IMPROVING' | 'STABLE' | 'DEGRADING';
  memory_trend: 'IMPROVING' | 'STABLE' | 'DEGRADING';
  error_trend: 'IMPROVING' | 'STABLE' | 'DEGRADING';
  improvement_rate: number; // 0.0-1.0
  observation_count: number;
}

// Example
{
  "message_type": "TrendSummaryMessage",
  "schema_version": "1.0",
  "node_id": "orchestrator-001",
  "timestamp": "2026-02-17T18:30:00Z",
  "signature": "a1b2c3d4...",
  "payload": {
    "cluster_name": "production",
    "latency_trend": "IMPROVING",
    "memory_trend": "STABLE",
    "error_trend": "DEGRADING",
    "improvement_rate": 0.15,
    "observation_count": 10
  }
}
```

### 2. RiskSignalMessage

```typescript
interface RiskSignalMessage {
  message_type: 'RiskSignalMessage';
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reason: string;
  affected_nodes: string[];
  recommendation: string;
}

// Example
{
  "message_type": "RiskSignalMessage",
  "schema_version": "1.0",
  "node_id": "orchestrator-001",
  "timestamp": "2026-02-17T18:30:00Z",
  "signature": "e5f6g7h8...",
  "payload": {
    "risk_level": "HIGH",
    "reason": "drift_exceeds_threshold",
    "affected_nodes": ["orchestrator-001", "orchestrator-002"],
    "recommendation": "PAUSE_EVOLUTION"
  }
}
```

### 3. ProposalPatternMessage

```typescript
interface ProposalPatternMessage {
  message_type: 'ProposalPatternMessage';
  pattern_name: string;
  success_rate: number; // 0.0-1.0
  average_improvement: number; // 0.0-1.0
  occurrences_across_clusters: number;
}

// Example
{
  "message_type": "ProposalPatternMessage",
  "schema_version": "1.0",
  "node_id": "orchestrator-001",
  "timestamp": "2026-02-17T18:30:00Z",
  "signature": "i9j0k1l2...",
  "payload": {
    "pattern_name": "small-index-consolidation",
    "success_rate": 0.89,
    "average_improvement": 0.42,
    "occurrences_across_clusters": 3
  }
}
```

### 4. HeartbeatMessage

```typescript
interface HeartbeatMessage {
  message_type: 'HeartbeatMessage';
  is_healthy: boolean;
  last_optimization: string; // ISO 8601
  proposal_count: number;
  success_rate: number; // 0.0-1.0
}

// Example
{
  "message_type": "HeartbeatMessage",
  "schema_version": "1.0",
  "node_id": "orchestrator-001",
  "timestamp": "2026-02-17T18:30:00Z",
  "signature": "m3n4o5p6...",
  "payload": {
    "is_healthy": true,
    "last_optimization": "2026-02-17T18:15:00Z",
    "proposal_count": 15,
    "success_rate": 0.92
  }
}
```

### 5. GlobalVeto

```typescript
interface GlobalVeto {
  message_type: 'GlobalVeto';
  reason: string;
  risk_score: number;
  affected_nodes: string[];
  until: string; // ISO 8601
  issued_by: string;
}

// Example
{
  "message_type": "GlobalVeto",
  "schema_version": "1.0",
  "node_id": "coordinator",
  "timestamp": "2026-02-17T18:30:00Z",
  "signature": "q7r8s9t0...",
  "payload": {
    "reason": "global_risk_exceeded",
    "risk_score": 0.75,
    "affected_nodes": ["orchestrator-001", "orchestrator-002", "orchestrator-003"],
    "until": "2026-02-17T18:35:00Z",
    "issued_by": "coordinator"
  }
}
```

---

## Validation Rules

| Check | Rule |
|-------|------|
| Schema | All required fields present |
| Signature | Valid SHA-256 |
| Timestamp | Within ±30 seconds |
| Size | < 32 KB |

---

## Field Constraints

### Required Fields (All Messages)

```typescript
const REQUIRED_FIELDS = [
  'message_type',
  'schema_version', 
  'node_id',
  'timestamp',
  'signature',
  'payload'
];
```

### Forbidden Fields (All Payloads)

```typescript
const FORBIDDEN_FIELDS = [
  'raw_logs',
  'tenant_id', 
  'user_id',
  'config',
  'trace',
  'pii',
  'detailed_error',
  'stack_trace'
];
```

### Allowed Trend Values

```typescript
const TREND_VALUES = ['IMPROVING', 'STABLE', 'DEGRADING'];
const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
```

---

## Routing Semantics

| Message Type | Sender | Receiver | Conditions |
|--------------|--------|----------|------------|
| TrendSummaryMessage | Orchestrator | Coordinator | Any time |
| RiskSignalMessage | Orchestrator | Coordinator | On risk change |
| ProposalPatternMessage | Orchestrator | Coordinator | On pattern detected |
| HeartbeatMessage | Orchestrator | Coordinator | Every 10s |
| GlobalVeto | Coordinator | All | On risk threshold |
| PatternPromotion | Coordinator | All | On confidence > 80% |

---

## Version Compatibility

| Version | Compatibility |
|---------|---------------|
| 1.0 | Initial |
| Forward | Add optional fields only |
| Backward | Ignore unknown fields |

---

## Related

- [SAFETY_INVARIANTS_SPEC.md](./SAFETY_INVARIANTS_SPEC.md)
- [FEDERATION_COORDINATOR_SPEC.md](./FEDERATION_COORDINATOR_SPEC.md)
- [FEDERATION_PROTOCOL.md](./FEDERATION_PROTOCOL.md)
