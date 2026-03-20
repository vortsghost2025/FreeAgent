# Master Architecture Blueprint

> Unified FreeAgent / Kilo / Cockpit Architecture
> Domain-agnostic. Production-grade. Deterministic.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              FREEAGENT SYSTEM ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              COCKPIT (Human Interface)                           │   │
│  │              Real-time Dashboard • WebSocket Broadcast • Human Arbiter            │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                          │                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                           ORCHESTRATION LAYER                                   │   │
│  │    Task Decomposition • Agent Coordination • Swarm Operations • Federation       │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                          │                                               │
│           ┌──────────────────────────────┼──────────────────────────────┐            │
│           │                              │                              │            │
│  ┌────────▼────────┐          ┌─────────▼─────────┐        ┌─────────▼─────────┐   │
│  │   WORK TIER    │          │ VERIFICATION TIER  │        │ CONSENSUS TIER    │   │
│  │                 │          │                     │        │                    │   │
│  │ • Coding Agent  │          │ • Verify-L         │        │ • Human Arbiter   │   │
│  │ • Research Agent│          │ • Verify-R         │        │ • Consensus Engine │   │
│  │ • Planner Agent │          │ • Validate-L      │        │ • Dispute          │   │
│  │ • Optimizer     │          │ • Validate-R      │        │   Resolution       │   │
│  └────────────────┘          └─────────────────────┘        └────────────────────┘   │
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                         GOVERNANCE LAYER                                        │   │
│  │      Action Gating • Decision Matrix • Confidence Scoring • Escalation         │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                          │                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                          FEDERATION LAYER                                        │   │
│  │    Cross-Cluster • Pattern Propagation • Risk Signals • Coordinator           │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                          │                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                          RESILIENCE LAYER                                        │   │
│  │    Atomic Writes • Retry Logic • Heartbeat • Graceful Shutdown • Recovery       │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                          │                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                          MEMORY SUBSTRATE                                        │   │
│  │    Perceptual → Short-term → Working → Long-term → Associative → Transcendent  │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Layer Specifications

### 1. Cockpit Layer
| Spec | File |
|------|------|
| Master Control Panel | COCKPIT_ORCHESTRATION_LAYER.md |
| WebSocket Communication | COCKPIT_ORCHESTRATION_LAYER.md |
| Agent Modes (dev/silent/remote) | COCKPIT_ORCHESTRATION_LAYER.md |

### 2. Orchestration Layer
| Spec | File |
|------|------|
| Task Decomposition | COCKPIT_ORCHESTRATION_LAYER.md |
| Agent Roles | AGENT_ROLE_MATRIX.md |
| Swarm Coordination | COCKPIT_ORCHESTRATION_LAYER.md |

### 3. Work Tier
| Spec | File |
|------|------|
| Agent Types | AGENT_ROLE_MATRIX.md |
| Capability Matrix | AGENT_ROLE_MATRIX.md |
| Autonomy Levels | AGENT_ROLE_MATRIX.md |

### 4. Verification Tier
| Spec | File |
|------|------|
| Dual Lanes (L/R) | VERIFICATION_TIER_SPEC.md |
| Isolation Rules | VERIFICATION_TIER_SPEC.md |
| Verification Schemas | VERIFICATION_TIER_SPEC.md |

### 5. Consensus Tier
| Spec | File |
|------|------|
| Consensus Algorithms | CONSENSUS_ENGINE_SPEC.md |
| Decision Matrix | GOVERNANCE_LAYER_SPEC.md |
| Dispute Resolution | VERIFICATION_TIER_SPEC.md |

### 6. Governance Layer
| Spec | File |
|------|------|
| Action Gating | GOVERNANCE_LAYER_SPEC.md |
| Rules Engine | GOVERNANCE_LAYER_SPEC.md |
| Escalation Paths | GOVERNANCE_LAYER_SPEC.md |

### 7. Federation Layer
| Spec | File |
|------|------|
| Peer Management | FEDERATION_PROTOCOL.md |
| Pattern Propagation | FEDERATION_PROTOCOL.md |
| State Sync | FEDERATION_PROTOCOL.md |

### 8. Resilience Layer
| Spec | File |
|------|------|
| Atomic Persistence | RESILIENCE_LAYER_SPEC.md |
| Retry Logic | RESILIENCE_LAYER_SPEC.md |
| Heartbeat | RESILIENCE_LAYER_SPEC.md |

