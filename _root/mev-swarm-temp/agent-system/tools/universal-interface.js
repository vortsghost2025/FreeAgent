/**
 * Universal Tool Interface
 * Provides a standardized interface for registering and executing tools from different platforms
 */

/**
 * Base Tool interface
 * @typedef {Object} Tool
 * @property {string} name - Tool name
 * @property {string} description - Tool description
 * @property {string} category - Tool category (filesystem, network, blockchain, etc.)
 * @property {string[]} capabilities - List of capabilities this tool provides
 * @property {Function} execute - Execute function
 * @property {Object} schema - Input schema for validation
 */

/**
 * UniversalToolkit - Manages registration and execution of tools
 */
class UniversalToolkit {
  constructor() {
    this.tools = new Map();
    this.categories = new Map();
    this.capabilityIndex = new Map();
  }

  /**
   * Register a tool with the toolkit
   * @param {Tool} tool - Tool to register
   * @returns {UniversalToolkit} - Returns this for chaining
   */
  registerTool(tool) {
    if (!tool.name || !tool.execute) {
      throw new Error('Tool must have name and execute function');
    }

    this.tools.set(tool.name, tool);

    // Index by category
    const category = tool.category || 'general';
    if (!this.categories.has(category)) {
      this.categories.set(category, []);
    }
    this.categories.get(category).push(tool);

    // Index by capabilities
    if (tool.capabilities) {
      for (const cap of tool.capabilities) {
        if (!this.capabilityIndex.has(cap)) {
          this.capabilityIndex.set(cap, []);
        }
        this.capabilityIndex.get(cap).push(tool);
      }
    }

    return this;
  }

  /**
   * Unregister a tool
   * @param {string} name - Tool name
   * @returns {boolean} - Whether removal was successful
   */
  unregisterTool(name) {
    const tool = this.tools.get(name);
    if (!tool) return false;

    // Remove from category index
    const category = tool.category || 'general';
    const categoryTools = this.categories.get(category);
    if (categoryTools) {
      const idx = categoryTools.findIndex(t => t.name === name);
      if (idx !== -1) categoryTools.splice(idx, 1);
    }

    // Remove from capability index
    if (tool.capabilities) {
      for (const cap of tool.capabilities) {
        const capTools = this.capabilityIndex.get(cap);
        if (capTools) {
          const idx = capTools.findIndex(t => t.name === name);
          if (idx !== -1) capTools.splice(idx, 1);
        }
      }
    }

    return this.tools.delete(name);
  }

  /**
   * Get a tool by name
   * @param {string} name - Tool name
   * @returns {Tool|undefined} - Tool or undefined
   */
  getTool(name) {
    return this.tools.get(name);
  }

  /**
   * Use a tool by name
   * @param {string} name - Tool name
   * @param {Object} params - Parameters for the tool
   * @returns {Promise<any>} - Tool execution result
   */
  async useTool(name, params = {}) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    // Validate schema if provided
    if (tool.schema) {
      this._validateParams(params, tool.schema);
    }

    return await tool.execute(params);
  }

  /**
   * Get all tools in a category
   * @param {string} category - Category name
   * @returns {Tool[]} - Tools in category
   */
  getToolsByCategory(category) {
    return this.categories.get(category) || [];
  }

  /**
   * Get all tools with a capability
   * @param {string} capability - Capability name
   * @returns {Tool[]} - Tools with capability
   */
  getToolsByCapability(capability) {
    return this.capabilityIndex.get(capability) || [];
  }

  /**
   * Get all registered tool names
   * @returns {string[]} - List of tool names
   */
  getAllToolNames() {
    return Array.from(this.tools.keys());
  }

  /**
   * List all available tools with details
   * @returns {Object} - All tools organized by category
   */
  listTools() {
    const result = {};
    for (const [category, tools] of this.categories) {
      result[category] = tools.map(t => ({
        name: t.name,
        description: t.description,
        capabilities: t.capabilities
      }));
    }
    return result;
  }

  /**
   * Validate parameters against schema
   * @param {Object} params - Parameters to validate
   * @param {Object} schema - JSON schema
   * @private
   */
  _validateParams(params, schema) {
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in params)) {
          throw new Error(`Missing required parameter: ${field}`);
        }
      }
    }
  }
}

