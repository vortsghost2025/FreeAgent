/**
 * OLLAMA LOCAL MODEL ENDPOINT
 * Implements LocalModelEndpoint for Ollama
 * Zero-cost local model provider
 */

import { LocalModelEndpoint } from "../local-agent-interface.js";

export class OllamaEndpoint extends LocalModelEndpoint {
  constructor(config = {}) {
    super();
    this.endpoint = config.endpoint || "http://localhost:11434/api/generate";
    this.model = config.model || "llama3.1:8b";
    this.timeout = config.timeout || 180000; // 3 minutes for multi-agent orchestration
    this.enabled = config.enabled !== false;
    this.cachedInfo = null;
  }

  async generate(input, options = {}) {
    if (!this.enabled) {
      throw new Error("Ollama endpoint is disabled");
    }

    // Handle both object format {prompt, model} and string format
    let prompt;
    let modelOverride;
    if (typeof input === 'object' && input !== null) {
      prompt = input.prompt;
      modelOverride = input.model;
    } else {
      prompt = input;
    }
    
    // Ensure prompt is a string
    if (typeof prompt !== 'string') {
      console.error('[Ollama] Invalid prompt type:', typeof prompt, prompt);
      throw new Error(`Ollama generate() requires prompt to be a string, got: ${typeof prompt}`);
    }

    const model = modelOverride || this.model;
    console.log(`[Ollama] Generating with model: ${model}`);
    console.log(`[Ollama] Endpoint: ${this.endpoint}`);

    try {
      const requestBody = {
        model: model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          top_k: options.top_k || 40,
          top_p: options.top_p || 0.9,
          num_predict: options.max_tokens || 2048,
        },
      };
      const bodyString = JSON.stringify(requestBody);
      console.log(`[Ollama] Sending JSON:`, bodyString);

      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: bodyString,
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Ollama] Error response:`, errorText);
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`[Ollama] Response: ${data.response?.substring(0, 100)}...`);

      return data.response || "";
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error(`Ollama generation timed out after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  async generateBatch(prompts, options = {}) {
    if (!this.enabled) {
      throw new Error("Ollama endpoint is disabled");
    }

    console.log(`[Ollama] Batch generating ${prompts.length} prompts`);

    const results = await Promise.all(
      prompts.map((prompt) => this.generate(prompt, options)),
    );

    return results;
  }

  async getModelInfo() {
    if (this.cachedInfo) {
      return this.cachedInfo;
    }

    try {
      const response = await fetch(
        this.endpoint.replace("/generate", "/tags"),
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(5000),
        },
      );

      if (!response.ok) {
        throw new Error(`Ollama tags API error: ${response.status}`);
      }

      const data = await response.json();

      this.cachedInfo = {
        provider_id: "ollama",
        provider_type: "local",
        endpoint: this.endpoint,
        model: this.model,
        available_models: data.models || [this.model],
        max_tokens: 4096,
        context_window: 8192,
        cost_per_token: 0,
        priority: 1,
      };

      return this.cachedInfo;
    } catch (error) {
      console.error("[Ollama] Failed to get model info:", error);
      return {
        provider_id: "ollama",
        provider_type: "local",
        endpoint: this.endpoint,
        model: this.model,
        available_models: [this.model],
        max_tokens: 4096,
        context_window: 8192,
        cost_per_token: 0,
        priority: 1,
        error: error.message,
      };
    }
  }

  async healthCheck() {
    try {
      const response = await fetch(
        this.endpoint.replace("/generate", "/tags"),
        {
          method: "GET",
          signal: AbortSignal.timeout(3000),
        },
      );

      return response.ok;
    } catch (error) {
      console.error("[Ollama] Health check failed:", error);
      return false;
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    console.log(`[Ollama] Endpoint ${enabled ? "enabled" : "disabled"}`);
  }
}

export default OllamaEndpoint;
