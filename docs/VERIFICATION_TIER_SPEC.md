# Verification Tier Spec

> Dual-Federation Swarm with Isolated Verification Lanes
> Domain-agnostic. Production-grade. Deterministic.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      DUAL-FEDERATION SWARM                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │              GLOBAL WORK TIER (SHARED)                          │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │    │
│  │  │ Coding  │ │Research │ │Planner  │ │Optimizer│            │    │
│  │  │ Agent   │ │ Agent   │ │ Agent   │ │ Agent   │            │    │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘            │    │
│  │                                                                 │    │
│  │              Shared Task Queue, Data Pool                       │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │           VERIFICATION TIERS (STRICTLY ISOLATED)               │    │
│  │                                                                  │    │
│  │  ┌─────────────────────┐    ┌─────────────────────┐           │    │
│  │  │    VERIFY-L         │    │    VERIFY-R         │           │    │
│  │  │  ┌─────────┐ ┌─────┐ │    │  ┌─────────┐ ┌─────┐ │           │    │
│  │  │  │Verify  │ │Valid│ │    │  │Verify  │ │Valid│ │           │    │
│  │  │  │Agent L │ │Agt L│ │    │  │Agent R │ │Agt R│ │           │    │
│  │  │  └─────────┘ └─────┘ │    │  └─────────┘ └─────┘ │           │    │
│  │  └─────────────────────┘    └─────────────────────┘           │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │        CENTRAL COCKPIT (HUMAN ARBITER + CONSENSUS ENGINE)       │    │
│  │  ┌─────────┐                     ┌─────────────────────────┐  │    │
│  │  │ Human   │                     │ Consensus Engine        │  │    │
│  │  │ Arbiter │                     │ • Compare L vs R        │  │    │
│  │  └─────────┘                     │ • Score confidence      │  │    │
│  │                                   │ • Detect anomalies       │  │    │
│  │                                   │ • Handle disagreements   │  │    │
│  │                                   └─────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Tier Architecture

### 1.1 Three-Tier Model

| Tier | Function | Isolation | Examples |
|------|----------|-----------|----------|
| **Work Tier** | Generative, analytical, planning | Shared | Coding, Research, Planner, Optimizer |
| **Verification Tier** | Correctness, compliance, safety | Strictly Isolated | Verify-L, Verify-R, Validate-L, Validate-R |
| **Consensus Tier** | Arbitration, scoring, escalation | Central | Human Arbiter, Consensus Engine |

### 1.2 Tier Communication

```
Work Tier → [Verify-L → Validate-L] → Consensus
         → [Verify-R → Validate-R] → Consensus
                      ↓
              Human Arbiter (tiebreaker)
```

---

## 2. Verification Lane Isolation

### 2.1 Isolation Layers

| Layer | Mechanism | Implementation |
|-------|-----------|-----------------|
| **Namespace** | Prefix separation | `verify-l-*` vs `verify-r-*` |
| **Channel** | Separate message buses | Distinct WebSocket channels |
| **Memory** | Sandboxing | Separate memory pools |
| **Process** | Independent environments | Separate agent processes |

### 2.2 Isolation Rules

```typescript
// Lane routing
const LANE_PREFIXES = {
  L: 'verify-l-',
  R: 'verify-r-'
};

// Message routing rules
function routeToLane(message: Message, lane: 'L' | 'R'): boolean {
  const prefix = LANE_PREFIXES[lane];
  return message.destination.startsWith(prefix);
}

// State partitioning
function getLaneMemory(lane: 'L' | 'R'): MemorySubstrate {
  return lane === 'L' ? memoryL : memoryR;
}
```

### 2.3 Verification Pipeline

```
Work Output → [Verify Agent] → [Validation Agent] → Consensus
                    ↓                 ↓
              Isolated Check    Isolated Check
              Independent       Independent
              Criteria          Criteria
```

---

## 3. Consensus Mechanisms

### 3.1 Comparison Algorithms

```typescript
interface ComparisonResult {
  consensus: 'match' | 'mismatch' | 'anomaly';
  confidenceDelta: number;
  discrepancies: Discrepancy[];
  recommendation: 'accept' | 'reject' | 'escalate' | 'refine';
}

function compareLanes(left: VerificationReport, right: VerificationReport): ComparisonResult {
  // Semantic diffing
  const discrepancies = semanticDiff(left, right);
  
  // Confidence scoring
  const confidenceDelta = Math.abs(left.confidence - right.confidence);
  
  // Anomaly detection
  const isAnomaly = detectAnomaly(left, right);
  
  // Decision logic
  if (discrepancies.length === 0 && confidenceDelta < 0.1) {
    return { consensus: 'match', ... };
  } else if (discrepancies.length > 0 || confidenceDelta > 0.3) {
    return { consensus: 'mismatch', ... };
  } else if (isAnomaly) {
    return { consensus: 'anomaly', ... };
  }
}
```

### 3.2 Decision Thresholds

| Scenario | Threshold | Action |
|----------|-----------|--------|
| Match | Δconf < 0.1, 0 discrepancies | **Accept** |
| Mismatch | Δconf > 0.3, discrepancies > 0 | **Escalate** |
| Anomaly | Statistical outlier detected | **Refine** |
| Tie | Equal confidence, conflicting | **Human Review** |

---

## 4. Message Schemas

### 4.1 Work Result Schema

```typescript
interface WorkResult {
  id: string;
  timestamp: string;
  sourceAgent: string; // 'coding' | 'research' | 'planning' | 'optimization'
  resultType: string;
  payload: Record<string, any>;
  dependencies: string[];
  verifiable: boolean;
  verificationArtifacts: string[];
}
```

### 4.2 Verification Report Schema

