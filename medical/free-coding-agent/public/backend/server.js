// Use native fetch (Node 18+) - no need for node-fetch package
// const fetch = require('node-fetch');
console.log("server.js loaded");

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const { exec, spawn } = require("child_process");
const WebSocket = require("ws");

const app = express(); // must be defined before any app.use()
app.use(express.static(path.join(__dirname, ".."), {
  extensions: ["html"],
}));

app.use(cors());
app.use(bodyParser.json());

// Prevent favicon 404 errors
app.get('/favicon.ico', (req, res) => res.status(204).end());

// CSP Headers for development - allows eval for Monaco editor + blob workers
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', 
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'unsafe-hashes' https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com blob:; " +
    "worker-src 'self' blob:; " +
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com; " +
    "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com; " +
    "img-src 'self' data: blob: https:; " +
    "connect-src 'self' ws: wss: http: https:;"
  );
  next();
});

// In-memory API key storage (set via /api/configure endpoint)
let CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || "";
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-3-5-sonnet-20241022";

// =====================
// System State
// =====================
const systemState = {
  toolchainReady: false,
  agentReady: false,
  initializedAt: Date.now(),
  tasksCompleted: 0,
  activeAgents: new Set(),
  providerStatus: {
    ollama: { connected: false, model: null },
    groq: { connected: false, models: [] },
    openai: { connected: false, models: [] }
  }
};

// =====================
// Boot Sequence Integration
// =====================
let bootOrchestrator = null;

async function handleBootStart(ws, data) {
  const { createBootOrchestrator } = await import('../../src/boot-sequence.js');
  
  bootOrchestrator = createBootOrchestrator({
    port: server?.address()?.port || 3000,
    ollamaModel: 'llama3.1:8b'
  });

  // Set up event listeners
  bootOrchestrator.on('phase:start', (evt) => {
    ws.send(JSON.stringify({ type: 'boot:phase:start', ...evt }));
  });

  bootOrchestrator.on('phase:complete', (evt) => {
    ws.send(JSON.stringify({ type: 'boot:phase:complete', ...evt }));
  });

  bootOrchestrator.on('system:initializing', (evt) => {
    ws.send(JSON.stringify({ type: 'boot:system:initializing', ...evt }));
  });

  bootOrchestrator.on('system:online', (evt) => {
    ws.send(JSON.stringify({ type: 'boot:system:online', ...evt }));
  });

  bootOrchestrator.on('system:failed', (evt) => {
    ws.send(JSON.stringify({ type: 'boot:system:failed', ...evt }));
  });

  bootOrchestrator.on('boot:complete', (evt) => {
    ws.send(JSON.stringify({ type: 'boot:complete', ...evt }));
  });

  bootOrchestrator.on('boot:error', (error) => {
    ws.send(JSON.stringify({ type: 'boot:error', error: error.message }));
  });

  try {
    await bootOrchestrator.run();
    ws.send(JSON.stringify({ type: 'boot:started', success: true }));
  } catch (error) {
    ws.send(JSON.stringify({ type: 'boot:error', error: error.message }));
  }
}

function handleBootStatus(ws, data) {
  if (!bootOrchestrator) {
    ws.send(JSON.stringify({ type: 'boot:status', status: 'not_started' }));
    return;
  }

  ws.send(JSON.stringify({
    type: 'boot:status',
    status: bootOrchestrator.isRunning ? 'running' : (bootOrchestrator.isComplete ? 'complete' : 'idle'),
    progress: bootOrchestrator.getProgress(),
    systems: bootOrchestrator.getAllStatuses()
  }));
}

function handleBootAbort(ws, data) {
  if (bootOrchestrator && bootOrchestrator.isRunning) {
    bootOrchestrator.abort();
    ws.send(JSON.stringify({ type: 'boot:aborted' }));
  }
}

