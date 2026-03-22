# Advanced Multi-Agent Services

This guide provides comprehensive documentation for the advanced multi-agent coordination services that have been integrated into the FreeAgent Cockpit system. These services enable sophisticated multi-agent orchestration, cost tracking, and real-time monitoring capabilities.

## Overview

The FreeAgent Cockpit system now includes six advanced multi-agent coordination services:

1. **Recursive Reasoning Engine** - Enables self-refinement and iterative reasoning
2. **Cost Tracking Layer** - Monitors token usage and costs across all agent calls
3. **Iteration Governor** - Prevents infinite recursion with configurable limits
4. **Context Slice Environment** - Smart context management without passing full windows
5. **Multi-Agent Scheduler** - Coordinates parallel work across multiple agents
6. **Real-Time Dashboard** - Live monitoring of multi-agent activities via WebSocket

## Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FreeAgent Cockpit Server                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              REST API Endpoints (port 3847)                  │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │  /api/services/recursive/* - Recursive reasoning            │ │
│  │  /api/services/cost/* - Cost tracking                        │ │
│  │  /api/services/iteration/* - Iteration governance           │ │
│  │  /api/services/context/* - Context management               │ │
│  │  /api/services/scheduler/* - Task scheduling                │ │
│  │  /api/services/dashboard/* - Real-time monitoring          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                          ↓                                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Advanced Multi-Agent Services                   │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │  RecursiveEngine | CostTracker | IterationGovernor         │ │
│  │  ContextSlice | MultiAgentScheduler | RealTimeDashboard     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                          ↓                                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Agent Coordinator (Central Coordination)        │ │
│  │  - Task management - Agent messaging - Context sharing     │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 1. Recursive Reasoning Engine

### Purpose
Enables self-refinement and iterative reasoning capabilities for agents, allowing them to improve their responses through multiple refinement cycles.

### Key Features
- **Self-refinement**: Automatically refines responses based on feedback
- **Termination signals**: Detects completion signals (FINAL(), DONE(), END(), COMPLETE())
- **Cost estimation**: Tracks estimated token usage for each iteration
- **Call stack management**: Manages active recursive calls
- **Progress tracking**: Monitors iteration progress and improvements

### API Endpoints

#### Execute Recursive Call
```bash
POST /api/services/recursive/execute
Content-Type: application/json

{
  "agent_id": "claude_code",
  "prompt": "Implement a REST API endpoint for user authentication",
  "context": {
    "framework": "Express.js",
    "auth_method": "JWT",
    "previous_attempts": []
  }
}
```

#### Get Call History
```bash
GET /api/services/recursive/history/:agentId
```

#### Get Status
```bash
GET /api/services/recursive/status/:agentId
```

### Usage Example

```javascript
// Initialize recursive engine
const { getEngine } = require('../services/recursive-engine');
const engine = getEngine();

// Execute recursive call
const result = await engine.executeRecursiveCall(
  'claude_code',
  'Implement user authentication system',
  {
    requirements: ['JWT tokens', 'password hashing', 'role-based access'],
    constraints: ['No external dependencies']
  }
);

console.log('Final output:', result.final_output);
console.log('Iterations:', result.metadata.iterations);
console.log('Estimated cost:', result.metadata.estimated_cost);
```

### Termination Signals

The engine automatically stops when it detects these signals in the output:
- `FINAL()`
- `DONE()`
- `END()`
- `COMPLETE()`

Example: "FINAL(Implementation complete. All requirements met.)"

## 2. Cost Tracking Layer

### Purpose
Comprehensive monitoring of token usage and costs across all agent calls, with configurable alert thresholds.

### Key Features
- **Per-agent tracking**: Individual statistics for each agent
- **System-wide metrics**: Total tokens and costs across all agents
- **Alert thresholds**: Warning ($10), critical ($50), emergency ($100) levels
- **Daily reset**: Automatic cost archiving and daily reset functionality
- **Pause conditions**: Automatic pause when thresholds exceeded

### Alert Thresholds

| Level | Threshold | Action |
|-------|-----------|---------|
| Warning | $10 | Alert sent to agent |
| Critical | $50 | Alert + pause check triggered |
| Emergency | $100 | Immediate pause + emergency alert |

### API Endpoints

#### Track Method Call
```bash
POST /api/services/cost/track
Content-Type: application/json

{
  "agent_id": "claude_code",
  "method": "code_generation",
  "input": "Create authentication middleware",
  "estimated_tokens": 500
}
```

#### Get Agent Statistics
```bash
GET /api/services/cost/stats/:agentId
```

#### Get System Costs
```bash
GET /api/services/cost/system
```

#### Check Pause Condition
```bash
POST /api/services/cost/check-pause
Content-Type: application/json

{
  "agent_id": "claude_code",
  "operation": "code_generation"
}
```

#### Reset Daily Costs
```bash
POST /api/services/cost/reset
```

### Usage Example

```javascript
// Initialize cost tracker
const { getTracker } = require('../services/cost-tracker');
const tracker = getTracker();

// Track a method call
const result = await tracker.trackMethodCall(
  'claude_code',
  'code_generation',
  { task: 'Implement API endpoint' },
  500 // estimated tokens
);

console.log('Method completed:', result.success);
console.log('Tokens used:', result.cost_summary.actual_tokens);
console.log('Cost:', result.cost_summary.actual_cost);
console.log('Total system cost:', result.usage.total_cost);

// Check if agent should pause
const pauseCheck = await tracker.checkPauseCondition(
  'claude_code',
  'large_scale_operation'
);

if (pauseCheck.should_pause) {
  console.log('PAUSE:', pauseCheck.reason);
}
```

### Cost Estimation

The tracker uses these estimations:
- **Tokens**: ~4 characters per token
- **Cost**: $0.001 per 1,000 tokens (adjust based on actual model pricing)

## 3. Iteration Governor

### Purpose
Prevents infinite recursion and ensures convergence with configurable limits on iterations, output length, and timeout.

### Key Features
- **Iteration limits**: Maximum number of iterations (default: 5)
- **Output length limits**: Maximum output character count (default: 10,000)
- **Timeout protection**: Maximum execution time (default: 30,000ms)
- **Progress detection**: Identifies when iterations aren't making progress
- **Termination signal detection**: Stops when completion signals found

### Configuration

```javascript
const config = {
  maxIterations: 10,      // Maximum iterations before stopping
  maxOutputLength: 20000, // Maximum output characters
  timeoutMs: 60000       // Maximum execution time in ms
};

const governor = getGovernor(config);
```

### API Endpoints

#### Start Iteration
```bash
POST /api/services/iteration/start
Content-Type: application/json

{
  "agent_id": "claude_code",
  "reason": {
    "refinements_applied": [
      "Added error handling",
      "Optimized database queries"
    ]
  }
}
```

#### Complete Iteration
```bash
POST /api/services/iteration/complete
Content-Type: application/json

{
  "agent_id": "claude_code",
  "iteration_id": "iter_claude_code_1234567890_abc123",
  "result": {
    "final_output": "Implementation complete",
    "metadata": {
      "estimated_tokens": 1500,
      "iterations": 3
    }
  }
}
```

#### Stop Iterations
```bash
POST /api/services/iteration/stop
Content-Type: application/json

{
  "agent_id": "claude_code"
}
```

#### Get Iteration History
```bash
GET /api/services/iteration/history/:agentId
```

#### Get Current Status
```bash
GET /api/services/iteration/status/:agentId
```

#### Check if Iteration Allowed
```bash
POST /api/services/iteration/check
Content-Type: application/json

{
  "agent_id": "claude_code",
  "current_iteration": 3,
  "reason": {
    "final_output": "Still working on optimization",
    "refinements_applied": ["Fixed memory leak"]
  }
}
```

### Usage Example

```javascript
// Initialize iteration governor
const { getGovernor } = require('../services/iteration-governor');
const governor = getGovernor({ maxIterations: 5 });

// Start an iteration
const iterationId = await governor.startIteration(
  'claude_code',
  {
    refinements_applied: [
      'Added input validation',
      'Improved error messages'
    ]
  }
);

// Check if next iteration is allowed
const checkResult = await governor.shouldAllowIteration(
  'claude_code',
  2, // current iteration count
  {
    final_output: 'Implementation in progress',
    refinements_applied: ['Optimized database queries']
  }
);

if (checkResult.allowed) {
  console.log('Continue iteration');
} else {
  console.log('Stop:', checkResult.reason);
  console.log('Message:', checkResult.message);
}

// Complete the iteration
const completionResult = await governor.completeIteration(
  'claude_code',
  iterationId,
  {
    final_output: 'Implementation complete with all optimizations',
    metadata: {
      estimated_tokens: 1200,
      iterations: 2
    }
  }
);

console.log('Completed:', completionResult.iteration_count, 'iterations');
```

### Progress Detection

The governor considers progress as:
- Code changes
- Logic fixes
- Optimizations

If no progress is detected across iterations, the governor will stop the process.

## 4. Context Slice Environment

### Purpose
Smart context management that avoids passing full context windows to models, reducing token usage while maintaining relevant information.

### Key Features
- **Context registry**: Store and manage multiple contexts
- **Slicing strategies**: Different approaches to context reduction
- **Smart merging**: Intelligently merges new context with existing
- **Usage tracking**: Monitors context utilization
- **Access optimization**: Tracks frequently accessed contexts

### Slicing Strategies

| Strategy | Description | Best For |
|----------|-------------|----------|
| `summary_only` | Provides overview only | High-level understanding |
| `relevant_chunks` | Extracts task-relevant sections | Specific task execution |
| `optimized` | Removes redundant info | Large contexts with duplicates |

### API Endpoints

#### Register Context
```bash
POST /api/services/context/register
Content-Type: application/json

{
  "agent_id": "claude_code",
  "context": {
    "requirements": ["Authentication", "Database"],
    "constraints": ["No external dependencies"],
    "project_structure": "..."
  }
}
```

#### Get Context
```bash
GET /api/services/context/get?agent_id=claude_code&context_id=ctx_12345&strategy=relevant_chunks
```

#### Update Context
```bash
POST /api/services/context/update
Content-Type: application/json

{
  "agent_id": "claude_code",
  "context_id": "ctx_12345",
  "updates": {
    "new_requirement": "Rate limiting",
    "additional_constraint": "Must use Redis"
  }
}
```

#### Get Usage Statistics
```bash
GET /api/services/context/stats
```

### Usage Example

```javascript
// Initialize context slice
const { getSlice } = require('../services/context-slice');
const contextSlice = getSlice();

// Register context for an agent
const contextId = await contextSlice.registerContext(
  'claude_code',
  {
    project_name: 'E-commerce Platform',
    requirements: [
      'User authentication',
      'Product catalog',
      'Shopping cart',
      'Payment processing'
    ],
    constraints: [
      'Must support 10,000 concurrent users',
      '99.9% uptime requirement'
    ],
    technology_stack: {
      backend: 'Node.js',
      database: 'PostgreSQL',
      cache: 'Redis'
    }
  }
);

// Get context with slicing strategy
const slicedContext = await contextSlice.getContext(
  'claude_code',
  contextId,
  'relevant_chunks' // Strategy
);

console.log('Sliced context:', slicedContext);

// Update context with new information
await contextSlice.updateContext(
  'claude_code',
  contextId,
  {
    new_feature: 'Product recommendations',
    additional_constraint: 'Must use ML model'
  }
);

// Get usage statistics
const stats = contextSlice.getUsageStats();
console.log('Total contexts:', stats.total_contexts);
console.log('Total access count:', stats.total_access);
```

## 5. Multi-Agent Scheduler

### Purpose
Coordinates multiple agents working in parallel on different tasks, with configurable concurrency limits and task prioritization.

### Key Features
- **Parallel execution**: Multiple agents work simultaneously
- **Task queuing**: Priority-based task assignment
- **Dependency management**: Ensures tasks completed in correct order
- **Agent status tracking**: Monitor agent availability and workload
- **Concurrency control**: Configurable maximum parallel agents (default: 3)

### Task Priorities

| Priority | Score | Assignment Order |
|----------|-------|------------------|
| High | 3 | First |
| Medium | 2 | Second |
| Low | 1 | Last |

### API Endpoints

#### Register Agent
```bash
POST /api/services/scheduler/register
Content-Type: application/json

{
  "agent_id": "developer_agent",
  "agent_info": {
    "name": "Developer Agent",
    "role": "code_development",
    "capabilities": ["JavaScript", "Python", "API development"]
  }
}
```

#### Submit Task
```bash
POST /api/services/scheduler/submit
Content-Type: application/json

{
  "title": "Implement user authentication",
  "description": "Create JWT-based authentication system",
  "priority": "high",
  "assigned_to": "developer_agent",
  "dependencies": [],
  "tags": ["security", "authentication"]
}
```

#### Complete Task
```bash
POST /api/services/scheduler/complete
Content-Type: application/json

{
  "task_id": "task_1234567890_abc123",
  "agent_id": "developer_agent",
  "result": {
    "changes": ["auth.js created", "middleware.js updated"],
    "tests": ["test_auth.js passing"],
    "next_steps": ["Add role-based access control"]
  }
}
```

#### Get Tasks for Agent
```bash
GET /api/services/scheduler/tasks/:agentId
```

#### Get Scheduler Status
```bash
GET /api/services/scheduler/status
```

#### Pause Agent
```bash
POST /api/services/scheduler/pause
Content-Type: application/json

{
  "agent_id": "developer_agent"
}
```

#### Resume Agent
```bash
POST /api/services/scheduler/resume
Content-Type: application/json

{
  "agent_id": "developer_agent"
}
```

### Usage Example

```javascript
// Initialize scheduler with custom concurrency
const { getScheduler } = require('../services/multi-agent-scheduler');
const scheduler = getScheduler({ maxConcurrency: 3 });

// Initialize scheduler
await scheduler.initialize();

// Register multiple agents
await scheduler.registerAgent('developer_agent', {
  name: 'Developer Agent',
  role: 'code_development',
  capabilities: ['JavaScript', 'Python']
});

await scheduler.registerAgent('tester_agent', {
  name: 'Tester Agent',
  role: 'testing',
  capabilities: ['Unit tests', 'Integration tests']
});

await scheduler.registerAgent('reviewer_agent', {
  name: 'Reviewer Agent',
  role: 'code_review',
  capabilities: ['Security review', 'Performance review']
});

// Submit multiple tasks
const task1 = await scheduler.submitTask({
  title: 'Implement authentication',
  description: 'Create JWT-based auth system',
  priority: 'high',
  assigned_to: 'developer_agent'
});

const task2 = await scheduler.submitTask({
  title: 'Write unit tests',
  description: 'Test authentication functions',
  priority: 'medium',
  assigned_to: 'tester_agent',
  dependencies: [task1.taskId] // Depends on task 1
});

const task3 = await scheduler.submitTask({
  title: 'Security review',
  description: 'Review authentication security',
  priority: 'high',
  assigned_to: 'reviewer_agent',
  dependencies: [task1.taskId]
});

// Get scheduler status
const status = scheduler.getStatus();
console.log('Active agents:', status.active_agents.length);
console.log('Queued tasks:', status.queued_tasks.length);
console.log('Available capacity:', status.active_capacity);

// Complete a task
await scheduler.completeTask(task1.taskId, 'developer_agent', {
  changes: ['auth.js created', 'middleware.js updated'],
  tests: ['test_auth.js passing'],
  next_steps: ['Add role-based access control']
});

// Get tasks for a specific agent
const agentTasks = await scheduler.getTaskForAgent('developer_agent');
console.log('Tasks for developer:', agentTasks);
```

## 6. Real-Time Dashboard

### Purpose
Live monitoring of multi-agent activities and system status via WebSocket connections, providing real-time visibility into the coordination system.

### Key Features
- **Real-time updates**: 100ms update interval for live monitoring
- **Agent status**: Track all registered agents and their current state
- **Task monitoring**: View task progress, completion rates, and queue status
- **System health**: CPU, memory, and uptime metrics
- **Alert broadcasting**: Send alerts to all connected dashboard clients
- **Recent activity**: Log of recent coordination events

### Dashboard Data Structure

```json
{
  "system": {
    "uptime": 12345.67,
    "agents": 3,
    "tasks": {
      "total": 50,
      "completed": 45,
      "in_progress": [/* 10 recent tasks */]
    },
    "coordination": {
      "active_agents": 3,
      "recent_activity": [/* 10 recent events */]
    },
    "system_health": {
      "cpu": { user: 12345, system: 6789 },
      "memory": { heapUsed: 12345678, heapTotal: 23456789 },
      "uptime": 12345.67
    }
  }
}
```

### API Endpoints

#### Get Dashboard Status
```bash
GET /api/services/dashboard/status
```

#### Send Alert
```bash
POST /api/services/dashboard/alert
Content-Type: application/json

