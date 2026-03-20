# 🎼 8-Agent Medical Coding Ensemble

A FREE multi-agent AI ensemble system for medical coding tasks - $0/month with local Ollama or cloud providers.

## ✨ Features

- **8 Specialized Agents**: Code Generation, Data Engineering, Clinical Analysis, Testing, Security, API Integration, Database, DevOps
- **3 Collaboration Modes**: Parallel, Sequential, Independent
- **Real-Time Web Interface**: WebSocket-based agent coordination
- **Persistent Memory**: Learn from previous tasks
- **Terminal Execution**: Cross-platform PowerShell/Bash commands
- **Auto Error Fixing**: Detect and fix Node.js/JS errors automatically
- **Swarm Integration**: Load balancing and task distribution
- **Medical Schema Compliance**: CDC/WHO guideline enforcement

## 🚀 Quick Start

### 1. Start Ensemble Web Server

```bash
cd c:\workspace\medical\free-coding-agent
npm run ensemble-web
```

**Output:**
```
🎼 Ensemble Web Server running at http://localhost:54112
📊 8-Agent Medical Ensemble Interface
🔌 WebSocket endpoint: ws://localhost:54112
```

### 2. Open Web Interface

Navigate to: `http://localhost:54112/ensemble-v8.html`

### 3. Use the Ensemble

1. **Select Agents**: Choose 1-8 agents (default: AG1 + AG2)
2. **Choose Mode**: Select collaboration mode (default: Parallel)
3. **Enter Task**: Type your medical coding task
4. **Run Ensemble**: Click "🚀 Run Ensemble"

## 🤖 Agent Roles

| Agent | ID | Role | Description |
|-------|----|------|-------------|
| AG1 | `code_generation` | Code Generation | Write & modify code, testing, refactoring |
| AG2 | `data_engineering` | Data Engineering | Schema compliance, validation, ETL |
| AG3 | `clinical_analysis` | Clinical Analysis | Medical reasoning, CDC/WHO guidelines |
| AG4 | `testing` | Testing | Test generation, TDD, test coverage |
| AG5 | `security` | Security | Vulnerability scanning, security audits |
| AG6 | `api_integration` | API Integration | REST/GraphQL APIs, API design |
| AG7 | `database` | Database | SQL schemas, migrations, optimization |
| AG8 | `devops` | DevOps | CI/CD, deployment, infrastructure |

## 🎯 Collaboration Modes

### ⚡ Parallel (Simultaneous)
All selected agents work independently on the task at the same time. Best for:
- Exploratory coding
- Multiple perspectives on same problem
- Quick prototyping

### 🔄 Sequential (Chain)
Agents work in a chain, each building on the previous agent's output. Best for:
- Multi-step workflows
- Code review cycles
- Incremental development

### 🔀 Independent (No Coordination)
Each agent processes the task without seeing other agents' work. Best for:
- Isolated task execution
- Comparison of approaches
- Independent validation

## 💻 Command Line Interface

```bash
# Run ensemble with default agents (2)
npm run ensemble -- "Create a patient validation API"

# Run with specific agent count (1-8)
npm run ensemble -- -c 4 "Build medical dashboard"

# Run with specific agent roles
npm run ensemble -- -a code_generation,testing "Add unit tests"

# Choose collaboration mode
npm run ensemble -- -m sequential "Implement feature step by step"

# Execute PowerShell command
npm run ensemble -- powershell "Get-Process"

# Execute bash command
npm run ensemble -- bash "ls -la"

# Auto-fix errors in file
npm run ensemble -- fix src/agent.js --auto

# Search memory for patterns
npm run ensemble -- memory --query "validation"

# Export memory to JSON
npm run ensemble -- memory --export patterns.json

# View swarm status
npm run ensemble -- swarm-status

# List available models
npm run ensemble -- models
```

## 🔧 Configuration

### ensemble.config.json

```json
{
  "agents": {
    "code_generation": {
      "id": "AG1",
      "provider": "ollama",
      "model": "llama3.2"
    },
    "data_engineering": {
      "id": "AG2",
      "provider": "ollama",
      "model": "deepseek-coder"
    }
    // ... all 8 agents
  },
  "autoFixErrors": true,
  "terminalEnabled": true,
  "memory": {
    "path": "./ensemble-memory.json",
    "enabled": true
  },
  "swarm": {
    "enabled": true,
    "coordinatorId": "medical-ensemble"
  }
}
```

## 📊 Web Interface Features

### Ensemble Tab
- Agent selection panel with checkboxes
- Quick select buttons (All 8, Default 2, Clear)
- Collaboration mode dropdown
- Real-time agent response grid
- Processing time metrics

### Terminal Tab
- Cross-platform PowerShell/Bash execution
- Command history
- Output display with syntax highlighting

### Memory Tab
- Search learned patterns
- View pattern details (type, success count, last used)
- Export memory to JSON

### Statistics Tab
- Tasks completed
- Active agents
- Learned patterns
- Schema conformance rate
- Errors fixed
- Session uptime

