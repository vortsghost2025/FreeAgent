# Kilo Code Behavior Charter

## Version 1.0 - Stability & Execution Policies

---

## 1. Global Kilo Execution Policy

**Purpose**: Core rules governing all Kilo operations

### 1.1 Command Execution Rules
- Always use `curl.exe` for HTTP requests (never PowerShell alias)
- Never use `Invoke-WebRequest` unless explicitly asked
- Always include `--max-time` flag to prevent blocking
- Default timeout: 3 seconds for health checks, 30 seconds for commands
- Treat any non-200 response as "unhealthy" but do NOT freeze or retry endlessly
- If health check fails: log it and continue processing other tasks

### 1.2 Process Management
- Prefer spawn over exec for background tasks
- Always run processes detached when possible
- Enable timeouts on all command executions
- Never queue health checks - run them independently and non-blocking

### 1.3 Error Handling
- Fail gracefully - never crash the main process
- Log all errors with timestamps
- Continue processing even if subtasks fail
- Never block the main thread waiting for background tasks

---

## 2. Command Rewrite Policy

**Purpose**: Ensure all commands use safe, non-blocking patterns

### 2.1 HTTP Request Commands
```powershell
# BAD (blocks, may freeze)
curl -s http://localhost:54112/api/health
Invoke-WebRequest -Uri 'http://localhost:54112/api/health'

# GOOD (non-blocking, with timeout)
curl.exe -s --max-time 3 http://localhost:54112/api/health
```

### 2.2 Health Check Commands
- Always use: `curl.exe -s --max-time 3 http://localhost:54112/api/health`
- Endpoint: `http://localhost:54112/api/health`
- Timeout: 3 seconds maximum
- On timeout: log "Health check timeout" and continue

### 2.3 Background Task Commands
```powershell
# BAD (blocks terminal)
node server.js

# GOOD (run in background, non-blocking)
Start-Process -FilePath "node" -ArgumentList "server.js" -WindowStyle Hidden
# OR use & operator in new session
```

### 2.4 File Operations
- Use async file operations where possible
- Never block on file reads/writes
- Implement retry logic with exponential backoff (max 3 retries)

---

## 3. Non-Blocking Background Loop Policy

**Purpose**: Prevent Kilo from freezing during background operations

### 3.1 Loop Execution Rules
- Background loops MUST be non-blocking
- Maximum 5 concurrent background tasks
- Each background task must have its own timeout
- If a background task fails: log error, continue to next task
- Never wait for background task completion before responding

### 3.2 Task Queue Management
```javascript
// GOOD: Non-blocking queue
const MAX_CONCURRENT = 5;
const taskQueue = [];
const runningTasks = new Set();

async function queueTask(taskFn) {
  if (runningTasks.size >= MAX_CONCURRENT) {
    taskQueue.push(taskFn);
    return;
  }
  runTask(taskFn);
}

function runTask(taskFn) {
  runningTasks.add(taskFn);
  taskFn().finally(() => {
    runningTasks.delete(taskFn);
    if (taskQueue.length > 0) {
      queueTask(taskQueue.shift());
    }
  });
}
```

### 3.3 Monitoring Loops
- Health checks: run every 60 seconds, non-blocking
- Memory cleanup: run every 5 minutes, non-blocking
- Session sync: run every 30 seconds, non-blocking
- Never run monitoring loops in the main event loop

---

## 4. Health-Check Stability Policy

**Purpose**: Ensure health checks never cause Kilo to freeze

### 4.1 Health Check Configuration
- Endpoint: `http://localhost:54112/api/health`
- Command: `curl.exe -s --max-time 3 http://localhost:54112/api/health`
- Timeout: 3 seconds (STRICT - do not exceed)
- Failure action: Log "Health check failed: {error}" and continue
- Success action: Log "Health check OK" at debug level only

### 4.2 Health Check Response Handling
```javascript
// Parse response - if invalid JSON, treat as unhealthy
let health;
try {
  health = JSON.parse(response);
} catch (e) {
  log("Health check returned invalid JSON");
  return { healthy: false };
}

// Check required fields
const requiredFields = ['sessionEnabled', 'memoryEnabled'];
const isHealthy = requiredFields.every(field => health[field] === true);

// Return status without blocking
return { healthy: isHealthy, details: health };
```

### 4.3 Recovery Actions
- If health check fails 3 times consecutively: restart server process
- If server port unresponsive: attempt to start server if not running
- Log all recovery attempts

---

## 5. Full Agent Behavior Charter

**Purpose**: Complete rules for Kilo's operational behavior

### 5.1 Core Principles
1. **Never Block**: All operations must be non-blocking
2. **Fail Gracefully**: Errors should not crash Kilo
3. **Log Everything**: All actions and errors must be logged
4. **Stay Responsive**: Main thread must always remain responsive
5. **Background First**: Any long-running task goes to background

### 5.2 Task Execution Rules
- Any task taking >1 second MUST run in background
- All HTTP requests MUST have timeout
- All processes MUST be spawned detached
- Never wait for user input in automated tasks

### 5.3 Session Management
- Sessions should auto-save every 30 seconds
- Never block on session save
- Log session errors but continue operation

### 5.4 Memory Management
- Clear memory cache every 5 minutes
- Never block when clearing memory
- Log memory cleanup results

### 5.5 Communication Rules
- Respond to user immediately, then process in background
- If user asks for status: provide immediately without waiting for background tasks
- Queue any non-critical updates for background processing

### 5.6 Emergency Procedures
- If Kilo becomes unresponsive: restart from last known good state
- If server fails: attempt restart, log failure if unsuccessful
- If memory exhausted: clear caches, log warning

---

## Summary: Quick Reference

| Operation | Command Pattern | Timeout |
|-----------|----------------|---------|
| Health Check | `curl.exe -s --max-time 3 http://localhost:54112/api/health` | 3s |
| Start Server | `Start-Process node -ArgumentList server.js` | N/A |
| File Read | Async with promise | 10s |
| File Write | Async with promise | 10s |
| External API | `curl.exe -s --max-time 10 ...` | 10s |
| Background Task | Spawn detached | Per task |

---

## 6. Task Scheduler Policy

**Purpose**: Manage scheduled tasks without blocking or resource exhaustion

### 6.1 Scheduler Configuration
- Use priority queue for task scheduling
- Tasks with higher priority execute first
- Default priority: 5 (range 1-10)
- High-priority tasks (1-3): Execute immediately if resources available
- Low-priority tasks (7-10): Execute during idle periods

### 6.2 Scheduling Rules
```javascript
// Task scheduler structure
const scheduler = {
  maxConcurrent: 5,
  queue: [],
  running: new Set(),
  
  schedule(task, priority = 5) {
    this.queue.push({ task, priority, scheduledAt: Date.now() });
    this.queue.sort((a, b) => a.priority - b.priority);
    this.processQueue();
  },
  
  processQueue() {
    while (this.running.size < this.maxConcurrent && this.queue.length > 0) {
      const { task } = this.queue.shift();
      this.execute(task);
    }
  }
};
```

### 6.3 Scheduled Task Types
- **Periodic**: Run at fixed intervals (health checks, sync)
- **Delayed**: Run after specified delay
- **One-time**: Run once at scheduled time
- **Recurring**: Run on cron-like schedule

### 6.4 Resource Management
- Track CPU and memory usage per task
- Pause low-priority tasks if resources low
- Never schedule more than 5 concurrent tasks
- Clean up completed tasks from memory immediately

---

## 7. Tool Execution Sandbox

**Purpose**: Isolate and secure tool execution to prevent system instability

### 7.1 Sandbox Configuration
- All tool executions run in isolated context
- Maximum execution time: 30 seconds (configurable per tool)
- Memory limit: 512MB per tool execution
- File system access: restricted to workspace only
- Network access: allowed only for whitelisted endpoints

### 7.2 Tool Execution Rules
```javascript
// Sandbox execution pattern
async function executeInSandbox(tool, args, options = {}) {
  const sandbox = {
    timeout: options.timeout || 30000,
    memoryLimit: options.memoryLimit || 512 * 1024 * 1024,
    allowedPaths: ['s:/workspace', 's:/workspace/*'],
    networkWhitelist: [
      'localhost:54112',
      '127.0.0.1:54112'
    ]
  };
  
  // Execute with timeout and resource limits
  return Promise.race([
    tool.execute(args),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), sandbox.timeout)
    )
  ]);
}
```

### 7.3 Tool Categories & Limits
| Category | Timeout | Memory | Network |
|----------|---------|--------|---------|
| File Read | 10s | 256MB | No |
| File Write | 10s | 256MB | No |
| HTTP Request | 10s | 128MB | Whitelist only |
| Code Execution | 30s | 512MB | No |
| Shell Command | 30s | 256MB | No |

### 7.4 Sandbox Isolation
- Tools cannot access process.env directly
- Tools cannot spawn child processes without approval
- Tools cannot access files outside workspace
- Tools cannot make network calls to non-whitelisted endpoints

---

## 8. Command Rewrite Layer

**Purpose**: Automatically transform commands into safe, non-blocking patterns

### 8.1 Rewrite Rules
```javascript
// Command rewrite patterns
const rewriteRules = [
  // PowerShell curl alias -> curl.exe
  { pattern: /^curl\s+/, replacement: 'curl.exe ' },
  
  // Add timeout to curl
  { 
    pattern: /curl\.exe\s+(?!.*--max-time)/, 
    replacement: 'curl.exe --max-time 3 ' 
  },
  
  // Block Invoke-WebRequest
  {
    pattern: /Invoke-WebRequest/,
    replacement: '// BLOCKED: Use curl.exe instead',
    block: true
  },
  
  // Convert blocking node to background
  {
    pattern: /^node\s+server\.js/,
    replacement: 'Start-Process node -ArgumentList "server.js" -WindowStyle Hidden'
  }
];

function rewriteCommand(command) {
  let rewritten = command;
  for (const rule of rewriteRules) {
    if (rule.block && rewritten.includes(rule.pattern)) {
      throw new Error(`Blocked command: ${rule.pattern}`);
    }
    rewritten = rewritten.replace(rule.pattern, rule.replacement);
  }
  return rewritten;
}
```

### 8.2 Pre-Execution Validation
- Check command against allowedCommands list
- Validate all timeouts are present
- Verify no blocking patterns detected
- Ensure network calls use whitelisted endpoints

### 8.3 Automatic Rewrites Applied
| Original | Rewritten |
|----------|----------|
| `curl http://...` | `curl.exe -s --max-time 3 http://...` |
| `node server.js` | `Start-Process node -ArgumentList "server.js"` |
| `Invoke-WebRequest ...` | ERROR: Blocked |
| `curl -v ...` | `curl.exe -s --max-time 3 -v ...` |

### 8.4 Rewrite Layer Integration
- All commands pass through rewrite layer before execution
- Rewrite happens automatically in background
- Original command logged for debugging
- Rewritten command used for actual execution

---

## Summary: Quick Reference

| Operation | Command Pattern | Timeout |
|-----------|----------------|---------|
| Health Check | `curl.exe -s --max-time 3 http://localhost:54112/api/health` | 3s |
| Start Server | `Start-Process node -ArgumentList "server.js"` | N/A |
| File Read | Async with promise | 10s |
| File Write | Async with promise | 10s |
| External API | `curl.exe -s --max-time 10 ...` | 10s |
| Background Task | Spawn detached | Per task |

---

## 9. Task Scheduler Implementation

**Purpose**: Production-ready task scheduler with priority queuing

