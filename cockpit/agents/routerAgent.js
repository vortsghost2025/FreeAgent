const BaseAgent = require("./baseAgent");
const { createCapabilitiesMiddleware } = require("./agentCapabilities");

// Try to load iteration governor (optional - will work without it)
let IterationGovernor;
try {
  IterationGovernor = require("../safety/iterationGovernor");
} catch (e) {
  console.log("[RouterAgent] IterationGovernor not available, skipping safety checks");
}

// Token budget limits per provider
const TOKEN_LIMITS = {
  claude: parseInt(process.env.MAX_TOKENS_CLAUDE || '200000', 10),
  gemini: parseInt(process.env.MAX_TOKENS_GEMINI || '32768', 10),
  local: parseInt(process.env.MAX_TOKENS_LOCAL || '8192', 10)
};

// Provider timeout in milliseconds
const PROVIDER_TIMEOUT = 60000;

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Truncate messages array to fit within token budget
 * Keeps most recent messages (they're most relevant)
 */
function truncateMessages(messages, maxTokens) {
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return messages;
  }

  let totalTokens = 0;
  const withTokens = messages.map(msg => {
    const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
    const tokens = estimateTokens(content);
    totalTokens += tokens;
    return { ...msg, _tokens: tokens };
  });

  if (totalTokens <= maxTokens) {
    return messages;
  }

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

  console.log(`[RouterAgent] ⚠️  Truncated ${messages.length - truncated.length} messages (${totalTokens} → ~${usedTokens} tokens, limit: ${maxTokens})`);
  return truncated;
}

/**
 * Create a provider call with its own timeout
 */
function createProviderCall(client, task, maxTokens, providerName) {
  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`${providerName} timeout after ${PROVIDER_TIMEOUT}ms`));
    }, PROVIDER_TIMEOUT);
    
    try {
      const truncatedTask = {
        ...task,
        history: truncateMessages(task.history || [], maxTokens)
      };
      const result = await client(truncatedTask);
      clearTimeout(timeout);
      resolve(result);
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

class RouterAgent extends BaseAgent {
  constructor(clients, options = {}) {
    super("router");
    this.clients = clients; // { claude, gemini, local }
    // RouterAgent already gets capabilities from BaseAgent constructor
    
    // Initialize iteration governor if available
    if (IterationGovernor) {
      this.governor = new IterationGovernor({
        simpleLimit: options.simpleLimit || 10,
        complexLimit: options.complexLimit || 50,
        circuitBreakerThreshold: options.circuitBreakerThreshold || 5,
        circuitBreakerResetTime: options.circuitBreakerResetTime || 60000
      });
    } else {
      this.governor = null;
    }
  }

  async run(task, ctx) {
    // Check iteration governor before running if available
    if (this.governor) {
      const agentId = ctx.agent || this.id;
      const taskType = ctx.taskComplexity || 'simple';
      const limitCheck = this.governor.checkLimit(agentId, taskType);
      
      if (!limitCheck.allowed) {
        console.error(`[RouterAgent] Iteration limit blocked: ${limitCheck.reason}`);
        return {
          text: `Task blocked by safety system: ${limitCheck.reason}`,
          agent: this.id,
          blocked: true,
          iterationStatus: limitCheck.status
        };
      }
    }
    
    // Use inherited capabilities middleware
    const { allowed, task: processedTask, ctx: processedCtx } = 
      this.capabilitiesMiddleware.beforeRun(task, ctx);
    
    if (!allowed) {
      return {
        text: "Task blocked by capability restrictions.",
        agent: this.id,
        capabilities: this.getCapabilitiesSummary()
      };
    }
    
    const result = await this.execute(processedTask, processedCtx);
    
    // Record iteration after execution
    if (this.governor) {
      const agentId = ctx.agent || this.id;
      const taskType = ctx.taskComplexity || 'simple';
      this.governor.recordIteration(agentId, taskType);
      
      // Record error if result indicates failure
      if (result.error) {
        this.governor.recordError(agentId, result.error);
      }
    }
    
    return this.capabilitiesMiddleware.afterRun(result);
  }

  async execute(task, ctx) {
    const stress = ctx.stress;
    const requestedAgent = ctx.agent; // Agent selected by user

    // DEBUG: Log the task structure to verify history is passed
    console.log('[RouterAgent] Task received:', {
      hasInput: !!task.input,
      hasHistory: !!task.history,
      historyLength: task.history?.length || 0,
      inputLength: task.input?.length || 0,
      requestedAgent: requestedAgent
    });

    // If a specific agent is requested, use that one
    if (requestedAgent) {
      const agentKey = requestedAgent.toLowerCase();
      console.log(`[RouterAgent] Routing to requested agent: ${agentKey}`);
      
      if (this.clients?.[agentKey]) {
        // Apply token truncation based on agent type
        const maxTokens = TOKEN_LIMITS[agentKey] || 100000;
        const truncatedTask = {
          ...task,
          history: truncateMessages(task.history || [], maxTokens)
        };
        
        try {
          return await this.clients[agentKey](truncatedTask);
        } catch (e) {
          console.error(`[RouterAgent] ${agentKey} error:`, e.message);
          // Fall through to try other agents
        }
      } else {
        console.log(`[RouterAgent] Requested agent "${agentKey}" not available, falling back`);
      }
    }

    // Try all providers in parallel using Promise.race with timeouts
    // The first successful response wins
    const providerPromises = [];
    const providerNames = [];
    
    if (this.clients?.claude) {
      providerPromises.push(createProviderCall(this.clients.claude, task, TOKEN_LIMITS.claude, 'Claude'));
      providerNames.push('claude');
    }
    
    if (this.clients?.gemini) {
      providerPromises.push(createProviderCall(this.clients.gemini, task, TOKEN_LIMITS.gemini, 'Gemini'));
      providerNames.push('gemini');
    }
    
    if (this.clients?.local) {
      providerPromises.push(createProviderCall(this.clients.local, task, TOKEN_LIMITS.local, 'Local'));
      providerNames.push('local');
    }
    
    if (providerPromises.length === 0) {
      return { 
        text: "No AI providers available. Please configure Claude, Gemini, or a local model.", 
        agent: "none" 
      };
    }
    
    // Use Promise.race to get the first successful response
    // Each provider call has its own internal timeout
    let lastError = null;
    for (let i = 0; i < providerPromises.length; i++) {
      try {
        console.log(`[RouterAgent] Trying provider: ${providerNames[i]} (${i + 1}/${providerPromises.length})`);
        const result = await providerPromises[i];
        console.log(`[RouterAgent] Success from: ${providerNames[i]}`);
        return result;
      } catch (error) {
        console.error(`[RouterAgent] ${providerNames[i]} failed:`, error.message);
        lastError = error;
        // Continue to try next provider
      }
    }
    
    // All providers failed
    return { 
      text: lastError ? `All AI providers failed: ${lastError.message}` : "All AI providers unavailable.", 
      agent: "none" 
    };
  }
}

module.exports = RouterAgent;
