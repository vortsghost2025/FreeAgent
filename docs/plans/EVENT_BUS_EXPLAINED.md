# What is an Event Bus (Redis Streams)?

## Simple Explanation

An **Event Bus** is like a **digital inbox system** for your agents.

Instead of:
```
Task → Orchestrator → Agent → Orchestrator → Agent → Result
```
(bottleneck - everything goes through one point)

You get:
```
Task → Event Bus → Agent A (picks up task)
              → Agent B (subscribes to updates)
              → Agent C (gets notified when done)
```
(parallel, no bottleneck)

---

## What is Redis Streams?

**Redis** = Fast in-memory database (you likely already have Redis)

**Streams** = A message queue built into Redis

Think of it like a **chat room** where:
- Tasks get posted as messages
- Agents subscribe to specific "channels"
- Results get published back

---

## How It Works in Practice

### Current (Bottleneck):
```
User: "Write code and test it"
     ↓
Orchestrator: "I'll do everything"
     ↓
Code Agent: writes code
     ↓
Orchestrator: "Now test it"
     ↓
Test Agent: runs tests
     ↓
Orchestrator: "Done!"
```

### With Event Bus:
```
User: "Write code and test it"
     ↓
Event Bus: NEW_TASK posted
     ↓
Code Agent (listening): "I'll take this!" → writes code → posts CODE_COMPLETE
     ↓
Test Agent (listening to CODE_COMPLETE): "I see code is done!" → runs tests → posts TEST_COMPLETE
     ↓
Event Bus: TASK_COMPLETE → User gets result
```

---

## Key Benefits

| Benefit | Explanation |
|---------|-------------|
| **Parallel** | Agents work simultaneously, not sequentially |
| **Scalable** | Add more agents without changing code |
| **Resilient** | If one agent fails, others can pick up |
| **Fast** | No waiting for orchestrator to coordinate everything |
| **Debuggable** | You can see every message flow |

---

## What You Need to Add

1. **Install Redis** (if not already)
2. **Add Redis client** to your code
3. **Agents subscribe** to task events
4. **Agents publish** results

### Simple Code Example:

```javascript
// Producer: Post a task
redis.xadd('tasks', '*', { type: 'code_task', payload: 'write tests' });

// Consumer: Agent subscribes
redis.xreadgroup('GROUP', 'agents', 'BLOCK', 0, 'STREAMS', 'tasks', '>');

// Agent does work, then:
redis.xadd('results', '*', { task_id: '...', status: 'done' });
```

---

## Why This Matters for Scaling

- **100 agents** = No problem (they all subscribe to queue)
- **1000 agents** = Still works (just more listeners)
- **Without event bus** = Orchestrator becomes traffic jam at ~50 agents

---

## TL;DR

**Event Bus = A message queue that lets agents communicate in parallel instead of waiting for one central orchestrator.**

It's the difference between:
- 🚶 Walking through one door (bottleneck)
- 🚪🚪🚪 Many doors opening at once (parallel)
