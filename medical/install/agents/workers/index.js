/**
 * Workers Index - Entry point for the workers module
 * Exports all worker-related functionality in one convenient location
 */

import WorkerLauncher from '../worker-launcher.js';
import SpawnWorker, { createNodeWorker, createPythonWorker, createShellWorker } from '../spawn-worker.js';
import WorkerManager from '../worker-manager.js';
import WorkerAgent from '../worker-agent.js';
import NonLLMWorker from '../non-llm-worker.js';

// Export core classes
export { 
  WorkerLauncher, 
  SpawnWorker, 
  WorkerManager,
  WorkerAgent,
  NonLLMWorker
};

// Export factory functions
export { 
  createNodeWorker, 
  createPythonWorker, 
  createShellWorker 
};

// Convenience exports for common usage patterns
export default {
  // Core worker management
  WorkerLauncher,
  WorkerManager,
  
  // Process spawning utilities
  SpawnWorker,
  createNodeWorker,
  createPythonWorker,
  createShellWorker,
  
  // Worker implementations
  WorkerAgent,
  NonLLMWorker,
  
  // Quick factory methods
  createWorker: (type = 'node', script, options = {}) => {
    switch (type.toLowerCase()) {
      case 'node':
        return createNodeWorker(script, options);
      case 'python':
        return createPythonWorker(script, options);
      case 'shell':
        return createShellWorker(script, options);
      default:
        throw new Error(`Unsupported worker type: ${type}`);
    }
  },
  
  // Quick manager setup
  createManager: (config = {}) => {
    return new WorkerManager(config);
  },
  
  // Quick launcher setup
  createLauncher: (config = {}) => {
    return new WorkerLauncher(config);
  }
};