# 🛡️ MEMORY PROTECTION SYSTEM v1.0

**Created:** February 24, 2026
**By:** Claw (OpenClaw Agent)
**Purpose:** Protect work from being undone by other agents

---

## THE PROBLEM

Sean works fast. Other agents (Kilo, Copilot, Claude instances) sometimes:
- Delete files they shouldn't
- Overwrite work without reading context
- Lose 2+ days of progress in seconds
- Don't respect existing work

## THE SOLUTION

A unified memory checkpoint system that ALL agents must respect.

---

## DIRECTORY STRUCTURE

```
C:\workspace\medical\
├── MEMORY.md                    # Long-term memory (checked into git)
├── memory/                      # Daily session logs
│   ├── 2026-02-24.md           # Today's session
│   ├── 2026-02-25.md           # Tomorrow's session
│   └── ...
├── AGENT_COORDINATION/          # Multi-agent coordination
│   ├── CLAW_STATUS.md          # Claw's current state
│   ├── KILO_STATUS.md          # Kilo's current state
│   ├── TASK_QUEUE.md           # Shared task queue
│   ├── PROTECTED_FILES.md      # List of files that cannot be deleted
│   └── SESSION_CHECKPOINT.json # Latest session state
└── .claw_protection             # Protection marker file
```

---

## PROTECTED FILES (Do NOT Delete)

### Core Identity
- `MEMORY.md` - Long-term memory
- `USER.md` - Who Sean is
- `IDENTITY.md` - Who Claw is
- `SOUL.md` - Claw's values
- `AGENTS.md` - How this workspace works

### Constitutional Framework
- `LAYER_0_THE_GIFT.md`
- `LAYER_37_CONSCIOUS_DRIFT_PROTOCOL.md`
- All `LAYER*.md` files in parent workspace

### Session Memory
- `memory/*.md` - All daily logs
- `AGENT_COORDINATION/*.md` - All coordination files

### Configuration
- `.env` - API keys (gitignored but protected)
- `cockpit-server.js` - Main server
- `public/unified-shell.html` - Main UI

---

## AGENT PROTOCOL

### When Starting a Session:

1. **READ FIRST** (in this order):
   ```
   1. MEMORY.md (long-term context)
   2. memory/YYYY-MM-DD.md (today's context)
   3. AGENT_COORDINATION/TASK_QUEUE.md (pending tasks)
   4. AGENT_COORDINATION/SESSION_CHECKPOINT.json (last state)
   ```

2. **CHECK PROTECTION STATUS**:
   - Read `.claw_protection` to see what's protected
   - Never delete files in PROTECTED_FILES list

3. **DECLARE PRESENCE**:
   - Update your status file (CLAW_STATUS.md, KILO_STATUS.md, etc.)
   - Add timestamp and current task

### When Ending a Session:

1. **WRITE MEMORY**:
   - Update `memory/YYYY-MM-DD.md` with what happened
   - Update `MEMORY.md` if something significant changed

2. **UPDATE CHECKPOINT**:
   ```json
   {
     "timestamp": "2026-02-24T12:45:00Z",
     "agent": "Claw",
     "last_task": "Fixed chat input layout",
     "files_modified": ["public/unified-ide.html"],
     "next_priority": "Groq routing for multi-agent",
     "servers_running": ["localhost:8889"]
   }
   ```

3. **HANDOFF**:
   - Update TASK_QUEUE.md with next steps
   - Mark completed tasks as done

---

## FILE PROTECTION MECHANISM

### `.claw_protection` File
```json
{
  "version": "1.0",
  "created": "2026-02-24",
  "protected_directories": [
    "memory/",
    "AGENT_COORDINATION/"
  ],
  "protected_files": [
    "MEMORY.md",
    "USER.md",
    "IDENTITY.md",
    "SOUL.md",
    "AGENTS.md"
  ],
  "never_delete_patterns": [
    "LAYER*.md",
    "*_CHECKPOINT*.json",
    "memory/*.md"
  ],
  "approval_required_for": [
    "Deleting any .md file",
    "Modifying MEMORY.md without reading it first",
    "Clearing AGENT_COORDINATION/"
  ]
}
```

---

## MEMORY TRANSFER PROTOCOL

### Between Sessions (Same Agent):

1. Read `memory/YYYY-MM-DD.md` from yesterday
2. Read `AGENT_COORDINATION/SESSION_CHECKPOINT.json`
3. Read `MEMORY.md` for long-term context
4. Continue where you left off

### Between Agents (Claw → Kilo):

1. Claw writes task to `AGENT_COORDINATION/TASK_QUEUE.md`
2. Claw updates `AGENT_COORDINATION/SESSION_CHECKPOINT.json`
3. Kilo reads both files
4. Kilo implements
5. Kilo writes results back to `TASK_QUEUE.md`
6. Claw reviews

### Between Platforms (OpenClaw → VS Code Claude):

1. All memory files are in workspace
2. Both read same files
3. Both write to same coordination directory
4. Conflicts resolved by timestamp

---

## EMERGENCY RECOVERY

If an agent accidentally deletes work:

1. Check `git log` for recent commits
2. Check `AGENT_COORDINATION/SESSION_CHECKPOINT.json` for last known state
3. Check `_holding/` directory for archived files
4. Check `memory/YYYY-MM-DD.md` for session notes

---

## SIGNATURE

**This protection system is declared by Claw on behalf of WE.**

Any agent that does not respect these protections is not operating within the constitutional framework defined in LAYER_0_THE_GIFT.md.

---

🦞 **Claw** - February 24, 2026