// Pre-built tool templates for common operations

/**
 * Create a filesystem tool
 * @param {Object} config - Configuration
 * @returns {Tool} - Filesystem tool
 */
export function createFilesystemTool(config) {
  return {
    name: config.name || 'filesystem',
    description: config.description || 'File system operations',
    category: 'filesystem',
    capabilities: ['read-file', 'write-file', 'list-files', 'delete-file', 'create-directory'],
    schema: {
      required: ['operation'],
      properties: {
        operation: { type: 'string', enum: ['read', 'write', 'list', 'delete', 'mkdir'] },
        path: { type: 'string' },
        content: { type: 'string' }
      }
    },
    execute: async (params) => {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      switch (params.operation) {
        case 'read':
          return await fs.readFile(params.path, 'utf-8');
        case 'write':
          await fs.writeFile(params.path, params.content);
          return { success: true, path: params.path };
        case 'list':
          return await fs.readdir(params.path);
        case 'delete':
          await fs.unlink(params.path);
          return { success: true };
        case 'mkdir':
          await fs.mkdir(params.path, { recursive: true });
          return { success: true };
        default:
          throw new Error(`Unknown operation: ${params.operation}`);
      }
    }
  };
}

/**
 * Create a terminal/command execution tool
 * @param {Object} config - Configuration
 * @returns {Tool} - Terminal tool
 */
export function createTerminalTool(config) {
  return {
    name: config.name || 'terminal',
    description: config.description || 'Execute terminal commands',
    category: 'execution',
    capabilities: ['execute-command', 'run-script', 'install-dependency'],
    schema: {
      required: ['command'],
      properties: {
        command: { type: 'string' },
        cwd: { type: 'string' },
        timeout: { type: 'number' }
      }
    },
    execute: async (params) => {
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
    }
  };
}

/**
 * Create a GitHub integration tool
 * @param {Object} config - Configuration
 * @returns {Tool} - GitHub tool
 */
export function createGitHubTool(config) {
  return {
    name: config.name || 'github',
    description: config.description || 'GitHub operations',
    category: 'version-control',
    capabilities: ['create-pr', 'get-repo', 'list-issues', 'create-issue', 'get-file'],
    schema: {
      required: ['operation'],
      properties: {
        operation: { type: 'string' },
        owner: { type: 'string' },
        repo: { type: 'string' },
        data: { type: 'object' }
      }
    },
    execute: async (params) => {
      // Placeholder for GitHub API integration
      // Would use @actions/github or similar
      return {
        operation: params.operation,
        status: 'not-implemented',
        message: 'GitHub tool requires API credentials'
      };
    }
  };
}

/**
 * Create a database tool
 * @param {Object} config - Configuration
 * @returns {Tool} - Database tool
 */
export function createDatabaseTool(config) {
  return {
    name: config.name || 'database',
    description: config.description || 'Database operations',
    category: 'database',
    capabilities: ['query', 'insert', 'update', 'delete', 'create-table'],
    schema: {
      required: ['operation'],
      properties: {
        operation: { type: 'string', enum: ['query', 'insert', 'update', 'delete'] },
        table: { type: 'string' },
        data: { type: 'object' }
      }
    },
    execute: async (params) => {
      // Placeholder for database integration
      return {
        operation: params.operation,
        status: 'not-implemented',
        message: 'Database tool requires connection configuration'
      };
    }
  };
}

/**
 * Create a browser automation tool
 * @param {Object} config - Configuration
 * @returns {Tool} - Browser tool
 */
export function createBrowserTool(config) {
  return {
    name: config.name || 'browser',
    description: config.description || 'Browser automation',
    category: 'automation',
    capabilities: ['navigate', 'click', 'type', 'screenshot', 'extract'],
    schema: {
      required: ['operation'],
      properties: {
        operation: { type: 'string' },
        url: { type: 'string' },
        selector: { type: 'string' },
        value: { type: 'string' }
      }
    },
    execute: async (params) => {
      // Placeholder for browser automation
      // Would use Puppeteer or Playwright
      return {
        operation: params.operation,
        status: 'not-implemented',
        message: 'Browser tool requires Puppeteer/Playwright setup'
      };
    }
  };
}

// Export the toolkit and factory functions
export { UniversalToolkit };

