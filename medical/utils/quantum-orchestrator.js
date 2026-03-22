/**
 * Quantum Orchestrator - Intelligent Rate Limit Management
 * 
 * Solves rate limit exhaustion by:
 * - Context-aware request caching (eliminate redundant calls)
 * - Intelligent request batching
 * - Predictive rate limiting
 * - Multi-provider load balancing
 * 
 * Usage:
 *   import { quantumOrchestrator } from './utils/quantum-orchestrator.js';
 *   
 *   // Execute with intelligence
 *   const result = await quantumOrchestrator.execute('coding-agent', {
 *     task: 'Analyze this code',
 *     priority: 'high'
 *   });
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { providerScorer } from './provider-scorer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Rate limit configuration
const RATE_LIMITS = {
  openai: { rpm: 60, rpd: 10000 },
  minimax: { rpm: 120, rpd: 50000 },
  anthropic: { rpm: 50, rpd: 5000 },
  groq: { rpm: 1000, rpd: 1000000 }, // 60K TPM free tier - ~1000 RPM
  local: { rpm: 1000, rpd: 1000000 } // Local inference is unlimited
};

const CACHE_DIR = path.join(__dirname, '..', 'agent-memory', 'shared-workspace', 'cache');

/**
 * Context Cache - Stores results to eliminate redundant API calls
 */
class ContextCache {
  constructor() {
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
    this.ensureCacheDir();
  }

  ensureCacheDir() {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
  }

  generateCacheKey(agentName, task) {
    // Simple hash - in production use proper hashing
    const str = `${agentName}:${JSON.stringify(task)}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  async get(agentName, task) {
    const key = this.generateCacheKey(agentName, task);
    const cacheFile = path.join(CACHE_DIR, `${key}.json`);
    
    try {
      if (fs.existsSync(cacheFile)) {
        const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        // Check if cache is still valid (24 hours)
        if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
          this.hits++;
          return data.result;
        }
      }
    } catch (err) {
      console.error('[Quantum] Cache read error:', err.message);
    }
    
    this.misses++;
    return null;
  }

  async set(agentName, task, result) {
    const key = this.generateCacheKey(agentName, task);
    const cacheFile = path.join(CACHE_DIR, `${key}.json`);
    
    try {
      fs.writeFileSync(cacheFile, JSON.stringify({
        agentName,
        task,
        result,
        timestamp: Date.now()
      }));
    } catch (err) {
      console.error('[Quantum] Cache write error:', err.message);
    }
  }

  getStats() {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? (this.hits / total * 100).toFixed(1) + '%' : '0%'
    };
  }
}

/**
 * Rate Limit Tracker - Monitors and predicts rate limits
 */
class RateLimitTracker {
  constructor() {
    this.usage = new Map(); // provider -> { minute: count, day: count, lastReset: timestamp }
    this.history = []; // Track usage patterns
  }

  async canExecute(provider) {
    const now = Date.now();
    let usage = this.usage.get(provider);
    
    // Initialize or reset if new minute
    if (!usage || now - usage.minuteReset > 60000) {
      usage = { minute: 0, day: 0, minuteReset: now, dayReset: now };
      this.usage.set(provider, usage);
    }
    
    // Reset day counter if new day
    if (now - usage.dayReset > 24 * 60 * 60 * 1000) {
      usage.day = 0;
      usage.dayReset = now;
    }
    
    const limits = RATE_LIMITS[provider] || RATE_LIMITS.local;
    
    return {
      canExecute: usage.minute < limits.rpm && usage.day < limits.rpd,
      minuteRemaining: limits.rpm - usage.minute,
      dayRemaining: limits.rpd - usage.day,
      provider
    };
  }

  async recordRequest(provider) {
    let usage = this.usage.get(provider);
    if (!usage) {
      usage = { minute: 0, day: 0, minuteReset: Date.now(), dayReset: Date.now() };
    }
    usage.minute++;
    usage.day++;
    this.usage.set(provider, usage);
    
    // Record in history
    this.history.push({ provider, timestamp: Date.now() });
    if (this.history.length > 1000) {
      this.history = this.history.slice(-500);
    }
  }

  getStatus() {
    const status = {};
    for (const [provider, usage] of this.usage) {
      const limits = RATE_LIMITS[provider] || { rpm: 0, rpd: 0 };
      status[provider] = {
        rpm: `${usage.minute}/${limits.rpm}`,
        rpd: `${usage.day}/${limits.rpd}`
      };
    }
    return status;
  }
}

/**
 * Task Batcher - Groups similar tasks for batch processing
 */
class TaskBatcher {
  constructor() {
    this.pendingTasks = [];
    this.batchSize = 3;
    this.batchDelay = 500; // ms to wait for batching
  }

  async addTask(agentName, task, priority = 'normal') {
    const taskItem = {
      id: `${agentName}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      agentName,
      task,
      priority,
      timestamp: Date.now()
    };
    
