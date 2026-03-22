/**
 * Smart Task Router
 * 
 * Intelligently routes tasks to appropriate handlers with:
 * - Intelligent task routing based on task characteristics
 * - A/B testing capability for different processing strategies
 * - Fallback chains when primary handler fails
 * 
 * @author Kilo Code
 * @version 1.0.0
 */

class TaskRouter {
  constructor(options = {}) {
    this.name = options.name || 'SmartTaskRouter';
    this.logger = options.logger || console;
    
    // Handler registry
    this.handlers = new Map();
    this.handlerConfigs = new Map();
    
    // Fallback chains
    this.fallbackChains = new Map();
    
    // A/B testing configuration
    this.abTests = new Map();
    this.abResults = new Map();
    
    // Task routing rules
    this.routingRules = [];
    
    // Statistics
    this.stats = {
      totalTasks: 0,
      routedTasks: 0,
      failedTasks: 0,
      fallbackTasks: 0,
      abTestTasks: 0
    };
    
    // Default timeout
    this.defaultTimeout = options.defaultTimeout || 30000;
  }

  /**
   * Register a handler
   */
  registerHandler(handlerId, handler, config = {}) {
    this.handlers.set(handlerId, handler);
    this.handlerConfigs.set(handlerId, {
      id: handlerId,
      name: config.name || handlerId,
      description: config.description || '',
      capabilities: config.capabilities || [],
      priority: config.priority || 0,
      timeout: config.timeout || this.defaultTimeout,
      retryable: config.retryable !== false,
      weight: config.weight || 1
    });
    
    this.logger.info(`Registered handler: ${handlerId}`);
    return this;
  }

  /**
   * Register a fallback chain
   */
  registerFallbackChain(chainId, handlers) {
    this.fallbackChains.set(chainId, handlers);
    this.logger.info(`Registered fallback chain: ${chainId}`);
    return this;
  }

  /**
   * Add a routing rule
   */
  addRoutingRule(rule) {
    this.routingRules.push({
      name: rule.name || 'unnamed',
      condition: rule.condition,
      handler: rule.handler,
      priority: rule.priority || 0
    });
    
    // Sort by priority (higher first)
    this.routingRules.sort((a, b) => b.priority - a.priority);
    
    return this;
  }

  /**
   * Configure A/B test
   */
  configureABTest(testId, config) {
    this.abTests.set(testId, {
      id: testId,
      variants: config.variants, // Array of handler IDs
      trafficSplit: config.trafficSplit || {}, // { handlerA: 0.5, handlerB: 0.5 }
      selector: config.selector || ((task) => Math.random()),
      trackResults: config.trackResults !== false,
      duration: config.duration || Infinity
    });
    
    this.abResults.set(testId, {
      startTime: Date.now(),
      variants: {}
    });
    
    return this;
  }

  /**
   * Route a task to appropriate handler
   */
  async routeTask(task) {
    this.stats.totalTasks++;
    
    // Determine which handler to use
    const handlerInfo = await this.selectHandler(task);
    
    if (!handlerInfo) {
      throw new Error('No suitable handler found for task');
    }
    
    const { handlerId, isABTest, variant } = handlerInfo;
    const handler = this.handlers.get(handlerId);
    const config = this.handlerConfigs.get(handlerId);
    
    if (!handler) {
      throw new Error(`Handler not found: ${handlerId}`);
    }
    
    // Execute with timeout
    const timeout = config.timeout || this.defaultTimeout;
    
    try {
      this.logger.debug(`Routing task to handler: ${handlerId}`);
      this.stats.routedTasks++;
      
      const result = await this.executeWithTimeout(handler, task, timeout);
      
      // Track A/B test results
      if (isABTest) {
        this.trackABResult(task.abTestId, variant, 'success', result);
        this.stats.abTestTasks++;
      }
      
      return {
        result,
        handlerId,
        isABTest,
        variant
      };
    } catch (error) {
      this.logger.error(`Handler ${handlerId} failed: ${error.message}`);
      
      // Try fallback chain
      const fallbackResult = await this.tryFallbackChain(task, handlerId);
      
      if (fallbackResult) {
        this.stats.fallbackTasks++;
        return fallbackResult;
      }
      
      // Track A/B test failure
      if (isABTest) {
        this.trackABResult(task.abTestId, variant, 'failure', error);
      }
      
      this.stats.failedTasks++;
      throw error;
    }
  }

  /**
   * Select appropriate handler based on rules and A/B tests
   */
  async selectHandler(task) {
    // Check for explicit handler
    if (task.handlerId && this.handlers.has(task.handlerId)) {
      return { handlerId: task.handlerId, isABTest: false };
    }
    
    // Check for A/B test
    if (task.abTestId && this.abTests.has(task.abTestId)) {
      return this.selectABVariant(task);
    }
    
    // Apply routing rules
    for (const rule of this.routingRules) {
      if (rule.condition(task)) {
        if (this.handlers.has(rule.handler)) {
          return { handlerId: rule.handler, isABTest: false };
        }
      }
    }
    
    // Use priority-based selection
    const candidates = Array.from(this.handlerConfigs.values())
      .filter(config => this.canHandleTask(config, task))
      .sort((a, b) => b.priority - a.priority);
    
    if (candidates.length > 0) {
      // Weighted random selection
      return this.weightedSelect(candidates);
    }
    
    return null;
  }

