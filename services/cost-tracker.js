/**
 * Cost Tracking Layer
 * Monitors token usage and costs across all agent calls
 */

const { getCoordinator } = require('./agent-coordinator');

class CostTracker {
  constructor() {
    this.coordinator = getCoordinator();
    this.callHistory = new Map();
    this.sessionCosts = new Map();
    this.totalTokens = 0;
    this.totalCost = 0;
    this.alertThresholds = {
      warning: 10000,    // $10
      critical: 50000,   // $50
      emergency: 100000   // $100
    };
  }

  /**
   * Track a method call
   */
  async trackMethodCall(agentId, method, input, estimatedTokens) {
    const callId = this.generateCallId();
    const startTime = Date.now();

    try {
      // Record call start
      this.callHistory.set(callId, {
        agentId,
        method,
        input,
        startTime,
        estimatedTokens,
        status: 'executing'
      });

      // Update agent context
      await this.coordinator.updateContext(agentId, {
        current_operation: `method_call_${method}`,
        estimated_cost: this.estimateCost(estimatedTokens)
      });

      // In real implementation, this would execute the method
      const result = await this.simulateMethodExecution(method, input);

      // Update call history
      this.callHistory.set(callId, {
        ...this.callHistory.get(callId),
        endTime: Date.now(),
        actualTokens: result.tokens_used,
        actualCost: result.cost,
        status: 'completed'
      });

      // Update totals
      this.totalTokens += result.tokens_used;
      this.totalCost += result.cost;

      // Log to coordinator
      await this.coordinator.updateContext(agentId, {
        current_operation: 'method_call_completed',
        result_summary: `${method} call completed`
      });

      return {
        success: true,
        call_id: callId,
        cost_summary: {
          method,
          estimated_tokens: estimatedTokens,
          actual_tokens: result.tokens_used,
          estimated_cost: this.estimateCost(estimatedTokens),
          actual_cost: result.cost
        },
        usage: {
          total_tokens: this.totalTokens,
          total_cost: this.totalCost
        }
      };

    } catch (error) {
      // Log error
      this.callHistory.set(callId, {
        ...this.callHistory.get(callId),
        endTime: Date.now(),
        status: 'error',
        error: error.message
      });

      await this.coordinator.updateContext(agentId, {
        current_operation: 'method_call_error',
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        call_id: callId
      };
    }
  }

  /**
   * Simulate method execution (for demo purposes)
   */
  async simulateMethodExecution(method, input) {
    // In real implementation, this would execute the actual method
    // For now, return simulated results
    const estimatedTokens = this.estimateTokens(JSON.stringify(input));
    return {
      tokens_used: estimatedTokens,
      cost: this.estimateCost(estimatedTokens),
      success: true
    };
  }

  /**
   * Estimate tokens from text
   */
  estimateTokens(text) {
    // Rough estimation: 4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimate cost from tokens
   */
  estimateCost(tokens) {
    // Assuming $0.001 per 1000 tokens (adjust based on actual pricing)
    return (tokens / 1000) * 0.001;
  }

  /**
   * Track recursive calls specifically
   */
  async trackRecursiveCall(agentId, prompt, context) {
    const estimatedTokens = this.estimateTokens(prompt);

    // Call the recursive engine
    const { RecursiveEngine, getEngine } = require('./recursive-engine');
    const engine = getEngine();
    const result = await engine.executeRecursiveCall(agentId, prompt, context);

    // Update session costs
    const sessionCost = result.metadata.estimated_cost;
    const existingCost = this.sessionCosts.get(agentId) || 0;
    this.sessionCosts.set(agentId, existingCost + sessionCost);

    // Check cost alerts
    const costLevel = this.determineCostLevel(sessionCost);
    if (costLevel !== 'normal') {
      await this.sendCostAlert(agentId, sessionCost, costLevel);
    }

    return {
      success: true,
      call_id: result.call_id,
      cost_summary: result.metadata
    };
  }

  determineCostLevel(cost) {
    if (cost >= this.alertThresholds.emergency) {
      return 'emergency';
    } else if (cost >= this.alertThresholds.critical) {
      return 'critical';
    } else if (cost >= this.alertThresholds.warning) {
      return 'warning';
    }
    return 'normal';
  }

  async sendCostAlert(agentId, cost, level) {
    const alert = {
      type: 'cost_alert',
      level,
      cost,
      threshold: this.alertThresholds[level] || 'default',
      timestamp: Date.now()
    };

    await this.coordinator.sendMessage(agentId, `⚠️ Cost Alert: ${level.toUpperCase()} - Estimated $${cost.toFixed(2)} for operation`);
  }

  /**
   * Get usage statistics
   */
  getUsageStats(agentId) {
    const agentCalls = Array.from(this.callHistory.entries())
      .filter(([id, call]) => call.agentId === agentId);

    const agentStats = {
      total_calls: agentCalls.length,
      successful_calls: agentCalls.filter(c => c.status === 'completed').length,
      failed_calls: agentCalls.filter(c => c.status === 'error').length,
      total_tokens: agentCalls.reduce((sum, c) => sum + (c.actualTokens || c.estimatedTokens), 0),
      total_cost: agentCalls.reduce((sum, c) => sum + (c.actualCost || c.estimated_cost), 0),
      average_tokens_per_call: agentCalls.length > 0 ?
        Math.round(agentCalls.reduce((sum, c) => sum + (c.actualTokens || c.estimatedTokens), 0) / agentCalls.length) : 0,
      recent_calls: agentCalls.slice(-5).map(c => ({
        method: c.method,
        status: c.status,
        tokens: c.actualTokens || c.estimatedTokens
      }))
    };

    return agentStats;
  }

  /**
   * Get system-wide costs
   */
  getSystemCosts() {
    return {
      total_tokens: this.totalTokens,
      total_cost: this.totalCost,
      calls_tracked: this.callHistory.size,
      agents_active: this.coordinator.getDashboardInfo()?.active_agents?.length || 0
    };
  }

  /**
   * Reset daily costs
   */
  async resetDailyCosts() {
    // Archive today's costs before resetting
    const dailyStats = this.getUsageStats('claude_code');

    // Reset counters
    this.callHistory.clear();
    this.sessionCosts.clear();
    this.totalTokens = 0;
    this.totalCost = 0;

    await this.coordinator.updateContext('claude_code', {
      current_operation: 'daily_cost_reset',
      previous_costs: dailyStats
    });

    return { success: true, message: 'Daily costs reset' };
  }

  /**
   * Check if agent should pause
   */
  async checkPauseCondition(agentId, operation) {
    const stats = this.getUsageStats(agentId);
    const avgTokensPerCall = stats.average_tokens_per_call;

    // Pause conditions
    if (stats.total_cost >= this.alertThresholds.critical) {
      return {
        should_pause: true,
        reason: 'Critical cost threshold reached',
        message: `Total cost $${stats.total_cost.toFixed(2)} exceeds critical threshold of $${this.alertThresholds.critical.toFixed(2)}`
      };
    }

    return { should_pause: false };
  }
}

module.exports = { CostTracker, getTracker: () => new CostTracker() };