{
  "type": "cost_alert",
  "message": "Critical cost threshold reached: $55.00",
  "severity": "critical"
}
```

#### Broadcast Message
```bash
POST /api/services/dashboard/broadcast
Content-Type: application/json

{
  "message": "System maintenance scheduled for 2:00 AM UTC"
}
```

#### Get System Health
```bash
GET /api/services/dashboard/health
```

### Usage Example

```javascript
// Initialize dashboard
const { getDashboard } = require('../services/real-time-dashboard');
const dashboard = getDashboard(3847); // Port 3847

// Start dashboard server
await dashboard.start();

// Get dashboard status
const status = dashboard.getStatus();
console.log('Dashboard running:', status.running);
console.log('Connected clients:', status.clients_connected);
console.log('Agents tracked:', status.agents_tracked);

// Send alert to all connected clients
await dashboard.sendAlert(
  'cost_alert',
  'Critical cost threshold reached: $55.00',
  'critical'
);

// Broadcast message to all clients
await dashboard.broadcast(
  'System maintenance scheduled for 2:00 AM UTC'
);

// Get system health
const health = {
  system: {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage()
  },
  agents: 3,
  timestamp: Date.now()
};
```

### WebSocket Connection

Connect to the dashboard via WebSocket:

```javascript
const ws = new WebSocket('ws://localhost:3847/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case 'dashboard_connected':
      console.log('Connected with client ID:', data.clientId);
      break;

    case 'dashboard_update':
      console.log('Dashboard state:', data.dashboard);
      break;

    case 'alert':
      console.log('Alert:', data.message);
      console.log('Severity:', data.severity);
      break;

    case 'broadcast':
      console.log('Broadcast:', data.message);
      break;
  }
};
```

### Dashboard Event Types

| Event Type | Description |
|------------|-------------|
| `dashboard_connected` | Initial connection confirmation |
| `dashboard_update` | Periodic dashboard state updates (every 100ms) |
| `alert` | Alert notifications (cost, error, etc.) |
| `broadcast` | System-wide messages |

## Integration Examples

### Complete Multi-Agent Workflow

```javascript
// Initialize all services
const { getEngine } = require('../services/recursive-engine');
const { getTracker } = require('../services/cost-tracker');
const { getGovernor } = require('../services/iteration-governor');
const { getSlice } = require('../services/context-slice');
const { getScheduler } = require('../services/multi-agent-scheduler');
const { getDashboard } = require('../services/real-time-dashboard');