### 9. Memory Substrate
| Spec | File |
|------|------|
| 6-Layer Memory | MEMORY_SUBSTRATE_SPEC.md |
| Bounded Collections | MEMORY_SUBSTRATE_SPEC.md |
| Vector Search | MEMORY_SUBSTRATE_SPEC.md |

---

## Safety & Federation (Phase 10)

### Safety Invariants
| Spec | File |
|------|------|
| Global Veto | SAFETY_INVARIANTS_SPEC.md |
| Risk Envelopes | SAFETY_INVARIANTS_SPEC.md |
| Drift Thresholds | SAFETY_INVARIANTS_SPEC.md |

### Federation Coordinator
| Spec | File |
|------|------|
| Risk Scoring | FEDERATION_COORDINATOR_SPEC.md |
| Pattern Promotion | FEDERATION_COORDINATOR_SPEC.md |
| Veto Engine | FEDERATION_COORDINATOR_SPEC.md |

### Federation Schema
| Spec | File |
|------|------|
| Message Types | FEDERATION_SCHEMA_SPEC.md |
| Validation Rules | FEDERATION_SCHEMA_SPEC.md |
| Wire Format | FEDERATION_SCHEMA_SPEC.md |

---

## Message Flow

```
┌─────────┐     ┌──────────────┐     ┌─────────────┐     ┌─────────────┐
│  Human  │────▶│   Cockpit    │────▶│Orchestrator │────▶│  Work Tier  │
│ Request │     │  (WebSocket) │     │  (Router)   │     │  (Agents)   │
└─────────┘     └──────────────┘     └─────────────┘     └──────┬──────┘
                                                                   │
     ┌──────────────────────────────────────────────────────────────┘
     ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│Verify-L    │     │Verify-R    │     │Consensus   │     │ Governance  │
│(Isolated)  │     │(Isolated)  │     │(Compare)    │     │  (Gate)     │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │                   │
       └───────────────────┴───────────────────┴───────────────────┘
                                           │
                                           ▼
                              ┌────────────────────────┐
                              │    Federation Layer   │
                              │  (Cross-Cluster Sync) │
                              └───────────┬────────────┘
                                          │
                                          ▼
                              ┌────────────────────────┐
                              │   Memory Substrate    │
                              │   (Persistent State)  │
                              └────────────────────────┘
```

---

## Key Design Patterns

### 1. Dual Verification
- Independent L and R lanes
- Blind verification
- Consensus comparison
- Human tiebreaker

### 2. Federation Safety
- Global veto supremacy
- Risk envelope boundaries
- Drift threshold enforcement
- Stateless coordinator

### 3. Memory Architecture
- 6-layer cognitive memory
- Atomic persistence with backup
- Bounded collections with eviction
- Vector similarity search

### 4. Governance Contract
- Action gating before execution
- Confidence-based decisions
- Escalation paths
- Audit trails

---

## File Index

| Category | Files |
|----------|-------|
| **Core** | COCKPIT_ORCHESTRATION_LAYER.md, AGENT_ROLE_MATRIX.md |
| **Verification** | VERIFICATION_TIER_SPEC.md, DUAL_VERIFICATION_PROTOCOL.md |
| **Governance** | GOVERNANCE_LAYER_SPEC.md, GOVERNED_ACTION_PIPELINE.md |
| **Consensus** | CONSENSUS_ENGINE_SPEC.md |
| **Memory** | MEMORY_SUBSTRATE_SPEC.md |
| **Resilience** | RESILIENCE_LAYER_SPEC.md |
| **Federation** | FEDERATION_PROTOCOL.md |
| **Phase 10** | SAFETY_INVARIANTS_SPEC.md, FEDERATION_COORDINATOR_SPEC.md, FEDERATION_SCHEMA_SPEC.md |

---

## Summary

This architecture provides:

- **Cockpit** — Human interface and real-time control
- **Orchestration** — Multi-agent coordination
- **Work** — Generative and analytical agents
- **Verification** — Dual-lane isolated validation
- **Consensus** — Dispute resolution and arbitration
- **Governance** — Safety gates and decision rules
- **Federation** — Cross-cluster coordination
- **Resilience** — Fault tolerance and recovery
- **Memory** — Persistent cognitive substrate
- **Safety** — Phase-10 invariants and wire protocol

This is your complete production-grade autonomous agent system.
