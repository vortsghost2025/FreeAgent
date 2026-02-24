# Medical AI Federation - Unified Multi-Agent System

**Version 1.0.0** - February 23, 2026

## 🎯 Overview

The Medical AI Federation unifies **three powerful multi-agent systems** into a single cohesive platform controlled by a **central cockpit**:

| System | Purpose | Execution Speed | Medical Judgment | Cost | Features |
|---------|----------|----------------|------------------|------|---------|
| **Medical Data Pipeline** | Structural processing | **1-3ms** ❌ No | Free | 5-agent pipeline, 200+ keywords |
| **Plugins System** | Extensible hooks | Fast (via hooks) | ❌ No | Free | 8 hook points, auto-discovery |
| **Coding Ensemble** | Collaborative coding | Slow (LLM) | ✅ Yes | **$0/mo** | 8 agents, 3 modes, persistent memory |

## 🔗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                                                  │
│                    Medical AI Federation             │
│                                                  │
│  ┌──────────────┐  ┌─────────────┐  ┌─────────────┐ │
│ │   Cockpit       │ │   Medical    │ │   Plugins     │ │   Coding       │
│ │                  │ │   Pipeline    │ │   System      │ │   Ensemble      │
│ │   (Web UI)       │ │   (Fast)      │ │   (Extensibl) │ │   (Smart)      │
│ │                  │ │   Structural   │ │   Hooks        │ │   Agents       │
│ │                  │ │   Processing   │ │              │ │   Code Gen       │
│ │                  │ │   Only         │ │   Only         │ │   Medical       │
│ │                  │ │              │ │              │ │   + 2 more     │
│ │                  │ │              │ │              │ │   2 agents      │
│ │                  │ │              │ │              │ │               │
│ │                  │ │              │ │              │ │   Parallel      │
│ │                  │ │   Routes tasks │ │   Routes data  │ │   Adds plugins  │ │   Routes code    │
│ │                  │ │   HTTP + WS    │ │   Direct      │ │   HTTP         │ │   HTTP + WS     │
│ │                  │ │              │ │                │ │   JSON file     │ │   JSON file     │
│ │                  │ │              │ │              │ │   Provider     │ │ Provider     │ │ │ Oll/Gro/Toget│
│ └────────────────┴ └─────────────┴ └─────────────┴ └─────────────┴ │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
cd c:\workspace\medical
npm install

# Start federation cockpit
npm run start

# Cockpit will be available at
http://localhost:8888
```

### System Startup

```bash
# Terminal 1: Medical Pipeline
node agents/ingestion_agent.js &
node agents/triage_agent.js &
node agents/summarization_agent.js &
node agents/risk_agent.js &
node agents/output_agent.js &

# Terminal 2: Plugins (optional)
cd plugins
# Register your plugins in the plugins/ directory

# Terminal 3: Coding Ensemble
cd free-coding-agent
npm start  # or
node bin/ensemble-cli.js <task>

# Terminal 4: Cockpit
node cockpit-server.js
```

## 📊 Cockpit Features

The cockpit at `http://localhost:8888` provides:

### Real-Time Monitoring
- **System Status**: Health, throughput, latency for all 3 systems
- **Task Routing**: Auto-route to best system based on task type
- **Cost Tracking**: Token usage, estimated cost, $0/mo goal progress
- **Activity Log**: Real-time log of all system activities

### Task Execution
- **Task Type Selection**: General, Structural, Medical Analysis, Code Generation, Data Processing
- **Auto-Routing**: Automatic selection of optimal system (or manual override)
- **Parallel/Sequential Modes**: Control how Coding Ensemble executes

### Cost Optimization
- **Token Estimation**: ~4 tokens/100 chars for English text
- **Cost Tracking**: By provider (Groq $0.19/1M, Together $0.29/1M)
- **Target Goal**: $0/month total spend

### System Management
- **Register/Unregister Systems**: Add/remove systems dynamically
- **Health Monitoring**: Auto health checks every minute
- **Configuration**: Configure each system independently

## 🎨 Usage Examples

### Example 1: Structural Medical Processing (Fast)
```javascript
// Route to Medical Pipeline (1-3ms execution)
const task = {
  type: 'structural_processing',
  data: {
    reportedItems: ['headache', 'fever', 'fatigue'],
    severity: 'moderate',
    duration: '3 days'
  }
};

// Cockpit auto-routes to fastest system
// Result: Complete in 1-3ms with classification and risk score
```

