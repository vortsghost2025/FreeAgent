/**
 * Agent Router - Dynamic Model Selection System
 * Routes tasks to the optimal AI model based on task classification
 */

// Capability definitions for available models
export const AGENT_CAPABILITIES = {
  'claude-3.5-sonnet': [
    'reasoning',
    'complex-code',
    'architecture',
    'code-generation',
    'refactoring',
    'analysis'
  ],
  'claude-3-opus': [
    'reasoning',
    'complex-code',
    'architecture',
    'research',
    'advanced-analysis'
  ],
  'gpt-4': [
    'general-coding',
    'explanations',
    'devops',
    'deployment',
    'code-completion'
  ],
  'gpt-4-turbo': [
    'general-coding',
    'fast-code',
    'explanations',
    'multimodal'
  ],
  'gemini-pro': [
    'multimodal',
    'large-context',
    'vision',
    'long-form-content'
  ],
  'gemini-ultra': [
    'multimodal',
    'large-context',
    'vision',
    'reasoning',
    'complex-code'
  ],
  'deepseek-coder': [
    'code-completion',
    'refactoring',
    'bug-fixing',
    'fast-code'
  ],
  'roo-coder': [
    'agentic-coding',
    'autonomous-tasks',
    'planning',
    'multi-step-reasoning'
  ],
  'o1-preview': [
    'reasoning',
    'complex-code',
    'math',
    'research'
  ],
  'o1-mini': [
    'fast-reasoning',
    'code',
    'efficient-processing'
  ]
};

// Task type to capability mapping
const TASK_CAPABILITY_MAP = {
  'code-generation': ['claude-3.5-sonnet', 'gpt-4', 'deepseek-coder'],
  'code-completion': ['deepseek-coder', 'gpt-4-turbo', 'claude-3.5-sonnet'],
  'refactoring': ['claude-3.5-sonnet', 'deepseek-coder', 'gpt-4'],
  'bug-fixing': ['deepseek-coder', 'claude-3.5-sonnet', 'gpt-4'],
  'reasoning': ['o1-preview', 'claude-3-opus', 'claude-3.5-sonnet'],
  'architecture': ['claude-3.5-sonnet', 'claude-3-opus', 'gpt-4'],
  'general-coding': ['gpt-4', 'claude-3.5-sonnet', 'gpt-4-turbo'],
  'explanations': ['gpt-4', 'claude-3.5-sonnet', 'gemini-pro'],
  'multimodal': ['gemini-pro', 'gpt-4-turbo', 'claude-3.5-sonnet'],
  'large-context': ['gemini-pro', 'gemini-ultra', 'claude-3.5-sonnet'],
  'devops': ['gpt-4', 'claude-3.5-sonnet'],
  'deployment': ['gpt-4', 'claude-3.5-sonnet'],
  'agentic-coding': ['roo-coder', 'claude-3.5-sonnet'],
  'autonomous-tasks': ['roo-coder', 'o1-preview'],
  'planning': ['roo-coder', 'o1-preview', 'claude-3.5-sonnet'],
  'fast-code': ['deepseek-coder', 'gpt-4-turbo', 'o1-mini'],
  'research': ['o1-preview', 'claude-3-opus', 'gemini-ultra'],
  'analysis': ['claude-3.5-sonnet', 'gpt-4', 'o1-preview']
};

/**
 * Task classifier - determines the type of task
 * @param {string} task - The task description
 * @returns {string} - The task type
 */
