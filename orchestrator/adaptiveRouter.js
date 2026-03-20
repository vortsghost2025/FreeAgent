// Adaptive Router for FreeAgent Orchestrator
// Provides intelligent failover and learning-based routing

const fs = require('fs');
const path = require('path');

// Error type classification patterns
const ERROR_PATTERNS = {
  TIMEOUT: /timeout|timed?\s*out|took\s*too\s*long|no\s*response/i,
  MISSING_FILE: /file\s*not\s*found|no\s*such\s*file|enoent|cannot\s*find|missing.*file/i,
  SYNTAX: /syntax\s*error|parse\s*error|unexpected\s*token|invalid\s*syntax/i,
  NETWORK: /network\s*error|connection\s*(refused|reset|timeout)|econnrefused|econnreset/i,
  AUTH: /unauthorized|auth.*fail|invalid.*(key|token|credential)|permission\s*denied|401|403/i,
  RATE_LIMIT: /rate\s*limit|too\s*many\s*requests|429|quota.*exceeded/i,
  MEMORY: /out\s*of\s*memory|memory\s*error|heap\s*size|oom/i,
  VALIDATION: /validation\s*error|invalid\s*input|bad\s*request|400/i,
  SERVER_ERROR: /server\s*error|500|502|503|internal\s*error/i,
  UNKNOWN: /./
};

// Agent capability mappings - which agents handle which error types better
const ERROR_AGENT_AFFINITY = {
  TIMEOUT: { claude: 0.9, gemini: 0.7, local: 0.5 },       // Claude handles timeouts well
  MISSING_FILE: { claude: 0.9, gemini: 0.6, local: 0.8 },  // Claude analyzes paths well
  SYNTAX: { claude: 0.95, gemini: 0.8, local: 0.7 },       // Claude is best at code
  NETWORK: { claude: 0.7, gemini: 0.9, local: 0.6 },       // Gemini handles network issues
  AUTH: { claude: 0.9, gemini: 0.7, local: 0.5 },          // Claude handles auth
  RATE_LIMIT: { claude: 0.6, gemini: 0.9, local: 0.8 },    // Local avoids rate limits
  MEMORY: { claude: 0.7, gemini: 0.8, local: 0.9 },        // Local has more control
  VALIDATION: { claude: 0.85, gemini: 0.8, local: 0.7 },   // Claude validates well
  SERVER_ERROR: { claude: 0.8, gemini: 0.9, local: 0.7 }, // Gemini handles server errors
  UNKNOWN: { claude: 0.8, gemini: 0.7, local: 0.6 }        // Default to Claude
};

// Task type keywords for intelligent routing
const TASK_KEYWORDS = {
  SECURITY: /security|audit|verify|safety|critical|bug|hack|exploit|vulnerability/i,
  ANALYSIS: /analyze|reason|explain|plan|complex|compare|evaluate|assess/i,
  CODE: /code|program|function|class|implement|write|debug|fix|refactor/i,
  FAST: /quick|fast|simple|draft|brief|single|one.*line/i,
  CREATIVE: /create|generate|design|write.*story|write.*poem|imagine/i,
  DATA: /data|query|search|find|filter|sort|aggregate/i
};

class AgentPerformanceTracker {
  constructor(options = {}) {
    this.windowSize = options.windowSize || 50; // Track last N tasks
    this.decayFactor = options.decayFactor || 0.9;
    this.agents = new Map();
    this.initializeAgents(options.agents || ['claude', 'gemini', 'local']);
  }

  initializeAgents(agentList) {
    for (const agentId of agentList) {
      this.agents.set(agentId, {
        id: agentId,
        totalTasks: 0,
        successfulTasks: 0,
        failedTasks: 0,
        recentResults: [], // Circular buffer of last N results
        lastSuccess: null,
        lastFailure: null,
        avgLatency: 0,
        totalLatency: 0,
        errorCounts: {},
        successByTaskType: {},
        currentWorkload: 0
      });
    }
  }

