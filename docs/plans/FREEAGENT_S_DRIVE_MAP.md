# FREEAGENT S: DRIVE WORKSPACE - COMPREHENSIVE SYSTEM MAP

**Generated:** 2026-03-07
**Workspace:** S:/ (300 GB isolated partition)
**Purpose:** Document all files and memory to realign with Sean

---

## 1. DIRECTORY STRUCTURE

```
s:/
├── .env                          # Environment variables
├── .gitignore
├── .npmrc
├── .prettierignore / .prettierrc
├── cockpit.zip                   # Archived cockpit
├── environment.json
├── eslint.config.js
├── fix-port.js
├── FREEAGENT_BOOTSTRAP.md        # CORE: Identity & working style
├── FREEAGENT_COCKPIT_BLUEPRINT.md # Complete cockpit redesign
├── FREEAGENT_PLAN_WORKING.md     # Architecture (Oracle + Local GPU)
├── FREEAGENT_PLAN.md
├── FREEAGENT_SYSTEM_MAP.md       # System architecture
├── keys.example.env
├── localModelClient.js
├── memory.js
├── ORACLE_CLOUD_TRANSITION.md
├── orchestrator.js
├── orchestrator.zip
├── package.json / package-lock.json
├── README.md
├── server.js
├── sessions.js
├── svelte.config.js
├── tsconfig.json
├── vite.config.ts
│
├── -p/                          # Unknown/patch files
├── .vscode/                     # VS Code config
├── agents/                      # Agent implementations
├── backend/                     # Backend server
├── clients/                     # LLM client wrappers
├── cockpit/                     # Cockpit UI (SvelteKit)
├── data/                        # CORE: Memory & data
├── frontend/                    # Frontend assets
├── logs/                        # Log files
├── models/                      # Local models
├── orchestrator/               # Orchestrator module
├── scratch/                     # Scratch/temp files
├── src/                        # SvelteKit source
├── static/                     # Static assets
├── tools/                      # Tool implementations
└── vector/                     # Vector embeddings
```

---

## 2. MEMORY SYSTEM STRUCTURE

### 2.1 Agent Configurations (`data/memory/agents/`)
| Agent | File | Status | Description |
|-------|------|--------|-------------|
| Claw | claw.json | ✅ 75+ sessions | Master orchestration agent |
| Kilo | kilo.json | ⚠️ Minimal | Master orchestrator (needs memory) |
| Code | code.json | ⚠️ Empty | Software development |
| Data | data.json | ⚠️ Empty | Data analysis |
| Clinical | clinical.json | ⚠️ Empty | Medical/healthcare |
| Test | test.json | ⚠️ Empty | QA/Testing |
| Security | security.json | ⚠️ Empty | Security analysis |
| API | api.json | ⚠️ Empty | API development |
| DB | db.json | ⚠️ Empty | Database operations |
| DevOps | devops.json | ⚠️ Empty | DevOps/infrastructure |

### 2.2 Tasks (`data/memory/tasks/`)
- **200+ task files** with timestamps from Feb 26 - Feb 27, 2026
- Task naming: `task-{timestamp}.json`
- Latest task: `task-1772152706954.json` (2026-02-27T00:38:26)
- Contains: input, output, agents_involved, routing, timing, status

### 2.3 Conversations (`data/memory/conversations/`)
- `session-001.json` - Empty
- `session-002.json` - Empty

### 2.4 Patterns (`data/memory/patterns/`)
- All empty JSON files: `[]`
- clinical-patterns.json
- code-patterns.json
- data-patterns.json
- general-patterns.json

### 2.5 Context Blocks (`data/context_blocks/`)
| File | Purpose |
|------|---------|
| BOOTSTRAP.md | Recovery guide for Kilo |
| cockpit-stable.md | Cockpit UI/server status |
| memory-system.md | Memory infrastructure |
| tools.md | Tool bindings |
| mev-engine.md | MEV engine docs |
| MEV_DASHBOARD.md | MEV dashboard |
| MEV_ENGINE_INTEGRATION.md | MEV integration |
| README.md | Context blocks guide |