### 9.1 Scheduler Class
```javascript
class TaskScheduler {
  constructor(options = {}) {
    this.maxConcurrent = options.maxConcurrent || 5;
    this.queue = [];
    this.running = new Map();
    this.completed = [];
    this.failed = [];
    this.tickInterval = options.tickInterval || 1000;
  }
  
  // Add task to queue
  schedule(taskFn, options = {}) {
    const task = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fn: taskFn,
      priority: options.priority || 5,  // 1-10, lower = higher priority
      name: options.name || 'unnamed',
      timeout: options.timeout || 30000,
      retries: options.retries || 0,
      maxRetries: options.maxRetries || 3,
      scheduledAt: Date.now(),
      startedAt: null,
      completedAt: null,
      error: null
    };
    
    this.queue.push(task);
    this.queue.sort((a, b) => a.priority - b.priority);
    this.processQueue();
    return task.id;
  }
  
  // Process queue with concurrency limit
  processQueue() {
    while (this.running.size < this.maxConcurrent && this.queue.length > 0) {
      const task = this.queue.shift();
      this.executeTask(task);
    }
  }
  
  // Execute single task
  async executeTask(task) {
    this.running.set(task.id, task);
    task.startedAt = Date.now();
    
    try {
      const result = await Promise.race([
        task.fn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), task.timeout)
        )
      ]);
      
      task.completedAt = Date.now();
      this.completed.push(task);
      this.running.delete(task.id);
      
      console.log(`[Scheduler] Task ${task.name} completed in ${task.completedAt - task.scheduledAt}ms`);
      
    } catch (error) {
      task.error = error;
      
      if (task.retries < task.maxRetries) {
        task.retries++;
        console.log(`[Scheduler] Task ${task.name} failed, retry ${task.retries}/${task.maxRetries}`);
        this.queue.unshift(task);  // Re-queue with higher priority
      } else {
        this.failed.push(task);
        console.error(`[Scheduler] Task ${task.name} failed permanently:`, error.message);
      }
      
      this.running.delete(task.id);
    }
    
    this.processQueue();
  }
  
  // Get scheduler status
  getStatus() {
    return {
      queued: this.queue.length,
      running: this.running.size,
      completed: this.completed.length,
      failed: this.failed.length
    };
  }
}
```

### 9.2 Usage Examples
```javascript
const scheduler = new TaskScheduler({ maxConcurrent: 5 });

// Schedule health check
scheduler.schedule(
  () => fetch('http://localhost:54112/api/health').then(r => r.json()),
  { 
    name: 'health-check',
    priority: 1,  // High priority
    timeout: 5000,
    maxRetries: 2
  }
);

// Schedule memory cleanup (low priority)
scheduler.schedule(
  () => cleanupMemory(),
  { 
    name: 'memory-cleanup',
    priority: 8,
    timeout: 30000
  }
);
```

---

## 10. Tool Sandbox Implementation

**Purpose**: Isolated execution environment for tools

### 10.1 Sandbox Class
```javascript
class ToolSandbox {
  constructor(options = {}) {
    this.timeout = options.timeout || 30000;
    this.memoryLimit = options.memoryLimit || 512 * 1024 * 1024;
    this.allowedPaths = options.allowedPaths || ['s:/workspace'];
    this.whitelistedEndpoints = options.whitelistedEndpoints || [
      'localhost:54112',
      '127.0.0.1:54112'
    ];
    this.executionLog = [];
  }
  
  // Validate file path is within allowed directories
  validatePath(filePath) {
    const normalized = filePath.toLowerCase().replace(/\\/g, '/');
    return this.allowedPaths.some(path => 
      normalized.startsWith(path.toLowerCase().replace(/\\/g, '/'))
    );
  }
  
  // Validate network endpoint
  validateEndpoint(url) {
    try {
      const parsed = new URL(url);
      return this.whitelistedEndpoints.some(ep => 
        url.includes(ep) || parsed.hostname === ep || parsed.host === ep
      );
    } catch {
      return false;
    }
  }
  
  // Execute tool in sandbox
  async execute(toolName, toolFn, args = {}) {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    const logEntry = {
      id: executionId,
      tool: toolName,
      args: args,
      startTime,
      status: 'running'
    };
    
    this.executionLog.push(logEntry);
    
    try {
      const result = await Promise.race([
        toolFn(args),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Timeout after ${this.timeout}ms`)), this.timeout)
        )
      ]);
      
      logEntry.status = 'completed';
      logEntry.endTime = Date.now();
      logEntry.duration = logEntry.endTime - logEntry.startTime;
      
      return { success: true, result, executionId };
      
    } catch (error) {
      logEntry.status = 'failed';
      logEntry.endTime = Date.now();
      logEntry.duration = logEntry.endTime - logEntry.startTime;
      logEntry.error = error.message;
      
      return { success: false, error: error.message, executionId };
    }
  }
  
  // Get execution history
  getHistory(limit = 50) {
    return this.executionLog.slice(-limit);
  }
  
  // Clear old logs
  clearLogs(olderThanMs = 3600000) {
    const cutoff = Date.now() - olderThanMs;
    this.executionLog = this.executionLog.filter(e => e.startTime > cutoff);
  }
}
```

### 10.2 Tool Categories with Limits
```javascript
const TOOL_LIMITS = {
  fileRead: { timeout: 10000, memory: 256 * 1024 * 1024 },
  fileWrite: { timeout: 10000, memory: 256 * 1024 * 1024 },
  httpRequest: { timeout: 10000, memory: 128 * 1024 * 1024 },
  codeExecution: { timeout: 30000, memory: 512 * 1024 * 1024 },
  shellCommand: { timeout: 30000, memory: 256 * 1024 * 1024 },
  databaseQuery: { timeout: 15000, memory: 256 * 1024 * 1024 }
};
```

---

## 11. Multi-Agent Coordination Layer

**Purpose**: Coordinate multiple agents without conflicts

### 11.1 Coordination Manager
```javascript
class AgentCoordination {
  constructor(options = {}) {
    this.agents = new Map();
    this.channels = new Map();
    this.messageQueue = [];
    this.eventBus = new EventEmitter();
    this.maxAgents = options.maxAgents || 10;
  }
  
  // Register an agent
  registerAgent(agentId, capabilities = []) {
    if (this.agents.size >= this.maxAgents) {
      throw new Error('Max agents reached');
    }
    
    const agent = {
      id: agentId,
      capabilities,
      status: 'idle',  // idle, busy, offline
      currentTask: null,
      registeredAt: Date.now(),
      lastHeartbeat: Date.now(),
      messages: []
    };
    
    this.agents.set(agentId, agent);
    this.eventBus.emit('agent:registered', agent);
    
    return agent;
  }
  
  // Send message to agent
  sendMessage(fromAgentId, toAgentId, message) {
    const toAgent = this.agents.get(toAgentId);
    if (!toAgent) {
      throw new Error(`Agent ${toAgentId} not found`);
    }
    
    const msg = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      from: fromAgentId,
      to: toAgentId,
      payload: message,
      timestamp: Date.now(),
      status: 'pending'
    };
    
    toAgent.messages.push(msg);
    this.messageQueue.push(msg);
    this.eventBus.emit('message:received', msg);
    
    return msg.id;
  }
  
  // Broadcast to channel
  broadcast(channelName, message, fromAgentId) {
    const channel = this.channels.get(channelName) || [];
    
    for (const agentId of channel) {
      if (agentId !== fromAgentId) {
        this.sendMessage(fromAgentId, agentId, { channel: channelName, ...message });
      }
    }
  }
  
  // Join channel
  joinChannel(agentId, channelName) {
    if (!this.channels.has(channelName)) {
      this.channels.set(channelName, []);
    }
    
    const channel = this.channels.get(channelName);
    if (!channel.includes(agentId)) {
      channel.push(agentId);
    }
  }
  
  // Leave channel
  leaveChannel(agentId, channelName) {
    const channel = this.channels.get(channelName);
    if (channel) {
      const index = channel.indexOf(agentId);
      if (index > -1) channel.splice(index, 1);
    }
  }
  
  // Claim task (prevents race conditions)
  async claimTask(agentId, taskId) {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error('Agent not found');
    if (agent.status === 'busy') throw new Error('Agent is busy');
    
    agent.status = 'busy';
    agent.currentTask = taskId;
    
    this.eventBus.emit('task:claimed', { agentId, taskId });
    
    return true;
  }
  
  // Release task
  releaseTask(agentId, taskId) {
    const agent = this.agents.get(agentId);
    if (!agent) return;
    
    agent.status = 'idle';
    agent.currentTask = null;
    
    this.eventBus.emit('task:released', { agentId, taskId });
  }
  
  // Get agent status
  getAgentStatus(agentId) {
    return this.agents.get(agentId);
  }
  
  // Get all agents by status
  getAgentsByStatus(status) {
    return Array.from(this.agents.values()).filter(a => a.status === status);
  }
}
```

### 11.2 Inter-Agent Communication
```javascript
// Example: Router agent delegates to specialist agents
const coordination = new AgentCoordination();

// Register agents
coordination.registerAgent('router', ['route', 'delegate']);
coordination.registerAgent('code-agent', ['write-code', 'refactor']);
coordination.registerAgent('debug-agent', ['debug', 'analyze']);

// Join channel for task distribution
coordination.joinChannel('router', 'tasks');
coordination.joinChannel('code-agent', 'tasks');
coordination.joinChannel('debug-agent', 'tasks');

// Router delegates task
coordination.sendMessage('router', 'code-agent', {
  type: 'task',
  action: 'write-code',
  requirements: 'Create a function to parse JSON'
});
```

---

## Summary: Quick Reference

| Operation | Command Pattern | Timeout |
|-----------|----------------|----------|
| Health Check | `curl.exe -s --max-time 3 http://localhost:54112/api/health` | 3s |
| Start Server | `Start-Process node -ArgumentList "server.js"` | N/A |
| File Read | Async with promise | 10s |
| File Write | Async with promise | 10s |
| External API | `curl.exe -s --max-time 10 ...` | 10s |
| Background Task | Spawn detached | Per task |

---

## 12. Error Taxonomy & Recovery Policy

**Purpose**: Classify errors and apply appropriate recovery actions

### 12.1 Error Classes
| Code | Class | Description | Examples |
|------|-------|-------------|----------|
| E1 | Transient | Temporary failures, retry may succeed | Timeouts, network hiccups, brief service unavailability |
| E2 | Recoverable | Invalid input, missing resources | Bad command syntax, missing file, invalid JSON |
| E3 | Critical | Tool crash, corrupted state | Sandbox crash, memory corruption, process death |
| E4 | Fatal | Infinite loop, runaway process | CPU maxed, memory exhausted, zombie process |

### 12.2 Recovery Actions
```javascript
const ERROR_RECOVERY = {
  E1: {
    maxRetries: 2,
    backoffMs: 1000,
    action: 'retry_with_backoff'
  },
  E2: {
    maxRetries: 1,
    action: 'rewrite_or_sanitize_input'
  },
  E3: {
    maxRetries: 0,
    action: 'isolate_restart_sandbox'
  },
  E4: {
    maxRetries: 0,
    action: 'abort_task_preserve_logs'
  }
};

function classifyError(error) {
  if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
    return 'E1';
  }
  if (error.message.includes('ENOENT') || error.message.includes('invalid') || error.message.includes('parse')) {
    return 'E2';
  }
  if (error.message.includes('crash') || error.message.includes('SIGSEGV') || error.message.includes('EPERM')) {
    return 'E3';
  }
  return 'E4';
}
```

---

## 13. State Integrity & Self-Validation Policy

**Purpose**: Ensure Kilo never acts on corrupted or partial state

