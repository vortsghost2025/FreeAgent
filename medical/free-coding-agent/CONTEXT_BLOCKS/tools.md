# 🧰 Tools System — Kilo-Ready Context Block

## 🎯 Current Objective
Ensure Kilo has proper tool bindings for file access, directory scanning, and code analysis in the active workspace.

## 📁 Active Folder
```
c:/workspace/medical/free-coding-agent/
```
(This is where Kilo lives. Tools must be registered for this folder.)

## 🔧 Tool Bindings - ALREADY EXISTS!

### Server: public/backend/server.js
Run with: `npm run cockpit` or `node public/backend/server.js`

### File Operations
| Tool | Endpoint | Status |
|------|----------|--------|
| List Files | `/api/list-files` | ✅ EXISTS |
| Read File | `/api/read-file` | ✅ EXISTS |
| Write File | `/api/write-file` | ✅ EXISTS |

### Agent Communication
| Tool | Endpoint | Status |
|------|----------|--------|
| Kilo Agent | `/api/kilo` | ✅ EXISTS |
| Claw Agent | `/api/claw` | ✅ EXISTS |
| Simple Agent | `/api/simple` | ✅ EXISTS |

### Code Analysis
| Tool | Endpoint | Status |
|------|----------|--------|
| Code Action | `/api/agent/code-action` | ✅ EXISTS |
| Fix Apply | `/api/agent/fix-apply` | ✅ EXISTS |

## 🚧 Blockers
- Server must be running: `npm run cockpit`
- Port must be 3000 (fixed in monaco-cockpit.html)
- CORS enabled in server

## ✅ Working
- Dashboard server has all endpoints
- Monaco editor loads correctly
- Agent chat UI is functional
- Port 3000 configured

## 📌 Notes for Kilo
- Start server: `npm run cockpit` (runs public/backend/server.js)
- Server runs on port 3000
- All file tools are exposed via HTTP API
- Tools work from any folder within workspace

---

## 🚀 Success Criteria
- [x] File read/write tools exist at /api/read-file, /api/write-file
- [x] Directory listing exists at /api/list-files
- [x] All 3 agents (kilo, claw, simple) endpoints exist
- [x] Code action suggestions endpoint exists
- [ ] Verify server runs with `npm run cockpit`
