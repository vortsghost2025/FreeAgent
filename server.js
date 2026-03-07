// FreeAgent Cockpit Server for Cloud Shell
// Updated with Orchestrator, Gemini, Vector Memory, and Multi-Session Support

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { exec, spawn } = require('child_process');
const WebSocket = require('ws');

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
app.use(express.static(path.join(__dirname, '..'), {
  extensions: ['html'],
}));

app.use(cors());
app.use(bodyParser.json());

// Prevent favicon 404 errors
app.get('/favicon.ico', (req, res) => res.status(204).end());

// CSP Headers
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', 
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'unsafe-hashes' https://cdn.jsdelivr.net https://unpkg https://cdnjs.cloudflare.com blob:; " +
    "worker-src 'self' blob:; " +
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com; " +
    "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com; " +
    "img-src 'self' data: blob: https:; " +
    "connect-src 'self' ws: wss: http: https:;"
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
  orchestrator_memory_search: handleMemorySearch,
  orchestrator_health: handleOrchestratorHealth,
  
  // Legacy handlers (keep for compatibility)
  status_request: handleStatusRequest,
  init: handleInit,
  ping: handlePing,
  chat: handleChat,
  execute_command: handleExecuteCommand
};

async function handleOrchestratorChat(ws, data) {
  const { message, sessionId, history } = data;
  
  try {
    const orch = getOrchestrator();
    const result = await orch.process({ message, sessionId, history: history || [] });
    
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
// Server Startup
// =====================
const PORT = process.env.PORT || 3847;

const server = app.listen(PORT, async () => {
  console.log(`🎛️  FreeAgent Cockpit running at http://localhost:${PORT}`);
  console.log('[Server] Features:');
  console.log('  - Gemini (Vertex AI) integration');
  console.log('  - Vector Memory with embeddings');
  console.log('  - Multi-session support');
   console.log('');
 console.log('[Server] To configure:');
  console.log('  export CLAUDE_API_KEY=your_key');
  console.log('  export GCP_PROJECT=your_project');
  console.log('  export GCP_LOCATION=us-central1');
  console.log('  export LOCAL_MODEL_URL=http://localhost:3847');
});

// WebSocket upgrade handling
server.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url, `http://${request.headers.host}`);
  
  if (pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws) => {
  console.log('[Server] WebSocket client connected');
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      const handler = messageHandlers[data.type];
      
      if (handler) {
        await handler(ws, data);
      } else {
        ws.send(JSON.stringify({
          type: 'error',
          error: `Unknown message type: ${data.type}`
        }));
      }
    } catch (error) {
      console.error('[Server] Message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: error.message
      }));
    }
  });
  
  ws.on('close', () => {
    console.log('[Server] WebSocket client disconnected');
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] Shutting down...');
  server.close(() => {
    process.exit(0);
  });
});
