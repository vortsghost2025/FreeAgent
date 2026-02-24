# Implementation Roadmap: FREE Multi-AI Ensemble

## Overview

This document provides the complete implementation plan for transforming the existing free-coding-agent into a **$0/month distributed AI ensemble** with command center cockpit.

---

## File Structure to Create

```
free-coding-agent/
├── src/
│   ├── providers/
│   │   ├── base.js                    # (existing) Base provider class
│   │   ├── ollama.js                  # (existing) Local Ollama
│   │   ├── groq.js                    # (existing) Groq API
│   │   ├── together.js                # (existing) Together AI
│   │   ├── hybrid-manager.js          # (existing) Provider management
│   │   ├── openrouter.js              # NEW: OpenRouter free tier
│   │   ├── huggingface.js             # NEW: HuggingFace inference
│   │   ├── cloudflare-ai.js           # NEW: Cloudflare Workers AI
│   │   ├── lmstudio.js                # NEW: LM Studio local
│   │   └── provider-pool.js           # NEW: Smart provider selection
│   │
│   ├── distributed/
│   │   ├── vps-connector.js           # NEW: Connect to remote Ollama
│   │   ├── agent-discovery.js         # NEW: Auto-discover agents
│   │   ├── health-monitor.js          # NEW: Track agent health
│   │   ├── load-balancer.js           # NEW: Intelligent routing
│   │   └── p2p-mesh.js                # NEW: Bluetooth/WiFi P2P
│   │
│   ├── cockpit/
│   │   ├── dashboard-server.js        # NEW: WebSocket server for UI
│   │   ├── metrics-collector.js       # NEW: Aggregate all metrics
│   │   ├── cost-tracker.js            # NEW: Track $0 usage
│   │   └── alert-manager.js           # NEW: Health alerts
│   │
│   ├── ensemble-core-v8.js            # (existing) Update for distributed
│   ├── memory-database-sqlite.js      # (existing) SQLite persistence
│   └── swarm-integration.js           # (existing) Swarm coordination
│
├── public/
│   ├── cockpit.html                   # NEW: Main command center
│   ├── ensemble-ui.html               # (existing) Enhance
│   └── index.html                     # (existing)
│
├── scripts/
│   ├── setup-local-ollama.ps1         # NEW: Local setup script
│   ├── deploy-oracle-vps.sh           # NEW: Oracle deployment
│   ├── deploy-hostinger-vps.sh        # NEW: Hostinger deployment
│   └── deploy-alibaba-ecs.sh          # NEW: Alibaba deployment
│
└── config/
    ├── agents.json                    # NEW: Agent configuration
    ├── providers.json                 # NEW: Provider configuration
    └── network.json                   # NEW: Network topology
```

---

## Component Specifications

### 1. New Provider: OpenRouter (openrouter.js)

```javascript
// OpenRouter provides access to multiple free models
// Free tier includes: mistral-7b, llama-3-8b, phi-3
// Rate limits: Varies by model, generally generous free tier

Features:
- Multiple model access through single API
- Automatic model fallback
- Rate limit tracking per model
- Cost: $0 for free tier models
```

### 2. New Provider: HuggingFace (huggingface.js)

```javascript
// HuggingFace Inference API
// Free tier: Rate limited but functional
// Models: Many open-source models available

Features:
- Access to thousands of models
- Serverless inference
- Rate limit handling
- Cost: $0 for free tier
```

### 3. New Provider: Cloudflare AI (cloudflare-ai.js)

```javascript
// Cloudflare Workers AI
// Free tier: 10,000 neurons/day
// Models: llama-2-7b, mistral-7b, others

Features:
- Edge inference (low latency)
- 10,000 neurons/day free
- Global distribution
- Cost: $0 within limits
```

### 4. Provider Pool (provider-pool.js)

```javascript
// Smart provider selection and management

Features:
- Rate limit tracking per provider
- Automatic failover when limits hit
- Priority-based selection (local first)
- Health-based routing
- Cost tracking (always $0)

Selection Logic:
1. Check local Ollama availability
2. Check VPS Ollama instances
3. Fall back to free API tiers
4. Track usage against daily limits
```

### 5. VPS Connector (vps-connector.js)

