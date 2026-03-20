# 🚀 FreeAgent Swarm Boot Architecture

## PowerShell-Ready Orchestration Blueprint

> **One-command deterministic startup** for the complete FreeAgent AI swarm infrastructure

---

## 📋 System Runtime Layout

```
S:\freeagent\
│
├─ scripts/
│   ├─ boot-cockpit.ps1          ← Main entry point (ONE COMMAND)
│   ├─ kill-ports.ps1             ← Cleanup existing processes
│   ├─ start-redis.ps1            ← Start Memurai/Redis
│   ├─ start-services.ps1         ← Backend services
│   ├─ start-agents.ps1          ← Core agents
│   ├─ start-cockpit.ps1          ← Cockpit UI
│   └─ swarm-status.ps1           ← Health monitoring
│
├─ services/
│   ├─ eventBus.js                 ← Redis Streams event bus
│   ├─ eventBusConstants.js       ← Streams, roles, schemas
│   ├─ agentLoop.js                ← Reusable agent loop template
│   ├─ clawAdapter.js              ← Claw integration
│   ├─ kiloAgent.js                ← Kilo API integration
│   ├─ routerAgent.js              ← Provider routing agent
│   └─ agentExamples.js            ← Core agent instances
│
├─ orchestrator/
│   ├─ orchestrator.js             ← Main orchestration engine
│   ├─ resilienceManager.js        ← Provider failover & scoring
│   ├─ adaptiveRouter.js           ← Learning-based routing
│   ├─ memory.js                   ← Vector memory
│   └─ sessions.js                 ← Session management
│
├─ cockpit/
│   ├─ agents/
│   │   ├─ routerAgent.js          ← Task routing
│   │   ├─ baseAgent.js           ← Base agent class
│   │   └─ agentCapabilities.js   ←{ Agent registry
│   │
│   └─ ui/
│       └─ cockpit-dashboard       ← Observability UI
│
└─ data/
    ├─ memory.db                   ← Vector embeddings
    ├─ sessions.db                ← Session storage
    └─ router_memory.json         ← Routing decisions
```

---

## 🧠 Provider Routing Logic

### Task Flow

```
User Task
    │
    ▼
┌─────────────────┐
│  Router Agent  │
│ (routerAgent)  │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ Resilience Manager  │
│ - Provider cooldown │
│ - Concurrency caps  │
│ - RAM guardrails    │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ Provider Selection  │
│ (scored fallback)   │
└────────┬────────────┘
         │
         ▼
   ┌─────┴─────┐
   │           │
   ▼           ▼
Provider    Fallback
Execution   Queue
```

### Provider Selection Order (Dynamic)

The provider order dynamically changes based on:

| Factor | Weight | Description |
|--------|--------|-------------|
| Success Rate | 50% | Historical success rate |
| Latency | 30% | Response time score |
| Recency | 20% | Recent performance |

**Example Runtime Routing:**
```
Claude Sonnet
      ↓
Claude Opus  
      ↓
Claude Haiku
      ↓
Gemini
      ↓
Kilo
      ↓
LM Studio Local
```

### Fallback Scoring Formula

```javascript
score = 0.5 * success_rate + 0.3 * latency_score + 0.2 * recency_score
```

Where:
- `success_rate` = successful_calls / total_calls
- `latency_score` = max(0, 1 - avg_latency_ms / 60000)
- `recency_score` = failures > 0 ? 0.2 : 0.8

---

## 🛡️ Resilience Layer

### Provider Cooldown Logic

| Failure Count | Cooldown Duration |
|--------------|-------------------|
| 1 | 30 seconds |
| 2 | 60 seconds |
| 3 | 120 seconds |
| 4+ | 240 seconds (max) |

### Concurrency Caps

| Provider | Max Concurrent |
|----------|---------------|
| Claude | 5 |
| Gemini | 3 |
| Minimax | 3 |
| Local (LM Studio) | 2 |

### RAM Guardrails

