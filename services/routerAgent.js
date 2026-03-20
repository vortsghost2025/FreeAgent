/**
 * Router Agent - Provider Routing with Resilience Integration
 * 
 * Subscribes to freeagent:tasks and routes to appropriate providers
 * based on resilience manager scoring and fallback logic.
 * 
 * Usage:
 *   node services/routerAgent.js
 */

const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

// Redis config
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const STREAMS = {
  TASKS: 'freeagent:tasks',
  RESULTS: 'freeagent:results',
  EVENTS: 'freeagent:events'
};
const GROUP = 'router-group';

// Provider endpoints
const PROVIDERS = {
  claude: {
    name: 'Claude',
    endpoint: process.env.CLAUDE_ENDPOINT || 'https://api.anthropic.com/v1/messages',
    apiKey: process.env.CLAUDE_API_KEY,
    model: 'claude-sonnet-4-20250514',
    maxTokens: 200000
  },
  gemini: {
    name: 'Gemini',
    endpoint: process.env.GEMINI_ENDPOINT || 'https://generativelanguage.googleapis.com/v1beta/models',
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-2.0-flash-exp',
    maxTokens: 32768
  },
  minimax: {
    name: 'Minimax',
    endpoint: process.env.MINIMAX_ENDPOINT || 'https://api.minimax.chat/v1/text/chatcompletion_v2',
    apiKey: process.env.MINIMAX_API_KEY,
    model: 'MiniMax-M2.5',
    maxTokens: 32768
  },
  local: {
    name: 'LM Studio',
    endpoint: process.env.LOCAL_ENDPOINT || 'http://localhost:1234/v1/chat/completions',
    model: process.env.LOCAL_MODEL || 'local-model',
    maxTokens: 8192
  },
  kilo: {
    name: 'Kilo',
    endpoint: process.env.KILO_ENDPOINT || 'https://api.kilo.ai/v1/autocomplete',
    apiKey: process.env.KILO_API_KEY,
    model: 'kilo-code',
    maxTokens: 4096
  },
  claw: {
    name: 'Claw',
    endpoint: process.env.CLAW_ENDPOINT || 'http://localhost:5000/api',
    maxTokens: 16384
  }
};

// Resilience state (in-memory for router)
const providerState = {};
const cooldownPeriod = parseInt(process.env.COOLDOWN_PERIOD || '30000');
const maxCooldownMultiplier = 4;

function initProviderState() {
  Object.keys(PROVIDERS).forEach(provider => {
    providerState[provider] = {
      failures: 0,
      cooldownUntil: 0,
      concurrent: 0,
      latencySum: 0,
      successCount: 0,
      totalCalls: 0
    };
  });
}

function isProviderAvailable(provider) {
  const state = providerState[provider];
  if (!state) return false;
  
  const now = Date.now();
  if (state.cooldownUntil > now) {
    const remaining = Math.ceil((state.cooldownUntil - now) / 1000);
    console.log(`[Router] Provider ${provider} in cooldown (${remaining}s remaining)`);
    return false;
  }
  return true;
}

function canExecute(provider) {
  const state = providerState[provider];
  if (!state) return false;
  
  const maxConcurrent = { claude: 5, gemini: 3, minimax: 3, local: 2, kilo: 3, claw: 2 }[provider] || 3;
  if (state.concurrent >= maxConcurrent) {
    console.log(`[Router] Provider ${provider} at concurrency limit (${state.concurrent}/${maxConcurrent})`);
    return false;
  }
  return true;
}

function getFallbackScore(provider) {
  const state = providerState[provider];
  if (!state || state.totalCalls === 0) {
    return 0.5;
  }
  
  const successRate = state.successCount / state.totalCalls;
  const avgLatency = state.totalCalls > 0 ? state.latencySum / state.totalCalls : 0;
  const latencyScore = Math.max(0, 1 - (avgLatency / 60000));
  
  const recencyScore = state.failures > 0 ? 0.2 : 0.8;
  
  return (successRate * 0.5) + (latencyScore * 0.3) + (recencyScore * 0.2);
}

function recordSuccess(provider, latency) {
  const state = providerState[provider];
  if (!state) return;
  
  state.successCount++;
  state.totalCalls++;
  state.latencySum += latency;
  state.failures = 0;
  
  console.log(`[Router] ${provider} success (latency: ${latency}ms)`);
}

