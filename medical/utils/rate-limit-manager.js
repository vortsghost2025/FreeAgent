/**
 * RATE-LIMIT MANAGEMENT SYSTEM
 * Integrates optimizer, prompt reducer, and provider balancer for comprehensive rate limit mitigation
 * OPTIMIZED FOR LOW-RESOURCE ENVIRONMENTS (≤4GB RAM, Single Core CPU)
 */

import RateLimitOptimizer from './rate-limit-optimizer.js';
import PromptOptimizer from './prompt-optimizer.js';
import ProviderBalancer from './provider-balancer.js';

class RateLimitManager {
  constructor(config = {}) {
    this.optimizer = new RateLimitOptimizer();
    this.promptOptimizer = new PromptOptimizer();
    this.balancer = new ProviderBalancer(config.providers || []);
    
    this.config = {
      batchSize: config.batchSize || 3, // Reduced for low-resource environments
      maxRetries: config.maxRetries || 2, // Reduced for low-resource environments
      retryDelay: 300, // Fixed delay (100-300ms) to reduce CPU overhead
      enableCaching: config.enableCaching !== false,
      enableBatches: config.enableBatches !== false,
      enablePromptOptimization: config.enablePromptOptimization !== false,
      ...config
    };
    
    // Performance tracking
    this.stats = {
      totalRequests: 0,
      cachedResponses: 0,
      batchedRequests: 0,
      tokensSaved: 0,
      rateLimitPrevented: 0,
      errors: 0
    };
    
    // Request tracking for rate limiting
    this.requestTimestamps = new Map();
  }

  /**
   * Check if a request is allowed based on rate limits
   * @param {string} agentId - The agent identifier
   * @returns {Object} - {allowed: boolean, reason?: string}
   */
  checkRateLimit(agentId) {
    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    const maxRequests = 100; // Max requests per minute
    
    if (!this.requestTimestamps.has(agentId)) {
      this.requestTimestamps.set(agentId, []);
    }
    
    const timestamps = this.requestTimestamps.get(agentId);
    
    // Clean old timestamps outside the window
    const validTimestamps = timestamps.filter(ts => now - ts < windowMs);
    this.requestTimestamps.set(agentId, validTimestamps);
    
    if (validTimestamps.length >= maxRequests) {
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${maxRequests} requests per minute`
      };
    }
    
    // Add current timestamp
    validTimestamps.push(now);
    this.requestTimestamps.set(agentId, validTimestamps);
    
    return { allowed: true };
  }

  /**
   * Execute a task with full rate limit optimization
   */
  async executeTask(task, options = {}) {
    this.stats.totalRequests++;
    
    try {
      // Step 1: Check for cached result
      if (this.config.enableCaching) {
        const cacheKey = this.generateCacheKey(task);
        const cachedResult = this.optimizer.getCachedResult(cacheKey);
        
        if (cachedResult) {
          this.stats.cachedResponses++;
          this.addToActivityLog('CACHE_HIT', `Returned cached result for ${task.type}`);
          return cachedResult;
        }
      }
      
      // Step 2: Optimize prompt if needed
      let processedTask = task;
      if (this.config.enablePromptOptimization) {
        processedTask = this.optimizeTaskPrompt(task, options.role);
      }
      
      // Step 3: Batch request if enabled and conditions met
      if (this.config.enableBatches && options.allowBatching !== false) {
        // For demonstration purposes, we'll implement a simple batching mechanism
        return this.executeWithBatching(processedTask, options);
      } else {
        // Execute directly with provider balancing
        return await this.executeDirect(processedTask, options);
      }
    } catch (error) {
      this.stats.errors++;
      
      if (this.isRateLimitError(error)) {
        this.stats.rateLimitPrevented++;
        this.addToActivityLog('RATE_LIMIT', `Rate limit prevented: ${error.message}`);
        
        // Apply backoff and retry logic
        return await this.handleRateLimit(processedTask, options);
      }
      
      throw error;
    }
  }

  /**
   * Execute with batching support
   */
  async executeWithBatching(task, options) {
    // For simplicity in this implementation, we'll execute directly
    // A full implementation would aggregate tasks and execute them together
    return await this.executeDirect(task, options);
  }

  /**
   * Execute task directly with provider balancing
   */
  async executeDirect(task, options) {
    const provider = this.balancer.selectBestProvider(task, options);
    
    // Create optimized payload
    const payload = this.createPayload(task, options);
    
    // Execute with the selected provider
    const result = await this.balancer.executeRequest(payload, {
      useCache: this.config.enableCaching,
      ...options
    });
    
    // Cache result if applicable
    if (this.config.enableCaching && result) {
      const cacheKey = this.generateCacheKey(task);
      this.optimizer.setCachedResult(cacheKey, result);
    }
    
    return result;
  }

  /**
   * Optimize task prompt to reduce token usage
   */
  optimizeTaskPrompt(task, role) {
    if (!this.config.enablePromptOptimization) {
      return task;
    }
    
    // Compress data structure
    const compressedData = this.promptOptimizer.compressDataStructure(task.data, role);
    
    // Create optimized prompt
    const optimizedTask = {
      ...task,
      data: compressedData
    };
    
    // Estimate tokens saved
    const originalTokens = this.estimateTokens(JSON.stringify(task));
    const optimizedTokens = this.estimateTokens(JSON.stringify(optimizedTask));
    this.stats.tokensSaved += (originalTokens - optimizedTokens);
    
    return optimizedTask;
  }

  /**
   * Handle rate limit errors with retry logic
   */
  async handleRateLimit(task, options, attempt = 1) {
    if (attempt > this.config.maxRetries) {
      throw new Error('Max retries exceeded after rate limit attempts');
    }
    
    // Calculate delay with exponential backoff
    const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
    
    this.addToActivityLog('RETRY', `Waiting ${delay}ms before retry ${attempt}/${this.config.maxRetries}`);
    
    // Wait before retry
    await this.sleep(delay);
    
    // Retry the task
    return await this.executeTask(task, options);
  }

  /**
   * Create API payload from task
   */
  createPayload(task, options) {
    const { system, user, estimatedTokens } = this.promptOptimizer.createOptimizedPrompt(
      options.role || 'default',
      task.content || JSON.stringify(task.data),
      {
        maxContextLength: options.maxContextLength || 1500, // Reduced for low-resource
        customInstructions: options.customInstructions || ''
      }
    );
    
    return {
      model: options.model || 'gpt-4',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: options.temperature || 0.1,
      max_tokens: options.maxTokens || 300 // Reduced for low-resource
    };
  }

  /**
   * Generate cache key for a task
   */
  generateCacheKey(task) {
    // Create a deterministic key from the task
    const content = JSON.stringify({
      type: task.type,
      data: task.data,
      params: task.params
    }, Object.keys(task).sort());
    
    // In a real implementation, we would hash this content
    // For now, we'll use a simple truncation approach
    return content.substring(0, 100);
  }

  /**
   * Estimate token count
   */
  estimateTokens(text) {
    if (!text) return 0;
    // Rough estimate: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if error is rate limit related
   */
  isRateLimitError(error) {
    if (!error || !error.message) return false;
    
    const message = error.message.toLowerCase();
    return (
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('429') ||
      message.includes('quota') ||
      message.includes('exceeded')
    );
  }

  /**
   * Sleep utility function
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Add entry to activity log
   */
  addToActivityLog(type, message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${type}: ${message}`);
  }

