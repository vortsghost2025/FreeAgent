const AdaptiveRuntime = require("./runtime/loop");
const RouterAgent = require("./agents/routerAgent");
const IterationGovernor = require("./safety/iterationGovernor");
const { ContextSliceManager, SliceTemplates } = require("./context");

// =============================================================================
// STRICT FALLBACK POLICY FOR COCKPIT
// =============================================================================

/**
 * Strict Fallback Policy Object for Cockpit Orchestrator
 * - Primary stack offline → warn only, NO automatic fallback
 * - Reconnection fails → ResilienceManager handles it
 * - Ollama is QUARANTINED - never silently used as fallback
 */
const STRICT_FALLBACK_POLICY = {
  // Primary stack
  primary: ['claude', 'gemini'],
  // Secondary stack  
  secondary: ['minimax', 'local'],
  // Quarantined - NEVER use automatically
  quarantined: ['ollama'],
  
  rules: {
    claude: {
      allowFallback: true,
      fallbacks: ['gemini'],
      requireExplicitApproval: false,
      warnMessage: '⚠️  WARNING: Falling back from Claude to Gemini'
    },
    gemini: {
      allowFallback: true,
      fallbacks: ['claude'],
      requireExplicitApproval: false,
      warnMessage: '⚠️  WARNING: Falling back from Gemini'
    },
    local: {
      allowFallback: false,
      fallbacks: [],
      requireExplicitApproval: true,
      warnMessage: '⚠️  CRITICAL: Local model failed, no fallback available'
    }
  },
  
  canFallback(fromProvider) {
    const rule = this.rules[fromProvider];
    if (!rule) return { allowed: false, reason: 'No fallback rule defined' };
    if (!rule.allowFallback) return { allowed: false, reason: 'Fallback explicitly disabled' };
    return { allowed: true, fallbacks: rule.fallbacks, warnMessage: rule.warnMessage };
  },
  
  isQuarantined(provider) {
    return this.quarantined.includes(provider);
  },
  
  logFallbackAttempt(fromProvider, toProvider, context = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      from: fromProvider,
      to: toProvider,
      ...context,
      policy: 'STRICT',
      silent: false
    };
    console.log(`[STRICT FALLBACK] ${JSON.stringify(logEntry)}`);
    return logEntry;
  }
};

// =============================================================================
// MULTI-AGENT COLLABORATION PROTOCOL
// =============================================================================