```typescript
interface VerificationReport {
  id: string;
  timestamp: string;
  sourceLane: 'L' | 'R';
  taskId: string;
  verifierId: string;
  confidence: number; // 0.0-1.0
  validity: 'pass' | 'fail' | 'partial';
  issues: VerificationIssue[];
  recommendations: string[];
  evidence: string[];
}

interface VerificationIssue {
  type: string;
  severity: 'high' | 'medium' | 'low';
  details: string;
}
```

### 4.3 Consensus Payload Schema

```typescript
interface ConsensusPayload {
  id: string;
  timestamp: string;
  taskId: string;
  leftReport: VerificationReport;
  rightReport: VerificationReport;
  consensus: 'match' | 'mismatch' | 'anomaly';
  confidenceDelta: number;
  discrepancies: Discrepancy[];
  recommendation: 'accept' | 'reject' | 'escalate' | 'refine';
}

interface Discrepancy {
  aspect: string;
  leftValue: any;
  rightValue: any;
}
```

---

## 5. Coordination Models

### 5.1 Task Assignment

```typescript
interface TaskAssignment {
  protocol: 'priority-based' | 'round-robin' | 'skill-based';
  locking: 'exclusive' | 'shared';
  dependencyResolution: 'DAG' | ' topological';
}

// Priority-based with deadlock prevention
async function assignTask(task: Task, agents: Agent[]): Promise<Agent> {
  const available = agents.filter(a => a.status === 'available');
  
  // Skill-based routing
  const qualified = available.filter(a => hasCapability(a, task.requiredCapabilities));
  
  // Round-robin among qualified
  const index = getNextIndex(qualified.length);
  
  return qualified[index % qualified.length];
}
```

### 5.2 Resource Locking

```typescript
class ResourceLock {
  private locks = new Map<string, Lock>();
  
  async acquire(resource: string, owner: string, timeout: number): Promise<boolean> {
    const existing = this.locks.get(resource);
    
    if (!existing) {
      this.locks.set(resource, { owner, timestamp: Date.now() });
      return true;
    }
    
    if (existing.owner === owner) {
      return true; // Own lock
    }
    
    if (Date.now() - existing.timestamp > timeout) {
      this.locks.set(resource, { owner, timestamp: Date.now() });
      return true; // Stale lock
    }
    
    return false; // Cannot acquire
  }
  
  release(resource: string, owner: string): void {
    const existing = this.locks.get(resource);
    if (existing?.owner === owner) {
      this.locks.delete(resource);
    }
  }
}
```

---

## 6. Scaling Patterns

### 6.1 Horizontal Scaling

```typescript
interface ScalingConfig {
  minAgents: number;
  maxAgents: number;
  scaleUpThreshold: number; // tasks per agent
  scaleDownThreshold: number;
  cooldown: number; // ms
}

async function autoScale(
  tier: 'work' | 'verify-l' | 'verify-r',
  config: ScalingConfig
): Promise<void> {
  const currentLoad = getTaskCount(tier) / getAgentCount(tier);
  
  if (currentLoad > config.scaleUpThreshold) {
    await addAgent(tier);
  } else if (currentLoad < config.scaleDownThreshold) {
    await removeAgent(tier);
  }
}
```

### 6.2 Performance Optimizations

| Optimization | Implementation |
|--------------|----------------|
| **Parallel Verification** | L and R run simultaneously |
| **Early Termination** | Stop when confidence threshold met |
| **Caching** | Pre-computed verification patterns |
| **Predictive Routing** | Anticipate workload patterns |

---

## 7. Failure Modes

### 7.1 Failure Types

| Category | Failure | Mitigation |
|----------|---------|------------|
| **Single Point** | Central Cockpit | Redundancy + failover |
| **Isolation Breach** | Memory leakage | Separate memory pools |
| **Consensus** | Tie situations | Human arbiter escalation |
| **Performance** | Bottleneck | Async processing + caching |

### 7.2 Recovery Protocols

```typescript
interface RecoveryProtocol {
  failureType: string;
  detect: () => Promise<boolean>;
  recover: () => Promise<void>;
}

const RECOVERY_PROTOCOLS: RecoveryProtocol[] = [
  {
    failureType: 'agent_timeout',
    detect: () => agent.lastHeartbeat < Date.now() - 30000,
    recover: () => reassignTasks(agent.id)
  },
  {
    failureType: 'lane_isolation_breach',
    detect: () => checkMemoryIsolation(),
    recover: () => resetLaneMemory()
  },
  {
    failureType: 'consensus_tie',
    detect: () => left.confidence === right.confidence && left.result !== right.result,
    recover: () => escalateToHuman()
  }
];
```

---

## 8. Specialized Verification

### 8.1 Coding Agents

| Aspect | Lane L | Lane R |
|--------|--------|--------|
| Code Review | Independent | Independent |
| Static Analysis | Tool A | Tool B |
| Test Generation | Suite A | Suite B |
| Quality Metrics | Criteria A | Criteria B |

### 8.2 Research Agents

| Aspect | Lane L | Lane R |
|--------|--------|--------|
| Hypothesis Validation | Independent | Independent |
| Data Source Verification | Sources A | Sources B |
| Statistical Analysis | Method A | Method B |
| Literature Verification | Review A | Review B |

---

## Related

- [DUAL_VERIFICATION_PROTOCOL.md](./DUAL_VERIFICATION_PROTOCOL.md)
- [GOVERNANCE_LAYER_SPEC.md](./GOVERNANCE_LAYER_SPEC.md)
- [CONSENSUS_ENGINE_SPEC.md](./CONSENSUS_ENGINE_SPEC.md)
- [AGENT_ROLE_MATRIX.md](./AGENT_ROLE_MATRIX.md)
