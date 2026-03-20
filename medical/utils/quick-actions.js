/**
 * Quick Action System
 * 
 * Pre-registered common operations with one-command execution
 * for complex workflows and template-based task generation.
 * 
 * @author Kilo Code
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

class QuickActionSystem {
  constructor(options = {}) {
    this.name = options.name || 'QuickActions';
    this.logger = options.logger || console;
    
    // Action registry
    this.actions = new Map();
    
    // Templates
    this.templates = new Map();
    
    // Variables/context
    this.context = options.context || {};
    
    // History
    this.history = [];
    this.maxHistory = options.maxHistory || 100;
  }

  /**
   * Register an action
   */
  registerAction(actionDefinition) {
    const { id, name, description, handler, params, aliases } = actionDefinition;
    
    if (this.actions.has(id)) {
      this.logger.warn(`Action ${id} already registered, overwriting`);
    }
    
    this.actions.set(id, {
      id,
      name: name || id,
      description: description || '',
      handler,
      params: params || [],
      aliases: aliases || []
    });
    
    // Register aliases
    for (const alias of actionDefinition.aliases || []) {
      this.actions.set(alias, {
        ...this.actions.get(id),
        id: alias,
        name: actionDefinition.name,
        isAlias: true,
        originalId: id
      });
    }
    
    this.logger.info(`Registered action: ${id}`);
    return this;
  }

  /**
   * Register multiple actions
   */
  registerActions(actionDefinitions) {
    for (const action of actionDefinitions) {
      this.registerAction(action);
    }
    return this;
  }

  /**
   * Register a template
   */
  registerTemplate(templateDefinition) {
    const { id, name, description, template, variables } = templateDefinition;
    
    this.templates.set(id, {
      id,
      name: name || id,
      description: description || '',
      template,
      variables: variables || []
    });
    
    this.logger.info(`Registered template: ${id}`);
    return this;
  }

  /**
   * Execute an action
   */
  async execute(actionId, params = {}) {
    const action = this.actions.get(actionId);
    
    if (!action) {
      throw new Error(`Action not found: ${actionId}`);
    }
    
    // Resolve alias
    const actualAction = action.isAlias 
      ? this.actions.get(action.originalId) 
      : action;
    
    // Merge parameters with context
    const mergedParams = {
      ...this.context,
      ...params
    };
    
    // Validate required parameters
    for (const param of actualAction.params) {
      if (param.required && !(param.name in mergedParams)) {
        throw new Error(`Missing required parameter: ${param.name}`);
      }
    }
    
    this.logger.info(`Executing action: ${actionId}`);
    
    const startTime = Date.now();
    const historyEntry = {
      actionId,
      params: mergedParams,
      startTime,
      status: 'running'
    };
    
    this.history.unshift(historyEntry);
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }
    
    try {
      const result = await actualAction.handler(mergedParams);
      
      historyEntry.status = 'success';
      historyEntry.endTime = Date.now();
      historyEntry.duration = historyEntry.endTime - historyEntry.startTime;
      historyEntry.result = result;
      
      return result;
    } catch (error) {
      historyEntry.status = 'failed';
      historyEntry.endTime = Date.now();
      historyEntry.duration = historyEntry.endTime - historyEntry.startTime;
      historyEntry.error = error.message;
      
      throw error;
    }
  }

  /**
   * Execute action by name or alias
   */
  async run(actionIdentifier, params = {}) {
    // Try exact match first
    if (this.actions.has(actionIdentifier)) {
      return this.execute(actionIdentifier, params);
    }
    
    // Try alias match (case insensitive)
    for (const [id, action] of this.actions) {
      if (id.toLowerCase() === actionIdentifier.toLowerCase() ||
          action.aliases.some(a => a.toLowerCase() === actionIdentifier.toLowerCase())) {
        return this.execute(id, params);
      }
    }
    
    // Try partial match
    const matches = [];
    for (const [id, action] of this.actions) {
      if (id.includes(actionIdentifier) || 
          action.name.toLowerCase().includes(actionIdentifier.toLowerCase())) {
        matches.push({ id, action });
      }
    }
    
    if (matches.length === 1) {
      return this.execute(matches[0].id, params);
    }
    
    if (matches.length > 0) {
      throw new Error(`Multiple matches found: ${matches.map(m => m.id).join(', ')}`);
    }
    
    throw new Error(`Action not found: ${actionIdentifier}`);
  }

  /**
   * Generate from template
   */
  generateFromTemplate(templateId, variables = {}) {
    const template = this.templates.get(templateId);
    
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }
    
    // Merge variables with context
    const mergedVars = { ...this.context, ...variables };
    
    // Validate required variables
    for (const variable of template.variables) {
      if (variable.required && !(variable.name in mergedVars)) {
        throw new Error(`Missing required variable: ${variable.name}`);
      }
    }
    
    // Replace template variables
    let result = template.template;
    
    for (const [key, value] of Object.entries(mergedVars)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, value);
    }
    
    // Check for unresolved variables
    const unresolved = result.match(/{{\s*\w+\s*}}/g);
    if (unresolved) {
      throw new Error(`Unresolved template variables: ${unresolved.join(', ')}`);
    }
    
    return result;
  }

  /**
   * List available actions
   */
  listActions() {
    const list = [];
    const seen = new Set();
    
    for (const [id, action] of this.actions) {
      if (!action.isAlias && !seen.has(id)) {
        seen.add(id);
        list.push({
          id: action.id,
          name: action.name,
          description: action.description,
          aliases: action.aliases,
          paramCount: action.params.length
        });
      }
    }
    
    return list;
  }

  /**
   * List available templates
   */
  listTemplates() {
    return Array.from(this.templates.values()).map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      variableCount: t.variables.length
    }));
  }

  /**
   * Get execution history
   */
  getHistory(limit = 10) {
    return this.history.slice(0, limit);
  }

  /**
   * Update context
   */
  setContext(key, value) {
    this.context[key] = value;
    return this;
  }

  /**
   * Get context
   */
  getContext(key) {
    return key ? this.context[key] : this.context;
  }

  /**
   * Clear context
   */
  clearContext() {
    this.context = {};
    return this;
  }
}

