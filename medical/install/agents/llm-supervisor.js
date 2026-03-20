/**
 * LLM Supervisor - Single LLM orchestrator to prevent resource contention
 * Runs only one LLM locally while delegating all other work to workers
 */

import SharedApiClient from './shared-api-client.js';
import { EventEmitter } from 'events';

class LLMSupervisor extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      primaryLLM: config.primaryLLM || 'lingam', // Only run this LLM locally
      maxTokensPerMinute: config.maxTokensPerMinute || 10000,
      maxRequestsPerMinute: config.maxRequestsPerMinute || 60,
      cacheEnabled: true,
      ...config
    };
    
    this.apiClient = new SharedApiClient({
      llmConcurrency: 1, // Only ONE LLM call at a time
      cacheEnabled: true,
      cacheTtl: 300000
    });
    
    this.isProcessing = false;
    this.requestQueue = [];
    this.stats = {
      totalRequests: 0,
      processedRequests: 0,
      queuedRequests: 0,
      cacheHits: 0,
      avgResponseTime: 0
    };
  }

  async processLLMRequest(prompt, options = {}) {
    this.stats.totalRequests++;
    
    // Add to queue with priority
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        prompt,
        options,
        resolve,
        reject,
        timestamp: Date.now(),
        priority: options.priority || 'normal'
      });
      
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    // Sort by priority
    this.requestQueue.sort((a, b) => {
      const priorityOrder = { 'critical': 0, 'high': 1, 'normal': 2, 'low': 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      
      try {
        const startTime = Date.now();
        const result = await this.executeLLMCall(request.prompt, request.options);
        const responseTime = Date.now() - startTime;
        
        this.updateStats(responseTime);
        request.resolve(result);
        this.stats.processedRequests++;
        
      } catch (error) {
        request.reject(error);
        this.stats.processedRequests++; // Count as processed even if failed
      }
      
      // Small delay to prevent overwhelming the system
      await this.delay(100);
    }
    
    this.isProcessing = false;
  }

  async executeLLMCall(prompt, options) {
    // Only make ONE LLM call at a time
    const result = await this.apiClient.callLLM(prompt, this.config.primaryLLM, {
      priority: options.priority || 'normal'
    });
    
    // Cache the result to reduce future API calls
    if (this.config.cacheEnabled) {
      const cacheKey = `llm:${this.config.primaryLLM}:${prompt.substring(0, 50)}`;
      this.apiClient.addToCache(cacheKey, result);
    }
    
    return {
      ...result,
      supervisor: this.config.primaryLLM,
      processedAt: new Date().toISOString()
    };
  }

  updateStats(responseTime) {
    this.stats.avgResponseTime = (
      (this.stats.avgResponseTime * (this.stats.processedRequests - 1) + responseTime) / 
      this.stats.processedRequests
    );
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats() {
    return {
      ...this.stats,
      queueLength: this.requestQueue.length,
      isProcessing: this.isProcessing,
      primaryLLM: this.config.primaryLLM,
      cacheHitRate: this.stats.totalRequests > 0 ? 
        (this.stats.cacheHits / this.stats.totalRequests * 100).toFixed(1) + '%' : '0%'
    };
  }

  // Batch processing for multiple prompts
  async batchProcess(prompts, options = {}) {
    const results = [];
    
    for (let i = 0; i < prompts.length; i += 3) { // Process in small batches
      const batch = prompts.slice(i, i + 3);
      const batchPromises = batch.map(prompt => 
        this.processLLMRequest(prompt, { ...options, priority: 'low' })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Delay between batches to prevent system overload
      if (i + 3 < prompts.length) {
        await this.delay(500);
      }
    }
    
    return results;
  }
}

export default LLMSupervisor;