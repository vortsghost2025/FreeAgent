/**
 * RATE-LIMIT OPTIMIZED AGENT ROUTING STRATEGY
 * Implements caching, batching, and provider balancing to minimize rate limits
 * OPTIMIZED FOR LOW-RESOURCE ENVIRONMENTS (≤4GB RAM, Single Core CPU)
 */

import fs from 'fs';
import path from 'path';
import { tmpdir } from 'os';

class RateLimitOptimizer {
  constructor() {
    // Use file-based cache instead of pure memory to prevent OOM
    this.cacheDir = path.join(tmpdir(), 'medical-cache');
    this.ensureCacheDirExists();
    
    this.providerUsage = {}; // Track usage per provider
    this.agentCallCounts = {}; // Track calls per agent
    this.lastRequestTime = {}; // Track last request time per provider
    this.batches = {}; // Pending batches
    this.batchTimeouts = {}; // Batch timeouts
    this.BATCH_WINDOW_MS = 300; // Fixed delay (100-300ms) to reduce CPU overhead
    this.CACHE_TTL_MS = 300000; // 5 minutes cache TTL
  }

  /**
   * Ensure cache directory exists
   */
  ensureCacheDirExists() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Get cache file path for a key
   */
  getCacheFilePath(key) {
    return path.join(this.cacheDir, `${key}.json`);
  }

  /**
   * Check if request is cached (using file system)
   */
  getCachedResult(key) {
    const cachePath = this.getCacheFilePath(key);
    
    try {
      if (fs.existsSync(cachePath)) {
        const data = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
        if (Date.now() - data.timestamp < this.CACHE_TTL_MS) {
          return data.result;
        } else {
          // Remove expired entry
          fs.unlinkSync(cachePath);
        }
      }
    } catch (error) {
      // If there's an error reading the cache, continue without it
      console.warn(`Cache read error for key ${key}:`, error.message);
    }
    
    return null;
  }

  /**
   * Store result in cache (using file system)
   */
  setCachedResult(key, result) {
    try {
      const cachePath = this.getCacheFilePath(key);
      const cacheData = {
        result,
        timestamp: Date.now()
      };
      
      fs.writeFileSync(cachePath, JSON.stringify(cacheData));
    } catch (error) {
      // If there's an error writing to cache, continue without it
      console.warn(`Cache write error for key ${key}:`, error.message);
    }
  }

  /**
   * Clean up expired cache files
   */
  cleanupExpiredCache() {
    try {
      const files = fs.readdirSync(this.cacheDir);
      const now = Date.now();
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.cacheDir, file);
          const stat = fs.statSync(filePath);
          
          if (now - stat.mtimeMs > this.CACHE_TTL_MS) {
            fs.unlinkSync(filePath);
          }
        }
      }
    } catch (error) {
      console.warn('Cache cleanup error:', error.message);
    }
  }

  /**
   * Get provider with lowest recent usage
   */
  selectOptimalProvider(availableProviders, taskType) {
    // Initialize provider tracking if needed
    for (const provider of availableProviders) {
      if (!this.providerUsage[provider]) {
        this.providerUsage[provider] = {
          count: 0,
          lastUsed: 0,
          queue: []
        };
      }
    }

    // Find provider with lowest usage in the last minute
    const now = Date.now();
    const eligibleProviders = availableProviders
      .map(provider => {
        const stats = this.providerUsage[provider];
        // Count requests in last minute
        const recentRequests = stats.queue.filter(time => now - time < 60000).length;
        return { provider, recentRequests, lastUsed: stats.lastUsed };
      })
      .sort((a, b) => {
        // Primary sort: by recent request count
        if (a.recentRequests !== b.recentRequests) {
          return a.recentRequests - b.recentRequests;
        }
        // Secondary sort: by last used time (LRU)
        return a.lastUsed - b.lastUsed;
      });

    const bestProvider = eligibleProviders[0].provider;
    
    // Update usage stats
    this.providerUsage[bestProvider].count++;
    this.providerUsage[bestProvider].lastUsed = now;
    this.providerUsage[bestProvider].queue.push(now);
    
    // Clean old entries
    this.providerUsage[bestProvider].queue = 
      this.providerUsage[bestProvider].queue.filter(time => now - time < 60000);

    return bestProvider;
  }

  /**
   * Add request to batch if possible, otherwise return direct execution flag
   */
  addToBatch(task, agentId, callback) {
    const batchKey = `${agentId}_${Math.floor(Date.now() / this.BATCH_WINDOW_MS)}`;
    
    if (!this.batches[batchKey]) {
      this.batches[batchKey] = [];
      
      // Set timeout to process batch (fixed delay to reduce CPU overhead)
      this.batchTimeouts[batchKey] = setTimeout(() => {
        this.processBatch(batchKey, callback);
      }, this.BATCH_WINDOW_MS);
    }
    
    this.batches[batchKey].push(task);
    
    // Return true if caller should wait for batch processing
    return true;
  }

  /**
   * Process a batch of requests
   */
  async processBatch(batchKey, callback) {
    const tasks = this.batches[batchKey] || [];
    delete this.batches[batchKey];
    if (this.batchTimeouts[batchKey]) {
      clearTimeout(this.batchTimeouts[batchKey]);
      delete this.batchTimeouts[batchKey];
    }
    
    if (tasks.length === 0) return;

    // Execute all tasks in the batch
    const results = await Promise.all(
      tasks.map(task => callback(task))
    );
    
    return results;
  }

  /**
   * Apply fixed backoff for rate-limited providers (reduces CPU overhead)
   */
  applyBackoff(provider, error) {
    if (error && error.message.includes('rate limit')) {
      // Use fixed backoff delay instead of dynamic calculation
      const FIXED_BACKOFF = 3000; // Fixed 3 second delay to reduce CPU overhead
      this.providerUsage[provider].backoffUntil = Date.now() + FIXED_BACKOFF;
      
      // Keep the same backoff for subsequent errors (fixed delays)
      this.providerUsage[provider].backoffPeriod = FIXED_BACKOFF;
    }
  }

  /**
   * Check if provider is currently in backoff state
   */
  isProviderAvailable(provider) {
    const stats = this.providerUsage[provider];
    if (!stats || !stats.backoffUntil) return true;
    return Date.now() > stats.backoffUntil;
  }

  /**
   * Get rate limit status for monitoring
   */
  getStatus() {
    const now = Date.now();
    const status = {};
    
    for (const [provider, stats] of Object.entries(this.providerUsage)) {
      const recentRequests = stats.queue.filter(time => now - time < 60000).length;
      status[provider] = {
        recentRequests,
        isAvailable: this.isProviderAvailable(provider),
        backoffRemaining: stats.backoffUntil ? Math.max(0, stats.backoffUntil - now) : 0
      };
    }
    
    return status;
  }
}

export default RateLimitOptimizer;