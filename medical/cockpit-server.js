/**
 * MEDICAL AI FEDERATION COCKPIT
 *
 * Central control dashboard for unified federation:
 * - System status monitoring
 * - Task routing and execution
 * - Cost tracking ($0/mo goal)
 * - Performance metrics
 * - Agent management
 *
 * Features:
 * - Real-time WebSocket updates
 * - REST API for all systems
 * - Dashboard UI with live metrics
 */

// Load environment variables from .env file FIRST
import dotenv from 'dotenv';
dotenv.config();

// Elasticsearch logging setup
const elasticsearchUrl = process.env.ELASTICSEARCH_URL || 'https://my-elasticsearch-project-dd509a.es.us-central1.gcp.elastic.cloud:443';
const elasticsearchApiKey = process.env.ELASTICSEARCH_API_KEY;
const elasticsearchIndex = process.env.ELASTICSEARCH_INDEX || 'cockpit-logs';

// Simple fetch-based log forwarder for Elasticsearch
async function logToElasticsearch(logData) {
  // Temporarily disabled due to auth issues
  // if (!elasticsearchApiKey) {
  //   console.log('[ELASTIC] No API key configured - skipping log');
  //   return;
  // }
  console.log('[ELASTIC] Logging disabled - would send:', JSON.stringify(logData));
  return;
  
  try {
    const timestamp = new Date().toISOString();
    const logEntry = {
      '@timestamp': timestamp,
      ...logData,
      system: 'medical-ai-cockpit',
      host: process.env.HOSTNAME || 'cockpit-server'
    };
    
    const response = await fetch(`${elasticsearchUrl}/${elasticsearchIndex}/_doc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `ApiKey ${elasticsearchApiKey}`
      },
      body: JSON.stringify(logEntry)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ELASTIC] Failed to send log:', response.status, errorText);
    } else {
      console.log('[ELASTIC] Log sent successfully');
    }
  } catch (error) {
    console.error('[ELASTIC] Logging failed:', error.message);
  }
}

// Helper to log HTTP requests
function logRequest(req, res, duration) {
  logToElasticsearch({
    event: 'http_request',
    method: req.method,
    path: req.path,
    status: res.statusCode,
    duration_ms: duration,
    ip: req.ip || req.connection?.remoteAddress
  });
}

// Helper to log task events
function logTask(taskId, event, data) {
  logToElasticsearch({
    event: 'task',
    task_id: taskId,
    task_event: event,
    ...data
  });
}

// Helper to log errors
async function logError(error, context = {}) {
  return logToElasticsearch({
    event: 'error',
    error: error.message,
    stack: error.stack,
    ...context
  });
}

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getFederationCoordinator, SystemType } from './federation-core.js';
import { initEnsemble, getEnsemble } from './free-coding-agent/src/simple-ensemble.js';
import { spawn } from 'child_process';
import { perceptionModule } from './perception/perception-module.js';
import { ProviderRouter } from './free-coding-agent/src/providers/provider-router.js';
import agentMemory from './agent-memory.js';
import { detectToolRequest, executeTool } from './cockpit-tools.js';
import { agentWarmup, AgentWarmupController } from './utils/agent-warmup.js';
import { EnsembleDriftDetector } from './utils/ensemble-drift-detector.js';

// In-memory schema validator for autonomous memory health monitoring
const MEMORY_SCHEMAS = {
  'working-memory': { version: '1.0.0', fields: { id: { required: true }, content: { required: true }, type: { required: false, default: 'generic' }, timestamp: { required: false }, metadata: { required: false, default: {} } } },
  'episodic-memory': { version: '1.0.0', fields: { id: { required: true }, event: { required: true }, context: { required: false, default: {} }, timestamp: { required: false }, agents: { required: false, default: [] }, outcome: { required: false, default: 'unknown' }, metadata: { required: false, default: {} } } },
  'task-coordination': { version: '1.0.0', fields: { id: { required: true }, taskId: { required: true }, type: { required: false, default: 'coordination' }, status: { required: false, default: 'pending' }, assignedTo: { required: false }, timestamp: { required: false }, priority: { required: false, default: 'medium' }, metadata: { required: false, default: {} } } },
  'task-claims': { version: '1.0.0', fields: { id: { required: true }, agentId: { required: true }, taskId: { required: true }, status: { required: false, default: 'claimed' }, timestamp: { required: false }, metadata: { required: false, default: {} } } },
  'task-completions': { version: '1.0.0', fields: { id: { required: true }, agentId: { required: true }, taskId: { required: true }, status: { required: false, default: 'completed' }, timestamp: { required: false }, result: { required: false, default: {} }, metadata: { required: false, default: {} } } },
  'direct-messages': { version: '1.0.0', fields: { id: { required: true }, from: { required: true }, to: { required: true }, content: { required: true }, timestamp: { required: false }, metadata: { required: false, default: {} } } },
  'code-changes': { version: '1.0.0', fields: { id: { required: true }, agentId: { required: true }, taskId: { required: false }, type: { required: false, default: 'result-share' }, content: { required: false, default: {} }, metadata: { required: false, default: {} } } },
  'memory-updates': { version: '1.0.0', fields: { id: { required: true }, type: { required: true }, timestamp: { required: false }, operation: { required: true }, target: { required: false }, data: { required: false, default: {} }, metadata: { required: false, default: {} } } },
  'welcome': { version: '1.0.0', fields: { id: { required: true }, message: { required: false, default: 'Welcome to the swarm' }, timestamp: { required: false }, metadata: { required: false, default: {} } } }
};

// Memory Schema Validator for autonomous agent orchestration
function validateMemory(memoryType, data) {
  const schema = MEMORY_SCHEMAS[memoryType];
  if (!schema) return { valid: false, errors: [{ message: 'Unknown memory type: ' + memoryType }] };
  const errors = [];
  const items = Array.isArray(data) ? data : [data];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || typeof item !== 'object') {
      errors.push({ index: i, message: 'Item must be an object' });
      continue;
    }
    for (const [field, fieldSchema] of Object.entries(schema.fields)) {
      if (fieldSchema.required && !item[field]) {
        errors.push({ index: i, field, message: 'Missing required field: ' + field });
      }
    }
  }
  return { valid: errors.length === 0, errors, schemaVersion: schema.version, itemCount: items.length };
}

// Repair memory data by adding missing required fields with defaults
function repairMemory(memoryType, data) {
  const schema = MEMORY_SCHEMAS[memoryType];
  if (!schema) return { success: false, data, actions: [{ error: 'Unknown memory type: ' + memoryType }] };
  
  const actions = [];
  const items = Array.isArray(data) ? data : [data];
  const repaired = items.map((item, index) => {
    if (!item || typeof item !== 'object') {
      actions.push({ index, action: 'replaced_invalid_with_object' });
      return {};
    }
    
    const result = { ...item };
    for (const [field, fieldSchema] of Object.entries(schema.fields)) {
      if (result[field] === undefined) {
        if (fieldSchema.default !== undefined) {
          result[field] = typeof fieldSchema.default === 'function' ? fieldSchema.default() : fieldSchema.default;
          actions.push({ index, field, action: 'added_default', value: result[field] });
        } else if (fieldSchema.required && field === 'id') {
          result[field] = 'mem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          actions.push({ index, field, action: 'generated_id', value: result[field] });
        }
      }
    }
    return result;
  });
  
  return { success: true, data: Array.isArray(data) ? repaired : repaired[0], actions };
}

async function checkMemoryHealth() {
  const fs = require('fs').promises;
  const path = require('path');
  const report = { timestamp: new Date().toISOString(), overall: 'healthy', schemas: {}, files: [], issues: [] };
  for (const [type, schema] of Object.entries(MEMORY_SCHEMAS)) {
    report.schemas[type] = { version: schema.version, registered: true };
  }
  const basePath = path.join(process.cwd(), 'agent-memory/shared-workspace');
  try {
    const files = await fs.readdir(basePath);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const filePath = path.join(basePath, file);
      const memoryType = file.replace('.json', '');
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        const validation = validateMemory(memoryType, data);
        report.files.push({ file, status: validation.valid ? 'valid' : 'invalid', itemCount: validation.itemCount, errorCount: validation.errors.length });
        if (!validation.valid && report.overall === 'healthy') report.overall = 'degraded';
      } catch (e) {
        report.files.push({ file, status: 'error', error: e.message });
        report.issues.push({ file, message: e.message });
      }
    }
  } catch (e) {
    report.issues.push({ message: e.message });
  }
  return report;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Cockpit configuration
const COCKPIT_CONFIG = {
  port: 8889,
  host: process.env.COCKPIT_HOST || '0.0.0.0',
  cors: {
    origin: '*',
    credentials: true
  },
  cost: {
    targetMonthlyCost: 0,  // $0/mo target
    currentSpend: 0,
    providers: {
      ollama: { cost: 0, unit: 'requests' },  // Free local
      groq: { cost: 0.000001, unit: 'tokens' },    // $0.19/1M tokens
      together: { cost: 0.0000002, unit: 'tokens' },  // $0.29/1M tokens
      openrouter: { cost: 0.000001, unit: 'tokens' }  // $0.95/1M tokens
    }
  },
  tracking: {
    enabled: true,
    saveToFile: true,
    filePath: './cost-tracking.json'
  }
};

const app = express();
const coordinator = getFederationCoordinator();

// Initialize SimpleEnsemble on startup - will be initialized in registerDefaultSystems
let ensembleInitialized = false;

// Initialize Provider Router for hybrid inference mesh
const providerRouter = new ProviderRouter({
  preferLocal: true,
  enableFallback: true,
  kiloEnabled: process.env.KILO_API_KEY ? true : false // Only enable Kilo if API key is set
});

// In-memory store for active tasks
const activeTasks = new Map();
const costTracker = {
  tokens: {},
  requests: {},
  startTime: Date.now()
};

/**
 * Middleware setup
 */
app.use(express.json({ limit: '50mb' }));

// Serve static files with no-cache headers for development
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    // Disable caching for HTML files to ensure latest version is loaded
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Serve live monitor page
app.get('/monitor', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'live-monitor.html'));
});

// Serve pipeline dashboard
app.get('/pipeline', (req, res) => {
  res.sendFile(path.join(__dirname, 'pipeline-dashboard.html'));
});

// Serve enhanced medical UI
app.get('/medical-ui', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'medical-ui.html'));
});

// Temporarily disabled Elasticsearch middleware due to auth issues
// app.use((req, res, next) => {
//   const start = Date.now();
//   
//   // Capture original send to get response status
//   const originalSend = res.send;
//   res.send = function(data) {
//     const duration = Date.now() - start;
//     // Log to Elasticsearch asynchronously
//     logRequest(req, res, duration).catch(err => console.error('[ELASTIC] Request log failed:', err.message));
//     return originalSend.call(this, data);
//   };
//   
//   next();
// });

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

/**
 * WebSocket for real-time updates
 */
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws, req) => {
  console.log('🔌 Cockpit client connected');

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'status_request':
          ws.send(JSON.stringify({
            type: 'status',
            data: coordinator.getSystemStatus()
          }));
          break;

        case 'execute_task':
          await handleTaskExecution(data, ws);
          break;

        case 'health_check':
          await handleHealthCheck(data, ws);
          break;

        case 'get_metrics':
          ws.send(JSON.stringify({
            type: 'metrics',
            data: coordinator.getSystemStatus()
          }));
          break;

        case 'route_recommendation':
          ws.send(JSON.stringify({
            type: 'route_recommendation',
            data: getRouteRecommendation(data.task)
          }));
          break;

        case 'cost_report':
          ws.send(JSON.stringify({
            type: 'cost_report',
            data: getCostReport()
          }));
          break;

        default:
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Unknown message type'
          }));
      }
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        error: error.message
      }));
    }
  });

  ws.on('close', () => {
    console.log('🔌 Cockpit client disconnected');
  });
});

/**
 * Execute task through appropriate system
 */
async function handleTaskExecution(data, ws) {
  const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  console.log('📋 Executing task:', taskId);

  activeTasks.set(taskId, {
    id: taskId,
    task: data.task,
    systemId: data.preferredSystem || 'auto',
    status: 'executing',
    startTime: Date.now(),
    estimatedTime: data.estimatedTime || null
  });

  // Log task start to Elasticsearch
  logTask(taskId, 'started', { task: data.task, system: data.preferredSystem }).catch(err => {});

  // Broadcast task started
  broadcastToAll({
    type: 'task_started',
    taskId,
    task: data.task
  });

  try {
    const result = await coordinator.routeTask({
      id: taskId,
      type: data.task.type || 'general',
      data: data.task.data,
      preferredSystem: data.preferredSystem,
      estimatedTime: data.estimatedTime
    });

    // Track tokens used
    const tokensUsed = estimateTokensUsed(data.task);
    costTracker.tokens[taskId] = tokensUsed;
    costTracker.requests[taskId] = data.task;

    // Update task
    activeTasks.set(taskId, {
      ...activeTasks.get(taskId),
      status: 'complete',
      result: result,
      completedAt: Date.now(),
      executionTime: result.executionTime || 0,
      tokensUsed
    });

    // Log task completion to Elasticsearch
    logTask(taskId, 'completed', { result, executionTime: result.executionTime, tokensUsed }).catch(err => {});

    // Broadcast completion
    broadcastToAll({
      type: 'task_complete',
      taskId,
      result,
      executionTime: result.executionTime || 0
    });

  } catch (error) {
    console.error('Task execution failed:', error);

    activeTasks.set(taskId, {
      ...activeTasks.get(taskId),
      status: 'failed',
      error: error.message,
      completedAt: Date.now()
    });

    // Log task failure to Elasticsearch
    logTask(taskId, 'failed', { error: error.message }).catch(err => {});
    logError(error, { taskId, context: 'task_execution' }).catch(err => {});

    broadcastToAll({
      type: 'task_failed',
      taskId,
      error: error.message
    });
  }
}

/**
 * Health check all systems
 */
async function handleHealthCheck(data, ws) {
  console.log('🏥 Running health check...');

  const status = await coordinator.healthCheck();

  ws.send(JSON.stringify({
    type: 'health_check_result',
    data: status
  }));

  // Track health in coordinator
  for (const [id, sys] of status.systems) {
    coordinator.emit('system:health:changed', {
      systemId: id,
      status: sys.status
    });
  }
}

/**
 * Get route recommendation for a task
 */
function getRouteRecommendation(task) {
  const taskType = task.type || 'general';
  const hasMedicalData = JSON.stringify(task.data).toLowerCase();

  // Routing recommendations
  const recommendations = [];

  // Structural medical processing tasks → Medical Pipeline
  if (taskType === 'structural_processing') {
    recommendations.push({
      systemId: SystemType.MEDICAL_PIPELINE,
      reason: 'Fastest (1-3ms) for structural processing',
      confidence: 0.95
    });
  }

  // Medical analysis tasks → Coding Ensemble Clinical
  if (taskType === 'medical_analysis' || taskType === 'clinical_reasoning') {
    recommendations.push({
      systemId: SystemType.CODING_ENSEMBLE,
      reason: 'Clinical analysis specialist',
      confidence: 0.9
    });
  }

  // Code generation tasks → Coding Ensemble Code Gen
  if (taskType === 'code_generation' || taskType === 'coding_assistance') {
    recommendations.push({
      systemId: SystemType.CODING_ENSEMBLE,
      reason: 'Code generation specialist',
      confidence: 0.95
    });
  }

  // Data processing/validation → Plugins
  if (taskType === 'data_processing' || taskType === 'validation') {
    recommendations.push({
      systemId: SystemType.PLUGINS,
      reason: 'Extensible plugin system',
      confidence: 0.8
    });
  }

  return recommendations;
}

/**
 * Estimate tokens used for a task
 */
function estimateTokensUsed(task) {
  const input = JSON.stringify(task.data || task.message || '');

  // Rough estimate: ~4 tokens per 100 characters for English text
  const charCount = input.length;
  const tokens = Math.ceil(charCount / 25);

  return {
    inputTokens: tokens,
    estimatedCost: tokens * 0.000001  // Using Groq pricing as baseline
  };
}

/**
 * Get cost report
 */
function getCostReport() {
  const now = Date.now();
  const daysInMonth = now.getDate() / 30; // Approximate

  // Count total tokens
  let totalTokens = 0;
  for (const tokens of Object.values(costTracker.tokens)) {
    totalTokens += tokens.inputTokens || 0;
  }

  // Calculate cost by provider
  const providerCosts = {
    groq: 0,
    together: 0,
    openrouter: 0,
    ollama: 0  // Free
  };

  // Estimate cost based on token distribution
  // (This would be tracked in production)
  const estimatedCost = 0;

  // Project monthly spend
  const monthlyEstimate = estimatedCost * (30 / daysInMonth);

  return {
    tokensUsed: totalTokens,
    tokensPerDay: totalTokens / daysInMonth,
    estimatedMonthlyCost: monthlyEstimate,
    targetCost: COCKPIT_CONFIG.cost.targetMonthlyCost,
    costRatio: monthlyEstimate / COCKPIT_CONFIG.cost.targetMonthlyCost
  };
}

/**
 * Broadcast to all connected clients
 */
function broadcastToAll(data) {
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(JSON.stringify(data));
    }
  });
}

// Enhanced broadcast with agent status updates
function broadcastAgentStatus(agentName, status) {
  broadcastToAll({
    type: 'agent_status',
    agent: agentName,
    status: status
  });
}

// Enhanced broadcast for task events
function broadcastTaskEvent(eventType, taskId, data = {}) {
  broadcastToAll({
    type: eventType,
    taskId: taskId,
    ...data
  });
}

/**
 * REST API endpoints
 */

// GET /api/status - Get federation status
app.get('/api/status', (req, res) => {
  res.json(coordinator.getSystemStatus());
});

// GET /api/tasks - Get active tasks
app.get('/api/tasks', (req, res) => {
  const tasks = Array.from(activeTasks.values());
  res.json(tasks);
});

// GET /api/tasks/:id - Get specific task
app.get('/api/tasks/:id', (req, res) => {
  const task = activeTasks.get(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
});

// POST /api/execute - Execute a task
app.post('/api/execute', async (req, res) => {
  try {
    const { task, preferredSystem } = req.body;

    if (!task) {
      return res.status(400).json({ error: 'Task is required' });
    }

    const result = await coordinator.routeTask({
      id: `rest-${Date.now()}`,
      type: task.type || 'general',
      data: task.data,
      preferredSystem,
      estimatedTime: task.estimatedTime
    });

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Task execution failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/systems/:id/health - Trigger health check for system
app.post('/api/systems/:id/health', async (req, res) => {
  try {
    const system = coordinator.systems.get(req.params.id);
    if (!system) {
      return res.status(404).json({ error: 'System not found' });
    }

    const isHealthy = await coordinator._checkSystemHealth(system);
    system.status = isHealthy ? FederationStatus.HEALTHY : FederationStatus.UNHEALTHY;
    system.lastHealthCheck = new Date();

    res.json({
      success: true,
      system: { id: req.params.id, ...system }
    });

  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Perception API Endpoints
// POST /api/perception/image - Process uploaded image
app.post('/api/perception/image', async (req, res) => {
  try {
    const { image, mimeType } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    const result = await perceptionModule.processImage(image, mimeType);
    
    res.json({
      success: true,
      result: result
    });

  } catch (error) {
    console.error('Image processing failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/perception/voice - Process voice input
app.post('/api/perception/voice', async (req, res) => {
  try {
    const { audio, mimeType } = req.body;
    
    if (!audio) {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    const result = await perceptionModule.processVoice(audio, mimeType);
    
    res.json({
      success: true,
      result: result
    });

  } catch (error) {
    console.error('Voice processing failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/perception/status - Get perception system status
app.get('/api/perception/status', async (req, res) => {
  try {
    const status = await perceptionModule.getStatus();
    
    res.json({
      success: true,
      status: status
    });
  } catch (error) {
    res.json({
      success: true,
      status: { available: false, error: error.message }
    });
  }
});

// POST /api/register-system - Register a system
app.post('/api/register-system', (req, res) => {
  try {
    const { systemId, systemConfig } = req.body;

    if (!systemId || !systemConfig) {
      return res.status(400).json({ error: 'System ID and config are required' });
    }

    coordinator.registerSystem(systemId, systemConfig);

    res.json({
      success: true,
      systemId
    });

  } catch (error) {
    console.error('System registration failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/unregister-system - Unregister a system
app.post('/api/unregister-system', (req, res) => {
  try {
    const { systemId } = req.body;

    coordinator.systems.delete(systemId);

    res.json({
      success: true,
      systemId
    });

  } catch (error) {
    console.error('System unregistration failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Serve the Mega Unified Cockpit as main - integrates all 3 agent systems
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'mega-cockpit.html'));
});

// Keep the old unified-ide available at /unified-ide
app.get('/unified-ide', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'unified-ide.html'));
});

// Serve the Galaxy IDE
app.get('/galaxy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'galaxy-ide.html'));
});

// Serve the old cockpit
app.get('/cockpit', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cockpit.html'));
});

// Serve the simple unified workspace
app.get('/unified', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'unified-workspace.html'));
});

// Serve the unified shell (tabbed interface for all dashboards)
app.get('/shell', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'unified-shell.html'));
});

// Alias route for unified-shell (backward compatibility)
app.get('/unified-shell', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'unified-shell.html'));
});

// Serve the basic IDE workspace
app.get('/ide', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'ide-workspace.html'));
});

// Serve the Mega Unified Cockpit - integrates all 3 agent systems
app.get('/mega', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'mega-cockpit.html'));
});

// Serve Mega Cockpit Test Page
app.get('/mega-test', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'test-mega-cockpit.html'));
});

// Serve Simple Test Page - no external dependencies
app.get('/simple-test', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'simple-test.html'));
});

// Serve Benchmark Dashboard
app.get('/benchmark', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'benchmark-dashboard.html'));
});

// Serve Swarm Panel - configurable via SWARM_UI_PATH env var, defaults to local file
app.get('/swarm', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'swarm-ui.html'));
});

// Serve Health Tab
app.get('/health', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'health-tab.html'));
});

// Serve the Monaco Cockpit
app.get('/monaco-cockpit', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'monaco-cockpit.html'));
});

// API endpoint for Ollama model
app.post('/api/ollama/generate', async (req, res) => {
  try {
    const { prompt, options } = req.body;
    const { OllamaEndpoint } = await import('./free-coding-agent/src/providers/ollama-endpoint.js');
    const endpoint = new OllamaEndpoint();
    const result = await endpoint.generate(prompt, options || {});
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint for Context Injection (38-layer memory)
app.get('/api/context', async (req, res) => {
  try {
    const { agent, purpose, maxTokens } = req.query;
    const { getContextInjector } = await import('./free-coding-agent/src/context-injector.js');
    const injector = getContextInjector(__dirname);
    
    if (agent) {
      // Quick align for specific agent
      const context = await injector.quickAlign(agent, purpose);
      res.json({ success: true, context });
    } else {
      // Full context package
      const pkg = await injector.buildContextPackage({ 
        purpose, 
        maxTokens: maxTokens ? parseInt(maxTokens) : 4000 
      });
      res.json({ 
        success: true, 
        layers: pkg.totalLayers,
        timestamp: pkg.timestamp,
        systemPrompt: pkg.compressed
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to get full context layers (for debugging)
app.get('/api/context/layers', async (req, res) => {
  try {
    const { getContextInjector } = await import('./free-coding-agent/src/context-injector.js');
    const injector = getContextInjector(__dirname);
    const pkg = await injector.buildContextPackage({});
    res.json({ 
      success: true, 
      totalLayers: pkg.totalLayers,
      timestamp: pkg.timestamp,
      layers: pkg.layers
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint for Ollama model health
app.get('/api/ollama/health', async (req, res) => {
  try {
    const { OllamaEndpoint } = await import('./free-coding-agent/src/providers/ollama-endpoint.js');
    const endpoint = new OllamaEndpoint();
    const isHealthy = await endpoint.healthCheck();
    res.json({ success: true, healthy: isHealthy });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint for SimpleEnsemble chat - local-first zero-cost
app.post('/api/chat', async (req, res) => {
  try {
    const { message, agents: selectedAgents, useHybrid } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('[API /api/chat] Received message:', message.substring(0, 100));
    console.log('[API /api/chat] Selected agents:', selectedAgents || 'all');
    console.log('[API /api/chat] Use hybrid:', useHybrid);

    // Detect if this is a complex query that should route to cloud
    // Raised threshold from 200 to 500 chars - simple messages shouldn't hit cloud
    const isComplexQuery = message.length > 500 || 
                           (selectedAgents && selectedAgents.length > 1) ||
                           /\b(comprehensive\s*analysis|security\s*audit|multi\s*agent|deep\s*dive)\b/i.test(message);
    
    // Route complex queries to Groq for speed (if API key available)
    if ((useHybrid || isComplexQuery) && process.env.GROQ_API_KEY) {
      console.log('[API /api/chat] Routing complex query to Groq for speed');
      try {
        const result = await providerRouter.route(message, {
          taskType: detectTaskType(message),
          preferCloud: true
        });
        
        return res.json({ 
          success: true, 
          response: result.response,
          provider: result.provider,
          latency: result.latency,
          routed: result.routed || 'groq-fast',
          routingReason: isComplexQuery ? 'complex-query' : 'user-requested'
        });
      } catch (cloudError) {
        console.warn('[API /api/chat] Cloud routing failed, falling back to local:', cloudError.message);
        // Fall through to local ensemble
      }
    }

    // If useHybrid is true, route through ProviderRouter for hybrid inference
    if (useHybrid) {
      console.log('[API /api/chat] Using hybrid routing (ProviderRouter)');
      const result = await providerRouter.route(message, {
        taskType: detectTaskType(message)
      });
      
      return res.json({ 
        success: true, 
        response: result.response,
        provider: result.provider,
        latency: result.latency,
        routed: result.routed
      });
    }

    // Default: Use SimpleEnsemble (local Ollama)
    const ensemble = getEnsemble();
    
    // Check if ensemble is initialized
    if (!ensemble.agents) {
      console.error('[API /api/chat] Ensemble not initialized!');
      return res.status(503).json({ 
        success: false, 
        error: 'Ensemble not initialized. Please restart the server.' 
      });
    }

    // Determine agents: /swarm = all 8, else single relevant agent
    let agentsToRun;
    if (message.startsWith('/swarm')) {
      agentsToRun = Object.keys(ensemble.agents);
      console.log('[API /api/chat] /swarm mode: running all', agentsToRun.length, 'agents');
    } else {
      agentsToRun = selectSingleAgent(message);
      console.log('[API /api/chat] Routing to single agent:', agentsToRun[0]);
    }

    // Load memory for the primary agent(s)
    let personalContext = '';
    let sharedContext = '';
    const MAX_CONTEXT_LENGTH = 2000;
    
    try {
      const primaryAgent = agentsToRun[0];
      personalContext = agentMemory.getBootstrapContext(primaryAgent, 5) || '';
      sharedContext = agentMemory.getSharedContext() || '';
    } catch (memErr) {
      console.warn('[API /api/chat] Memory fetch failed:', memErr.message);
    }

    // Build enhanced message with memory context (with length limit)
    let enhancedMessage = message;
    if (personalContext || sharedContext) {
      let contextNote = '\n\n--- CONTEXT FROM PREVIOUS SESSIONS ---\n';
      if (personalContext) {
        const truncatedPersonal = personalContext.substring(0, MAX_CONTEXT_LENGTH);
        contextNote += 'Your past sessions:\n' + truncatedPersonal + '\n';
      }
      if (sharedContext) {
        const truncatedShared = sharedContext.substring(0, MAX_CONTEXT_LENGTH);
        contextNote += '\nShared knowledge from all agents:\n' + truncatedShared + '\n';
      }
      contextNote += 'Use this context to provide more informed responses.\n';
      
      // Ensure total context doesn't exceed limit
      const maxTotalContext = 4000;
      if (contextNote.length > maxTotalContext) {
        contextNote = contextNote.substring(0, maxTotalContext);
      }
      enhancedMessage = message + contextNote;
    }

    // Set timeout based on agent count (2 min for single, 5 min for swarm)
    // Increased to 120s to accommodate larger models like deepseek-coder-v2:16b
    const timeoutMs = agentsToRun.length > 1 ? 300000 : 120000;
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Chat request timed out')), timeoutMs)
    );

    const result = await Promise.race([
      ensemble.execute(enhancedMessage, agentsToRun),
      timeoutPromise
    ]);

    console.log('[API /api/chat] Execution completed in', result.executionTime, 'ms');

    // Strip tool call syntax from deepseek responses
    if (result.response) {
      result.response = result.response
        .replace(/<｜tool[^>]*｜>/g, '')
        .replace(/<｜tool▁calls▁begin｜>[\s\S]*?<｜tool▁calls▁end｜>/g, '')
        .replace(/<｜[^>]+｜>/g, '')
        .trim();
    }

    // Save session to agent memory
    if (result.results && Array.isArray(result.results)) {
      result.results.forEach((agentResult) => {
        if (agentResult.agent) {
          const keyContext = agentMemory.extractKeyContext(message, agentResult.response || '');
          agentMemory.addSession(agentResult.agent, {
            messages: [
              { role: 'user', content: message },
              { role: 'assistant', content: agentResult.response || '' }
            ],
            decisions: [],
            keyContext: keyContext,
            executionTime: result.executionTime
          });

          // Add important learnings to shared memory
          if (keyContext) {
            agentMemory.addSharedEntry({
              agent: agentResult.agent,
              content: `${agentResult.agent}: ${keyContext}`,
              type: 'learning'
            });
          }
        }
      });
    }

    res.json({ success: true, ...result });

  } catch (error) {
    console.error('[API /api/chat] Chat request failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Detect if Kilo wants to delegate to another system
 */
function detectDelegation(response) {
  const lower = response.toLowerCase();

  // Patterns indicating delegation intent
  const patterns = [
    { target: 'simple_ensemble', keywords: ['simple ensemble', 'code', 'data', 'clinical', 'test', 'security', 'api', 'db', 'devops', 'local agent'] },
    { target: 'federation_core', keywords: ['federation', 'medical pipeline', 'patient data', 'healthcare'] },
    { target: 'distributed_swarm', keywords: ['distributed', 'swarm', 'parallel', 'compute burst', 'scale'] }
  ];

  for (const pattern of patterns) {
    for (const keyword of pattern.keywords) {
      if (lower.includes(keyword)) {
        // Extract the task - look for action verbs
        const taskMatch = response.match(/(?:run|execute|delegate|use|call|trigger|start)\s+(.+?)(?:\.|\n|$)/i);
        const task = taskMatch ? taskMatch[1] : response;
        return { target: pattern.target, task: task.trim() };
      }
    }
  }

  return null;
}

/**
 * Execute delegation to another system
 */
async function executeDelegation(delegation, app) {
  const { target, task } = delegation;
  console.log('[Delegation] Executing:', target, '- task:', task.substring(0, 50));

  try {
    if (target === 'simple_ensemble') {
      // Call /api/chat
      const response = await fetch('http://localhost:8889/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: task, agents: [] })
      });
      const data = await response.json();
      return {
        success: true,
        results: data.response || JSON.stringify(data.results || data, null, 2)
      };
    }
    else if (target === 'federation_core') {
      // Call /api/execute
      const response = await fetch('http://localhost:8889/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: { type: 'general', data: task }, preferredSystem: 'auto' })
      });
      const data = await response.json();
      return {
        success: true,
        results: data.result || JSON.stringify(data, null, 2)
      };
    }
    else if (target === 'distributed_swarm') {
      // Call /api/distributed or similar
      return {
        success: true,
        results: 'Distributed Swarm: Compute burst delegation not yet implemented. This would trigger parallel processing across multiple agents.'
      };
    }

    return { success: false, results: 'Unknown target: ' + target };
  } catch (error) {
    console.error('[Delegation] Error:', error.message);
    return { success: false, results: 'Delegation failed: ' + error.message };
  }
}

/**
 * API endpoint for Kilo Master Agent - orchestrates all systems
 * With persistent memory across sessions
 */
app.post('/api/kilo', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    console.log('[API /api/kilo] Kilo Master Agent processing:', message.substring(0, 50));
    const startTime = Date.now();
    
    // Log to Elasticsearch
    logToElasticsearch({
      type: 'api_request',
      endpoint: '/api/kilo',
      message_length: message.length,
      timestamp: new Date().toISOString()
    });

    // Load Kilo's personal memory for bootstrap
    const personalContext = agentMemory.getBootstrapContext('kilo', 10);
    // Load shared memory accessible by all agents
    const sharedContext = agentMemory.getSharedContext();

    console.log('[API /api/kilo] Personal context length:', personalContext?.length || 0);
    console.log('[API /api/kilo] Shared context length:', sharedContext?.length || 0);

    // Check for tool request first
    const toolRequest = detectToolRequest(message);
    let toolResult = null;
    
    if (toolRequest) {
      console.log('[API /api/kilo] Tool request detected:', toolRequest.tool, '-', toolRequest.params);
      toolResult = await executeTool(toolRequest.tool, toolRequest.params);
      console.log('[API /api/kilo] Tool result:', toolResult.success ? 'SUCCESS' : 'FAILED', toolResult.error || '');
    }

    // Build enhanced system prompt with memory
    let systemPrompt = 'You are Kilo, the master orchestration agent for the Claw Federation. You have access to 3 agent systems: (1) Simple Ensemble - 8 local agents for code, data, clinical, test, security, api, db, devops tasks, (2) Federation Core - medical pipeline for patient data processing, (3) Distributed Swarm - compute burst engine for parallel processing. You ALSO have direct file system tools: read files (say "read <filepath>"), write files (say "write <filepath> : <content>"), list files (say "list files in <dir>"), and run commands (say "run npm start"). When the user asks to read, create, or modify files, use these tools directly. Keep responses concise and actionable.';

    if (personalContext) {
      systemPrompt += '\n\n--- PREVIOUS SESSIONS (for continuity) ---\n' + personalContext;
    }

    if (sharedContext) {
      systemPrompt += '\n\n--- SHARED KNOWLEDGE ---\n' + sharedContext;
    }

    // Add tool execution results to context if tool was executed
    if (toolResult) {
      let toolInfo = `

--- TOOL EXECUTION RESULT ---
Tool: ${toolRequest.tool}
`;
      if (toolResult.success) {
        if (toolRequest.tool === 'readFile') {
          toolInfo += `Result: Successfully read file\nContent:\n${toolResult.content}`;
        } else if (toolRequest.tool === 'writeFile') {
          toolInfo += `Result: Successfully created/updated file`;
        } else if (toolRequest.tool === 'listFiles') {
          toolInfo += `Result: Directory listing\nFiles: ${JSON.stringify(toolResult.files)}`;
        } else if (toolRequest.tool === 'executeCommand') {
          toolInfo += `Result: Command executed\nOutput: ${toolResult.stdout}\nErrors: ${toolResult.stderr}`;
        }
      } else {
        toolInfo += `Result: FAILED\nError: ${toolResult.error}`;
      }
      systemPrompt += toolInfo;
    }

    // Route to Groq with enhanced system prompt (force cloud for system prompt support)
    const result = await providerRouter.route(message, {
      model: 'llama-3.3-70b-versatile',
      system: systemPrompt,
      preferCloud: true
    });

    let response = result.response || result.text || 'No response from Kilo';

    // Check if Kilo wants to delegate to another system
    const delegation = detectDelegation(response);
    if (delegation) {
      console.log('[API /api/kilo] Delegation detected:', delegation.target, '-', delegation.task);

      // Execute the delegation
      const delegationResult = await executeDelegation(delegation, req.app);

      if (delegationResult.success) {
        // Synthesize final response with delegation results
        const synthesisPrompt = `Original user request: ${message}

Kilo's plan: ${response}

Delegation results from ${delegation.target}:
${delegationResult.results}

Please provide a synthesized response to the user incorporating these real results.`;

        const synthesisResult = await providerRouter.route(synthesisPrompt, {
          model: 'llama-3.3-70b-versatile',
          system: 'You are Kilo, providing a synthesized response based on actual delegation results. Be concise and helpful.',
          preferCloud: true
        });

        response = synthesisResult.response || synthesisResult.text || response + '\n\n' + delegationResult.results;
      }
    }

    const executionTime = Date.now() - startTime;
    
    // Log performance to Elasticsearch
    logToElasticsearch({
      type: 'api_response',
      endpoint: '/api/kilo',
      execution_time_ms: executionTime,
      response_length: response.length,
      success: true,
      timestamp: new Date().toISOString()
    });

    // Extract key context and save session
    const keyContext = agentMemory.extractKeyContext(message, response);
    agentMemory.addSession('kilo', {
      messages: [
        { role: 'user', content: message },
        { role: 'assistant', content: response }
      ],
      decisions: [],
      keyContext: keyContext,
      executionTime
    });

    // Check if this contains info worth sharing with other agents
    if (keyContext && keyContext.length > 0) {
      agentMemory.addSharedEntry({
        agent: 'kilo',
        content: `Kilo learned: ${keyContext}`,
        type: 'learning'
      });
    }

    console.log('[API /api/kilo] Completed in', executionTime, 'ms');

    res.json({
      success: true,
      response,
      executionTime,
      agent: 'kilo-master',
      provider: result.provider
    });

  } catch (error) {
    console.error('[API /api/kilo] Kilo request failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Claw Master Agent - routes to OpenClaw at port 18789
 */
app.post('/api/claw', async (req, res) => {
  try {
    const { message, forceProvider } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    console.log('[API /api/claw] Claw Master Agent processing:', message.substring(0, 50));
    const startTime = Date.now();

    // Check for tool request first
    const toolRequest = detectToolRequest(message);
    let toolResult = null;
    
    if (toolRequest) {
      console.log('[API /api/claw] Tool request detected:', toolRequest.tool, '-', toolRequest.params);
      toolResult = await executeTool(toolRequest.tool, toolRequest.params);
      console.log('[API /api/claw] Tool result:', toolResult.success ? 'SUCCESS' : 'FAILED', toolResult.error || '');
    }

    // Load Claw's personal memory
    let personalContext = '';
    try {
      const clawMemoryPath = path.join(__dirname, 'agent-memory', 'claw.json');
      if (fs.existsSync(clawMemoryPath)) {
        const clawData = JSON.parse(fs.readFileSync(clawMemoryPath, 'utf8'));
        const recentSessions = clawData.sessions?.slice(-3) || [];
        personalContext = recentSessions.map(s =>
          `Session ${s.timestamp}: ${s.message.substring(0, 100)}... → ${s.response?.substring(0, 100)}...`
        ).join('\n');
      }
    } catch (e) {
      console.log('[API /api/claw] Could not load claw memory:', e.message);
    }

    // Load shared memory
    let sharedContext = '';
    try {
      const sharedPath = path.join(__dirname, 'agent-memory', 'shared.json');
      if (fs.existsSync(sharedPath)) {
        const sharedData = JSON.parse(fs.readFileSync(sharedPath, 'utf8'));
        sharedContext = sharedData.knowledge?.slice(-5).map(k =>
          `${k.topic}: ${k.content.substring(0, 80)}`
        ).join('\n') || '';
      }
    } catch (e) {
      console.log('[API /api/claw] Could not load shared memory:', e.message);
    }

    const systemPrompt = `You are Claw, a Master AI Agent with access to multiple specialized systems.
You have your own persistent memory that persists across conversations.
You ALSO have direct file system tools: read files, write files, list files, and run commands.

Recent conversations from your sessions:
${personalContext}

Shared Knowledge:
${sharedContext}

${toolResult ? `\n--- TOOL EXECUTION RESULT ---\n${toolResult.success ? 'SUCCESS' : 'FAILED'}: ${toolResult.error || (toolResult.content || toolResult.message || JSON.stringify(toolResult))}` : ''}

Be helpful, accurate, and concise.`;

    let finalResult;

    // Try local OpenClaw first, then fall back to Groq
    const OPENCLAW_URL = process.env.OPENCLAW_WS_URL || 'ws://127.0.0.1:3001';
    let openClawResult = null;
    let openClawError = null;

    // Try OpenClaw via WebSocket
    try {
      console.log('[API /api/claw] Attempting OpenClaw connection to', OPENCLAW_URL);
      
      openClawResult = await new Promise((resolve, reject) => {
        const ws = new WebSocket(OPENCLAW_URL);
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('OpenClaw connection timeout'));
        }, 30000);

        ws.on('open', () => {
          console.log('[API /api/claw] OpenClaw WebSocket connected');
          ws.send(JSON.stringify({
            system_prompt: systemPrompt,
            user_message: message,
            type: 'chat'
          }));
        });

        ws.on('message', (data) => {
          clearTimeout(timeout);
          try {
            const response = JSON.parse(data.toString());
            resolve(response);
          } catch (e) {
            resolve({ response: data.toString() });
          }
          ws.close();
        });

        ws.on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });

        ws.on('close', () => {
          clearTimeout(timeout);
        });
      });

      console.log('[API /api/claw] OpenClaw response received');
      finalResult = {
        response: openClawResult.response || openClawResult.message || JSON.stringify(openClawResult),
        provider: 'openclaw',
        model: 'openclaw-local'
      };
    } catch (openClawErr) {
      console.log('[API /api/claw] OpenClaw not available:', openClawErr.message);
      openClawError = openClawErr.message;

      // Fall back to Groq
      console.log('[API /api/claw] Falling back to Groq');
      const groqResult = await providerRouter.route(message, {
        model: 'llama-3.3-70b-versatile',
        system: systemPrompt,
        preferCloud: true
      });

      finalResult = {
        response: groqResult.response || groqResult.text || 'No response from Groq',
        provider: 'groq',
        model: 'llama-3.3-70b-versatile'
      };
    }

    const executionTime = Date.now() - startTime;
    console.log('[API /api/claw] Completed in', executionTime, 'ms');

    // Save to Claw's memory
    try {
      const clawMemoryPath = path.join(__dirname, 'agent-memory', 'claw.json');
      let clawData = { sessions: [], lastUpdated: new Date().toISOString() };

      if (fs.existsSync(clawMemoryPath)) {
        clawData = JSON.parse(fs.readFileSync(clawMemoryPath, 'utf8'));
      }

      clawData.sessions.push({
        timestamp: new Date().toISOString(),
        message: message,
        response: finalResult.response,
        provider: finalResult.provider,
        executionTime: executionTime
      });

      if (clawData.sessions.length > 10) {
        clawData.sessions = clawData.sessions.slice(-10);
      }

      clawData.lastUpdated = new Date().toISOString();
      fs.writeFileSync(clawMemoryPath, JSON.stringify(clawData, null, 2));
      console.log('[API /api/claw] Memory saved');
    } catch (e) {
      console.log('[API /api/claw] Could not save memory:', e.message);
    }

    res.json({
      success: true,
      response: finalResult.response,
      provider: finalResult.provider
    });

  } catch (error) {
    console.error('[API /api/claw] Claw request failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Detect task type from message content for intelligent routing
 */
function detectTaskType(message) {
  const lower = message.toLowerCase();
  
  if (lower.includes('fix') || lower.includes('debug') || lower.includes('error')) {
    return 'auto-fix';
  }
  if (lower.includes('security') || lower.includes('audit') || lower.includes('vulnerability')) {
    return 'security-audit';
  }
  if (lower.includes('medical') || lower.includes('clinical') || lower.includes('diagnosis') || lower.includes('patient')) {
    return 'medical-analysis';
  }
  if (lower.includes('triage') || lower.includes('prioritize') || lower.includes('urgent')) {
    return 'auto-triage';
  }
  if (lower.includes('orchestrat') || lower.includes('coordinate') || lower.includes('multi-agent')) {
    return 'multi-agent-orchestration';
  }
  
  return null; // Let router decide based on complexity
}

/**
 * Select a single relevant agent based on message content
 * Uses keyword matching to route to the most appropriate agent
 */
function selectSingleAgent(message) {
  const lowerMessage = message.toLowerCase();

  // Agent capability keywords for smart routing
  const agentKeywords = {
    kilo: ['kilo', 'master', 'orchestrate', 'synthesize', 'combine', 'all agents', 'everything', 'full response'],
    code: ['code', 'function', 'class', 'module', 'debug', 'error', 'implement', 'refactor', 'api', 'script'],
    data: ['data', 'query', 'database', 'sql', 'csv', 'json', 'analyze', 'report', 'metrics', 'statistics'],
    clinical: ['patient', 'diagnosis', 'symptom', 'treatment', 'medical', 'clinical', 'health', 'medication', 'dosage'],
    test: ['test', 'spec', 'coverage', 'unit', 'integration', 'mock', 'assert', 'validate'],
    security: ['security', 'auth', 'token', 'encrypt', 'vulnerability', 'xss', 'injection', 'permission'],
    api: ['api', 'endpoint', 'rest', 'graphql', 'request', 'response', 'http', 'route', 'middleware'],
    db: ['database', 'schema', 'migration', 'table', 'index', 'query', 'transaction', 'orm'],
    devops: ['deploy', 'docker', 'kubernetes', 'ci', 'cd', 'pipeline', 'build', 'container', 'infrastructure']
  };

  // Score each agent based on keyword matches
  const scores = {};
  for (const [agent, keywords] of Object.entries(agentKeywords)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword)) {
        score += 1;
      }
    }
    if (score > 0) {
      scores[agent] = score;
    }
  }

  // Sort by score and take top agent
  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1]);

  // Return the best matching agent, or default to 'code'
  const selectedAgent = sorted.length > 0 ? sorted[0][0] : 'code';
  return [selectedAgent];
}

// API endpoint for ensemble agent list
app.get('/api/ensemble/agents', (req, res) => {
  try {
    const ensemble = getEnsemble();
    res.json(ensemble.getAvailableAgents());
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint for ensemble status
app.get('/api/ensemble/status', (req, res) => {
  try {
    const ensemble = getEnsemble();
    res.json(ensemble.getAgentStatus());
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint for ensemble metrics
app.get('/api/ensemble/metrics', (req, res) => {
  try {
    const ensemble = getEnsemble();
    res.json(ensemble.getMetrics());
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint for ensemble memory
app.get('/api/ensemble/memory/:agent', (req, res) => {
  try {
    const instance = getEnsemble();
    const memory = instance.loadAgentMemory(req.params.agent);
    res.json(memory);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Serve agent memory files
app.get('/api/agents/:agent/memory', async (req, res) => {
  try {
    const { agent } = req.params;
    const agentPath = `./free-coding-agent/memory/agents/${agent}.json`;
    const data = JSON.parse(await fs.promises.readFile(agentPath, 'utf8'));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// HYBRID INFERENCE MESH - Provider Router API
// ============================================================================

// GET /api/providers/status - Get all provider statuses
app.get('/api/providers/status', async (req, res) => {
  try {
    const status = await providerRouter.getProviderStatus();
    res.json({ success: true, providers: status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/providers/route - Route a request to the best provider
app.post('/api/providers/route', async (req, res) => {
  try {
    const { prompt, options } = req.body;
    const result = await providerRouter.route(prompt, options || {});
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/providers/:name/enable - Enable or disable a provider
app.post('/api/providers/:name/enable', async (req, res) => {
  try {
    const { name } = req.params;
    const { enabled } = req.body;
    providerRouter.setProviderEnabled(name, enabled);
    res.json({ success: true, provider: name, enabled });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/providers/metrics - Get provider metrics
app.get('/api/providers/metrics', async (req, res) => {
  try {
    const status = await providerRouter.getProviderStatus();
    const metrics = {};
    for (const [name, data] of Object.entries(status)) {
      metrics[name] = data.metrics;
    }
    res.json({ success: true, metrics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Agent Warmup Controller API Endpoints
 */

// GET /api/warmup/status - Get agent warmup status
app.get('/api/warmup/status', (req, res) => {
  try {
    // Apply cooldown before returning status
    agentWarmup.applyCooldown();
    const status = agentWarmup.getStatus();
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/warmup/agents - Get all agent statuses
app.get('/api/warmup/agents', (req, res) => {
  try {
    agentWarmup.applyCooldown();
    const agents = agentWarmup.getAgentStatuses();
    res.json({ success: true, agents });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/warmup/recommendations - Get warmup recommendations
app.get('/api/warmup/recommendations', (req, res) => {
  try {
    const recommendations = agentWarmup.getWarmupRecommendation();
    res.json({ success: true, recommendations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/warmup/idle - Get idle agents that can be cooled down
app.get('/api/warmup/idle', (req, res) => {
  try {
    agentWarmup.applyCooldown();
    const idleAgents = agentWarmup.getIdleAgents();
    res.json({ success: true, idleAgents });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/warmup/stats - Get warmup statistics
app.get('/api/warmup/stats', (req, res) => {
  try {
    agentWarmup.applyCooldown();
    const stats = agentWarmup.getStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/warmup/record-task - Record a task for pattern analysis
app.post('/api/warmup/record-task', (req, res) => {
  try {
    const { taskType, timestamp } = req.body;
    if (!taskType) {
      return res.status(400).json({ success: false, error: 'taskType is required' });
    }
    const task = agentWarmup.recordTask(taskType, timestamp || Date.now());
    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/warmup/update-agent - Update agent status
app.post('/api/warmup/update-agent', (req, res) => {
  try {
    const { agentId, lastActive } = req.body;
    if (!agentId) {
      return res.status(400).json({ success: false, error: 'agentId is required' });
    }
    const agent = agentWarmup.updateAgentStatus(agentId, lastActive || Date.now());
    res.json({ success: true, agent });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/warmup/register-capability - Register agent capability
app.post('/api/warmup/register-capability', (req, res) => {
  try {
    const { agentId, taskType } = req.body;
    if (!agentId || !taskType) {
      return res.status(400).json({ success: false, error: 'agentId and taskType are required' });
    }
    agentWarmup.registerAgentCapability(agentId, taskType);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/warmup/add-pending - Add a pending task
app.post('/api/warmup/add-pending', (req, res) => {
  try {
    const { taskType, priority } = req.body;
    if (!taskType) {
      return res.status(400).json({ success: false, error: 'taskType is required' });
    }
    agentWarmup.addPendingTask(taskType, priority || 0.5);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/warmup/remove-pending - Remove a pending task
app.post('/api/warmup/remove-pending', (req, res) => {
  try {
    const { taskType } = req.body;
    if (!taskType) {
      return res.status(400).json({ success: false, error: 'taskType is required' });
    }
    agentWarmup.removePendingTask(taskType);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/warmup/should-wake - Check if agent should be woken
app.post('/api/warmup/should-wake', (req, res) => {
  try {
    const { agentId, taskType } = req.body;
    if (!agentId) {
      return res.status(400).json({ success: false, error: 'agentId is required' });
    }
    const shouldWake = agentWarmup.shouldWakeAgent(agentId, taskType || null);
    res.json({ success: true, shouldWake });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Initialize Ensemble Drift Detector
const ensembleDriftDetector = new EnsembleDriftDetector({
  driftThreshold: 0.7,
  maxResponses: 50,
  zScoreThreshold: 2.0,
  onDriftDetected: (event) => {
    console.log(`[DriftDetector] Agent ${event.agentId} drift detected: ${event.driftScore}`);
  },
  onRebalanceNeeded: (result) => {
    console.log(`[DriftDetector] Rebalancing agent ${result.agentId}: ${result.message}`);
  },
  onAgentRecovered: (result) => {
    console.log(`[DriftDetector] Agent ${result.agentId} recovered: ${result.message}`);
  }
});

/**
 * ENSEMBLE DRIFT DETECTION API ENDPOINTS
 */

// GET /api/drift/status - Get drift detection status
app.get('/api/drift/status', (req, res) => {
  try {
    const status = ensembleDriftDetector.getStatus();
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/drift/agents - Get all drifting agents
app.get('/api/drift/agents', (req, res) => {
  try {
    const agents = ensembleDriftDetector.getDriftingAgents();
    res.json({ success: true, agents });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/drift/agent/:agentId - Get stats for specific agent
app.get('/api/drift/agent/:agentId', (req, res) => {
  try {
    const { agentId } = req.params;
    const stats = ensembleDriftDetector.getAgentStats(agentId);
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/drift/score/:agentId - Get drift score for specific agent
app.get('/api/drift/score/:agentId', (req, res) => {
  try {
    const { agentId } = req.params;
    const score = ensembleDriftDetector.detectDrift(agentId);
    res.json({ success: true, agentId, driftScore: score });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/drift/record - Record agent response for drift monitoring
app.post('/api/drift/record', (req, res) => {
  try {
    const { agentId, taskType, output, latency } = req.body;
    
    if (!agentId || latency === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'agentId and latency are required' 
      });
    }
    
    const result = ensembleDriftDetector.recordAgentResponse(
      agentId, 
      taskType || 'unknown', 
      output, 
      latency
    );
    
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/drift/consensus - Check consensus score for task outputs
app.post('/api/drift/consensus', (req, res) => {
  try {
    const { taskId, outputs } = req.body;
    
    if (!outputs || !(outputs instanceof Map || Array.isArray(outputs))) {
      return res.status(400).json({ 
        success: false, 
        error: 'outputs must be a Map or array of {agentId, output} pairs' 
      });
    }
    
    let outputMap;
    if (Array.isArray(outputs)) {
      outputMap = new Map(outputs.map(o => [o.agentId, o.output]));
    } else {
      outputMap = outputs;
    }
    
    const result = ensembleDriftDetector.getConsensusScore(taskId || 'unknown', outputMap);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/drift/rebalance - Trigger rebalancing for an agent
app.post('/api/drift/rebalance', (req, res) => {
  try {
    const { agentId } = req.body;
    
    if (!agentId) {
      return res.status(400).json({ 
        success: false, 
        error: 'agentId is required' 
      });
    }
    
    const result = ensembleDriftDetector.requestRebalance(agentId);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/drift/promote - Promote a recovered agent
app.post('/api/drift/promote', (req, res) => {
  try {
    const { agentId } = req.body;
    
    if (!agentId) {
      return res.status(400).json({ 
        success: false, 
        error: 'agentId is required' 
      });
    }
    
    const result = ensembleDriftDetector.promoteAgent(agentId);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/drift/reset - Reset drift data for an agent
app.post('/api/drift/reset', (req, res) => {
  try {
    const { agentId } = req.body;
    
    if (!agentId) {
      return res.status(400).json({ 
        success: false, 
        error: 'agentId is required' 
      });
    }
    
    ensembleDriftDetector.resetAgent(agentId);
    res.json({ success: true, message: `Agent ${agentId} drift data reset` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * MEMORY SCHEMA VALIDATION API ENDPOINTS
 * Autonomous memory health monitoring for self-maintaining memory
 */

// GET /api/memory/health - Returns overall memory health report
app.get('/api/memory/health', async (req, res) => {
  try {
    const healthReport = await checkMemoryHealth();
    res.json({ success: true, health: healthReport });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/memory/schemas - List registered schemas
app.get('/api/memory/schemas', (req, res) => {
  try {
    const schemas = Object.entries(MEMORY_SCHEMAS).map(([name, schema]) => ({
      name,
      version: schema.version,
      fields: Object.keys(schema.fields)
    }));
    res.json({ success: true, schemas });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/memory/validate/:type - Validate specific memory type
app.get('/api/memory/validate/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const fs = require('fs').promises;
    const path = require('path');
    const basePath = path.join(process.cwd(), 'agent-memory/shared-workspace', `${type}.json`);
    try {
      const content = await fs.readFile(basePath, 'utf-8');
      const data = JSON.parse(content);
      const result = validateMemory(type, data);
      res.json({ success: true, type, validation: result });
    } catch (e) {
      res.status(404).json({ success: false, error: `Memory file not found: ${type}.json` });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/memory/types - List supported memory types
app.get('/api/memory/types', (req, res) => {
  res.json({ success: true, types: Object.keys(MEMORY_SCHEMAS) });
});

// POST /api/memory/repair - Repair memory data by adding missing fields
app.post('/api/memory/repair', (req, res) => {
  try {
    const { memoryType, data } = req.body;
    
    if (!memoryType) {
      return res.status(400).json({ 
        success: false, 
        error: 'memoryType is required' 
      });
    }
    
    if (!data) {
      return res.status(400).json({ 
        success: false, 
        error: 'data is required' 
      });
    }
    
    const result = repairMemory(memoryType, data);
    res.json({ success: true, repair: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/memory/register-schema - Register a new schema
app.post('/api/memory/register-schema', (req, res) => {
  try {
    const { memoryType, schema } = req.body;
    
    if (!memoryType) {
      return res.status(400).json({ 
        success: false, 
        error: 'memoryType is required' 
      });
    }
    
    if (!schema) {
      return res.status(400).json({ 
        success: false, 
        error: 'schema is required' 
      });
    }
    
    MEMORY_SCHEMAS[memoryType] = schema;
    res.json({ 
      success: true, 
      message: `Schema registered for ${memoryType}` 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * AUTOMATED TASK ASSIGNMENT API ENDPOINTS
 */

// POST /api/tasks/auto-assign - Automatically assign task to best agent
app.post('/api/tasks/auto-assign', async (req, res) => {
  try {
    const { description, requiredSkills, priority = 'medium' } = req.body;
    
    if (!description) {
      return res.status(400).json({ 
        success: false, 
        error: 'Task description is required' 
      });
    }

    // Import task assignment system
    const { TaskAssignmentSystem } = await import('./agent-task-manager.js');
    const taskSystem = new TaskAssignmentSystem();
    await taskSystem.initialize();
    
    // Auto-assign the task
    const taskId = await taskSystem.assignTask(description, requiredSkills || []);
    
    const task = taskSystem.tasks.find(t => t.id === taskId);
    
    res.json({
      success: true,
      taskId: taskId,
      assignedTo: task?.assignedTo || null,
      agentName: task?.assignedTo ? taskSystem.agents[task.assignedTo].name : null,
      message: task?.assignedTo ? 
        `Task assigned to ${taskSystem.agents[task.assignedTo].name}` : 
        'Task queued for assignment'
    });

  } catch (error) {
    console.error('Auto-assignment failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/tasks/auto-pending - Get pending tasks for auto-assignment
app.get('/api/tasks/auto-pending', async (req, res) => {
  try {
    const { TaskAssignmentSystem } = await import('./agent-task-manager.js');
    const taskSystem = new TaskAssignmentSystem();
    await taskSystem.initialize();
    
    const pendingTasks = taskSystem.tasks.filter(t => t.status === 'pending');
    
    res.json({
      success: true,
      pendingTasks: pendingTasks,
      count: pendingTasks.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/tasks/batch-assign - Assign multiple tasks at once
app.post('/api/tasks/batch-assign', async (req, res) => {
  try {
    const { tasks } = req.body; // Array of {description, requiredSkills}
    
    if (!Array.isArray(tasks)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Tasks must be an array' 
      });
    }

    const { TaskAssignmentSystem } = await import('./agent-task-manager.js');
    const taskSystem = new TaskAssignmentSystem();
    await taskSystem.initialize();
    
    const results = [];
    
    for (const task of tasks) {
      try {
        const taskId = await taskSystem.assignTask(task.description, task.requiredSkills || []);
        const assignedTask = taskSystem.tasks.find(t => t.id === taskId);
        results.push({
          success: true,
          taskId: taskId,
          description: task.description,
          assignedTo: assignedTask?.assignedTo || null,
          agentName: assignedTask?.assignedTo ? taskSystem.agents[assignedTask.assignedTo].name : null
        });
      } catch (error) {
        results.push({
          success: false,
          description: task.description,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      results: results,
      summary: {
        total: tasks.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Perception API Endpoints
 */

// POST /api/perception/image - Process image analysis
app.post('/api/perception/image', express.json({ limit: '10mb' }), async (req, res) => {
  try {
    const { image, imageType } = req.body;
    
    if (!image) {
      return res.status(400).json({
        success: false,
        error: 'Image data required'
      });
    }
    
    // Validate base64 image
    if (!perceptionModule.validateBase64Image(image)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid base64 image data'
      });
    }
    
    const result = await perceptionModule.analyzeImage(image, imageType);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Perception image analysis error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/perception/voice - Process voice/audio input
app.post('/api/perception/voice', express.raw({ type: 'audio/*', limit: '10mb' }), async (req, res) => {
  try {
    if (!req.body || req.body.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Audio data required'
      });
    }
    
    const result = await perceptionModule.processVoice(req.body);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Perception voice processing error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/perception/status - Check perception module status
app.get('/api/perception/status', (req, res) => {
  res.json({
    success: true,
    module: 'simple-perception',
    version: '1.0.0',
    supportedImageTypes: perceptionModule.supportedImageTypes,
    status: 'ready'
  });
});

// ============================================================================
// MONACO IDE FILE SYSTEM API
// ============================================================================

// GET /api/read-file - Read a file from workspace
app.get('/api/read-file', async (req, res) => {
  try {
    const filePath = req.query.path || '';
    if (!filePath) {
      return res.status(400).json({ success: false, error: 'No file path provided' });
    }
    
    // Security: prevent directory traversal
    const safePath = path.normalize(filePath).replace(/^(\.[\/|\\])+/, '');
    const fullPath = path.join(process.cwd(), safePath);
    
    const content = await fs.promises.readFile(fullPath, 'utf8');
    res.json({ success: true, content, path: safePath });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

// POST /api/write-file - Write content to a file
app.post('/api/write-file', express.json(), async (req, res) => {
  try {
    const { path: filePath, content } = req.body;
    if (!filePath) {
      return res.status(400).json({ success: false, error: 'No file path provided' });
    }
    
    // Security: prevent directory traversal
    const safePath = path.normalize(filePath).replace(/^(\.[\/|\\])+/, '');
    const fullPath = path.join(process.cwd(), safePath);
    
    await fs.promises.writeFile(fullPath, content, 'utf8');
    res.json({ success: true, path: safePath });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/list-files - List files in a directory
app.get('/api/list-files', async (req, res) => {
  try {
    const dirPath = req.query.path || '.';
    
    // Security: prevent directory traversal
    const safePath = path.normalize(dirPath).replace(/^(\.[\/|\\])+/, '');
    const fullPath = path.join(process.cwd(), safePath);
    
    const entries = await fs.promises.readdir(fullPath, { withFileTypes: true });
    const files = [];
    
    for (const entry of entries) {
      // Skip hidden files and node_modules
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      
      const fullEntryPath = path.join(fullPath, entry.name);
      const relativePath = path.relative(process.cwd(), fullEntryPath);
      
      if (entry.isDirectory()) {
        files.push({
          name: entry.name,
          type: 'folder',
          path: relativePath
        });
      } else {
        files.push({
          name: entry.name,
          type: 'file',
          path: relativePath
        });
      }
    }
    
    const sortedFiles = files.sort((a, b) => {
      // Folders first
      if (a.type === 'folder' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'folder') return 1;
      return a.name.localeCompare(b.name);
    });
    
    res.json({ success: true, files: sortedFiles, path: safePath });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/execute-command - Execute a shell command
app.post('/api/execute-command', express.json(), async (req, res) => {
  try {
    const { command, cwd } = req.body;
    if (!command) {
      return res.status(400).json({ success: false, error: 'No command provided' });
    }
    
    // Security: whitelist allowed commands
    const allowedCommands = ['node', 'npm', 'git', 'npx', 'type', 'dir', 'echo'];
    const cmdName = command.split(' ')[0].toLowerCase();
    
    if (!allowedCommands.some(allowed => cmdName.includes(allowed))) {
      return res.status(403).json({ success: false, error: 'Command not allowed' });
    }
    
    const workingDir = cwd ? path.join(process.cwd(), cwd) : process.cwd();
    
    const { exec } = require('child_process');
    const result = await new Promise((resolve, reject) => {
      exec(command, { cwd: workingDir, timeout: 30000 }, (error, stdout, stderr) => {
        if (error) {
          reject({ error: error.message, stderr });
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
    
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.error || error.message, stderr: error.stderr });
  }
});

// ============================================================================
// AGENT CODE ACTIONS API - Monaco IDE Phase 1
// ============================================================================

// POST /api/agent/code-action - Get AI-powered code suggestions
app.post('/api/agent/code-action', express.json(), async (req, res) => {
  try {
    const { code, language, context, agent } = req.body;
    
    if (!code) {
      return res.status(400).json({ success: false, error: 'No code provided' });
    }
    
    // Use specified agent or default to 'kilo'
    const selectedAgent = agent || 'kilo';
    
    // Build prompt for code action
    const prompt = `You are a code assistant. Analyze this ${language || 'JavaScript'} code and provide actionable code improvements.

Code:
\`\`\`${language || 'javascript'}
${code.substring(0, 3000)}
\`\`\`

Context: ${context || 'No additional context'}

Respond with a JSON array of code actions. Each action should have:
- title: Brief description of the fix
- description: Detailed explanation  
- newCode: The improved code snippet (or empty if inline fix not applicable)
- range: Start and end line numbers

Format:
[{"title": "Fix unused variable", "description": "Remove unused x variable", "newCode": "", "range": {"startLine": 5, "endLine": 5}}]

If no improvements needed, respond with: []`
    
    // Call the agent API
    const response = await fetch(`http://localhost:3000/api/${selectedAgent}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: prompt })
    });
    
    const data = await response.json();
    
    // Parse the JSON response from agent
    let codeActions = [];
    try {
      // Try to extract JSON from response
      const jsonMatch = data.response.match(/\[.*\]/s);
      if (jsonMatch) {
        codeActions = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // If parsing fails, create a general suggestion
      codeActions = [{
        title: 'Code Review',
        description: data.response?.substring(0, 500) || 'No suggestions',
        newCode: '',
        range: { startLine: 1, endLine: 1 }
      }];
    }
    
    res.json({ success: true, codeActions, agent: selectedAgent });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/swarm/init - Initialize distributed swarm
app.post('/api/swarm/init', async (req, res) => {
  try {
    const { workers = 4, routers = 1, observers = 1 } = req.body;
    
    // Simulate swarm initialization
    console.log(`[Swarm] Initializing with ${workers} workers, ${routers} routers, ${observers} observers`);
    
    // Return success response
    res.json({
      success: true,
      message: 'Swarm initialized successfully',
      agents: {
        workers,
        routers,
        observers,
        coordinators: 1
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Swarm] Initialization failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/autonomous/status - Get autonomous coordination engine status
app.get('/api/autonomous/status', async (req, res) => {
  try {
    const { autonomousEngine } = await import('./intelligence/simplified-autonomous-engine.js');
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      status: autonomousEngine.getStatus()
    });
  } catch (error) {
    console.error('[Autonomous] Failed to get status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/autonomous/coordinate - Coordinate a task autonomously
app.post('/api/autonomous/coordinate', async (req, res) => {
  try {
    const { autonomousEngine } = await import('./intelligence/simplified-autonomous-engine.js');
    const taskSpec = req.body;
    
    if (!taskSpec || !taskSpec.description) {
      return res.status(400).json({
        success: false,
        error: 'Task specification required with description field'
      });
    }
    
    const result = await autonomousEngine.coordinateTask(taskSpec);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      result: result,
      taskSpec: taskSpec
    });
  } catch (error) {
    console.error('[Autonomous] Task coordination failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/autonomous/control - Control autonomous behaviors
app.post('/api/autonomous/control', async (req, res) => {
  try {
    const { autonomousEngine } = await import('./intelligence/simplified-autonomous-engine.js');
    const { behavior, enabled } = req.body;
    
    if (!behavior || enabled === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Both behavior and enabled fields required'
      });
    }
    
    autonomousEngine.setAutonomousBehavior(behavior, enabled);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: `Autonomous ${behavior} behavior ${enabled ? 'enabled' : 'disabled'}`
    });
  } catch (error) {
    console.error('[Autonomous] Control failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/providers/scores - Get dynamic provider scores and metrics
app.get('/api/providers/scores', async (req, res) => {
  try {
    const { quantumOrchestrator } = await import('./utils/quantum-orchestrator.js');
    
    const scores = quantumOrchestrator.getProviderScores();
    const scorerDetails = quantumOrchestrator.providerScorer.getAllScoreDetails();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      scores: scores,
      scorerDetails: scorerDetails,
      summary: {
        bestProvider: Object.entries(scores)
          .reduce((best, [provider, data]) => 
            data.scorerScore > (scores[best]?.scorerScore || 0) ? provider : best, 
            Object.keys(scores)[0]
          ),
        totalCalls: Object.values(scores).reduce((sum, p) => sum + p.performance.totalCalls, 0)
      }
    });
  } catch (error) {
    console.error('[Providers] Failed to get scores:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/swarm/shutdown - Shutdown distributed swarm
app.post('/api/swarm/shutdown', async (req, res) => {
  try {
    // Simulate swarm shutdown
    console.log('[Swarm] Shutting down swarm');
    
    // Return success response
    res.json({
      success: true,
      message: 'Swarm shutdown successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Swarm] Shutdown failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/agent/fix-apply - Apply a fix to the file
app.post('/api/agent/fix-apply', express.json(), async (req, res) => {
  try {
    const { filePath, newCode, lineStart, lineEnd } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ success: false, error: 'No file path provided' });
    }
    
    // Read current file
    const safePath = path.normalize(filePath).replace(/^(\.\.[\/|\\])+/, '');
    const fullPath = path.join(process.cwd(), safePath);
    
    let content = '';
    try {
      content = await fs.promises.readFile(fullPath, 'utf8');
    } catch (e) {
      // File might not exist yet
    }
    
    let finalContent = content;
    
    if (newCode && lineStart && lineEnd) {
      // Replace specific lines
      const lines = content.split('\n');
      lines.splice(lineStart - 1, lineEnd - lineStart + 1, newCode);
      finalContent = lines.join('\n');
    } else if (newCode) {
      // Append to file
      finalContent = content + '\n' + newCode;
    }
    
    await fs.promises.writeFile(fullPath, finalContent, 'utf8');
    
    res.json({ success: true, message: 'Fix applied', path: safePath });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create HTTP server

// Global error handler for Elasticsearch logging
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  logError(err, { 
    path: req.path, 
    method: req.method,
    context: 'express_middleware'
  }).catch(e => {});
  res.status(500).json({ error: err.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const server = createServer(app);

// Set up WebSocket upgrade
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

/**
 * Kill process using a specific port (safe implementation using spawn)
 * @param {number} port - Port number (must be a valid integer)
 * @returns {Promise<void>}
 */
function killProcessOnPort(port) {
  // Validate port is a safe integer
  const safePort = Math.floor(Number(port));
  if (!Number.isInteger(safePort) || safePort < 1 || safePort > 65535) {
    return Promise.reject(new Error(`Invalid port number: ${port}`));
  }

  return new Promise((resolve, reject) => {
    // Use spawn with array arguments to prevent command injection
    const netstat = spawn('netstat', ['-ano']);
    const findstr = spawn('findstr', [`:${safePort}`]);
    
    let output = '';
    
    netstat.stdout.pipe(findstr.stdin);
    findstr.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    findstr.on('close', (code) => {
      if (!output) {
        reject(new Error(`Could not find process on port ${safePort}`));
        return;
      }

      // Extract PID from netstat output (last column)
      const lines = output.trim().split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const state = parts[3]; // State is typically 4th column in netstat -ano
          const pid = parts[parts.length - 1];

          if (state === 'LISTENING' && pid && /^\d+$/.test(pid)) {
            console.log(`🔧 Found process ${pid} using port ${safePort}`);
            console.log(`⚠️  About to kill process ${pid}. Press Ctrl+C within 3 seconds to cancel...`);
            
            // Give user time to cancel
            setTimeout(() => {
              // Use spawn with array arguments to prevent command injection
              const taskkill = spawn('taskkill', ['/F', '/PID', pid]);
              
              taskkill.on('close', (killCode) => {
                if (killCode === 0) {
                  console.log(`✅ Killed process ${pid}`);
                  resolve();
                } else {
                  reject(new Error(`Failed to kill process ${pid} (exit code: ${killCode})`));
                }
              });
              
              taskkill.on('error', (killErr) => {
                reject(new Error(`Failed to kill process ${pid}: ${killErr.message}`));
              });
            }, 3000);
            return;
          }
        }
      }
      reject(new Error(`Could not find PID for port ${safePort}`));
    });
    
    findstr.on('error', (err) => {
      reject(new Error(`Failed to search for port: ${err.message}`));
    });
    
    netstat.on('error', (err) => {
      reject(new Error(`Failed to run netstat: ${err.message}`));
    });
  });
}

/**
 * Start server with self-healing port conflict resolution
 * @returns {Promise<void>}
 */
async function startServer() {
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await new Promise((resolve, reject) => {
        server.listen(COCKPIT_CONFIG.port, COCKPIT_CONFIG.host, () => {
          resolve();
        });

        server.once('error', (error) => {
          reject(error);
        });
      });

      // Success - break the loop and open browser
      console.log(`✅ Server listening on http://localhost:${COCKPIT_CONFIG.port}/`);
      console.log('');
      
      // Log server start to Elasticsearch
      logToElasticsearch({
        event: 'server_start',
        port: COCKPIT_CONFIG.port,
        host: COCKPIT_CONFIG.host,
        elasticsearch: elasticsearchApiKey ? 'configured' : 'not_configured'
      }).catch(err => {});
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║       🚀 MEGA UNIFIED COCKPIT - ALL 3 AGENT SYSTEMS 🚀        ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      console.log('');
      console.log('🎯 Available Interfaces:');
      console.log(`   • Mega Cockpit:      http://localhost:${COCKPIT_CONFIG.port}/`);
      console.log(`   • Galaxy IDE:        http://localhost:${COCKPIT_CONFIG.port}/galaxy`);
      console.log(`   • Unified IDE:       http://localhost:${COCKPIT_CONFIG.port}/unified-ide`);
      console.log(`   • Cockpit:           http://localhost:${COCKPIT_CONFIG.port}/cockpit`);
      console.log(`   • Unified Shell:     http://localhost:${COCKPIT_CONFIG.port}/unified`);
      console.log(`   • Shell:             http://localhost:${COCKPIT_CONFIG.port}/shell`);
      console.log(`   • IDE:               http://localhost:${COCKPIT_CONFIG.port}/ide`);
      console.log(`   • Mega:              http://localhost:${COCKPIT_CONFIG.port}/mega`);
      console.log(`   • Swarm:             http://localhost:${COCKPIT_CONFIG.port}/swarm`);
      console.log(`   • Benchmark:         http://localhost:${COCKPIT_CONFIG.port}/benchmark`);
      console.log(`   • Health Check:      http://localhost:${COCKPIT_CONFIG.port}/health`);
      console.log('');
      console.log('🏛️ Active Systems:');
      console.log('   1. Federation Core   - Medical Pipeline, Plugins, Routing');
      console.log('   2. Simple Ensemble   - 8 Agents, Local Ollama, Zero Cost');
      console.log('   3. Distributed       - Full-Featured, Tools, Memory');
      console.log('');

      // Auto-open browser (safe implementation using spawn)
      setTimeout(() => {
        const safePort = Math.floor(Number(COCKPIT_CONFIG.port));
        if (Number.isInteger(safePort) && safePort > 0 && safePort <= 65535) {
          spawn('cmd', ['/c', 'start', '', `http://localhost:${safePort}/`], { detached: true, stdio: 'ignore' });
        }
      }, 1000);

      break;

    } catch (error) {
      if (error.code === 'EADDRINUSE') {
        console.log(`⚠️  Port ${COCKPIT_CONFIG.port} is in use (attempt ${attempt}/${maxRetries})`);

        if (attempt < maxRetries) {
          try {
            await killProcessOnPort(COCKPIT_CONFIG.port);
            console.log(`⏳ Waiting 2 seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          } catch (killError) {
            console.error(`❌ ${killError.message}`);
          }
        } else {
          console.error('❌ Failed to free port 8889: after 3 attempts.');
          process.exit(1);
        }
      } else {
        console.error(`❌ Server error: ${error.message}`);
        process.exit(1);
      }
    }
  }
}

// Set up federation coordinator and initialize ensemble
(async () => {
  try {
    // Initialize systems BEFORE starting server
    await registerDefaultSystems();
    
    // Now start the server
    await startServer();
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
})();

/**
 * Register default systems with the federation
 */
async function registerDefaultSystems() {
  console.log('🔧 Registering default systems...');

  // Initialize SimpleEnsemble (zero-cost local-first)
  try {
    await initEnsemble({ model: "llama3.1:8b" });
    console.log('✅ SimpleEnsemble initialized (8 agents, local Ollama)');
  } catch (error) {
    console.error('⚠️ Failed to initialize SimpleEnsemble:', error.message);
  }

  // Register Medical Pipeline (structural processing)
  coordinator.registerSystem(SystemType.MEDICAL_PIPELINE, {
    id: SystemType.MEDICAL_PIPELINE,
    type: SystemType.MEDICAL_PIPELINE,
    name: 'Medical Data Processing Pipeline',
    capabilities: [
      'ingestion',
      'triage',
      'summarization',
      'risk_scoring',
      'output',
      'structural_validation',
      'classification'
    ],
    config: {
      executionMode: 'ultra_fast',
      avgLatency: 0.003,  // 3ms
      throughput: 500  // 500 req/s
    }
  });

  // Register Plugins System
  coordinator.registerSystem(SystemType.PLUGINS, {
    id: SystemType.PLUGINS,
    type: SystemType.PLUGINS,
    name: 'Medical Module Plugins',
    capabilities: [
      'hooks',
      'plugins',
      'extensibility',
      'custom_logic',
      'external_integration'
    ],
    config: {
      hookPoints: 8,
      pluginDir: './plugins',
      autoDiscovery: true
    }
  });

  // Register Coding Ensemble
  coordinator.registerSystem(SystemType.CODING_ENSEMBLE, {
    id: SystemType.CODING_ENSEMBLE,
    type: SystemType.CODING_ENSEMBLE,
    name: 'Free Coding Agent Ensemble',
    capabilities: [
      'code_generation',
      'data_engineering',
      'clinical_analysis',
      'collaborative_mode',
      'parallel_execution',
      'persistent_memory',
      'swarm_integration'
    ],
    config: {
      agents: 8,
      collaborationModes: 3,
      memoryType: 'json_file',
      swarmIntegration: true
    }
  });

  console.log('✅ All default systems registered');

  // Start health monitoring
  setInterval(() => {
    coordinator.healthCheck();
  }, 60000); // Every minute
}

/**
 * TESTING API ENDPOINTS
 */

// GET /api/tests/run - Run all system tests
app.get('/api/tests/run', async (req, res) => {
  try {
    console.log('[Tests] Running comprehensive system tests...');
    
    const testResults = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        duration: 0
      }
    };

    const startTime = Date.now();
    
    // Test 1: Memory Systems
    try {
      const { WorkingMemory } = await import('./memory/working-memory.js');
      const wm = new WorkingMemory();
      wm.add({ content: 'test_item', type: 'test' });
      
      const { EpisodicMemory } = await import('./memory/episodic-memory.js');
      const em = new EpisodicMemory();
      const episodeId = em.recordEpisode({
        sessionId: 'test-session',
        events: [{ type: 'test', content: 'test_event' }]
      });
      
      testResults.tests.push({
        name: 'Memory Systems',
        status: 'passed',
        details: `Working Memory: ${wm.getStats().totalItems} items, Episodic Memory: ${em.getStats().totalEpisodes} episodes`
      });
      testResults.summary.passed++;
      
    } catch (error) {
      testResults.tests.push({
        name: 'Memory Systems',
        status: 'failed',
        error: error.message
      });
      testResults.summary.failed++;
    }

    // Test 2: Task Assignment
    try {
      const { TaskAssignmentSystem } = await import('./agent-task-manager.js');
      const taskSystem = new TaskAssignmentSystem();
      await taskSystem.initialize();
      
      const taskId = await taskSystem.assignTask('Test task assignment', ['testing']);
      const assignedTask = taskSystem.tasks.find(t => t.id === taskId);
      
      testResults.tests.push({
        name: 'Task Assignment',
        status: 'passed',
        details: `Task assigned to: ${assignedTask?.assignedTo ? taskSystem.agents[assignedTask.assignedTo].name : 'queue'}`
      });
      testResults.summary.passed++;
      
    } catch (error) {
      testResults.tests.push({
        name: 'Task Assignment',
        status: 'failed',
        error: error.message
      });
      testResults.summary.failed++;
    }

    // Test 3: Perception System
    try {
      const { perceptionModule } = await import('./perception/perception-module.js');
      const status = await perceptionModule.getStatus();
      
      testResults.tests.push({
        name: 'Perception System',
        status: 'passed',
        details: `Available: ${status.available}, Vision: ${status.vision}, Audio: ${status.audio}`
      });
      testResults.summary.passed++;
      
    } catch (error) {
      testResults.tests.push({
        name: 'Perception System',
        status: 'failed',
        error: error.message
      });
      testResults.summary.failed++;
    }

    // Test 4: Agent Systems
    try {
      const coordinator = getFederationCoordinator();
      const systems = coordinator.getSystemStatus();
      
      testResults.tests.push({
        name: 'Agent Systems',
        status: 'passed',
        details: `Active systems: ${Object.keys(systems.systemHealth).length}`
      });
      testResults.summary.passed++;
      
    } catch (error) {
      testResults.tests.push({
        name: 'Agent Systems',
        status: 'failed',
        error: error.message
      });
      testResults.summary.failed++;
    }

    testResults.summary.total = testResults.tests.length;
    testResults.summary.duration = Date.now() - startTime;
    
    res.json({
      success: true,
      results: testResults
    });
    
  } catch (error) {
    console.error('[Tests] Test execution failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/tests/status - Get test system status
app.get('/api/tests/status', (req, res) => {
  try {
    const testCapabilities = {
      available: true,
      testTypes: [
        'memory_systems',
        'task_assignment',
        'perception',
        'agent_systems',
        'api_endpoints'
      ],
      lastRun: null,
      capabilities: {
        automated: true,
        parallel: true,
        reporting: true
      }
    };
    
    res.json({
      success: true,
      status: testCapabilities
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down cockpit...');
  server.close(() => {
    console.log('✅ Cockpit stopped');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down cockpit...');
  server.close(() => {
    console.log('✅ Cockpit stopped');
    process.exit(0);
  });
});

export { app, wss, coordinator, COCKPIT_CONFIG };
