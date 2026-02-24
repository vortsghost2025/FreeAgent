/**
 * HYBRID PROVIDER MANAGER
 *
 * Manages mixed provider configuration for the ensemble:
 * - Ollama (local)
 * - Groq (cloud)
 * - Together AI (cloud)
 *
 * Features:
 * - Provider selection based on task type
 * - Fallback logic (cloud → local)
 * - Cost tracking
 * - Health monitoring
 */

import { createProvider } from "./index.js";

// Default Provider Assignments by Role
const DEFAULT_PROVIDER_ASSIGNMENTS = {
  code_generation: "ollama", // Local, fast for coding
  data_engineering: "together", // Cloud, accurate for data tasks
  clinical_analysis: "groq", // Cloud, fast + medical context
};

// Provider Priority for Fallback
const PROVIDER_PRIORITY = ["ollama", "groq", "together"];

/**
 * Hybrid Provider Manager
 */
export class HybridProviderManager {
  constructor(config = {}) {
    this.config = config;
    this.providers = new Map(); // providerName -> Provider instance
    this.providerHealth = new Map(); // providerName -> { status: 'healthy'|'degraded', lastCheck, failureCount }
    this.costTracking = {
      ollama: 0, // Local: free
      groq: 0, // Track API costs
      together: 0, // Track API costs
    };

    console.log("🔀 Hybrid Provider Manager initialized");
  }

  /**
   * Initialize provider manager
   */
  async initialize() {
    console.log("🔧 Initializing providers...");

    for (const providerName of PROVIDER_PRIORITY) {
      await this.initializeProvider(providerName);
    }

    console.log("✅ Hybrid Provider Manager initialized");
  }

  /**
   * Initialize a single provider
   */
  async initializeProvider(providerName) {
    try {
      const config = this.getProviderConfigFromType(providerName);
      const provider = createProvider(providerName, config);

      const isAvailable = await provider.isAvailable();

      if (isAvailable) {
        this.providers.set(providerName, provider);
        this.providerHealth.set(providerName, {
          status: "healthy",
          lastCheck: new Date(),
          failureCount: 0,
        });
        console.log(`✅ Provider initialized: ${providerName}`);
      } else {
        this.providerHealth.set(providerName, {
          status: "degraded",
          lastCheck: new Date(),
          failureCount: 1,
        });
        console.warn(`⚠️  Provider unavailable: ${providerName}`);
      }
    } catch (error) {
      this.providerHealth.set(providerName, {
        status: "degraded",
        lastCheck: new Date(),
        failureCount: 1,
        error: error.message,
      });
      console.error(
        `❌ Provider initialization failed: ${providerName}`,
        error,
      );
    }
  }

  /**
   * Get provider configuration for a specific role
   */
  getProviderConfig(role) {
    // Check if role has custom config
    if (this.config.agents && this.config.agents[role]) {
      const roleConfig = this.config.agents[role];
      if (roleConfig.provider && roleConfig.model) {
        return {
          provider: roleConfig.provider,
          model: roleConfig.model,
        };
      }
    }

    // Use default assignment
    const defaultProvider = DEFAULT_PROVIDER_ASSIGNMENTS[role] || "ollama";

    return {
      provider: defaultProvider,
      model: this.getDefaultModel(defaultProvider),
    };
  }

  /**
   * Get provider configuration from type
   */
  getProviderConfigFromType(providerType) {
    const config = this.config.agents || {};

    // Find first role using this provider
    for (const [role, roleConfig] of Object.entries(config)) {
      if (roleConfig.provider === providerType) {
        return {
          model: roleConfig.model,
          apiKey: roleConfig.apiKey,
          baseUrl: roleConfig.baseUrl,
        };
      }
    }

    // Return default config
    return {
      model: this.getDefaultModel(providerType),
    };
  }

  /**
   * Get default model for provider
   */
  getDefaultModel(providerType) {
    const defaults = {
      ollama: "llama3.2",
      groq: "llama3-70b-8192",
      together: "mistralai/Mixtral-8x7B-Instruct-v0.1",
    };

    return defaults[providerType] || "default";
  }

  /**
   * Get provider instance
   */
  getProvider(providerName) {
    return this.providers.get(providerName);
  }

  /**
   * Get healthy provider from priority list
   */
  getHealthyProvider(preferredProvider = null) {
    // If preferred provider is specified and healthy, use it
    if (preferredProvider && this.isProviderHealthy(preferredProvider)) {
      return preferredProvider;
    }

    // Find first healthy provider
    for (const providerName of PROVIDER_PRIORITY) {
      if (this.isProviderHealthy(providerName)) {
        return providerName;
      }
    }

    // No healthy providers
    console.warn("⚠️  No healthy providers available");
    return null;
  }

