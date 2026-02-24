# 🎮 FREE Multi-AI Ensemble System

## $0/month Distributed AI Coding Platform

Replace your **$300/week** Claude Code + GitHub Copilot costs with a **100% FREE** distributed AI ensemble.

---

## 🎯 What This Does

This system provides:

- **8 Parallel AI Agents** working together
- **$0/month** total cost (vs ~$1,200/month for paid services)
- **Command Center Cockpit** for real-time monitoring
- **Distributed Architecture** across local + VPS + cloud
- **Medical Coding Support** with CDC/WHO compliance
- **P2P Mesh Network** for offline operation

---

## 💰 Cost Comparison

| Service            | Monthly Cost                  |
| ------------------ | ----------------------------- |
| Claude Code        | $100-150                      |
| GitHub Copilot Pro | $19-39                        |
| OpenAI API         | $50-100                       |
| Together AI        | $50+                          |
| **Your Old Total** | **~$300/week = $1,200/month** |

| This System        | Monthly Cost |
| ------------------ | ------------ |
| Ollama (Local)     | $0           |
| Groq Free Tier     | $0           |
| OpenRouter Free    | $0           |
| HuggingFace Free   | $0           |
| Cloudflare AI Free | $0           |
| VPS (already paid) | $0           |
| **Your New Total** | **$0/month** |

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd free-coding-agent
npm install
```

### 2. Setup Local Ollama

**Windows (PowerShell):**

```powershell
npm run setup:local
```

**Or manually:**

1. Download Ollama from https://ollama.ai
2. Pull models:

```bash
ollama pull llama3.2:8b
ollama pull phi3:3.8b
ollama pull deepseek-coder:6.7b
```

### 3. Start the Cockpit

```bash
npm run cockpit
```

Open http://localhost:3000/cockpit in your browser.

---

## 🤖 8-Agent Ensemble

| Agent | Role              | Location      | Model               |
| ----- | ----------------- | ------------- | ------------------- |
| AG1   | Code Generation   | Local Ollama  | llama3.2:8b         |
| AG2   | Data Engineering  | Oracle VPS    | mistral:7b          |
| AG3   | Clinical Analysis | Hostinger VPS | meditron:7b         |
| AG4   | Testing           | Local Ollama  | phi3:3.8b           |
| AG5   | Security          | Alibaba ECS   | codellama:7b        |
| AG6   | API Integration   | Groq Free     | llama-3.3-70b       |
| AG7   | Database          | Local Ollama  | deepseek-coder:6.7b |
| AG8   | DevOps            | Oracle VPS    | llama3.2:8b         |

---

## 🆓 FREE Providers Included

### Local (Unlimited)

- **Ollama** - Run any open-source model locally
- **LM Studio** - Alternative local inference

### Cloud Free Tiers

- **Groq** - 14,400 requests/day FREE
- **OpenRouter** - Multiple free models
- **HuggingFace** - Free inference API
- **Cloudflare AI** - 10,000 neurons/day FREE

### Your VPS (Already Paid)

- Oracle Cloud Free Tier
- Hostinger VPS
- Alibaba ECS

---

## 📊 Command Center Cockpit

The cockpit provides real-time monitoring:

- **Agent Grid** - Status of all 8 agents
- **Task Queue** - Pending/active/completed tasks
- **Metrics Dashboard** - Tokens/sec, latency, success rate
- **Log Stream** - Real-time logs from all agents
- **Cost Counter** - Always showing $0.00
- **Network Topology** - Visual map of all nodes
- **Health Alerts** - Automatic notifications

---

## 🔧 Configuration

### Environment Variables

Create `.env.local`:

```bash
# Local Ollama
OLLAMA_URL=http://localhost:11434

# LM Studio (optional)
LMSTUDIO_URL=http://localhost:1234/v1

# Free API Keys
GROQ_API_KEY=your_free_groq_key
OPENROUTER_API_KEY=your_free_openrouter_key
HUGGINGFACE_API_KEY=your_free_hf_key

# Cloudflare (optional)
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_KEY=your_api_key

# VPS Endpoints
ORACLE_VPS_URL=http://your-oracle-vps:11434
HOSTINGER_VPS_URL=http://your-hostinger-vps:11434
ALIBABA_VPS_URL=http://your-alibaba-ecs:11434
```

### Get Free API Keys

1. **Groq**: https://console.groq.com (14,400 free requests/day)
2. **OpenRouter**: https://openrouter.ai (free models available)
3. **HuggingFace**: https://huggingface.co/settings/tokens

---

## 🌐 VPS Deployment

### Deploy Ollama to Your VPS

SSH into your VPS and run:

```bash
# Download and run deployment script
curl -fsSL https://raw.githubusercontent.com/your-repo/scripts/deploy-vps-ollama.sh | bash
```

Or manually:

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Configure for remote access
sudo systemctl stop ollama
sudo mkdir -p /etc/systemd/system/ollama.service.d
echo '[Service]
Environment="OLLAMA_HOST=0.0.0.0"' | sudo tee /etc/systemd/system/ollama.service.d/override.conf
sudo systemctl daemon-reload
sudo systemctl start ollama

# Pull models
ollama pull llama3.2:8b
ollama pull mistral:7b

# Open firewall
sudo ufw allow 11434/tcp
```

