# Agent Enhancement Plan for Cockpit

## Executive Summary

This plan outlines enhancements to transform the cockpit agent from a text-based assistant into a multimodal, self-improving AI system. We leverage existing infrastructure (memory system, plugin loader, protocol registry, autonomous evolution) while filling critical gaps in perception, audio processing, and advanced memory capabilities.

---

## 1. Existing Infrastructure (Leverage)

| Component | Location | Purpose |
|-----------|----------|---------|
| Memory System | `agent-memory/`, `utils/memory-consolidator.js` | JSON-based persistent memory with deduplication |
| Unified Brain | `agent-memory/unified-brain.json` | Centralized knowledge aggregation |
| Plugin Loader | `infrastructure/plugin-loader.js` | Dynamic module registration and lifecycle management |
| Protocol Registry | `infrastructure/protocol-registry.js` | Versioned protocol activation tracking |
| Autonomy Engine | `intelligence/autonomous-evolution-cycles.js` | Diagnostic-driven improvement proposals |
| Federation | `federation/` | Cross-region agent coordination |

---

## 2. Gaps to Fill

| Gap | Current State | Target State |
|-----|---------------|--------------|
| **Perception (Vision)** | Text-only input | Image upload + LLM vision processing |
| **Perception (Audio)** | No voice support | Web Speech API + audio file upload |
| **Working Memory** | Purely persistent JSON | In-memory buffer for active context |
| **Episodic Memory** | None | Session replay and event sequencing |
| **External Integrations** | Basic HTTP | Webhook handlers + API connectors |
| **Vector/Semantic Search** | Keyword matching | Embedding-based similarity search |

---

## 3. Perception Module

### 3.1 Image Upload Handling

**Implementation Path:**

```
cockpit-server.js
  ├── POST /api/perception/image (upload endpoint)
  ├── WebSocket: binary frame handling
  └── perception/
      └── image-processor.js
```

**Core Components:**

```javascript
// New file: perception/image-processor.js
export class ImageProcessor {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB
    this.allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    this.visionProvider = options.visionProvider || 'openrouter'; // or 'ollama', 'groq'
  }

  async process(buffer, options = {}) {
    // 1. Validate image
    // 2. Convert to base64
    // 3. Send to vision-capable LLM
    // 4. Parse and return structured response
  }
}
```

**Integration with Existing Plugin Loader:**

- Register `image-processor` as a `perception` type module via [`PluginManager.register()`](infrastructure/plugin-loader.js:213)
- Use protocol registry to track vision model versions

### 3.2 Vision Processing

**Supported Models (Vision-Capable):**

| Provider | Model | Cost | Notes |
|----------|-------|------|-------|
| OpenRouter | `llama-3.2-90b-vision` | ~$0.001/img | Best quality |
| Ollama | `llama3.2-vision` | Free | Local |
| Groq | `llama-3.2-90b-vision-preview` | Free tier | Fast |

**Prompt Template:**

```
You are a medical AI assistant analyzing an image. 
Context: {userContext}
Task: {userTask}
Provide: {structured_output_format}
```

**Output Schema:**

```javascript
{
  type: 'image-analysis',
  timestamp: Date.now(),
  description: string,
  entities: [{ type: string, label: string, confidence: number }],
  medicalFlags: [{ severity: 'normal'|'warning'|'critical', description: string }],
  suggestedActions: [string]
}
```

---

## 4. Audio Input

### 4.1 Voice Message Handling

**Two-Pronged Approach:**

1. **Real-time: Web Speech API** (browser-based)
2. **Offline: Audio file upload** (server-side)

### 4.1.1 Web Speech API Integration

**Frontend Component:**

```javascript
// In public/cockpit.html - speech recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.continuous = false;
recognition.interimResults = true;

recognition.onresult = (event) => {
  const transcript = Array.from(event.results)
    .map(r => r[0].transcript)
    .join('');
    
  // Send to cockpit via WebSocket or REST
  ws.send(JSON.stringify({ type: 'voice-input', text: transcript }));
};
```

**Server Handler:**

```javascript
// Add to cockpit-server.js
app.post('/api/perception/voice', express.text({ limit: '10mb' }), async (req, res) => {
  const { text, language } = req.body;
  // Process through agent with voice context flag
  const response = await agent.process(text, { modality: 'voice', language });
  res.json(response);
});
```

### 4.1.2 Audio File Upload

**Implementation:**