/**
 * Pre-defined common actions
 */
const CommonActions = {
  // File operations
  readFile: {
    id: 'readFile',
    name: 'Read File',
    description: 'Read contents of a file',
    params: [
      { name: 'path', type: 'string', required: true, description: 'File path to read' }
    ],
    handler: async ({ path }) => {
      return fs.promises.readFile(path, 'utf8');
    }
  },
  
  writeFile: {
    id: 'writeFile',
    name: 'Write File',
    description: 'Write contents to a file',
    params: [
      { name: 'path', type: 'string', required: true, description: 'File path to write' },
      { name: 'content', type: 'string', required: true, description: 'Content to write' }
    ],
    handler: async ({ path, content }) => {
      await fs.promises.writeFile(path, content, 'utf8');
      return { success: true, path };
    }
  },
  
  appendFile: {
    id: 'appendFile',
    name: 'Append to File',
    description: 'Append contents to a file',
    params: [
      { name: 'path', type: 'string', required: true, description: 'File path' },
      { name: 'content', type: 'string', required: true, description: 'Content to append' }
    ],
    handler: async ({ path, content }) => {
      await fs.promises.appendFile(path, content, 'utf8');
      return { success: true, path };
    }
  },
  
  deleteFile: {
    id: 'deleteFile',
    name: 'Delete File',
    description: 'Delete a file',
    params: [
      { name: 'path', type: 'string', required: true, description: 'File path to delete' }
    ],
    handler: async ({ path }) => {
      await fs.promises.unlink(path);
      return { success: true, path };
    }
  },
  
  listDir: {
    id: 'listDir',
    name: 'List Directory',
    description: 'List files in a directory',
    params: [
      { name: 'path', type: 'string', required: true, description: 'Directory path' }
    ],
    handler: async ({ path }) => {
      const files = await fs.promises.readdir(path);
      return files;
    }
  },
  
  // JSON operations
  parseJSON: {
    id: 'parseJSON',
    name: 'Parse JSON',
    description: 'Parse JSON string to object',
    params: [
      { name: 'json', type: 'string', required: true, description: 'JSON string' }
    ],
    handler: async ({ json }) => {
      return JSON.parse(json);
    }
  },
  
  stringifyJSON: {
    id: 'stringifyJSON',
    name: 'Stringify JSON',
    description: 'Convert object to JSON string',
    params: [
      { name: 'data', type: 'object', required: true, description: 'Object to stringify' },
      { name: 'pretty', type: 'boolean', required: false, description: 'Pretty print' }
    ],
    handler: async ({ data, pretty = false }) => {
      return JSON.stringify(data, null, pretty ? 2 : 0);
    }
  },
  
  // String operations
  template: {
    id: 'template',
    name: 'Template',
    description: 'Process a template string',
    params: [
      { name: 'template', type: 'string', required: true, description: 'Template string' },
      { name: 'variables', type: 'object', required: true, description: 'Variables object' }
    ],
    handler: async ({ template, variables }) => {
      let result = template;
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        result = result.replace(regex, value);
      }
      return result;
    }
  },
  
  // Date/Time
  timestamp: {
    id: 'timestamp',
    name: 'Get Timestamp',
    description: 'Get current timestamp',
    params: [
      { name: 'format', type: 'string', required: false, description: 'Format: iso, unix, date' }
    ],
    handler: async ({ format = 'iso' }) => {
      const now = new Date();
      switch (format) {
        case 'unix': return Math.floor(now.getTime() / 1000);
        case 'date': return now.toLocaleDateString();
        default: return now.toISOString();
      }
    }
  },
  
  // HTTP operations
  httpRequest: {
    id: 'httpRequest',
    name: 'HTTP Request',
    description: 'Make an HTTP request',
    params: [
      { name: 'url', type: 'string', required: true, description: 'Request URL' },
      { name: 'method', type: 'string', required: false, description: 'HTTP method' },
      { name: 'headers', type: 'object', required: false, description: 'Request headers' },
      { name: 'body', type: 'string', required: false, description: 'Request body' }
    ],
    handler: async ({ url, method = 'GET', headers = {}, body }) => {
      const http = require('http');
      const https = require('https');
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      return new Promise((resolve, reject) => {
        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
          path: parsedUrl.pathname + parsedUrl.search,
          method,
          headers
        };
        
        const req = client.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: data
            });
          });
        });
        
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
      });
    }
  }
};