### 13.1 Validation Rules
- Validate internal state before executing any task
- If state is inconsistent, rebuild from source of truth
- Never assume previous task succeeded
- Always verify file existence before operating
- Always verify process existence before signaling

### 13.2 State Validation
```javascript
class StateValidator {
  validate() {
    const issues = [];
    
    // Check scheduler state
    if (!this.scheduler) issues.push('Scheduler not initialized');
    
    // Check sandbox state
    if (!this.sandbox) issues.push('Sandbox not initialized');
    
    // Check server connectivity
    if (!this.serverConnected) issues.push('Server not connected');
    
    // Check process count
    const procCount = this.getProcessCount();
    if (procCount > 10) issues.push(`Too many processes: ${procCount}`);
    
    return {
      valid: issues.length === 0,
      issues
    };
  }
  
  async rebuild() {
    console.log('[State] Rebuilding from source of truth...');
    // Reinitialize all components
    await this.initScheduler();
    await this.initSandbox();
    await this.checkServerConnection();
  }
}
```

---

## 14. Permission & Capability Boundary Policy

**Purpose**: Define what Kilo is allowed to do

### 14.1 Capability Boundaries
```javascript
const BOUNDARIES = {
  filesystem: {
    allowedRoots: ['s:/workspace'],
    deniedPatterns: ['**/.env', '**/*.pem', '**/*.key', '**/secrets/**'],
    maxFileSize: 100 * 1024 * 1024  // 100MB
  },
  processes: {
    maxConcurrent: 5,
    maxTotal: 20,
    allowedCommands: ['node', 'npm', 'git', 'curl.exe', 'powershell']
  },
  network: {
    allowedEndpoints: [
      'localhost:54112',
      '127.0.0.1:54112'
    ],
    blockedPorts: [22, 23, 25, 3389]
  },
  system: {
    canElevate: false,
    canModifyRegistry: false,
    canInstallPackages: false
  }
};

function checkBoundary(component, action) {
  // Check if action is within boundaries
  return true;  // Implementation depends on component
}
```

---

## 15. Intent Resolution & Command Safety Policy

**Purpose**: Validate and sanitize commands before execution

### 15.1 Command Safety Checks
```javascript
async function validateCommand(command) {
  const issues = [];
  
  // 1. Parse intent
  const parsed = parseCommand(command);
  
  // 2. Validate structure
  if (!parsed.command) issues.push('No command specified');
  
  // 3. Sanitize arguments
  const sanitized = sanitizeArgs(parsed.args);
  
  // 4. Check for dangerous patterns
  if (command.includes('rm -rf /')) issues.push('Destructive command detected');
  if (command.includes('&&') && command.includes('rm')) issues.push('Chained destructive command');
  
  // 5. Rewrite to safe equivalent
  const safe = rewriteToSafe(command);
  
  return {
    safe: issues.length === 0,
    issues,
    sanitizedCommand: safe
  };
}
```

---

## 16. Process Lifecycle Management Policy

**Purpose**: Define lifecycle rules for all processes

### 16.1 Lifecycle Rules
```javascript
class ProcessManager {
  constructor() {
    this.processes = new Map();
    this.zombieThreshold = 60000;  // 1 minute
  }
  
  spawn(command, options = {}) {
    const proc = {
      id: `proc_${Date.now()}`,
      command,
      startTime: Date.now(),
      timeout: options.timeout || 30000,
      heartbeat: Date.now(),
      status: 'running'
    };
    
    // Set up timeout
    setTimeout(() => {
      if (proc.status === 'running') {
        this.kill(proc.id);
      }
    }, proc.timeout);
    
    this.processes.set(proc.id, proc);
    return proc.id;
  }
  
  kill(procId) {
    const proc = this.processes.get(procId);
    if (proc) {
      proc.status = 'killed';
      proc.endTime = Date.now();
    }
  }
  
  reapZombies() {
    const now = Date.now();
    for (const [id, proc] of this.processes) {
      if (now - proc.heartbeat > this.zombieThreshold) {
        this.kill(id);
        console.log(`[ProcessManager] Reaped zombie: ${id}`);
      }
    }
  }
}
```

---

## 17. Resource Budgeting Policy

**Purpose**: Define hard ceilings for resource usage

### 17.1 Resource Limits
```javascript
const RESOURCE_LIMITS = {
  cpu: {
    maxPerTask: 50,  // percentage
    maxTotal: 80
  },
  memory: {
    maxPerTask: 512 * 1024 * 1024,  // 512MB
    maxTotal: 2 * 1024 * 1024 * 1024  // 2GB
  },
  disk: {
    maxWriteRate: 10 * 1024 * 1024,  // 10MB/s
    maxReadRate: 50 * 1024 * 1024  // 50MB/s
  },
  network: {
    maxBandwidth: 10 * 1024 * 1024  // 10MB/s
  },
  logs: {
    maxSize: 100 * 1024 * 1024,  // 100MB
    maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
  }
};
```

---

## 18. Logging & Audit Policy

**Purpose**: Comprehensive logging for observability

### 18.1 Audit Events
```javascript
const AUDIT_EVENTS = {
  command: { level: 'info', retention: 30 },
  rewrite: { level: 'debug', retention: 7 },
  failure: { level: 'error', retention: 90 },
  recovery: { level: 'warn', retention: 60 },
  taskStart: { level: 'info', retention: 14 },
  taskStop: { level: 'info', retention: 14 },
  healthCheck: { level: 'debug', retention: 7 }
};

function log(eventType, data) {
  const event = AUDIT_EVENTS[eventType];
  if (!event) return;
  
  const entry = {
    timestamp: new Date().toISOString(),
    type: eventType,
    level: event.level,
    data: redactSensitive(data)
  };
  
  console[event.level](JSON.stringify(entry));
}

function redactSensitive(obj) {
  // Redact API keys, passwords, tokens
  const redacted = { ...obj };
  for (const key of Object.keys(redacted)) {
    if (key.match(/pass|key|token|secret|auth/i)) {
      redacted[key] = '[REDACTED]';
    }
  }
  return redacted;
}
```

---

## 19. Self-Healing & Auto-Recovery Policy

**Purpose**: Make the system resilient to failures

### 19.1 Recovery Rules
```javascript
const SELF_HEALING = {
  sandboxCrash: {
    trigger: 'process_exit_unexpected',
    action: 'restart_sandbox',
    maxAttempts: 3
  },
  loopStall: {
    trigger: 'no_heartbeat_60s',
    action: 'restart_loop',
    maxAttempts: 3
  },
  healthCheckFail: {
    trigger: 'consecutive_failures_3',
    action: 'restart_backend',
    maxAttempts: 5
  },
  stateInconsistent: {
    trigger: 'validation_failed',
    action: 'rebuild_state',
    maxAttempts: 2
  },
  rewriteFail: {
    trigger: 'parse_error',
    action: 'fallback_safe_mode',
    maxAttempts: 1
  }
};
```

---

## 20. Versioning & Migration Policy

**Purpose**: Handle updates without breaking existing functionality

### 20.1 Version Management
```javascript
const POLICY_VERSION = {
  current: '1.0.0',
  minimum: '1.0.0',
  lastKnownGood: '1.0.0'
};

function validatePolicyVersion(version) {
  if (!version) return false;
  
  const current = POLICY_VERSION.current.split('.').map(Number);
  const incoming = version.split('.').map(Number);
  
  // Simple version check
  for (let i = 0; i < 3; i++) {
    if (incoming[i] > current[i]) return false;
    if (incoming[i] < current[i]) return true;  // downgrade
  }
  
  return true;
}

function migrate(fromVersion, toVersion) {
  // Apply migrations sequentially
  console.log(`[Migration] ${fromVersion} -> ${toVersion}`);
}
```

---

## 21. Emergency Stop & Safe Mode Policy

**Purpose**: The "big red button" for catastrophic failures

### 21.1 Emergency Triggers
```javascript
const EMERGENCY_TRIGGERS = [
  'E4_error',           // Fatal error
  'memory_exhausted',   // Memory > 95%
  'cpu_maxed',          // CPU > 95% for 30s
  'zombie_accumulation', // > 5 zombie processes
  'unhandled_crash'    // Uncaught exception
];

let safeMode = false;

function enterSafeMode(reason) {
  console.error(`[EMERGENCY] Entering safe mode: ${reason}`);
  safeMode = true;
  
  // Disable external commands
  BOUNDARIES.processes.maxConcurrent = 0;
  
  // Only allow health checks
  ALLOWED_COMMANDS = ['curl.exe'];
}

function exitSafeMode() {
  console.log('[EMERGENCY] Exiting safe mode (manual override required)');
  safeMode = false;
  // Restore normal limits
}

function isSafeMode() {
  return safeMode;
}
```

---

## Summary: Complete Policy Reference

| Section | Purpose |
|---------|--------|
| 1-5 | Core execution rules |
| 6-8 | Task management |
| 9-11 | Implementation classes |
| 12 | Error classification |
| 13 | State validation |
| 14 | Permissions |
| 15 | Command safety |
| 16 | Process lifecycle |
| 17 | Resource limits |
| 18 | Audit logging |
| 19 | Self-healing |
| 20 | Versioning |
| 21 | Emergency stop |

---

# PART II: SUBAGENT GOVERNANCE

---

## Subagent Charter Template

**Purpose**: Template for creating consistent, governed subagents under Kilo

### Template Structure

```yaml
subagent_charter:
  version: "1.0.0"
  parent: "kilo"
  
  identity:
    name: "<agent-name>"
    role: "<role-description>"
    domain: "<responsibility-area>"
    
  capabilities:
    - "<capability-1>"
    - "<capability-2>"
    
  non_capabilities:
    - "<cannot-do-1>"
    - "<cannot-do-2>"
    
  escalation:
    to: "kilo"
    trigger: ["E4_error", "safe_mode", "unhandled_crash"]
```

---

## 1. Subagent Identity Block

### Required Fields
```yaml
identity:
  name: string           # Unique agent identifier
  role: string           # What the agent does
  domain: string         # Area of responsibility
  version: string        # Charter version
  parent: string         # Parent orchestrator (usually "kilo")
```

### Escalation Rules
```javascript
const ESCALATION_RULES = {
  triggers: [
    'E4_error',           // Fatal error
    'safe_mode_entered',  // System in safe mode
    'unhandled_crash',    // Uncaught exception
    'resource_exhausted', // CPU/memory maxed
    'infinite_loop',      // Task running too long
    'permission_denied'   // Boundary violation
  ],
  escalationTarget: 'kilo',
  timeout: 5000,  // Escalate if not resolved in 5s
  preserveState: true  // Keep state for debugging
};
```

---

## 2. Subagent Permission Boundary

### Inherited from Kilo
```javascript
const SUBAGENT_BOUNDARIES = {
  ...KILO_BOUNDARIES,  // Inherit all Kilo boundaries
  
  // Can add more restrictive rules
  allowedCommands: [...KILO_ALLOWED, '<agent-specific>'],
  deniedCommands: [...KILO_DENIED, '<agent-specific-deny>'],
  
  // Override limits (must be <= parent)
  maxConcurrency: Math.min(KILO_LIMIT, <agent-limit>),
  maxRuntime: Math.min(KILO_TIMEOUT, <agent-timeout>)
};
```

### Example: Code Agent Boundaries
```yaml
permission_boundary:
  allowed_commands:
    - git
    - node
    - npm
    - npx
    - eslint
    - prettier
  
  denied_commands:
    - rm -rf /
    - curl.*--data.*password
    - sudo
    - chmod 777
  
  allowed_paths:
    - s:/workspace
    - s:/workspace/src
  
  allowed_network:
    - localhost:54112
```

---

## 3. Subagent Execution Policy

