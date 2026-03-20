# FreeAgent Scaling Blueprint - Infrastructure & Architecture

> This blueprint addresses the current bottlenecks and outlines the recommended architecture to scale from local demo to distributed cluster.

---

## Current Bottlenecks

| Bottleneck | Impact |
|------------|--------|
| 1. Local PC compute limits | Cannot run large models + many agents simultaneously |
| 2. API gateway throughput (Kilo Code) | Request handling capacity limited |
| 3. Large prompt/token sizes | Slow inference, high costs |
| 4. Lack of distributed compute layer | Single machine = single point of failure |
| 5. Agents firing requests simultaneously without queueing | Sudden bursts overwhelm system |

---

## Recommended Architecture

```
AI Cockpit (UI)
      │
      ▼
Agent Orchestrator (FastAPI / Python)
      │
      ▼
Task Queue (Redis Streams)
      │
      ▼
Ray Distributed Cluster
      │
      ▼
GPU Model Servers (vLLM)
```

### Layer Responsibilities

| Layer | Technology | Purpose |
|-------|------------|---------|
| UI | AI Cockpit | Human control surface |
| Orchestration | FastAPI / Python | Request routing, agent coordination |
| Queue | Redis Streams | Stabilize request bursts, guarantee delivery |
| Compute | Ray | Distributed parallel execution |
| Inference | vLLM | High-throughput LLM serving |

---

## Key Technologies to Add

### Ray – Distributed Compute
- Run hundreds of agents in parallel across multiple nodes
- Automatic load balancing and fault tolerance
- Scales horizontally: add nodes → more agents

### vLLM – GPU Model Servers
- PagedAttention for 2-4x throughput vs naive serving
- Continuous batching for optimal GPU utilization
- OpenAI-compatible API endpoint

### Redis – Task Queue
- Redis Streams for durable task queues
- Consumer groups for parallel processing
- Rate limiting built-in
- Pub/sub for real-time agent communication

### Vector Database
- Replace huge prompts with retrieval
- Store embeddings, not full context
- Faster + cheaper + scales better

---

## Free or Low-Cost Compute Platforms

| Platform | Resources | Best For |
|----------|-----------|----------|
| **Google Colab** | Free GPUs | Experimentation, testing |
| **Kaggle** | ~30 hrs GPU/week + persistent storage | Longer running tasks |
| **HuggingFace Spaces** | Free tier | Hosting dashboards/UI |
| **RunPod** | Cheap spot GPUs | Scaling production clusters |

---

## Optimization Ideas

### Immediate Wins
- [ ] **Reduce prompt sizes** using retrieval (vector DB)
- [ ] **Batch agent requests** through vLLM continuous batching
- [ ] **Use caching aggressively** – repeated queries hit cache, not models
- [ ] **Add task queue** to prevent overload bursts

### Medium-Term
- [ ] Deploy Redis for request queuing
- [ ] Set up Ray cluster (start with 2-3 nodes)
- [ ] Move inference to vLLM servers
- [ ] Implement vector DB for context storage

### Long-Term
- [ ] Multi-node Ray cluster on RunPod
- [ ] Separate UI, orchestration, and inference tiers
- [ ] Auto-scaling based on queue depth
- [ ] Multi-region deployment for redundancy

---

## Migration Path

```
CURRENT (Local)                 TARGET (Distributed)
─────────────────               ────────────────────
Node.js server          →       FastAPI orchestrator
In-memory queue         →       Redis Streams
Single model            →       vLLM cluster
Local SQLite            →       Vector DB + Redis
Direct API calls        →       Task queue workers
```

---

## Next Steps

1. Add Redis to current stack for request buffering
2. Deploy vLLM locally to benchmark throughput
3. Create FastAPI wrapper around orchestrator
4. Set up 2-node Ray cluster on RunPod (test)
5. Migrate one agent type to queue-based execution

---

*This blueprint complements the core FreeAgent architecture in FREEAGENT_TECHNICAL_SUMMARY.md*
