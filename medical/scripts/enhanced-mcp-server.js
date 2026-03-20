/**
 * Enhanced MCP Server
 * 
 * A Model Context Protocol server with:
 * - Multiple protocol support (stdio, HTTP SSE)
 * - Dynamic tool registration
 * - Better error handling and logging
 * 
 * @author Kilo Code
 * @version 1.0.0
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// MCP Protocol constants
const MCP_PROTOCOL_VERSION = '2024-11-05';
const MCP_JSONRPC_VERSION = '2.0';

/**
 * MCP Server error codes
 */
const ErrorCode = {
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
  ServerError: -32000
};

/**
 * Enhanced MCP Server class
 */
class EnhancedMCPServer {
  constructor(options = {}) {
    this.name = options.name || 'KiloCode-MCP-Server';
    this.version = options.version || '1.0.0';
    this.port = options.port || 3000;
    this.host = options.host || 'localhost';
    this.protocol = options.protocol || 'stdio'; // 'stdio' or 'http'
    
    // Tool registry
    this.tools = new Map();
    this.toolHandlers = new Map();
    
    // Resource registry
    this.resources = new Map();
    this.resourceHandlers = new Map();
    
    // Logging
    this.logger = options.logger || console;
    this.logLevel = options.logLevel || 'info';
    
    // Statistics
    this.stats = {
      requestsReceived: 0,
      requestsSuccessful: 0,
      requestsFailed: 0,
      toolsInvoked: 0,
      startTime: Date.now()
    };
    
    // Server instance
    this.server = null;
    
    // Middleware
    this.middleware = [];
  }

  /**
   * Register a tool
   */
  registerTool(toolDefinition, handler) {
    const { name, description, inputSchema } = toolDefinition;
    
    if (this.tools.has(name)) {
      this.logger.warn(`Tool ${name} already registered, overwriting`);
    }
    
    this.tools.set(name, {
      name,
      description: description || '',
      inputSchema: inputSchema || { type: 'object', properties: {} }
    });
    
    this.toolHandlers.set(name, handler);
    this.logger.info(`Registered tool: ${name}`);
    
    return this;
  }

  /**
   * Register multiple tools at once
   */
  registerTools(toolDefinitions) {
    for (const tool of toolDefinitions) {
      this.registerTool(tool.tool, tool.handler);
    }
    return this;
  }

  /**
   * Register a resource
   */
  registerResource(resourceDefinition, handler) {
    const { uri, name, description, mimeType } = resourceDefinition;
    
    if (this.resources.has(uri)) {
      this.logger.warn(`Resource ${uri} already registered, overwriting`);
    }
    
    this.resources.set(uri, {
      uri,
      name: name || uri,
      description: description || '',
      mimeType: mimeType || 'text/plain'
    });
    
    this.resourceHandlers.set(uri, handler);
    this.logger.info(`Registered resource: ${uri}`);
    
    return this;
  }

  /**
   * Add middleware
   */
  use(middlewareFn) {
    this.middleware.push(middlewareFn);
    return this;
  }

  /**
   * Apply middleware chain
   */
  async applyMiddleware(context, request) {
    let ctx = { ...context, request };
    
    for (const mw of this.middleware) {
      ctx = await mw(ctx);
      if (ctx.response) {
        return ctx.response;
      }
    }
    
    return null;
  }

  /**
   * Handle incoming JSON-RPC request
   */
  async handleRequest(request) {
    this.stats.requestsReceived++;
    
    // Validate JSON-RPC version
    if (request.jsonrpc !== MCP_JSONRPC_VERSION) {
      return this.createErrorResponse(null, ErrorCode.InvalidRequest, 'Invalid JSON-RPC version');
    }
    
    // Validate method exists
    if (!request.method) {
      return this.createErrorResponse(null, ErrorCode.InvalidRequest, 'Method not specified');
    }
    
    try {
      // Apply middleware
      const middlewareResult = await this.applyMiddleware({}, request);
      if (middlewareResult) {
        return middlewareResult;
      }
      
      // Route to handler
      const result = await this.routeRequest(request);
      this.stats.requestsSuccessful++;
      
      return this.createSuccessResponse(request.id, result);
    } catch (error) {
      this.stats.requestsFailed++;
      this.logger.error(`Request failed: ${error.message}`);
      
      const errorCode = error.code || ErrorCode.InternalError;
      return this.createErrorResponse(request.id, errorCode, error.message);
    }
  }

  /**
   * Route request to appropriate handler
   */
  async routeRequest(request) {
    const { method } = request;
    
    // MCP Core methods
    if (method === 'initialize') {
      return this.handleInitialize(request.params || {});
    }
    
    if (method === 'tools/list') {
      return this.handleListTools();
    }
    
    if (method === 'tools/call') {
      return this.handleCallTool(request.params || {});
    }
    
    if (method === 'resources/list') {
      return this.handleListResources();
    }
    
    if (method === 'resources/read') {
      return this.handleReadResource(request.params || {});
    }
    
    if (method === 'ping') {
      return { pong: true };
    }
    
    // Custom methods
    if (method.startsWith('custom/')) {
      return this.handleCustomMethod(method, request.params || {});
    }
    
    throw { code: ErrorCode.MethodNotFound, message: `Method not found: ${method}` };
  }

  /**
   * Handle initialize method
   */
  handleInitialize(params) {
    this.logger.info(`Client initialized: ${params.protocolVersion}`);
    
    return {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {
        tools: { listChanged: true },
        resources: { subscribe: true, listChanged: true }
      },
      serverInfo: {
        name: this.name,
        version: this.version
      }
    };
  }