function recordFailure(provider) {
  const state = providerState[provider];
  if (!state) return;
  
  state.failures++;
  state.totalCalls++;
  
  const multiplier = Math.min(state.failures, maxCooldownMultiplier);
  const cooldownTime = cooldownPeriod * multiplier;
  state.cooldownUntil = Date.now() + cooldownTime;
  
  console.log(`[Router] ${provider} failure #${state.failures}, cooldown: ${cooldownTime}ms`);
}

function acquire(provider) {
  if (!canExecute(provider)) {
    return false;
  }
  providerState[provider].concurrent++;
  return true;
}

function release(provider) {
  if (providerState[provider]) {
    providerState[provider].concurrent = Math.max(0, providerState[provider].concurrent - 1);
  }
}

function getSortedProviders(availableProviders) {
  return availableProviders
    .filter(p => isProviderAvailable(p) && canExecute(p))
    .sort((a, b) => getFallbackScore(b) - getFallbackScore(a));
}

/**
 * Route task to appropriate provider based on task type and provider availability
 */
async function routeTask(task) {
  const { payload, agentRole } = task;
  const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
  
  // Determine which providers to try based on task type
  let providersToTry = [];
  
  if (agentRole === 'coder' || message.toLowerCase().includes('code')) {
    providersToTry = ['claude', 'kilo', 'local', 'gemini'];
  } else if (agentRole === 'researcher' || message.toLowerCase().includes('research')) {
    providersToTry = ['gemini', 'claude', 'minimax', 'local'];
  } else if (agentRole === 'planner' || message.toLowerCase().includes('plan')) {
    providersToTry = ['claude', 'gemini', 'kilo'];
  } else {
    // Default routing order
    providersToTry = ['claude', 'gemini', 'kilo', 'minimax', 'local'];
  }
  
  // Filter to available providers and sort by score
  const sortedProviders = getSortedProviders(providersToTry);
  
  console.log(`[Router] Task routing order: ${sortedProviders.join(' → ')}`);
  
  // Try each provider in order
  for (const provider of sortedProviders) {
    try {
      if (!acquire(provider)) {
        continue;
      }
      
      const startTime = Date.now();
      console.log(`[Router] Attempting provider: ${provider}`);
      
      const result = await callProvider(provider, message);
      const latency = Date.now() - startTime;
      
      release(provider);
      recordSuccess(provider, latency);
      
      return {
        provider,
        result,
        latency,
        success: true
      };
      
    } catch (error) {
      console.error(`[Router] Provider ${provider} failed:`, error.message);
      release(provider);
      recordFailure(provider);
    }
  }
  
  // All providers failed
  return {
    provider: null,
    result: { error: 'All providers failed' },
    latency: 0,
    success: false
  };
}

/**
 * Call a specific provider
 */
