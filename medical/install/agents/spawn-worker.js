/**
 * Spawn Worker - Utility for creating individual worker processes
 * Handles process spawning with proper configuration and error handling
 */

import { spawn } from 'child_process';
import { EventEmitter } from 'events';

class SpawnWorker extends EventEmitter {
  constructor(options = {}) {
    super();
    // Define consistent constants
    const NODE_ENV_DEFAULT = 'production';
    
    this.options = {
      command: options.command || 'node',
      args: options.args || [],
      cwd: options.cwd || process.cwd(),
      env: {
        // Minimal essential environment variables to prevent Windows command line overflow
        PATH: process.env.PATH || process.env.Path || '',
        NODE_ENV: process.env.NODE_ENV || NODE_ENV_DEFAULT,
        ...options.env
      },
      stdio: options.stdio || ['pipe', 'pipe', 'pipe'],
      detached: options.detached || false,
      ...options
    };
    
    this.process = null;
    this.pid = null;
    this.started = false;
  }

  spawn() {
    console.log(`🔄 Spawning worker process: ${this.options.command} ${this.options.args.join(' ')}`);
    
    this.process = spawn(this.options.command, this.options.args, {
      cwd: this.options.cwd,
      env: this.options.env,
      stdio: this.options.stdio,
      detached: this.options.detached
    });

    this.pid = this.process.pid;
    this.started = true;

    // Handle process events
    this.process.on('spawn', () => {
      console.log(`✅ Worker process spawned with PID: ${this.pid}`);
      this.emit('spawn', { pid: this.pid });
    });

    this.process.on('error', (error) => {
      console.error(`❌ Worker spawn error:`, error.message);
      this.emit('error', error);
    });

    this.process.on('exit', (code, signal) => {
      console.log(`👋 Worker process exited (PID: ${this.pid}) with code ${code}, signal ${signal}`);
      this.started = false;
      this.emit('exit', { code, signal, pid: this.pid });
    });

    // Handle stdio
    if (this.process.stdout) {
      this.process.stdout.on('data', (data) => {
        this.emit('stdout', data.toString());
      });
    }

    if (this.process.stderr) {
      this.process.stderr.on('data', (data) => {
        this.emit('stderr', data.toString());
      });
    }

    return this.process;
  }

  send(data) {
    if (!this.started || !this.process) {
      throw new Error('Worker process not started');
    }

    if (typeof data === 'string') {
      this.process.stdin.write(data + '\n');
    } else {
      this.process.stdin.write(JSON.stringify(data) + '\n');
    }
  }

  kill(signal = 'SIGTERM') {
    if (this.process && this.started) {
      console.log(`💀 Killing worker process (PID: ${this.pid}) with signal ${signal}`);
      this.process.kill(signal);
    }
  }

  async waitForExit(timeout = 10000) {
    return new Promise((resolve, reject) => {
      if (!this.started) {
        resolve();
        return;
      }

      const timer = setTimeout(() => {
        reject(new Error(`Worker did not exit within ${timeout}ms`));
      }, timeout);

      this.process.on('exit', (code, signal) => {
        clearTimeout(timer);
        resolve({ code, signal });
      });
    });
  }

  static async spawnAndWait(command, args, options = {}) {
    const worker = new SpawnWorker({
      command,
      args,
      ...options
    });

    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      worker.on('stdout', (data) => {
        stdout += data;
      });

      worker.on('stderr', (data) => {
        stderr += data;
      });

      worker.on('exit', ({ code, signal }) => {
        if (code === 0) {
          resolve({ stdout, stderr, code, signal });
        } else {
          reject(new Error(`Process failed with code ${code}: ${stderr}`));
        }
      });

      worker.on('error', reject);

      worker.spawn();
    });
  }
}

// Factory function for common worker types
export function createNodeWorker(scriptPath, workerOptions = {}) {
  const NODE_ENV_DEFAULT = 'production';
  
  return new SpawnWorker({
    command: 'node',
    args: [scriptPath],
    env: {
      // Minimal essential environment for Node workers
      PATH: process.env.PATH || process.env.Path || '',
      NODE_ENV: process.env.NODE_ENV || NODE_ENV_DEFAULT,
      NODE_OPTIONS: '--max-old-space-size=2048',
      ...workerOptions.env
    },
    ...workerOptions
  });
}

export function createPythonWorker(scriptPath, workerOptions = {}) {
  const NODE_ENV_DEFAULT = 'production';
  
  return new SpawnWorker({
    command: 'python',
    args: [scriptPath],
    env: {
      // Minimal essential environment for Python workers
      PATH: process.env.PATH || process.env.Path || '',
      NODE_ENV: process.env.NODE_ENV || NODE_ENV_DEFAULT,
      ...workerOptions.env
    },
    ...workerOptions
  });
}

export function createShellWorker(command, workerOptions = {}) {
  const NODE_ENV_DEFAULT = 'production';
  
  return new SpawnWorker({
    command: 'sh',
    args: ['-c', command],
    env: {
      // Minimal essential environment for shell workers
      PATH: process.env.PATH || process.env.Path || '',
      NODE_ENV: process.env.NODE_ENV || NODE_ENV_DEFAULT,
      ...workerOptions.env
    },
    ...workerOptions
  });
}

export default SpawnWorker;