/**
 * Pre-defined templates
 */
const CommonTemplates = {
  fileHeader: {
    id: 'fileHeader',
    name: 'File Header',
    description: 'Standard file header comment',
    variables: [
      { name: 'filename', required: true },
      { name: 'author', required: false },
      { name: 'description', required: false }
    ],
    template: `/**
 * {{ filename }}
 * {{#if description }}{{ description }}
 * {{/if}}
 * Author: {{ author }}
 * Created: {{ timestamp }}
 */`
  },
  
  classTemplate: {
    id: 'classTemplate',
    name: 'Class Template',
    description: 'Basic class structure',
    variables: [
      { name: 'className', required: true },
      { name: 'extends', required: false },
      { name: 'description', required: false }
    ],
    template: `/**
 * {{ className }} class
 * {{ description }}
 */
class {{ className }}{{#if extends}} extends {{ extends }}{{/if}} {
  constructor() {
    super();
  }
  
  // Methods go here
}

module.exports = { {{ className}} };`
  },
  
  httpEndpoint: {
    id: 'httpEndpoint',
    name: 'HTTP Endpoint',
    description: 'Express.js endpoint template',
    variables: [
      { name: 'method', required: true },
      { name: 'path', required: true },
      { name: 'handler', required: false }
    ],
    template: `router.{{ method }}('{{ path }}', async (req, res) => {
  try {
    {{ handler }}
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});`
  }
};

/**
 * Create quick action system with common actions
 */
function createQuickActions(options = {}) {
  const system = new QuickActionSystem(options);
  
  // Register common actions
  system.registerActions(Object.values(CommonActions));
  
  // Register common templates
  for (const template of Object.values(CommonTemplates)) {
    system.registerTemplate(template);
  }
  
  // Set default context
  system.setContext('timestamp', () => new Date().toISOString());
  
  return system;
}

module.exports = {
  QuickActionSystem,
  CommonActions,
  CommonTemplates,
  createQuickActions
};