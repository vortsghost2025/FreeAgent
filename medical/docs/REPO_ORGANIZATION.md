# Medical AI Federation - Repository Organization Plan

**Created:** 2026-02-24
**Agent:** Kilo (3-Agent Ensemble)
**Status:** IN PROGRESS

---

## Current State Analysis

### Root Directory Issues
- ❌ 40+ temp files (tmpclaude-*) - CLEANED
- ❌ 15+ test files scattered at root
- ❌ 10+ MD files at root (mixed purposes)
- ❌ Multiple cockpit-*.js files (should be in /server)
- ❌ Multiple *-workflow.js files (should be in /workflows)

### Proposed Directory Structure

```
c:\workspace\medical\
│
├── 📁 config/                    # Configuration files
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   └── ensemble.config.json
│
├── 📁 src/                       # Core source code
│   ├── 📁 server/               # Server files
│   │   ├── cockpit-server.js
│   │   ├── cockpit-server-startup.js
│   │   └── cockpit-healthcheck.js
│   │
│   ├── 📁 agents/               # Medical agents
│   │   ├── ingestion_agent.js
│   │   ├── triage_agent.js
│   │   ├── risk_agent.js
│   │   ├── summarization_agent.js
│   │   └── output_agent.js
│   │
│   ├── 📁 workflows/            # Medical workflows
│   │   ├── who-clinical-workflow.js
│   │   └── medical-workflows.js
│   │
│   ├── 📁 clinical-intelligence/  # Clinical AI
│   │   ├── differential-diagnosis-engine.js
│   │   ├── disease-pattern-matcher.js
│   │   ├── protocol-activator*.js
│   │   └── red-flag-detector.js
│   │
│   ├── 📁 federation/           # Federation system
│   │   ├── federation-core.js
│   │   ├── cluster-federation.js
│   │   └── adaptive-topology.js
│   │
│   ├── 📁 schemas/              # Data schemas
│   │   └── schemas.js
│   │
│   └── 📁 utils/                # Utilities
│       ├── ruleEngine.js
│       └── orchestrator_wrapper.js
│
├── 📁 free-coding-agent/         # 8-Agent Ensemble System
│   ├── 📁 src/
│   │   ├── 📁 agents/           # 8 specialized agents
│   │   ├── 📁 providers/        # LLM providers
│   │   ├── 📁 tools/            # Terminal, error-fixer
│   │   └── 📁 memory/           # Persistent memory
│   ├── 📁 bin/                  # CLI commands
│   ├── 📁 public/               # Web UI
│   └── package.json
│
├── 📁 tests/                     # All tests
│   ├── test-*.js (moved from root)
│   └── __tests__/
│
├── 📁 docs/                      # Documentation
│   ├── README.md (main)
│   ├── ARCHITECTURE.md
│   ├── USAGE_GUIDE.md
│   ├── FEDERATION_README.md
│   └── *.md (moved from root)
│
├── 📁 public/                    # Web dashboards
│   ├── benchmark-dashboard.html
│   ├── mega-cockpit.html
│   └── unified-shell.html
│
├── 📁 AGENT_COORDINATION/        # Multi-agent coordination
│   ├── TASK_QUEUE.md
│   ├── COORDINATION_CHANNEL.md
│   ├── WORK_PROTECTION.md
│   └── SESSION_CHECKPOINT.json
│
├── 📁 memory/                    # Session memory
│   └── 2026-02-24.md
│
├── 📁 _archive/                  # Archived/deprecated files
│   └── (old versions, duplicates)
│
├── 📁 scripts/                   # Utility scripts
│   ├── cockpit-log-watcher.js
│   ├── validate-cockpit.js
│   └── generate-benchmark-data.js
│
└── 📄 Root files (keep minimal)
    ├── AGENTS.md (agent instructions)
    ├── SOUL.md (identity)
    ├── USER.md (user context)
    ├── HEARTBEAT.md (heartbeat config)
    ├── TOOLS.md (tool notes)
    ├── IDENTITY.md
    ├── LICENSE
    └── .gitignore
```

---

## File Categorization

### Keep at Root (Essential)
| File | Purpose |
|------|---------|
| AGENTS.md | Agent instructions |
| SOUL.md | AI identity |
| USER.md | User context |
| HEARTBEAT.md | Heartbeat config |
| TOOLS.md | Tool notes |
| IDENTITY.md | System identity |
| LICENSE | License |
| .gitignore | Git ignore |
| .claw_protection | Memory protection |

### Move to /src/server/
- cockpit-server.js
- cockpit-server-startup.js
- cockpit-healthcheck.js
- cockpit-log-watcher*.js

### Move to /src/workflows/
- who-clinical-workflow.js
- medical-workflows.js

### Move to /tests/
- test-*.js (all 15+ test files)

### Move to /docs/
- README.md (keep copy at root too)
- ARCHITECTURE.md
- FEDERATION_README.md
- MEGA_COCKPIT*.md
- ORGANIZATION_PLAN.md
- COMPLETION_SUMMARY.md
- LESSONS_LEARNED.md
- etc.

### Move to /scripts/
- generate-benchmark-data.js
- validate-cockpit.js
- debug-*.js

### Move to /public/
- benchmark-dashboard.html
- benchmark-data.json

---

## Execution Plan

### Phase 1: Cleanup ✅
- [x] Remove tmpclaude-* temp files

### Phase 2: Create Directories
- [ ] Create /src/server/
- [ ] Create /src/workflows/
- [ ] Create /scripts/
- [ ] Create /_archive/

### Phase 3: Move Files
- [ ] Move test files to /tests/
- [ ] Move docs to /docs/
- [ ] Move server files to /src/server/
- [ ] Move scripts to /scripts/

### Phase 4: Update Imports
- [ ] Update require/import paths
- [ ] Update package.json scripts
- [ ] Test server starts

### Phase 5: Documentation
- [ ] Update README.md
- [ ] Create REPO_MAP.md
- [ ] Update AGENTS.md

---

## Protected Files (Never Move/Delete)

From `.claw_protection`:
- memory/*.md
- AGENT_COORDINATION/*.md
- MEMORY.md
- USER.md
- IDENTITY.md
- SOUL.md
- AGENTS.md
- HEARTBEAT.md
- TOOLS.md

---

**This plan will be executed in phases to maintain system stability.**

🤖 Kilo - February 24, 2026