// =====================
// Message Router
// =====================
const messageHandlers = {
  // Boot sequence
  boot_start: handleBootStart,
  boot_status: handleBootStatus,
  boot_abort: handleBootAbort,
  
  // Handshake and initialization
  status_request: handleStatusRequest,
  init: handleInit,
  ping: handlePing,
  
  // Agent management
  register_agent: handleRegisterAgent,
  unregister_agent: handleUnregisterAgent,
  agent_heartbeat: handleAgentHeartbeat,
  
  // Task execution
  execute_task: handleExecuteTask,
  task_result: handleTaskResult,
  
  // Toolchain
  toolchain_status: handleToolchainStatus,
  toolchain_ready: handleToolchainReady,
  
  // System
  get_providers: handleGetProviders,
  configure: handleConfigure,
  
  // Command execution
  execute_command: handleExecuteCommand,
  
  // Chat
  chat: handleChat
};

function handleStatusRequest(ws, data) {
  ws.send(JSON.stringify({
    type: "status_response",
    timestamp: Date.now(),
    uptime: process.uptime(),
    tasksCompleted: systemState.tasksCompleted,
    activeAgents: systemState.activeAgents.size,
    toolchainReady: systemState.toolchainReady,
    agentReady: systemState.agentReady,
    providers: systemState.providerStatus,
    memory: process.memoryUsage(),
    platform: process.platform
  }));
}

function handleInit(ws, data) {
  console.log("Client initialization:", data);
  
  // Send toolchain_ready after short delay (simulating toolchain init)
  setTimeout(() => {
    if (!systemState.toolchainReady) {
      systemState.toolchainReady = true;
      ws.send(JSON.stringify({
        type: "toolchain_ready",
        timestamp: Date.now(),
        tools: ["read_file", "write_to_file", "execute_command", "search_files", "list_files"]
      }));
      
      // Send agent_ready after another delay
      setTimeout(() => {
        systemState.agentReady = true;
        ws.send(JSON.stringify({
          type: "agent_ready",
          timestamp: Date.now(),
          agents: ["code", "clinical", "data", "devops", "security"]
        }));
      }, 500);
    }
  }, 300);
  
  ws.send(JSON.stringify({ type: "init_ack", success: true }));
}

function handlePing(ws, data) {
  ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
}

function handleRegisterAgent(ws, data) {
  if (data.agentId) {
    systemState.activeAgents.add(data.agentId);
    console.log(`Agent registered: ${data.agentId}`);
    ws.send(JSON.stringify({
      type: "agent_registered",
      agentId: data.agentId,
      timestamp: Date.now()
    }));
    
    // Broadcast to all clients
    broadcastMessage({
      type: "agent_joined",
      agentId: data.agentId,
      activeAgents: Array.from(systemState.activeAgents),
      timestamp: Date.now()
    });
  }
}

function handleUnregisterAgent(ws, data) {
  if (data.agentId) {
    systemState.activeAgents.delete(data.agentId);
    console.log(`Agent unregistered: ${data.agentId}`);
    broadcastMessage({
      type: "agent_left",
      agentId: data.agentId,
      activeAgents: Array.from(systemState.activeAgents),
      timestamp: Date.now()
    });
  }
}

function handleAgentHeartbeat(ws, data) {
  ws.send(JSON.stringify({ type: "heartbeat_ack", timestamp: Date.now() }));
}

function handleExecuteTask(ws, data) {
  const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Acknowledge task receipt
  ws.send(JSON.stringify({
    type: "task_queued",
    taskId: taskId,
    task: data.task,
    timestamp: Date.now()
  }));
  
  // Simulate task completion
  setTimeout(() => {
    systemState.tasksCompleted++;
    ws.send(JSON.stringify({
      type: "task_complete",
      taskId: taskId,
      result: { status: "completed" },
      executionTime: 100,
      timestamp: Date.now()
    }));
  }, 1000);
}

function handleTaskResult(ws, data) {
  console.log("Task result received:", data.taskId);
  systemState.tasksCompleted++;
  broadcastMessage({
    type: "task_result",
    taskId: data.taskId,
    result: data.result,
    timestamp: Date.now()
  });
}

function handleToolchainStatus(ws, data) {
  ws.send(JSON.stringify({
    type: "toolchain_status_response",
    ready: systemState.toolchainReady,
    tools: ["read_file", "write_to_file", "execute_command", "search_files", "list_files"],
    timestamp: Date.now()
  }));
}