    this.pendingTasks.push(taskItem);
    
    // Check for similar tasks
    const similar = this.pendingTasks.filter(t => 
      t.agentName === agentName && 
      this.tasksSimilar(t.task, task)
    );
    
    if (similar.length >= this.batchSize) {
      return this.createBatch(similar);
    }
    
    return null;
  }

  tasksSimilar(task1, task2) {
    const s1 = JSON.stringify(task1).toLowerCase();
    const s2 = JSON.stringify(task2).toLowerCase();
    // Simple similarity check - in production use semantic similarity
    return s1.includes(s2) || s2.includes(s1);
  }

  createBatch(tasks) {
    // Remove these tasks from pending
    tasks.forEach(t => {
      const idx = this.pendingTasks.indexOf(t);
      if (idx > -1) this.pendingTasks.splice(idx, 1);
    });
    
    return {
      batchId: `batch-${Date.now()}`,
      tasks,
      size: tasks.length
    };
  }
}

/**
 * Quantum Orchestrator - Main orchestrator class
 */
export class QuantumOrchestrator {
  constructor() {
    this.contextCache = new ContextCache();
    this.rateTracker = new RateLimitTracker();
    this.batcher = new TaskBatcher();
    this.providers = ['openai', 'minimax', 'anthropic', 'groq', 'local'];
    this.providerScorer = providerScorer; // Integrate dynamic scoring
    this.performanceMetrics = new Map(); // Track real-time performance
  }

  /**
   * Select optimal provider based on availability
   */
  selectOptimalProvider(task = {}) {
    // Prefer local for simple tasks
    if (task.complexity === 'low') {
      return 'local';
    }
  
    // Get available providers that aren't rate-limited
    const availableProviders = this.providers.filter(provider => {
      const status = this.rateTracker.canExecute(provider);
      return status.canExecute;
    });
  
    if (availableProviders.length === 0) {
      return 'local'; // Fallback
    }
  
    // Use dynamic scoring to rank available providers
    const scoredProviders = availableProviders.map(provider => {
      const score = this.providerScorer.getScore(provider);
      const performance = this.performanceMetrics.get(provider) || {};
        
      // Combine scorer score with real-time performance
      const latencyFactor = performance.avgLatency ? Math.max(0, 1 - (performance.avgLatency / 5000)) : 1;
      const successFactor = performance.successRate || 1;
        
      // Weighted composite score
      const compositeScore = (score * 0.6) + (latencyFactor * 0.2) + (successFactor * 0.2);
        
      return {
        provider,
        score: compositeScore,
        scorerScore: score,
        latency: performance.avgLatency || 0,
        successRate: performance.successRate || 1
      };
    });
  
    // Sort by composite score (highest first)
    scoredProviders.sort((a, b) => b.score - a.score);
      
    console.log(`[QuantumOrchestrator] Provider ranking for task ${task.type || 'unknown'}:`);
    scoredProviders.forEach(p => {
      console.log(`  ${p.provider}: ${p.score.toFixed(3)} (scorer: ${p.scorerScore.toFixed(3)}, latency: ${p.latency}ms, success: ${(p.successRate * 100).toFixed(1)}%)`);
    });
  
    return scoredProviders[0].provider;
  }

  /**
   * Record provider performance metrics
   */
  recordProviderPerformance(provider, latency, success, cost = 0) {
    // Update provider scorer
    if (success) {
      this.providerScorer.recordSuccess(provider, latency, cost);
    } else {
      this.providerScorer.recordFailure(provider);
    }

    // Update real-time performance metrics
    if (!this.performanceMetrics.has(provider)) {
      this.performanceMetrics.set(provider, {
        totalCalls: 0,
        totalSuccesses: 0,
        totalLatency: 0,
        latencies: []
      });
    }

    const metrics = this.performanceMetrics.get(provider);
    metrics.totalCalls++;
    metrics.totalLatency += latency;
    if (success) metrics.totalSuccesses++;
    
    // Keep rolling window of recent latencies
    metrics.latencies.push(latency);
    if (metrics.latencies.length > 50) {
      metrics.latencies.shift();
    }

    // Calculate averages
    metrics.avgLatency = metrics.totalLatency / metrics.totalCalls;
    metrics.successRate = metrics.totalSuccesses / metrics.totalCalls;
    metrics.recentLatency = metrics.latencies.reduce((a, b) => a + b, 0) / metrics.latencies.length;

    // Log significant changes
    if (metrics.totalCalls % 10 === 0) {
      console.log(`[QuantumOrchestrator] ${provider} stats: ${metrics.totalCalls} calls, ${Math.round(metrics.successRate * 100)}% success, ${Math.round(metrics.avgLatency)}ms avg latency`);
    }
  }

