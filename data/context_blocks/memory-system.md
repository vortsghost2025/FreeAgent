# 🧠 Memory System — Kilo-Ready Context Block

## 🎯 Current Objective
Establish stable long-term memory infrastructure so agents can maintain context across conversations and sessions.

## 📁 Active Folder
```
c:/workspace/medical/free-coding-agent/
```
(Canonical workspace - see `CONTEXT_BLOCKS/cockpit-stable.md` for UI folder)

## 🔧 Relevant Subsystems
- SQLite memory database (`src/memory-database-sqlite.js`)
- JSON store (`src/memory/json-store.js`)
- Memory engine (`src/memory-engine.js`)
- Shared AI memory (`shared-ai-memory/`)
- Agent memory configs (`memory/agents/`)

## 🚧 Blockers
- Need consistent memory schema across agents
- Context not persisting between sessions
- Need way to store "map" context blocks for future sessions
- Vector search not fully integrated

## ✅ Working
- SQLite database exists (`kilo-local/kilo.db`)
- Agent configs stored in `memory/agents/`
- JSON store implemented
- Memory files have basic structure

## 📌 Notes for Kilo
- Use `CONTEXT_BLOCKS/*.md` files as "map" templates for conversation context
- Store important decisions in `shared-ai-memory/config.json`
- Each agent has a config in `memory/agents/[agent-name].json`
- When conversation drifts into lore/chaos, reference the active context block

---

## 🚀 Success Criteria
- [ ] Context blocks load properly at session start
- [ ] Agent memory configs accessible
- [ ] SQLite database queried for context
- [ ] Shared memory accessible across agents
- [ ] Clean handoff between sessions using stored context
