/**
 * SNAC ORCHESTRATOR - Rate Limiting, Model Routing & Context Summarization
 * 
 * Solves:
 * 1. 429 rate limiting by queueing requests with token bucket algorithm
 * 2. Cost optimization via free-to-paid model tier routing
 * 3. Input token reduction via context summarization using Qdrant
 * 4. Code entropy tracking for technical debt detection
 * 
 * Usage:
 *   import { SNACOrchestrator } from './orchestrator.js';
 *   const orchestrator = new SNACOrchestrator(config);
 *   await orchestrator.start();
 */

import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import { EntropyTracker } from './entropy-tracker.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG = {
  // Rate Limiting (Token Bucket)
  rateLimit: {
    requestsPerSecond: 3,        // Max requests per second
    burstLimit: 6,                // Max burst requests allowed
    queueMaxSize: 100,            // Max queued requests before rejecting
    retryAfter429: true,          // Auto-retry after 429 with backoff
    backoffMs: 1000,             // Initial backoff on 429
    maxBackoffMs: 30000,         // Max backoff time
  },
  
  // Model Tier Routing
  modelTiers: {
    free: [
      'deepseek/deepseek-chat:free',
      'qwen/qwen3-4b:free',
      'meta-llama/llama-3.2-3b-instruct:free',
      'mistralai/mistral-7b-instruct:free',
    ],
    paid: [
      'deepseek/deepseek-chat',        // Paid DeepSeek
      'anthropic/claude-3-haiku',      // Fast & cheap
      'anthropic/claude-3.5-sonnet',  // Higher quality
    ],
  },
  
  // Task Complexity Thresholds
  complexityThresholds: {
    simple: { maxTokens: 500, keywords: ['fix', 'typo', 'simple', 'quick'] },
    medium: { maxTokens: 2000, keywords: ['implement', 'create', 'build', 'refactor'] },
    complex: { maxTokens: 8000, keywords: ['architect', 'design', 'complex', 'optimize'] },
  },
  
  // Context Summarization
  summarization: {
    enabled: true,
    qdrantUrl: process.env.QDRANT_URL || 'http://localhost:6333',
    qdrantCollection: 'snac-sessions',
    summaryThreshold: 10,        // Messages before summarization
    summaryModel: 'qwen/qwen3-4b:free',  // Model for summarization
    maxContextMessages: 5,       // Keep last N messages + summary
  },
  
  // Server
  port: process.env.PORT || 3001,
};

// ============================================================================
// TOKEN BUCKET RATE LIMITER
// ============================================================================

export class TokenBucket {
  constructor(options = {}) {
    this.capacity = options.burstLimit || 6;
    this.refillRate = options.requestsPerSecond || 3;
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
    
    // Queue for pending requests
    this.queue = [];
    this.maxQueueSize = options.queueMaxSize || 100;
    this.processing = false;
    
    // Backoff state
    this.inBackoff = false;
    this.backoffUntil = 0;
  }
  
  /**
   * Refill tokens based on time elapsed
   */
  refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.refillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
  
  /**
   * Try to consume a token, returns true if allowed
   */
  tryConsume() {
    this.refill();
    
    // Check if in backoff from 429
    if (this.inBackoff && Date.now() < this.backoffUntil) {
      return false;
    }
    
    if (this.inBackoff) {
      this.inBackoff = false;
      console.log('🔄 Rate limiter backoff complete');
    }
    
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    
    return false;
  }
  
  /**
   * Add request to queue
   */
  async enqueue(requestFn) {
    return new Promise((resolve, reject) => {
      if (this.queue.length >= this.maxQueueSize) {
        reject(new Error('Queue overflow - too many pending requests'));
        return;
      }
      
      this.queue.push({ fn: requestFn, resolve, reject, addedAt: Date.now() });
      this.processQueue();
    });
  }
  
  /**
   * Process queued requests
   */
  async processQueue() {
    if (this.processing) return;
    this.processing = true;
    
    while (this.queue.length > 0) {
      // Wait for token availability
      while (!this.tryConsume() && this.queue.length > 0) {
        await new Promise(r => setTimeout(r, 100));
      }
      
      if (this.queue.length === 0) break;
      
      const { fn, resolve, reject } = this.queue.shift();
      
      try {
        const result = await fn();
        resolve(result);
      } catch (err) {
        // Handle 429 with backoff
        if (err.message.includes('429') || err.message.includes('Rate limited')) {
          this.inBackoff = true;
          const backoffMs = err.retryAfter || 1000;
          this.backoffUntil = Date.now() + Math.min(backoffMs, 30000);
          console.warn(`⚠️  429 received, backing off for ${backoffMs}ms`);
          
          // Re-queue the failed request
          this.queue.unshift({ fn, resolve, reject, addedAt: Date.now() });
          await new Promise(r => setTimeout(r, backoffMs));
          continue;
        }
        reject(err);
      }
    }
    
    this.processing = false;
  }
  