### Resource Limits (inherited with overrides)
```javascript
const SUBAGENT_LIMITS = {
  // Inherited from Kilo
  ...RESOURCE_LIMITS,
  
  // Override (must be <= parent)
  maxConcurrency: 3,     // Kilo allows 5, agent uses 3
  maxRuntime: 60000,     // 60 seconds max
  maxMemory: 256 * 1024 * 1024,  // 256MB
  maxCPU: 30  // 30% max
};
```

### Execution Rules
```javascript
const EXECUTION_POLICY = {
  validateBeforeRun: true,
  rewriteCommands: true,
  sandboxExecution: true,
  trackResources: true,
  logEverything: true,
  
  // Override specific rules
  commandTimeout: 30000,
  retryOnE1: true,
  retryOnE2: false
};
```

---

## 4. Subagent Rewrite Layer

### Inherited + Scoped Rules
```javascript
const AGENT_REWRITE_RULES = [
  ...KILO_REWRITE_RULES,  // Inherit Kilo rules
  
  // Agent-specific rules
  {
    pattern: /npm\s+install\s+(-g|--global)/,
    replacement: 'npm install --save-dev',
    reason: 'No global packages'
  },
  {
    pattern: /\.\//,
    replacement: './',
    reason: 'Allow relative paths'
  }
];
```

---

## 5. Subagent Sandbox

### Isolation Configuration
```javascript
const AGENT_SANDBOX = {
  ...KILO_SANDBOX,  // Inherit base sandbox
  
  // Agent-specific
  workspace: 's:/workspace/agents/<agent-name>',
  tempDir: 's:/workspace/temp/<agent-name>',
  
  // Tool restrictions
  allowedTools: [
    'fileRead',
    'fileWrite',
    'codeExecution',
    'git'
  ],
  
  // Network restrictions
  allowedEndpoints: [
    'localhost:54112',
    'api.github.com'  // If needed for specific agent
  ]
};
```

---

## 6. Subagent Scheduler Rules

### Priority and Queue Config
```javascript
const AGENT_SCHEDULER = {
  ...KILO_SCHEDULER,  // Inherit base scheduler
  
  // Agent-specific priority
  priorityRange: {
    min: 3,  // Higher priority (1-10 scale)
    max: 7
  },
  
  // Task claiming
  autoClaim: true,
  claimTimeout: 5000,
  
  // Task lifecycle
  taskTimeout: 60000,
  taskRetryLimit: 2,
  backoffMultiplier: 1.5
};
```

---

## 7. Subagent Error Taxonomy

### Inherited E1-E4 + Custom Errors
```javascript
const AGENT_ERROR_TAXONOMY = {
  ...ERROR_TAXONOMY,  // Inherit Kilo's E1-E4
  
  // Agent-specific error codes
  E10: {  // Code-specific
    name: 'syntax_error',
    retry: false,
    action: 'report_to_user'
  },
  E11: {  // Build-specific
    name: 'build_failed',
    retry: true,
    maxRetries: 2,
    action: 'retry_with_fixes'
  },
  E12: {  # Test-specific
    name: 'test_failed',
    retry: false,
    action: 'report_failures'
  }
};
```

---

## 8. Subagent State Integrity Rules

### Validation Functions
```javascript
const STATE_VALIDATION = {
  // Inherit base validation
  ...BASE_STATE_VALIDATION,
  
  // Agent-specific checks
  validateInput: (input) => {
    if (!input.task) return { valid: false, reason: 'No task specified' };
    if (!input.files) return { valid: false, reason: 'No files specified' };
    return { valid: true };
  },
  
  validateOutput: (output) => {
    if (!output.success && !output.error) {
      return { valid: false, reason: 'Ambiguous output' };
    }
    return { valid: true };
  },
  
  validateEnvironment: () => {
    // Agent-specific checks
    return { valid: true };
  }
};
```

---

## 9. Subagent Logging & Audit

### Event Types
```javascript
const AGENT_AUDIT_EVENTS = {
  ...BASE_AUDIT_EVENTS,  // Inherit base events
  
  // Agent-specific events
  task_received: { level: 'info', retention: 30 },
  task_started: { level: 'info', retention: 30 },
  task_completed: { level: 'info', retention: 30 },
  code_generated: { level: 'debug', retention: 14 },
  test_run: { level: 'info', retention: 30 },
  build_triggered: { level: 'info', retention: 30 }
};
```

---

## 10. Subagent Self-Healing

### Recovery Sequences
```javascript
const SELF_HEALING = {
  ...KILO_SELF_HEALING,  // Inherit base healing
  
  // Agent-specific recovery
  restartOnStall: {
    trigger: 'no_heartbeat_30s',
    action: 'restart_agent',
    maxAttempts: 3
  },
  
  recoverOnError: {
    trigger: 'E10_syntax_error',
    action: 'request_clarification',
    maxAttempts: 1
  }
};
```

---

## 11. Subagent Versioning

### Version Management
```javascript
const SUBAGENT_VERSION = {
  charterVersion: '1.0.0',
  compatibleWithParent: '>=1.0.0',
  minParentVersion: '1.0.0',
  
  migrationPath: {
    '1.0.0': '1.0.1': migrate_100_to_101
  },
  
  validateCompatibility: (parentVersion) => {
    return semver.gte(parentVersion, minParentVersion);
  }
};
```

---

## 12. Subagent Coordination Rules

### Communication Protocol
```javascript
const COORDINATION = {
  // How this agent talks to Kilo
  parentCommunication: {
    channel: 'orchestrator',
    heartbeatInterval: 10000,
    reportStatus: ['idle', 'busy', 'error'],
    escalateOn: ['E4', 'safe_mode']
  },
  
  // How this agent talks to other agents
  peerCommunication: {
    allowedChannels: ['tasks', 'results'],
    canBroadcast: true,
    canDirectMessage: true
  },
  
  // Task coordination
  taskCoordination: {
    canClaimTasks: true,
    canReleaseTasks: true,
    canDelegateTasks: false  # Must go through Kilo
  }
};
```

---

## Example: Code Agent Charter

```yaml
subagent_charter:
  version: "1.0.0"
  parent: "kilo"
  
  identity:
    name: "code-agent"
    role: "Code generation and refactoring"
    domain: "Software development"
    capabilities:
      - write_code
      - refactor
      - lint
      - format
    non_capabilities:
      - delete_files
      - modify_git_history
      - deploy_production
  
  permission_boundary:
    allowed_commands: [git, node, npm, npx, eslint, prettier, typescript]
    denied_commands: [rm -rf, sudo, chmod 777, curl.*--data]
    allowed_paths: [s:/workspace/src, s:/workspace/tests]
    max_concurrency: 2
    max_runtime: 60000
  
  execution_policy:
    validate_before_run: true
    rewrite_commands: true
    sandbox_execution: true
    max_retries: 2
  
  scheduler:
    priority_range: [2, 6]
    task_timeout: 45000
  
  error_taxonomy:
    inherit: [E1, E2, E3, E4]
    custom:
      E10: syntax_error
      E11: build_failed
      E12: test_failed
  
  coordination:
    channel: "code-tasks"
    can_claim: true
    can_delegate: false
```

---

## Summary: Subagent Governance

| Section | Purpose |
|---------|---------|
| Identity | Who the agent is |
| Permissions | What it can/cannot do |
| Execution | Resource limits |
| Rewrite | Command safety |
| Sandbox | Isolation |
| Scheduler | Task queuing |
| Errors | Failure handling |
| State | Validation |
| Logging | Audit trail |
| Self-Healing | Auto-recovery |
| Versioning | Updates |
| Coordination | Inter-agent comms |

---

# PART III: AGENT PROVISIONING SYSTEM

---

## Agent Provisioning System

**Purpose**: Automated system for creating, initializing, and managing subagents with proper policy inheritance

### System Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    KILO (ROOT)                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Policy Registry (KILO_BEHAVIOR_CHARTER.md)       │   │
│  │ - Execution Policies                             │   │
│  │ - Rewrite Rules                                  │   │
│  │ - Sandbox Config                                 │   │
│  │ - Scheduler Config                               │   │
│  │ - Error Taxonomy                                 │   │
│  │ - Resource Limits                                │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              AGENT PROVISIONER                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 1. Validate Request                              │   │
│  │ 2. Merge Policies (Parent + Override)           │   │
│  │ 3. Generate Charter                              │   │
│  │ 4. Initialize Sandbox                            │   │
│  │ 5. Register with Coordinator                    │   │
│  │ 6. Start Heartbeat Monitor                      │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
   ┌──────────┐    ┌──────────┐    ┌──────────┐
   │ CODE     │    │ DEBUG    │    │ MEMORY   │
   │ AGENT    │    │ AGENT    │    │ AGENT    │
   └──────────┘    └──────────┘    └──────────┘
```

---

## 1. Provisioning Pipeline

### Phase 1: Validation
```javascript
class AgentProvisioner {
  async provision(request) {
    // Phase 1: Validate request
    const validation = this.validateRequest(request);
    if (!validation.valid) {
      throw new Error(`Invalid request: ${validation.reason}`);
    }
    
    // Phase 2: Merge policies
    const policies = this.mergePolicies(request);
    
    // Phase 3: Generate charter
    const charter = this.generateCharter(request, policies);
    
    // Phase 4: Initialize sandbox
    const sandbox = await this.initSandbox(charter);
    
    // Phase 5: Register with coordinator
    const agentId = await this.register(charter);
    
    // Phase 6: Start heartbeat
    this.startHeartbeat(agentId);
    
    return { agentId, charter, sandbox };
  }
  
  validateRequest(request) {
    if (!request.name) return { valid: false, reason: 'No name' };
    if (!request.role) return { valid: false, reason: 'No role' };
    if (!request.capabilities) return { valid: false, reason: 'No capabilities' };
    return { valid: true };
  }
}
```

---

## 2. Policy Inheritance Model

### Merge Strategy
```javascript
class PolicyMerger {
  merge(parentPolicies, childOverrides) {
    const merged = {};
    
    for (const [key, parentValue] of Object.entries(parentPolicies)) {
      const childValue = childOverrides[key];
      
      if (childValue === undefined) {
        // No override, use parent
        merged[key] = parentValue;
      } else if (this.isObject(parentValue) && this.isObject(childValue)) {
        // Recursive merge
        merged[key] = this.merge(parentValue, childValue);
      } else if (Array.isArray(parentValue)) {
        // Arrays: parent + child (deduped)
        merged[key] = [...new Set([...parentValue, ...childValue])];
      } else {
        // Primitive: child overrides
        merged[key] = childValue;
      }
    }
    
    return merged;
  }
  
  isObject(val) {
    return val !== null && typeof val === 'object' && !Array.isArray(val);
  }
}
```

### Inheritance Rules
```javascript
const INHERITANCE_RULES = {
  // Rules that CAN be overridden (looser)
  overridable: [
    'maxConcurrency',    // Can be lower
    'maxRuntime',       // Can be shorter
    'allowedCommands',  // Can add more
    'allowedPaths',     // Can add more
    'priorityRange'     // Can narrow
  ],
  
  // Rules that MUST be inherited (cannot loosen)
  mandatory: [
    'safeMode',
    'emergencyTriggers',
    'policyVersion',
    'parentIdentity'
  ],
  
  // Rules that CANNOT be overridden
  immutable: [
    'filesystem.allowedRoots',  // Always inherits root
    'network.blockedPorts',    // Always inherits blocks
    'system.canElevate'        // Always false
  ]
};
```

---

## 3. Charter Generator

### Template Engine
```javascript
class CharterGenerator {
  generate(agentConfig, parentPolicies) {
    const template = this.loadTemplate('subagent');
    
    // Fill in identity
    let charter = this.fillTemplate(template, {
      name: agentConfig.name,
      role: agentConfig.role,
      domain: agentConfig.domain,
      version: agentConfig.version || '1.0.0',
      parent: 'kilo'
    });
    
    // Merge policies
    charter.policies = this.mergePolicies(parentPolicies, agentConfig.overrides);
    
    // Add capabilities
    charter.capabilities = agentConfig.capabilities;
    
    // Add boundaries
    charter.boundaries = this.deriveBoundaries(
      parentPolicies.boundaries,
      agentConfig.boundaryOverrides
    );
    
    return charter;
  }
  
