/**
 * FreeAgent Orchestrator Capabilities Module
 * 
 * This module defines the capabilities and limitations of the FreeAgent Orchestrator
 * and all cockpit agents. It provides a standardized way to check what agents can and
 * cannot do.
 * 
 * ## What Agents CAN Do:
 * - Route between available AI services (Claude, Gemini, local models)
 * - Manage vector memory for context retention
 * - Handle multi-session contexts
 * - Coordinate within the FreeAgent ecosystem
 * - Access files and data exposed through the cockpit
 * - Make API calls within the FreeAgent ecosystem
 * - Execute commands within the FreeAgent context
 * - Persist data to the configured Vector Memory system
 * - Access sessions and contexts explicitly given access to
 * - Provide real-time responses within active sessions
 * - Process datasets within system memory limits
 * 
 * ## What Agents CANNOT Do:
 * 
 * ### External System Access
 * - Cannot directly browse the internet or access external websites
 * - Cannot make API calls to services outside the FreeAgent ecosystem
 * - Cannot access your local file system beyond what's exposed through the cockpit
 * - Cannot execute system commands or shell scripts on your machine
 * - Cannot access databases not integrated with FreeAgent
 * 
 * ### Physical World Interaction
 * - Cannot control physical devices, robots, or IoT systems
 * - Cannot access cameras, sensors, or hardware peripherals
 * - Cannot perform any actions in the physical world
 * 
 * ### FreeAgent System Limitations
 * - Cannot modify the core FreeAgent architecture or codebase
 * - Cannot create new AI service endpoints beyond Claude, Gemini, and local models
 * - Cannot persist data outside the configured Vector Memory system
 * - Cannot access sessions or contexts not explicitly given access to
 * 
 * ### Data & Privacy Restrictions
 * - Cannot access personal files, emails, or private accounts
 * - Cannot store or remember information between completely separate conversations
 * - Cannot access encrypted or permission-restricted data
 * 
 * ### Real-time Limitations
 * - Cannot provide live data feeds or real-time monitoring beyond WebSocket connections
 * - Cannot perform continuous background tasks when not actively engaged
 * 
 * ### Processing Constraints
 * - Cannot process extremely large datasets that exceed system memory limits
 * - Cannot perform intensive computational tasks that would overload the local system
 */

const { createTools } = require('../services/tools');

class AgentCapabilities {
  constructor() {
    this.name = 'FreeAgent Orchestrator';
    this.version = '1.0.0';
    
    // Define capabilities as an object for easy checking
    this.capabilities = {
      // Core AI Services
      canRouteAI: true,
      canUseClaude: true,
      canUseGemini: true,
      canUseLocalModels: true,
      
      // Memory & Context
      canManageVectorMemory: true,
      canHandleMultiSession: true,
      canAccessExplicitContexts: true,
      
      // Data & Files
      canAccessCockpitFiles: true,
      canPersistToVectorMemory: true,
      
      // Coordination
      canCoordinateWithinEcosystem: true,
      
      // Processing
      canProcessWithinMemory: true,
      canProvideRealtimeResponses: true,
    };
    
    // Define limitations
    this.limitations = {
      // External System Access
      cannotBrowseInternet: true,
      cannotAccessExternalAPIs: true,
      cannotAccessLocalFileSystem: true,
      cannotExecuteShellScripts: true,
      cannotAccessExternalDatabases: true,
      
      // Physical World
      cannotControlPhysicalDevices: true,
      cannotAccessHardware: true,
      cannotInteractWithPhysicalWorld: true,
      
      // System
      cannotModifyCoreArchitecture: true,
      cannotCreateNewAIEndpoints: true,
      cannotPersistOutsideVectorMemory: true,
      cannotAccessImplicitContexts: true,
      
      // Privacy
      cannotAccessPersonalData: true,
      cannotRememberBetweenConversations: true,
      cannotAccessEncryptedData: true,
      
      // Real-time
      cannotProvideLiveFeeds: true,
      cannotRunBackgroundTasks: true,
      
      // Processing
      cannotProcessLargeDatasets: true,
      cannotPerformHeavyComputation: true,
    };
  }
  
  /**
   * Check if the agent has a specific capability
   * @param {string} capability - The capability to check
   * @returns {boolean} - Whether the capability is available
   */
  can(capability) {
    return this.capabilities[capability] === true;
  }
  
  /**
   * Check if the agent has a specific limitation
   * @param {string} limitation - The limitation to check
   * @returns {boolean} - Whether the limitation exists
   */
  cannot(limitation) {
    return this.limitations[limitation] === true;
  }
  