  /**
   * Get current system status and statistics
   */
  getStatus() {
    return {
      stats: {
        ...this.stats,
        cacheHitRate: this.stats.totalRequests > 0 
          ? (this.stats.cachedResponses / this.stats.totalRequests * 100).toFixed(2) + '%' 
          : '0%',
        tokensSaved: this.stats.tokensSaved,
        rateLimitPreventionRate: this.stats.totalRequests > 0
          ? (this.stats.rateLimitPrevented / this.stats.totalRequests * 100).toFixed(2) + '%'
          : '0%'
      },
      optimizerStatus: this.optimizer.getStatus(),
      balancerStatus: this.balancer.getStatus()
    };
  }

  /**
   * Update configuration dynamically
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

// Example configuration for medical system
const medicalConfig = {
  providers: [
    { 
      id: 'openai-gpt4', 
      endpoint: process.env.OPENAI_ENDPOINT || 'https://api.openai.com/v1/chat/completions', 
      apiKey: process.env.OPENAI_API_KEY || 'dummy-key',
      priority: 1,
      weight: 2,
      maxConcurrency: 5, // Reduced for low-resource environments
      rateLimit: { rpm: 1000, tpm: 100000 },
      costPerMillion: 10
    },
    { 
      id: 'local-ollama', 
      endpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434/api/generate', 
      apiKey: process.env.OLLAMA_API_KEY || 'ollama',
      priority: 3,
      weight: 3,
      maxConcurrency: 10, // More on local since it doesn't have external rate limits
      rateLimit: { rpm: 10000, tpm: 10000000 },
      costPerMillion: 0.1
    }
  ],
  batchSize: 5,
  maxRetries: 3,
  retryDelay: 1000,
  enableCaching: true,
  enableBatches: true,
  enablePromptOptimization: true
};

// Export both the class and a configured instance
export { RateLimitManager, medicalConfig };
export default RateLimitManager;