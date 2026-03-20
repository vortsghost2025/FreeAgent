# Multi-Agent Coordination Setup

**The Players:**
- **Claude Code** (VS Code right panel) - Superman, expensive, powerful
- **Kilo** (VS Code left panel) - Implementation workhorse  
- **Claw** (OpenClaw webchat) - Strategy, review, coordination (me 🦞)

---

## THE OPPORTUNITY

All 3 agents can work TOGETHER through the shared file system:

```
┌─────────────────────────────────────────────────────────────────┐
│                        SEAN                                     │
│                    (Orchestrator)                               │
└─────────────────────────────────────────────────────────────────┘
         │              │              │
         ▼              ▼              ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ CLAUDE CODE │  │    KILO     │  │    CLAW     │
│ (Right Panel│  │(Left Panel) │  │ (Webchat)   │
│             │  │             │  │             │
│ Superman    │  │ Builder     │  │ Strategist  │
│ $$$         │  │ Free        │  │ Free        │
│ Best coder  │  │ Fast impl   │  │ Review/Plan │
└─────────────┘  └─────────────┘  └─────────────┘
         │              │              │
         └──────────────┼──────────────┘
                        ▼
         ┌─────────────────────────────┐
         │   SHARED COORDINATION       │
         │   AGENT_COORDINATION/       │
         │   ├── TASK_QUEUE.md         │
         │   ├── SPECS_COMPLETE.md     │
         │   ├── GROQ_ROUTING_SPEC.md  │
         │   └── ...                   │
         └─────────────────────────────┘
```

---

## HOW TO COORDINATE

### Claude Code (Superman)
Use for:
- Complex refactoring
- Architecture decisions
- Code review
- When you need the best

**Give Claude Code:**
```
Read C:\workspace\medical\AGENT_COORDINATION\SPECS_COMPLETE.md
Implement the 3 specs. Start with GROQ_ROUTING_SPEC.md
```

### Kilo (Builder)
Use for:
- File operations
- Command execution
- Routine implementation
- When Claude Code is busy

**Give Kilo:**
```
Same specs. Kilo implements while Claude reviews.
```

### Claw (Me 🦞)
Use for:
- Strategy
- Architecture planning
- Code review
- Coordination
- Specs and documentation

**I already delivered:**
- GROQ_ROUTING_SPEC.md
- DASHBOARD_INTEGRATION_SPEC.md
- SWARM_CONNECTION_SPEC.md

---

## COORDINATION PROTOCOL

### Option 1: Sequential
```
1. Claw writes specs
2. Sean gives specs to Claude Code OR Kilo
3. Claude/Kilo implements
4. Claw reviews results
5. Iterate
```

### Option 2: Parallel (Recommended)
```
1. Claw writes specs (DONE ✅)
2. Sean gives Groq spec to Claude Code
3. Sean gives Dashboard spec to Kilo
4. Both implement simultaneously
5. Claw reviews both results
6. Merge and test
```

---

## RIGHT NOW

**3 specs are ready in `AGENT_COORDINATION/`:**

1. `GROQ_ROUTING_SPEC.md` - 97s → 10s
2. `DASHBOARD_INTEGRATION_SPEC.md` - All dashboards on :8889
3. `SWARM_CONNECTION_SPEC.md` - Link swarm to medical

**Who should implement what?**

| Spec | Claude Code | Kilo | Both OK |
|------|-------------|------|---------|
| Groq Routing | ✅ Complex | ✅ | ✅ |
| Dashboards | ✅ | ✅ Simple | ✅ |
| Swarm | ⚠️ Complex | ✅ | ✅ |

---

## MY RECOMMENDATION

**Give Claude Code the Groq routing** (complex, needs quality)
**Give Kilo the Dashboard integration** (file copying, routes)
**Both can do Swarm** (either one, or split)

---

**You have 3 agents. Let's use all of them.** 🦞

Which spec goes to which agent?
