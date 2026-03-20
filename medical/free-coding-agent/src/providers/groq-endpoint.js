/**
 * GROQ CLOUD MODEL ENDPOINT
 * Implements LocalModelEndpoint for Groq API
 * Insanely fast inference with Llama, Mixtral, etc.
 * Free tier available!
 */

import { LocalModelEndpoint } from "../local-agent-interface.js";

export class GroqEndpoint extends LocalModelEndpoint {
  constructor(config = {}) {
    super();
    // Groq API configuration
    this.apiKey = config.apiKey || process.env.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 || null;
    this.endpoint = config.endpoint || "https://api.groq.com/openai/v1/chat/completions";
    this.model = config.model || "llama-3.3-70b-versatile"; // Fast, capable default
    this.timeout = config.timeout || 60000; // 1 minute (Groq is FAST)
    this.enabled = config.enabled !== false && !!this.apiKey;
    this.cachedInfo = null;
    
    // Priority routing - Groq is fast and cheap
    this.priority = config.priority || 7; // Higher than Ollama (1)
    this.capabilities = config.capabilities || [
      'auto-fix',
      'auto-triage', 
      'code-generation',
      'complex-reasoning',
      'fast-response'
    ];
  }

  /**
   * Generate completion from Groq API (OpenAI-compatible)
   */
  async generate(input, options = {}) {
    if (!this.enabled) {
      throw new Error("Groq endpoint is disabled or missing API key");
    }

    if (!this.apiKey) {
      throw new Error("Groq API key is required. Set GROQ_API_KEY environment variable.");
    }

    // Build messages array based on input type
    let messages;
    if (typeof input === 'string') {
      messages = [{ role: 'user', content: input }];
    } else if (Array.isArray(input)) {
      messages = input;
    } else if (typeof input === 'object' && input.messages) {
      messages = input.messages;
    } else if (typeof input === 'object' && input.prompt) {
      messages = [{ role: 'user', content: input.prompt }];
    } else {
      throw new Error(`Groq generate() requires string, array, or object with prompt/messages`);
    }

    const model = options.model || this.model;
    console.log(`[Groq] Generating with model: ${model}`);
    console.log(`[Groq] Messages: ${messages.length} items`);

    const startTime = Date.now();

    try {
      const requestBody = {
        model: model,
        messages: messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 4096,
      };

      // Add system prompt if provided
      if (options.system) {
        requestBody.messages.unshift({
          role: 'system',
          content: options.system
        });
      }

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Groq] Error response:`, errorText);
        
        if (response.status === 401) {
          throw new Error(`Groq API key is invalid. Check your GROQ_API_KEY.`);
        }
        if (response.status === 429) {
          throw new Error(`Groq rate limit exceeded. Try again later.`);
        }
        
        throw new Error(`Groq API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // Extract response from OpenAI-compatible format
      const content = data.choices?.[0]?.message?.content || "";
      const usage = data.usage || {};
      const latency = Date.now() - startTime;
      
      console.log(`[Groq] Response: ${content.substring(0, 100)}...`);
      console.log(`[Groq] Latency: ${latency}ms (insanely fast!)`);
      console.log(`[Groq] Tokens: ${usage.total_tokens || 'N/A'}`);

      return content;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`Groq generation timed out after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Generate multiple completions in parallel
   */
  async generateBatch(prompts, options = {}) {
    if (!this.enabled) {
      throw new Error("Groq endpoint is disabled");
    }

    console.log(`[Groq] Batch generating ${prompts.length} prompts`);

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

    this.cachedInfo = {
      provider_id: 'groq',
      provider_type: 'cloud',
      endpoint: this.endpoint,
      model: this.model,
      available_models: [
        { id: 'llama-3.3-70b-versatile', description: 'Llama 3.3 70B - Best balance of speed and quality' },
        { id: 'llama-3.1-8b-instant', description: 'Llama 3.1 8B - Ultra fast' },
        { id: 'mixtral-8x7b-32768', description: 'Mixtral 8x7B - Large context' },
        { id: 'gemma2-9b-it', description: 'Gemma 2 9B - Google model' }
      ],
      max_tokens: 4096,
      context_window: 131072,
      cost_per_token: 0, // Free tier available!
      priority: this.priority,
      capabilities: this.capabilities,
      features: {
        streaming: true,
        fast_inference: true,
        free_tier: true
      }
    };

    return this.cachedInfo;
  }

  /**
   * Check if Groq API is accessible
   */
  async healthCheck() {
    if (!this.apiKey) {
      return false;
    }

    try {
      // Simple models list check
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(5000),
      });

      return response.ok;
    } catch (error) {
      console.error("[Groq] Health check failed:", error);
      return false;
    }
  }

  /**
   * Enable or disable this provider
   */
  setEnabled(enabled) {
    this.enabled = enabled && !!this.apiKey;
    console.log(`[Groq] Endpoint ${this.enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if this provider can handle a specific capability
   */
  hasCapability(capability) {
    return this.capabilities.includes(capability);
  }

  /**
   * Calculate routing score for a given task
   * Groq scores high for speed-critical tasks
   */
  getRoutingScore(task) {
    let score = 0;
    
    // Base score from priority
    score += this.priority;
    
    // Bonus for capability matches
    if (task.type && this.hasCapability(task.type)) {
      score += 5;
    }
    
    // Bonus for speed-critical tasks
    if (task.priority === 'speed' || task.fastResponse) {
      score += 10;
    }
    
    // Penalty if disabled
    if (!this.enabled) {
      score = 0;
    }
    
    return score;
  }
}

export default GroqEndpoint;
