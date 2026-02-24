/**
 * Cloudflare Workers AI Provider - FREE Tier
 *
 * Cloudflare provides free AI inference through Workers AI.
 * Free tier: 10,000 neurons/day (roughly 10,000 tokens)
 *
 * Models available: llama-2-7b, mistral-7b, and others
 * Cost: $0 within free tier limits
 */

import { BaseProvider } from "./base.js";

// Free models available on Cloudflare Workers AI
export const FREE_MODELS = {
  "@cf/meta/llama-2-7b-chat-int8": {
    name: "Llama 2 7B Chat (INT8)",
    neuronsPerToken: 1,
    maxTokens: 2048,
  },
  "@cf/mistral/mistral-7b-instruct-v0.1": {
    name: "Mistral 7B Instruct",
    neuronsPerToken: 1,
    maxTokens: 4096,
  },
  "@cf/meta/llama-3-8b-instruct": {
    name: "Llama 3 8B Instruct",
    neuronsPerToken: 1,
    maxTokens: 4096,
  },
  "@cf/microsoft/phi-2": {
    name: "Phi-2",
    neuronsPerToken: 1,
    maxTokens: 2048,
  },
  "@cf/qwen/qwen1.5-7b-chat-awq": {
    name: "Qwen 1.5 7B Chat",
    neuronsPerToken: 1,
    maxTokens: 4096,
  },
  "@cf/deepseek-ai/deepseek-coder-6.7b-instruct-awq": {
    name: "DeepSeek Coder 6.7B",
    neuronsPerToken: 1,
    maxTokens: 4096,
  },
  "@cf/thebloke/codellama-7b-instruct-awq": {
    name: "CodeLlama 7B Instruct",
    neuronsPerToken: 1,
    maxTokens: 4096,
  },
};

export class CloudflareAIProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.name = "cloudflare-ai";
    this.model = config.model || "@cf/meta/llama-3-8b-instruct";
    this.accountId =
      config.accountId || process.env.CLOUDFLARE_ACCOUNT_ID || "";
    this.apiKey = config.apiKey || process.env.CLOUDFLARE_API_KEY || "";

    // Rate limiting tracking (10,000 neurons/day free)
    this.neuronsUsed = 0;
    this.lastReset = Date.now();
    this.dailyNeuronLimit = config.dailyNeuronLimit || 10000;

    // Fallback models
    this.fallbackModels = Object.keys(FREE_MODELS);
    this.currentModelIndex = 0;
  }

  /**
   * Get base URL for Cloudflare Workers AI
   */
  getBaseUrl() {
    return `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run`;
  }

  /**
   * Get system prompt for coding tasks
   */
  getSystemPrompt() {
    return `You are an expert coding assistant. Your specialties include:
- Writing clean, maintainable code
- Medical coding and healthcare data standards
- CDC/WHO compliance and HIPAA guidelines
- Database optimization and SQL
- API development and integration

Provide clear, well-documented solutions with best practices.`;
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
    // Check if configured
    if (!this.accountId || !this.apiKey) {
      throw new Error(
        "Cloudflare AI requires CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_KEY environment variables",
      );
    }

    // Check rate limits
    this.checkRateLimits();

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };

    let lastError = null;

    // Try current model, then fallbacks
    for (
      let modelAttempt = 0;
      modelAttempt < this.fallbackModels.length;
      modelAttempt++
    ) {
      const modelToUse =
        this.fallbackModels[
          (this.currentModelIndex + modelAttempt) % this.fallbackModels.length
        ];
      const modelInfo = FREE_MODELS[modelToUse];

      try {
        const response = await fetch(`${this.getBaseUrl()}/${modelToUse}`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            messages,
            max_tokens: options.maxTokens ?? modelInfo?.maxTokens ?? 2048,
            temperature: options.temperature ?? 0.7,
            stream: false, // Cloudflare doesn't support streaming in the same way
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();

          // Handle rate limiting
          if (response.status === 429) {
            console.warn(
              `⚠️ Cloudflare AI rate limited on ${modelToUse}, trying next model...`,
            );
            lastError = new Error("Rate limited");
            continue;
          }

          throw new Error(
            `Cloudflare AI error: ${response.status} - ${errorText}`,
          );
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(
            `Cloudflare AI error: ${JSON.stringify(data.errors)}`,
          );
        }

        const generatedText = data.result?.response || "";

        // Estimate neurons used (roughly 1 per token)
        const tokensUsed = this.estimateTokens(generatedText);
        this.neuronsUsed += tokensUsed;

        // Yield the response (simulating streaming)
        const words = generatedText.split(" ");
        for (const word of words) {
          yield word + " ";
          await this.sleep(10);
        }

        return; // Success
      } catch (error) {
        lastError = error;
        console.warn(
          `⚠️ Cloudflare AI error with ${modelToUse}: ${error.message}`,
        );
      }
    }

    throw lastError || new Error("All Cloudflare AI models failed");
  }

  /**
   * Estimate token count (rough approximation)
   */
  estimateTokens(text) {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check and reset rate limits
   */
  checkRateLimits() {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    // Reset daily counter
    if (now - this.lastReset > dayMs) {
      this.neuronsUsed = 0;
      this.lastReset = now;
    }

    // Check if over limit
    if (this.neuronsUsed >= this.dailyNeuronLimit) {
      throw new Error(
        `Cloudflare AI daily neuron limit reached (${this.dailyNeuronLimit}). Resets in ${Math.ceil((this.lastReset + dayMs - now) / 3600000)} hours.`,
      );
    }
  }

  /**
   * Get remaining neurons for today
   */
  getRemainingNeurons() {
    this.checkRateLimits();
    return this.dailyNeuronLimit - this.neuronsUsed;
  }

  /**
   * Check if provider is available
   */
  async isAvailable() {
    if (!this.accountId || !this.apiKey) {
      return false;
    }

    try {
      return this.getRemainingNeurons() > 100; // Need at least 100 neurons for a request
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
      provider: "cloudflare-ai",
      neuronsUsedToday: this.neuronsUsed,
      dailyNeuronLimit: this.dailyNeuronLimit,
      remaining: this.dailyNeuronLimit - this.neuronsUsed,
      cost: 0, // Always free within limits
      currentModel: this.model,
    };
  }
}

export default CloudflareAIProvider;