const engine = getEngine();
const tracker = getTracker();
const governor = getGovernor();
const contextSlice = getSlice();
const scheduler = getScheduler({ maxConcurrency: 3 });
const dashboard = getDashboard(3847);

// Initialize services
await scheduler.initialize();
await dashboard.start();
await governor.initialize();

// Register agents for parallel work
await scheduler.registerAgent('claude_code', {
  name: 'Claude Code',
  role: 'development',
  capabilities: ['code_generation', 'debugging']
});

await scheduler.registerAgent('kilo_orchestrator', {
  name: 'Kilo Orchestrator',
  role: 'coordination',
  capabilities: ['task_scheduling', 'agent_management']
});

// Register context for the project
const contextId = await contextSlice.registerContext('claude_code', {
  project: 'E-commerce Platform',
  requirements: ['Authentication', 'Database', 'API'],
  constraints: ['No external dependencies']
});

// Submit high-priority task
const task = await scheduler.submitTask({
  title: 'Implement authentication system',
  description: 'Create JWT-based authentication with role-based access',
  priority: 'high',
  assigned_to: 'claude_code'
});

// Use recursive reasoning for complex problem solving
const result = await engine.executeRecursiveCall(
  'claude_code',
  'Implement authentication system with JWT and role-based access control',
  await contextSlice.getContext('claude_code', contextId, 'relevant_chunks')
);

