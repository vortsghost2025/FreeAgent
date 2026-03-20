# Work Protection Protocol v1.0

**Created:** 2026-02-24
**Purpose:** Prevent accidental or intentional undoing of completed work by ANY agent (Claw, Kilo, or others)

---

## PROTECTED WORK REGISTER

The following items are **LOCKED** and should NOT be modified without explicit Sean approval:

### Fixes Applied (1-24) - PROTECTED

| # | Fix | File | Protected Since |
|---|-----|------|-----------------|
| 1 | Command injection (exec→spawn) | cockpit-server.js | 2026-02-24 |
| 2 | CSS syntax error | mega-cockpit.html | 2026-02-24 |
| 3 | Missing sendMessage() | mega-cockpit.html | 2026-02-24 |
| 4 | Missing UI elements | unified-ide.html | 2026-02-24 |
| 5 | Ollama API 400 error | ollama-endpoint.js | 2026-02-24 |
| 6 | "undefined" in prompts | simple-ensemble.js | 2026-02-24 |
| 7 | Timeout too short | cockpit-server.js | 2026-02-24 |
| 8 | Race condition on startup | cockpit-server.js | 2026-02-24 |
| 9 | Metrics null-check | provider-router.js | 2026-02-24 |
| 10 | Provider router rewritten | provider-router.js | 2026-02-24 |
| 11 | addAgentMessage undefined | unified-ide.html | 2026-02-24 |
| 12 | 8-agent fan-out → smart routing | task-router.js | 2026-02-24 |
| 13 | Smart agent selection | task-router.js | 2026-02-24 |
| 14 | Parallel execution | task-router.js | 2026-02-24 |
| 15 | OpenAI endpoint | openai-endpoint.js | 2026-02-24 |
| 16 | Groq endpoint | groq-endpoint.js | 2026-02-24 |
| 17 | Provider status UI null safety | mega-cockpit.html | 2026-02-24 |
| 18 | API keys secured | .env | 2026-02-24 |
| 19 | Provider status error handling | multiple | 2026-02-24 |
| 20 | WebSocket port fix (8888→8889) | unified-ide.html | 2026-02-24 |
| 21 | Agent checkbox ID fix | unified-ide.html | 2026-02-24 |
| 22 | Accessibility labels | unified-ide.html | 2026-02-24 |
| 23 | Chat input covered fix | unified-ide.html | 2026-02-24 |
| 24 | Bottom panel layout fix | unified-ide.html | 2026-02-24 |
| 25 | Galaxy IDE addAgentMessage() missing | public/galaxy-ide.html | 2026-02-24 |
| 26 | Galaxy IDE agent name mapping | public/galaxy-ide.html | 2026-02-24 |
| 27 | Galaxy IDE runCode browser-safe | public/galaxy-ide.html | 2026-02-24 |

### Core Architecture - PROTECTED

| Item | Location | Reason |
|------|----------|--------|
| Smart routing logic | task-router.js | Critical performance feature |
| Provider mesh | provider-router.js | Multi-provider support |
| Agent coordination | AGENT_COORDINATION/ | Cross-agent communication |
| Memory persistence | memory/, .openclaw/ | Session continuity |
| Constitutional framework | SYSTEM_IDENTITY.md (parent) | Core values |

---

## PROTECTION RULES

### For ALL Agents (Claw, Kilo, Future Agents)

1. **Read this file FIRST** before making changes
2. **Check the register** - if a file/feature is listed, DO NOT modify without Sean's explicit approval
3. **Add new entries** when completing significant work
4. **Log all changes** in TASK_QUEUE.md with timestamp

### Modification Protocol

If an agent believes a protected item needs modification:

1. **STOP** - Do not modify
2. **DOCUMENT** - Write the proposed change in TASK_QUEUE.md
3. **WAIT** - For Sean's approval
4. **PROCEED** - Only after explicit approval
5. **UPDATE** - Update this register if change is approved

---

## AGENT IDENTITY VERIFICATION

Agents must identify themselves when making changes:

| Agent | Platform | Role |
|-------|----------|------|
| Claw 🦞 | OpenClaw (webchat) | Analysis, strategy, review |
| Kilo | VS Code Extension | Implementation, execution |

Unknown agents should be treated with caution.

---

## MEMORY PERSISTENCE LAYERS

This protection system is part of a 40-layer memory architecture:

1. **Layer 1:** WORK_PROTECTION.md (this file)
2. **Layer 2:** TASK_QUEUE.md (session history)
3. **Layer 3:** CLAW_STATUS.md (agent state)
4. **Layer 4:** memory/YYYY-MM-DD.md (daily notes)
5. **Layer 5:** MEMORY.md (long-term memory)
6. **Layer 6-40:** OpenClaw internal layers

---

## EMERGENCY OVERRIDE

Only Sean can override protections. In emergency:

1. Delete this file (extreme measure)
2. Or add "OVERRIDE: [reason]" to specific item
3. Or create OVERRIDE.md with Sean's explicit instruction

---

## VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-24 | Initial protection protocol |

---

**This file is the GUARDIAN of 2 days of work. Respect it.** 🛡️

*Last updated: 2026-02-24 by Kilo (at Sean's request)*
