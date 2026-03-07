// FreeAgent Orchestrator for Cloud Shell Cockpit
// Coordinates between Claude, Gemini (Vertex AI), and local models
// Supports vector memory and multi-session management

const path = require('path');
const fs = require('fs');

// Load dependencies
let ClaudeClient, LocalModelClient, GeminiClient;
let VectorMemory, SessionStore;

// Try to load local dependencies, fallback to inline implementations
try {
  ClaudeClient = require('./clients/claudeClient');
  LocalModelClient = require('./clients/localModelClient');
  GeminiClient = require('./clients/geminiClient');
  VectorMemory = require('./memory');
  SessionStore = require('./sessions');
} catch (e) {
  console.log('[Orchestrator] Using inline client implementations');
}

// Configuration
const config = {
  preferLocal: process.env.PREFER_LOCAL !== 'false',
  localModelUrl: process.env.LOCAL_MODEL_URL || 'http://localhost:3847',
  claudeApiKey: process.env.CLAUDE_API_KEY || '',
  geminiProject: process.env.GCP_PROJECT || '',
  geminiLocation: process.env.GCP_LOCATION || 'us-central1',
  memoryEnabled: process.env.MEMORY_ENABLED !== 'false',
  sessionEnabled: process.env.SESSION_ENABLED !== 'false',
  embeddingsUrl: process.env.EMBEDDINGS_URL || 'http://localhost:3847'
};

class Orchestrator {
  constructor(options = {}) {
    this.config = { ...config, ...options };
    this.clients = {};
    this.memory = null;
    this.sessions = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    console.log('[Orchestrator] Initializing...');
    console.log('[Orchestrator] Config:', {
      preferLocal: this.config.preferLocal,
      memoryEnabled: this.config.memoryEnabled,
      sessionEnabled: this.config.sessionEnabled,
      localModelUrl: this.config.localModelUrl,
      hasClaudeKey: !!this.config.claudeApiKey,
      hasGeminiProject: !!this.config.geminiProject
    });

    // Initialize clients
    if (ClaudeClient) {
      this.clients.claude = new ClaudeClient({ 
        apiKey: this.config.claudeApiKey 
      });
    }
    
    if (LocalModelClient) {
      this.clients.local = new LocalModelClient({ 
        endpoint: this.config.localModelUrl 
      });
    }
    
    if (GeminiClient && this.config.geminiProject) {
      this.clients.gemini = new GeminiClient({
        project: this.config.geminiProject,
        location: this.config.geminiLocation
      });
    }

    // Initialize memory
    if (this.config.memoryEnabled && VectorMemory) {
      this.memory = new VectorMemory({
        storePath: process.env.MEMORY_DB_PATH || './data/memory.db',
        embeddingsUrl: this.config.embeddingsUrl
      });
      await this.memory.initialize();
    }

    // Initialize sessions
    if (this.config.sessionEnabled && SessionStore) {
      this.sessions = new SessionStore({
        storePath: process.env.SESSION_DB_PATH || './data/sessions.db'
      });
      await this.sessions.initialize();
    }

    this.initialized = true;
    console.log('[Orchestrator] Initialization complete');
  }

  async process(request) {
    const startTime = Date.now();
    const { message, history = [], sessionId } = request;

    await this.initialize();

    // Load session context if sessionId provided
    let sessionHistory = [];
    let sessionContext = '';
    
    if (this.config.sessionEnabled && sessionId && this.sessions) {
      try {
        const session = await this.sessions.get(sessionId);
        if (session) {
          sessionHistory = await this.sessions.getHistory(sessionId, 20);
          sessionContext = `\n\nSession: "${session.name}"\n`;
          if (session.description) {
            sessionContext += `Description: ${session.description}\n`;
          }
          console.log(`[Orchestrator] Loaded session: ${session.name} (${session.messageCount} messages)`);
        }
      } catch (error) {
        console.error('[Orchestrator] Error loading session:', error);
      }
    }

    // Merge session history with provided history
    const mergedHistory = [...sessionHistory, ...history];

    // Search memory for relevant context
    let memoryContext = '';
    if (this.config.memoryEnabled && this.memory) {
      try {
        const searchCollection = sessionId ? `session_${sessionId}` : 'conversations';
        const memories = await this.memory.search(message, {
          collection: searchCollection,
          limit: 3,
          threshold: 0.5
        });
        
        if (memories.length > 0) {
          memoryContext = '\n\nRelevant memories from past sessions:\n' + 
            memories.map(m => `- ${m.content}`).join('\n');
          console.log(`[Orchestrator] Found ${memories.length} relevant memories`);
        }
      } catch (error) {
        console.error('[Orchestrator] Memory search error:', error);
      }
    }

    // Analyze routing
    const routingDecision = this.analyzeRouting(message, mergedHistory);
    console.log(`[Orchestrator] Routing decision: ${routingDecision.agent} (${routingDecision.reason})`);

    let result;
    switch (routingDecision.agent) {
      case 'claude':
        result = await this.callClaude(message, mergedHistory, memoryContext, sessionContext);
        break;
      case 'gemini':
        result = await this.callGemini(message, mergedHistory, memoryContext, sessionContext);
        break;
      case 'local':
      default:
        result = await this.callLocal(message, mergedHistory, memoryContext, sessionContext);
    }

    // Store interaction in session
    if (this.config.sessionEnabled && sessionId && this.sessions) {
      try {
        await this.sessions.addMessage(sessionId, {
          role: 'user',
          content: message
        });
        await this.sessions.addMessage(sessionId, {
          role: 'assistant',
          content: result.text,
          agent: result.agent
        });
      } catch (error) {
        console.error('[Orchestrator] Error storing session messages:', error);
      }
    }

    // Store important interactions in memory
    if (this.config.memoryEnabled && this.memory && result.text.length > 50) {
      try {
        const memoryCollection = sessionId ? `session_${sessionId}` : 'conversations';
        await this.memory.add(
          `User asked: ${message}\n\nAgent responded: ${result.text.substring(0, 500)}`,
          { 
            collection: memoryCollection,
            metadata: { agent: result.agent, sessionId: sessionId || null }
          }
        );
      } catch (error) {
        console.error('[Orchestrator] Memory store error:', error);
      }
    }

    result.latency = Date.now() - startTime;
    return result;
  }