export function classifyTask(task) {
  const taskLower = task.toLowerCase();
  
  // Check for specific keywords to classify task
  if (taskLower.includes('generate') || taskLower.includes('create') || taskLower.includes('build')) {
    return 'code-generation';
  }
  if (taskLower.includes('complete') || taskLower.includes('fill in') || taskLower.includes('autocomplete')) {
    return 'code-completion';
  }
  if (taskLower.includes('refactor') || taskLower.includes('restructure') || taskLower.includes('improve')) {
    return 'refactoring';
  }
  if (taskLower.includes('fix') || taskLower.includes('bug') || taskLower.includes('error')) {
    return 'bug-fixing';
  }
  if (taskLower.includes('reason') || taskLower.includes('think') || taskLower.includes('analyze why')) {
    return 'reasoning';
  }
  if (taskLower.includes('architect') || taskLower.includes('design system') || taskLower.includes('structure')) {
    return 'architecture';
  }
  if (taskLower.includes('explain') || taskLower.includes('what does') || taskLower.includes('how does')) {
    return 'explanations';
  }
  if (taskLower.includes('image') || taskLower.includes('screenshot') || taskLower.includes('vision')) {
    return 'multimodal';
  }
  if (taskLower.includes('deploy') || taskLower.includes('docker') || taskLower.includes('kubernetes')) {
    return 'deployment';
  }
  if (taskLower.includes('devops') || taskLower.includes('ci/cd') || taskLower.includes('pipeline')) {
    return 'devops';
  }
  if (taskLower.includes('autonomous') || taskLower.includes('agent') || taskLower.includes('self-directed')) {
    return 'autonomous-tasks';
  }
  if (taskLower.includes('plan') || taskLower.includes('strategy') || taskLower.includes('roadmap')) {
    return 'planning';
  }
  if (taskLower.includes('research') || taskLower.includes('investigate') || taskLower.includes('explore')) {
    return 'research';
  }
  if (taskLower.includes('context') || taskLower.includes('document') || taskLower.includes('large')) {
    return 'large-context';
  }
  
  // Default to general coding
  return 'general-coding';
}

/**
 * Select the best model for a given task type
 * @param {string} taskType - The type of task
 * @param {Object} options - Options for model selection
 * @returns {string} - The best model name
 */
export function selectModel(taskType, options = {}) {
  const availableModels = options.preferredModels || TASK_CAPABILITY_MAP[taskType] || ['claude-3.5-sonnet'];
  const strategy = options.strategy || 'best';
  
  if (strategy === 'fastest') {
    // Return fastest model for the task
    return availableModels[availableModels.length - 1];
  }
  
  if (strategy === 'best') {
    // Return best model for the task (first in list)
    return availableModels[0];
  }
  
  if (strategy === 'balanced') {
    // Return middle-ground model
    return availableModels[Math.floor(availableModels.length / 2)];
  }
  
  // Default to best model
  return availableModels[0];
}

/**
 * Route task to optimal model and execute
 * @param {string} task - The task description
 * @param {Object} context - Context for the task
 * @param {Object} options - Routing options
 * @returns {Object} - Execution result
 */
export async function routeToOptimalModel(task, context = {}, options = {}) {
  const taskType = classifyTask(task);
  const bestModel = selectModel(taskType, options);
  
  return {
    taskType,
    selectedModel: bestModel,
    task,
    context,
    options
  };
}

/**
 * Get all models that support a specific capability
 * @param {string} capability - The capability to search for
 * @returns {string[]} - List of models supporting the capability
 */
export function getModelsByCapability(capability) {
  const models = [];
  
  for (const [model, capabilities] of Object.entries(AGENT_CAPABILITIES)) {
    if (capabilities.includes(capability)) {
      models.push(model);
    }
  }
  
  return models;
}

/**
 * Get all capabilities for a specific model
 * @param {string} model - The model name
 * @returns {string[]} - List of capabilities
 */
export function getCapabilitiesForModel(model) {
  return AGENT_CAPABILITIES[model] || [];
}

/**
 * Create a router with custom configuration
 * @param {Object} config - Custom configuration
 * @returns {Object} - Configured router
 */
export function createRouter(config = {}) {
  return {
    capabilities: config.capabilities || AGENT_CAPABILITY_MAP,
    defaultModel: config.defaultModel || 'claude-3.5-sonnet',
    routingStrategy: config.routingStrategy || 'best',
    
    route(task, context = {}) {
      const taskType = classifyTask(task);
      const models = this.capabilities[taskType] || [this.defaultModel];
      return selectModel(taskType, { 
        ...options, 
        preferredModels: models 
      });
    }
  };
}

export default {
  AGENT_CAPABILITIES,
  classifyTask,
  selectModel,
  routeToOptimalModel,
  getModelsByCapability,
  getCapabilitiesForModel,
  createRouter
};
 * Agent Router - Dynamic Model Selection System
 * Routes tasks to the optimal AI model based on task classification
 */