  /**
   * Check if provider is healthy
   */
  isProviderHealthy(providerName) {
    const health = this.providerHealth.get(providerName);
    return health && health.status === "healthy";
  }

  /**
   * Mark provider as failed
   */
  markProviderFailed(providerName, error) {
    const health = this.providerHealth.get(providerName);

    if (health) {
      health.failureCount++;
      health.lastCheck = new Date();

      // Mark as degraded after 3 failures
      if (health.failureCount >= 3) {
        health.status = "degraded";
        console.warn(`⚠️  Provider marked as degraded: ${providerName}`);
      }
    }

    console.error(`❌ Provider failed: ${providerName}`, error);
  }

  /**
   * Mark provider as recovered
   */
  markProviderRecovered(providerName) {
    const health = this.providerHealth.get(providerName);

    if (health) {
      health.status = "healthy";
      health.failureCount = 0;
      health.lastCheck = new Date();
      console.log(`✅ Provider recovered: ${providerName}`);
    }
  }

  /**
   * Execute with fallback
   */
  async executeWithFallback(executorFn, preferredProvider = null) {
    let providerToTry = preferredProvider;

    // If no preferred provider, get a healthy one
    if (!providerToTry) {
      providerToTry = this.getHealthyProvider();
    }

    if (!providerToTry) {
      throw new Error("No available providers");
    }

    // Try the preferred provider first
    try {
      const result = await executorFn(providerToTry);
      this.markProviderRecovered(providerToTry);
      return result;
    } catch (error) {
      console.error(`Provider ${providerToTry} failed:`, error.message);
      this.markProviderFailed(providerToTry, error);

      // Try fallback providers
      for (const fallbackProvider of PROVIDER_PRIORITY) {
        if (
          fallbackProvider !== providerToTry &&
          this.isProviderHealthy(fallbackProvider)
        ) {
          console.log(`🔄 Fallback to provider: ${fallbackProvider}`);
          try {
            const result = await executorFn(fallbackProvider);
            this.markProviderRecovered(fallbackProvider);
            return result;
          } catch (fallbackError) {
            console.error(
              `Fallback provider ${fallbackProvider} failed:`,
              fallbackError.message,
            );
            this.markProviderFailed(fallbackProvider, fallbackError);
          }
        }
      }

      // All providers failed
      throw new Error("All providers failed. Last error: " + error.message);
    }
  }

  /**
   * Track cost for provider
   */
  trackCost(providerName, cost) {
    if (this.costTracking[providerName] !== undefined) {
      this.costTracking[providerName] += cost;
    }
  }

  /**
   * Get cost tracking
   */
  getCostTracking() {
    return { ...this.costTracking };
  }

  /**
   * Get provider health status
   */
  getProviderHealth() {
    const health = {};

    for (const [providerName, status] of this.providerHealth.entries()) {
      health[providerName] = {
        status: status.status,
        failureCount: status.failureCount,
        lastCheck: status.lastCheck,
        isAvailable: this.providers.has(providerName),
      };
    }

    return health;
  }

  /**
   * Get all available providers
   */
  getAvailableProviders() {
    return Array.from(this.providers.keys());
  }

  /**
   * Check provider availability
   */
  async checkProviderAvailability(providerName) {
    try {
      const provider = this.providers.get(providerName);

      if (!provider) {
        await this.initializeProvider(providerName);
      }

      return this.isProviderHealthy(providerName);
    } catch (error) {
      return false;
    }
  }

  /**
   * Refresh provider health status
   */
  async refreshProviderHealth() {
    console.log("🔄 Refreshing provider health...");

    for (const providerName of PROVIDER_PRIORITY) {
      const isAvailable = await this.checkProviderAvailability(providerName);

      if (isAvailable) {
        this.markProviderRecovered(providerName);
      } else {
        this.markProviderFailed(providerName, new Error("Health check failed"));
      }
    }

    console.log("✅ Provider health refreshed");
  }

  /**
   * Get provider statistics
   */
  getStatistics() {
    return {
      availableProviders: this.getAvailableProviders(),
      providerHealth: this.getProviderHealth(),
      costTracking: this.getCostTracking(),
      totalCosts: Object.values(this.costTracking).reduce(
        (sum, cost) => sum + cost,
        0,
      ),
    };
  }

  /**
   * Shutdown provider manager
   */
  async shutdown() {
    console.log("🛑 Shutting down Hybrid Provider Manager...");

    this.providers.clear();
    this.providerHealth.clear();

    console.log("✅ Hybrid Provider Manager shut down");
  }
}
