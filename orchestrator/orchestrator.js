// FreeAgent Orchestrator for Cloud Shell Cockpit
// Coordinates between Claude, Gemini (Vertex AI), and local models
// Supports vector memory and multi-session management
// Implements Strict Fallback and Resilience Policy Layer

const path = require('path');
const fs = require('fs');

// Load dependencies
let ClaudeClient, LocalModelClient, GeminiClient, MinimaxClient;
let VectorMemory, SessionStore;
let AdaptiveRouter;
let ResilienceManager;

// Try to load local dependencies, fallback to inline implementations
try {
  ClaudeClient = require('./clients/claudeClient');
  LocalModelClient = require('./clients/localModelClient');
  GeminiClient = require('./clients/geminiClient');
  try {
    MinimaxClient = require('../clients/minimaxClient');
    console.log('[Orchestrator] MinimaxClient loaded successfully');
  } catch (e) {
    console.log('[Orchestrator] MinimaxClient not available:', e.message);
  }
  VectorMemory = require('./memory');
  SessionStore = require('./sessions');
  const ar = require('./adaptiveRouter');
  AdaptiveRouter = ar.AdaptiveRouter;
  console.log('[Orchestrator] AdaptiveRouter loaded:', !!AdaptiveRouter);
  
  // Load resilience manager
  try {
    const rm = require('./resilienceManager');
    ResilienceManager = rm.ResilienceManager;
    console.log('[Orchestrator] ResilienceManager loaded');
  } catch (e) {
    console.log('[Orchestrator] ResilienceManager not available:', e.message);
  }
} catch (e) {
  console.log('[Orchestrator] Failed to load AdaptiveRouter:', e.message);
  AdaptiveRouter = null;
}

// Configuration
const config = {
  preferLocal: process.env.PREFER_LOCAL !== 'false',
  localModelUrl: process.env.LOCAL_MODEL_URL || 'http://localhost:3847',
  claudeApiKey: process.env.CLAUDE_API_KEY || '',
  geminiProject: process.env.GCP_PROJECT || '',
  geminiLocation: process.env.GCP_LOCATION || 'us-central1',
  minimaxApiKey: process.env.MINIMAX_API_KEY || '',
  minimaxBaseURL: process.env.MINIMAX_BASE_URL || 'https://api.minimax.io/v1',
  minimaxModel: process.env.MINIMAX_MODEL || 'MiniMax-M2.5',
  memoryEnabled: process.env.MEMORY_ENABLED !== 'false',
  sessionEnabled: process.env.SESSION_ENABLED !== 'false',
  embeddingsUrl: process.env.EMBEDDINGS_URL || 'http://localhost:3847',
  // Token limits per provider (safety guardrails)
  maxTokens: {
    claude: parseInt(process.env.MAX_TOKENS_CLAUDE || '200000', 10),
    gemini: parseInt(process.env.MAX_TOKENS_GEMINI || '32768', 10),
    local: parseInt(process.env.MAX_TOKENS_LOCAL || '8192', 10),
    minimax: parseInt(process.env.MAX_TOKENS_MINIMAX || '32768', 10)
  }
};

// =============================================================================
// STRICT FALLBACK POLICY OBJECT (for orchestrator use)
// =============================================================================

/**
 * Strict Fallback Policy Object for Orchestrator
 * - Integrates with ResilienceManager's STRICT_FALLBACK_POLICY
 * - Provides additional orchestration-level fallback rules
 */