---

## 📋 CLI Commands

```bash
# Start cockpit dashboard
npm run cockpit

# Interactive mode
npm run interactive

# Execute a task
npm run distributed -- task "Build a REST API for patient data"

# Check status
npm run distributed -- status

# Setup wizard
npm run setup
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    COMMAND CENTER COCKPIT                           │
│  Real-time Dashboard: Agent Status | Tasks | Metrics | Logs         │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR LAYER                               │
│  Task Router | Load Balancer | Cost Tracker ($0) | Health Monitor   │
└─────────────────────────────────────────────────────────────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  LOCAL CLUSTER  │    │  VPS CLUSTER    │    │  FREE API TIER  │
│  Your PC        │    │  Oracle/Host/Ali│    │  Groq/OpenRouter│
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ AG1: CodeGen    │    │ AG2: DataEng    │    │ AG6: API        │
│ AG4: Testing    │    │ AG3: Clinical   │    │ (14,400 req/day)│
│ AG7: Database   │    │ AG5: Security   │    │                 │
│                 │    │ AG8: DevOps     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 📁 Project Structure

```
free-coding-agent/
├── bin/
│   ├── distributed-cli.js     # Main CLI entry point
│   └── ...
├── src/
│   ├── providers/
│   │   ├── ollama.js          # Local Ollama
│   │   ├── groq.js            # Groq free tier
│   │   ├── openrouter.js      # OpenRouter free
│   │   ├── huggingface.js     # HuggingFace free
│   │   ├── cloudflare-ai.js   # Cloudflare free
│   │   ├── lmstudio.js        # LM Studio local
│   │   └── provider-pool.js   # Smart selection
│   ├── distributed/
│   │   ├── vps-connector.js   # Remote Ollama
│   │   ├── agent-discovery.js # Auto-discovery
│   │   ├── health-monitor.js  # Health tracking
│   │   ├── load-balancer.js   # Request routing
│   │   └── p2p-mesh.js        # P2P network
│   ├── cockpit/
│   │   ├── dashboard-server.js # WebSocket server
│   │   └── cost-tracker.js    # $0 tracking
│   └── distributed-ensemble.js # Main coordinator
├── public/
│   └── cockpit.html           # Dashboard UI
├── scripts/
│   ├── setup-local-ollama.ps1 # Windows setup
│   └── deploy-vps-ollama.sh   # VPS deployment
└── package.json
```

---

## 🎯 Use Cases

### Medical Coding (CDC/WHO)

```bash
npm run distributed -- task "Analyze patient symptoms and suggest ICD-10 codes following CDC guidelines"
```

### Code Generation

```bash
npm run distributed -- task "Build a REST API with authentication and rate limiting"
```

### Security Review

```bash
npm run distributed -- task "Review this code for HIPAA compliance and security vulnerabilities"
```

### Database Design

```bash
npm run distributed -- task "Design a normalized database schema for patient records"
```

---

## 🔒 Security

- All local inference stays on your machine
- VPS communication can use SSH tunnels
- P2P mesh uses encrypted channels
- No data sent to paid APIs (unless you choose to)

---

## 🐛 Troubleshooting

### Ollama not responding

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Restart Ollama
ollama serve
```

### VPS connection failed

```bash
# Test VPS connectivity
curl http://your-vps-ip:11434/api/tags

# Check firewall
sudo ufw status
```

### Rate limits hit

The system automatically fails over to the next available provider. Check the cockpit for rate limit status.

---

## 📈 Performance Tips

1. **Use local Ollama first** - Fastest response times
2. **Pull smaller models** - phi3:3.8b is fast and capable
3. **Enable model caching** - Ollama caches by default
4. **Use VPS for heavy tasks** - Offload to cloud when needed

---

## 🤝 Contributing

Pull requests welcome! See CONTRIBUTING.md for guidelines.

---

## 📄 License

MIT License - Use freely!

---

## 💎 Summary

**Before:** $300/week = $1,200/month
**After:** $0/month

You now have:

- ✅ 8 parallel AI agents
- ✅ Real-time monitoring cockpit
- ✅ Distributed across local + VPS + cloud
- ✅ Medical coding support
- ✅ P2P offline capability
- ✅ **$0 monthly cost**

Happy coding! 🚀
