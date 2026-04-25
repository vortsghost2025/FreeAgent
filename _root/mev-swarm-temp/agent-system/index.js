/**
 * Kilo Super-Agent System
 * Main entry point - combines all AI capabilities with real API connections
 */

import { readFileSync, readFile, writeFile, readdir, mkdir, unlink } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { 
  AGENT_CAPABILITIES, 
  classifyTask, 
  selectModel, 
  routeToOptimalModel,
  createRouter 
} from './agent-router.js';

import { 
  UniversalToolkit, 
  createFilesystemTool, 
  createTerminalTool,
  createGitHubTool
} from './tools/universal-interface.js';

import { 
  MCPServerManager, 
  MCP_SERVER_CONFIGS, 
  createMCPClient,
  getAllCapabilities 
} from './mcp/mcp-integration.js';

import { 
  MultiProviderAgent, 
  PROVIDER_CONFIGS, 
  createProviderClient 
} from './providers/multi-provider.js';

import { 
  AgenticBehavior, 
  PlanStep, 
  ExecutionPlan 
} from './behaviors/agentic-loop.js';

import { 
  AgentMesh, 
  createAgentMesh,
  CodingAgent,
  DesignAgent,
  DevOpsAgent,
  QAAgent 
} from './agent-mesh.js';

// Load configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let config = {};
try {
  const configPath = join(__dirname, 'config', 'kilo-config.json');
  config = JSON.parse(readFileSync(configPath, 'utf-8'));
} catch (e) {
  console.warn('[Kilo] No config file found, using defaults');
}

/**
 * Kilo Super-Agent
 * Main class that orchestrates all capabilities with real API connections
 */
class KiloAgent {
  constructor(options = {}) {
    this.config = { ...config, ...options };
    this.router = createRouter(this.config.routing);
    
    // Initialize toolkit with REAL filesystem operations
    this.toolkit = new UniversalToolkit();
    this.initializeTools();
    
    // Initialize MCP manager
    this.mcpManager = new MCPServerManager();
    
    // Initialize REAL multi-provider with actual API clients
    this.multiProvider = new MultiProviderAgent(this.config.providers);
    
    // Initialize agent mesh with real provider
    this.agentMesh = createAgentMesh({
      ...this.config.agentMesh,
      provider: this.multiProvider
    });
    
    // Initialize agentic behavior
    this.agenticBehavior = new AgenticBehavior(this.config.capabilities?.autonomousTasks?.behavior);
    
    console.log('[Kilo] Agent initialized');
  }

  /**
   * Initialize tools with REAL implementations
   */
  initializeTools() {
    // REAL filesystem tool with actual fs operations
    this.toolkit.registerTool({
      name: 'filesystem',
      description: 'File system operations - REAL implementation',
      category: 'filesystem',
      capabilities: ['read-file', 'write-file', 'list-files', 'delete-file', 'create-directory'],
      schema: {
        required: ['operation', 'path'],
        properties: {
          operation: { type: 'string', enum: ['read', 'write', 'list', 'delete', 'mkdir'] },
          path: { type: 'string' },
          content: { type: 'string' }
        }
      },
      execute: async (params) => {
        try {
          switch (params.operation) {
            case 'read':
              return await readFile(params.path, 'utf-8');
            case 'write':
              await writeFile(params.path, params.content);
              return { success: true, path: params.path };
            case 'list':
              return await readdir(params.path);
            case 'delete':
              await unlink(params.path);
              return { success: true };
            case 'mkdir':
              await mkdir(params.path, { recursive: true });
              return { success: true };
            default:
              throw new Error(`Unknown operation: ${params.operation}`);
          }
        } catch (error) {
          throw new Error(`Filesystem error: ${error.message}`);
        }
      }
    });

    // Terminal tool - real execa execution
    this.toolkit.registerTool({
      name: 'terminal',
      description: 'Execute terminal commands',
      category: 'execution',
      capabilities: ['execute-command', 'run-script'],
      schema: {
        required: ['command'],
        properties: {
          command: { type: 'string' },
          cwd: { type: 'string' },
          timeout: { type: 'number' }
        }
      },
      execute: async (params) => {
        try {
          const { execa } = await import('execa');
          const result = await execa(params.command, {
            cwd: params.cwd,
            shell: true,
            timeout: params.timeout || 60000
          });
          return {
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode
          };
        } catch (error) {
          throw new Error(`Terminal error: ${error.message}`);
        }
      }
    });
  }

  /**
   * Execute a task with automatic routing - REAL API call
   */
  async execute(task, options = {}) {
    // Route to optimal model
    const route = await routeToOptimalModel(task, {}, options);
    
    // Execute with REAL provider API
    const result = await this.multiProvider.executeTask(task, {}, {
      useModel: route.selectedModel,
      strategy: options.strategy || 'single'
    });
    
    return {
      ...result,
      taskType: route.taskType,
      selectedModel: route.selectedModel
    };
  }

