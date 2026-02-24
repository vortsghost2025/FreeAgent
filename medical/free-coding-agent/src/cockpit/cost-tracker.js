/**
 * Cost Tracker - Track $0 Usage Across All Providers
 *
 * Monitors and displays cost information for all providers.
 * Since we're using FREE providers, this always shows $0!
 *
 * Features:
 * - Real-time cost tracking
 * - Provider breakdown
 * - Usage statistics
 * - Rate limit monitoring
 * - Savings calculator (vs paid services)
 */

import { EventEmitter } from "events";

// Provider cost information
const PROVIDER_COSTS = {
  "ollama-local": {
    name: "Ollama (Local)",
    costPerToken: 0,
    type: "free",
    description: "Local inference - always free",
  },
  lmstudio: {
    name: "LM Studio",
    costPerToken: 0,
    type: "free",
    description: "Local inference - always free",
  },
  "ollama-remote": {
    name: "Ollama (VPS)",
    costPerToken: 0,
    type: "free",
    description: "Remote Ollama on your VPS - always free",
  },
  groq: {
    name: "Groq Free Tier",
    costPerToken: 0,
    type: "free",
    dailyLimit: 14400,
    description: "14,400 free requests/day",
  },
  openrouter: {
    name: "OpenRouter Free",
    costPerToken: 0,
    type: "free",
    description: "Free tier models available",
  },
  huggingface: {
    name: "HuggingFace Free",
    costPerToken: 0,
    type: "free",
    description: "Free inference API",
  },
  "cloudflare-ai": {
    name: "Cloudflare AI Free",
    costPerToken: 0,
    type: "free",
    dailyLimit: 10000,
    description: "10,000 neurons/day free",
  },
  together: {
    name: "Together AI",
    costPerToken: 0,
    type: "credits",
    description: "Using free credits",
  },
};

// Comparison costs for paid services
const PAID_SERVICE_COSTS = {
  "claude-code": {
    name: "Claude Code",
    monthlyBase: 20,
    perTokenCost: 0.00001,
    description: "Anthropic Claude Code subscription",
  },
  "github-copilot": {
    name: "GitHub Copilot",
    monthlyBase: 19,
    perTokenCost: 0,
    description: "GitHub Copilot Pro",
  },
  "openai-gpt4": {
    name: "OpenAI GPT-4",
    monthlyBase: 20,
    perTokenCost: 0.00003,
    description: "OpenAI ChatGPT Plus",
  },
};