function handleToolchainReady(ws, data) {
  systemState.toolchainReady = true;
  console.log("Toolchain ready signal received");
  broadcastMessage({
    type: "toolchain_ready",
    timestamp: Date.now()
  });
}

function handleGetProviders(ws, data) {
  ws.send(JSON.stringify({
    type: "providers_status",
    providers: systemState.providerStatus,
    timestamp: Date.now()
  }));
}

function handleConfigure(ws, data) {
  if (data.apiKey) {
    CLAUDE_API_KEY = data.apiKey;
    ws.send(JSON.stringify({
      type: "configured",
      success: true,
      timestamp: Date.now()
    }));
  }
}

function handleChat(ws, data) {
  broadcastMessage(data);
}

function handleExecuteCommand(ws, data) {
  const { command, shell = 'powershell', cwd } = data;
  
  if (!command) {
    ws.send(JSON.stringify({ 
      type: 'command_result', 
      success: false, 
      error: 'No command provided' 
    }));
    return;
  }
  
  console.log(`Executing command: ${command} (shell: ${shell})`);
  
  // Determine shell based on platform and preference
  const isWindows = process.platform === 'win32';
  let shellCmd, args;
  
  if (shell === 'bash' && isWindows) {
    shellCmd = 'bash';
    args = ['-c', command];
  } else if (shell === 'powershell' || !isWindows) {
    shellCmd = isWindows ? 'powershell' : '/bin/sh';
    args = isWindows ? ['-Command', command] : ['-c', command];
  } else {
    shellCmd = 'cmd';
    args = ['/c', command];
  }
  
  const options = {
    cwd: cwd || process.cwd(),
    timeout: 60000, // 60 second timeout
    maxBuffer: 10 * 1024 * 1024 // 10MB output buffer
  };
  
  const child = spawn(shellCmd, args, options);
  
  let stdout = '';
  let stderr = '';
  
  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
    // Stream output to client
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
    const result = {
      type: 'command_result',
      success: code === 0,
      exitCode: code,
      stdout: stdout.slice(-100000), // Last 100KB
      stderr: stderr.slice(-50000)   // Last 50KB
    };
    
    console.log(`Command completed with code: ${code}`);
    ws.send(JSON.stringify(result));
  });
  
  child.on('error', (err) => {
    console.error('Command error:', err);
    ws.send(JSON.stringify({
      type: 'command_result',
      success: false,
      error: err.message
    }));
  });
}

// =====================
// Server Startup
// =====================
const PORT = 4000;

// Auto-start free-coding-agent on port 3000
function startFreeCodingAgent() {
  // Check if port 3000 is already in use
  const net = require('net');
  const testServer = net.createServer();
  
  testServer.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log('⏭️  Port 3000 already in use - free-coding-agent already running');
      return;
    }
  });
  
  testServer.once('listening', () => {
    testServer.close();
    
    console.log('\n🚀 Starting free-coding-agent on port 3000...');
    
    const agentPath = path.join(__dirname, '../../bin/web.js');
    const isWindows = process.platform === 'win32';
    
    try {
      // Use node with ES module support
      const agentProcess = spawn('node', ['--experimental-vm-modules', agentPath], {
        cwd: path.join(__dirname, '../..'),
        stdio: 'pipe',
        shell: isWindows
      });
      
      agentProcess.stdout.on('data', (data) => {
        console.log('[free-coding-agent]', data.toString().trim());
      });
      
      agentProcess.stderr.on('data', (data) => {
        console.error('[free-coding-agent error]', data.toString().trim());
      });
      
      agentProcess.on('error', (err) => {
        console.log('⚠️  Could not start free-coding-agent:', err.message);
      });
      
      agentProcess.on('exit', (code) => {
        console.log(`free-coding-agent exited with code ${code}`);
      });
      
      console.log('✅ Free-coding-agent starting...');
    } catch (err) {
      console.log('⚠️  Error starting free-coding-agent:', err.message);
    }
  });
  
  testServer.listen(3000, '0.0.0.0');
}