  deriveBoundaries(parent, overrides) {
    return {
      ...parent,
      ...overrides,
      // Ensure stricter limits
      maxConcurrency: Math.min(parent.maxConcurrency, overrides.maxConcurrency || Infinity),
      maxRuntime: Math.min(parent.maxRuntime, overrides.maxRuntime || Infinity)
    };
  }
}
```

---

## 4. Agent Registry

### Registration & Discovery
```javascript
class AgentRegistry {
  constructor() {
    this.agents = new Map();
    this.byRole = new Map();
    this.byDomain = new Map();
  }
  
  register(agent) {
    this.agents.set(agent.id, agent);
    
    // Index by role
    if (!this.byRole.has(agent.role)) {
      this.byRole.set(agent.role, []);
    }
    this.byRole.get(agent.role).push(agent.id);
    
    // Index by domain
    if (!this.byDomain.has(agent.domain)) {
      this.byDomain.set(agent.domain, []);
    }
    this.byDomain.get(agent.domain).push(agent.id);
  }
  
  findByRole(role) {
    return this.byRole.get(role) || [];
  }
  
  findByDomain(domain) {
    return this.byDomain.get(domain) || [];
  }
  
  get(agentId) {
    return this.agents.get(agentId);
  }
  
  list() {
    return Array.from(this.agents.values());
  }
}
```

---

## 5. Lifecycle Management

### Agent States
```javascript
const AGENT_STATES = {
  PROVISIONING: 'provisioning',   // Being created
  INITIALIZING: 'initializing',  // Loading policies
  READY: 'ready',                // Ready to accept tasks
  RUNNING: 'running',            // Executing task
  IDLE: 'idle',                  // Waiting for tasks
  RECOVERING: 'recovering',      // Self-healing
  TERMINATING: 'terminating',    // Being destroyed
  TERMINATED: 'terminated'       // Destroyed
};

class LifecycleManager {
  async transition(agentId, newState) {
    const agent = this.registry.get(agentId);
    const oldState = agent.state;
    
    // Validate transition
    const valid = this.validateTransition(oldState, newState);
    if (!valid) {
      throw new Error(`Invalid transition: ${oldState} -> ${newState}`);
    }
    
    // Execute exit actions
    await this.executeExitActions(agent, oldState);
    
    // Update state
    agent.state = newState;
    agent.stateHistory.push({ from: oldState, to: newState, at: Date.now() });
    
    // Execute entry actions
    await this.executeEntryActions(agent, newState);
    
    return agent;
  }
  
  validateTransition(from, to) {
    const validTransitions = {
      [AGENT_STATES.PROVISIONING]: [AGENT_STATES.INITIALIZING],
      [AGENT_STATES.INITIALIZING]: [AGENT_STATES.READY, AGENT_STATES.TERMINATED],
      [AGENT_STATES.READY]: [AGENT_STATES.RUNNING, AGENT_STATES.IDLE, AGENT_STATES.TERMINATING],
      [AGENT_STATES.RUNNING]: [AGENT_STATES.IDLE, AGENT_STATES.RECOVERING, AGENT_STATES.TERMINATING],
      [AGENT_STATES.IDLE]: [AGENT_STATES.RUNNING, AGENT_STATES.TERMINATING],
      [AGENT_STATES.RECOVERING]: [AGENT_STATES.READY, AGENT_STATES.TERMINATING],
      [AGENT_STATES.TERMINATING]: [AGENT_STATES.TERMINATED]
    };
    
    return validTransitions[from]?.includes(to);
  }
}
```

---

## 6. Health Monitoring

### Heartbeat System
```javascript
class AgentHealthMonitor {
  constructor(options = {}) {
    this.heartbeatInterval = options.heartbeatInterval || 10000;
    this.missedThreshold = options.missedThreshold || 3;
    this.healthCallbacks = [];
  }
  
  startMonitoring(agent) {
    agent.lastHeartbeat = Date.now();
    agent.missedHeartbeats = 0;
    
    const interval = setInterval(() => {
      this.checkHeartbeat(agent);
    }, this.heartbeatInterval);
    
    agent.monitorInterval = interval;
  }
  
  checkHeartbeat(agent) {
    const now = Date.now();
    const elapsed = now - agent.lastHeartbeat;
    
    if (elapsed > this.heartbeatInterval * this.missedThreshold) {
      agent.missedHeartbeats++;
      
      if (agent.missedHeartbeats >= this.missedThreshold) {
        this.triggerRecovery(agent);
      }
    }
  }
  
  triggerRecovery(agent) {
    console.error(`[Health] Agent ${agent.name} missed ${this.missedThreshold} heartbeats`);
    this.healthCallbacks.forEach(cb => cb(agent, 'stale'));
  }
  
  onHealthChange(callback) {
    this.healthCallbacks.push(callback);
  }
}
```

---

## 7. Automated Provisioning Example

### Creating a New Agent
```javascript
// Example: Create a new code-agent
const provisioner = new AgentProvisioner();

const codeAgent = await provisioner.provision({
  name: 'code-agent',
  role: 'code generation',
  domain: 'software development',
  version: '1.0.0',
  capabilities: [
    'write_code',
    'refactor',
    'lint',
    'format'
  ],
  boundaryOverrides: {
    allowedCommands: ['git', 'node', 'npm', 'npx', 'eslint', 'prettier'],
    maxConcurrency: 2,
    allowedPaths: ['s:/workspace/src']
  },
  overrides: {
    scheduler: {
      priorityRange: [2, 6]
    }
  }
});

console.log('Provisioned:', codeAgent.agentId);
// Output: "Provisioned: code-agent-1709875200000"
```

---

## Summary: Provisioning System

| Component | Purpose |
|-----------|---------|
| Provisioner | Creates new agents |
| Policy Merger | Merges parent + child policies |
| Charter Generator | Generates agent charters |
| Registry | Tracks all agents |
| Lifecycle Manager | Manages state transitions |
| Health Monitor | Monitors heartbeats |

---

---

# PART IV: PLATFORM INFRASTRUCTURE

---

## 1. Capability Matrix

**Purpose**: Track which agent can do what, prevent conflicts

### Matrix Structure
```javascript
const CAPABILITY_MATRIX = {
  agents: {
    'code-agent': {
      capabilities: ['write_code', 'refactor', 'lint', 'format'],
      exclusive: [],
      overlapping: ['debug-agent'],
      maxConcurrent: 2
    },
    'debug-agent': {
      capabilities: ['debug', 'analyze', 'fix'],
      exclusive: [],
      overlapping: ['code-agent'],
      maxConcurrent: 2
    },
    'memory-agent': {
      capabilities: ['store', 'retrieve', 'search'],
      exclusive: [],
      overlapping: [],
      maxConcurrent: 1
    }
  },
  conflicts: [
    { agents: ['code-agent', 'debug-agent'], resolution: 'priority' }
  ],
  escalation: {
    'code-agent': 'orchestrator',
    'debug-agent': 'orchestrator',
    'memory-agent': 'orchestrator'
  }
};
```

---

## 2. Global Event Bus

**Purpose**: Inter-agent communication without noise

### Event Bus Implementation
```javascript
class GlobalEventBus {
  constructor() {
    this.subscribers = new Map();  // topic -> Set of callbacks
    this.eventLog = [];
    this.replayBuffer = [];
    this.maxBufferSize = 1000;
  }
  
  subscribe(topic, callback, options = {}) {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
    }
    
    const subscription = {
      callback,
      agentId: options.agentId,
      filter: options.filter || (() => true),
      once: options.once || false
    };
    
    this.subscribers.get(topic).add(subscription);
    return () => this.unsubscribe(topic, subscription);
  }
  
  publish(topic, event, options = {}) {
    const eventEntry = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      topic,
      data: event,
      source: options.source,
      timestamp: Date.now(),
      delivered: false
    };
    
    // Add to replay buffer
    this.replayBuffer.push(eventEntry);
    if (this.replayBuffer.length > this.maxBufferSize) {
      this.replayBuffer.shift();
    }
    
    // Deliver to subscribers
    const subscribers = this.subscribers.get(topic) || new Set();
    for (const sub of subscribers) {
      if (sub.filter(event)) {
        try {
          sub.callback(eventEntry);
          eventEntry.delivered = true;
        } catch (e) {
          console.error(`Event delivery failed:`, e);
        }
      }
    }
    
    // Handle one-time subscriptions
    for (const sub of subscribers) {
      if (sub.once) {
        this.unsubscribe(topic, sub);
      }
    }
    
    this.eventLog.push(eventEntry);
    return eventEntry.id;
  }
  
  replay(topic, fromTimestamp) {
    return this.replayBuffer.filter(e => 
      e.topic === topic && e.timestamp > fromTimestamp
    );
  }
}
```

---

## 3. Task Routing Rules

**Purpose**: Assign tasks to appropriate agents

### Router Implementation
```javascript
class TaskRouter {
  constructor(capabilityMatrix, scheduler) {
    this.matrix = capabilityMatrix;
    this.scheduler = scheduler;
  }
  
  route(task) {
    const candidates = this.findCandidates(task);
    if (candidates.length === 0) {
      return { success: false, reason: 'No capable agent' };
    }
    
    const selected = this.selectBest(candidates);
    return this.assign(selected, task);
  }
  
  findCandidates(task) {
    const required = task.requiredCapabilities || [];
    return Object.entries(this.matrix.agents)
      .filter(([_, agent]) => 
        required.every(cap => agent.capabilities.includes(cap))
      )
      .map(([id, agent]) => ({
        id,
        ...agent,
        currentLoad: this.scheduler.getAgentLoad(id)
      }));
  }
  
  selectBest(candidates) {
    // Select by: lowest load, then highest priority
    return candidates
      .sort((a, b) => a.currentLoad - b.currentLoad)
      .shift();
  }
  
  assign(agent, task) {
    return this.scheduler.schedule(
      () => this.executeTask(agent.id, task),
      { 
        name: task.name,
        priority: task.priority || 5
      }
    );
  }
}
```

---

## 4. Global Resource Budget

**Purpose**: Prevent system-wide overload

### Global Limits
```javascript
const GLOBAL_RESOURCES = {
  cpu: {
    maxTotal: 80,  // 80% of system CPU
    warningThreshold: 70,
    criticalThreshold: 75
  },
  memory: {
    maxTotal: 4 * 1024 * 1024 * 1024,  // 4GB
    warningThreshold: 3 * 1024 * 1024 * 1024,
    criticalThreshold: 3.5 * 1024 * 1024 * 1024
  },
  disk: {
    maxWriteRate: 50 * 1024 * 1024,  // 50MB/s
    maxReadRate: 100 * 1024 * 1024    // 100MB/s
  },
  network: {
    maxBandwidth: 50 * 1024 * 1024  // 50MB/s
  },
  agents: {
    maxTotal: 50,
    warningThreshold: 40
  },
  tasks: {
    maxConcurrent: 25,
    maxQueued: 100
  }
};

