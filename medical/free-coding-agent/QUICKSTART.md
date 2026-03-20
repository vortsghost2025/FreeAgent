# Kilo Code - Multi-Agent Cockpit

## Quick Start

### 1. Start Everything
```cmd
double-click start-all.bat
```

### 2. Access Points
| Service | URL |
|---------|-----|
| Cockpit UI | http://localhost:3000/monaco-cockpit.html |
| Backend API | http://localhost:4000/api/* |
| WebSocket | ws://localhost:4001 |
| Chrome DevTools | http://localhost:9222 |

### 3. With Agent
```
http://localhost:3000/monaco-cockpit.html?agent=claw
```

---

## Architecture

### Ports
- **3000** - Monaco Cockpit UI
- **4000** - Backend API
- **4001** - WebSocket
- **9222** - Chrome DevTools

### Agents
- **Kilo** - Browser automation
- **Claw** - Code transformations
- **Claude** - Long-context planning
- **Lingma** - Local inference (via LM Studio)

### Model Providers
- **Primary**: LM Studio (http://localhost:1234/v1)
- **Fallback**: Ollama

---

## Startup Scripts

| File | Purpose |
|------|---------|
| `start-all.bat` | Full startup (kills stale processes, starts everything) |
| `start-cockpit.bat` | Cockpit only |
| `start-chrome-debug.bat` | Chrome with DevTools |
| `start-lmstudio.bat` | LM Studio helper |

---

## Features

- Multi-agent orchestration
- Browser automation via Chrome DevTools
- Monaco IDE integration
- WebSocket real-time communication
- Local inference via LM Studio
- MEV engine integration
- Context blocks for agent memory

---

## Files

- `agent-config.json` - Agent configuration
- `config.json` - System configuration
- `package.json` - Dependencies
- `CONTEXT_BLOCKS/` - Agent context blocks
- `src/` - Source code
- `public/` - Frontend UI
- `memory/` - Agent memory
