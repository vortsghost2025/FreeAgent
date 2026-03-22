/**
 * OPENAI CLOUD MODEL ENDPOINT
 * Implements LocalModelEndpoint for OpenAI API
 * Production-ready cloud inference with GPT-4, GPT-3.5, etc.
 */

import { LocalModelEndpoint } from "../local-agent-interface.js";

export class OpenAIEndpoint extends LocalModelEndpoint {
  constructor(config = {}) {
    super();
    // OpenAI API configuration
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || null;
    this.endpoint = config.endpoint || "https://api.openai.com/v1/chat/completions";
    this.model = config.model || "gpt-4o-mini"; // Fast, cheap default
    this.timeout = config.timeout || 120000; // 2 minutes
    this.enabled = config.enabled !== false && !!this.apiKey;
    this.cachedInfo = null;
    
    // Priority routing - OpenAI handles complex tasks
    this.priority = config.priority || 8; // Higher than Ollama (1), lower than Kilo (10)
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
   * Generate completion from OpenAI API
   * Supports both string prompts and chat message arrays
   */
  async generate(input, options = {}) {
    if (!this.enabled) {
      throw new Error("OpenAI endpoint is disabled or missing API key");
    }

    if (!this.apiKey) {
      throw new Error("OpenAI API key is required. Set OPENAI_API_KEY environment variable.");
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
      throw new Error(`OpenAI generate() requires string, array, or object with prompt/messages`);
    }

    const model = options.model || this.model;
    console.log(`[OpenAI] Generating with model: ${model}`);
    console.log(`[OpenAI] Messages: ${messages.length} items`);

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
        console.error(`[OpenAI] Error response:`, errorText);
        
        if (response.status === 401) {
          throw new Error(`OpenAI API key is invalid. Check your OPENAI_API_KEY.`);
        }
        if (response.status === 429) {
          throw new Error(`OpenAI rate limit exceeded. Try again later.`);
        }
        
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // Extract response from OpenAI format
      const content = data.choices?.[0]?.message?.content || "";
      const usage = data.usage || {};
      
      console.log(`[OpenAI] Response: ${content.substring(0, 100)}...`);
      console.log(`[OpenAI] Tokens used: ${usage.total_tokens || 'N/A'} (prompt: ${usage.prompt_tokens || 'N/A'}, completion: ${usage.completion_tokens || 'N/A'})`);

      return content;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`OpenAI generation timed out after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Generate multiple completions in parallel
   */
  async generateBatch(prompts, options = {}) {
    if (!this.enabled) {
      throw new Error("OpenAI endpoint is disabled");
    }

    console.log(`[OpenAI] Batch generating ${prompts.length} prompts`);

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
      provider_id: 'openai',
      provider_type: 'cloud',
      endpoint: this.endpoint,
      model: this.model,
      available_models: [
        { id: 'gpt-4o', description: 'Latest GPT-4 Optimized - best for complex tasks' },
        { id: 'gpt-4o-mini', description: 'Fast, cheap - good for most tasks' },
        { id: 'gpt-4-turbo', description: 'GPT-4 with larger context' },
        { id: 'gpt-3.5-turbo', description: 'Fast and economical' }
      ],
      max_tokens: 4096,
      context_window: 128000,
      cost_per_token: 0.0000025, // ~$2.50/1M tokens for gpt-4o-mini
      priority: this.priority,
      capabilities: this.capabilities,
      features: {
        streaming: true,
        function_calling: true,
        vision: true,
        json_mode: true
      }
    };

    return this.cachedInfo;
  }

  /**
   * Check if OpenAI API is accessible
   */
  async healthCheck() {
    if (!this.apiKey) {
      return false;
    }

    try {
      // Simple models list check
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(5000),
      });

      return response.ok;
    } catch (error) {
      console.error("[OpenAI] Health check failed:", error);
      return false;
    }
  }

  /**
   * Enable or disable this provider
   */
  setEnabled(enabled) {
    this.enabled = enabled && !!this.apiKey;
    console.log(`[OpenAI] Endpoint ${this.enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if this provider can handle a specific capability
   */
  hasCapability(capability) {
    return this.capabilities.includes(capability);
  }

  /**
   * Calculate routing score for a given task
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
      score += 8;
    }
    
    // Penalty if disabled
    if (!this.enabled) {
      score = 0;
    }
    
    return score;
  }
}

export default OpenAIEndpoint;
