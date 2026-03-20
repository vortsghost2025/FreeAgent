// Minimax API Client for FreeAgent
// Supports minimax models via OpenAI-compatible API
// API Docs: https://platform.minimax.io/docs/api-reference/text-openai-api

class MinimaxClient {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.MINIMAX_API_KEY || '';
    this.baseURL = config.baseURL || process.env.MINIMAX_BASE_URL || 'https://api.minimax.io/v1';
    this.model = config.model || config.defaultModel || 'MiniMax-M2.5';
    this.timeout = config.timeout || 120000;
  }

  async generate(messages, system) {
    // Early validation - check if API key is configured
    if (!this.apiKey) {
      console.error('[MinimaxClient] API key not configured');
      return { text: 'Minimax API key not configured', agent: 'minimax', error: true };
    }

    // Build messages array with system prompt
    const allMessages = [];
    if (system) {
      allMessages.push({ role: 'system', content: system });
    }
    allMessages.push(...messages.map(m => ({
      role: m.role,
      content: m.content
    })));

    // Build request body for Minimax API (OpenAI-compatible)
    const requestBody = {
      model: this.model,
      messages: allMessages,
      temperature: 0.7,
      max_tokens: 4096,
      stream: false
    };

    console.log(`[MinimaxClient] Calling model: ${this.model} at ${this.baseURL}`);

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[MinimaxClient] API error ${response.status}:`, errorText);
        throw new Error(`Minimax API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // Extract response content (OpenAI-compatible format)
      // Handle content with <reasoning> tags
      let content = data.choices?.[0]?.message?.content || '';
      
      // Strip reasoning tags if present
      content = content.replace(/<reasoning>.*?<\/reasoning>/g, '').trim();
      
      const tokens = data.usage?.total_tokens || 0;

      return {
        text: content,
        tokens: tokens
      };
    } catch (error) {
      console.error('[MinimaxClient] Request failed:', error.message);
      throw error;
    }
  }

  async healthCheck() {
    if (!this.apiKey) {
      return false;
    }
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  isConfigured() {
    return !!this.apiKey;
  }

  getEndpoint() {
    return this.baseURL;
  }
}

module.exports = MinimaxClient;
