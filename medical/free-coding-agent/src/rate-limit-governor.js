/**
 * RATE LIMIT GOVERNOR
 *
 * Prevents rate-limit avalanches by:
 * - Tracking usage per provider
 * - Implementing backoff strategies
 * - Enforcing concurrency caps
 * - Routing to local when limits hit
 */

import { EventEmitter } from 'events';

// Provider rate limits (based on actual provider docs)
const PROVIDER_LIMITS = {
  ollama: {
    rpm: Infinity,  // No rate limit
    tpm: Infinity,
    daily: Infinity,
    maxConcurrent: 4  // Based on CPU cores
  },
  groq: {
    rpm: 30,     // ~30 requests/minute
    tpm: 200000,  // ~200K tokens/minute
    daily: 15000000,  // ~15M tokens/day (free tier)
    maxConcurrent: 2
  },
  together: {
    rpm: 60,
    tpm: 100000,
    daily: 10000000,  // ~10M tokens/day
    maxConcurrent: 2
  }
};

// Backoff strategies
const BACKOFF_STRATEGIES = {
  DELAY: 'delay',       // Wait before retrying
  REROUTE: 'reroute',  // Send to different provider
  DROP: 'drop',         // Don't process
  SUMMARY: 'summary'     // Return shorter response
};

export class RateLimitGovernor extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      defaultStrategy: BACKOFF_STRATEGIES.DELAY,
      backoffMultiplier: 1.5,  // Exponential backoff
      maxBackoffMs: 30000,    // Max 30 seconds
      jitterMs: 1000,          // Add randomness
      ...config
    };

    // Track usage per provider
    this.usage = new Map(); // providerId -> { requests: [], tokens: [], concurrent: 0 }

    // Backoff state
    this.backoffs = new Map(); // providerId -> { until, strategy, reason }

    // Initialize tracking for all providers
    Object.keys(PROVIDER_LIMITS).forEach(provider => {
      this.usage.set(provider, {
        requests: [],      // Sliding window of request timestamps
        tokens: [],         // Sliding window of token counts
        concurrent: 0,
        totalTokensToday: 0,
        requestCountToday: 0
      });
    });
  }

  /**
   * Check if a request would exceed rate limits
   */
  canRequest(provider, tokens = 0, now = Date.now()) {
    const limits = PROVIDER_LIMITS[provider];
    if (!limits) {
      return { allowed: true, reason: 'unknown provider, allowing' };
    }

    const usage = this.usage.get(provider);
    const windowMs = 60000; // 1 minute window

    // Clean up old entries
    this._cleanup(usage, now, windowMs);

    // Check concurrent requests
    if (usage.concurrent >= limits.maxConcurrent) {
      return {
        allowed: false,
        reason: 'concurrent_limit',
        current: usage.concurrent,
        limit: limits.maxConcurrent,
        backoffMs: 1000
      };
    }

    // Check RPM
    const requestsInMinute = usage.requests.filter(t => now - t < windowMs).length;
    if (requestsInMinute >= limits.rpm) {
      const oldestRequest = Math.min(...usage.requests.filter(t => now - t < windowMs));
      const waitMs = windowMs - (now - oldestRequest) + this.config.jitterMs;

      return {
        allowed: false,
        reason: 'rpm_limit',
        current: requestsInMinute,
        limit: limits.rpm,
        backoffMs: Math.min(waitMs, this.config.maxBackoffMs)
      };
    }

    // Check TPM
    const tokensInMinute = usage.tokens
      .filter(t => now - t.timestamp < windowMs)
      .reduce((sum, t) => sum + t.count, 0);

    if (tokensInMinute + tokens > limits.tpm) {
      const availableTokens = limits.tpm - tokensInMinute;

      if (availableTokens <= 0) {
        const oldestToken = usage.tokens
          .filter(t => now - t.timestamp < windowMs)
          .sort((a, b) => a.timestamp - b.timestamp)[0];

        const waitMs = windowMs - (now - oldestToken.timestamp) + this.config.jitterMs;

        return {
          allowed: false,
          reason: 'tpm_limit',
          current: tokensInMinute,
          limit: limits.tpm,
          available: 0,
          backoffMs: Math.min(waitMs, this.config.maxBackoffMs),
          suggestion: 'Use local provider or reduce request size'
        };
      } else {
        return {
          allowed: true,
          reason: 'tpm_partial',
          available: availableTokens,
          maxTokens: availableTokens
        };
      }
    }

    // Check daily quota
    if (usage.totalTokensToday + tokens > limits.daily) {
      const remaining = limits.daily - usage.totalTokensToday;

      return {
        allowed: false,
        reason: 'daily_limit',
        current: usage.totalTokensToday,
        limit: limits.daily,
        available: remaining,
        backoffMs: this.config.maxBackoffMs,
        suggestion: 'Switch to local provider for remaining requests'
      };
    }

    return { allowed: true };
  }

  /**
   * Record a request
   */
  recordRequest(provider, tokens = 0, now = Date.now()) {
    const usage = this.usage.get(provider);
    if (!usage) return;

    usage.requests.push(now);
    usage.tokens.push({ timestamp: now, count: tokens });
    usage.totalTokensToday += tokens;
    usage.requestCountToday++;
    usage.concurrent++;

    this.emit('request_recorded', { provider, tokens, now });

    // Check daily reset (at midnight)
    this._checkDailyReset(usage, now);
  }

  /**
   * Mark request as complete
   */
  completeRequest(provider, now = Date.now()) {
    const usage = this.usage.get(provider);
    if (!usage) return;

    usage.concurrent--;
    this.emit('request_completed', { provider, now });
  }

  /**
   * Get recommended provider for request
   */
  getRecommendedProvider(taskType, options = {}) {
    const {
      preferLocal = true,
      requireCloud = false,
      estimatedTokens = 0
    } = options;

    // If explicitly require cloud (special cases)
    if (requireCloud) {
      return this._selectCloudProvider(estimatedTokens);
    }

    // If preferLocal, try ollama first
    if (preferLocal) {
      const ollamaStatus = this.canRequest('ollama', estimatedTokens);
      if (ollamaStatus.allowed) {
        return 'ollama';
      }
    }

    // Otherwise, select best cloud provider
    return this._selectCloudProvider(estimatedTokens);
  }

  /**
   * Local-first routing decision with multi-agent awareness
   * CRITICAL: Multi-agent scenarios ALWAYS use local to prevent rate limit exhaustion
   */
  shouldRouteTo(task) {
    const { taskType, latencyTolerance, accuracyRequired, contextLength, selectedAgents, message } = task;
    
    // Rule 1: Check if local is available
    if (!process.env.OLLAMA_ENABLED && !process.env.OLLAMA_HOST) {
      console.warn('[Router] Ollama not configured, falling back to cloud');
      return this._selectCloudProvider(contextLength || 1000);
    }
    
    // Rule 2: Multi-agent scenarios ALWAYS use local (prevents rate limit avalanche)
    // This is CRITICAL - running multiple agents in parallel on cloud burns rate limits
    if (selectedAgents && selectedAgents.length > 1) {
      console.log('[Router] Multi-agent scenario, using local (rate limit protection)');
      return 'ollama';
    }
    
    // Rule 3: Use local if context is short
    if (contextLength && contextLength < 4000) {
      return 'ollama';
    }
    
    // Rule 4: Use local if accuracy isn't critical (no medical/compliance keywords)
    const messageText = message || '';
    if (!/\b(analyze|comprehensive|detailed|HIPAA|CDC|WHO|critical|urgent)\b/i.test(messageText)) {
      return 'ollama';
    }
    
    // Rule 5: Use local for routine reasoning (no speed keywords)
    if (!/\b(fast|quick|parallel|urgent|immediate)\b/i.test(messageText)) {
      return 'ollama';
    }
    
    // Rule 6: Escalate to cloud for heavy tasks only
    if (taskType === 'heavy' || taskType === 'complex' || taskType === 'security-audit') {
      // Check rate limits before escalating
      const groqStatus = this.canRequest('groq', contextLength || 2000);
      if (groqStatus.allowed) {
        console.log('[Router] Heavy task, escalating to Groq');
        return 'groq';
      }
      
      const togetherStatus = this.canRequest('together', contextLength || 2000);
      if (togetherStatus.allowed) {
        console.log('[Router] Heavy task, escalating to Together');
        return 'together';
      }
      
      // Cloud rate limited, fall back to local
      console.warn('[Router] Cloud rate limited, using local for heavy task');
      return 'ollama';
    }
    
    // Default: Always prefer local
    return 'ollama';
  }

  /**
   * Get backoff strategy when blocked
   */
  getBackoffStrategy(provider, reason) {
    const strategy = this.backoffs.get(provider);

    if (strategy && strategy.until > Date.now()) {
      return {
        wait: strategy.until - Date.now(),
        strategy: strategy.strategy,
        reason: strategy.reason
      };
    }

    // Clear expired backoffs
    if (strategy) {
      this.backoffs.delete(provider);
    }

    // Determine new strategy based on reason
    let selectedStrategy = this.config.defaultStrategy;
    let backoffMs = 0;

    switch (reason) {
      case 'rpm_limit':
      case 'tpm_limit':
        // Short backoff, try again soon
        selectedStrategy = BACKOFF_STRATEGIES.DELAY;
        backoffMs = 2000 + Math.random() * 1000;
        break;

      case 'daily_limit':
        // Long backoff or reroute
        selectedStrategy = BACKOFF_STRATEGIES.REROUTE;
        backoffMs = 60000; // Wait 1 min before considering
        break;

      case 'concurrent_limit':
        // Very short backoff
        selectedStrategy = BACKOFF_STRATEGIES.DELAY;
        backoffMs = 500 + Math.random() * 500;
        break;

      default:
        selectedStrategy = BACKOFF_STRATEGIES.DELAY;
        backoffMs = 1000;
    }

    // Set backoff state
    this.backoffs.set(provider, {
      until: Date.now() + backoffMs,
      strategy: selectedStrategy,
      reason: reason
    });

    this.emit('backoff_set', { provider, strategy: selectedStrategy, reason, backoffMs });

    return {
      wait: backoffMs,
      strategy: selectedStrategy,
      reason: reason
    };
  }

  /**
   * Get usage statistics
   */
  getStats() {
    const stats = {};
    const now = Date.now();
    const windowMs = 60000;

    for (const [provider, limits] of Object.entries(PROVIDER_LIMITS)) {
      const usage = this.usage.get(provider);
      if (!usage) continue;

      this._cleanup(usage, now, windowMs);

      const requestsInMinute = usage.requests.filter(t => now - t < windowMs).length;
      const tokensInMinute = usage.tokens
        .filter(t => now - t.timestamp < windowMs)
        .reduce((sum, t) => sum + t.count, 0);

      stats[provider] = {
        rpm: {
          current: requestsInMinute,
          limit: limits.rpm,
          percentage: limits.rpm === Infinity ? 0 : (requestsInMinute / limits.rpm * 100)
        },
        tpm: {
          current: tokensInMinute,
          limit: limits.tpm,
          percentage: limits.tpm === Infinity ? 0 : (tokensInMinute / limits.tpm * 100)
        },
        daily: {
          current: usage.totalTokensToday,
          limit: limits.daily,
          percentage: limits.daily === Infinity ? 0 : (usage.totalTokensToday / limits.daily * 100)
        },
        concurrent: {
          current: usage.concurrent,
          limit: limits.maxConcurrent,
          percentage: usage.concurrent / limits.maxConcurrent * 100
        },
        backoff: this.backoffs.get(provider)
      };
    }

    return stats;
  }

  /**
   * Reset all stats (for testing or new day)
   */
  reset(provider = null) {
    if (provider) {
      const limits = PROVIDER_LIMITS[provider];
      if (limits) {
        this.usage.set(provider, {
          requests: [],
          tokens: [],
          concurrent: 0,
          totalTokensToday: 0,
          requestCountToday: 0
        });
      }
    } else {
      // Reset all
      Object.keys(PROVIDER_LIMITS).forEach(p => {
        this.reset(p);
      });
    }

    this.emit('reset', { provider });
  }

  // Private methods

  _cleanup(usage, now, windowMs) {
    // Remove requests older than window
    usage.requests = usage.requests.filter(t => now - t < windowMs);
    usage.tokens = usage.tokens.filter(t => now - t.timestamp < windowMs);
  }

  _checkDailyReset(usage, now) {
    const lastReset = usage.lastDailyReset || 0;
    const oneDay = 24 * 60 * 60 * 1000;

    if (now - lastReset > oneDay) {
      usage.totalTokensToday = 0;
      usage.requestCountToday = 0;
      usage.lastDailyReset = now;
      this.emit('daily_reset', { now });
    }
  }

  _selectCloudProvider(estimatedTokens) {
    // Try groq first (faster), then together
    const groqStatus = this.canRequest('groq', estimatedTokens);

    if (groqStatus.allowed || (groqStatus.reason === 'tpm_partial')) {
      return 'groq';
    }

    const togetherStatus = this.canRequest('together', estimatedTokens);
    if (togetherStatus.allowed || (togetherStatus.reason === 'tpm_partial')) {
      return 'together';
    }

    // If neither available, return ollama (no limits)
    return 'ollama';
  }
}

export { PROVIDER_LIMITS, BACKOFF_STRATEGIES };
