// FreeAgent Cockpit Server for Cloud Shell
// Updated with Orchestrator, Gemini, Vector Memory, and Multi-Session Support
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { exec, spawn } = require('child_process');
const WebSocket = require('ws');

// Import Agent Capabilities
const { AgentCapabilities } = require('./agents/agentCapabilities');
const agentCapabilities = new AgentCapabilities();

// Import Services
const { getAllServices, getEnabledServices, getService } = require('./services/index');
const { createGovernance } = require('./services/governance');
const governance = createGovernance();

// Import Agent Coordination
const { getCoordinator } = require('../services/agent-coordinator');
const coordinator = getCoordinator();

// Import Advanced Multi-Agent Services
const { RecursiveEngine, getEngine } = require('../services/recursive-engine');
const { CostTracker, getTracker } = require('../services/cost-tracker');
const { IterationGovernor, getGovernor } = require('../services/iteration-governor');
const { ContextSlice, getSlice } = require('../services/context-slice');
const { MultiAgentScheduler, getScheduler } = require('../services/multi-agent-scheduler');
const { RealTimeDashboard, getDashboard } = require('../services/real-time-dashboard');

// Initialize advanced services
const recursiveEngine = getEngine();
const costTracker = getTracker();
const iterationGovernor = getGovernor();
const contextSlice = getSlice();
const multiAgentScheduler = getScheduler({ maxConcurrency: 3 });
let realTimeDashboard = null; // Will be created after server is available

// Auto-open browser on startup
const AUTO_OPEN_BROWSER = process.env.AUTO_OPEN_BROWSER !== 'false';

// Try multiple browser paths to find one that works
function getBrowserPath() {
  const browserPaths = [
    process.env.BROWSER_PATH, // Custom path from env
    'S:\\chrome-win\\chrome-win\\chrome.exe',  // User's Chromium (lightweight!)
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    null // Will fallback to system default
  ];
  
  // Return first valid path or null for default
  for (const p of browserPaths) {
    if (!p) return null;
    try {
      require('fs').accessSync(p);
      return p;
    } catch { continue; }
  }
  return null;
}

const BROWSER_PATH = getBrowserPath();

// Import or create orchestrator
let orchestrator = null;

function getOrchestrator() {
  if (!orchestrator) {
    try {
      const { getOrchestrator: getOrch } = require('./orchestrator');
      orchestrator = getOrch();
    } catch (e) {
      console.log('[Server] Creating inline orchestrator');
      // Create basic orchestrator inline
      orchestrator = createBasicOrchestrator();
    }
  }
  return orchestrator;
}

function createBasicOrchestrator() {
  return {
    async process(request) {
      return { text: 'Orchestrator not fully initialized', agent: 'none' };
    },
    async healthCheck() {
      return { local: false, claude: false, gemini: false, memory: false, sessions: false };
    }
  };
}

const app = express();
/* // Mount Cockpit Backend Routes (disabled - using direct API endpoints below)
// app.use('/metrics', require('./metrics'));
// app.use('/sessions', require('./sessions'));
// app.use('/agents', require('./agents')); */
// Static files - serve from current directory (where index.html, styles.css, index.js are)
app.use(express.static(__dirname));

// Also check static folder if it exists
const staticPath = path.join(__dirname, 'static');
if (fs.existsSync(staticPath)) {
  app.use(express.static(staticPath));
}

app.use(cors());
app.use(bodyParser.json());

// Prevent favicon 404 errors
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Root route - serve index.html with fallback to static path
app.get('/', (req, res) => {
  console.log('[Server] Root path requested from:', req.ip, '- User-Agent:', req.get('user-agent'));
  
  // First check for dist/index.html (for builds)
  const distIndexPath = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(distIndexPath)) {
    console.log('[Server] Serving dist/index.html');
    return res.sendFile(distIndexPath);
  }
  
  // Fallback to cockpit/index.html directly
  const indexPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(indexPath)) {
    console.log('[Server] Serving cockpit/index.html');
    return res.sendFile(indexPath);
  }
  
  // No index.html found
  console.error('[Server] No index.html found! Searched paths:', { distIndexPath, indexPath, __dirname });
  res.status(404).json({ 
    error: 'No UI found', 
    searchedPaths: { distIndexPath, indexPath },
    hint: 'Add index.html to the workspace root or configure a frontend build'
  });
});

