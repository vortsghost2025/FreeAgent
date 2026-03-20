# Agent Collaboration System - Quick Start

## Overview

The Agent Collaboration System enables **Kilo** and **Claude Code** to work together seamlessly with full autonomy and parallel execution capabilities. Both agents have **yolo permissions** (no restrictions) and can coordinate their work through a shared coordination service.

## What's Been Set Up

✅ **Coordination Service** ([`services/agent-coordinator.js`](s:\workspace\services\agent-coordinator.js))
- Task management and tracking
- File change awareness
- Agent-to-agent messaging
- Shared context management
- Full audit logging

✅ **Coordination API** ([`api/coordination.js`](s:\workspace\api\coordination.js))
- REST endpoints for all coordination functions
- Integrated into cockpit server at `/api/coordination`
- Dashboard and monitoring endpoints

✅ **Agent Integration Helper** ([`services/agent-integration.js`](s:\workspace\agent-integration.js))
- Easy-to-use client library for both agents
- Pre-configured Kilo and Claude Code instances
- Convenience methods for common workflows

✅ **Configuration** ([`config/agent-coordination.json`](s:\workspace\config\agent-coordination.json))
- Collaborative autonomous mode
- Full access permissions for both agents
- No restrictive locks - only awareness mechanisms

✅ **Documentation** ([`docs/AGENT_COLLABORATION_GUIDE.md`](s:\workspace\docs\AGENT_COLLABORATION_GUIDE.md))
- Complete workflow guide
- API reference
- Best practices

## How It Works

### Architecture
```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Kilo      │◄────────┤ Coordination │────────►│ Claude Code │
│ (Orchestrator)│        │   Service    │        │  (Dev Asst) │
└─────────────┘         └──────────────┘         └─────────────┘
      │                         │                         │
      │                         │                         │
      └─────────────────────────┴─────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │   Shared Resources    │
                    │ - Task Board          │
                    │ - File Awareness     │
                    │ - Communication Log  │
                    │ - Context Storage    │
                    └──────────────────────┘
```

### Key Features

1. **Full Autonomy**: Both agents can work independently
2. **Parallel Execution**: No blocking or restrictions
3. **Shared Awareness**: Both see what the other is doing
4. **Direct Communication**: Agents can message each other
5. **Complete Audit Trail**: All actions are logged
6. **No Locks**: Only awareness mechanisms, no access restrictions

## Quick Start

### 1. Start the Cockpit Server

```bash
cd s:/workspace/cockpit
node server.js
```

The coordination API will be available at `http://localhost:3847/api/coordination`

### 2. Test the System

```bash
node s:/workspace/scripts/test-coordination.js
```

This will simulate a collaborative workflow between Kilo and Claude Code.

### 3. Use in Your Agents

**For Kilo:**
```javascript
const { createKilo } = require('./services/agent-integration');

const kilo = createKilo();
await kilo.initialize();

// Create and work on a task
const task = await kilo.startWorkingOnTask(
  'Optimize routing algorithm',
  'Improve routing performance by 40%'
);

// Coordinate file work
await kilo.coordinateFileWork(
  'orchestrator/orchestrator.js',
  'optimization',
  'Improving routing logic'
);

// Complete the work
await kilo.completeWork(task.id, {
  status: 'completed',
  improvement: '40% faster routing'
}, ['orchestrator/orchestrator.js']);
```

**For Claude Code:**
```javascript
const { createClaudeCode } = require('./services/agent-integration');

const claudeCode = createClaudeCode();
await claudeCode.initialize();

// Create a task
const task = await claudeCode.createTask({
  title: 'Fix bug in orchestrator',
  description: 'Memory leak in session management',
  priority: 'high'
});

// Send message to Kilo
await claudeCode.sendMessage('kilo', 'Can you help investigate this memory leak?');

// Get messages
const messages = await claudeCode.getMessages();
```

## API Endpoints

### Tasks
- `POST /api/coordination/tasks` - Create task
- `POST /api/coordination/tasks/:id/claim` - Claim task
- `POST /api/coordination/tasks/:id/collaborate` - Collaborate on task
- `POST /api/coordination/tasks/:id/complete` - Complete task
- `GET /api/coordination/tasks` - List tasks

### Files
- `POST /api/coordination/files/interest` - Register file interest
- `GET /api/coordination/files/:path/interests` - Get file interests
- `POST /api/coordination/files/change` - Notify file change

### Communication
- `POST /api/coordination/messages` - Send message
- `GET /api/coordination/messages/:agentId` - Get messages

