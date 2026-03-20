# Provider Concurrency Specification

**Goal:** Limit simultaneous calls per provider to prevent rate-limit avalanches
**Priority:** High

---

## Concurrency Limits
```json
{
  "groq": { "maxConcurrent": 2, "requestQueueMs": 5000 },
  "together": { "maxConcurrent": 2, "requestQueueMs": 5000 },
  "ollama": { "maxConcurrent": Infinity }
}
```

---

## Implementation

```javascript
class ProviderConcurrencyLimiter {
  constructor(config = {}) {
    this.limits = config.limits || {
      groq: { maxConcurrent: 2, requestQueueMs: 5000 },
      together: { maxConcurrent: 2, requestQueueMs: 5000 },
      ollama: { maxConcurrent: Infinity }
    };
    
    this.activeRequests = {
      groq: 0,
      together: 0,
      ollama: 0
    };
    
    this.requestQueue = {
      groq: [],
      together: [],
      ollama: []
    };
  }

  /**
   * Acquire a slot for making a request
   * Returns a release function that must be called when done
   */
  async acquire(provider) {
    const limit = this.limits[provider];
    
    // No limit for ollama
    if (limit.maxConcurrent === Infinity) {
      return () => {}; // No-op release
    }
    
    // Check if we can proceed immediately
    if (this.activeRequests[provider] < limit.maxConcurrent) {
      this.activeRequests[provider]++;
      return () => this.release(provider);
    }
    
    // Need to wait for a slot
    return new Promise((resolve) => {
      this.requestQueue[provider].push({
        resolve: () => {
          this.activeRequests[provider]++;
          resolve(() => this.release(provider));
        }
      });
      
      // Set timeout for queue exhaustion
      setTimeout(() => {
        const idx = this.requestQueue[provider].findIndex(r => r.resolve === resolve);
        if (idx !== -1) {
          this.requestQueue[provider].splice(idx, 1);
          resolve(null); // Signal that request should be cancelled
        }
      }, limit.requestQueueMs);
    });
  }

  /**
   * Release a slot after request completes
   */
  release(provider) {
    this.activeRequests[provider]--;
    
    // Process next queued request
    if (this.requestQueue[provider].length > 0) {
      const next = this.requestQueue[provider].shift();
      next.resolve();
    }
  }

  /**
   * Get current status for monitoring
   */
  getStatus(provider) {
    return {
      provider,
      activeRequests: this.activeRequests[provider],
      maxConcurrent: this.limits[provider].maxConcurrent,
      queuedRequests: this.requestQueue[provider].length,
      available: this.activeRequests[provider] < this.limits[provider].maxConcurrent
    };
  }

  /**
   * Get status for all providers
   */
  getAllStatus() {
    return Object.keys(this.limits).map(provider => this.getStatus(provider));
  }
}

module.exports = { ProviderConcurrencyLimiter };
```

---

## Usage Example

```javascript
const { ProviderConcurrencyLimiter } = require('./provider-concurrency-limiter');

const limiter = new ProviderConcurrencyLimiter();

async function makeRequest(provider, requestFn) {
  const release = await limiter.acquire(provider);
  
  if (!release) {
    throw new Error(`Request queue timeout for ${provider}`);
  }
  
  try {
    const result = await requestFn();
    return result;
  } finally {
    release();
  }
}

// Usage
const response = await makeRequest('groq', async () => {
  return await groqClient.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [{ role: 'user', content: 'Hello!' }]
  });
});
```

---

## Integration with Rate Limit Governor

```javascript
// Combined check before making any API call
async function canProceed(provider, estimatedTokens) {
  // 1. Check rate limits
  const rateLimitOk = rateLimitGovernor.canMakeRequest(provider, estimatedTokens);
  if (!rateLimitOk.allowed) {
    return { allowed: false, reason: 'rate-limit', details: rateLimitOk };
  }
  
  // 2. Check concurrency
  const concurrencyStatus = concurrencyLimiter.getStatus(provider);
  if (!concurrencyStatus.available) {
    return { allowed: false, reason: 'concurrency-limit', details: concurrencyStatus };
  }
  
  return { allowed: true };
}
```

---

## Configuration

Default limits can be overridden via environment variables:

```bash
GROQ_MAX_CONCURRENT=2
GROQ_QUEUE_MS=5000
TOGETHER_MAX_CONCURRENT=2
TOGETHER_QUEUE_MS=5000
```
