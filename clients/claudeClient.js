// Claude API Client for Cloud Shell Cockpit
// Connects to Claude API for high-reliability reasoning

class ClaudeClient {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.CLAUDE_API_KEY || '';
    this.model = config.model || 'claude-3-5-sonnet-20241022';
    this.maxTokens = config.maxTokens || 4096;
    this.endpoint = 'https://api.anthropic.com/v1/messages';
  }

  async generate(messages, system) {
    if (!this.apiKey) {
      throw new Error('CLAUDE_API_KEY not configured');
    }

    const claudeMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const body = {
      model: this.model,
      max_tokens: this.maxTokens,
      system: system || 'You are a helpful AI assistant.',
      messages: claudeMessages
    };

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      text: data.content[0].text,
      tokens: data.usage.output_tokens + data.usage.input_tokens
    };
  }

  isConfigured() {
    return !!this.apiKey;
  }
}

module.exports = ClaudeClient;
