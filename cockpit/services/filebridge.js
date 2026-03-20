/**
 * FileBridge Service
 * 
 * Provides safe local filesystem access through a sandboxed directory.
 * All file operations are restricted to the sandbox root.
 * 
 * Schema:
 * {
 *   action: "read | write | list | delete",
 *   path: "string",
 *   content: "string (only for write)"
 * }
 * 
 * Examples:
 * {
 *   service: "filebridge",
 *   payload: { action: "read", path: "notes/todo.txt" }
 * }
 * {
 *   service: "filebridge", 
 *   payload: { action: "write", path: "notes/todo.txt", content: "Hello" }
 * }
 * {
 *   service: "filebridge",
 *   payload: { action: "list", path: "notes/" }
 * }
 */

const fs = require('fs');
const path = require('path');

class FileBridgeService {
  constructor(options = {}) {
    this.name = 'filebridge';
    this.enabled = false;
    this.sandboxRoot = options.sandboxRoot || path.join(__dirname, '..', 'sandbox');
    this.operationLog = [];
    this.ensureSandboxExists();
  }

  ensureSandboxExists() {
    if (!fs.existsSync(this.sandboxRoot)) {
      fs.mkdirSync(this.sandboxRoot, { recursive: true });
    }
  }

  resolveSandboxPath(requestedPath) {
    const fullPath = path.resolve(this.sandboxRoot, requestedPath);
    if (!fullPath.startsWith(path.resolve(this.sandboxRoot))) {
      throw new Error('Access denied: Path outside sandbox');
    }
    return fullPath;
  }

  async process(payload) {
    const { action, path: filePath, content } = payload;
    if (!action || !filePath) {
      throw new Error('action and path are required');
    }
    
    const resolvedPath = this.resolveSandboxPath(filePath);
    this.logOperation({ action, path: filePath, timestamp: Date.now() });
    
    switch (action) {
      case 'read':
        if (!fs.existsSync(resolvedPath)) {
          throw new Error('File not found');
        }
        return { action: 'read', path: filePath, content: fs.readFileSync(resolvedPath, 'utf8') };
      
      case 'write':
        const dir = path.dirname(resolvedPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(resolvedPath, content || '', 'utf8');
        return { action: 'write', path: filePath, success: true };
      
      case 'list':
        if (!fs.existsSync(resolvedPath)) {
          throw new Error('Directory not found');
        }
        const items = fs.readdirSync(resolvedPath, { withFileTypes: true });
        return { 
          action: 'list', 
          path: filePath, 
          items: items.map(i => ({ name: i.name, isDirectory: i.isDirectory() })) 
        };
      
      case 'delete':
        if (!fs.existsSync(resolvedPath)) {
          throw new Error('File not found');
        }
        fs.unlinkSync(resolvedPath);
        return { action: 'delete', path: filePath, success: true };
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  logOperation(entry) {
    this.operationLog.push(entry);
    if (this.operationLog.length > 100) this.operationLog.shift();
  }

  getHistory() { return this.operationLog; }

  healthCheck() {
    return { service: this.name, enabled: this.enabled, sandboxRoot: this.sandboxRoot };
  }

  setEnabled(enabled) { this.enabled = enabled; }
}

module.exports = FileBridgeService;
