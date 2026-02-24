/**
 * OpenRouter Provider - FREE Tier
 *
 * OpenRouter provides access to multiple free models through a single API.
 * Free models include: mistral-7b-instruct, llama-3-8b-instruct, phi-3-mini
 *
 * Rate limits vary by model but are generally generous for free tier.
 * Cost: $0 for free tier models
 */

import { BaseProvider } from "./base.js";

// Free models available on OpenRouter (no API key required for some)
export const FREE_MODELS = {
  "mistralai/mistral-7b-instruct:free": {
    name: "Mistral 7B Instruct",
    contextLength: 32768,
    inputCost: 0,
    outputCost: 0,
  },
  "meta-llama/llama-3-8b-instruct:free": {
    name: "Llama 3 8B Instruct",
    contextLength: 8192,
    inputCost: 0,
    outputCost: 0,
  },
  "microsoft/phi-3-mini-128k-instruct:free": {
    name: "Phi-3 Mini 128K",
    contextLength: 128000,
    inputCost: 0,
    outputCost: 0,
  },
  "google/gemma-7b-it:free": {
    name: "Gemma 7B IT",
    contextLength: 8192,
    inputCost: 0,
    outputCost: 0,
  },
  "openchat/openchat-7b:free": {
    name: "OpenChat 7B",
    contextLength: 8192,
    inputCost: 0,
    outputCost: 0,
  },
  "huggingfaceh4/zephyr-7b-beta:free": {
    name: "Zephyr 7B Beta",
    contextLength: 4096,
    inputCost: 0,
    outputCost: 0,
  },
};

export class OpenRouterProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.name = "openrouter";
    this.model = config.model || "mistralai/mistral-7b-instruct:free";
    this.apiKey = config.apiKey || process.env.OPENROUTER_API_KEY || "";
    this.baseUrl = "https://openrouter.ai/api/v1";

    // Rate limiting tracking
    this.requestCount = 0;
    this.lastReset = Date.now();
    this.dailyLimit = config.dailyLimit || 200; // Conservative estimate for free tier

    // Fallback models in order of preference
    this.fallbackModels = Object.keys(FREE_MODELS);
    this.currentModelIndex = 0;
  }

  /**
   * Get system prompt for coding tasks
   */
  getSystemPrompt() {
    return `You are an expert coding assistant. You help with:
- Writing clean, efficient code
- Debugging and fixing errors
- Code review and optimization
- Medical coding and CDC/WHO compliance
- Database design and SQL optimization

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
   * Chat with message history
   */
  async *chatWithHistory(messages, options = {}) {
    // Check rate limits
    this.checkRateLimits();

    const headers = {
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000", // Required by OpenRouter
      "X-Title": "Free Coding Agent",
    };

    // Add API key if available (some free models work without it)
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    let lastError = null;

    // Try current model, then fallbacks
    for (let attempt = 0; attempt < this.fallbackModels.length; attempt++) {
      const modelToUse =
        this.fallbackModels[
          (this.currentModelIndex + attempt) % this.fallbackModels.length
        ];

      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: modelToUse,
            messages,
            stream: true,
            temperature: options.temperature ?? 0.7,
            top_p: options.topP ?? 0.9,
            max_tokens: options.maxTokens ?? 4096,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();

          // If rate limited, try next model
          if (response.status === 429) {
            console.warn(
              `⚠️ OpenRouter rate limited on ${modelToUse}, trying next model...`,
            );
            lastError = new Error(`Rate limited: ${errorText}`);
            continue;
          }

          throw new Error(
            `OpenRouter error: ${response.status} - ${errorText}`,
          );
        }

        this.requestCount++;

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

        // Success - return
        return;
      } catch (error) {
        lastError = error;
        console.warn(
          `⚠️ OpenRouter error with ${modelToUse}: ${error.message}`,
        );
      }
    }

    // All models failed
    throw lastError || new Error("All OpenRouter free models failed");
  }

  /**
   * Check and reset rate limits
   */
  checkRateLimits() {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    // Reset daily counter
    if (now - this.lastReset > dayMs) {
      this.requestCount = 0;
      this.lastReset = now;
    }

    // Check if over limit
    if (this.requestCount >= this.dailyLimit) {
      throw new Error(
        `OpenRouter daily limit reached (${this.dailyLimit} requests). Resets in ${Math.ceil((this.lastReset + dayMs - now) / 3600000)} hours.`,
      );
    }
  }

  /**
   * Get remaining requests for today
   */
  getRemainingRequests() {
    this.checkRateLimits();
    return this.dailyLimit - this.requestCount;
  }

  /**
   * Check if provider is available
   */
  async isAvailable() {
    try {
      // OpenRouter is generally available, check if we have requests left
      return this.getRemainingRequests() > 0;
    } catch {
      return false;
    }
  }

  /**
   * List available free models
   */
  async listModels() {
    return Object.keys(FREE_MODELS);
  }

  /**
   * Get model info
   */
  getModelInfo(modelId) {
    return FREE_MODELS[modelId] || null;
  }

  /**
   * Get usage statistics
   */
  getUsageStats() {
    return {
      provider: "openrouter",
      requestsToday: this.requestCount,
      dailyLimit: this.dailyLimit,
      remaining: this.dailyLimit - this.requestCount,
      cost: 0, // Always free
      currentModel: this.model,
    };
  }
}

export default OpenRouterProvider;