// CSP Headers
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', 
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'unsafe-hashes' https://cdn.jsdelivr.net https://unpkg https://cdnjs.cloudflare.com blob:; " +
    "worker-src 'self' blob:; " +
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com; " +
    "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com; " +
    "img-src 'self' data: blob: https:; " +
    "connect-src 'self' ws: wss: http: https: http://localhost:54112 http://localhost:*;"
  );
  next();
});

// System State
const systemState = {
  orchestratorReady: false,
  initializedAt: Date.now(),
  tasksCompleted: 0,
  activeAgents: new Set(),
  providerStatus: {
    local: { connected: false, model: null },
    claude: { connected: false },
    gemini: { connected: false },
    memory: { connected: false },
    sessions: { connected: false }
  }
};

// =====================
// WebSocket Handling
// =====================
const wss = new WebSocket.Server({ noServer: true });

function broadcastMessage(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Message handlers
const messageHandlers = {
  // Orchestrator
  orchestrator_chat: handleOrchestratorChat,
  orchestrator_session_create: handleSessionCreate,
  orchestrator_session_list: handleSessionList,
  orchestrator_session_get: handleSessionGet,
  orchestrator_session_delete: handleSessionDelete,
  orchestrator_memory_search: handleMemorySearch,
  orchestrator_health: handleOrchestratorHealth,
  
  // Capabilities
  capabilities_request: handleCapabilitiesRequest,
  capabilities_validate: handleCapabilitiesValidate,
  
  // Legacy handlers (keep for compatibility)
  status_request: handleStatusRequest,
  init: handleInit,
  ping: handlePing,
  chat: handleChat,
  execute_command: handleExecuteCommand
};

async function handleOrchestratorChat(ws, data) {
  const { message, sessionId, history, agent, model } = data;
  
  console.log('[Server] Chat request:', { hasAgent: !!agent, agent, hasModel: !!model, model });
  
  try {
    const orch = getOrchestrator();
    const result = await orch.process({ message, sessionId, history: history || [], agent, model });
    
    ws.send(JSON.stringify({
      type: 'orchestrator_response',
      text: result.text,
      agent: result.agent,
      tokens: result.tokens,
      latency: result.latency,
      timestamp: Date.now()
    }));
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'orchestrator_error',
      error: error.message,
      timestamp: Date.now()
    }));
  }
}

async function handleSessionCreate(ws, data) {
  const { name, description } = data;
  
  try {
    const orch = getOrchestrator();
    const session = await orch.createSession(name, { description });
    
    ws.send(JSON.stringify({
      type: 'session_created',
      session,
      timestamp: Date.now()
    }));
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'session_error',
      error: error.message,
      timestamp: Date.now()
    }));
  }
}

async function handleSessionList(ws, data) {
  try {
    const orch = getOrchestrator();
    const sessions = await orch.listSessions();
    
    ws.send(JSON.stringify({
      type: 'session_list',
      sessions,
      timestamp: Date.now()
    }));
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'session_error',
      error: error.message,
      timestamp: Date.now()
    }));
  }
}

async function handleSessionGet(ws, data) {
  const { sessionId } = data;
  
  try {
    const orch = getOrchestrator();
    const session = await orch.getSession(sessionId);
    
    ws.send(JSON.stringify({
      type: 'session_data',
      session,
      timestamp: Date.now()
    }));
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'session_error',
      error: error.message,
      timestamp: Date.now()
    }));
  }
}

