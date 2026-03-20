/**
 * Context Module - Smart Context Management for FreeAgent Cockpit
 * 
 * This module provides modular context slices that can be loaded/unloaded
 * dynamically to optimize token usage while maintaining conversation context.
 * 
 * @module cockpit/context
 * 
 * Exports:
 * - ContextSliceManager: Main context slice manager class
 * - SliceTemplates: Pre-defined context slice templates
 * - createContextSliceManager: Factory function to create a new manager
 */

// Main context slice manager
const ContextSliceManager = require('./contextSliceManager');

// Slice templates
const SliceTemplates = require('./sliceTemplates');

// Export both as named exports
module.exports = {
  ContextSliceManager,
  SliceTemplates,
  createContextSliceManager: ContextSliceManager.createContextSliceManager
};

// Also export each individually for easier imports
module.exports.ContextSliceManager = ContextSliceManager;
module.exports.SliceTemplates = SliceTemplates;
module.exports.createContextSliceManager = ContextSliceManager.createContextSliceManager;

/**
 * Quick helper to create a context slice manager with default settings
 * @param {object} options - Configuration options
 * @returns {ContextSliceManager}
 */
module.exports.createDefault = function(options = {}) {
  return new ContextSliceManager({
    maxTokens: {
      claude: options.maxTokens?.claude || 100000,
      gemini: options.maxTokens?.gemini || 32000,
      local: options.maxTokens?.local || 8192,
      default: options.maxTokens?.default || 32000
    },
    defaultModel: options.defaultModel || 'claude',
    logger: options.logger || console
  });
};

/**
 * Get a summary of all available slice types
 * @returns {Array} - Array of slice type info
 */
module.exports.getSliceTypes = function() {
  return [
    {
      type: 'system',
      name: 'System',
      description: 'System instructions and configuration',
      priority: 100,
      evictable: false
    },
    {
      type: 'session',
      name: 'Session',
      description: 'Current conversation session context',
      priority: 80,
      evictable: false
    },
    {
      type: 'task',
      name: 'Task',
      description: 'Current task context and goals',
      priority: 60,
      evictable: true
    },
    {
      type: 'project',
      name: 'Project',
      description: 'Project-specific context',
      priority: 40,
      evictable: true
    },
    {
      type: 'memory',
      name: 'Memory',
      description: 'Relevant memories from past sessions',
      priority: 20,
      evictable: true
    }
  ];
};
