/**
 * Multi-Provider Support - Real API Connections
 * Uses user's actual env vars: CLAUDE_API_KEY, MINIMAX_API_KEY, etc.
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// Provider configurations - user's actual env vars
const PROVIDER_CONFIGS = {
  anthropic: {
    name: 'Anthropic',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
    apiKeyEnv: 'CLAUDE_API_KEY',  // User's actual env var
    fallbackEnvVars: ['CLAUDE_API_KEY_2', 'CLAUDE_API_KEY_3'],
    baseUrl: 'https://api.anthropic.com/v1'
  },
  openai: {
    name: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
    apiKeyEnv: 'OPENAI_API_KEY',
    baseUrl: 'https://api.openai.com/v1'
  },
  google: {
    name: 'Google',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'],
    apiKeyEnv: 'GOOGLE_API_KEY',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta'
  },
  minimax: {
    name: 'Minimax',
    models: ['MiniMax-M2.5', 'abab6.5s-chat'],
    apiKeyEnv: 'MINIMAX_API_KEY',
    baseUrl: 'https://api.minimax.io/v1'
  },
  deepseek: {
    name: 'DeepSeek',
    models: ['deepseek-chat', 'deepseek-coder'],
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    baseUrl: 'https://api.deepseek.com/v1'
  }
};

/**
 * Get API key from environment - tries multiple env vars for failover
 */
function getApiKey(primaryEnvVar, fallbackEnvVars = []) {
  // Try primary
  if (process.env[primaryEnvVar]) {
    return process.env[primaryEnvVar];
  }
  
  // Try fallbacks
  for (const fallback of fallbackEnvVars) {
    if (process.env[fallback]) {
      return process.env[fallback];
    }
  }
  
  return null;
}

/**
 * Multi-Provider Agent - Real API Implementations
 */
class MultiProviderAgent {
  constructor(config = {}) {
    this.config = config;
    this.providers = new Map();
    this.defaultProvider = config.defaultProvider || 'anthropic';
    this.clients = {};
    this.initializeClients();
  }

  /**
   * Initialize API clients
   */
  initializeClients() {
    // Initialize Anthropic (Claude) client
    const anthropicKey = getApiKey('CLAUDE_API_KEY', ['CLAUDE_API_KEY_2', 'CLAUDE_API_KEY_3']);
    if (anthropicKey) {
      try {
        this.clients.anthropic = new Anthropic({
          apiKey: anthropicKey,
          baseURL: PROVIDER_CONFIGS.anthropic.baseUrl
        });
        console.log('[MultiProvider] Anthropic (Claude) client initialized');
      } catch (e) {
        console.error('[MultiProvider] Failed to init Anthropic:', e.message);
      }
    } else {
      console.log('[MultiProvider] CLAUDE_API_KEY not found in env');
    }

    // Initialize OpenAI client
    const openaiKey = getApiKey('OPENAI_API_KEY');
    if (openaiKey) {
      try {
        this.clients.openai = new OpenAI({
          apiKey: openaiKey,
          baseURL: PROVIDER_CONFIGS.openai.baseUrl
        });
        console.log('[MultiProvider] OpenAI client initialized');
      } catch (e) {
        console.error('[MultiProvider] Failed to init OpenAI:', e.message);
      }
    }

    // Initialize Minimax client
    const minimaxKey = getApiKey('MINIMAX_API_KEY');
    if (minimaxKey) {
      try {
        this.clients.minimax = new OpenAI({
          apiKey: minimaxKey,
          baseURL: 'https://api.minimax.io/v1'
        });
        console.log('[MultiProvider] Minimax client initialized');
      } catch (e) {
        console.error('[MultiProvider] Failed to init Minimax:', e.message);
      }
    }

    // Initialize DeepSeek client (OpenAI-compatible)
    const deepseekKey = getApiKey('DEEPSEEK_API_KEY');
    if (deepseekKey) {
      try {
        this.clients.deepseek = new OpenAI({
          apiKey: deepseekKey,
          baseURL: 'https://api.deepseek.com'
        });
        console.log('[MultiProvider] DeepSeek client initialized');
      } catch (e) {
        console.error('[MultiProvider] Failed to init DeepSeek:', e.message);
      }
    }
  }

  /**
   * Get provider configuration
   */
  getProviderConfig(providerName) {
    return PROVIDER_CONFIGS[providerName];
  }

  /**
   * Get available providers
   */
  getAvailableProviders() {
    return Object.keys(PROVIDER_CONFIGS);
  }

  /**
   * Get models for a provider
   */
  getProviderModels(providerName) {
    const config = PROVIDER_CONFIGS[providerName];
    return config ? config.models : [];
  }

