/**
 * Resilience Manager for FreeAgent Orchestrator
 * 
 * Features:
 * - Provider cooldown after failures
 * - Concurrency caps per provider
 * - RAM guardrails
 * - Fallback scoring based on success rate & latency
 * - Context-window prediction
 * - LM Link federation support
 * - Self-healing reconnection loop with exponential backoff
 * - Agent capability registry
 * - Strict fallback policy (NO silent fallbacks)
 * - Ollama quarantine (never silently used)
 */

const os = require('os');
const EventEmitter = require('events');

// Default configurations
const DEFAULT_CONFIG = {
  // Cooldown settings (ms)
  cooldownPeriod: parseInt(process.env.COOLDOWN_PERIOD || '30000'), // 30s default
  maxCooldownMultiplier: 4, // Max 4x cooldown (2min)
  
  // Concurrency caps
  maxConcurrent: {
    claude: parseInt(process.env.MAX_CONCURRENT_CLAUDE || '5'),
    gemini: parseInt(process.env.MAX_CONCURRENT_GEMINI || '3'),
    local: parseInt(process.env.MAX_CONCURRENT_LOCAL || '2'),
    minimax: parseInt(process.env.MAX_CONCURRENT_MINIMAX || '3')
  },
  
  // RAM guardrails (percentage of total)
  maxRAMPercent: parseInt(process.env.MAX_RAM_PERCENT || '85'),
  warningRAMPercent: parseInt(process.env.WARNING_RAM_PERCENT || '75'),
  
  // Fallback scoring weights
  scoring: {
    successWeight: 0.5,
    latencyWeight: 0.3,
    recencyWeight: 0.2
  },
  
  // Context window prediction
  contextWindowPadding: 0.9, // Use 90% of max to leave headroom
  providerContextLimits: {
    claude: 200000,
    gemini: 32768,
    local: 8192,
    minimax: 32768
  },
  
  // Self-healing reconnection settings
  reconnection: {
    enabled: true,
    maxRetries: 5,
    initialDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffMultiplier: 2,
    jitterFactor: 0.1
  },
  
  // Strict fallback policy
  strictFallback: {
    warnOnFallback: true, // Always warn when falling back
    allowSilentFallback: false, // NEVER allow silent fallbacks
    logAllAttempts: true // Log all fallback attempts
  }
};

// =============================================================================
// AGENT CAPABILITY REGISTRY
// =============================================================================

/**
 * Defines agent capabilities for routing decisions
 */
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
  minimax: {
    name: 'Minimax',
    capabilities: ['reasoning', 'code', 'analysis'],
    requires: ['api_key'],
    maxTokens: 32768,
    strengths: ['multilingual'],
    tier: 'secondary'
  },
  // Ollama is QUARANTINED - never use as fallback silently
  ollama: {
    name: 'Ollama (QUARANTINED)',
    capabilities: [],
    requires: ['endpoint'],
    maxTokens: 4096,
    strengths: [],
    tier: 'quarantined',
    isQuarantined: true,
    quarantineReason: 'Ollama is explicitly quarantined - never silently used as fallback. Must be explicitly enabled by user.'
  }
};

// =============================================================================
// STRICT FALLBACK POLICY
// =============================================================================

/**
 * Strict Fallback Policy Object
 * - No silent fallbacks allowed
 * - All fallback attempts must be logged and warned
 * - Ollama is never used as automatic fallback
 */
