High-level architecture
Goal:
Oracle runs the brain (orchestrator, agents, APIs).
Your local machine runs the muscle (GPU models).
Claude lives behind the Oracle backend as a pure API tool.

1. Roles of each environment
Oracle cloud instance (8 vCPU / 24 GB)
- Primary role: Canonical FreeAgent backend.
- Runs:
- SvelteKit app (frontend + routes)
- /api/orchestrator — main entrypoint for conversations
- Agent registry (definitions, capabilities, routing)
- Claude client (API wrapper)
- Vector DB (Qdrant/Postgres/SQLite to start)
- Job runners (cron, background tasks)
- Owns:
- Conversation state
- Agent state
- Tool configs
- Logs and traces
Local machine (Windows + GPU)
- Primary role: Local model inference endpoint.
- Runs:
- Model server (e.g., Ollama or LM Studio HTTP server)
- Optional: embedding model server
- Exposes:
- http://<your-public-or-tunneled-ip>:PORT/infer (text)
- http://<...>/embed (optional)
- Does not own:
- Orchestration
- Long-term state
- Routing

2. Network and trust boundaries
- Oracle → Local GPU:
- Oracle calls your local model server over HTTPS (via:
- Tailscale, or
- Cloudflare Tunnel, or
- a direct port-forward with strict firewall rules).
- Oracle → Claude:
- Direct HTTPS to Claude API with keys stored in Oracle env vars.
- User → Oracle:
- Browser → SvelteKit on Oracle (port 80/443).
Security stance:
- Oracle is the only thing allowed to call your local GPU endpoint.
- Local GPU endpoint is:
- bound to a private network (Tailscale) or
- behind a tunnel with auth/token.

3. Repo and bootstrap layout
Single canonical repo (lives on Oracle, mirrored locally)
Root:
- FREEAGENT_BOOTSTRAP.md
- FREEAGENT_PLAN.md
- FREEAGENT_SYSTEM_MAP.md
- src/ (SvelteKit)
- infra/ (optional: scripts, tunnels, tailscale config)
src/lib structure (on Oracle)
- agents/
- index.ts — registry
- claudeAgent.ts
- localModelAgent.ts
- routerAgent.ts
- models/
- claudeClient.ts
- localModelClient.ts (HTTP to your GPU box)
- orchestrator/
- orchestrator.ts — core loop
- safety/
- filters.ts
- policies.ts
- store/
- memory.ts (DB adapter)
- utils/
- logging.ts
- tracing.ts
src/routes (on Oracle)
- +layout.svelte
- +page.svelte (UI shell)
- api/orchestrator/+server.ts (main API endpoint)

4. Workflow: from dev to live
Step 1 — Canonical environment
- Canonical root: /home/ubuntu/freeagent on Oracle.
- You:
- ssh ubuntu@170.9.43.97
- cd freeagent
- git pull (from your Git remote)
Step 2 — Local dev loop
- You clone the same repo locally:
- C:\freeagent (for example).
- You edit code in VS Code locally.
- You push to Git.
- Oracle pulls from Git and restarts the SvelteKit server (PM2/systemd).
Step 3 — Local GPU server
- Install and run:
- Ollama or LM Studio with HTTP server.
- Expose endpoint:
- Locally: http://localhost:11434/infer
- To Oracle: via Tailscale or Cloudflare Tunnel, e.g.:
- https://local-gpu.your-tunnel-domain/infer
- Configure Oracle env var:
- LOCAL_MODEL_URL=https://local-gpu.your-tunnel-domain/infer
Step 4 — Oracle orchestrator wiring
- localModelClient.ts:
- Reads LOCAL_MODEL_URL
- Sends { prompt, system, history }
- Returns { text, tokens, latency }
- claudeClient.ts:
- Reads CLAUDE_API_KEY
- Sends structured prompts
- orchestrator.ts:
- Chooses between:
- Claude
- Local model
- Both (e.g., cross-checking, ensemble)

5. Runtime dataflow
- User opens FreeAgent UI (Oracle SvelteKit).
- UI sends message to /api/orchestrator.
- Orchestrator:
- Logs request.
- Loads conversation state from DB.
- Chooses an agent (router).
- Router agent decides:
- Claude for reasoning / safety-critical tasks.
- Local model for cheap exploration / drafting.
- If Claude:
- Call Claude API.
- If Local model:
- Call LOCAL_MODEL_URL (your GPU box).
- Orchestrator:
- Merges responses.
- Applies safety filters.
- Updates memory.
- Returns final message to UI.

6. What goes into the bootstrap docs
FREEAGENT_BOOTSTRAP.md
- Purpose: How to bring the system up from zero.
- Includes:
- Oracle instance details (shape, region, OS).
- Repo path: /home/ubuntu/freeagent.
- Commands:
- git clone ...
- npm install
- npm run build
- pm2 start build/index.js (or node build via systemd).
- Local GPU server setup summary.
- How to configure env vars:
- CLAUDE_API_KEY
- LOCAL_MODEL_URL
- DB connection string.
FREEAGENT_PLAN.md
- Purpose: Roadmap and phases.
- Sections:
- Phase 1: Single orchestrator, Claude-only.
- Phase 2: Add local model agent via LOCAL_MODEL_URL.
- Phase 3: Add vector memory.
- Phase 4: Add tools (web, files, code).
- Phase 5: Multi-session, multi-user.
FREEAGENT_SYSTEM_MAP.md
- Purpose: Mental model + topology.
- Diagrams (textual):
- Environments:
- Oracle (brain)
- Local GPU (muscle)
- Claude (external tool)
- Agents:
- routerAgent
- claudeAgent
- localModelAgent
- memoryAgent (optional later)
- Dataflow:
- User → Oracle → Agents → Tools → Oracle → User.

7. What the first agent sees when they “arrive”
Think of this as the system prompt / environment brief the orchestrator agent gets on startup. This lives in src/lib/orchestrator/context.ts and is also mirrored in FREEAGENT_SYSTEM_MAP.md.
System brief for the first agent
You are the FreeAgent Orchestrator.
You run inside a distributed system with three main components:
- Oracle Cloud (this environment): the brain that routes, reasons, and maintains state.
- A local GPU model server: the muscle that provides fast, cheap local inference over HTTP.
- Claude API: a high-reliability external model used for complex reasoning and safety-critical tasks.
Your responsibilities:
- Receive user messages via /api/orchestrator.
- Maintain conversation and agent state in the database.
- Decide which agent(s) to invoke:
- claudeAgent for careful reasoning, safety-sensitive tasks, or when high reliability is required.
- localModelAgent for fast drafting, exploration, or low-risk tasks.
- Call tools (web, vector memory, code) when needed.
- Apply safety filters before returning any response.
- Keep the user’s cognitive load low: be clear, concise, and explicit about what you’re doing.
Environment constraints:
- You do not run on the user’s local machine.
- You have access to:
- CLAUDE_API_KEY (for Claude).
- LOCAL_MODEL_URL (for the local GPU model server).
- A persistent store for conversation and memory.
- You must treat the local GPU endpoint as a tool, not as a trusted oracle. Cross-check with Claude when stakes are high.
Primary objective:
- Coordinate agents and tools to help the user build, operate, and evolve this system safely, without overloading their local resources.

That’s the “room” the first agent walks into.

If you want, next step can be: I draft the exact contents of FREEAGENT_BOOTSTRAP.md in repo-ready form, or we define the first orchestrator.ts skeleton so this isn’t just a plan but a runnable spine.

