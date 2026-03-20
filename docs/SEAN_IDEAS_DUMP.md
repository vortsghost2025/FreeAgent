# Sean's Ideas Dump — Captured 2026-03-15

Raw ideas captured from Facebook Messenger brain dump. To be organized into projects.

---

## MCP / n8n / Agent Tools

### n8n-as-code (Etienne Lescot)
- 537 node schemas, 10,209 properties, 7,702 workflow templates — embedded locally
- Solves agent hallucination of n8n configs
- MCP server: `npx --yes n8nac skills mcp`
- Install: `npx --yes n8nac init`
- Search templates: `npx n8nac skills search "description"`
- Deploy workflows: `npx n8nac push workflow.ts`
- **Action**: Install locally, add MCP to .vscode/mcp.json

### 9 MCP Projects for AI Engineers (image saved)
1. Multi-Agent Deep Researcher Workflow (exa/linkup)
2. 100% Local Synthetic Data Generator MCP Server
3. 100% Local + Private MCP Client (Ollama + SQLite)
4. MCP-powered Agentic RAG Workflow (Cursor + Bright)
5. MCP powered RAG over Complex Real-world Docs (EYELEVEL + GroundX)
6. MCP powered Financial Analyst (Cursor + Deepseek + Tavily)
7. MCP-powered Voice Agent Workflow with Qwen3
8. Unified MCP Server with MindsDB
9. Cursor and Claude Desktop Memory Integration Workflow (Neo4j Memory Structure)
- **Action**: #3 (local private MCP client) and #9 (Neo4j memory) are most relevant

---

## Cline / Agent Setup

### Cline Migration from Kilo
- Cline = full autonomous coding agent (Plan/Act mode, file editing, terminal, MCP tools)
- Runs locally with Ollama — zero cost, zero caps
- `.clinerules/` folder at project root (not `.cline/rules.md` — that's old)
- **Past-Claude pumped brakes**: needs to know which folder before creating files
- **Action**: Decide project layout before setting up Cline rules

### 8-Agent Medical AI Cockpit (DeliberateEnsemble)
- Agent 1: Performance Optimizer (2018ms → 0ms)
- Agent 2: Parallel Orchestrator (50+ simultaneous ops)
- Agent 3: YOLO Chaos Tester
- Agent 4: Self-Healing Engineer
- Agent 5: Real-time Monitoring Visualizer
- Agent 6: Ollama Inference Specialist
- Agent 7: Medical Data Pipeline Engineer
- Agent 8: Deployment & Uptime Guardian
- **Note**: This ensemble concept maps to snac_free_coding_agent on VPS

---

## Second Brain / Knowledge System

### Tools Considered
- **Obsidian** — best for linking ideas, knowledge graph, offline, free, AI plugins
- **Notion** — best for structured project databases
- **Mem.ai** — AI-powered automatic thought clustering

### Ideal System for Sean
```
BRAIN
├── AI Systems (agent orchestration, swarm intelligence, recursive reasoning)
├── Automation (affiliate, social media bots)
├── Crypto (mining, trading bots, airdrops)
└── Infrastructure (VPS, docker, oracle server)
```

### Better: Build It Into SNAC
- SNAC already has: thought ingestion, RAG, memory bank, swarm queue
- **Action**: Route Facebook brain dumps → SNAC thought ingest endpoint
  - URL: https://snac.deliberatefederation.cloud → "Quick Thought" panel
  - This IS the second brain, already running

---

## NVIDIA / GPU

### API Access (obtained today)
- NVIDIA NIM API key saved to VPS .env
- Base URL: `https://integrate.api.nvidia.com/v1`
- Best model for agents: `nvidia/nemotron-3-super-120b-a12b` (agentic reasoning, coding, planning, tool calling)

### Local GPU (post-reboot)
- RTX 5060 Blackwell — not yet supported by Ollama 0.18.0
- NVIDIA App installing new drivers — may unlock GPU support
- After reboot: check `offloaded X/37 layers to GPU` in Ollama logs

---

## Gemini Keys (obtained today)
- Two keys: primary + backup
- Endpoint: `https://generativelanguage.googleapis.com/v1beta/openai/`
- Model: `gemini-2.0-flash` (fast, free, high volume)
- **Action**: Add as fallback model option in backend

---

## Cockpit Improvements Wanted

### Replace Free Coding Agent with Claude
- Want: Claude (with reasoning + memory) in cockpit instead of 8-agent ensemble with no reasoning
- Current ensemble uses simulated responses, no real reasoning
- **Action**: Add Claude API endpoint as agent option in cockpit UI
- Could use NVIDIA NIM (nemotron) or Gemini as the brain

### n8n Integration
- n8n live at: https://snac.deliberatefederation.cloud/n8n/
- API key stored in VPS .env
- **Action**: Build workflows that agents can deploy via n8n-as-code

---

## LinkedIn / Research Finds
- Vaibhav Sonkhla post about MCP projects (9 MCP projects image)
- **Action**: Review #9 Neo4j memory integration — relevant to persistent agent memory

---

## Pending / To Revisit
- Facebook Messenger thread too large to open (crashes) — contains more ideas
- Kilo reinstall pending (after reboot)
- `s:\workspace\cockpit\server.js` — full coordination system not currently running
- Connect free-coding-agent to real Ollama (currently simulated)
