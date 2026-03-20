# Medical AI Federation Cockpit - API Documentation

## Base URL
```
http://localhost:8889
```
Or your ngrok tunnel URL (e.g., `https://your-ngrok-id.ngrok.io`)

## Authentication
**None required** - The server uses open CORS (`Access-Control-Allow-Origin: *`)

---

## Core API Endpoints

### System Status & Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/status` | Get federation status (all systems, metrics) |
| GET | `/api/tasks` | Get all active tasks |
| GET | `/api/tasks/:id` | Get specific task by ID |
| POST | `/api/execute` | Execute a task through federation |
| POST | `/api/systems/:id/health` | Trigger health check for a system |

### Chat & AI

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Main chat endpoint - Local-first zero-cost |
| POST | `/api/kilo` | Route through Kilo API |
| POST | `/api/claw` | Claw API endpoint |
| POST | `/api/ollama/generate` | Ollama model generation |
| GET | `/api/ollama/health` | Ollama health check |

### Ensemble & Agents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ensemble/agents` | List all ensemble agents |
| GET | `/api/ensemble/status` | Get ensemble status |
| GET | `/api/ensemble/metrics` | Get ensemble metrics |
| GET | `/api/ensemble/memory/:agent` | Get agent memory |
| GET | `/api/agents/:agent/memory` | Get agent memory files |

### Providers & Routing

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/providers/status` | Get all provider statuses |
| POST | `/api/providers/route` | Route request to best provider |
| POST | `/api/providers/:name/enable` | Enable/disable provider |
| GET | `/api/providers/metrics` | Get provider metrics |
| GET | `/api/providers/scores` | Get dynamic provider scores |

### Memory & Context

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/context` | Get 38-layer context |
| GET | `/api/context/layers` | Get full context layers |
| GET | `/api/memory/health` | Memory health report |
| GET | `/api/memory/schemas` | List registered schemas |
| GET | `/api/memory/types` | List supported memory types |
| POST | `/api/memory/repair` | Repair memory data |

### Agent Warmup

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/warmup/status` | Get warmup status |
| GET | `/api/warmup/agents` | Get all agent statuses |
| GET | `/api/warmup/recommendations` | Get warmup recommendations |
| GET | `/api/warmup/idle` | Get idle agents |
| POST | `/api/warmup/record-task` | Record task for pattern analysis |

### Drift Detection

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/drift/status` | Get drift detection status |
| GET | `/api/drift/agents` | Get all drifting agents |
| GET | `/api/drift/score/:agentId` | Get drift score for agent |
| POST | `/api/drift/record` | Record agent response |
| POST | `/api/drift/consensus` | Check consensus score |

### File Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/read-file` | Read file from workspace |
| POST | `/api/write-file` | Write content to file |
| GET | `/api/list-files` | List files in directory |
| POST | `/api/execute-command` | Execute shell command |

### Perception

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/perception/image` | Process uploaded image |
| POST | `/api/perception/voice` | Process voice input |
| GET | `/api/perception/status` | Get perception status |

### Autonomous Coordination

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/autonomous/status` | Get autonomous engine status |
| POST | `/api/autonomous/coordinate` | Coordinate task autonomously |
| POST | `/api/swarm/init` | Initialize distributed swarm |
| POST | `/api/swarm/shutdown` | Shutdown swarm |

### System Registration

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register-system` | Register a system |
| POST | `/api/unregister-system` | Unregister a system |

### Tests

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tests/run` | Run all system tests |
| GET | `/api/tests/status` | Get test system status |

---

## Example curl Commands

### 1. Get System Status
```bash
curl -X GET http://localhost:8889/api/status
```

### 2. Get Federation Health
```bash
curl -X POST http://localhost:8889/api/systems/medical_pipeline/health
```

### 3. Chat with Ensemble (Local-First, Zero-Cost)
```bash
curl -X POST http://localhost:8889/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, what can you help me with?"}'
```

### 4. Chat with Hybrid Routing (Uses Cloud for Complex Queries)
```bash
curl -X POST http://localhost:8889/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Write a comprehensive analysis", "useHybrid": true}'
```

### 5. Get Ensemble Agents
```bash
curl -X GET http://localhost:8889/api/ensemble/agents
```

### 6. Get Ensemble Metrics
```bash
curl -X GET http://localhost:8889/api/ensemble/metrics
```

### 7. Get Provider Status
```bash
curl -X GET http://localhost:8889/api/providers/status
```

### 8. Get Memory Health
```bash
curl -X GET http://localhost:8889/api/memory/health
```

### 9. Get Autonomous Status
```bash
curl -X GET http://localhost:8889/api/autonomous/status
```

### 10. Execute a Task
```bash
curl -X POST http://localhost:8889/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "type": "medical_analysis",
    "data": {"patient_data": "sample"},
    "preferredSystem": "medical_pipeline"
  }'
```

### 11. Test Ollama (if running locally)
```bash
curl -X GET http://localhost:8889/api/ollama/health
```

### 12. Measure Latency (for 0ms demo)
```bash
time curl -s http://localhost:8889/api/status
```

---

## WebSocket for Real-Time Updates

Connect to `ws://localhost:8889` for real-time events:

```javascript
const ws = new WebSocket('ws://localhost:8889');

// Request status
ws.send(JSON.stringify({ type: 'status_request' }));

// Execute task via WS
ws.send(JSON.stringify({
  type: 'execute_task',
  task: { type: 'medical_analysis', data: {} }
}));

// Request metrics
ws.send(JSON.stringify({ type: 'get_metrics' }));

// Health check
ws.send(JSON.stringify({ type: 'health_check' }));
```

---

## System Types

The federation supports these systems:
- `medical_pipeline` - Fast (1-3ms) for structural processing
- `coding_ensemble` - Clinical analysis & code generation
- `plugins` - Plugin system extensibility

---

## UI Dashboards

The server also serves these UI pages:

| Route | Description |
|-------|-------------|
| `/` or `/mega` | Mega Cockpit Dashboard |
| `/monaco-cockpit` | Monaco IDE Cockpit |
| `/benchmark` | Benchmark Dashboard |
| `/swarm` | Swarm Panel |
| `/health` | Health Tab |
| `/cockpit` | Original Cockpit |
| `/galaxy` | Galaxy IDE |

---

## Request/Response Examples

### POST /api/chat
Request:
```json
{
  "message": "Hello",
  "agents": ["ingestion", "summarization"],
  "useHybrid": false
}
```
Response:
```json
{
  "success": true,
  "response": "Hello! I can help with...",
  "provider": "ollama",
  "latency": 150,
  "routed": "local"
}
```

### GET /api/status
Response:
```json
{
  "systems": {
    "medical_pipeline": { "status": "healthy", "latency": 2 },
    "coding_ensemble": { "status": "healthy", "agents": 8 }
  },
  "metrics": {
    "totalRequests": 1500,
    "avgLatency": 45,
    "requestsPerSecond": 12.5
  }
}
```