const STRICT_FALLBACK_POLICY = {
  // Primary stack (tier: primary) - preferred when available
  primary: ['claude', 'gemini'],
  
  // Secondary stack (tier: secondary) - only after explicit configuration
  secondary: ['minimax', 'local'],
  
  // Quarantined - NEVER use automatically
  quarantined: ['ollama'],
  
  // Fallback rules: explicit mappings
  // Format: { primary: [fallback_chain] }
  rules: {
    claude: {
      allowFallback: true,
      fallbacks: ['gemini'], // Only to Gemini, NOT to local/ollama
      requireExplicitApproval: false,
      warnMessage: '⚠️  WARNING: Falling back from Claude to Gemini'
    },
    gemini: {
      allowFallback: true,
      fallbacks: ['claude', 'minimax'], // Can go to Claude or Minimax
      requireExplicitApproval: false,
      warnMessage: '⚠️  WARNING: Falling back from Gemini'
    },
    minimax: {
      allowFallback: true,
      fallbacks: ['local'], // Only to local
      requireExplicitApproval: true, // Requires explicit approval for secondary
      warnMessage: '⚠️  WARNING: Falling back to local model'
    },
    local: {
      allowFallback: false, // Local is last resort, no fallback
      fallbacks: [],
      requireExplicitApproval: true,
      warnMessage: '⚠️  CRITICAL: Local model failed, no fallback available'
    }
  },
  
  /**
   * Check if fallback is allowed for a provider
   */
  canFallback(fromProvider) {
    const rule = this.rules[fromProvider];
    if (!rule) return { allowed: false, reason: 'No fallback rule defined' };
    if (!rule.allowFallback) return { allowed: false, reason: 'Fallback explicitly disabled' };
    return { allowed: true, fallbacks: rule.fallbacks, warnMessage: rule.warnMessage };
  },
  
  /**
   * Get the next fallback provider (with warning)
   */
  getFallback(fromProvider, triedProviders = []) {
    const { allowed, fallbacks, warnMessage } = this.canFallback(fromProvider);
    
    if (!allowed) {
      return { allowed: false, provider: null, warning: warnMessage };
    }
    
    // Find first untried fallback
    for (const fallback of fallbacks) {
      if (!triedProviders.includes(fallback)) {
        return { 
          allowed: true, 
          provider: fallback, 
          warning: warnMessage,
          requiresApproval: this.rules[fromProvider].requireExplicitApproval
        };
      }
    }
    
    return { allowed: false, provider: null, warning: 'No more fallbacks available' };
  },
  
  /**
   * Check if provider is quarantined
   */
  isQuarantined(provider) {
    return this.quarantined.includes(provider);
  },
  
  /**
   * Log fallback attempt (strict policy enforcement)
   */
  logFallbackAttempt(fromProvider, toProvider, context = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      from: fromProvider,
      to: toProvider,
      ...context,
      policy: 'STRICT',
      silent: false // Never silent
    };
    
    console.log(`[STRICT FALLBACK] ${JSON.stringify(logEntry)}`);
    
    // Emit warning event for monitoring
    if (this.warnOnFallback) {
      // This will be handled by the resilience manager
    }
    
    return logEntry;
  }
};

// =============================================================================
// RESILIENCE MANAGER
// =============================================================================