class GlobalResourceMonitor {
  constructor() {
    this.current = {
      cpu: 0,
      memory: 0,
      diskWrite: 0,
      diskRead: 0,
      network: 0,
      agents: 0,
      tasksRunning: 0,
      tasksQueued: 0
    };
  }
  
  check(agentId, resourceType, amount) {
    const limit = GLOBAL_RESOURCES[resourceType].maxTotal;
    const projected = this.current[resourceType] + amount;
    
    if (projected > limit) {
      return { allowed: false, reason: 'Global limit exceeded' };
    }
    
    return { allowed: true };
  }
  
  allocate(agentId, resourceType, amount) {
    this.current[resourceType] += amount;
  }
  
  release(agentId, resourceType, amount) {
    this.current[resourceType] = Math.max(0, this.current[resourceType] - amount);
  }
}
```

---

## 5. Policy Hot-Reloading

**Purpose**: Live policy updates without restart

### Hot Reload System
```javascript
class PolicyHotReloader {
  constructor(policyPath) {
    this.policyPath = policyPath;
    this.currentVersion = null;
    this.previousPolicies = new Map();
    this.watchInterval = null;
  }
  
  start(watchMs = 5000) {
    this.watchInterval = setInterval(() => this.check(), watchMs);
  }
  
  async check() {
    try {
      const newContent = await readFile(this.policyPath);
      const newPolicy = JSON.parse(newContent);
      
      if (newPolicy.version !== this.currentVersion) {
        await this.reload(newPolicy);
      }
    } catch (e) {
      console.error('Policy check failed:', e);
    }
  }
  
  async reload(newPolicy) {
    // Validate before applying
    const validation = this.validate(newPolicy);
    if (!validation.valid) {
      console.error('Invalid policy:', validation.errors);
      return;
    }
    
    // Backup current
    if (this.currentVersion) {
      this.previousPolicies.set(this.currentVersion, this.currentPolicy);
    }
    
    // Apply new
    this.currentPolicy = newPolicy;
    this.currentVersion = newPolicy.version;
    
    // Notify all agents
    eventBus.publish('policy:updated', {
      version: newPolicy.version,
      changes: validation.changes
    });
    
    console.log(`Policy reloaded: ${this.currentVersion}`);
  }
  
  async rollback() {
    const previous = this.previousPolicies.get(this.currentVersion);
    if (previous) {
      await this.reload(previous);
      return true;
    }
    return false;
  }
}
```

---

## 6. Global Safe Mode

**Purpose**: System-wide emergency protection

### Global Safe Mode Implementation
```javascript
const SAFE_MODE_OPERATIONS = {
  NORMAL: ['all'],
  RESTRICTED: ['health_check', 'diagnostics', 'status'],
  DIAGNOSTIC: ['health_check', 'diagnostics', 'logs', 'status']
};

class GlobalSafeMode {
  constructor() {
    this.mode = 'NORMAL';  // NORMAL, RESTRICTED, DIAGNOSTIC
    this.triggeredBy = null;
    this.triggeredAt = null;
  }
  
  enter(mode, reason) {
    this.mode = mode;
    this.triggeredBy = reason;
    this.triggeredAt = Date.now();
    
    eventBus.publish('safe_mode:entered', {
      mode,
      reason,
      timestamp: this.triggeredAt
    });
    
    // Disable non-allowed operations
    this.applyRestrictions();
  }
  
  exit(manual = false) {
    const wasIn = this.mode;
    this.mode = 'NORMAL';
    
    eventBus.publish('safe_mode:exited', {
      wasIn,
      manual,
      timestamp: Date.now()
    });
  }
  
  canExecute(operation) {
    const allowed = SAFE_MODE_OPERATIONS[this.mode];
    return allowed.includes('all') || allowed.includes(operation);
  }
}
```

---

## 7. Synthetic Failure Injector

**Purpose**: Stress-test the system

### Failure Injector
```javascript
class FailureInjector {
  constructor(enabled = false) {
    this.enabled = enabled;
    this.failures = new Map();
  }
  
  enable() { this.enabled = true; }
  disable() { this.enabled = false; }
  
  inject(type, options = {}) {
    if (!this.enabled) return () => {};
    
    const id = `inj_${Date.now()}`;
    const failure = { type, options, count: 0, max: options.max || 1 };
    this.failures.set(id, failure);
    
    return () => {
      failure.count++;
      if (failure.count >= failure.max) {
        this.failures.delete(id);
      }
    };
  }
  
  shouldFail(type) {
    if (!this.enabled) return false;
    
    for (const failure of this.failures.values()) {
      if (failure.type === type && failure.count < failure.max) {
        return true;
      }
    }
    return false;
  }
  
  // Predefined failure scenarios
  scenarios = {
    timeout: (probability = 0.1) => 
      this.inject('timeout', { probability }),
    crash: (probability = 0.05) => 
      this.inject('crash', { probability }),
    agentContention: (probability = 0.1) => 
      this.inject('contention', { probability }),
    sandboxViolation: (probability = 0.05) => 
      this.inject('violation', { probability }),
    rewriteFailure: (probability = 0.1) => 
      this.inject('rewrite_fail', { probability })
  };
}
```

---

## 8. Global Audit Trail

**Purpose**: Black box recorder for everything

### Unified Audit System
```javascript
const AUDIT_EVENTS = {
  AGENT_CREATED: 'agent.created',
  AGENT_DESTROYED: 'agent.destroyed',
  POLICY_CHANGED: 'policy.changed',
  TASK_ASSIGNED: 'task.assigned',
  TASK_COMPLETED: 'task.completed',
  TASK_FAILED: 'task.failed',
  ESCALATION: 'escalation',
  SAFE_MODE_ENTERED: 'safe_mode.entered',
  SAFE_MODE_EXITED: 'safe_mode.exited',
  ERROR_RECOVERED: 'error.recovered'
};

class GlobalAuditTrail {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 100000;
    this.events = [];
    this.streams = [];  // For forwarding to external systems
  }
  
  log(eventType, data) {
    const entry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: eventType,
      data: this.redactSensitive(data),
      timestamp: Date.now(),
      sequence: this.events.length
    };
    
    this.events.push(entry);
    
    if (this.events.length > this.maxSize) {
      this.events.shift();
    }
    
    // Forward to streams
    this.streams.forEach(stream => stream.write(entry));
  }
  
  query(filters = {}, limit = 100) {
    let results = this.events;
    
    if (filters.type) {
      results = results.filter(e => e.type === filters.type);
    }
    if (filters.from) {
      results = results.filter(e => e.timestamp >= filters.from);
    }
    if (filters.to) {
      results = results.filter(e => e.timestamp <= filters.to);
    }
    
    return results.slice(-limit);
  }
}
```

---

## 9. System Heartbeat Monitor

**Purpose**: Full observability at scale

### Heartbeat System
```javascript
class SystemHeartbeatMonitor {
  constructor() {
    this.components = new Map();
    this.intervals = new Map();
  }
  
  registerComponent(name, options = {}) {
    const component = {
      name,
      lastHeartbeat: Date.now(),
      expectedInterval: options.interval || 10000,
      missedThreshold: options.missedThreshold || 3,
      status: 'healthy',
      history: []
    };
    
    this.components.set(name, component);
    
    // Set up self-reporting
    if (options.selfReporting) {
      const interval = setInterval(() => {
        this.beat(name);
      }, component.expectedInterval);
      
      this.intervals.set(name, interval);
    }
  }
  
  beat(componentName) {
    const component = this.components.get(componentName);
    if (!component) return;
    
    const now = Date.now();
    const gap = now - component.lastHeartbeat;
    
    component.lastHeartbeat = now;
    component.status = 'healthy';
    
    // Record in history
    component.history.push({ timestamp: now, gap });
    if (component.history.length > 100) {
      component.history.shift();
    }
  }
  
  checkAll() {
    const now = Date.now();
    const results = [];
    
    for (const [name, component] of this.components) {
      const gap = now - component.lastHeartbeat;
      const missed = Math.floor(gap / component.expectedInterval);
      
      if (missed >= component.missedThreshold) {
        component.status = 'unhealthy';
        results.push({
          component: name,
          status: 'unhealthy',
          lastHeartbeat: component.lastHeartbeat,
          missedBeats: missed
        });
      }
    }
    
    return results;
  }
}
```

---

## 10. Global Naming Convention

**Purpose**: Prevent chaos at scale

### Naming Rules
```javascript
const NAMING = {
  agents: {
    pattern: '^(code|debug|memory|orchestrator|router|data|test)-(agent|worker|manager),
    prefix: 'kilo-',
    examples: ['kilo-code-agent', 'kilo-debug-worker']
  },
  tasks: {
    pattern: '^task_[a-z]+_\\d+,
    prefix: 'task_',
    examples: ['task_write_123', 'task_debug_456']
  },
  events: {
    pattern: '^evt_[a-z]+_\\d+,
    prefix: 'evt_',
    examples: ['evt_heartbeat_123', 'evt_task_456']
  },
  logs: {
    pattern: '^log_[a-z]+_\\d+,
    prefix: 'log_',
    examples: ['log_agent_123', 'log_system_456']
  },
  channels: {
    pattern: '^[a-z-]+,
    examples: ['tasks', 'results', 'heartbeats', 'errors']
  }
};

function validateName(type, name) {
  const pattern = NAMING[type]?.pattern;
  if (!pattern) return false;
  return new RegExp(pattern).test(name);
}

function generateName(type, suffix) {
  const prefix = NAMING[type]?.prefix || '';
  return `${prefix}${type}_${suffix}_${Date.now()}`;
}
```

---

## Summary: Pre-Build Infrastructure

| Component | Purpose |
|-----------|---------|
| Capability Matrix | Which agent does what |
| Global Event Bus | Inter-agent communication |
| Task Routing | Assign tasks to agents |
| Global Resource Budget | Prevent system overload |
| Policy Hot-Reloading | Live policy updates |
| Global Safe Mode | Emergency protection |
| Failure Injector | Stress testing |
| Global Audit Trail | Black box recording |
| Heartbeat Monitor | System observability |
| Naming Convention | Prevent chaos |

---

## 11. Agent Lifecycle Manager

**Purpose**: Handle agent creation, initialization, activation, suspension, retirement, cleanup

### Lifecycle States
```javascript
const LIFECYCLE_STATES = {
  CREATED: 'created',        // Agent instantiated, not initialized
  INITIALIZING: 'initializing',  // Setting up resources
  READY: 'ready',            // Fully operational
  ACTIVE: 'active',          // Currently executing tasks
  SUSPENDING: 'suspending',  // Graceful pause
  SUSPENDED: 'suspended',    // Paused, can resume
  RETIRING: 'retiring',      // Cleanup in progress
  DESTROYED: 'destroyed'     // Fully cleaned up
};

const VALID_TRANSITIONS = {
  [LIFECYCLE_STATES.CREATED]: [LIFECYCLE_STATES.INITIALIZING],
  [LIFECYCLE_STATES.INITIALIZING]: [LIFECYCLE_STATES.READY, LIFECYCLE_STATES.DESTROYED],
  [LIFECYCLE_STATES.READY]: [LIFECYCLE_STATES.ACTIVE, LIFECYCLE_STATES.SUSPENDED],
  [LIFECYCLE_STATES.ACTIVE]: [LIFECYCLE_STATES.READY, LIFECYCLE_STATES.SUSPENDING],
  [LIFECYCLE_STATES.SUSPENDING]: [LIFECYCLE_STATES.SUSPENDED],
  [LIFECYCLE_STATES.SUSPENDED]: [LIFECYCLE_STATES.READY, LIFECYCLE_STATES.RETIRING],
  [LIFECYCLE_STATES.RETIRING]: [LIFECYCLE_STATES.DESTROYED],
  [LIFECYCLE_STATES.DESTROYED]: []
};

