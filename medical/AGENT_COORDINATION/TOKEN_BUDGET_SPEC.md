# Token Budgeting Specification

**Goal:** Hard caps per agent per session/day
**Target:** Prevent runaway consumption
**Priority:** High

---

## Agent Budget Configuration
```json
{
  "code": { "daily": 5000000, "session": 100000 },
  "clinical": { "daily": 2000000, "session": 500000 },
  "data": { "daily": 500000, "session": 100000 },
  "test": { "daily": 300000, "session": 50000 },
  "security": { "daily": 100000, "session": 25000 },
  "api": { "daily": 500000, "session": 100000 },
  "db": { "daily": 200000, "session": 50000 },
  "devops": { "daily": 100000, "session": 25000 }
}
```

---

## Implementation

```javascript
import fs from 'fs';
import path from 'path';

const BUDGET_FILE = path.join(process.cwd(), 'agent-budgets.json');

class TokenBudgetManager {
  constructor() {
    this.budgets = this.loadBudgets();
    this.usage = this.loadUsage();
    
    // Start cleanup interval (every 5 minutes)
    setInterval(() => this.saveUsage(), 5 * 60 * 1000);
  }

  loadBudgets() {
    try {
      if (fs.existsSync(BUDGET_FILE)) {
        const data = JSON.parse(fs.readFileSync(BUDGET_FILE, 'utf8'));
        return data.budgets || this.getDefaults();
      }
    } catch {
      return this.getDefaults();
    }
  }

  getDefaults() {
    return {
      code: { daily: 5000000, session: 100000 },
      clinical: { daily: 2000000, session: 500000 },
      data: { daily: 500000, session: 100000 },
      test: { daily: 300000, session: 50000 },
      security: { daily: 100000, session: 25000 },
      api: { daily: 500000, session: 100000 },
      db: { daily: 200000, session: 50000 },
      devops: { daily: 100000, session: 25000 }
    };
  }

  loadUsage() {
    try {
      if (fs.existsSync(BUDGET_FILE)) {
        const data = JSON.parse(fs.readFileSync(BUDGET_FILE, 'utf8'));
        return data.usage || {};
      }
    } catch {
      return {};
    }
  }

  saveUsage() {
    fs.writeFileSync(BUDGET_FILE, JSON.stringify({
      budgets: this.budgets,
      usage: this.usage
    }, null, 2));
  }

  /**
   * Check if agent can make a request
   */
  canAfford(agentId, estimatedTokens) {
    const agentBudget = this.budgets[agentId];
    if (!agentBudget) return true; // No budget set = allow
    
    const usage = this.usage[agentId] || { daily: 0, session: 0 };
    const dailyRemaining = agentBudget.daily - usage.daily;
    const sessionRemaining = agentBudget.session - usage.session;
    
    return dailyRemaining >= estimatedTokens && sessionRemaining >= estimatedTokens;
  }

  /**
   * Track token usage for an agent
   */
  trackUsage(agentId, tokens, sessionId = 'default') {
    if (!this.usage[agentId]) {
      this.usage[agentId] = { daily: 0, session: 0 };
    }
    
    this.usage[agentId].daily += tokens;
    this.usage[agentId].session += tokens;
    this.usage[agentId].lastUpdated = Date.now();
    
    // Check if over budget
    if (!this.canAfford(agentId, tokens)) {
      console.warn(`[TokenBudget] Agent ${agentId} exceeded budget!`);
      return {
        allowed: false,
        reason: 'budget-exceeded',
        budget: this.budgets[agentId],
        usage: this.usage[agentId]
      };
    }
    
    this.saveUsage();
    return {
      allowed: true,
      reason: 'within-budget',
      budget: this.budgets[agentId],
      usage: this.usage[agentId]
    };
  }

  /**
   * Get budget status for an agent
   */
  getStatus(agentId) {
    const budget = this.budgets[agentId];
    const usage = this.usage[agentId] || { daily: 0, session: 0 };
    
    if (!budget) return null;
    
    return {
      agentId,
      daily: {
        limit: budget.daily,
        used: usage.daily,
        remaining: budget.daily - usage.daily,
        percent: Math.round((usage.daily / budget.daily) * 100)
      },
      session: {
        limit: budget.session,
        used: usage.session,
        remaining: budget.session - usage.session,
        percent: Math.round((usage.session / budget.session) * 100)
      }
    };
  }

  /**
   * Reset session usage (call when starting new session)
   */
  resetSession(sessionId = 'default') {
    for (const agentId of Object.keys(this.usage)) {
      this.usage[agentId].session = 0;
    }
    this.saveUsage();
  }
}

module.exports = { TokenBudgetManager };
```

---

## Usage Example

```javascript
const { TokenBudgetManager } = require('./token-budget-manager');

const budgetManager = new TokenBudgetManager();

// Before making API call
if (budgetManager.canAfford('code', 5000)) {
  // Make the call
  const result = await llm.generate(prompt);
  
  // Track usage
  budgetManager.trackUsage('code', result.tokensUsed);
} else {
  // Fallback to local or cached response
  console.log('Budget exceeded, using fallback');
}
```

---

## Integration Points

1. **ensemble-cli.js** - Check budget before dispatching to agents
2. **adaptive-router.js** - Consider budget when selecting provider
3. **rate-limit-governor.js** - Use budget as additional constraint
