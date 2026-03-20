/**
 * Enhanced Claude API Client for FreeAgent
 * 
 * Features:
 * - Streaming support
 * - Automatic model fallback (Opus → Sonnet → Haiku → LM Studio)
 * - JSON mode / structured output
 * - Role-aware system prompts
 * - Token budgeting
 * - Safety-tier controls
 * - Telemetry hooks for cockpit
 * 
 * Configuration:
 * - CLAUDE_API_KEY: Anthropic API key
 * - CLAUDE_MODEL: Primary model (default: claude-3-5-sonnet-20241022)
 * - FALLBACK_ENABLED: Enable auto-fallback (default: true)
 */

const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://localhost:1234';

class ClaudeClient {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.CLAUDE_API_KEY || '';
    this.endpoint = 'https://api.anthropic.com/v1/messages';
    
    // Model configuration
    this.primaryModel = config.model || process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';
    this.maxTokens = config.maxTokens || 4096;
    this.temperature = config.temperature || 0.7;
    
    // Fallback chain
    this.fallbackEnabled = config.fallbackEnabled ?? process.env.FALLBACK_ENABLED !== 'false';
    this.fallbackChain = [
      'claude-3-5-sonnet-20241022',
      'claude-3-opus-20240229',
      'claude-3-5-haiku-20241022',
      'claude-3-haiku-20240307'
    ];
    
    // LM Studio fallback client
    this.lmStudioFallback = config.lmStudioFallback ?? true;
    
    // Safety tiers
    this.safetyTiers = {
      low: { temperature: 0.9, top_p: 0.95 },
      medium: { temperature: 0.7, top_p: 0.9 },
      high: { temperature: 0.5, top_p: 0.85 }
    };
    this.currentSafetyTier = config.safetyTier || 'medium';
    
    // Telemetry
    this.telemetryCallback = config.onTelemetry || null;
    
