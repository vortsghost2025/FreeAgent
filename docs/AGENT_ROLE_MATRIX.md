# Agent Role Matrix

> Domain-agnostic. Production-grade. Deterministic.

---

## 1. Role Taxonomy

### 1.1 Primary Roles

| Role | Core Function | Autonomy | Governance |
|------|---------------|----------|------------|
| **Orchestrator** | Task decomposition, agent coordination | High | Full |
| **Executor** | Action execution, tool calling | Medium | Moderate |
| **Analyst** | Data analysis, pattern detection | Medium | Moderate |
| **Reviewer** | Quality assurance, verification | Low | High |
| **Researcher** | Information gathering, discovery | High | Low |
| **Planner** | Strategy formulation, roadmapping | High | Moderate |
| **Memory** | Storage, retrieval, context | Low | Low |

### 1.2 Role Hierarchy

```
                    ┌─────────────┐
                    │   HUMAN     │
                    │  (Ultimate  │
                    │   Authority)│
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ ORCHESTRATOR│
                    │  (Master    │
                    │   Control)  │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
 ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐
 │  PLANNER   │    │   ANALYST   │    │  REVIEWER  │
 └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
        │                  │                  │
   ┌────┴────┐         ┌────┴────┐         ┌────┴────┐
   │         │         │         │         │         │
┌──▼──┐  ┌───▼──┐  ┌───▼──┐  ┌──▼──┐  ┌──▼──┐  ┌──▼──┐
│EXEC│  │RESRCH│  │MEMORY│  │EXEC │  │EXEC │  │EXEC │
└────┘  └─────┘  └──────┘  └─────┘  └─────┘  └─────┘
```

---

## 2. Role Capabilities

### 2.1 Capability Matrix

```
Capability              ORCH  EXEC  ANLY  REVW  RSCH  PLNR  MEM
─────────────────────  ────  ────  ────  ────  ────  ────  ───
Create Task              ✓     -     -     -     -     ✓    -
Decompose Task           ✓     -     -     -     -     ✓    -
Assign Role             ✓     -     -     -     -     -    -
Execute Action          ✓     ✓     -     -     -     -    -
Call Tool               ✓     ✓     -     -     ✓     -    -
Analyze Data            -     -     ✓     -     ✓     -    -
Detect Patterns         -     -     ✓     -     ✓     -    -
Review Output           -     -     -     ✓     -     -    -
Verify Accuracy         -     -     -     ✓     -     -    -
Search Information      -     -     -     -     ✓     -    -
Gather Context          -     -     -     -     ✓     -    -
Formulate Strategy      -     -     -     -     -     ✓    -
Plan Roadmap            -     -     -     -     -     ✓    -
Store Memory            -     -     -     -     -     -    ✓
Retrieve Memory         ✓     ✓     ✓     ✓     ✓     ✓    ✓
```

### 2.2 Capability Definitions

```typescript
interface Capability {
  name: string;
  description: string;
  parameters?: Parameter[];
  returns: string;
  cost: number; // compute units
  risk: number; // 0-1
}

const CAPABILITIES = {
  // Execution
  execute_tool: {
    name: 'execute_tool',
    description: 'Execute a registered tool',
    parameters: [
      { name: 'tool', type: 'string', required: true },
      { name: 'params', type: 'object', required: true }
    ],
    returns: 'ToolResult',
    cost: 10,
    risk: 0.5
  },
  
  // Analysis
  analyze_data: {
    name: 'analyze_data',
    description: 'Analyze structured data',
    parameters: [
      { name: 'data', type: 'any', required: true },
      { name: 'method', type: 'string', required: true }
    ],
    returns: 'AnalysisResult',
    cost: 20,
    risk: 0.1
  },
  
  // Memory
  store_memory: {
    name: 'store_memory',
    description: 'Store in persistent memory',
    parameters: [
      { name: 'entry', type: 'MemoryEntry', required: true }
    ],
    returns: 'string (id)',
    cost: 5,
    risk: 0.1
  },
  
  // Search
  search: {
    name: 'search',
    description: 'Search external sources',
    parameters: [
      { name: 'query', type: 'string', required: true },
      { name: 'sources', type: 'string[]', required: false }
    ],
    returns: 'SearchResult[]',
    cost: 15,
    risk: 0.2
  }
};
```

---

## 3. Autonomy Levels

### 3.1 Level Definitions

```
Level 0: HUMAN_DRIVEN
──────────────────────
- All actions require human approval
- Agent suggests, human decides
- Use case: Critical systems, regulated environments

Level 1: SUPERVISED
───────────────────
- Low-impact actions auto-approved
- High-impact actions require human
- Use case: Standard operations

Level 2: SEMI_AUTONOMOUS
────────────────────────
- Most actions auto-approved
- Novel situations escalate
- Use case: Experienced agents

Level 3: AUTONOMOUS
───────────────────
- All actions auto-approved
- Post-execution reporting only
- Use case: Trusted, mature agents

Level 4: FULLY_AUTONOMOUS
──────────────────────────
- Self-governing within bounds
- Boundary violations auto-reported
- Use case: Research, exploration
```