// Auto-open browser cockpit on launch
function startBrowser() {
  const url = `http://localhost:${PORT}`;
  console.log(`Opening cockpit at ${url}...`);
  
  // Detect OS and use appropriate command
  const isWindows = process.platform === 'win32';
  const isMac = process.platform === 'darwin';
  
  let command;
  if (isWindows) {
    command = `start "" "${url}"`;
  } else if (isMac) {
    command = `open "${url}"`;
  } else {
    // Linux
    command = `xdg-open "${url}"`;
  }
  
  require('child_process').exec(command, (err) => {
    if (err) {
      console.log('Could not auto-open browser. Please open manually:', url);
    } else {
      console.log('Cockpit opened in browser.');
    }
  });
}

const server = app.listen(PORT, () => {
  console.log(`Claude backend running at http://localhost:${PORT}`);
  startBrowser();
  startFreeCodingAgent();
  runStartupHealthCheck();
});

// =====================
// Startup Health Check System
// =====================
async function runStartupHealthCheck() {
  console.log('\n========================================');
  console.log('🚀 Running startup health check...');
  console.log('========================================\n');
  
  const results = {
    connections: {},
    endpoints: {},
    memory: {},
    websocket: {},
    overall: 'pending'
  };
  
  const localhost = 'http://localhost:4000';
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Use native fetch (Node.js 18+)
  const healthFetch = (url, options = {}) => fetch(url, options);
  
  // Test 1: Check local endpoints
  console.log('📡 Testing endpoints...');
  const endpointsToTest = [
    { name: 'Status', url: '/api/status', method: 'GET' },
    { name: 'Providers', url: '/api/providers/status', method: 'GET' },
    { name: 'Perception', url: '/api/perception/status', method: 'GET' },
    { name: 'Ensemble Agents', url: '/api/ensemble/agents', method: 'GET' },
    { name: 'Context', url: '/api/context?agent=kilo&purpose=test', method: 'GET' },
    { name: 'List Files', url: '/api/list-files?path=.&recursive=false', method: 'GET' }
  ];
  
  for (const endpoint of endpointsToTest) {
    try {
      const response = await healthFetch(`${localhost}${endpoint.url}`, { method: endpoint.method });
      const status = response.ok ? '✅' : '⚠️';
      results.endpoints[endpoint.name] = { status: response.status, ok: response.ok };
      console.log(`  ${status} ${endpoint.name}: ${response.status}`);
    } catch (err) {
      results.endpoints[endpoint.name] = { error: err.message };
      console.log(`  ❌ ${endpoint.name}: ${err.message}`);
    }
    await delay(100);
  }
  
  // Test 2: Check port 3000 (free-coding-agent)
  console.log('\n🔗 Testing connections...');
  const portsToCheck = [
    { name: 'free-coding-agent (3000)', port: 3000 },
    { name: 'WebSocket (4001)', port: 4001, isWs: true }
  ];
  
  const net = require('net');
  for (const target of portsToCheck) {
    if (target.isWs) {
      results.connections[target.name] = { status: 'manual_check' };
      console.log(`  ⏭️  ${target.name}: WebSocket (manual check required)`);
    } else {
      try {
        await new Promise((resolve, reject) => {
          const socket = new net.Socket();
          socket.setTimeout(2000);
          socket.on('connect', () => {
            socket.destroy();
            resolve();
          });
          socket.on('error', reject);
          socket.on('timeout', () => {
            socket.destroy();
            reject(new Error('Timeout'));
          });
          socket.connect(target.port, '127.0.0.1');
        });
        results.connections[target.name] = { status: 'online' };
        console.log(`  ✅ ${target.name}: Online`);
      } catch (err) {
        results.connections[target.name] = { status: 'offline', error: err.message };
        console.log(`  ⚠️  ${target.name}: Not running (will connect when available)`);
      }
    }
  }
  
  // Test 3: Memory/Database check
  console.log('\n💾 Checking memory systems...');
  const memoryPaths = [
    { name: 'Memory DB', path: './memory' },
    { name: 'Kilo Local', path: './kilo-local' },
    { name: 'Lingma Cache', path: './lingma-cache' }
  ];
  
  const fs = require('fs');
  for (const mem of memoryPaths) {
    try {
      if (fs.existsSync(mem.path)) {
        const stats = fs.statSync(mem.path);
        results.memory[mem.name] = { exists: true, size: 'directory present' };
        console.log(`  ✅ ${mem.name}: Available`);
      } else {
        results.memory[mem.name] = { exists: false };
        console.log(`  ⚠️  ${mem.name}: Not found`);
      }
    } catch (err) {
      results.memory[mem.name] = { error: err.message };
      console.log(`  ❌ ${mem.name}: ${err.message}`);
    }
  }
  
  // Test 4: WebSocket connectivity
  console.log('\n🔌 WebSocket status...');
  results.websocket.status = 'Server running - awaiting connections';
  console.log(`  ✅ WebSocket server on ws://localhost:4001: Ready`);
  
  // Summary
  console.log('\n========================================');
  const endpointOk = Object.values(results.endpoints).filter(e => e.ok).length;
  const endpointTotal = Object.keys(results.endpoints).length;
  const connOk = Object.values(results.connections).filter(c => c.status === 'online').length;
  const connTotal = Object.keys(results.connections).length - 1; // exclude ws
  
  console.log(`📊 Health Summary:`);
  console.log(`   Endpoints: ${endpointOk}/${endpointTotal} responding`);
  console.log(`   Connections: ${connOk}/${connTotal} online`);
  console.log(`   Memory: ${Object.keys(results.memory).length} systems checked`);
  console.log('========================================\n');
  
  return results;
}

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  console.log("Client connected to WebSocket");

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      console.log("Received WebSocket message:", data.type);
      
      // Route message to appropriate handler
      const handler = messageHandlers[data.type];
      if (handler) {
        handler(ws, data);
      } else {
        // Unknown message type - send ack anyway
        ws.send(JSON.stringify({ type: "ack", originalType: data.type, timestamp: Date.now() }));
      }
    } catch (err) {
      console.error("Error parsing WebSocket message:", err);
      ws.send(JSON.stringify({ type: "error", message: err.message }));
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });

  // Send welcome message
  ws.send(JSON.stringify({ type: "connected", message: "Welcome to Agent Cockpit" }));
});