```javascript
// Connect to remote Ollama instances on VPS

Features:
- SSH tunnel support
- Direct HTTP connection
- Health checking
- Automatic reconnection
- Load distribution

Supported VPS:
- Oracle Cloud (ARM instances)
- Hostinger VPS
- Alibaba ECS
```

### 6. Agent Discovery (agent-discovery.js)

```javascript
// Auto-discover available agents across network

Features:
- mDNS/Bonjour discovery
- Manual registration
- Capability detection
- Network topology mapping
- Real-time status updates
```

### 7. Health Monitor (health-monitor.js)

```javascript
// Track health of all agents and providers

Features:
- Heartbeat monitoring
- Latency tracking
- Error rate calculation
- Automatic failover triggers
- Alert generation
```

### 8. Load Balancer (load-balancer.js)

```javascript
// Intelligent request routing

Strategies:
- LOCAL_FIRST: Prefer local Ollama
- ROUND_ROBIN: Distribute evenly
- LEAST_LOADED: Route to idle agents
- LATENCY_BASED: Route to fastest
- CAPABILITY_MATCH: Route by task type

Features:
- Real-time load tracking
- Automatic rebalancing
- Sticky sessions for conversations
- Burst handling to cloud
```

### 9. P2P Mesh Network (p2p-mesh.js)

```javascript
// Peer-to-peer communication for offline operation

Features:
- Bluetooth Low Energy discovery
- WiFi Direct for high-speed transfer
- Encrypted communication
- Offline task queue
- Sync when reconnected

Protocol:
1. BLE beacon for discovery
2. Handshake exchange
3. WiFi Direct connection
4. Encrypted channel establishment
5. Task/response relay
```

### 10. Cockpit Dashboard (cockpit.html)

```html
// Real-time command center UI Panels: 1. Agent Grid (8 cards with status) 2.
Task Queue (pending/active/done) 3. Network Topology (visual map) 4. Metrics
Dashboard (tokens/sec, latency) 5. Log Stream (real-time logs) 6. Cost Counter
(always $0.00) 7. Health Alerts (notifications) Features: - WebSocket real-time
updates - Dark theme (existing style) - Responsive layout - Agent control
(start/stop/restart) - Task submission interface
```

---

## Agent Distribution Plan

### Local Machine (SEANSBEAST) - 3 Agents

| Agent    | ID  | Role            | Model               | RAM Usage |
| -------- | --- | --------------- | ------------------- | --------- |
| CodeGen  | AG1 | code_generation | llama3.2:8b         | ~5GB      |
| Testing  | AG4 | testing         | phi3:3.8b           | ~3GB      |
| Database | AG7 | database        | deepseek-coder:6.7b | ~4GB      |

**Total Local RAM**: ~12GB (fits in 16GB with headroom)

### Oracle Cloud VPS - 2 Agents

| Agent   | ID  | Role             | Model       |
| ------- | --- | ---------------- | ----------- |
| DataEng | AG2 | data_engineering | mistral:7b  |
| DevOps  | AG8 | devops           | llama3.2:8b |

### Hostinger VPS - 1 Agent

| Agent    | ID  | Role              | Model       |
| -------- | --- | ----------------- | ----------- |
| Clinical | AG3 | clinical_analysis | meditron:7b |

### Alibaba ECS - 1 Agent

| Agent    | ID  | Role     | Model        |
| -------- | --- | -------- | ------------ |
| Security | AG5 | security | codellama:7b |

### Free API Tier - 1 Agent (Burst)

| Agent | ID  | Role            | Provider  |
| ----- | --- | --------------- | --------- |
| API   | AG6 | api_integration | Groq Free |

---

## Configuration Files

### agents.json

```json
{
  "agents": {
    "AG1": {
      "id": "AG1",
      "name": "CodeGenerationAgent",
      "role": "code_generation",
      "location": "local",
      "provider": "ollama",
      "model": "llama3.2:8b",
      "priority": 1
    },
    "AG2": {
      "id": "AG2",
      "name": "DataEngineeringAgent",
      "role": "data_engineering",
      "location": "oracle-vps",
      "provider": "ollama-remote",
      "model": "mistral:7b",
      "endpoint": "http://oracle-vps:11434"
    }
    // ... other agents
  }
}
```

### providers.json

