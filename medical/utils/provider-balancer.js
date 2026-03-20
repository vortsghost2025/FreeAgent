/**
 * MULTI-PROVIDER LOAD-BALANCING BLOCK
 * Distributes workload across multiple AI providers to maximize throughput
 * OPTIMIZED FOR LOW-RESOURCE ENVIRONMENTS (≤4GB RAM, Single Core CPU)
 */

class ProviderBalancer {
  constructor(providersConfig = []) {
    this.providers = new Map();
    this.providerStats = new Map();
    this.requestQueue = [];
    this.isProcessing = false;
    
    // Fixed delay constants to reduce CPU overhead
    this.FIXED_RETRY_DELAY = 300; // Fixed delay instead of exponential
    
    // Initialize providers from config
    providersConfig.forEach(config => {
      this.addProvider(config.id, config);
    });
    
    // Performance tracking - simplified to reduce memory usage
    this.performanceHistory = {};
  }

  /**
   * Add a provider to the balancer
   */
  addProvider(id, config) {
    this.providers.set(id, {
      id,
      endpoint: config.endpoint,
      apiKey: config.apiKey,
      priority: config.priority || 1, // Lower is higher priority
      weight: config.weight || 1,     // Relative capacity
      maxConcurrency: config.maxConcurrency || 3, // Reduced default for low-resource
      rateLimit: config.rateLimit || { rpm: 100, tpm: 1000000 }, // requests/tokens per minute
      enabled: config.enabled !== false
    });
    
    this.providerStats.set(id, {
      activeRequests: 0,
      totalRequests: 0,
      successCount: 0,
      errorCount: 0,
      avgResponseTime: 0,
      lastRequestTime: 0,
      tokensUsed: 0
    });
    
    this.performanceHistory[id] = [];
  }

  /**
   * Select the optimal provider based on multiple factors
   */
  selectBestProvider(task, options = {}) {
    const availableProviders = Array.from(this.providers.values())
      .filter(p => p.enabled && this.isProviderAvailable(p.id));

    if (availableProviders.length === 0) {
      throw new Error('No providers available');
    }

    // Score each provider based on multiple factors
    const scoredProviders = availableProviders.map(provider => {
      const stats = this.providerStats.get(provider.id);
      const performanceScore = this.calculatePerformanceScore(provider.id);
      
      // Calculate availability score (lower active requests = better)
      const availabilityRatio = stats.activeRequests / provider.maxConcurrency;
      const availabilityScore = Math.max(0, (1 - availabilityRatio) * 100);
      
      // Calculate cost/performance ratio if applicable
      const costFactor = options.costConscious ? provider.costPerMillion || 1 : 1;
      
      // Weighted score calculation - simplified to reduce CPU usage
      const score = (
        (performanceScore * 0.5) +  // Increased performance weight
        (availabilityScore * 0.5)    // Equal importance to availability
      ) / costFactor;
      
      return { provider, score, stats };
    });

    // Sort by score descending
    scoredProviders.sort((a, b) => b.score - a.score);
    
    // Return the best provider
    const best = scoredProviders[0];
    
    // Update stats
    this.providerStats.get(best.provider.id).activeRequests++;
    this.providerStats.get(best.provider.id).totalRequests++;
    
    return best.provider;
  }

  /**
   * Calculate performance score based on historical data
   */
  calculatePerformanceScore(providerId) {
    const stats = this.providerStats.get(providerId);
    const history = this.performanceHistory[providerId] || [];
    
    // Base score from success rate
    const totalProcessed = stats.successCount + stats.errorCount;
    const successRate = totalProcessed > 0 ? stats.successCount / totalProcessed : 1;
    const baseScore = successRate * 100;
    
    // Adjust for response time (faster is better, max 30 point adjustment)
    const avgResponseTime = stats.avgResponseTime || 1000; // Default to 1s
    // Use simpler calculation to reduce CPU overhead
    const timeAdjustment = Math.max(-30, Math.min(30, 30 - (avgResponseTime / 100)));
    
    return Math.max(0, Math.min(100, baseScore + timeAdjustment));
  }

  /**
   * Check if provider is available (not rate limited and under concurrency limit)
   */
  isProviderAvailable(providerId) {
    const provider = this.providers.get(providerId);
    const stats = this.providerStats.get(providerId);
    
    if (!provider || !stats) return false;
    
    // Check concurrency limit
    if (stats.activeRequests >= provider.maxConcurrency) {
      return false;
    }
    
    // Simplified availability check for low-resource environments
    return true;
  }

  /**
   * Execute a request using the optimal provider
   */
  async executeRequest(payload, options = {}) {
    // Try to get from cache first if applicable (would be handled externally)
    
    // Select best provider
    const provider = this.selectBestProvider(payload, options);
    
    const startTime = Date.now();
    let response;
    
    try {
      // Make the actual API call
      response = await this.makeApiCall(provider, payload);
      
      // Update success stats
      const stats = this.providerStats.get(provider.id);
      const responseTime = Date.now() - startTime;
      
      // Use simpler moving average calculation to reduce CPU usage
      stats.avgResponseTime = (stats.avgResponseTime + responseTime) / 2;
      stats.successCount++;
      stats.activeRequests--;
      
      // Record performance for history - limit history size to save memory
      this.performanceHistory[provider.id].push({
        timestamp: Date.now(),
        responseTime,
        success: true
      });
      
      // Limit history size to save memory in low-resource environments
      if (this.performanceHistory[provider.id].length > 20) {
        this.performanceHistory[provider.id] = 
          this.performanceHistory[provider.id].slice(-10);
      }
      
      return response;
    } catch (error) {
      // Update error stats
      const stats = this.providerStats.get(provider.id);
      stats.errorCount++;
      stats.activeRequests--;
      
      this.performanceHistory[provider.id].push({
        timestamp: Date.now(),
        responseTime: Date.now() - startTime,
        success: false,
        error: error.message
      });
      
      // Limit history size to save memory
      if (this.performanceHistory[provider.id].length > 20) {
        this.performanceHistory[provider.id] = 
          this.performanceHistory[provider.id].slice(-10);
      }
      
      throw error;
    }
  }

  /**
   * Make the actual API call to the provider
   */
  async makeApiCall(provider, payload) {
    // This is a simplified implementation
    // In a real system, you'd have provider-specific adapters
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
      ...provider.headers
    };

    const response = await fetch(provider.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Provider ${provider.id} returned ${response.status}: ${await response.text()}`);
    }

    return response.json();
  }

  /**
   * Get cache key for request
   */
  getCacheKey(payload) {
    // Create a deterministic key from the payload
    const content = JSON.stringify(payload, Object.keys(payload).sort());
    // In a real implementation, you'd hash this
    return content.substring(0, 100); // Simplified
  }

  /**
   * Get current load balancing status
   */
  getStatus() {
    const status = {};
    
    for (const [providerId, provider] of this.providers.entries()) {
      const stats = this.providerStats.get(providerId);
      
      status[providerId] = {
        id: provider.id,
        activeRequests: stats.activeRequests,
        totalRequests: stats.totalRequests,
        successRate: stats.successCount / (stats.successCount + stats.errorCount || 1) * 100,
        avgResponseTime: stats.avgResponseTime,
        available: this.isProviderAvailable(providerId),
        utilization: (stats.activeRequests / provider.maxConcurrency) * 100
      };
    }
    
    return status;
  }

  /**
   * Get statistics for all providers
   */
  getStats() {
    const stats = {};
    
    for (const [providerId, providerStats] of this.providerStats.entries()) {
      stats[providerId] = { ...providerStats };
    }
    
    return stats;
  }
}

export default ProviderBalancer;