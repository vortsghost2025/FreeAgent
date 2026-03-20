/**
 * Worker Launcher - Main entry point for spawning and managing worker processes
 * Central coordinator for worker lifecycle management
 */

import { fork } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class WorkerLauncher extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      maxWorkers: config.maxWorkers || 10,
      workerScript: config.workerScript || './worker-process.js',
      restartOnCrash: config.restartOnCrash !== false,
      healthCheckInterval: config.healthCheckInterval || 5000,
      ...config
    };
    
    this.workers = new Map();
    this.workerCount = 0;
    this.healthCheckTimer = null;
  }

  async launchWorker(workerId, workerConfig = {}) {
    const workerPath = path.resolve(__dirname, this.config.workerScript);
    
    console.log(`🚀 Launching worker ${workerId} from ${workerPath}`);
    
    // Pass small config via command line, large config via IPC after spawn
    const configString = JSON.stringify(workerConfig);
    const useCommandLineConfig = configString.length < 1000; // Threshold for command line
    
    const workerArgs = ['--worker-id', workerId];
    if (useCommandLineConfig) {
      workerArgs.push('--config', configString);
    }
    
    const env = {
      // Minimal essential environment to prevent Windows command line overflow
      PATH: process.env.PATH || process.env.Path || '',
      NODE_ENV: process.env.NODE_ENV || 'production',
      WORKER_ID: workerId
    };
    
    // Log environment size for debugging
    const envSize = JSON.stringify(env).length;
    console.log(`📦 Worker launcher env size: ${envSize} chars`);
    
    const workerProcess = fork(workerPath, workerArgs, {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      env
    });
    
    // Send large config via IPC if needed
    if (!useCommandLineConfig && workerProcess.connected) {
      workerProcess.send({
        type: 'worker-config',
        config: workerConfig
      });
    }

    const workerInfo = {
      id: workerId,
      process: workerProcess,
      status: 'starting',
      startTime: Date.now(),
      config: workerConfig,
      stats: {
        tasksProcessed: 0,
        errors: 0,
        uptime: 0
      }
    };

    this.workers.set(workerId, workerInfo);
    this.workerCount++;

    // Handle worker events
    workerProcess.on('message', (message) => {
      this.handleWorkerMessage(workerId, message);
    });

    workerProcess.on('exit', (code, signal) => {
      this.handleWorkerExit(workerId, code, signal);
    });

    workerProcess.on('error', (error) => {
      this.handleWorkerError(workerId, error);
    });

    // Wait for worker to be ready
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Worker ${workerId} failed to start within timeout`));
      }, 10000);

      workerProcess.once('message', (message) => {
        if (message.type === 'ready') {
          clearTimeout(timeout);
          workerInfo.status = 'running';
          console.log(`✅ Worker ${workerId} is ready and running`);
          this.emit('worker-ready', { workerId, pid: workerProcess.pid });
          resolve(workerInfo);
        }
      });
    });
  }

  handleWorkerMessage(workerId, message) {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    switch (message.type) {
      case 'task-complete':
        worker.stats.tasksProcessed++;
        this.emit('task-complete', { workerId, task: message.task, result: message.result });
        break;
      case 'task-error':
        worker.stats.errors++;
        this.emit('task-error', { workerId, task: message.task, error: message.error });
        break;
      case 'health-status':
        worker.health = message.status;
        this.emit('worker-health-update', { workerId, health: message.status });
        break;
      case 'log':
        console.log(`[Worker ${workerId}] ${message.level}: ${message.message}`);
        break;
    }
  }

  handleWorkerExit(workerId, code, signal) {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    console.log(`⚠️ Worker ${workerId} exited with code ${code}, signal ${signal}`);
    worker.status = 'exited';
    worker.exitCode = code;
    worker.exitSignal = signal;

    this.workers.delete(workerId);
    this.workerCount--;

    this.emit('worker-exit', { workerId, code, signal });

    // Auto-restart if configured
    if (this.config.restartOnCrash && code !== 0) {
      console.log(`🔄 Restarting worker ${workerId}...`);
      setTimeout(() => {
        this.launchWorker(workerId, worker.config).catch(err => {
          console.error(`Failed to restart worker ${workerId}:`, err.message);
        });
      }, 1000);
    }
  }

  handleWorkerError(workerId, error) {
    console.error(`❌ Worker ${workerId} error:`, error.message);
    this.emit('worker-error', { workerId, error });
  }

  async launchMultiple(workersConfig = []) {
    const launchPromises = [];
    
    for (let i = 0; i < workersConfig.length; i++) {
      const config = workersConfig[i];
      const workerId = config.id || `worker-${i + 1}`;
      launchPromises.push(this.launchWorker(workerId, config));
    }

    try {
      const results = await Promise.all(launchPromises);
      console.log(`🎯 Successfully launched ${results.length} workers`);
      this.startHealthChecks();
      return results;
    } catch (error) {
      console.error('Failed to launch some workers:', error.message);
      throw error;
    }
  }

  startHealthChecks() {
    if (this.healthCheckTimer) return;

    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  performHealthCheck() {
    for (const [workerId, worker] of this.workers) {
      if (worker.status === 'running' && worker.process.connected) {
        try {
          worker.process.send({ type: 'health-check' });
        } catch (error) {
          console.warn(`Could not send health check to worker ${workerId}:`, error.message);
        }
      }
    }
  }

  async terminateWorker(workerId) {
    const worker = this.workers.get(workerId);
    if (!worker) {
      throw new Error(`Worker ${workerId} not found`);
    }

    console.log(`🛑 Terminating worker ${workerId}`);
    worker.status = 'terminating';
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log(`⏰ Force killing worker ${workerId}`);
        worker.process.kill('SIGKILL');
        resolve();
      }, 5000);

      worker.process.once('exit', () => {
        clearTimeout(timeout);
        resolve();
      });

      worker.process.send({ type: 'terminate' });
    });
  }

  async terminateAll() {
    console.log('🛑 Terminating all workers...');
    const terminationPromises = [];

    for (const workerId of this.workers.keys()) {
      terminationPromises.push(this.terminateWorker(workerId));
    }

    await Promise.all(terminationPromises);
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    console.log('✅ All workers terminated');
  }

  getWorkerStats() {
    const stats = {
      totalWorkers: this.workerCount,
      activeWorkers: 0,
      crashedWorkers: 0,
      totalTasks: 0,
      totalErrors: 0,
      workers: {}
    };

    for (const [workerId, worker] of this.workers) {
      stats.workers[workerId] = {
        status: worker.status,
        pid: worker.process.pid,
        uptime: Date.now() - worker.startTime,
        tasksProcessed: worker.stats.tasksProcessed,
        errors: worker.stats.errors
      };

      if (worker.status === 'running') stats.activeWorkers++;
      if (worker.status === 'exited' && worker.exitCode !== 0) stats.crashedWorkers++;
      
      stats.totalTasks += worker.stats.tasksProcessed;
      stats.totalErrors += worker.stats.errors;
    }

    return stats;
  }

  broadcast(message) {
    for (const [workerId, worker] of this.workers) {
      if (worker.status === 'running' && worker.process.connected) {
        try {
          worker.process.send(message);
        } catch (error) {
          console.warn(`Failed to send message to worker ${workerId}:`, error.message);
        }
      }
    }
  }
}

export default WorkerLauncher;