async function handleSessionDelete(ws, data) {
  const { sessionId } = data;
  
  try {
    const orch = getOrchestrator();
    await orch.deleteSession(sessionId);
    
    ws.send(JSON.stringify({
      type: 'session_deleted',
      sessionId,
      timestamp: Date.now()
    }));
    
    // Refresh session list
    const sessions = await orch.listSessions();
    ws.send(JSON.stringify({
      type: 'session_list',
      sessions,
      timestamp: Date.now()
    }));
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'session_error',
      error: error.message,
      timestamp: Date.now()
    }));
  }
}

async function handleMemorySearch(ws, data) {
  const { query, collection, limit } = data;
  
  try {
    const orch = getOrchestrator();
    const results = await orch.searchMemory(query, { collection, limit: limit || 5 });
    
    ws.send(JSON.stringify({
      type: 'memory_results',
      results,
      timestamp: Date.now()
    }));
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'memory_error',
      error: error.message,
      timestamp: Date.now()
    }));
  }
}

async function handleOrchestratorHealth(ws, data) {
  try {
    const orch = getOrchestrator();
    const health = await orch.healthCheck();
    
    ws.send(JSON.stringify({
      type: 'orchestrator_health',
      ...health,
      timestamp: Date.now()
    }));
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'orchestrator_health_error',
      error: error.message,
      timestamp: Date.now()
    }));
  }
}

// Capabilities handlers
function handleCapabilitiesRequest(ws, data) {
  ws.send(JSON.stringify({
    type: 'capabilities_response',
    name: agentCapabilities.name,
    version: agentCapabilities.version,
    capabilities: agentCapabilities.capabilities,
    limitations: agentCapabilities.limitations,
    summary: agentCapabilities.getCapabilitiesSummary(),
    timestamp: Date.now()
  }));
}

function handleCapabilitiesValidate(ws, data) {
  const { action } = data;
  if (!action) {
    ws.send(JSON.stringify({
      type: 'capabilities_validate_error',
      error: 'Action is required',
      timestamp: Date.now()
    }));
    return;
  }
  
  ws.send(JSON.stringify({
    type: 'capabilities_validate_response',
    ...agentCapabilities.validateAction(action),
    timestamp: Date.now()
  }));
}

// Legacy handlers
function handleStatusRequest(ws, data) {
  ws.send(JSON.stringify({
    type: 'status_response',
    timestamp: Date.now(),
    uptime: process.uptime(),
    tasksCompleted: systemState.tasksCompleted,
    activeAgents: systemState.activeAgents.size,
    orchestratorReady: systemState.orchestratorReady,
    providers: systemState.providerStatus,
    platform: process.platform
  }));
}

function handleInit(ws, data) {
  console.log('[Server] Client initialization:', data);
  
  // Initialize orchestrator in background
  getOrchestrator().then(() => {
    systemState.orchestratorReady = true;
    console.log('[Server] Orchestrator ready');
    
    ws.send(JSON.stringify({
      type: 'orchestrator_ready',
      timestamp: Date.now(),
      features: ['gemini', 'vector-memory', 'multi-session']
    }));
  }).catch(err => {
    console.error('[Server] Orchestrator init error:', err);
  });
  
  ws.send(JSON.stringify({ type: 'init_ack', success: true }));
}

function handlePing(ws, data) {
  ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
}

function handleChat(ws, data) {
  broadcastMessage(data);
}

