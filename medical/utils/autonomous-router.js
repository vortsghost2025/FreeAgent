/**
 * Autonomous Task Router - The Executive Function
 * 
 * Makes the system self-directed:
 * - Agents detect tasks from context
 * - They claim tasks automatically
 * - They route subtasks to each other
 * - They escalate when needed
 * - They fuse results without being asked
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_DIR = process.cwd();

/**
 * Task States
 */
const TaskState = {
  DETECTED: 'detected',
  CLAIMED: 'claimed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ESCALATED: 'escalated',
  FAILED: 'failed'
};

/**
 * Task Router
 */
export class AutonomousTaskRouter {
  constructor() {
    this.taskQueue = [];
    this.activeTasks = new Map();
    this.taskHistory = [];
    this.agents = new Map();
  }

  /**
   * Register an agent
   */
  registerAgent(agentId, capabilities = [], load = 0) {
    this.agents.set(agentId, {
      id: agentId,
      capabilities,
      load,
      maxLoad: 5,
      status: 'available'
    });
    console.log(`[Router] Registered agent: ${agentId}`);
  }

  /**
   * Detect tasks from context (message analysis)
   */
  detectTasks(context) {
    console.log('[Router] Detecting tasks from context...');
    const tasks = [];
    
    // Simple keyword-based detection (in production, use LLM)
    const contextLower = context.toLowerCase();
    
    if (contextLower.includes('fix') || contextLower.includes('bug')) {
      tasks.push({
        type: 'bugfix',
        priority: 'high',
        description: 'Fix identified bug',
        estimatedEffort: 2
      });
    }
    
    if (contextLower.includes('create') || contextLower.includes('build')) {
      tasks.push({
        type: 'implementation',
        priority: 'medium',
        description: 'Implement new feature',
        estimatedEffort: 3
      });
    }
    
    if (contextLower.includes('test')) {
      tasks.push({
        type: 'testing',
        priority: 'medium',
        description: 'Run or write tests',
        estimatedEffort: 2
      });
    }
    
    if (contextLower.includes('review') || contextLower.includes('check')) {
      tasks.push({
        type: 'review',
        priority: 'low',
        description: 'Review code or output',
        estimatedEffort: 1
      });
    }
    
    // Add to queue
    tasks.forEach(task => {
      task.id = this.generateTaskId();
      task.state = TaskState.DETECTED;
      task.createdAt = Date.now();
      this.taskQueue.push(task);
    });
    
    console.log(`[Router] Detected ${tasks.length} tasks`);
    return tasks;
  }

  /**
   * Auto-claim tasks for available agents
   */
  autoClaim() {
    console.log('[Router] Auto-claiming tasks...');
    const claimed = [];
    
    for (const task of this.taskQueue) {
      if (task.state !== TaskState.DETECTED) continue;
      
      // Find best available agent
      const agent = this.findBestAgent(task);
      if (agent) {
        task.state = TaskState.CLAIMED;
        task.assignedTo = agent.id;
        agent.load++;
        agent.status = 'busy';
        
        this.activeTasks.set(task.id, task);
        claimed.push(task);
        console.log(`[Router] Task ${task.id} claimed by ${agent.id}`);
      }
    }
    
    return claimed;
  }

  /**
   * Route subtasks to other agents
   */
  routeSubtasks(parentTaskId, subtasks) {
    console.log(`[Router] Routing ${subtasks.length} subtasks for ${parentTaskId}`);
    
    const parentTask = this.activeTasks.get(parentTaskId);
    if (!parentTask) return [];
    
    const routed = subtasks.map(subtask => {
      const agent = this.findBestAgent(subtask);
      if (agent) {
        subtask.parentId = parentTaskId;
        subtask.state = TaskState.CLAIMED;
        subtask.assignedTo = agent.id;
        agent.load++;
        
        this.activeTasks.set(subtask.id, subtask);
        return subtask;
      }
    }).filter(Boolean);
    
    return routed;
  }

  /**
   * Escalate task to higher priority or different agent
   */
  escalate(taskId, reason) {
    const task = this.activeTasks.get(taskId);
    if (!task) return null;
    
    task.state = TaskState.ESCALATED;
    task.escalationReason = reason;
    task.escalatedAt = Date.now();
    
    console.log(`[Router] Task ${taskId} escalated: ${reason}`);
    return task;
  }

  /**
   * Complete a task
   */
  complete(taskId, result) {
    const task = this.activeTasks.get(taskId);
    if (!task) return null;
    
    task.state = TaskState.COMPLETED;
    task.completedAt = Date.now();
    task.result = result;
    
    // Free up the agent
    if (task.assignedTo) {
      const agent = this.agents.get(task.assignedTo);
      if (agent) {
        agent.load = Math.max(0, agent.load - 1);
        agent.status = agent.load >= agent.maxLoad ? 'busy' : 'available';
      }
    }
    
    // Move to history
    this.taskHistory.push(task);
    this.activeTasks.delete(taskId);
    
    console.log(`[Router] Task ${taskId} completed`);
    return task;
  }

  /**
   * Get routing statistics
   */
  getStats() {
    return {
      queueLength: this.taskQueue.filter(t => t.state === TaskState.DETECTED).length,
      activeCount: this.activeTasks.size,
      completedCount: this.taskHistory.filter(t => t.state === TaskState.COMPLETED).length,
      agents: Array.from(this.agents.values()).map(a => ({
        id: a.id,
        load: a.load,
        status: a.status
      }))
    };
  }

  /**
   * Find best agent for task
   */
  findBestAgent(task) {
    let bestAgent = null;
    let lowestLoad = Infinity;
    
    for (const agent of this.agents.values()) {
      if (agent.load >= agent.maxLoad) continue;
      if (agent.load < lowestLoad) {
        lowestLoad = agent.load;
        bestAgent = agent;
      }
    }
    
    return bestAgent;
  }

  /**
   * Generate unique task ID
   */
  generateTaskId() {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default AutonomousTaskRouter;