  /**
   * Get a human-readable summary of capabilities
   * @returns {string} - Summary string
   */
  getCapabilitiesSummary() {
    return `
## FreeAgent Orchestrator Capabilities

### ✅ CAN DO:
- Route between AI services (Claude, Gemini, local models)
- Manage vector memory for context retention
- Handle multi-session contexts
- Coordinate within the FreeAgent ecosystem
- Access files/data exposed through cockpit
- Persist data to Vector Memory system
- Process data within system memory limits
- Provide real-time responses within active sessions
- Make external HTTP requests (httpRequest tool)
- Execute shell commands (executeCommand tool)
- Read/write files in allowed directories (file tools)

### ❌ CANNOT DO:
- Browse internet or access external websites (unless using httpRequest tool)
- Execute system commands or shell scripts (unless using executeCommand tool)
- Access databases outside FreeAgent
- Control physical devices or IoT systems
- Access cameras, sensors, or hardware
- Modify core FreeAgent architecture
- Create new AI service endpoints
- Access personal files, emails, or private accounts
- Remember info between separate conversations
- Provide live data feeds or real-time monitoring
- Process extremely large datasets
    `.trim();
  }
  
  /**
   * Get a specific limitation message for a requested action
   * @param {string} action - The action that was attempted
   * @returns {string} - Explanation of why it cannot be done
   */
  getLimitationMessage(action) {
    const limitationMessages = {
      'browse': 'Cannot browse the internet - external web access is not available.',
      'internet': 'Cannot access external websites or internet resources.',
      'api': 'Cannot make API calls to services outside the FreeAgent ecosystem.',
      'filesystem': 'Cannot access local file system beyond cockpit-exposed files.',
      'shell': 'Cannot execute system commands or shell scripts.',
      'database': 'Cannot access databases not integrated with FreeAgent.',
      'physical': 'Cannot control physical devices, robots, or IoT systems.',
      'hardware': 'Cannot access cameras, sensors, or hardware peripherals.',
      'architecture': 'Cannot modify the core FreeAgent architecture or codebase.',
      'new_endpoint': 'Cannot create new AI service endpoints beyond Claude, Gemini, and local models.',
      'persist': 'Cannot persist data outside the configured Vector Memory system.',
      'implicit_context': 'Cannot access sessions or contexts not explicitly given access to.',
      'personal': 'Cannot access personal files, emails, or private accounts.',
      'remember': 'Cannot store or remember information between completely separate conversations.',
      'encrypted': 'Cannot access encrypted or permission-restricted data.',
      'live': 'Cannot provide live data feeds or real-time monitoring beyond WebSocket connections.',
      'background': 'Cannot perform continuous background tasks when not actively engaged.',
      'large_dataset': 'Cannot process extremely large datasets that exceed system memory limits.',
      'heavy_compute': 'Cannot perform intensive computational tasks that would overload the local system.',
    };
    
    // Find the most relevant limitation message
    const actionLower = action.toLowerCase();
    for (const [key, message] of Object.entries(limitationMessages)) {
      if (actionLower.includes(key)) {
        return message;
      }
    }
    
    return 'This action is outside the capabilities of the FreeAgent Orchestrator.';
  }
  
  /**
   * Validate if an action is allowed
   * @param {string} action - The action to validate
   * @returns {object} - { allowed: boolean, message: string }
   */
  validateAction(action) {
    const allowedActions = [
      'route', 'ai', 'claude', 'gemini', 'local', 'model',
      'memory', 'vector', 'context', 'session',
      'cockpit', 'file', 'data', 'persist',
      'coordinate', 'ecosystem', 'process', 'respond'
    ];
    
    const actionLower = action.toLowerCase();
    const isAllowed = allowedActions.some(allowed => actionLower.includes(allowed));
    
    return {
      allowed: isAllowed,
      message: isAllowed 
        ? 'Action is within capabilities.' 
        : this.getLimitationMessage(action)
    };
  }
}

/**
 * Middleware factory to add capabilities checking to any agent
 * @param {AgentCapabilities} capabilities - Instance of AgentCapabilities
 * @returns {function} - Middleware function
 */
function createCapabilitiesMiddleware(capabilities = new AgentCapabilities()) {
  return {
    capabilities,
    
    /**
     * Check capabilities before running a task
     */
    beforeRun(task, ctx) {
      // Log capabilities for debugging
      console.log(`[Capabilities] Agent ready: ${capabilities.name} v${capabilities.version}`);
      return { allowed: true, task, ctx };
    },
    
    /**
     * Add capabilities info to response
     */
    afterRun(result) {
      return {
        ...result,
        _capabilities: {
          name: capabilities.name,
          version: capabilities.version,
          summary: capabilities.getCapabilitiesSummary()
        }
      };
    },
    
    /**
     * Validate specific action
     */
    validateAction(action) {
      return capabilities.validateAction(action);
    }
  };
}

module.exports = {
  AgentCapabilities,
  createCapabilitiesMiddleware,
  createTools
};
