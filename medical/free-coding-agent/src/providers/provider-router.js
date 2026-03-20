/**
 * PROVIDER ROUTER - Hybrid Inference Mesh
 * Routes between local (Ollama) and cloud (OpenAI, Groq) providers
 * Based on task complexity, capabilities, cost, and availability
 */

import { OllamaEndpoint } from './ollama-endpoint.js';
import { OpenAIEndpoint } from './openai-endpoint.js';
import { GroqEndpoint } from './groq-endpoint.js';
import { GeminiEndpoint } from './gemini-endpoint.js';
import { GeminiEndpoint } from './gemini-endpoint.js';

export class ProviderRouter {
  constructor(config = {}) {
    this.providers = new Map();

    // Local provider - Ollama (free, unlimited)
    this.providers.set('ollama', new OllamaEndpoint({
      endpoint: config.ollamaEndpoint || 'http://localhost:11434/api/generate',
      model: config.ollamaModel || 'llama3.1:8b',
      timeout: config.ollamaTimeout || 180000,
      enabled: config.ollamaEnabled !== false
    }));

    // Cloud provider - OpenAI (GPT-4, reliable) - RE-ENABLED for load balancing
    this.providers.set('openai', new OpenAIEndpoint({
      apiKey: config.openaiApiKey || process.env.OPENAI_API_KEY,
      model: config.openaiModel || 'gpt-4o-mini',
      timeout: config.openaiTimeout || 120000,
      enabled: config.openaiEnabled !== false  // Now enabled by default
    }));

    // Cloud provider - Groq (insanely fast, free tier)
    this.providers.set('groq', new GroqEndpoint({
      apiKey: config.groqApiKey || process.env.GROQ_API_KEY,
      model: config.groqModel || 'llama-3.3-70b-versatile',
      timeout: config.groqTimeout || 60000,
      enabled: config.groqEnabled !== false
    }));

    // Cloud provider - Gemini (Google Vertex AI, complex reasoning)
    this.providers.set('gemini', new GeminiEndpoint({
      projectId: config.gcpProjectId || process.env.GCP_PROJECT_ID,
      location: config.gcpLocation || process.env.GCP_LOCATION || 'us-central1',
      model: config.geminiModel || 'gemini-1.5-flash',
      timeout: config.geminiTimeout || 120000,
      enabled: config.geminiEnabled !== false
    }));

    // Routing preferences
    this.preferLocal = config.preferLocal !== false;
    this.enableFallback = config.enableFallback !== false;
    this.loadBalanceStrategy = config.loadBalanceStrategy || 'round_robin'; // New: load balancing
    this.requestCounter = 0; // Counter for round-robin

    // Task routing rules
    this.routingRules = {
      cloudPreferred: [
        'auto-fix',
        'auto-triage',
        'multi-agent-orchestration',
        'security-audit',
        'medical-analysis',
        'complex-reasoning',
        'high-precision-reasoning',
        'long-context-understanding'
      ],
      localPreferred: [
        'quick-chat',
        'simple-completion',
        'formatting',
        'translation'
      ],
      complexityThresholds: {
        useCloud: 0.7,
        maxLocalTokens: 2048
      }
    };

    // Metrics for each provider
    this.metrics = {
      ollama: { requests: 0, successes: 0, failures: 0, avgLatency: 0 },
      openai: { requests: 0, successes: 0, failures: 0, avgLatency: 0 },
      groq:   { requests: 0, successes: 0, failures: 0, avgLatency: 0 },
      gemini: { requests: 0, successes: 0, failures: 0, avgLatency: 0 }
    };
  }