// Default instance
const defaultToolkit = new UniversalToolkit();

export default defaultToolkit;
 * Universal Tool Interface
 * Provides a standardized interface for registering and executing tools from different platforms
 */

/**
 * Base Tool interface
 * @typedef {Object} Tool
 * @property {string} name - Tool name
 * @property {string} description - Tool description
 * @property {string} category - Tool category (filesystem, network, blockchain, etc.)
 * @property {string[]} capabilities - List of capabilities this tool provides
 * @property {Function} execute - Execute function
 * @property {Object} schema - Input schema for validation
 */

/**
 * UniversalToolkit - Manages registration and execution of tools
 */
class UniversalToolkit {
  constructor() {
    this.tools = new Map();
    this.categories = new Map();
    this.capabilityIndex = new Map();
  }

  /**
   * Register a tool with the toolkit
   * @param {Tool} tool - Tool to register
   * @returns {UniversalToolkit} - Returns this for chaining
   */
  registerTool(tool) {
    if (!tool.name || !tool.execute) {
      throw new Error('Tool must have name and execute function');
    }

    this.tools.set(tool.name, tool);

    // Index by category
    const category = tool.category || 'general';
    if (!this.categories.has(category)) {
      this.categories.set(category, []);
    }
    this.categories.get(category).push(tool);

    // Index by capabilities
    if (tool.capabilities) {
      for (const cap of tool.capabilities) {
        if (!this.capabilityIndex.has(cap)) {
          this.capabilityIndex.set(cap, []);
        }
        this.capabilityIndex.get(cap).push(tool);
      }
    }

    return this;
  }

  /**
   * Unregister a tool
   * @param {string} name - Tool name
   * @returns {boolean} - Whether removal was successful
   */
  unregisterTool(name) {
    const tool = this.tools.get(name);
    if (!tool) return false;

    // Remove from category index
    const category = tool.category || 'general';
    const categoryTools = this.categories.get(category);
    if (categoryTools) {
      const idx = categoryTools.findIndex(t => t.name === name);
      if (idx !== -1) categoryTools.splice(idx, 1);
    }

    // Remove from capability index
    if (tool.capabilities) {
      for (const cap of tool.capabilities) {
        const capTools = this.capabilityIndex.get(cap);
        if (capTools) {
          const idx = capTools.findIndex(t => t.name === name);
          if (idx !== -1) capTools.splice(idx, 1);
        }
      }
    }

    return this.tools.delete(name);
  }

  /**
   * Get a tool by name
   * @param {string} name - Tool name
   * @returns {Tool|undefined} - Tool or undefined
   */
  getTool(name) {
    return this.tools.get(name);
  }

  /**
   * Use a tool by name
   * @param {string} name - Tool name
   * @param {Object} params - Parameters for the tool
   * @returns {Promise<any>} - Tool execution result
   */
  async useTool(name, params = {}) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    // Validate schema if provided
    if (tool.schema) {
      this._validateParams(params, tool.schema);
    }

    return await tool.execute(params);
  }

  /**
   * Get all tools in a category
   * @param {string} category - Category name
   * @returns {Tool[]} - Tools in category
   */
  getToolsByCategory(category) {
    return this.categories.get(category) || [];
  }

  /**
   * Get all tools with a capability
   * @param {string} capability - Capability name
   * @returns {Tool[]} - Tools with capability
   */
  getToolsByCapability(capability) {
    return this.capabilityIndex.get(capability) || [];
  }

  /**
   * Get all registered tool names
   * @returns {string[]} - List of tool names
   */
  getAllToolNames() {
    return Array.from(this.tools.keys());
  }

  /**
   * List all available tools with details
   * @returns {Object} - All tools organized by category
   */
  listTools() {
    const result = {};
    for (const [category, tools] of this.categories) {
      result[category] = tools.map(t => ({
        name: t.name,
        description: t.description,
        capabilities: t.capabilities
      }));
    }
    return result;
  }

  /**
   * Validate parameters against schema
   * @param {Object} params - Parameters to validate
   * @param {Object} schema - JSON schema
   * @private
   */
  _validateParams(params, schema) {
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in params)) {
          throw new Error(`Missing required parameter: ${field}`);
        }
      }
    }
  }
}

// Pre-built tool templates for common operations

