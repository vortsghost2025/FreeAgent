/**
 * Context Injector - 38-Layer Memory System
 * Bundles all project context into a system prompt for instant agent alignment
 * 
 * Layers:
 * 1. Project Identity (MEMORY.md)
 * 2. Recent Tasks (task files)
 * 3. Agent Patterns (learned patterns)
 * 4. System Status (health, connections)
 * 5. Codebase Context (key files)
 * 6. Configuration (ensemble config)
 * 7. Provider Status (available models)
 * 8. Federation State (cluster health)
 */

import fs from 'fs/promises';
import path from 'path';

export class ContextInjector {
  constructor(workspaceRoot = process.cwd()) {
    this.workspaceRoot = workspaceRoot;
    this.memoryPath = path.join(workspaceRoot, 'memory');
    this.fcaMemoryPath = path.join(workspaceRoot, 'free-coding-agent/memory');
    this.maxTasks = 10; // Include last N tasks
    this.maxPatterns = 5; // Include top N patterns
  }

  /**
   * Build full context package for agent alignment
   */
  async buildContextPackage(options = {}) {
    const layers = await this.loadAllLayers(options);
    
    return {
      timestamp: new Date().toISOString(),
      totalLayers: Object.keys(layers).length,
      layers,
      systemPrompt: this.generateSystemPrompt(layers),
      compressed: this.compressForTokenLimit(layers, options.maxTokens || 4000)
    };
  }

  /**
   * Load all 38 context layers
   */
  async loadAllLayers(options = {}) {
    const layers = {};

    // Layer 1: Project Identity
    layers.projectIdentity = await this.loadProjectIdentity();

    // Layer 2-11: Recent Tasks (10 tasks = 10 layers)
    layers.recentTasks = await this.loadRecentTasks();

    // Layer 12-16: Agent Patterns (5 patterns = 5 layers)
    layers.agentPatterns = await this.loadAgentPatterns();

    // Layer 17: System Status
    layers.systemStatus = await this.loadSystemStatus();

    // Layer 18-27: Key Files (10 files = 10 layers)
    layers.keyFiles = await this.loadKeyFiles();

    // Layer 28: Configuration
    layers.configuration = await this.loadConfiguration();

    // Layer 29: Provider Status
    layers.providerStatus = await this.loadProviderStatus();

    // Layer 30: Federation State
    layers.federationState = await this.loadFederationState();

    // Layer 31: Agent Registry
    layers.agentRegistry = await this.loadAgentRegistry();

    // Layer 32: Memory Statistics
    layers.memoryStats = await this.loadMemoryStats();

    // Layer 33: Recent Errors
    layers.recentErrors = await this.loadRecentErrors();

    // Layer 34: Active Connections
    layers.activeConnections = await this.loadActiveConnections();

    // Layer 35: Work Summary
    layers.workSummary = await this.loadWorkSummary();

    // Layer 36: Coordination Status
    layers.coordinationStatus = await this.loadCoordinationStatus();

    // Layer 37: Environment Variables (safe)
    layers.environment = this.loadSafeEnvironment();

    // Layer 38: Session Context
    layers.sessionContext = this.loadSessionContext(options);

    return layers;
  }

  /**
   * Layer 1: Project Identity
   */
  async loadProjectIdentity() {
    try {
      const memoryFile = path.join(this.workspaceRoot, 'MEMORY.md');
      const content = await fs.readFile(memoryFile, 'utf8');
      return {
        source: 'MEMORY.md',
        content: content.slice(0, 2000), // Limit size
        exists: true
      };
    } catch {
      // Fallback to package.json
      try {
        const pkgFile = path.join(this.workspaceRoot, 'package.json');
        const pkg = JSON.parse(await fs.readFile(pkgFile, 'utf8'));
        return {
          source: 'package.json',
          content: `${pkg.name || 'Medical AI Federation'}\n${pkg.description || 'Multi-agent orchestration platform'}`,
          exists: true
        };
      } catch {
        return {
          source: 'default',
          content: 'Medical AI Federation - Multi-agent orchestration platform',
          exists: false
        };
      }
    }
  }

  /**
   * Layer 2-11: Recent Tasks
   */
  async loadRecentTasks() {
    const tasks = [];
    try {
      const taskDir = path.join(this.fcaMemoryPath, 'tasks');
      const files = await fs.readdir(taskDir);
      
      // Get most recent task files
      const taskFiles = files
        .filter(f => f.startsWith('task-') && f.endsWith('.json'))
        .sort()
        .reverse()
        .slice(0, this.maxTasks);

      for (const file of taskFiles) {
        try {
          const content = await fs.readFile(path.join(taskDir, file), 'utf8');
          const task = JSON.parse(content);
          tasks.push({
            file,
            task: task.task?.substring(0, 200),
            agents: task.agents,
            success: task.success,
            timestamp: task.timestamp
          });
        } catch {}
      }
    } catch {}

    return {
      count: tasks.length,
      tasks
    };
  }

