/**
 * Agent Behaviors - Autonomous Execution Loop
 * Implements agentic behavior patterns for self-directed task completion
 */

/**
 * Plan step representation
 */
class PlanStep {
  constructor(description, type, params = {}) {
    this.id = Math.random().toString(36).substr(2, 9);
    this.description = description;
    this.type = type;
    this.params = params;
    this.status = 'pending';
    this.result = null;
    this.error = null;
    this.needsApproval = params.needsApproval || false;
    this.approved = false;
  }

  markInProgress() {
    this.status = 'in_progress';
  }

  complete(result) {
    this.status = 'completed';
    this.result = result;
  }

  fail(error) {
    this.status = 'failed';
    this.error = error;
  }

  approve() {
    this.approved = true;
  }
}

/**
 * Execution plan
 */
class ExecutionPlan {
  constructor(goal) {
    this.goal = goal;
    this.steps = [];
    this.currentStepIndex = 0;
    this.isComplete = false;
    this.context = {};
  }

  addStep(step) {
    this.steps.push(step);
  }

  nextStep() {
    if (this.currentStepIndex >= this.steps.length) {
      this.isComplete = true;
      return null;
    }
    return this.steps[this.currentStepIndex];
  }

  advance() {
    this.currentStepIndex++;
    if (this.currentStepIndex >= this.steps.length) {
      this.isComplete = true;
    }
  }

  getCompletedSteps() {
    return this.steps.filter(s => s.status === 'completed');
  }

  getFailedSteps() {
    return this.steps.filter(s => s.status === 'failed');
  }
}

/**
 * Agentic Behavior - Handles autonomous task execution
 */
class AgenticBehavior {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.approvalRequired = options.approvalRequired || false;
    this.autoAdjustPlan = options.autoAdjustPlan !== false;
    this.onApprovalRequest = options.onApprovalRequest || null;
    this.onStepComplete = options.onStepComplete || null;
  }

  /**
   * Create an execution plan for a goal
   * @param {string} goal - The goal to achieve
   * @returns {Promise<ExecutionPlan>} - The execution plan
   */
  async createPlan(goal) {
    const plan = new ExecutionPlan(goal);
    plan.addStep(new PlanStep(`Analyze goal: ${goal}`, 'analysis'));
    plan.addStep(new PlanStep('Break down into actionable steps', 'decomposition'));
    plan.addStep(new PlanStep('Execute sub-tasks', 'execution', { needsApproval: this.approvalRequired }));
    plan.addStep(new PlanStep('Verify results', 'verification'));
    return plan;
  }

  /**
   * Execute a single step
   * @param {PlanStep} step - The step to execute
   * @param {Object} executor - Executor function
   * @returns {Promise<Object>} - Step result
   */
  async executeStep(step, executor) {
    step.markInProgress();
    
    let retries = 0;
    while (retries < this.maxRetries) {
      try {
        const result = await executor(step);
        step.complete(result);
        
        if (this.onStepComplete) {
          this.onStepComplete(step);
        }
        
        return { success: true, result };
      } catch (error) {
        retries++;
        if (retries >= this.maxRetries) {
          step.fail(error.message);
          return { success: false, error: error.message };
        }
        await new Promise(r => setTimeout(r, 1000 * retries));
      }
    }
  }

  /**
   * Request human approval for a step
   * @param {PlanStep} step - The step needing approval
   * @returns {Promise<boolean>} - Whether approved
   */
  async requestHumanApproval(step) {
    if (this.onApprovalRequest) {
      return await this.onApprovalRequest(step);
    }
    return true;
  }

  /**
   * Adjust plan based on result
   * @param {ExecutionPlan} plan - Current plan
   * @param {Object} result - Step result
   * @returns {ExecutionPlan} - Adjusted plan
   */
  async adjustPlan(plan, result) {
    if (!this.autoAdjustPlan) {
      return plan;
    }
    
    if (!result.success) {
      const retryStep = new PlanStep(`Retry failed step`, 'retry');
      plan.addStep(retryStep);
    }
    
    return plan;
  }

  /**
   * Main autonomous execution loop
   * @param {string} goal - The goal to achieve
   * @param {Object} executor - Executor for running steps
   * @returns {Promise<Object>} - Final result
   */
  async autonomousExecute(goal, executor) {
    let plan = await this.createPlan(goal);
    
    while (!plan.isComplete) {
      const step = plan.nextStep();
      
      if (!step) {
        break;
      }

      if (step.needsApproval) {
        const approved = await this.requestHumanApproval(step);
        if (!approved) {
          console.log('[Agentic] Step not approved, stopping');
          break;
        }
        step.approve();
      }

      const result = await this.executeStep(step, executor);
      
      plan = await this.adjustPlan(plan, result);
      plan.advance();
    }

    return {
      success: plan.getFailedSteps().length === 0,
      completedSteps: plan.getCompletedSteps(),
      failedSteps: plan.getFailedSteps(),
      context: plan.context
    };
  }

  /**
   * Execute with planning phase
   * @param {string} task - Task description
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} - Execution result
   */
  async executeWithPlanning(task, options = {}) {
    const plan = await this.createPlan(task);
    
    return {
      plan: plan.steps.map(s => ({
        id: s.id,
        description: s.description,
        type: s.type
      })),
      execution: await this.autonomousExecute(task, options.executor || (() => {}))
    };
  }
}