  recordTask(agentId, result) {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    const now = Date.now();
    const isSuccess = result.success !== false;
    const latency = result.latency || 0;

    agent.totalTasks++;
    agent.totalLatency += latency;
    agent.avgLatency = agent.totalLatency / agent.totalTasks;

    // Update recent results (circular buffer)
    agent.recentResults.push({ success: isSuccess, timestamp: now });
    if (agent.recentResults.length > this.windowSize) {
      agent.recentResults.shift();
    }

    if (isSuccess) {
      agent.successfulTasks++;
      agent.lastSuccess = now;
    } else {
      agent.failedTasks++;
      agent.lastFailure = now;
      
      // Track error types
      const errorType = result.errorType || 'UNKNOWN';
      agent.errorCounts[errorType] = (agent.errorCounts[errorType] || 0) + 1;
    }

    // Track success by task type
    if (result.taskType) {
      if (!agent.successByTaskType[result.taskType]) {
        agent.successByTaskType[result.taskType] = { total: 0, success: 0 };
      }
      agent.successByTaskType[result.taskType].total++;
      if (isSuccess) {
        agent.successByTaskType[result.taskType].success++;
      }
    }
  }

  getSuccessRate(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent || agent.totalTasks === 0) return 0.5; // Default neutral
    
    // Calculate recent success rate (more weight on recent)
    const recentSuccess = agent.recentResults.filter(r => r.success).length;
    const recentRate = agent.recentResults.length > 0 
      ? recentSuccess / agent.recentResults.length 
      : agent.successfulTasks / agent.totalTasks;
    
    // Blend with overall rate
    const overallRate = agent.successfulTasks / agent.totalTasks;
    return (recentRate * 0.7) + (overallRate * 0.3);
  }

  getPerformanceStats(agentId) {
    return this.agents.get(agentId) || null;
  }

  getAllStats() {
    const stats = {};
    for (const [id, agent] of this.agents) {
      stats[id] = {
        successRate: this.getSuccessRate(id),
        totalTasks: agent.totalTasks,
        successfulTasks: agent.successfulTasks,
        failedTasks: agent.failedTasks,
        avgLatency: Math.round(agent.avgLatency),
        errorCounts: agent.errorCounts,
        lastSuccess: agent.lastSuccess,
        lastFailure: agent.lastFailure,
        currentWorkload: agent.currentWorkload
      };
    }
    return stats;
  }
}

class ErrorClassifier {
  constructor() {
    this.patterns = ERROR_PATTERNS;
  }

  classify(error) {
    const errorMessage = error.message || String(error);
    const errorCode = error.code || '';
    const statusCode = error.status || error.statusCode || '';
    
    // Check error message patterns
    for (const [type, pattern] of Object.entries(this.patterns)) {
      if (type === 'UNKNOWN') continue; // Skip default
      if (pattern.test(errorMessage) || pattern.test(errorCode)) {
        return {
          type,
          confidence: 0.9,
          message: errorMessage.substring(0, 200),
          code: errorCode
        };
      }
    }

    // Check HTTP status codes
    if (statusCode) {
      const status = parseInt(statusCode);
      if (status === 401 || status === 403) return { type: 'AUTH', confidence: 0.95, statusCode };
      if (status === 429) return { type: 'RATE_LIMIT', confidence: 0.95, statusCode };
      if (status >= 500) return { type: 'SERVER_ERROR', confidence: 0.9, statusCode };
      if (status >= 400) return { type: 'VALIDATION', confidence: 0.7, statusCode };
    }

    // Default to unknown
    return {
      type: 'UNKNOWN',
      confidence: 0.3,
      message: errorMessage.substring(0, 200),
      code: errorCode
    };
  }