```javascript
// New file: perception/audio-processor.js
export class AudioProcessor {
  constructor(options = {}) {
    this.maxDuration = options.maxDuration || 300; // 5 minutes
    this.sampleRate = options.sampleRate || 16000;
  }

  async transcribe(buffer, options = {}) {
    // Use Whisper API (OpenAI) or local Whisper via Ollama
    // Return { text, language, segments[] }
  }
}
```

**Endpoints:**

- `POST /api/perception/audio` - File upload
- `POST /api/perception/voice` - Web Speech transcript

---

## 5. Enhanced Memory

### 5.1 Working Memory Buffer

**Purpose:** Hold active conversation context in-memory for fast retrieval during a session.

**Implementation:**

```javascript
// New file: memory/working-memory.js
export class WorkingMemory {
  constructor(options = {}) {
    this.maxItems = options.maxItems || 50;
    this.ttl = options.ttl || 3600000; // 1 hour
    this.buffer = new Map(); // sessionId -> [{ role, content, timestamp }]
  }

  add(sessionId, message) {
    const session = this.buffer.get(sessionId) || [];
    session.push({ ...message, timestamp: Date.now() });
    
    // FIFO eviction
    if (session.length > this.maxItems) {
      session.shift();
    }
    
    this.buffer.set(sessionId, session);
  }

  getContext(sessionId, limit = 10) {
    const session = this.buffer.get(sessionId) || [];
    return session.slice(-limit);
  }

  clear(sessionId) {
    this.buffer.delete(sessionId);
  }
}
```

**Integration:**

- Initialize in [`cockpit-server.js`](cockpit-server.js:61) alongside existing middleware
- Wire into WebSocket connection lifecycle
- Sync to persistent memory on session end

### 5.2 Episodic Memory (Session Replay)

**Purpose:** Store complete session histories for later analysis, debugging, and learning.

**Storage Structure:**

```javascript
// agent-memory/episodic/
//   ├── 2024-01-15/
//   │   ├── session-1705334400000.json
//   │   └── session-1705338000000.json
//   └── index.json
```

**Session Schema:**

```javascript
{
  sessionId: string,
  startTime: ISO8601,
  endTime: ISO8601,
  modality: 'text' | 'voice' | 'image' | 'mixed',
  events: [
    { type: 'user-message'|'agent-response'|'tool-call'|'perception',
      timestamp: number,
      data: object }
  ],
  outcomes: {
    tasksCompleted: number,
    errors: number,
    userSatisfaction?: number
  },
  summary: string // Generated by LLM
}
```

**Key Features:**

- **Auto-save:** Periodic writes (every 5 minutes) + session end
- **Replay API:** `GET /api/memory/episodic/:sessionId` for debugging
- **Learning extraction:** Run consolidation job on episodic data

### 5.3 Integration with Existing Memory System

**Leverage Points:**

1. **Memory Consolidator** - Extend [`extractLearnings()`](utils/memory-consolidator.js:64) to include episodic summaries
2. **Unified Brain** - Add episodic domain to [`DOMAIN_MAP`](utils/memory-consolidator.js:19)
3. **Shared Workspace** - Use [`agent-memory/shared-workspace/`](agent-memory/shared-workspace/) for real-time coordination

**Enhanced Consolidator Call:**

```javascript
// After existing consolidation
import { extractEpisodicLearnings } from './memory/episodic-memory.js';
const episodicLearnings = await extractEpisodicLearnings(days = 7);
unifiedBrain.domains.episodic = episodicLearnings;
```

---

## 6. External Integrations

### 6.1 Webhook Handlers

**Architecture:**

```
External System → Webhook Endpoint → Validation → Agent Processing → Response
```

**Implementation:**

```javascript
// New file: integrations/webhook-handler.js
export class WebhookHandler {
  constructor(options = {}) {
    this.secret = options.secret;
    this.validators = new Map(); // webhook type -> validator fn
  }

  register(type, validator) {
    this.validators.set(type, validator);
  }

  async handle(req, res) {
    const { type, payload, signature } = req.body;
    
    // Validate signature
    if (this.secret && !this.verifySignature(signature, payload)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Validate payload
    const validator = this.validators.get(type);
    if (validator && !validator(payload)) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Process through agent
    const result = await agent.process({
      source: 'webhook',
      type,
      payload,
      context: req.headers
    });

    res.json(result);
  }
}
```

