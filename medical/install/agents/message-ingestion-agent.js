/**
 * Message Ingestion Agent - First stage queue processing
 * Reads raw messages and converts them to structured tasks
 * Prevents Lingam from being overwhelmed by raw message volume
 */

import { EventEmitter } from 'events';

class MessageIngestionAgent extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      batchSize: config.batchSize || 10,
      pollInterval: config.pollInterval || 500,
      maxParallel: config.maxParallel || 20,
      ...config
    };
    
    this.isRunning = false;
    this.processedCount = 0;
    this.stats = {
      messagesRead: 0,
      tasksCreated: 0,
      classifications: 0,
      errors: 0
    };
  }

  async start(source = 'cockpit') {
    console.log('📥 Message Ingestion Agent - Starting queue processing');
    console.log(`   Source: ${source}`);
    console.log(`   Batch Size: ${this.config.batchSize}`);
    console.log(`   Poll Interval: ${this.config.pollInterval}ms\n`);
    
    this.isRunning = true;
    this.source = source;
    
    this.pollLoop();
    
    return this;
  }

  async pollLoop() {
    if (!this.isRunning) return;
    
    try {
      // Read batch of raw messages
      const messages = await this.readRawMessages();
      
      if (messages.length > 0) {
        console.log(`📥 Ingested ${messages.length} raw messages`);
        this.stats.messagesRead += messages.length;
        
        // Convert to structured tasks
        const tasks = await this.createStructuredTasks(messages);
        this.stats.tasksCreated += tasks.length;
        
        // Emit tasks to task bus
        tasks.forEach(task => {
          this.emit('task-ready', task);
        });
      }
    } catch (error) {
      console.error('❌ Ingestion error:', error.message);
      this.stats.errors++;
    }
    
    // Schedule next poll
    if (this.isRunning) {
      setTimeout(() => this.pollLoop(), this.config.pollInterval);
    }
  }

  async readRawMessages() {
    // Simulate reading from various sources
    const batchSize = Math.min(
      this.config.batchSize, 
      Math.floor(Math.random() * this.config.batchSize) + 1
    );
    
    const messages = [];
    for (let i = 0; i < batchSize; i++) {
      messages.push({
        id: `raw_${Date.now()}_${i}`,
        timestamp: Date.now(),
        content: this.generateSampleMessage(),
        source: this.source,
        raw: true
      });
    }
    
    return messages;
  }

  generateSampleMessage() {
    const messageTypes = [
      // Code-related messages (route to Lingam for review)
      "Review this React component for performance issues",
      "Check this Python function for security vulnerabilities", 
      "Optimize this database query",
      "Refactor this legacy code",
      "Explain this complex algorithm",
      
      // Execution messages (route to Kilo)
      "Run npm install in the project directory",
      "Execute the test suite",
      "Deploy to staging environment",
      "Start the development server",
      "Clear the cache directory",
      
      // System messages (handle with workers)
      "Monitor CPU usage",
      "Check disk space",
      "Restart the service",
      "Update system packages",
      "Backup configuration files",
      
      // General messages
      "What's the project status?",
      "Show recent commits",
      "List available commands",
      "Help with git operations",
      "Explain the architecture"
    ];
    
    return messageTypes[Math.floor(Math.random() * messageTypes.length)];
  }

  async createStructuredTasks(rawMessages) {
    // Convert raw messages to structured tasks with classification
    const tasks = [];
    
    for (const message of rawMessages) {
      const classification = this.classifyMessage(message.content);
      
      const task = {
        id: `task_${message.id}`,
        messageId: message.id,
        type: classification.type,
        priority: classification.priority,
        category: classification.category,
        content: message.content,
        source: message.source,
        timestamp: message.timestamp,
        estimatedDuration: classification.estimatedDuration,
        requiresLLM: classification.requiresLLM,
        routing: classification.routing, // Who should handle this
        structured: true
      };
      
      tasks.push(task);
      this.stats.classifications++;
    }
    
    return tasks;
  }

  classifyMessage(content) {
    const lowerContent = content.toLowerCase();
    
    // Routing decisions
    if (this.requiresLingamReview(lowerContent)) {
      return {
        type: 'code-review',
        priority: this.determinePriority(lowerContent),
        category: 'development',
        estimatedDuration: 2000 + Math.random() * 3000,
        requiresLLM: true,
        routing: 'lingam-supervisor'
      };
    } else if (this.requiresKiloExecution(lowerContent)) {
      return {
        type: 'execution',
        priority: this.determinePriority(lowerContent),
        category: 'operations',
        estimatedDuration: 1000 + Math.random() * 2000,
        requiresLLM: false,
        routing: 'kilo-executor'
      };
    } else if (this.requiresWorkerProcessing(lowerContent)) {
      return {
        type: 'system-task',
        priority: this.determinePriority(lowerContent),
        category: 'maintenance',
        estimatedDuration: 500 + Math.random() * 1500,
        requiresLLM: false,
        routing: 'worker-pool'
      };
    } else {
      return {
        type: 'general',
        priority: 'normal',
        category: 'general',
        estimatedDuration: 1000,
        requiresLLM: true,
        routing: 'lingam-supervisor'
      };
    }
  }

  requiresLingamReview(content) {
    const patterns = [
      /review/i, /optimize/i, /refactor/i, /explain/i, /security/i,
      /performance/i, /algorithm/i, /architecture/i, /design/i,
      /debug/i, /fix/i, /improve/i, /analyze/i
    ];
    return patterns.some(pattern => pattern.test(content));
  }

  requiresKiloExecution(content) {
    const patterns = [
      /run/i, /execute/i, /start/i, /stop/i, /deploy/i, /install/i,
      /test/i, /build/i, /compile/i, /clear/i, /reset/i, /restart/i
    ];
    return patterns.some(pattern => pattern.test(content));
  }

  requiresWorkerProcessing(content) {
    const patterns = [
      /monitor/i, /check/i, /status/i, /usage/i, /space/i, /backup/i,
      /update/i, /packages/i, /system/i, /service/i, /cache/i
    ];
    return patterns.some(pattern => pattern.test(content));
  }

  determinePriority(content) {
    if (content.includes('urgent') || content.includes('critical') || content.includes('emergency')) {
      return 'critical';
    } else if (content.includes('important') || content.includes('asap')) {
      return 'high';
    } else if (content.includes('later') || content.includes('eventually')) {
      return 'low';
    }
    return 'normal';
  }

  getStats() {
    return {
      ...this.stats,
      uptime: this.isRunning ? 'active' : 'stopped',
      messagesPerMinute: this.stats.messagesRead / ((Date.now() - (this.startTime || Date.now())) / 60000)
    };
  }

  stop() {
    console.log('🛑 Stopping Message Ingestion Agent');
    this.isRunning = false;
    this.removeAllListeners();
  }
}

export default MessageIngestionAgent;