## 🔌 API Endpoints

### Health Check
```bash
GET /api/health
```
Response:
```json
{
  "status": "ok",
  "version": "2.0.0",
  "ensemble": true
}
```

### Get Available Agents
```bash
GET /api/agents
```
Response:
```json
{
  "roles": ["code_generation", "data_engineering", "clinical_analysis", ...],
  "modes": ["parallel", "sequential", "independent"]
}
```

### Memory Statistics
```bash
GET /api/memory/stats
```

### Search Memory
```bash
POST /api/memory/search
Content-Type: application/json

{
  "query": "validation"
}
```

### Export Memory
```bash
POST /api/memory/export
```

## 🧪 Example Tasks

### Medical API Development
```
"Create a patient data validation endpoint with CDC/WHO compliance"
```

**Agents to use**: AG1, AG2, AG3, AG5
**Mode**: Sequential

### Database Schema Design
```
"Design PostgreSQL schema for patient records with audit trails"
```

**Agents to use**: AG2, AG7
**Mode**: Parallel

### Security Audit
```
"Perform security audit on authentication system"
```

**Agents to use**: AG5, AG8
**Mode**: Independent

### Full System Build
```
"Build complete patient management system with API, database, and tests"
```

**Agents to use**: All 8 (AG1-AG8)
**Mode**: Parallel then Sequential

## 🎨 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Web UI (Browser)                    │
│         http://localhost:54112/ensemble-v8.html      │
└──────────────────┬──────────────────────────────────────┘
                   │ WebSocket
                   ▼
┌─────────────────────────────────────────────────────────┐
│           Ensemble Web Server (WebSocket)              │
│  - Session Management                                 │
│  - Real-time Event Streaming                         │
│  - API Endpoints                                    │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│ Ensemble         │    │ Swarm           │
│ Coordinator     │◄──►│ Coordinator     │
│                │    │                │
│ - 8 Agents     │    │ - Load Balance  │
│ - Parallel Exec │    │ - Task Distrib  │
│ - Metrics      │    │ - Rebalance     │
└───────┬────────┘    └──────────────────┘
        │
    ┌───┴────┬────┬────┬────┬────┬────┬────┐
    ▼        ▼    ▼    ▼    ▼    ▼    ▼    ▼
  AG1      AG2  AG3  AG4  AG5  AG6  AG7  AG8
(CodeGen) (Data)(Clin)(Test)(Sec) (API) (DB)  (DevOps)
    │        │    │    │    │    │    │    │
    └────────┴────┴────┴────┴────┴────┴────┘
              ▼
    ┌───────────────────┐
    │ Provider Manager  │
    │ (Hybrid)         │
    │ - Ollama (Local) │
    │ - Groq (Cloud)   │
    │ - Together (Cloud)│
    └───────────────────┘

Memory: Lowdb (JSON persistence)
Tools: Terminal, Error Fixer
```

## 🔐 Security Features

- **Dangerous Command Blocking**: Prevents execution of `rm -rf`, `del /f`, `format`, etc.
- **Command Escaping**: Proper shell command escaping
- **Approval Mode**: Requires user confirmation for sensitive operations
- **HIPAA Compliance**: Clinical Analysis agent enforces patient privacy
- **Schema Validation**: All outputs validated against medical schemas

## 📈 Performance

- **Startup Time**: < 2 seconds
- **Agent Creation**: < 100ms per agent
- **Parallel Execution**: All agents work simultaneously
- **Memory Persistence**: Lowdb JSON database (fast, no dependencies)
- **WebSocket Latency**: < 50ms for real-time updates

## 🐛 Troubleshooting

### WebSocket Connection Failed
```bash
# Check if server is running
curl http://localhost:54112/api/health

# Restart server
npm run ensemble-web
```

### Agent Not Responding
- Check Ollama is running: `ollama list`
- Verify provider configuration in `ensemble.config.json`
- Check agent logs in browser console (F12)

### Memory Not Saving
- Verify `ensemble-memory.json` has write permissions
- Check `memory.enabled: true` in config
- Export memory manually via UI or CLI

### Terminal Commands Failing
- Verify shell permission in `ensemble.config.json`
- Check command escaping for special characters
- Use `--no-approval` flag to skip confirmation

## 📚 Documentation

- [Status Document](ENSEMBLE_V8_STATUS.md) - Implementation details
- [CLAUDE.md](../CLAUDE.md) - Project instructions
- [README.md](README.md) - Main project README

## 🤝 Contributing

To add a new agent:

1. Add role to `AGENT_ROLES` in `ensemble-core.js`
2. Create system prompt for the role
3. Update agent factory to handle new role
4. Add agent checkbox to `ensemble-v8.html`

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- Ollama for local LLM support
- Groq for fast cloud inference
- Together AI for additional model options
- CDC/WHO for medical guidelines

---

**Free. Open Source. Medical Focused.**

Built with ❤️ for the medical coding community.