  identifyTaskType(message) {
    const lowerMessage = message.toLowerCase();
    
    for (const [type, pattern] of Object.entries(TASK_KEYWORDS)) {
      if (pattern.test(lowerMessage)) {
        return type;
      }
    }
    
    return 'GENERAL';
  }
}

class ConfidenceScorer {
  constructor(performanceTracker) {
    this.tracker = performanceTracker;
    this.weights = {
      recentSuccessRate: 0.35,
      errorTypeRelevance: 0.25,
      historicalPerformance: 0.20,
      workload: 0.20
    };
  }

  calculateScore(agentId, errorType = null, taskType = null) {
    const agent = this.tracker.getPerformanceStats(agentId);
    if (!agent) return 0;

    // 1. Recent success rate (0-1)
    const recentSuccessRate = this.tracker.getSuccessRate(agentId);

    // 2. Error type relevance (0-1)
    let errorTypeRelevance = 0.8; // Default neutral
    if (errorType && ERROR_AGENT_AFFINITY[errorType]) {
      errorTypeRelevance = ERROR_AGENT_AFFINITY[errorType][agentId] || 0.8;
    }

    // 3. Historical performance (0-1)
    let historicalPerformance = 0.5;
    if (taskType && agent.successByTaskType[taskType]) {
      const taskStats = agent.successByTaskType[taskType];
      historicalPerformance = taskStats.total > 0 
        ? taskStats.success / taskStats.total 
        : 0.5;
    } else {
      // Use overall success rate
      historicalPerformance = agent.totalTasks > 0
        ? agent.successfulTasks / agent.totalTasks
        : 0.5;
    }

    // 4. Workload factor (0-1) - lower workload = higher score
    const maxWorkload = 10;
    const workloadFactor = 1 - Math.min(agent.currentWorkload / maxWorkload, 1);

    // Calculate weighted score
    const score = 
      (recentSuccessRate * this.weights.recentSuccessRate) +
      (errorTypeRelevance * this.weights.errorTypeRelevance) +
      (historicalPerformance * this.weights.historicalPerformance) +
      (workloadFactor * this.weights.workload);

    return Math.max(0, Math.min(1, score));
  }

  rankAgents(availableAgents, errorType = null, taskType = null) {
    const scores = [];
    
    for (const agentId of availableAgents) {
      const score = this.calculateScore(agentId, errorType, taskType);
      const stats = this.tracker.getPerformanceStats(agentId);
      
      scores.push({
        agentId,
        score: Math.round(score * 100) / 100,
        details: {
          successRate: this.tracker.getSuccessRate(agentId),
          errorRelevance: errorType ? (ERROR_AGENT_AFFINITY[errorType]?.[agentId] || 0.8) : null,
          historicalPerformance: stats?.totalTasks > 0 
            ? stats.successfulTasks / stats.totalTasks 
            : 0.5,
          workload: stats?.currentWorkload || 0
        }
      });
    }

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);
    return scores;
  }
}

class SmartRouter {
  constructor(performanceTracker, errorClassifier, confidenceScorer) {
    this.tracker = performanceTracker;
    this.classifier = errorClassifier;
    this.scorer = confidenceScorer;
    this.fallbackChain = ['claude', 'gemini', 'local'];
  }

  selectAgent(task, options = {}) {
    const { 
      availableAgents = this.fallbackChain,
      forceAgent = null,
      errorType = null,
      taskType = null
    } = options;

    // Force specific agent if requested
    if (forceAgent && availableAgents.includes(forceAgent)) {
      return {
        agent: forceAgent,
        reason: 'forced',
        confidence: 1.0,
        isFallback: false
      };
    }

    // Use confidence scorer to rank agents
    const rankings = this.scorer.rankAgents(availableAgents, errorType, taskType);
    
    if (rankings.length === 0) {
      return {
        agent: 'local',
        reason: 'default_fallback',
        confidence: 0.3,
        isFallback: true
      };
    }

    const selected = rankings[0];
    const isFallback = rankings.length > 1 && 
      availableAgents.indexOf(selected.agentId) > availableAgents.indexOf(this.fallbackChain[0]);

    return {
      agent: selected.agentId,
      reason: this.getReason(selected, taskType),
      confidence: selected.score,
      allRankings: rankings,
      isFallback
    };
  }

