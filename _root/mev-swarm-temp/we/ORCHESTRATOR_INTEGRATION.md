# SNAC Orchestrator Integration Guide

## Overview

The SNAC Orchestrator (`orchestrator.js`) solves three critical problems:

1. **429 Rate Limiting** - Token bucket algorithm queues requests, preventing thundering herd
2. **Cost Optimization** - Routes simple tasks to free models, complex to paid
3. **Input Token Reduction** - Context summarization using Qdrant (or in-memory fallback)

---

## Quick Start

### 1. Install Dependencies

```bash
# Install Qdrant client (optional - will use in-memory fallback if unavailable)
npm install @qdrant/js-client-rest
```

### 2. Start the Orchestrator

```bash
# Run standalone
cd /opt/snac-v2/backend
node orchestrator.js
```

### 3. Check Health

```bash
curl http://localhost:3001/health
```

---

## Integration with Existing Server

### Option A: Standalone Mode (Recommended)

Run orchestrator on port 3001, keep original server on 3000:

```javascript
// In your frontend, change to:
const ws = new WebSocket('ws://localhost:3001');
```

### Option B: Embedded Mode

Import and wrap your existing server:

```javascript
// server-with-orchestrator.js
import { SNACOrchestrator } from './orchestrator.js';

const orchestrator = new SNACOrchestrator({
  rateLimit: {
    requestsPerSecond: 3,
    burstLimit: 6,
    queueMaxSize: 100,
  },
  modelTiers: {
    free: ['deepseek/deepseek-chat:free', 'qwen/qwen3-4b:free'],
    paid: ['deepseek/deepseek-chat', 'anthropic/claude-3-haiku'],
  },
});

await orchestrator.start();
```

---

## Configuration

### Rate Limiting

| Parameter | Default | Description |
|-----------|---------|-------------|
| `requestsPerSecond` | 3 | Max API requests per second |
| `burstLimit` | 6 | Max burst requests allowed |
| `queueMaxSize` | 100 | Max queued requests |
| `backoffMs` | 1000 | Initial backoff on 429 |
| `maxBackoffMs` | 30000 | Max backoff time |

### Model Tiers

**Free (Tier 1) - Triage/Thinking:**
- `deepseek/deepseek-chat:free`
- `qwen/qwen3-4b:free`
- `meta-llama/llama-3.2-3b-instruct:free`

**Paid (Tier 2) - Heavy Lifting:**
- `deepseek/deepseek-chat`
- `anthropic/claude-3-haiku`
- `anthropic/claude-3.5-sonnet`

### Complexity Detection

Tasks are automatically classified:

| Complexity | Keywords | Model Tier |
|------------|----------|------------|
| Simple | fix, typo, simple, quick | Free |
| Medium | implement, create, build | Free/Paid |
| Complex | architect, design, optimize | Paid |

---

## Context Summarization

### With Qdrant (Recommended)

Add to your docker-compose:

```yaml
qdrant:
  image: qdrant/qdrant:latest
  ports:
    - "6333:6333"
    - "6334:6334"
  volumes:
    - qdrant-data:/qdrant/storage

volumes:
  qdrant-data:
```

Then set: `QDRANT_URL=http://qdrant:6333`

### Without Qdrant

The orchestrator automatically falls back to in-memory summarization. No extra setup needed!

---

## WebSocket API

### Connect

```javascript
const ws = new WebSocket('ws://localhost:3001');
```

### Send Chat Request

```javascript
ws.send(JSON.stringify({
  type: 'chat',
  task: 'Fix the authentication bug in login.js',
  agents: ['Code Generation', 'Security'],
  maxTokens: 500
}));
```

### Receive Response

```javascript
ws.on('message', (data) => {
  const msg = JSON.parse(data);
  
  if (msg.type === 'chat_response') {
    console.log('Response:', msg.response);
    console.log('Model used:', msg.model);        // e.g., 'deepseek/deepseek-chat:free'
    console.log('Tier:', msg.tier);               // 'free' or 'paid'
    console.log('Input tokens:', msg.inputTokens);
    console.log('Output tokens:', msg.outputTokens);
  }
});
```

---

## Health Monitoring

### Check Status

```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "status": "ok",
  "orchestrator": true,
  "rateLimiter": {
    "tokens": 4.5,
    "queueLength": 0,
    "inBackoff": false,
    "backoffUntil": 0
  },
  "modelUsage": {
    "free": 45,
    "paid": 12,
    "total": 57,
    "freePercentage": 79
  },
  "summarization": {
    "enabled": true,
    "qdrantConnected": true,
    "sessionsTracked": 5
  }
}
```

### Check Stats

```bash
curl http://localhost:3001/stats
```

---

## Expected Cost Savings

With 8 agents and the orchestrator:

| Metric | Before | After |
|--------|--------|-------|
| Requests causing 429 | ~20% | <1% |
| Free model usage | 100% | ~80% |
| Paid model usage | 0% | ~20% |
| Input tokens/task | High (full history) | Low (summarized) |

**Estimated savings:** 50-70% reduction in API costs

---

## Deployment to VPS

```bash
# SSH to your VPS
ssh root@187.77.3.56

# Navigate to backend directory
cd /opt/snac-v2/backend

# Copy orchestrator.js
# (use scp or git pull)

# Install dependencies
npm install @qdrant/js-client-rest

# Start orchestrator
pm2 start orchestrator.js --name snac-orchestrator

# Check status
pm2 status
curl http://localhost:3001/health
```

---

## Troubleshooting

### "Queue overflow" error

Increase `queueMaxSize` in config:
```javascript
rateLimit: {
  queueMaxSize: 200  // from default 100
}
```

### 429 errors still occurring

The orchestrator handles 429s with exponential backoff. Check logs for backoff warnings.

### Qdrant connection fails

The orchestrator automatically falls back to in-memory mode. No action needed.

### High latency

If requests are queuing too long, increase `requestsPerSecond`:
```javascript
rateLimit: {
  requestsPerSecond: 5  // from default 3
}
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    SNAC Orchestrator                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐   │
│  │   Client    │───▶│  WebSocket   │───▶│  Rate Limiter │   │
│  │  (Frontend) │    │   Server     │    │ (Token Bucket)│   │
│  └─────────────┘    └──────────────┘    └───────┬───────┘   │
│                                                  │           │
│                                                  ▼           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Request Queue                          │    │
│  │   [Req1] [Req2] [Req3] ... [ReqN]                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                  │           │
│                                                  ▼           │
│  ┌──────────────┐    ┌──────────────┐    ┌─────────────┐   │
│  │   Model      │    │   Context    │    │  OpenRouter │   │
│  │   Router     │───▶│ Summarizer   │───▶│    API      │   │
│  │ (Tier Logic) │    │ (Qdrant)     │    │             │   │
│  └──────────────┘    └──────────────┘    └─────────────┘   │
│        │                                        │          │
│        ▼                                        ▼          │
│  ┌──────────┐                              ┌─────────┐    │
│  │  Free    │                              │  Paid   │    │
│  │  Models  │                              │  Models │    │
│  └──────────┘                              └─────────┘    │
└─────────────────────────────────────────────────────────────┘
```