| Threshold | Action |
|-----------|--------|
| 75% | Warning logged |
| 85% | Block local inference |
| >90% | Emergency cooldown all |

---

## 🔌 Event Bus Schema

### Stream Names

| Stream | Purpose | Consumer Groups |
|--------|---------|-----------------|
| `freeagent:tasks` | Incoming tasks | Per-role groups |
| `freeagent:results` | Task results | `router-group` |
| `freeagent:events` | System events | `system-group` |
| `freeagent:metrics` | Metrics collection | `metrics-group` |

### Task Message Schema

```javascript
{
  task_id: "uuid-v4",
  agent_role: "coder" | "researcher" | "planner" | "router",
  priority: 0 | 1 | 2,  // LOW | NORMAL | HIGH
  payload: "string or JSON",
  session_id: "string",
  source: "cockpit" | "router" | "system",
  created_at: 1699999999999  // Unix timestamp
}
```

### Result Message Schema

```javascript
{
  task_id: "uuid-v4",
  agent_role: "coder",
  status: "ok" | "error" | "timeout",
  output: "JSON string",
  logs: "debug output",
  duration_ms: 1500,
  completed_at: 1699999999999
}
```

---

## ⚡ Boot Sequence

### Single Command Startup

```powershell
.\scripts\boot-cockpit.ps1
```

### Step-by-Step Breakdown

#### Step 1: Kill Existing Processes
```powershell
# Ports: 3000, 3001, 3002, 1234, 6379, 8080, 8081, 5000
.\scripts\kill-ports.ps1
```

#### Step 2: Start Redis/Memurai
```powershell
.\scripts\start-redis.ps1
# Starts Memurai on localhost:6379 or falls back to in-memory
```

#### Step 3: Start Core Services
```powershell
.\scripts\start-services.ps1
# Starts: server.js (port 3001)
```

#### Step 4: Start Orchestrator
```powershell
node orchestrator/orchestrator.js
# Loads: Claude, Gemini, Minimax, Local clients
# Initializes: Memory, Sessions, Adaptive Router, Resilience Manager
```

#### Step 5: Start Router Agent
```powershell
node services/routerAgent.js
# Connects to Event Bus
# Subscribes to freeagent:tasks
# Routes tasks to appropriate providers
```

#### Step 6: Start Core Agents
```powershell
# Start Claw Adapter
node services/clawAdapter.js

# Start Kilo Agent
node services/kiloAgent.js

# Start Agent Examples (coder, researcher, planner)
node services/agentExamples.js coder
node services/agentExamples.js researcher
node services/agentExamples.js planner
```

#### Step 7: Start Cockpit UI
```powershell
.\scripts\start-cockpit.ps1
# Starts: http://localhost:3001
```

---

## 🌐 LM Link Federation

### Configuration

```bash
LM_LINK_NODES=node1,node2,node3
```

### Federation Architecture

```
┌─────────┐   ┌─────────┐   ┌─────────┐
│ Node A  │   │ Node B  │   │ Node C  │
│ Local   │   │ Local   │   │ Local   │
│  GPU    │   │  GPU    │   │  GPU    │
└────┬────┘   └────┬────┘   └────┬────┘
     │             │             │
     └─────────────┼─────────────┘
                   │
                   ▼
          ┌─────────────────┐
          │  Pattern Share  │
          │ Load Balance    │
          └─────────────────┘
```

---

## 📊 Cockpit Dashboard Panels

### Recommended Panels

