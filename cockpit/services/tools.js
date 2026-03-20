/**
 * FreeAgent Tools Module
 * 
 * Provides actual tool implementations for the FreeAgent Orchestrator
 * These tools expand the agent's capabilities beyond basic AI routing
 */

const http = require('http');
const https = require('https');
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class AgentTools {
  constructor(options = {}) {
    this.allowedPaths = options.allowedPaths || [process.cwd()];
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024;
    this.timeout = options.timeout || 30000;
  }

  /**
   * HTTP Request tool - enables external API calls
   */
  async httpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const reqOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: options.headers || {},
        timeout: this.timeout
      };

      const req = client.request(reqOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const contentType = res.headers['content-type'] || '';
            if (contentType.includes('application/json')) {
              resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers });
            } else {
              resolve({ status: res.statusCode, data: data, headers: res.headers });
            }
          } catch (e) {
            resolve({ status: res.statusCode, data: data, headers: res.headers });
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => req.destroy());

      if (options.body) {
        req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
      }
      req.end();
    });
  }

  /**
   * Execute a shell command
   */
  async executeCommand(command, options = {}) {
    return new Promise((resolve) => {
      const isWindows = process.platform === 'win32';
      const shell = isWindows ? 'cmd' : '/bin/sh';
      const shellFlag = isWindows ? '/c' : '-c';
      
      const child = spawn(shell, [shellFlag, command], {
        cwd: options.cwd || process.cwd(),
        timeout: options.timeout || this.timeout,
        maxBuffer: options.maxBuffer || 10 * 1024 * 1024
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => { stdout += data.toString(); });
      child.stderr.on('data', (data) => { stderr += data.toString(); });
      
      child.on('close', (code) => {
        resolve({
          success: code === 0,
          exitCode: code,
          stdout: stdout.slice(-500000),
          stderr: stderr.slice(-100000)
        });
      });
      
      child.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
    });
  }

  /**
   * Read a file from the allowed paths
   */
  async readFile(filePath, options = {}) {
    const resolvedPath = path.resolve(filePath);
    
    // Security check
    const isAllowed = this.allowedPaths.some(allowed => 
      resolvedPath.startsWith(path.resolve(allowed))
    );
    
    if (!isAllowed) {
      throw new Error(`Path not allowed: ${filePath}`);
    }

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const stats = fs.statSync(resolvedPath);
    if (stats.size > this.maxFileSize) {
      throw new Error(`File too large: ${stats.size} bytes (max: ${this.maxFileSize})`);
    }

    const content = fs.readFileSync(resolvedPath, options.encoding || 'utf8');
    return { path: resolvedPath, content, size: stats.size };
  }

  /**
   * Write content to a file
   */
  async writeFile(filePath, content, options = {}) {
    const resolvedPath = path.resolve(filePath);
    
    const isAllowed = this.allowedPaths.some(allowed => 
      resolvedPath.startsWith(path.resolve(allowed))
    );
    
    if (!isAllowed) {
      throw new Error(`Path not allowed: ${filePath}`);
    }

    // Ensure directory exists
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(resolvedPath, content, options.encoding || 'utf8');
    return { path: resolvedPath, size: Buffer.byteLength(content) };
  }

  /**
   * List directory contents
   */
  async listDirectory(dirPath, options = {}) {
    const resolvedPath = path.resolve(dirPath);
    
    const isAllowed = this.allowedPaths.some(allowed => 
      resolvedPath.startsWith(path.resolve(allowed))
    );
    
    if (!isAllowed) {
      throw new Error(`Path not allowed: ${dirPath}`);
    }

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Directory not found: ${dirPath}`);
    }

    const items = fs.readdirSync(resolvedPath);
    const result = items.map(name => {
      const itemPath = path.join(resolvedPath, name);
      const stats = fs.statSync(itemPath);
      return {
        name,
        type: stats.isDirectory() ? 'directory' : 'file',
        size: stats.size,
        modified: stats.mtime
      };
    });

    if (options.filter) {
      return result.filter(options.filter);
    }

    return result;
  }

  /**
   * Check if path exists
   */
  async pathExists(checkPath) {
    const resolvedPath = path.resolve(checkPath);
    return fs.existsSync(resolvedPath);
  }

  /**
   * Get file/directory info
   */
  async getPathInfo(checkPath) {
    const resolvedPath = path.resolve(checkPath);
    
    if (!fs.existsSync(resolvedPath)) {
      return null;
    }

    const stats = fs.statSync(resolvedPath);
    return {
      path: resolvedPath,
      type: stats.isDirectory() ? 'directory' : 'file',
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      accessed: stats.atime
    };
  }
}

/**
 * Create tools instance with default or custom config
 */
function createTools(options) {
  return new AgentTools(options);
}

module.exports = {
  AgentTools,
  createTools
};
