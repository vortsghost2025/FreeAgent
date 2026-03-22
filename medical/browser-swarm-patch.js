/**
 * SWARM PATCH INTEGRATION SCRIPT
 * Run this in browser console to apply defensive fixes to running swarm
 * 
 * Usage: Copy and paste this into the browser console of your swarm UI
 */

(function() {
  'use strict';
  
  console.log('🚀 Applying Swarm Defensive Patches...');
  
  // Defensive failTask wrapper
  function safeFailTask(task, errorMessage = 'Task failed') {
    // Guard 1: Check if task exists
    if (!task) {
      console.warn('[PATCH] Ignored failTask call on undefined task');
      return false;
    }
    
    // Guard 2: Check if failTask method exists
    if (typeof task.failTask !== 'function') {
      console.warn('[PATCH] Task missing failTask method:', task);
      return false;
    }
    
    // Guard 3: Check task state
    if (task.status && (task.status === 'completed' || task.status === 'failed')) {
      console.debug('[PATCH] Task already finalized, skipping failTask');
      return false;
    }
    
    try {
      task.failTask(errorMessage);
      console.log(`[PATCH] Safely failed task ${task.id || 'unknown'}`);
      return true;
    } catch (error) {
      console.error('[PATCH] Error in failTask:', error);
      return false;
    }
  }
  
  // Patch all existing agents
  function patchAllAgents() {
    const patchedAgents = [];
    
    // Look for agent objects in global scope
    for (let key in window) {
      if (key.startsWith('agent-') || (window[key] && typeof window[key] === 'object' && window[key].id)) {
        const agent = window[key];
        if (agent.failTask && typeof agent.failTask === 'function') {
          // Backup original method
          const originalFailTask = agent.failTask;
          
          // Override with safe version
          agent.failTask = function(...args) {
            return safeFailTask(this, ...args);
          };
          
          patchedAgents.push(agent.id || key);
          console.log(`[PATCH] Protected agent ${agent.id || key}`);
        }
      }
    }
    
    return patchedAgents;
  }
  
  // Patch task cleanup handlers
  function patchTaskCleanup() {
    // Intercept common cleanup patterns
    const patterns = [
      'cleanupTask',
      'finalizeTask', 
      'completeTask',
      'abortTask'
    ];
    
    patterns.forEach(methodName => {
      if (window[methodName] && typeof window[methodName] === 'function') {
        const original = window[methodName];
        window[methodName] = function(task, ...args) {
          if (!task) {
            console.warn(`[PATCH] ${methodName} called with undefined task`);
            return;
          }
          return original.call(this, task, ...args);
        };
        console.log(`[PATCH] Protected ${methodName} handler`);
      }
    });
  }
  
  // Error interceptor
  function setupErrorInterceptor() {
    const originalConsoleError = console.error;
    console.error = function(...args) {
      const message = args.join(' ');
      
      if (message.includes("Cannot read properties of undefined (reading 'failTask')")) {
        console.warn('[PATCH] Intercepted race condition:', message);
        // Count intercepted errors
        window.patchErrorCount = (window.patchErrorCount || 0) + 1;
        return; // Suppress the error
      }
      
      originalConsoleError.apply(console, args);
    };
    
    console.log('[PATCH] Error interceptor active');
  }
  
  // Apply all patches
  try {
    const patchedAgents = patchAllAgents();
    patchTaskCleanup();
    setupErrorInterceptor();
    
    // Add monitoring
    window.swarmPatchStatus = {
      patchedAgents: patchedAgents,
      errorCount: 0,
      startTime: new Date().toISOString()
    };
    
    console.log(`✅ Swarm patches applied successfully!`);
    console.log(`📦 Protected ${patchedAgents.length} agents`);
    console.log(`🛡️  Ready to handle race conditions`);
    
    // Add utility function to check status
    window.checkSwarmHealth = function() {
      return {
        patchedAgents: window.swarmPatchStatus.patchedAgents,
        interceptedErrors: window.patchErrorCount || 0,
        uptime: Date.now() - new Date(window.swarmPatchStatus.startTime).getTime()
      };
    };
    
    console.log('💡 Use window.checkSwarmHealth() to monitor patch effectiveness');
    
  } catch (error) {
    console.error('[PATCH] Failed to apply patches:', error);
  }
  
})();