```json
{
  "providers": {
    "ollama-local": {
      "type": "ollama",
      "endpoint": "http://localhost:11434",
      "priority": 1,
      "cost": 0
    },
    "ollama-oracle": {
      "type": "ollama",
      "endpoint": "http://oracle-vps:11434",
      "priority": 2,
      "cost": 0
    },
    "groq-free": {
      "type": "groq",
      "dailyLimit": 14400,
      "priority": 3,
      "cost": 0
    },
    "openrouter-free": {
      "type": "openrouter",
      "models": ["mistral-7b-free", "llama-3-8b-free"],
      "priority": 4,
      "cost": 0
    }
  }
}
```

### network.json

```json
{
  "topology": {
    "local": {
      "host": "SEANSBEAST",
      "ip": "192.168.1.x",
      "agents": ["AG1", "AG4", "AG7"]
    },
    "oracle-vps": {
      "host": "oracle-free-tier",
      "ip": "xxx.xxx.xxx.xxx",
      "agents": ["AG2", "AG8"]
    },
    "hostinger-vps": {
      "host": "hostinger-vps",
      "ip": "xxx.xxx.xxx.xxx",
      "agents": ["AG3"]
    },
    "alibaba-ecs": {
      "host": "alibaba-ecs",
      "ip": "xxx.xxx.xxx.xxx",
      "agents": ["AG5"]
    }
  },
  "p2p": {
    "enabled": true,
    "bluetooth": true,
    "wifiDirect": true,
    "encryption": "AES-256"
  }
}
```

---

## VPS Deployment Scripts

### Oracle Cloud (deploy-oracle-vps.sh)

```bash
#!/bin/bash
# Deploy Ollama on Oracle Cloud Free Tier

# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Configure for remote access
sudo systemctl stop ollama
sudo mkdir -p /etc/systemd/system/ollama.service.d
echo '[Service]
Environment="OLLAMA_HOST=0.0.0.0"' | sudo tee /etc/systemd/system/ollama.service.d/override.conf

# Start Ollama
sudo systemctl daemon-reload
sudo systemctl start ollama

# Pull models
ollama pull mistral:7b
ollama pull llama3.2:8b

# Open firewall
sudo iptables -I INPUT -p tcp --dport 11434 -j ACCEPT
```

---

## Implementation Order

### Phase 1: Core Providers (Day 1)

1. Create openrouter.js provider
2. Create huggingface.js provider
3. Create cloudflare-ai.js provider
4. Create provider-pool.js for smart selection
5. Update hybrid-manager.js to use provider pool

### Phase 2: Distributed Infrastructure (Day 2)

1. Create vps-connector.js
2. Create agent-discovery.js
3. Create health-monitor.js
4. Create load-balancer.js
5. Create deployment scripts

### Phase 3: Cockpit UI (Day 3)

1. Create cockpit.html main dashboard
2. Create dashboard-server.js WebSocket server
3. Create metrics-collector.js
4. Create cost-tracker.js
5. Create alert-manager.js

### Phase 4: P2P Network (Day 4)

1. Create p2p-mesh.js
2. Implement Bluetooth discovery
3. Implement WiFi Direct
4. Add encryption layer
5. Test offline operation

### Phase 5: Integration (Day 5)

1. Update ensemble-core-v8.js
2. Update ensemble.config.json
3. Create configuration files
4. End-to-end testing
5. Documentation

---

## Success Metrics

| Metric          | Target                       |
| --------------- | ---------------------------- |
| Monthly Cost    | $0                           |
| Active Agents   | 8                            |
| Local Agents    | 3                            |
| VPS Agents      | 4                            |
| API Burst Agent | 1                            |
| Uptime          | 99%+                         |
| Avg Latency     | <2s local, <5s remote        |
| Daily Capacity  | Unlimited local + 14,400 API |

---

## Risk Mitigation

| Risk            | Mitigation                      |
| --------------- | ------------------------------- |
| VPS downtime    | Automatic failover to local/API |
| Rate limits hit | Provider pool rotation          |
| Network issues  | P2P mesh for local operation    |
| Model quality   | Use best free models available  |
| Memory pressure | Model quantization, swap        |

---

## Ready to Implement

This plan is ready for implementation. Switch to Code mode to begin building the components in the order specified above.
