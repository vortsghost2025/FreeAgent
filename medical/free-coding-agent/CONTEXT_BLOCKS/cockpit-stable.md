# 🧭 Cockpit (UI + Server) — Kilo-Ready Context Block

## 🎯 Current Objective
Stabilize the cockpit so the UI and backend server connect reliably and consistently from the correct folder.

## 📁 Active Folder
```
c:/workspace/medical/free-coding-agent/
```
(This is the canonical workspace. All other folders are deprecated.)

## 🌐 Port Architecture
| Port | Service |
|------|--------|
| 3000 | Monaco Cockpit UI |
| 4000 | Claude Backend API |
| 4001 | WebSocket |
| 9222 | Chrome DevTools |

## 🔧 Relevant Subsystems
- Backend server (Node)
- Dashboard UI (React/HTML)
- WebSocket connector
- Routing spine (agent → server → provider)
- Environment variables (.env)

## 🚧 Blockers (Specific Technical Issues Found)

### 1. API Port Mismatch - CRITICAL
| Frontend File | Connects To | Should Be |
|--------------|-------------|----------|
| monaco-cockpit.html | localhost:4000 | localhost:4000 |
| unified-workspace.html | localhost:4002 | localhost:4001 |
| galaxy-ide.html | localhost:4002 | localhost:4001 |

### 2. Agent Parameter Not Parsed
- `monaco-cockpit.html?agent=claw` - URL param is ignored, always defaults to 'kilo'

### 3. No Centralized Port Configuration
- Each UI file hardcodes different ports
- Need single source of truth for backend URL

### 4. Chrome DevTools
- Browser connection for computer use not configured

## ✅ Working
- Server boots without crashing
- UI loads in browser
- RAM usage stable
- Provider routing logic intact
- Optimizer functioning
- Agents respond when manually triggered
- Chrome DevTools connected for browser automation

## 📌 Chrome DevTools Setup

### For Browser Automation:
1. Run `start-chrome-debug.bat` OR manually:
   ```cmd
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\ChromeDebug"
   ```
2. In Kilo Code Settings > Browser: Enable toggle
3. Click "Test Connection" - should auto-discover

### Verify Chrome is running with debug:
Visit http://localhost:9222/json/version - should return JSON

### Quick Start:
- Run `start-cockpit.bat` for full clean restart (kills processes, starts Chrome + server)
- Run `start-chrome-debug.bat` just to start Chrome with debugging

## 📌 Notes for Kilo
- Home: `c:/workspace/medical/free-coding-agent/`
- Monaco Cockpit: `http://localhost:3000/monaco-cockpit.html`
- With Agent: `http://localhost:3000/monaco-cockpit.html?agent=claw`
- Backend: `http://localhost:4000/api/*`
- WebSocket: `ws://localhost:4001`
- Run `start-cockpit.bat` for clean startup

---

## 🚀 Success Criteria
- [x] Server boots without crashing (port 4000)
- [x] UI loads in browser at http://localhost:4000
- [x] WebSocket connects on port 4001
- [x] All 6 cockpit tabs display content
- [x] Agent panels receive data from backend (port 4000)
- [x] Agent URL param works (?agent=claw)
- [ ] Boot sequence checklist created