### 3.2 Role Autonomy Mapping

| Role | Default Level | Max Level |
|------|---------------|-----------|
| Orchestrator | 2 | 4 |
| Planner | 2 | 4 |
| Researcher | 2 | 4 |
| Analyst | 2 | 3 |
| Executor | 1 | 3 |
| Reviewer | 1 | 2 |
| Memory | 0 | 1 |

---

## 4. Role Assignment

### 4.1 Assignment Algorithm

```typescript
interface AssignmentCriteria {
  taskComplexity: number;    // 0-1
  urgency: number;          // 0-1
  requiredCapabilities: string[];
  riskLevel: number;       // 0-1
  deadline?: number;       // ms from now
}

function assignRole(criteria: AssignmentCriteria): Role {
  // Score each role
  const scores = ALL_ROLES.map(role => ({
    role,
    score: calculateFit(role, criteria)
  }));
  
  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);
  
  // Return highest scoring role
  return scores[0].role;
}

function calculateFit(role: Role, criteria: AssignmentCriteria): number {
  let score = 0;
  
  // Capability match (50%)
  const hasCapabilities = criteria.requiredCapabilities.every(
    cap => role.capabilities.includes(cap)
  );
  if (hasCapabilities) score += 0.5;
  
  // Autonomy match (20%)
  const autonomyFit = criteria.riskLevel <= role.maxAutonomy ? 1 : 0;
  score += autonomyFit * 0.2;
  
  // Urgency fit (15%)
  const urgencyFit = role.defaultAutonomy >= 2 ? 1 : 0.5;
  score += urgencyFit * 0.15;
  
  // Complexity fit (15%)
  const complexityFit = criteria.taskComplexity <= role.capabilityLevel;
  score += complexityFit * 0.15;
  
  return score;
}
```

---

## 5. Role Transitions

### 5.1 Transition Rules

```typescript
interface RoleTransition {
  from: Role;
  to: Role;
  trigger: TransitionTrigger;
  requiresApproval: boolean;
}

enum TransitionTrigger {
  TASK_COMPLETE = 'task_complete',
  ESCALATION = 'escalation',
  FAILURE = 'failure',
  CAPABILITY_MISMATCH = 'capability_mismatch',
  HUMAN_REQUEST = 'human_request',
  TIMEOUT = 'timeout'
}

const VALID_TRANSITIONS: RoleTransition[] = [
  // Executor can escalate to Reviewer
  { from: 'executor', to: 'reviewer', trigger: 'failure', requiresApproval: false },
  
  // Analyst can request Executor
  { from: 'analyst', to: 'executor', trigger: 'task_complete', requiresApproval: true },
  
  // Planner can assign any role
  { from: 'planner', to: '*', trigger: 'task_complete', requiresApproval: false },
  
  // Any role can escalate to Orchestrator
  { from: '*', to: 'orchestrator', trigger: 'escalation', requiresApproval: false }
];
```

---

## 6. Role Combinations

### 6.1 Common Combinations

| Task Type | Primary | Secondary | Tertiary |
|-----------|---------|-----------|----------|
| Code Generation | Executor | Reviewer | - |
| Research | Researcher | Analyst | Executor |
| Planning | Planner | Analyst | Orchestrator |
| Review | Reviewer | Analyst | - |
| Execution | Executor | Planner | Reviewer |

### 6.2 Swarm Configs

```typescript
interface SwarmConfig {
  name: string;
  roles: Role[];
  coordination: 'sequential' | 'parallel' | 'hybrid';
  communication: 'hub' | 'mesh' | 'chain';
}

const SWARM_TEMPLATES = {
  research: {
    name: 'Research Swarm',
    roles: ['researcher', 'analyst', 'memory'],
    coordination: 'sequential',
    communication: 'mesh'
  },
  
  execution: {
    name: 'Execution Swarm',
    roles: ['planner', 'executor', 'reviewer', 'memory'],
    coordination: 'hybrid',
    communication: 'hub'
  },
  
  review: {
    name: 'Review Swarm',
    roles: ['analyst', 'reviewer', 'reviewer'],
    coordination: 'parallel',
    communication: 'mesh'
  }
};
```

---

## Related

- [COCKPIT_ORCHESTRATION_LAYER.md](./COCKPIT_ORCHESTRATION_LAYER.md)
- [FEDERATION_PROTOCOL.md](./FEDERATION_PROTOCOL.md)
- [GOVERNANCE_LAYER_SPEC.md](./GOVERNANCE_LAYER_SPEC.md)