export { AgenticBehavior, PlanStep, ExecutionPlan };
export default AgenticBehavior;
 * Agent Behaviors - Autonomous Execution Loop
 * Implements agentic behavior patterns for self-directed task completion
 */

/**
 * Plan step representation
 */
class PlanStep {
  constructor(description, type, params = {}) {
    this.id = Math.random().toString(36).substr(2, 9);
    this.description = description;
    this.type = type;
    this.params = params;
    this.status = 'pending';
    this.result = null;
    this.error = null;
    this.needsApproval = params.needsApproval || false;
    this.approved = false;
  }

  markInProgress() {
    this.status = 'in_progress';
  }

  complete(result) {
    this.status = 'completed';
    this.result = result;
  }

  fail(error) {
    this.status = 'failed';
    this.error = error;
  }

  approve() {
    this.approved = true;
  }
}

/**
 * Execution plan
 */
class ExecutionPlan {
  constructor(goal) {
    this.goal = goal;
    this.steps = [];
    this.currentStepIndex = 0;
    this.isComplete = false;
    this.context = {};
  }

  addStep(step) {
    this.steps.push(step);
  }

  nextStep() {
    if (this.currentStepIndex >= this.steps.length) {
      this.isComplete = true;
      return null;
    }
    return this.steps[this.currentStepIndex];
  }

  advance() {
    this.currentStepIndex++;
    if (this.currentStepIndex >= this.steps.length) {
      this.isComplete = true;
    }
  }

  getCompletedSteps() {
    return this.steps.filter(s => s.status === 'completed');
  }

  getFailedSteps() {
    return this.steps.filter(s => s.status === 'failed');
  }
}

/**
 * Agentic Behavior - Handles autonomous task execution
 */
class AgenticBehavior {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.approvalRequired = options.approvalRequired || false;
    this.autoAdjustPlan = options.autoAdjustPlan !== false;
    this.onApprovalRequest = options.onApprovalRequest || null;
    this.onStepComplete = options.onStepComplete || null;
  }

  /**
   * Create an execution plan for a goal
   * @param {string} goal - The goal to achieve
   * @returns {Promise<ExecutionPlan>} - The execution plan
   */
  async createPlan(goal) {
    const plan = new ExecutionPlan(goal);
    plan.addStep(new PlanStep(`Analyze goal: ${goal}`, 'analysis'));
    plan.addStep(new PlanStep('Break down into actionable steps', 'decomposition'));
    plan.addStep(new PlanStep('Execute sub-tasks', 'execution', { needsApproval: this.approvalRequired }));
    plan.addStep(new PlanStep('Verify results', 'verification'));
    return plan;
  }

  /**
   * Execute a single step
   * @param {PlanStep} step - The step to execute
   * @param {Object} executor - Executor function
   * @returns {Promise<Object>} - Step result
   */
  async executeStep(step, executor) {
    step.markInProgress();
    
    let retries = 0;
    while (retries < this.maxRetries) {
      try {
        const result = await executor(step);
        step.complete(result);
        
        if (this.onStepComplete) {
          this.onStepComplete(step);
        }
        
        return { success: true, result };
      } catch (error) {
        retries++;
        if (retries >= this.maxRetries) {
          step.fail(error.message);
          return { success: false, error: error.message };
        }
        await new Promise(r => setTimeout(r, 1000 * retries));
      }
    }
  }

  /**
   * Request human approval for a step
   * @param {PlanStep} step - The step needing approval
   * @returns {Promise<boolean>} - Whether approved
   */
  async requestHumanApproval(step) {
    if (this.onApprovalRequest) {
      return await this.onApprovalRequest(step);
    }
    return true;
  }

  /**
   * Adjust plan based on result
   * @param {ExecutionPlan} plan - Current plan
   * @param {Object} result - Step result
   * @returns {ExecutionPlan} - Adjusted plan
   */
  async adjustPlan(plan, result) {
    if (!this.autoAdjustPlan) {
      return plan;
    }
    
    if (!result.success) {
      const retryStep = new PlanStep(`Retry failed step`, 'retry');
      plan.addStep(retryStep);
    }
    
    return plan;
  }

  /**
   * Main autonomous execution loop
   * @param {string} goal - The goal to achieve
   * @param {Object} executor - Executor for running steps
   * @returns {Promise<Object>} - Final result
   */
  async autonomousExecute(goal, executor) {
    let plan = await this.createPlan(goal);
    
    while (!plan.isComplete) {
      const step = plan.nextStep();
      
      if (!step) {
        break;
      }

      if (step.needsApproval) {
        const approved = await this.requestHumanApproval(step);
        if (!approved) {
          console.log('[Agentic] Step not approved, stopping');
          break;
        }
        step.approve();
      }

      const result = await this.executeStep(step, executor);
      
      plan = await this.adjustPlan(plan, result);
      plan.advance();
    }

    return {
      success: plan.getFailedSteps().length === 0,
      completedSteps: plan.getCompletedSteps(),
      failedSteps: plan.getFailedSteps(),
      context: plan.context
    };
  }

  /**
   * Execute with planning phase
   * @param {string} task - Task description
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} - Execution result
   */
  async executeWithPlanning(task, options = {}) {
    const plan = await this.createPlan(task);
    
    return {
      plan: plan.steps.map(s => ({
        id: s.id,
        description: s.description,
        type: s.type
      })),
      execution: await this.autonomousExecute(task, options.executor || (() => {}))
    };
  }
}

export { AgenticBehavior, PlanStep, ExecutionPlan };
export default AgenticBehavior;