// Track costs
const costResult = await tracker.trackMethodCall(
  'claude_code',
  'code_generation',
  { task: task.title },
  1500 // estimated tokens
);

// Monitor progress with iteration governor
const iterationId = await governor.startIteration('claude_code', {
  refinements_applied: ['Added JWT implementation', 'Implemented roles']
});

// Complete the task
await scheduler.completeTask(task.taskId, 'claude_code', {
  changes: ['auth.js', 'middleware.js', 'roles.js'],
  tests: ['test_auth.js', 'test_middleware.js'],
  next_steps: ['Add refresh token support']
});

// Complete iteration
await governor.completeIteration('claude_code', iterationId, {
  final_output: result.final_output,
  metadata: result.metadata
});

// Send dashboard alert
await dashboard.sendAlert(
  'task_completed',
  `Authentication system completed by claude_code`,
  'info'
);
```

### Monitoring System Health

```javascript
// Get comprehensive system status
const agentStats = tracker.getUsageStats('claude_code');
const systemCosts = tracker.getSystemCosts();
const schedulerStatus = scheduler.getStatus();
const dashboardStatus = dashboard.getStatus();

console.log('=== System Health Report ===');
console.log('Agent Statistics:');
console.log('  Total calls:', agentStats.total_calls);
console.log('  Successful:', agentStats.successful_calls);
console.log('  Total tokens:', agentStats.total_tokens);
console.log('  Total cost:', `$${agentStats.total_cost.toFixed(4)}`);