  getReason(ranking, taskType) {
    const { agentId, score, details } = ranking;
    
    if (score >= 0.8) return 'high_confidence';
    if (score >= 0.6) return 'good_confidence';
    if (score >= 0.4) return 'moderate_confidence';
    return 'low_confidence';
  }

  getFallbackChain(failedAgent) {
    const chain = [...this.fallbackChain];
    const failedIndex = chain.indexOf(failedAgent);
    
    if (failedIndex >= 0) {
      chain.splice(failedIndex, 1);
    }
    
    return chain;
  }
}

class AdaptiveRouter {
  constructor(options = {}) {
    this.options = {
      persistPath: options.persistPath || './data/router_memory.json',
      saveInterval: options.saveInterval || 30000, // Save every 30 seconds
      ...options
    };

    // Initialize components
    this.tracker = new AgentPerformanceTracker({
      windowSize: options.windowSize || 50,
      agents: options.agents || ['claude', 'gemini', 'local']
    });
    
    this.classifier = new ErrorClassifier();
    this.scorer = new ConfidenceScorer(this.tracker);
    this.router = new SmartRouter(this.tracker, this.classifier, this.scorer);

    // Error log
    this.errorLog = [];
    this.maxErrorLogSize = 1000;

    // Learning data
    this.learning = {
      errorPatterns: new Map(),
      taskPatterns: new Map(),
      agentSpecialties: {}
    };

    // Load persisted memory
    this.loadMemory();

    // Auto-save
    this.saveTimer = setInterval(() => this.persistMemory(), this.options.saveInterval);
  }

  // Main routing method
  route(task, options = {}) {
    const taskType = this.classifier.identifyTaskType(task.message || task);
    
    const decision = this.router.selectAgent(task, {
      ...options,
      taskType
    });

    console.log(`[AdaptiveRouter] Selected ${decision.agent} (confidence: ${decision.confidence}, reason: ${decision.reason})`);
    
    return {
      ...decision,
      taskType
    };
  }

  // Record result and update learning
  recordResult(agentId, result) {
    const errorInfo = result.error 
      ? this.classifier.classify(result.error)
      : null;

    const taskResult = {
      success: result.success !== false,
      errorType: errorInfo?.type || null,
      errorMessage: errorInfo?.message || null,
      latency: result.latency || 0,
      taskType: result.taskType || null
    };

    // Record in performance tracker
    this.tracker.recordTask(agentId, taskResult);

    // Log error if failed
    if (!taskResult.success) {
      this.logError(agentId, {
        ...errorInfo,
        timestamp: new Date().toISOString()
      });
    }

    // Update learning data
    this.updateLearning(agentId, taskResult);

    // Update workload
    this.tracker.agents.get(agentId)?.currentWorkload;

    console.log(`[AdaptiveRouter] Recorded ${agentId}: ${taskResult.success ? 'SUCCESS' : 'FAILURE'} (${errorInfo?.type || 'no error'})`);
  }

