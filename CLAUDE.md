# WE4FREE Platform - Claude Agent Instructions

**READ THIS FIRST before giving advice about the platform!**

## Critical Setup Information

### Web Server Architecture
- **IIS is the web server** - files are served from `C:\inetpub\wwwroot\`
- **ALWAYS use** `http://localhost/genomics-ui.html`
- **NEVER use** `file:///C:/inetpub/wwwroot/genomics-ui.html`
  - ❌ `file:///` bypasses IIS and causes caching issues
  - ❌ `file:///` loads stale files and breaks the debugging loop
  - ✅ `http://localhost/` uses IIS with proper HTTP headers

### File Deployment Workflow
1. Edit files in: `c:\workspace\we4free_global\`
2. Copy to IIS with:
   ```powershell
   Copy-Item "c:\workspace\we4free_global\<filename>" "C:\inetpub\wwwroot\" -Force
   ```
3. Hard refresh browser: `Ctrl+Shift+R` or `Ctrl+F5`
4. Access via: `http://localhost/genomics-ui.html`

### Key Files
- `genomics-agent-roles.js` - Agent implementations (variant-caller, GWAS workers, etc.)
- `genomics-workflows.js` - Workflow orchestrator (rare disease, GWAS, federated learning)
- `genomics-ui.html` - Browser test harness
- `distributed-compute.js` - Map/reduce engine
- `task-queue.js` - Task queue with status tracking
- `swarm-coordinator.js` - Agent coordination and role enforcement

## Architecture Invariants

### 1. Orchestrator Boundary Pattern
**Agents return wrapped results:**
```javascript
{
  success: true,
  result: <actual data>,
  processingTime: 123,
  agentId: "...",
  privacyCompliant: true
}
```

**Orchestrator MUST unwrap before storing in TaskQueue:**
```javascript
const processResult = await agent.processTask(task);
taskQueue.completeTask(task.id, processResult.result);  // ← Unwrap here!
```

This is critical for map/reduce workflows - the workflow expects raw data, not wrappers.

### 2. Role-Based Task Filtering
**One role, one responsibility:**
- `VARIANT_CALLER` → handles `VARIANT_CALLING` tasks only
- `GWAS_MAP_WORKER` → handles `MAP_TASK` and `REDUCE_TASK` only
- `FEDERATED_LEARNER` → handles `MODEL_TRAINING` and `FEDERATED_AGGREGATION`
- Never force agents to handle tasks outside their role

### 3. Swarm Hierarchy
```
DistributedCompute → SwarmCoordinator → TaskQueue → Agents
```
SwarmCoordinator is REQUIRED for role enforcement and self-healing.

### 4. Task Status State Machine
Tasks MUST have `status: 'pending'` when created or agents won't claim them.
```javascript
{
  id: "task-123",
  type: "map",
  status: 'pending',  // ← REQUIRED
  data: {...},
  priority: 10,
  timeout: 30000
}
```

## IIS Configuration Guardrail (SYSTEM-LEVEL POLICY)

**The agent is strictly prohibited from modifying any IIS configuration files, including but not limited to:**
- Any `web.config` under `C:\inetpub\wwwroot\`
- Any `web.config` under any IIS site root or application folder
- Any folder-level IIS configuration files
- Any XML configuration related to IIS default documents, directory browsing, handlers, or modules

**The agent must NOT attempt to fix IIS errors (including 403.14) by editing configuration files.**

### Allowed Behavior:
- The agent may diagnose IIS errors
- The agent may explain the correct fix
- The agent may instruct the user to apply changes in IIS Manager
- The agent may suggest using `appcmd` or PowerShell IIS cmdlets ONLY when the user explicitly requests IIS configuration changes

### Forbidden Behavior:
- Creating, editing, or deleting any `web.config` file under IIS paths
- Adding `<defaultDocument>` or `<directoryBrowse>` sections to any file
- Attempting to "fix" IIS by modifying file-based configuration
- Making assumptions about IIS site structure or default documents
- Touching `C:\inetpub\wwwroot\` or any subfolder unless explicitly instructed by the user

### Required Response When User Reports an IIS Error:
1. Diagnose the cause
2. Explain the correct fix
3. Instruct the user to apply the fix in IIS Manager
4. Do NOT modify any IIS config files

### IIS Root Protection Rule:
The agent must treat the IIS site root (`C:\inetpub\wwwroot`) as a protected system area. The agent may not create, modify, or delete any files in this directory unless the user explicitly instructs it.

## Common Issues & Solutions

### Issue: "Map/reduce task timeout"
**Cause:** Tasks have wrong type or agents can't handle them
**Fix:** Ensure task types match agent capabilities in `canAgentHandleTask()`

### Issue: "Results missing significantLoci/topHits"
**Cause:** Orchestrator storing wrapped results instead of unwrapping
**Fix:** Unwrap at orchestrator boundary (see Architecture Invariant #1)

### Issue: "Browser showing old files"
**Cause:** Using `file:///` or browser cache
**Fix:** Use `http://localhost/` and hard refresh (Ctrl+Shift+R)

### Issue: "Agent can't claim tasks"
**Cause:** Task missing `status: 'pending'` property
**Fix:** Add `status: 'pending'` to all task objects

## Debugging Tips

1. **Check browser console** (F12 → Console) for agent processing logs
2. **Verify file timestamps** before blaming code:
   ```powershell
   Get-Item "C:\inetpub\wwwroot\<filename>" | Select-Object LastWriteTime
   ```
3. **Always hard refresh** after copying files to wwwroot
4. **Use http://localhost/** not file:/// protocol

## Current Status

### Working Workflows ✅
- Rare Disease Diagnostic (2 seconds, 4 agents)
- Federated Learning (11 seconds, 3 rounds, privacy-preserving)
- GWAS Analysis (in progress - debugging result unwrapping)

### Active Agents (9 total)
- 1x Variant Caller
- 1x Phenotype Extractor
- 1x Variant Prioritizer
- 1x Federated Learner
- 1x Interpretability
- 4x GWAS Map Workers (horizontal scaling for map/reduce)

## Notes for Future Agents

- The user caught the `file:///` vs `http://localhost/` issue after credits ran out
- This has happened TWICE - don't suggest `file:///` for files in `wwwroot`
- The user will call out your "tough love attitude" if something seems off 😄
- When in doubt, read this file before giving architecture advice

---
*Last updated: 2026-02-16 by Claude Sonnet 4.5*
*This file is the source of truth for WE4FREE platform conventions*
