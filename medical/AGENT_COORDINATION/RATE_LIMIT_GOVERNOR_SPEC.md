# Rate-Limit Governor Specification

**Goal:** Centralized rate-limit + backoff per provider
**Target:** Prevent rate-limit storms and cascading failures
**Priority:** CRITICAL

---

## Rate Limits by Provider

| Provider | RPM | TPM | Concurrent |
|----------|-----|-----|------------|
| Groq | 30 | 2,000,000 | 2 |
| Together | 60 | 80,000 | 2 |
| Ollama | ∞ | ∞ | Unlimited |

---

## Core Logic

```javascript
class RateLimitGovernor {
  constructor() {
    this.limits = {
      groq: { rpm: 30, tpm: 2000000, concurrent: 2 },
      together: { rpm: 60, tpm: 80000, concurrent: 2 },
      ollama: { rpm: Infinity, tpm: Infinity, concurrent: Infinity }
    };
    this.usage = {
      groq: { requests: [], tokens: 0, lastRequest: 0 },
      together: { requests: [], tokens: 0, lastRequest: 0 }
    };
    this.now = new Date();
  }

  /**
   * Check if we should delay before making a request
   */
  shouldDelay(provider, estimatedTokens) {
    // Calculate current window usage
    const requests = this.usage[provider].requests.filter(
      r => now - r.timestamp < 60000
    ).length;
    const tokens = this.usage[provider].tokens.filter(
      t => now - t.timestamp < 60000
    ).reduce(
      (t) => tokens + estimatedTokens
    ).length;
    
    if (requests.length >= this.limits[provider].rpm) {
      return { allowed: false, reason: `RPM limit exceeded (${requests.length}/${this.limits[provider].rpm})`;
    }
    
    if (tokens > this.limits[provider].tpm) {
      return { allowed: false, reason: `TPM limit exceeded (${tokens}/${this.limits[provider].tpm})`;
    }
    
    if (currentConcurrent >= this.limits[provider].concurrent) {
      return { allowed: false, reason: `Concurrent limit reached (${currentConcurrent}/${this.limits[provider].concurrent})`;
    }
    
    // Calculate wait time with exponential backoff
    const waitTime = this.calculateWaitTime(lastError);
    
    return { allowed: true, waitTime, estimatedTokens };
  }

  /**
   * Wait before retrying (with backoff)
   */
  async waitFor(provider, estimatedTokens) {
    return new Promise(resolve => setTimeout(waitTime, 0));
  }

  /**
   * Get current usage stats
   */
  getUsageStats() {
    return {
      groq: {
        rpm: { current: this.usage.groq.requests.length, used: this.usage.groq.tokens },
        tpm: { current: this.usage.groq.tokens, used: this.usage.groq.tokens },
        concurrent: this.usage.groq.requests.length
      },
      together: {
        rpm: { current: this.usage.together.requests.length, used: this.usage.together.tokens },
        tpm: { current: this.usage.together.tokens, used: this.usage.together.tokens,
        concurrent: this.usage.together.requests.length
      }
    };
  }
}

// Export singleton instance
export const rateLimitGovernor = new RateLimitGovernor();