    // Debug
    this.debug = config.debug || false;
  }

  log(...args) {
    if (this.debug) console.log('[ClaudeClient]', ...args);
  }

  /**
   * Send telemetry event
   */
  telemetry(event, data) {
    if (this.telemetryCallback) {
      this.telemetryCallback({ provider: 'claude', event, data, timestamp: Date.now() });
    }
  }

  /**
   * Get role-aware system prompt
   */
  getSystemPrompt(role = 'assistant') {
    const prompts = {
      assistant: 'You are a helpful AI assistant. Provide clear, accurate, and concise responses.',
      coder: `You are an expert programmer. Write clean, well-documented code. 
- Prefer modern JavaScript/TypeScript patterns
- Include comments for complex logic
- Handle errors gracefully
- Return only code unless asked otherwise`,
      planner: `You are a strategic planner. Break down complex tasks into steps.
- Analyze requirements carefully
- Identify dependencies and edge cases
- Provide clear action plans
- Consider tradeoffs`,
      tester: `You are a QA engineer. Write comprehensive tests.
- Test edge cases and error conditions
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Keep tests independent`,
      reviewer: `You are a code reviewer. Provide constructive feedback.
- Focus on correctness, security, performance
- Suggest specific improvements
- Be respectful but direct
- Explain why changes are needed`,
      summarizer: `You are a technical summarizer. Condense information clearly.
- Extract key points
- Use bullet points for lists
- Keep explanations brief
- Prioritize actionable info`
    };
    return prompts[role] || prompts.assistant;
  }

  /**
   * Calculate token budget
   */
  calculateBudget(messages, maxOutputTokens) {
    const inputChars = messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);
    const estimatedInputTokens = Math.ceil(inputChars / 4);
    const contextLimit = 200000;
    const availableForInput = contextLimit - maxOutputTokens - 1000;
    return {
      estimatedInputTokens,
      maxOutputTokens,
      totalLimit: contextLimit,
      wouldFit: estimatedInputTokens < availableForInput
    };
  }

  /**
   * Build request payload
   */
  buildPayload(options) {
    const {
      messages, system, role = 'assistant', maxTokens, temperature,
      stream = false, jsonMode = false, schema = null, safetyTier = null
    } = options;

    const payload = {
      model: this.primaryModel,
      max_tokens: maxTokens || this.maxTokens,
      stream,
      messages: messages.map(m => ({ role: m.role, content: m.content }))
    };

    payload.system = system || this.getSystemPrompt(role);
    
    const safetySettings = this.safetyTiers[safetyTier || this.currentSafetyTier];
    payload.temperature = temperature ?? safetySettings.temperature;
    payload.top_p = safetySettings.top_p;

    if (jsonMode || schema) {
      payload.anthropic_beta = schema ? 'structured-outputs-2024-10-22' : 'json_mode';
      if (schema) payload.schema = schema;
    }

    return payload;
  }

  /**
   * Make API request
   */
  async makeRequest(payload, modelOverride = null) {
    const model = modelOverride || this.primaryModel;
    const body = { ...payload, model };
    
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        ...(body.anthropic_beta ? { 'anthropic-beta': body.anthropic_beta } : {})
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${error}`);
    }

    return response;
  }

  /**
   * Generate response
   */
  async generate(options) {
    if (!this.apiKey) throw new Error('CLAUDE_API_KEY not configured');

    const { messages, system, role = 'assistant', maxTokens, temperature,
      stream = false, onChunk, jsonMode = false, schema = null, safetyTier = null } = options;

    const budget = this.calculateBudget(messages, maxTokens || this.maxTokens);
    this.telemetry('token_budget', budget);

    const payload = this.buildPayload({
      messages, system, role, maxTokens, temperature, stream, jsonMode, schema, safetyTier
    });

    this.telemetry('request_start', { model: this.primaryModel, messageCount: messages.length });

    try {
      if (stream && onChunk) return await this.handleStreaming(payload, onChunk);

      const response = await this.makeRequest(payload);
      const data = await response.json();

      this.telemetry('request_complete', { 
        model: data.model,
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens
      });

      return {
        text: data.content[0].text,
        tokens: data.usage.output_tokens + data.usage.input_tokens,
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
        model: data.model,
        stopReason: data.stop_reason
      };

    } catch (error) {
      this.telemetry('request_error', { error: error.message, model: this.primaryModel });
      if (this.fallbackEnabled && error.message.includes('API error')) {
        return await this.tryFallback(payload, error);
      }
      throw error;
    }
  }

  /**
   * Handle streaming
   */
  async handleStreaming(payload, onChunk) {
    const response = await this.makeRequest(payload);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta') {
              const text = parsed.delta?.text || '';
              fullText += text;
              onChunk({ type: 'chunk', text, fullText });
            } else if (parsed.type === 'message_delta') {
              onChunk({ type: 'usage', tokens: parsed.usage });
            }
          } catch (e) {}
        }
      }
    }

    return { text: fullText, stream: true };
  }

  /**
   * Try fallback models
   */
  async tryFallback(originalPayload, originalError) {
    for (const model of this.fallbackChain) {
      if (model === this.primaryModel) continue;
      try {
        this.log(`Trying fallback: ${model}`);
        this.telemetry('fallback_attempt', { model });
        const response = await this.makeRequest(originalPayload, model);
        const data = await response.json();
        this.telemetry('fallback_success', { model });
        return {
          text: data.content[0].text,
          tokens: data.usage.output_tokens + data.usage.input_tokens,
          model: data.model,
          fallback: true
        };
      } catch (e) {
        this.log(`Fallback ${model} failed:`, e.message);
      }
    }

    if (this.lmStudioFallback) {
      this.log('Trying LM Studio fallback...');
      this.telemetry('lm_studio_fallback', {});
      try {
        return await this.lmStudioGenerate(originalPayload);
      } catch (e) {
        this.log('LM Studio fallback failed:', e.message);
      }
    }

    throw originalError;
  }

  /**
   * LM Studio fallback
   */
  async lmStudioGenerate(payload) {
    const prompt = payload.system + '\n\n' + 
      payload.messages.map(m => `${m.role}: ${m.content}`).join('\n');

    const response = await fetch(`${LM_STUDIO_URL}/api/v1/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2:8b',
        messages: [{ role: 'user', content: prompt }],
        temperature: payload.temperature,
        max_tokens: payload.max_tokens
      })
    });

    if (!response.ok) throw new Error(`LM Studio fallback failed: ${response.status}`);
    const data = await response.json();
    return {
      text: data.message?.content || '',
      tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      model: 'lm-studio-fallback',
      fallback: true
    };
  }

  /**
   * Simple generate
   */
  async generateSimple(prompt, options = {}) {
    return this.generate({ messages: [{ role: 'user', content: prompt }], ...options });
  }

  /**
   * JSON mode
   */
  async generateJSON(messages, schema, system) {
    return this.generate({
      messages,
      system: system || 'Respond with valid JSON only.',
      schema,
      jsonMode: true
    });
  }

  /**
   * Set safety tier
   */
  setSafetyTier(tier) {
    if (this.safetyTiers[tier]) this.currentSafetyTier = tier;
  }

  /**
   * Set telemetry callback
   */
  setTelemetry(callback) {
    this.telemetryCallback = callback;
  }

  isConfigured() {
    return !!this.apiKey;
  }

  getInfo() {
    return {
      provider: 'claude',
      primaryModel: this.primaryModel,
      fallbackEnabled: this.fallbackEnabled,
      safetyTier: this.currentSafetyTier,
      configured: this.isConfigured()
    };
  }
}

module.exports = ClaudeClient;
