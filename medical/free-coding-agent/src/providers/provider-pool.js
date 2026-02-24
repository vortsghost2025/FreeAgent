/**
 * Provider Pool - Smart Provider Selection & Rate Limiting
 *
 * Manages all FREE providers with intelligent routing:
 * - Local-first strategy (Ollama, LM Studio)
 * - Automatic failover when rate limits hit
 * - Health-based routing
 * - Cost tracking (always $0)
 *
 * Priority Order:
 * 1. Local Ollama (fastest, unlimited)
 * 2. Local LM Studio (alternative local)
 * 3. Remote Ollama (VPS instances)
 * 4. Groq Free Tier (14,400 req/day)
 * 5. OpenRouter Free (multiple models)
 * 6. HuggingFace Free (rate limited)
 * 7. Cloudflare AI Free (10,000 neurons/day)
 * 8. Together AI (if credits available)
 */

import { EventEmitter } from "events";
import { OllamaProvider } from "./ollama.js";
import { GroqProvider } from "./groq.js";
import { TogetherProvider } from "./together.js";
import { OpenRouterProvider } from "./openrouter.js";
import { HuggingFaceProvider } from "./huggingface.js";
import { CloudflareAIProvider } from "./cloudflare-ai.js";
import { LMStudioProvider } from "./lmstudio.js";

// Provider priority (lower = higher priority)
const PROVIDER_PRIORITY = {
  "ollama-local": 1,
  lmstudio: 2,
  "ollama-remote": 3,
  groq: 4,
  openrouter: 5,
  huggingface: 6,
  "cloudflare-ai": 7,
  together: 8,
};

// Load balancing strategies
export const LOAD_BALANCE_STRATEGY = {
  LOCAL_FIRST: "local_first", // Prefer local providers
  ROUND_ROBIN: "round_robin", // Distribute evenly
  LEAST_LOADED: "least_loaded", // Route to least busy
  LATENCY_BASED: "latency_based", // Route to fastest
  FAILOVER: "failover", // Use backup on failure
};

