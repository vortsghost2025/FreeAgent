/**
 * Shared API Client - Centralized API access with built-in throttling
 * Prevents rate limit issues by coordinating all external API calls
 */

import ApiRateLimiter from './api-rate-limiter.js';

class SharedApiClient {
  constructor(config = {}) {
    this.config = {
      llmConcurrency: config.llmConcurrency || 2,
      rpcConcurrency: config.rpcConcurrency || 3,
      restConcurrency: config.restConcurrency || 5,
      cacheEnabled: config.cacheEnabled || true,
      cacheTtl: config.cacheTtl || 300000, // 5 minutes
      ...config
    };
    
    // Separate rate limiters for different API types
    this.limiters = {
      llm: new ApiRateLimiter({
        maxConcurrent: this.config.llmConcurrency,
        requestsPerSecond: 5,
        retryAttempts: 3
      }),
      rpc: new ApiRateLimiter({
        maxConcurrent: this.config.rpcConcurrency,
        requestsPerSecond: 15,
        retryAttempts: 2
      }),
      rest: new ApiRateLimiter({
        maxConcurrent: this.config.restConcurrency,
        requestsPerSecond: 10,
        retryAttempts: 3
      })
    };
    
    // Simple in-memory cache
    this.cache = new Map();
    this.stats = {
      cacheHits: 0,
      cacheMisses: 0,
      totalApiCalls: 0
    };
  }

  // LLM API calls (OpenAI, Anthropic, etc.)
  async callLLM(prompt, model = 'gpt-4', options = {}) {
    const cacheKey = `llm:${model}:${prompt.substring(0, 100)}`;
    
    // Check cache first
    if (this.config.cacheEnabled) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.stats.cacheHits++;
        return cached;
      }
      this.stats.cacheMisses++;
    }
    
    const result = await this.limiters.llm.execute(async () => {
      // Simulate LLM API call
      await this.simulateNetworkDelay(500, 1500);
      
      return {
        response: `LLM response to: ${prompt}`,
        model: model,
        timestamp: Date.now()
      };
    }, options.priority || 'normal');
    
    // Cache the result
    if (this.config.cacheEnabled) {
      this.addToCache(cacheKey, result);
    }
    
    this.stats.totalApiCalls++;
    return result;
  }

  // Blockchain RPC calls
  async callRPC(method, params = [], chain = 'ethereum') {
    const cacheKey = `rpc:${chain}:${method}:${JSON.stringify(params)}`;
    
    // Check cache for read operations
    if (this.config.cacheEnabled && method.startsWith('eth_') && !method.includes('send')) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.stats.cacheHits++;
        return cached;
      }
      this.stats.cacheMisses++;
    }
    
    const result = await this.limiters.rpc.execute(async () => {
      // Simulate RPC call
      await this.simulateNetworkDelay(100, 500);
      
      return {
        result: `RPC result for ${method}`,
        chain: chain,
        timestamp: Date.now()
      };
    }, 'high'); // RPC calls typically high priority
    
    // Cache read operations
    if (this.config.cacheEnabled && method.startsWith('eth_') && !method.includes('send')) {
      this.addToCache(cacheKey, result);
    }
    
    this.stats.totalApiCalls++;
    return result;
  }

  // REST API calls
  async callREST(url, options = {}) {
    const cacheKey = `rest:${url}:${JSON.stringify(options)}`;
    
    // Check cache for GET requests
    if (this.config.cacheEnabled && (!options.method || options.method === 'GET')) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.stats.cacheHits++;
        return cached;
      }
      this.stats.cacheMisses++;
    }
    
    const result = await this.limiters.rest.execute(async () => {
      // Simulate REST API call
      await this.simulateNetworkDelay(200, 1000);
      
      return {
        data: { message: `REST response from ${url}` },
        status: 200,
        timestamp: Date.now()
      };
    }, options.priority || 'normal');
    
    // Cache GET requests
    if (this.config.cacheEnabled && (!options.method || options.method === 'GET')) {
      this.addToCache(cacheKey, result);
    }
    
    this.stats.totalApiCalls++;
    return result;
  }

  // Batch processing for multiple similar requests
  async batchLLMCalls(prompts, model = 'gpt-4') {
    const requests = prompts.map(prompt => () => this.callLLM(prompt, model));
    return this.limiters.llm.batchExecute(requests, 3);
  }

  async batchRPCCalls(calls, chain = 'ethereum') {
    const requests = calls.map(({ method, params }) => 
      () => this.callRPC(method, params, chain)
    );
    return this.limiters.rpc.batchExecute(requests, 5);
  }

  // Cache management
  addToCache(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.config.cacheTtl
    });
    
    // Clean expired entries periodically
    if (this.cache.size > 1000) {
      this.cleanExpiredCache();
    }
  }

  getFromCache(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }

  cleanExpiredCache() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  // Utility methods
  async simulateNetworkDelay(minMs = 100, maxMs = 1000) {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  getStats() {
    return {
      cache: {
        hits: this.stats.cacheHits,
        misses: this.stats.cacheMisses,
        hitRate: this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses || 1),
        size: this.cache.size
      },
      apiCalls: this.stats.totalApiCalls,
      limiters: {
        llm: this.limiters.llm.getStats(),
        rpc: this.limiters.rpc.getStats(),
        rest: this.limiters.rest.getStats()
      }
    };
  }

  // Force cache cleanup
  clearCache() {
    this.cache.clear();
    this.stats.cacheHits = 0;
    this.stats.cacheMisses = 0;
  }
}

export default SharedApiClient;