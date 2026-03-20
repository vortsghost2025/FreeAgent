/**
 * Multi-Agent Scheduler
 * Coordinates multiple agents working in parallel on different tasks
 */

const { getCoordinator } = require('./agent-coordinator');

class MultiAgentScheduler {
  constructor(config = {}) {
    this.coordinator = getCoordinator();
    this.taskQueue = new Map();
    this.activeAgents = new Map();
    this.completedTasks = new Map();
    this.maxConcurrency = config.maxConcurrency || 3;
  }

  /**
   * Initialize scheduler
   */
  async initialize() {
    // Load previous state if available
    this.loadSchedulerState();

    // Start task processing loop
    this.startTaskProcessor();

    console.log('[MultiAgentScheduler] Initialized with max concurrency:', this.maxConcurrency);
    return { success: true, message: 'Scheduler initialized' };
  }

  /**
   * Register an agent
   */
  async registerAgent(agentId, agentInfo) {
    this.activeAgents.set(agentId, {
      ...agentInfo,
      status: 'available',
      currentTask: null,
      tasksCompleted: 0
    });

    await this.coordinator.sendMessage('claude_code', `Agent ${agentId} registered as ${agentInfo.role}`);

    return { success: true, agentId };
  }

  /**
   * Submit a task for agent
   */
  async submitTask(taskRequest) {
    const taskId = this.generateTaskId();

    const task = {
      id: taskId,
      title: taskRequest.title,
      description: taskRequest.description,
      priority: taskRequest.priority || 'medium',
      assigned_to: taskRequest.assigned_to || 'claude_code',
      status: 'pending',
      created_at: Date.now(),
      dependencies: taskRequest.dependencies || []
    };

    this.taskQueue.set(taskId, task);

    await this.coordinator.createTask({
      title: task.title,
      description: task.description,
      priority: task.priority,
      created_by: 'claude_code',
      tags: taskRequest.tags || []
    });

    await this.coordinator.sendMessage(taskRequest.assigned_to, `Task assigned to you: ${task.title}`);

    return { success: true, taskId, task };
  }

  /**
   * Get task for an agent
   */
  async getTaskForAgent(agentId) {
    // Find tasks assigned to this agent
    const tasks = await this.coordinator.getTasks({ agent: agentId });

    return tasks.filter(t => t.status === 'pending');
  }

  /**
   * Complete a task
   */
  async completeTask(taskId, agentId, result) {
    const task = this.taskQueue.get(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // Update task status
    task.status = 'completed';
    task.completed_at = Date.now();
    task.result = result;

    // Update agent state
    const agentState = this.activeAgents.get(agentId);
    agentState.currentTask = null;
    agentState.tasksCompleted++;

    this.completedTasks.set(taskId, (agentState.tasksCompleted || 0) + 1);

    // Complete in coordinator
    await this.coordinator.completeTask(taskId, {
      agent_id: agentId,
      result: {
        status: 'completed',
        changes: result.changes || [],
        tests: result.tests || [],
        next_steps: result.next_steps || []
      }
    });

    await this.coordinator.sendMessage(agentId, `Task completed: ${task.title}`);

    return { success: true, taskId, task };
  }

  /**
   * Agent status update
   */
  async updateAgentStatus(agentId, status) {
    const agentState = this.activeAgents.get(agentId);
    agentState.status = status;

    await this.coordinator.updateContext(agentId, {
      current_operation: 'agent_status_update',
      status
    });
  }

  /**
   * Process task queue
   */
  async processQueue() {
    const availableAgents = Array.from(this.activeAgents.values())
      .filter(agent => agent.status === 'available');

    for (const agent of availableAgents) {
      await this.assignNextTask(agent.agentId);
    }
  }

  /**
   * Assign next task to agent
   */
  async assignNextTask(agentId) {
    // Get available tasks for this agent
    const tasks = await this.getTaskForAgent(agentId);

    if (tasks.length === 0) {
      // No tasks available
      await this.coordinator.sendMessage(agentId, 'No tasks available for you');
      return;
    }

    // Assign highest priority task
    const sortedTasks = tasks.sort((a, b) =>
      this.getPriorityScore(b.priority) - this.getPriorityScore(a.priority)
    );

    const task = sortedTasks[0];
    await this.claimTask(task.id, agentId);

    // Update agent state
    const agentState = this.activeAgents.get(agentId);
    agentState.currentTask = task.id;
    await this.updateAgentStatus(agentId, 'working');
  }

  /**
   * Claim a task
   */
  async claimTask(taskId, agentId) {
    await this.coordinator.claimTask(taskId, agentId);

    const task = this.taskQueue.get(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    task.status = 'in_progress';
    task.assigned_to = agentId;
    task.started_at = Date.now();

    await this.updateAgentStatus(agentId, 'working');
  }

  /**
   * Get priority score for sorting
   */
  getPriorityScore(priority) {
    const scores = {
      'high': 3,
      'medium': 2,
      'low': 1
    };
    return scores[priority] || 2;
  }

  /**
   * Task dependency check
   */
  async checkDependencies(task, agentId) {
    const agentState = this.activeAgents.get(agentId);
    const currentTask = this.taskQueue.get(agentId);

    if (currentTask && currentTask.id !== task.id) {
      // Agent has a different task
      await this.coordinator.sendMessage(agentId, `Please complete current task first: ${currentTask.title}`);
      return false;
    }

    return true; // Dependencies satisfied
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    const activeAgents = Array.from(this.activeAgents.values())
      .filter(agent => agent.status === 'available' || agent.status === 'working');

    const queuedTasks = Array.from(this.taskQueue.values())
      .filter(task => task.status === 'pending');

    return {
      active_agents: activeAgents.map(a => ({
        agent_id: a.agentId,
        status: a.status,
        current_task: a.currentTask,
        tasks_completed: this.completedTasks.get(a.agentId) || 0
      })),
      queued_tasks: queuedTasks,
      total_capacity: this.maxConcurrency,
      active_capacity: this.maxConcurrency - activeAgents.length
    };
  }

  /**
   * Pause agent
   */
  async pauseAgent(agentId) {
    const agentState = this.activeAgents.get(agentId);
    agentState.status = 'paused';

    await this.updateAgentStatus(agentId, 'paused');
    }

  /**
   * Resume agent
   */
  async resumeAgent(agentId) {
    const agentState = this.activeAgents.get(agentId);
    agentState.status = 'available';

    await this.updateAgentStatus(agentId, 'available');
  }

  generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateIterationId() {
    return `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  startTaskProcessor() {
    setInterval(() => this.processQueue(), 5000); // Check every 500ms
  }

  async loadSchedulerState() {
    // In real implementation, this would load from database
    console.log('[MultiAgentScheduler] Loading previous state...');
  }
}

module.exports = { MultiAgentScheduler, getScheduler: (config) => new MultiAgentScheduler(config) };