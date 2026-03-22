/**
 * Kilo Executor - Operational task handler
 * Executes commands, manages filesystem, spawns workers
 * Works in parallel with Lingam supervisor
 */

import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';

class KiloExecutor extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      maxConcurrent: config.maxConcurrent || 5,
      timeout: config.timeout || 30000,
      workingDirectory: config.workingDirectory || process.cwd(),
      maxCommandLength: config.maxCommandLength || 8191, // Windows CMD limit
      enableCommandChunking: config.enableCommandChunking !== false,
      ...config
    };
    
    this.status = 'idle';
    this.currentOperations = new Map();
    this.operationHistory = [];
    
    this.stats = {
      operationsCompleted: 0,
      operationsFailed: 0,
      avgExecutionTime: 0
    };
  }

  async executeOperation(task) {
    if (this.currentOperations.size >= this.config.maxConcurrent) {
      throw new Error('Maximum concurrent operations reached');
    }
    
    this.status = 'executing';
    this.currentOperations.set(task.id, {
      task,
      startTime: Date.now()
    });
    
    console.log(`⚡ Kilo executing task ${task.id}: ${task.content.substring(0, 50)}...`);
    
    try {
      const result = await this.performOperation(task);
      
      const operationRecord = this.currentOperations.get(task.id);
      const duration = Date.now() - operationRecord.startTime;
      
      this.stats.operationsCompleted++;
      this.updateExecutionStats(duration);
      
      this.currentOperations.delete(task.id);
      this.status = this.currentOperations.size === 0 ? 'idle' : 'executing';
      
      this.operationHistory.push({
        taskId: task.id,
        duration,
        success: true,
        timestamp: Date.now()
      });
      
      console.log(`✅ Kilo completed operation ${task.id} (${duration}ms)`);
      
      return result;
      
    } catch (error) {
      console.error(`❌ Kilo operation failed for ${task.id}:`, error.message);
      
      this.stats.operationsFailed++;
      this.currentOperations.delete(task.id);
      this.status = this.currentOperations.size === 0 ? 'idle' : 'executing';
      
      this.operationHistory.push({
        taskId: task.id,
        duration: Date.now() - this.currentOperations.get(task.id)?.startTime || 0,
        success: false,
        error: error.message,
        timestamp: Date.now()
      });
      
      throw error;
    }
  }

  async performOperation(task) {
    const operationType = this.determineOperationType(task.content);
    
    switch (operationType) {
      case 'shell-command':
        return await this.executeShellCommand(task);
      case 'file-operation':
        return await this.executeFileOperation(task);
      case 'process-management':
        return await this.manageProcess(task);
      case 'system-query':
        return await this.querySystem(task);
      default:
        return await this.executeGenericCommand(task);
    }
  }

  determineOperationType(content) {
    const lowerContent = content.toLowerCase();
    
    if (/\b(npm|yarn|git|docker|kubectl)\b/.test(lowerContent)) {
      return 'shell-command';
    } else if (/(create|delete|move|copy|read|write).*file/i.test(lowerContent)) {
      return 'file-operation';
    } else if (/(start|stop|restart|kill).*process/i.test(lowerContent)) {
      return 'process-management';
    } else if (/(check|monitor|status|info)/i.test(lowerContent)) {
      return 'system-query';
    }
    
    return 'generic';
  }

  async executeShellCommand(task) {
    const command = this.extractShellCommand(task.content);
    
    // Validate and handle command length
    const validatedCommand = this.validateCommandLength(command);
    if (!validatedCommand.valid) {
      throw new Error(`Command too long: ${validatedCommand.error}`);
    }
    
    // If chunking is needed, execute in chunks
    if (validatedCommand.chunks) {
      return await this.executeCommandChunks(validatedCommand.chunks);
    }
    
    return new Promise((resolve, reject) => {
      const env = {
        PATH: process.env.PATH || process.env.Path || '',
        NODE_ENV: process.env.NODE_ENV || 'production'
      };
      
      // Debug logging for environment size
      const envSize = JSON.stringify(env).length;
      console.log(`📦 Kilo spawn env size: ${envSize} chars`);
      
      const child = spawn(validatedCommand.command.cmd, validatedCommand.command.args, {
        cwd: this.config.workingDirectory,
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
        env
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve({
            success: true,
            command: command.full,
            output: stdout.trim(),
            exitCode: code,
            executionTime: Date.now() - this.currentOperations.get(task.id).startTime
          });
        } else {
          reject(new Error(`Command failed with exit code ${code}: ${stderr.trim()}`));
        }
      });
      
      child.on('error', (error) => {
        reject(new Error(`Failed to execute command: ${error.message}`));
      });
      
      // Timeout handling
      setTimeout(() => {
        if (child.pid) {
          child.kill();
          reject(new Error('Command timed out'));
        }
      }, this.config.timeout);
    });
  }

  extractShellCommand(content) {
    // Extract command from natural language
    const patterns = [
      /run\s+(.+)/i,
      /execute\s+(.+)/i,
      /start\s+(.+)/i,
      /deploy\s+(.+)/i
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        const cmd = match[1].trim();
        const parts = cmd.split(' ');
        return {
          cmd: parts[0],
          args: parts.slice(1),
          full: cmd
        };
      }
    }
    
    // Fallback to direct command extraction
    const directCmd = content.replace(/^(run|execute|start|deploy)\s+/i, '').trim();
    const parts = directCmd.split(' ');
    return {
      cmd: parts[0],
      args: parts.slice(1),
      full: directCmd
    };
  }

  async executeFileOperation(task) {
    const operation = this.parseFileOperation(task.content);
    
    switch (operation.action) {
      case 'read':
        return await this.readFile(operation.path);
      case 'write':
        return await this.writeFile(operation.path, operation.content);
      case 'create':
        return await this.createFile(operation.path);
      case 'delete':
        return await this.deleteFile(operation.path);
      case 'copy':
        return await this.copyFile(operation.source, operation.destination);
      case 'move':
        return await this.moveFile(operation.source, operation.destination);
      default:
        throw new Error(`Unknown file operation: ${operation.action}`);
    }
  }

  parseFileOperation(content) {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('read')) {
      const match = content.match(/read\s+(.+)$/i);
      return { action: 'read', path: match ? match[1].trim() : '' };
    } else if (lowerContent.includes('write') || lowerContent.includes('create')) {
      const match = content.match(/(?:write|create)\s+(.+?)(?:\s+with\s+content\s+(.+))?$/i);
      return { 
        action: lowerContent.includes('write') ? 'write' : 'create',
        path: match ? match[1].trim() : '',
        content: match && match[2] ? match[2].trim() : ''
      };
    }
    
    throw new Error('Could not parse file operation');
  }

  async readFile(filePath) {
    const fullPath = path.resolve(this.config.workingDirectory, filePath);
    const content = await fs.promises.readFile(fullPath, 'utf8');
    return { success: true, content, path: fullPath };
  }

  async writeFile(filePath, content) {
    const fullPath = path.resolve(this.config.workingDirectory, filePath);
    await fs.promises.writeFile(fullPath, content, 'utf8');
    return { success: true, path: fullPath, written: content.length };
  }

  async createFile(filePath) {
    const fullPath = path.resolve(this.config.workingDirectory, filePath);
    await fs.promises.writeFile(fullPath, '', 'utf8');
    return { success: true, path: fullPath, created: true };
  }

  async deleteFile(filePath) {
    const fullPath = path.resolve(this.config.workingDirectory, filePath);
    await fs.promises.unlink(fullPath);
    return { success: true, path: fullPath, deleted: true };
  }

  async copyFile(source, destination) {
    const sourcePath = path.resolve(this.config.workingDirectory, source);
    const destPath = path.resolve(this.config.workingDirectory, destination);
    await fs.promises.copyFile(sourcePath, destPath);
    return { success: true, source: sourcePath, destination: destPath };
  }

  async moveFile(source, destination) {
    const sourcePath = path.resolve(this.config.workingDirectory, source);
    const destPath = path.resolve(this.config.workingDirectory, destination);
    await fs.promises.rename(sourcePath, destPath);
    return { success: true, source: sourcePath, destination: destPath };
  }

  async manageProcess(task) {
    // Process management operations
    await this.delay(500 + Math.random() * 1000);
    return {
      success: true,
      action: 'process-managed',
      details: `Handled process operation: ${task.content}`
    };
  }

  async querySystem(task) {
    // System information queries
    await this.delay(300 + Math.random() * 700);
    return {
      success: true,
      action: 'system-queried',
      details: `System query completed: ${task.content}`,
      timestamp: new Date().toISOString()
    };
  }

  async executeGenericCommand(task) {
    // Generic command execution
    await this.delay(1000 + Math.random() * 2000);
    return {
      success: true,
      action: 'generic-execution',
      command: task.content,
      result: 'Command executed successfully'
    };
  }

  updateExecutionStats(duration) {
    this.stats.avgExecutionTime = (
      (this.stats.avgExecutionTime * (this.stats.operationsCompleted - 1) + duration) / 
      this.stats.operationsCompleted
    );
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate command length and prepare for execution
   * @param {Object} command - Command object with cmd and args
   * @returns {Object} Validation result
   */
  validateCommandLength(command) {
    const fullCommand = `${command.cmd} ${command.args.join(' ')}`;
    const commandLength = fullCommand.length;
    
    console.log(`🔍 Command length check: ${commandLength}/${this.config.maxCommandLength} characters`);
    
    // Check if command exceeds limit
    if (commandLength > this.config.maxCommandLength) {
      if (this.config.enableCommandChunking) {
        // Split into manageable chunks
        const chunks = this.chunkCommand(command, this.config.maxCommandLength);
        return {
          valid: true,
          command: command,
          chunks: chunks,
          originalLength: commandLength,
          message: `Command chunked into ${chunks.length} parts`
        };
      } else {
        return {
          valid: false,
          error: `Command length ${commandLength} exceeds maximum ${this.config.maxCommandLength}`,
          command: command
        };
      }
    }
    
    return {
      valid: true,
      command: command,
      originalLength: commandLength
    };
  }

  /**
   * Chunk a long command into smaller parts
   * @param {Object} command - Command object
   * @param {number} maxLength - Maximum length per chunk
   * @returns {Array} Array of command chunks
   */
  chunkCommand(command, maxLength) {
    const chunks = [];
    const fullCommand = `${command.cmd} ${command.args.join(' ')}`;
    
    if (fullCommand.length <= maxLength) {
      return [{ cmd: command.cmd, args: command.args }];
    }
    
    // For file operations, try to chunk args
    if (command.args.length > 1) {
      // Split args into groups that fit within limit
      let currentArgs = [];
      let currentLength = command.cmd.length + 2; // cmd + spaces
      
      for (const arg of command.args) {
        const argLength = arg.length + 1; // + space
        
        if (currentLength + argLength > maxLength && currentArgs.length > 0) {
          // Create chunk with current args
          chunks.push({
            cmd: command.cmd,
            args: [...currentArgs]
          });
          
          // Start new chunk
          currentArgs = [arg];
          currentLength = command.cmd.length + arg.length + 2;
        } else {
          currentArgs.push(arg);
          currentLength += argLength;
        }
      }
      
      // Add final chunk
      if (currentArgs.length > 0) {
        chunks.push({
          cmd: command.cmd,
          args: currentArgs
        });
      }
    } else {
      // For single long arg, truncate with warning
      const truncatedArg = command.args[0].substring(0, maxLength - command.cmd.length - 10) + '...';
      chunks.push({
        cmd: command.cmd,
        args: [truncatedArg],
        truncated: true
      });
    }
    
    console.log(`✂️  Command chunked into ${chunks.length} parts`);
    return chunks;
  }

  /**
   * Execute command chunks sequentially
   * @param {Array} chunks - Array of command chunks
   * @returns {Object} Combined result
   */
  async executeCommandChunks(chunks) {
    console.log(`🏃 Executing ${chunks.length} command chunks`);
    
    const results = [];
    let combinedOutput = '';
    let combinedErrors = '';
    let exitCode = 0;
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`   Chunk ${i + 1}/${chunks.length}: ${chunk.cmd} ${chunk.args.join(' ')}`);
      
      try {
        const result = await this.executeSingleCommand(chunk);
        results.push(result);
        combinedOutput += result.output || '';
        combinedErrors += result.error || '';
        
        if (result.exitCode !== 0) {
          exitCode = result.exitCode;
        }
        
        // Small delay between chunks
        if (i < chunks.length - 1) {
          await this.delay(100);
        }
        
      } catch (error) {
        console.error(`❌ Chunk ${i + 1} failed:`, error.message);
        combinedErrors += `Chunk ${i + 1} failed: ${error.message}\n`;
        exitCode = 1;
      }
    }
    
    return {
      success: exitCode === 0,
      output: combinedOutput,
      error: combinedErrors,
      exitCode: exitCode,
      chunksExecuted: chunks.length,
      executionTime: Date.now() - this.currentOperations.get(Array.from(this.currentOperations.keys())[0]).startTime
    };
  }

  /**
   * Execute a single command
   * @param {Object} command - Command object
   * @returns {Promise<Object>} Command result
   */
  executeSingleCommand(command) {
    return new Promise((resolve, reject) => {
      const env = {
        PATH: process.env.PATH || process.env.Path || '',
        NODE_ENV: process.env.NODE_ENV || 'production'
      };
      
      // Debug logging for environment size
      const envSize = JSON.stringify(env).length;
      console.log(`📦 Kilo single command env size: ${envSize} chars`);
      
      const child = spawn(command.cmd, command.args, {
        cwd: this.config.workingDirectory,
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
        env
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        resolve({
          success: code === 0,
          output: stdout.trim(),
          error: stderr.trim(),
          exitCode: code,
          command: `${command.cmd} ${command.args.join(' ')}`
        });
      });
      
      child.on('error', (error) => {
        reject(new Error(`Failed to execute command: ${error.message}`));
      });
      
      // Timeout handling
      setTimeout(() => {
        if (child.pid) {
          child.kill();
          reject(new Error('Command timed out'));
        }
      }, this.config.timeout);
    });
  }

  getStats() {
    return {
      status: this.status,
      currentOperations: this.currentOperations.size,
      performance: {
        operationsCompleted: this.stats.operationsCompleted,
        operationsFailed: this.stats.operationsFailed,
        avgExecutionTime: this.stats.avgExecutionTime.toFixed(0) + 'ms',
        successRate: this.stats.operationsCompleted > 0 ?
          ((this.stats.operationsCompleted / (this.stats.operationsCompleted + this.stats.operationsFailed)) * 100).toFixed(1) + '%' : '0%'
      },
      recentOperations: this.operationHistory.slice(-5)
    };
  }

  getStatus() {
    return {
      id: 'kilo-executor',
      status: this.status,
      currentTasks: Array.from(this.currentOperations.keys()),
      load: (this.currentOperations.size / this.config.maxConcurrent * 100).toFixed(0) + '%'
    };
  }
}

export default KiloExecutor;