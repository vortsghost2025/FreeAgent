/**
 * Distributed Compute Engine - Evolution/Phase 7 ISOLATED
 *
 * PURPOSE: Isolated compute for Phase 7 Autonomous Evolution
 * - Lower concurrency to prevent overload
 * - Separate from Genomics/Medical compute
 * - Dedicated to evolution cycles
 *
 * ISOLATION: Uses separate job IDs and metrics
 * SAFETY: Reduced chunk size and timeout defaults
 */

// JOB TYPES
const JobTypeEvolution = {
  MAP_REDUCE: 'map-reduce',
  PIPELINE: 'pipeline',
  BATCH: 'batch',
  PARALLEL: 'parallel',
  TRANSFORM: 'transform'
};

const JobStatusEvolution = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

/**
 * Compute Job - Represents a distributed computation
 */
class ComputeJobEvolution {
  constructor(id, type, config) {
    this.id = id;
    this.type = type;
    this.config = config;
    this.status = JobStatusEvolution.PENDING;
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
    this.status = JobStatusEvolution.RUNNING;
    this.startedAt = Date.now();
  }

  complete(result) {
    this.status = JobStatusEvolution.COMPLETED;
    this.completedAt = Date.now();
    this.result = result;
    this.progress = 100;
  }

  fail(error) {
    this.status = JobStatusEvolution.FAILED;
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
 * ISOLATED Compute Engine for Evolution/Phase 7
 *
 * DIFFERENCES FROM SHARED COMPUTE:
 * 1. Lower default chunk size (5 vs 10)
 * 2. Lower default batch size (5 vs 10)
 * 3. Longer default timeout (90000 vs 60000)
 * 4. Separate job ID prefix (ev- vs mr-/pipe-/batch-)
 * 5. Separate metrics tracking
 */
class DistributedComputeEvolution {
  constructor(swarmCoordinator, taskQueue) {
    this.swarmCoordinator = swarmCoordinator;
    this.taskQueue = taskQueue;

    this.jobs = new Map(); // jobId -> ComputeJob
    this.activeJobs = new Set();
    this.jobIdCounter = 0;

    // Compute functions registry
    this.functions = new Map(); // name -> function

    // Metrics (isolated)
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

    // ISOLATION SETTINGS
    this.isolatedPrefix = 'ev-'; // Unique prefix for evolution jobs
    this.defaultChunks = 5; // Lower than shared (10)
    this.defaultBatchSize = 5; // Lower than shared (10)
    this.defaultTimeout = 90000; // Longer than shared (60000ms)

    console.log('✅ ISOLATED Evolution Compute Engine initialized (Phase 7)');
  }

  /**
   * Register a compute function
   */
  registerFunction(name, fn) {
    this.functions.set(name, fn);
    console.log(`[EVOL] 📝 Registered compute function: ${name}`);
  }

  /**
   * Submit a Map/Reduce job (ISOLATED)
   */
  async submitMapReduce(input, mapFn, reduceFn, options = {}) {
    const jobId = `${this.isolatedPrefix}mr-${this.jobIdCounter++}`;
    const job = new ComputeJobEvolution(jobId, JobTypeEvolution.MAP_REDUCE, {
      input,
      mapFn,
      reduceFn,
      chunks: options.chunks || this.defaultChunks,
      timeout: options.timeout || this.defaultTimeout
    });

    this.jobs.set(jobId, job);
    this.activeJobs.add(jobId);
    this.metrics.totalJobs++;

    console.log(`[EVOL] 🚀 Starting Map/Reduce job ${jobId} with ${input.length} items (isolated)`);

    try {
      job.start();

      // Split input into chunks (smaller chunks for isolation)
      const chunkSize = Math.ceil(input.length / job.config.chunks);
      const chunks = [];
      for (let i = 0; i < input.length; i += chunkSize) {
        chunks.push(input.slice(i, i + chunkSize));
      }

      job.subtasks = chunks.map((chunk, idx) => ({ id: idx, chunk, status: 'pending' }));

      // Map phase: Distribute chunks to worker agents
      console.log(`[EVOL] 📊 Map phase: ${chunks.length} chunks (isolated)`);
      const mapResults = await this._executeMapPhase(job, chunks, mapFn);

      job.updateProgress(chunks.length, chunks.length);

      // Reduce phase: Aggregate results
      console.log(`[EVOL] 🔄 Reduce phase: aggregating ${mapResults.length} results (isolated)`);
      const finalResult = await this._executeReducePhase(job, mapResults, reduceFn);

      job.complete(finalResult);
      this.metrics.completedJobs++;
      this.activeJobs.delete(jobId);

      console.log(`[EVOL] ✅ Map/Reduce job ${jobId} completed in ${job.getDuration()}ms (isolated)`);

      if (this.onJobComplete) {
        this.onJobComplete(job);
      }

      return finalResult;

    } catch (error) {
      job.fail(error.message);
      this.metrics.failedJobs++;
      this.activeJobs.delete(jobId);

      console.error(`[EVOL] ❌ Map/Reduce job ${jobId} failed (isolated):`, error);

      if (this.onJobFailed) {
        this.onJobFailed(job);
      }

      throw error;
    }
  }

  /**
   * Execute map phase across workers (ISOLATED)
   */
  async _executeMapPhase(job, chunks, mapFn) {
    const mapPromises = chunks.map(async (chunk, idx) => {
      const task = {
        id: `${job.id}-map-${idx}`,
        type: 'map-evolution', // Different task type for isolation
        status: 'pending',
        data: { chunk, mapFn: mapFn.toString() },
        priority: job.config.priority || 0,
        timeout: job.config.timeout
      };

      this.taskQueue.addTask(task);

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

        setTimeout(() => {
          clearInterval(checkInterval);
          if (job.subtasks[idx].status === 'pending') {
            reject(new Error('Map task timeout (isolated engine)'));
          }
        }, task.timeout);
      });
    });

    return Promise.all(mapPromises);
  }

