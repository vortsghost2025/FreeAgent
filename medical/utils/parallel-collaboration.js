/**
 * Parallel Collaboration Protocol - Real-time coordination between Kilo and Lingma
 * This enables true parallel work in the same coding space
 * 
 * Usage:
 *   import { parallelManager } from './utils/parallel-collaboration.js';
 *   
 *   // Initialize
 *   await parallelManager.init();
 *   
 *   // Claim a task
 *   const taskId = await parallelManager.claimTask('coding', 'Fix authentication bug');
 *   
 *   // Complete task
 *   await parallelManager.completeTask(taskId, { fixed: true });
 */

import { workspaceBus, kiloBus, lingmaBus } from './shared-workspace-protocol.js';
import { getUnifiedBrain } from './agent-memory.js';

/**
 * Parallel Collaboration Manager
 * Both Kilo and Lingma use this to coordinate work
 */
export class ParallelCollaborationManager {
  constructor(agentId, role = 'coordinator') {
    this.agentId = agentId;
    this.role = role;
    this.activeSessions = new Map();
    this.contextCache = new Map();
    this.unifiedBrain = null;
    // Use the appropriate bus based on agentId
    this.bus = agentId === 'kilo' ? kiloBus : lingmaBus;
  }

  /**
   * Initialize parallel collaboration
   */
  async init() {
    console.log(`[Parallel] ${this.agentId} initializing parallel collaboration...`);
    
    // Subscribe to shared channels
    await this.setupSubscriptions();
    
    // Load unified brain for context
    this.unifiedBrain = await getUnifiedBrain();
    
    console.log(`[Parallel] ${this.agentId} ready with ${Object.keys(this.unifiedBrain.domains).length} domains`);
  }

  /**
   * Setup real-time subscriptions
   */
  async setupSubscriptions() {
    // Subscribe to task coordination channel
    await this.bus.subscribe('task-coordination', async (message) => {
      if (message.target === this.agentId || message.target === 'all') {
        await this.handleCoordinationMessage(message);
      }
    });

    // Subscribe to code changes channel
    await this.bus.subscribe('code-changes', async (message) => {
      if (message.agent !== this.agentId) {
        await this.handleCodeChange(message);
      }
    });

    // Subscribe to memory updates
    await this.bus.subscribe('memory-updates', async (message) => {
      if (message.source !== this.agentId) {
        await this.handleMemoryUpdate(message);
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
    await this.bus.publish('task-coordination', {
      type: 'task-claim',
      target: 'all',
      ...taskData
    });

    this.activeSessions.set(taskId, taskData);
    console.log(`[Parallel] ${this.agentId} claimed task: ${taskId} (${taskType})`);
    
    return taskId;
  }

  /**
   * Complete a task and share results
   */
  async completeTask(taskId, result, metadata = {}) {
    const task = this.activeSessions.get(taskId);
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
    await this.bus.publish('task-coordination', {
      type: 'task-completion',
      target: 'all',
      ...completionData
    });

    // Share results with other agents
    await this.bus.publish('code-changes', {
      agent: this.agentId,
      taskId,
      type: 'result-share',
      content: result,
      timestamp: new Date().toISOString()
    });

    this.activeSessions.delete(taskId);
    console.log(`[Parallel] ${this.agentId} completed task: ${taskId}`);
    
    return completionData;
  }

  /**
   * Get relevant context for a task type
   */
  async getRelevantContext(taskType) {
    // Use unified brain to get domain-specific context
    const domainMap = {
      'coding': ['coding', 'architecture'],
      'medical': ['medical', 'clinical'],
      'security': ['security', 'operations'],
      'data': ['data', 'api'],
      'testing': ['testing', 'operations'],
      'review': ['coding', 'architecture'],
      'debug': ['coding', 'operations'],
      'architect': ['architecture']
    };

    const domains = domainMap[taskType] || ['architecture', 'coding'];
    const context = [];

    for (const domain of domains) {
      const domainContext = this.unifiedBrain?.domains?.[domain];
      if (domainContext && domainContext.entries) {
        context.push(...domainContext.entries.slice(0, 5));
      }
    }

    return context;
  }

  /**
   * Handle coordination messages from other agents
   */
  async handleCoordinationMessage(message) {
    switch (message.type) {
      case 'task-claim':
        await this.handleTaskClaim(message);
        break;
      case 'task-completion':
        await this.handleTaskCompletion(message);
        break;
      case 'request-assistance':
        await this.handleAssistanceRequest(message);
        break;
      case 'collaboration-offer':
        await this.handleCollaborationOffer(message);
        break;
    }
  }

  async handleTaskClaim(message) {
    console.log(`[Parallel] ${this.agentId} detected task claim from ${message.agentId}: ${message.taskId}`);
    
    // Check if we can assist or should coordinate
    const canAssist = await this.evaluateAssistanceOpportunity(message);
    if (canAssist) {
      await this.offerCollaboration(message.taskId, message.agentId);
    }
  }

  async handleTaskCompletion(message) {
    console.log(`[Parallel] ${this.agentId} received completion from ${message.agentId}: ${message.taskId}`);
    
    // Update our context cache
    this.contextCache.set(message.taskId, message.result);
    
    // Trigger any dependent tasks
    await this.triggerDependentTasks(message.taskId);
  }

  async handleAssistanceRequest(message) {
    console.log(`[Parallel] ${this.agentId} received assistance request from ${message.agentId}`);
    
    // Respond with relevant context
    const context = await this.getRelevantContext(message.taskType);
    await this.bus.publish('task-coordination', {
      type: 'assistance-response',
      target: message.agentId,
      taskId: message.taskId,
      agentId: this.agentId,
      context,
      timestamp: new Date().toISOString()
    });
  }

  async handleCollaborationOffer(message) {
    console.log(`[Parallel] ${this.agentId} received collaboration offer from ${message.agentId}: ${message.offer}`);
  }

  async evaluateAssistanceOpportunity(message) {
    // Simple heuristic: if task type matches our expertise
    const myExpertise = ['coding', 'architecture', 'security', 'review', 'debug', 'medical', 'data', 'testing'];
    return myExpertise.includes(message.taskType);
  }

  async offerCollaboration(taskId, otherAgent) {
    const collaborationOffer = {
      type: 'collaboration-offer',
      taskId,
      agentId: this.agentId,
      offer: 'I can assist with this task',
      timestamp: new Date().toISOString()
    };

    await this.bus.publish('task-coordination', {
      ...collaborationOffer,
      target: otherAgent
    });
    console.log(`[Parallel] ${this.agentId} offered collaboration to ${otherAgent} on task ${taskId}`);
  }

  async triggerDependentTasks(taskId) {
    console.log(`[Parallel] ${this.agentId} checking dependencies for task ${taskId}`);
  }

  /**
   * Get active tasks
   */
  getActiveTasks() {
    return Array.from(this.activeSessions.values());
  }
}

// Export singleton instances for different agents
export const kiloParallel = new ParallelCollaborationManager('kilo', 'coordinator');
export const lingmaParallel = new ParallelCollaborationManager('lingma', 'coordinator');
export const parallelManager = kiloParallel; // Default

export default parallelManager;