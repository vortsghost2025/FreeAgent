/**
 * Chunked Processing Service - Large dataset handling
 * Process large datasets in manageable chunks to avoid memory issues
 */

class ChunkedProcessingService {
  constructor(options = {}) {
    this.name = 'chunked';
    this.enabled = false;
    this.defaultChunkSize = options.defaultChunkSize || 100;
    this.maxChunkSize = options.maxChunkSize || 1000;
    this.processingQueue = new Map();
  }

  // Split data into chunks
  chunkArray(data, chunkSize = null) {
    const size = chunkSize || this.defaultChunkSize;
    const chunks = [];
    for (let i = 0; i < data.length; i += size) {
      chunks.push(data.slice(i, i + size));
    }
    return chunks;
  }

  // Process data in chunks with a callback
  async processInChunks(data, processor, options = {}) {
    const chunkSize = Math.min(options.chunkSize || this.defaultChunkSize, this.maxChunkSize);
    const chunks = this.chunkArray(data, chunkSize);
    const results = [];
    const errors = [];
    
    const jobId = `job_${Date.now()}`;
    this.processingQueue.set(jobId, { total: chunks.length, completed: 0, status: 'running' });

    for (let i = 0; i < chunks.length; i++) {
      // Check if job was cancelled
      const job = this.processingQueue.get(jobId);
      if (job && job.status === 'cancelled') {
        break;
      }

      try {
        const result = await processor(chunks[i], i, chunks.length);
        results.push({ chunkIndex: i, success: true, result });
        this.processingQueue.set(jobId, { ...job, completed: i + 1 });
      } catch (err) {
        errors.push({ chunkIndex: i, error: err.message });
        if (options.stopOnError) {
          break;
        }
      }
    }

    const finalJob = this.processingQueue.get(jobId);
    if (finalJob) {
      finalJob.status = 'completed';
    }

    return {
      jobId,
      totalChunks: chunks.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors
    };
  }

  // Process a large file in chunks
  async processFile(filePath, lineProcessor, options = {}) {
    const fs = require('fs');
    const readline = require('readline');
    
    return new Promise((resolve, reject) => {
      const results = [];
      const errors = [];
      let chunkIndex = 0;
      let currentChunk = [];
      const chunkSize = options.chunkSize || this.defaultChunkSize;
      
      const jobId = `file_${Date.now()}`;
      this.processingQueue.set(jobId, { filePath, total: -1, completed: 0, status: 'running' });

      const rl = readline.createInterface({
        input: fs.createReadStream(filePath),
        crlfDelay: Infinity
      });

      rl.on('line', async (line) => {
        currentChunk.push(line);
        
        if (currentChunk.length >= chunkSize) {
          rl.pause();
          try {
            const result = await lineProcessor(currentChunk, chunkIndex);
            results.push({ chunkIndex, success: true, lines: currentChunk.length });
          } catch (err) {
            errors.push({ chunkIndex, error: err.message });
          }
          chunkIndex++;
          currentChunk = [];
          rl.resume();
        }
      });

      rl.on('close', async () => {
        // Process remaining lines
        if (currentChunk.length > 0) {
          try {
            const result = await lineProcessor(currentChunk, chunkIndex);
            results.push({ chunkIndex, success: true, lines: currentChunk.length });
          } catch (err) {
            errors.push({ chunkIndex, error: err.message });
          }
        }
        
        this.processingQueue.set(jobId, { ...this.processingQueue.get(jobId), status: 'completed' });
        resolve({ jobId, successful: results.length, failed: errors.length, results, errors });
      });

      rl.on('error', (err) => {
        this.processingQueue.set(jobId, { ...this.processingQueue.get(jobId), status: 'error' });
        reject(err);
      });
    });
  }

  // Get job status
  getJobStatus(jobId) {
    return this.processingQueue.get(jobId) || null;
  }

  // Cancel a job
  cancelJob(jobId) {
    const job = this.processingQueue.get(jobId);
    if (job) {
      job.status = 'cancelled';
      return { success: true, jobId };
    }
    return { success: false, error: 'Job not found' };
  }

  // List all jobs
  listJobs() {
    const jobs = [];
    for (const [id, job] of this.processingQueue) {
      jobs.push({ id, ...job });
    }
    return { success: true, count: jobs.length, jobs };
  }
}

// Factory function
function createChunkedProcessor(options) {
  return new ChunkedProcessingService(options);
}

module.exports = { ChunkedProcessingService, createChunkedProcessor };