  /**
   * Handle 429 response from API
   */
  handle429(retryAfter = 1000) {
    this.inBackoff = true;
    this.backoffUntil = Date.now() + Math.min(retryAfter, 30000);
  }
  
  /**
   * Get queue status
   */
  getStatus() {
    this.refill();
    return {
      tokens: Math.round(this.tokens * 100) / 100,
      queueLength: this.queue.length,
      inBackoff: this.inBackoff,
      backoffUntil: this.backoffUntil > Date.now() ? this.backoffUntil - Date.now() : 0,
    };
  }
}

// ============================================================================
// MODEL TIER ROUTER
// ============================================================================

export class ModelTierRouter {
  constructor(config) {
    this.freeModels = config.modelTiers?.free || [];
    this.paidModels = config.modelTiers?.paid || [];
    this.thresholds = config.complexityThresholds || {};
    
    // Track usage for optimization
    this.freeUsageCount = 0;
    this.paidUsageCount = 0;
  }
  
  /**
   * Analyze task complexity to determine appropriate tier
   */
  analyzeComplexity(task, options = {}) {
    const taskLower = task.toLowerCase();
    const maxTokens = options.maxTokens || 500;
    
    // Check for complex keywords
    for (const keyword of this.thresholds.complex?.keywords || []) {
      if (taskLower.includes(keyword)) {
        return { tier: 'paid', reason: `Complex keyword: ${keyword}`, complexity: 'complex' };
      }
    }
    
    // Check for medium complexity
    for (const keyword of this.thresholds.medium?.keywords || []) {
      if (taskLower.includes(keyword)) {
        return { tier: 'paid', reason: `Medium complexity: ${keyword}`, complexity: 'medium' };
      }
    }
    
    // Check token count
    if (maxTokens > 4000) {
      return { tier: 'paid', reason: `High token count: ${maxTokens}`, complexity: 'complex' };
    }
    
    // Default to free for simple tasks
    return { tier: 'free', reason: 'Simple task', complexity: 'simple' };
  }
  
  /**
   * Select model based on tier and availability
   */
  selectModel(task, options = {}) {
    const { tier, reason, complexity } = this.analyzeComplexity(task, options);
    
    let modelList;
    if (tier === 'free') {
      modelList = this.freeModels;
      this.freeUsageCount++;
    } else {
      modelList = this.paidModels;
      this.paidUsageCount++;
    }
    
    // Try models in order, handle failures
    return {
      model: modelList[0],
      fallbackModels: modelList.slice(1),
      tier,
      reason,
      complexity,
    };
  }
  
  /**
   * Get usage statistics
   */
  getUsageStats() {
    const total = this.freeUsageCount + this.paidUsageCount;
    return {
      free: this.freeUsageCount,
      paid: this.paidUsageCount,
      total,
      freePercentage: total > 0 ? Math.round((this.freeUsageCount / total) * 100) : 0,
    };
  }
}

// ============================================================================
// CONTEXT SUMMARIZER (Qdrant + Fallback)
// ============================================================================

export class ContextSummarizer {
  constructor(config) {
    this.config = config;
    this.enabled = config.summarization?.enabled !== false;
    this.summaryThreshold = config.summarization?.summaryThreshold || 10;
    this.maxContextMessages = config.summarization?.maxContextMessages || 5;
    this.summaryModel = config.summarization?.summaryModel;
    
    // In-memory store as fallback (when Qdrant unavailable)
    this.sessionStore = new Map();
    this.summaries = new Map();
    
    // Try to initialize Qdrant client
    this.qdrantClient = null;
    this.initQdrant();
  }
  
  /**
   * Initialize Qdrant client if available
   */
  async initQdrant() {
    if (!this.enabled) return;
    
    try {
      const { QdrantClient } = await import('@qdrant/js-client-rest');
      this.qdrantClient = new QdrantClient({
        url: this.config.summarization?.qdrantUrl || 'http://localhost:6333',
      });
      
      // Test connection
      await this.qdrantClient.getCollections();
      console.log('✅ Qdrant connected for context summarization');
    } catch (err) {
      console.warn('⚠️ Qdrant not available, using in-memory summarization:', err.message);
      this.qdrantClient = null;
    }
  }
  