| Panel | Data Source | Description |
|-------|-------------|-------------|
| **Node Status** | System metrics | CPU, RAM, Active Agents |
| **Provider Health** | Resilience Manager | Claude ✓, Gemini ⚠, Kilo ✓ |
| **Task Streams** | Redis Streams | Tasks/sec, Queue depth |
| **Federation Nodes** | LM Link | node-1 online, node-2 offline |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/orchestrator` | POST | Submit task to orchestrator |
| `/api/health` | GET | Health check all providers |
| `/api/sessions` | GET/POST | Session management |
| `/api/memory` | GET/POST | Vector memory search |
| `/api/router/stats` | GET | Router decision stats |
| `/api/resilience/stats` | GET | Resilience manager stats |

---

## 🔄 Integration Points

### Boot Scripts → Orchestrator

```powershell
# scripts/boot-cockpit.ps1 calls:
.\scripts\kill-ports.ps1    # Cleanup
.\scripts\start-redis.ps1    # Start Memurai
node orchestrator/orchestrator.js  # Start orchestrator
```

### Orchestrator → Resilience Manager

```javascript
// orchestrator/orchestrator.js
const { ResilienceManager } = require('./resilienceManager');

const resilience = new ResilienceManager({
  maxConcurrent: { claude: 5, gemini: 3, local: 2 }
});

// Before calling provider:
if (!await resilience.acquire(provider)) {
  // Fall back to next provider
}
```

### Router Agent → Event Bus

```javascript
// services/routerAgent.js
const { EventBus } = require('./eventBus');

const eventBus = new EventBus({ stream: 'freeagent:tasks' });
await eventBus.connect();

// Subscribe to tasks
await eventBus.subscribe(async (task) => {
  const provider = await chooseProvider(task);
  return routeToProvider(provider, task);
});
```

### Claw Adapter → Event Bus

```javascript
// services/clawAdapter.js
const { quickAgent } = require('./agentLoop');
const { ROLES } = require('./eventBusConstants');

const clawAdapter = quickAgent(ROLES.CLAW, async (task) => {
  // Forward to Claw API
  return await axios.post(CLAW_URL, task.payload);
});
```

### Kilo Agent → Event Bus

```javascript
// services/kiloAgent.js
const { quickAgent } = require('./agentLoop');
const { ROLES } = require('./eventBusConstants');

const kiloAgent = quickAgent(ROLES.KILO, async (task) => {
  // Call Kilo API
  return await axios.post(`${KILO_API}/autocomplete`, {
    prompt: task.payload
  });
});
```

---

## 🎯 Quick Start

### Prerequisites

1. **Node.js 18+** installed
2. **Memurai** or **Redis** installed
3. **API Keys** in `.env`:
   ```
   CLAUDE_API_KEY=sk-...
   MINIMAX_API_KEY=...
   GEMINI_PROJECT=...
   ```

### Launch

```powershell
# Single command to boot everything
.\scripts\boot-cockpit.ps1
```

### Verify

```powershell
# Check health
curl http://localhost:3001/api/health

# Check Redis streams
.\scripts\swarm-status.ps1
```

---

## 🧩 File Reference

| File | Purpose |
|------|---------|
| [`scripts/boot-cockpit.ps1`](scripts/boot-cockpit.ps1) | Main orchestration entry point |
| [`scripts/kill-ports.ps1`](scripts/kill-ports.ps1) | Port cleanup utility |
| [`scripts/start-redis.ps1`](scripts/start-redis.ps1) | Redis/Memurai startup |
| [`scripts/start-agents.ps1`](scripts/start-agents.ps1) | Agent startup |
| [`scripts/start-cockpit.ps1`](scripts/start-cockpit.ps1) | Cockpit UI startup |
| [`services/eventBus.js`](services/eventBus.js) | Redis Streams event bus |
| [`services/eventBusConstants.js`](services/eventBusConstants.js) | Event schemas and constants |
| [`services/agentLoop.js`](services/agentLoop.js) | Reusable agent loop template |
| [`services/clawAdapter.js`](services/clawAdapter.js) | Claw API integration |
| [`services/kiloAgent.js`](services/kiloAgent.js) | Kilo API integration |
| [`orchestrator/orchestrator.js`](orchestrator/orchestrator.js) | Main orchestration engine |
| [`orchestrator/resilienceManager.js`](orchestrator/resilienceManager.js) | Provider failover & scoring |
| [`orchestrator/adaptiveRouter.js`](orchestrator/adaptiveRouter.js) | Learning-based routing |

---

*Built with ❤️ for the FreeAgent Swarm*
