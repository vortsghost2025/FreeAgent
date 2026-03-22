// Gemini Client for Cloud Shell Cockpit
// Connects to Google Gemini via Vertex AI for advanced reasoning

class GeminiClient {
  constructor(config = {}) {
    this.project = config.project || process.env.GCP_PROJECT || '';
    this.location = config.location || process.env.GCP_LOCATION || 'us-central1';
    this.model = config.model || 'gemini-1.5-pro';
    this.apiKey = config.apiKey || process.env.GEMINI_API_KEY || '';
  }

  getEndpoint() {
    // Use Vertex AI endpoint
    return `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.project}/locations/${this.location}/publishers/google/models/${this.model}:generateContent`;
  }

  async generate(messages, system) {
    if (!this.project && !this.apiKey) {
      throw new Error('GCP_PROJECT or GEMINI_API_KEY not configured');
    }

    // Convert messages to Gemini format
    const contents = [];
    
    // Add system as first message if provided
    if (system) {
      contents.push({
        role: 'user',
        parts: [{ text: system }]
      });
      contents.push({
        role: 'model',
        parts: [{ text: 'Understood.' }]
      });
    }

    // Add conversation history
    for (const msg of messages) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }

    const body = {
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
        topP: 0.95,
        topK: 40
      }
    };

    let endpoint = this.getEndpoint();
    let headers = {
      'Content-Type': 'application/json'
    };

    // If using API key directly (not Vertex AI)
    if (this.apiKey && !this.project) {
      endpoint = `https://generativelanguage.googleapis.com/v1/models/${this.model}:generateContent?key=${this.apiKey}`;
    } else if (this.project) {
      // Use Vertex AI with ADC or service account
      // In Cloud Shell, this will use the default credentials
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    
    // Extract text from response
    let text = '';
    if (data.candidates && data.candidates[0]?.content?.parts) {
      text = data.candidates[0].content.parts.map(p => p.text).join('');
    }

    return {
      text: text || 'No response generated',
      tokens: data.usageMetadata?.totalTokenCount || 0
    };
  }

  async healthCheck() {
    if (!this.project && !this.apiKey) {
      return false;
    }

    try {
      // Simple test - try to call the API with minimal request
      const response = await fetch(this.getEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
          generationConfig: { maxOutputTokens: 10 }
        }),
        signal: AbortSignal.timeout(10000)
      });
      
      // 400 means the API is reachable but request needs more tokens
      return response.ok || response.status === 400;
    } catch {
      return false;
    }
  }

  isConfigured() {
    return !!this.project || !!this.apiKey;
  }
}

module.exports = GeminiClient;