async function callProvider(provider, message) {
  const config = PROVIDERS[provider];
  
  switch (provider) {
    case 'claude':
      return callClaude(config, message);
    case 'gemini':
      return callGemini(config, message);
    case 'minimax':
      return callMinimax(config, message);
    case 'local':
      return callLocal(config, message);
    case 'kilo':
      return callKilo(config, message);
    case 'claw':
      return callClaw(config, message);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

async function callClaude(config, message) {
  const axios = require('axios');
  const response = await axios.post(config.endpoint, {
    model: config.model,
    max_tokens: 4096,
    messages: [{ role: 'user', content: message }]
  }, {
    headers: {
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    timeout: 60000
  });
  
  return { text: response.data.content[0].text };
}

async function callGemini(config, message) {
  const axios = require('axios');
  const response = await axios.post(`${config.endpoint}/${config.model}:generateContent`, {
    contents: [{ parts: [{ text: message }] }]
  }, {
    params: { key: config.apiKey },
    timeout: 60000
  });
  
  return { text: response.data.candidates[0].content.parts[0].text };
}

async function callMinimax(config, message) {
  const axios = require('axios');
  const response = await axios.post(config.endpoint, {
    model: config.model,
    messages: [{ role: 'user', content: message }]
  }, {
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: 60000
  });
  
  return { text: response.data.choices[0].message.content };
}

async function callLocal(config, message) {
  const axios = require('axios');
  const response = await axios.post(config.endpoint, {
    model: config.model,
    messages: [{ role: 'user', content: message }],
    temperature: 0.7
  }, {
    timeout: 120000
  });
  
  return { text: response.data.choices[0].message.content };
}

async function callKilo(config, message) {
  const axios = require('axios');
  const response = await axios.post(config.endpoint, {
    model: config.model,
    prompt: message,
    max_tokens: 500
  }, {
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });
  
  return { text: response.data.text || response.data.completion };
}

async function callClaw(config, message) {
  const axios = require('axios');
  const response = await axios.post(config.endpoint, {
    prompt: message
  }, {
    timeout: 60000
  });
  
  return response.data;
}

// Main router agent
class RouterAgent {
  constructor() {
    this.redis = null;
    this.consumerName = `router-${uuidv4().slice(0, 8)}`;
    this.running = false;
  }
  
  async connect() {
    this.redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100
    });
    
    this.redis.on('connect', () => {
      console.log('[Router] Connected to Redis');
    });
    
    this.redis.on('error', (err) => {
      console.error('[Router] Redis error:', err.message);
    });
    
    // Create consumer group
    try {
      await this.redis.xgroup('CREATE', STREAMS.TASKS, GROUP, '0', 'MKSTREAM');
      console.log('[Router] Created consumer group:', GROUP);
    } catch (error) {
      if (error.message.includes('BUSYGROUP')) {
        console.log('[Router] Consumer group exists:', GROUP);
      } else {
        throw error;
      }
    }
    
    initProviderState();
    
    return this;
  }
  
  async start() {
    this.running = true;
    console.log('[Router] Starting router agent...');
    
    while (this.running) {
      try {
        const messages = await this.redis.xreadgroup(
          'GROUP', GROUP,
          this.consumerName,
          'COUNT', 1,
          'BLOCK', 5000,
          'STREAMS', STREAMS.TASKS, '>'
        );
        
        if (!messages || messages.length === 0) {
          continue;
        }
        
        for (const [stream, entries] of messages) {
          for (const [msgId, fields] of entries) {
            const data = fields[0][1];
            const task = JSON.parse(data);
            
            console.log(`[Router] Received task: ${task.task_id || msgId}`);
            
            try {
              // Route the task
              const result = await routeTask(task);
              
              // Publish result
              const resultMsg = {
                task_id: task.task_id,
                router: this.consumerName,
                status: result.success ? 'ok' : 'error',
                provider: result.provider,
                output: result.result,
                latency_ms: result.latency,
                completed_at: Date.now()
              };
              
              await this.redis.xadd(STREAMS.RESULTS, '*', 'data', JSON.stringify(resultMsg));
              console.log(`[Router] Task completed: ${task.task_id}, provider: ${result.provider}`);
              
            } catch (error) {
              console.error('[Router] Task error:', error.message);
              
              // Publish error
              const errorMsg = {
                task_id: task.task_id,
                router: this.consumerName,
                status: 'error',
                error: error.message,
                completed_at: Date.now()
              };
              
              await this.redis.xadd(STREAMS.RESULTS, '*', 'data', JSON.stringify(errorMsg));
            }
            
            // Acknowledge message
            await this.redis.xack(STREAMS.TASKS, GROUP, msgId);
          }
        }
        
      } catch (error) {
        console.error('[Router] Consume error:', error.message);
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }
  
  stop() {
    this.running = false;
    console.log('[Router] Stopping...');
  }
  
  async disconnect() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
  
  getStats() {
    return {
      providerState: Object.keys(providerState).map(p => ({
        provider: p,
        ...providerState[p],
        score: getFallbackScore(p),
        available: isProviderAvailable(p) && canExecute(p)
      }))
    };
  }
}

// Start the router
async function main() {
  const router = new RouterAgent();
  
  try {
    await router.connect();
    await router.start();
  } catch (error) {
    console.error('[Router]);
    process.exit Fatal error:', error(1);
  }
  
  process.on('SIGINT', async () => {
    console.log('[Router] Shutting down...');
    router.stop();
    await router.disconnect();
    process.exit(0);
  });
}

main();