  /**
   * Execute with specific agent - REAL API call
   */
  async executeWithAgent(agentType, task) {
    return await this.agentMesh.executeWith(agentType, task);
  }

  /**
   * Execute with agent collaboration - REAL API calls
   */
  async collaborate(task) {
    return await this.agentMesh.collaborate(task);
  }

  /**
   * Execute autonomously with planning - REAL API calls
   */
  async executeAutonomous(goal) {
    return await this.agenticBehavior.autonomousExecute(goal, async (step) => {
      return await this.execute(step.description);
    });
  }

  /**
   * Use a tool - REAL execution
   */
  async useTool(toolName, params) {
    return await this.toolkit.useTool(toolName, params);
  }

  /**
   * Read a file - shorthand
   */
  async readFile(path) {
    return await this.useTool('filesystem', { operation: 'read', path });
  }

  /**
   * Write a file - shorthand
   */
  async writeFile(path, content) {
    return await this.useTool('filesystem', { operation: 'write', path, content });
  }

  /**
   * List directory - shorthand
   */
  async listDir(path) {
    return await this.useTool('filesystem', { operation: 'list', path });
  }

  /**
   * Connect to MCP server
   */
  async connectMCP(serverName) {
    return await this.mcpManager.connect(serverName);
  }

  /**
   * Get system status - shows which APIs are available
   */
  async getStatus() {
    const providerStatus = await this.multiProvider.getStatus();
    
    return {
      providers: providerStatus,
      mcpServers: this.mcpManager.getStatus(),
      tools: this.toolkit.listTools(),
      meshAgents: this.agentMesh.getAvailableAgents()
    };
  }
}

// Create default instance
const kilo = new KiloAgent();

// Export everything
export {
  // Core
  KiloAgent,
  kilo,
  
  // Router
  AGENT_CAPABILITIES,
  classifyTask,
  selectModel,
  routeToOptimalModel,
  createRouter,
  
  // Toolkit
  UniversalToolkit,
  createFilesystemTool,
  createTerminalTool,
  createGitHubTool,
  
  // MCP
  MCPServerManager,
  MCP_SERVER_CONFIGS,
  createMCPClient,
  getAllCapabilities,
  
  // Providers
  MultiProviderAgent,
  PROVIDER_CONFIGS,
  createProviderClient,
  
  // Behaviors
  AgenticBehavior,
  PlanStep,
  ExecutionPlan,
  
  // Mesh
  AgentMesh,
  createAgentMesh,
  CodingAgent,
  DesignAgent,
  DevOpsAgent,
  QAAgent,
  
  // Config
  config
};

export default kilo;
 * Kilo Super-Agent System
 * Main entry point - combines all AI capabilities with real API connections
 */

import { readFileSync, readFile, writeFile, readdir, mkdir, unlink } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { 
  AGENT_CAPABILITIES, 
  classifyTask, 
  selectModel, 
  routeToOptimalModel,
  createRouter 
} from './agent-router.js';

import { 
  UniversalToolkit, 
  createFilesystemTool, 
  createTerminalTool,
  createGitHubTool
} from './tools/universal-interface.js';

import { 
  MCPServerManager, 
  MCP_SERVER_CONFIGS, 
  createMCPClient,
  getAllCapabilities 
} from './mcp/mcp-integration.js';

import { 
  MultiProviderAgent, 
  PROVIDER_CONFIGS, 
  createProviderClient 
} from './providers/multi-provider.js';

import { 
  AgenticBehavior, 
  PlanStep, 
  ExecutionPlan 
} from './behaviors/agentic-loop.js';

import { 
  AgentMesh, 
  createAgentMesh,
  CodingAgent,
  DesignAgent,
  DevOpsAgent,
  QAAgent 
} from './agent-mesh.js';

// Load configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let config = {};
try {
  const configPath = join(__dirname, 'config', 'kilo-config.json');
  config = JSON.parse(readFileSync(configPath, 'utf-8'));
} catch (e) {
  console.warn('[Kilo] No config file found, using defaults');
}

/**
 * Kilo Super-Agent
 * Main class that orchestrates all capabilities with real API connections
 */