  /**
   * Check if handler can handle the task
   */
  canHandleTask(handlerConfig, task) {
    // Check required capabilities
    if (handlerConfig.capabilities && handlerConfig.capabilities.length > 0) {
      const taskCapabilities = task.capabilities || [];
      return handlerConfig.capabilities.every(cap => taskCapabilities.includes(cap));
    }
    
    return true;
  }

  /**
   * Select A/B test variant
   */
  selectABVariant(task) {
    const test = this.abTests.get(task.abTestId);
    const selector = test.selector;
    const randomValue = selector(task);
    
    let cumulativeWeight = 0;
    const weights = test.trafficSplit;
    
    for (const variant of test.variants) {
      cumulativeWeight += weights[variant] || 0;
      if (randomValue <= cumulativeWeight) {
        return { handlerId: variant, isABTest: true, variant };
      }
    }
    
    // Fallback to first variant
    return { handlerId: test.variants[0], isABTest: true, variant: test.variants[0] };
  }

  /**
   * Track A/B test results
   */
  trackABResult(testId, variant, outcome, data) {
    const results = this.abResults.get(testId);
    if (!results) return;
    
    if (!results.variants[variant]) {
      results.variants[variant] = { success: 0, failure: 0, results: [] };
    }
    
    const variantResults = results.variants[variant];
    variantResults[outcome]++;
    
    if (outcome === 'success' && data) {
      variantResults.results.push(data);
    }
  }

  /**
   * Weighted random selection
   */
  weightedSelect(candidates) {
    const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const candidate of candidates) {
      random -= candidate.weight;
      if (random <= 0) {
        return { handlerId: candidate.id, isABTest: false };
      }
    }
    
    return { handlerId: candidates[0].id, isABTest: false };
  }

  /**
   * Try fallback chain
   */
  async tryFallbackChain(task, failedHandlerId) {
    for (const [chainId, handlers] of this.fallbackChains) {
      const index = handlers.indexOf(failedHandlerId);
      
      if (index !== -1 && index < handlers.length - 1) {
        // Try next handler in chain
        const nextHandler = handlers[index + 1];
        
        if (this.handlers.has(nextHandler)) {
          try {
            this.logger.info(`Trying fallback: ${failedHandlerId} -> ${nextHandler}`);
            const handler = this.handlers.get(nextHandler);
            const result = await handler(task);
            
            return {
              result,
              handlerId: nextHandler,
              isFallback: true,
              originalHandler: failedHandlerId
            };
          } catch (e) {
            // Continue to next fallback
            continue;
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Execute with timeout
   */
  executeWithTimeout(handler, task, timeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Task execution timeout after ${timeout}ms`));
      }, timeout);
      
      Promise.resolve(handler(task))
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Get A/B test results
   */
  getABTestResults(testId) {
    return this.abResults.get(testId);
  }

  /**
   * Get all A/B test results
   */
  getAllABResults() {
    const results = {};
    for (const [testId, result] of this.abResults) {
      results[testId] = this.calculateABStats(result);
    }
    return results;
  }

  /**
   * Calculate A/B test statistics
   */
  calculateABStats(results) {
    const stats = {};
    
    for (const [variant, data] of Object.entries(results.variants)) {
      const total = data.success + data.failure;
      stats[variant] = {
        success: data.success,
        failure: data.failure,
        successRate: total > 0 ? data.success / total : 0,
        sampleSize: total
      };
    }
    
    return stats;
  }

  /**
   * Get router statistics
   */
  getStats() {
    return {
      ...this.stats,
      handlers: this.handlers.size,
      routingRules: this.routingRules.length,
      abTests: this.abTests.size
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalTasks: 0,
      routedTasks: 0,
      failedTasks: 0,
      fallbackTasks: 0,
      abTestTasks: 0
    };
  }
}

/**
 * Condition builders for routing rules
 */
const Conditions = {
  // Match by task type
  type: (type) => (task) => task.type === type,
  
  // Match by property value
  property: (prop, value) => (task) => task[prop] === value,
  
  // Match by regex
  regex: (prop, pattern) => {
    const regex = new RegExp(pattern);
    return (task) => regex.test(task[prop]);
  },
  
  // Match by function
  custom: (fn) => fn,
  
  // Match any of conditions
  any: (...conditions) => (task) => conditions.some(c => c(task)),
  
  // Match all conditions
  all: (...conditions) => (task) => conditions.every(c => c(task)),
  
  // Match based on priority
  priority: (minPriority) => (task) => (task.priority || 0) >= minPriority,
  
  // Match based on estimated complexity
  complexity: (maxComplexity) => (task) => (task.complexity || 1) <= maxComplexity
};

/**
 * Create a new router instance
 */
function createRouter(options) {
  return new TaskRouter(options);
}

module.exports = {
  TaskRouter,
  Conditions,
  createRouter
};