export class ProviderPool extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = config;
    this.providers = new Map();
    this.providerHealth = new Map();
    this.providerLatency = new Map();
    this.strategy = config.strategy || LOAD_BALANCE_STRATEGY.LOCAL_FIRST;

    // Rate limit tracking
    this.rateLimits = new Map();

    // Usage statistics
    this.stats = {
      totalRequests: 0,
      requestsByProvider: {},
      failovers: 0,
      totalCost: 0, // Always $0
    };

    // Round robin index
    this.rrIndex = 0;

    console.log("🎱 Provider Pool initialized");
  }

  /**
   * Initialize all providers
   */
  async initialize() {
    console.log("🔧 Initializing provider pool...");

    // Initialize local providers first
    await this.initializeLocalProviders();

    // Initialize remote/cloud providers
    await this.initializeCloudProviders();

    // Initialize remote Ollama instances (VPS)
    await this.initializeRemoteOllama();

    console.log(`✅ Provider pool ready with ${this.providers.size} providers`);
    this.emit("initialized", { providerCount: this.providers.size });
  }

  /**
   * Initialize local providers (Ollama, LM Studio)
   */
  async initializeLocalProviders() {
    // Local Ollama
    try {
      const ollama = new OllamaProvider({
        model: this.config.ollamaModel || "llama3.2:8b",
      });

      if (await ollama.isAvailable()) {
        this.providers.set("ollama-local", ollama);
        this.providerHealth.set("ollama-local", {
          status: "healthy",
          lastCheck: Date.now(),
        });
        console.log("✅ Local Ollama available");
      } else {
        console.warn("⚠️ Local Ollama not available");
      }
    } catch (error) {
      console.error("❌ Local Ollama initialization failed:", error.message);
    }

    // LM Studio
    try {
      const lmstudio = new LMStudioProvider({
        baseUrl: this.config.lmstudioUrl || "http://localhost:1234/v1",
      });

      if (await lmstudio.isAvailable()) {
        this.providers.set("lmstudio", lmstudio);
        this.providerHealth.set("lmstudio", {
          status: "healthy",
          lastCheck: Date.now(),
        });
        console.log("✅ LM Studio available");
      } else {
        console.warn("⚠️ LM Studio not available");
      }
    } catch (error) {
      console.error("❌ LM Studio initialization failed:", error.message);
    }
  }

  /**
   * Initialize cloud providers (free tiers)
   */
  async initializeCloudProviders() {
    // Groq (14,400 free requests/day)
    if (process.env.GROQ_API_KEY) {
      try {
        const groq = new GroqProvider({
          model: this.config.groqModel || "llama-3.3-70b-versatile",
        });

        if (await groq.isAvailable()) {
          this.providers.set("groq", groq);
          this.providerHealth.set("groq", {
            status: "healthy",
            lastCheck: Date.now(),
          });
          this.rateLimits.set("groq", {
            daily: 14400,
            used: 0,
            resetTime: Date.now(),
          });
          console.log("✅ Groq free tier available");
        }
      } catch (error) {
        console.error("❌ Groq initialization failed:", error.message);
      }
    }

    // OpenRouter (free models)
    try {
      const openrouter = new OpenRouterProvider({
        model:
          this.config.openrouterModel || "mistralai/mistral-7b-instruct:free",
      });

      if (await openrouter.isAvailable()) {
        this.providers.set("openrouter", openrouter);
        this.providerHealth.set("openrouter", {
          status: "healthy",
          lastCheck: Date.now(),
        });
        console.log("✅ OpenRouter free tier available");
      }
    } catch (error) {
      console.error("❌ OpenRouter initialization failed:", error.message);
    }

    // HuggingFace (free inference)
    try {
      const huggingface = new HuggingFaceProvider({
        model:
          this.config.huggingfaceModel || "mistralai/Mistral-7B-Instruct-v0.2",
      });

      if (await huggingface.isAvailable()) {
        this.providers.set("huggingface", huggingface);
        this.providerHealth.set("huggingface", {
          status: "healthy",
          lastCheck: Date.now(),
        });
        console.log("✅ HuggingFace free tier available");
      }
    } catch (error) {
      console.error("❌ HuggingFace initialization failed:", error.message);
    }

    // Cloudflare AI (10,000 neurons/day free)
    if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_KEY) {
      try {
        const cloudflare = new CloudflareAIProvider({
          model: this.config.cloudflareModel || "@cf/meta/llama-3-8b-instruct",
        });

        if (await cloudflare.isAvailable()) {
          this.providers.set("cloudflare-ai", cloudflare);
          this.providerHealth.set("cloudflare-ai", {
            status: "healthy",
            lastCheck: Date.now(),
          });
          console.log("✅ Cloudflare AI free tier available");
        }
      } catch (error) {
        console.error("❌ Cloudflare AI initialization failed:", error.message);
      }
    }

    // Together AI (if credits available)
    if (process.env.TOGETHER_API_KEY) {
      try {
        const together = new TogetherProvider({
          model:
            this.config.togetherModel ||
            "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        });

        if (await together.isAvailable()) {
          this.providers.set("together", together);
          this.providerHealth.set("together", {
            status: "healthy",
            lastCheck: Date.now(),
          });
          console.log("✅ Together AI available");
        }
      } catch (error) {
        console.error("❌ Together AI initialization failed:", error.message);
      }
    }
  }

  /**
   * Initialize remote Ollama instances (VPS)
   */
  async initializeRemoteOllama() {
    const remoteEndpoints = this.config.remoteOllama || [];

    for (const endpoint of remoteEndpoints) {
      const id = `ollama-${endpoint.name || endpoint.host}`;

      try {
        const remote = new OllamaProvider({
          baseUrl: endpoint.url || `http://${endpoint.host}:11434`,
          model: endpoint.model || "llama3.2:8b",
        });

        if (await remote.isAvailable()) {
          this.providers.set(id, remote);
          this.providerHealth.set(id, {
            status: "healthy",
            lastCheck: Date.now(),
          });
          console.log(`✅ Remote Ollama available: ${id}`);
        } else {
          console.warn(`⚠️ Remote Ollama not available: ${id}`);
        }
      } catch (error) {
        console.error(
          `❌ Remote Ollama initialization failed (${id}):`,
          error.message,
        );
      }
    }
  }

  /**
   * Get the best available provider based on strategy
   */
  async getBestProvider(options = {}) {
    const availableProviders = await this.getAvailableProviders();

    if (availableProviders.length === 0) {
      throw new Error("No providers available");
    }

    switch (this.strategy) {
      case LOAD_BALANCE_STRATEGY.LOCAL_FIRST:
        return this.selectLocalFirst(availableProviders);

      case LOAD_BALANCE_STRATEGY.ROUND_ROBIN:
        return this.selectRoundRobin(availableProviders);

      case LOAD_BALANCE_STRATEGY.LEAST_LOADED:
        return this.selectLeastLoaded(availableProviders);

      case LOAD_BALANCE_STRATEGY.LATENCY_BASED:
        return this.selectByLatency(availableProviders);

      case LOAD_BALANCE_STRATEGY.FAILOVER:
      default:
        return this.selectLocalFirst(availableProviders);
    }
  }

  /**
   * Get all available providers
   */
  async getAvailableProviders() {
    const available = [];

    for (const [id, provider] of this.providers) {
      const health = this.providerHealth.get(id);

      // Skip unhealthy providers
      if (health?.status === "unhealthy") continue;

      // Check rate limits
      if (this.isRateLimited(id)) continue;

      // Verify availability
      try {
        if (await provider.isAvailable()) {
          available.push({
            id,
            provider,
            priority: PROVIDER_PRIORITY[id] || 99,
          });
        }
      } catch {
        // Mark as unhealthy
        this.providerHealth.set(id, {
          status: "unhealthy",
          lastCheck: Date.now(),
        });
      }
    }

    return available.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Select provider with local-first strategy
   */
  selectLocalFirst(providers) {
    // Already sorted by priority, first one is best
    return providers[0];
  }

  /**
   * Select provider with round-robin strategy
   */
  selectRoundRobin(providers) {
    const selected = providers[this.rrIndex % providers.length];
    this.rrIndex++;
    return selected;
  }

  /**
   * Select least loaded provider
   */
  selectLeastLoaded(providers) {
    let minLoad = Infinity;
    let selected = providers[0];

    for (const p of providers) {
      const requests = this.stats.requestsByProvider[p.id] || 0;
      if (requests < minLoad) {
        minLoad = requests;
        selected = p;
      }
    }

    return selected;
  }

  /**
   * Select provider by latency
   */
  selectByLatency(providers) {
    let minLatency = Infinity;
    let selected = providers[0];

    for (const p of providers) {
      const latency = this.providerLatency.get(p.id) || 1000;
      if (latency < minLatency) {
        minLatency = latency;
        selected = p;
      }
    }

    return selected;
  }

  /**
   * Check if provider is rate limited
   */
  isRateLimited(providerId) {
    const limits = this.rateLimits.get(providerId);
    if (!limits) return false;

    // Reset daily limits
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    if (now - limits.resetTime > dayMs) {
      limits.used = 0;
      limits.resetTime = now;
    }

    return limits.used >= limits.daily;
  }

  /**
   * Execute a chat request with automatic failover
   */
  async *chat(message, options = {}) {
    const startTime = Date.now();
    let lastError = null;

    // Get available providers
    const providers = await this.getAvailableProviders();

    for (const { id, provider } of providers) {
      try {
        this.stats.totalRequests++;
        this.stats.requestsByProvider[id] =
          (this.stats.requestsByProvider[id] || 0) + 1;

        // Update rate limits
        const limits = this.rateLimits.get(id);
        if (limits) limits.used++;

        // Execute request
        for await (const chunk of provider.chat(message, options)) {
          yield chunk;
        }

        // Update latency
        this.providerLatency.set(id, Date.now() - startTime);

        // Success - emit event
        this.emit("request_complete", {
          provider: id,
          latency: Date.now() - startTime,
        });
        return;
      } catch (error) {
        lastError = error;
        this.stats.failovers++;

        // Mark provider as potentially unhealthy
        const health = this.providerHealth.get(id);
        if (health) {
          health.failureCount = (health.failureCount || 0) + 1;
          if (health.failureCount >= 3) {
            health.status = "unhealthy";
          }
        }

        console.warn(`⚠️ Provider ${id} failed, trying next...`);
        this.emit("failover", { from: id, error: error.message });
      }
    }

    throw lastError || new Error("All providers failed");
  }

  /**
   * Execute a chat request with history
   */
  async *chatWithHistory(messages, options = {}) {
    const startTime = Date.now();
    let lastError = null;

    const providers = await this.getAvailableProviders();

    for (const { id, provider } of providers) {
      try {
        this.stats.totalRequests++;
        this.stats.requestsByProvider[id] =
          (this.stats.requestsByProvider[id] || 0) + 1;

        const limits = this.rateLimits.get(id);
        if (limits) limits.used++;

        for await (const chunk of provider.chatWithHistory(messages, options)) {
          yield chunk;
        }

        this.providerLatency.set(id, Date.now() - startTime);
        this.emit("request_complete", {
          provider: id,
          latency: Date.now() - startTime,
        });
        return;
      } catch (error) {
        lastError = error;
        this.stats.failovers++;
        console.warn(`⚠️ Provider ${id} failed, trying next...`);
        this.emit("failover", { from: id, error: error.message });
      }
    }

    throw lastError || new Error("All providers failed");
  }

  /**
   * Get pool statistics
   */
  getStats() {
    const providerStats = {};

    for (const [id, provider] of this.providers) {
      providerStats[id] = {
        health: this.providerHealth.get(id),
        latency: this.providerLatency.get(id),
        requests: this.stats.requestsByProvider[id] || 0,
        rateLimits: this.rateLimits.get(id),
        ...(provider.getUsageStats ? provider.getUsageStats() : {}),
      };
    }

    return {
      totalProviders: this.providers.size,
      availableProviders: [...this.providerHealth.entries()].filter(
        ([_, h]) => h.status === "healthy",
      ).length,
      totalRequests: this.stats.totalRequests,
      failovers: this.stats.failovers,
      totalCost: 0, // Always $0
      strategy: this.strategy,
      providers: providerStats,
    };
  }

  /**
   * Get provider by ID
   */
  getProvider(id) {
    return this.providers.get(id);
  }

  /**
   * Set load balancing strategy
   */
  setStrategy(strategy) {
    this.strategy = strategy;
    this.emit("strategy_changed", { strategy });
  }

  /**
   * Health check all providers
   */
  async healthCheck() {
    const results = {};

    for (const [id, provider] of this.providers) {
      try {
        const available = await provider.isAvailable();
        const health = this.providerHealth.get(id);

        if (available) {
          health.status = "healthy";
          health.failureCount = 0;
        } else {
          health.status = "unhealthy";
        }

        health.lastCheck = Date.now();
        results[id] = health;
      } catch (error) {
        const health = this.providerHealth.get(id);
        health.status = "unhealthy";
        health.lastCheck = Date.now();
        health.error = error.message;
        results[id] = health;
      }
    }

    this.emit("health_check_complete", results);
    return results;
  }

  /**
   * Add a new provider dynamically
   */
  addProvider(id, provider) {
    this.providers.set(id, provider);
    this.providerHealth.set(id, { status: "unknown", lastCheck: Date.now() });
    this.emit("provider_added", { id });
  }

  /**
   * Remove a provider
   */
  removeProvider(id) {
    this.providers.delete(id);
    this.providerHealth.delete(id);
    this.providerLatency.delete(id);
    this.rateLimits.delete(id);
    this.emit("provider_removed", { id });
  }
}

export default ProviderPool;
