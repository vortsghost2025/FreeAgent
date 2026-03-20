# 🚀 Kilo Bootstrap Guide

**If things go sideways and you need to restore Kilo to full operational capacity:**

---

## 🎯 Quick Restore (5 minutes)

### Step 1: Give Kilo His Context Blocks

Tell Kilo to read these files (in order):
1. `CONTEXT_BLOCKS/cockpit-stable.md` - Current cockpit status
2. `CONTEXT_BLOCKS/memory-system.md` - Memory infrastructure  
3. `CONTEXT_BLOCKS/tools.md` - Tool bindings

### Step 2: Provide the Map

Tell Kilo:
```
🧭 Active Workspace: c:/workspace/medical/free-coding-agent/

🎯 Current Objective: Stabilize cockpit and restore tool access

🔧 Server: npm run cockpit (runs public/backend/server.js on port 4000)

📁 Key Files:
- public/backend/server.js - Main server with all API endpoints
- public/monaco-cockpit.html - IDE cockpit
- public/master-cockpit.html - Main dashboard
- src/index.js - Agent exports
```

---

## 🔧 If Monaco Cockpit Has Wrong Port

**Fix - Server runs on port 4000:**
- Server: http://localhost:4000
- WebSocket: ws://localhost:4001

---

## 📋 Context Blocks Summary

| Block | Purpose | Key Info |
|-------|---------|----------|
| cockpit-stable.md | UI/Server status | Port 4000, blockers |
| memory-system.md | Memory infrastructure | How to persist context |
| tools.md | Tool bindings | API endpoints, server start |
| BOOTSTRAP.md | Recovery guide | This file |

---

## 🏠 Home Base

**Always:** `c:/workspace/medical/free-coding-agent/`

**Server:** `npm run cockpit` → `http://localhost:3000`

---

## ✅ Validation Checklist

After restore, verify:
- [ ] Kilo reads context blocks
- [ ] `npm run cockpit` starts server
- [ ] http://localhost:3000/monaco-cockpit.html loads
- [ ] http://localhost:3000/monaco-cockpit.html?agent=claw works
- [ ] WebSocket connects on port 4001
- [ ] File APIs work (/api/list-files, /api/read-file)
- [ ] Agents respond (/api/kilo, /api/claw)

---

## 🔑 Magic Phrases

Tell Kilo any of these to restore alignment:

> "Load the cockpit context block"

> "Read the tools block and start the server"

> "Use the BOOTSTRAP guide to stabilize"

> "Home is c:/workspace/medical/free-coding-agent/, start npm run cockpit"

---

*Last updated: 2026-03-04*
*This file survives folder moves - keep it in CONTEXT_BLOCKS/*

---

## 📍 External Projects Reference

| Project | Location | Status |
|---------|----------|--------|
| **Kilo Workspace** | `c:/workspace/medical/free-coding-agent/` | Main workspace |
| **MEV Swarm** | `c:/workspace/medical/mev-swarm/` | External trading bot |

---

## 🧹 Clean Start Script

Before starting, kill existing processes to avoid port conflicts:

```cmd
node scripts/clean-start.js
```

This kills processes on ports 4000 and 4001 before starting fresh.
