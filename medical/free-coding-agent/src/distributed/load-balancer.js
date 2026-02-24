/**
 * Load Balancer - Intelligent Request Routing
 *
 * Routes requests to the best available agent/provider based on:
 * - Local-first strategy (prefer local Ollama)
 * - Health status
 * - Current load
 * - Latency
 * - Capability matching
 *
 * Strategies:
 * - LOCAL_FIRST: Prefer local providers
 * - ROUND_ROBIN: Distribute evenly
 * - LEAST_LOADED: Route to idle agents
 * - LATENCY_BASED: Route to fastest
 * - CAPABILITY_MATCH: Route by task type
 */

import { EventEmitter } from "events";

// Load balancing strategies
export const STRATEGY = {
  LOCAL_FIRST: "local_first",
  ROUND_ROBIN: "round_robin",
  LEAST_LOADED: "least_loaded",
  LATENCY_BASED: "latency_based",
  CAPABILITY_MATCH: "capability_match",
  WEIGHTED: "weighted",
};

// Provider location types
export const LOCATION = {
  LOCAL: "local",
  VPS: "vps",
  CLOUD_API: "cloud_api",
  P2P: "p2p",
};

export class LoadBalancer extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = config;
    this.strategy = config.strategy || STRATEGY.LOCAL_FIRST;

    // Registered providers
    this.providers = new Map();

    // Load tracking
    this.loadData = new Map();

    // Round robin index
    this.rrIndex = 0;

    // Sticky sessions (for conversation continuity)
    this.stickySessions = new Map();
    this.stickyTimeout = config.stickyTimeout || 5 * 60 * 1000; // 5 minutes

    // Metrics
    this.metrics = {
      totalRequests: 0,
      requestsByProvider: {},
      requestsByStrategy: {},
      failovers: 0,
      stickyHits: 0,
    };

    console.log("⚖️ Load Balancer initialized");
  }

  /**
   * Register a provider
   */
  registerProvider(provider) {
    const { id, location, capabilities, weight, healthCheck } = provider;

    this.providers.set(id, {
      id,
      location: location || LOCATION.LOCAL,
      capabilities: capabilities || [],
      weight: weight || 1,
      healthCheck,
      available: true,
      lastUsed: null,
    });

    this.loadData.set(id, {
      activeRequests: 0,
      totalRequests: 0,
      avgLatency: 0,
      errorCount: 0,
    });

    console.log(`📋 Registered provider: ${id} (${location})`);
    this.emit("provider_registered", { id, location });
  }

  /**
   * Unregister a provider
   */
  unregisterProvider(id) {
    this.providers.delete(id);
    this.loadData.delete(id);
    this.emit("provider_unregistered", { id });
  }

  /**
   * Update provider availability
   */
  setProviderAvailability(id, available) {
    const provider = this.providers.get(id);
    if (provider) {
      provider.available = available;
      this.emit("provider_availability_changed", { id, available });
    }
  }

  /**
   * Select the best provider for a request
   */
  async selectProvider(options = {}) {
    const { capability, sessionId, excludeProviders = [] } = options;

    // Check for sticky session
    if (sessionId && this.stickySessions.has(sessionId)) {
      const sticky = this.stickySessions.get(sessionId);
      if (Date.now() - sticky.timestamp < this.stickyTimeout) {
        const provider = this.providers.get(sticky.providerId);
        if (provider?.available) {
          this.metrics.stickyHits++;
          return provider;
        }
      }
      this.stickySessions.delete(sessionId);
    }

    // Get available providers
    let candidates = this.getAvailableProviders(excludeProviders);

    // Filter by capability if specified
    if (capability) {
      candidates = candidates.filter(
        (p) =>
          p.capabilities.length === 0 || p.capabilities.includes(capability),
      );
    }

    if (candidates.length === 0) {
      throw new Error("No available providers");
    }

    // Select based on strategy
    let selected;
    switch (this.strategy) {
      case STRATEGY.LOCAL_FIRST:
        selected = this.selectLocalFirst(candidates);
        break;
      case STRATEGY.ROUND_ROBIN:
        selected = this.selectRoundRobin(candidates);
        break;
      case STRATEGY.LEAST_LOADED:
        selected = this.selectLeastLoaded(candidates);
        break;
      case STRATEGY.LATENCY_BASED:
        selected = this.selectByLatency(candidates);
        break;
      case STRATEGY.CAPABILITY_MATCH:
        selected = this.selectByCapability(candidates, capability);
        break;
      case STRATEGY.WEIGHTED:
        selected = this.selectWeighted(candidates);
        break;
      default:
        selected = this.selectLocalFirst(candidates);
    }

    // Update metrics
    this.metrics.totalRequests++;
    this.metrics.requestsByProvider[selected.id] =
      (this.metrics.requestsByProvider[selected.id] || 0) + 1;
    this.metrics.requestsByStrategy[this.strategy] =
      (this.metrics.requestsByStrategy[this.strategy] || 0) + 1;

    // Set sticky session
    if (sessionId) {
      this.stickySessions.set(sessionId, {
        providerId: selected.id,
        timestamp: Date.now(),
      });
    }

    this.emit("provider_selected", {
      id: selected.id,
      strategy: this.strategy,
    });
    return selected;
  }

  /**
   * Get available providers
   */
  getAvailableProviders(excludeProviders = []) {
    const available = [];

    for (const [id, provider] of this.providers) {
      if (provider.available && !excludeProviders.includes(id)) {
        available.push(provider);
      }
    }

    return available;
  }

  /**
   * Select with local-first strategy
   */
  selectLocalFirst(candidates) {
    // Priority: LOCAL > VPS > CLOUD_API > P2P
    const priority = [
      LOCATION.LOCAL,
      LOCATION.VPS,
      LOCATION.CLOUD_API,
      LOCATION.P2P,
    ];

    for (const location of priority) {
      const localCandidates = candidates.filter((p) => p.location === location);
      if (localCandidates.length > 0) {
        // Among same location, pick least loaded
        return this.selectLeastLoaded(localCandidates);
      }
    }

    return candidates[0];
  }

  /**
   * Select with round-robin strategy
   */
  selectRoundRobin(candidates) {
    const selected = candidates[this.rrIndex % candidates.length];
    this.rrIndex++;
    return selected;
  }

  /**
   * Select least loaded provider
   */
  selectLeastLoaded(candidates) {
    let minLoad = Infinity;
    let selected = candidates[0];

    for (const provider of candidates) {
      const load = this.loadData.get(provider.id);
      if (load && load.activeRequests < minLoad) {
        minLoad = load.activeRequests;
        selected = provider;
      }
    }

    return selected;
  }

  /**
   * Select by latency
   */
  selectByLatency(candidates) {
    let minLatency = Infinity;
    let selected = candidates[0];

    for (const provider of candidates) {
      const load = this.loadData.get(provider.id);
      if (load && load.avgLatency < minLatency) {
        minLatency = load.avgLatency;
        selected = provider;
      }
    }

    return selected;
  }

  /**
   * Select by capability match
   */
  selectByCapability(candidates, capability) {
    // Prefer providers with explicit capability
    const withCapability = candidates.filter((p) =>
      p.capabilities.includes(capability),
    );

    if (withCapability.length > 0) {
      return this.selectLeastLoaded(withCapability);
    }

    // Fall back to general providers
    return this.selectLeastLoaded(candidates);
  }

  /**
   * Select with weighted random
   */
  selectWeighted(candidates) {
    const totalWeight = candidates.reduce((sum, p) => sum + p.weight, 0);
    let random = Math.random() * totalWeight;

    for (const provider of candidates) {
      random -= provider.weight;
      if (random <= 0) {
        return provider;
      }
    }

    return candidates[candidates.length - 1];
  }

  /**
   * Record request start
   */
  recordRequestStart(providerId) {
    const load = this.loadData.get(providerId);
    if (load) {
      load.activeRequests++;
      load.totalRequests++;
    }

    const provider = this.providers.get(providerId);
    if (provider) {
      provider.lastUsed = Date.now();
    }
  }

  /**
   * Record request end
   */
  recordRequestEnd(providerId, latency, success = true) {
    const load = this.loadData.get(providerId);
    if (load) {
      load.activeRequests = Math.max(0, load.activeRequests - 1);

      // Update average latency (exponential moving average)
      if (latency) {
        load.avgLatency = load.avgLatency * 0.8 + latency * 0.2;
      }

      if (!success) {
        load.errorCount++;
      }
    }
  }

  /**
   * Record failover
   */
  recordFailover(fromProviderId, toProviderId, reason) {
    this.metrics.failovers++;
    this.emit("failover", { from: fromProviderId, to: toProviderId, reason });
  }

  /**
   * Set load balancing strategy
   */
  setStrategy(strategy) {
    this.strategy = strategy;
    this.emit("strategy_changed", { strategy });
  }

  /**
   * Get current strategy
   */
  getStrategy() {
    return this.strategy;
  }

  /**
   * Get load data for all providers
   */
  getLoadData() {
    const data = {};
    for (const [id, load] of this.loadData) {
      data[id] = { ...load };
    }
    return data;
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      currentStrategy: this.strategy,
      providerCount: this.providers.size,
      availableCount: this.getAvailableProviders().length,
      loadData: this.getLoadData(),
    };
  }

  /**
   * Get provider status
   */
  getProviderStatus() {
    const status = {};

    for (const [id, provider] of this.providers) {
      const load = this.loadData.get(id);
      status[id] = {
        id,
        location: provider.location,
        capabilities: provider.capabilities,
        available: provider.available,
        lastUsed: provider.lastUsed,
        activeRequests: load?.activeRequests || 0,
        totalRequests: load?.totalRequests || 0,
        avgLatency: load?.avgLatency || 0,
        errorCount: load?.errorCount || 0,
      };
    }

    return status;
  }

  /**
   * Clean up stale sticky sessions
   */
  cleanupStickySessions() {
    const now = Date.now();
    for (const [sessionId, data] of this.stickySessions) {
      if (now - data.timestamp > this.stickyTimeout) {
        this.stickySessions.delete(sessionId);
      }
    }
  }

  /**
   * Shutdown load balancer
   */
  shutdown() {
    this.providers.clear();
    this.loadData.clear();
    this.stickySessions.clear();
    console.log("⚖️ Load Balancer shutdown complete");
  }
}

export default LoadBalancer;