  /**
   * Route a request to the best provider
   */
  async route(input, options = {}) {
    const routing = this.determineRouting(input, options);
    const providerName = routing.provider;
    const provider = this.providers.get(providerName);

    // Null-safe check
    if (!provider) {
      throw new Error(`Provider not found: ${providerName}`);
    }

    if (!provider.enabled) {
      // Try fallback
      const fallback = this.getFallback(providerName);
      if (fallback) {
        console.log(`[Router] Provider ${providerName} disabled, falling back to ${fallback}`);
        return this.route(input, { ...options, forceProvider: fallback });
      }
      throw new Error(`Provider ${providerName} is disabled and no fallback available`);
    }

    console.log(`[Router] Routing to ${providerName} (reason: ${routing.reason})`);
    const startTime = Date.now();

    try {
      const response = await provider.generate(input, options);
      this.updateMetrics(providerName, Date.now() - startTime, true);

      return {
        response,
        provider: providerName,
        routed: true,
        latency: Date.now() - startTime,
        fallback: routing.fallback || false
      };
    } catch (error) {
      this.updateMetrics(providerName, Date.now() - startTime, false);

      // Try fallback if enabled
      if (this.enableFallback && !options.forceProvider) {
        const fallback = this.getFallback(providerName);
        if (fallback) {
          console.log(`[Router] ${providerName} failed, falling back to ${fallback}`);
          return this.route(input, { ...options, forceProvider: fallback });
        }
      }

      throw error;
    }
  }

  /**
   * Determine the best provider for a given request
   */
  determineRouting(input, options = {}) {
    // Force specific provider if requested
    if (options.forceProvider && this.providers.has(options.forceProvider)) {
      return { provider: options.forceProvider, reason: 'forced' };
    }

    const task = this.analyzeTask(input, options);

    // Check explicit provider preference in options
    if (options.preferCloud || options.useCloud) {
      const openai = this.providers.get('openai');
      if (openai?.enabled) return { provider: 'openai', reason: 'cloud-preferred' };
      const groq = this.providers.get('groq');
      if (groq?.enabled) return { provider: 'groq', reason: 'cloud-preferred' };
    }

    if (options.preferLocal || options.useLocal) {
      const ollama = this.providers.get('ollama');
      if (ollama?.enabled) return { provider: 'ollama', reason: 'local-preferred' };
    }

    // Cloud-preferred task types (medical, security, complex)
    if (task.type && this.routingRules.cloudPreferred.includes(task.type)) {
      // Load balance between available cloud providers
      const availableCloud = [];
      const groq = this.providers.get('groq');
      const openai = this.providers.get('openai');
      
      if (groq?.enabled) availableCloud.push({ name: 'groq', provider: groq });
      if (openai?.enabled) availableCloud.push({ name: 'openai', provider: openai });
      
      if (availableCloud.length > 0) {
        // Apply load balancing strategy
        if (this.loadBalanceStrategy === 'round_robin' && availableCloud.length > 1) {
          const selectedIndex = (this.requestCounter++) % availableCloud.length;
          const selected = availableCloud[selectedIndex];
          return { provider: selected.name, reason: `load-balanced:${task.type}` };
        } else {
          // Default to first available
          return { provider: availableCloud[0].name, reason: `task-type:${task.type}` };
        }
      }
    }

    // Local-preferred task types (quick, simple)
    if (task.type && this.routingRules.localPreferred.includes(task.type)) {
      const ollama = this.providers.get('ollama');
      if (ollama?.enabled) return { provider: 'ollama', reason: `task-type:${task.type}` };
    }

    // Complexity-based routing
    if (task.complexity > this.routingRules.complexityThresholds.useCloud) {
      const groq = this.providers.get('groq');
      if (groq?.enabled) return { provider: 'groq', reason: `high-complexity:${task.complexity.toFixed(2)}` };
      const openai = this.providers.get('openai');
      if (openai?.enabled) return { provider: 'openai', reason: `high-complexity:${task.complexity.toFixed(2)}` };
    }

    // Token count routing
    if (task.estimatedTokens > this.routingRules.complexityThresholds.maxLocalTokens) {
      const groq = this.providers.get('groq');
      if (groq?.enabled) return { provider: 'groq', reason: `token-count:${task.estimatedTokens}` };
    }

    // Default: local-first strategy
    if (this.preferLocal) {
      const ollama = this.providers.get('ollama');
      if (ollama?.enabled) return { provider: 'ollama', reason: 'local-first-default' };
    }

    // Fallback chain: OpenAI -> Groq -> any available
    const openai = this.providers.get('openai');
    if (openai?.enabled) return { provider: 'openai', reason: 'fallback', fallback: true };

    const groq = this.providers.get('groq');
    if (groq?.enabled) return { provider: 'groq', reason: 'fallback', fallback: true };

    // No provider available
    throw new Error('No providers available');
  }