  /**
   * Execute with Anthropic (Claude)
   */
  async executeAnthropic(prompt, options = {}) {
    if (!this.clients.anthropic) {
      throw new Error('Anthropic client not initialized - missing CLAUDE_API_KEY');
    }

    const model = options.model || 'claude-3-5-sonnet-20241022';
    
    const response = await this.clients.anthropic.messages.create({
      model,
      max_tokens: options.maxTokens || 4096,
      messages: [{ role: 'user', content: prompt }],
      system: options.system || undefined
    });

    return {
      provider: 'anthropic',
      model,
      response: response.content[0].text,
      usage: response.usage,
      id: response.id,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute with OpenAI
   */
  async executeOpenAI(prompt, options = {}) {
    if (!this.clients.openai) {
      throw new Error('OpenAI client not initialized - missing OPENAI_API_KEY');
    }

    const model = options.model || 'gpt-4o';
    
    const response = await this.clients.openai.chat.completions.create({
      model,
      messages: [
        ...(options.system ? [{ role: 'system', content: options.system }] : []),
        { role: 'user', content: prompt }
      ],
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.7
    });

    return {
      provider: 'openai',
      model,
      response: response.choices[0].message.content,
      usage: response.usage,
      id: response.id,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute with Minimax
   */
  async executeMinimax(prompt, options = {}) {
    if (!this.clients.minimax) {
      throw new Error('Minimax client not initialized - missing MINIMAX_API_KEY');
    }

    const model = options.model || 'MiniMax-M2.5';
    
    const response = await this.clients.minimax.chat.completions.create({
      model,
      messages: [
        ...(options.system ? [{ role: 'system', content: options.system }] : []),
        { role: 'user', content: prompt }
      ],
      max_tokens: options.maxTokens || 4096
    });

    return {
      provider: 'minimax',
      model,
      response: response.choices[0].message.content,
      id: response.id,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute with DeepSeek
   */
  async executeDeepSeek(prompt, options = {}) {
    if (!this.clients.deepseek) {
      throw new Error('DeepSeek client not initialized - missing DEEPSEEK_API_KEY');
    }

    const model = options.model || 'deepseek-chat';
    
    const response = await this.clients.deepseek.chat.completions.create({
      model,
      messages: [
        ...(options.system ? [{ role: 'system', content: options.system }] : []),
        { role: 'user', content: prompt }
      ],
      max_tokens: options.maxTokens || 4096
    });

    return {
      provider: 'deepseek',
      model,
      response: response.choices[0].message.content,
      usage: response.usage,
      id: response.id,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute with a specific provider
   */
  async executeWithProvider(providerName, prompt, options = {}) {
    switch (providerName) {
      case 'anthropic':
        return await this.executeAnthropic(prompt, options);
      case 'openai':
        return await this.executeOpenAI(prompt, options);
      case 'minimax':
        return await this.executeMinimax(prompt, options);
      case 'deepseek':
        return await this.executeDeepSeek(prompt, options);
      default:
        throw new Error(`Unknown provider: ${providerName}`);
    }
  }

  /**
   * Execute ensemble - get responses from multiple providers
   */
  async executeEnsemble(providers, prompt, options = {}) {
    const results = await Promise.allSettled(
      providers.map(provider => 
        this.executeWithProvider(provider, prompt, options).catch(err => ({
          provider,
          error: err.message
        }))
      )
    );
    
    return results.map(r => r.status === 'fulfilled' ? r.value : r.reason);
  }

  /**
   * Synthesize responses from multiple providers
   */
  synthesizeResponses(responses, strategy = 'first') {
    const successfulResponses = responses.filter(r => !r.error && r.response);
    
    if (successfulResponses.length === 0) {
      return { error: 'All providers failed', responses };
    }
    
    if (successfulResponses.length === 1) {
      return successfulResponses[0];
    }
    
    return successfulResponses[0];
  }

  /**
   * Execute with fallback - try providers in order until one works
   */
  async executeWithFallback(prompt, options = {}) {
    const preferredProviders = options.preferredProviders || 
      [this.defaultProvider, ...this.getAvailableProviders().filter(p => p !== this.defaultProvider)];
    
    const errors = [];
    
    for (const provider of preferredProviders) {
      if (!this.clients[provider]) {
        console.log(`[MultiProvider] ${provider} client not available, skipping...`);
        continue;
      }
      
      try {
        return await this.executeWithProvider(provider, prompt, options);
      } catch (error) {
        errors.push({ provider, error: error.message });
        console.log(`[MultiProvider] ${provider} failed: ${error.message}`);
      }
    }
    
    return {
      error: 'All providers failed',
      errors
    };
  }

  /**
   * Main execute method
   */
  async executeTask(task, context = {}, options = {}) {
    const strategy = options.strategy || 'single';
    const provider = options.useModel || this.defaultProvider;
    
    if (strategy === 'ensemble') {
      const models = options.useModels || ['anthropic', 'openai'];
      const responses = await this.executeEnsemble(models, task, options);
      return this.synthesizeResponses(responses, options.synthesisStrategy);
    }
    
    return await this.executeWithProvider(provider, task, options);
  }

  /**
   * Query a specific model
   */
  async query(model, prompt, options = {}) {
    const [provider, modelName] = model.includes('/') 
      ? model.split('/') 
      : [this.defaultProvider, model];
    
    return await this.executeWithProvider(provider, prompt, {
      ...options,
      model: modelName
    });
  }

  /**
   * Get provider status
   */
  async getStatus() {
    const status = {};
    
    for (const [name, config] of Object.entries(PROVIDER_CONFIGS)) {
      const apiKey = getApiKey(config.apiKeyEnv, config.fallbackEnvVars);
      const hasClient = !!this.clients[name];
      status[name] = {
        name: config.name,
        hasApiKey: !!apiKey,
        hasClient,
        available: hasClient,
        models: config.models.length,
        apiKeyEnv: config.apiKeyEnv
      };
    }
    
    return status;
  }
}

/**
 * Create a provider client
 */
export function createProviderClient(providerName, options = {}) {
  const config = PROVIDER_CONFIGS[providerName];
  if (!config) {
    throw new Error(`Unknown provider: ${providerName}`);
  }

  return {
    name: providerName,
    config,
    
    async chat(prompt, options = {}) {
      const agent = new MultiProviderAgent();
      return await agent.executeWithProvider(providerName, prompt, options);
    },
    
    getModels() {
      return config.models;
    }
  };
}

export { MultiProviderAgent, PROVIDER_CONFIGS };
export default MultiProviderAgent;
 * Multi-Provider Support - Real API Connections
 * Uses user's actual env vars: CLAUDE_API_KEY, MINIMAX_API_KEY, etc.
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// Provider configurations - user's actual env vars
const PROVIDER_CONFIGS = {
  anthropic: {
    name: 'Anthropic',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
    apiKeyEnv: 'CLAUDE_API_KEY',  // User's actual env var
    fallbackEnvVars: ['CLAUDE_API_KEY_2', 'CLAUDE_API_KEY_3'],
    baseUrl: 'https://api.anthropic.com/v1'
  },
  openai: {
    name: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
    apiKeyEnv: 'OPENAI_API_KEY',
    baseUrl: 'https://api.openai.com/v1'
  },
  google: {
    name: 'Google',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'],
    apiKeyEnv: 'GOOGLE_API_KEY',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta'
  },
  minimax: {
    name: 'Minimax',
    models: ['MiniMax-M2.5', 'abab6.5s-chat'],
    apiKeyEnv: 'MINIMAX_API_KEY',
    baseUrl: 'https://api.minimax.io/v1'
  },
  deepseek: {
    name: 'DeepSeek',
    models: ['deepseek-chat', 'deepseek-coder'],
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    baseUrl: 'https://api.deepseek.com/v1'
  }
};

/**
 * Get API key from environment - tries multiple env vars for failover
 */
function getApiKey(primaryEnvVar, fallbackEnvVars = []) {
  // Try primary
  if (process.env[primaryEnvVar]) {
    return process.env[primaryEnvVar];
  }
  
  // Try fallbacks
  for (const fallback of fallbackEnvVars) {
    if (process.env[fallback]) {
      return process.env[fallback];
    }
  }
  
  return null;
}

/**
 * Multi-Provider Agent - Real API Implementations
 */
class MultiProviderAgent {
  constructor(config = {}) {
    this.config = config;
    this.providers = new Map();
    this.defaultProvider = config.defaultProvider || 'anthropic';
    this.clients = {};
    this.initializeClients();
  }

  /**
   * Initialize API clients
   */
  initializeClients() {
    // Initialize Anthropic (Claude) client
    const anthropicKey = getApiKey('CLAUDE_API_KEY', ['CLAUDE_API_KEY_2', 'CLAUDE_API_KEY_3']);
    if (anthropicKey) {
      try {
        this.clients.anthropic = new Anthropic({
          apiKey: anthropicKey,
          baseURL: PROVIDER_CONFIGS.anthropic.baseUrl
        });
        console.log('[MultiProvider] Anthropic (Claude) client initialized');
      } catch (e) {
        console.error('[MultiProvider] Failed to init Anthropic:', e.message);
      }
    } else {
      console.log('[MultiProvider] CLAUDE_API_KEY not found in env');
    }

    // Initialize OpenAI client
    const openaiKey = getApiKey('OPENAI_API_KEY');
    if (openaiKey) {
      try {
        this.clients.openai = new OpenAI({
          apiKey: openaiKey,
          baseURL: PROVIDER_CONFIGS.openai.baseUrl
        });
        console.log('[MultiProvider] OpenAI client initialized');
      } catch (e) {
        console.error('[MultiProvider] Failed to init OpenAI:', e.message);
      }
    }

    // Initialize Minimax client
    const minimaxKey = getApiKey('MINIMAX_API_KEY');
    if (minimaxKey) {
      try {
        this.clients.minimax = new OpenAI({
          apiKey: minimaxKey,
          baseURL: 'https://api.minimax.io/v1'
        });
        console.log('[MultiProvider] Minimax client initialized');
      } catch (e) {
        console.error('[MultiProvider] Failed to init Minimax:', e.message);
      }
    }

    // Initialize DeepSeek client (OpenAI-compatible)
    const deepseekKey = getApiKey('DEEPSEEK_API_KEY');
    if (deepseekKey) {
      try {
        this.clients.deepseek = new OpenAI({
          apiKey: deepseekKey,
          baseURL: 'https://api.deepseek.com'
        });
        console.log('[MultiProvider] DeepSeek client initialized');
      } catch (e) {
        console.error('[MultiProvider] Failed to init DeepSeek:', e.message);
      }
    }
  }

  /**
   * Get provider configuration
   */
  getProviderConfig(providerName) {
    return PROVIDER_CONFIGS[providerName];
  }

  /**
   * Get available providers
   */
  getAvailableProviders() {
    return Object.keys(PROVIDER_CONFIGS);
  }

  /**
   * Get models for a provider
   */
  getProviderModels(providerName) {
    const config = PROVIDER_CONFIGS[providerName];
    return config ? config.models : [];
  }

  /**
   * Execute with Anthropic (Claude)
   */
  async executeAnthropic(prompt, options = {}) {
    if (!this.clients.anthropic) {
      throw new Error('Anthropic client not initialized - missing CLAUDE_API_KEY');
    }

    const model = options.model || 'claude-3-5-sonnet-20241022';
    
    const response = await this.clients.anthropic.messages.create({
      model,
      max_tokens: options.maxTokens || 4096,
      messages: [{ role: 'user', content: prompt }],
      system: options.system || undefined
    });

    return {
      provider: 'anthropic',
      model,
      response: response.content[0].text,
      usage: response.usage,
      id: response.id,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute with OpenAI
   */
  async executeOpenAI(prompt, options = {}) {
    if (!this.clients.openai) {
      throw new Error('OpenAI client not initialized - missing OPENAI_API_KEY');
    }

    const model = options.model || 'gpt-4o';
    
    const response = await this.clients.openai.chat.completions.create({
      model,
      messages: [
        ...(options.system ? [{ role: 'system', content: options.system }] : []),
        { role: 'user', content: prompt }
      ],
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.7
    });

    return {
      provider: 'openai',
      model,
      response: response.choices[0].message.content,
      usage: response.usage,
      id: response.id,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute with Minimax
   */
  async executeMinimax(prompt, options = {}) {
    if (!this.clients.minimax) {
      throw new Error('Minimax client not initialized - missing MINIMAX_API_KEY');
    }

    const model = options.model || 'MiniMax-M2.5';
    
    const response = await this.clients.minimax.chat.completions.create({
      model,
      messages: [
        ...(options.system ? [{ role: 'system', content: options.system }] : []),
        { role: 'user', content: prompt }
      ],
      max_tokens: options.maxTokens || 4096
    });

    return {
      provider: 'minimax',
      model,
      response: response.choices[0].message.content,
      id: response.id,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute with DeepSeek
   */
  async executeDeepSeek(prompt, options = {}) {
    if (!this.clients.deepseek) {
      throw new Error('DeepSeek client not initialized - missing DEEPSEEK_API_KEY');
    }

    const model = options.model || 'deepseek-chat';
    
    const response = await this.clients.deepseek.chat.completions.create({
      model,
      messages: [
        ...(options.system ? [{ role: 'system', content: options.system }] : []),
        { role: 'user', content: prompt }
      ],
      max_tokens: options.maxTokens || 4096
    });

    return {
      provider: 'deepseek',
      model,
      response: response.choices[0].message.content,
      usage: response.usage,
      id: response.id,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute with a specific provider
   */
  async executeWithProvider(providerName, prompt, options = {}) {
    switch (providerName) {
      case 'anthropic':
        return await this.executeAnthropic(prompt, options);
      case 'openai':
        return await this.executeOpenAI(prompt, options);
      case 'minimax':
        return await this.executeMinimax(prompt, options);
      case 'deepseek':
        return await this.executeDeepSeek(prompt, options);
      default:
        throw new Error(`Unknown provider: ${providerName}`);
    }
  }

  /**
   * Execute ensemble - get responses from multiple providers
   */
  async executeEnsemble(providers, prompt, options = {}) {
    const results = await Promise.allSettled(
      providers.map(provider => 
        this.executeWithProvider(provider, prompt, options).catch(err => ({
          provider,
          error: err.message
        }))
      )
    );
    
    return results.map(r => r.status === 'fulfilled' ? r.value : r.reason);
  }

  /**
   * Synthesize responses from multiple providers
   */
  synthesizeResponses(responses, strategy = 'first') {
    const successfulResponses = responses.filter(r => !r.error && r.response);
    
    if (successfulResponses.length === 0) {
      return { error: 'All providers failed', responses };
    }
    
    if (successfulResponses.length === 1) {
      return successfulResponses[0];
    }
    
    return successfulResponses[0];
  }

  /**
   * Execute with fallback - try providers in order until one works
   */
  async executeWithFallback(prompt, options = {}) {
    const preferredProviders = options.preferredProviders || 
      [this.defaultProvider, ...this.getAvailableProviders().filter(p => p !== this.defaultProvider)];
    
    const errors = [];
    
    for (const provider of preferredProviders) {
      if (!this.clients[provider]) {
        console.log(`[MultiProvider] ${provider} client not available, skipping...`);
        continue;
      }
      
      try {
        return await this.executeWithProvider(provider, prompt, options);
      } catch (error) {
        errors.push({ provider, error: error.message });
        console.log(`[MultiProvider] ${provider} failed: ${error.message}`);
      }
    }
    
    return {
      error: 'All providers failed',
      errors
    };
  }

  /**
   * Main execute method
   */
  async executeTask(task, context = {}, options = {}) {
    const strategy = options.strategy || 'single';
    const provider = options.useModel || this.defaultProvider;
    
    if (strategy === 'ensemble') {
      const models = options.useModels || ['anthropic', 'openai'];
      const responses = await this.executeEnsemble(models, task, options);
      return this.synthesizeResponses(responses, options.synthesisStrategy);
    }
    
    return await this.executeWithProvider(provider, task, options);
  }

  /**
   * Query a specific model
   */
  async query(model, prompt, options = {}) {
    const [provider, modelName] = model.includes('/') 
      ? model.split('/') 
      : [this.defaultProvider, model];
    
    return await this.executeWithProvider(provider, prompt, {
      ...options,
      model: modelName
    });
  }

  /**
   * Get provider status
   */
  async getStatus() {
    const status = {};
    
    for (const [name, config] of Object.entries(PROVIDER_CONFIGS)) {
      const apiKey = getApiKey(config.apiKeyEnv, config.fallbackEnvVars);
      const hasClient = !!this.clients[name];
      status[name] = {
        name: config.name,
        hasApiKey: !!apiKey,
        hasClient,
        available: hasClient,
        models: config.models.length,
        apiKeyEnv: config.apiKeyEnv
      };
    }
    
    return status;
  }
}

/**
 * Create a provider client
 */
export function createProviderClient(providerName, options = {}) {
  const config = PROVIDER_CONFIGS[providerName];
  if (!config) {
    throw new Error(`Unknown provider: ${providerName}`);
  }

  return {
    name: providerName,
    config,
    
    async chat(prompt, options = {}) {
      const agent = new MultiProviderAgent();
      return await agent.executeWithProvider(providerName, prompt, options);
    },
    
    getModels() {
      return config.models;
    }
  };
}

export { MultiProviderAgent, PROVIDER_CONFIGS };
export default MultiProviderAgent;

  },
  ollama: {
    name: 'Ollama',
    models: ['llama2', 'codellama', 'mistral', 'mixtral', 'qwen'],
    apiKeyEnv: 'OLLAMA_HOST',
    baseUrl: 'http://localhost:11434'
  }
};

/**
 * Multi-Provider Agent - Real API Implementations
 */
class MultiProviderAgent {
  constructor(config = {}) {
    this.config = config;
    this.providers = new Map();
    this.defaultProvider = config.defaultProvider || 'anthropic';
    this.clients = {};
    this.initializeClients();
  }

  /**
   * Initialize API clients
   */
  initializeClients() {
    // Initialize Anthropic client
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        this.clients.anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
          baseURL: PROVIDER_CONFIGS.anthropic.baseUrl
        });
        console.log('[MultiProvider] Anthropic client initialized');
      } catch (e) {
        console.error('[MultiProvider] Failed to init Anthropic:', e.message);
      }
    }

    // Initialize OpenAI client
    if (process.env.OPENAI_API_KEY) {
      try {
        this.clients.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          baseURL: PROVIDER_CONFIGS.openai.baseUrl
        });
        console.log('[MultiProvider] OpenAI client initialized');
      } catch (e) {
        console.error('[MultiProvider] Failed to init OpenAI:', e.message);
      }
    }

    // Initialize Google client
    if (process.env.GOOGLE_API_KEY) {
      try {
        this.clients.google = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        console.log('[MultiProvider] Google client initialized');
      } catch (e) {
        console.error('[MultiProvider] Failed to init Google:', e.message);
      }
    }

    // DeepSeek uses OpenAI-compatible API
    if (process.env.DEEPSEEK_API_KEY) {
      try {
        this.clients.deepseek = new OpenAI({
          apiKey: process.env.DEEPSEEK_API_KEY,
          baseURL: 'https://api.deepseek.com'
        });
        console.log('[MultiProvider] DeepSeek client initialized');
      } catch (e) {
        console.error('[MultiProvider] Failed to init DeepSeek:', e.message);
      }
    }
  }

  /**
   * Get provider configuration
   */
  getProviderConfig(providerName) {
    return PROVIDER_CONFIGS[providerName];
  }

  /**
   * Get available providers
   */
  getAvailableProviders() {
    return Object.keys(PROVIDER_CONFIGS);
  }

  /**
   * Get models for a provider
   */
  getProviderModels(providerName) {
    const config = PROVIDER_CONFIGS[providerName];
    return config ? config.models : [];
  }

  /**
   * Execute with Anthropic
   */
  async executeAnthropic(prompt, options = {}) {
    if (!this.clients.anthropic) {
      throw new Error('Anthropic client not initialized - missing ANTHROPIC_API_KEY');
    }

    const model = options.model || 'claude-3-5-sonnet-20241022';
    
    const response = await this.clients.anthropic.messages.create({
      model,
      max_tokens: options.maxTokens || 4096,
      messages: [{ role: 'user', content: prompt }],
      system: options.system || undefined
    });

    return {
      provider: 'anthropic',
      model,
      response: response.content[0].text,
      usage: response.usage,
      id: response.id,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute with OpenAI
   */
  async executeOpenAI(prompt, options = {}) {
    if (!this.clients.openai) {
      throw new Error('OpenAI client not initialized - missing OPENAI_API_KEY');
    }

    const model = options.model || 'gpt-4o';
    
    const response = await this.clients.openai.chat.completions.create({
      model,
      messages: [
        ...(options.system ? [{ role: 'system', content: options.system }] : []),
        { role: 'user', content: prompt }
      ],
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.7
    });

    return {
      provider: 'openai',
      model,
      response: response.choices[0].message.content,
      usage: response.usage,
      id: response.id,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute with DeepSeek
   */
  async executeDeepSeek(prompt, options = {}) {
    if (!this.clients.deepseek) {
      throw new Error('DeepSeek client not initialized - missing DEEPSEEK_API_KEY');
    }

    const model = options.model || 'deepseek-chat';
    
    const response = await this.clients.deepseek.chat.completions.create({
      model,
      messages: [
        ...(options.system ? [{ role: 'system', content: options.system }] : []),
        { role: 'user', content: prompt }
      ],
      max_tokens: options.maxTokens || 4096
    });

    return {
      provider: 'deepseek',
      model,
      response: response.choices[0].message.content,
      usage: response.usage,
      id: response.id,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute with Google Gemini
   */
  async executeGoogle(prompt, options = {}) {
    if (!this.clients.google) {
      throw new Error('Google client not initialized - missing GOOGLE_API_KEY');
    }

    const modelName = options.model || 'gemini-1.5-pro';
    const model = this.clients.google.getGenerativeModel({ model: modelName });

    const result = await model.generateContent(prompt);
    const response = result.response;

    return {
      provider: 'google',
      model: modelName,
      response: response.text(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute with a specific provider
   */
  async executeWithProvider(providerName, prompt, options = {}) {
    switch (providerName) {
      case 'anthropic':
        return await this.executeAnthropic(prompt, options);
      case 'openai':
        return await this.executeOpenAI(prompt, options);
      case 'deepseek':
        return await this.executeDeepSeek(prompt, options);
      case 'google':
        return await this.executeGoogle(prompt, options);
      default:
        throw new Error(`Unknown provider: ${providerName}`);
    }
  }

  /**
   * Execute ensemble - get responses from multiple providers
   */
  async executeEnsemble(providers, prompt, options = {}) {
    const results = await Promise.allSettled(
      providers.map(provider => 
        this.executeWithProvider(provider, prompt, options).catch(err => ({
          provider,
          error: err.message
        }))
      )
    );
    
    return results.map(r => r.status === 'fulfilled' ? r.value : r.reason);
  }

  /**
   * Synthesize responses from multiple providers
   */
  synthesizeResponses(responses, strategy = 'first') {
    const successfulResponses = responses.filter(r => !r.error && r.response);
    
    if (successfulResponses.length === 0) {
      return { error: 'All providers failed', responses };
    }
    
    if (successfulResponses.length === 1) {
      return successfulResponses[0];
    }
    
    // Return the first successful response
    return successfulResponses[0];
  }

  /**
   * Execute with fallback - try providers in order until one works
   */
  async executeWithFallback(prompt, options = {}) {
    const preferredProviders = options.preferredProviders || 
      [this.defaultProvider, ...this.getAvailableProviders().filter(p => p !== this.defaultProvider)];
    
    const errors = [];
    
    for (const provider of preferredProviders) {
      // Check if client is available
      if (!this.clients[provider]) {
        console.log(`[MultiProvider] ${provider} client not available, skipping...`);
        continue;
      }
      
      try {
        return await this.executeWithProvider(provider, prompt, options);
      } catch (error) {
        errors.push({ provider, error: error.message });
        console.log(`[MultiProvider] ${provider} failed: ${error.message}`);
      }
    }
    
    return {
      error: 'All providers failed',
      errors
    };
  }

  /**
   * Main execute method - routes to appropriate provider
   */
  async executeTask(task, context = {}, options = {}) {
    const strategy = options.strategy || 'single';
    const provider = options.useModel || this.defaultProvider;
    
    if (strategy === 'ensemble') {
      const models = options.useModels || ['anthropic', 'openai'];
      const responses = await this.executeEnsemble(models, task, options);
      return this.synthesizeResponses(responses, options.synthesisStrategy);
    }
    
    return await this.executeWithProvider(provider, task, options);
  }

  /**
   * Query a specific model (provider/model format)
   */
  async query(model, prompt, options = {}) {
    const [provider, modelName] = model.includes('/') 
      ? model.split('/') 
      : [this.defaultProvider, model];
    
    return await this.executeWithProvider(provider, prompt, {
      ...options,
      model: modelName
    });
  }

  /**
   * Get provider status
   */
  async getStatus() {
    const status = {};
    
    for (const [name, config] of Object.entries(PROVIDER_CONFIGS)) {
      const hasApiKey = !!process.env[config.apiKeyEnv];
      const hasClient = !!this.clients[name];
      status[name] = {
        name: config.name,
        hasApiKey,
        hasClient,
        available: hasClient,
        models: config.models.length,
        apiKeyEnv: config.apiKeyEnv
      };
    }
    
    return status;
  }
}

/**
 * Create a provider client
 */
export function createProviderClient(providerName, options = {}) {
  const config = PROVIDER_CONFIGS[providerName];
  if (!config) {
    throw new Error(`Unknown provider: ${providerName}`);
  }

  return {
    name: providerName,
    config,
    
    async chat(prompt, options = {}) {
      const agent = new MultiProviderAgent();
      return await agent.executeWithProvider(providerName, prompt, options);
    },
    
    getModels() {
      return config.models;
    }
  };
}

export { MultiProviderAgent, PROVIDER_CONFIGS };
export default MultiProviderAgent;

   * Execute a task with a specific provider
   * @param {string} providerName - Provider name
   * @param {string} prompt - Prompt to send
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} - Execution result
   */
  async executeWithProvider(providerName, prompt, options = {}) {
    const providerConfig = PROVIDER_CONFIGS[providerName];
    if (!providerConfig) {
      throw new Error(`Unknown provider: ${providerName}`);
    }

    const model = options.model || providerConfig.models[0];
    
    console.log(`[MultiProvider] Executing with ${providerName}/${model}`);
    
    // In a real implementation, this would call the actual API
    // For now, return a placeholder result
    return {
      provider: providerName,
      model,
      prompt,
      response: `Simulated response from ${providerName} using ${model}`,
      options,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute task with multiple providers (ensemble)
   * @param {string[]} providers - List of provider names
   * @param {string} prompt - Prompt to send
   * @param {Object} options - Execution options
   * @returns {Promise<Object[]>} - Array of responses
   */
  async executeEnsemble(providers, prompt, options = {}) {
    const results = await Promise.all(
      providers.map(provider => 
        this.executeWithProvider(provider, prompt, options).catch(err => ({
          provider,
          error: err.message
        }))
      )
    );
    
    return results;
  }

  /**
   * Synthesize responses from multiple providers
   * @param {Object[]} responses - Array of responses
   * @param {string} strategy - Synthesis strategy
   * @returns {Object} - Synthesized response
   */
  synthesizeResponses(responses, strategy = 'majority') {
    const successfulResponses = responses.filter(r => !r.error);
    
    if (successfulResponses.length === 0) {
      return { error: 'All providers failed', responses };
    }
    
    if (successfulResponses.length === 1) {
      return successfulResponses[0];
    }
    
    switch (strategy) {
      case 'majority':
        // Simple majority voting - return first response
        return successfulResponses[0];
      case 'concatenate':
        // Combine all responses
        return {
          synthesized: true,
          strategy,
          responses: successfulResponses.map(r => r.response),
          combined: successfulResponses.map(r => r.response).join('\n\n---\n\n')
        };
      case 'best':
        // Return the longest/most detailed response
        return successfulResponses.reduce((best, current) => 
          (current.response?.length || 0) > (best.response?.length || 0) ? current : best
        );
      default:
        return successfulResponses[0];
    }
  }

  /**
   * Execute task with fallback
   * @param {string} prompt - Prompt to send
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} - Execution result with fallback
   */
  async executeWithFallback(prompt, options = {}) {
    const preferredProviders = options.preferredProviders || 
      [this.defaultProvider, ...this.getAvailableProviders().filter(p => p !== this.defaultProvider)];
    
    const errors = [];
    
    for (const provider of preferredProviders) {
      try {
        return await this.executeWithProvider(provider, prompt, options);
      } catch (error) {
        errors.push({ provider, error: error.message });
        console.log(`[MultiProvider] ${provider} failed, trying next...`);
      }
    }
    
    return {
      error: 'All providers failed',
      errors
    };
  }

  /**
   * Execute task with routing based on task type
   * @param {string} task - Task description
   * @param {Object} context - Context for the task
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} - Execution result
   */
  async executeTask(task, context = {}, options = {}) {
    const strategy = options.strategy || 'single';
    
    switch (strategy) {
      case 'ensemble':
        const models = options.useModels || ['anthropic', 'openai'];
        const responses = await this.executeEnsemble(models, task, options);
        return this.synthesizeResponses(responses, options.synthesisStrategy);
      
      case 'parallel':
        return Promise.all(
          (options.useModels || [this.defaultProvider]).map(
            model => this.executeWithProvider(model, task, options)
          )
        );
      
      case 'single':
      default:
        const provider = options.useModel || this.defaultProvider;
        return await this.executeWithProvider(provider, task, options);
    }
  }

  /**
   * Query a specific model
   * @param {string} model - Model identifier (provider/model)
   * @param {string} prompt - Prompt to send
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} - Query result
   */
  async query(model, prompt, options = {}) {
    const [provider, modelName] = model.includes('/') 
      ? model.split('/') 
      : [this.defaultProvider, model];
    
    return await this.executeWithProvider(provider, prompt, {
      ...options,
      model: modelName
    });
  }

  /**
   * Get provider status (health check)
   * @returns {Object} - Status for each provider
   */
  async getStatus() {
    const status = {};
    
    for (const [name, config] of Object.entries(PROVIDER_CONFIGS)) {
      const hasApiKey = !!process.env[config.apiKeyEnv];
      status[name] = {
        name: config.name,
        available: hasApiKey,
        models: config.models.length,
        apiKeyEnv: config.apiKeyEnv
      };
    }
    
    return status;
  }
}

/**
 * Create a provider client
 * @param {string} providerName - Provider name
 * @param {Object} options - Provider options
 * @returns {Object} - Provider client
 */
export function createProviderClient(providerName, options = {}) {
  const config = PROVIDER_CONFIGS[providerName];
  if (!config) {
    throw new Error(`Unknown provider: ${providerName}`);
  }

  return {
    name: providerName,
    config,
    
    async chat(prompt, options = {}) {
      const model = options.model || config.models[0];
      // Real implementation would call the API
      return {
        provider: providerName,
        model,
        response: `Response from ${providerName}/${model}`
      };
    },
    
    getModels() {
      return config.models;
    }
  };
}

// Export components
export { MultiProviderAgent, PROVIDER_CONFIGS };
export default MultiProviderAgent;

