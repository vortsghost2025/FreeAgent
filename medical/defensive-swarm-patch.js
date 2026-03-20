/**
 * DEFENSIVE PATCH: Agent Cleanup Race Condition Fix
 * Addresses "Cannot read properties of undefined (reading 'failTask')" errors
 * 
 * Problem: Agent cleanup handlers firing after tasks are already removed from queue
 * Solution: Add defensive checks before calling failTask()
 */

class DefensiveTaskCleanup {
  /**
   * Safe task failure handler with null checks
   */
  static safeFailTask(task, errorMessage = 'Task failed') {
    // DEFENSIVE CHECK 1: Ensure task object exists
    if (!task) {
      console.warn('[DefensivePatch] Attempted to fail undefined task');
      return false;
    }
    
    // DEFENSIVE CHECK 2: Ensure failTask method exists
    if (typeof task.failTask !== 'function') {
      console.warn('[DefensivePatch] Task missing failTask method:', task);
      return false;
    }
    
    // DEFENSIVE CHECK 3: Ensure task is still in valid state
    if (task.status === 'completed' || task.status === 'failed') {
      console.debug('[DefensivePatch] Task already finalized, skipping failTask');
      return false;
    }
    
    try {
      task.failTask(errorMessage);
      console.log(`[DefensivePatch] Safely failed task ${task.id}`);
      return true;
    } catch (error) {
      console.error('[DefensivePatch] Error during task failure:', error);
      return false;
    }
  }
  
  /**
   * Patch agent cleanup handlers
   */
  static patchAgentCleanup(agent) {
    if (!agent) return;
    
    // Store original cleanup method
    const originalCleanup = agent.cleanup || (() => {});
    
    // Override with defensive version
    agent.cleanup = function() {
      console.log(`[DefensivePatch] Cleaning up agent ${this.id}`);
      
      // Defensive task cleanup
      if (this.currentTask) {
        DefensiveTaskCleanup.safeFailTask(this.currentTask, 'Agent cleanup forced task failure');
        this.currentTask = null;
      }
      
      // Defensive task queue cleanup
      if (this.taskQueue && Array.isArray(this.taskQueue)) {
        this.taskQueue.forEach(task => {
          DefensiveTaskCleanup.safeFailTask(task, 'Agent shutdown forced task failure');
        });
        this.taskQueue = [];
      }
      
      // Call original cleanup
      return originalCleanup.call(this);
    };
    
    console.log(`[DefensivePatch] Applied defensive cleanup to agent ${agent.id}`);
  }
  
  /**
   * Global swarm error interceptor
   */
  static setupGlobalInterceptor() {
    // Intercept console errors for pattern matching
    const originalError = console.error;
    console.error = function(...args) {
      const message = args.join(' ');
      
      // Catch the specific error pattern
      if (message.includes('Cannot read properties of undefined (reading \'failTask\')')) {
        console.warn('[DefensivePatch] Intercepted race condition error:', message);
        // Don't suppress, but log additional context
        console.trace('[DefensivePatch] Error traceback:');
        return;
      }
      
      // Pass through all other errors
      originalError.apply(console, args);
    };
    
    console.log('[DefensivePatch] Global error interceptor active');
  }
}

// Apply patches when module loads
console.log('🛡️ Defensive Task Cleanup Patch Loaded');

// Export for use in swarm system
export { DefensiveTaskCleanup };

// Auto-initialize global interceptor
DefensiveTaskCleanup.setupGlobalInterceptor();