/**
 * Create a filesystem tool
 * @param {Object} config - Configuration
 * @returns {Tool} - Filesystem tool
 */
export function createFilesystemTool(config) {
  return {
    name: config.name || 'filesystem',
    description: config.description || 'File system operations',
    category: 'filesystem',
    capabilities: ['read-file', 'write-file', 'list-files', 'delete-file', 'create-directory'],
    schema: {
      required: ['operation'],
      properties: {
        operation: { type: 'string', enum: ['read', 'write', 'list', 'delete', 'mkdir'] },
        path: { type: 'string' },
        content: { type: 'string' }
      }
    },
    execute: async (params) => {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      switch (params.operation) {
        case 'read':
          return await fs.readFile(params.path, 'utf-8');
        case 'write':
          await fs.writeFile(params.path, params.content);
          return { success: true, path: params.path };
        case 'list':
          return await fs.readdir(params.path);
        case 'delete':
          await fs.unlink(params.path);
          return { success: true };
        case 'mkdir':
          await fs.mkdir(params.path, { recursive: true });
          return { success: true };
        default:
          throw new Error(`Unknown operation: ${params.operation}`);
      }
    }
  };
}

/**
 * Create a terminal/command execution tool
 * @param {Object} config - Configuration
 * @returns {Tool} - Terminal tool
 */
export function createTerminalTool(config) {
  return {
    name: config.name || 'terminal',
    description: config.description || 'Execute terminal commands',
    category: 'execution',
    capabilities: ['execute-command', 'run-script', 'install-dependency'],
    schema: {
      required: ['command'],
      properties: {
        command: { type: 'string' },
        cwd: { type: 'string' },
        timeout: { type: 'number' }
      }
    },
    execute: async (params) => {
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
    }
  };
}

/**
 * Create a GitHub integration tool
 * @param {Object} config - Configuration
 * @returns {Tool} - GitHub tool
 */
export function createGitHubTool(config) {
  return {
    name: config.name || 'github',
    description: config.description || 'GitHub operations',
    category: 'version-control',
    capabilities: ['create-pr', 'get-repo', 'list-issues', 'create-issue', 'get-file'],
    schema: {
      required: ['operation'],
      properties: {
        operation: { type: 'string' },
        owner: { type: 'string' },
        repo: { type: 'string' },
        data: { type: 'object' }
      }
    },
    execute: async (params) => {
      // Placeholder for GitHub API integration
      // Would use @actions/github or similar
      return {
        operation: params.operation,
        status: 'not-implemented',
        message: 'GitHub tool requires API credentials'
      };
    }
  };
}

/**
 * Create a database tool
 * @param {Object} config - Configuration
 * @returns {Tool} - Database tool
 */
export function createDatabaseTool(config) {
  return {
    name: config.name || 'database',
    description: config.description || 'Database operations',
    category: 'database',
    capabilities: ['query', 'insert', 'update', 'delete', 'create-table'],
    schema: {
      required: ['operation'],
      properties: {
        operation: { type: 'string', enum: ['query', 'insert', 'update', 'delete'] },
        table: { type: 'string' },
        data: { type: 'object' }
      }
    },
    execute: async (params) => {
      // Placeholder for database integration
      return {
        operation: params.operation,
        status: 'not-implemented',
        message: 'Database tool requires connection configuration'
      };
    }
  };
}

/**
 * Create a browser automation tool
 * @param {Object} config - Configuration
 * @returns {Tool} - Browser tool
 */
export function createBrowserTool(config) {
  return {
    name: config.name || 'browser',
    description: config.description || 'Browser automation',
    category: 'automation',
    capabilities: ['navigate', 'click', 'type', 'screenshot', 'extract'],
    schema: {
      required: ['operation'],
      properties: {
        operation: { type: 'string' },
        url: { type: 'string' },
        selector: { type: 'string' },
        value: { type: 'string' }
      }
    },
    execute: async (params) => {
      // Placeholder for browser automation
      // Would use Puppeteer or Playwright
      return {
        operation: params.operation,
        status: 'not-implemented',
        message: 'Browser tool requires Puppeteer/Playwright setup'
      };
    }
  };
}

// Export the toolkit and factory functions
export { UniversalToolkit };

// Default instance
const defaultToolkit = new UniversalToolkit();

export default defaultToolkit;

