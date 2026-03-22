/**
 * Swarm Coordinator
 * Coordinates agent task execution in the MEV swarm system
 */

class BaseAgent {
  constructor(options = {}) {
    this.name = options.name || 'UnnamedAgent';
    this.status = 'idle';
    this.tasks = [];
  }

  /**
   * Execute a task - this is the new method name
   * @param {Object} task - The task to execute
   * @returns {Promise<Object>} - The task result
   */
  async executeTask(task) {
    this.status = 'executing';
    console.log(`[${this.name}] Executing task: ${task.type}`);
    
    try {
      // Placeholder for actual task execution logic
      const result = await this._executeTaskInternal(task);
      this.status = 'completed';
      return result;
    } catch (error) {
      this.status = 'error';
      throw error;
    }
  }

  /**
   * Internal method that performs the actual task execution
   * @param {Object} task - The task to execute
   * @returns {Promise<Object>} - The task result
   */
  async _executeTaskInternal(task) {
    // Override in subclasses for specific task handling
    return { success: true, task };
  }

  // Temporary backwards compat for old agents
  // This alias ensures existing agents that call assignTask continue to work
  assignTask = (...args) => this.executeTask(...args)

  /**
   * Get agent status
   * @returns {string} - Current status
   */
  getStatus() {
    return this.status;
  }

  /**
   * Add a task to the queue
   * @param {Object} task - Task to add
   */
  addTask(task) {
    this.tasks.push(task);
  }
}

class SwarmCoordinator {
  constructor(options = {}) {
    this.agents = new Map();
    this.options = options;
  }

  /**
   * Register an agent with the coordinator
   * @param {string} agentId - Unique agent identifier
   * @param {BaseAgent} agent - Agent instance
   */
  registerAgent(agentId, agent) {
    this.agents.set(agentId, agent);
    console.log(`[SwarmCoordinator] Registered agent: ${agentId}`);
  }

  /**
   * Assign a task to an agent
   * @param {string} agentId - Agent to assign task to
   * @param {Object} task - Task to assign
   * @returns {Promise<Object>} - Task result
   */
  async assignTaskToAgent(agentId, task) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    
    // Using executeTask (new method name)
    return await agent.executeTask(task);
  }

  /**
   * Get all registered agents
   * @returns {Array} - List of agent IDs
   */
  getAgentIds() {
    return Array.from(this.agents.keys());
  }
}

export { BaseAgent, SwarmCoordinator };
