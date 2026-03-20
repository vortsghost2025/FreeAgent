/**
 * Enhanced Claude API Client for FreeAgent Cockpit
 * 
 * Features:
 * - Streaming support
 * - Automatic model fallback (Opus → Sonnet → Haiku → LM Studio)
 * - JSON mode / structured output
 * - Role-aware system prompts
 * - Token budgeting
 * - Safety-tier controls
 * - Telemetry hooks
 */

const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://localhost:1234';

class ClaudeClient {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.CLAUDE_API_KEY || '';
    this.endpoint = 'https://api.anthropic.com/v1/messages';
    this.primaryModel = config.model || process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';
    this.maxTokens = config.maxTokens || 4096;
    this.timeout = config.timeout || 60000; // 60 second default timeout
    this.fallbackEnabled = config.fallbackEnabled ?? true;
    this.fallbackChain = ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-5-haiku-20241022'];
    this.lmStudioFallback = config.lmStudioFallback ?? true;
    this.safetyTiers = { low: { temperature: 0.9 }, medium: { temperature: 0.7 }, high: { temperature: 0.5 } };
    this.currentSafetyTier = 'medium';
    this.telemetryCallback = config.onTelemetry || null;
    this.debug = config.debug || false;
  }

  log(...args) { if (this.debug) console.log('[ClaudeClient]', ...args); }
  telemetry(event, data) { if (this.telemetryCallback) this.telemetryCallback({ provider: 'claude', event, data }); }

  getSystemPrompt(role = 'assistant') {
    const p = {
      assistant: 'You are a helpful AI assistant.',
      coder: 'You are an expert programmer. Write clean, well-documented code.',
      planner: 'You are a strategic planner. Break down complex tasks into steps.',
      tester: 'You are a QA engineer. Write comprehensive tests.',
      reviewer: 'You are a code reviewer. Provide constructive feedback.',
      summarizer: 'You are a technical summarizer. Condense information clearly.'
    };
    return p[role] || p.assistant;
  }

  calculateBudget(messages, maxOutputTokens) {
    const chars = messages.reduce((s, m) => s + (m.content?.length || 0), 0);
    return { estimatedTokens: Math.ceil(chars / 4), wouldFit: true };
  }

  buildPayload(options) {
    const { messages, system, role, maxTokens, temperature, stream, jsonMode, schema, safetyTier } = options;
    const payload = {
      model: this.primaryModel,
      max_tokens: maxTokens || this.maxTokens,
      stream: stream || false,
      system: system || this.getSystemPrompt(role),
      messages: messages.map(m => ({ role: m.role, content: m.content }))
    };
    const s = this.safetyTiers[safetyTier || this.currentSafetyTier];
    payload.temperature = temperature ?? s.temperature;
    if (jsonMode || schema) payload.anthropic_beta = schema ? 'structured-outputs-2024-10-22' : 'json_mode';
    return payload;
  }

  async makeRequest(payload, modelOverride = null) {
    const body = { ...payload, model: modelOverride || this.primaryModel };
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': this.apiKey, 'anthropic-version': '2023-06-01', ...(body.anthropic_beta ? { 'anthropic-beta': body.anthropic_beta } : {}) },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`Claude API error: ${response.status}`);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Claude API timeout after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  async generate(options) {
    if (!this.apiKey) throw new Error('CLAUDE_API_KEY not configured');
    const { messages, system, role, maxTokens, temperature, stream, onChunk, jsonMode, schema, safetyTier } = options;
    const payload = this.buildPayload({ messages, system, role, maxTokens, temperature, stream, jsonMode, schema, safetyTier });
    this.telemetry('request_start', { model: this.primaryModel });

    try {
      if (stream && onChunk) return await this.handleStreaming(payload, onChunk);
      const response = await this.makeRequest(payload);
      const data = await response.json();
      this.telemetry('request_complete', { tokens: data.usage });
      return { text: data.content[0].text, tokens: data.usage.output_tokens + data.usage.input_tokens, model: data.model };
    } catch (error) {
      if (this.fallbackEnabled) return await this.tryFallback(payload, error);
      throw error;
    }
  }

  async handleStreaming(payload, onChunk) {
    const response = await this.makeRequest(payload);
    const reader = response.body.getReader(), decoder = new TextDecoder();
    let fullText = '', buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      for (const line of buffer.split('\n')) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try { const p = JSON.parse(line.slice(6)); if (p.delta?.text) { fullText += p.delta.text; onChunk(fullText); } } catch (e) {}
        }
      }
    }
    return { text: fullText, stream: true };
  }

  async tryFallback(payload, error) {
    for (const model of this.fallbackChain) {
      if (model === this.primaryModel) continue;
      try { const r = await this.makeRequest(payload, model); const d = await r.json(); return { text: d.content[0].text, fallback: true }; } catch (e) {}
    }
    if (this.lmStudioFallback) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        const prompt = payload.system + '\n\n' + payload.messages.map(m => `${m.role}: ${m.content}`).join('\n');
        const r = await fetch(`${LM_STUDIO_URL}/api/v1/chat`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ model: 'llama3.2:8b', messages: [{ role: 'user', content: prompt }], temperature: payload.temperature }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const d = await r.json(); return { text: d.message?.content || '', fallback: true };
      } catch (e) {}
    }
    throw error;
  }

  async generateSimple(prompt, options = {}) {
    return this.generate({ messages: [{ role: 'user', content: prompt }], ...options });
  }

  setSafetyTier(tier) { if (this.safetyTiers[tier]) this.currentSafetyTier = tier; }
  setTelemetry(cb) { this.telemetryCallback = cb; }
  isConfigured() { return !!this.apiKey; }
  getInfo() { return { provider: 'claude', model: this.primaryModel, configured: this.isConfigured() }; }
}

module.exports = ClaudeClient;