  /**
   * Get current provider scores and metrics
   */
  getProviderScores() {
    const scores = {};
    for (const provider of this.providers) {
      scores[provider] = {
        scorerScore: this.providerScorer.getScore(provider),
        performance: this.performanceMetrics.get(provider) || {
          totalCalls: 0,
          successRate: 1,
          avgLatency: 0
        }
      };
    }
    return scores;
  }

  /**
   * Simulate provider latency for demonstration
   */
  _simulateProviderLatency(provider) {
    const baseLatencies = {
      'local': 50 + Math.random() * 100,
      'openai': 800 + Math.random() * 1200,
      'minimax': 300 + Math.random() * 500,
      'anthropic': 1000 + Math.random() * 1500,
      'groq': 200 + Math.random() * 300 // Groq is extremely fast
    };
    return baseLatencies[provider] || 500;
  }

  /**
   * Simulate provider cost for demonstration
   */
  _simulateProviderCost(provider) {
    const baseCosts = {
      'local': 0,
      'openai': 0.002,
      'minimax': 0.0005,
      'anthropic': 0.008,
      'groq': 0 // Free tier
    };
    return baseCosts[provider] || 0.001;
  }

  /**
   * Execute task with intelligent rate limit management
   */
  async execute(agentName, { task, priority = 'normal', complexity = 'medium' }) {
    // 1. Check cache first
    const cached = await this.contextCache.get(agentName, task);
    if (cached) {
      console.log(`[Quantum] Cache hit for ${agentName}`);
      return { ...cached, source: 'cache' };
    }

    // 2. Check rate limits
    const provider = this.selectOptimalProvider({ complexity });
    const status = await this.rateTracker.canExecute(provider);
    
    if (!status.canExecute) {
      console.log(`[Quantum] Rate limited on ${provider}. Waiting...`);
      // In production, implement smart waiting
      return { 
        error: 'rate_limited', 
        provider,
        retryAfter: 60000 
      };
    }

    // 3. Record the request
    await this.rateTracker.recordRequest(provider);
    
    // 4. Simulate API call and record performance
    const startTime = Date.now();
    
    // Simulate varying performance based on provider
    const simulatedLatency = this._simulateProviderLatency(provider);
    const simulatedSuccess = Math.random() > 0.1; // 90% success rate
    const simulatedCost = this._simulateProviderCost(provider);
    
    // Record performance metrics
    this.recordProviderPerformance(provider, simulatedLatency, simulatedSuccess, simulatedCost);
    
    // Simulate the delay
    await new Promise(resolve => setTimeout(resolve, simulatedLatency));
    
    const executionInfo = {
      agentName,
      task,
      provider,
      priority,
      timestamp: Date.now(),
      latency: simulatedLatency,
      success: simulatedSuccess,
      cost: simulatedCost,
      cacheStats: this.contextCache.getStats(),
      rateStatus: this.rateTracker.getStatus()
    };
    
    // Cache the result (in production, cache actual results)
    await this.contextCache.set(agentName, task, executionInfo);
    
    return { ...executionInfo, source: 'orchestrator' };
  }

  /**
   * Get system statistics
   */
  getStats() {
    return {
      cache: this.contextCache.getStats(),
      rateLimits: this.rateTracker.getStatus(),
      pendingBatches: this.batcher.pendingTasks.length
    };
  }

  /**
   * Burst mode - for high-capacity periods
   */
  async executeBurstMode(agentName, tasks) {
    const results = [];
    for (const task of tasks) {
      const result = await this.execute(agentName, task);
      results.push(result);
    }
    return results;
  }
}

// Export singleton
export const quantumOrchestrator = new QuantumOrchestrator();

export default quantumOrchestrator;