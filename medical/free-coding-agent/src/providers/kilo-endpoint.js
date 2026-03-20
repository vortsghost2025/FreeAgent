/**
 * KILO CLOUD MODEL ENDPOINT
 * Implements LocalModelEndpoint for Kilo API
 * Cloud-based inference with auto-fix, auto-triage, multi-agent orchestration
 */

import { LocalModelEndpoint } from "../local-agent-interface.js";

export class KiloEndpoint extends LocalModelEndpoint {
  constructor(config = {}) {
    super();
    // Kilo API configuration
    this.apiKey = config.apiKey || process.env.KILO_API_KEY || null;
    // Try multiple possible endpoints - Kilo may use different domains
    this.endpoint = config.endpoint || process.env.KILO_ENDPOINT || "https://api.kilo.ai/v1/chat/completions";
    this.model = config.model || "kilo-primary";
    this.timeout = config.timeout || 300000; // 5 minutes for complex orchestration
    this.enabled = config.enabled !== false;
    this.cachedInfo = null;
    
    // Priority routing - Kilo handles complex tasks
    this.priority = config.priority || 10; // Higher than Ollama (1)
    this.capabilities = config.capabilities || [
      'auto-fix',
      'auto-triage', 
      'multi-agent-orchestration',
      'code-generation',
      'complex-reasoning',
      'medical-analysis',
      'security-audit'
    ];
  }

  /**
   * Generate completion from Kilo API
   * Supports both string prompts and chat message arrays
   */
  async generate(input, options = {}) {
    if (!this.enabled) {
      throw new Error("Kilo endpoint is disabled");
    }

    // Build request body based on input type
    let messages;
    if (typeof input === 'string') {
      // Simple string prompt
      messages = [{ role: 'user', content: input }];
    } else if (Array.isArray(input)) {
      // Already in message format
      messages = input;
    } else if (typeof input === 'object' && input.messages) {
      // Chat format with messages array
      messages = input.messages;
    } else if (typeof input === 'object' && input.prompt) {
      // Object with prompt field
      messages = [{ role: 'user', content: input.prompt }];
    } else {
      throw new Error(`Kilo generate() requires string, array, or object with prompt/messages`);
    }

    const model = options.model || this.model;
    console.log(`[Kilo] Generating with model: ${model}`);
    console.log(`[Kilo] Messages: ${messages.length} items`);

    try {
      const requestBody = {
        model: model,
        messages: messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 4096,
        stream: false,
      };

      // Add system prompt if provided
      if (options.system) {
        requestBody.messages.unshift({
          role: 'system',
          content: options.system
        });
      }

      const headers = {
        'Content-Type': 'application/json',
      };

      // Add API key if available
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Kilo] Error response:`, errorText);
        
        // If Kilo unavailable, suggest fallback
        if (response.status >= 500) {
          throw new Error(`Kilo API unavailable (${response.status}). Consider fallback to Ollama.`);
        }
        
        throw new Error(`Kilo API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // Extract response from OpenAI-compatible format
      const content = data.choices?.[0]?.message?.content || "";
      console.log(`[Kilo] Response: ${content.substring(0, 100)}...`);

      return content;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`Kilo generation timed out after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Generate multiple completions in parallel
   */
  async generateBatch(prompts, options = {}) {
    if (!this.enabled) {
      throw new Error("Kilo endpoint is disabled");
    }

    console.log(`[Kilo] Batch generating ${prompts.length} prompts`);

    const results = await Promise.all(
      prompts.map(prompt => this.generate(prompt, options))
    );

    return results;
  }

  /**
   * Get provider information and capabilities
   */
  async getModelInfo() {
    if (this.cachedInfo) {
      return this.cachedInfo;
    }

    // Kilo doesn't have a tags endpoint like Ollama
    // Return static info based on configuration
    this.cachedInfo = {
      provider_id: 'kilo',
      provider_type: 'cloud',
      endpoint: this.endpoint,
      model: this.model,
      available_models: [
        { id: 'kilo-primary', description: 'Primary Kilo model for general tasks' },
        { id: 'kilo-code', description: 'Specialized for code generation' },
        { id: 'kilo-medical', description: 'Medical/clinical analysis' },
        { id: 'kilo-security', description: 'Security audit and review' }
      ],
      max_tokens: 8192,
      context_window: 32768,
      cost_per_token: 0.0001, // Approximate
      priority: this.priority,
      capabilities: this.capabilities,
      features: {
        auto_fix: true,
        auto_triage: true,
        multi_agent: true,
        streaming: true,
        function_calling: true
      }
    };

    return this.cachedInfo;
  }

  /**
   * Check if Kilo API is accessible
   */
  async healthCheck() {
    try {
      // Simple ping to check connectivity
      const response = await fetch(this.endpoint.replace('/chat/completions', '/models'), {
        method: 'GET',
        headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {},
        signal: AbortSignal.timeout(5000),
      });

      return response.ok || response.status === 401; // 401 means endpoint exists, just needs auth
    } catch (error) {
      console.error("[Kilo] Health check failed:", error);
      return false;
    }
  }

  /**
   * Enable or disable this provider
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    console.log(`[Kilo] Endpoint ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if this provider can handle a specific capability
   */
  hasCapability(capability) {
    return this.capabilities.includes(capability);
  }

  /**
   * Calculate routing score for a given task
   * Higher score = more suitable for this provider
   */
  getRoutingScore(task) {
    let score = 0;
    
    // Base score from priority
    score += this.priority;
    
    // Bonus for capability matches
    if (task.type && this.hasCapability(task.type)) {
      score += 5;
    }
    
    // Bonus for complex tasks
    if (task.complexity === 'high') {
      score += 10;
    }
    
    // Penalty if disabled
    if (!this.enabled) {
      score = 0;
    }
    
    return score;
  }
}

export default KiloEndpoint;