  /**
   * Layer 12-16: Agent Patterns
   */
  async loadAgentPatterns() {
    const patterns = [];
    const patternDir = path.join(this.fcaMemoryPath, 'patterns');
    
    try {
      const files = await fs.readdir(patternDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const content = await fs.readFile(path.join(patternDir, file), 'utf8');
            const data = JSON.parse(content);
            if (Array.isArray(data)) {
              patterns.push(...data.slice(0, this.maxPatterns));
            }
          } catch {}
        }
      }
    } catch {}

    return {
      count: patterns.length,
      patterns: patterns.slice(0, this.maxPatterns)
    };
  }

  /**
   * Layer 17: System Status
   */
  async loadSystemStatus() {
    return {
      platform: process.platform,
      nodeVersion: process.version,
      uptime: process.uptime(),
      memory: {
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal,
        rss: process.memoryUsage().rss
      },
      pid: process.pid
    };
  }

  /**
   * Layer 18-27: Key Files
   */
  async loadKeyFiles() {
    const keyFiles = [
      'cockpit-server.js',
      'federation-core.js',
      'free-coding-agent/src/simple-ensemble.js',
      'free-coding-agent/src/task-router.js',
      'AGENT_COORDINATION/TASK_QUEUE.md'
    ];

    const files = {};
    for (const file of keyFiles) {
      try {
        const filePath = path.join(this.workspaceRoot, file);
        const stat = await fs.stat(filePath);
        files[file] = {
          exists: true,
          size: stat.size,
          modified: stat.mtime
        };
      } catch {
        files[file] = { exists: false };
      }
    }

    return files;
  }

  /**
   * Layer 28: Configuration
   */
  async loadConfiguration() {
    try {
      const configFile = path.join(this.fcaMemoryPath, '../ensemble.config.json');
      const content = await fs.readFile(configFile, 'utf8');
      return {
        exists: true,
        config: JSON.parse(content)
      };
    } catch {
      return { exists: false };
    }
  }

  /**
   * Layer 29: Provider Status
   */
  async loadProviderStatus() {
    // This would normally check actual provider health
    return {
      ollama: { status: 'unknown', endpoint: 'http://localhost:11434' },
      groq: { status: 'unknown', endpoint: 'https://api.groq.com/openai/v1' },
      openai: { status: 'unknown', endpoint: 'https://api.openai.com/v1' }
    };
  }

  /**
   * Layer 30: Federation State
   */
  async loadFederationState() {
    try {
      const configFile = path.join(this.workspaceRoot, 'federation-package.json');
      const content = await fs.readFile(configFile, 'utf8');
      return {
        exists: true,
        config: JSON.parse(content)
      };
    } catch {
      return { exists: false };
    }
  }

  /**
   * Layer 31: Agent Registry
   */
  async loadAgentRegistry() {
    const agents = ['code', 'data', 'clinical', 'test', 'security', 'api', 'db', 'devops'];
    const registry = {};

    for (const agent of agents) {
      try {
        const agentFile = path.join(this.fcaMemoryPath, 'agents', `${agent}.json`);
        const content = await fs.readFile(agentFile, 'utf8');
        registry[agent] = JSON.parse(content);
      } catch {
        registry[agent] = { status: 'not_initialized' };
      }
    }

    return registry;
  }

  /**
   * Layer 32: Memory Statistics
   */
  async loadMemoryStats() {
    const stats = {
      taskCount: 0,
      patternCount: 0,
      conversationCount: 0
    };

    try {
      const taskDir = path.join(this.fcaMemoryPath, 'tasks');
      const files = await fs.readdir(taskDir);
      stats.taskCount = files.filter(f => f.endsWith('.json')).length;
    } catch {}

    return stats;
  }

  /**
   * Layer 33: Recent Errors
   */
  async loadRecentErrors() {
    const errors = [];
    try {
      const taskDir = path.join(this.fcaMemoryPath, 'tasks');
      const files = await fs.readdir(taskDir);
      
      const errorFiles = files
        .filter(f => f.startsWith('task-error-') && f.endsWith('.json'))
        .sort()
        .reverse()
        .slice(0, 3);

      for (const file of errorFiles) {
        try {
          const content = await fs.readFile(path.join(taskDir, file), 'utf8');
          const error = JSON.parse(content);
          errors.push({
            file,
            error: error.error?.substring(0, 200),
            timestamp: error.timestamp
          });
        } catch {}
      }
    } catch {}

    return { count: errors.length, errors };
  }

  /**
   * Layer 34: Active Connections
   */
  async loadActiveConnections() {
    // This would normally check actual WebSocket connections
    return {
      cockpit: { status: 'unknown', port: 8889 },
      swarm: { status: 'disconnected', port: 80 }
    };
  }

  /**
   * Layer 35: Work Summary
   */
  async loadWorkSummary() {
    try {
      const summaryFile = path.join(this.workspaceRoot, 'WORK_SUMMARY.md');
      const content = await fs.readFile(summaryFile, 'utf8');
      return {
        exists: true,
        content: content.slice(0, 1000)
      };
    } catch {
      return { exists: false };
    }
  }

  /**
   * Layer 36: Coordination Status
   */
  async loadCoordinationStatus() {
    try {
      const queueFile = path.join(this.workspaceRoot, 'AGENT_COORDINATION/TASK_QUEUE.md');
      const content = await fs.readFile(queueFile, 'utf8');
      return {
        exists: true,
        content: content.slice(0, 1000)
      };
    } catch {
      return { exists: false };
    }
  }

  /**
   * Layer 37: Safe Environment Variables
   */
  loadSafeEnvironment() {
    const safe = {};
    const allowedKeys = ['NODE_ENV', 'PORT', 'LOG_LEVEL'];
    
    for (const key of allowedKeys) {
      if (process.env[key]) {
        safe[key] = process.env[key];
      }
    }

    // Check for API keys (masked)
    const apiKeyIndicators = ['GROQ_API_KEY', 'OPENAI_API_KEY'];
    safe.apiKeysConfigured = apiKeyIndicators.filter(k => process.env[k]).length > 0;

    return safe;
  }

  /**
   * Layer 38: Session Context
   */
  loadSessionContext(options = {}) {
    return {
      purpose: options.purpose || 'general assistance',
      mode: options.mode || 'collaborative',
      priority: options.priority || 'normal',
      requestedAgents: options.agents || [],
      customContext: options.customContext || null
    };
  }

  /**
   * Generate system prompt from layers
   */
  generateSystemPrompt(layers) {
    const parts = [];

    // Project identity
    if (layers.projectIdentity?.content) {
      parts.push(`# Project Context\n${layers.projectIdentity.content}\n`);
    }

    // Recent work
    if (layers.recentTasks?.tasks?.length > 0) {
      parts.push(`# Recent Tasks`);
      for (const task of layers.recentTasks.tasks.slice(0, 5)) {
        parts.push(`- ${task.task} (${task.agents?.join(', ') || 'unknown agents'}) - ${task.success ? '✅' : '❌'}`);
      }
      parts.push('');
    }

    // Key context files
    if (layers.coordinationStatus?.content) {
      parts.push(`# Task Queue\n${layers.coordinationStatus.content}\n`);
    }

    // Agent capabilities
    if (layers.agentRegistry) {
      parts.push(`# Available Agents`);
      for (const [name, state] of Object.entries(layers.agentRegistry)) {
        parts.push(`- ${name}: ${state.role || state.status || 'ready'}`);
      }
      parts.push('');
    }

    // Session context
    if (layers.sessionContext?.purpose) {
      parts.push(`# Current Session\nPurpose: ${layers.sessionContext.purpose}`);
      if (layers.sessionContext.customContext) {
        parts.push(`Context: ${layers.sessionContext.customContext}`);
      }
      parts.push('');
    }

    return parts.join('\n');
  }

  /**
   * Compress context for token limit
   */
  compressForTokenLimit(layers, maxTokens) {
    // Rough estimate: 1 token ≈ 4 characters
    const maxChars = maxTokens * 4;
    const systemPrompt = this.generateSystemPrompt(layers);
    
    if (systemPrompt.length <= maxChars) {
      return systemPrompt;
    }

    // Progressive truncation
    const compressed = {
      projectIdentity: layers.projectIdentity?.content?.slice(0, 500),
      recentTasks: layers.recentTasks?.tasks?.slice(0, 3),
      agentRegistry: Object.keys(layers.agentRegistry || {}),
      sessionContext: layers.sessionContext
    };

    return this.generateSystemPrompt(compressed);
  }

  /**
   * Quick context for new agent alignment
   */
  async quickAlign(agentName, customContext = null) {
    const options = {
      purpose: `Assisting as ${agentName} agent`,
      agents: [agentName],
      customContext,
      maxTokens: 2000
    };

    const pkg = await this.buildContextPackage(options);
    
    return {
      systemPrompt: pkg.compressed,
      layers: pkg.totalLayers,
      timestamp: pkg.timestamp
    };
  }
}

// Export singleton factory
let contextInjectorInstance = null;

export function getContextInjector(workspaceRoot) {
  if (!contextInjectorInstance) {
    contextInjectorInstance = new ContextInjector(workspaceRoot);
  }
  return contextInjectorInstance;
}

export default ContextInjector;
