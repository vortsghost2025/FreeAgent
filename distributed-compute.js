/**
 * Distributed Compute Layer - Track 6C
 * Transforms the swarm into a distributed compute fabric
 * Map/Reduce, Pipelines, Parallel Processing, Work Batching
 * 
 * For WE. For distributed power. 💙⚡
 */

// JOB TYPES
const JobType = {
  MAP_REDUCE: 'map-reduce',
  PIPELINE: 'pipeline',
  BATCH: 'batch',
  PARALLEL: 'parallel',
  TRANSFORM: 'transform'
};

const JobStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

/**
 * Compute Job - Represents a distributed computation
 */
class ComputeJob {
  constructor(id, type, config) {
    this.id = id;
    this.type = type;
    this.config = config;
    this.status = JobStatus.PENDING;
    this.createdAt = Date.now();
    this.startedAt = null;
    this.completedAt = null;
    this.progress = 0;
    this.result = null;
    this.error = null;
    this.subtasks = [];
    this.completedSubtasks = 0;
    this.metadata = {};
  }

  start() {
    this.status = JobStatus.RUNNING;
    this.startedAt = Date.now();
  }

  complete(result) {
    this.status = JobStatus.COMPLETED;
    this.completedAt = Date.now();
    this.result = result;
    this.progress = 100;
  }

  fail(error) {
    this.status = JobStatus.FAILED;
    this.completedAt = Date.now();
    this.error = error;
  }

  updateProgress(completed, total) {
    this.completedSubtasks = completed;
    this.progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  }

  getDuration() {
    if (!this.startedAt) return 0;
    const endTime = this.completedAt || Date.now();
    return endTime - this.startedAt;
  }
}

/**
 * Distributed Compute Engine
 */
class DistributedCompute {
  constructor(swarmCoordinator, taskQueue) {
    this.swarmCoordinator = swarmCoordinator;
    this.taskQueue = taskQueue;
    
    this.jobs = new Map(); // jobId -> ComputeJob
    this.activeJobs = new Set();
    this.jobIdCounter = 0;
    
    // Compute functions registry
    this.functions = new Map(); // name -> function
    
    // Metrics
    this.metrics = {
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      totalSubtasks: 0,
      averageLatency: 0,
      throughput: 0
    };
    
    // Event callbacks
    this.onJobComplete = null;
    this.onJobFailed = null;
    this.onProgress = null;
    
    console.log('✅ Distributed Compute Engine initialized');
  }

  /**
   * Register a compute function
   */
  registerFunction(name, fn) {
    this.functions.set(name, fn);
    console.log(`📝 Registered compute function: ${name}`);
  }

  /**
   * Submit a Map/Reduce job
   */
  async submitMapReduce(input, mapFn, reduceFn, options = {}) {
    const jobId = `mr-${this.jobIdCounter++}`;
    const job = new ComputeJob(jobId, JobType.MAP_REDUCE, {
      input,
      mapFn,
      reduceFn,
      chunks: options.chunks || 10,
      timeout: options.timeout || 60000
    });

    this.jobs.set(jobId, job);
    this.activeJobs.add(jobId);
    this.metrics.totalJobs++;

    console.log(`🚀 Starting Map/Reduce job ${jobId} with ${input.length} items`);
    
    try {
      job.start();
      
      // Split input into chunks
      const chunkSize = Math.ceil(input.length / job.config.chunks);
      const chunks = [];
      for (let i = 0; i < input.length; i += chunkSize) {
        chunks.push(input.slice(i, i + chunkSize));
      }
      
      job.subtasks = chunks.map((chunk, idx) => ({ id: idx, chunk, status: 'pending' }));
      
      // Map phase: Distribute chunks to worker agents
      console.log(`📊 Map phase: ${chunks.length} chunks`);
      const mapResults = await this._executeMapPhase(job, chunks, mapFn);
      
      job.updateProgress(chunks.length, chunks.length);
      
      // Reduce phase: Aggregate results
      console.log(`🔄 Reduce phase: aggregating ${mapResults.length} results`);
      const finalResult = await this._executeReducePhase(job, mapResults, reduceFn);
      
      job.complete(finalResult);
      this.metrics.completedJobs++;
      this.activeJobs.delete(jobId);
      
      console.log(`✅ Map/Reduce job ${jobId} completed in ${job.getDuration()}ms`);
      
      if (this.onJobComplete) {
        this.onJobComplete(job);
      }
      
      return finalResult;
      
    } catch (error) {
      job.fail(error.message);
      this.metrics.failedJobs++;
      this.activeJobs.delete(jobId);
      
      console.error(`❌ Map/Reduce job ${jobId} failed:`, error);
      
      if (this.onJobFailed) {
        this.onJobFailed(job);
      }
      
      throw error;
    }
  }