const StrictFallbackPolicy = {
  // Primary stack offline handling
  onPrimaryOffline: function(provider, error) {
    console.log(`[Orchestrator] ⚠️  WARNING: Primary provider ${provider} is offline`);
    console.log(`[Orchestrator]   Error: ${error?.message || 'Unknown error'}`);
    console.log(`[Orchestrator]   Policy: Primary stack offline → WARN ONLY, NO automatic fallback`);
    
    // Return warning but NO automatic fallback
    return {
      action: 'warn',
      provider: provider,
      message: `Primary provider ${provider} is offline. Waiting for reconnection...`,
      automaticFallback: false,
      requiresManualIntervention: true
    };
  },
  
  // Reconnection failed handling
  onReconnectionFailed: function(provider, attempts) {
    console.log(`[Orchestrator] 🔴 CRITICAL: Reconnection failed for ${provider} after ${attempts} attempts`);
    console.log(`[Orchestrator]   Handing off to ResilienceManager for handling`);
    
    return {
      action: 'hand_off',
      provider: provider,
      message: `Reconnection failed - ResilienceManager will handle`,
      attempts: attempts
    };
  },
  
  // Get fallback chain respecting strict policy
  getFallbackChain: function(fromProvider) {
    const { STRICT_FALLBACK_POLICY } = require('./resilienceManager');
    return STRICT_FALLBACK_POLICY.getFallback(fromProvider);
  },
  
  // Validate if fallback is allowed
  validateFallback: function(fromProvider, toProvider) {
    const { STRICT_FALLBACK_POLICY } = require('./resilienceManager');
    
    // Check if target is quarantined
    if (STRICT_FALLBACK_POLICY.isQuarantined(toProvider)) {
      return {
        allowed: false,
        reason: `Provider ${toProvider} is QUARANTINED - cannot use as fallback`,
        isQuarantined: true
      };
    }
    
    // Check if fallback rule exists
    const rule = STRICT_FALLBACK_POLICY.rules[fromProvider];
    if (!rule) {
      return {
        allowed: false,
        reason: `No fallback rule defined for ${fromProvider}`
      };
    }
    
    if (!rule.allowFallback) {
      return {
        allowed: false,
        reason: `Fallback explicitly disabled for ${fromProvider}`
      };
    }
    
    // Check if target is in allowed fallbacks
    if (!rule.fallbacks.includes(toProvider)) {
      return {
        allowed: false,
        reason: `Provider ${toProvider} is not an allowed fallback for ${fromProvider}`
      };
    }
    
    return {
      allowed: true,
      warnMessage: rule.warnMessage,
      requiresApproval: rule.requireExplicitApproval
    };
  }
};

// =============================================================================
// MULTI-AGENT COLLABORATION PROTOCOL
// =============================================================================

/**
 * Multi-Agent Collaboration Protocol
 * Defines how agents communicate, delegate tasks, and propagate errors
 */