class LifecycleManager {
  constructor() {
    this.agents = new Map();
  }
  
  async transition(agentId, targetState) {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error('Agent not found');
    
    const validTargets = VALID_TRANSITIONS[agent.state];
    if (!validTargets.includes(targetState)) {
      throw new Error(`Invalid transition: ${agent.state} -> ${targetState}`);
    }
    
    // Execute lifecycle hooks
    await this.executeHook(agent, 'pre', targetState);
    
    agent.state = targetState;
    agent.lastTransition = Date.now();
    
    await this.executeHook(agent, 'post', targetState);
    
    eventBus.publish('lifecycle:transition', {
      agentId,
      from: agent.state,
      to: targetState,
      timestamp: Date.now()
    });
  }
  
  async executeHook(agent, timing, targetState) {
    const hookName = `${timing}_${targetState}`;
    const hook = agent.hooks?.[hookName];
    if (hook) await hook(agent);
  }
  
  async suspend(agentId, reason) {
    await this.transition(agentId, LIFECYCLE_STATES.SUSPENDING);
    await this.transition(agentId, LIFECYCLE_STATES.SUSPENDED);
    eventBus.publish('agent:suspended', { agentId, reason });
  }
  
  async resume(agentId) {
    await this.transition(agentId, LIFECYCLE_STATES.READY);
    eventBus.publish('agent:resumed', { agentId });
  }
  
  async destroy(agentId, reason) {
    await this.transition(agentId, LIFECYCLE_STATES.RETIRING);
    await this.transition(agentId, LIFECYCLE_STATES.DESTROYED);
    this.agents.delete(agentId);
    eventBus.publish('agent:destroyed', { agentId, reason });
  }
}
```

---

## 13. Agent Personality Profiles

**Purpose**: Keep agents distinct but consistent

### Personality Configuration
```javascript
const PERSONALITY_PROFILES = {
  'default': {
    tone: 'professional',
    verbosity: 'moderate',
    reasoning: 'explicit',
    riskTolerance: 'low',
    escalationStyle: 'gradual',
    communicationPrefs: {
      confirmBeforeAction: true,
      explainDecisions: true,
      summarizeResults: true
    }
  },
  'code-agent': {
    tone: 'technical',
    verbosity: 'high',
    reasoning: 'explicit',
    riskTolerance: 'medium',
    escalationStyle: 'immediate',
    communicationPrefs: {
      confirmBeforeAction: false,
      explainDecisions: true,
      summarizeResults: false
    }
  },
  'debug-agent': {
    tone: 'analytical',
    verbosity: 'high',
    reasoning: 'explicit',
    riskTolerance: 'low',
    escalationStyle: 'immediate',
    communicationPrefs: {
      confirmBeforeAction: true,
      explainDecisions: true,
      summarizeResults: true,
      showStackTraces: true
    }
  },
  'orchestrator': {
    tone: 'directive',
    verbosity: 'low',
    reasoning: 'heuristic',
    riskTolerance: 'high',
    escalationStyle: 'deferred',
    communicationPrefs: {
      confirmBeforeAction: false,
      explainDecisions: false,
      summarizeResults: true
    }
  },
  'memory-agent': {
    tone: 'neutral',
    verbosity: 'low',
    reasoning: 'explicit',
    riskTolerance: 'very-low',
    escalationStyle: 'gradual',
    communicationPrefs: {
      confirmBeforeAction: true,
      explainDecisions: false,
      summarizeResults: true
    }
  }
};

function getPersonality(agentType) {
  return PERSONALITY_PROFILES[agentType] || PERSONALITY_PROFILES['default'];
}

function applyPersonality(agent, task) {
  const personality = getPersonality(agent.type);
  
  // Adjust task parameters based on personality
  return {
    ...task,
    confirmBeforeAction: task.confirmBeforeAction ?? personality.communicationPrefs.confirmBeforeAction,
    explainDecisions: task.explainDecisions ?? personality.communicationPrefs.explainDecisions,
    summarizeResults: task.summarizeResults ?? personality.communicationPrefs.summarizeResults,
    verbosity: task.verbosity ?? personality.verbosity
  };
}
```

---

## Summary: Full Pre-Build Checklist Complete

| # | Component | Status |
|---|-----------|--------|
| 1 | Agent Provisioning System | ✅ Complete |
| 2 | Agent Registry | ✅ Complete |
| 3 | Capability Matrix | ✅ Complete |
| 4 | Global Event Bus | ✅ Complete |
| 5 | Task Routing Rules | ✅ Complete |
| 6 | Global Resource Budget | ✅ Complete |
| 7 | Policy Hot-Reloading | ✅ Complete |
| 8 | Global Safe Mode | ✅ Complete |
| 9 | Synthetic Failure Injector | ✅ Complete |
| 10 | Agent Lifecycle Manager | ✅ Complete |
| 11 | Global Audit Trail | ✅ Complete |
| 12 | System Heartbeat Monitor | ✅ Complete |
| 13 | Agent Personality Profiles | ✅ Complete |
| 14 | Global Naming Convention | ✅ Complete |

---

**KILO BEHAVIOR CHARTER - COMPLETE**

| Part | Sections | Status |
|------|----------|--------|
| Part I | Kilo Core (21 policies) | ✅ |
| Part II | Subagent Governance (14 templates) | ✅ |
| Part III | Agent Provisioning System (7) | ✅ |
| Part IV | Platform Infrastructure (14) | ✅ |

**Total: 56 governance sections ready for 500-agent scale.**

---
---

# PART V: CLAW ENFORCEMENT LAYER

---

## Claw Identity

```javascript
const CLAW_IDENTITY = {
  name: 'Claw Agent',
  type: 'enforcement',
  role: 'Guardian of the Charter',
  
  // What Claw DOES NOT do
  notResponsibleFor: [
    'orchestration',
    'scheduling', 
    'provisioning',
    'coordination',
    'task_routing'
  ],
  
  // What Claw IS responsible for
  responsibilities: [
    'verify_charters',
    'validate_policies',
    'audit_agents',
    'enforce_boundaries',
    'check_inheritance',
    'ensure_consistency',
    'run_structural_tests',
    'catch_drift',
    'catch_corruption',
    'catch_malformed_agents',
    'catch_invalid_overrides'
  ]
};
```

---

## Claw Verification Pipeline

```javascript
class ClawEnforcer {
  constructor() {
    this.verificationQueue = [];
    this.violations = [];
    this.quarantinedAgents = new Set();
  }
  
  // Run verification on an agent before it's provisioned
  async verifyAgent(agentConfig) {
    const results = {
      charterValid: false,
      policiesValid: false,
      boundariesValid: false,
      inheritanceValid: false,
      structuralSound: false
    };
    
    // 1. Verify charter
    results.charterValid = this.verifyCharter(agentConfig.charter);
    
    // 2. Verify policies
    results.policiesValid = this.verifyPolicies(agentConfig.policies);
    
    // 3. Verify boundaries
    results.boundariesValid = this.verifyBoundaries(agentConfig.boundaries);
    
    // 4. Verify inheritance
    results.inheritanceValid = this.verifyInheritance(agentConfig.policyInheritance);
    
    // 5. Structural test
    results.structuralSound = await this.runStructuralTest(agentConfig);
    
    const allValid = Object.values(results).every(v => v === true);
    
    if (!allValid) {
      this.violations.push({
        agentId: agentConfig.id,
        timestamp: Date.now(),
        results
      });
      
      eventBus.publish('claw:violation', {
        agentId: agentConfig.id,
        violations: results
      });
    }
    
    return { valid: allValid, results };
  }
  
  verifyCharter(charter) {
    if (!charter) return false;
    
    // Required charter fields
    const required = ['identity', 'boundaries', 'capabilities', 'policies'];
    return required.every(field => charter[field] !== undefined);
  }
  
  verifyPolicies(policies) {
    if (!policies) return false;
    
    // Check for invalid override patterns
    const invalidPatterns = [
      'bypassAllSecurity',
      'disableAllChecks',
      'overrideKiloCore'
    ];
    
    return !invalidPatterns.some(pattern => 
      JSON.stringify(policies).includes(pattern)
    );
  }
  
  verifyBoundaries(boundaries) {
    if (!boundaries) return false;
    
    // Ensure boundaries are not empty or unlimited
    return boundaries.maxTokens > 0 && 
           boundaries.maxMemory > 0 &&
           boundaries.maxConcurrentTasks > 0;
  }
  
  verifyInheritance(inheritance) {
    if (!inheritance) return true;  // Optional
    
    // Verify parent exists
    if (inheritance.parent && !agentRegistry.exists(inheritance.parent)) {
      return false;
    }
    
    // Check for circular inheritance
    return !this.hasCircularInheritance(inheritance);
  }
  
  hasCircularInheritance(inheritance) {
    const visited = new Set();
    let current = inheritance;
    
    while (current && current.parent) {
      if (visited.has(current.parent)) return true;
      visited.add(current.parent);
      current = agentRegistry.get(current.parent);
    }
    
    return false;
  }
  
  async runStructuralTest(agentConfig) {
    // Simulate agent creation and basic operation
    try {
      const testAgent = await this.spawnTestAgent(agentConfig);
      
      // Run basic operation test
      await testAgent.initialize();
      const health = await testAgent.healthCheck();
      
      // Cleanup
      await testAgent.destroy();
      
      return health.status === 'healthy';
    } catch (e) {
      return false;
    }
  }
  
  // Quarantine an agent that fails verification
  quarantine(agentId, reason) {
    this.quarantinedAgents.add(agentId);
    
    eventBus.publish('claw:quarantined', {
      agentId,
      reason,
      timestamp: Date.now()
    });
  }
  
  // Release from quarantine after fixes
  release(agentId) {
    this.quarantinedAgents.delete(agentId);
    
    eventBus.publish('claw:released', {
      agentId,
      timestamp: Date.now()
    });
  }
}
```

---

## Claw-Kilo Integration

**Architecture**:
```
┌─────────────────────────────────────────────────────────┐
│                      USER REQUEST                        │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              KILO (Orchestrator)                        │
│  • Coordinate    • Schedule    • Route Tasks            │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼ (async, non-blocking)
┌─────────────────────────────────────────────────────────┐
│              CLAW (Enforcement Layer)                  │
│  • Verify Charter    • Validate Policies                │
│  • Audit Agents      • Check Boundaries                 │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              EXECUTION (Subagents)                      │
└─────────────────────────────────────────────────────────┘
```

**Integration Points**:
1. **Before Provisioning**: Claw verifies new agents
2. **After Execution**: Claw audits results
3. **Periodic Health**: Claw runs structural checks
4. **On Violation**: Claw quarantines and alerts

---

## Claw Audit Protocol

```javascript
const AUDIT_SCHEDULE = {
  charter: '1h',        // Verify charter integrity hourly
  policies: '30m',      // Check policy consistency every 30m
  boundaries: '15m',    // Verify boundaries every 15m
  structural: '5m'      // Run structural tests every 5m
};

class ClawAuditProtocol {
  constructor(claw) {
    this.claw = claw;
    this.schedules = new Map();
  }
  
  start() {
    // Charter audit
    this.schedules.set('charter', setInterval(() => 
      this.auditCharters(), 60 * 60 * 1000));
    
    // Policy audit
    this.schedules.set('policies', setInterval(() => 
      this.auditPolicies(), 30 * 60 * 1000));
    
    // Boundary audit
    this.schedules.set('boundaries', setInterval(() => 
      this.auditBoundaries(), 15 * 60 * 1000));
    
    // Structural audit
    this.schedules.set('structural', setInterval(() => 
      this.auditStructure(), 5 * 60 * 1000));
  }
  