**Endpoints:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/webhooks/generic` | POST | Generic webhook receiver |
| `/api/webhooks/github` | POST | GitHub events (push, PR, issues) |
| `/api/webhooks/schedule` | POST | Cron/schedule triggers |
| `/api/webhooks/custom/:type` | POST | Custom webhook types |

### 6.2 API Connectors

**Pattern:** Plugin-based connectors registered via existing [`PluginLoader`](infrastructure/plugin-loader.js:7)

```javascript
// New file: integrations/api-connectors.js
export class APIConnectorRegistry {
  constructor(pluginLoader) {
    this.pluginLoader = pluginLoader;
    this.connectors = new Map();
  }

  register(name, config, connectorClass) {
    const connector = new connectorClass(config);
    this.connectors.set(name, connector);
    
    // Register as plugin for lifecycle management
    this.pluginLoader.registerModule(`connector-${name}`, connector, {
      type: 'connector',
      version: config.version || '1.0.0'
    });
  }

  async call(name, action, params) {
    const connector = this.connectors.get(name);
    if (!connector) throw new Error(`Unknown connector: ${name}`);
    return connector[action](params);
  }
}
```

**Built-in Connectors:**

| Connector | Features |
|-----------|----------|
| `http` | Generic REST calls with retry logic |
| `graphql` | GraphQL query/mutation support |
| `database` | SQL/noSQL query execution |
| `filesystem` | File read/write operations |

---

## 7. Self-Improvement Loop

### 7.1 Connecting Perception → Memory → Autonomy

**Architecture:**

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Perception  │────▶│   Memory    │────▶│  Autonomy   │
│ (Input)     │     │ (Storage)  │     │ (Improvement)│
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                    │
       │                   │                    │
       ▼                   ▼                    ▼
  ┌─────────┐        ┌──────────┐        ┌───────────┐
  │ Vision  │        │ Working  │        │ Evolution │
  │ Audio   │        │ Episodic │        │ Cycles    │
  └─────────┘        └──────────┘        └───────────┘
```

### 7.2 Perception → Memory Flow

**On each perception event:**

```javascript
// perception/event-bus.js
export class PerceptionEventBus {
  constructor(memory, workingMemory) {
    this.memory = memory;
    this.workingMemory = workingMemory;
  }

  async onPerception(event) {
    const { type, content, sessionId, metadata } = event;
    
    // 1. Add to working memory (immediate context)
    this.workingMemory.add(sessionId, {
      role: 'perception',
      type,
      content,
      metadata
    });

    // 2. If significant, persist to episodic
    if (this.isSignificant(event)) {
      await this.memory.savePerceptionEvent(sessionId, event);
    }

    // 3. Emit for autonomy system
    this.emit('perception:analyzed', {
      event,
      sessionId,
      timestamp: Date.now()
    });
  }

  isSignificant(event) {
    // Criteria: high-confidence medical findings, errors, user feedback
    return event.metadata?.confidence > 0.8 || 
           event.type === 'error' ||
           event.type === 'feedback';
  }
}
```

### 7.3 Memory → Autonomy Flow

**Trigger autonomous evolution on memory events:**

```javascript
// intelligence/memory-driven-evolution.js
import { ImprovementBuilder } from './autonomous-evolution-cycles.js';

export class MemoryDrivenEvolution {
  constructor(options = {}) {
    this.builder = new ImprovementBuilder(options);
    this.thresholds = options.thresholds || {
      errorRate: 0.05,
      latencyP95: 500,
      driftScore: 0.3
    };
  }

  async evaluateAndPropose(memoryStats, diagnostics) {
    // 1. Analyze memory patterns
    const patterns = await this.analyzeMemoryPatterns(memoryStats);
    
    // 2. Merge with system diagnostics
    const combinedSignals = {
      ...diagnostics,
      memoryPatterns: patterns,
      latencyBudgetMs: this.thresholds.latencyP95
    };

    // 3. Generate improvement proposals
    const proposals = this.builder.proposeImprovements(
      `cycle-${Date.now()}`,
      combinedSignals
    );

    // 4. Filter by memory-specific improvements
    const memoryProposals = proposals.filter(p => 
      p.target.includes('memory') || 
      p.target.includes('perception')
    );

    return {
      proposals: memoryProposals,
      patterns,
      recommendations: this.generateRecommendations(patterns)
    };
  }

  async analyzeMemoryPatterns(stats) {
    return {
      episodicGrowth: stats.episodicGrowthRate,
      workingMemoryUtilization: stats.workingMemoryUtilization,
      consolidationFrequency: stats.consolidationsPerDay,
      errorCorrelation: stats.errorPatterns
    };
  }
}
```

### 7.4 Closed-Loop Implementation

**Integration with Existing Systems:**

