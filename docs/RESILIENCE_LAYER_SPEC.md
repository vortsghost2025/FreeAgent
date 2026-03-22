# Resilience Layer Spec

> Domain-agnostic. Production-grade. Deterministic.

---

## 1. Memory Integrity Substrate

### 1.1 Atomic Persistence

```typescript
async function atomicWrite(filepath: string, data: any): Promise<void> {
  const tempPath = `${filepath}.tmp.${Date.now()}`;
  const backupPath = `${filepath}.backup`;
  
  // 1. Write to temp file
  await fs.writeFile(tempPath, JSON.stringify(data), 'utf8');
  
  // 2. If main exists, backup first
  if (await fs.exists(filepath)) {
    await fs.copyFile(filepath, backupPath);
  }
  
  // 3. Atomic rename (this is the critical step)
  await fs.rename(tempPath, filepath);
  
  // 4. Cleanup old backup
  if (await fs.exists(backupPath)) {
    await fs.unlink(backupPath);
  }
}
```

### 1.2 Backup + Recovery

```typescript
async function safeRead(filepath: string): Promise<any> {
  const mainPath = filepath;
  const backupPath = `${filepath}.backup`;
  
  // Try main first
  if (await fs.exists(mainPath)) {
    try {
      const content = await fs.readFile(mainPath, 'utf8');
      return JSON.parse(content);
    } catch (e) {
      console.warn('Main file corrupt, trying backup');
    }
  }
  
  // Try backup
  if (await fs.exists(backupPath)) {
    try {
      const content = await fs.readFile(backupPath, 'utf8');
      console.log('Restored from backup');
      return JSON.parse(content);
    } catch (e) {
      console.error('Backup also corrupt');
    }
  }
  
  // Initialize fresh
  return null;
}
```

### 1.3 Retry Logic

```typescript
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2
};

async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e as Error;
      
      if (attempt === config.maxAttempts) {
        throw new Error(`Failed after ${config.maxAttempts} attempts: ${lastError.message}`);
      }
      
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelay
      );
      
      await sleep(delay);
    }
  }
  
  throw lastError!;
}
```

### 1.4 Bounded Collections

```typescript
interface CollectionLimits {
  maxSize: number;
  evictionPolicy: 'lru' | 'fifo' | 'priority';
}

const LIMITS: Record<string, CollectionLimits> = {
  optimization_history: { maxSize: 1000, evictionPolicy: 'lru' },
  error_log: { maxSize: 100, evictionPolicy: 'fifo' },
  learned_patterns: { maxSize: 500, evictionPolicy: 'priority' }
};

async function enforceLimits(collection: string): Promise<void> {
  const limit = LIMITS[collection];
  if (!limit) return;
  
  const count = await getCount(collection);
  
  if (count > limit.maxSize) {
    const excess = count - limit.maxSize;
    
    switch (limit.evictionPolicy) {
      case 'fifo':
        await evictOldest(collection, excess);
        break;
      case 'lru':
        await evictLeastUsed(collection, excess);
        break;
      case 'priority':
        await evictLowestPriority(collection, excess);
        break;
    }
  }
}
```

---

## 2. Real-Time Communication Resilience

### 2.1 Heartbeat / Pong

```typescript
interface HeartbeatConfig {
  interval: number;
  timeout: number;
  maxMissed: number;
}

async function setupHeartbeat(
  socket: WebSocket,
  config: HeartbeatConfig
): Promise<void> {
  let missed = 0;
  
  // Send ping
  const ping = setInterval(() => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      missed++;
      
      if (missed >= config.maxMissed) {
        handleDisconnect(socket);
      }
    }
  }, config.interval);
  
  // Handle pong
  socket.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.type === 'pong') {
      missed = 0;
    }
  });
  
  // Cleanup on close
  socket.on('close', () => clearInterval(ping));
}
```

### 2.2 Safe Broadcast

```typescript
async function safeBroadcast(
  message: any,
  clients: Map<string, WebSocket>
): Promise<BroadcastResult> {
  const results: BroadcastResultItem[] = [];
  
  for (const [id, socket] of clients) {
    try {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
        results.push({ clientId: id, success: true });
      } else {
        results.push({ clientId: id, success: false, reason: 'not_open' });
      }
    } catch (e) {
      // Isolate errors per client
      results.push({ 
        clientId: id, 
        success: false, 
        reason: (e as Error).message 
      });
    }
  }
  
  return { total: clients.size, results };
}
```

---

## 3. Orchestrator Stability Layer

### 3.1 Graceful Shutdown

