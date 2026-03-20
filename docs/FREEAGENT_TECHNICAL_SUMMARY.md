# FreeAgent Platform - Technical Summary

> "This is more than a demo. It's a platform skeleton."

## What FreeAgent Actually Is

**Local AI Agent Runtime Platform** - A miniature AI operating environment that runs entirely on local hardware.

```
FreeAgent Platform
│
├─ Cockpit (UI + API gateway)
├─ Orchestrator (routing + coordination)
├─ Adaptive Router (provider intelligence)
├─ Agent runtime
├─ Memory system
├─ Session persistence
├─ Services layer
└─ Provider clients
```

---

## Architectural Breakdown

### 1. Cockpit Layer
**Purpose:** UI + API gateway for human control

- [`cockpit/server.js`](cockpit/server.js) - 734 lines
  - Express server on port 3847
  - WebSocket real-time communication
  - REST API: sessions, chat, memory, health, capabilities, services, governance
- Frontend: index.html + index.js + styles.css

### 2. Orchestrator Layer
**Purpose:** Request coordination between providers

- [`orchestrator/orchestrator.js`](orchestrator/orchestrator.js) - Main implementation
- [`cockpit/orchestrator.js`](cockpit/orchestrator.js) - Cockpit variant with RouterAgent

Both coordinate Claude → Gemini → MiniMax → Local models with adaptive failover.

### 3. Adaptive Router (Most Valuable Component - 604 lines)
**Purpose:** Learning-based provider selection engine

Located in [`orchestrator/adaptiveRouter.js`](orchestrator/adaptiveRouter.js):

```
AdaptiveRouter
│
├─ AgentPerformanceTracker (sliding-window metrics)
├─ ErrorClassifier (9 categories: TIMEOUT, NETWORK, AUTH, etc.)
├─ ConfidenceScorer (35% recent, 25% error relevance, 20% historical, 20% workload)
├─ SmartRouter (rankings-based selection)
└─ Persistence (auto-saves to router_memory.json every 30s)
```

This is NOT just model calling - it's a **feedback-based model selection engine** that learns provider reliability over time.

### 4. Agent Runtime
**Purpose:** Task execution with system awareness

- [`cockpit/runtime/loop.js`](cockpit/runtime/loop.js) - Adaptive execution loop
- [`cockpit/runtime/stress.js`](cockpit/runtime/stress.js) - Stress scoring engine
- [`cockpit/runtime/cleanup.js`](cockpit/runtime/cleanup.js) - Rolling cleanup (zombies, caches)

The stress scoring monitors CPU/RAM/disk and triggers cleanup when stress > 0.6.

### 5. Memory Layer
**Purpose:** Persistent context and conversation continuity

- [`orchestrator/memory.js`](orchestrator/memory.js) - Vector embeddings with SQLite
- [`orchestrator/sessions.js`](orchestrator/sessions.js) - Session persistence
- Semantic search with collection-based organization
- Auto-retrieves relevant context before processing

### 6. Services Layer (Capability System)
**Purpose:** Actions agents can perform

| Service | Type | Purpose |
|---------|------|---------|
| WebFetch | Utility | Safe URL fetching |
| ProxyAPI | Utility | External API calls |
| FileBridge | Filesystem | Sandboxed file operations |
| DeviceBridge | Hardware | Hardware communication |
| DataStore | Database | Structured persistence |
| Scheduler | System | Background tasks |
| Chunked | Processing | Large data handling |
| Claw | Hardware | OpenClaw robotic arm |

This is a **capability layer for agents** - they don't just talk to models, they perform actions.

### 7. Governance System
**Purpose:** Safety boundaries

- Rate limiting per client
- File path validation
- External URL allowlisting
- Command execution restrictions
- Audit logging

Critical when agents control services.

### 8. Provider Clients

| Client | Status | Features |
|--------|--------|----------|
| Claude | ✅ | Standard messages API |
| Gemini | ✅ | Vertex AI integration |
| MiniMax | ✅ | M2.5 models |
| LM Studio | ✅ | Full v1 API, streaming |
| Unified Local | ✅ | LM Studio + Ollama + workspace |

---

## Key Technical Decisions

### Local-First Design
- No API throttling
- Deterministic testing
- Lower cost
- Easier stress testing
- Matches goal: swarms on consumer hardware

### Persistence That Matters
`router_memory.json` stores:
- Agent performance metrics
- Error patterns
- Task patterns

This allows the system to learn provider reliability and adapt when a provider starts failing.

### Stress-Aware Runtime
Most agent projects ignore system health. FreeAgent monitors:
- CPU usage
- RAM pressure
- Disk I/O
- Inference latency

Auto-cleanup triggers at stress > 0.6.

---

## Hardware Events (Context)

During swarm testing, the machine hit:
- 100% RAM
- 100% disk
- 100% CPU

Root causes identified:
1. **Context + Memory Writes** - SQLite + embeddings + session logs = disk IO spike
2. **Node Event Loop Pressure** - Large concurrent promise counts
3. **Local Model Inference** - LM Studio resource consumption

---

## The Architecture You're Moving Toward

```
FreeAgent Platform
│
├─ Next.js Cockpit (new)
│
├─ API Layer
│   ├─ Chat
│   ├─ Sessions
│   ├─ Memory
│   └─ Services
│
├─ Orchestrator
│   ├─ AdaptiveRouter (refactor candidate)
│   ├─ Agent runtime
│   └─ Task scheduler
│
├─ Service Bus
│
├─ Memory Layer
│
└─ Provider Clients
```

---

## Recommended Refactoring

**AdaptiveRouter** at 604 lines does multiple jobs. Break into:

```
router/
 ├─ performanceTracker.js
 ├─ errorClassifier.js
 ├─ confidenceScorer.js
 ├─ smartRouter.js
 └─ routerPersistence.js
```

Benefits: easier scaling, easier testing.

---

## Next Scaling Bottleneck

Current: agent → provider (direct)

Above ~100 agents, need:

```
agent
  ↓
queue
  ↓
worker pool
  ↓
provider
```

---

## Strategic Question

What is FreeAgent's direction?

1. **Personal AI operating system** - End-user focused
2. **Developer platform** - Others run it
3. **Research framework** - Agent system experimentation

This determines architectural decisions going forward.

---

## Files Summary

| Category | Files |
|----------|-------|
| Orchestrators | 2 (root + cockpit) |
| Clients | 5 (Claude, Gemini, MiniMax, LM Studio, Unified) |
| Router | 1 (604 lines) |
| Memory/Sessions | 2 |
| Server | 1 (734 lines) |
| Runtime | 3 (loop, stress, cleanup) |
| Agents | 4 (base, router, capabilities, index) |
| Services | 8 + governance |
| Frontend | 3 (html, js, css) |

**Total:** ~2,500+ lines of core system code
