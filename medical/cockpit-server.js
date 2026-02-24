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

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { getFederationCoordinator, SystemType } from './federation-core.js';
import { initEnsemble, getEnsemble } from './free-coding-agent/src/simple-ensemble.js';
import { spawn } from 'child_process';

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
    const { message, agents: selectedAgents } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('[API /api/chat] Received message:', message.substring(0, 100));
    console.log('[API /api/chat] Selected agents:', selectedAgents || 'all');

    const ensemble = getEnsemble();
    
    // Check if ensemble is initialized
    if (!ensemble.agents) {
      console.error('[API /api/chat] Ensemble not initialized!');
      return res.status(503).json({ 
        success: false, 
        error: 'Ensemble not initialized. Please restart the server.' 
      });
    }

    // Set a timeout for the entire operation
    const timeoutMs = 120000; // 2 minutes max
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Chat request timed out')), timeoutMs)
    );

    const result = await Promise.race([
      ensemble.execute(message, selectedAgents || []),
      timeoutPromise
    ]);

    console.log('[API /api/chat] Execution completed in', result.executionTime, 'ms');
    res.json({ success: true, ...result });

  } catch (error) {
    console.error('[API /api/chat] Chat request failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

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

// Create HTTP server
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
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║       🚀 MEGA UNIFIED COCKPIT - ALL 3 AGENT SYSTEMS 🚀        ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      console.log('');
      console.log('🎯 Available Interfaces:');
      console.log(`   • Mega Cockpit (All 3 Systems): http://localhost:${COCKPIT_CONFIG.port}/`);
      console.log(`   • Federation Core:             http://localhost:${COCKPIT_CONFIG.port}/federation`);
      console.log(`   • Galaxy IDE:                  http://localhost:${COCKPIT_CONFIG.port}/galaxy`);
      console.log(`   • Unified IDE:                 http://localhost:${COCKPIT_CONFIG.port}/unified-ide`);
      console.log(`   • Basic Cockpit:               http://localhost:${COCKPIT_CONFIG.port}/cockpit`);
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

// Set up federation coordinator
registerDefaultSystems();

// Start server with self-healing (wrap in async IIFE)
(async () => {
  try {
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
