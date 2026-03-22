# S:/workspace/docs — Condensed Index
*Auto-generated summary for AI agents. Read this instead of individual docs.*

## Physical Architecture
- **Oracle Cloud** (8 vCPU / 24 GB) — canonical backend: orchestrator, SvelteKit UI, vector DB, job runners
- **Windows S: drive** — correct workspace (300GB isolated drive, NOT C: or Cloud Shell)
- **Windows local GPU** — Ollama/LM Studio for local model inference
- **Claude API** — external reasoning layer

## Logical Layer Stack (top to bottom)
```
Cockpit UI → Orchestration → Work/Verification/Consensus → Governance → Federation → Resilience → Memory Substrate
```
Each layer has its own spec doc. MASTER_ARCHITECTURE_BLUEPRINT.md maps all layers.

## Key System Components

### Cockpit (FREEAGENT_COCKPIT_BLUEPRINT.md, COCKPIT_ORCHESTRATION_LAYER.md)
- 4-pane UI: nav (left), task/conversation (center), memory/context (right), logs (bottom)
- Modes: human-at-the-helm (confirmations required) vs autonomous (auto-approve safe actions)
- WebSocket broadcast, agent router, swarm coordinator
- Agent modes: Local (direct call), Background (async), Cloud/Remote (network)

### Orchestrator / FreeAgent Runtime (FREEAGENT_SYSTEM_MAP.md, FREEAGENT_SWARM_BOOT.md)
- Runtime loop: poll metrics → compute stress score → adjust concurrency → route tasks
- Stress scoring drives throttling and rolling cleanup (kills orphans, clears caches)
- Provider scoring: success rate (50%) + latency (30%) + recency (20%); fallback cooldown 30s→240s
- Event bus: Redis Streams — freeagent:tasks, freeagent:results, freeagent:events, freeagent:metrics
- Boot: kill ports → Redis → services → orchestrator → router → core agents → cockpit UI

### Adaptive Router (FREEAGENT_TECHNICAL_SUMMARY.md)
- 604-line component — most valuable single file
- Tracks agent performance with sliding-window metrics
- Classifies errors, scores confidence, selects providers dynamically

### Agent Roles (AGENT_ROLE_MATRIX.md)
- 7 roles: Orchestrator, Executor, Analyst, Reviewer, Researcher, Planner, Memory
- Hierarchy: Human → Orchestrator → Planner/Analyst/Reviewer → Executors
- Autonomy levels 0–4; role assignment scored: 50% capability, 20% autonomy, 15% urgency, 15% complexity
- **Kilo = Orchestrator** (strategic, task decomposition, delegation, memory management)
- **Claude = Executor/Analyst** (implementation, code, debugging, QA)

### Governance Pipeline (GOVERNED_ACTION_PIPELINE.md, GOVERNANCE_LAYER_SPEC.md)
- 8 phases: Observe → Analyze → Strategize → Simulate → Propose → Govern → Act → Learn
- Gate requires: ≥85% confidence, ≤MEDIUM risk, rollback available, no recent failures
- Autonomy levels: supervised / semi-autonomous / fully autonomous
- Escalation: peer review (30s) → senior review (60s) → human (300s)

### Dual Verification (DUAL_VERIFICATION_PROTOCOL.md)
- Lane L = conservative/policy-heavy; Lane R = adversarial/stress-test
- FULL agree → proceed; PARTIAL → weighted merge + warning; DISAGREE → escalate to human
- Required for: production deploys, config changes, destructive ops, infra changes

### Consensus Engine (CONSENSUS_ENGINE_SPEC.md)
- Types: simple majority (50%+1), supermajority (66%), unanimous, dual-lane
- Impact level determines required quorum
- Conflict: simultaneous proposals → first wins; competing → highest impact wins

### Federation (FEDERATION_PROTOCOL.md, FEDERATION_COORDINATOR_SPEC.md)
- Types: Local → Workspace → Network → Cloud
- Handshake establishes capabilities, trust, compatibility
- Pattern propagation filtered by trust threshold, capability match, TTL
- Sync: full (on connect), delta (periodic), on-demand, push-based

### Memory Substrate (MEMORY_SUBSTRATE_SPEC.md)
- SQLite + vector embeddings
- Session memory / long-term memory / task memory / system memory
- FreeAgent's memory bank: `free-coding-agent/memory/` (73MB — do not delete)

### Collaboration Protocol (AGENT_COLLABORATION_GUIDE.md)
- Task delegation via `new_task` tool with full context
- Shared state: Coordination API for progress tracking
- Session lifecycle: create → register → active → handoff → archive
- Conflict resolution: identify → communicate → negotiate → resolve/escalate

## Sean's Working Style (FREEAGENT_BOOTSTRAP.md)
- Nonlinear, architectural, intuition-driven, high cognitive tempo
- Assistant rules: maintain continuity, provide concrete code/architecture, avoid re-explaining, keep pace
- Vision disability — short responses, copy-paste ready

## Status Notes (ORACLE_CLOUD_TRANSITION.md)
- Correct workspace: S: drive (300GB isolated)
- Oracle Cloud Shell: temporary only
- Windows C: drive: incorrect location
