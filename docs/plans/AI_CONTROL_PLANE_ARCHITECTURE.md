# FreeAgent AI Control Plane Architecture

> Mapped cleanly into an AI Control Plane architecture - the same structural idea used in modern AI infrastructure systems, scaled to a local-first personal AI runtime.

---

## Layered View of Your System

```
┌──────────────────────────────────────┐
│              COCKPIT                 │
│        (UI + Control Interface)      │
│  - Agent dashboard                   │
│  - Task creation                    │
│  - Swarm monitoring                 │
│  - System controls                  │
└──────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│              EVENT BUS               │
│        (System Communication)         │
│  - Redis Streams / NATS              │
│  - Task distribution                 │
│  - Agent messaging                   │
└──────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│          ADAPTIVE ROUTER             │
│        (Traffic Intelligence)        │
│  - Provider scoring                  │
│  - Error classification              │
│  - Performance tracking              │
│  - Workload balancing               │
└──────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│            AGENT SWARM               │
│                                      │
│  Supervisor / Coordinator Agents     │
│  ├─ Planner                         │
│  ├─ Research                        │
│  ├─ Coding                          │
│  └─ Task Manager                    │
│                                      │
│  Worker Agents                      │
│  ├─ Claw                           │
│  ├─ Kilo                           │
│  ├─ Code                           │
│  ├─ Data                           │
│  ├─ Clinical                        │
│  ├─ Test                           │
│  ├─ Security                       │
│  ├─ API                            │
│  ├─ DB                             │
│  └─ DevOps                         │
└──────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│            MEMORY LAYER              │
│                                      │
│  - Vector memory                    │
│  - Session persistence              │
│  - Task history                     │
│  - Router performance memory         │
│  - SQLite / Vector DB               │
└──────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│          MODEL PROVIDERS              │
│                                      │
│  Local Models                       │
│  ├─ Qwen                           │
│  ├─ Lingma                         │
│                                      │
│  Cloud Models                       │
│  ├─ Claude                         │
│  ├─ Gemini                         │
│  ├─ MiniMax                        │
│                                      │
│  Future                            │
│  └─ vLLM cluster                   │
└──────────────────────────────────────┘
```

---

## Why This Architecture Is Powerful

Your system separates three critical responsibilities:

### 1️⃣ Control Plane
Handles management and coordination
- Cockpit
- Router
- Event Bus

This layer decides what should happen.

### 2️⃣ Execution Plane
Handles actual work
- Agent Swarm

Agents perform tasks.

### 3️⃣ Inference Plane
Handles AI model execution
- Providers

Models generate reasoning and outputs.

**That separation is exactly what allows systems to scale.**

---

## What Your System Could Become

If you follow the roadmap (Redis, Ray, vLLM, monitoring), the architecture evolves into:

```
Cockpit
   │
Event Bus
   │
Adaptive Router
   │
Agent Coordinators
   │
Distributed Worker Agents
   │
Ray / Queue Workers
   │
vLLM + Cloud Models
```

That supports:
- Distributed swarms
- GPU inference clusters
- Large task queues
- Thousands of concurrent agent calls

---

## ⚠️ The One Thing Missing Right Now

From everything shown, the only structural piece **not yet present** is the **event bus layer**.

**Current:**
```
cockpit → orchestrator → agents
```

**Want:**
```
cockpit → event bus → swarm
```

That single shift unlocks massive concurrency.

---

## 🧩 The Hidden Advantage You Already Have

Your Adaptive Router is basically a **model traffic controller**.

Very few DIY systems implement:
- Sliding window performance metrics
- Error classification
- Weighted routing
- Persistent learning

That's closer to **inference infrastructure** than typical agent frameworks.

---

## 🧭 Final Focus for 12-Day Sprint

Turn FreeAgent into: **A Local AI Operating System**

Not a framework.

**Prioritize:**
1. Cockpit usability
2. Swarm observability
3. Routing intelligence
4. Stability under load

If those work, the system becomes genuinely powerful.

---

*This is the definitive architecture document for FreeAgent*