### Example 2: Medical Analysis (With Clinical Judgment)
```javascript
// Route to Coding Ensemble Clinical Analysis agent
const task = {
  type: 'medical_analysis',
  message: 'Analyze these symptoms: fever, cough, fatigue',
  data: { symptoms: ['fever', 'cough'] }
};

// Cockpit routes to clinical_analysis system
// Result: Full clinical analysis with CDC/WHO guidelines
```

### Example 3: Code Generation (Smart Collaboration)
```javascript
// Route to Coding Ensemble Code Generation + Data Engineering
const task = {
  type: 'code_generation',
  message: 'Create a patient data validation endpoint',
  data: { schema: 'PatientDataSchema' }
};

// Cockpit routes to coding_ensemble
// Result: Code + validation from both agents in parallel
```

### Example 4: Plugin Integration
```javascript
// Route to Plugins system
const task = {
  type: 'data_processing',
  data: { rawInput: '...' }
};

// Cockpit routes to plugins
// Plugins can intercept at any hook point
// Example: Audit logger, Slack notifier, custom classifier
```

## 📡 File Structure

```
medical/
├── federation-core.js          # Federation coordinator
├── cockpit-server.js           # Web server + WebSocket
├── public/
│   └── cockpit.html          # Dashboard UI
├── agents/                    # Medical pipeline agents (5 agents)
│   ├── ingestion_agent.js
│   ├── triage_agent.js
│   ├── summarization_agent.js
│   ├── risk_agent.js
│   └── output_agent.js
├── plugins/                   # Plugin system
│   ├── utils/
│   │   ├── plugin-manager.js
│   │   └── validators.js
│   └── *.js                   # Example plugins
├── free-coding-agent/         # Coding ensemble
│   ├── src/
│   │   ├── ensemble-core.js      # 3 agents, 3 modes
│   │   ├── memory-database.js    # JSON file memory
│   │   ├── agents/
│   │   ├── communication.js       # Inter-agent messaging
│   │   └── medical-schema-validator.js
│   ├── bin/
│   │   ├── ensemble-cli.js       # CLI commands
│   │   └── public/
│   │       └── ensemble-ui.html  # Web UI
│   ├── ensemble.config.json         # Agent configuration
│   └── providers/            # Ollama, Groq, Together AI
├── schemas.js                  # Medical data schemas
└── federation-package.json    # Unified entry point
```

## 🔧 System-Specific Configuration

### Medical Pipeline (Agents)
Located in `/agents/` directory - each is a standalone agent
- **Ingestion Agent**: Normalizes raw input, extracts content
- **Triage Agent**: Classifies into 6 types with confidence
- **Summarization Agent**: Extracts type-specific fields
- **Risk Agent**: Structural risk scoring (no clinical judgment)
- **Output Agent**: Formats final output with validation

### Coding Ensemble (Free)
Located in `/free-coding-agent/` directory
- **3 Agents**: Code Generation, Data Engineering, Clinical Analysis
- **8 Total Agents**: 3 core + 5 configured (testing, security, api_integration, database, devops)
- **3 Modes**: Parallel, Sequential, Independent
- **Memory**: JSON file with conversations, patterns, tasks
- **Providers**: Ollama (free local), Groq (cloud), Together AI (cloud)
- **Cost**: $0/month target via intelligent routing

### Plugins System
Located in `/plugins/` directory
- **8 Hook Points**: pre-ingestion, post-triage, pre-risk, post-output
- **Auto-Discovery**: Automatically loads plugins from directory
- **Example Plugins**: Audit logger, Custom classifier, Anonymizer, Slack notifier

## 💰 Cost Breakdown

### Token Estimation
- **English Text**: ~4 tokens per 100 characters
- **Medical Keywords**: 200+ terms in pipeline classification
- **Sample Query**: "Patient has headache, fever, cough, fatigue"
- **Estimated Tokens**: ~50 tokens
- **Estimated Cost**: $0.00001 per Groq token

### Provider Pricing (Estimated)
| Provider | Cost Model | Example Cost | Notes |
|----------|------------|-------------|-------|
| **Groq** | $0.19/1M tokens | 100K tokens | Fast, good medical models |
| **Together** | $0.29/1M tokens | Mixtral/Mistral | Large context window |
| **Ollama** | Free | Local hosting | Free but hardware dependent |
| **OpenRouter** | $0.95/1M tokens | GPT-4 equivalent | Most expensive |