  /**
   * Handle tools/list method
   */
  handleListTools() {
    const toolList = Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }));
    
    return { tools: toolList };
  }

  /**
   * Handle tools/call method
   */
  async handleCallTool(params) {
    const { name, arguments: args } = params;
    
    if (!this.tools.has(name)) {
      throw { code: ErrorCode.MethodNotFound, message: `Tool not found: ${name}` };
    }
    
    this.stats.toolsInvoked++;
    const handler = this.toolHandlers.get(name);
    
    try {
      const result = await handler(args || {});
      
      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      this.logger.error(`Tool ${name} failed: ${error.message}`);
      
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  /**
   * Handle resources/list method
   */
  handleListResources() {
    const resourceList = Array.from(this.resources.values()).map(resource => ({
      uri: resource.uri,
      name: resource.name,
      description: resource.description,
      mimeType: resource.mimeType
    }));
    
    return { resources: resourceList };
  }

  /**
   * Handle resources/read method
   */
  async handleReadResource(params) {
    const { uri } = params;
    
    if (!this.resources.has(uri)) {
      throw { code: ErrorCode.MethodNotFound, message: `Resource not found: ${uri}` };
    }
    
    const handler = this.resourceHandlers.get(uri);
    const data = await handler({ uri });
    
    return {
      contents: [
        {
          uri,
          mimeType: this.resources.get(uri).mimeType,
          text: typeof data === 'string' ? data : JSON.stringify(data)
        }
      ]
    };
  }

  /**
   * Handle custom method
   */
  async handleCustomMethod(method, params) {
    const customHandler = this.toolHandlers.get(method);
    
    if (!customHandler) {
      throw { code: ErrorCode.MethodNotFound, message: `Custom method not found: ${method}` };
    }
    
    return customHandler(params);
  }

  /**
   * Create success JSON-RPC response
   */
  createSuccessResponse(id, result) {
    return {
      jsonrpc: MCP_JSONRPC_VERSION,
      id,
      result
    };
  }

  /**
   * Create error JSON-RPC response
   */
  createErrorResponse(id, code, message) {
    return {
      jsonrpc: MCP_JSONRPC_VERSION,
      id,
      error: {
        code,
        message
      }
    };
  }

  /**
   * Start the server in stdio mode
   */
  startStdio() {
    this.logger.info('Starting MCP server in stdio mode...');
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    let buffer = '';
    
    process.stdin.on('data', (chunk) => {
      buffer += chunk.toString();
      
      // Try to parse complete JSON messages
      let newlineIndex;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        
        if (line.trim()) {
          try {
            const request = JSON.parse(line);
            this.handleRequest(request).then(response => {
              if (response) {
                console.log(JSON.stringify(response));
              }
            });
          } catch (e) {
            this.logger.error(`Parse error: ${e.message}`);
          }
        }
      }
    });
    
    process.stdin.on('end', () => {
      this.logger.info('Stdin closed, shutting down...');
      process.exit(0);
    });
    
    this.logger.info('MCP server ready (stdio)');
  }

  /**
   * Start the server in HTTP/SSE mode
   */
  async startHTTP() {
    this.logger.info(`Starting MCP server on ${this.host}:${this.port}...`);
    
    this.server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://${req.headers.host}`);
      
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }
      
      // SSE endpoint for notifications
      if (url.pathname === '/events') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });
        
        res.write('event: connected\ndata: {"status":"connected"}\n\n');
        
        // Keep connection alive
        const keepAlive = setInterval(() => {
          res.write(': keepalive\n\n');
        }, 30000);
        
        req.on('close', () => {
          clearInterval(keepAlive);
        });
        
        return;
      }
      
      // MCP endpoint
      if (req.method === 'POST' && url.pathname === '/mcp') {
        let body = '';
        
        req.on('data', chunk => {
          body += chunk.toString();
        });
        
        req.on('end', async () => {
          try {
            const request = JSON.parse(body);
            const response = await this.handleRequest(request);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(response));
          } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              jsonrpc: MCP_JSONRPC_VERSION,
              error: { code: ErrorCode.ParseError, message: e.message }
            }));
          }
        });
        
        return;
      }
      
      // Health check
      if (req.method === 'GET' && url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'healthy',
          uptime: Date.now() - this.stats.startTime,
          stats: this.stats
        }));
        return;
      }
      
      // Not found
      res.writeHead(404);
      res.end('Not Found');
    });
    
    return new Promise((resolve) => {
      this.server.listen(this.port, this.host, () => {
        this.logger.info(`MCP server ready (HTTP) at http://${this.host}:${this.port}`);
        resolve();
      });
    });
  }

  /**
   * Start the server
   */
  async start() {
    if (this.protocol === 'http') {
      await this.startHTTP();
    } else {
      this.startStdio();
    }
  }

  /**
   * Stop the server
   */
  stop() {
    if (this.server) {
      this.server.close();
      this.logger.info('Server stopped');
    }
  }

  /**
   * Get server statistics
   */
  getStats() {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.startTime,
      registeredTools: this.tools.size,
      registeredResources: this.resources.size
    };
  }
}

/**
 * Factory function to create MCP server
 */
function createMCPServer(options) {
  return new EnhancedMCPServer(options);
}

/**
 * Quick helper to create tools
 */
function createToolDefinition(name, description, inputSchema) {
  return { name, description, inputSchema };
}

module.exports = {
  EnhancedMCPServer,
  createMCPServer,
  createToolDefinition,
  ErrorCode,
  MCP_PROTOCOL_VERSION,
  MCP_JSONRPC_VERSION
};