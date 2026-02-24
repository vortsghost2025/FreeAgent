import { BaseProvider } from "./base.js";

export class GroqProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.name = "groq";
    this.model = config.model || "llama-3.3-70b-versatile";
    this.apiKey = config.apiKey || process.env.GROQ_API_KEY;
    this.baseUrl = "https://api.groq.com/openai/v1";
  }

  async *chat(message, options = {}) {
    const messages = [];
    if (options.systemPrompt !== false) {
      messages.push({ role: "system", content: this.getSystemPrompt() });
    }
    messages.push({ role: "user", content: message });
    yield* this.chatWithHistory(messages, options);
  }

  async *chatWithHistory(messages, options = {}) {
    if (!this.apiKey) {
      throw new Error(
        "GROQ_API_KEY not set. Get one at https://console.groq.com",
      );
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
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
      const error = await response.text();
      throw new Error(`Groq error: ${response.status} - ${error}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

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
            yield content;
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }

  async isAvailable() {
    return !!this.apiKey;
  }

  async listModels() {
    if (!this.apiKey) return [];

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.data?.map((m) => m.id) || [];
    } catch {
      return [];
    }
  }
}