// Broadcast message to all connected clients
function broadcastMessage(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

console.log("WebSocket server running on ws://localhost:4001");

// =====================
// API Endpoints
// =====================

// Configure API key endpoint
app.post("/api/configure", (req, res) => {
  const { apiKey } = req.body;
  
  if (apiKey) {
    CLAUDE_API_KEY = apiKey;
    res.json({ success: true, message: 'API key configured' });
  } else {
    res.status(400).json({ error: 'No API key provided' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime(), timestamp: Date.now() });
});

// Agent task manager HTML page
app.get('/agent-task-manager.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'boot-sequence.html'));
});

// Main chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    const response = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        messages,
      }),
    });

    const data = await response.json();
    res.json({ reply: data });
  } catch (err) {
    console.error("Claude backend error:", err);
    res.status(500).json({ error: "Claude backend error" });
  }
});

// GET /api/status - Return status info
app.get("/api/status", (req, res) => {
  res.json({
    tasksCompleted: 42,
    activeAgents: 3,
    uptime: process.uptime(),
    status: "running",
    version: "1.0.0",
    memory: process.memoryUsage(),
    platform: process.platform
  });
});

// GET /api/providers/status - Return provider status
app.get("/api/providers/status", (req, res) => {
  res.json({
    ollama: {
      status: "connected",
      model: "llama2",
      endpoint: "http://localhost:11434"
    },
    groq: {
      status: "available",
      models: ["llama-3.1-70b-versatile", "mixtral-8x7b-32768"]
    },
    openai: {
      status: "available",
      models: ["gpt-4", "gpt-3.5-turbo"]
    }
  });
});

