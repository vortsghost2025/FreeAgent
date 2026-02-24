/**
 * LM Studio Provider - FREE Local Inference
 *
 * LM Studio provides a local server compatible with OpenAI API format.
 * Run any GGUF model locally with zero cost.
 *
 * Default endpoint: http://localhost:1234/v1
 * Cost: $0 (runs locally)
 */

import { BaseProvider } from "./base.js";

export class LMStudioProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.name = "lmstudio";
    this.model = config.model || "local-model"; // LM Studio uses whatever model is loaded
    this.baseUrl =
      config.baseUrl || process.env.LMSTUDIO_URL || "http://localhost:1234/v1";

    // Track usage for metrics (always $0)
    this.requestCount = 0;
    this.tokensGenerated = 0;
  }

  /**
   * Get system prompt for coding tasks
   */
  getSystemPrompt() {
    return `You are an expert coding assistant. Your specialties include:
- Writing clean, efficient, well-documented code
- Medical coding and healthcare data standards (HL7, FHIR, OMOP)
- CDC/WHO compliance and HIPAA guidelines
- Database design, optimization, and SQL
- API development and integration
- Test-driven development and code review

Always provide clear explanations and follow best practices.`;
  }

  /**
   * Chat with single message
   */
  async *chat(message, options = {}) {
    const messages = [];
    if (options.systemPrompt !== false) {
      messages.push({ role: "system", content: this.getSystemPrompt() });
    }
    messages.push({ role: "user", content: message });
    yield* this.chatWithHistory(messages, options);
  }

  /**
   * Chat with message history (OpenAI-compatible API)
   */
  async *chatWithHistory(messages, options = {}) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: true,
        temperature: options.temperature ?? 0.7,
        top_p: options.topP ?? 0.9,
        max_tokens: options.maxTokens ?? 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LM Studio error: ${response.status} - ${errorText}`);
    }

    this.requestCount++;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let tokensThisRequest = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk
        .split("\n")
        .filter((line) => line.trim().startsWith("data:"));

      for (const line of lines) {
        const data = line.replace("data:", "").trim();
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            tokensThisRequest++;
            yield content;
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }

    this.tokensGenerated += tokensThisRequest;
  }

  /**
   * Check if LM Studio server is available
   */
  async isAvailable() {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: "GET",
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List loaded models in LM Studio
   */
  async listModels() {
    try {
      const response = await fetch(`${this.baseUrl}/models`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.data?.map((m) => m.id) || [];
    } catch {
      return [];
    }
  }

  /**
   * Get usage statistics
   */
  getUsageStats() {
    return {
      provider: "lmstudio",
      requestCount: this.requestCount,
      tokensGenerated: this.tokensGenerated,
      cost: 0, // Always free - local inference
      currentModel: this.model,
      endpoint: this.baseUrl,
    };
  }

  /**
   * Get health status
   */
  async getHealth() {
    const available = await this.isAvailable();
    const models = available ? await this.listModels() : [];

    return {
      status: available ? "healthy" : "unavailable",
      endpoint: this.baseUrl,
      modelsLoaded: models.length,
      models,
    };
  }
}

export default LMStudioProvider;