console.log('System Costs:');
console.log('  Total tokens:', systemCosts.total_tokens);
console.log('  Total cost:', `$${systemCosts.total_cost.toFixed(4)}`);
console.log('  Calls tracked:', systemCosts.calls_tracked);

console.log('Scheduler Status:');
console.log('  Active agents:', schedulerStatus.active_agents.length);
console.log('  Queued tasks:', schedulerStatus.queued_tasks.length);
console.log('  Available capacity:', schedulerStatus.active_capacity);

console.log('Dashboard Status:');
console.log('  Running:', dashboardStatus.running);
console.log('  Connected clients:', dashboardStatus.clients_connected);
console.log('  Agents tracked:', dashboardStatus.agents_tracked);
console.log('  Uptime:', `${dashboardStatus.uptime.toFixed(2)}s`);
```

## Best Practices

### 1. Cost Management
- Set appropriate alert thresholds based on your budget
- Monitor costs regularly using the `/api/services/cost/stats/:agentId` endpoint
- Use cost tracking to identify expensive operations
- Implement pause conditions when critical thresholds are reached

### 2. Iteration Control
- Use reasonable iteration limits (3-5 for most tasks)
- Monitor iteration progress to detect infinite loops
- Set appropriate output length limits based on expected output size
- Use termination signals explicitly in prompts when completion is expected

### 3. Context Management
- Use slicing strategies to reduce token usage
- Register context once per session and update incrementally
- Choose the appropriate strategy based on the task:
  - `summary_only` for overview tasks
  - `relevant_chunks` for specific implementation tasks
  - `optimized` for large contexts with duplicates

### 4. Multi-Agent Coordination
- Use task dependencies to ensure proper execution order
- Set appropriate concurrency limits based on system resources
- Monitor agent status regularly
- Use agent capabilities to match tasks to the most suitable agents

### 5. Real-Time Monitoring
- Connect to dashboard WebSocket for live updates
- Use alerts for important system events
- Monitor system health metrics regularly
- Use recent activity logs for debugging

### 6. Recursive Reasoning
- Use for complex problems requiring self-refinement
- Set termination signals explicitly to stop iterations
- Monitor cost as iterations can be expensive
- Combine with iteration governor for control

## Troubleshooting

### Common Issues

**Issue: Infinite iterations**
- Solution: Check iteration governor settings, ensure termination signals are used

**Issue: High costs**
- Solution: Check cost thresholds, review context slicing strategy, monitor agent activity

**Issue: Agents not receiving tasks**
- Solution: Check scheduler status, verify agent registration, check agent status (paused/working)

**Issue: Dashboard not connecting**
- Solution: Verify WebSocket port (3847), check firewall settings, ensure dashboard is started

**Issue: Context not reducing token usage**
- Solution: Try different slicing strategies, check if context is properly optimized

### Debug Mode

Enable debug logging by setting environment variable:
```bash
DEBUG=freeagent:* node cockpit/server.js
```

## Performance Considerations

### Optimization Tips
1. Use context slicing to reduce token usage
2. Set appropriate concurrency limits
3. Monitor costs and implement pause conditions
4. Use reasonable iteration limits
5. Cache frequently accessed contexts
6. Monitor system resources (CPU, memory)

### Scalability
- **Small scale (2-3 agents)**: Default settings appropriate
- **Medium scale (4-6 agents)**: Increase concurrency limit to 4-5
- **Large scale (7-8 agents)**: Increase concurrency to 6-8, monitor resources closely

## API Reference

Complete API documentation is available at:
- Cockpit Server: `http://localhost:3847`
- Coordination API: `/api/coordination/*`
- Advanced Services: `/api/services/*`

## Support

For issues and questions:
1. Check this documentation first
2. Review the console logs for error messages
3. Use the `/api/services/dashboard/status` endpoint to check system health
4. Examine the `/api/services/cost/system` endpoint for cost-related issues

## Future Enhancements

Planned improvements to the multi-agent services:
1. Machine learning-based cost prediction
2. Advanced scheduling algorithms
3. Enhanced context optimization
4. Multi-region agent coordination
5. Advanced visualization and analytics
6. Automated agent scaling based on workload
7. Context-aware task routing
8. Enhanced security and access control