  /**
   * Summarize session context
   */
  async summarize(sessionKey, messages) {
    if (!this.enabled || messages.length < this.summaryThreshold) {
      return null;
    }
    
    // Check if we already have a summary
    const existingSummary = this.summaries.get(sessionKey);
    if (existingSummary) {
      return existingSummary;
    }
    
    // Create summary using the last N messages
    const recentMessages = messages.slice(-this.maxContextMessages);
    const summaryText = this.createSummaryText(recentMessages);
    
    // Store summary
    this.summaries.set(sessionKey, {
      text: summaryText,
      messageCount: messages.length,
      summarizedAt: Date.now(),
    });
    
    // Try to store in Qdrant if available
    if (this.qdrantClient) {
      try {
        await this.qdrantClient.upsert(this.config.summarization?.qdrantCollection || 'snac-sessions', {
          points: [{
            id: sessionKey,
            payload: {
              summary: summaryText,
              messageCount: messages.length,
              updatedAt: Date.now(),
            },
          }],
        });
      } catch (err) {
        console.warn('⚠️ Failed to store summary in Qdrant:', err.message);
      }
    }
    
    return this.summaries.get(sessionKey);
  }
  
  /**
   * Create summary text from messages
   */
  createSummaryText(messages) {
    const userMessages = messages.filter(m => m.role === 'user').slice(-3);
    const assistantMessages = messages.filter(m => m.role === 'assistant').slice(-3);
    
    let summary = '## Session Summary\n\n';
    summary += '### Key Tasks Discussed:\n';
    
    userMessages.forEach((msg, i) => {
      const truncated = msg.content.slice(0, 100);
      summary += `${i + 1}. ${truncated}${msg.content.length > 100 ? '...' : ''}\n`;
    });
    
    summary += '\n### Actions Taken:\n';
    assistantMessages.forEach((msg, i) => {
      const truncated = msg.content.slice(0, 150);
      summary += `${i + 1}. ${truncated}${msg.content.length > 150 ? '...' : ''}\n`;
    });
    
    return summary;
  }
  
  /**
   * Get context for a session (summary + recent messages)
   */
  async getContext(sessionKey, messages) {
    if (!this.enabled) {
      return messages.slice(-this.maxContextMessages);
    }
    
    // Get or create summary
    let summary = this.summaries.get(sessionKey);
    
    if (!summary && messages.length >= this.summaryThreshold) {
      summary = await this.summarize(sessionKey, messages);
    }
    
    const recentMessages = messages.slice(-this.maxContextMessages);
    
    if (summary) {
      return [
        { role: 'system', content: summary.text },
        ...recentMessages,
      ];
    }
    
    return recentMessages;
  }
  
  /**
   * Clear session context
   */
  async clearSession(sessionKey) {
    this.summaries.delete(sessionKey);
    this.sessionStore.delete(sessionKey);
    
    if (this.qdrantClient) {
      try {
        await this.qdrantClient.delete(this.config.summarization?.qdrantCollection || 'snac-sessions', {
          points: [sessionKey],
        });
      } catch (err) {
        console.warn('⚠️ Failed to delete from Qdrant:', err.message);
      }
    }
  }
  
  /**
   * Get summarization status
   */
  getStatus() {
    return {
      enabled: this.enabled,
      qdrantConnected: this.qdrantClient !== null,
      sessionsTracked: this.summaries.size,
    };
  }
}

// ============================================================================
// MAIN ORCHESTRATOR
// ============================================================================

export class SNACOrchestrator {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize components
    this.rateLimiter = new TokenBucket(this.config.rateLimit);
    this.modelRouter = new ModelTierRouter(this.config);
    this.summarizer = new ContextSummarizer(this.config);
    
    // Initialize Entropy Tracker for chaos monitoring
    this.entropyTracker = new EntropyTracker(this, {
      entropyThreshold: this.config.entropyThreshold || 0.5,
    });
    
    // Session management
    this.sessions = new Map();
    
    // Get API key
    this.openRouterKey = this.getApiKey();
    this.openRouterBase = 'https://openrouter.ai/api/v1';
    