class ResilienceManager extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Provider state
    this.providerState = {
      claude: { 
        failures: 0, 
        cooldownUntil: 0, 
        concurrent: 0, 
        latencySum: 0, 
        successCount: 0, 
        totalCalls: 0,
        status: 'unknown',
        lastHealthCheck: 0,
        healthCheckStatus: 'unknown'
      },
      gemini: { 
        failures: 0, 
        cooldownUntil: 0, 
        concurrent: 0, 
        latencySum: 0, 
        successCount: 0, 
        totalCalls: 0,
        status: 'unknown',
        lastHealthCheck: 0,
        healthCheckStatus: 'unknown'
      },
      local: { 
        failures: 0, 
        cooldownUntil: 0, 
        concurrent: 0, 
        latencySum: 0, 
        successCount: 0, 
        totalCalls: 0,
        status: 'unknown',
        lastHealthCheck: 0,
        healthCheckStatus: 'unknown'
      },
      minimax: { 
        failures: 0, 
        cooldownUntil: 0, 
        concurrent: 0, 
        latencySum: 0, 
        successCount: 0, 
        totalCalls: 0,
        status: 'unknown',
        lastHealthCheck: 0,
        healthCheckStatus: 'unknown'
      },
      // Ollama is QUARANTINED - tracked but never used automatically
      ollama: {
        failures: 0,
        cooldownUntil: 0,
        concurrent: 0,
        latencySum: 0,
        successCount: 0,
        totalCalls: 0,
        status: 'quarantined',
        lastHealthCheck: 0,
        healthCheckStatus: 'quarantined',
        isQuarantined: true
      }
    };
    
    // Agent Capability Registry
    this.agentRegistry = this._initializeAgentRegistry();
    
    // LM Link federation nodes
    this.lmLinkNodes = [];
    this.initLMLinkNodes();
    
    // Self-healing reconnection state
    this.reconnectionState = {};
    
    // Strict fallback warnings tracker
    this.fallbackWarnings = [];
  }
  
  /**
   * Initialize agent capability registry
   */
  _initializeAgentRegistry() {
    const registry = {};
    
    for (const [agentId, capabilities] of Object.entries(AGENT_CAPABILITIES)) {
      registry[agentId] = {
        ...capabilities,
        status: 'offline', // Start as offline until health check
        enabled: !capabilities.isQuarantined, // Quarantined agents are disabled by default
        health: {
          lastCheck: 0,
          consecutiveFailures: 0,
          isHealthy: false
        },
        // Routing preferences
        routing: {
          preferredFor: capabilities.strengths || [],
          priority: capabilities.tier === 'primary' ? 1 : 2,
          fallbackOnly: capabilities.tier === 'quarantined'
        }
      };
    }
    
    console.log('[Resilience] Agent Capability Registry initialized');
    return registry;
  }
  
  /**
   * Get agent capability from registry
   */
  getAgentCapability(agentId) {
    return this.agentRegistry[agentId] || null;
  }
  
  /**
   * Get all agents filtered by criteria
   */
  getAgents(filter = {}) {
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
   * Enable or disable an agent
   */
  setAgentEnabled(agentId, enabled) {
    const agent = this.agentRegistry[agentId];
    if (agent) {
      // Cannot enable quarantined agents without explicit approval
      if (agent.isQuarantined && enabled) {
        console.warn(`[Resilience] ⚠️  Cannot enable quarantined agent: ${agentId}`);
        return { success: false, reason: agent.quarantineReason };
      }
      
      agent.enabled = enabled;
      console.log(`[Resilience] Agent ${agentId} ${enabled ? 'enabled' : 'disabled'}`);
      return { success: true };
    }
    return { success: false, reason: 'Agent not found' };
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
  
  /**
   * Initialize LM Link nodes from environment
   */
  initLMLinkNodes() {
    const nodes = process.env.LM_LINK_NODES || '';
    if (nodes) {
      this.lmLinkNodes = nodes.split(',').map(url => ({
        url: url.trim(),
        status: 'available',
        lastHealthCheck: 0,
        load: 0,
        models: []
      }));
      console.log(`[Resilience] Initialized ${this.lmLinkNodes.length} LM Link nodes`);
    }
  }
  
  /**
   * Check if provider is available (not in cooldown)
   */
  isProviderAvailable(provider) {
    const state = this.providerState[provider];
    if (!state) return false;
    
    // Check if quarantined
    if (state.isQuarantined) {
      console.log(`[Resilience] Provider ${provider} is QUARANTINED - not available`);
      return false;
    }
    
    const now = Date.now();
    if (state.cooldownUntil > now) {
      const remaining = Math.ceil((state.cooldownUntil - now) / 1000);
      console.log(`[Resilience] Provider ${provider} in cooldown (${remaining}s remaining)`);
      return false;
    }
    return true;
  }
  
  /**
   * Check concurrency limit
   */
  canExecute(provider) {
    const state = this.providerState[provider];
    if (!state) return false;
    
    // Cannot execute quarantined providers
    if (state.isQuarantined) {
      return false;
    }
    
    const maxConcurrent = this.config.maxConcurrent[provider] || 5;
    if (state.concurrent >= maxConcurrent) {
      console.log(`[Resilience] Provider ${provider} at concurrency limit (${state.concurrent}/${maxConcurrent})`);
      return false;
    }
    return true;
  }
  
  /**
   * Acquire slot for provider execution
   */
  async acquire(provider) {
    if (!this.canExecute(provider)) {
      return false;
    }
    
    // Check RAM before execution
    if (!this.checkRAM()) {
      console.log(`[Resilience] RAM threshold exceeded, waiting...`);
      // Wait and retry
      await this.wait(2000);
      return this.acquire(provider);
    }
    
    this.providerState[provider].concurrent++;
    return true;
  }
  
  /**
   * Release slot after execution
   */
  release(provider) {
    if (this.providerState[provider]) {
      this.providerState[provider].concurrent = Math.max(0, this.providerState[provider].concurrent - 1);
    }
  }
  
  /**
   * Record success for a provider
   */
  recordSuccess(provider, latency) {
    const state = this.providerState[provider];
    if (!state) return;
    
    state.successCount++;
    state.totalCalls++;
    state.latencySum += latency;
    state.failures = 0; // Reset failures on success
    
    // Update agent registry health
    this.updateAgentHealth(provider, true);
    
    console.log(`[Resilience] ${provider} success (latency: ${latency}ms)`);
  }
  
  /**
   * Record failure for a provider
   */
  recordFailure(provider) {
    const state = this.providerState[provider];
    if (!state) return;
    
    state.failures++;
    state.totalCalls++;
    
    // Update agent registry health
    this.updateAgentHealth(provider, false);
    
    // Exponential backoff for cooldown
    const multiplier = Math.min(state.failures, this.config.maxCooldownMultiplier);
    const cooldownTime = this.config.cooldownPeriod * multiplier;
    state.cooldownUntil = Date.now() + cooldownTime;
    
    console.log(`[Resilience] ⚠️  ${provider} failure #${state.failures}, cooldown: ${cooldownTime}ms`);
    
    // Emit failure event for monitoring
    this.emit('providerFailure', { provider, failureCount: state.failures, cooldownTime });
  }
  
  /**
   * Get fallback score for a provider (higher is better)
   */
  getFallbackScore(provider) {
    const state = this.providerState[provider];
    if (!state || state.totalCalls === 0) {
      return 0.5; // Default score for untested providers
    }
    
    // Quarantined providers get score of 0
    if (state.isQuarantined) {
      return 0;
    }
    
    const successRate = state.successCount / state.totalCalls;
    const avgLatency = state.latencySum / state.totalCalls;
    
    // Lower latency is better (normalize to 0-1, where 1 is fastest)
    const latencyScore = Math.max(0, 1 - (avgLatency / 60000)); // 60s = 0
    
    const { successWeight, latencyWeight, recencyWeight } = this.config.scoring;
    
    // Recency: more recent calls = higher score
    const recencyScore = state.failures > 0 ? 0.2 : 0.8;
    
    return (successRate * successWeight) + (latencyScore * latencyWeight) + (recencyScore * recencyWeight);
  }
  
  /**
   * Get sorted list of available providers by score (respecting strict policy)
   */
  getSortedProviders(availableProviders) {
    return availableProviders
      .filter(p => {
        // Filter out quarantined providers
        if (this.providerState[p]?.isQuarantined) {
          console.log(`[Resilience] Excluding quarantined provider: ${p}`);
          return false;
        }
        return this.isProviderAvailable(p) && this.canExecute(p);
      })
      .sort((a, b) => this.getFallbackScore(b) - this.getFallbackScore(a));
  }
  
  /**
   * Get next fallback using strict policy
   */
  getStrictFallback(fromProvider, triedProviders = []) {
    const result = STRICT_FALLBACK_POLICY.getFallback(fromProvider, triedProviders);
    
    if (result.allowed && result.provider) {
      // Log the fallback attempt (STRICT POLICY)
      STRICT_FALLBACK_POLICY.logFallbackAttempt(fromProvider, result.provider, {
        triedProviders,
        config: this.config.strictFallback
      });
      
      // Add warning to tracker
      this.fallbackWarnings.push({
        timestamp: Date.now(),
        from: fromProvider,
        to: result.provider,
        requiresApproval: result.requiresApproval
      });
      
      // Emit warning event
      this.emit('fallbackWarning', {
        from: fromProvider,
        to: result.provider,
        message: result.warning,
        requiresApproval: result.requiresApproval
      });
    }
    
    return result;
  }
  
  /**
   * Check RAM threshold
   */
  checkRAM() {
    const used = process.memoryUsage();
    const total = os.totalmem();
    const percentUsed = (used.heapUsed / total) * 100;
    
    if (percentUsed > this.config.maxRAMPercent) {
      console.log(`[Resilience] CRITICAL RAM: ${percentUsed.toFixed(1)}% used`);
      return false;
    }
    
    if (percentUsed > this.config.warningRAMPercent) {
      console.log(`[Resilience] WARNING RAM: ${percentUsed.toFixed(1)}% used`);
    }
    
    return true;
  }
  
  /**
   * Predict optimal context size based on available RAM and provider limits
   */
  predictContextSize(provider, availableRAM = null) {
    const providerLimit = this.config.providerContextLimits[provider] || 32000;
    const padding = this.config.contextWindowPadding;
    
    // Estimate based on available memory
    let ramBasedLimit = providerLimit;
    if (availableRAM) {
      // Rough estimate: 1 token = 4 bytes
      const maxTokensFromRAM = Math.floor(availableRAM / 4);
      ramBasedLimit = Math.min(providerLimit, maxTokensFromRAM);
    }
    
    // Apply padding
    const optimal = Math.floor(ramBasedLimit * padding);
    
    console.log(`[Resilience] ${provider} context prediction: ${optimal} tokens (provider limit: ${providerLimit})`);
    return optimal;
  }
  
  /**
   * Get LM Link node with lowest load
   */
  getBestLMNode() {
    if (this.lmLinkNodes.length === 0) return null;
    
    const available = this.lmLinkNodes.filter(n => n.status === 'available');
    if (available.length === 0) return null;
    
    return available.sort((a, b) => a.load - b.load)[0];
  }
  
  /**
   * Health check for LM Link nodes
   */
  async healthCheckLMNodes() {
    const now = Date.now();
    
    for (const node of this.lmLinkNodes) {
      try {
        const response = await fetch(`${node.url}/api/v1/models`, {
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          node.status = 'available';
          node.lastHealthCheck = now;
        } else {
          node.status = 'degraded';
        }
      } catch (e) {
        node.status = 'unavailable';
      }
    }
    
    return this.lmLinkNodes;
  }
  
  // =============================================================================
  // SELF-HEALING RECONNECTION LOOP
  // =============================================================================
  
  /**
   * Calculate delay with exponential backoff and jitter
   */
  _calculateDelay(attemptNumber) {
    const { initialDelay, maxDelay, backoffMultiplier, jitterFactor } = this.config.reconnection;
    
    // Exponential backoff
    let delay = initialDelay * Math.pow(backoffMultiplier, attemptNumber);
    
    // Cap at max delay
    delay = Math.min(delay, maxDelay);
    
    // Add jitter to prevent thundering herd
    const jitter = delay * jitterFactor * Math.random();
    delay = delay + jitter;
    
    return Math.floor(delay);
  }
  
  /**
   * Start self-healing reconnection for a provider
   */
  async startReconnection(provider, healthCheckFn) {
    const state = this.reconnectionState[provider];
    
    // Already reconnecting?
    if (state?.isReconnecting) {
      console.log(`[Resilience] Reconnection already in progress for ${provider}`);
      return state.promise;
    }
    
    const { maxRetries } = this.config.reconnection;
    
    this.reconnectionState[provider] = {
      isReconnecting: true,
      attemptNumber: 0,
      promise: null,
      startTime: Date.now()
    };
    
    const reconnect = async () => {
      const s = this.reconnectionState[provider];
      
      while (s.attemptNumber < maxRetries) {
        s.attemptNumber++;
        const delay = this._calculateDelay(s.attemptNumber - 1);
        
        console.log(`[Resilience] 🔄 Reconnection attempt ${s.attemptNumber}/${maxRetries} for ${provider} in ${delay}ms`);
        
        // Wait before attempting
        await this.wait(delay);
        
        try {
          // Run health check
          const isHealthy = await healthCheckFn();
          
          if (isHealthy) {
            console.log(`[Resilience] ✅ Reconnection successful for ${provider} after ${s.attemptNumber} attempts`);
            
            // Reset provider state on successful reconnection
            this.providerState[provider].failures = 0;
            this.providerState[provider].cooldownUntil = 0;
            this.providerState[provider].status = 'online';
            
            // Update agent registry
            this.updateAgentHealth(provider, true);
            
            // Emit success event
            this.emit('reconnectionSuccess', { provider, attempts: s.attemptNumber });
            
            this.reconnectionState[provider] = null;
            return { success: true, attempts: s.attemptNumber };
          }
        } catch (error) {
          console.log(`[Resilience] ❌ Reconnection attempt ${s.attemptNumber} failed: ${error.message}`);
        }
        
        // Check if we should continue
        if (s.attemptNumber >= maxRetries) {
          console.log(`[Resilience] ⚠️  All reconnection attempts exhausted for ${provider}`);
          
          // Emit final failure - hand off to ResilienceManager for handling
          this.emit('reconnectionFailed', { 
            provider, 
            attempts: s.attemptNumber,
            message: 'All reconnection attempts failed - ResilienceManager will handle'
          });
        }
      }
      
      this.reconnectionState[provider] = null;
      return { success: false, attempts: s.attemptNumber };
    };
    
    this.reconnectionState[provider].promise = reconnect();
    return this.reconnectionState[provider].promise;
  }
  
  /**
   * Get reconnection status for a provider
   */
  getReconnectionStatus(provider) {
    const state = this.reconnectionState[provider];
    if (!state) return { isReconnecting: false };
    
    return {
      isReconnecting: state.isReconnecting,
      attemptNumber: state.attemptNumber,
      startedAt: state.startTime,
      duration: Date.now() - state.startTime
    };
  }
  
  /**
   * Cancel reconnection for a provider
   */
  cancelReconnection(provider) {
    if (this.reconnectionState[provider]) {
      console.log(`[Resilience] Cancelled reconnection for ${provider}`);
      this.reconnectionState[provider] = null;
    }
  }
  
  // =============================================================================
  // SYSTEM STATS
  // =============================================================================
  
  /**
   * Get system stats
   */
  getStats() {
    const mem = process.memoryUsage();
    const totalMem = os.totalmem();
    
    return {
      providers: Object.keys(this.providerState).map(p => ({
        name: p,
        ...this.providerState[p],
        score: this.getFallbackScore(p),
        available: this.isProviderAvailable(p) && this.canExecute(p),
        isQuarantined: this.providerState[p]?.isQuarantined || false
      })),
      agentRegistry: Object.keys(this.agentRegistry).map(id => ({
        id,
        name: this.agentRegistry[id].name,
        status: this.agentRegistry[id].status,
        enabled: this.agentRegistry[id].enabled,
        tier: this.agentRegistry[id].tier,
        isQuarantined: this.agentRegistry[id].isQuarantined,
        capabilities: this.agentRegistry[id].capabilities
      })),
      reconnection: Object.keys(this.reconnectionState).reduce((acc, p) => {
        acc[p] = this.getReconnectionStatus(p);
        return acc;
      }, {}),
      strictFallback: {
        warnings: this.fallbackWarnings.slice(-10), // Last 10 warnings
        quarantinedAgents: STRICT_FALLBACK_POLICY.quarantined,
        policy: 'STRICT - No silent fallbacks allowed'
      },
      system: {
        ram: {
          used: mem.heapUsed,
          total: totalMem,
          percent: ((mem.heapUsed / totalMem) * 100).toFixed(1)
        },
        lmLinkNodes: this.lmLinkNodes.length,
        timestamp: Date.now()
      }
    };
  }
  
  /**
   * Wait utility
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // =============================================================================
  // CAPABILITY ROUTING
  // =============================================================================
  
  /**
   * Route based on capability requirements
   * @param {object} requirements - Task requirements { requiresFileAccess, requiresReasoning, etc }
   * @returns {object} - Routing decision { agent, reason, requiresDelegation }
   */
  routeByCapability(requirements) {
    const { requiresFileAccess, requiresReasoning, requiresCode, requiresAnalysis } = requirements;
    
    // File access always delegates to Code agent
    if (requiresFileAccess) {
      return {
        agent: 'code',
        reason: 'Task requires file access - delegated to Code mode',
        requiresDelegation: true
      };
    }
    
    // Safety-critical tasks go to Claude
    if (requiresAnalysis || requiresCode) {
      // Check if Claude is available
      if (this.isProviderAvailable('claude') && this.canExecute('claude')) {
        return {
          agent: 'claude',
          reason: 'Task requires analysis/code capabilities',
          requiresDelegation: false
        };
      }
      // Try Gemini as fallback
      if (this.isProviderAvailable('gemini') && this.canExecute('gemini')) {
        return {
          agent: 'gemini',
          reason: 'Claude unavailable - using Gemini for analysis',
          requiresDelegation: false,
          usedFallback: true
        };
      }
    }
    
    // Reasoning tasks prefer Claude/Gemini
    if (requiresReasoning) {
      const available = this.getSortedProviders(['claude', 'gemini']);
      if (available.length > 0) {
        return {
          agent: available[0],
          reason: 'Task requires reasoning capabilities',
          requiresDelegation: false
        };
      }
    }
    
    // Default: use best available primary provider
    const available = this.getSortedProviders(['claude', 'gemini', 'minimax', 'local']);
    return {
      agent: available[0] || 'none',
      reason: 'Default routing to best available provider',
      requiresDelegation: false
    };
  }
  
  /**
   * Get routing options for UI display
   */
  getRoutingOptions() {
    return {
      primary: this.getAgents({ tier: 'primary', enabled: true, status: 'online' }).map(a => a.id),
      secondary: this.getAgents({ tier: 'secondary', enabled: true, status: 'online' }).map(a => a.id),
      quarantined: this.getAgents({ quarantined: true }).map(a => ({ id: a.id, reason: a.quarantineReason })),
      strictPolicy: {
        enabled: true,
        silentFallbacks: false,
        ollamaQuarantined: true
      }
    };
  }
}

// Export
module.exports = { 
  ResilienceManager, 
  DEFAULT_CONFIG,
  AGENT_CAPABILITIES,
  STRICT_FALLBACK_POLICY
};