const MultiAgentCollaboration = {
  Events: {
    TASK_DELEGATED: 'task:delegated',
    TASK_COMPLETED: 'task:completed',
    TASK_FAILED: 'task:failed',
    AGENT_ONLINE: 'agent:online',
    AGENT_OFFLINE: 'agent:offline',
    COLLABORATION_REQUEST: 'collaboration:request',
    COLLABORATION_RESPONSE: 'collaboration:response'
  },
  
  Patterns: {
    SEQUENTIAL: 'sequential',
    PARALLEL: 'parallel',
    CONSULTATION: 'consultation',
    HANDOFF: 'handoff'
  },
  
  createRequest(fromAgent, toAgent, task, pattern = 'handoff') {
    return {
      id: `collab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      from: fromAgent,
      to: toAgent,
      task: task,
      pattern: pattern,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
  },
  
  handleResponse(request, response) {
    return {
      requestId: request.id,
      from: request.to,
      to: request.from,
      response: response,
      timestamp: new Date().toISOString(),
      status: response.error ? 'failed' : 'completed'
    };
  }
};

// =============================================================================
// CAPABILITY DETECTION
// =============================================================================

const FILE_OPERATION_KEYWORDS = {
  READ: /read\s*(file|dir|folder|content)|show\s*(me\s*)?(file|content)|view\s*(file|content)|display\s*(file|content)|cat\s+|<\s*file|get\s+file/i,
  WRITE: /write\s*(file|to\s*file)|create\s*(file|directory|folder)|save\s*(to\s*)?(file|disk)|edit\s*(file|content)|modify\s*(file|content)|update\s*(file|content)|make\s*(file|directory)/i,
  DELETE: /delete|remove|erase|rm\s+(-[rf]?\s*)?/i,
  LIST: /(list|show)\s*(all\s*)?(files?|dir|directory|folder|contents?)|ls\s+|dir\s+|get\s+(files?|listing)/i,
  SEARCH: /(search|find|look|grep)\s*(for|in|file|dir|pattern)?|locate\s+|where\s*is/i,
  PATH: /(file|directory|folder)\s*(path|location|name)|resolve\s*(path|file)|absolute\s*(path|file)|realpath/i,
  WORKSPACE: /workspace|project\s*(root|dir)|root\s*(dir|folder)|initialize\s*(workspace|project)/i,
  EXECUTE: /run\s*(command|script|cmd|build|npm|node)?|execute\s*(command|script)|shell\s*(command)|bash\s+|cmd\s+|powershell\s+|build\s*script|start\s*(server|app)/i,
  CODE: /code\s*(file|operation)|program\s*(file)|source\s*(file)|\.\w+$/i
};

const REASONING_KEYWORDS = {
  ANALYZE: /analyze|analysis|examine|investigate/i,
  REASON: /reason|reasoning|logic|deduce|infer/i,
  PLAN: /plan|strategy|design|architecture|approach/i,
  COMPARE: /compare|contrast|versus|vs|difference/i,
  EVALUATE: /evaluate|assess|judge|review|audit/i,
  CRITICAL: /critical|crucial|safety|security|verify/i
};

const FILE_TOOLS = [
  'read_file', 'write_file', 'write_files', 'write_to_file',
  'list_files', 'search_files', 'search_and_replace',
  'execute_command', 'delete_file',
  'create_directory', 'copy_file', 'move_file'
];

function detectFileAccessRequirement(message, options = {}) {
  const text = message || '';
  
  if (options.tools && Array.isArray(options.tools)) {
    const hasFileTool = options.tools.some(tool => 
      FILE_TOOLS.includes(tool) || tool.includes('file') || tool.includes('dir')
    );
    if (hasFileTool) {
      return { requiresFileAccess: true, reason: 'Requested tool requires file access', matchedPattern: 'tool_name' };
    }
  }
  
  for (const [patternName, pattern] of Object.entries(FILE_OPERATION_KEYWORDS)) {
    if (pattern.test(text)) {
      return { requiresFileAccess: true, reason: `Message matches file operation pattern: ${patternName}`, matchedPattern: patternName };
    }
  }
  
  const pathPatterns = [
    /\/[\w.-]+\/[\w.\/-]+/,
    /[A-Za-z]:\\[\w.\-\\]+/,
    /\.\/[\w.\/-]+/,
    /~\/[\w.\/-]+/,
    /\.\w+$/
  ];
  
  for (const pattern of pathPatterns) {
    if (pattern.test(text)) {
      return { requiresFileAccess: true, reason: 'Message contains file path references', matchedPattern: 'file_path' };
    }
  }
  
  return { requiresFileAccess: false, reason: 'No file access required', matchedPattern: null };
}

function detectReasoningRequirement(message, options = {}) {
  const text = message || '';
  
  for (const [patternName, pattern] of Object.entries(REASONING_KEYWORDS)) {
    if (pattern.test(text)) {
      return {
        requiresReasoning: true,
        reason: `Message matches reasoning pattern: ${patternName}`,
        matchedPattern: patternName,
        complexity: patternName === 'CRITICAL' ? 'high' : 'medium'
      };
    }
  }
  
  if (text.length > 1000) {
    return {
      requiresReasoning: true,
      reason: 'Message length suggests complex reasoning required',
      matchedPattern: 'length',
      complexity: 'medium'
    };
  }
  
  return { requiresReasoning: false, reason: 'No explicit reasoning required', matchedPattern: null, complexity: 'low' };
}

function createDelegationResponse(message, detection) {
  return {
    delegated: true,
    targetMode: 'code',
    originalMessage: message,
    reason: detection.reason,
    matchedPattern: detection.matchedPattern,
    text: `[DELEGATED TO CODE MODE] This task requires file access and has been automatically routed to Code mode for execution.\n\nOriginal request: ${message}\n\nReason: ${detection.reason}`,
    requiresFileAccess: true
  };
}

// FreeAgent Orchestrator for Cloud Shell Cockpit
// Coordinates between Claude, Gemini (Vertex AI), and local models
// Supports vector memory and multi-session management

const path = require("path");
const fs = require("fs");

// Load dependencies
let ClaudeClient, LocalModelClient, GeminiClient;
let VectorMemory, SessionStore;

// Try to load local dependencies, fallback to inline implementations
try {
  ClaudeClient = require("./clients/claudeClient");
  LocalModelClient = require("./clients/localModelClient");
  GeminiClient = require("./clients/geminiClient");
  VectorMemory = require("./memory");
  SessionStore = require("./sessions");
} catch (e) {
  console.log("[Orchestrator] Using inline client implementations");
}

// Configuration
const config = {
  preferLocal: process.env.PREFER_LOCAL !== "false",
  localModelUrl: process.env.LOCAL_MODEL_URL || "http://localhost:3847",
  claudeApiKey: process.env.CLAUDE_API_KEY || "",
  geminiProject: process.env.GCP_PROJECT || "",
  geminiLocation: process.env.GCP_LOCATION || "us-central1",
  memoryEnabled: process.env.MEMORY_ENABLED !== "false",
  sessionEnabled: process.env.SESSION_ENABLED !== "false",
  embeddingsUrl: process.env.EMBEDDINGS_URL || "http://localhost:3847",
};

class Orchestrator {
  constructor(options = {}) {
    this.config = { ...config, ...options };
    this.clients = {};
    this.memory = null;
    this.sessions = null;
    this.initialized = false;
    
    // Capability router
    this.capabilityRouter = {
      enabled: options.capabilityRouting !== false,
      fileAccessDetection: detectFileAccessRequirement,
      reasoningDetection: detectReasoningRequirement,
      createDelegationResponse
    };
    
    // Strict fallback policy
    this.strictFallbackPolicy = STRICT_FALLBACK_POLICY;
    
    // Multi-agent collaboration
    this.collaboration = MultiAgentCollaboration;
    this.activeCollaborations = new Map();
    
    // Agent registry (capabilities and status)
    this.agentRegistry = this._initializeAgentRegistry();

    // Initialize iteration governor for safety
    this.governor = new IterationGovernor({
      simpleLimit: parseInt(process.env.ITERATION_SIMPLE_LIMIT || '10', 10),
      complexLimit: parseInt(process.env.ITERATION_COMPLEX_LIMIT || '50', 10),
      circuitBreakerThreshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5', 10),
      circuitBreakerResetTime: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIME || '60000', 10),
      warningThreshold: parseFloat(process.env.ITERATION_WARNING_THRESHOLD || '0.8'),
      onLimitWarning: (agentId, current, limit) => {
        console.warn(`[Orchestrator] Iteration warning: ${agentId} at ${current}/${limit}`);
      },
      onLimitExceeded: (agentId, current, limit) => {
        console.error(`[Orchestrator] Iteration limit exceeded: ${agentId} at ${current}/${limit}`);
      },
      onCircuitBreakerTripped: (agentId, reason) => {
        console.error(`[Orchestrator] Circuit breaker tripped: ${agentId} - ${reason}`);
      }
    });

    // Initialize context slice manager for smart context management
    this.contextManager = new ContextSliceManager({
      maxTokens: {
        claude: parseInt(process.env.MAX_TOKENS_CLAUDE || '100000', 10),
        gemini: parseInt(process.env.MAX_TOKENS_GEMINI || '32000', 10),
        local: parseInt(process.env.MAX_TOKENS_LOCAL || '8192', 10),
        default: parseInt(process.env.MAX_TOKENS_DEFAULT || '32000', 10)
      },
      defaultModel: options.defaultModel || 'claude',
      onSliceEvicted: (slice) => {
        console.log(`[ContextSlice] Evicted slice: ${slice.id}`);
      },
      onContextOptimized: (result) => {
        console.log(`[ContextSlice] Optimized: ${result.freed} tokens freed, ${result.evicted.length} slices evicted`);
      }
    });

    // runtime will be created after clients are ready
    this.runtime = null;
    
    // Track fallback warnings
    this.fallbackWarnings = [];
  }
  
  /**
   * Initialize agent capability registry
   */
  _initializeAgentRegistry() {
    const AGENT_CAPABILITIES = {
      claude: {
        name: 'Claude',
        capabilities: ['reasoning', 'code', 'analysis', 'writing', 'safety'],
        requires: ['api_key'],
        maxTokens: 200000,
        strengths: ['complex_reasoning', 'code_generation', 'safety_critical'],
        tier: 'primary'
      },
      gemini: {
        name: 'Gemini',
        capabilities: ['reasoning', 'analysis', 'fast_responses'],
        requires: ['project', 'location'],
        maxTokens: 32768,
        strengths: ['fast_processing', 'multimodal'],
        tier: 'primary'
      },
      local: {
        name: 'Local Model',
        capabilities: ['fast_responses', 'offline_capable'],
        requires: ['endpoint'],
        maxTokens: 8192,
        strengths: ['low_latency', 'privacy'],
        tier: 'secondary',
        isLocal: true
      },
      // Ollama is QUARANTINED
      ollama: {
        name: 'Ollama (QUARANTINED)',
        capabilities: [],
        requires: ['endpoint'],
        maxTokens: 4096,
        strengths: [],
        tier: 'quarantined',
        isQuarantined: true,
        quarantineReason: 'Ollama is explicitly quarantined - never silently used as fallback'
      }
    };
    
    const registry = {};
    for (const [agentId, capabilities] of Object.entries(AGENT_CAPABILITIES)) {
      registry[agentId] = {
        ...capabilities,
        status: 'offline',
        enabled: !capabilities.isQuarantined,
        health: {
          lastCheck: 0,
          consecutiveFailures: 0,
          isHealthy: false
        }
      };
    }
    
    console.log('[Orchestrator] Agent Capability Registry initialized');
    return registry;
  }
  
  /**
   * Update agent health status
   */
  updateAgentHealth(agentId, isHealthy) {
    const agent = this.agentRegistry[agentId];
    if (!agent) return;
    
    agent.health.lastCheck = Date.now();
    
    if (isHealthy) {
      agent.health.consecutiveFailures = 0;
      agent.health.isHealthy = true;
      agent.status = 'online';
    } else {
      agent.health.consecutiveFailures++;
      if (agent.health.consecutiveFailures >= 3) {
        agent.health.isHealthy = false;
        agent.status = 'degraded';
      }
    }
  }

  async initialize() {
    if (this.initialized) return;

    console.log("[Orchestrator] Initializing...");
    console.log("[Orchestrator] Config:", {
      preferLocal: this.config.preferLocal,
      memoryEnabled: this.config.memoryEnabled,
      sessionEnabled: this.config.sessionEnabled,
      localModelUrl: this.config.localModelUrl,
      hasClaudeKey: !!this.config.claudeApiKey,
      hasGeminiProject: !!this.config.geminiProject,
    });

    // Initialize clients
    if (ClaudeClient) {
      this.clients.claude = new ClaudeClient({
        apiKey: this.config.claudeApiKey,
      });
      this.updateAgentHealth('claude', true);
    }

    if (LocalModelClient) {
      this.clients.local = new LocalModelClient({
        endpoint: this.config.localModelUrl,
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
        storePath: process.env.MEMORY_DB_PATH || "./data/memory.db",
        embeddingsUrl: this.config.embeddingsUrl,
      });
      await this.memory.initialize();
    }

    // Initialize sessions
    if (this.config.sessionEnabled && SessionStore) {
      this.sessions = new SessionStore({
        storePath: process.env.SESSION_DB_PATH || "./data/sessions.db",
      });
      await this.sessions.initialize();
    }

    // Initialize context slices with system prompt
    const systemTemplate = SliceTemplates.createSystemSlice(
      "You are the FreeAgent Orchestrator, an internal AI agent inside the FreeAgent cockpit system at http://localhost:3847. CRITICAL CONTEXT RULES: 1) ALWAYS maintain conversation context - remember what was discussed earlier in THIS session. 2) The cockpit displays a real-time STATUS PANEL showing service connectivity (Claude ●, Gemini ○, Local Model ○). 3) Before claiming any service is available, check your context - do NOT assume. 4) Be honest about what is actually connected vs disconnected. 5) If you lose context mid-conversation, ask the user to repeat. SYSTEM: FreeAgent Cockpit: Web dashboard, Orchestrator: Routes requests, Vector Memory: Semantic storage, Sessions: Persistent conversation contexts, Context Slice Manager: Dynamic context optimization. Do not ask about hardware or ROS."
    );
    this.contextManager.createSlice('system', 'System Instructions', systemTemplate.content, {
      priority: 100,
      metadata: systemTemplate.metadata
    });

    // Load system slice by default
    this.contextManager.loadSlice('system');

    console.log(`[ContextSliceManager] Initialized with model: ${this.contextManager.currentModel}, max tokens: ${this.contextManager.getMaxTokens()}`);

    // Build RouterAgent wrapper around existing clients (which use .generate)
    const router = new RouterAgent({
      claude: async (task) => {
        if (!this.clients.claude) {
          return { text: "Claude not configured", agent: "none" };
        }
      // CRITICAL: Pass FULL conversation history to Claude for context retention
      // The task object contains history from session + WebSocket messages
      const messages = [
        ...(task.history || []).map(msg => ({ role: msg.role || 'user', content: msg.content })),
        { role: 'user', content: task.input }
      ];
      console.log(`[Claude] Sending ${messages.length} messages (history: ${(task.history || []).length})`);
      const system =
        "You are the FreeAgent Orchestrator, an internal AI agent inside the FreeAgent cockpit system at http://localhost:3847. CRITICAL CONTEXT RULES: 1) ALWAYS maintain conversation context - remember what was discussed earlier in THIS session. 2) The cockpit displays a real-time STATUS PANEL showing service connectivity (Claude ●, Gemini ○, Local Model ○). 3) Before claiming any service is available, check your context - do NOT assume. 4) Be honest about what is actually connected vs disconnected. 5) If you lose context mid-conversation, ask the user to repeat. SYSTEM: FreeAgent Cockpit: Web dashboard, Orchestrator: Routes requests, Vector Memory: Semantic storage, Sessions: Persistent conversation contexts. Do not ask about hardware or ROS.";
      const result = await this.clients.claude.generate(messages, system);
        return { text: result.text, agent: "claude", tokens: result.tokens };
      },
      gemini: async (task) => {
        if (!this.clients.gemini) {
          return { text: "Gemini not configured", agent: "none" };
        }
        const messages = [{ role: "user", content: task.input }];
        const system =
          "You are FreeAgent with advanced reasoning via Google Gemini. You are part of the FreeAgent cockpit system at http://localhost:3847. SYSTEM: Orchestrator routes requests, Vector Memory provides context, Sessions persist conversations. Respond in system context.";
        const result = await this.clients.gemini.generate(messages, system);
        return { text: result.text, agent: "gemini", tokens: result.tokens };
      },
      local: async (task) => {
        if (!this.clients.local) {
          return {
            text:
              "No local model available. Please configure a local model endpoint.",
            agent: "none",
          };
        }
        const messages = [{ role: "user", content: task.input }];
        const system =
          "You are FreeAgent running on local GPU. Be concise and efficient.";
        const result = await this.clients.local.generate(messages, system);
        return { text: result.text, agent: "local", tokens: result.tokens };
      },
    });

    this.runtime = new AdaptiveRuntime(router);

    this.initialized = true;
    console.log("[Orchestrator] Initialization complete");
  }

  async process(request) {
    const startTime = Date.now();
    const { message, history = [], sessionId, agent, model, tools } = request;

    await this.initialize();

    console.log(`[Orchestrator] Processing request: agent=${agent}, model=${model}, sessionId=${sessionId}`);

    // =============================================================================
    // CAPABILITY ROUTING: Check file access requirement FIRST
    // =============================================================================
    if (this.capabilityRouter && this.capabilityRouter.enabled) {
      const fileDetection = this.capabilityRouter.fileAccessDetection(message, { tools });
      
      if (fileDetection.requiresFileAccess) {
        console.log(`[Orchestrator] 🔀 Capability Routing: File access detected (${fileDetection.matchedPattern}) - delegating to Code mode`);
        
        const delegationResponse = this.capabilityRouter.createDelegationResponse(message, fileDetection);
        delegationResponse.latency = Date.now() - startTime;
        
        return delegationResponse;
      }
      
      // Check reasoning requirement
      const reasoningDetection = this.capabilityRouter.reasoningDetection(message, { tools });
      
      // Log reasoning routing
      if (reasoningDetection.requiresReasoning) {
        console.log(`[Orchestrator] 🔀 Capability Routing: Reasoning detected (${reasoningDetection.matchedPattern}, complexity: ${reasoningDetection.complexity})`);
      }
    }

    // Set model for context slice manager based on selected agent
    if (model) {
      this.contextManager.setModel(model.toLowerCase());
    } else if (agent) {
      this.contextManager.setModel(agent.toLowerCase());
    } else {
      // Default to Claude if available, otherwise use default
      this.contextManager.setModel(this.clients.claude ? 'claude' : 'default');
    }

    // Auto-optimize context before API call if needed
    const contextSummary = this.contextManager.getContextSummary();
    if (contextSummary.usagePercentage > 80) {
      console.log(`[ContextSlice] High context usage (${contextSummary.usagePercentage}%), optimizing...`);
      this.contextManager.optimizeContext();
    }

    // Load session context if sessionId provided
    let sessionHistory = [];
    let sessionContext = "";

    if (this.config.sessionEnabled && sessionId && this.sessions) {
      try {
        const session = await this.sessions.get(sessionId);
        if (session) {
          sessionHistory = await this.sessions.getHistory(sessionId, 20);
          sessionContext = `\n\nSession: "${session.name}"\n`;
          if (session.description) {
            sessionContext += `Description: ${session.description}\n`;
          }
          console.log(
            `[Orchestrator] Loaded session: ${session.name} (${session.messageCount} messages)`
          );

          // Update session slice in context manager
          const sessionTemplate = SliceTemplates.createSessionSlice(sessionHistory, {
            sessionId,
            startedAt: session.createdAt
          });
          this.contextManager.createSlice('session', 'Session Context', sessionTemplate.content, {
            priority: 80,
            metadata: sessionTemplate.metadata
          });
          this.contextManager.loadSlice('session');
        }
      } catch (error) {
        console.error("[Orchestrator] Error loading session:", error);
      }
    }

    // Merge session history with provided history
    const mergedHistory = [...sessionHistory, ...history];

    // Search memory for relevant context
    let memoryContext = "";
    if (this.config.memoryEnabled && this.memory) {
      try {
        const searchCollection = sessionId
          ? `session_${sessionId}`
          : "conversations";
        const memories = await this.memory.search(message, {
          collection: searchCollection,
          limit: 3,
          threshold: 0.5,
        });

        if (memories.length > 0) {
          memoryContext =
            "\n\nRelevant memories from past sessions:\n" +
            memories.map((m) => `- ${m.content}`).join("\n");
          console.log(
            `[Orchestrator] Found ${memories.length} relevant memories`
          );

          // Update memory slice in context manager
          const memoryTemplate = SliceTemplates.createMemorySlice(memories, {
            collection: searchCollection,
            query: message
          });
          this.contextManager.createSlice('memory', 'Relevant Memories', memoryTemplate.content, {
            priority: 20,
            metadata: memoryTemplate.metadata
          });
          this.contextManager.loadSlice('memory');
        }
      } catch (error) {
        console.error("[Orchestrator] Memory search error:", error);
      }
    }

    // Build enriched input for the runtime using context slices
    const enrichedInput =
      message +
      (sessionContext ? `\n\n${sessionContext}` : "") +
      (memoryContext ? `\n\n${memoryContext}` : "");

    // Determine task complexity based on input length and history
    const taskComplexity = this._determineTaskComplexity(message, mergedHistory);
    
    // Check iteration governor before executing
    const agentId = sessionId || 'default';
    const limitCheck = this.governor.checkLimit(agentId, taskComplexity);
    
    if (!limitCheck.allowed) {
      console.error(`[Orchestrator] Iteration limit blocked: ${limitCheck.reason}`);
      return {
        text: `Execution blocked by safety system: ${limitCheck.reason}`,
        agent: 'governor-blocked',
        iterationStatus: limitCheck.status
      };
    }
    
    // Use AdaptiveRuntime + RouterAgent with agent selection
    const { result, stress, snapshot } = await this.runtime.tick({
      id: sessionId || "task",
      input: enrichedInput,
      history: mergedHistory,
      agent: agent || model || null, // Pass agent/model selection to router
    });

    // Record iteration after successful execution
    this.governor.recordIteration(agentId, taskComplexity);
    
    // Record errors if any
    if (result.error) {
      this.governor.recordError(agentId, result.error);
    }

    console.log("[AdaptiveRuntime] Stress:", stress.score, snapshot);

    // Store interaction in session
    if (this.config.sessionEnabled && sessionId && this.sessions) {
      try {
        await this.sessions.addMessage(sessionId, {
          role: "user",
          content: message,
        });
        await this.sessions.addMessage(sessionId, {
          role: "assistant",
          content: result.text,
          agent: result.agent,
        });
      } catch (error) {
        console.error(
          "[Orchestrator] Error storing session messages:",
          error
        );
      }
    }

    // Store important interactions in memory
    if (this.config.memoryEnabled && this.memory && result.text.length > 50) {
      try {
        const memoryCollection = sessionId
          ? `session_${sessionId}`
          : "conversations";
        await this.memory.add(
          `User asked: ${message}\n\nAgent responded: ${result.text.substring(
            0,
            500
          )}`,
          {
            collection: memoryCollection,
            metadata: { agent: result.agent, sessionId: sessionId || null },
          }
        );
      } catch (error) {
        console.error("[Orchestrator] Memory store error:", error);
      }
    }

    result.latency = Date.now() - startTime;
    return result;
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
      memoryEnabled: this.config.memoryEnabled,
      // Capability routing status
      capabilityRouting: {
        enabled: this.capabilityRouter?.enabled || false,
        fileDetection: !!this.capabilityRouter?.fileAccessDetection,
        reasoningDetection: !!this.capabilityRouter?.reasoningDetection
      },
      // Strict fallback policy status
      strictFallbackPolicy: {
        enabled: true,
        silentFallbacks: false,
        ollamaQuarantined: true
      },
      // Agent registry status
      agentRegistry: Object.keys(this.agentRegistry).map(id => ({
        id,
        name: this.agentRegistry[id].name,
        status: this.agentRegistry[id].status,
        tier: this.agentRegistry[id].tier,
        isQuarantined: this.agentRegistry[id].isQuarantined || false
      })),
      // Collaboration status
      collaboration: {
        enabled: true,
        activeCollaborations: this.activeCollaborations.size
      }
    };

    try {
      if (this.clients.local) {
        health.local = await this.clients.local.healthCheck();
        this.updateAgentHealth('local', health.local);
      }
    } catch (e) {}

    try {
      if (this.clients.claude) {
        health.claude = this.clients.claude.isConfigured();
        this.updateAgentHealth('claude', health.claude);
      }
    } catch (e) {}

    try {
      if (this.clients.gemini) {
        health.gemini = await this.clients.gemini.healthCheck();
        this.updateAgentHealth('gemini', health.gemini);
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
      throw new Error("Sessions not enabled");
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

  /**
   * Determine task complexity based on input length and history
   */
  _determineTaskComplexity(message, history) {
    const messageLength = message?.length || 0;
    const historyLength = history?.length || 0;
    const totalContentLength = messageLength + (history?.reduce((sum, msg) => sum + (msg.content?.length || 0), 0) || 0);
    
    if (messageLength > 1000 || historyLength > 10 || totalContentLength > 5000) {
      return 'complex';
    }
    return 'simple';
  }

  /**
   * Get iteration governor status for an agent
   */
  getGovernorStatus(agentId) {
    return this.governor.getStatus(agentId);
  }

  /**
   * Get all iteration governor stats
   */
  getGovernorStats() {
    return this.governor.getStats();
  }

  /**
   * Reset iteration governor for an agent
   */
  resetGovernor(agentId) {
    return this.governor.reset(agentId);
  }

  /**
   * Get context slice manager summary
   */
  getContextSummary() {
    return this.contextManager.getContextSummary();
  }

  /**
   * Get active context slices
   */
  getActiveSlices() {
    return this.contextManager.getActiveSlices();
  }

  /**
   * Manually optimize context
   */
  optimizeContext(neededTokens = 0) {
    return this.contextManager.optimizeContext(neededTokens);
  }

  /**
   * Set the model for context management
   */
  setContextModel(model) {
    this.contextManager.setModel(model);
  }
  
  // =============================================================================
  // AGENT CAPABILITY REGISTRY METHODS
  // =============================================================================
  
  /**
   * Get agent capabilities from registry
   */
  getAgentCapabilities(agentId) {
    return this.agentRegistry[agentId] || null;
  }
  
  /**
   * Get all agents from registry
   */
  getAllAgents(filter = {}) {
    let agents = Object.entries(this.agentRegistry).map(([id, data]) => ({
      id,
      ...data
    }));
    
    if (filter.enabled !== undefined) {
      agents = agents.filter(a => a.enabled === filter.enabled);
    }
    if (filter.tier !== undefined) {
      agents = agents.filter(a => a.tier === filter.tier);
    }
    if (filter.status !== undefined) {
      agents = agents.filter(a => a.status === filter.status);
    }
    if (filter.quarantined !== undefined) {
      agents = agents.filter(a => a.isQuarantined === filter.quarantined);
    }
    
    return agents;
  }
  
  /**
   * Get routing options for UI
   */
  getRoutingOptions() {
    return {
      primary: this.getAllAgents({ tier: 'primary', enabled: true, status: 'online' }).map(a => a.id),
      secondary: this.getAllAgents({ tier: 'secondary', enabled: true, status: 'online' }).map(a => a.id),
      quarantined: this.getAllAgents({ quarantined: true }).map(a => ({ id: a.id, reason: a.quarantineReason })),
      strictPolicy: {
        enabled: true,
        silentFallbacks: false,
        ollamaQuarantined: true
      }
    };
  }
  
  // =============================================================================
  // CAPABILITY ROUTING METHODS
  // =============================================================================
  
  /**
   * Enable or disable capability routing
   */
  setCapabilityRouting(enabled) {
    if (this.capabilityRouter) {
      this.capabilityRouter.enabled = enabled;
      console.log(`[Orchestrator] Capability routing ${enabled ? 'enabled' : 'disabled'}`);
    }
  }
  
  /**
   * Get capability routing status
   */
  getCapabilityRoutingStatus() {
    return {
      enabled: this.capabilityRouter?.enabled || false,
      hasFileDetection: !!this.capabilityRouter?.fileAccessDetection,
      hasReasoningDetection: !!this.capabilityRouter?.reasoningDetection,
      fileOperationPatterns: Object.keys(FILE_OPERATION_KEYWORDS),
      reasoningPatterns: Object.keys(REASONING_KEYWORDS),
      fileTools: FILE_TOOLS
    };
  }
  
  /**
   * Manually check file access requirement
   */
  checkFileAccessRequirement(message, options = {}) {
    return detectFileAccessRequirement(message, options);
  }
  
  /**
   * Manually check reasoning requirement
   */
  checkReasoningRequirement(message, options = {}) {
    return detectReasoningRequirement(message, options);
  }
  
  // =============================================================================
  // MULTI-AGENT COLLABORATION METHODS
  // =============================================================================
  
  /**
   * Start a collaboration between agents
   */
  async startCollaboration(fromAgent, toAgent, task, pattern = 'handoff') {
    const request = this.collaboration.createRequest(fromAgent, toAgent, task, pattern);
    
    this.activeCollaborations.set(request.id, {
      request,
      status: 'in_progress',
      startedAt: Date.now()
    });
    
    console.log(`[Collaboration] Started: ${fromAgent} → ${toAgent} (${pattern})`);
    
    return request;
  }
  
  /**
   * Complete a collaboration
   */
  completeCollaboration(requestId, response) {
    const collab = this.activeCollaborations.get(requestId);
    if (!collab) return null;
    
    const result = this.collaboration.handleResponse(collab.request, response);
    
    collab.status = result.status;
    collab.response = result;
    collab.completedAt = Date.now();
    
    console.log(`[Collaboration] Completed: ${requestId} - ${result.status}`);
    
    return result;
  }
  
  /**
   * Get active collaborations
   */
  getActiveCollaborations() {
    return Array.from(this.activeCollaborations.entries()).map(([id, collab]) => ({
      id,
      ...collab
    }));
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

module.exports = { 
  Orchestrator, 
  getOrchestrator, 
  config,
  // Export capability routing
  detectFileAccessRequirement,
  detectReasoningRequirement,
  createDelegationResponse,
  FILE_OPERATION_KEYWORDS,
  REASONING_KEYWORDS,
  FILE_TOOLS,
  // Export strict fallback policy
  STRICT_FALLBACK_POLICY,
  // Export multi-agent collaboration
  MultiAgentCollaboration
};