  /**
   * Analyze a task to determine complexity and type
   */
  analyzeTask(input, options = {}) {
    const task = {
      type: options.taskType || null,
      complexity: 0,
      estimatedTokens: 0
    };

    // Get text to analyze
    let text = '';
    if (typeof input === 'string') {
      text = input;
    } else if (input.prompt) {
      text = input.prompt;
    } else if (input.messages) {
      text = input.messages.map(m => m.content || '').join(' ');
    }

    // Estimate tokens (rough: 4 chars per token)
    task.estimatedTokens = Math.ceil(text.length / 4);

    // Calculate complexity based on heuristics
    let complexityScore = 0;

    // Length factor
    if (task.estimatedTokens > 1000) complexityScore += 0.2;
    if (task.estimatedTokens > 2000) complexityScore += 0.2;

    // Keyword analysis
    const complexKeywords = [
      'analyze', 'design', 'architect', 'refactor', 'debug',
      'security', 'audit', 'review', 'optimize', 'medical',
      'multi-agent', 'orchestrate', 'triage', 'diagnose', 'complex'
    ];

    const simpleKeywords = [
      'format', 'translate', 'summarize', 'list', 'quick',
      'simple', 'short', 'basic', 'easy'
    ];

    const lowerText = text.toLowerCase();

    for (const keyword of complexKeywords) {
      if (lowerText.includes(keyword)) complexityScore += 0.15;
    }

    for (const keyword of simpleKeywords) {
      if (lowerText.includes(keyword)) complexityScore -= 0.1;
    }

    // Code presence increases complexity
    if (text.includes('```') || text.includes('function') || text.includes('class ')) {
      complexityScore += 0.2;
    }

    // Detect task type from keywords
    if (!task.type) {
      if (lowerText.includes('fix') || lowerText.includes('debug')) task.type = 'auto-fix';
      else if (lowerText.includes('security') || lowerText.includes('audit')) task.type = 'security-audit';
      else if (lowerText.includes('medical') || lowerText.includes('clinical') || lowerText.includes('diagnosis')) task.type = 'medical-analysis';
      else if (lowerText.includes('orchestrat') || lowerText.includes('coordinate')) task.type = 'multi-agent-orchestration';
      else if (lowerText.includes('triage') || lowerText.includes('prioritize')) task.type = 'auto-triage';
    }

    task.complexity = Math.max(0, Math.min(1, complexityScore));

    return task;
  }

  /**
   * Get fallback provider name
   */
  getFallback(providerName) {
    if (providerName === 'ollama') return 'openai';
    if (providerName === 'openai') return 'groq';
    if (providerName === 'groq') return 'ollama';
    return null;
  }

  /**
   * Update provider metrics
   */
  updateMetrics(providerName, latency, success) {
    const metrics = this.metrics[providerName];
    if (!metrics) return;

    metrics.requests++;
    if (success) {
      metrics.successes++;
      metrics.avgLatency = (metrics.avgLatency * (metrics.successes - 1) + latency) / metrics.successes;
    } else {
      metrics.failures++;
    }
  }

  /**
   * Get provider status for dashboard
   */
  async getProviderStatus() {
    const status = {};

    for (const [name, provider] of this.providers) {
      // Null-safe access
      if (!provider) continue;

      const info = await provider.getModelInfo().catch(() => null);
      const health = await provider.healthCheck().catch(() => false);
      const metrics = this.metrics[name] || { requests: 0, successes: 0, failures: 0, avgLatency: 0 };

      status[name] = {
        enabled: provider.enabled || false,
        healthy: health,
        info: info || {},
        metrics: {
          ...metrics,
          successRate: metrics.requests > 0
            ? (metrics.successes / metrics.requests * 100).toFixed(1) + '%'
            : 'N/A'
        }
      };
    }

    return status;
  }

  /**
   * Enable or disable a specific provider
   */
  setProviderEnabled(name, enabled) {
    const provider = this.providers.get(name);
    if (provider) {
      provider.setEnabled(enabled);
    }
  }

  /**
   * Get the underlying provider instance
   */
  getProvider(name) {
    return this.providers.get(name);
  }
}

// Singleton instance
let routerInstance = null;

export function getRouter(config = {}) {
  if (!routerInstance) {
    routerInstance = new ProviderRouter(config);
  }
  return routerInstance;
}

export function resetRouter() {
  routerInstance = null;
}

export default ProviderRouter;