  /**
   * Execute map phase across workers
   */
  async _executeMapPhase(job, chunks, mapFn) {
    const mapPromises = chunks.map(async (chunk, idx) => {
      // Create task for worker agent
      const task = {
        id: `${job.id}-map-${idx}`,
        type: 'map',
        status: 'pending',
        data: { chunk, mapFn: mapFn.toString() },
        priority: job.config.priority || 0,
        timeout: job.config.timeout
      };
      
      // Submit to task queue
      this.taskQueue.addTask(task);
      
      // Wait for completion (simulated - in real system would use task callbacks)
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          const completedResult = this.taskQueue.completedTasks.get(task.id);
          if (completedResult !== undefined) {
            clearInterval(checkInterval);
            job.subtasks[idx].status = 'completed';
            job.updateProgress(job.completedSubtasks + 1, job.subtasks.length);
            
            if (this.onProgress) {
              this.onProgress(job);
            }
            
            resolve(completedResult);
          }
          
          const failedError = this.taskQueue.failedTasks.get(task.id);
          if (failedError !== undefined) {
            clearInterval(checkInterval);
            job.subtasks[idx].status = 'failed';
            reject(new Error(failedError));
          }
        }, 100);
        
        // Timeout
        setTimeout(() => {
          clearInterval(checkInterval);
          if (job.subtasks[idx].status === 'pending') {
            reject(new Error('Map task timeout'));
          }
        }, task.timeout);
      });
    });
    
    return Promise.all(mapPromises);
  }

  /**
   * Execute reduce phase
   */
  async _executeReducePhase(job, mapResults, reduceFn) {
    // Create reduce task
    const task = {
      id: `${job.id}-reduce`,
      type: 'reduce',
      status: 'pending',
      data: { results: mapResults, reduceFn: reduceFn.toString() },
      priority: job.config.priority || 0,
      timeout: job.config.timeout
    };
    
    this.taskQueue.addTask(task);
    
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const completedResult = this.taskQueue.completedTasks.get(task.id);
        if (completedResult !== undefined) {
          clearInterval(checkInterval);
          resolve(completedResult);
        }
        
        const failedError = this.taskQueue.failedTasks.get(task.id);
        if (failedError !== undefined) {
          clearInterval(checkInterval);
          reject(new Error(failedError));
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Reduce task timeout'));
      }, task.timeout);
    });
  }

  /**
   * Submit a Pipeline job (multi-stage processing)
   */
  async submitPipeline(input, stages, options = {}) {
    const jobId = `pipe-${this.jobIdCounter++}`;
    const job = new ComputeJob(jobId, JobType.PIPELINE, {
      input,
      stages,
      parallel: options.parallel || false,
      timeout: options.timeout || 60000
    });

    this.jobs.set(jobId, job);
    this.activeJobs.add(jobId);
    this.metrics.totalJobs++;

    console.log(`🚀 Starting Pipeline job ${jobId} with ${stages.length} stages`);
    
    try {
      job.start();
      job.subtasks = stages.map((stage, idx) => ({ id: idx, stage: stage.name, status: 'pending' }));
      
      let currentData = input;
      
      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        console.log(`📊 Pipeline stage ${i + 1}/${stages.length}: ${stage.name}`);
        
        job.subtasks[i].status = 'running';
        
        // Execute stage
        if (stage.parallel && Array.isArray(currentData)) {
          // Parallel execution for array inputs
          const tasks = currentData.map((item, idx) => ({
            id: `${job.id}-stage${i}-${idx}`,
            type: 'pipeline-stage',
            status: 'pending',
            data: { item, stageFn: stage.fn.toString() },
            priority: job.config.priority || 0
          }));
          
          tasks.forEach(task => this.taskQueue.addTask(task));
          
          // Wait for all tasks
          currentData = await Promise.all(
            tasks.map(task => this._waitForTask(task.id, stage.timeout || job.config.timeout))
          );
        } else {
          // Sequential execution
          const task = {
            id: `${job.id}-stage${i}`,
            type: 'pipeline-stage',
            status: 'pending',
            data: { input: currentData, stageFn: stage.fn.toString() },
            priority: job.config.priority || 0
          };
          
          this.taskQueue.addTask(task);
          currentData = await this._waitForTask(task.id, stage.timeout || job.config.timeout);
        }
        
        job.subtasks[i].status = 'completed';
        job.updateProgress(i + 1, stages.length);
        
        if (this.onProgress) {
          this.onProgress(job);
        }
      }
      
      job.complete(currentData);
      this.metrics.completedJobs++;
      this.activeJobs.delete(jobId);
      
      console.log(`✅ Pipeline job ${jobId} completed in ${job.getDuration()}ms`);
      
      if (this.onJobComplete) {
        this.onJobComplete(job);
      }
      
      return currentData;
      
    } catch (error) {
      job.fail(error.message);
      this.metrics.failedJobs++;
      this.activeJobs.delete(jobId);
      
      console.error(`❌ Pipeline job ${jobId} failed:`, error);
      
      if (this.onJobFailed) {
        this.onJobFailed(job);
      }
      
      throw error;
    }
  }

  /**
   * Submit a Batch job (process multiple items in parallel)
   */
  async submitBatch(items, processFn, options = {}) {
    const jobId = `batch-${this.jobIdCounter++}`;
    const job = new ComputeJob(jobId, JobType.BATCH, {
      items,
      processFn,
      batchSize: options.batchSize || 10,
      timeout: options.timeout || 60000
    });

    this.jobs.set(jobId, job);
    this.activeJobs.add(jobId);
    this.metrics.totalJobs++;

    console.log(`🚀 Starting Batch job ${jobId} with ${items.length} items`);
    
    try {
      job.start();
      
      // Split into batches
      const batchSize = job.config.batchSize;
      const batches = [];
      for (let i = 0; i < items.length; i += batchSize) {
        batches.push(items.slice(i, i + batchSize));
      }
      
      job.subtasks = batches.map((batch, idx) => ({ id: idx, batch, status: 'pending' }));
      
      // Process batches
      const results = [];
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        job.subtasks[i].status = 'running';
        
        // Create tasks for batch items
        const tasks = batch.map((item, idx) => ({
          id: `${job.id}-batch${i}-${idx}`,
          type: 'batch-item',
          status: 'pending',
          data: { item, processFn: processFn.toString() },
          priority: job.config.priority || 0
        }));
        
        tasks.forEach(task => this.taskQueue.addTask(task));
        
        // Wait for batch completion
        const batchResults = await Promise.all(
          tasks.map(task => this._waitForTask(task.id, job.config.timeout))
        );
        
        results.push(...batchResults);
        
        job.subtasks[i].status = 'completed';
        job.updateProgress(i + 1, batches.length);
        
        if (this.onProgress) {
          this.onProgress(job);
        }
      }
      
      job.complete(results);
      this.metrics.completedJobs++;
      this.activeJobs.delete(jobId);
      
      console.log(`✅ Batch job ${jobId} completed in ${job.getDuration()}ms`);
      
      if (this.onJobComplete) {
        this.onJobComplete(job);
      }
      
      return results;
      
    } catch (error) {
      job.fail(error.message);
      this.metrics.failedJobs++;
      this.activeJobs.delete(jobId);
      
      console.error(`❌ Batch job ${jobId} failed:`, error);
      
      if (this.onJobFailed) {
        this.onJobFailed(job);
      }
      
      throw error;
    }
  }

  /**
   * Submit a Parallel Transform job
   */
  async submitTransform(input, transformFn, options = {}) {
    const jobId = `transform-${this.jobIdCounter++}`;
    const job = new ComputeJob(jobId, JobType.TRANSFORM, {
      input,
      transformFn,
      chunks: options.chunks || 10,
      timeout: options.timeout || 60000
    });

    this.jobs.set(jobId, job);
    this.activeJobs.add(jobId);
    this.metrics.totalJobs++;

    console.log(`🚀 Starting Transform job ${jobId}`);
    
    try {
      job.start();
      
      // If input is array, split and parallelize
      if (Array.isArray(input)) {
        const chunkSize = Math.ceil(input.length / job.config.chunks);
        const chunks = [];
        for (let i = 0; i < input.length; i += chunkSize) {
          chunks.push(input.slice(i, i + chunkSize));
        }
        
        job.subtasks = chunks.map((chunk, idx) => ({ id: idx, chunk, status: 'pending' }));
        
        const tasks = chunks.map((chunk, idx) => ({
          id: `${job.id}-chunk-${idx}`,
          type: 'transform',
          status: 'pending',
          data: { chunk, transformFn: transformFn.toString() },
          priority: job.config.priority || 0
        }));
        
        tasks.forEach(task => this.taskQueue.addTask(task));
        
        const results = await Promise.all(
          tasks.map((task, idx) => 
            this._waitForTask(task.id, job.config.timeout).then(result => {
              job.subtasks[idx].status = 'completed';
              job.updateProgress(idx + 1, chunks.length);
              if (this.onProgress) this.onProgress(job);
              return result;
            })
          )
        );
        
        // Flatten results
        const finalResult = results.flat();
        job.complete(finalResult);
        
      } else {
        // Single item transform
        const task = {
          id: `${job.id}-single`,
          type: 'transform',
          status: 'pending',
          data: { item: input, transformFn: transformFn.toString() },
          priority: job.config.priority || 0
        };
        
        this.taskQueue.addTask(task);
        const result = await this._waitForTask(task.id, job.config.timeout);
        job.complete(result);
      }
      
      this.metrics.completedJobs++;
      this.activeJobs.delete(jobId);
      
      console.log(`✅ Transform job ${jobId} completed in ${job.getDuration()}ms`);
      
      if (this.onJobComplete) {
        this.onJobComplete(job);
      }
      
      return job.result;
      
    } catch (error) {
      job.fail(error.message);
      this.metrics.failedJobs++;
      this.activeJobs.delete(jobId);
      
      console.error(`❌ Transform job ${jobId} failed:`, error);
      
      if (this.onJobFailed) {
        this.onJobFailed(job);
      }
      
      throw error;
    }
  }

  /**
   * Wait for task completion (helper)
   */
  _waitForTask(taskId, timeout) {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const completedResult = this.taskQueue.completedTasks.get(taskId);
        if (completedResult !== undefined) {
          clearInterval(checkInterval);
          resolve(completedResult);
        }
        
        const failedError = this.taskQueue.failedTasks.get(taskId);
        if (failedError !== undefined) {
          clearInterval(checkInterval);
          reject(new Error(failedError));
        }
      }, 50);
      
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error(`Task ${taskId} timeout`));
      }, timeout);
    });
  }

  /**
   * Cancel a job
   */
  cancelJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) {
      console.warn(`Job ${jobId} not found`);
      return false;
    }
    
    if (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED) {
      console.warn(`Job ${jobId} already ${job.status}`);
      return false;
    }
    
    job.status = JobStatus.CANCELLED;
    this.activeJobs.delete(jobId);
    
    console.log(`🛑 Job ${jobId} cancelled`);
    return true;
  }

  /**
   * Get job status
   */
  getJob(jobId) {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs
   */
  getAllJobs() {
    return Array.from(this.jobs.values());
  }

  /**
   * Get active jobs
   */
  getActiveJobs() {
    return Array.from(this.activeJobs).map(id => this.jobs.get(id));
  }

  /**
   * Get metrics
   */
  getMetrics() {
    // Calculate average latency
    const completedJobs = Array.from(this.jobs.values())
      .filter(job => job.status === JobStatus.COMPLETED);
    
    if (completedJobs.length > 0) {
      const totalLatency = completedJobs.reduce((sum, job) => sum + job.getDuration(), 0);
      this.metrics.averageLatency = Math.round(totalLatency / completedJobs.length);
    }
    
    // Calculate throughput (jobs per second)
    const recentJobs = completedJobs.filter(job => 
      Date.now() - job.completedAt < 60000
    );
    this.metrics.throughput = recentJobs.length / 60;
    
    return {
      ...this.metrics,
      activeJobs: this.activeJobs.size,
      totalSubtasks: Array.from(this.jobs.values())
        .reduce((sum, job) => sum + job.subtasks.length, 0)
    };
  }

  /**
   * Clear completed jobs (cleanup)
   */
  clearCompleted() {
    let cleared = 0;
    for (const [jobId, job] of this.jobs) {
      if (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED) {
        this.jobs.delete(jobId);
        cleared++;
      }
    }
    console.log(`🗑️ Cleared ${cleared} completed job(s)`);
    return cleared;
  }
}

// Export for Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    JobType,
    JobStatus,
    ComputeJob,
    DistributedCompute
  };
}

// Browser global
if (typeof window !== 'undefined') {
  window.JobType = JobType;
  window.JobStatus = JobStatus;
  window.ComputeJob = ComputeJob;
  window.DistributedCompute = DistributedCompute;
}

console.log('✅ Distributed Compute Engine loaded');