    // Stats
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      startedAt: Date.now(),
    };
  }
  
  /**
   * Get API key from environment or file
   */
  getApiKey() {
    const envKey = process.env.OPENROUTER_API_KEY;
    if (envKey) return envKey;
    
    try {
      const keyPath = path.join(os.homedir(), '.openrouter_key');
      if (existsSync(keyPath)) {
        return readFileSync(keyPath, 'utf8').trim();
      }
    } catch (e) { /* ignore */ }
    
    return '';
  }
  
  /**
   * Start the orchestrator server
   */
  async start() {
    console.log('🚀 Starting SNAC Orchestrator...');
    console.log(`📡 Rate Limit: ${this.config.rateLimit.requestsPerSecond} req/s, burst: ${this.config.rateLimit.burstLimit}`);
    console.log(`💰 Free Models: ${this.config.modelTiers.free.length}`);
    console.log(`💎 Paid Models: ${this.config.modelTiers.paid.length}`);
    console.log(`📝 Summarization: ${this.summarizer.enabled ? 'enabled' : 'disabled'}`);
    
    // Start HTTP server
    this.httpServer = createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          orchestrator: true,
          rateLimiter: this.rateLimiter.getStatus(),
          modelUsage: this.modelRouter.getUsageStats(),
          summarization: this.summarizer.getStatus(),
          entropy: this.entropyTracker.getDashboardData(),
        }));
      } else if (req.url === '/stats') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        const uptime = Date.now() - this.stats.startedAt;
        res.end(JSON.stringify({
          ...this.stats,
          uptimeSeconds: Math.round(uptime / 1000),
          requestsPerMinute: Math.round((this.stats.totalRequests / uptime) * 60000),
          entropy: this.entropyTracker.getStats(),
        }));
      } else if (req.url === '/entropy') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(this.entropyTracker.getDashboardData()));
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    
    // Start WebSocket server
    this.wss = new WebSocketServer({ server: this.httpServer });
    
    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });
    
    // Start server
    return new Promise((resolve) => {
      this.httpServer.listen(this.config.port, () => {
        console.log(`✅ SNAC Orchestrator running on port ${this.config.port}`);
        resolve();
      });
    });
  }
  
  /**
   * Handle WebSocket connection
   */
  handleConnection(ws, req) {
    const sessionId = `orch-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    console.log(`🔗 Orchestrator client connected: ${sessionId}`);
    
    // Initialize session
    this.sessions.set(sessionId, {
      messages: [],
      createdAt: Date.now(),
    });
    
    ws.on('message', async (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }
      
      if (msg.type === 'chat') {
        await this.handleChat(ws, sessionId, msg);
      } else if (msg.type === 'reset') {
        await this.handleReset(sessionId);
        ws.send(JSON.stringify({ type: 'reset_complete', sessionKey: sessionId }));
      } else if (msg.type === 'analyze_entropy') {
        await this.handleEntropyAnalysis(ws, msg);
      } else if (msg.type === 'task_complete') {
        await this.handleTaskComplete(ws, msg);
      } else if (msg.type === 'scan_project') {
        await this.handleProjectScan(ws, msg);
      }
    });
    
    ws.on('close', () => {
      console.log(`🔌 Orchestrator client disconnected: ${sessionId}`);
    });
  }
  
  /**
   * Handle chat request with full orchestration
   */
  async handleChat(ws, sessionId, msg) {
    const { task, agents = ['Code Generation'], maxTokens = 500 } = msg;
    
    if (!task) return;
    
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    // Get context with summarization
    const context = await this.summarizer.getContext(sessionId, session.messages);
    
    // Select model based on complexity
    const modelInfo = this.modelRouter.selectModel(task, { maxTokens });
    console.log(`🎯 Model selected: ${modelInfo.model} (${modelInfo.tier}) - ${modelInfo.reason}`);
    
    // Enqueue request with rate limiting
    const result = await this.rateLimiter.enqueue(async () => {
      return this.callOpenRouterWithFallback(
        modelInfo.model,
        modelInfo.fallbackModels,
        task,
        context,
        agents
      );
    });
    
    // Update session history
    session.messages.push(
      { role: 'user', content: task },
      { role: 'assistant', content: result.response }
    );
    
    // Trim history if too long
    if (session.messages.length > 50) {
      await this.summarizer.summarize(sessionId, session.messages);
      session.messages = session.messages.slice(-this.config.summarization.maxContextMessages);
    }
    
    // Update stats
    this.stats.totalRequests++;
    this.stats.successfulRequests++;
    this.stats.totalInputTokens += result.inputTokens || 0;
    this.stats.totalOutputTokens += result.outputTokens || 0;
    
    // Send result
    ws.send(JSON.stringify({
      type: 'chat_response',
      response: result.response,
      model: result.model,
      tier: modelInfo.tier,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    }));
  }

  /**
   * Handle entropy analysis request
   */
  async handleEntropyAnalysis(ws, msg) {
    const { filePath } = msg;
    
    if (!filePath) {
      ws.send(JSON.stringify({ type: 'entropy_error', error: 'No file path provided' }));
      return;
    }
    
    console.log(`📊 Entropy analysis requested for: ${filePath}`);
    
    const result = await this.entropyTracker.trackFile(filePath);
    
    ws.send(JSON.stringify({
      type: 'entropy_result',
      ...result,
    }));
  }

  /**
   * Handle task completion - writes flag file for heartbeat speaker
   */
  async handleTaskComplete(ws, msg) {
    const { taskName, status = 'success', evalPath = './eval' } = msg;
    
    // Create flag file for heartbeat speaker
    const flagContent = `task: ${taskName}\nstatus: ${status}\ncompletedAt: ${new Date().toISOString()}`;
    const flagPath = path.join(evalPath, 'task_complete.flag');
    
    try {
      writeFileSync(flagPath, flagContent, 'utf8');
      console.log(`✅ Task complete flag written: ${flagPath}`);
      
      ws.send(JSON.stringify({
        type: 'task_complete_confirmed',
        taskName,
        status,
        flagPath,
      }));
    } catch (err) {
      console.error(`❌ Failed to write task flag: ${err.message}`);
      ws.send(JSON.stringify({
        type: 'task_complete_error',
        error: err.message,
      }));
    }
  }

  /**
   * Handle project scan request
   */
  async handleProjectScan(ws, msg) {
    const { projectPath } = msg;
    
    if (!projectPath) {
      ws.send(JSON.stringify({ type: 'scan_error', error: 'No project path provided' }));
      return;
    }
    
    console.log(`🔍 Project scan requested for: ${projectPath}`);
    
    const result = await this.entropyTracker.scanProject(projectPath);
    
    ws.send(JSON.stringify({
      type: 'scan_result',
      ...result,
    }));
  }
  
  /**
   * Call OpenRouter with fallback models
   */
  async callOpenRouterWithFallback(primaryModel, fallbackModels, task, context, agents) {
    const allModels = [primaryModel, ...fallbackModels];
    let lastError = null;
    
    for (const model of allModels) {
      try {
        const response = await fetch(`${this.openRouterBase}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.openRouterKey}`,
            'HTTP-Referer': 'http://localhost:3001',
            'X-Title': 'SNAC Orchestrator',
          },
          body: JSON.stringify({
            model,
            messages: context,
            stream: false,
            temperature: 0.7,
            max_tokens: 2048,
          }),
        });
        
        if (!response.ok) {
          const err = await response.text();
          
          if (response.status === 429) {
            // Handle rate limit - tell rate limiter to back off
            const retryAfter = parseInt(response.headers.get('retry-after') || '1000', 10);
            this.rateLimiter.handle429(retryAfter);
            console.warn(`⚠️  Rate limited on ${model}, backing off...`);
            lastError = new Error(`Rate limited: ${err}`);
            lastError.retryAfter = retryAfter;
            continue;
          }
          
          throw new Error(`OpenRouter ${response.status}: ${err}`);
        }
        
        const data = await response.json();
        
        return {
          response: data.choices?.[0]?.message?.content || '',
          model,
          inputTokens: data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.completion_tokens || 0,
        };
        
      } catch (err) {
        lastError = err;
        console.warn(`⚠️  Error with model ${model}: ${err.message}`);
      }
    }
    
    this.stats.failedRequests++;
    throw lastError || new Error('All models failed');
  }
  
  /**
   * Handle session reset
   */
  async handleReset(sessionId) {
    await this.summarizer.clearSession(sessionId);
    this.sessions.delete(sessionId);
    this.sessions.set(sessionId, {
      messages: [],
      createdAt: Date.now(),
    });
  }
  
  /**
   * Stop the orchestrator
   */
  async stop() {
    console.log('🛑 Stopping SNAC Orchestrator...');
    
    if (this.wss) {
      this.wss.close();
    }
    
    if (this.httpServer) {
      return new Promise((resolve) => {
        this.httpServer.close(() => {
          console.log('✅ Orchestrator stopped');
          resolve();
        });
      });
    }
  }
  
  /**
   * Get orchestrator status
   */
  getStatus() {
    return {
      rateLimiter: this.rateLimiter.getStatus(),
      modelUsage: this.modelRouter.getUsageStats(),
      summarization: this.summarizer.getStatus(),
      entropy: this.entropyTracker.getStats(),
      stats: this.stats,
    };
  }
}

// ============================================================================
// STANDALONE STARTUP (for testing)
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  const orchestrator = new SNACOrchestrator();
  
  orchestrator.start().catch(console.error);
  
  process.on('SIGINT', async () => {
    await orchestrator.stop();
    process.exit(0);
  });
}