**Strategy to Hit $0/mo Goal:**
1. **Route structural tasks to Medical Pipeline** (1-3ms, free)
2. **Use Coding Ensemble for medical judgment** (clinical agent)
3. **Use Plugins for extensibility** (hooks, custom logic)
4. **Prioritize local providers** (Ollama) when possible
5. **Batch similar tasks** to reduce per-request overhead
6. **Cache common patterns** in persistent memory

## 🔧 Development

### Testing

```bash
# Test federation coordinator
npm test

# Start all systems
# Medical Pipeline
node agents/ingestion_agent.js test

# Plugins
node plugins/utils/plugin-manager.js test

# Coding Ensemble
cd free-coding-agent
npm run test

# Cockpit
node cockpit-server.js
```

### Running in Production

```bash
# Start cockpit (includes all systems)
node cockpit-server.js

# Cockpit UI available at
http://localhost:8888

# Cockpit will:
# Auto-route tasks to optimal system
# Track all token usage and costs
# Monitor system health
# Provide real-time activity logs
```

## 🎯 Key Differences Between Systems

| Feature | Medical Pipeline | Plugins | Coding Ensemble |
|---------|----------------|----------|---------|
| **Speed** | Ultra-fast (1-3ms) | Fast | Slow (LLM dependent) |
| **Medical Judgment** | No (structural only) | No | Yes |
| **Extensibility** | Fixed pipeline | High (hooks) | Configurable agents |
| **Memory** | Pipeline state | N/A | JSON file database |
| **Collaboration** | Sequential pipeline | Hook-based | Parallel/Sequential/Indep |
| **Cost** | Free | Free | $0/mo target via routing |
| **Use Case** | Structural only | Add-on features | Full AI coding |
| **Agents** | 5 fixed agents | N/A (depends) | 8+ configured |
| **Learning** | N/A | N/A | Pattern storage |

## 🎓 When to Use Each System

### Use Medical Pipeline When:
- ✅ Processing large amounts of structural medical data
- ✅ Need classification into 6 types (symptoms, labs, imaging, vitals, notes, other)
- ✅ Fast is critical (batch processing, 1-3ms)
- ✅ No clinical judgment needed
- ✅ **Free** - No LLM costs

### Use Plugins System When:
- ✅ Need to add custom validation rules
- ✅ Want to integrate with external systems (audit, Slack, etc.)
- ✅ Need data transformation that plugins can handle
- ✅ Extensible architecture is beneficial

### Use Coding Ensemble When:
- ✅ Need medical judgment and clinical expertise
- ✅ Complex reasoning required
- ✅ Need to validate against medical schemas
- ✅ Need collaborative code review (Code Gen + Data Eng)
- ✅ Want persistent memory of learned patterns
- ✅ Need parallel processing of different aspects
- ✅ **$0/mo budget target** - use cost optimization features

### Use Cockpit Always:
- ✅ Monitoring all systems and costs in one place
- ✅ Make informed decisions about task routing
- ✅ Track progress toward $0/mo monthly goal
- ✅ Real-time visibility into all system activities
- ✅ Historical logs and metrics

## 🚨 Cost Management Tips

1. **Auto-route to free systems first** (Ollama, Plugins, Medical Pipeline)
2. **Use cloud providers only when needed** (complex tasks, specialized models)
3. **Batch similar queries** to reduce token usage
4. **Monitor cost metrics** in cockpit to track spending
5. **Set daily/monthly budgets** in cockpit config
6. **Review patterns** - most expensive tasks are usually code generation

## 🏗 Architecture Principles

### Federation Principles
- **Loose Coupling**: Each system can operate independently
- **Smart Routing**: Coordinator routes tasks based on type and system health
- **Cost Awareness**: Track all costs, optimize routing to stay at $0/mo
- **Extensibility**: Plugins system allows custom logic without core changes
- **Performance**: Medical Pipeline for ultra-fast structural tasks
- **Flexibility**: Coding Ensemble for complex tasks with medical judgment

### Communication Patterns
```
Cockpit ↔ Systems (WebSocket + REST API)
↓ Task routing (auto or manual)
↓ Status updates (every 10s)
↓ Activity logs (real-time)
↓ Cost metrics (live)
```

## 📝 License

MIT License - Free for healthcare, research, and educational use

---

**Built with human-AI collaboration**

Version 1.0.0 - February 23, 2026