// Capability definitions for available models
export const AGENT_CAPABILITIES = {
  'claude-3.5-sonnet': [
    'reasoning',
    'complex-code',
    'architecture',
    'code-generation',
    'refactoring',
    'analysis'
  ],
  'claude-3-opus': [
    'reasoning',
    'complex-code',
    'architecture',
    'research',
    'advanced-analysis'
  ],
  'gpt-4': [
    'general-coding',
    'explanations',
    'devops',
    'deployment',
    'code-completion'
  ],
  'gpt-4-turbo': [
    'general-coding',
    'fast-code',
    'explanations',
    'multimodal'
  ],
  'gemini-pro': [
    'multimodal',
    'large-context',
    'vision',
    'long-form-content'
  ],
  'gemini-ultra': [
    'multimodal',
    'large-context',
    'vision',
    'reasoning',
    'complex-code'
  ],
  'deepseek-coder': [
    'code-completion',
    'refactoring',
    'bug-fixing',
    'fast-code'
  ],
  'roo-coder': [
    'agentic-coding',
    'autonomous-tasks',
    'planning',
    'multi-step-reasoning'
  ],
  'o1-preview': [
    'reasoning',
    'complex-code',
    'math',
    'research'
  ],
  'o1-mini': [
    'fast-reasoning',
    'code',
    'efficient-processing'
  ]
};

// Task type to capability mapping
const TASK_CAPABILITY_MAP = {
  'code-generation': ['claude-3.5-sonnet', 'gpt-4', 'deepseek-coder'],
  'code-completion': ['deepseek-coder', 'gpt-4-turbo', 'claude-3.5-sonnet'],
  'refactoring': ['claude-3.5-sonnet', 'deepseek-coder', 'gpt-4'],
  'bug-fixing': ['deepseek-coder', 'claude-3.5-sonnet', 'gpt-4'],
  'reasoning': ['o1-preview', 'claude-3-opus', 'claude-3.5-sonnet'],
  'architecture': ['claude-3.5-sonnet', 'claude-3-opus', 'gpt-4'],
  'general-coding': ['gpt-4', 'claude-3.5-sonnet', 'gpt-4-turbo'],
  'explanations': ['gpt-4', 'claude-3.5-sonnet', 'gemini-pro'],
  'multimodal': ['gemini-pro', 'gpt-4-turbo', 'claude-3.5-sonnet'],
  'large-context': ['gemini-pro', 'gemini-ultra', 'claude-3.5-sonnet'],
  'devops': ['gpt-4', 'claude-3.5-sonnet'],
  'deployment': ['gpt-4', 'claude-3.5-sonnet'],
  'agentic-coding': ['roo-coder', 'claude-3.5-sonnet'],
  'autonomous-tasks': ['roo-coder', 'o1-preview'],
  'planning': ['roo-coder', 'o1-preview', 'claude-3.5-sonnet'],
  'fast-code': ['deepseek-coder', 'gpt-4-turbo', 'o1-mini'],
  'research': ['o1-preview', 'claude-3-opus', 'gemini-ultra'],
  'analysis': ['claude-3.5-sonnet', 'gpt-4', 'o1-preview']
};

/**
 * Task classifier - determines the type of task
 * @param {string} task - The task description
 * @returns {string} - The task type
 */
