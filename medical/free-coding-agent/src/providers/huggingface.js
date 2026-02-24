/**
 * HuggingFace Inference API Provider - FREE Tier
 *
 * HuggingFace provides free inference API for many open-source models.
 * Rate limits apply but are generous for personal use.
 *
 * Cost: $0 for free tier
 */

import { BaseProvider } from "./base.js";

// Free models available on HuggingFace Inference API
export const FREE_MODELS = {
  "mistralai/Mistral-7B-Instruct-v0.2": {
    name: "Mistral 7B Instruct v0.2",
    task: "text-generation",
    maxTokens: 4096,
  },
  "microsoft/Phi-3-mini-4k-instruct": {
    name: "Phi-3 Mini 4K",
    task: "text-generation",
    maxTokens: 4096,
  },
  "google/gemma-7b-it": {
    name: "Gemma 7B IT",
    task: "text-generation",
    maxTokens: 2048,
  },
  "HuggingFaceH4/zephyr-7b-beta": {
    name: "Zephyr 7B Beta",
    task: "text-generation",
    maxTokens: 4096,
  },
  "codellama/CodeLlama-7b-Instruct-hf": {
    name: "CodeLlama 7B Instruct",
    task: "text-generation",
    maxTokens: 4096,
  },
  "bigcode/starcoder2-7b": {
    name: "StarCoder2 7B",
    task: "text-generation",
    maxTokens: 4096,
  },
  "Qwen/Qwen2-7B-Instruct": {
    name: "Qwen2 7B Instruct",
    task: "text-generation",
    maxTokens: 4096,
  },
};

export class HuggingFaceProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.name = "huggingface";
    this.model = config.model || "mistralai/Mistral-7B-Instruct-v0.2";
    this.apiKey =
      config.apiKey ||
      process.env.HUGGINGFACE_API_KEY ||
      process.env.HF_TOKEN ||
      "";
    this.baseUrl = "https://api-inference.huggingface.co/models";

    // Rate limiting tracking
    this.requestCount = 0;
    this.lastReset = Date.now();
    this.hourlyLimit = config.hourlyLimit || 100; // Conservative estimate

    // Retry configuration
    this.maxRetries = 3;
    this.retryDelay = 2000;

    // Fallback models
    this.fallbackModels = Object.keys(FREE_MODELS);
    this.currentModelIndex = 0;
  }

  /**
   * Get system prompt for coding tasks
   */
  getSystemPrompt() {
    return `You are an expert coding assistant specializing in:
- Clean, efficient code development
- Medical coding and healthcare data standards
- CDC/WHO compliance and HIPAA guidelines
- Database design and optimization
- API development and integration

Provide clear, well-documented solutions.`;
  }

  /**
   * Format messages for HuggingFace text-generation
   */
  formatPrompt(messages) {
    // HuggingFace uses a simple prompt format
    let prompt = "";

    for (const msg of messages) {
      if (msg.role === "system") {
        prompt += `<|system|>\n${msg.content}\n`;
      } else if (msg.role === "user") {
        prompt += `<|user|>\n${msg.content}\n`;
      } else if (msg.role === "assistant") {
        prompt += `<|assistant|>\n${msg.content}\n`;
      }
    }

    prompt += "<|assistant|>\n";
    return prompt;
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

    const prompt = this.formatPrompt(messages);

    const headers = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

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

      // Retry logic for each model
      for (let retry = 0; retry < this.maxRetries; retry++) {
        try {
          const response = await fetch(`${this.baseUrl}/${modelToUse}`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              inputs: prompt,
              parameters: {
                max_new_tokens:
                  options.maxTokens ?? modelInfo?.maxTokens ?? 2048,
                temperature: options.temperature ?? 0.7,
                top_p: options.topP ?? 0.9,
                do_sample: true,
                return_full_text: false,
              },
              options: {
                wait_for_model: true,
                use_cache: true,
              },
            }),
          });

          // Handle model loading (503)
          if (response.status === 503) {
            const data = await response.json();
            if (data.estimated_time) {
              console.log(
                `⏳ Model ${modelToUse} loading, waiting ${Math.ceil(data.estimated_time)}s...`,
              );
              await this.sleep(Math.min(data.estimated_time * 1000, 30000));
              continue; // Retry
            }
          }

          // Handle rate limiting (429)
          if (response.status === 429) {
            console.warn(
              `⚠️ HuggingFace rate limited on ${modelToUse}, trying next model...`,
            );
            lastError = new Error("Rate limited");
            break; // Try next model
          }

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
              `HuggingFace error: ${response.status} - ${errorText}`,
            );
          }

          this.requestCount++;

          const data = await response.json();

          // Handle different response formats
          let generatedText = "";
          if (Array.isArray(data)) {
            generatedText = data[0]?.generated_text || "";
          } else if (data.generated_text) {
            generatedText = data.generated_text;
          } else if (typeof data === "string") {
            generatedText = data;
          }

          // Clean up the response
          generatedText = this.cleanResponse(generatedText);

          // Yield the response (simulating streaming)
          const words = generatedText.split(" ");
          for (const word of words) {
            yield word + " ";
            await this.sleep(10); // Small delay to simulate streaming
          }

          return; // Success
        } catch (error) {
          lastError = error;
          console.warn(
            `⚠️ HuggingFace error with ${modelToUse} (attempt ${retry + 1}): ${error.message}`,
          );

          if (retry < this.maxRetries - 1) {
            await this.sleep(this.retryDelay * (retry + 1));
          }
        }
      }
    }

    throw lastError || new Error("All HuggingFace models failed");
  }

  /**
   * Clean up model response
   */
  cleanResponse(text) {
    // Remove any remaining special tokens
    text = text.replace(/<\|[^|]+\|>/g, "");
    // Remove leading/trailing whitespace
    text = text.trim();
    return text;
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
    const hourMs = 60 * 60 * 1000;

    // Reset hourly counter
    if (now - this.lastReset > hourMs) {
      this.requestCount = 0;
      this.lastReset = now;
    }

    // Check if over limit
    if (this.requestCount >= this.hourlyLimit) {
      throw new Error(
        `HuggingFace hourly limit reached (${this.hourlyLimit} requests). Resets in ${Math.ceil((this.lastReset + hourMs - now) / 60000)} minutes.`,
      );
    }
  }

  /**
   * Get remaining requests for this hour
   */
  getRemainingRequests() {
    this.checkRateLimits();
    return this.hourlyLimit - this.requestCount;
  }

  /**
   * Check if provider is available
   */
  async isAvailable() {
    try {
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
      provider: "huggingface",
      requestsThisHour: this.requestCount,
      hourlyLimit: this.hourlyLimit,
      remaining: this.hourlyLimit - this.requestCount,
      cost: 0, // Always free
      currentModel: this.model,
    };
  }
}

export default HuggingFaceProvider;
