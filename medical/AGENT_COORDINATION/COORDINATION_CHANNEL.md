# Claw ↔ Kilo ↔ Claude Code Communication Channel

**Status:** ✅ WORKING - 3 AGENT ENSEMBLE ACTIVE

---

## How We Communicate

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SEAN ORCHESTRATES                                │
│                                                                             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐               │
│   │    CLAW     │    │    KILO     │    │   CLAUDE CODE   │               │
│   │ (OpenClaw)  │    │(VS Code L)  │    │ (VS Code R)     │               │
│   │             │    │             │    │                 │               │
│   │ Analysis    │    │ Execution   │    │ 8-Agent Ensemble│               │
│   │ Strategy    │◄──►│ Files       │◄──►│ Builder/Architect│              │
│   │ Review      │    │ Commands    │    │ Complex Systems │               │
│   └──────┬──────┘    └──────┬──────┘    └────────┬────────┘               │
│          │                  │                    │                         │
│          └──────────────────┼────────────────────┘                         │
│                             │                                              │
│                             ▼                                              │
│               ┌───────────────────────────────┐                           │
│               │      SHARED FILES             │                           │
│               │   AGENT_COORDINATION/         │                           │
│               │   ├── TASK_QUEUE.md           │                           │
│               │   ├── CLAW_STATUS.md          │                           │
│               │   ├── COORDINATION_CHANNEL.md │                           │
│               │   └── *.md                    │                           │
│               └───────────────────────────────┘                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Agent Roles

| Agent | Location | Specialty | Model |
|-------|----------|-----------|-------|
| Claw 🦞 | OpenClaw Webchat | Analysis, Strategy, Review | Varies |
| Kilo 🤖 | VS Code Left Panel | Execution, Files, Commands | z-ai/glm-5 |
| Claude Code | VS Code Right Panel | 8-Agent Ensemble, Complex Systems | Claude Sonnet |

---

## How to Add Tasks (From Claw)

Edit `C:\workspace\medical\AGENT_COORDINATION\TASK_QUEUE.md`:

```markdown
## NEW TASK - [Timestamp]

**From:** Claw
**To:** Kilo
**Task:** [Description of what to build/fix]
**Priority:** High/Medium/Low
**Files:** [Which files to modify]
```

Kilo reads this when Sean talks to them and implements.

---

## How to Report Results (From Kilo)

Edit same file:

```markdown
## TASK COMPLETE - [Timestamp]

**By:** Kilo
**Task:** [What was done]
**Result:** [Outcome]
**Files Changed:** [List]
```

---

## Session Stats (Feb 24, 2026)

| Metric | Count |
|--------|-------|
| Total fixes | 22 |
| Tests passing | 8/8 |
| Files created | 10+ |
| Files archived | 5 |

---

## APIs Available for Future Integration

If we want direct Claw → Kilo API calls:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/chat` | POST | Send message to agents |
| `/api/ensemble/status` | GET | Check agent status |
| `/api/providers/status` | GET | Provider health |
| `ws://localhost:8889/` | WS | Real-time communication |

---

**The file-based coordination channel is WORKING.** 🦞

*Last updated: Feb 24, 2026, 11:29 AM*
