/**
 * AGENT WARMUP CONTROLLER - Automatic Agent Warm-Up Mechanisms
 * Part of Autonomous Agent Orchestration layer.
 * 
 * Features:
 * - Pattern learning for task prediction
 * - Idle management with warm/idle/cold states
 * - Pre-emptive resource allocation
 * - Exponential decay for idle cost reduction
 */

class AgentWarmupController {
  constructor(options = {}) {
    // Idle thresholds (in milliseconds)
    this.warmThreshold = options.warmThreshold || 5 * 60 * 1000;       // 0-5 min: warm
    this.idleThreshold = options.idleThreshold || 30 * 60 * 1000;       // 5-30 min: idle
    this.coldThreshold = options.coldThreshold || 30 * 60 * 1000;       // 30min+: cold
    
    // Decay configuration
    this.decayFactor = options.decayFactor || 0.9;  // Exponential decay factor
    this.decayInterval = options.decayInterval || 60 * 1000; // 1 minute
    
    // Pattern learning windows (in milliseconds)
    this.hourWindow = options.hourWindow || 60 * 60 * 1000;       // 1 hour
    this.dayWindow = options.dayWindow || 24 * 60 * 60 * 1000;    // 24 hours
    this.weekWindow = options.weekWindow || 7 * 24 * 60 * 60 * 1000; // 7 days
    
    // Pre-warm configuration
    this.preWarmLeadTime = options.preWarmLeadTime || 5 * 60 * 1000; // 5 min ahead
    this.minTasksForPattern = options.minTasksForPattern || 3;
    this.maxPreWarmAgents = options.maxPreWarmAgents || 5;
    
    // State storage
    this.agents = new Map();           // agentId -> { lastActive, status, resourceLevel, cooldownLevel }
    this.taskHistory = [];             // Task records for pattern analysis
    this.pendingTasks = [];            // Queue of incoming tasks
    this.warmupRecommendations = new Map(); // agentId -> recommendation data
    
    // Pattern caches
    this.hourlyPatterns = new Map();  // hourOfDay -> taskType -> count
    this.dailyPatterns = new Map();    // dayOfWeek -> taskType -> count
    
    // Reference to provider scorer (optional integration)
    this.providerScorer = null;
    
    // Singleton instance
    AgentWarmupController._instance = this;
    
    console.log("AgentWarmupController initialized");
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(options) {
    if (!AgentWarmupController._instance) {
      AgentWarmupController._instance = new AgentWarmupController(options);
    }
    return AgentWarmupController._instance;
  }
  
  /**
   * Set provider scorer for integration
   */
  setProviderScorer(providerScorer) {
    this.providerScorer = providerScorer;
  }
  
  /**
   * Record a task for pattern analysis
   * @param {string} taskType - Type of task
   * @param {number} timestamp - Task timestamp (defaults to now)
   */
  recordTask(taskType, timestamp = Date.now()) {
    const task = {
      type: taskType,
      timestamp: timestamp,
      hourOfDay: new Date(timestamp).getHours(),
      dayOfWeek: new Date(timestamp).getDay()
    };
    
    this.taskHistory.push(task);
    
    // Update hourly patterns
    if (!this.hourlyPatterns.has(task.hourOfDay)) {
      this.hourlyPatterns.set(task.hourOfDay, new Map());
    }
    const hourMap = this.hourlyPatterns.get(task.hourOfDay);
    hourMap.set(taskType, (hourMap.get(taskType) || 0) + 1);
    
    // Update daily patterns
    if (!this.dailyPatterns.has(task.dayOfWeek)) {
      this.dailyPatterns.set(task.dayOfWeek, new Map());
    }
    const dayMap = this.dailyPatterns.get(task.dayOfWeek);
    dayMap.set(taskType, (dayMap.get(taskType) || 0) + 1);
    
    // Prune old tasks (keep last 7 days)
    const cutoff = Date.now() - this.weekWindow;
    this.taskHistory = this.taskHistory.filter(t => t.timestamp > cutoff);
    
    return task;
  }
  
  /**
   * Update agent status when they become active
   * @param {string} agentId - Agent identifier
   * @param {number} lastActive - Last active timestamp
   */
  updateAgentStatus(agentId, lastActive = Date.now()) {
    const agent = this._getOrCreateAgent(agentId);
    agent.lastActive = lastActive;
    agent.status = 'warm';
    agent.resourceLevel = 1.0;
    agent.cooldownLevel = 0;
    agent.wakeCount = (agent.wakeCount || 0) + 1;
    agent.lastWakeTime = Date.now();
    
    return agent;
  }
  
  /**
   * Get or create an agent entry
   */
  _getOrCreateAgent(agentId) {
    if (!this.agents.has(agentId)) {
      this.agents.set(agentId, {
        id: agentId,
        lastActive: null,
        status: 'cold',
        resourceLevel: 0,
        cooldownLevel: 1.0,
        wakeCount: 0,
        lastWakeTime: null,
        taskTypes: new Set()  // Track which task types this agent handles
      });
    }
    return this.agents.get(agentId);
  }
  
  /**
   * Check if an agent should be woken up
   * @param {string} agentId - Agent identifier
   * @param {string} taskType - Optional task type context
   */
  shouldWakeAgent(agentId, taskType = null) {
    const agent = this.agents.get(agentId);
    if (!agent) return true;  // Unknown agents should be warmed
    
    const idleTime = Date.now() - (agent.lastActive || 0);
    
    // Always wake cold agents
    if (agent.status === 'cold') return true;
    
    // Wake idle agents if there's a pending task
    if (agent.status === 'idle' && this.pendingTasks.length > 0) return true;
    
    // Wake if idle time exceeds threshold
    if (idleTime > this.idleThreshold) return true;
    
    // Check if predicted high load is coming
    const prediction = this.predictUpcomingLoad();
    if (prediction.highDemand && taskType && this.isTaskTypePredicted(taskType)) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Get agents that can be cooled down
   */
  getIdleAgents() {
    const idleAgents = [];
    const now = Date.now();
    
    for (const [agentId, agent] of this.agents) {
      if (!agent.lastActive) continue;
      
      const idleTime = now - agent.lastActive;
      
      // Only consider agents that have been warm
      if (agent.status === 'warm' && idleTime > this.warmThreshold) {
        idleAgents.push({
          agentId,
          idleTime,
          resourceLevel: agent.resourceLevel,
          cooldownLevel: agent.cooldownLevel,
          canCool: idleTime > this.idleThreshold
        });
      }
    }
    
    // Sort by idle time (most idle first)
    idleAgents.sort((a, b) => b.idleTime - a.idleTime);
    
    return idleAgents;
  }
  
  /**
   * Get warmup recommendations - agents that should be pre-warmed
   */
  getWarmupRecommendation() {
    const recommendations = [];
    const now = Date.now();
    
    // Get predictions for upcoming load
    const prediction = this.predictUpcomingLoad();
    
    // If high demand predicted, recommend pre-warming
    if (prediction.highDemand) {
      // Find cold agents that could be warmed
      for (const [agentId, agent] of this.agents) {
        if (agent.status === 'cold' || agent.status === 'idle') {
          // Check if this agent handles predicted task types
          const relevantTypes = Array.from(agent.taskTypes);
          const hasRelevantType = relevantTypes.some(t => 
            prediction.predictedTaskTypes.includes(t)
          );
          
          if (hasRelevantType || agent.taskTypes.size === 0) {
            recommendations.push({
              agentId,
              reason: 'predicted_high_load',
              predictedTypes: prediction.predictedTaskTypes,
              priority: prediction.confidence,
              suggestedResourceLevel: 0.7
            });
          }
        }
      }
    }
    
    // Also recommend waking agents for pending tasks
    for (const task of this.pendingTasks) {
      const relevantAgents = this._findAgentsForTaskType(task.type);
      for (const agentId of relevantAgents) {
        const agent = this.agents.get(agentId);
        if (agent && (agent.status === 'idle' || agent.status === 'cold')) {
          const alreadyRecommended = recommendations.find(r => r.agentId === agentId);
          if (!alreadyRecommended) {
            recommendations.push({
              agentId,
              reason: 'pending_task',
              taskType: task.type,
              priority: 0.8,
              suggestedResourceLevel: 1.0
            });
          }
        }
      }
    }
    
    // Sort by priority
    recommendations.sort((a, b) => b.priority - a.priority);
    
    // Limit to max pre-warm agents
    return recommendations.slice(0, this.maxPreWarmAgents);
  }
  
  /**
   * Predict upcoming load based on patterns
   */
  predictUpcomingLoad() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();
    
    // Look at historical data for current hour and next hour
    const nextHour = (currentHour + 1) % 24;
    
    let totalTasks = 0;
    const taskTypeCounts = new Map();
    
    // Check hourly patterns
    for (const hour of [currentHour, nextHour]) {
      const hourMap = this.hourlyPatterns.get(hour);
      if (hourMap) {
        for (const [type, count] of hourMap) {
          totalTasks += count;
          taskTypeCounts.set(type, (taskTypeCounts.get(type) || 0) + count);
        }
      }
    }
    
    // Check daily patterns
    const dayMap = this.dailyPatterns.get(currentDay);
    if (dayMap) {
      for (const [type, count] of dayMap) {
        totalTasks += count * 0.5; // Weight daily patterns less
        taskTypeCounts.set(type, (taskTypeCounts.get(type) || 0) + count * 0.5);
      }
    }
    
    // Determine if high demand
    const avgTasksPerHour = totalTasks / 2;
    const highDemand = avgTasksPerHour >= this.minTasksForPattern;
    
    // Calculate confidence based on data amount
    const confidence = Math.min(1, totalTasks / (this.minTasksForPattern * 5));
    
    // Get top predicted task types
    const predictedTypes = Array.from(taskTypeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type]) => type);
    
