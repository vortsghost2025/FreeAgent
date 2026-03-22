/**
 * Context Slice Templates - Pre-defined Context Slice Templates
 * 
 * Provides templates for the different types of context slices:
 * - Session: Current conversation/session context
 * - Project: Project-specific context
 * - Task: Current task context
 * - System: System instructions and configuration
 * - Memory: Relevant memories from past sessions
 */

const SliceTemplates = {
  /**
   * Get all templates
   * @returns {object} - All templates
   */
  getAllTemplates() {
    return {
      session: this.session(),
      project: this.project(),
      task: this.task(),
      system: this.system(),
      memory: this.memory()
    };
  },

  /**
   * Session slice template
   * Contains current conversation context
   */
  session() {
    return {
      name: 'Session',
      description: 'Current conversation session context',
      defaultContent: '',
      metadata: {
        containsHistory: true,
        maxMessages: 20,
        autoTrim: true
      }
    };
  },

  /**
   * Project slice template
   * Contains project-specific context
   */
  project() {
    return {
      name: 'Project',
      description: 'Project-specific context and configuration',
      defaultContent: '',
      metadata: {
        projectPath: null,
        projectType: null,
        dependencies: []
      }
    };
  },

  /**
   * Task slice template
   * Contains current task context
   */
  task() {
    return {
      name: 'Task',
      description: 'Current task context and goals',
      defaultContent: '',
      metadata: {
        taskType: null,
        taskGoal: null,
        constraints: [],
        deadline: null
      }
    };
  },

  /**
   * System slice template
   * Contains system instructions and configuration
   */
  system() {
    return {
      name: 'System',
      description: 'System instructions and configuration',
      defaultContent: `You are the FreeAgent Orchestrator, an internal AI agent inside the FreeAgent cockpit system.
CRITICAL CONTEXT RULES:
1) ALWAYS maintain conversation context - remember what was discussed earlier in THIS session.
2) The cockpit displays a real-time STATUS PANEL showing service connectivity.
3) Before claiming any service is available, check your context - do NOT assume.
4) Be honest about what is actually connected vs disconnected.
5) If you lose context mid-conversation, ask the user to repeat.

SYSTEM COMPONENTS:
- FreeAgent Cockpit: Web dashboard at http://localhost:3847
- Orchestrator: Routes requests between Claude, Gemini, and local models
- Vector Memory: Semantic storage for past conversations
- Sessions: Persistent conversation contexts
- Context Slice Manager: Dynamic context optimization`,
      metadata: {
        version: '1.0',
        capabilities: ['routing', 'memory', 'sessions', 'context-optimization']
      }
    };
  },

  /**
   * Memory slice template
   * Contains relevant memories from past sessions
   */
  memory() {
    return {
      name: 'Memory',
      description: 'Relevant memories from past sessions',
      defaultContent: '',
      metadata: {
        maxMemories: 5,
        relevanceThreshold: 0.5,
        collection: 'conversations'
      }
    };
  },

  /**
   * Create a session slice with content
   * @param {Array} messages - Message history
   * @param {object} options - Additional options
   * @returns {object} - Slice data
   */
  createSessionSlice(messages = [], options = {}) {
    const maxMessages = options.maxMessages || 20;
    const recentMessages = messages.slice(-maxMessages);
    
    const content = recentMessages
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');

    return {
      type: 'session',
      name: 'Session Context',
      content,
      tokens: Math.ceil(content.length / 4),
      metadata: {
        messageCount: recentMessages.length,
        sessionId: options.sessionId || null,
        startedAt: options.startedAt || Date.now()
      }
    };
  },

  /**
   * Create a project slice with content
   * @param {object} projectInfo - Project information
   * @returns {object} - Slice data
   */
  createProjectSlice(projectInfo = {}) {
    const content = projectInfo.description || 
      `Project: ${projectInfo.name || 'Unknown Project'}\n` +
      `Type: ${projectInfo.type || 'General'}\n` +
      `Path: ${projectInfo.path || 'N/A'}\n` +
      (projectInfo.dependencies ? `Dependencies: ${projectInfo.dependencies.join(', ')}\n` : '');

    return {
      type: 'project',
      name: projectInfo.name || 'Project Context',
      content,
      tokens: Math.ceil(content.length / 4),
      metadata: {
        projectPath: projectInfo.path,
        projectType: projectInfo.type,
        dependencies: projectInfo.dependencies || []
      }
    };
  },

  /**
   * Create a task slice with content
   * @param {object} taskInfo - Task information
   * @returns {object} - Slice data
   */
  createTaskSlice(taskInfo = {}) {
    const content = taskInfo.description ||
      `Task: ${taskInfo.title || 'Untitled Task'}\n` +
      `Goal: ${taskInfo.goal || 'Complete the task'}\n` +
      (taskInfo.constraints ? `Constraints: ${taskInfo.constraints.join(', ')}\n` : '') +
      (taskInfo.deadline ? `Deadline: ${taskInfo.deadline}\n` : '');

    return {
      type: 'task',
      name: taskInfo.title || 'Task Context',
      content,
      tokens: Math.ceil(content.length / 4),
      metadata: {
        taskType: taskInfo.type,
        taskGoal: taskInfo.goal,
        constraints: taskInfo.constraints || [],
        deadline: taskInfo.deadline
      }
    };
  },

  /**
   * Create a system slice with content
   * @param {string} systemPrompt - Custom system prompt
   * @param {object} options - Additional options
   * @returns {object} - Slice data
   */
  createSystemSlice(systemPrompt, options = {}) {
    const defaultSystem = this.system().defaultContent;
    const content = systemPrompt || defaultSystem;

    return {
      type: 'system',
      name: 'System Instructions',
      content,
      tokens: Math.ceil(content.length / 4),
      metadata: {
        version: options.version || '1.0',
        capabilities: options.capabilities || ['routing', 'memory', 'sessions'],
        custom: !!systemPrompt
      }
    };
  },

  /**
   * Create a memory slice with content
   * @param {Array} memories - Array of memory objects
   * @param {object} options - Additional options
   * @returns {object} - Slice data
   */
  createMemorySlice(memories = [], options = {}) {
    const maxMemories = options.maxMemories || 5;
    const relevantMemories = memories.slice(0, maxMemories);
    
    const content = relevantMemories.length > 0
      ? relevantMemories
          .map(m => `- ${m.content}`)
          .join('\n')
      : 'No relevant memories found.';

    return {
      type: 'memory',
      name: 'Relevant Memories',
      content,
      tokens: Math.ceil(content.length / 4),
      metadata: {
        memoryCount: relevantMemories.length,
        collection: options.collection || 'conversations',
        searchQuery: options.query || null
      }
    };
  },

  /**
   * Get template by type
   * @param {string} type - Slice type
   * @returns {object|null} - Template or null
   */
  getTemplate(type) {
    const templates = this.getAllTemplates();
    return templates[type] || null;
  },

  /**
   * Validate slice data
   * @param {object} slice - Slice to validate
   * @returns {object} - Validation result
   */
  validateSlice(slice) {
    const errors = [];
    
    if (!slice.type) {
      errors.push('Missing type');
    }
    if (!slice.name) {
      errors.push('Missing name');
    }
    if (slice.content === undefined || slice.content === null) {
      errors.push('Missing content');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
};

module.exports = SliceTemplates;

/**
 * Get all template types
 * @returns {Array} - Array of template type names
 */
module.exports.getTemplateTypes = function() {
  return ['session', 'project', 'task', 'system', 'memory'];
};