1. **Hook into [`PluginManager`](infrastructure/plugin-loader.js:203) events:**
   ```javascript
   pluginManager.on('perception:complete', async (data) => {
     await memoryDrivenEvolution.evaluateAndPropose(memoryStats, currentDiagnostics);
   });
   ```

2. **Use [`ProtocolRegistry`](infrastructure/protocol-registry.js) for tracking:**
   ```javascript
   registry.register('perception-memory-loop', {
     name: 'Perception-Memory-Autonomy Loop',
     priority: 'CRITICAL',
     triggers: { 
       primary: ['perception:analyzed', 'memory:consolidated'],
       secondary: ['autonomy:cycle:complete']
     }
   });
   ```

3. **Leverage existing [`autonomous-evolution-cycles.js`](intelligence/autonomous-evolution-cycles.js:19):**
   - Extend `proposeImprovements()` with memory-specific signals
   - Add perception health to diagnostics snapshot

---

## 8. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Set up `perception/` directory structure
- [ ] Implement `ImageProcessor` with vision LLM integration
- [ ] Add image upload endpoint to cockpit-server
- [ ] Basic working memory buffer

### Phase 2: Audio & Memory (Week 3-4)
- [ ] Implement `AudioProcessor` with Whisper
- [ ] Add Web Speech API frontend integration
- [ ] Create episodic memory storage system
- [ ] Extend memory consolidator

### Phase 3: External Integrations (Week 5-6)
- [ ] Implement webhook handler framework
- [ ] Build API connector registry
- [ ] Add GitHub webhook support

### Phase 4: Self-Improvement Loop (Week 7-8)
- [ ] Create perception event bus
- [ ] Implement memory-driven evolution
- [ ] Close the loop: perception → memory → autonomy
- [ ] Integration testing and tuning

---

## 9. File Structure

```
c:/workspace/medical/
├── perception/
│   ├── image-processor.js      # Vision processing
│   ├── audio-processor.js     # Audio transcription
│   ├── speech-client.js       # Web Speech API wrapper
│   └── event-bus.js           # Perception event distribution
├── memory/
│   ├── working-memory.js      # In-memory session buffer
│   ├── episodic-memory.js     # Session replay storage
│   └── semantic-index.js      # (Future) Vector embeddings
├── integrations/
│   ├── webhook-handler.js     # Generic webhook receiver
│   ├── api-connectors.js      # Plugin-based API clients
│   └── connectors/            # Built-in connectors
├── intelligence/
│   ├── memory-driven-evolution.js  # Memory → Autonomy bridge
│   └── perception-diagnostics.js    # Perception health metrics
└── plans/
    └── AGENT_ENHANCEMENT_PLAN.md   # This document
```

---

## 10. Dependencies

| Package | Purpose | Status |
|---------|---------|--------|
| `express` | HTTP server | Existing |
| `ws` | WebSocket | Existing |
| `formidable` | File upload parsing | New |
| `@xenova/transformers` | Local Whisper (optional) | New |
| `dotenv` | Environment config | Existing |

---

## 11. Backward Compatibility

- All new endpoints use `/api/perception/` and `/api/memory/` prefixes
- Existing `/api/agent/*` routes unchanged
- WebSocket message format extended with optional `modality` field
- Plugin loader continues to work with existing modules

---

## 12. Testing Strategy

| Module | Test Approach |
|--------|---------------|
| Image Processor | Unit: mock LLM responses; Integration: real image → vision call |
| Audio Processor | Unit: sample audio files; Integration: Whisper transcription |
| Working Memory | Unit: buffer eviction, TTL expiry |
| Episodic Memory | Integration: full session capture and replay |
| Webhook Handler | Integration: curl to endpoints with signed payloads |
| Self-Improvement Loop | System: inject perception events → verify proposals |

---

## 13. Success Metrics

| Metric | Target |
|--------|--------|
| Vision response latency | < 5s (cloud) / < 2s (local) |
| Voice transcription accuracy | > 95% |
| Working memory access | < 10ms |
| Episodic storage efficiency | < 1MB per session |
| Webhook handler throughput | 100+ requests/minute |
| Autonomy cycle completion | < 30 seconds |

---

## 14. Related Documents

- [Architecture Overview](docs/ARCHITECTURE.md)
- [Protocol Registry Usage](infrastructure/protocol-registry.js)
- [Plugin Loader Guide](infrastructure/plugin-loader.js)
- [Autonomous Evolution Cycles](intelligence/autonomous-evolution-cycles.js)
- [Memory Consolidator](utils/memory-consolidator.js)