function handleExecuteCommand(ws, data) {
  const { command, shell = 'bash', cwd } = data;
  
  if (!command) {
    ws.send(JSON.stringify({ 
      type: 'command_result', 
      success: false, 
      error: 'No command provided' 
    }));
    return;
  }
  
  console.log(`[Server] Executing: ${command}`);
  
  const isWindows = process.platform === 'win32';
  let shellCmd, args;
  
  if (shell === 'powershell' || (shell === 'bash' && isWindows)) {
    shellCmd = isWindows ? 'powershell' : '/bin/bash';
    args = isWindows ? ['-Command', command] : ['-c', command];
  } else {
    shellCmd = isWindows ? 'cmd' : '/bin/sh';
    args = isWindows ? ['/c', command] : ['-c', command];
  }
  
  const child = spawn(shellCmd, args, {
    cwd: cwd || process.cwd(),
    timeout: 60000,
    maxBuffer: 10 * 1024 * 1024
  });
  
  let stdout = '';
  let stderr = '';
  
  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
    ws.send(JSON.stringify({
      type: 'command_output',
      stream: 'stdout',
      data: chunk.toString()
    }));
  });
  
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
    ws.send(JSON.stringify({
      type: 'command_output',
      stream: 'stderr',
      data: chunk.toString()
    }));
  });
  
  child.on('close', (code) => {
    ws.send(JSON.stringify({
      type: 'command_result',
      success: code === 0,
      exitCode: code,
      stdout: stdout.slice(-100000),
      stderr: stderr.slice(-50000)
    }));
  });
  
  child.on('error', (err) => {
    ws.send(JSON.stringify({
      type: 'command_result',
      success: false,
      error: err.message
    }));
  });
}
app.get("/status", (req, res) => {
  res.json({ ok: true });
});
// =====================
// HTTP API Endpoints
// =====================
app.post('/api/chat', async (req, res) => {
  const { message, sessionId, history } = req.body;
  
  try {
    const orch = getOrchestrator();
    const result = await orch.process({ message, sessionId, history: history || [] });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sessions', async (req, res) => {
  const { name, description } = req.body;
  
  try {
    const orch = getOrchestrator();
    const session = await orch.createSession(name, { description });
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sessions', async (req, res) => {
  try {
    const orch = getOrchestrator();
    const sessions = await orch.listSessions();
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sessions/:id', async (req, res) => {
  try {
    const orch = getOrchestrator();
    const session = await orch.getSession(req.params.id);
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/sessions/:id', async (req, res) => {
  try {
    const orch = getOrchestrator();
    await orch.deleteSession(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/memory/search', async (req, res) => {
  const { query, collection, limit } = req.body;
  
  try {
    const orch = getOrchestrator();
    const results = await orch.searchMemory(query, { collection, limit: limit || 5 });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/memory/stats', async (req, res) => {
  try {
    const orch = getOrchestrator();
    const stats = await orch.getMemoryStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    const orch = getOrchestrator();
    const health = await orch.healthCheck();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================
// Agent Capabilities Endpoint
// =====================
app.get('/api/capabilities', (req, res) => {
  res.json({
    name: agentCapabilities.name,
    version: agentCapabilities.version,
    capabilities: agentCapabilities.capabilities,
    limitations: agentCapabilities.limitations,
    summary: agentCapabilities.getCapabilitiesSummary()
  });
});

// Validate if an action is allowed
app.post('/api/capabilities/validate', (req, res) => {
  const { action } = req.body;
  if (!action) {
    return res.status(400).json({ error: 'Action is required' });
  }
  res.json(agentCapabilities.validateAction(action));
});

// Get limitation message for an action
app.get('/api/capabilities/limitation/:action', (req, res) => {
  const { action } = req.params;
  res.json({ action, message: agentCapabilities.getLimitationMessage(action) });
});

// =====================
// Services Endpoints
// =====================
// Get all services
app.get('/api/services', (req, res) => {
  res.json({
    services: getAllServices(),
    enabled: getEnabledServices(),
    governance: governance.getStatus()
  });
});

// Get single service
app.get('/api/services/:name', (req, res) => {
  const service = getService(req.params.name);
  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }
  res.json(service);
});

// Enable/disable service
app.post('/api/services/:name/toggle', (req, res) => {
  const { name } = req.params;
  const { enabled } = req.body;
  const service = getService(name);
  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }
  if (enabled) {
    service.enabled = true;
    service.status = true;
  } else {
    service.enabled = false;
    service.status = false;
  }
  res.json({ success: true, service });
});

// Governance: Validate rate limit
app.post('/api/governance/ratelimit', (req, res) => {
  const { clientId, limit } = req.body;
  res.json(governance.checkRateLimit(clientId, limit));
});

// Governance: Validate file path
app.post('/api/governance/validate-path', (req, res) => {
  const { path } = req.body;
  res.json(governance.validateFilePath(path));
});

// Governance: Validate external URL
app.post('/api/governance/validate-url', (req, res) => {
  const { url } = req.body;
  res.json(governance.validateExternalUrl(url));
});

// Governance: Validate command
app.post('/api/governance/validate-command', (req, res) => {
  const { command } = req.body;
  res.json(governance.validateCommand(command));
});

// Governance: Get logs
app.get('/api/governance/logs', (req, res) => {
  const { clientId, action, limit } = req.query;
  res.json(governance.getLogs({ clientId, action, limit: parseInt(limit) || 100 }));
});

// Governance: Get status
app.get('/api/governance/status', (req, res) => {
  res.json(governance.getStatus());
});

// =====================
// Agent Coordination Endpoints
// =====================
// Mount coordination API routes
app.use('/api/coordination', require('../api/coordination'));

// Agent Status Endpoints (Claw + Kilo + Coordination)
const agentStatus = {
  claw: { status: 'offline', lastTask: null, lastLog: null, heartbeat: 0 },
  kilo: { status: 'offline', lastTask: null, lastLog: null, heartbeat: 0 },
  coder: { status: 'offline', lastTask: null, lastLog: null, heartbeat: 0 },
  researcher: { status: 'offline', lastTask: null, lastLog: null, heartbeat: 0 },
  claude_code: { status: 'online', lastTask: 'Connected via Cockpit', lastLog: null, heartbeat: Date.now() }
};

// Simulate Claude Code being online since it's the active session
setInterval(() => {
  agentStatus.claude_code.heartbeat = Date.now();
  agentStatus.claude_code.status = 'online';
}, 10000);

// Coordination dashboard endpoint
app.get('/api/coordination/dashboard', (req, res) => {
  try {
    const dashboard = coordinator.getDashboardInfo();
    res.json({ success: true, data: dashboard });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/agents/status', (req, res) => {
  res.json({
    agents: agentStatus,
    timestamp: Date.now()
  });
});

app.get('/api/agents/:name/status', (req, res) => {
  const name = req.params.name.toLowerCase();
  if (!agentStatus[name]) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  res.json(agentStatus[name]);
});

app.post('/api/agents/:name/heartbeat', (req, res) => {
  const name = req.params.name.toLowerCase();
  if (!agentStatus[name]) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  agentStatus[name].heartbeat = Date.now();
  res.json({ success: true });
});

app.post('/api/agents/:name/task', (req, res) => {
  const name = req.params.name.toLowerCase();
  if (!agentStatus[name]) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  agentStatus[name].status = 'running';
  agentStatus[name].lastTask = req.body.task || 'Unknown';
  agentStatus[name].lastLog = req.body.log || '';
  res.json({ success: true });
});

// =====================
// Advanced Multi-Agent Services API Endpoints
// =====================

// Recursive Reasoning Engine
app.post('/api/services/recursive/execute', async (req, res) => {
  try {
    const { agent_id, prompt, context } = req.body;
    const result = await recursiveEngine.executeRecursiveCall(agent_id, prompt, context);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/services/recursive/history/:agentId', (req, res) => {
  try {
    const history = recursiveEngine.getCallHistory(req.params.agentId);
    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/services/recursive/status/:agentId', (req, res) => {
  try {
    const status = recursiveEngine.getStatus(req.params.agentId);
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cost Tracking Layer
app.post('/api/services/cost/track', async (req, res) => {
  try {
    const { agent_id, method, input, estimated_tokens } = req.body;
    const result = await costTracker.trackMethodCall(agent_id, method, input, estimated_tokens);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/services/cost/stats/:agentId', (req, res) => {
  try {
    const stats = costTracker.getUsageStats(req.params.agentId);
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/services/cost/system', (req, res) => {
  try {
    const costs = costTracker.getSystemCosts();
    res.json({ success: true, costs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/services/cost/check-pause', async (req, res) => {
  try {
    const { agent_id, operation } = req.body;
    const result = await costTracker.checkPauseCondition(agent_id, operation);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/services/cost/reset', async (req, res) => {
  try {
    const result = await costTracker.resetDailyCosts();
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Iteration Governor
app.post('/api/services/iteration/start', async (req, res) => {
  try {
    const { agent_id, reason } = req.body;
    const result = await iterationGovernor.startIteration(agent_id, reason);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/services/iteration/complete', async (req, res) => {
  try {
    const { agent_id, iteration_id, result: iterationResult } = req.body;
    const result = await iterationGovernor.completeIteration(agent_id, iteration_id, iterationResult);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/services/iteration/stop', async (req, res) => {
  try {
    const { agent_id } = req.body;
    const result = await iterationGovernor.stopIterations(agent_id);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/services/iteration/history/:agentId', (req, res) => {
  try {
    const history = iterationGovernor.getIterationHistory(req.params.agentId);
    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/services/iteration/status/:agentId', (req, res) => {
  try {
    const status = iterationGovernor.getStatus(req.params.agentId);
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/services/iteration/check', async (req, res) => {
  try {
    const { agent_id, current_iteration, reason } = req.body;
    const result = await iterationGovernor.shouldAllowIteration(agent_id, current_iteration, reason);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Context Slice Environment
app.post('/api/services/context/register', async (req, res) => {
  try {
    const { agent_id, context } = req.body;
    const result = await contextSlice.registerContext(agent_id, context);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/services/context/get', async (req, res) => {
  try {
    const { agent_id, context_id, strategy } = req.query;
    const result = await contextSlice.getContext(agent_id, context_id, strategy);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/services/context/update', async (req, res) => {
  try {
    const { agent_id, context_id, updates } = req.body;
    const result = await contextSlice.updateContext(agent_id, context_id, updates);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/services/context/stats', (req, res) => {
  try {
    const stats = contextSlice.getUsageStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Multi-Agent Scheduler
app.post('/api/services/scheduler/register', async (req, res) => {
  try {
    const { agent_id, agent_info } = req.body;
    const result = await multiAgentScheduler.registerAgent(agent_id, agent_info);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/services/scheduler/submit', async (req, res) => {
  try {
    const task_request = req.body;
    const result = await multiAgentScheduler.submitTask(task_request);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/services/scheduler/complete', async (req, res) => {
  try {
    const { task_id, agent_id, result: taskResult } = req.body;
    const result = await multiAgentScheduler.completeTask(task_id, agent_id, taskResult);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/services/scheduler/tasks/:agentId', async (req, res) => {
  try {
    const tasks = await multiAgentScheduler.getTaskForAgent(req.params.agentId);
    res.json({ success: true, tasks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/services/scheduler/status', (req, res) => {
  try {
    const status = multiAgentScheduler.getStatus();
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/services/scheduler/pause', async (req, res) => {
  try {
    const { agent_id } = req.body;
    const result = await multiAgentScheduler.pauseAgent(agent_id);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/services/scheduler/resume', async (req, res) => {
  try {
    const { agent_id } = req.body;
    const result = await multiAgentScheduler.resumeAgent(agent_id);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Real-time Dashboard
app.get('/api/services/dashboard/status', (req, res) => {
  try {
    const status = realTimeDashboard.getStatus();
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/services/dashboard/alert', async (req, res) => {
  try {
    const { type, message, severity } = req.body;
    const result = await realTimeDashboard.sendAlert(type, message, severity);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/services/dashboard/broadcast', async (req, res) => {
  try {
    const { message } = req.body;
    const result = await realTimeDashboard.broadcast(message);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/services/dashboard/health', (req, res) => {
  try {
    const health = {
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      },
      agents: coordinator.getDashboardInfo()?.active_agents?.length || 0,
      timestamp: Date.now()
    };
    res.json({ success: true, health });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Services initialization endpoint
app.post('/api/services/initialize', async (req, res) => {
  try {
    // Initialize scheduler
    await multiAgentScheduler.initialize();

    // Start dashboard
    await realTimeDashboard.start();

    // Start governor
    await iterationGovernor.initialize();

    res.json({
      success: true,
      message: 'Advanced services initialized',
      services: {
        recursive_engine: true,
        cost_tracker: true,
        iteration_governor: true,
        context_slice: true,
        multi_agent_scheduler: true,
        real_time_dashboard: true
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fallback toggle for hybrid routing
let preferKiloFallback = false;
app.get('/api/fallback/toggle', (req, res) => {
  res.json({ preferKiloFallback });
});

app.post('/api/fallback/toggle', (req, res) => {
  preferKiloFallback = req.body.enabled || false;
  res.json({ preferKiloFallback, success: true });
});

// =====================
// Server Startup (Simple)
// =====================
const PORT = process.env.PORT || 3847;

// Start the server
const server = app.listen(PORT, async () => {
  console.log(`🎛️  FreeAgent Cockpit running at http://localhost:${PORT}`);
  console.log('[Server] Features: Gemini, Vector Memory, Multi-session, Advanced Multi-Agent Services');

  // WebSocket upgrade handler - now attached after server is created
  server.on('upgrade', (request, socket, head) => {
    console.log('[Server] WebSocket upgrade request:', request.url);
    console.log('[Server] Request headers:', request.headers);

    // Handle the URL parsing more robustly
    let pathname = '/ws';
    try {
      if (request.url && request.url.startsWith('/')) {
        pathname = request.url.split('?')[0]; // Remove query parameters
      }
    } catch (e) {
      console.log('[Server] URL parse error:', e.message);
      pathname = '/ws'; // Default fallback
    }

    console.log('[Server] WebSocket pathname:', pathname);

    if (pathname === '/ws') {
      console.log('[Server] Handling WebSocket upgrade for /ws');
      wss.handleUpgrade(request, socket, head, (ws) => {
        console.log('[Server] WebSocket connection established');
        wss.emit('connection', ws, request);
      });
    } else {
      console.log('[Server] Rejecting WebSocket upgrade for:', pathname);
      socket.destroy();
    }
  });

  // WebSocket connection handler
  wss.on('connection', (ws) => {
      console.log('[Server] WebSocket client connected');
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);
          const handler = messageHandlers[data.type];
          if (handler) await handler(ws, data);
        } catch (error) {
          ws.send(JSON.stringify({ type: 'error', error: error.message }));
        }
      });
    });

  // Create dashboard with HTTP server to avoid port conflict
  const { getDashboard } = require('../services/real-time-dashboard');
  realTimeDashboard = getDashboard({ server: server });

  // Initialize advanced services
  try {
    console.log('[Server] Initializing advanced multi-agent services...');
    await multiAgentScheduler.initialize();
    await realTimeDashboard.start();
    console.log('[Server] Advanced services initialized successfully');
  } catch (error) {
    console.error('[Server] Error initializing advanced services:', error);
  }

  // Auto-open browser
  if (AUTO_OPEN_BROWSER) {
    setTimeout(() => {
      const url = `http://localhost:${PORT}`;
      console.log(`[Server] Opening browser: ${url}`);

      if (BROWSER_PATH) {
        exec(`"${BROWSER_PATH}" ${url}`);
      } else {
        exec(`start ${url}`);
      }
    }, 1000);
  }
});