export function classifyTask(task) {
  const taskLower = task.toLowerCase();
  
  // Check for specific keywords to classify task
  if (taskLower.includes('generate') || taskLower.includes('create') || taskLower.includes('build')) {
    return 'code-generation';
  }
  if (taskLower.includes('complete') || taskLower.includes('fill in') || taskLower.includes('autocomplete')) {
    return 'code-completion';
  }
  if (taskLower.includes('refactor') || taskLower.includes('restructure') || taskLower.includes('improve')) {
    return 'refactoring';
  }
  if (taskLower.includes('fix') || taskLower.includes('bug') || taskLower.includes('error')) {
    return 'bug-fixing';
  }
  if (taskLower.includes('reason') || taskLower.includes('think') || taskLower.includes('analyze why')) {
    return 'reasoning';
  }
  if (taskLower.includes('architect') || taskLower.includes('design system') || taskLower.includes('structure')) {
    return 'architecture';
  }
  if (taskLower.includes('explain') || taskLower.includes('what does') || taskLower.includes('how does')) {
    return 'explanations';
  }
  if (taskLower.includes('image') || taskLower.includes('screenshot') || taskLower.includes('vision')) {
    return 'multimodal';
  }
  if (taskLower.includes('deploy') || taskLower.includes('docker') || taskLower.includes('kubernetes')) {
    return 'deployment';
  }
  if (taskLower.includes('devops') || taskLower.includes('ci/cd') || taskLower.includes('pipeline')) {
    return 'devops';
  }
  if (taskLower.includes('autonomous') || taskLower.includes('agent') || taskLower.includes('self-directed')) {
    return 'autonomous-tasks';
  }
  if (taskLower.includes('plan') || taskLower.includes('strategy') || taskLower.includes('roadmap')) {
    return 'planning';
  }
  if (taskLower.includes('research') || taskLower.includes('investigate') || taskLower.includes('explore')) {
    return 'research';
  }
  if (taskLower.includes('context') || taskLower.includes('document') || taskLower.includes('large')) {
    return 'large-context';
  }
  
  // Default to general coding
  return 'general-coding';
}

/**
 * Select the best model for a given task type
 * @param {string} taskType - The type of task
 * @param {Object} options - Options for model selection
 * @returns {string} - The best model name
 */
export function selectModel(taskType, options = {}) {
  const availableModels = options.preferredModels || TASK_CAPABILITY_MAP[taskType] || ['claude-3.5-sonnet'];
  const strategy = options.strategy || 'best';
  
  if (strategy === 'fastest') {
    // Return fastest model for the task
    return availableModels[availableModels.length - 1];
  }
  
  if (strategy === 'best') {
    // Return best model for the task (first in list)
    return availableModels[0];
  }
  
  if (strategy === 'balanced') {
    // Return middle-ground model
    return availableModels[Math.floor(availableModels.length / 2)];
  }
  
  // Default to best model
  return availableModels[0];
}

/**
 * Route task to optimal model and execute
 * @param {string} task - The task description
 * @param {Object} context - Context for the task
 * @param {Object} options - Routing options
 * @returns {Object} - Execution result
 */
export async function routeToOptimalModel(task, context = {}, options = {}) {
  const taskType = classifyTask(task);
  const bestModel = selectModel(taskType, options);
  
  return {
    taskType,
    selectedModel: bestModel,
    task,
    context,
    options
  };
}

/**
 * Get all models that support a specific capability
 * @param {string} capability - The capability to search for
 * @returns {string[]} - List of models supporting the capability
 */
export function getModelsByCapability(capability) {
  const models = [];
  
  for (const [model, capabilities] of Object.entries(AGENT_CAPABILITIES)) {
    if (capabilities.includes(capability)) {
      models.push(model);
    }
  }
  
  return models;
}

/**
 * Get all capabilities for a specific model
 * @param {string} model - The model name
 * @returns {string[]} - List of capabilities
 */
export function getCapabilitiesForModel(model) {
  return AGENT_CAPABILITIES[model] || [];
}

/**
 * Create a router with custom configuration
 * @param {Object} config - Custom configuration
 * @returns {Object} - Configured router
 */
export function createRouter(config = {}) {
  return {
    capabilities: config.capabilities || AGENT_CAPABILITY_MAP,
    defaultModel: config.defaultModel || 'claude-3.5-sonnet',
    routingStrategy: config.routingStrategy || 'best',
    
    route(task, context = {}) {
      const taskType = classifyTask(task);
      const models = this.capabilities[taskType] || [this.defaultModel];
      return selectModel(taskType, { 
        ...options, 
        preferredModels: models 
      });
    }
  };
}

export default {
  AGENT_CAPABILITIES,
  classifyTask,
  selectModel,
  routeToOptimalModel,
  getModelsByCapability,
  getCapabilitiesForModel,
  createRouter
};