  /**
   * Execute reduce phase (ISOLATED)
   */
  async _executeReducePhase(job, mapResults, reduceFn) {
    const task = {
      id: `${job.id}-reduce`,
      type: 'reduce-evolution', // Different task type for isolation
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
        reject(new Error('Reduce task timeout (isolated engine)'));
      }, task.timeout);
    });
  }

  /**
   * Submit a Pipeline job (multi-stage processing) - ISOLATED
   */
  async submitPipeline(input, stages, options = {}) {
    const jobId = `${this.isolatedPrefix}pipe-${this.jobIdCounter++}`;
    const job = new ComputeJobEvolution(jobId, JobTypeEvolution.PIPELINE, {
      input,
      stages,
      parallel: options.parallel || false,
      timeout: options.timeout || this.defaultTimeout
    });

    this.jobs.set(jobId, job);
    this.activeJobs.add(jobId);
    this.metrics.totalJobs++;

    console.log(`[EVOL] 🚀 Starting Pipeline job ${jobId} with ${stages.length} stages (isolated)`);

    try {
      job.start();
      job.subtasks = stages.map((stage, idx) => ({ id: idx, stage: stage.name, status: 'pending' }));

      let currentData = input;

      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        console.log(`[EVOL] 📊 Pipeline stage ${i + 1}/${stages.length}: ${stage.name} (isolated)`);

        job.subtasks[i].status = 'running';

        if (stage.parallel && Array.isArray(currentData)) {
          const tasks = currentData.map((item, idx) => ({
            id: `${job.id}-stage${i}-${idx}`,
            type: 'pipeline-evolution-stage', // Isolated task type
            status: 'pending',
            data: { item, stageFn: stage.fn.toString() },
            priority: job.config.priority || 0
          }));

          tasks.forEach(task => this.taskQueue.addTask(task));

          currentData = await Promise.all(
            tasks.map(task => this._waitForTask(task.id, stage.timeout || job.config.timeout))
          );
        } else {
          const task = {
            id: `${job.id}-stage${i}`,
            type: 'pipeline-evolution-stage',
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

      console.log(`[EVOL] ✅ Pipeline job ${jobId} completed in ${job.getDuration()}ms (isolated)`);

      if (this.onJobComplete) {
        this.onJobComplete(job);
      }

      return currentData;

    } catch (error) {
      job.fail(error.message);
      this.metrics.failedJobs++;
      this.activeJobs.delete(jobId);

      console.error(`[EVOL] ❌ Pipeline job ${jobId} failed (isolated):`, error);

      if (this.onJobFailed) {
        this.onJobFailed(job);
      }

      throw error;
    }
  }

  /**
   * Submit a Batch job (process multiple items in parallel) - ISOLATED
   */
  async submitBatch(items, processFn, options = {}) {
    const jobId = `${this.isolatedPrefix}batch-${this.jobIdCounter++}`;
    const job = new ComputeJobEvolution(jobId, JobTypeEvolution.BATCH, {
      items,
      processFn,
      batchSize: options.batchSize || this.defaultBatchSize,
      timeout: options.timeout || this.defaultTimeout
    });

    this.jobs.set(jobId, job);
    this.activeJobs.add(jobId);
    this.metrics.totalJobs++;

    console.log(`[EVOL] 🚀 Starting Batch job ${jobId} with ${items.length} items (isolated)`);

    try {
      job.start();

      const batchSize = job.config.batchSize;
      const batches = [];
      for (let i = 0; i < items.length; i += batchSize) {
        batches.push(items.slice(i, i + batchSize));
      }

      job.subtasks = batches.map((batch, idx) => ({ id: idx, batch, status: 'pending' }));

      const results = [];
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        job.subtasks[i].status = 'running';

        const tasks = batch.map((item, idx) => ({
          id: `${job.id}-batch${i}-${idx}`,
          type: 'batch-evolution-item', // Isolated task type
          status: 'pending',
          data: { item, processFn: processFn.toString() },
          priority: job.config.priority || 0
        }));

        tasks.forEach(task => this.taskQueue.addTask(task));

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

      console.log(`[EVOL] ✅ Batch job ${jobId} completed in ${job.getDuration()}ms (isolated)`);

      if (this.onJobComplete) {
        this.onJobComplete(job);
      }

      return results;

    } catch (error) {
      job.fail(error.message);
      this.metrics.failedJobs++;
      this.activeJobs.delete(jobId);

      console.error(`[EVOL] ❌ Batch job ${jobId} failed (isolated):`, error);

      if (this.onJobFailed) {
        this.onJobFailed(job);
      }

      throw error;
    }
  }

  /**
   * Submit a Parallel Transform job - ISOLATED
   */
  async submitTransform(input, transformFn, options = {}) {
    const jobId = `${this.isolatedPrefix}transform-${this.jobIdCounter++}`;
    const job = new ComputeJobEvolution(jobId, JobTypeEvolution.TRANSFORM, {
      input,
      transformFn,
      chunks: options.chunks || this.defaultChunks,
      timeout: options.timeout || this.defaultTimeout
    });

    this.jobs.set(jobId, job);
    this.activeJobs.add(jobId);
    this.metrics.totalJobs++;

    console.log(`[EVOL] 🚀 Starting Transform job ${jobId} (isolated)`);

    try {
      job.start();

      if (Array.isArray(input)) {
        const chunkSize = Math.ceil(input.length / job.config.chunks);
        const chunks = [];
        for (let i = 0; i < input.length; i += chunkSize) {
          chunks.push(input.slice(i, i + chunkSize));
        }

        job.subtasks = chunks.map((chunk, idx) => ({ id: idx, chunk, status: 'pending' }));

        const tasks = chunks.map((chunk, idx) => ({
          id: `${job.id}-chunk-${idx}`,
          type: 'transform-evolution', // Isolated task type
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

        const finalResult = results.flat();
        job.complete(finalResult);
      } else {
        const task = {
          id: `${job.id}-single`,
          type: 'transform-evolution',
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

      console.log(`[EVOL] ✅ Transform job ${jobId} completed in ${job.getDuration()}ms (isolated)`);

      if (this.onJobComplete) {
        this.onJobComplete(job);
      }

      return job.result;

    } catch (error) {
      job.fail(error.message);
      this.metrics.failedJobs++;
      this.activeJobs.delete(jobId);

      console.error(`[EVOL] ❌ Transform job ${jobId} failed (isolated):`, error);

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
        reject(new Error(`Task ${taskId} timeout (isolated engine)`));
      }, timeout);
    });
  }

  /**
   * Cancel a job
   */
  cancelJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) {
      console.warn(`[EVOL] Job ${jobId} not found`);
      return false;
    }

    if (job.status === JobStatusEvolution.COMPLETED || job.status === JobStatusEvolution.FAILED) {
      console.warn(`[EVOL] Job ${jobId} already ${job.status}`);
      return false;
    }

    job.status = JobStatusEvolution.CANCELLED;
    this.activeJobs.delete(jobId);

    console.log(`[EVOL] 🛑 Job ${jobId} cancelled (isolated)`);
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
   * Get metrics (ISOLATED)
   */
  getMetrics() {
    const completedJobs = Array.from(this.jobs.values())
      .filter(job => job.status === JobStatusEvolution.COMPLETED);

    if (completedJobs.length > 0) {
      const totalLatency = completedJobs.reduce((sum, job) => sum + job.getDuration(), 0);
      this.metrics.averageLatency = Math.round(totalLatency / completedJobs.length);
    }

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
      if (job.status === JobStatusEvolution.COMPLETED || job.status === JobStatusEvolution.FAILED) {
        this.jobs.delete(jobId);
        cleared++;
      }
    }
    console.log(`[EVOL] 🗑️ Cleared ${cleared} completed job(s) (isolated)`);
    return cleared;
  }
}

// Export for Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    JobTypeEvolution,
    JobStatusEvolution,
    ComputeJobEvolution,
    DistributedComputeEvolution
  };
}

// Browser global
if (typeof window !== 'undefined') {
  window.JobTypeEvolution = JobTypeEvolution;
  window.JobStatusEvolution = JobStatusEvolution;
  window.ComputeJobEvolution = ComputeJobEvolution;
  window.DistributedComputeEvolution = DistributedComputeEvolution;
}

console.log('✅ ISOLATED Evolution Compute Engine loaded (Phase 7)');