export class CostTracker extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = config;

    // Usage tracking
    this.usage = new Map();

    // Initialize usage for all providers
    for (const providerId of Object.keys(PROVIDER_COSTS)) {
      this.usage.set(providerId, {
        requests: 0,
        tokens: 0,
        cost: 0,
        lastUsed: null,
      });
    }

    // Daily/weekly/monthly aggregates
    this.dailyUsage = [];
    this.weeklyUsage = [];
    this.monthlyUsage = [];

    // Savings tracking
    this.totalSavings = 0;

    // Start of tracking
    this.trackingStarted = Date.now();

    console.log("💰 Cost Tracker initialized - All providers are FREE!");
  }

  /**
   * Record usage for a provider
   */
  recordUsage(providerId, tokens = 0) {
    const usage = this.usage.get(providerId);
    if (!usage) {
      // Create new entry for unknown provider
      this.usage.set(providerId, {
        requests: 1,
        tokens,
        cost: 0,
        lastUsed: Date.now(),
      });
      return;
    }

    usage.requests++;
    usage.tokens += tokens;
    usage.cost = 0; // Always free!
    usage.lastUsed = Date.now();

    // Calculate savings vs paid services
    this.calculateSavings(tokens);

    this.emit("usage_recorded", { providerId, tokens, cost: 0 });
  }

  /**
   * Calculate savings compared to paid services
   */
  calculateSavings(tokens) {
    // Average cost if using paid services
    const avgPaidCost = tokens * 0.00002; // ~$0.02 per 1000 tokens average
    this.totalSavings += avgPaidCost;
  }

  /**
   * Get usage for a specific provider
   */
  getProviderUsage(providerId) {
    return this.usage.get(providerId) || null;
  }

  /**
   * Get total usage across all providers
   */
  getTotalUsage() {
    let totalRequests = 0;
    let totalTokens = 0;
    let totalCost = 0;

    for (const usage of this.usage.values()) {
      totalRequests += usage.requests;
      totalTokens += usage.tokens;
      totalCost += usage.cost;
    }

    return {
      requests: totalRequests,
      tokens: totalTokens,
      cost: totalCost, // Always 0!
    };
  }

  /**
   * Get cost summary
   */
  getCostSummary() {
    const total = this.getTotalUsage();
    const breakdown = {};

    for (const [providerId, usage] of this.usage) {
      const providerInfo = PROVIDER_COSTS[providerId] || { name: providerId };
      breakdown[providerId] = {
        name: providerInfo.name,
        requests: usage.requests,
        tokens: usage.tokens,
        cost: 0,
        type: providerInfo.type || "free",
      };
    }

    return {
      totalCost: 0,
      dailyCost: 0,
      weeklyCost: 0,
      monthlyCost: 0,
      currency: "USD",
      message:
        "🎉 All providers are FREE! You saved $" +
        this.totalSavings.toFixed(2) +
        " so far!",
      totalRequests: total.requests,
      totalTokens: total.tokens,
      breakdown,
      savings: {
        total: this.totalSavings,
        vsClaudeCode: this.calculateVsPaidService("claude-code"),
        vsGitHubCopilot: this.calculateVsPaidService("github-copilot"),
        vsOpenAI: this.calculateVsPaidService("openai-gpt4"),
      },
      trackingDuration: Date.now() - this.trackingStarted,
    };
  }

  /**
   * Calculate savings vs a specific paid service
   */
  calculateVsPaidService(serviceId) {
    const service = PAID_SERVICE_COSTS[serviceId];
    if (!service) return 0;

    const total = this.getTotalUsage();
    const daysTracking =
      (Date.now() - this.trackingStarted) / (24 * 60 * 60 * 1000);
    const monthsTracking = daysTracking / 30;

    // Base subscription cost
    const subscriptionCost = service.monthlyBase * monthsTracking;

    // Token cost
    const tokenCost = total.tokens * service.perTokenCost;

    return subscriptionCost + tokenCost;
  }

  /**
   * Get rate limit status for all providers
   */
  getRateLimitStatus() {
    const status = {};

    for (const [providerId, info] of Object.entries(PROVIDER_COSTS)) {
      const usage = this.usage.get(providerId);

      status[providerId] = {
        name: info.name,
        type: info.type,
        dailyLimit: info.dailyLimit || "unlimited",
        used: usage?.requests || 0,
        remaining: info.dailyLimit
          ? info.dailyLimit - (usage?.requests || 0)
          : "unlimited",
        percentUsed: info.dailyLimit
          ? (((usage?.requests || 0) / info.dailyLimit) * 100).toFixed(1)
          : 0,
      };
    }

    return status;
  }

  /**
   * Get comparison with paid services
   */
  getPaidComparison() {
    const total = this.getTotalUsage();
    const daysTracking = Math.max(
      1,
      (Date.now() - this.trackingStarted) / (24 * 60 * 60 * 1000),
    );

    const comparisons = [];

    for (const [serviceId, service] of Object.entries(PAID_SERVICE_COSTS)) {
      const monthlyTokenCost =
        (total.tokens / daysTracking) * 30 * service.perTokenCost;
      const totalMonthlyCost = service.monthlyBase + monthlyTokenCost;

      comparisons.push({
        service: service.name,
        description: service.description,
        monthlyBase: service.monthlyBase,
        estimatedTokenCost: monthlyTokenCost,
        totalMonthlyCost,
        yearlyCost: totalMonthlyCost * 12,
        yourCost: 0,
        savings: totalMonthlyCost,
      });
    }

    return {
      yourMonthlyCost: 0,
      yourYearlyCost: 0,
      comparisons,
      totalMonthlySavings: comparisons.reduce((sum, c) => sum + c.savings, 0),
      totalYearlySavings:
        comparisons.reduce((sum, c) => sum + c.savings, 0) * 12,
    };
  }

  /**
   * Get dashboard data for cost display
   */
  getDashboardData() {
    return {
      summary: this.getCostSummary(),
      rateLimits: this.getRateLimitStatus(),
      comparison: this.getPaidComparison(),
      providers: Object.entries(PROVIDER_COSTS).map(([id, info]) => ({
        id,
        ...info,
        usage: this.usage.get(id),
      })),
    };
  }

  /**
   * Reset daily usage (call at midnight)
   */
  resetDailyUsage() {
    // Archive current day
    this.dailyUsage.push({
      date: new Date().toISOString().split("T")[0],
      usage: Object.fromEntries(this.usage),
    });

    // Keep only last 30 days
    if (this.dailyUsage.length > 30) {
      this.dailyUsage.shift();
    }

    // Reset request counts (but keep tokens for total tracking)
    for (const usage of this.usage.values()) {
      usage.requests = 0;
    }

    this.emit("daily_reset");
  }

  /**
   * Get historical usage
   */
  getHistoricalUsage(days = 7) {
    return this.dailyUsage.slice(-days);
  }

  /**
   * Export usage data
   */
  exportData() {
    return {
      exportedAt: new Date().toISOString(),
      trackingStarted: new Date(this.trackingStarted).toISOString(),
      summary: this.getCostSummary(),
      rateLimits: this.getRateLimitStatus(),
      comparison: this.getPaidComparison(),
      dailyHistory: this.dailyUsage,
    };
  }
}

export default CostTracker;