  logError(agentId, error) {
    const entry = {
      id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      agentId,
      type: error.type,
      confidence: error.confidence,
      message: error.message,
      timestamp: error.timestamp
    };

    this.errorLog.push(entry);
    
    // Keep log size bounded
    if (this.errorLog.length > this.maxErrorLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxErrorLogSize);
    }
  }

  updateLearning(agentId, result) {
    // Update error patterns
    if (result.errorType) {
      const pattern = this.learning.errorPatterns.get(result.errorType) || {
        count: 0,
        agents: {}
      };
      pattern.count++;
      pattern.agents[agentId] = (pattern.agents[agentId] || 0) + 1;
      this.learning.errorPatterns.set(result.errorType, pattern);
    }

    // Update task patterns
    if (result.taskType) {
      const pattern = this.learning.taskPatterns.get(result.taskType) || {
        count: 0,
        agents: {}
      };
      pattern.count++;
      pattern.agents[agentId] = (pattern.agents[agentId] || 0) + 1;
      this.learning.taskPatterns.set(result.taskType, pattern);
    }
  }

  // Get best fallback agent after failure
  getFallback(failedAgent, error = null) {
    const errorType = error ? this.classifier.classify(error).type : null;
    const chain = this.router.getFallbackChain(failedAgent);
    
    const decision = this.router.selectAgent({}, {
      availableAgents: chain,
      errorType
    });

    console.log(`[AdaptiveRouter] Fallback from ${failedAgent} to ${decision.agent}`);
    return decision;
  }

  // Get router statistics
  getStats() {
    return {
      performance: this.tracker.getAllStats(),
      errorLogSize: this.errorLog.length,
      recentErrors: this.errorLog.slice(-10).map(e => ({
        agentId: e.agentId,
        type: e.type,
        timestamp: e.timestamp
      })),
      learning: {
        errorPatterns: Object.fromEntries(this.learning.errorPatterns),
        taskPatterns: Object.fromEntries(this.learning.taskPatterns)
      }
    };
  }

  // Persist memory to disk
  persistMemory() {
    try {
      const dir = path.dirname(this.options.persistPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = {
        timestamp: new Date().toISOString(),
        performance: this.tracker.getAllStats(),
        errorLog: this.errorLog.slice(-500), // Keep last 500 errors
        learning: {
          errorPatterns: Array.from(this.learning.errorPatterns.entries()),
          taskPatterns: Array.from(this.learning.taskPatterns.entries())
        }
      };

      fs.writeFileSync(this.options.persistPath, JSON.stringify(data, null, 2));
      console.log('[AdaptiveRouter] Memory persisted');
    } catch (e) {
      console.error('[AdaptiveRouter] Failed to persist memory:', e.message);
    }
  }

  // Load memory from disk
  loadMemory() {
    try {
      if (!fs.existsSync(this.options.persistPath)) {
        console.log('[AdaptiveRouter] No persisted memory found, starting fresh');
        return;
      }

      const data = JSON.parse(fs.readFileSync(this.options.persistPath, 'utf8'));
      
      // Restore performance data
      if (data.performance) {
        for (const [agentId, stats] of Object.entries(data.performance)) {
          const agent = this.tracker.agents.get(agentId);
          if (agent) {
            agent.totalTasks = stats.totalTasks || 0;
            agent.successfulTasks = stats.successfulTasks || 0;
            agent.failedTasks = stats.failedTasks || 0;
          }
        }
      }

      // Restore error log
      if (data.errorLog) {
        this.errorLog = data.errorLog;
      }

      // Restore learning data
      if (data.learning) {
        if (data.learning.errorPatterns) {
          this.learning.errorPatterns = new Map(data.learning.errorPatterns);
        }
        if (data.learning.taskPatterns) {
          this.learning.taskPatterns = new Map(data.learning.taskPatterns);
        }
      }

      console.log('[AdaptiveRouter] Memory loaded from disk');
    } catch (e) {
      console.log('[AdaptiveRouter] Failed to load memory:', e.message);
    }
  }

  // Cleanup
  shutdown() {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
    }
    this.persistMemory();
    console.log('[AdaptiveRouter] Shutdown complete');
  }
}

module.exports = {
  AdaptiveRouter,
  AgentPerformanceTracker,
  ErrorClassifier,
  ConfidenceScorer,
  SmartRouter,
  ERROR_PATTERNS,
  ERROR_AGENT_AFFINITY,
  TASK_KEYWORDS
};
