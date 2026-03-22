/**
 * API Rate Limiter - Prevents thundering herd problems
 * Controls concurrent API calls while maintaining parallel message processing
 */

class ApiRateLimiter {
  constructor(config = {}) {
    this.config = {
      maxConcurrent: config.maxConcurrent || 3,
      requestsPerSecond: config.requestsPerSecond || 10,
      burstLimit: config.burstLimit || 20,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      ...config
    };
    
    this.activeRequests = 0;
    this.requestQueue = [];
    this.rateWindow = [];
    this.stats = {
      totalRequests: 0,
      throttledRequests: 0,
      failedRequests: 0,
      avgLatency: 0
    };
  }

  async execute(apiCall, priority = 'normal') {
    this.stats.totalRequests++;
    
    // Check rate limits
    const canProceed = this.checkRateLimit();
    
    if (!canProceed) {
      // Add to queue with priority
      return new Promise((resolve, reject) => {
        this.requestQueue.push({
          apiCall,
          priority,
          resolve,
          reject,
          timestamp: Date.now()
        });
        
        this.stats.throttledRequests++;
        this.processQueue();
      });
    }
    
    // Execute immediately
    return this.executeRequest(apiCall);
  }

  checkRateLimit() {
    const now = Date.now();
    
    // Clean old requests from rate window
    this.rateWindow = this.rateWindow.filter(time => now - time < 1000);
    
    // Check concurrent limit
    if (this.activeRequests >= this.config.maxConcurrent) {
      return false;
    }
    
    // Check rate limit
    if (this.rateWindow.length >= this.config.requestsPerSecond) {
      return false;
    }
    
    return true;
  }

  async executeRequest(apiCall) {
    this.activeRequests++;
    this.rateWindow.push(Date.now());
    
    const startTime = Date.now();
    
    try {
      let result;
      let attempts = 0;
      
      while (attempts <= this.config.retryAttempts) {
        try {
          result = await apiCall();
          break;
        } catch (error) {
          attempts++;
          
          if (attempts > this.config.retryAttempts) {
            throw error;
          }
          
          // Exponential backoff
          const delay = this.config.retryDelay * Math.pow(2, attempts - 1);
          await this.sleep(delay);
        }
      }
      
      const latency = Date.now() - startTime;
      this.updateStats(latency);
      
      return result;
      
    } finally {
      this.activeRequests--;
      this.processQueue();
    }
  }

  processQueue() {
    // Sort by priority and age
    this.requestQueue.sort((a, b) => {
      const priorityOrder = { 'critical': 0, 'high': 1, 'normal': 2, 'low': 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      
      return a.timestamp - b.timestamp;
    });
    
    // Process queued requests
    while (this.requestQueue.length > 0 && this.checkRateLimit()) {
      const queuedRequest = this.requestQueue.shift();
      this.executeRequest(queuedRequest.apiCall)
        .then(queuedRequest.resolve)
        .catch(queuedRequest.reject);
    }
  }

  updateStats(latency) {
    this.stats.avgLatency = (
      (this.stats.avgLatency * (this.stats.totalRequests - 1) + latency) / 
      this.stats.totalRequests
    );
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats() {
    return {
      ...this.stats,
      activeRequests: this.activeRequests,
      queuedRequests: this.requestQueue.length,
      currentRate: this.rateWindow.length,
      utilization: (this.activeRequests / this.config.maxConcurrent * 100).toFixed(1) + '%'
    };
  }

  // Batch processing for multiple similar requests
  async batchExecute(requests, batchSize = 5) {
    const results = [];
    
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchPromises = batch.map(req => this.execute(req));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches to prevent rate limiting
      if (i + batchSize < requests.length) {
        await this.sleep(100);
      }
    }
    
    return results;
  }
}

export default ApiRateLimiter;