```typescript
async function gracefulShutdown(server: Server): Promise<void> {
  console.log('Starting graceful shutdown...');
  
  // 1. Stop accepting new connections
  server.close();
  
  // 2. Flush pending operations
  await flushPending();
  
  // 3. Close WebSockets
  for (const socket of activeSockets) {
    socket.close(1000, 'Shutting down');
  }
  
  // 4. Save state
  await saveState();
  
  // 5. Terminate child processes
  for (const child of childProcesses) {
    child.kill('SIGTERM');
  }
  
  console.log('Graceful shutdown complete');
  process.exit(0);
}

// Handle signals
process.on('SIGTERM', () => gracefulShutdown(server));
process.on('SIGINT', () => gracefulShutdown(server));
```

### 3.2 Agent Health Monitoring

```typescript
interface HealthCheck {
  agentId: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: string;
  metrics: {
    responseTime: number;
    errorRate: number;
    memoryUsage: number;
  };
}

async function monitorAgents(agents: Agent[]): Promise<void> {
  for (const agent of agents) {
    const health = await checkAgentHealth(agent);
    
    if (health.status === 'unhealthy') {
      await restartAgent(agent.id);
    } else if (health.status === 'degraded') {
      await logDegraded(agent.id, health);
    }
  }
}

setInterval(() => monitorAgents(activeAgents), 30000);
```

---

## 4. Distributed Recovery Layer

### 4.1 Network Recovery

```typescript
async function handleReconnect(peer: Peer): Promise<void> {
  // 1. Reconnect
  await peer.connect();
  
  // 2. Rejoin federation
  await federation.rejoin(peer);
  
  // 3. Resync state
  await syncState(peer);
  
  // 4. Replay missed messages
  await replayMessages(peer);
}
```

### 4.2 Message Recovery

```typescript
class MessageQueue {
  private queue: Map<string, any[]> = new Map();
  
  async enqueue(peerId: string, message: any): Promise<void> {
    const messages = this.queue.get(peerId) || [];
    messages.push(message);
    this.queue.set(peerId, messages);
  }
  
  async flush(peerId: string): Promise<void> {
    const messages = this.queue.get(peerId) || [];
    
    for (const message of messages) {
      try {
        await send(peerId, message);
      } catch (e) {
        // Keep in queue on failure
        return;
      }
    }
    
    // Clear on success
    this.queue.set(peerId, []);
  }
}
```

---

## 5. Memory Leak Prevention

### 5.1 Resource Cleanup

```typescript
interface CleanupManager {
  sockets: Set<WebSocket>;
  timers: Set<NodeJS.Timeout>;
  processes: Set<ChildProcess>;
}

const cleanup = new CleanupManager();

function registerSocket(socket: WebSocket): void {
  cleanup.sockets.add(socket);
  socket.on('close', () => cleanup.sockets.delete(socket));
}

function registerTimer(timer: NodeJS.Timeout): void {
  cleanup.timers.add(timer);
}

async function cleanupAll(): Promise<void> {
  // Close sockets
  for (const socket of cleanup.sockets) {
    socket.close();
  }
  cleanup.sockets.clear();
  
  // Clear timers
  for (const timer of cleanup.timers) {
    clearTimeout(timer);
  }
  cleanup.timers.clear();
  
  // Terminate processes
  for (const proc of cleanup.processes) {
    proc.kill();
  }
  cleanup.processes.clear();
}
```

---

## 6. Performance Optimization

### 6.1 Efficient Operations

```typescript
// Batch writes
async function batchWrite(ops: WriteOp[]): Promise<void> {
  const batch = db.batch();
  
  for (const op of ops) {
    switch (op.type) {
      case 'put':
        batch.put(op.key, op.value);
        break;
      case 'del':
        batch.del(op.key);
        break;
    }
  }
  
  await batch.write();
}

// Lazy load memory
class LazyMemory {
  private cache = new Map<string, any>();
  
  async get(key: string, loader: () => Promise<any>): Promise<any> {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    const value = await loader();
    this.cache.set(key, value);
    return value;
  }
}
```

---

## 7. Metrics

### 7.1 Resilience Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `resilience.memory_corruption` | Corruption events | > 0 |
| `resilience.zombie_sockets` | Open sockets on closed connections | > 0 |
| `resilience.orphaned_processes` | Processes without parent | > 0 |
| `resilience.reconnects` | Reconnection attempts | > 10/min |
| `resilience.message_loss` | Dropped messages | > 1% |
| `resilience.shutdown_time` | Graceful shutdown duration | > 30s |

---

## Related

- [GOVERNANCE_LAYER_SPEC.md](./GOVERNANCE_LAYER_SPEC.md)
- [CONSENSUS_ENGINE_SPEC.md](./CONSENSUS_ENGINE_SPEC.md)
- [MEMORY_SUBSTRATE_SPEC.md](./MEMORY_SUBSTRATE_SPEC.md)
