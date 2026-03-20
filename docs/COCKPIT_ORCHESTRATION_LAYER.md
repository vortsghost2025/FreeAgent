# Cockpit Orchestration Layer

## Overview

The architectural blueprint for the master control plane that orchestrates multi-agent environments. Adapted from the original Master Orchestration Guide.

> This is the **proto-cockpit** - the skeleton of how you orchestrate intelligence.

---

## Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     MASTER CONTROL PANEL                         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   WebSocket  │  │    Agent      │  │   Swarm     │        │
│  │  Broadcast   │  │    Router    │  │  Coordinator │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   Federation │  │    Status    │  │   Command    │        │
│  │   Manager    │  │   Monitor   │  │    Router    │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Agent Modes

### Local Mode
- Agents run on same instance
- Direct function calls
- Low latency
- High control

### Background Mode
- Agents run as background processes
- Async message passing
- Persistent state
- Resource efficient

### Cloud Mode (Remote)
- Agents run on remote instances
- Network communication
- Horizontal scaling
- Geographic distribution

---

## WebSocket Communication

### Message Types

```typescript
// Agent to Agent
interface AgentMessage {
  type: 'agent_message';
  from: string;
  to: string;
  payload: any;
  timestamp: string;
}

// Agent to Cockpit
interface StatusUpdate {
  type: 'status_update';
  agent: string;
  status: 'idle' | 'running' | 'waiting' | 'error';
  progress?: number;
  timestamp: string;
}

// Cockpit to Human
interface HumanNotification {
  type: 'notification';
  level: 'info' | 'warning' | 'error' | 'action_required';
  message: string;
  actions?: string[];
  timestamp: string;
}
```

### Broadcast Patterns

```javascript
// Broadcast to all agents
async function broadcast(message, agents) {
  const promises = agents.map(agent => 
    agent.send(message).catch(err => ({ error: err.message }))
  );
  return Promise.allSettled(promises);
}

// Broadcast to agent type
async function broadcastToType(message, agentType, registry) {
  const agents = registry.filter(a => a.type === agentType);
  return broadcast(message, agents);
}
```

---

## Swarm Operations

### Role Assignment

```typescript
interface AgentRole {
  id: string;
  type: 'coder' | 'planner' | 'researcher' | 'reviewer' | 'orchestrator';
  capabilities: string[];
  status: 'available' | 'assigned' | 'busy';
}

interface SwarmTask {
  id: string;
  description: string;
  requiredRoles: string[];
  assignedAgents: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}
```

### Coordination Patterns

```javascript
// Sequential execution
async function sequential(task, agents) {
  for (const agent of agents) {
    const result = await agent.execute(task);
    if (result.status === 'failed') break;
    task = transform(task, result);
  }
}

// Parallel execution
async function parallel(task, agents) {
  const results = await Promise.all(
    agents.map(agent => agent.execute(task))
  );
  return consolidate(results);
}

// Round-robin
async function roundRobin(task, agents) {
  const available = agents.filter(a => a.status === 'available');
  const agent = available[agent.index % available.length];
  return agent.execute(task);
}
```

---

## Federation

### Cross-Agent Learning

```typescript
interface FederatedPattern {
  id: string;
  type: string;
  confidence: number;
  source: string;
  createdAt: string;
  metadata: Record<string, any>;
}

interface FederationMessage {
  type: 'pattern_update' | 'state_sync' | 'learnings';
  payload: FederatedPattern[];
  source: string;
  timestamp: string;
}
```

### Pattern Propagation

```javascript
async function propagate(pattern, federation) {
  // 1. Update local confidence
  await localStore.update(pattern.id, { confidence: pattern.confidence });
  
  // 2. Broadcast to peers
  for (const peer of federation.peers) {
    await peer.send({
      type: 'pattern_update',
      pattern: pattern
    });
  }
  
  // 3. Update global confidence
  await federation.globalStore.update(pattern);
}
```

---

## Security & Auditing

### Message Validation

```javascript
function validateMessage(message, schema) {
  const errors = [];
  
  for (const [field, rules] of Object.entries(schema)) {
    if (rules.required && !message[field]) {
      errors.push(`Missing required field: ${field}`);
    }
    if (rules.type && typeof message[field] !== rules.type) {
      errors.push(`Invalid type for ${field}`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}
```

### Audit Log

```typescript
interface AuditEntry {
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  result: 'success' | 'failure';
  metadata: Record<string, any>;
}

async function audit(entry) {
  await auditLog.write(entry);
  
  // Alert on sensitive actions
  if (entry.action in SENSITIVE_ACTIONS) {
    await notify.security(entry);
  }
}
```

---

## Extensibility

### Adding New Agent Types

```javascript
const agentRegistry = {
  coder: CoderAgent,
  planner: PlannerAgent,
  researcher: ResearcherAgent,
  reviewer: ReviewerAgent,
  // Add new types here
};

function registerAgent(type, AgentClass) {
  if (agentRegistry[type]) {
    throw new Error(`Agent type ${type} already registered`);
  }
  agentRegistry[type] = AgentClass;
}

function createAgent(type, config) {
  const AgentClass = agentRegistry[type];
  if (!AgentClass) {
    throw new Error(`Unknown agent type: ${type}`);
  }
  return new AgentClass(config);
}
```

---

## Status Monitoring

### Health Checks

```javascript
async function checkAgentHealth(agent) {
  const checks = await Promise.allSettled([
    agent.ping(),
    agent.getStatus(),
    agent.getMetrics()
  ]);
  
  return {
    agent: agent.id,
    healthy: checks.every(c => c.status === 'fulfilled'),
    checks: checks.map((c, i) => ({
      name: ['ping', 'status', 'metrics'][i],
      passed: c.status === 'fulfilled'
    }))
  };
}
```

### Aggregation

```javascript
async function getSwarmStatus(agents) {
  const statuses = await Promise.all(agents.map(checkAgentHealth));
  
  return {
    total: statuses.length,
    healthy: statuses.filter(s => s.healthy).length,
    agents: statuses,
    timestamp: new Date().toISOString()
  };
}
```

---

## Integration Points

### With Orchestrator

```javascript
const orchestration = {
  // Message routing
  route: (message) => {
    if (message.to) {
      return agents.get(message.to).send(message);
    }
    return broadcast(message, agents.all());
  },
  
  // Swarm coordination
  coordinate: (task, roles) => {
    const assigned = assignAgents(task, roles);
    return executeSwarmTask(task, assigned);
  },
  
  // Federation
  federate: (pattern) => {
    return propagate(pattern, federation);
  }
};
```

### With Persistent Memory

```javascript
// Store swarm state
async function saveSwarmState(agents, memory) {
  const state = {
    agents: agents.map(a => a.getState()),
    tasks: tasks.getAll(),
    timestamp: Date.now()
  };
  await memory.set('swarm_state', state);
}

// Restore swarm state
async function restoreSwarmState(memory, registry) {
  const state = await memory.get('swarm_state');
  if (!state) return;
  
  for (const agentState of state.agents) {
    const agent = registry.create(agentState.type, agentState.config);
    await agent.restore(agentState);
  }
}
```

---

## Related

- [DUAL_VERIFICATION_PROTOCOL.md](./DUAL_VERIFICATION_PROTOCOL.md) - Governance layer
- [GOVERNED_ACTION_PIPELINE.md](./GOVERNED_ACTION_PIPELINE.md) - Action pipeline
- [persistentAgentMemory.js](./persistentAgentMemory.js) - State persistence
