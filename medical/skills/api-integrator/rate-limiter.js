/**
 * Rate Limiter - Token bucket rate limiting implementation
 * Part of the API Integrator Skill
 */

class RateLimiter {
  constructor(options = {}) {
    this.maxRequests = options.maxRequests || 100;
    this.windowMs = options.windowMs || 60000;
    this.waitQueue = [];
    this.tokens = this.maxRequests;
    this.lastRefill = Date.now();
    this.interval = null;
    this.onLimitExceeded = options.onLimitExceeded || null;
    
    // Start token refill interval
    this._startRefill();
  }

  /**
   * Start periodic token refill
   */
  _startRefill() {
    this.interval = setInterval(() => {
      this._refillTokens();
    }, this.windowMs);
    
    // Don't keep process alive just for this interval
    this.interval.unref();
  }

  /**
   * Refill tokens based on time elapsed
   */
  _refillTokens() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = Math.floor((elapsed / this.windowMs) * this.maxRequests);
    
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.maxRequests, this.tokens + tokensToAdd);
      this.lastRefill = now;
      
      // Process waiting requests
      this._processQueue();
    }
  }

  /**
   * Process queued requests
   */
  _processQueue() {
    while (this.waitQueue.length > 0 && this.tokens >= 1) {
      const { resolve } = this.waitQueue.shift();
      this.tokens -= 1;
      resolve();
    }
  }

  /**
   * Acquire a token, waiting if necessary
   */
  async acquire() {
    // Try to acquire immediately
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Wait for a token
    return new Promise((resolve) => {
      this.waitQueue.push({ resolve });
      
      // If queue is too long, notify
      if (this.onLimitExceeded && this.waitQueue.length > this.maxRequests) {
        this.onLimitExceeded(this.waitQueue.length);
      }
    });
  }

  /**
   * Try to acquire without waiting
   */
  tryAcquire() {
    this._refillTokens();
    
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  /**
   * Get current queue size
   */
  getQueueSize() {
    return this.waitQueue.length;
  }

  /**
   * Get available tokens
   */
  getAvailableTokens() {
    this._refillTokens();
    return Math.floor(this.tokens);
  }

  /**
   * Reset the rate limiter
   */
  reset() {
    this.tokens = this.maxRequests;
    this.lastRefill = Date.now();
    this.waitQueue = [];
  }

  /**
   * Stop the rate limiter
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

/**
 * Sliding Window Rate Limiter (more accurate)
 */
class SlidingWindowRateLimiter {
  constructor(options = {}) {
    this.maxRequests = options.maxRequests || 100;
    this.windowMs = options.windowMs || 60000;
    this.requests = [];
  }

  /**
   * Clean up old requests outside the window
   */
  _cleanup() {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    this.requests = this.requests.filter(time => time > cutoff);
  }

  /**
   * Acquire a slot (wait if necessary)
   */
  async acquire() {
    this._cleanup();
    
    if (this.requests.length < this.maxRequests) {
      this.requests.push(Date.now());
      return;
    }

    // Wait until oldest request exits the window
    const oldestRequest = this.requests[0];
    const waitTime = oldestRequest + this.windowMs - Date.now();
    
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this._cleanup();
    this.requests.push(Date.now());
  }

  /**
   * Try to acquire without waiting
   */
  tryAcquire() {
    this._cleanup();
    
    if (this.requests.length < this.maxRequests) {
      this.requests.push(Date.now());
      return true;
    }
    return false;
  }

  /**
   * Get current request count in window
   */
  getRequestCount() {
    this._cleanup();
    return this.requests.length;
  }

  /**
   * Get time until next slot available
   */
  getWaitTime() {
    this._cleanup();
    
    if (this.requests.length < this.maxRequests) {
      return 0;
    }
    
    const oldestRequest = this.requests[0];
    return oldestRequest + this.windowMs - Date.now();
  }
}

/**
 * Adaptive Rate Limiter - adjusts based on server responses
 */
class AdaptiveRateLimiter {
  constructor(options = {}) {
    this.minRequests = options.minRequests || 10;
    this.maxRequests = options.maxRequests || 100;
    this.windowMs = options.windowMs || 60000;
    
    this.currentLimit = this.maxRequests;
    this.baseLimiter = new SlidingWindowRateLimiter({
      maxRequests: this.currentLimit,
      windowMs: this.windowMs
    });
    
    this.consecutiveSuccesses = 0;
    this.consecutiveFailures = 0;
  }

  /**
   * Acquire a slot
   */
  async acquire() {
    await this.baseLimiter.acquire();
  }

  /**
   * Record a successful request
   */
  recordSuccess() {
    this.consecutiveSuccesses++;
    this.consecutiveFailures = 0;
    
    // Increase limit if consistently successful
    if (this.consecutiveSuccesses >= 10 && this.currentLimit < this.maxRequests) {
      this.currentLimit = Math.min(this.currentLimit + 5, this.maxRequests);
      this.baseLimiter = new SlidingWindowRateLimiter({
        maxRequests: this.currentLimit,
        windowMs: this.windowMs
      });
      this.consecutiveSuccesses = 0;
    }
  }

  /**
   * Record a failed request (rate limited)
   */
  recordRateLimit() {
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;
    
    // Decrease limit on rate limit errors
    if (this.consecutiveFailures >= 2 && this.currentLimit > this.minRequests) {
      this.currentLimit = Math.max(this.currentLimit - 10, this.minRequests);
      this.baseLimiter = new SlidingWindowRateLimiter({
        maxRequests: this.currentLimit,
        windowMs: this.windowMs
      });
    }
  }

  /**
   * Get current rate limit
   */
  getCurrentLimit() {
    return this.currentLimit;
  }
}

module.exports = { 
  RateLimiter,
  SlidingWindowRateLimiter,
  AdaptiveRateLimiter
};