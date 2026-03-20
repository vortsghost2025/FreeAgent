const { AgentCapabilities, createCapabilitiesMiddleware } = require("./agentCapabilities");

class BaseAgent {
    constructor(id) {
      this.id = id;
      this.capabilities = new AgentCapabilities();
      this.capabilitiesMiddleware = createCapabilitiesMiddleware(this.capabilities);
    }

    /**
     * Get capabilities summary for this agent
     * @returns {string} - Human-readable capabilities summary
     */
    getCapabilitiesSummary() {
      return this.capabilities.getCapabilitiesSummary();
    }

    /**
     * Check if a specific action is allowed
     * @param {string} action - The action to check
     * @returns {object} - { allowed: boolean, message: string }
     */
    canPerform(action) {
      return this.capabilities.validateAction(action);
    }

    /**
     * Get the limitation message for a specific action
     * @param {string} action - The action that was attempted
     * @returns {string} - Explanation of limitation
     */
    getLimitationMessage(action) {
      return this.capabilities.getLimitationMessage(action);
    }
   
    async run(task, ctx) {
      // Apply capabilities middleware before running
      const { allowed, task: processedTask, ctx: processedCtx } = 
        this.capabilitiesMiddleware.beforeRun(task, ctx);
      
      if (!allowed) {
        return { 
          text: "Task blocked by capability restrictions.", 
          agent: this.id,
          capabilities: this.capabilities.getCapabilitiesSummary()
        };
      }
      
      const result = await this.execute(processedTask, processedCtx);
      
      // Apply capabilities middleware after running
      return this.capabilitiesMiddleware.afterRun(result);
    }

    /**
     * Execute the actual task - to be implemented by subclasses
     * @param {string} task - The task to execute
     * @param {object} ctx - Execution context
     * @returns {Promise<object>} - Execution result
     */
    async execute(task, ctx) {
      throw new Error("BaseAgent.execute() must be implemented");
    }
  }
  
  module.exports = BaseAgent;
  