const MultiAgentCollaboration = {
  // Event types for agent communication
  Events: {
    TASK_DELEGATED: 'task:delegated',
    TASK_COMPLETED: 'task:completed',
    TASK_FAILED: 'task:failed',
    AGENT_ONLINE: 'agent:online',
    AGENT_OFFLINE: 'agent:offline',
    COLLABORATION_REQUEST: 'collaboration:request',
    COLLABORATION_RESPONSE: 'collaboration:response'
  },
  
  // Collaboration patterns
  Patterns: {
    // Sequential delegation: Agent A -> Agent B -> Agent C
    SEQUENTIAL: 'sequential',
    
    // Parallel execution: Agent A + Agent B work simultaneously
    PARALLEL: 'parallel',
    
    // Consultation: Agent A asks Agent B for opinion
    CONSULTATION: 'consultation',
    
    // Handoff: Complete transfer of control
    HANDOFF: 'handoff'
  },
  
  /**
   * Create a collaboration request
   */
  createRequest: function(fromAgent, toAgent, task, pattern = 'handoff') {
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
  
  /**
   * Handle collaboration response
   */
  handleResponse: function(request, response) {
    return {
      requestId: request.id,
      from: request.to,
      to: request.from,
      response: response,
      timestamp: new Date().toISOString(),
      status: response.error ? 'failed' : 'completed'
    };
  },
  
  /**
   * Propagate error across collaboration chain
   */
  propagateError: function(error, collaborationChain) {
    console.log(`[Collaboration] 🔴 Propagating error across ${collaborationChain.length} agents`);
    
    const errors = [];
    for (const agent of collaborationChain) {
      errors.push({
        agent: agent,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    return errors;
  }
};

// =============================================================================
// CAPABILITY ROUTING: Automatic delegation for file operations
// =============================================================================

// Keywords that indicate file operations require Code mode
const FILE_OPERATION_KEYWORDS = {
  // File reading/writing
  READ: /read\s*(file|dir|folder|content)|show\s*(me\s*)?(file|content)|view\s*(file|content)|display\s*(file|content)|cat\s+|<\s*file|get\s+file/i,
  WRITE: /write\s*(file|to\s*file)|create\s*(file|directory|folder)|save\s*(to\s*)?(file|disk)|edit\s*(file|content)|modify\s*(file|content)|update\s*(file|content)|make\s*(file|directory)/i,
  DELETE: /delete|remove|erase|rm\s+(-[rf]?\s*)?/i,
  LIST: /(list|show)\s*(all\s*)?(files?|dir|directory|folder|contents?)|ls\s+|dir\s+|get\s+(files?|listing)/i,
  SEARCH: /(search|find|look|grep)\s*(for|in|file|dir|pattern)?|locate\s+|where\s*is/i,
  
  // File path operations
  PATH: /(file|directory|folder)\s*(path|location|name)|resolve\s*(path|file)|absolute\s*(path|file)|realpath/i,
  WORKSPACE: /workspace|project\s*(root|dir)|root\s*(dir|folder)|initialize\s*(workspace|project)/i,
  
  // Command execution (file-related)
  EXECUTE: /run\s*(command|script|cmd|build|npm|node)?|execute\s*(command|script)|shell\s*(command)|bash\s+|cmd\s+|powershell\s+|build\s*script|start\s*(server|app)/i,
  
  // Code operations
  CODE: /code\s*(file|operation)|program\s*(file)|source\s*(file)|\.\w+$/i
};

// Keywords that indicate reasoning capabilities
const REASONING_KEYWORDS = {
  ANALYZE: /analyze|analysis|examine|investigate/i,
  REASON: /reason|reasoning|logic|deduce|infer/i,
  PLAN: /plan|strategy|design|architecture|approach/i,
  COMPARE: /compare|contrast|versus|vs|difference/i,
  EVALUATE: /evaluate|assess|judge|review|audit/i,
  CRITICAL: /critical|crucial|safety|security|verify/i
};

// Tool names that require file access
const FILE_TOOLS = [
  'read_file', 'write_file', 'write_files', 'write_to_file',
  'list_files', 'search_files', 'search_and_replace',
  'execute_command', 'delete_file',
  'create_directory', 'copy_file', 'move_file'
];

/**
 * Detect if a task/message requires file access
 * @param {string} message - The user message or task
 * @param {object} options - Additional options (tools, etc.)
 * @returns {object} - { requiresFileAccess: boolean, reason: string, matchedPattern: string }
 */
function detectFileAccessRequirement(message, options = {}) {
  const text = message || '';
  
  // Check if specific tools are requested
  if (options.tools && Array.isArray(options.tools)) {
    const hasFileTool = options.tools.some(tool => 
      FILE_TOOLS.includes(tool) || tool.includes('file') || tool.includes('dir')
    );
    if (hasFileTool) {
      return { 
        requiresFileAccess: true, 
        reason: 'Requested tool requires file access', 
        matchedPattern: 'tool_name' 
      };
    }
  }
  
  // Check against keyword patterns
  for (const [patternName, pattern] of Object.entries(FILE_OPERATION_KEYWORDS)) {
    if (pattern.test(text)) {
      return { 
        requiresFileAccess: true, 
        reason: `Message matches file operation pattern: ${patternName}`,
        matchedPattern: patternName
      };
    }
  }
  
  // Check for file paths in the message
  const pathPatterns = [
    /\/[\w.-]+\/[\w.\/-]+/,  // Unix paths
    /[A-Za-z]:\\[\w.\-\\]+/, // Windows paths
    /\.\/[\w.\/-]+/,          // Relative paths
    /~\/[\w.\/-]+/,            // Home directory paths
    /\.\w+$/                   // File extensions
  ];
  
  for (const pattern of pathPatterns) {
    if (pattern.test(text)) {
      return { 
        requiresFileAccess: true, 
        reason: 'Message contains file path references',
        matchedPattern: 'file_path'
      };
    }
  }
  
  return { requiresFileAccess: false, reason: 'No file access required', matchedPattern: null };
}

/**
 * Detect if a task requires reasoning capabilities
 */
function detectReasoningRequirement(message, options = {}) {
  const text = message || '';
  
  // Check explicit reasoning indicators
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
  
  // Check message length as proxy for complexity
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

/**
 * Create a delegation response for Code mode
 * @param {string} message - Original message
 * @param {object} detection - Detection result
 * @returns {object} - Delegation response
 */
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

/**
 * Truncate messages array to fit within token budget
 * Keeps most recent messages (they're most relevant)
 */
function truncateMessages(messages, maxTokens) {
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return messages;
  }

  // Calculate total tokens in messages
  let totalTokens = 0;
  const withTokens = messages.map(msg => {
    const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
    const tokens = estimateTokens(content);
    totalTokens += tokens;
    return { ...msg, _tokens: tokens };
  });

  // If within budget, return as-is
  if (totalTokens <= maxTokens) {
    return messages;
  }

  // Truncate from oldest messages, keeping most recent
  const truncated = [];
  let usedTokens = 0;
  
  for (let i = withTokens.length - 1; i >= 0; i--) {
    if (usedTokens + withTokens[i]._tokens <= maxTokens) {
      truncated.unshift(messages[i]);
      usedTokens += withTokens[i]._tokens;
    } else {
      break;
    }
  }

  console.log(`[Orchestrator] ⚠️  Truncated ${messages.length - truncated.length} messages from history (${totalTokens} → ~${usedTokens} tokens, limit: ${maxTokens})`);
  return truncated;
}

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

class Orchestrator {
  constructor(options = {}) {
    this.config = { ...config, ...options };
    this.clients = {};
    this.memory = null;
    this.sessions = null;
    this.initialized = false;
    this.adaptiveRouter = null;
    this.maxRetries = options.maxRetries || 2;
    
    // Capability router for automatic mode delegation
    this.capabilityRouter = {
      enabled: options.capabilityRouting !== false,
      fileAccessDetection: detectFileAccessRequirement,
      reasoningDetection: detectReasoningRequirement,
      createDelegationResponse
    };
    
    // Strict fallback policy
    this.strictFallbackPolicy = StrictFallbackPolicy;
    
    // Multi-agent collaboration
    this.collaboration = MultiAgentCollaboration;
    this.activeCollaborations = new Map();
    
    // Initialize resilience manager
    this.resilience = null;
    if (ResilienceManager) {
      this.resilience = new ResilienceManager({
        maxConcurrent: {
          claude: options.maxConcurrentClaude || 5,
          gemini: options.maxConcurrentGemini || 3,
          local: options.maxConcurrentLocal || 2,
          minimax: options.maxConcurrentMinimax || 3
        }
      });
      console.log('[Orchestrator] Resilience manager initialized');
      
      // Set up resilience event listeners
      this._setupResilienceListeners();
    }
  }
  
  /**
   * Set up resilience event listeners
   */
  _setupResilienceListeners() {
    if (!this.resilience) return;
    
    // Listen for provider failures
    this.resilience.on('providerFailure', (data) => {
      console.log(`[Orchestrator] 📡 Provider failure detected: ${data.provider}`);
      
      // Apply strict policy: warn only, NO automatic fallback
      const warning = this.strictFallbackPolicy.onPrimaryOffline(data.provider, {
        message: `Failure #${data.failureCount}, cooldown: ${data.cooldownTime}ms`
      });
      
      // Log warning
      console.log(`[Orchestrator] ⚠️  ${warning.message}`);
    });
    
    // Listen for fallback warnings
    this.resilience.on('fallbackWarning', (data) => {
      console.log(`[Orchestrator] 🔄 FALLBACK: ${data.from} → ${data.to}`);
      console.log(`[Orchestrator]   ${data.message}`);
      if (data.requiresApproval) {
        console.log(`[Orchestrator]   ⚠️  Requires explicit approval!`);
      }
    });
    
    // Listen for reconnection success
    this.resilience.on('reconnectionSuccess', (data) => {
      console.log(`[Orchestrator] ✅ Provider ${data.provider} reconnected after ${data.attempts} attempts`);
    });
    
    // Listen for reconnection failure
    this.resilience.on('reconnectionFailed', (data) => {
      const result = this.strictFallbackPolicy.onReconnectionFailed(data.provider, data.attempts);
      console.log(`[Orchestrator] 🔴 ${result.message}`);
    });
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

    // Initialize Minimax client
    if (MinimaxClient && this.config.minimaxApiKey) {
      this.clients.minimax = new MinimaxClient({
        apiKey: this.config.minimaxApiKey,
        baseURL: this.config.minimaxBaseURL,
        defaultModel: this.config.minimaxModel
      });
      console.log('[Orchestrator] Minimax client initialized with model:', this.config.minimaxModel);
    } else if (MinimaxClient) {
      console.log('[Orchestrator] Minimax API key not configured - minimax unavailable');
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
    
    // Initialize adaptive router
    if (AdaptiveRouter) {
      this.adaptiveRouter = new AdaptiveRouter({
        persistPath: process.env.ROUTER_MEMORY_PATH || './data/router_memory.json',
        agents: Object.keys(this.clients)
      });
      console.log('[Orchestrator] Adaptive router initialized');
    }
    
    // Update agent registry with initialized clients
    if (this.resilience) {
      // Mark all configured clients as potentially online
      for (const [agentId, client] of Object.entries(this.clients)) {
        if (client) {
          this.resilience.updateAgentHealth(agentId, true);
        }
      }
      
      console.log('[Orchestrator] Agent registry updated with initialized clients');
    }
    
    console.log('[Orchestrator] Initialization complete');
  }

  async process(request) {
    const startTime = Date.now();
    const { message, history = [], sessionId, tools } = request;

    await this.initialize();

    // =============================================================================
    // CAPABILITY ROUTING: Check if task requires file access FIRST
    // If so, automatically delegate to Code mode
    // =============================================================================
    if (this.capabilityRouter && this.capabilityRouter.enabled) {
      // Check file access requirement
      const fileAccessDetection = this.capabilityRouter.fileAccessDetection;
      const detection = fileAccessDetection(message, { tools });
      
      if (detection.requiresFileAccess) {
        console.log(`[Orchestrator] 🔀 Capability Routing: File access detected (${detection.matchedPattern}) - delegating to Code mode`);
        
        const delegationResponse = this.capabilityRouter.createDelegationResponse(message, detection);
        delegationResponse.latency = Date.now() - startTime;
        
        // Log the delegation for learning
        if (this.adaptiveRouter) {
          this.adaptiveRouter.recordResult('code', {
            success: true,
            taskType: 'FILE_ACCESS',
            latency: delegationResponse.latency
          });
        }
        
        return delegationResponse;
      }
      
      // Check reasoning requirement
      const reasoningDetection = this.capabilityRouter.reasoningDetection(message, { tools });
      
      // Route to appropriate agent based on capabilities
      if (this.resilience) {
        const routingDecision = this.resilience.routeByCapability({
          requiresFileAccess: false,
          requiresReasoning: reasoningDetection.requiresReasoning,
          requiresAnalysis: reasoningDetection.matchedPattern === 'ANALYZE' || reasoningDetection.matchedPattern === 'CRITICAL',
          requiresCode: false
        });
        
        if (routingDecision.requiresDelegation) {
          console.log(`[Orchestrator] 🔀 Capability Routing: ${routingDecision.reason}`);
          
          const delegationResponse = {
            delegated: true,
            targetMode: routingDecision.agent,
            reason: routingDecision.reason,
            latency: Date.now() - startTime
          };
          
          return delegationResponse;
        }
        
        // Store routing decision for later use
        request._routingDecision = routingDecision;
      }
    }

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

    // Use adaptive routing with learning-based failover
    const routingDecision = this.adaptiveRouter 
      ? this.adaptiveRouter.route({ message }, { 
          availableAgents: Object.keys(this.clients).filter(k => this.clients[k])
        })
      : this.analyzeRouting(message, mergedHistory);
    
    // Use capability-based routing if available
    const finalRouting = request._routingDecision || routingDecision;
    
    console.log(`[Orchestrator] Routing decision: ${finalRouting.agent} (confidence: ${finalRouting.confidence || 'n/a'}, reason: ${finalRouting.reason || 'default'})`);

    // Execute with strict failover (no silent fallbacks)
    let result = await this.executeWithStrictFailover(finalRouting, message, mergedHistory, memoryContext, sessionContext);

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

    // Use minimax if API key is configured
    if (this.config.minimaxApiKey) {
      return { agent: 'minimax', reason: 'minimax available' };
    }

    // Default based on preference
    return {
      agent: this.config.preferLocal ? 'local' : 'claude',
      reason: this.config.preferLocal ? 'default to local' : 'default to claude'
    };
  }

  async callClaude(message, history, memoryContext = '', sessionContext = '') {
    // Apply token budget truncation before sending
    const maxTokens = this.config.maxTokens?.claude || 200000;
    const truncatedHistory = truncateMessages(history, maxTokens);
    
    const messages = [...truncatedHistory, { role: 'user', content: message }];
    const system = `You are the FreeAgent Orchestrator. You coordinate between local GPU models and Claude API to help users build and operate their AI system. Be concise and clear.${sessionContext}${memoryContext}`;

    try {
      if (this.clients.claude) {
        // Acquire resilience slot
        if (this.resilience) {
          await this.resilience.acquire('claude');
        }
        
        const result = await this.clients.claude.generate(messages, system);
        
        // Record success
        if (this.resilience) {
          this.resilience.release('claude');
          this.resilience.recordSuccess('claude', result.latency || 0);
        }
        
        return { text: result.text, agent: 'claude', tokens: result.tokens };
      }
    } catch (error) {
      console.error('[Orchestrator] Claude error:', error.message);
      
      // Record failure
      if (this.resilience) {
        this.resilience.release('claude');
        this.resilience.recordFailure('claude');
      }
      
      throw error;
    }

    // Fallback to local - STRICT POLICY: NO silent fallback
    console.log(`[Orchestrator] ⚠️  Claude unavailable - attempting fallback`);
    return this.callLocal(message, history, memoryContext, sessionContext);
  }

  async callLocal(message, history, memoryContext = '', sessionContext = '') {
    // Apply token budget truncation before sending
    const maxTokens = this.config.maxTokens?.local || 8192;
    const truncatedHistory = truncateMessages(history, maxTokens);
    
    const messages = [...truncatedHistory, { role: 'user', content: message }];
    const system = `You are FreeAgent, a helpful AI assistant running on local GPU. Be concise and efficient.${sessionContext}${memoryContext}`;

    try {
      if (this.clients.local) {
        // Acquire resilience slot
        if (this.resilience) {
          await this.resilience.acquire('local');
        }
        
        const result = await this.clients.local.generate(messages, system);
        
        // Record success
        if (this.resilience) {
          this.resilience.release('local');
          this.resilience.recordSuccess('local', result.latency || 0);
        }
        
        return { text: result.text, agent: 'local', tokens: result.tokens };
      }
    } catch (error) {
      console.error('[Orchestrator] Local model error:', error.message);
      
      // Record failure
      if (this.resilience) {
        this.resilience.release('local');
        this.resilience.recordFailure('local');
      }
      
      throw error;
    }

    return { text: 'No AI provider available. Please configure Claude API key or local model.', agent: 'none' };
  }

  async callGemini(message, history, memoryContext = '', sessionContext = '') {
    // Apply token budget truncation before sending
    const maxTokens = this.config.maxTokens?.gemini || 32768;
    const truncatedHistory = truncateMessages(history, maxTokens);
    
    const messages = [...truncatedHistory, { role: 'user', content: message }];
    const system = `You are FreeAgent with advanced reasoning capabilities. Be thorough and analytical.${sessionContext}${memoryContext}`;

    try {
      if (this.clients.gemini) {
        // Acquire resilience slot
        if (this.resilience) {
          await this.resilience.acquire('gemini');
        }
        
        const result = await this.clients.gemini.generate(messages, system);
        
        // Record success
        if (this.resilience) {
          this.resilience.release('gemini');
          this.resilience.recordSuccess('gemini', result.latency || 0);
        }
        
        return { text: result.text, agent: 'gemini', tokens: result.tokens };
      }
    } catch (error) {
      console.error('[Orchestrator] Gemini error:', error.message);
      
      // Record failure
      if (this.resilience) {
        this.resilience.release('gemini');
        this.resilience.recordFailure('gemini');
      }
      
      throw error;
    }

    // Fallback to Claude - STRICT POLICY: warn and continue
    console.log(`[Orchestrator] ⚠️  Gemini failed - attempting Claude fallback`);
    return this.callClaude(message, history, memoryContext, sessionContext);
  }

  async callMinimax(message, history, memoryContext = '', sessionContext = '') {
    // Apply token budget truncation before sending
    const maxTokens = this.config.maxTokens?.minimax || 32768;
    const truncatedHistory = truncateMessages(history, maxTokens);
    
    const messages = [...truncatedHistory, { role: 'user', content: message }];
    const system = `You are FreeAgent, an AI assistant. Be helpful and concise.${sessionContext}${memoryContext}`;

    try {
      if (this.clients.minimax) {
        // Acquire resilience slot
        if (this.resilience) {
          await this.resilience.acquire('minimax');
        }
        
        const result = await this.clients.minimax.generate(messages, system);
        
        // Record success
        if (this.resilience) {
          this.resilience.release('minimax');
          this.resilience.recordSuccess('minimax', result.latency || 0);
        }
        
        return { text: result.text, agent: 'minimax', tokens: result.tokens };
      }
    } catch (error) {
      console.error('[Orchestrator] Minimax error:', error.message);
      
      // Record failure
      if (this.resilience) {
        this.resilience.release('minimax');
        this.resilience.recordFailure('minimax');
      }
      
      throw error;
    }

    // Fallback to local
    console.log(`[Orchestrator] ⚠️  Minimax failed - attempting local fallback`);
    return this.callLocal(message, history, memoryContext, sessionContext);
  }

  // Execute agent call with STRICT failover (no silent fallbacks)
  async executeWithStrictFailover(routingDecision, message, history, memoryContext = '', sessionContext = '') {
    const agent = routingDecision.agent;
    const maxRetries = this.maxRetries;
    let lastError = null;
    let usedFallback = false;
    const triedAgents = [agent];

    // Call the appropriate agent
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        let result;
        const agentToUse = attempt === 0 ? agent : routingDecision.fallbackAgent;
        
        switch (agentToUse) {
          case 'claude':
            result = await this.callClaude(message, history, memoryContext, sessionContext);
            break;
          case 'gemini':
            result = await this.callGemini(message, history, memoryContext, sessionContext);
            break;
          case 'minimax':
            result = await this.callMinimax(message, history, memoryContext, sessionContext);
            break;
          case 'local':
          default:
            result = await this.callLocal(message, history, memoryContext, sessionContext);
        }

        // Record success
        if (this.adaptiveRouter) {
          this.adaptiveRouter.recordResult(agentToUse, {
            success: true,
            latency: result.latency || 0,
            taskType: routingDecision.taskType
          });
        }

        result.usedFallback = usedFallback;
        result.routingConfidence = routingDecision.confidence;
        
        if (usedFallback) {
          console.log(`[Orchestrator] ✅ Request completed with fallback: ${triedAgents.join(' → ')}`);
        }
        
        return result;

      } catch (error) {
        lastError = error;
        console.error(`[Orchestrator] ❌ Agent ${agentToUse} failed (attempt ${attempt + 1}):`, error.message);

        // Record failure
        if (this.adaptiveRouter) {
          this.adaptiveRouter.recordResult(agentToUse, {
            success: false,
            error: error,
            latency: 0,
            taskType: routingDecision.taskType
          });
        }

        // Get strict fallback (respects quarantined agents, warns on fallback)
        if (attempt < maxRetries && this.resilience) {
          const fallback = this.resilience.getStrictFallback(agentToUse, triedAgents);
          
          if (fallback.allowed && fallback.provider) {
            routingDecision.fallbackAgent = fallback.provider;
            triedAgents.push(fallback.provider);
            usedFallback = true;
            
            console.log(`[Orchestrator] 🔄 STRICT FALLBACK: ${agentToUse} → ${fallback.provider}`);
            console.log(`[Orchestrator]   ${fallback.warning}`);
            
            if (fallback.requiresApproval) {
              console.log(`[Orchestrator]   ⚠️  Fallback requires explicit user approval!`);
            }
          } else {
            console.log(`[Orchestrator]   ⚠️  No fallback available: ${fallback.warning}`);
          }
        } else if (attempt < maxRetries) {
          // Try next available provider
          const available = this.resilience?.getSortedProviders(['claude', 'gemini', 'minimax', 'local'])
            .filter(p => !triedAgents.includes(p));
          
          if (available && available.length > 0) {
            routingDecision.fallbackAgent = available[0];
            triedAgents.push(available[0]);
            usedFallback = true;
            console.log(`[Orchestrator] 🔄 Falling back to ${available[0]}`);
          }
        }
      }
    }

    // All agents failed
    console.log(`[Orchestrator] 🔴 CRITICAL: All agents failed. Tried: ${triedAgents.join(' → ')}`);
    
    return { 
      text: `All agents failed. Last error: ${lastError?.message || 'Unknown error'}`,
      agent: 'none',
      success: false,
      error: lastError?.message,
      triedAgents: triedAgents
    };
  }

  // Get adaptive router statistics
  getRouterStats() {
    if (!this.adaptiveRouter) {
      return { error: 'Adaptive router not initialized' };
    }
    return this.adaptiveRouter.getStats();
  }

  async healthCheck() {
    const health = {
      local: false,
      claude: false,
      gemini: false,
      minimax: false,
      memory: false,
      sessions: false,
      toolsEnabled: false,
      sessionEnabled: this.config.sessionEnabled,
      memoryEnabled: this.config.memoryEnabled,
      adaptiveRouter: !!this.adaptiveRouter,
      resilience: this.resilience ? this.resilience.getStats() : null,
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
      // Multi-agent collaboration status
      collaboration: {
        enabled: true,
        activeCollaborations: this.activeCollaborations.size
      }
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
      if (this.clients.minimax) {
        health.minimax = this.clients.minimax.isConfigured();
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

  // =============================================================================
  // CAPABILITY ROUTING: Manage automatic file operation delegation
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
   * Manually check if a message would trigger file delegation
   * Useful for testing or preview
   */
  checkFileAccessRequirement(message, options = {}) {
    return detectFileAccessRequirement(message, options);
  }
  
  /**
   * Manually check if a message would trigger reasoning routing
   */
  checkReasoningRequirement(message, options = {}) {
    return detectReasoningRequirement(message, options);
  }
  
  // =============================================================================
  // AGENT CAPABILITY REGISTRY
  // =============================================================================
  
  /**
   * Get agent capabilities from registry
   */
  getAgentCapabilities(agentId) {
    if (!this.resilience) return null;
    return this.resilience.getAgentCapability(agentId);
  }
  
  /**
   * Get all agents from registry
   */
  getAllAgents(filter = {}) {
    if (!this.resilience) return [];
    return this.resilience.getAgents(filter);
  }
  
  /**
   * Enable or disable an agent
   */
  setAgentEnabled(agentId, enabled) {
    if (!this.resilience) return { success: false, reason: 'Resilience not initialized' };
    return this.resilience.setAgentEnabled(agentId, enabled);
  }
  
  /**
   * Get routing options for UI
   */
  getRoutingOptions() {
    if (!this.resilience) return null;
    return this.resilience.getRoutingOptions();
  }
  
  // =============================================================================
  // MULTI-AGENT COLLABORATION
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

  // Legacy fallback method - now uses strict policy
  async executeWithFailover(routingDecision, message, history, memoryContext = '', sessionContext = '') {
    return this.executeWithStrictFailover(routingDecision, message, history, memoryContext, sessionContext);
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
  // Export capability routing utilities
  detectFileAccessRequirement,
  detectReasoningRequirement,
  createDelegationResponse,
  FILE_OPERATION_KEYWORDS,
  REASONING_KEYWORDS,
  FILE_TOOLS,
  // Export strict fallback policy
  StrictFallbackPolicy,
  // Export multi-agent collaboration
  MultiAgentCollaboration
};