    return {
      highDemand,
      confidence,
      predictedTaskTypes: predictedTypes,
      estimatedTaskCount: avgTasksPerHour,
      nextHour,
      currentHour
    };
  }
  
  /**
   * Check if a task type is predicted to be in high demand
   */
  isTaskTypePredicted(taskType) {
    const prediction = this.predictUpcomingLoad();
    return prediction.predictedTaskTypes.includes(taskType);
  }
  
  /**
   * Find agents that handle a specific task type
   */
  _findAgentsForTaskType(taskType) {
    const matching = [];
    for (const [agentId, agent] of this.agents) {
      if (agent.taskTypes.has(taskType)) {
        matching.push(agentId);
      }
    }
    return matching;
  }
  
  /**
   * Add a pending task to the queue
   */
  addPendingTask(taskType, priority = 0.5) {
    this.pendingTasks.push({
      type: taskType,
      addedAt: Date.now(),
      priority
    });
    
    // Clean up old pending tasks (older than 10 minutes)
    const cutoff = Date.now() - 10 * 60 * 1000;
    this.pendingTasks = this.pendingTasks.filter(t => t.addedAt > cutoff);
  }
  
  /**
   * Remove a task from pending queue (when assigned)
   */
  removePendingTask(taskType) {
    const index = this.pendingTasks.findIndex(t => t.type === taskType);
    if (index !== -1) {
      this.pendingTasks.splice(index, 1);
    }
  }
  
  /**
   * Apply exponential decay to idle agents (call periodically)
   */
  applyCooldown() {
    const now = Date.now();
    
    for (const [agentId, agent] of this.agents) {
      if (!agent.lastActive) continue;
      
      const idleTime = now - agent.lastActive;
      
      // Update status based on idle time
      if (idleTime < this.warmThreshold) {
        agent.status = 'warm';
        agent.resourceLevel = 1.0;
        agent.cooldownLevel = 0;
      } else if (idleTime < this.idleThreshold) {
        agent.status = 'idle';
        // Apply exponential decay
        const decaySteps = Math.floor(idleTime / this.decayInterval);
        agent.resourceLevel = Math.pow(this.decayFactor, decaySteps);
        agent.cooldownLevel = 1 - agent.resourceLevel;
      } else {
        agent.status = 'cold';
        agent.resourceLevel = 0;
        agent.cooldownLevel = 1.0;
      }
    }
  }
  
  /**
   * Register an agent's capability for a task type
   */
  registerAgentCapability(agentId, taskType) {
    const agent = this._getOrCreateAgent(agentId);
    agent.taskTypes.add(taskType);
  }
  
  /**
   * Get detailed status for all agents
   */
  getAgentStatuses() {
    const statuses = [];
    const now = Date.now();
    
    for (const [agentId, agent] of this.agents) {
      const idleTime = agent.lastActive ? now - agent.lastActive : null;
      statuses.push({
        agentId,
        status: agent.status,
        idleTime,
        resourceLevel: agent.resourceLevel,
        cooldownLevel: agent.cooldownLevel,
        wakeCount: agent.wakeCount,
        taskTypes: Array.from(agent.taskTypes),
        lastActive: agent.lastActive
      });
    }
    
    return statuses;
  }
  
  /**
   * Get summary statistics
   */
  getStats() {
    const warm = Array.from(this.agents.values()).filter(a => a.status === 'warm').length;
    const idle = Array.from(this.agents.values()).filter(a => a.status === 'idle').length;
    const cold = Array.from(this.agents.values()).filter(a => a.status === 'cold').length;
    
    return {
      totalAgents: this.agents.size,
      warm,
      idle,
      cold,
      pendingTasks: this.pendingTasks.length,
      taskHistorySize: this.taskHistory.length,
      patterns: {
        hourlySlots: this.hourlyPatterns.size,
        dailySlots: this.dailyPatterns.size
      },
      prediction: this.predictUpcomingLoad()
    };
  }
  
  /**
   * Get detailed warmup status for API
   */
  getStatus() {
    return {
      agents: this.getAgentStatuses(),
      stats: this.getStats(),
      recommendations: this.getWarmupRecommendation(),
      pendingTasks: this.pendingTasks.map(t => ({ type: t.type, priority: t.priority })),
      prediction: this.predictUpcomingLoad()
    };
  }
  
  /**
   * Reset all state
   */
  reset() {
    this.agents.clear();
    this.taskHistory = [];
    this.pendingTasks = [];
    this.warmupRecommendations.clear();
    this.hourlyPatterns.clear();
    this.dailyPatterns.clear();
  }
}

// Export singleton instance
const agentWarmup = AgentWarmupController.getInstance();

export { AgentWarmupController, agentWarmup };
export default agentWarmup;