// Local Model Client for Cloud Shell Cockpit
// Connects to local inference endpoint (S:\workspace on port 3847) or Ollama

class LocalModelClient {
  constructor(config = {}) {
    this.endpoint = config.endpoint || process.env.LOCAL_MODEL_URL || 'http://localhost:3847';
    this.model = config.model || 'llama3.1:8b';
    this.timeout = config.timeout || 120000;
  }

  async generate(messages, system) {
    // Convert messages to prompt format
    let prompt = '';
    if (system) {
      prompt += `System: ${system}\n\n`;
    }
    prompt += messages.map(m => `${m.role}: ${m.content}`).join('\n');
    prompt += '\nassistant: ';

    // Try S:\workspace /api/infer endpoint first
    try {
      const response = await fetch(`${this.endpoint}/api/infer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: this.model,
          temperature: 0.7,
          maxTokens: 2048
        }),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (response.ok) {
        const data = await response.json();
        return {
          text: data.response || '',
          tokens: data.tokens || data.eval_count || 0
        };
      }
    } catch (e) {
      console.log('[LocalModelClient] S:\\workspace endpoint failed, trying Ollama');
    }

    // Fallback to Ollama
    try {
      const ollamaMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      if (system) {
        ollamaMessages.unshift({ role: 'system', content: system });
      }

      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: ollamaMessages,
          temperature: 0.7,
          stream: false
        }),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (response.ok) {
        const data = await response.json();
        return {
          text: data.message?.content || '',
          tokens: data.eval_count || 0
        };
      }
    } catch (e) {
      console.error('[LocalModelClient] Ollama also failed:', e.message);
    }

    throw new Error('No local model available');
  }

  async healthCheck() {
    try {
      const response = await fetch(`${this.endpoint}/api/infer/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  isConfigured() {
    return !!this.endpoint;
  }

  getEndpoint() {
    return this.endpoint;
  }
}

module.exports = LocalModelClient;