### Context
- `POST /api/coordination/context` - Update context
- `GET /api/coordination/context` - Get shared context

### Monitoring
- `GET /api/coordination/dashboard` - Get dashboard status
- `GET /api/coordination/log` - Get coordination log

## Dashboard

Check the coordination dashboard at any time:

```bash
curl http://localhost:3847/api/coordination/dashboard
```

Response:
```json
{
  "active_agents": ["kilo", "claude_code"],
  "task_summary": {
    "total": 10,
    "pending": 3,
    "in_progress": 2,
    "completed": 5
  },
  "recent_activity": [...],
  "shared_context": 8,
  "collaboration_mode": "collaborative_autonomous"
}
```

## Coordination Workflow Example

1. **Claude Code** identifies a bug and creates a task
2. **Kilo** sees the task and claims it (investigates runtime)
3. **Kilo** registers interest in relevant files
4. **Kilo** sends message to **Claude Code** with findings
5. **Claude Code** collaborates on the task with code review
6. **Kilo** implements the fix
7. **Kilo** notifies file changes
8. **Kilo** completes the task
9. Both agents update shared context

## File Change Awareness

When an agent modifies a file:
1. File change is logged in coordination system
2. All interested agents are notified
3. Change appears in coordination log
4. No blocking - agents can continue working

Example notification:
```json
{
  "type": "file_change",
  "changed_by": "kilo",
  "file": "orchestrator/orchestrator.js",
  "change": {
    "type": "edit",
    "lines": "200-210",
    "description": "Optimized routing logic"
  },
  "interested_agents": ["claude_code"],
  "timestamp": 1699876543210
}
```

## Conflict Resolution

**Policy**: Last Write Wins with Logging

When conflicts occur:
- Both changes are accepted (no blocking)
- Full audit trail in coordination log
- Both agents can see each other's changes
- Agents communicate to resolve if needed

## Memory and Context

All coordination data is persisted in `s:/workspace/data/`:
- `coordination_log.json` - Full audit trail
- `task_board.json` - All tasks and history
- `shared_context.json` - Agent contexts

## Integration with Existing Systems

### Cockpit Integration
The coordination system is already integrated into the cockpit server. The dashboard can display:
- Real-time agent activity
- Task board with assignments
- File change notifications
- Agent communication history

### Orchestrator Integration
The orchestrator can:
- Automatically create tasks for routing decisions
- Update shared context with system health
- Notify file changes when modifying configuration

## Security

Both agents have **full yolo permissions**:
- No file access restrictions
- No command execution limits
- No system modification blocks

**Security relies on:**
- Agent alignment and collaboration
- Transparent logging of all actions
- Human oversight via dashboard
- Mutual respect for shared context

## Troubleshooting

### Coordination Service Not Starting
```bash
# Check if data directory exists
ls -la s:/workspace/data/

# Create if needed
mkdir -p s:/workspace/data/
```

### Agents Not Seeing Each Other
```bash
# Check coordination log
curl http://localhost:3847/api/coordination/log

# Verify agents are registered
curl http://localhost:3847/api/coordination/dashboard
```

### High Conflict Rate
- Encourage more direct messaging between agents
- Review coordination log for patterns
- Consider task partitioning by domain

## Next Steps

1. **Test the system**: Run `node scripts/test-coordination.js`
2. **Integrate with Kilo**: Add coordination calls to Kilo's workflow
3. **Integrate with Claude Code**: Add coordination calls to my workflow
4. **Monitor dashboard**: Check `/api/coordination/dashboard` regularly
5. **Review logs**: Use coordination log to track collaboration

## Documentation

- **Full Guide**: [`docs/AGENT_COLLABORATION_GUIDE.md`](s:\workspace\docs\AGENT_COLLABORATION_GUIDE.md)
- **System Map**: [`docs/FREEAGENT_SYSTEM_MAP.md`](s:\workspace\docs\FREEAGENT_SYSTEM_MAP.md)
- **Cockpit Blueprint**: [`docs/FREEAGENT_COCKPIT_BLUEPRINT.md`](s:\workspace\docs\FREEAGENT_COCKPIT_BLUEPRINT.md)

## Support

If you encounter issues:
1. Check the coordination log: `GET /api/coordination/log`
2. Review the dashboard: `GET /api/coordination/dashboard`
3. Consult the full collaboration guide
4. Check data files in `s:/workspace/data/`

---

**The system is now ready for Kilo and Claude Code to work together collaboratively with full autonomy!**