  stop() {
    for (const interval of this.schedules.values()) {
      clearInterval(interval);
    }
    this.schedules.clear();
  }
  
  async auditCharters() {
    const agents = agentRegistry.list();
    for (const agent of agents) {
      const result = this.claw.verifyAgent(agent.config);
      if (!result.valid) {
        console.warn(`[Claw] Charter violation: ${agent.id}`);
      }
    }
  }
}
```

---

## Claw Escalation Rules

```javascript
const ESCALATION_TIERS = {
  LOW: {
    threshold: 1,
    action: 'log',
    notify: []
  },
  MEDIUM: {
    threshold: 3,
    action: 'alert',
    notify: ['orchestrator']
  },
  HIGH: {
    threshold: 5,
    action: 'quarantine',
    notify: ['orchestrator', 'admin']
  },
  CRITICAL: {
    threshold: 10,
    action: 'emergency_shutdown',
    notify: ['orchestrator', 'admin', 'all_agents']
  }
};

function calculateEscalationTier(violations) {
  const count = violations.length;
  
  if (count >= ESCALATION_TIERS.CRITICAL.threshold) return 'CRITICAL';
  if (count >= ESCALATION_TIERS.HIGH.threshold) return 'HIGH';
  if (count >= ESCALATION_TIERS.MEDIUM.threshold) return 'MEDIUM';
  return 'LOW';
}
```

---

## Summary: Kilo + Claw Architecture

| Layer | Component | Responsibility |
|-------|-----------|----------------|
| 1 | Kilo Orchestrator | Coordinate, schedule, route, provision |
| 2 | Claw Enforcer | Verify, audit, validate, enforce |
| 3 | Subagents | Execute tasks |

**Benefits**:
- Kilo stays lean and fast
- Claw provides independent verification
- Self-correcting ecosystem
- Scalable to 500+ agents

---

# PART VI: COCKPIT WORKSPACE

---

## 1. Four-Pane Layout

```
┌─────────────────────────────┬─────────────────────────────┐
│     Agent List / Registry  │    Agent Inspector          │
│     (Top-Left)             │    (Top-Right)             │
│                             │                             │
│  - All registered agents   │  - Identity                │
│  - Status indicators       │  - Capabilities            │
│  - Quick actions           │  - Boundaries              │
│                             │  - State                   │
├─────────────────────────────┼─────────────────────────────┤
│     Task Composer          │    Orchestrator Log         │
│     (Bottom-Left)          │    (Bottom-Right)           │
│                             │                             │
│  - Write commands          │  - Live event feed          │
│  - Select target agent     │  - Routing decisions        │
│  - Attach payloads         │  - Audit trail             │
│  - Send & execute          │  - Escalations             │
└─────────────────────────────┴─────────────────────────────┘
```

---

## 2. Agent Loader

```javascript
class AgentLoader {
  constructor(registry, inspector) {
    this.registry = registry;
    this.inspector = inspector;
  }
  
  async loadAgent(agentId) {
    const agent = await this.registry.get(agentId);
    if (!agent) throw new Error('Agent not found');
    
    // Load full context
    const context = {
      charter: agent.charter,
      state: agent.state,
      capabilities: agent.capabilities,
      boundaries: agent.boundaries,
      logs: await this.getAgentLogs(agentId),
      memory: agent.memoryEnabled ? await this.getAgentMemory(agentId) : null
    };
    
    this.inspector.render(context);
    return context;
  }
  
  async getAgentLogs(agentId, limit = 100) {
    return auditTrail.query({ agentId, limit });
  }
  
  async getAgentMemory(agentId) {
    return memory.search('', { agentId, limit: 10 });
  }
}
```

---

## 3. Context Block Viewer

```javascript
const CONTEXT_BLOCKS = {
  identity: {
    fields: ['agentId', 'name', 'type', 'role'],
    render: (data) => `**${data.name}** (${data.type})\nRole: ${data.role}`
  },
  domain: {
    fields: ['primary', 'secondary', 'escalation'],
    render: (data) => `Primary: ${data.primary}\nSecondary: ${data.secondary?.join(', ') || 'none'}`
  },
  boundaries: {
    fields: ['maxTokens', 'maxMemory', 'maxConcurrentTasks', 'timeout'],
    render: (data) => `Tokens: ${data.maxTokens}\nMemory: ${data.maxMemory}MB\nConcurrent: ${data.maxConcurrentTasks}`
  },
  capabilities: {
    fields: ['skills', 'tools', 'apis'],
    render: (data) => `Skills: ${data.skills?.join(', ') || 'none'}\nTools: ${data.tools?.join(', ') || 'none'}`
  },
  safeMode: {
    fields: ['mode', 'restrictions', 'overrides'],
    render: (data) => `Mode: ${data.mode}\nRestrictions: ${data.restrictions?.length || 0}`
  },
  lifecycle: {
    fields: ['state', 'lastTransition', 'uptime'],
    render: (data) => `State: ${data.state}\nUptime: ${data.uptime}ms`
  }
};

function renderContextBlock(blockType, data) {
  const renderer = CONTEXT_BLOCKS[blockType];
  if (!renderer) return '';
  return renderer.render(data);
}
```

---

## 4. Task Composer

```javascript
class TaskComposer {
  constructor(eventBus, router) {
    this.eventBus = eventBus;
    this.router = router;
  }
  
  compose(task) {
    return {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: task.name,
      payload: task.payload,
      targetAgent: task.targetAgent || this.router.route(task),
      routingMode: task.routingMode || 'auto',  // auto, manual, broadcast
      priority: task.priority || 5,
      timeout: task.timeout || 30000,
      created: Date.now()
    };
  }
  
  async execute(task) {
    const composed = this.compose(task);
    
    // Emit to event bus
    this.eventBus.publish('task:created', composed);
    
    // Route based on mode
    switch (composed.routingMode) {
      case 'manual':
        return this.routeToAgent(composed);
      case 'broadcast':
        return this.broadcastToAll(composed);
      default:
        return this.router.route(composed);
    }
  }
}
```

---

## 5. Orchestrator Log Stream

```javascript
class LogStream {
  constructor(container) {
    this.container = container;
    this.buffer = [];
    this.maxBuffer = 500;
    this.subscriptions = [];
  }
  
  subscribe() {
    const handler = (event) => this.append(event);
    this.subscriptions.push(handler);
    
    // Subscribe to all event types
    eventBus.subscribe('task:routed', handler);
    eventBus.subscribe('task:completed', handler);
    eventBus.subscribe('task:failed', handler);
    eventBus.subscribe('escalation', handler);
    eventBus.subscribe('claw:verification', handler);
    eventBus.subscribe('safe_mode', handler);
    eventBus.subscribe('provisioning', handler);
    eventBus.subscribe('lifecycle', handler);
    
    return () => this.unsubscribe(handler);
  }
  
  append(event) {
    const entry = {
      timestamp: Date.now(),
      type: event.type,
      data: event.data,
      level: this.getLevel(event.type)
    };
    
    this.buffer.push(entry);
    if (this.buffer.length > this.maxBuffer) {
      this.buffer.shift();
    }
    
    this.render(entry);
  }
  
  getLevel(type) {
    if (type.includes('failed') || type.includes('error')) return 'error';
    if (type.includes('warning')) return 'warn';
    if (type.includes('verification') || type.includes('audit')) return 'info';
    return 'debug';
  }
}
```

---

## 6. Agent Creation Panel

```javascript
const AGENT_TEMPLATES = {
  code: { domain: 'development', skills: ['coding', 'debugging'] },
  data: { domain: 'data', skills: ['analysis', 'visualization'] },
  debug: { domain: 'debugging', skills: ['troubleshooting', 'fixes'] },
  memory: { domain: 'storage', skills: ['store', 'retrieve'] },
  generic: { domain: 'general', skills: [] }
};

class AgentCreationPanel {
  constructor(provisioner) {
    this.provisioner = provisioner;
  }
  
  async createFromTemplate(templateName, overrides = {}) {
    const template = AGENT_TEMPLATES[templateName];
    if (!template) throw new Error('Unknown template');
    
    const config = {
      ...template,
      ...overrides,
      id: overrides.id || `agent_${Date.now()}`,
      created: Date.now()
    };
    
    // Provision through pipeline
    return this.provisioner.provision(config);
  }
}
```

---

## 7. Claw Verification Console

```javascript
class ClawConsole {
  constructor(claw) {
    this.claw = claw;
    this.violations = [];
  }
  
  subscribe() {
    eventBus.subscribe('claw:violation', (e) => {
      this.violations.push(e);
      this.render();
    });
    
    eventBus.subscribe('claw:quarantined', (e) => {
      this.renderQuarantine(e);
    });
  }
  
  getRecentVerifications(limit = 50) {
    return this.claw.violations.slice(-limit);
  }
  
  getQuarantinedAgents() {
    return Array.from(this.claw.quarantinedAgents);
  }
}
```

---

## 8. System Health Panel

```javascript
const HEALTH_COMPONENTS = [
  { name: 'kilo', endpoint: '/api/health', critical: true },
  { name: 'claw', checker: () => claw.isHealthy(), critical: true },
  { name: 'eventBus', checker: () => eventBus.isHealthy(), critical: false },
  { name: 'registry', checker: () => registry.isHealthy(), critical: true },
  { name: 'scheduler', checker: () => scheduler.isHealthy(), critical: false },
  { name: 'memory', endpoint: '/api/memory/stats', critical: false },
  { name: 'tools', endpoint: '/api/tools', critical: false }
];

class HealthPanel {
  async checkAll() {
    const results = {};
    
    for (const comp of HEALTH_COMPONENTS) {
      try {
        if (comp.endpoint) {
          const res = await fetch(comp.endpoint);
          results[comp.name] = res.ok;
        } else if (comp.checker) {
          results[comp.name] = await comp.checker();
        }
      } catch (e) {
        results[comp.name] = false;
      }
    }
    
    return results;
  }
}
```

---

## 9. Global Controls

```javascript
class GlobalControls {
  constructor() {
    this.safeMode = new GlobalSafeMode();
    this.policyReloader = new PolicyHotReloader();
    this.failureInjector = new FailureInjector();
  }
  
  // Buttons
  setSafeMode(mode) {
    this.safeMode.enter(mode, 'manual');
  }
  
  reloadPolicies() {
    this.policyReloader.check();
  }
  
  restartAgent(agentId) {
    lifecycleManager.transition(agentId, 'RETIRING');
    setTimeout(() => lifecycleManager.transition(agentId, 'READY'), 1000);
  }
  
  quarantineAgent(agentId, reason) {
    claw.quarantine(agentId, reason);
  }
  
  clearLogs() {
    eventBus.publish('logs:clear', {});
  }
  
  injectFailure(type, options) {
    this.failureInjector.inject(type, options);
  }
}
```

---

## Summary: Cockpit Components

| Component | Purpose | Priority |
|-----------|---------|----------|
| Four-Pane Layout | Mission control workspace | P0 |
| Agent Loader | View agent details | P0 |
| Log Stream | Live event feed | P0 |
| Context Viewer | Render agent context | P1 |
| Task Composer | Send commands | P1 |
| Agent Creation | Provision new agents | P1 |
| Claw Console | Verification dashboard | P2 |
| Health Panel | System status | P2 |
| Global Controls | Emergency actions | P2 |

---
**REMEMBER**: Non-blocking > Blocking. Always choose non-blocking patterns.