class KiloAgent {
  constructor(options = {}) {
    this.config = { ...config, ...options };
    this.router = createRouter(this.config.routing);
    
    // Initialize toolkit with REAL filesystem operations
    this.toolkit = new UniversalToolkit();
    this.initializeTools();
    
    // Initialize MCP manager
    this.mcpManager = new MCPServerManager();
    
    // Initialize REAL multi-provider with actual API clients
    this.multiProvider = new MultiProviderAgent(this.config.providers);
    
    // Initialize agent mesh with real provider
    this.agentMesh = createAgentMesh({
      ...this.config.agentMesh,
      provider: this.multiProvider
    });
    
    // Initialize agentic behavior
    this.agenticBehavior = new AgenticBehavior(this.config.capabilities?.autonomousTasks?.behavior);
    
    console.log('[Kilo] Agent initialized');
  }

  /**
   * Initialize tools with REAL implementations
   */
  initializeTools() {
    // REAL filesystem tool with actual fs operations
    this.toolkit.registerTool({
      name: 'filesystem',
      description: 'File system operations - REAL implementation',
      category: 'filesystem',
      capabilities: ['read-file', 'write-file', 'list-files', 'delete-file', 'create-directory'],
      schema: {
        required: ['operation', 'path'],
        properties: {
          operation: { type: 'string', enum: ['read', 'write', 'list', 'delete', 'mkdir'] },
          path: { type: 'string' },
          content: { type: 'string' }
        }
      },
      execute: async (params) => {
        try {
          switch (params.operation) {
            case 'read':
              return await readFile(params.path, 'utf-8');
            case 'write':
              await writeFile(params.path, params.content);
              return { success: true, path: params.path };
            case 'list':
              return await readdir(params.path);
            case 'delete':
              await unlink(params.path);
              return { success: true };
            case 'mkdir':
              await mkdir(params.path, { recursive: true });
              return { success: true };
            default:
              throw new Error(`Unknown operation: ${params.operation}`);
          }
        } catch (error) {
          throw new Error(`Filesystem error: ${error.message}`);
        }
      }
    });

    // Terminal tool - real execa execution
    this.toolkit.registerTool({
      name: 'terminal',
      description: 'Execute terminal commands',
      category: 'execution',
      capabilities: ['execute-command', 'run-script'],
      schema: {
        required: ['command'],
        properties: {
          command: { type: 'string' },
          cwd: { type: 'string' },
          timeout: { type: 'number' }
        }
      },
      execute: async (params) => {
        try {
          const { execa } = await import('execa');
          const result = await execa(params.command, {
            cwd: params.cwd,
            shell: true,
            timeout: params.timeout || 60000
          });
          return {
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode
          };
        } catch (error) {
          throw new Error(`Terminal error: ${error.message}`);
        }
      }
    });
  }

  /**
   * Execute a task with automatic routing - REAL API call
   */
  async execute(task, options = {}) {
    // Route to optimal model
    const route = await routeToOptimalModel(task, {}, options);
    
    // Execute with REAL provider API
    const result = await this.multiProvider.executeTask(task, {}, {
      useModel: route.selectedModel,
      strategy: options.strategy || 'single'
    });
    
    return {
      ...result,
      taskType: route.taskType,
      selectedModel: route.selectedModel
    };
  }

  /**
   * Execute with specific agent - REAL API call
   */
  async executeWithAgent(agentType, task) {
    return await this.agentMesh.executeWith(agentType, task);
  }

  /**
   * Execute with agent collaboration - REAL API calls
   */
  async collaborate(task) {
    return await this.agentMesh.collaborate(task);
  }

  /**
   * Execute autonomously with planning - REAL API calls
   */
  async executeAutonomous(goal) {
    return await this.agenticBehavior.autonomousExecute(goal, async (step) => {
      return await this.execute(step.description);
    });
  }

  /**
   * Use a tool - REAL execution
   */
  async useTool(toolName, params) {
    return await this.toolkit.useTool(toolName, params);
  }

  /**
   * Read a file - shorthand
   */
  async readFile(path) {
    return await this.useTool('filesystem', { operation: 'read', path });
  }

  /**
   * Write a file - shorthand
   */
  async writeFile(path, content) {
    return await this.useTool('filesystem', { operation: 'write', path, content });
  }

  /**
   * List directory - shorthand
   */
  async listDir(path) {
    return await this.useTool('filesystem', { operation: 'list', path });
  }

  /**
   * Connect to MCP server
   */
  async connectMCP(serverName) {
    return await this.mcpManager.connect(serverName);
  }

  /**
   * Get system status - shows which APIs are available
   */
  async getStatus() {
    const providerStatus = await this.multiProvider.getStatus();
    
    return {
      providers: providerStatus,
      mcpServers: this.mcpManager.getStatus(),
      tools: this.toolkit.listTools(),
      meshAgents: this.agentMesh.getAvailableAgents()
    };
  }
}

// Create default instance
const kilo = new KiloAgent();