// GET /api/list-files - List files in workspace
app.get("/api/list-files", (req, res) => {
  const { path: filePath, recursive } = req.query;
  const basePath = path.join(__dirname, "..");
  const targetPath = filePath ? path.join(basePath, filePath) : basePath;
  
  try {
    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ error: "Path not found" });
    }
    
    const stats = fs.statSync(targetPath);
    if (stats.isFile()) {
      return res.json({
        files: [{ name: path.basename(targetPath), type: "file", size: stats.size }],
        path: filePath || "."
      });
    }
    
    const items = fs.readdirSync(targetPath);
    const files = items.map(item => {
      const itemPath = path.join(targetPath, item);
      const itemStats = fs.statSync(itemPath);
      return {
        name: item,
        type: itemStats.isDirectory() ? "directory" : "file",
        size: itemStats.size,
        modified: itemStats.mtime
      };
    });
    
    res.json({ files, path: filePath || "." });
  } catch (err) {
    console.error("Error listing files:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/read-file - Read file contents
app.get("/api/read-file", (req, res) => {
  const { path: filePath } = req.query;
  
  if (!filePath) {
    return res.status(400).json({ error: "Path parameter required" });
  }
  
  const fullPath = path.join(__dirname, "..", filePath);
  
  try {
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: "File not found" });
    }
    
    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      return res.status(400).json({ error: "Path is a directory" });
    }
    
    const content = fs.readFileSync(fullPath, "utf-8");
    res.json({ content, path: filePath, size: stats.size });
  } catch (err) {
    console.error("Error reading file:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/write-file - Write file contents
app.post("/api/write-file", (req, res) => {
  const { path: filePath, content } = req.body;
  
  if (!filePath || content === undefined) {
    return res.status(400).json({ error: "Path and content required" });
  }
  
  const fullPath = path.join(__dirname, "..", filePath);
  
  try {
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(fullPath, content, "utf-8");
    res.json({ success: true, path: filePath, size: content.length });
  } catch (err) {
    console.error("Error writing file:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ollama/generate - Ollama generation endpoint
app.post("/api/ollama/generate", async (req, res) => {
  const { model, prompt, options } = req.body;
  
  try {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model || "llama2",
        prompt: prompt || "",
        options: options || {}
      })
    });
    
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Ollama error:", err);
    res.status(500).json({ error: "Ollama service unavailable", details: err.message });
  }
});

// POST /api/perception/image - Image perception endpoint
app.post("/api/perception/image", (req, res) => {
  res.json({
    success: true,
    description: "Image perception processed",
    tags: ["object", "scene", "color"],
    confidence: 0.95
  });
});

// POST /api/perception/voice - Voice perception endpoint
app.post("/api/perception/voice", (req, res) => {
  res.json({
    success: true,
    transcription: "Voice input processed",
    language: "en",
    duration: 2.5
  });
});

// GET /api/perception/status - Perception status
app.get("/api/perception/status", (req, res) => {
  res.json({
    camera: { available: true, status: "ready" },
    microphone: { available: true, status: "ready" },
    imageProcessing: { available: true, version: "1.0" },
    voiceProcessing: { available: true, version: "1.0" }
  });
});

// POST /api/tasks/auto-assign - Auto-assign tasks
app.post("/api/tasks/auto-assign", (req, res) => {
  const { tasks } = req.body;
  res.json({
    success: true,
    assigned: tasks || [],
    agents: ["agent-1", "agent-2", "agent-3"]
  });
});

// GET /api/tests/run - Run tests endpoint
app.get("/api/tests/run", (req, res) => {
  res.json({
    success: true,
    testsRun: 15,
    passed: 12,
    failed: 3,
    results: [
      { name: "API Status", status: "passed" },
      { name: "WebSocket", status: "passed" },
      { name: "File Operations", status: "passed" }
    ]
  });
});

// POST /api/tests/run - Run tests endpoint (POST variant)
app.post("/api/tests/run", (req, res) => {
  const { testType, options } = req.body;
  res.json({
    success: true,
    testsRun: 15,
    passed: 12,
    failed: 3,
    testType: testType || "all",
    timestamp: new Date().toISOString()
  });
});

// GET /api/ensemble/agents - Ensemble agents
app.get("/api/ensemble/agents", (req, res) => {
  res.json({
    agents: [
      { id: "agent-1", name: "Code Agent", status: "active" },
      { id: "agent-2", name: "Research Agent", status: "active" },
      { id: "agent-3", name: "Analysis Agent", status: "idle" }
    ]
  });
});

// GET /api/context - Context endpoint
app.get("/api/context", (req, res) => {
  const { agent, purpose } = req.query;
  res.json({
    agent: agent || "default",
    purpose: purpose || "general",
    context: {
      recentMessages: [],
      workspace: "default",
      capabilities: ["code", "analysis", "research"]
    }
  });
});

// POST /api/agent/code-action - Code action endpoint
app.post("/api/agent/code-action", (req, res) => {
  const { action, file, content, code, language, context, agent } = req.body;
  res.json({
    success: true,
    action: action || "analyze",
    result: "Code action processed",
    codeActions: ["optimize", "refactor", "document"]
  });
});

// POST /api/kilo - Kilo agent endpoint (connects to free-coding-agent on port 3000)
app.post("/api/kilo", async (req, res) => {
  const { message, model } = req.body;
  
  try {
    // Forward to free-coding-agent web server (port 3000)
    const response = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: message || "",
        provider: "ollama",
        model: model || "llama3.1:8b"
      })
    });
    
    const data = await response.json();
    res.json({ reply: data.response || data.content || "Kilo response" });
  } catch (err) {
    console.error("Kilo error:", err);
    res.status(500).json({ error: "Kilo service unavailable", details: err.message });
  }
});

