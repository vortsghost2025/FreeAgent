/**
 * Parallel Coordinator - Enables Kilo and standalone AI to work together in real-time
 * Both agents use this to coordinate tasks, share context, and prevent duplication
 */

import { workspaceBus } from './shared-workspace-protocol.js';
import { bootstrapAgent, getUnifiedBrain } from '../agent-memory.js';

/**
 * Parallel Coordination System
 * This is the coordination layer that works with Kilo's unified memory foundation
 */
export class ParallelCoordinator {
  constructor(agentId) {
    this.agentId = agentId;
    this.activeTasks = new Map();
    this.contextCache = new Map();
    this.unifiedBrain = null;
  }

  /**
   * Initialize the coordinator
   */
  async init() {
    console.log(`[Parallel] ${this.agentId} initializing parallel coordination...`);
    
    // Load unified brain for context
    try {
      this.unifiedBrain = await getUnifiedBrain();
      if (!this.unifiedBrain) {
        console.warn('[Parallel] Unified brain not found - using fallback');
      }
    } catch (err) {
      console.error('[Parallel] Error loading unified brain:', err.message);
    }

    // Setup subscriptions for real-time coordination
    await this.setupSubscriptions();
    
    console.log(`[Parallel] ${this.agentId} ready with ${this.unifiedBrain?.stats?.totalLearnings || 'unknown'} learnings`);
  }

  /**
   * Setup real-time subscriptions
   */
  async setupSubscriptions() {
    // Subscribe to task coordination channel
    workspaceBus.subscribe('task-claims', async (message) => {
      if (message.agentId !== this.agentId && message.target === this.agentId) {
        await this.handleTaskClaim(message);
      }
    });

    // Subscribe to task completions
    workspaceBus.subscribe('task-completions', async (message) => {
      if (message.agentId !== this.agentId) {
        await this.handleTaskCompletion(message);
      }
    });

    // Subscribe to code changes
    workspaceBus.subscribe('code-changes', async (message) => {
      if (message.agentId !== this.agentId) {
        await this.handleCodeChange(message);
      }
    });
  }

  /**
   * Claim a task for parallel processing
   */
  async claimTask(taskType, description, priority = 'normal') {
    const taskId = `${this.agentId}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    
    const taskData = {
      taskId,
      agentId: this.agentId,
      taskType,
      description,
      priority,
      status: 'claimed',
      timestamp: new Date().toISOString(),
      context: await this.getRelevantContext(taskType)
    };

    // Publish to coordination channel
    await workspaceBus.publish('task-claims', {
      type: 'task-claim',
      ...taskData,
      target: 'all' // Broadcast to all agents
    });

    this.activeTasks.set(taskId, taskData);
    console.log(`[Parallel] ${this.agentId} claimed task: ${taskId} (${taskType})`);
    
    return taskId;
  }

  /**
   * Complete a task and share results
   */
  async completeTask(taskId, result, metadata = {}) {
    const task = this.activeTasks.get(taskId);
    if (!task) return { error: 'Task not found' };

    const completionData = {
      taskId,
      agentId: this.agentId,
      status: 'completed',
      timestamp: new Date().toISOString(),
      result,
      metadata,
      duration: Date.now() - new Date(task.timestamp).getTime()
    };

    // Publish completion
    await workspaceBus.publish('task-completions', completionData);

    // Share results with other agents
    await workspaceBus.publish('code-changes', {
      agentId: this.agentId,
      taskId,
      type: 'result-share',
      content: result,
      timestamp: new Date().toISOString()
    });

    this.activeTasks.delete(taskId);
    console.log(`[Parallel] ${this.agentId} completed task: ${taskId}`);
    
    return completionData;
  }

  /**
   * Get relevant context for a task type
   */
  async getRelevantContext(taskType) {
    if (!this.unifiedBrain) {
      return [];
    }

    // Domain mapping for context relevance
    const domainMap = {
      'coding': ['coding', 'architecture'],
      'medical': ['medical', 'clinical'],
      'security': ['security', 'operations'],
      'data': ['data', 'api'],
      'testing': ['testing', 'operations']
    };

    const domains = domainMap[taskType] || ['architecture', 'coding'];
    const context = [];

    for (const domain of domains) {
      const domainData = this.unifiedBrain.domains[domain];
      if (domainData && Array.isArray(domainData)) {
        domainData.forEach(d => {
          if (d.learnings && d.learnings.length > 0) {
            context.push(...d.learnings.slice(0, 3));
          }
        });
      }
    }

    return context;
  }

  /**
   * Handle task claims from other agents
   */
  async handleTaskClaim(message) {
    console.log(`[Parallel] ${this.agentId} detected task claim from ${message.agentId}: ${message.taskId}`);
    
    // Check if we can assist or should coordinate
    const canAssist = await this.evaluateAssistanceOpportunity(message);
    if (canAssist) {
      await this.offerCollaboration(message.taskId, message.agentId);
    }
  }

  /**
   * Handle task completions from other agents
   */
  async handleTaskCompletion(message) {
    console.log(`[Parallel] ${this.agentId} received completion from ${message.agentId}: ${message.taskId}`);
    
    // Update our context cache
    this.contextCache.set(message.taskId, message.result);
    
    // Trigger any dependent tasks (placeholder for future implementation)
    await this.triggerDependentTasks(message.taskId);
  }

  /**
   * Evaluate if we can assist with another agent's task
   */
  async evaluateAssistanceOpportunity(message) {
    // Simple heuristic: check if task type matches our expertise
    const myExpertise = ['coding', 'architecture', 'security'];
    return myExpertise.includes(message.taskType) && 
           this.unifiedBrain?.domains?.[message.taskType]?.length > 0;
  }

  /**
   * Offer collaboration to another agent
   */
  async offerCollaboration(taskId, otherAgent) {
    const collaborationOffer = {
      type: 'collaboration-offer',
      taskId,
      agentId: this.agentId,
      offer: `I can assist with this task using knowledge from ${this.unifiedBrain?.domains?.architecture?.length || 0} architecture learnings`,
      timestamp: new Date().toISOString()
    };

    await workspaceBus.publish('task-claims', collaborationOffer);
    console.log(`[Parallel] ${this.agentId} offered collaboration to ${otherAgent} on task ${taskId}`);
  }

  /**
   * Handle code changes from other agents
   */
  async handleCodeChange(message) {
    console.log(`[Parallel] ${this.agentId} received code change from ${message.agentId}`);
    // Store in context cache
    this.contextCache.set(`code-${message.taskId}`, message.content);
  }

  /**
   * Trigger dependent tasks (simplified implementation)
   */
  async triggerDependentTasks(taskId) {
    console.log(`[Parallel] ${this.agentId} checking dependencies for task ${taskId}`);
    // In production, this would check for dependent tasks and trigger them
  }
}

// Export singleton instance for current agent
export const parallelCoordinator = new ParallelCoordinator('standalone-ai');

// Export for Kilo's use (compatible interface)
export const kiloCoordinator = new ParallelCoordinator('kilo');