// Export everything
export {
  // Core
  KiloAgent,
  kilo,
  
  // Router
  AGENT_CAPABILITIES,
  classifyTask,
  selectModel,
  routeToOptimalModel,
  createRouter,
  
  // Toolkit
  UniversalToolkit,
  createFilesystemTool,
  createTerminalTool,
  createGitHubTool,
  
  // MCP
  MCPServerManager,
  MCP_SERVER_CONFIGS,
  createMCPClient,
  getAllCapabilities,
  
  // Providers
  MultiProviderAgent,
  PROVIDER_CONFIGS,
  createProviderClient,
  
  // Behaviors
  AgenticBehavior,
  PlanStep,
  ExecutionPlan,
  
  // Mesh
  AgentMesh,
  createAgentMesh,
  CodingAgent,
  DesignAgent,
  DevOpsAgent,
  QAAgent,
  
  // Config
  config
};

export default kilo;

    this.agenticBehavior = new AgenticBehavior(this.config.capabilities?.autonomousTasks?.behavior);
    
    this.initializeTools();
  }

  /**
   * Initialize default tools
   */
  initializeTools() {
    // Register default tools
    if (this.config.tools?.filesystem?.enabled) {
      this.toolkit.registerTool(createFilesystemTool({ name: 'filesystem' }));
    }
    
    if (this.config.tools?.terminal?.enabled) {
      this.toolkit.registerTool(createTerminalTool({ name: 'terminal' }));
    }
    
    if (this.config.tools?.github?.enabled) {
      this.toolkit.registerTool(createGitHubTool({ name: 'github' }));
    }
  }

  /**
   * Execute a task with automatic routing
   * @param {string} task - Task description
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} - Execution result
   */
  async execute(task, options = {}) {
    // Route to optimal model
    const route = await routeToOptimalModel(task, {}, options);
    
    // Execute with provider
    const result = await this.multiProvider.executeTask(task, {}, {
      useModel: route.selectedModel,
      strategy: options.strategy || 'single'
    });
    
    return {
      ...result,
      taskType: route.taskType,
      selectedModel: route.selectedModel
    };
  }

  /**
   * Execute with specific agent
   * @param {string} agentType - Agent type (coder, designer, devops, qa)
   * @param {string} task - Task
   * @returns {Promise<Object>} - Result
   */
  async executeWithAgent(agentType, task) {
    return await this.agentMesh.executeWith(agentType, task);
  }

  /**
   * Execute with agent collaboration
   * @param {string} task - Task
   * @returns {Promise<Object>} - Result
   */
  async collaborate(task) {
    return await this.agentMesh.collaborate(task);
  }

  /**
   * Execute autonomously with planning
   * @param {string} goal - Goal
   * @returns {Promise<Object>} - Result
   */
  async executeAutonomous(goal) {
    return await this.agenticBehavior.autonomousExecute(goal, async (step) => {
      return await this.execute(step.description);
    });
  }

  /**
   * Use a tool
   * @param {string} toolName - Tool name
   * @param {Object} params - Parameters
   * @returns {Promise<Object>} - Result
   */
  async useTool(toolName, params) {
    return await this.toolkit.useTool(toolName, params);
  }

  /**
   * Connect to MCP server
   * @param {string} serverName - Server name
   * @returns {Promise<Object>} - Connection result
   */
  async connectMCP(serverName) {
    return await this.mcpManager.connect(serverName);
  }

  /**
   * Get system status
   * @returns {Object} - Status
   */
  async getStatus() {
    return {
      providers: await this.multiProvider.getStatus(),
      mcpServers: this.mcpManager.getStatus(),
      tools: this.toolkit.listTools(),
      meshAgents: this.agentMesh.getAvailableAgents()
    };
  }
}

// Create default instance
const kilo = new KiloAgent();

// Export everything
export {
  // Core
  KiloAgent,
  kilo,
  
  // Router
  AGENT_CAPABILITIES,
  classifyTask,
  selectModel,
  routeToOptimalModel,
  createRouter,
  
  // Toolkit
  UniversalToolkit,
  createFilesystemTool,
  createTerminalTool,
  createGitHubTool,
  createDatabaseTool,
  createBrowserTool,
  
  // MCP
  MCPServerManager,
  MCP_SERVER_CONFIGS,
  createMCPClient,
  getAllCapabilities,
  
  // Providers
  MultiProviderAgent,
  PROVIDER_CONFIGS,
  createProviderClient,
  
  // Behaviors
  AgenticBehavior,
  PlanStep,
  ExecutionPlan,
  
  // Mesh
  AgentMesh,
  createAgentMesh,
  CodingAgent,
  DesignAgent,
  DevOpsAgent,
  QAAgent,
  
  // Config
  config
};

export default kilo;