---

## 3. SOURCE CODE STRUCTURE

### 3.1 SvelteKit App (`src/`)
```
src/
├── app.d.ts
├── app.html
├── lib/
│   ├── index.ts
│   ├── agents/           # Agent definitions
│   │   ├── index.ts
│   │   └── types.ts
│   ├── models/           # LLM clients
│   │   ├── claudeClient.ts
│   │   └── localModelClient.ts
│   ├── orchestrator/    # Core orchestration
│   │   └── orchestrator.ts
│   ├── store/            # State management
│   │   ├── embeddings.ts
│   │   ├── index.ts
│   │   ├── memory.ts
│   │   └── sessions.ts
│   └── tools/            # Tool implementations
│       ├── calculator.ts
│       ├── codeExecution.ts
│       ├── filesystem.ts
│       ├── index.ts
│       ├── types.ts
│       └── webSearch.ts
└── routes/               # API endpoints
    ├── +layout.svelte
    ├── +page.svelte
    └── api/
        ├── memory/
        ├── orchestrator/
        ├── sessions/
        └── tools/
```

### 3.2 Cockpit (`cockpit/`)
- SvelteKit app with metrics, memory, orchestrator
- Client implementations (Claude, Gemini, Local)
- Agent base classes and router

---

## 4. CURRENT STATE ASSESSMENT

### ✅ WORKING COMPONENTS
1. **Bootstrap system** - Identity & working style documented
2. **Orchestrator** - Core loop implemented
3. **Memory storage** - SQLite + JSON files
4. **Agent system** - 9 specialized agents defined
5. **Task execution** - 200+ tasks completed
6. **Cockpit UI** - Four-pane layout designed
7. **Provider routing** - Claude, Groq, Ollama integration

### ⚠️ GAPS IDENTIFIED
1. **Kilo memory** - Minimal (needs full context restoration)
2. **Conversations** - Empty (no conversation history preserved)
3. **Patterns** - Empty (no learned patterns stored)
4. **Most agent memories** - Empty except Claw
5. **Context blocks** - Some reference old paths (c:/workspace/medical/)

### 📅 TIMELINE
- **Feb 25-27, 2026** - Active development period
- **Most recent task** - Feb 27, 2026, 00:38 UTC
- **Current date** - Mar 7, 2026

---

## 5. REALIGNMENT NOTES

### What I Know About Sean:
- Rapid-iteration builder, high cognitive tempo
- Nonlinear, architectural, intuition-driven
- Prefers high-signal, low-friction communication
- Dislikes slow workflows, imposed constraints
- Building FreeAgent - adaptive agent runtime
- Oracle cloud + local GPU architecture

### Key Project Milestones (from memory):
1. ✅ System restoration (Feb 26)
2. ✅ Agent ensemble loading (9 agents)
3. ✅ Comprehensive system tests
4. ✅ Production readiness achieved
5. ⚠️ Memory gaps need filling

### Context Blocks to Load:
1. `FREEAGENT_BOOTSTRAP.md` - My operating instructions
2. `FREEAGENT_PLAN_WORKING.md` - Architecture plan
3. `FREEAGENT_COCKPIT_BLUEPRINT.md` - UI design
4. `data/context_blocks/BOOTSTRAP.md` - Recovery guide

---

## 6. ACTION ITEMS FOR REALIGNMENT

To fully realign with you, I need:

1. **Confirm current objective** - What are you working on now?
2. **Latest context** - Any updates since Feb 27, 2026?
3. **Memory restoration** - Should I read the Claw sessions for context?
4. **Active tasks** - What should I focus on?

---

*This document is saved in the repo at `/plans/FREEAGENT_S_DRIVE_MAP.md`*
