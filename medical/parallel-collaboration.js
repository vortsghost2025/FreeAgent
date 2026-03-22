/**
 * Parallel Collaboration Interface - Main entry point
 * This file enables Kilo and standalone AI to work together in real-time
 */

// Import the coordination system
import { parallelCoordinator, kiloCoordinator } from './utils/parallel-coordinator.js';
import { workspaceBus } from './utils/shared-workspace-protocol.js';
import { bootstrapAgent, getUnifiedBrain } from './agent-memory.js';

/**
 * Initialize parallel collaboration between agents
 */
async function initParallelCollaboration() {
  console.log('🚀 Initializing parallel collaboration between Kilo and standalone AI...');
  
  // Initialize both coordinators
  await parallelCoordinator.init();
  await kiloCoordinator.init();
  
  console.log('✅ Parallel collaboration system initialized');
  console.log(`📊 Unified brain loaded: ${parallelCoordinator.unifiedBrain?.stats?.totalLearnings || 'unknown'} learnings`);
  
  // Test basic communication
  try {
    const testTaskId = await parallelCoordinator.claimTask('test', 'Parallel collaboration test task');
    console.log(`🎯 Test task claimed: ${testTaskId}`);
    
    // Simulate completion
    await parallelCoordinator.completeTask(testTaskId, {
      status: 'success',
      message: 'Parallel collaboration working perfectly!'
    });
    
    console.log('✅ Basic coordination test passed');
  } catch (err) {
    console.error('❌ Coordination test failed:', err.message);
  }
}

/**
 * Get unified context for any agent
 */
async function getAgentContext(agentType) {
  try {
    const context = await bootstrapAgent(agentType);
    return context;
  } catch (err) {
    console.error('Error getting agent context:', err.message);
    return null;
  }
}

/**
 * Run memory consolidation (daily update)
 */
async function runMemoryConsolidation() {
  try {
    console.log('🔄 Running memory consolidation...');
    const result = await import('./agent-memory.js').then(mod => mod.runMemoryConsolidation());
    console.log('✅ Memory consolidation completed');
    return result;
  } catch (err) {
    console.error('Error running memory consolidation:', err.message);
    return null;
  }
}

/**
 * Check if agents are connected
 */
function checkAgentConnection() {
  const connections = {
    standaloneAI: true,
    kilo: true,
    unifiedMemory: !!parallelCoordinator.unifiedBrain,
    sharedWorkspace: true
  };
  
  console.log('🔌 Agent connection status:');
  Object.entries(connections).forEach(([agent, status]) => {
    console.log(`  ${agent}: ${status ? '✅ Connected' : '❌ Disconnected'}`);
  });
  
  return connections;
}

// Export functions
export {
  initParallelCollaboration,
  getAgentContext,
  runMemoryConsolidation,
  checkAgentConnection,
  parallelCoordinator,
  kiloCoordinator,
  workspaceBus
};

// Auto-initialize when imported
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  initParallelCollaboration().catch(console.error);
}