  analyzeRouting(message, history) {
    const lowerMessage = message.toLowerCase();
    
    // High-stakes tasks go to Claude
    if (
      lowerMessage.includes('security') ||
      lowerMessage.includes('audit') ||
      lowerMessage.includes('critical') ||
      lowerMessage.includes('verify') ||
      lowerMessage.includes('check for bugs')
    ) {
      return { agent: 'claude', reason: 'safety-critical task' };
    }

    // Complex reasoning goes to Gemini
    if (
      lowerMessage.includes('analyze') ||
      lowerMessage.includes('reason') ||
      lowerMessage.includes('explain') ||
      lowerMessage.includes('plan') ||
      lowerMessage.includes('complex')
    ) {
      return { agent: 'gemini', reason: 'complex reasoning' };
    }

    // Fast tasks can use local model
    if (
      lowerMessage.includes('draft') ||
      lowerMessage.includes('quick') ||
      lowerMessage.includes('simple') ||
      lowerMessage.length < 100
    ) {
      return { agent: 'local', reason: 'fast/simple task' };
    }

    // Default based on preference
    return {
      agent: this.config.preferLocal ? 'local' : 'claude',
      reason: this.config.preferLocal ? 'default to local' : 'default to claude'
    };
  }

  async callClaude(message, history, memoryContext = '', sessionContext = '') {
    const messages = [...history, { role: 'user', content: message }];
    const system = `You are the FreeAgent Orchestrator. You coordinate between local GPU models and Claude API to help users build and operate their AI system. Be concise and clear.${sessionContext}${memoryContext}`;

    try {
      if (this.clients.claude) {
        const result = await this.clients.claude.generate(messages, system);
        return { text: result.text, agent: 'claude', tokens: result.tokens };
      }
    } catch (error) {
      console.error('[Orchestrator] Claude error:', error.message);
    }

    // Fallback to local
    return this.callLocal(message, history, memoryContext, sessionContext);
  }

  async callLocal(message, history, memoryContext = '', sessionContext = '') {
    const messages = [...history, { role: 'user', content: message }];
    const system = `You are FreeAgent, a helpful AI assistant running on local GPU. Be concise and efficient.${sessionContext}${memoryContext}`;

    try {
      if (this.clients.local) {
        const result = await this.clients.local.generate(messages, system);
        return { text: result.text, agent: 'local', tokens: result.tokens };
      }
    } catch (error) {
      console.error('[Orchestrator] Local model error:', error.message);
    }

    return { text: 'No AI provider available. Please configure Claude API key or local model.', agent: 'none' };
  }

  async callGemini(message, history, memoryContext = '', sessionContext = '') {
    const messages = [...history, { role: 'user', content: message }];
    const system = `You are FreeAgent with advanced reasoning capabilities. Be thorough and analytical.${sessionContext}${memoryContext}`;

    try {
      if (this.clients.gemini) {
        const result = await this.clients.gemini.generate(messages, system);
        return { text: result.text, agent: 'gemini', tokens: result.tokens };
      }
    } catch (error) {
      console.error('[Orchestrator] Gemini error:', error.message);
    }

    // Fallback to Claude
    return this.callClaude(message, history, memoryContext, sessionContext);
  }

  async healthCheck() {
    const health = {
      local: false,
      claude: false,
      gemini: false,
      memory: false,
      sessions: false,
      toolsEnabled: false,
      sessionEnabled: this.config.sessionEnabled,
      memoryEnabled: this.config.memoryEnabled
    };

    try {
      if (this.clients.local) {
        health.local = await this.clients.local.healthCheck();
      }
    } catch (e) {}

    try {
      if (this.clients.claude) {
        health.claude = this.clients.claude.isConfigured();
      }
    } catch (e) {}

    try {
      if (this.clients.gemini) {
        health.gemini = await this.clients.gemini.healthCheck();
      }
    } catch (e) {}

    try {
      if (this.memory) {
        health.memory = await this.memory.healthCheck();
      }
    } catch (e) {}

    try {
      if (this.sessions) {
        health.sessions = await this.sessions.healthCheck();
      }
    } catch (e) {}

    return health;
  }

  // Session management
  async createSession(name, options = {}) {
    if (!this.sessions) {
      throw new Error('Sessions not enabled');
    }
    return this.sessions.create(name, options);
  }

  async listSessions() {
    if (!this.sessions) return [];
    return this.sessions.list();
  }

  async getSession(id) {
    if (!this.sessions) return null;
    return this.sessions.get(id);
  }

  async deleteSession(id) {
    if (!this.sessions) return false;
    return this.sessions.delete(id);
  }

  // Memory management
  async searchMemory(query, options = {}) {
    if (!this.memory) return [];
    return this.memory.search(query, options);
  }

  async addMemory(content, options = {}) {
    if (!this.memory) return null;
    return this.memory.add(content, options);
  }

  async getMemoryStats() {
    if (!this.memory) return { total: 0, collections: [] };
    return this.memory.stats();
  }
}

// Singleton
let orchestrator = null;

function getOrchestrator(config) {
  if (!orchestrator) {
    orchestrator = new Orchestrator(config);
  }
  return orchestrator;
}

module.exports = { Orchestrator, getOrchestrator, config };
