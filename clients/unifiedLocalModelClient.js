/**
 * Unified Local Model Client
 * 
 * Supports multiple local inference providers:
 * - LM Studio (v1 REST API at /api/v1/*)
 * - Ollama (REST API at /api/*)
 * - Custom S:\workspace endpoint (/api/infer)
 * 
 * Configuration:
 * - LOCAL_MODEL_PROVIDER: 'lm-studio', 'ollama', or 'workspace' (default: 'workspace')
 * - LM_STUDIO_URL: LM Studio base URL (default: http://localhost:1234)
 * - OLLAMA_HOST: Ollama host (default: http://localhost:11434)
 * - LOCAL_MODEL_URL: S:\workspace endpoint (default: http://localhost:3847)
 * - DEFAULT_MODEL: Default model name
 */

// Import or define LM Studio client inline
class LMStudioClient {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:1234';
    this.apiToken = config.apiToken || '';
    this.defaultModel = config.defaultModel || 'llama3.2:8b';
    this.timeout = config.timeout || 180000;
    this.debug = config.debug || false;
  }

  log(...args) {
    if (this.debug) console.log('[LMStudio]', ...args);
  }

  getHeaders() {
    const h = { 'Content-Type': 'application/json' };
    if (this.apiToken) h['Authorization'] = `Bearer ${this.apiToken}`;
    return h;
  }

  async chat(options) {
    const {
      messages, model = this.defaultModel, temperature = 0.7,
      maxTokens = 2048, contextLength, stream = false, onChunk
    } = options;

    if (!messages || !Array.isArray(messages)) throw new Error('messages required');

    const url = `${this.baseUrl}/api/v1/chat`;
    const body = { model, messages, temperature, max_tokens: maxTokens, stream };
    if (contextLength) body.context_length = contextLength;

    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), this.timeout);

    try {
      const res = await fetch(url, {
        method: 'POST', headers: this.getHeaders(),
        body: JSON.stringify(body), signal: ctrl.signal
      });
      clearTimeout(to);
      if (!res.ok) throw new Error(`Chat failed: ${res.status}`);
      const data = await res.json();
      return {
        success: true,
        message: data.message,
        model: data.model,
        done: data.done,
        metrics: { promptTokens: data.prompt_eval_count, completionTokens: data.eval_count }
      };
    } catch (e) {
      clearTimeout(to);
      this.log('Chat error:', e.message);
      throw e;
    }
  }

  async generate(prompt, opts = {}) {
    const r = await this.chat({ messages: [{ role: 'user', content: prompt }], ...opts });
    return r.message?.content || '';
  }

  async listModels() {
    const res = await fetch(`${this.baseUrl}/api/v1/models`, {
      headers: this.getHeaders(), signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) throw new Error(`List failed: ${res.status}`);
    const data = await res.json();
    return { success: true, models: data.data || [] };
  }

  async loadModel(opts = {}) {
    const { model = this.defaultModel } = opts;
    const res = await fetch(`${this.baseUrl}/api/v1/models/load`, {
      method: 'POST', headers: this.getHeaders(),
      body: JSON.stringify({ model }), signal: AbortSignal.timeout(this.timeout)
    });
    if (!res.ok) throw new Error(`Load failed: ${res.status}`);
    return { success: true, model };
  }

  async unloadModel(opts = {}) {
    const { model = this.defaultModel } = opts;
    const res = await fetch(`${this.baseUrl}/api/v1/models/unload`, {
      method: 'POST', headers: this.getHeaders(),
      body: JSON.stringify({ model }), signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) throw new Error(`Unload failed: ${res.status}`);
    return { success: true, model };
  }

  async health() {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/models`, {
        headers: this.getHeaders(), signal: AbortSignal.timeout(5000)
      });
      return { status: res.ok ? 'healthy' : 'unhealthy', provider: 'lm-studio', url: this.baseUrl };
    } catch (e) {
      return { status: 'unreachable', error: e.message, provider: 'lm-studio' };
    }
  }
}

/**
 * Unified Local Model Client
 * Routes requests to the appropriate provider
 */
class UnifiedLocalModelClient {
  constructor(config = {}) {
    // Provider selection: 'lm-studio', 'ollama', or 'workspace'
    this.provider = config.provider || process.env.LOCAL_MODEL_PROVIDER || 'workspace';
    this.defaultModel = config.defaultModel || process.env.DEFAULT_MODEL || 'llama3.2:8b';
    this.debug = config.debug || false;

    // Initialize clients for each provider
    this.lmStudio = new LMStudioClient({
      baseUrl: config.lmStudioUrl || process.env.LM_STUDIO_URL || 'http://localhost:1234',
      apiToken: config.lmStudioToken || process.env.LM_STUDIO_API_TOKEN,
      defaultModel: this.defaultModel,
      debug: this.debug
    });

    this.ollamaHost = config.ollamaHost || process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.workspaceUrl = config.workspaceUrl || process.env.LOCAL_MODEL_URL || 'http://localhost:3847';
    this.timeout = config.timeout || 180000;
  }

  log(...args) {
    if (this.debug) console.log('[UnifiedLocalModel]', this.provider, ...args);
  }

  /**
   * Get the active client based on provider
   */
  getClient() {
    switch (this.provider) {
      case 'lm-studio':
        return this.lmStudio;
      case 'ollama':
        return { 
          chat: this.ollamaChat.bind(this), 
          generate: this.ollamaGenerate.bind(this),
          listModels: this.ollamaListModels.bind(this),
          health: this.ollamaHealth.bind(this)
        };
      case 'workspace':
      default:
        return { 
          chat: this.workspaceChat.bind(this), 
          generate: this.workspaceGenerate.bind(this),
          listModels: this.workspaceListModels.bind(this),
          health: this.workspaceHealth.bind(this)
        };
    }
  }

  /**
   * Unified chat API - works with any provider
   */
  async chat(messages, options = {}) {
    const client = this.getClient();
    const opts = { ...options, model: options.model || this.defaultModel };
    
    // Convert to provider-specific format
    if (this.provider === 'lm-studio') {
      return client.chat({ messages, ...opts });
    } else if (this.provider === 'ollama') {
      const ollamaMsgs = messages.map(m => ({ role: m.role, content: m.content }));
      return client.chat({ messages: ollamaMsgs, ...opts });
    } else {
      // Workspace uses prompt format
      const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      return client.chat(prompt, opts.model);
    }
  }

  /**
   * Simple generate/prompt API
   */
  async generate(prompt, options = {}) {
    const client = this.getClient();
    const model = options.model || this.defaultModel;
    
    if (this.provider === 'lm-studio') {
      return client.generate(prompt, options);
    } else if (this.provider === 'ollama') {
      const res = await fetch(`${this.ollamaHost}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], stream: false }),
        signal: AbortSignal.timeout(this.timeout)
      });
      if (!res.ok) throw new Error(`Ollama failed: ${res.status}`);
      const data = await res.json();
      return { text: data.message?.content || '', tokens: data.eval_count || 0 };
    } else {
      return client.generate(prompt, model);
    }
  }

  /**
   * List available models
   */
  async listModels() {
    const client = this.getClient();
    return client.listModels();
  }

  /**
   * Health check
   */
  async health() {
    const client = this.getClient();
    return client.health();
  }

  // Ollama-specific methods
  async ollamaChat(opts) {
    const { messages, model = this.defaultModel, temperature = 0.7, maxTokens = 2048 } = opts;
    const res = await fetch(`${this.ollamaHost}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, temperature, stream: false }),
      signal: AbortSignal.timeout(this.timeout)
    });
    if (!res.ok) throw new Error(`Ollama failed: ${res.status}`);
    const data = await res.json();
    return { success: true, message: data.message, metrics: { completionTokens: data.eval_count } };
  }

  async ollamaGenerate(prompt, model) {
    const m = model || this.defaultModel;
    const res = await fetch(`${this.ollamaHost}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: m, prompt, stream: false }),
      signal: AbortSignal.timeout(this.timeout)
    });
    if (!res.ok) throw new Error(`Ollama failed: ${res.status}`);
    const data = await res.json();
    return { text: data.response || '', tokens: data.eval_count || 0 };
  }

  async ollamaListModels() {
    const res = await fetch(`${this.ollamaHost}/api/tags`);
    if (!res.ok) throw new Error(`Ollama list failed: ${res.status}`);
    const data = await res.json();
    return { success: true, models: data.models || [] };
  }

  async ollamaHealth() {
    try {
      const res = await fetch(`${this.ollamaHost}/api/tags`, { signal: AbortSignal.timeout(5000) });
      return { status: res.ok ? 'healthy' : 'unhealthy', provider: 'ollama', url: this.ollamaHost };
    } catch (e) {
      return { status: 'unreachable', error: e.message, provider: 'ollama' };
    }
  }

  // Workspace-specific methods
  async workspaceChat(prompt, model) {
    const m = model || this.defaultModel;
    const res = await fetch(`${this.workspaceUrl}/api/infer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model: m, temperature: 0.7, maxTokens: 2048 }),
      signal: AbortSignal.timeout(this.timeout)
    });
    if (!res.ok) throw new Error(`Workspace infer failed: ${res.status}`);
    const data = await res.json();
    return { text: data.response || '', tokens: data.tokens || 0 };
  }

  async workspaceGenerate(prompt, model) {
    return this.workspaceChat(prompt, model);
  }

  async workspaceListModels() {
    const res = await fetch(`${this.workspaceUrl}/api/infer/models`);
    if (!res.ok) throw new Error(`Workspace list failed: ${res.status}`);
    return res.json();
  }

  async workspaceHealth() {
    try {
      const res = await fetch(`${this.workspaceUrl}/api/infer/health`, { signal: AbortSignal.timeout(5000) });
      const data = res.ok ? await res.json() : { status: 'unhealthy' };
      return { ...data, provider: 'workspace', url: this.workspaceUrl };
    } catch (e) {
      return { status: 'unreachable', error: e.message, provider: 'workspace' };
    }
  }

  /**
   * Get current provider info
   */
  getProvider() {
    return {
      name: this.provider,
      defaultModel: this.defaultModel,
      timeout: this.timeout
    };
  }

  /**
   * Switch provider at runtime
   */
  setProvider(provider) {
    const valid = ['lm-studio', 'ollama', 'workspace'];
    if (!valid.includes(provider)) {
      throw new Error(`Invalid provider: ${provider}. Valid: ${valid.join(', ')}`);
    }
    this.provider = provider;
    this.log('Provider switched to:', provider);
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UnifiedLocalModelClient, LMStudioClient };
}
export { UnifiedLocalModelClient, LMStudioClient };
export default UnifiedLocalModelClient;