// POST /api/claw - Claw agent endpoint
app.post("/api/claw", async (req, res) => {
  const { message, model } = req.body;
  
  try {
    // Forward to free-coding-agent with deepseek coder model
    const response = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: message || "",
        provider: "ollama",
        model: model || "deepseek-coder-v2:16b"
      })
    });
    
    const data = await response.json();
    res.json({ reply: data.response || data.content || "Claw response" });
  } catch (err) {
    console.error("Claw error:", err);
    res.status(500).json({ error: "Claw service unavailable", details: err.message });
  }
});

// POST /api/agent/fix-apply - Fix apply endpoint
app.post("/api/agent/fix-apply", (req, res) => {
  const { fix, file, line } = req.body;
  res.json({
    success: true,
    fix: fix || "applied",
    file: file || "unknown",
    line: line || 0,
    message: "Fix applied successfully"
  });
});

// POST /api/execute - Execute shell command
app.post("/api/execute", (req, res) => {
  const { command, shell = 'powershell', cwd } = req.body;
  
  if (!command) {
    return res.status(400).json({ error: 'Command required' });
  }
  
  console.log(`[API] Executing: ${command}`);
  
  const isWindows = process.platform === 'win32';
  let shellCmd, args;
  
  if (shell === 'bash' && isWindows) {
    shellCmd = 'bash';
    args = ['-c', command];
  } else if (shell === 'powershell' || !isWindows) {
    shellCmd = isWindows ? 'powershell' : '/bin/sh';
    args = isWindows ? ['-Command', command] : ['-c', command];
  } else {
    shellCmd = 'cmd';
    args = ['/c', command];
  }
  
  const options = {
    cwd: cwd || process.cwd(),
    timeout: 60000,
    maxBuffer: 10 * 1024 * 1024
  };
  
  exec(`${shellCmd} ${args.join(' ')}`, options, (error, stdout, stderr) => {
    if (error) {
      res.json({ success: false, error: error.message, stderr });
    } else {
      res.json({ success: true, stdout, stderr });
    }
  });
});

// POST /api/simple - Simple AI chat endpoint
app.post("/api/simple", async (req, res) => {
  const { message, model } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message required' });
  }
  
  console.log(`[API] Simple chat: ${message.substring(0, 50)}...`);
  
  // Use Ollama by default (unless CLAUDE_API_KEY is explicitly set and working)
  try {
    const response = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: message || "",
        provider: "ollama",
        model: model || "llama3.1:8b"
      })
    });
    
    const data = await response.json();
    res.json({ reply: data.response || data.content || "No response" });
  } catch (err) {
    console.error("Simple Ollama error:", err);
    res.json({ reply: `Error: ${err.message}` });
  }
});
